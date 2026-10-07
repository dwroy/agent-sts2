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
task="${4:-postmortem}"; worktree="${5:-$ROOT}"
case "$task" in postmortem|experience-update|fix-batch|strategy-proposal) ;; *) exit 2 ;; esac
learner_task="${6:-$task}"
if [ "$learner_task" != "$task" ]; then
  case "$learner_task" in silent-boss-calibration|codex-only-brain|silent-double-boss|boss-sim-automation) ;; *) exit 2 ;; esac
  [ "$task" = fix-batch ] && [ "$character" = silent ] \
    && [ "$worktree" = "$ROOT/.worktrees/$learner_task" ] || exit 2
fi
mkdir -p "$DIR/learner"
out="$DIR/learner/$batch.out"; err="$DIR/learner/$batch.err"
export PATH="$HOME/.local/node/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
export STS2_WORKSPACE="$ROOT"
cd "$ROOT" || exit 1
# In a herdr pane (ops/herdr-host.sh run, hosting learners=herdr): show the batch's output files live in the pane. The
# files stay what they were (token accounting reads learner/runs/*.jsonl, the finish step reads $out).
tailer=""
if [ -n "${HERDR_HOST_LABEL:-}" ]; then
  : >> "$out"; : >> "$err"
  tail -n +1 -F "$out" "$err" 2>/dev/null &
  tailer=$!
fi
# Model and effort: the learner's defaults (gpt-6.1-sol, xhigh). LEARNER_CMD overrides the command (tests).
if [ -n "${LEARNER_CMD:-}" ]; then
  nice -n 10 bash -c "$LEARNER_CMD" learner "$runs" "$character" > "$out" 2> "$err"
else
  args=(--engine codex --task "$learner_task" --character "$character" --cwd "$worktree")
  if [ "$task" = postmortem ]; then args+=(--set "runs=$runs");
  else
    args+=(--set merge=live)
    [ "$task" = fix-batch ] || args+=(--set "runs=$runs")
  fi
  nice -n 10 "$ROOT/agent/node_modules/.bin/tsx" learner/run.ts "${args[@]}" > "$out" 2> "$err"
fi
rc=$?
[ -n "$tailer" ] && { sleep 1; kill "$tailer" 2>/dev/null; }
echo "$(date '+%F %T') learner batch $batch ($runs) exit $rc" >> "$DIR/scheduler.log"
python3 "$OPS/codex-ops-learn.py" finish --batch "$batch" --rc "$rc" --character "$character" > /dev/null
if [ "${CODEX_OPS_NO_DRAIN:-0}" != 1 ]; then
  # A hosted batch's pane closes when this script ends: the wake (up to 2 h) must not live in it.
  if [ -n "${HERDR_HOST_LABEL:-}" ]; then setsid nohup bash "$OPS/codex-ops.sh" drain > /dev/null 2>&1 < /dev/null &
  else bash "$OPS/codex-ops.sh" drain; fi
fi
exit $rc
