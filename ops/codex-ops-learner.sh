#!/usr/bin/env bash
# One post-mortem batch for the codex ops session (started in the background by ops/codex-ops-learn.py; docs/codex-ops.md).
# Runs the learner outside any sandbox (its own codex needs the network and runs under the learner's permission
# profile, with the key pre-check), then reports to the queue and asks for a wake at once.
#
#   bash ops/codex-ops-learner.sh <batch id> <run,run,...> [character]
set -u
. "$(dirname "$0")/paths.sh"
ROOT="${CODEX_OPS_ROOT:-$ROOT}"
# Preserve the selected root through the native env whitelist and registration guard.
export CODEX_OPS_ROOT="$ROOT"
DIR="${CODEX_OPS_DIR:-$ROOT/ops/codex-ops}"
batch="$1"; runs="$2"; character="${3:-silent}"
task="${4:-postmortem}"; worktree="${5:-$ROOT}"
case "$task" in postmortem|experience-update|fix-batch|strategy-proposal|ascension-audit) ;; *) exit 2 ;; esac
learner_task="${6:-$task}"
research_request=""
implementation_request=""
implementation_task_file=""
backfill_source=""
source_kind=backfill
external_tier=""
unset LEARNER_EXTERNAL_SOURCE LEARNER_EXTERNAL_SERVICE_TIER
backfill_task_file=""
if [ "$task" = strategy-proposal ] && [ "$#" -ge 7 ]; then
  [ "$#" = 7 ] && [ "$learner_task" = "$task" ] && [ "$character" = silent ] \
    && { [[ "$7" =~ ^(backfill|external):[a-z0-9][a-z0-9._-]{0,119}$ ]] || [ "$7" = roy-20261010-silent-deck-size-value ] || [ "$7" = roy-20261010-silent-core-reuse-value ] \
      || [ "$7" = roy-20261010-silent-core-output-value ] \
      || [ "$7" = roy-20261012-concrete-core-decklists ] \
      || [ "$7" = roy-20261011-silent-core-cycle-quantitative-learning ] \
      || [ "$7" = ops-20261012-quantitative-continuation ]; } || exit 2
  if [[ "$7" == external:* ]]; then
    source_kind=external
    backfill_source="${7#external:}"
  elif [[ "$7" == backfill:* ]]; then
    backfill_source="${7#backfill:}"
  elif [ "$7" = roy-20261011-silent-core-cycle-quantitative-learning ] || [ "$7" = ops-20261012-quantitative-continuation ]; then
    implementation_request="$7"
  else
    research_request="$7"
  fi
  [[ "$batch" =~ ^[0-9]{8}-[0-9]{6}-strategy-proposal$ ]] || exit 2
fi
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
# The command-host pane follows this batch's files; native TUI supervisors keep their own display.
if [ -z "${LEARNER_HERDR_PANE:-}" ]; then
  case "${HERDR_HOST_LABEL:-}" in
    "learner-$batch"|"learner-$batch-postmortem")
      : >> "$out"; : >> "$err"
      nice -n 19 tail --sleep-interval=0.2 -n 80 --pid="$$" -F -- "$out" "$err" &
      ;;
  esac
fi
export PATH="$HOME/.local/node/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
export STS2_WORKSPACE="$ROOT"
cd "$ROOT" || exit 1
audit_ready=1
research_base=""
# herdr-exec writes its PID before this gate, allowing start_learner to return.
# The parent then binds the request and saves the batch under the same learn.lock.
if [ -n "$research_request" ]; then
  exec 8> "$DIR/learn.lock"
  if flock -w 120 8; then
    research_base="$(python3 "$OPS/strategy_research_jobs.py" ready "$ROOT" "$DIR" "$batch" "$character" "$worktree" "$research_request" 2>> "$err")" || audit_ready=0
    flock -u 8
  else
    echo "research registration lock wait timed out after 120 seconds; no model started" >> "$err"
    printf '{"request_id":"%s","batch":"%s","status":"lock_timeout","timeout_seconds":120}\n' "$research_request" "$batch" > "$DIR/learner/$batch.research-registration.json"
    audit_ready=0
  fi
  exec 8>&-
