#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Starting KusKul with Odoo-safe host ports:"
echo "  KusKul Postgres: localhost:15432 -> container db:5432"
echo "  KusKul Redis:    localhost:16379 -> container redis:6379"
echo "  KusKul API:      http://localhost:8000"
echo "  KusKul Web:      http://localhost:3000"
echo
echo "Odoo can continue using localhost:5432 and http://localhost:8017."
echo

exec docker compose \
  -f docker-compose.yml \
  -f docker-compose.odoo-safe.yml \
  up "$@"
