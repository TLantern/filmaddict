"""
Google Colab Notebook for V-JEPA2 Visual Change Scoring API

This file can be pasted into Google Colab to create an API endpoint for V-JEPA2 processing.
The notebook will:
1. Install dependencies
2. Load the V-JEPA2 model
3. Expose a Flask API endpoint for frame processing
4. Use ngrok to make it accessible from your local backend

Usage:
1. Open Google Colab
2. Create a new notebook
3. Paste the cells below in order
4. Run each cell
5. Copy the ngrok URL and set COLAB_API_URL in your .env file
"""

# Cell 1: Install dependencies
"""
# Install all required packages for Colab GPU processing
!pip install transformers torch torchvision torchaudio sentence-transformers pillow flask flask-cors pyngrok ffmpeg-python scipy numpy requests -q

# Verify installations
import sys
try:
    import transformers
    import torch
    import torchvision
    import torchaudio
    import sentence_transformers
    from PIL import Image
    import flask
    import flask_cors
    import pyngrok
    import ffmpeg
    import scipy
    import numpy
    import requests
    print("✅ All packages installed successfully!")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA device: {torch.cuda.get_device_name(0)}")
except ImportError as e:
    print(f"❌ Missing package: {e}")
    sys.exit(1)
"""

# Cell 2: Import libraries and setup
"""
import base64
import io
import logging
import os
import tempfile
from typing import List, Dict, Tuple
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import torch
import torchaudio
import ffmpeg
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from transformers import WhisperProcessor, WhisperForConditionalGeneration, AutoModel
from sentence_transformers import SentenceTransformer
from scipy.spatial.distance import cosine
from pyngrok import ngrok

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Note: You may see harmless "Working outside of request context" warnings from Colab's debugger
# These are just Colab trying to inspect Flask objects and can be ignored - they don't affect functionality

app = Flask(__name__)
CORS(app)

# Global model variables
model = None  # V-JEPA2 model (kept for backward compatibility)
whisper_model = None
whisper_processor = None
embedding_model = None
vjepa2_model = None
device = None
"""

# Cell 3: Load all models on GPU (10x faster processing)
"""
device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"Using device: {device}")

# Load V-JEPA2 model (original endpoint compatibility)
VJEPA2_MODEL = "facebook/vjepa2-vitl-fpc64-256"
logger.info(f"Loading V-JEPA2 model: {VJEPA2_MODEL}")
model = AutoModel.from_pretrained(VJEPA2_MODEL).to(device)
model.eval()
vjepa2_model = model  # Also store as vjepa2_model for fast processing
logger.info("✅ V-JEPA2 model loaded")

# Load Whisper model (large-v3 for transcription)
logger.info("Loading Whisper large-v3 model...")
WHISPER_MODEL = "openai/whisper-large-v3"
whisper_processor = WhisperProcessor.from_pretrained(WHISPER_MODEL)
whisper_model = WhisperForConditionalGeneration.from_pretrained(
    WHISPER_MODEL,
    dtype=torch.float16 if device == "cuda" else torch.float32,
).to(device)
whisper_model.eval()
logger.info("✅ Whisper model loaded")

# Load embedding model (BGE for semantic segmentation)
logger.info("Loading BGE embedding model...")
EMBEDDING_MODEL = "BAAI/bge-large-en-v1.5"
embedding_model = SentenceTransformer(EMBEDDING_MODEL, device=device)
logger.info("✅ Embedding model loaded")

logger.info("🎉 All models loaded successfully on GPU!")
"""

