#!/usr/bin/env bash
# Launch the loop and its file-log viewer in one pane; retire only the old idle autoplay pane.
set -eu
. "$(dirname "$0")/paths.sh"
ROOT="${CODEX_OPS_ROOT:-$ROOT}"
DIR="${CODEX_OPS_DIR:-$ROOT/ops/codex-ops}"
out=$(bash "$OPS/herdr-host.sh" run autoplay-log --pidfile "$DIR/autoplay.pid" -- \
  bash "$ROOT/ops/autoplay.sh" --tail-console) || exit $?
[[ "$out" =~ ^([a-zA-Z0-9]+:p[a-zA-Z0-9]+)\ ([0-9]+)$ ]] || {
  echo "Unexpected herdr launch receipt; inspect processes before retrying: $out" >&2
  exit 1
}
pane="${BASH_REMATCH[1]}"
status=$(bash "$OPS/herdr-host.sh" status --json) || status='[]'
old_pane=$(printf '%s' "$status" | python3 -c '
import json, sys
for row in json.load(sys.stdin):
    if row.get("label") == "autoplay" and row.get("alive") and not row.get("busy"):
        print(row["pane_id"])
')
if [ -n "$old_pane" ]; then
  bash "$OPS/herdr-host.sh" close autoplay --pane "$old_pane" >&2 || true
fi
# Keep a native screen receipt so ops can verify the viewer from its sandbox without typing into other panes.
mkdir -p "$DIR"
herdr_bin="${HERDR_BIN:-herdr}"
"$herdr_bin" pane read "$pane" --source recent-unwrapped --lines 40 \
  > "$DIR/autoplay-log-view.txt" 2> "$DIR/autoplay-log-view.err" || true
printf '%s\n' "$out"
