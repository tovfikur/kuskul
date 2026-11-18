"""Tiny local llama.cpp HTTP sidecar for writing absence SMS messages.

Run separately from the main API so model load time and RAM are isolated:

    uvicorn app.ai_writer_server:app --host 0.0.0.0 --port 8010 --workers 1

The model is loaded lazily and generation is serialized.  If the model file is
missing the health endpoint reports ``degraded`` and generation returns 503; the
main API then falls back to its configured SMS template.
"""
from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MODEL_PATH = os.getenv("AI_MODEL_PATH", "/app/models/qwen2.5-0.5b-instruct-q4_k_m.gguf")
CHAT_FORMAT = os.getenv("AI_WRITER_CHAT_FORMAT", "chatml")
N_CTX = int(os.getenv("AI_WRITER_N_CTX", "1024"))
N_THREADS = int(os.getenv("AI_WRITER_N_THREADS", "1"))
N_BATCH = int(os.getenv("AI_WRITER_N_BATCH", "64"))

app = FastAPI(title="KusKul AI Writer", docs_url=None, redoc_url=None)
_model = None
_model_lock = threading.Lock()
_generation_lock = threading.Lock()


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class GenerateRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=8)
    max_tokens: int = Field(default=96, ge=16, le=256)
    temperature: float = Field(default=0.35, ge=0.0, le=1.0)
    top_p: float = Field(default=0.9, ge=0.1, le=1.0)


class GenerateResponse(BaseModel):
    text: str


def _load_model():
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        if not Path(MODEL_PATH).is_file():
            raise FileNotFoundError(MODEL_PATH)
        from llama_cpp import Llama

        _model = Llama(
            model_path=MODEL_PATH,
            chat_format=CHAT_FORMAT,
            n_ctx=N_CTX,
            n_threads=N_THREADS,
            n_batch=N_BATCH,
            n_gpu_layers=0,
            use_mlock=False,
            use_mmap=True,
            verbose=False,
        )
        return _model


@app.on_event("startup")
def _warm_model() -> None:
    """Load the model before the first SMS so the first worker call is fast."""
    if not Path(MODEL_PATH).is_file():
        return
    try:
        _load_model()
    except Exception:
        # Health/generate will report the failure; the main API falls back.
        pass


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok" if Path(MODEL_PATH).is_file() else "degraded",
        "model_loaded": _model is not None,
        "model_path": MODEL_PATH,
        "chat_format": CHAT_FORMAT,
        "n_ctx": N_CTX,
        "n_threads": N_THREADS,
    }


@app.post("/generate", response_model=GenerateResponse)
def generate(payload: GenerateRequest) -> GenerateResponse:
    if not Path(MODEL_PATH).is_file():
        raise HTTPException(status_code=503, detail="AI model file is not available")
    try:
        model = _load_model()
    except Exception as exc:  # noqa: BLE001 - surface a small, safe error
        raise HTTPException(status_code=503, detail=f"AI model failed to load: {type(exc).__name__}") from exc
    messages = [{"role": message.role, "content": message.content} for message in payload.messages]
    with _generation_lock:
        result = model.create_chat_completion(
            messages=messages,
            max_tokens=payload.max_tokens,
            temperature=payload.temperature,
            top_p=payload.top_p,
            repeat_penalty=1.1,
            stop=["\n\nNow write", "\n\nExample facts", "\n\nFacts", "\n\nJSON", "\n\nSMS:"],
        )
    try:
        text = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="AI model returned an unexpected response") from exc
    return GenerateResponse(text=str(text or "").strip())
