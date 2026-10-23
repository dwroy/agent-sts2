# Sourced by historical launcher names after resolving the native binary.
# Respect explicit role effort without reading or editing shared account config.
args=()
tail_args=()
role_effort=high
role_tier=default
if [ -n "${LEARNER_EXTERNAL_SERVICE_TIER:-}" ]; then
  case "$LEARNER_EXTERNAL_SERVICE_TIER" in ultrafast|fast|default) ;; *) exit 2 ;; esac
  # Acceleration belongs only to a registered external batch, never shared config.
  [ -n "${LEARNER_STATE_FILE:-}" ] && [ -n "${CODEX_OPS_ROOT:-}" ] && [ -n "${LEARNER_BATCH_ID:-}" ] \
    && [ -n "${LEARNER_EXTERNAL_SOURCE:-}" ] || exit 2
  python3 "$(dirname "${BASH_SOURCE[0]}")/strategy_external_jobs.py" registered \
    "$CODEX_OPS_ROOT" "$(dirname "$LEARNER_STATE_FILE")" "$LEARNER_BATCH_ID" silent "$PWD" "$LEARNER_EXTERNAL_SOURCE" || exit 2
  role_tier="$LEARNER_EXTERNAL_SERVICE_TIER"
fi
read_role_effort() {
  local value="${1#*=}"
  value="${value#\"}"; value="${value%\"}"
  case "$value" in
    medium|high|xhigh) role_effort="$value" ;;
    *) echo "unsupported STS2 Codex role effort" >&2; exit 2 ;;
  esac
}
while [ "$#" -gt 0 ]; do
  case "$1" in
    --) tail_args=("$@"); break ;;
    -m|--model)
      [ "$#" -ge 2 ] || { echo "missing Codex model" >&2; exit 2; }
      shift 2 ;;
    --model=*) shift ;;
    -c|--config)
      [ "$#" -ge 2 ] || { echo "missing Codex config value" >&2; exit 2; }
      case "$2" in
        model_reasoning_effort=*) read_role_effort "$2"; shift 2; continue ;;
        model=*|service_tier=*|model_context_window=*|model_auto_compact_token_limit=*) shift 2; continue ;;
      esac
      args+=("$1" "$2"); shift 2 ;;
    --config=model_reasoning_effort=*) read_role_effort "${1#--config=}"; shift ;;
    --config=model=*|--config=service_tier=*|--config=model_context_window=*|--config=model_auto_compact_token_limit=*) shift ;;
    *) args+=("$1"); shift ;;
  esac
done
policy=(-c 'model="gpt-6.1-sol"' -c "model_reasoning_effort=\"$role_effort\""
        -c "service_tier=\"$role_tier\"" -c 'model_context_window=512000'
        -c 'model_auto_compact_token_limit=460800')
exec "$codex_bin" "${args[@]}" "${policy[@]}" "${tail_args[@]}"
