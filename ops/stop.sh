#!/usr/bin/env bash
# Stop the running jev-sts2 play loop (matches node processes only, never this shell).
for p in $(pgrep -x node); do
  if tr '\0' ' ' < "/proc/$p/cmdline" | grep -q 'index.ts pla[y]'; then kill "$p" && echo "stopped $p"; fi
done
