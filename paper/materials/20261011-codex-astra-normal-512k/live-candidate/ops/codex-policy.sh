# Sourced by the historical launcher names after resolving and checking the native binary.
# Only normalize Codex arguments; never inspect or rewrite a sandbox child after --.
args=()
policy=(-c 'model="gpt-6-astra"' -c 'model_reasoning_effort="xhigh"'
        -c 'service_tier="default"' -c 'model_context_window=512000'
        -c 'model_auto_compact_token_limit=460800')
while [ "$#" -gt 0 ]; do
  case "$1" in
    --) args+=("${policy[@]}" "$@"); policy=(); break ;;
    -m|--model)
      [ "$#" -ge 2 ] || { echo "missing Codex model" >&2; exit 2; }
      shift 2 ;;
    --model=*) shift ;;
    -c|--config)
      [ "$#" -ge 2 ] || { echo "missing Codex config value" >&2; exit 2; }
      case "$2" in
        model=*|model_reasoning_effort=*|service_tier=*|model_context_window=*|model_auto_compact_token_limit=*) shift 2; continue ;;
      esac
      args+=("$1" "$2"); shift 2 ;;
    --config=model=*|--config=model_reasoning_effort=*|--config=service_tier=*|--config=model_context_window=*|--config=model_auto_compact_token_limit=*) shift ;;
    *) args+=("$1"); shift ;;
  esac
done
args+=("${policy[@]}")
exec "$codex_bin" "${args[@]}"