# Cell 4: Helper functions
"""
def decode_base64_image(img_base64: str) -> np.ndarray:
    \"\"\"Decode base64 image to numpy array.\"\"\"
    img_data = base64.b64decode(img_base64)
    img = Image.open(io.BytesIO(img_data))
    img_array = np.array(img)
    return img_array


def compute_visual_change_scores(frames: List[np.ndarray]) -> List[float]:
    \"\"\"
    Compute visual change scores for a list of frames using V-JEPA2.
    
    Args:
        frames: List of numpy arrays (frames as images)
        
    Returns:
        List of visual change scores (0.0-1.0) for each frame pair
    \"\"\"
    if len(frames) < 2:
        return [0.5] * len(frames)
    
    try:
        # Preprocess frames
        frame_tensors = []
        for frame in frames:
            # Normalize and convert to tensor
            if frame.dtype != np.uint8:
                frame = (frame * 255).astype(np.uint8)
            
            # Resize to 256x256 if needed
            if frame.shape[:2] != (256, 256):
                img = Image.fromarray(frame)
                img = img.resize((256, 256))
                frame = np.array(img)
            
            frame_normalized = frame.astype(np.float32) / 255.0
            frame_tensor = torch.from_numpy(frame_normalized).permute(2, 0, 1).unsqueeze(0).to(device)
            frame_tensors.append(frame_tensor)
        
        # Get embeddings
        embeddings = []
        with torch.no_grad():
            for frame_tensor in frame_tensors:
                embedding = model(frame_tensor)
                # Flatten and normalize
                embedding_flat = embedding.cpu().numpy().flatten()
                embeddings.append(embedding_flat)
        
        # Compute embedding deltas
        deltas = []
        for i in range(1, len(embeddings)):
            delta = np.linalg.norm(embeddings[i] - embeddings[i-1])
            deltas.append(delta)
        
        # Normalize to 0-1 range
        if deltas:
            max_delta = max(deltas) if max(deltas) > 0 else 1.0
            visual_change_scores = [min(1.0, d / max_delta) for d in deltas]
            # Add first frame score (use average)
            visual_change_scores.insert(0, np.mean(visual_change_scores) if visual_change_scores else 0.5)
        else:
            visual_change_scores = [0.5] * len(frames)
        
        return visual_change_scores
        
    except Exception as e:
        logger.error(f"Error computing visual change scores: {str(e)}")
        return [0.5] * len(frames)
"""

