#!/usr/bin/env bash
set -eu
task_scratch=/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261008-010309-strategy-proposal
task_live=/home/dw/Projects/agent-sts2/.worktrees/live
task_branch=strategy-silent-sloth-replay-20261008-010309
export TMPDIR="$task_scratch"
export PATH="$HOME/.local/node/bin:$PATH"
exec 9>/home/dw/Projects/agent-sts2/ops/live-merge.lock
flock -w 45 9
while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done
cd "$task_live"
git rev-parse HEAD > "$task_scratch/live-before-refresh.txt"
git status --short --untracked-files=no > "$task_scratch/live-status-before.txt"
git diff --cached --name-only > "$task_scratch/live-staged-before.txt"
if test -s "$task_scratch/live-staged-before.txt"; then
  printf '%s\n' 'live已有并行暂存，保留并停止。' > "$task_scratch/live-preflight-blocked.txt"
  exit 20
fi
git add notes/fight-value-backtest.md knowledge
if ! git diff --cached --quiet; then
  set -o pipefail
  git diff --cached | nice -n 19 gitleaks stdin --redact --report-format json --report-path "$task_scratch/gitleaks-refresh.json" > "$task_scratch/gitleaks-refresh.log" 2>&1
  git diff --cached --name-only > "$task_scratch/refreshed-paths.txt"
  git commit -m 'Refresh knowledge data' -m 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>' > "$task_scratch/live-refresh-commit.log"
else
  : > "$task_scratch/refreshed-paths.txt"
fi
git rev-parse HEAD > "$task_scratch/live-before-merge.txt"
git diff --name-only "$(git merge-base HEAD "$task_branch")" "$task_branch" -- knowledge notes/fight-value-backtest.md > "$task_scratch/branch-knowledge-paths.txt"
comm -12 <(sort "$task_scratch/refreshed-paths.txt") <(sort "$task_scratch/branch-knowledge-paths.txt") > "$task_scratch/knowledge-overlap.txt"
if test -s "$task_scratch/knowledge-overlap.txt"; then
  printf '%s\n' '刷新知识与分支重叠，保留刷新并停止。' > "$task_scratch/live-preflight-blocked.txt"
  exit 20
fi
set +e
nice -n 19 git merge-tree --write-tree HEAD "$task_branch" > "$task_scratch/live-merge-preview.txt" 2>&1
preview_rc=$?
set -e
printf '%s\n' "$preview_rc" > "$task_scratch/live-merge-preview.rc"
if test "$preview_rc" -ne 0; then
  printf '%s\n' '整枝合入预检冲突；保留并行记录和知识刷新，未执行merge。' > "$task_scratch/live-preflight-blocked.txt"
  git rev-parse HEAD > "$task_scratch/live-after-preflight.txt"
  exit 20
fi
git merge --no-edit "$task_branch" > "$task_scratch/live-merge.log" 2>&1
git rev-parse HEAD > "$task_scratch/live-source-merge.txt"
cd agent
set +e
SANDBOX_WORKERS=1 bash tools/test-sandbox.sh > "$task_scratch/post-merge-sandbox.log" 2>&1
checks_rc=$?
set -e
printf '%s\n' "$checks_rc" > "$task_scratch/post-merge-sandbox.rc"
if test "$checks_rc" -ne 0; then
  cd "$task_live"
  git reset --hard "$(cat "$task_scratch/live-before-merge.txt")" > "$task_scratch/live-rollback.log"
  printf '%s\n' '合后测试失败，已回到合前提交并保留刷新数据。' > "$task_scratch/live-preflight-blocked.txt"
  exit 21
fi