fi
if [ -n "$backfill_source" ]; then
  exec 8> "$DIR/learn.lock"
  if flock -w 120 8; then
    research_base="$(python3 "$OPS/strategy_${source_kind}_jobs.py" ready "$ROOT" "$DIR" "$batch" "$character" "$worktree" "$backfill_source" 2>> "$err")" || audit_ready=0
    if [ "$source_kind" = external ] && [ "$audit_ready" = 1 ]; then
      external_tier=$(nice -n 19 python3 "$OPS/strategy_external_jobs.py" tier "$ROOT" "$DIR" "$batch" "$character" "$worktree" "$backfill_source" 2>> "$err") || audit_ready=0
    fi
    flock -u 8
  else
    echo "backfill registration lock timed out; no model started" >> "$err"
    audit_ready=0
  fi
  exec 8>&-
fi
if [ -n "$implementation_request" ]; then
  exec 8> "$DIR/learn.lock"
  if flock -w 120 8; then
    research_base="$(python3 "$OPS/strategy_implementation_jobs.py" ready "$ROOT" "$DIR" "$batch" "$character" "$worktree" "$implementation_request" 2>> "$err")" || audit_ready=0
    flock -u 8
  else
    echo "implementation registration lock timed out; no model started" >> "$err"
    audit_ready=0
  fi
  exec 8>&-
fi
fresh_tree=0
if [ "$learner_task" = silent-historical-core-builds ]; then fresh_tree=1
elif [ "$task" = fix-batch ] && [ "$learner_task" = "$task" ]; then
  [ "$worktree" = "$ROOT/.worktrees/codex-fix-$character-${batch%-fix-batch}" ] || exit 2
  fresh_tree=1
elif [ "$task" = strategy-proposal ]; then
  [ "$worktree" = "$ROOT/.worktrees/codex-strategy-$character-${batch%-strategy-proposal}" ] || exit 2
  fresh_tree=1
fi
if [ "$fresh_tree" = 1 ] && [ "$audit_ready" = 1 ]; then
  [[ "$character" =~ ^[a-z][a-z0-9_]*$ ]] && [[ "$batch" =~ ^[0-9]{8}-[0-9]{6}-(fix-batch|strategy-proposal)$|^[0-9]{8}-[0-9]{6}-s2-strategy-proposal$ ]] || exit 2
  exec 9> "$DIR/learner/${worktree##*/}.lock"
  flock -w 5 9 || exit 75
  if [ ! -f "$worktree/.git" ]; then
    checkout_ref="${research_base:-${LEARNER_BASE_REF:-main}}"
    nice -n 19 python3 "$OPS/worktree_checkout.py" "$ROOT" "$worktree" "$checkout_ref" >> "$out" 2>> "$err" || audit_ready=0
  fi
  if [ "$audit_ready" = 1 ] && [ -n "$(git -C "$worktree" status --porcelain)" ]; then
    echo "worktree has edits; preserve it, never reset a failed candidate" >> "$err"
    audit_ready=0
  fi
  if [ "$audit_ready" = 1 ] && [ -n "$research_request$backfill_source" ] && [ "$(git -C "$worktree" rev-parse HEAD)" != "$research_base" ]; then
    echo "research worktree HEAD differs from its registered dispatch baseline; no model started" >> "$err"
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
    nice -n 19 python3 "$OPS/worktree_checkout.py" "$ROOT" "$worktree" "${LEARNER_BASE_REF:-main}" >> "$out" 2>> "$err" || audit_ready=0
  fi
  if [ "$audit_ready" = 1 ] && [ -n "$(git -C "$worktree" status --porcelain)" ]; then
    echo "audit worktree has edits; preserve it and retry in a new tree" >> "$err"
    audit_ready=0
  fi
