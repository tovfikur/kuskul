#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or is not available in PATH."
  echo "Install/start Docker, then run this launcher again."
  read -r -p "Press Enter to close..."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is not available, or this user cannot access Docker."
  echo "If Docker is installed, add your user to the docker group or run from a terminal with Docker permission."
  read -r -p "Press Enter to close..."
  exit 1
fi

port_in_use() {
  local port="$1"

  if command -v ss >/dev/null 2>&1; then
    ss -ltn "( sport = :${port} )" | tail -n +2 | grep -q .
  elif command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
  else
    return 1
  fi
}

available_port() {
  local port="$1"

  while port_in_use "$port"; do
    port=$((port + 1))
  done

  printf '%s' "$port"
}

export KUSKUL_WEB_PORT="$(available_port 13000)"
export KUSKUL_API_PORT="$(available_port 18000)"
export KUSKUL_DB_PORT="$(available_port 15432)"
export KUSKUL_REDIS_PORT="$(available_port 16379)"

APP_URL="http://localhost:${KUSKUL_WEB_PORT}"
API_URL="http://localhost:${KUSKUL_API_PORT}"

echo "Starting KusKul project..."
echo
echo "This launcher uses available local ports:"
echo "  Web:      ${APP_URL}"
echo "  API:      ${API_URL}"
echo "  Postgres: localhost:${KUSKUL_DB_PORT}"
echo "  Redis:    localhost:${KUSKUL_REDIS_PORT}"
echo

echo "Building and starting containers. First run can take several minutes..."
if ! docker compose -f docker-compose.yml -f docker-compose.local-safe.yml up -d --build; then
  echo
  echo "KusKul could not start."
  echo "Common causes:"
  echo "  - Docker Desktop or Docker Engine is not running."
  echo "  - This Linux user does not have permission to use /var/run/docker.sock."
  echo "  - Another service claimed one of the selected ports before Docker could bind it."
  echo
  echo "After fixing Docker, run this launcher again."
  read -r -p "Press Enter to close..."
  exit 1
fi

echo
echo "Container status:"
docker compose -f docker-compose.yml -f docker-compose.local-safe.yml ps

echo
echo "KusKul is starting at ${APP_URL}"
echo "FastAPI docs will be at ${API_URL}/docs"

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$APP_URL" >/dev/null 2>&1 || true
fi

echo
echo "Leave Docker running while you use the project."
read -r -p "Press Enter to close this window..."
