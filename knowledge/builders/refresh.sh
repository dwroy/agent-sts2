#!/usr/bin/env bash
# The after-run knowledge refresh, one entry for ops (the command list ops/report.py refresh_knowledge ran before the
# layout change, same order, same flags): the monster DB with the per-fight move model, the monster-DB check note
# (<workspace>/notes/monster-db-check.md), outcome stats, room costs, boss damage, card upgrades, the log database
# sync, and the potion table when it is stale. A failing step does not stop the ones after it; only the monster DB's
# own output is shown (as before).
#
#   knowledge/builders/refresh.sh                 the refresh
#   knowledge/builders/refresh.sh --fight-value   build-fight-value.py all (~5 min; ops starts it on its own, in the
#                                                 background, so the next run never waits for it)
#
# Paths are the project's (docs/layout.md): logs/, data/ (the log database and its venv), knowledge/.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"  # the project root
B="$ROOT/knowledge/builders"
if [[ "${1:-}" == "--fight-value" ]]; then
  exec nice -n 10 python3 "$B/build-fight-value.py" all
fi
python3 "$B/build-monster-db.py" --quiet --move-model-out "$ROOT/knowledge/common/move-model.json"
python3 "$B/monster-db-check.py" >/dev/null 2>&1
python3 "$B/build-outcome-stats.py" >/dev/null 2>&1
python3 "$B/build-room-costs.py" >/dev/null 2>&1
python3 "$B/build-boss-damage.py" >/dev/null 2>&1
python3 "$B/build-card-upgrades.py" >/dev/null 2>&1
nice -n 10 "$ROOT/data/logdb-venv/bin/python" "$ROOT/agent/tools/logdb/sync.py" >/dev/null 2>&1
"$B/refresh-potion-equivalents.sh" >/dev/null 2>&1