fi
# Prepare the exact task source after the saved registration and tree exist.
# The launcher records the fully rendered prompt in its normal learner_launch log.
if [ "$audit_ready" = 1 ] && [ -n "$implementation_request" ]; then
  exec 8> "$DIR/learn.lock"
  if flock -w 120 8; then
    implementation_task_file="$(python3 "$OPS/strategy_implementation_jobs.py" prepare "$ROOT" "$DIR" "$batch" "$character" "$worktree" "$implementation_request" 2>> "$err")" || audit_ready=0
    flock -u 8
  else
    echo "implementation input lock timed out; no model started" >> "$err"
    audit_ready=0
  fi
  exec 8>&-
fi
if [ "$audit_ready" = 1 ] && [ -n "$backfill_source" ]; then
  exec 8> "$DIR/learn.lock"
  if flock -w 120 8; then
    backfill_task_file="$(python3 "$OPS/strategy_${source_kind}_jobs.py" prepare "$ROOT" "$DIR" "$batch" "$character" "$worktree" "$backfill_source" 2>> "$err")" || audit_ready=0
    flock -u 8
  else
    echo "backfill task input lock timed out; no model started" >> "$err"
    audit_ready=0
  fi
  exec 8>&-
fi
# Scheduled ordinary work uses high; frozen specialist requests retain xhigh. No shared config edits.
# LEARNER_CMD overrides the command for fixed tests only.
if [ "$audit_ready" != 1 ]; then
  if [ -n "$backfill_source" ]; then
    python3 "$OPS/strategy_${source_kind}_jobs.py" not-started "$ROOT" "$DIR" "$batch" "$character" "$worktree" "$backfill_source" 2>> "$err"
  fi
  rc=1
elif [ -n "${LEARNER_CMD:-}" ]; then
  nice -n 19 bash -c "$LEARNER_CMD" learner "$runs" "$character" > "$out" 2> "$err"
  rc=$?
else
  # Preserve old task/launcher source while applying the current learner-only CLI policy.
  codex_learner_wrapper="$ROOT/ops/codex-learner.sh"
  codex_legacy_wrapper="$ROOT/ops/codex-fast.sh"
  is_codex_wrapper() {
    [ "$1" = "$codex_learner_wrapper" ] || [ "$1" -ef "$codex_learner_wrapper" ] \
      || [ "$1" = "$codex_legacy_wrapper" ] || [ "$1" -ef "$codex_legacy_wrapper" ]
  }
  codex_learner_native="${LEARNER_CODEX_BIN:-${STS2_CODEX_LEARNER_BIN:-${STS2_CODEX_FAST_BIN:-$(command -v codex)}}}"
  # Completion dispatch inherits the wrapper environment; unwrap both current and legacy wrappers.
  if is_codex_wrapper "$codex_learner_native"; then
    codex_learner_native="${STS2_CODEX_LEARNER_BIN:-${STS2_CODEX_FAST_BIN:-$(command -v codex)}}"
    if is_codex_wrapper "$codex_learner_native"; then
      codex_learner_native="$(command -v codex)"
    fi
  fi
  export STS2_CODEX_LEARNER_BIN="$codex_learner_native"
  export LEARNER_CODEX_BIN="$codex_learner_wrapper"
  learner_effort=high
  # Preserve specialist research and explicitly bound implementation requests.
  if [ "$learner_task" != "$task" ] || [ -n "$research_request$implementation_request" ]; then
    learner_effort=xhigh
  fi
  args=(--engine codex --model gpt-6.1-sol --effort "$learner_effort" --task "${backfill_task_file:-${implementation_task_file:-$learner_task}}" --character "$character" --cwd "$worktree")
  [ "$task" != strategy-proposal ] || args+=(--set "batch=$batch")
  if [ "$learner_task" = silent-historical-core-builds ]; then
    args+=(--set "evidence=${7}" --set "batch=$batch")
  fi
  [ "$learner_task" != boss-sim-batch ] || args+=(--set "evidence=${7}" --set "batch=$batch")
  if [ "$task" = postmortem ]; then args+=(--set "runs=$runs");
  elif [ "$task" = ascension-audit ]; then
    args+=(--set "runs=$runs" --set "target_ascension=$level" --set "previous_ascension=$previous")
  elif [ "$source_kind" != external ] && [ "$learner_task" != silent-historical-core-builds ]; then
    args+=(--set merge=live)
    [ "$task" = fix-batch ] || args+=(--set "runs=$runs")
  fi
  # The launcher may retry only a proven pre-session failure under this same registration.
  export LEARNER_BATCH_ID="$batch" LEARNER_STATE_FILE="$DIR/learn.json"
  unset LEARNER_BACKFILL_SOURCE LEARNER_EXTERNAL_SOURCE LEARNER_EXTERNAL_SERVICE_TIER
  if [ -n "$backfill_source" ]; then
    if [ "$source_kind" = external ]; then
      export LEARNER_EXTERNAL_SOURCE="$backfill_source"
      args+=(--service-tier "$external_tier")
    else
      export LEARNER_BACKFILL_SOURCE="$backfill_source"
    fi
  fi
  # The parent spawns us before saving the registration. Wait for its state transaction
  # before either entry point captures the lease; release the lock before running a learner.
  if (flock -w 120 8) 8> "$DIR/learn.lock"; then
    # Use current instance policy for persistent old workspaces; task source and native cwd stay bound below.
    nice -n 19 python3 "$OPS/learner_entry.py" "$ROOT" "$worktree" "$batch" "$DIR/learn.json" "$out" "$err" \
      -- "$ROOT/agent/node_modules/.bin/tsx" "$ROOT/learner/run.ts" "${args[@]}"
    rc=$?
  else
    echo "learner registration lock wait timed out after 120 seconds; no model started" >> "$err"
    rc=75
  fi
