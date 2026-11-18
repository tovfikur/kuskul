## Current State (What’s Broken)
- The website/landing-page generator relies on `llama-cpp-python` via [model_loader.py](file:///p:/KusKul/backend/app/ai_module/model_loader.py) and is triggered from tenant provisioning ([platform_tenants.py](file:///p:/KusKul/backend/app/api/v1/endpoints/platform_tenants.py#L104-L136)) and via the authenticated endpoint ([ai_generation.py](file:///p:/KusKul/backend/app/api/v1/endpoints/ai_generation.py)).
- Your container error `libc.musl-x86_64.so.1: cannot open shared object file` means the packaged `libllama.so` is linked against musl and the runtime loader is looking for the musl libc under the specific filename `libc.musl-x86_64.so.1`. Installing Debian’s `musl` typically provides `ld-musl-x86_64.so.1` and `libc.so`, but not necessarily that exact SONAME alias, so the import still fails.

## Plan to Fix Runtime Compatibility
1. Update the API image build so the musl runtime library name that `libllama.so` expects is present:
   - Install `musl` in the image.
   - Add a symlink (or copy) so `/lib/libc.musl-x86_64.so.1` exists and points to the installed musl libc (usually `/lib/x86_64-linux-musl/libc.so`).
   - Repeat under `/usr/lib` if needed.
   - Keep this isolated to the backend image (no host changes).

2. Make `llama-cpp-python` install deterministic:
   - Prefer a single known-good installation path (either official wheels or the abetlen CPU wheel index), and verify at build time by running a small `python -c "from llama_cpp import Llama"` import check.

## Plan to Improve “Perfect” Website Generation Behavior
3. Add an explicit AI availability endpoint and clearer error reporting:
   - New endpoint like `GET /api/v1/ai/health` that checks:
     - `llama_cpp` import works
     - model file exists at `AI_MODEL_PATH`
   - Return a structured status (available/unavailable + reason). This makes it obvious in UI/ops why generation is failing.

4. Hardening inference and output validation:
   - Ensure `generate_website_json` always returns schema-valid output or a controlled fallback with a “source: ai/fallback” marker.
   - Keep caching best-effort (already handled in [cache_manager.py](file:///p:/KusKul/backend/app/ai_module/cache_manager.py)) but ensure cache keys include model/version so upgrades don’t poison results.

5. Improve rendering resilience:
   - In [WebsitePreview.tsx](file:///p:/KusKul/frontend/src/features/websites/components/WebsitePreview.tsx), make unknown section types degrade gracefully (no broken layout) and optionally map near-equivalent types.

## Verification (End-to-End)
- Rebuild the api container.
- Verify inside the container:
  - `python -c "from llama_cpp import Llama"` succeeds.
  - Calling `POST /api/v1/ai/generate` returns success and schema-valid JSON.
  - Tenant provisioning auto-generates a website (or uses fallback only when model truly unavailable).
  - Public site fetch works via [public_websites.py](file:///p:/KusKul/backend/app/api/v1/endpoints/public_websites.py).

If you confirm, I’ll implement these changes (backend image fix + AI health endpoint + inference/cache hardening + renderer resilience) and then run the full verification steps.