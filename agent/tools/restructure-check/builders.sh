#!/usr/bin/env bash
# Restructure check: run six knowledge builders on the live logs into OUT (never into the knowledge directory) and
# print each output's sha256, the builders' "generated" timestamps blanked. The same logs before and after files move
# must give the same hashes.
#
#   tools/restructure-check/builders.sh OUT_DIR [ROOT]
#
# ROOT (default: the first directory above this script holding logs/states.jsonl) has logs/ and data/ (or .cache/);
# the builders are ROOT/knowledge/builders/build-*.py (inputs: their own defaults), else ROOT/tools/build-*.py (the layout
# before the move; inputs given explicitly). With the split monster DB (build-monster-db.py --records-out, 2026-10-04) the
# common file and each character's records go to OUT/split/ and OUT/monster-db.json is their Ironclad merge, so
# hashes.txt stays comparable with a run before the split; OUT/shape.txt says which shape ran.
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
if grep -q -- "--records-out" "$B/build-monster-db.py"; then
  # The split monster DB (2026-10-04: knowledge/common/monster-db.json + knowledge/characters/<id>/monster-records.json):
  # both into OUT/split/, and OUT/monster-db.json = the common file with the Ironclad's records merged back (the TS
  # loader's merge, build-monster-db.py merge_records), which must hash as the one file did before the split.
  mkdir -p "$OUT/split"
  run python3 "$B/build-monster-db.py" "${IN_DB[@]}" --out "$OUT/split/monster-db.json" --records-out "$OUT/split/monster-records-{character}.json" \
    --move-model-out "$OUT/move-model.json" --quiet
  python3 - "$B/build-monster-db.py" "$OUT/split" "$OUT/monster-db.json" <<'PY'
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("bmd", sys.argv[1])
bmd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bmd)
common = json.load(open(f"{sys.argv[2]}/monster-db.json", encoding="utf8"))
records = json.load(open(f"{sys.argv[2]}/monster-records-ironclad.json", encoding="utf8"))
with open(sys.argv[3], "w", encoding="utf8") as handle:
    json.dump(bmd.merge_records(common, records), handle, ensure_ascii=False, indent=1)
    handle.write("\n")
PY
  echo "monster-db: split (common + per-character records; monster-db.json = the Ironclad's merge)" > "$OUT/shape.txt"
else
  run python3 "$B/build-monster-db.py" "${IN_DB[@]}" --out "$OUT/monster-db.json" --move-model-out "$OUT/move-model.json" --quiet
  echo "monster-db: one file (before the split)" > "$OUT/shape.txt"
fi
run "$PY" "$B/build-event-pages.py" "${IN_ROOMS[@]}" --out "$OUT/event-pages.json"
if [ "$B" = "$ROOT/tools" ]; then IN_PE=(--db "$DATA/logdb" --logs "$LOGS"); else IN_PE=(); fi
run "$PY" "$B/build-potion-equivalents.py" "${IN_PE[@]}" --no-sync --ascensions 9 --out "$OUT/potion-equivalents.json"
cd "$OUT"
for f in *.json; do
  printf '%s  %s\n' "$(sed -E 's/"generated": *"[^"]*"/"generated": ""/' "$f" | sha256sum | cut -c1-32)" "$f"
done | tee "$OUT/hashes.txt"
# The split files themselves (not in hashes.txt: the old layout has none, and compare.py compares hashes.txt whole).
if [ -d "$OUT/split" ]; then
  for f in split/*.json; do printf '%s  %s\n' "$(sha256sum < "$f" | cut -c1-32)" "$f"; done > "$OUT/split/hashes.txt"
fi
