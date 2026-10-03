#!/bin/sh
# The real codex, pointed at the local fake Responses endpoint (no model call): proves what the engine's own flags send.
export JEV_FAKE_KEY=dummy
if [ "$1" = "exec" ]; then
  shift
  exec "$HOME/.local/node/bin/codex" exec -c 'model_provider="jevfake"' -c 'model_providers.jevfake.name="jevfake"' -c 'model_providers.jevfake.base_url="http://127.0.0.1:18765/v1"' -c 'model_providers.jevfake.wire_api="responses"' -c 'model_providers.jevfake.env_key="JEV_FAKE_KEY"' -c 'model_providers.jevfake.request_max_retries=0' -c 'model_providers.jevfake.stream_max_retries=0' "$@"
fi
exec "$HOME/.local/node/bin/codex" "$@"
