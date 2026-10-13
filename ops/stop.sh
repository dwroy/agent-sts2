#!/usr/bin/env bash
# Stop the running jev-sts2 play loop (matches node processes only, never this shell).
set -u
. "$(dirname "$0")/paths.sh"
for p in $(pgrep -x node | python3 "$OPS/process_scope.py" filter --kind play --root "$ROOT" --live "$LIVE"); do
  kill "$p" && echo "stopped $p"
done
