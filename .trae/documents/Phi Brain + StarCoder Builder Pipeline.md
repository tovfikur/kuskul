## What you described (Brain → Builder) is the right pattern
- **Phi (Brain)**: produce a small, deterministic “generation plan” (keys, structure, constraints, section order desktop/mobile, content bullets).
- **StarCoder-Lite (Builder)**: take that plan and output **strict JSON only** (temperature 0 + JSON grammar).
- **Validator**: run schema + `json.loads` checks; if fail → retry/repair/fallback.

This is exactly how to turn “creative LLM output” into “reliable structured output”.

## What’s needed in this repo to support it
### 1) Two-model support (already partially wired)
- Add two model roles:
  - `AI_MODEL_PATH_CONTENT` = Phi GGUF
  - `AI_MODEL_PATH_REPAIR` = StarCoder-Lite GGUF
- If repair model isn’t set, builder falls back to Phi (still works).

### 2) JSON grammar enforcement (biggest reliability win)
- Ensure llama-cpp JSON grammar loads successfully in our runtime.
- Force `grammar=<json_grammar>` on all Builder outputs so we **always** get syntactically valid JSON.

### 3) Implement Brain→Builder prompts
For each generation step:
1. **Brain prompt (Phi)**: output a small JSON “instruction pack”, for example:
   - required props keys + short content bullets
   - required anchors/links (e.g., `#admissions`, `#contact`)
   - exact `type`, `order`, `orderMobile`
2. **Builder prompt (StarCoder)**: given that instruction pack + one strict example, output **only** the final JSON object.

### 4) Repair pass + outcomes summary
- If Builder output fails validation, run a repair prompt once (still with grammar).
- Track counts: `ai_ok`, `repaired`, `fallback` and print a final summary line in terminal.

### 5) Model file placement
- Place StarCoder-Lite GGUF under `/app/models` (or mount a volume) and set `AI_MODEL_PATH_REPAIR` accordingly.
- Do not commit model binaries to the repo.

## Verification
- Run a generation with `AI_JSON_GRAMMAR=true` and confirm:
  - terminal shows progress per section
  - outputs always parse as JSON
  - frontend renders all sections (no “Unknown section type”)
- Run with a tiny token limit to force errors and confirm the repair model fixes them.

If you want StarCoder-Lite to be the only Builder, we’ll also add a switch like `AI_BUILDER_ROLE=repair` so all final JSON comes from StarCoder-Lite while Phi only plans.