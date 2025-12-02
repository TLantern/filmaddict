# Project: Highlight Extractor SaaS v0

Goal:  
User uploads a long video (or YouTube link) → system returns 5–10 high-signal moments with timestamps + short descriptions, and optionally auto-generated clips.

---

## 1. Backend Project Setup

1.1 Initialize backend project
- Create a new Python project using FastAPI.
- Add a `pyproject.toml` or `requirements.txt`.

1.2 Install dependencies
- Add FastAPI + Uvicorn.
- Add HTTP client (httpx or requests).
- Add OpenAI Python SDK (for GPT + Whisper if used).
- Add storage SDK (boto3 or Supabase client or Cloudflare R2 client).
- Add Pydantic, python-dotenv, and logging utilities.
- Add Celery / RQ / custom async job system OR simple background tasks.

1.3 Basic server skeleton
- Create `main.py` with:
  - Health check endpoint `/health`.
  - Version endpoint `/version`.
- Configure CORS to allow the frontend origin.

---

## 2. Domain Models & Schemas

2.1 Define Pydantic models
- `VideoInput` (type, source: file/YouTube, url or file_id).
- `VideoRecord` (id, storage_path, duration, status, created_at).
- `TranscriptSegment` (start, end, text).
- `Highlight` (start, end, reason, score).
- `ClipRecord` (id, video_id, start, end, storage_path, thumbnail_path).

2.2 Database / persistence layer
- Choose SQLite or Postgres for v0.
- Create migrations or simple schema:
  - `videos`
  - `transcripts`
  - `highlights`
  - `clips`

2.3 Utility types
- Timecode helpers (seconds ↔ HH:MM:SS).
- Enums for video status (UPLOADED, PROCESSING, DONE, FAILED).

---

## 3. Input & Video Handling

3.1 File upload endpoint
- Implement `POST /videos/upload`:
  - Accept `multipart/form-data` with a video file.
  - Validate file size and allowed formats (mp4, mov, mkv, etc.).
  - Generate a unique video ID.

3.2 Storage integration
- Implement a storage service module:
  - `store_video(file) -> storage_path`
  - `get_video_path(video_id) -> local_or_remote_path`
- For dev, allow local disk storage; abstract it so S3/R2 can be swapped in.

3.3 YouTube link support
- Implement `POST /videos/youtube`:
  - Accept a JSON body with `youtube_url`.
  - Download video using yt-dlp (or equivalent).
  - Store like a normal uploaded video.
- Normalize: both paths (upload + YouTube) produce a `VideoRecord`.

3.4 Job enqueue after input
- After storing a video:
  - Create a `VideoRecord` with status `UPLOADED`.
  - Enqueue a background job to process the video (`process_video(video_id)`).
  - Return `{ video_id, status: "QUEUED" }`.

---

## 4. Transcription Layer

4.1 Audio extraction
- Implement a function `extract_audio(video_path) -> audio_path` using FFmpeg.

4.2 Whisper / AssemblyAI integration
- Implement `transcribe_audio(audio_path) -> list[TranscriptSegment]`:
  - Call Whisper or AssemblyAI API.
  - Ensure timestamps per sentence or chunk.
  - Normalize transcript text (strip, fix spacing).

4.3 Transcript storage
- Save transcript segments to `transcripts` table or as a JSON blob linked to `video_id`.
- Implement `get_transcript(video_id)` helper.

4.4 Hook into pipeline
- In `process_video(video_id)`:
  - Extract audio.
  - Transcribe audio into segments.
  - Mark video status as `TRANSCRIBED` after success.

---

## 5. Moment Discovery Engine (Highlight Selection)

5.1 Transcript chunking
- Implement `chunk_transcript(segments, max_window_seconds=60)`:
  - Group transcript segments into chunks of ~30–60 seconds.
  - Ensure logical boundaries (don’t cut sentences mid-way).

5.2 GPT prompt + call
- Implement a function `find_highlights(chunks) -> list[Highlight]`:
- For each chunk (with text + start/end times):
- Send to GPT-5 (using OpenAI API with model "gpt-5") with a strict prompt:
- "Identify the most engaging, emotionally intense, or information-dense moments likely to perform well as short-form content. Return 0–2 timestamp ranges per chunk with reason and a score from 1–10."
- Parse model output into `Highlight` objects:
- `start`, `end`, `reason`, `score`.

