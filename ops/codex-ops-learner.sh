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
case "$task" in postmortem|experience-update|fix-batch|strategy-proposal|ascension-audit) ;; *) exit 2 ;; esac
learner_task="${6:-$task}"
if [ "$learner_task" != "$task" ]; then
  if [ "$learner_task" = boss-sim-batch ]; then
    [[ "$character" =~ ^[a-z][a-z0-9_]*$ ]] && [ "$task" = fix-batch ] \
      && [[ "$worktree" =~ ^$ROOT/\.worktrees/boss-sim-$character-[a-z0-9_]+-[0-9]{8}-[0-9]{6}$ ]] \
      && [ "${7:-}" = "$DIR/learner/$batch.boss-evidence.json" ] || exit 2
  else
  case "$learner_task" in codex-brain-cache|silent-a10-regression|silent-boss-calibration|codex-only-brain|silent-double-boss|boss-sim-automation|silent-historical-core-builds) ;; *) exit 2 ;; esac
  [ "$task" = fix-batch ] && [ "$character" = silent ] \
    && [ "$worktree" = "$ROOT/.worktrees/$learner_task" ] || exit 2
  fi
fi
if [ "$learner_task" = silent-historical-core-builds ]; then
  [ "${7:-}" = "$DIR/learner/$batch.core-input.json" ] || exit 2
fi
mkdir -p "$DIR/learner"
out="$DIR/learner/$batch.out"; err="$DIR/learner/$batch.err"
export PATH="$HOME/.local/node/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
export STS2_WORKSPACE="$ROOT"
cd "$ROOT" || exit 1
audit_ready=1
fresh_tree=0
if [ "$learner_task" = silent-historical-core-builds ]; then fresh_tree=1
elif [ "$task" = fix-batch ] && [ "$learner_task" = "$task" ]; then
  [ "$worktree" = "$ROOT/.worktrees/codex-fix-$character-${batch%-fix-batch}" ] || exit 2
  fresh_tree=1
elif [ "$task" = strategy-proposal ]; then
  [ "$worktree" = "$ROOT/.worktrees/codex-strategy-$character-${batch%-strategy-proposal}" ] || exit 2
  fresh_tree=1
fi
if [ "$fresh_tree" = 1 ]; then
  [[ "$character" =~ ^[a-z][a-z0-9_]*$ ]] && [[ "$batch" =~ ^[0-9]{8}-[0-9]{6}-(fix-batch|strategy-proposal)$|^[0-9]{8}-[0-9]{6}-s2-strategy-proposal$ ]] || exit 2
  exec 9> "$DIR/learner/${worktree##*/}.lock"
  flock -w 5 9 || exit 75
  if [ ! -f "$worktree/.git" ]; then
    nice -n 19 git worktree add -b "${worktree##*/}" "$worktree" main >> "$out" 2>> "$err" || audit_ready=0
  fi
  if [ "$audit_ready" = 1 ] && [ -n "$(git -C "$worktree" status --porcelain)" ]; then
    echo "worktree has edits; preserve it, never reset a failed candidate" >> "$err"
    audit_ready=0
  fi
  if [ "$audit_ready" = 1 ] && [ ! -e "$worktree/agent/node_modules" ]; then
    ln -s ../../../agent/node_modules "$worktree/agent/node_modules" || audit_ready=0
  fi
  if [ "$audit_ready" = 1 ] && [ -d "$ROOT/data/logdb-venv" ] && [ ! -e "$worktree/data/logdb-venv" ]; then
    mkdir -p "$worktree/data" && ln -s ../../../data/logdb-venv "$worktree/data/logdb-venv" || audit_ready=0
  fi
fi
if [ "$task" = ascension-audit ]; then
  level="${7:-}"; previous="${8:-}"
  [[ "$character" =~ ^[a-z][a-z0-9_]*$ ]] && [[ "$level" =~ ^[0-9]+$ ]] \
    && [[ "$previous" =~ ^[0-9]+$ ]] || exit 2
  case "$worktree" in "$ROOT/.worktrees/ascension-audit-$character-a$level-"[1-3]) ;; *) exit 2 ;; esac
  # The wrapper retains the per-level lease through finish; failed attempt trees are never reused or erased.
  exec 9> "$DIR/learner/ascension-audit-$character-a$level.lock"
  flock -w 5 9 || exit 75
  if [ ! -f "$worktree/.git" ]; then
    nice -n 19 git worktree add -b "${worktree##*/}" "$worktree" main >> "$out" 2>> "$err" || audit_ready=0
  fi
  if [ "$audit_ready" = 1 ] && [ -n "$(git -C "$worktree" status --porcelain)" ]; then
    echo "audit worktree has edits; preserve it and retry in a new tree" >> "$err"
    audit_ready=0
  fi
