#!/usr/bin/env bash
# Play runs back to back with the latest committed code until ops/STOP exists.
# Each run: run.sh (blocking) -> post-mortem into notes/ -> short pause -> next run.
set -u
OPS="$HOME/Projects/sts2-jev/ops"
NOTES="$HOME/Projects/sts2-jev/notes"
mkdir -p "$NOTES"
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
  [ -n "$rid" ] && python3 "$OPS/report.py" "$rid" > "$NOTES/run-$(date +%m%d-%H%M)-$rid.md" 2>&1
  echo "$(date '+%F %T') finished run $rid" >> "$OPS/autoplay.log"
  sleep 5
done
echo "$(date '+%F %T') STOP file found, exiting" >> "$OPS/autoplay.log"
