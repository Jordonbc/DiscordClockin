#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

pids=()
service_names=()

cleanup() {
  if ((${#pids[@]} > 0)); then
    echo "\nStopping services..."
    for pid in "${pids[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true
      fi
    done
    pids=()
    service_names=()
  fi
}

on_exit() {
  local exit_code=$?
  cleanup
  exit "$exit_code"
}

trap 'echo "\nReceived interrupt signal."; exit 130' INT TERM
trap on_exit EXIT

run_service() {
  local name="$1"
  local dir="$2"
  shift 2

  (
    cd "$dir"
    echo "[$name] Starting: $*"
    exec "$@"
  ) &

  local pid=$!
  pids+=("$pid")
  service_names+=("$name")
}

run_service "backend" "$SCRIPT_DIR/backend" cargo run
run_service "discord_bot" "$SCRIPT_DIR/DiscordBots/clockin" node .
run_service "frontend" "$SCRIPT_DIR/frontend" npx serve .

echo "All services started. Press Ctrl+C to stop."

while ((${#pids[@]} > 0)); do
  if wait -n; then
    status=0
  else
    status=$?
  fi

  ended_index=-1
  for i in "${!pids[@]}"; do
    pid="${pids[$i]}"
    if ! kill -0 "$pid" 2>/dev/null; then
      ended_index=$i
      break
    fi
  done

  if ((ended_index >= 0)); then
    name="${service_names[$ended_index]}"
    echo "\nService '$name' has exited with status $status."
  else
    echo "\nA service has exited with status $status."
  fi

  exit "$status"
done
