#!/usr/bin/env bash
# Play runs back to back with the latest committed code until ops/STOP exists.
# Each run: run.sh (blocking) -> post-mortem into notes/ -> short pause -> next run.
# A play process that exits before its run is over (a model outage, a crash) is logged as a restart,
# not a finish, and the next start backs off (24HM 2026-09-26: a 7-minute Jev 403 outage logged 30
# "finished run" lines, one every 12 s, and wrote 7 partial reports).
set -u
OPS="$HOME/Projects/sts2-jev/ops"
NOTES="$HOME/Projects/sts2-jev/notes"
mkdir -p "$NOTES"
restarts=0
while [ ! -f "$OPS/STOP" ]; do
  "$OPS/run.sh" "$@"
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
  if [ -n "$rid" ] && grep -q "\"run_id\": \"$rid\"" "$HOME/Projects/sts2-jev/jev-sts2/logs/runs.jsonl"; then
    python3 "$OPS/report.py" "$rid" > "$NOTES/run-$(date +%m%d-%H%M)-$rid.md" 2>&1
    echo "$(date '+%F %T') finished run $rid" >> "$OPS/autoplay.log"
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
