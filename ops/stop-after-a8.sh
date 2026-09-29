#!/usr/bin/env bash
# Dai 2026-09-29: play 20 A8 runs, then stop. Counts A8 runs in runs.jsonl that ended after START.
# When the 20th starts (19 finished) it creates ops/STOP, so autoplay.sh exits after that run.
# If autoplay still starts another run after the 20th, that play process and the loop are stopped by PID.
set -u
ROOT="$HOME/Projects/sts2-jev"
OPS="$ROOT/ops"
RUNS="$ROOT/jev-sts2/logs/runs.jsonl"
START="${1:?start time, ISO UTC, e.g. 2026-09-29T13:26:00Z}"
TARGET="${2:-20}"
LOG="$OPS/stop-after-a8.log"
count() {
  python3 - "$RUNS" "$START" <<'PY'
import json, sys
path, start = sys.argv[1], sys.argv[2]
n = 0
for line in open(path, encoding="utf8"):
    try:
        r = json.loads(line)
    except Exception:
        continue
    if r.get("ascension") == 8 and str(r.get("ended", "")) > start:
        n += 1
print(n)
PY
}
echo "$(date '+%F %T') watching: $TARGET A8 runs after $START" >> "$LOG"
while true; do
  n=$(count)
  if [ "$n" -ge $((TARGET - 1)) ] && [ ! -f "$OPS/STOP" ]; then
    echo "Dai 2026-09-29: stop after $TARGET A8 runs" > "$OPS/STOP"
    echo "$(date '+%F %T') $n A8 runs finished; STOP created (autoplay exits after the current run)" >> "$LOG"
  fi
  if [ "$n" -ge "$TARGET" ]; then
    echo "$(date '+%F %T') $n A8 runs finished" >> "$LOG"
    sleep 30
    # autoplay.sh should have exited on STOP; if a new play started anyway, stop it and the loop by PID.
    for p in $(pgrep -x node); do
      if tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null | grep -q 'index.ts pla[y]'; then
        kill "$p" && echo "$(date '+%F %T') stopped extra play process $p" >> "$LOG"
      fi
    done
    for p in $(pgrep -f 'ops/autoplay[.]sh'); do
      kill "$p" && echo "$(date '+%F %T') stopped autoplay loop $p" >> "$LOG"
    done
    echo "$(date '+%F %T') done" >> "$LOG"
    exit 0
  fi
  sleep 60
done
