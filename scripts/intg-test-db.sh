#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/.docker/docker-compose.test-db.yml"

DATABASE_URL_DEFAULT="postgresql://hms_test:hms_test@localhost:55432/hms_test?schema=public"
DATABASE_URL="${DATABASE_URL:-$DATABASE_URL_DEFAULT}"

usage() {
  echo "Usage: $0 up|down"
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

wait_for_db() {
  local retries=20
  local sleep_seconds=2

  for _ in $(seq 1 "$retries"); do
    if docker exec docker-test-db-1 pg_isready -U hms_test -d hms_test >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_seconds"
  done

  echo "Database did not become ready in time." >&2
  exit 1
}

action="${1:-}"
case "$action" in
  up)
    require_command docker
    require_command npx

    docker compose -f "$COMPOSE_FILE" up -d

    echo "waiting for db..."
    wait_for_db

    (
      cd "$ROOT_DIR"
      DATABASE_URL="$DATABASE_URL" npx prisma generate
      DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
    )
    ;;
  down)
    require_command docker
    docker compose -f "$COMPOSE_FILE" down -v
    ;;
  *)
    usage
    ;;
esac
