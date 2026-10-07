#!/usr/bin/env bash
set -eu
export TMPDIR=/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-214302-strategy-proposal
export PATH="$HOME/.local/node/bin:$PATH"
live_tree=/home/dw/Projects/agent-sts2/.worktrees/live
while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done
git -C "$live_tree" status --short > "$TMPDIR/live-status-before.txt"
git -C "$live_tree" rev-parse HEAD > "$TMPDIR/live-before-refresh.txt"
if ! git -C "$live_tree" diff --quiet -- knowledge notes/fight-value-backtest.md; then
  git -C "$live_tree" add knowledge
  if [ -f "$live_tree/notes/fight-value-backtest.md" ]; then
    git -C "$live_tree" add notes/fight-value-backtest.md
  fi
  git -C "$live_tree" diff --cached --binary > "$TMPDIR/refresh-staged.diff"
  nice -n 10 gitleaks stdin --no-banner --redact < "$TMPDIR/refresh-staged.diff" > "$TMPDIR/refresh-gitleaks.log" 2>&1
  git -C "$live_tree" commit -m "Refresh knowledge data" -m "Co-Authored-By: Codex GPT-6 <noreply@openai.com>" > "$TMPDIR/refresh-commit.log" 2>&1
fi
git -C "$live_tree" rev-parse HEAD > "$TMPDIR/live-before-merge.txt"
nice -n 10 python3 "$TMPDIR/live-preflight.py"
source_commit=$(cat "$TMPDIR/source-commit.txt")
git -C "$live_tree" merge --no-edit "$source_commit" > "$TMPDIR/live-merge.log" 2>&1
git -C "$live_tree" rev-parse HEAD > "$TMPDIR/live-merged.txt"
set +e
(cd "$live_tree/agent" && SANDBOX_WORKERS=2 bash tools/test-sandbox.sh) > "$TMPDIR/live-sandbox.log" 2>&1
check_status=$?
set -e
printf '%s\n' "$check_status" > "$TMPDIR/live-sandbox.rc"
if [ "$check_status" -ne 0 ]; then
  rollback_commit=$(cat "$TMPDIR/live-before-merge.txt")
  git -C "$live_tree" reset --hard "$rollback_commit" > "$TMPDIR/live-rollback.log" 2>&1
  exit "$check_status"
fi