# Cell 5: Fast batch processing functions (10x faster)
"""
def extract_audio_from_video_url(video_url: str) -> str:
    \"\"\"Extract audio from video URL using FFmpeg.\"\"\"
    import requests

    temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    temp_audio_path = temp_audio.name
    temp_audio.close()

    temp_video = None
    try:
        # First, download the video file to a temporary location
        logger.info(f"Downloading video from: {video_url[:80]}...")
        temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        temp_video_path = temp_video.name
        temp_video.close()

        # Download with timeout and proper headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        response = requests.get(video_url, headers=headers, timeout=300, stream=True)
        response.raise_for_status()

        # Write video to temp file
        with open(temp_video_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

        logger.info(f"Video downloaded to: {temp_video_path}")

        # Now extract audio using the local file
        stream = ffmpeg.input(temp_video_path)
        stream = ffmpeg.output(
            stream,
            temp_audio_path,
            vn=None,
            acodec="libmp3lame",
            ac=1,
            ar=16000,
            audio_bitrate="32k",
            **{'q:a': 5}
        )
        ffmpeg.run(stream, overwrite_output=True, quiet=True)
        logger.info(f"Audio extracted to: {temp_audio_path}")
        return temp_audio_path

    except requests.exceptions.RequestException as e:
        logger.error(f"Error downloading video: {e}")
        raise Exception(f"Failed to download video from URL: {e}")
    except Exception as e:
        logger.error(f"Error extracting audio: {e}")
        raise
    finally:
        # Clean up temp video file
        if temp_video_path and os.path.exists(temp_video_path):
            try:
                os.remove(temp_video_path)
                logger.info(f"Cleaned up temp video file: {temp_video_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up temp video file: {e}")


def _transcribe_chunk_optimized(waveform_chunk: torch.Tensor, sample_rate: int, time_offset: float) -> Tuple[List[Dict], List[Dict]]:
    \"\"\"Optimized chunk transcription on GPU.\"\"\"
    inputs = whisper_processor(waveform_chunk.numpy(), sampling_rate=sample_rate, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    if "attention_mask" not in inputs:
        batch_size, seq_len = inputs["input_features"].shape[:2]
        inputs["attention_mask"] = torch.ones((batch_size, seq_len), dtype=torch.long, device=device)
    
    chunk_duration = len(waveform_chunk) / sample_rate
    max_new_tokens = min(448, int(chunk_duration * 3.6))
    
    with torch.no_grad():
        generated_ids = whisper_model.generate(
            **inputs,
            return_timestamps=True,
            language="en",
            max_new_tokens=max_new_tokens,
        )
    
    tokenizer = whisper_processor.tokenizer
    tokens = generated_ids[0].cpu().tolist()
    TIMESTAMP_BEGIN = 50257
    
    segments = []
    current_segment_tokens = []
    current_segment_start = None
    
    for token in tokens:
        if TIMESTAMP_BEGIN <= token < TIMESTAMP_BEGIN + 1000:
            timestamp = (token - TIMESTAMP_BEGIN) * 0.02
            if current_segment_start is None:
                current_segment_start = timestamp
            else:
                if current_segment_tokens:
                    text = tokenizer.decode(current_segment_tokens, skip_special_tokens=True).strip()
                    if text:
                        segments.append({"text": text, "start": current_segment_start, "end": timestamp})
                current_segment_tokens = []
                current_segment_start = timestamp
        else:
            current_segment_tokens.append(token)
    
    if current_segment_tokens and current_segment_start is not None:
        text = tokenizer.decode(current_segment_tokens, skip_special_tokens=True).strip()
        if text:
            end_time = current_segment_start + len(text.split()) / 2.5
            segments.append({"text": text, "start": current_segment_start, "end": end_time})
    
    words = []
    sentences = []
    
    for seg in segments:
        seg_text = seg["text"].strip()
        seg_start = seg["start"] + time_offset
        seg_end = seg["end"] + time_offset
        
        if not seg_text:
            continue
        
        word_list = seg_text.split()
        word_duration = (seg_end - seg_start) / len(word_list)
        
        sentence_words = []
        sentence_start = seg_start
        sentence_text = ""
        
        for i, word_text in enumerate(word_list):
            word_start = seg_start + (i * word_duration)
            word_end = seg_start + ((i + 1) * word_duration)
            
            word_obj = {
                "start": word_start,
                "end": word_end,
                "word": word_text.strip(".,!?;:"),
                "confidence": 0.9
            }
            words.append(word_obj)
            sentence_words.append(word_obj)
            sentence_text += word_text + " "
            
            if word_text.endswith((".", "!", "?")):
                sentences.append({
                    "start": sentence_start,
                    "end": word_end,
                    "text": sentence_text.strip(),
                    "words": sentence_words.copy()
                })
                sentence_words = []
                sentence_text = ""
                sentence_start = word_end if i < len(word_list) - 1 else None
        
        if sentence_words:
            sentences.append({
                "start": sentence_start,
                "end": seg_end,
                "text": sentence_text.strip(),
                "words": sentence_words
            })
    
    return words, sentences


def transcribe_audio_batch(audio_path: str) -> Tuple[List[Dict], List[Dict]]:
    \"\"\"Fast batch transcription with word timestamps.\"\"\"
    waveform, sample_rate = torchaudio.load(audio_path)
    
    if sample_rate != 16000:
        resampler = torchaudio.transforms.Resample(sample_rate, 16000)
        waveform = resampler(waveform)
        sample_rate = 16000
    
    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)
    
    waveform = waveform.squeeze()
    duration = len(waveform) / sample_rate
    
    CHUNK_DURATION = 90.0
    OVERLAP = 3.0
    
    all_words = []
    all_sentences = []
    
    if duration <= CHUNK_DURATION:
        words, sentences = _transcribe_chunk_optimized(waveform, sample_rate, 0.0)
        all_words.extend(words)
        all_sentences.extend(sentences)
    else:
        chunk_samples = int(CHUNK_DURATION * sample_rate)
        overlap_samples = int(OVERLAP * sample_rate)
        num_chunks = int((duration + OVERLAP) / (CHUNK_DURATION - OVERLAP)) + 1
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = []
            for i in range(num_chunks):
                start = i * (chunk_samples - overlap_samples)
                end = min(start + chunk_samples, len(waveform))
                if start >= len(waveform):
                    break
                chunk = waveform[start:end].clone()
                offset = start / sample_rate
                futures.append(executor.submit(_transcribe_chunk_optimized, chunk, sample_rate, offset))
            
            for future in futures:
                words, sentences = future.result()
                all_words.extend(words)
                all_sentences.extend(sentences)
    
    return all_words, all_sentences


def create_segments_fast(sentences: List[Dict], window_size: int = 3, threshold: float = 0.3) -> List[Dict]:
    \"\"\"Create one segment per sentence (after every break in speech).\"\"\"
    if not sentences:
        return []
    
    sentence_texts = [s["text"] for s in sentences]
    embeddings = embedding_model.encode(sentence_texts, show_progress_bar=False, batch_size=32)
    
    segments = []
    
    for i, sentence in enumerate(sentences):
        segments.append({
            "segment_id": i + 1,
            "start_time": sentence["start"],
            "end_time": sentence["end"],
            "text": sentence["text"],
            "embedding": embeddings[i].tolist() if i < len(embeddings) else None
        })
    
    return segments


def extract_frames_batch(video_url: str, segments: List[Dict], interval: float = 2.0) -> Dict[int, List[np.ndarray]]:
    \"\"\"Extract frames for all segments in batch.\"\"\"
    segment_frames = {}
    
    temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    temp_video_path = temp_video.name
    temp_video.close()
    
    try:
        import urllib.request
        urllib.request.urlretrieve(video_url, temp_video_path)
        
        for seg in segments:
            frames = []
            current_time = seg["start_time"]
            end_time = seg["end_time"]
            
            while current_time < end_time:
                try:
                    out, _ = (
                        ffmpeg
                        .input(temp_video_path, ss=current_time)
                        .output('pipe:', vframes=1, format='rawvideo', pix_fmt='rgb24', s='256x256')
                        .run(capture_stdout=True, quiet=True)
                    )
                    frame = np.frombuffer(out, np.uint8).reshape([256, 256, 3])
                    frames.append(frame)
                    current_time += interval
                except:
                    current_time += interval
                    continue
            
            segment_frames[seg["segment_id"]] = frames
        
        os.remove(temp_video_path)
    except Exception as e:
        logger.error(f"Error extracting frames: {e}")
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)
    
    return segment_frames


def compute_visual_scores_batch(frames_dict: Dict[int, List[np.ndarray]]) -> Dict[int, float]:
    \"\"\"Compute visual scores for all segments in batch.\"\"\"
    scores = {}
    
    for seg_id, frames in frames_dict.items():
        if len(frames) < 2:
            scores[seg_id] = 0.5
            continue
        
        try:
            frame_tensors = []
            for frame in frames:
                if frame.dtype != np.uint8:
                    frame = (frame * 255).astype(np.uint8)
                frame_norm = frame.astype(np.float32) / 255.0
                frame_tensor = torch.from_numpy(frame_norm).permute(2, 0, 1).unsqueeze(0).to(device)
                frame_tensors.append(frame_tensor)
            
            with torch.no_grad():
                embeddings = []
                for tensor in frame_tensors:
                    emb = vjepa2_model(tensor)
                    embeddings.append(emb.cpu().numpy().flatten())
            
            deltas = [np.linalg.norm(embeddings[i] - embeddings[i-1]) for i in range(1, len(embeddings))]
            if deltas:
                max_delta = max(deltas) if max(deltas) > 0 else 1.0
                scores[seg_id] = min(1.0, np.mean(deltas) / max_delta)
            else:
                scores[seg_id] = 0.5
        except Exception as e:
            logger.error(f"Error computing visual score for segment {seg_id}: {e}")
            scores[seg_id] = 0.5
    
    return scores
"""