5.3 Aggregation + ranking
- Merge all highlight candidates from all chunks.
- Deduplicate overlapping ranges (keep highest score or merge).
- Sort by score descending.
- Truncate to top 5–10 highlights.

5.4 Store highlights
- Save final highlights linked to `video_id`.
- Mark video status as `HIGHLIGHTS_FOUND`.

---

## 6. Clip Generation (Optional but in v0 if possible)

6.1 FFmpeg clipping
- Implement `generate_clip(video_path, start, end) -> clip_path`:
  - Use FFmpeg to trim the segment.
  - Output standard mp4 format.

6.2 Batch clip creation
- Implement `generate_clips_for_video(video_id)`:
  - Get `highlights` for that video.
  - For each highlight:
    - Generate clip.
    - Save `ClipRecord` with storage path, start, end.

6.3 Thumbnails
- Implement `generate_thumbnail(clip_path, time_offset)`:
  - Use FFmpeg to grab a frame.
  - Store thumbnail path.
- Attach thumbnail to each `ClipRecord`.

6.4 Pipeline integration
- In `process_video(video_id)`:
  - After highlight discovery:
    - Optionally call `generate_clips_for_video(video_id)` based on config.
  - Mark video status as `DONE` on success.

---

## 7. API: Results & Retrieval

7.1 Video status endpoint
- Implement `GET /videos/{video_id}/status`:
  - Return current status (UPLOADED, PROCESSING, TRANSCRIBED, HIGHLIGHTS_FOUND, DONE, FAILED).
  - Include basic metadata (duration, created_at).

7.2 Highlights endpoint
- Implement `GET /videos/{video_id}/highlights`:
  - Return list of highlights:
    - `start`, `end`, `reason`, `score`.

7.3 Clips endpoint
- Implement `GET /videos/{video_id}/clips`:
  - Return list of clip metadata:
    - `clip_url`, `start`, `end`, `thumbnail_url`.

7.4 Download endpoints
- Implement `GET /clips/{clip_id}/download`:
  - Proxy or redirect to actual storage URL.

---

## 8. Minimal Frontend (Upload & Results)

8.1 Boilerplate setup
- Create a Next.js or React app.
- Add basic page layout.

8.2 Upload UI
- Add a page with:
  - File input for video upload.
  - Input field for YouTube URL.
  - Button to submit to backend.
- On success, store `video_id`.

8.3 Polling for status
- Implement polling logic to call `/videos/{video_id}/status` every few seconds.
- Display human-readable status (“Transcribing…”, “Finding best moments…”, etc).

8.4 Results display
- After status is `DONE`:
  - Call `/videos/{video_id}/highlights` and `/videos/{video_id}/clips`.
  - Render a list:
    - Show start–end time.
    - Show “reason” text.
    - If clips exist, show thumbnail + “Download” button.

---

## 9. Payments (Stripe) – Simple Gate

9.1 Stripe setup
- Install Stripe SDK on backend.
- Configure Stripe keys via environment variables.

9.2 Simple paywall model
- Define a rule: e.g. free for 1 video per user/IP, then paid.
- Implement `POST /checkout-session` to create a Stripe Checkout session.

9.3 Frontend integration
- Add “Upgrade to process more videos” button that hits `/checkout-session`.
- Redirect user to Stripe Checkout.
- Handle success/cancel redirects.

---

## 10. Logging, Errors, and Admin

10.1 Logging
- Add logging middleware for incoming requests.
- Log major pipeline steps: upload, transcription, highlight discovery, clipping.

10.2 Error handling
- Standardized error responses in JSON.
- Capture and log exceptions with stack traces.

10.3 Simple admin endpoint
- Implement `GET /admin/videos` (behind auth or secret token):
  - List recent videos with status and timestamps for debugging.

---

## 11. Final QA & v0 Launch Checklist

11.1 Functional tests
- Test with:
  - 5–10 minute talking-head video.
  - 30–60 minute podcast-style video.
- Verify:
  - Transcription accuracy is “good enough”.
  - Highlight timestamps map correctly to content.
  - Clips export and download without corruption.

11.2 Performance checks
- Measure total processing time per 10-min video.
- Ensure timeouts are handled and surfaced.

11.3 UX smoothing
- Add copy explaining:
  - What the tool does.
  - That results are automatic and may not be perfect.
- Make sure there is a clear “Try it now” CTA on landing.

