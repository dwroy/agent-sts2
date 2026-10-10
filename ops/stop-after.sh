#!/usr/bin/env bash
# Play TARGET runs at ascension ASC, then stop (ops/stop-after-a8.sh with the ascension as a parameter; Roy 2026-10-02:
# A9 from V4.4). Counts runs at ASC in runs.jsonl that ended after START.
# When the last one starts (TARGET - 1 finished) it creates ops/STOP, so autoplay.sh exits after that run.
# Usage: ops/stop-after.sh <START ISO UTC> [TARGET=20] [ASC=9] [CHAR]
# CHAR (a character id, e.g. silent or SILENT; default: the CHARACTER environment variable, else every character):
# count only that character's runs (runs.jsonl `character`; a row naming none is the Ironclad's, as every run before
# 2026-10-04). The three-argument calls of before count every character, as they did.
# If autoplay still starts another run after the 20th, that play process and the loop are stopped by PID.
set -u
. "$(dirname "$0")/paths.sh"
RUNS="$LOGS/runs.jsonl"
START="${1:?start time, ISO UTC, e.g. 2026-09-29T13:26:00Z}"
TARGET="${2:-20}"
ASC="${3:-9}"
CHAR="$(printf '%s' "${4:-${CHARACTER:-}}" | tr '[:upper:]' '[:lower:]')"
LOG="$OPS/stop-after-${CHAR:+$CHAR-}a${ASC}.log"
count() {
  python3 - "$RUNS" "$START" "$ASC" "$CHAR" "$ROOT/knowledge/builders" <<'PY'
import json, sys
path, start, asc, char = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
sys.path.insert(0, sys.argv[5])
from characters import run_character
n = 0
for line in open(path, encoding="utf8"):
    try:
        r = json.loads(line)
    except Exception:
        continue
    if r.get("ascension") == asc and str(r.get("ended", "")) > start and (not char or run_character(r) == char):
        n += 1
print(n)
PY
}
echo "$(date '+%F %T') watching: $TARGET A$ASC ${CHAR:+$CHAR }runs after $START" >> "$LOG"
while true; do
  n=$(count)
  if [ "$n" -ge $((TARGET - 1)) ] && [ ! -f "$OPS/STOP" ]; then
    echo "stop after $TARGET A$ASC runs" > "$OPS/STOP"
    echo "$(date '+%F %T') $n A$ASC runs finished; STOP created (autoplay exits after the current run)" >> "$LOG"
  fi
  if [ "$n" -ge "$TARGET" ]; then
    echo "$(date '+%F %T') $n A$ASC runs finished" >> "$LOG"
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