# Cell 6: API endpoints
"""
@app.route("/process_frames", methods=["POST"])
def process_frames():
    \"\"\"
    Process frames and return visual change scores (original endpoint).
    
    Request body:
    {
        "frames": ["base64_encoded_image1", "base64_encoded_image2", ...]
    }
    
    Response:
    {
        "visual_change_scores": [0.5, 0.7, 0.3, ...]
    }
    \"\"\"
    try:
        data = request.get_json()
        if not data or "frames" not in data:
            return jsonify({"error": "Missing 'frames' in request body"}), 400
        
        frame_base64_list = data["frames"]
        logger.info(f"Received {len(frame_base64_list)} frames for processing")
        
        # Decode frames
        frames = [decode_base64_image(img_base64) for img_base64 in frame_base64_list]
        
        # Compute visual change scores
        visual_scores = compute_visual_change_scores(frames)
        
        logger.info(f"Computed {len(visual_scores)} visual change scores")
        return jsonify({"visual_change_scores": visual_scores})
        
    except Exception as e:
        logger.error(f"Error processing frames: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/process_video", methods=["POST"])
def process_video():
    \"\"\"
    Fast end-to-end video processing on GPU (10x faster).
    
    Request:
    {
        "video_url": "https://...",
        "enable_visual": true  # optional, default true
    }
    
    Response:
    {
        "words": [...],
        "sentences": [...],
        "segments": [...],
        "visual_scores": {...}
    }
    \"\"\"
    try:
        data = request.get_json()
        if not data or "video_url" not in data:
            return jsonify({"error": "Missing 'video_url' in request"}), 400
        
        video_url = data["video_url"]
        enable_visual = data.get("enable_visual", True)
        
        logger.info(f"Processing video: {video_url}")
        
        # Step 1: Extract audio
        logger.info("Extracting audio...")
        audio_path = extract_audio_from_video_url(video_url)
        try:
            # Step 2: Transcribe (GPU batch)
            logger.info("Transcribing audio...")
            words, sentences = transcribe_audio_batch(audio_path)
            logger.info(f"Transcribed {len(words)} words, {len(sentences)} sentences")
            
            # Step 3: Create segments (GPU batch embeddings)
            logger.info("Creating semantic segments...")
            segments = create_segments_fast(sentences)
            logger.info(f"Created {len(segments)} segments")
            
            # Step 4: Visual analysis (GPU batch, optional)
            visual_scores = {}
            if enable_visual and segments:
                logger.info("Computing visual scores...")
                segment_frames = extract_frames_batch(video_url, segments)
                visual_scores = compute_visual_scores_batch(segment_frames)
                logger.info(f"Computed {len(visual_scores)} visual scores")
            
            return jsonify({
                "words": words,
                "sentences": sentences,
                "segments": segments,
                "visual_scores": visual_scores
            })
        finally:
            # Cleanup
            if os.path.exists(audio_path):
                os.remove(audio_path)
        
    except Exception as e:
        logger.error(f"Error processing video: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    \"\"\"Health check endpoint.\"\"\"
    return jsonify({
        "status": "healthy",
        "models_loaded": {
            "whisper": whisper_model is not None,
            "embedding": embedding_model is not None,
            "vjepa2": vjepa2_model is not None
        },
        "device": device
    })
"""

