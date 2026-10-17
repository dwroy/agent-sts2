#!/usr/bin/env bash
# Preserve unused scratch history, run the repository's original entry point, then restore every byte.
set -u
h0_work=/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration
h0_out="$h0_work/learner/runs/20261017-human-pace-h0-r1"
export PATH="$HOME/.local/node/bin:$PATH"
export TMPDIR="$h0_out"
export SANDBOX_WORKERS=1
nice -n 19 python3 "$h0_out/preserve-test-history.py" preserve > "$h0_out/test-history-preserve.log" 2>&1 || exit $?
trap 'nice -n 19 python3 "$h0_out/preserve-test-history.py" restore > "$h0_out/test-history-restore.log" 2>&1' EXIT
cd "$h0_work/agent" || exit $?
date '+%Y-%m-%d %H:%M:%S %Z' > "$h0_out/source-sandbox-started.txt"
bash tools/test-sandbox.sh > "$h0_out/source-sandbox.log" 2>&1
h0_test_rc=$?
printf '%s\n' "$h0_test_rc" > "$h0_out/source-sandbox.exit"
date '+%Y-%m-%d %H:%M:%S %Z' > "$h0_out/source-sandbox-finished.txt"
exit "$h0_test_rc"
