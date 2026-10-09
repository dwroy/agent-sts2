#!/usr/bin/env bash
set -eu
task_scratch="$(cd "$(dirname "$0")" && pwd)"
export TMPDIR="$task_scratch"
export PATH="$HOME/.local/node/bin:$PATH"
cd "$task_scratch/../../.."
while [ ! -f "$task_scratch/replay.exit" ]; do sleep 10; done
test "$(cat "$task_scratch/replay.exit")" = 0
test "$(cat "$task_scratch/source-sandbox.exit")" = 0
test "$(cat "$task_scratch/python-fixed-scratch.exit")" = 0
test "$(cat "$task_scratch/dispatch-adapted-fixtures.exit")" = 0
python3 "$task_scratch/finish-refresh.py" > "$task_scratch/finish-refresh.log" 2>&1
python3 "$task_scratch/prepare-records.py" > "$task_scratch/prepare-records.log" 2>&1
printf '0\n' > "$task_scratch/finish-pipeline.exit"
