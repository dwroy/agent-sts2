#!/usr/bin/env bash
# Keep scheduled learners in historical worktrees on Roy's current Fast service policy.
# Preserve their task source, model, effort, permission profile and sandbox child command.
set -eu
codex_bin="${STS2_CODEX_FAST_BIN:-$HOME/.local/node/bin/codex}"
if [ "$codex_bin" = "${BASH_SOURCE[0]}" ] || [ "$codex_bin" -ef "${BASH_SOURCE[0]}" ]; then
  echo "recursive Codex Fast launcher" >&2
  exit 2
fi
. "$(dirname "${BASH_SOURCE[0]}")/codex-policy.sh"
