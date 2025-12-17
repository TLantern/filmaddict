# FilmAddict (YKlipp)

AI-powered video analysis platform that helps long-form creators and editors identify the most valuable moments, structure, and cut points in videos before editing begins.

## Overview

FilmAddict reduces editing time by 50% by automatically:
- Transcribing video audio with precise timestamps
- Identifying the top 5-10 most engaging moments using AI
- Providing precise timestamps and markers for cut points
- Generating clips in various aspect ratios (9:16, 16:9, 1:1, 4:5, original)

## Architecture

### Frontend (`main/filmaddict/`)
- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Features**:
  - Video upload (file or YouTube URL)
  - Project management
  - Timeline viewer
  - Moment/clip editor
  - Real-time processing status

### Backend (`backend/`)
- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy (async)
- **Queue System**: Redis + RQ for background jobs
- **Storage**: AWS S3 for video and clip storage
- **Features**:
  - Video processing pipeline
  - Audio transcription
  - AI-powered highlight detection
  - Clip generation with aspect ratio conversion
  - Learning/feedback system for model improvement

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL
- Redis
- AWS S3 bucket (for video storage)
- FFmpeg

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables (create `.env`):
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost/filmaddict
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
OPENAI_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
```

4. Run database migrations:
```bash
alembic upgrade head
```

5. Start the backend server:
```bash
uvicorn main:app --reload
```

6. Start the worker (in a separate terminal):
```bash
python worker.py
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd main/filmaddict
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (create `.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
FilmAddict/
├── backend/              # FastAPI backend
│   ├── alembic/         # Database migrations
│   ├── db/              # Database models and CRUD operations
│   ├── jobs/            # Background job processors
│   ├── utils/           # Utility functions
│   └── main.py          # FastAPI application entry point
├── main/
│   └── filmaddict/      # Next.js frontend
│       ├── app/         # Next.js app router pages
│       ├── components/  # React components
│       └── lib/         # API client and utilities
└── README.md
```

## Features

### Video Processing
- Upload video files (MP4, MOV, MKV, etc.)
- Import from YouTube URLs
- Automatic transcription with timestamps
- AI-powered moment detection

### Moment Detection
- Identifies top engaging moments based on:
  - Emotional intensity
  - Information density
  - Engagement potential
- Generates confidence scores for each moment

### Clip Generation
- Multiple aspect ratio support:
  - 9:16 (TikTok, Reels, Shorts)
  - 16:9 (YouTube, Facebook, X)
  - 1:1 (Instagram, Facebook)
  - 4:5 (Instagram, X)
  - Original
- Automatic thumbnail generation
- Edit and refine clips

### Learning System
- Feedback collection for model improvement
- Online calibration
- Prompt version tracking
- Rolling metrics for performance monitoring

## Development

### Database Migrations
```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd main/filmaddict
npm test
```

## Deployment

### Backend
- Deploy FastAPI application (e.g., on AWS ECS, Railway, or Render)
- Ensure Redis and PostgreSQL are accessible
- Configure S3 bucket CORS settings
- Set environment variables

### Frontend
- Deploy Next.js application (e.g., on Vercel)
- Configure API URL environment variable
- Ensure CORS is properly configured

## License

Private project - All rights reserved
