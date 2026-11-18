## Why it looks “stuck”
- Current progress logs only print at step boundaries and (during streaming) when **tokens/chunks start arriving**.
- llama-cpp can spend a long time on **prompt evaluation before the first token**, so you may see *nothing* for a while.
- Also, logs appear in the **API container output** (not the frontend terminal). You need to watch `api` logs.

## Plan
### 1) Add a heartbeat logger around model calls
- Wrap every model inference (planner + builder + repair) with a background heartbeat that prints every ~5–10 seconds:
  - `AI: planning section hero… still running (…ms)`
  - `AI: building section hero… still running (…ms)`
- This prints even if **no stream chunks** are produced yet.

### 2) Ensure logs are enabled by default
- Keep `AI_PROGRESS_LOGS=true` and `AI_STREAM_PROGRESS=true` default behavior.
- If env disables it, log once at the start saying progress logs are disabled.

### 3) Make sure you’re looking at the right place
- Confirm the correct terminal command to watch is the API container logs (`api` service).

### 4) Verify
- Trigger website generation and confirm the terminal continuously prints:
  - section-by-section progress
  - heartbeat lines every few seconds
  - final summary `ok/repaired/fallback`

If you approve, I’ll implement the heartbeat around llama calls in `backend/app/ai_module/inference.py` and verify with a generation run.