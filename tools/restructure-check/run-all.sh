#!/usr/bin/env bash
# Restructure check, all of it: decision digests, the brain's system prompts and tools, five builders' outputs, into OUT.
# Compare two OUT dirs with compare.py. Needs node on PATH; runs with a clean environment (no .env, no flags).
#
#   tools/restructure-check/run-all.sh OUT_DIR LESSONS_COPY
#
# LESSONS_COPY: a fixed copy of notes/lessons.md (the post-mortems in the prefix), the same file for both runs.
set -euo pipefail
OUT="$(mkdir -p "$1" && cd "$1" && pwd)"
LESSONS="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The package directory: agent/ after the move, the code root before it (the one holding package.json).
PKG="$HERE"
while [ ! -e "$PKG/package.json" ]; do PKG="$(dirname "$PKG")"; done
cd "$PKG"
clean() { env -i HOME="$HOME" PATH="$PATH" nice -n 10 "$@"; }
clean npx tsx "$HERE/prefix.ts" --lessons "$LESSONS" --out "$OUT/prefix.json"
clean npx tsx "$HERE/digests.ts" --out "$OUT/digests.json"
"$HERE/builders.sh" "$OUT/builders" >/dev/null
echo "builders:"; cat "$OUT/builders/hashes.txt"
