#!/usr/bin/env bash
set -euo pipefail
export TMPDIR=/home/dw/Projects/agent-sts2/learner/runs/20261007-021220-experience-update
export PATH="$HOME/.local/node/bin:$PATH"
while [ ! -f "$TMPDIR/test-source-final.rc" ]; do sleep 10; done
mv "$TMPDIR/test-source-final.log" "$TMPDIR/test-source-intermediate.log"
mv "$TMPDIR/test-source-final.rc" "$TMPDIR/test-source-intermediate.rc"
git hash-object knowledge/characters/silent/experience.json > "$TMPDIR/tested-source-blob.txt"
set +e
bash agent/tools/test-sandbox.sh > "$TMPDIR/test-source-final.log" 2>&1
result=$?
set -e
printf '%s\n' "$result" > "$TMPDIR/test-source-final.rc"
[ "$result" = 0 ]
nice -n 19 python3 "$TMPDIR/finalize-source.py"
flock /home/dw/Projects/agent-sts2/ops/live-merge.lock bash "$TMPDIR/live-flow.sh"
