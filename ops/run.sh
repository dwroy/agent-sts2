#!/usr/bin/env bash
# Play one run from the live worktree ($LIVE, .worktrees/live; agent-sts2 layout 2026-10-04, was jev-sts2-v4run).
# Its logs/, data/ and agent/node_modules/ are links into the main checkout, so logs stay at $ROOT/logs; the console
# log goes to $ROOT/logs/console/<ts>-<sha>.log. STS2_WORKSPACE: notes/ (lessons.md) and ops/ come from the main checkout.
set -u
. "$(dirname "$0")/paths.sh"
# Deployment settings are loaded only at a new play boundary, never into an active game.
if [ -f "$ROOT/ops/production-runtime.sh" ]; then
  . "$ROOT/ops/production-runtime.sh" || exit 78
fi
# Drain only at admission. Never use STOP, which cancels an in-flight brain request.
nice -n 19 python3 "$OPS/publication_gate.py" --root "$ROOT" admit-game --pid "$$" >/dev/null || {
  echo "game admission held; next play deferred" >&2
  exit 76
}
cd "$LIVE/agent"
export STS2_WORKSPACE="$ROOT"
# Selected only by the explicit LLM handoff transaction; existing play keeps its original environment.
if [ -f "$ROOT/ops/codex-ops/brain-home" ]; then
  IFS= read -r selected_brain_home < "$ROOT/ops/codex-ops/brain-home" || true
  if [[ "${selected_brain_home:-}" != /* ]] || [ ! -f "$selected_brain_home/auth.json" ]; then
    echo "invalid project brain home selector; play not started" >&2
    exit 3
  fi
  export BRAIN_CODEX_HOME="$selected_brain_home"
fi
# Roy 2026-10-15: only the selected main Silent login may admit paid credits. Config checks the role and source root.
unset BRAIN_CODEX_PAID_CREDITS
if [ "$ROOT" = /home/dw/Projects/agent-sts2 ] \
  && [ "$LIVE" = "$ROOT/.worktrees/live" ] \
  && [ "${BRAIN_CODEX_HOME:-}" = "$ROOT/ops/codex-ops/accounts/codex1/brain" ]; then
  export BRAIN_CODEX_PAID_CREDITS=main-silent-codex1-20261015
fi
# Roy 2026-10-12: production Codex defaults apply even with a legacy scheduler environment.
export BRAIN_CODEX_MODEL=gpt-6.1-sol BRAIN_CODEX_EFFORT="${BRAIN_CODEX_EFFORT:-high}"
export BRAIN_ENGINE="${BRAIN_ENGINE:-codex}" BRAIN_DEEPSEEK_EFFORT="${BRAIN_DEEPSEEK_EFFORT:-max}" BRAIN_CODEX_MODE=session
# Opt-in only. Admission and restart recovery use run identities, not process counts.
# Session mode retains the native turn context long enough to extract its receipt before revert.
if [ -n "${BRAIN_TRIAL_SCHEDULE:-}" ]; then
  trial_env=$(nice -n 19 python3 "$OPS/brain_trial.py" --schedule "$BRAIN_TRIAL_SCHEDULE" --logs "$LOGS") || exit 78
  eval "$trial_env"
fi
export PATH="$HOME/.local/node/bin:$PATH"
sha=$(git rev-parse --short HEAD)$(git diff --quiet HEAD || echo "+dirty")
ts=$(date +%Y%m%d-%H%M%S)
mkdir -p "$LOGS/console"
out="$LOGS/console/$ts-$sha.log"
mod_url="${STS2_BASE_URL:-http://127.0.0.1:8080}"
if [ -n "${STS2_EXPECTED_PROCESS_ID:-}${STS2_EXPECTED_NATIVE_PROFILE_ID:-}" ]; then
  python3 "$OPS/instance_gate.py" "$mod_url" || exit 78
fi
touch "$out"
# Follow the current console by name so the terminal viewer switches at each run boundary.
console_link="$LOGS/console/.current-$$"
ln -s "$(basename "$out")" "$console_link"
mv -Tf "$console_link" "$LOGS/console/current"
echo "$out"
# The log viewer is independent and best effort; no result or pipe is shared with play.
if [ -f "$OPS/brain_view.py" ]; then
  nice -n 19 python3 "$OPS/brain_view.py" --root "$ROOT" --logs "$LOGS" ensure > /dev/null 2>&1 < /dev/null &
fi
# A finished run leaves the game on its summary screen, which the loop reads as "run already ended".
screen=$(curl -s -m 5 "$mod_url/state" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["screen"])' 2>/dev/null)
if [ "$screen" = "GAME_OVER" ]; then
  curl -s -m 10 -X POST "$mod_url/action" -H 'content-type: application/json' -d '{"action":"return_to_main_menu"}' >/dev/null
  sleep 3
fi
# Ablation (Roy 2026-09-27, A8): ops/ablation.json {"arms": [...], "i": n, "total": N} rotates the arms
# code (no Jev, no DeepSeek), jev (no DeepSeek), ds (DeepSeek without Jev), full. The arm of the run
# in progress is kept in ops/ablation-current.json until report.py marks it done (a restart keeps it).
arm=$(python3 - "$OPS" <<'PY'
import json, os, sys
ops = sys.argv[1]
try:
    sched = json.load(open(os.path.join(ops, "ablation.json")))
except (OSError, json.JSONDecodeError):
    print(""); sys.exit()
cur_path = os.path.join(ops, "ablation-current.json")
try:
    cur = json.load(open(cur_path))
except (OSError, json.JSONDecodeError):
    cur = {"done": True}
if not cur.get("done"):
    print(cur["arm"]); sys.exit()
i, total, arms = int(sched.get("i", 0)), int(sched.get("total", 0)), sched["arms"]
if i >= total:
    print(""); sys.exit()
arm = arms[i % len(arms)]
json.dump({"arm": arm, "i": i, "done": False}, open(cur_path, "w"))
print(arm)
PY
)
extra=()
case "$arm" in
  code) extra=(--no-jev) ;;
  jev) export ESCALATION_CHAIN=none ;;
  ds) export ARM=ds-only DEEPSEEK_MAX_CALLS=400 ;;
esac
[ -n "$arm" ] && echo "ablation arm: $arm" >> "$out"
exec npx tsx src/index.ts play --max-runs 1 --max-minutes "${MAX_MIN:-240}" "${extra[@]}" "$@" >> "$out" 2>&1
