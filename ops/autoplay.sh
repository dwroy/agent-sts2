#!/usr/bin/env bash
# Play runs back to back with the latest committed code until ops/STOP exists.
# Each run: run.sh (blocking) -> post-mortem into notes/ -> short pause -> next run.
# A play process that exits before its run is over (a model outage, a crash) is logged as a restart,
# not a finish, and the next start backs off (24HM 2026-09-26: a 7-minute Jev 403 outage logged 30
# "finished run" lines, one every 12 s, and wrote 7 partial reports).
# "Over" is the play loop's own verdict in its console log ("stopped: run 1 ended (defeat)"), not runs.jsonl:
# report.py below is what appends the run to runs.jsonl, so checking runs.jsonl first never passed
# (HFNEL0CRKF96 2026-09-30, the first run on this check; the v3 loop had been running the older script).
# WAIT_PID=<pid of a play process left running by a killed autoplay>: wait for it as the first run
# instead of starting one, so the loop can be restarted mid-run.
set -u
OPS="$HOME/Projects/sts2-jev/ops"
NOTES="$HOME/Projects/sts2-jev/notes"
CONSOLE="$HOME/Projects/sts2-jev/jev-sts2/logs/console"
RUNS="$HOME/Projects/sts2-jev/jev-sts2/logs/runs.jsonl"
mkdir -p "$NOTES"
restarts=0
while [ ! -f "$OPS/STOP" ]; do
  if [ -n "${WAIT_PID:-}" ]; then
    while kill -0 "$WAIT_PID" 2>/dev/null; do sleep 5; done
    WAIT_PID=""
  else
    "$OPS/run.sh" "$@"
  fi
  rid=$(python3 - <<'PY'
import json, os
last = None
for line in open(os.path.expanduser("~/Projects/sts2-jev/jev-sts2/logs/decisions.jsonl"), encoding="utf8"):
    try:
        run = json.loads(json.loads(line)["fingerprint"]).get("run")
    except Exception:
        continue
    if run:
        last = run
print(last or "")
PY
)
  console=$(ls -t "$CONSOLE"/*.log 2>/dev/null | head -1)
  if [ -n "$rid" ] && [ -n "$console" ] && grep -qE "stopped: run [0-9]+ ended \(" "$console"; then
    python3 "$OPS/report.py" "$rid" > "$NOTES/run-$(date +%m%d-%H%M)-$rid.md" 2>&1
    # report.py appends the run to runs.jsonl only when it sees the end itself (stop-after-a8.sh counts those).
    note=""; grep -q "\"run_id\": \"$rid\"" "$RUNS" || note=" (not in runs.jsonl)"
    echo "$(date '+%F %T') finished run $rid$note" >> "$OPS/autoplay.log"
    restarts=0
    sleep 5
  else
    restarts=$((restarts + 1))
    echo "$(date '+%F %T') restart $restarts mid-run $rid" >> "$OPS/restarts.log"
    # 5 s, then up to 60 s between restarts while the play process keeps exiting early.
    delay=$((restarts * 5)); [ "$delay" -gt 60 ] && delay=60
    sleep "$delay"
  fi
done
echo "$(date '+%F %T') STOP file found, exiting" >> "$OPS/autoplay.log"
