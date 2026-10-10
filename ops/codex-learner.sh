#!/usr/bin/env bash
# Remove old learners' explicit Fast requests without changing their isolated CLI command.
# Learner exec already uses --ignore-user-config, so an absent tier selects the native default.
set -eu
codex_bin="${STS2_CODEX_LEARNER_BIN:-$HOME/.local/node/bin/codex}"
legacy_wrapper="$(dirname "${BASH_SOURCE[0]}")/codex-fast.sh"
if [ "$codex_bin" = "${BASH_SOURCE[0]}" ] || [ "$codex_bin" -ef "${BASH_SOURCE[0]}" ] \
  || [ "$codex_bin" = "$legacy_wrapper" ] || [ "$codex_bin" -ef "$legacy_wrapper" ]; then
  echo "recursive Codex learner launcher" >&2
  exit 2
fi
args=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --) args+=("$@"); break ;;
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
