#!/usr/bin/env bash
# Block until autoplay finishes the next run, then refresh the enemy move model from the logs.
# Used by the supervising session: its exit is the per-run wake-up (post-mortem, every-5-runs rule update).
set -u
OPS="$HOME/Projects/sts2-jev/ops"
LOG="$OPS/autoplay.log"
n0=$(wc -l < "$LOG")
until [ "$(wc -l < "$LOG")" -gt "$n0" ]; do sleep 30; done
# Monster DB + per-fight move model (replaces build-move-model.py, which mixed fights; 2026-09-28).
T="$HOME/Projects/sts2-jev/jev-sts2/tools"
python3 "$T/build-monster-db.py" --quiet --move-model-out "$HOME/Projects/sts2-jev/jev-sts2/src/knowledge/move-model.json"
python3 "$T/monster-db-check.py" >/dev/null 2>&1 || true
python3 "$T/build-outcome-stats.py" >/dev/null 2>&1 || true
tail -1 "$LOG"
echo "runs since last rule update: $(( $(wc -l < "$LOG") - $(cat "$OPS/rule-update.mark" 2>/dev/null || echo 0) ))"
