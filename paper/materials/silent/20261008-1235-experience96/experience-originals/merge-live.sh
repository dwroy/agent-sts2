#!/usr/bin/env bash
set -euo pipefail
while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done
nice -n 19 python3 /home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-120901-experience-update/merge-live.py
