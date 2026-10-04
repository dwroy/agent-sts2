# Shared paths for the ops scripts (agent-sts2 layout, 2026-10-04; docs/layout.md). Source it: . "$(dirname "$0")/paths.sh"
# ROOT is the project's main checkout (this file's parent); play runs from the live worktree under .worktrees/.
OPS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$OPS")"
LOGS="$ROOT/logs"
DATA="$ROOT/data"
NOTES="$ROOT/notes"
LIVE="${STS2_LIVE:-$ROOT/.worktrees/live}"
