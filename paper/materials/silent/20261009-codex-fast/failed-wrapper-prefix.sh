#!/usr/bin/env bash
# Keep scheduled learners in historical worktrees on Roy's current Fast service policy.
# Preserve their task source, model, effort, permission profile and sandbox child command.
set -eu
codex_bin="${STS2_CODEX_FAST_BIN:-$HOME/.local/node/bin/codex}"
[ "$codex_bin" != "${BASH_SOURCE[0]}" ] || { echo "recursive Codex Fast launcher" >&2; exit 2; }
args=(-c 'service_tier="priority"')
while [ "$#" -gt 0 ]; do
  case "$1" in
    --)
      args+=("$@")
      break
      ;;
    -c|--config)
      [ "$#" -ge 2 ] || { echo "missing Codex config value" >&2; exit 2; }
      case "$2" in
        service_tier=*) shift 2; continue ;;
      esac
      args+=("$1" "$2")
      shift 2
      ;;
    --config=service_tier=*) shift ;;
    *) args+=("$1"); shift ;;
  esac
done
exec "$codex_bin" "${args[@]}"
