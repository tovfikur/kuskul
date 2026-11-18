## Can we combine Phi + StarCoder-Lite?
- Yes: you can run a “two-stage” pipeline where **Phi** generates content/structure and **StarCoder-Lite** acts as a strict **JSON/schema repair + formatter**.
- But it won’t automatically fix reliability by itself; the biggest reliability gain usually comes from **constrained decoding (JSON grammar)** and **smaller per-section generations**.
- Also, your repo currently only contains Phi GGUF ([phi-3-mini-4k-instruct-q4_k_m.gguf](file:///p:/KusKul/app/models/phi-3-mini-4k-instruct-q4_k_m.gguf)). There is no StarCoder-Lite model in `/app/models` yet, so we’d need to add one.

## Why it’s failing today
- The model sometimes returns output that doesn’t contain a complete `{ ... }` block, so `_extract_json` fails.
- Even when it returns JSON, LLMs can easily violate schemas unless we either:
  - enforce JSON generation with a grammar, or
  - do a repair pass.

## Plan (Most Reliable Approach)
### 1) Add JSON grammar enforcement (single-model reliability boost)
- Use llama-cpp’s **grammar-constrained generation** (JSON grammar) so outputs are always syntactically valid JSON.
- Apply this to:
  - site `metadata + theme`
  - each section object
- Keep validation with [json_validator.py](file:///p:/KusKul/backend/app/ai_module/json_validator.py) as the semantic check.

### 2) Add optional StarCoder-Lite as a “repair/formatter model” (dual-model)
- Add env vars:
  - `AI_MODEL_PATH_CONTENT` (Phi GGUF)
  - `AI_MODEL_PATH_REPAIR` (StarCoder-Lite GGUF)
  - `AI_REPAIR_ENABLED=true/false`
- Update model loader to cache and return the right model instance by “role” (content vs repair).

### 3) Two-stage generation flow
- Stage A (Phi): generate section-by-section content (fast + coherent).
- Stage B (StarCoder-Lite): if a section fails JSON validation, send the section text + required schema shape and ask StarCoder-Lite to output **only repaired JSON** (with JSON grammar enforced).

### 4) Make it observable (progress logs)
- Keep “Generating section X/Y …” logs and a heartbeat every ~10s during inference.
- Add a final summary log: counts of AI vs repaired vs fallback sections.

### 5) Add the StarCoder-Lite model file
- We’ll support it in code, but you’ll need to place the GGUF in `/app/models` (or mount it) because it’s large and not in this repo.

## Verification
- Run generation with:
  - Phi-only + JSON grammar → should always return valid JSON.
  - Force failure (tiny max_tokens) → repair model should produce valid JSON.
- Confirm the resulting JSON renders all your sections in the preview without “Unknown section type”.

If you confirm this plan, I’ll implement the grammar-constrained generation first (biggest reliability win), then add StarCoder-Lite repair as an optional second model.