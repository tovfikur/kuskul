# AI Website Generation - Quick Start Guide

## What's Been Implemented

### ✅ Docker Configuration
- **Redis**: Added to `docker-compose.yml` for caching
- **Dependencies**: Updated `requirements.txt` with AI packages
- **Dockerfile**: Added build tools for llama-cpp-python
- **Memory**: Allocated 4GB for AI service

### ✅ Database Models
Created 4 new SQLAlchemy models:
1. `TenantWebsite` - Stores active website per tenant
2. `AIGeneration` - Audit trail of generations
3. `WebsiteSection` - Template library
4. `AIGenerationQueue` - Async job queue

Migration file: `backend/alembic/versions/0032_ai_website_gen.py`

### ✅ AI Module
Located in `backend/app/ai_module/`:
- `model_loader.py` - Lazy load llama-cpp models (content + builder)
- `inference.py` - Section-by-section website generation engine (Brain → Builder)
- `school_detector.py` - Auto-detect school type
- `cache_manager.py` - Redis caching
- `json_validator.py` - Schema validation
- `prompt_builder.py` - Prompt construction

## Next Steps to Get Running

### 1. Rebuild Docker Containers

```powershell
# Stop current containers
docker-compose down

# Rebuild with new dependencies
docker-compose build

# Start services
docker-compose up -d
```

This will:
- Install llama-cpp-python and Redis
- Apply database migration (creates 4 new tables)
- Start Redis container

### 2. Download AI Model (Required)

The Phi-3-mini model (2.3GB) must be downloaded manually. The project mounts `./app/models` into the API container at `/app/models`.

**Option A: Manual Download**
```powershell
# Create models directory (repo root)
mkdir app\models

# Download from Hugging Face (use browser or curl)
# https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4_K_M.gguf

# Place in: app\models\phi-3-mini-4k-instruct-q4_k_m.gguf
```

**Option B: Using wget/curl (if available)**
```powershell
mkdir app\models
curl -L https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4_K_M.gguf -o app/models/phi-3-mini-4k-instruct-q4_k_m.gguf
```

### 2b. Optional: Add StarCoder-Lite (Builder / Repair Model)

If you want a dedicated “Builder” model for strict JSON output, place a StarCoder-Lite GGUF into `app/models` and configure:
- `AI_MODEL_PATH_REPAIR=/app/models/<your-starcoder-lite.gguf>`
- `AI_BUILDER_ROLE=repair`

This implements the pattern:
- Phi (Brain) → plans the schema/keys for each section
- StarCoder-Lite (Builder) → produces the final JSON

## Where to Watch Progress Logs
- Progress logs print from the **API container** (FastAPI/Uvicorn stdout).
- If generation “looks stuck”, watch the `api` service logs and you should see periodic heartbeat lines like:\n  `AI: building section: hero (still running) (...ms)`

### Heartbeat Interval
- Default heartbeat interval is **30 seconds**.
- Override with: `AI_HEARTBEAT_SECONDS=30`

### 3. Verify Setup

```powershell
# Check database migration
docker-compose exec api python -c "from app.models.tenant_website import TenantWebsite; print('Models loaded!')"

# Check Redis
docker-compose exec redis redis-cli ping
# Should return: PONG

# Check if model file is accessible (after download)
docker-compose exec api ls -lh /app/models/
```

## Testing the AI Module

Once model is downloaded, test generation:

```powershell
docker-compose exec api python -c "
from app.ai_module.school_detector import detect_school_type
result = detect_school_type('Lincoln High School with strong athletics program')
print(f'Detected: {result}')
"
```

## Status

### ✅ Completed
- [x] Docker configuration updated
- [x] Database models created
- [x] Migration file created
- [x] AI module core structure
- [x] Redis caching setup
- [x] School type detection

### ⏳ Next Phase (After Model Download)
- [ ] API endpoints for website generation
- [ ] Frontend UI components
- [ ] Template examples library
- [ ] Full end-to-end testing

## Important Notes

1. **Model Files**: Model binaries are NOT committed. Place GGUFs under `app/models` (mounted to `/app/models`).

2. **Memory**: Docker needs 4GB RAM minimum for the API container.

3. **Redis**: Now running on port 6379. Check with: `docker-compose ps`

4. **Environment**: All AI config is in `docker-compose.yml` under `api.environment`

## Troubleshooting

**Build fails on llama-cpp-python:**
```powershell
# Make sure Docker has enough resources
# Settings > Resources > Memory: 8GB+
```

**Model not found error:**
```
# Download the model file (see step 2 above)
# Verify path: app/models/phi-3-mini-4k-instruct-q4_k_m.gguf
```

**Redis connection failed:**
```powershell
docker-compose logs redis
# Should show "Ready to accept connections"
```
