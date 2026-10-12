#!/usr/bin/env bash
set -eu
export TMPDIR="/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-111006-experience-update"
export PATH="$HOME/.local/node/bin:$PATH"
while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done
nice -n 19 python3 "$TMPDIR/merge-live.py"