fi
if [ -n "$backfill_source" ] && [ "$rc" != 0 ] \
    && [ ! -e "$DIR/learner/$batch.$source_kind-launch.json" ] \
    && [ ! -e "$DIR/learner/learner-$batch.tui.json" ]; then
  python3 "$OPS/strategy_${source_kind}_jobs.py" not-started "$ROOT" "$DIR" "$batch" "$character" "$worktree" "$backfill_source" 2>> "$err"
fi
launcher_rc="$rc"
wrapper_attention() {
  nice -n 19 python3 "$OPS/learner_tui.py" attention "$DIR" "$batch" "$1" 2>> "$err"
}
# A failed transport receipt never releases the scheduler lease or marks the batch complete.
# Preserve this supervisor until ops verifies the original session/artifacts; never start a second model.
if [ -n "${LEARNER_HERDR_PANE:-}" ] && [ "$audit_ready" = 1 ]; then
  verify_timeout="${LEARNER_TUI_VERIFY_TIMEOUT_S:-300}"
  if ! [[ "$verify_timeout" =~ ^[1-9][0-9]{0,3}$ ]] || [ "$verify_timeout" -gt 3600 ]; then verify_timeout=300; fi
  verify_deadline=$((SECONDS + verify_timeout))
  while true; do
    remaining=$((verify_deadline - SECONDS))
    if [ "$remaining" -le 0 ]; then
      nice -n 19 python3 "$OPS/learner_tui.py" defer "$DIR/learn.json" "$batch" "$LEARNER_TUI_RECEIPT" "$out" "$launcher_rc" "$$" 2>> "$err" \
        || echo "$(date '+%F %T') [dev #36 wrapper] $batch verification timeout; deferral persistence failed, preserve original batch/pane and inspect learner journal" >> "$DIR/inbox-claude.md"
      exit 75
    fi
    if rc="$(nice -n 19 timeout --kill-after=1s "${remaining}s" python3 "$OPS/learner_tui.py" verified-code "$LEARNER_TUI_RECEIPT" "$out" "$launcher_rc" 2>> "$err")"; then break; fi
    wrapper_attention verify
    # A finalized rc75 receipt cannot acquire retirement proof by waiting for its stopped producer.
    remaining=$((verify_deadline - SECONDS))
    if [ "$remaining" -gt 0 ] && nice -n 19 timeout --kill-after=1s "${remaining}s" python3 "$OPS/learner_tui.py" verification-blocked "$LEARNER_TUI_RECEIPT" "$launcher_rc" 2>> "$err"; then
      nice -n 19 python3 "$OPS/learner_tui.py" defer "$DIR/learn.json" "$batch" "$LEARNER_TUI_RECEIPT" "$out" "$launcher_rc" "$$" --terminal-unverified 2>> "$err" \
        || echo "$(date '+%F %T') [dev #36 wrapper] $batch terminal receipt deferral failed; preserve original batch/pane" >> "$DIR/inbox-claude.md"
      exit 75
    fi
    remaining=$((verify_deadline - SECONDS))
    if [ "$remaining" -gt 0 ]; then
      if [ "$remaining" -gt 30 ]; then remaining=30; fi
      sleep "$remaining"
    fi
  done