fi
# In a herdr pane (ops/herdr-host.sh run, hosting learners=herdr): show the batch's output files live in the pane. The
# files stay what they were (token accounting reads learner/runs/*.jsonl, the finish step reads $out).
tailer=""
if [ -n "${HERDR_HOST_LABEL:-}" ]; then
  : >> "$out"; : >> "$err"
  tail -n +1 -F "$out" "$err" 2>/dev/null &
  tailer=$!
fi
# Model and effort: the learner's defaults (gpt-6.1-sol, xhigh). LEARNER_CMD overrides the command (tests).
if [ "$audit_ready" != 1 ]; then
  rc=1
elif [ -n "${LEARNER_CMD:-}" ]; then
  nice -n 10 bash -c "$LEARNER_CMD" learner "$runs" "$character" > "$out" 2> "$err"
  rc=$?
else
  # Old leased worktrees keep their launcher source; enforce the service policy at the native CLI boundary.
  codex_fast_wrapper="$ROOT/ops/codex-fast.sh"
  codex_fast_native="${LEARNER_CODEX_BIN:-${STS2_CODEX_FAST_BIN:-$(command -v codex)}}"
  # A completion can dispatch another batch with this wrapper already exported.
  # Keep its native executable instead of wrapping the wrapper a second time.
  if [ "$codex_fast_native" = "$codex_fast_wrapper" ] || [ "$codex_fast_native" -ef "$codex_fast_wrapper" ]; then
    codex_fast_native="${STS2_CODEX_FAST_BIN:-$(command -v codex)}"
    if [ "$codex_fast_native" = "$codex_fast_wrapper" ] || [ "$codex_fast_native" -ef "$codex_fast_wrapper" ]; then
      codex_fast_native="$(command -v codex)"
    fi
  fi
  export STS2_CODEX_FAST_BIN="$codex_fast_native"
  export LEARNER_CODEX_BIN="$codex_fast_wrapper"
  args=(--engine codex --task "$learner_task" --character "$character" --cwd "$worktree")
  [ "$task" != strategy-proposal ] || args+=(--set "batch=$batch")
  if [ "$learner_task" = silent-historical-core-builds ]; then
    args+=(--set "evidence=${7}" --set "batch=$batch")
  fi
  [ "$learner_task" != boss-sim-batch ] || args+=(--set "evidence=${7}" --set "batch=$batch")
  if [ "$task" = postmortem ]; then args+=(--set "runs=$runs");
  elif [ "$task" = ascension-audit ]; then
    args+=(--set "runs=$runs" --set "target_ascension=$level" --set "previous_ascension=$previous")
  elif [ "$learner_task" != silent-historical-core-builds ]; then
    args+=(--set merge=live)
    [ "$task" = fix-batch ] || args+=(--set "runs=$runs")
  fi
  nice -n 10 "$ROOT/agent/node_modules/.bin/tsx" "$worktree/learner/run.ts" "${args[@]}" > "$out" 2> "$err"
  rc=$?
fi
[ -n "$tailer" ] && { sleep 1; kill "$tailer" 2>/dev/null; }
echo "$(date '+%F %T') learner batch $batch ($runs) exit $rc" >> "$DIR/scheduler.log"
python3 "$OPS/codex-ops-learn.py" finish --batch "$batch" --rc "$rc" --character "$character" > /dev/null
if [ "${CODEX_OPS_NO_DRAIN:-0}" != 1 ]; then
  # A hosted batch's pane closes when this script ends: the wake (up to 2 h) must not live in it.
  if [ -n "${HERDR_HOST_LABEL:-}" ]; then setsid nohup bash "$OPS/codex-ops.sh" drain > /dev/null 2>&1 < /dev/null &
  else bash "$OPS/codex-ops.sh" drain; fi
fi
exit $rc
