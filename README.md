# YKlipp

AI-powered video analysis platform that helps long-form creators and editors identify the most valuable moments, structure, and cut points in videos before editing begins.

## 🚀 Overview

YKlipp reduces editing time by 50% by automatically:
- **Transcribing** video audio with precise timestamps using Whisper
- **Identifying** the top 5-10 most engaging moments using AI
- **Providing** precise timestamps and markers for cut points
- **Generating** clips in various aspect ratios (9:16, 16:9, 1:1, 4:5, original)
- **Analyzing** visual content with V-JEPA2 for enhanced moment detection

## 🏗️ Architecture

### Frontend (`main/filmaddict/`)
- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Authentication**: Clerk
- **Payments**: Stripe (subscriptions with 3-day trial)
- **Features**:
  - Video upload (file or YouTube URL)
  - Project management
  - Interactive timeline viewer
  - Moment/clip editor
  - Real-time processing status
  - Dashboard with subscription management

### Backend (`backend/`)
- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy (async)
- **Queue System**: Redis + RQ for background jobs
- **Storage**: AWS S3 or local storage
- **AI/ML**:
  - Whisper (transcription)
  - BGE-large (embeddings)
  - V-JEPA2 (visual analysis)
  - Optional: OpenAI LLM fallback
- **Features**:
  - Video processing pipeline
  - Audio transcription with timestamps
  - AI-powered highlight detection
  - Clip generation with aspect ratio conversion
  - Learning/feedback system for model improvement
  - YouTube video import
  - Timeline generation

### Colab Processing (`colab/`)
- **GPU Processing**: 10x faster video processing
- **Models**: Whisper, BGE-large, V-JEPA2
- **Deployment**: Google Colab with ngrok tunnel
- **Performance**: ~30-60 seconds for 10-minute video (vs 5-10 minutes locally)

## 📋 Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL
- Redis (optional, uses async queue if not available)
- AWS S3 bucket (optional, can use local storage)
- FFmpeg
- Google Colab account (recommended for GPU processing)

## 🛠️ Getting Started

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set up environment variables** (create `backend/.env`):
```env
# Required
DATABASE_URL=postgresql+asyncpg://user:password@localhost/yklipp

# Recommended: Colab GPU processing (10x faster)
COLAB_API_URL=https://your-ngrok-url.ngrok-free.app

# Storage (choose one)
STORAGE_TYPE=local
UPLOAD_DIR=./uploads

# OR use S3
# STORAGE_TYPE=s3
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# S3_BUCKET_NAME=your_bucket
# AWS_REGION=us-east-1

# Optional: LLM Analysis
# ENABLE_LLM_FALLBACK=true
# OPENAI_API_KEY=sk-...

# Server
PORT=8000
```

4. **Run database migrations:**
```bash
alembic upgrade head
```

5. **Start the backend server:**
```bash
uvicorn main:app --reload
```

6. **Start the worker** (in a separate terminal):
```bash
python worker.py
```

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd main/filmaddict
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables** (create `.env.local`):
```env
# Required
NEXT_PUBLIC_API_URL=http://localhost:8000

# Required for payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

4. **Start the development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Colab GPU Processing Setup (Recommended)

For 10x faster processing, set up GPU processing on Google Colab:

1. **Open Google Colab** and create a new notebook
2. **Copy cells** from `colab/vjepa2_api.py` in order
3. **Set your ngrok authtoken** (get from https://dashboard.ngrok.com)
4. **Run all cells** and copy the ngrok URL
5. **Add to `backend/.env`:**
```env
COLAB_API_URL=https://your-ngrok-url.ngrok-free.app
ENABLE_VISUAL_ANALYSIS=true
```

See `colab/README.md` for detailed instructions.

## 📁 Project Structure

```
yklipp/
├── backend/              # FastAPI backend
│   ├── alembic/         # Database migrations
│   ├── db/              # Database models and CRUD operations
│   ├── jobs/            # Background job processors
│   ├── utils/           # Utility functions
│   │   ├── transcription_whisper.py
│   │   ├── semantic_segmentation.py
│   │   ├── visual_analysis.py
│   │   ├── colab_processor.py
│   │   └── ...
│   └── main.py          # FastAPI application entry point
├── main/
│   └── filmaddict/      # Next.js frontend
│       ├── app/         # Next.js app router pages
│       │   ├── api/     # API routes (Stripe, etc.)
│       │   ├── dashboard/
│       │   ├── timeline/
│       │   └── ...
│       ├── components/  # React components
│       └── lib/         # API client and utilities
├── colab/               # Colab GPU processing notebooks
│   ├── vjepa2_api.py
│   └── fast_processing_api.py
└── README.md
```

## ✨ Features

### Video Processing
- Upload video files (MP4, MOV, MKV, etc.)
- Import from YouTube URLs
- Automatic transcription with precise timestamps
- AI-powered moment detection
- Visual analysis with V-JEPA2

### Moment Detection
Identifies top engaging moments based on:
- Emotional intensity
- Information density
- Engagement potential
- Visual interest (via V-JEPA2)
- Repetition and filler word detection
- Retention scoring

Generates confidence scores for each moment.

### Clip Generation
- Multiple aspect ratio support:
  - 9:16 (TikTok, Reels, Shorts)
  - 16:9 (YouTube, Facebook, X)
  - 1:1 (Instagram, Facebook)
  - 4:5 (Instagram, X)
  - Original
- Automatic thumbnail generation
- Edit and refine clips
- Timeline-based editing

### Learning System
- Feedback collection for model improvement
- Online calibration
- Prompt version tracking
- Rolling metrics for performance monitoring
- Segment-level feedback

### Subscription & Payments
- Stripe integration
- Monthly ($10/month) and Yearly ($100/year) plans
- 3-day free trial with $1 trial fee
- Subscription management dashboard
- Webhook handling for subscription events

## 🔧 Development

### Database Migrations
```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### API Endpoints

Key endpoints:
- `POST /videos/upload` - Upload video file
- `POST /videos/youtube` - Import from YouTube
- `GET /videos/{video_id}/transcript` - Get transcription
- `GET /videos/{video_id}/moments` - Get detected moments
- `GET /videos/{video_id}/segments` - Get video segments
- `POST /moments/{moment_id}/save` - Save a moment
- `POST /videos/{video_id}/cut` - Create custom cut
- `GET /projects` - List all projects
- `GET /timelines/{video_id}` - Get timeline data

See `backend/main.py` for complete API documentation.

### Environment Variables

See `ENV_FILES.md` for complete environment variable reference.

## 🚢 Deployment

### Backend
- Deploy FastAPI application (AWS ECS, Railway, Render, etc.)
- Ensure Redis and PostgreSQL are accessible
- Configure S3 bucket CORS settings (if using S3)
- Set environment variables
- Run database migrations

### Frontend
- Deploy Next.js application (Vercel recommended)
- Configure `NEXT_PUBLIC_API_URL` environment variable
- Set Stripe publishable key
- Ensure CORS is properly configured on backend

### Colab Processing
- Keep Colab notebook running
- Update ngrok URL in backend `.env` if it changes
- Monitor Colab session timeout (free tier: ~12 hours)

## 📊 Performance

- **Local processing**: ~5-10 minutes for 10-minute video
- **Colab GPU processing**: ~30-60 seconds for 10-minute video
- **Speedup**: ~10x faster with Colab

## 🔐 Security

- Authentication via Clerk
- Stripe webhook signature verification
- CORS configuration
- Environment variable security
- S3 bucket policies (if using S3)

## 📝 License

Private project - All rights reserved

## 🤝 Contributing

This is a private project. For questions or issues, contact the project maintainer.
