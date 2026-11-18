# Docker Build & Deployment Guide

## 🚀 One-Step Deployment

After updating Dockerfile and requirements.txt, rebuild everything with:

```bash
# Stop current containers
docker-compose down

# Rebuild API service with all dependencies
docker-compose build api

# Start all services
docker-compose up -d

# Verify installation
docker-compose exec api python -c "
from llama_cpp import Llama
from app.ai_module.school_detector import detect_school_type
print('✅ All dependencies installed!')
print(f'School detection: {detect_school_type(\"MIT University\")}')
"
```

## ✅ What's Included

The Docker build now automatically installs:

**System Dependencies**:
- build-essential (gcc/g++ compilers)
- cmake (for llama-cpp-python)
- libopenblas-dev (BLAS library)
- git (for source downloads)

**Python Dependencies** (from requirements.txt):
- llama-cpp-python==0.2.56 (AI model inference)
- redis==5.0.1 (caching)
- hiredis==2.3.2 (fast Redis protocol)
- jsonschema==4.20.0 (JSON validation)
- All existing dependencies (FastAPI, SQLAlchemy, etc.)

## 🔧 Build Features

1. **Retry Logic**: apt-get retries 3 times if network fails
2. **Clean Lists**: Removes apt cache to reduce image size
3. **No Cache**: pip uses --no-cache-dir for smaller images
4. **Upgraded Tools**: Latest pip, setuptools, and wheel

## 📦 Image Size

- Base (python:3.11-slim): ~150MB
- With build tools: ~400MB
- With all dependencies: ~600MB
- **With AI model**: ~2.9GB

## ⚡ Build Time

- First build: 5-10 minutes (compiling llama-cpp-python)
- Subsequent builds: 30-60 seconds (using cache)

## 🎯 Production Deployment

```bash
# Production build with optimization
docker-compose build --no-cache api

# Start with production settings
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## ✅ Verification Checklist

After rebuild, verify:

```bash
# 1. Check services
docker-compose ps
# All should show "Up" and "healthy"

# 2. Test imports
docker-compose exec api python -c "from llama_cpp import Llama; print('✅')"

# 3. Run tests
docker-compose exec api python test_components.py

# 4. Check model
docker-compose exec api ls -lh /app/models/
# Should show phi-3-mini-4k-instruct-q4_k_m.gguf (2.3GB)
```

## 🐛 Troubleshooting

**Build fails on llama-cpp-python**:
- Ensure internet connection is stable
- Retry: `docker-compose build --no-cache api`
- Check Docker has enough memory (4GB+)

**apt-get update fails**:
- Wait a few minutes and retry
- Check Debian mirrors status
- Build retries 3 times automatically

**Model file missing after rebuild**:
- Model is in Docker volume `kuskul_ai_models`
- Copy again: `docker cp app/models/phi-3-mini*.gguf kuskul-api-1:/app/models/`
- Or mount host directory in docker-compose.yml

## 💡 Tips

- Use `docker-compose build --parallel` to speed up multi-service builds
- Add `--progress=plain` to see detailed build output
- Use `.dockerignore` to exclude unnecessary files from build context

---

**Result**: Single `docker-compose build api` installs everything! 🎉
