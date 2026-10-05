#!/usr/bin/env bash
# The pane side of ops/herdr-host.sh run (typed into the pane's shell by it; not meant to be run by hand):
#
#   bash ops/herdr-exec.sh <label> <pidfile|-> <close 0|1> <tail log|-> <state file> -- <cmd> [args...]
#
# Writes its PID to the pid file and exports HERDR_HOST_LABEL. close=0: exec the command (the PID is the command's).
# close=1: run it, print its exit code, then close this pane from a detached helper (which keeps the pane's last lines
# in the tail log), so the pane disappears when the job ends.
set -u
label="$1"; pidfile="$2"; close="$3"; taillog="$4"; state="$5"; shift 5
[ "${1:-}" = -- ] && shift
export HERDR_HOST_LABEL="$label"
[ "$pidfile" != - ] && echo $$ > "$pidfile"
[ "$close" = 1 ] || exec "$@"
"$@"
rc=$?
echo "[herdr-host] $label exited $rc at $(date '+%F %T'); closing this pane"
HERDR_HOST_STATE="$state" setsid nohup bash "$(dirname "$0")/herdr-host.sh" close "$label" --pane "${HERDR_PANE_ID:-}" \
  --tail-log "$taillog" --delay 2 > /dev/null 2>&1 < /dev/null &
exit $rc
