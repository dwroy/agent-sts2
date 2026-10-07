#!/usr/bin/env bash
set -eu
project=/home/dw/Projects/agent-sts2
dev="$project/.worktrees/codex-dev"
live="$project/.worktrees/live"
scratch="$dev/learner/runs/20261007-223545-strategy-proposal"
export TMPDIR="$scratch"
export PATH="$HOME/.local/node/bin:$PATH"
export npm_config_offline=true
export SANDBOX_WORKERS=4
branch=$(git -C "$dev" branch --show-current)
source_commit=$(git -C "$dev" rev-parse HEAD)
exec 9>"$project/ops/live-merge.lock"
if ! flock -w 60 9; then
  printf '%s\n' 'live merge lock busy; no live mutation' > "$scratch/live-blocker.txt"
  exit 75
fi
while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done
git -C "$live" rev-parse HEAD > "$scratch/live-before-refresh.txt"
git -C "$live" diff --name-only > "$scratch/live-dirty-before.txt"
git -C "$live" diff --cached --name-only > "$scratch/live-staged-before.txt"
python3 -B - "$scratch" <<'PY'
import sys
from pathlib import Path
s=Path(sys.argv[1])
paths=set((s/'live-dirty-before.txt').read_text().splitlines()+(s/'live-staged-before.txt').read_text().splitlines())
foreign=[p for p in paths if not p.startswith('knowledge/') and p not in ('notes/fight-value-backtest.md','notes/fight-value-backtest-silent.md')]
if foreign:
 (s/'live-blocker.txt').write_text('Unexpected tracked/staged live changes: '+', '.join(sorted(foreign))+'\n')
 sys.exit(76)
PY
git -C "$live" add knowledge
for file in notes/fight-value-backtest.md notes/fight-value-backtest-silent.md; do
  if [ -f "$live/$file" ]; then git -C "$live" add "$file"; fi
done
if ! git -C "$live" diff --cached --quiet; then
  nice -n 19 gitleaks git --pre-commit --staged --redact --no-banner --report-path "$scratch/gitleaks-refresh.json" "$live" > "$scratch/gitleaks-refresh.log" 2>&1
  git -C "$live" commit -m 'Refresh knowledge data' -m 'Co-Authored-By: Codex GPT-6.1-sol <noreply@openai.com>' > "$scratch/live-refresh-commit.log" 2>&1
fi
pre_merge=$(git -C "$live" rev-parse HEAD)
printf '%s\n' "$pre_merge" > "$scratch/live-pre-merge.txt"
git -C "$live" diff --name-only "$(cat "$scratch/live-before-refresh.txt")" "$pre_merge" > "$scratch/live-refresh-paths.txt"
common=$(git -C "$dev" merge-base "$source_commit" "$pre_merge")
git -C "$dev" diff --name-only "$common" "$source_commit" > "$scratch/branch-merge-paths.txt"
python3 -B - "$scratch" <<'PY'
import sys
from pathlib import Path
s=Path(sys.argv[1]);refresh=set((s/'live-refresh-paths.txt').read_text().splitlines());source=set((s/'branch-merge-paths.txt').read_text().splitlines())
overlap=sorted(refresh & source)
if overlap:
 (s/'live-blocker.txt').write_text('Refreshed data overlaps source branch: '+', '.join(overlap)+'\n')
 sys.exit(77)
PY
set +e
git -C "$live" merge --no-edit "$branch" -m $'Merge tested Silent Mirage strategy\n\nCo-Authored-By: Codex GPT-6.1-sol <noreply@openai.com>' > "$scratch/live-merge.log" 2>&1
merge_rc=$?
set -e
printf '%s\n' "$merge_rc" > "$scratch/live-merge.rc"
if [ "$merge_rc" -ne 0 ]; then
  git -C "$live" diff --name-only --diff-filter=U > "$scratch/live-conflict-paths.txt"
  git -C "$live" merge --abort > "$scratch/live-merge-abort.log" 2>&1
  printf '%s\n' 'Merge conflicts; aborted and preserved refreshed data' > "$scratch/live-blocker.txt"
  exit 78
fi
git -C "$live" rev-parse HEAD > "$scratch/live-merged.txt"
set +e
(cd "$live/agent" && bash tools/test-sandbox.sh) > "$scratch/live-sandbox.log" 2>&1
test_rc=$?
set -e
printf '%s\n' "$test_rc" > "$scratch/live-sandbox.rc"
if [ "$test_rc" -ne 0 ]; then
  while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done
  git -C "$live" diff --binary -- knowledge notes/fight-value-backtest.md notes/fight-value-backtest-silent.md > "$scratch/post-check-refresh.patch"
  git -C "$live" reset --hard "$pre_merge" > "$scratch/live-rollback.log" 2>&1
  if [ -s "$scratch/post-check-refresh.patch" ]; then git -C "$live" apply "$scratch/post-check-refresh.patch"; fi
  printf '%s\n' 'Post-merge tests failed; restored pre-merge code and retained refreshed data' > "$scratch/live-blocker.txt"
  exit 79
fi
printf '%s\n' "$source_commit" > "$scratch/live-verified-source.txt"
