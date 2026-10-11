#!/usr/bin/env bash
# Compatibility entry for old Fast launchers; all sessions now use the current shared policy.
set -eu
codex_bin="${STS2_CODEX_FAST_BIN:-$HOME/.local/node/bin/codex}"
if [ "$codex_bin" = "${BASH_SOURCE[0]}" ] || [ "$codex_bin" -ef "${BASH_SOURCE[0]}" ]; then
  echo "recursive Codex Fast launcher" >&2
  exit 2
fi
# Old live schedulers still select this root wrapper. Identify only CLI permission profiles,
# never inherited LEARNER_* environment variables, and never inspect sandbox child arguments.
original_args=("$@")
command="${1:-}"
permission_profile=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --) break ;;
    -c|--config)
      [ "$#" -ge 2 ] || { echo "missing Codex config value" >&2; exit 2; }
      if [ "$command" = exec ] && [[ "$2" == default_permissions=* ]]; then
        permission_profile="${2#default_permissions=}"
      fi
      shift 2 ;;
    --config=default_permissions=*)
      [ "$command" != exec ] || permission_profile="${1#--config=default_permissions=}"
      shift ;;
    -P|--permission-profile)
      [ "$#" -ge 2 ] || { echo "missing Codex permission profile" >&2; exit 2; }
      [ "$command" != sandbox ] || permission_profile="$2"
      shift 2 ;;
    --permission-profile=*)
      [ "$command" != sandbox ] || permission_profile="${1#--permission-profile=}"
      shift ;;
    *) shift ;;
  esac
done
case "$permission_profile" in
  learner|'"learner"'|"'learner'")
    learner_wrapper="$(dirname "${BASH_SOURCE[0]}")/codex-learner.sh"
    # An old scheduler may inherit the new wrapper as its binary from a completed learner.
    # Unwrap only its already retained native; missing/recursive values fail closed below.
    if [ "$codex_bin" = "$learner_wrapper" ] || [ "$codex_bin" -ef "$learner_wrapper" ]; then
      codex_bin="${STS2_CODEX_LEARNER_BIN:-$codex_bin}"
    fi
    export STS2_CODEX_LEARNER_BIN="$codex_bin"
    exec "$learner_wrapper" "${original_args[@]}" ;;
esac
set -- "${original_args[@]}"
. "$(dirname "${BASH_SOURCE[0]}")/codex-policy.sh"