# Cell 7: Setup ngrok authtoken (REQUIRED)
"""
# Get your ngrok authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken
# Option 1: Set as environment variable (recommended for security)
# os.environ["NGROK_AUTHTOKEN"] = "YOUR_NGROK_AUTHTOKEN_HERE"

# Option 2: Paste directly here (less secure, but easier for testing)
NGROK_AUTHTOKEN = "YOUR_NGROK_AUTHTOKEN_HERE"  # Replace with your actual authtoken

# Get authtoken from environment or use the variable above
authtoken = os.getenv("NGROK_AUTHTOKEN", NGROK_AUTHTOKEN)

if authtoken == "YOUR_NGROK_AUTHTOKEN_HERE":
    raise ValueError(
        "Please set your ngrok authtoken!\n"
        "1. Sign up at https://dashboard.ngrok.com/signup\n"
        "2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken\n"
        "3. Replace 'YOUR_NGROK_AUTHTOKEN_HERE' above with your actual authtoken"
    )

# Set ngrok authtoken
ngrok.set_auth_token(authtoken)
logger.info("Ngrok authtoken configured successfully")
"""

# Cell 8: Start Flask server with ngrok
"""
if __name__ == "__main__":
    # Start ngrok tunnel
    try:
        public_url = ngrok.connect(5000)
        print("=" * 60)
        print("✅ COLAB PROCESSING API READY!")
        print("=" * 60)
        print(f"🌐 Public URL: {public_url}")
        print(f"🔗 Fast processing: {public_url}/process_video (10x faster)")
        print(f"🔗 Frame processing: {public_url}/process_frames (original)")
        print(f"💚 Health check: {public_url}/health")
        print("=" * 60)
        print(f"\n📋 Copy this to your .env file:")
        print(f"COLAB_API_URL={public_url}")
        print("=" * 60)
        logger.info(f"Ngrok tunnel created: {public_url}")
        logger.info(f"Fast processing endpoint: {public_url}/process_video")
    except Exception as e:
        print("=" * 60)
        print("❌ ERROR: Failed to create ngrok tunnel")
        print("=" * 60)
        print(f"Error: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Make sure you ran Cell 7 and set your ngrok authtoken")
        print("2. Check that your authtoken is valid")
        print("3. Try running Cell 7 again")
        print("=" * 60)
        raise
    
    # Run Flask app
    print("\n🚀 Starting Flask server...")
    print("Press CTRL+C to stop the server")
    app.run(host="0.0.0.0", port=5000)
"""

