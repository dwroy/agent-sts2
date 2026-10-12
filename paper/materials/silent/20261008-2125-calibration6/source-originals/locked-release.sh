#!/usr/bin/env bash
set -eu
task_scratch=/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261008-204304-silent-boss-calibration
export TMPDIR="$task_scratch"
export PATH="$HOME/.local/node/bin:$PATH"
exec 9>>/home/dw/Projects/agent-sts2/ops/live-merge.lock
while ! flock -n 9; do
  echo 'Waiting for the shared live merge lock; live is unchanged by this task.'
  sleep 10
done
while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do
  echo 'Waiting for the active knowledge builder to finish.'
  sleep 10
done
python3 "$task_scratch/locked-release.py" prepare
cd /home/dw/Projects/agent-sts2/.worktrees/live/agent
finish_release() {
  local test_exit=$?
  trap - EXIT
  set +e
  python3 "$task_scratch/locked-release.py" finish "$test_exit"
  local release_exit=$?
  exit "$release_exit"
}
trap finish_release EXIT
# Sourcing the fixed entry keeps the shared lock and avoids an extra coordinator process.
source tools/test-sandbox.sh >"$task_scratch/live-sandbox.log" 2>&1
