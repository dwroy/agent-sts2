#!/usr/bin/env bash
# Keep one after-run entry; heavy admission occurs before worker/publication locks.
# --all includes fight extraction and cadence-controlled training in one worker.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec nice -n 19 ionice -c 3 python3 "$ROOT/knowledge/builders/refresh_driver.py" "$@"
