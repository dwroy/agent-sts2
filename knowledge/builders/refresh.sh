#!/usr/bin/env bash
# The after-run knowledge refresh, one entry for ops (the command list ops/report.py refresh_knowledge ran before the
# layout change, same flags): first the character-independent steps, once: the monster DB with the per-fight move model
# (and every character's monster records), the monster-DB check note (<workspace>/notes/monster-db-check.md), card
# upgrades, the log database sync; then, per character (knowledge/characters/<id>/, multi-character 2026-10-04):
# outcome stats, room costs, boss damage, and the potion table when it is stale. The characters are those with a run
# in logs/runs.jsonl (a row without one is the Ironclad's), or the one --character names (ops/report.py: the finished
# run's). A failing step does not stop the ones after it; only the monster DB's own output is shown (as before).
#
#   knowledge/builders/refresh.sh [--character ID]                 the refresh
#   knowledge/builders/refresh.sh --fight-value [--character ID]   build-fight-value.py all (~5 min a character; ops
#                                                                  starts it on its own, in the background, so the
#                                                                  next run never waits for it)
#
# Paths are the project's (docs/layout.md): logs/, data/ (the log database and its venv), knowledge/.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"  # the project root
B="$ROOT/knowledge/builders"
fight_value=0
only=""
ops_root="$ROOT"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fight-value) fight_value=1 ;;
    --character) only="${2:-}"; shift ;;
    --character=*) only="${1#--character=}" ;;
    --ops-root) ops_root="${2:?missing ops root}"; shift ;;
    *) echo "usage: $0 [--fight-value] [--character ID] [--ops-root ROOT]" >&2; exit 2 ;;
  esac
  shift
done
# All statistics run outside admission and outside the live integration lock.
mkdir -p "$ops_root/ops"
exec 9>"$ops_root/ops/knowledge-refresh.lock"
flock 9
step() { python3 "$B/refresh-step.py" "$ops_root/ops/refresh-timing.jsonl" "$@"; }
# The characters to refresh: the one asked for (lower-cased: the game's SILENT is knowledge id silent), else every
# character with a logged run (knowledge/builders/characters.py).
if [[ -n "$only" ]]; then
  characters="$(printf '%s' "$only" | tr '[:upper:]' '[:lower:]')"
else
  characters="$(cd "$B" && python3 -c 'import sys, characters; print(" ".join(characters.characters_with_runs(sys.argv[1])))' "$ROOT/logs/runs.jsonl")"
fi
if [[ $fight_value -eq 1 ]]; then
  for c in $characters; do
    step "fight-value:$c" nice -n 19 python3 "$B/build-fight-value.py" all --character "$c"
  done
  step catalog nice -n 19 python3 "$B/build-catalog.py" --knowledge-root "$ROOT/knowledge" || exit 1
  exit 0
fi
step monster-db python3 "$B/build-monster-db.py" --quiet --move-model-out "$ROOT/knowledge/common/move-model.json"
step monster-db-check python3 "$B/monster-db-check.py" >/dev/null 2>&1
step card-upgrades python3 "$B/build-card-upgrades.py" >/dev/null 2>&1
step logdb-sync nice -n 19 "$ROOT/data/logdb-venv/bin/python" "$ROOT/agent/tools/logdb/sync.py" >/dev/null 2>&1
v6_status=0
for c in $characters; do
  step "outcome:$c" python3 "$B/build-outcome-stats.py" --character "$c" >/dev/null 2>&1
  if [[ "$c" == "silent" ]]; then
    step "construction-opportunities:$c" nice -n 19 "$ROOT/data/logdb-venv/bin/python" "$B/build-construction-opportunities.py" --character "$c" || echo "construction opportunity refresh failed: $c" >&2
  fi
  step "room-costs:$c" python3 "$B/build-room-costs.py" --character "$c" >/dev/null 2>&1
  step "boss-damage:$c" python3 "$B/build-boss-damage.py" --character "$c" >/dev/null 2>&1
  step "potion-equivalents:$c" "$B/refresh-potion-equivalents.sh" --character "$c" >/dev/null 2>&1
  if [[ "$c" == "silent" ]]; then
    step "v6-history:$c" nice -n 19 python3 "$B/refresh-v6-history.py" --root "$ROOT" --ops-root "$ops_root" --character "$c" || v6_status=1
  fi
done

# Mechanical indexing only; failure remains visible to the existing refresh owner.
step catalog nice -n 19 python3 "$B/build-catalog.py" --knowledge-root "$ROOT/knowledge" || exit 1
exit "$v6_status"
