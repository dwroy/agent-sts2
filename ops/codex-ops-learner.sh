#!/usr/bin/env bash
# One post-mortem batch for the codex ops session (started in the background by ops/codex-ops-learn.py; docs/codex-ops.md).
# Runs the learner outside any sandbox (its own codex needs the network and runs under the learner's permission
# profile, with the key pre-check), then reports to the queue and asks for a wake at once.
#
#   bash ops/codex-ops-learner.sh <batch id> <run,run,...> [character]
set -u
. "$(dirname "$0")/paths.sh"
ROOT="${CODEX_OPS_ROOT:-$ROOT}"
DIR="${CODEX_OPS_DIR:-$ROOT/ops/codex-ops}"
batch="$1"; runs="$2"; character="${3:-silent}"
mkdir -p "$DIR/learner"
out="$DIR/learner/$batch.out"; err="$DIR/learner/$batch.err"
export PATH="$HOME/.local/node/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
export STS2_WORKSPACE="$ROOT"
cd "$ROOT" || exit 1
# Model and effort: the learner's defaults (gpt-6.1-sol, xhigh). LEARNER_CMD overrides the command (tests).
if [ -n "${LEARNER_CMD:-}" ]; then
  nice -n 10 bash -c "$LEARNER_CMD" learner "$runs" "$character" > "$out" 2> "$err"
else
  nice -n 10 "$ROOT/agent/node_modules/.bin/tsx" learner/run.ts --engine codex --task postmortem --character "$character" \
    --set "runs=$runs" --cwd "$ROOT" > "$out" 2> "$err"
fi
rc=$?
echo "$(date '+%F %T') learner batch $batch ($runs) exit $rc" >> "$DIR/scheduler.log"
python3 "$OPS/codex-ops-learn.py" finish --batch "$batch" --rc "$rc" --character "$character" > /dev/null
[ "${CODEX_OPS_NO_DRAIN:-0}" = 1 ] || bash "$OPS/codex-ops.sh" drain