fi
echo "$(date '+%F %T') learner batch $batch ($runs) exit $rc" >> "$DIR/scheduler.log"
finish_rc=75
if { [ -z "$research_request" ] || python3 "$OPS/strategy_research_jobs.py" registered "$ROOT" "$DIR" "$batch" "$character" "$worktree" "$research_request" 2>> "$err"; } \
    && { [ -z "$backfill_source" ] || python3 "$OPS/strategy_${source_kind}_jobs.py" registered "$ROOT" "$DIR" "$batch" "$character" "$worktree" "$backfill_source" 2>> "$err"; } \
    && { [ -z "$implementation_request" ] || python3 "$OPS/strategy_implementation_jobs.py" registered "$ROOT" "$DIR" "$batch" "$character" "$worktree" "$implementation_request" 2>> "$err"; }; then
  finish_rc=0
  python3 "$OPS/codex-ops-learn.py" finish --batch "$batch" --rc "$rc" --character "$character" > /dev/null || finish_rc=$?
  if [ "$finish_rc" = 0 ] && [ -n "${LEARNER_HERDR_PANE:-}" ] && [ "$audit_ready" = 1 ]; then
    if nice -n 19 python3 "$OPS/learner_tui.py" finished "$DIR/learn.json" "$batch" "$LEARNER_TUI_RECEIPT" "$out" "$launcher_rc" "$$" 2>> "$err"; then
      # Seal only this verified terminal batch; the original stall task owns tab closure.
      if ! nice -n 19 python3 "$OPS/learner_tabs.py" seal --root "$ROOT" --state-dir "$DIR" --batch "$batch" >> "$DIR/scheduler.log" 2>&1; then
        wrapper_attention seal
        finish_rc=75
      fi
    else
      wrapper_attention finish
      finish_rc=75
    fi
  elif [ "$finish_rc" != 0 ] && [ -n "${LEARNER_HERDR_PANE:-}" ]; then
    wrapper_attention finish
  fi
  if [ "$rc" = 0 ] && [ "$finish_rc" = 0 ] \
      && [ -z "${LEARNER_CMD:-}" ] && [ -f "$OPS/learner_retention.py" ]; then
    # The model and launcher have exited; release this checkout lease before requesting guarded reclamation.
    flock -u 9 2>/dev/null || true
    exec 9>&-
    nice -n 19 python3 "$OPS/learner_retention.py" request --root "$ROOT" --state-dir "$DIR" --batch "$batch" \
      >> "$DIR/scheduler.log" 2>&1 || echo "learner cleanup request deferred for $batch; normal tick will retry" >> "$DIR/scheduler.log"
  fi
else
  if [ -n "${LEARNER_HERDR_PANE:-}" ]; then wrapper_attention registration; fi
fi
if [ -n "${LEARNER_HERDR_PANE:-}" ] && [ "$finish_rc" != 0 ]; then rc=75; fi
if [ "${CODEX_OPS_NO_DRAIN:-0}" != 1 ]; then
  # Keep the wake outside either the legacy command pane or the new supervised TUI lifecycle.
  if [ -n "${HERDR_HOST_LABEL:-}${LEARNER_HERDR_PANE:-}" ]; then setsid nohup bash "$OPS/codex-ops.sh" drain > /dev/null 2>&1 < /dev/null &
  else bash "$OPS/codex-ops.sh" drain; fi
fi
exit $rc
