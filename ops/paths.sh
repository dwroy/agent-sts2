# Shared paths for the ops scripts (agent-sts2 layout, 2026-10-04; docs/layout.md). Source it: . "$(dirname "$0")/paths.sh"
# ROOT is the project's main checkout (this file's parent); play runs from the live worktree under .worktrees/.
OPS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$OPS")"
LOGS="$ROOT/logs"
DATA="$ROOT/data"
NOTES="$ROOT/notes"
LIVE="${STS2_LIVE:-$ROOT/.worktrees/live}"
if [ -f "$ROOT/ops/regent-lane.json" ]; then
  lane_exports=$(python3 "$OPS/regent_lane_env.py" "$ROOT/ops/regent-lane.json") || exit 78
  eval "$lane_exports"
  LIVE="${STS2_LIVE:-$LIVE}"
  unset lane_exports
fi
# Reload at each action/run boundary; an existing controller keeps its original environment.
if [ -f "$ROOT/ops/instance-binding.json" ]; then
  instance_exports=$(python3 "$OPS/instance_env.py" "$ROOT/ops/instance-binding.json") || exit 78
  eval "$instance_exports"
  unset instance_exports
fi
