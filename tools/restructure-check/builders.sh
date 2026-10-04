#!/usr/bin/env bash
# Restructure check: run five knowledge builders on the live logs into OUT (never into the knowledge directory) and
# print each output's sha256, the builders' "generated" timestamps blanked. The same logs before and after files move
# must give the same hashes.
#
#   tools/restructure-check/builders.sh OUT_DIR [ROOT]
#
# ROOT (default: the first directory above this script holding logs/states.jsonl) has logs/ and data/ (or .cache/);
# the builders are ROOT/knowledge/builders/build-*.py (inputs: their own defaults), else ROOT/tools/build-*.py (the layout
# before the move; inputs given explicitly).
set -euo pipefail
OUT="$(mkdir -p "$1" && cd "$1" && pwd)"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${2:-}"
if [ -z "$ROOT" ]; then
  ROOT="$HERE"
  while [ ! -e "$ROOT/logs/states.jsonl" ]; do
    [ "$ROOT" = / ] && { echo "no logs/states.jsonl above $HERE: pass ROOT" >&2; exit 1; }
    ROOT="$(dirname "$ROOT")"
  done
fi
DATA="$ROOT/data"; [ -e "$DATA" ] || DATA="$ROOT/.cache"
B="$ROOT/knowledge/builders"; [ -e "$B/build-room-costs.py" ] || B="$ROOT/tools"
PY="$DATA/logdb-venv/bin/python"
LOGS="$ROOT/logs"
run() { echo "+ $*" >&2; nice -n 10 "$@" >/dev/null 2>"$OUT/$(basename "$2" .py).log"; }
if [ "$B" = "$ROOT/tools" ]; then
  # Before the move (code root = ROOT, no .cache there in the restructure worktree): inputs given explicitly.
  IN_ROOMS=(--logs "$LOGS"); IN_STATS=(--logs "$LOGS"); IN_DB=(--game-data "$DATA/game-data.json"); export LOGDB_DIR="$DATA/logdb"
else
  # After the move: every input from the builders' own defaults (ROOT/logs, ROOT/data).
  IN_ROOMS=(); IN_STATS=(); IN_DB=()
fi
run python3 "$B/build-room-costs.py" "${IN_ROOMS[@]}" --out "$OUT/room-costs.json"
run python3 "$B/build-boss-damage.py" "${IN_ROOMS[@]}" --out "$OUT/boss-damage.json"
run python3 "$B/build-outcome-stats.py" "${IN_STATS[@]}" --out "$OUT/outcome-stats.json" --quiet
run python3 "$B/build-monster-db.py" "${IN_DB[@]}" --out "$OUT/monster-db.json" --move-model-out "$OUT/move-model.json" --quiet
run "$PY" "$B/build-event-pages.py" "${IN_ROOMS[@]}" --out "$OUT/event-pages.json"
cd "$OUT"
for f in *.json; do
  printf '%s  %s\n' "$(sed -E 's/"generated": *"[^"]*"/"generated": ""/' "$f" | sha256sum | cut -c1-32)" "$f"
done | tee "$OUT/hashes.txt"
