# Environment Variables Reference

This document explains all `.env` and `.env.local` files used in the FilmAddict project.

## Backend `.env` File

Located in `backend/.env` - contains all backend configuration.

### Required Variables

```env
# Database Connection (PostgreSQL)
DATABASE_URL=postgresql+asyncpg://user:password@localhost/filmaddict
# Example for Neon/Supabase: postgresql+asyncpg://user:password@host:5432/dbname?sslmode=require
```

### Optional Variables (with defaults)

```env
# API Keys
OPENAI_API_KEY=sk-...              # Required if using LLM fallback (ENABLE_LLM_FALLBACK=true)
COLAB_API_URL=https://...          # Required for Colab GPU processing (10x faster)
                                    # Get this from Colab notebook ngrok URL

# Storage Configuration
STORAGE_TYPE=s3                     # "s3" or "local" (default: "local")
UPLOAD_DIR=./uploads               # Local storage directory (default: "./uploads")
AWS_ACCESS_KEY_ID=...              # Required if STORAGE_TYPE=s3
AWS_SECRET_ACCESS_KEY=...          # Required if STORAGE_TYPE=s3
S3_BUCKET_NAME=...                 # Required if STORAGE_TYPE=s3 (also accepts AWS_S3_BUCKET)
AWS_REGION=us-east-1               # AWS region (default: "us-east-1")

# Processing Configuration
ENABLE_LLM_FALLBACK=false          # Enable LLM analysis (default: "false")
ENABLE_VISUAL_ANALYSIS=true        # Enable visual analysis in Colab (default: "true")
VJEPA2_MODE=colab                  # "colab", "local", or disabled (default: "colab")

# YouTube Download Configuration
YOUTUBE_FORMAT=best                # Video format preference (default: "best")
YOUTUBE_COOKIES=/path/to/cookies.txt  # Path to cookies file (Netscape format) - optional
YOUTUBE_COOKIES_FROM_BROWSER=chrome  # Extract cookies from browser - optional
                                    # Supported: chrome, chromium, firefox, opera, edge, safari, brave, vivaldi
                                    # Note: YOUTUBE_COOKIES_FROM_BROWSER takes precedence if both are set

# Model Configuration (only needed if not using Colab)
WHISPER_MODEL=openai/whisper-large-v3
EMBEDDING_MODEL=BAAI/bge-large-en-v1.5
USE_GPU=true                       # Use GPU for local processing (default: "true")

# Server Configuration
PORT=8000                          # Backend server port (default: 8000)
APP_VERSION=0.1.0                  # App version

# Redis Queue (optional - uses async queue if not set)
REDIS_URL=redis://localhost:6379/0  # Redis connection URL for RQ worker

# Learning Pipeline
LEARNING_JOB_INTERVAL_HOURS=24     # Hours between learning pipeline runs (default: 24)
LEARNING_DAYS=7                    # Days of feedback to analyze (default: 7)

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001  # Comma-separated origins
```

### Complete Backend `.env` Example

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost/filmaddict

# Colab Processing (10x faster - recommended)
COLAB_API_URL=https://abc123.ngrok-free.app

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

---

## Frontend `.env.local` File

Located in `main/filmaddict/.env.local` - contains frontend configuration.

### Required Variables

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
# Or use ngrok URL: NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app

# Stripe Publishable Key (for custom checkout)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
# Get from: https://dashboard.stripe.com/apikeys
```

### Complete Frontend `.env.local` Example

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# For production or ngrok:
# NEXT_PUBLIC_API_URL=https://your-backend-url.com

# Stripe Publishable Key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51SjkWIPTrLFdO6j8...
```

---

## Summary

### Backend `.env` (backend/.env)
**Purpose**: Backend server configuration
**Key Variables**:
- `DATABASE_URL` - PostgreSQL connection (required)
- `COLAB_API_URL` - Colab processing endpoint (recommended for 10x speedup)
- `STORAGE_TYPE` - Storage backend (local or s3)
- AWS credentials (if using S3)

### Frontend `.env.local` (main/filmaddict/.env.local)
**Purpose**: Frontend Next.js configuration
**Key Variables**:
- `NEXT_PUBLIC_API_URL` - Backend API URL (required)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key for custom checkout (required for payments)

---

## Setup Checklist

### Backend Setup
1. Create `backend/.env` file
2. Set `DATABASE_URL` (required)
3. Set `COLAB_API_URL` (recommended - get from Colab notebook)
4. Configure storage (local or S3)
5. Optional: Set `OPENAI_API_KEY` if using LLM fallback

### Frontend Setup
1. Create `main/filmaddict/.env.local` file
2. Set `NEXT_PUBLIC_API_URL` to your backend URL

### Colab Setup
1. Run Colab notebook (`colab/vjepa2_api.py`)
2. Copy ngrok URL from Colab output
3. Add to `backend/.env`: `COLAB_API_URL=https://your-ngrok-url.ngrok-free.app`

---

## Notes

- `.env` files are gitignored - never commit them
- `.env.local` is Next.js convention for local environment variables
- `NEXT_PUBLIC_*` prefix makes variables available to browser/client code
- Without `COLAB_API_URL`, backend will try local processing (requires ML libraries)
- With `COLAB_API_URL`, backend uses Colab GPU processing (no local ML libs needed)

