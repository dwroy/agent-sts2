#!/usr/bin/env bash
set -eu
while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do
  sleep 10
done
exec nice -n 19 python3 /home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261009-075800-experience-update/merge-live.py
