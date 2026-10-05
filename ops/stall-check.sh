#!/usr/bin/env bash
# Quick stall check for the autoplay loop. Prints "OK" when play looks alive, otherwise "STALL: <why>"
# plus the console tail and the mod screen. Used by the 5-minute cron; cheap enough to run often.
set -u
. "$(dirname "$0")/paths.sh"
LOGDIR="$LOGS"
now=$(date +%s)

[ -f "$ROOT/ops/STOP" ] && { echo "OK (STOP file present, autoplay paused on purpose)"; exit 0; }

console=$(ls -t "$LOGDIR"/console/*.log 2>/dev/null | head -1)
if [ -z "$console" ]; then echo "STALL: no console log"; exit 0; fi
quiet=$(( now - $(stat -c %Y "$console") ))
last_dec=$(tail -1 "$LOGDIR/decisions.jsonl" | python3 -c 'import json,sys,datetime as d;print(int(d.datetime.fromisoformat(json.loads(sys.stdin.read())["ts"].replace("Z","+00:00")).timestamp()))' 2>/dev/null || echo "$now")
no_decision=$(( now - last_dec ))
running=$(pgrep -x node | while read -r p; do { tr '\0' ' ' < "/proc/$p/cmdline"; } 2>/dev/null | grep -q 'index.ts pla[y]' && echo "$p"; done | wc -l)

why=""
# Between runs autoplay writes the post-mortem and pauses briefly: not a stall unless it lasts.
between=0
pgrep -f "ops/report.py" >/dev/null && between=1
[ "$quiet" -lt 180 ] && between=1
[ "$running" -eq 0 ] && [ "$between" -eq 0 ] && why="no play process running"
# The loop logs "stuck for N polls" after ~25 idle polls, and repeated gate rejections mean a loop.
tail -n 4 "$console" | grep -q -E "stuck for [0-9]+ polls|gate rejected .* times" && why="${why:+$why; }console reports stuck"
# One action timeout can recover while the brain is deciding. Require repeated failures and no recent decision.
unreachable=$(tail -n 4 "$console" | grep -c 'cannot reach the STS2-Agent mod' || true)
[ "$unreachable" -ge 2 ] && [ "$no_decision" -ge 180 ] && why="${why:+$why; }console reports unreachable"
# A play process that keeps exiting early (a model outage) restarts every ~12 s: each start writes a new
# console log (24HM 2026-09-26: 30 restarts on Jev 403s read as "between runs").
recent=$(find "$LOGDIR/console" -name '*.log' -newermt "@$(( now - 300 ))" 2>/dev/null | wc -l)
if [ "$recent" -ge 4 ]; then
  cause=$(grep -h "stopped:" $(ls -t "$LOGDIR"/console/*.log | head -3) 2>/dev/null | tail -1 | cut -c1-160)
  why="${why:+$why; }play restarted $recent times in 5 min${cause:+ ($cause)}"
fi
# DeepSeek thinking can keep the console quiet for up to its 5 min timeout; allow 7 min.
[ "$quiet" -gt 420 ] && why="${why:+$why; }console silent ${quiet}s"
[ "$no_decision" -gt 900 ] && why="${why:+$why; }no decision for ${no_decision}s"

if [ -z "$why" ]; then
  [ "$running" -eq 0 ] && { echo "OK (between runs)"; exit 0; }
  echo "OK (last decision ${no_decision}s ago, console quiet ${quiet}s)"
  exit 0
fi
echo "STALL: $why"
echo "--- console tail ($console)"
tail -n 8 "$console" | cut -c1-220
echo "--- mod state"
timeout 8 curl -s 127.0.0.1:8080/state | python3 -c 'import json,sys;d=json.load(sys.stdin)["data"];print(d.get("screen"),d.get("available_actions"))' 2>&1 | head -3
