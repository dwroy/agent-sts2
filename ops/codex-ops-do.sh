#!/usr/bin/env bash
# The codex ops session's way out of its sandbox (docs/codex-ops.md): asks the wake process's broker, which runs outside
# the sandbox, to do one allow-listed action, waits for the answer, prints it and exits with its code.
#
#   bash ops/codex-ops-do.sh <action> [arg]
#
# Actions (ops/codex/lib.ts ACTIONS, done by ops/codex-ops-actions.sh): procs, stall-check, mod-state, autoplay-start,
# autoplay-stop, play-stop, kill <pid>, launch-game, win-procs, win-kill <pid>, postmortem <id,id,...>,
# autoplay-reload <old-autoplay-pid> <current-play-pid> (keeps the same play process),
# learner-status, scheduler-status, experience-update <ids>, fix-batch, learner-merge <branch> (fallback event),
# strategy-proposal <ids> (dispatches a learner proposal), learner-recheck <batch-id> (full checks after a fallback merge),
# boss-sim-check (check B4/B5 triggers with the live scheduler),
# core-build-notify <batch-id> (one native notification after ops verifies the substantive report),
# codex-brain-cache-probe (one approved frozen double question; no arguments),
# eval-metrics <character> <ascension> (writes a new Markdown report under paper/materials/<character>/).
# The broker only runs while a wake runs: outside a wake this times out (exit 124).
set -u
. "$(dirname "$0")/paths.sh"
DIR="${CODEX_OPS_DIR:-$ROOT/ops/codex-ops}"
BROKER="$DIR/broker"
default_wait=300
[ "${1:-}" = eval-metrics ] && default_wait=660
[ "${1:-}" = learner-recheck ] && default_wait=3760
[ "${1:-}" = codex-brain-cache-probe ] && default_wait=1320
WAIT="${CODEX_OPS_DO_WAIT:-$default_wait}"
[ $# -ge 1 ] || { echo "usage: bash ops/codex-ops-do.sh <action> [arg]" >&2; exit 2; }
for a in "$@"; do
  [[ "$a" =~ ^[A-Za-z0-9][A-Za-z0-9,._:-]{0,199}$ ]] || { echo "bad argument: $a" >&2; exit 2; }
done
mkdir -p "$BROKER"
id="$(date +%s%N)-$$"
json=$(python3 -c 'import json,sys; print(json.dumps({"action": sys.argv[1], "args": sys.argv[2:]}))' "$@")
printf '%s\n' "$json" > "$BROKER/$id.tmp" && mv "$BROKER/$id.tmp" "$BROKER/$id.req"
# launch-game waits for the mod for up to ~3 min; eval-metrics has a 10 min broker limit.
end=$(( $(date +%s) + WAIT ))
while [ ! -f "$BROKER/$id.res" ]; do
  if [ "$(date +%s)" -ge "$end" ]; then
    rm -f "$BROKER/$id.req"
    echo "no answer from the broker in ${WAIT}s (it only runs during a wake)" >&2
    exit 124
  fi
  sleep 1
done
python3 - "$BROKER/$id.res" <<'PY'
import json, sys
res = json.load(open(sys.argv[1], encoding="utf8"))
sys.stdout.write(res.get("out", ""))
sys.exit(int(res.get("code", 1)) & 255)
PY
rc=$?
rm -f "$BROKER/$id.res"
exit $rc
