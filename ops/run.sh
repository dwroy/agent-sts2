#!/usr/bin/env bash
# Play one run with the current jev-sts2 working tree; console log goes to logs/console/<ts>-<sha>.log.
set -u
cd "$HOME/Projects/sts2-jev/jev-sts2"
export PATH="$HOME/.local/node/bin:$PATH"
sha=$(git rev-parse --short HEAD)$(git diff --quiet HEAD || echo "+dirty")
ts=$(date +%Y%m%d-%H%M%S)
mkdir -p logs/console
out="logs/console/$ts-$sha.log"
echo "$out"
# A finished run leaves the game on its summary screen, which the loop reads as "run already ended".
screen=$(curl -s -m 5 http://127.0.0.1:8080/state | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["screen"])' 2>/dev/null)
if [ "$screen" = "GAME_OVER" ]; then
  curl -s -m 10 -X POST http://127.0.0.1:8080/action -H 'content-type: application/json' -d '{"action":"return_to_main_menu"}' >/dev/null
  sleep 3
fi
# Ablation (Dai 2026-09-27, A8): ops/ablation.json {"arms": [...], "i": n, "total": N} rotates the arms
# code (no Jev, no DeepSeek), jev (no DeepSeek), ds (DeepSeek without Jev), full. The arm of the run
# in progress is kept in ops/ablation-current.json until report.py marks it done (a restart keeps it).
OPS="$HOME/Projects/sts2-jev/ops"
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
