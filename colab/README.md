# Colab Fast Processing API Setup

This Colab notebook runs ALL video processing on GPU for **10x faster** performance.

## Quick Setup

1. **Open Google Colab** - Create a new notebook

2. **Copy the cells** from `colab/fast_processing_api.py` in order

3. **Set your ngrok authtoken** (Cell 8):
   - Sign up at https://dashboard.ngrok.com/signup
   - Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
   - Replace `YOUR_NGROK_AUTHTOKEN_HERE` in Cell 8

4. **Run all cells** in order

5. **Copy the ngrok URL** shown at the end

6. **Add to your `.env` file**:
   ```
   COLAB_API_URL=https://your-ngrok-url.ngrok-free.app
   ENABLE_VISUAL_ANALYSIS=true  # Optional: enable visual analysis (default: true)
   ```

## What Gets Processed on Colab

All heavy GPU operations run on Colab:
- ✅ **Audio extraction** (FFmpeg)
- ✅ **Whisper transcription** (GPU batch, large-v3)
- ✅ **Embedding generation** (GPU batch, BGE-large)
- ✅ **Visual analysis** (V-JEPA2, GPU batch)
- ✅ **Semantic segmentation** (GPU batch)

Lightweight operations still run locally:
- Repetition detection
- Filler word detection  
- LLM analysis (if enabled)
- Final scoring and labeling

## Performance

- **Local processing**: ~5-10 minutes for 10-minute video
- **Colab GPU processing**: ~30-60 seconds for 10-minute video
- **Speedup**: ~10x faster

## Requirements

- Google Colab with GPU enabled (free tier works)
- ngrok account (free tier works)
- All models auto-download on first run

## Troubleshooting

**Models not loading?**
- Make sure GPU is enabled: Runtime → Change runtime type → GPU

**ngrok connection issues?**
- Verify your authtoken is correct
- Check that Cell 6 completed successfully

**API timeout?**
- Increase timeout in `backend/utils/colab_processor.py` (default: 600s)
- Very long videos (>30 min) may need longer timeout

**Fallback to local?**
- If Colab is unavailable, system automatically falls back to local processing
- Check logs for "Colab processing failed" messages

## Cost

- **Colab Free**: Limited GPU hours per day, but sufficient for development
- **Colab Pro**: $10/month for more GPU hours and better GPUs
- **Processing cost**: Free (no API costs, all models run locally in Colab)


