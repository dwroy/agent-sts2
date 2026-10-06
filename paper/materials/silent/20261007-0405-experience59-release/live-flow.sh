#!/usr/bin/env bash
set -eu
export TMPDIR=/home/dw/Projects/agent-sts2/learner/runs/20261007-034303-experience-update
while pgrep -f "knowledge/builders/buil[d]-" >/dev/null; do sleep 10; done
nice -n 19 python3 "$TMPDIR/merge-live.py"
nice -n 19 python3 "$TMPDIR/publish.py"
