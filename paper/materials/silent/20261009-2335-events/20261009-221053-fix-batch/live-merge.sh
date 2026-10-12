#!/usr/bin/env bash
set -eu
scratch=/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261009-221053/learner/runs/20261009-221100-fix-batch
live=/home/dw/Projects/agent-sts2/.worktrees/live
source_branch=codex-fix-silent-20261009-221053
export TMPDIR="$scratch"
export PATH="$HOME/.local/node/bin:$PATH"
export PYTHONDONTWRITEBYTECODE=1
date
while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done
cd "$live"
git status --short > "$scratch/live-before.status"
git rev-parse HEAD > "$scratch/live-before-refresh.txt"
git diff --name-only > "$scratch/live-dirty-before.txt"
git add notes/fight-value-backtest.md knowledge
if ! git diff --cached --quiet; then
  git diff --cached --check
  gitleaks git --staged --redact --no-banner
  git commit -m 'Refresh knowledge data' -m 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'
fi
git rev-parse HEAD > "$scratch/live-premerge.txt"
common=$(git merge-base HEAD "$source_branch")
git diff --name-only "$common" "$source_branch" > "$scratch/source-paths.txt"
git diff --name-only "$(cat "$scratch/live-before-refresh.txt")" HEAD > "$scratch/live-refresh-paths.txt"
python3 - "$scratch" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
source = set((p/'source-paths.txt').read_text().splitlines())
refresh = set((p/'live-refresh-paths.txt').read_text().splitlines())
dirty = set((p/'live-dirty-before.txt').read_text().splitlines())
overlap = source & (refresh | dirty)
(p/'live-overlap.json').write_text(json.dumps({'source':sorted(source),'refreshed':sorted(refresh),
    'dirty_before':sorted(dirty),'overlap':sorted(overlap)},ensure_ascii=False,indent=2)+'\n')
if overlap: raise SystemExit('Refreshed or pending live paths overlap source changes; stopping.')
PY
git merge --no-edit "$source_branch"
git rev-parse HEAD > "$scratch/live-code-merge.txt"
cd agent
if bash tools/test-sandbox.sh > "$scratch/live-sandbox.log" 2>&1; then
  tail -n 18 "$scratch/live-sandbox.log"
else
  result=$?
  tail -n 36 "$scratch/live-sandbox.log"
  git -C "$live" reset --merge "$(cat "$scratch/live-premerge.txt")"
  exit "$result"
fi
if nice -n 19 python3 -B tests/report_death_fight_test.py > "$scratch/live-report-python.log" 2>&1; then
  cat "$scratch/live-report-python.log"
else
  result=$?
  cat "$scratch/live-report-python.log"
  git -C "$live" reset --merge "$(cat "$scratch/live-premerge.txt")"
  exit "$result"
fi
cd "$live"
date
export FIX_BATCH_RELEASE_TS="$(date '+%Y-%m-%d %H:%M')"
python3 "$scratch/register-release.py"
git add paper/materials/decision-log.md eval/versions.json
git diff --cached --check
gitleaks git --staged --redact --no-banner
git commit -m 'Record verified Silent interface and reporting bug fixes' -m 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'
git rev-parse HEAD > "$scratch/live-final.txt"
git status --short > "$scratch/live-after.status"
