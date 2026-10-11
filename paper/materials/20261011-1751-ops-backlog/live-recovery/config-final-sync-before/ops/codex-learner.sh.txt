#!/usr/bin/env bash
# Apply the current learner policy at the native boundary, including historical launchers.
# The shared policy explicitly clears historical Fast, model and context overrides.
set -eu
codex_bin="${STS2_CODEX_LEARNER_BIN:-$HOME/.local/node/bin/codex}"
legacy_wrapper="$(dirname "${BASH_SOURCE[0]}")/codex-fast.sh"
if [ "$codex_bin" = "${BASH_SOURCE[0]}" ] || [ "$codex_bin" -ef "${BASH_SOURCE[0]}" ] \
  || [ "$codex_bin" = "$legacy_wrapper" ] || [ "$codex_bin" -ef "$legacy_wrapper" ]; then
  echo "recursive Codex learner launcher" >&2
  exit 2
fi
. "$(dirname "${BASH_SOURCE[0]}")/codex-policy.sh"
