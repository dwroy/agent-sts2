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
. "$(dirname "$0")/paths.sh"
# AUTOPLAY_READY: acknowledge WAIT_PID before a reload can retire the old shell.
if [ -n "${AUTOPLAY_READY:-}" ]; then
  [ -n "${WAIT_PID:-}" ] && kill -0 "$WAIT_PID" 2>/dev/null || exit 1
  [ -n "${AUTOPLAY_RELEASE:-}" ] && [ -n "${AUTOPLAY_ACTIVE:-}" ] \
    && [ -n "${AUTOPLAY_RELOAD_PARENT:-}" ] && [ -n "${AUTOPLAY_RELOAD_OLD:-}" ] \
    && [ -n "${AUTOPLAY_RELOAD_OLD_START:-}" ] || exit 1
  reload_old_alive() {
    local stat_text fields
    [ -r "/proc/$AUTOPLAY_RELOAD_OLD/stat" ] || return 1
    stat_text=$(<"/proc/$AUTOPLAY_RELOAD_OLD/stat")
    read -r -a fields <<< "${stat_text##*) }"
    [ "${fields[19]:-}" = "$AUTOPLAY_RELOAD_OLD_START" ] && [ "${fields[0]:-}" != Z ]
  }
  printf '%s\n' "$$" > "$AUTOPLAY_READY" || exit 1
  # Never report or start a run until the caller permits takeover and the old shell is gone.
  while [ ! -f "$AUTOPLAY_RELEASE" ] || reload_old_alive; do
    if [ ! -f "$AUTOPLAY_RELEASE" ] && ! kill -0 "$AUTOPLAY_RELOAD_PARENT" 2>/dev/null; then
      # Restore the old shell if the broker disappeared before committing the handoff.
      reload_old_alive && kill -CONT "$AUTOPLAY_RELOAD_OLD" 2>/dev/null
      exit 1
    fi
    sleep 0.05
  done
  printf '%s\n' "$$" > "$AUTOPLAY_ACTIVE" || exit 1
  unset AUTOPLAY_READY AUTOPLAY_RELEASE AUTOPLAY_ACTIVE AUTOPLAY_RELOAD_PARENT AUTOPLAY_RELOAD_OLD AUTOPLAY_RELOAD_OLD_START
  unset -f reload_old_alive
fi
CONSOLE="$LOGS/console"
RUNS="$LOGS/runs.jsonl"
export LOGS
mkdir -p "$NOTES"
restarts=0
while [ ! -f "$OPS/STOP" ]; do
  if [ -n "${WAIT_PID:-}" ]; then
    while kill -0 "$WAIT_PID" 2>/dev/null; do sleep 5; done
    WAIT_PID=""
  else
    # A terminal brain fault/cancellation leaves the saved decision untouched. Clear the marker after repair to
    # resume the same saved run; never turn a fault into an automatic stream of fresh play processes.
    if python3 "$OPS/brain_wait.py" "$LOGS" --hold 2>/dev/null; then
      sleep 5
      continue
    fi
    "$OPS/run.sh" "$@"
    play_exit=$?
    if [ "$play_exit" -eq 75 ] || [ "$play_exit" -eq 78 ]; then
      echo "$(date '+%F %T') brain blocked (exit $play_exit); saved run retained; awaiting explicit recovery" >> "$OPS/autoplay.log"
      # The marker is normally present. A missing marker must not cause a restart storm either.
      while [ ! -f "$OPS/STOP" ] && ! python3 "$OPS/brain_wait.py" "$LOGS" --hold 2>/dev/null; do sleep 5; done
      continue
    fi
  fi
  rid=$(python3 - <<'PY'
import json, os
last = None
for line in open(os.path.join(os.environ["LOGS"], "decisions.jsonl"), encoding="utf8"):
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
    # REFRESH_WAIT=1: report.py waits for its knowledge refresh (outcome-stats, fight-value, monster-db, ...) so the
    # next run starts on the fresh files (2026-10-04: 4AWD read a stale outcome-stats.json mid-refresh).
    REFRESH_WAIT=1 python3 "$OPS/report.py" "$rid" > "$NOTES/run-$(date +%m%d-%H%M)-$rid.md" 2>&1
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
