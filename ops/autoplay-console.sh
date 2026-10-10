#!/usr/bin/env bash
# Source from autoplay.sh to mirror file logs into its terminal without changing play's exit status.
start_console_tail() {
  mkdir -p "$LOGS/console"
  touch "$OPS/autoplay.log"
  # Poll by name: the host tail can miss writes after a missing alias first appears empty.
  tail ---disable-inotify -n 80 -F -- "$OPS/autoplay.log" "$LOGS/console/current" &
  autoplay_console_pid=$!
  trap 'exit 143' TERM
  trap 'stop_console_tail' EXIT
}

stop_console_tail() {
  if [ -n "${autoplay_console_pid:-}" ]; then
    kill "$autoplay_console_pid" 2>/dev/null || true
    wait "$autoplay_console_pid" 2>/dev/null || true
  fi
}
