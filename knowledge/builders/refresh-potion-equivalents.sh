#!/usr/bin/env bash
# Rebuild the potion table (knowledge/characters/ironclad/potion-equivalents.json: what each potion held is worth in the act boss,
# the potion cost the solver and Jev's question use; docs/potion-equivalents.md) only when it is stale (Dai
# 2026-09-30: once a day, and when the ascension goes up):
#   - it was generated before today (local date), or
#   - it has no numbers for .env's TARGET_ASCENSION.
# Otherwise it does nothing. Ops calls it in each run's post-game knowledge refresh (docs/v4-go-live.md).
#
# Usage: knowledge/builders/refresh-potion-equivalents.sh [--dry-run] [--force]
#   --dry-run  say whether it would rebuild, and why; change nothing
#   --force    rebuild whatever the table's date
# Env: ENV_FILE (default <root>/agent/.env), POTION_TABLE (default <root>/knowledge/characters/ironclad/potion-equivalents.json).
# The rebuild runs with the log database's Python (data/logdb-venv/bin/python; it syncs the log DB first) and
# writes the table atomically: a failed rebuild leaves the old table in place and exits non-zero.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"  # the project root (docs/layout.md)
ENV_FILE="${ENV_FILE:-$ROOT/agent/.env}"
TABLE="${POTION_TABLE:-$ROOT/knowledge/characters/ironclad/potion-equivalents.json}"
PY="$ROOT/data/logdb-venv/bin/python"

dry=0
force=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry=1 ;;
    --force) force=1 ;;
    *) echo "usage: $0 [--dry-run] [--force]" >&2; exit 2 ;;
  esac
done

# TARGET_ASCENSION from the env file (the last assignment; quotes and spaces dropped). Empty: not set.
target=""
if [[ -f "$ENV_FILE" ]]; then
  target="$(grep -E '^[[:space:]]*(export[[:space:]]+)?TARGET_ASCENSION=' "$ENV_FILE" | tail -1 | sed -E 's/^[^=]*=//; s/[[:space:]"'"'"']//g; s/#.*$//' || true)"
fi
if [[ -n "$target" && ! "$target" =~ ^[0-9]+$ ]]; then
  echo "refresh-potion-equivalents: TARGET_ASCENSION '$target' in $ENV_FILE is not a number" >&2
  exit 2
fi

# Why the table is stale ("" when it is not): python3 reads the JSON (the system one is enough for this).
reason="$(python3 - "$TABLE" "$target" <<'PY'
import datetime as dt, json, sys
path, target = sys.argv[1], sys.argv[2]
try:
    meta = json.load(open(path, encoding="utf8"))["meta"]
except Exception as error:  # missing or broken: rebuild
    print(f"table unreadable ({type(error).__name__})")
    sys.exit(0)
generated = str(meta.get("generated", ""))
try:
    day = dt.datetime.fromisoformat(generated.replace("Z", "+00:00")).astimezone().date()
except ValueError:
    print(f"generated '{generated}' unreadable")
    sys.exit(0)
if day != dt.date.today():
    print(f"generated {day}, today {dt.date.today()}")
elif target and int(target) not in [int(a) for a in meta.get("ascensions", [])]:
    print(f"no numbers for TARGET_ASCENSION {target} (table: {meta.get('ascensions')})")
PY
)"

if [[ $force -eq 1 && -z "$reason" ]]; then reason="--force"; fi
if [[ -z "$reason" ]]; then
  echo "refresh-potion-equivalents: up to date (today's table${target:+, has A$target}); nothing to do"
  exit 0
fi
if [[ $dry -eq 1 ]]; then
  echo "refresh-potion-equivalents: would rebuild ($reason)"
  exit 0
fi
if [[ ! -x "$PY" ]]; then
  echo "refresh-potion-equivalents: $PY missing (the log database's Python); table left as it is ($reason)" >&2
  exit 1
fi
echo "refresh-potion-equivalents: rebuilding ($reason)"
cd "$ROOT"
"$PY" knowledge/builders/build-potion-equivalents.py --out "$TABLE" ${target:+--ascensions "$target"}
