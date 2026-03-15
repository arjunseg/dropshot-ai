# DropShot AI — Pickleball Video Coaching

AI-powered mobile app that analyzes your pickleball shots and gives you specific, actionable coaching tips — faster and cheaper than a private lesson.

## Architecture

```
mobile/       React Native (Expo) — iOS + Android app
backend/      Python FastAPI — API server + video pipeline
ml/           Model training code (separate from serving)
infrastructure/ Nginx, Postgres, Redis configs
```

**Pipeline:**
`Upload → Pose Estimation (MediaPipe) → Paddle Detection (YOLOv8) → Phase Segmentation → Biomechanics → Claude AI Feedback`

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- Python 3.11+
- `ANTHROPIC_API_KEY` (get one at console.anthropic.com)

### 1. Start backend services

```bash
cp backend/.env.example backend/.env
# Add your ANTHROPIC_API_KEY to .env

docker-compose up -d
```

This starts:
- FastAPI on http://localhost:8000 (docs at /docs)
- Celery worker for video processing
- PostgreSQL on port 5432
- Redis on port 6379
- MinIO (S3-compatible storage) on port 9000 (console: 9001)

### 2. Run database migrations

```bash
cd backend
docker-compose exec api alembic upgrade head

# Optional: seed demo data
docker-compose exec api python -m scripts.seed_db
```

### 3. Start the mobile app

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `i` for iOS simulator.

## Backend Development

```bash
cd backend

# Install deps
poetry install

# Run locally (needs postgres + redis)
uvicorn app.main:app --reload --port 8000

# Run Celery worker
celery -A app.pipeline.tasks worker --loglevel=debug -Q video_analysis

# Run tests
pytest -v

# Lint
ruff check .
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Get tokens |
| POST | `/api/v1/upload/presigned-url` | Get S3 upload URL |
| POST | `/api/v1/upload/confirm` | Start analysis after upload |
| GET | `/api/v1/analyses/{id}` | Poll analysis status |
| GET | `/api/v1/analyses` | List user analyses |
| GET | `/api/v1/subscription/usage` | Check monthly usage |

## Mobile Development

```bash
cd mobile
npm install
npx expo start

# TypeScript check
npm run typecheck

# Lint
npm run lint
```

## ML Model Training

The paddle detector needs custom training data:

```bash
# Download base YOLOv8 weights
cd backend
python -m scripts.download_models

# Train on your labeled pickleball paddle dataset
# (see ml/README.md for dataset format)
python ml/train/train_paddle_detector.py

# Copy trained weights to backend
cp ml/models/paddle_detector_v1.pt backend/models/
```

Until the custom model is trained, the pipeline falls back to wrist-position heuristics — still functional but less accurate for paddle angle measurement.

## Environment Variables

See `backend/.env.example` and `mobile/.env.example` for full documentation.

## Subscription Tiers

| Tier | Price | Analyses |
|------|-------|----------|
| Free | $0 | 3/month |
| Pro | $9.99/month | Unlimited |
| Annual | $79.99/year | Unlimited |

Free tier enforcement is in `backend/app/dependencies.py:check_analysis_limit`.

## Tech Stack

- **Mobile:** React Native + Expo Router + Zustand + React Query
- **API:** Python FastAPI + SQLAlchemy (async) + PostgreSQL
- **Queue:** Celery + Redis
- **Storage:** AWS S3 (MinIO for local dev)
- **AI:** Claude API (`claude-sonnet-4-6`) for coaching feedback
- **Pose:** MediaPipe Pose (33 landmarks)
- **Detection:** YOLOv8 (custom-trained on paddle images)
- **Payments:** Stripe Checkout + webhooks
