#!/usr/bin/env bash
# Dependent audits and fixed tests run sequentially after the new replay finishes.
set -u
TASK_SCRATCH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASK_ROOT="$(cd "$TASK_SCRATCH/../../.." && pwd)"
export PATH="$HOME/.local/node/bin:$PATH"
export TMPDIR="$TASK_SCRATCH"
export SANDBOX_WORKERS=1
run_check() {
  local label="$1"
  shift
  nice -n 19 "$@" > "$TASK_SCRATCH/$label.log" 2>&1
  local result=$?
  printf '%s\n' "$result" > "$TASK_SCRATCH/$label.exit"
  printf '%s: %s\n' "$label" "$result"
  if [[ "$result" != 0 ]]; then
    tail -n 20 "$TASK_SCRATCH/$label.log"
    exit "$result"
  fi
}
cd "$TASK_ROOT"
run_check finish-refresh /home/dw/Projects/agent-sts2/data/logdb-venv/bin/python "$TASK_SCRATCH/finish-refresh.py"
cd "$TASK_ROOT/agent"
run_check source-sandbox bash tools/test-sandbox.sh
cd "$TASK_ROOT"
