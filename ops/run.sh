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
exec npx tsx src/index.ts play --max-runs 1 --max-minutes "${MAX_MIN:-240}" "$@" > "$out" 2>&1