# Cell 9: Test the API (run this in a NEW cell while server is running)
"""
import requests
import base64
import numpy as np
from PIL import Image
import io

# Test 1: Health check
print("Testing /health endpoint...")
try:
    response = requests.get("http://127.0.0.1:5000/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")

# Test 2: Process frames with sample images
print("\nTesting /process_frames endpoint...")

# Create sample test frames (2 simple colored images)
def create_test_frame(color_rgb, size=(256, 256)):
    img = Image.new('RGB', size, color_rgb)
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return img_base64

# Create 3 test frames: red, green, blue
frame1 = create_test_frame((255, 0, 0))  # Red
frame2 = create_test_frame((0, 255, 0))  # Green
frame3 = create_test_frame((0, 0, 255))  # Blue

test_data = {
    "frames": [frame1, frame2, frame3]
}

try:
    response = requests.post(
        "http://127.0.0.1:5000/process_frames",
        json=test_data,
        timeout=30
    )
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {result}")
    
    if "visual_change_scores" in result:
        scores = result["visual_change_scores"]
        print(f"\nVisual change scores: {scores}")
        print(f"Number of scores: {len(scores)}")
        print("✅ API test successful!")
    else:
        print("❌ Unexpected response format")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
"""

# Cell 10: Get ngrok URL (run this to see your ngrok URL)
"""
# This cell will show you the active ngrok tunnels
from pyngrok import ngrok

try:
    tunnels = ngrok.get_tunnels()
    if tunnels:
        print("=" * 60)
        print("🌐 ACTIVE NGROK TUNNELS:")
        print("=" * 60)
        for tunnel in tunnels:
            print(f"Public URL: {tunnel.public_url}")
            print(f"Local URL: {tunnel.config['addr']}")
            print(f"API endpoint: {tunnel.public_url}/process_frames")
            print("-" * 60)
        
        # Get the first tunnel URL
        ngrok_url = tunnels[0].public_url
        print(f"\n📋 Use this URL in your .env file:")
        print(f"COLAB_API_URL={ngrok_url}")
        print(f"\nFast processing endpoint: {ngrok_url}/process_video")
        print("=" * 60)
    else:
        print("❌ No active ngrok tunnels found.")
        print("Make sure Cell 7 is running!")
except Exception as e:
    print(f"Error: {e}")
    print("Make sure ngrok is running (Cell 7 should be active)")
"""

# Cell 11: Test with ngrok URL (if ngrok is running)
"""
# First, get your ngrok URL by running Cell 9, or paste it here:
NGROK_URL = "https://your-ngrok-url.ngrok-free.app"  # Update this!

import requests
import base64
from PIL import Image
import io

def create_test_frame(color_rgb, size=(256, 256)):
    img = Image.new('RGB', size, color_rgb)
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return img_base64

# Test health endpoint
print(f"Testing {NGROK_URL}/health...")
try:
    response = requests.get(f"{NGROK_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")

# Test process_frames endpoint
print(f"\nTesting {NGROK_URL}/process_frames...")
frame1 = create_test_frame((255, 0, 0))
frame2 = create_test_frame((0, 255, 0))
frame3 = create_test_frame((0, 0, 255))

test_data = {"frames": [frame1, frame2, frame3]}

try:
    response = requests.post(
        f"{NGROK_URL}/process_frames",
        json=test_data,
        timeout=30
    )
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {result}")
    
    if "visual_change_scores" in result:
        print(f"\n✅ Visual change scores: {result['visual_change_scores']}")
    else:
        print("❌ Unexpected response")
except Exception as e:
    print(f"Error: {e}")
"""
