#!/usr/bin/env bash
# Self-rescue for a vanished game: relaunch STS2 when the game process is gone, without Claude.
# One call = one check, then exit (meant for cron). It relaunches only when BOTH hold:
#   1. the STS2-Agent mod (127.0.0.1:8080/state) failed to answer THRESHOLD (3) calls in a row
#      (the count is kept across calls in the state file), and
#   2. tasklist.exe shows no SlayTheSpire2.exe process in Windows.
# A game that is running but whose mod does not answer (hung, still loading) is logged, never relaunched
# or killed. Nothing happens while ops/STOP exists (autoplay paused on purpose). After a relaunch the
# count is reset and no second relaunch happens for COOLDOWN (600) s, so a slow game start is not
# launched twice. If tasklist.exe itself fails (WSL interop down), the process state is unknown and
# nothing is relaunched.
#
# Log: ops/auto-relaunch.log, one timestamped line per action. A healthy mod writes nothing, except one
# line when the count goes back from non-zero to zero. State: ops/.auto-relaunch-fails
# ("<consecutive fails> <epoch of last relaunch>").
#
# Suggested crontab line (not installed; Dai decides). The script sets its own PATH and calls the
# Windows tools by full path, so PATH in the line is only a belt-and-braces default:
#   * * * * * PATH=/usr/local/bin:/usr/bin:/bin /home/dw/Projects/sts2-jev/ops/auto-relaunch.sh >/dev/null 2>&1
# With a 1-minute cron a crashed game is relaunched about 3 minutes after it went away.
#
# Overrides (for tests; never test without DRY_RUN=1 while the real game runs):
#   DRY_RUN=1    log "would relaunch" instead of running cmd.exe (state is still updated, so the
#                cooldown can be tested)
#   MOD_URL      default http://127.0.0.1:8080/state      GAME_PROC  default SlayTheSpire2.exe
#   STATE        default ops/.auto-relaunch-fails          LOG        default ops/auto-relaunch.log
#   STOP_FILE    default ops/STOP                          THRESHOLD  default 3
#   COOLDOWN     default 600 (seconds)
set -u
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

OPS="$(cd "$(dirname "$0")" && pwd)"
MOD_URL="${MOD_URL:-http://127.0.0.1:8080/state}"
GAME_PROC="${GAME_PROC:-SlayTheSpire2.exe}"
STATE="${STATE:-$OPS/.auto-relaunch-fails}"
LOG="${LOG:-$OPS/auto-relaunch.log}"
STOP_FILE="${STOP_FILE:-$OPS/STOP}"
THRESHOLD="${THRESHOLD:-3}"
COOLDOWN="${COOLDOWN:-600}"
DRY_RUN="${DRY_RUN:-0}"
TASKLIST=/mnt/c/Windows/System32/tasklist.exe
CMD=/mnt/c/Windows/System32/cmd.exe
STEAM_URI="steam://rungameid/2868840"

log() {
  local line
  line="$(date '+%F %T') $*"
  echo "$line"
  echo "$line" >> "$LOG"
}

[ -f "$STOP_FILE" ] && { echo "STOP file present, not checking"; exit 0; }

# One check at a time: an overlapping cron call just exits.
exec 9>"$STATE.lock"
flock -n 9 || { echo "another check is running"; exit 0; }

fails=0
last=0
if [ -r "$STATE" ]; then
  read -r fails last < "$STATE" || true
fi
[[ "$fails" =~ ^[0-9]+$ ]] || fails=0
[[ "$last" =~ ^[0-9]+$ ]] || last=0

save() {
  echo "$1 $2" > "$STATE.tmp" && mv -f "$STATE.tmp" "$STATE"
}

# Any HTTP answer means the mod is up.
if timeout 8 curl -s -o /dev/null --max-time 7 "$MOD_URL"; then
  if [ "$fails" -gt 0 ]; then
    log "mod reachable again after $fails failed check(s)"
    save 0 "$last"
  fi
  echo "OK (mod reachable)"
  exit 0
fi

fails=$(( fails + 1 ))
now=$(date +%s)

# Full process list: a short or failed listing means the process state is unknown, not "absent".
procs=$(cd /mnt/c 2>/dev/null; timeout 20 "$TASKLIST" /FO CSV /NH 2>/dev/null)
rc=$?
if [ "$rc" -ne 0 ] || [ "$(printf '%s\n' "$procs" | grep -c ',')" -lt 5 ]; then
  save "$fails" "$last"
  log "mod unreachable ($fails/$THRESHOLD); tasklist.exe failed (rc=$rc), process state unknown, not relaunching"
  exit 0
fi
if printf '%s\n' "$procs" | grep -qiF "\"$GAME_PROC\""; then
  save "$fails" "$last"
  # A hung game would log every minute; keep only the first checks and every 10th after that.
  if [ "$fails" -le "$THRESHOLD" ] || [ $(( fails % 10 )) -eq 0 ]; then
    log "mod unreachable ($fails/$THRESHOLD) but $GAME_PROC is running; not relaunching"
  fi
  exit 0
fi

if [ "$fails" -lt "$THRESHOLD" ]; then
  save "$fails" "$last"
  log "mod unreachable ($fails/$THRESHOLD) and $GAME_PROC not running; waiting for $THRESHOLD in a row"
  exit 0
fi

since=$(( now - last ))
if [ "$last" -gt 0 ] && [ "$since" -lt "$COOLDOWN" ]; then
  save "$fails" "$last"
  log "mod unreachable ($fails/$THRESHOLD) and $GAME_PROC not running, but last relaunch was ${since}s ago (cooldown ${COOLDOWN}s); waiting"
  exit 0
fi

if [ "$DRY_RUN" = "1" ]; then
  log "DRY_RUN: would relaunch the game ($STEAM_URI) after $fails failed checks with no $GAME_PROC"
else
  (cd /mnt/c && timeout 30 "$CMD" /c start "" "$STEAM_URI" >/dev/null 2>&1)
  rc=$?
  log "relaunched the game ($STEAM_URI) after $fails failed checks with no $GAME_PROC (cmd.exe rc=$rc)"
fi
save 0 "$now"
exit 0
