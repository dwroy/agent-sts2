#!/usr/bin/env bash
# Block until autoplay finishes the next run.
# Used by the supervising session: its exit is the per-run wake-up (post-mortem, every-5-runs rule update).
set -u
OPS="$HOME/Projects/sts2-jev/ops"
LOG="$OPS/autoplay.log"
n0=$(wc -l < "$LOG")
until [ "$(wc -l < "$LOG")" -gt "$n0" ]; do sleep 30; done
# The knowledge rebuild (monster DB, move model, outcome stats, boss damage, card upgrades, ...) runs in report.py after
# every run; it was duplicated here and the two raced on the same temp files (2026-10-04), so this only waits.
tail -1 "$LOG"
echo "runs since last rule update: $(( $(wc -l < "$LOG") - $(cat "$OPS/rule-update.mark" 2>/dev/null || echo 0) ))"
