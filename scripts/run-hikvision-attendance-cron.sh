#!/usr/bin/env bash
# Run every ten minutes on the host running the KusKul API container.
# KUSKUL_API_CONTAINER may name a container when the deployment path differs.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
if [[ "${1:-}" != "--check" ]]; then
  exec 9>"$ROOT_DIR/backend/.attendance-worker.lock"
  if ! flock -n 9; then
    echo "$(date -Is) Attendance sync is still running; skipping overlapping pulse."
    exit 0
  fi
fi
container="${KUSKUL_API_CONTAINER:-}"
if [[ -z "$container" ]]; then
  container=$(docker ps --filter "label=com.docker.compose.project.working_dir=$ROOT_DIR" \
    --filter "label=com.docker.compose.service=api" --format '{{.ID}}')
fi
if [[ -z "$container" || "$container" == *$'\n'* ]]; then
  echo "$(date -Is) Expected one running KusKul API container for $ROOT_DIR; found none or multiple. Set KUSKUL_API_CONTAINER for a different deployment path." >&2
  exit 1
fi
if [[ "$(docker inspect --format '{{.State.Running}}' "$container")" != "true" ]]; then
  echo "$(date -Is) KusKul API container is not running: $container" >&2
  exit 1
fi
if [[ "${1:-}" == "--check" ]]; then
  echo "Attendance runner ready: $container"
  exit 0
fi
echo "$(date -Is) Starting attendance sync (10-minute pulse, 12-minute punch delay)."
docker exec "$container" python -m app.scripts.run_hikvision_attendance
