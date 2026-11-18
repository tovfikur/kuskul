FROM python:3.11-slim-bookworm

WORKDIR /app

# llama-cpp-python wheels may depend on musl runtime; also disable apt "Valid-Until"
# checks since container builds can run with a future system date.
RUN if [ -f /etc/apt/sources.list ]; then sed -i 's|http://|https://|g' /etc/apt/sources.list; fi && \
    if [ -f /etc/apt/sources.list.d/debian.sources ]; then sed -i 's|http://|https://|g' /etc/apt/sources.list.d/debian.sources; fi && \
    apt-get -o Acquire::Retries=5 -o Acquire::By-Hash=force -o Acquire::Check-Valid-Until=false update && \
    apt-get -o Acquire::Retries=5 -o Acquire::By-Hash=force -o Acquire::Check-Valid-Until=false install -y --no-install-recommends musl libgomp1 && \
    ln -sf /lib/x86_64-linux-musl/libc.so /lib/libc.musl-x86_64.so.1 && \
    ln -sf /usr/lib/x86_64-linux-musl/libc.so /usr/lib/libc.musl-x86_64.so.1 && \
    rm -rf /var/lib/apt/lists/*

# Upgrade pip first
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install llama-cpp-python from a pre-built wheel FIRST (no compilation!)
# Prefer PyPI manylinux wheels (glibc). Fall back to abetlen CPU wheel index if needed.
RUN pip install --no-cache-dir --only-binary=:all: llama-cpp-python==0.2.90 || \
    pip install --no-cache-dir \
      llama-cpp-python==0.2.90 \
      --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu && \
    python -c "from llama_cpp import Llama; print('llama-cpp-python import OK')"

# Now install other dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY alembic.ini /app/alembic.ini
COPY alembic /app/alembic
COPY app /app/app

# Create AI models directory
RUN mkdir -p /app/models

EXPOSE 8000

ENV PYTHONPATH=/app
CMD ["sh", "-c", "python -m alembic upgrade head && python app/scripts/seed_demo_data.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
