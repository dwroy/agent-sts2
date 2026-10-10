#!/usr/bin/env bash
# Apply the current learner policy at the native boundary, including historical launchers.
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
command="${1:-}"
policy=()
if [ "$command" = exec ]; then policy=(--model gpt-6-astra -c 'model_reasoning_effort="xhigh"'); fi
legacy_override=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --) args+=("${policy[@]}" "$@"); policy=(); break ;;
    -m|--model)
      [ "$#" -ge 2 ] || { echo "missing Codex model" >&2; exit 2; }
      if [ "$command" = exec ]; then
        [ "$2" = gpt-6-astra ] || legacy_override=1
      else args+=("$1" "$2"); fi
      shift 2 ;;
    --model=*)
      if [ "$command" = exec ]; then
        [ "${1#--model=}" = gpt-6-astra ] || legacy_override=1
      else args+=("$1"); fi
      shift ;;
    -c|--config)
      [ "$#" -ge 2 ] || { echo "missing Codex config value" >&2; exit 2; }
      case "$2" in
        service_tier=*) shift 2; continue ;;
      esac
      if [ "$command" = exec ]; then
        case "$2" in
          model=*|model_reasoning_effort=*)
            case "$2" in
              model=gpt-6-astra|'model="gpt-6-astra"'|"model='gpt-6-astra'"|model_reasoning_effort=xhigh|'model_reasoning_effort="xhigh"'|"model_reasoning_effort='xhigh'") ;;
              *) legacy_override=1 ;;
            esac
            shift 2; continue ;;
        esac
      fi
      args+=("$1" "$2")
      shift 2
      ;;
    --config=service_tier=*) shift ;;
    --config=model=*|--config=model_reasoning_effort=*)
      if [ "$command" = exec ]; then
        case "${1#--config=}" in
          model=gpt-6-astra|'model="gpt-6-astra"'|"model='gpt-6-astra'"|model_reasoning_effort=xhigh|'model_reasoning_effort="xhigh"'|"model_reasoning_effort='xhigh'") ;;
          *) legacy_override=1 ;;
        esac
      else args+=("$1"); fi
      shift ;;
    *) args+=("$1"); shift ;;
  esac
done
args+=("${policy[@]}")
if [ "$legacy_override" = 1 ]; then
  echo 'learner CLI policy: effective model=gpt-6-astra effort=xhigh fast=off (legacy overrides replaced)' >&2
fi
exec "$codex_bin" "${args[@]}"
