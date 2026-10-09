#!/usr/bin/env bash
set -euo pipefail
task_root=/home/dw/Projects/agent-sts2
task_tree=$task_root/.worktrees/codex-strategy-silent-20261009-221053
task_scratch=$task_tree/learner/runs/20261009-221059-strategy-proposal
task_live=$task_root/.worktrees/live
export TMPDIR=$task_scratch
export PATH="$HOME/.local/node/bin:$PATH"
export SANDBOX_WORKERS=4
task_source=$(git -C "$task_tree" rev-parse HEAD)
exec 9>"$task_root/ops/live-merge.lock"
flock 9
while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done
if ! git -C "$task_live" diff --cached --quiet; then
  printf 'live已有并行暂存改动，未变更live。\n'
  exit 75
fi
git -C "$task_live" status --short > "$task_scratch/live-status-before.txt"
git -C "$task_live" add notes/fight-value-backtest.md knowledge
if ! git -C "$task_live" diff --cached --quiet; then
  git -C "$task_live" diff --cached --binary | nice -n 19 gitleaks stdin --redact --no-banner \
    --report-format json --report-path "$task_scratch/gitleaks-refresh.json" > "$task_scratch/gitleaks-refresh.log" 2>&1
  git -C "$task_live" commit -m 'Refresh knowledge data' -m 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'
  git -C "$task_live" rev-parse HEAD > "$task_scratch/refresh-commit.txt"
fi
task_before=$(git -C "$task_live" rev-parse HEAD)
printf '%s\n' "$task_before" > "$task_scratch/live-before.txt"
task_merge_base=$(git -C "$task_live" merge-base HEAD "$task_source")
git -C "$task_live" diff --name-only "$task_merge_base" "$task_source" -- knowledge notes/fight-value-backtest.md \
  > "$task_scratch/source-knowledge-paths.txt"
git -C "$task_live" diff --name-only "$task_merge_base" HEAD -- knowledge notes/fight-value-backtest.md \
  > "$task_scratch/live-knowledge-paths.txt"
comm -12 <(sort "$task_scratch/source-knowledge-paths.txt") <(sort "$task_scratch/live-knowledge-paths.txt") \
  > "$task_scratch/knowledge-overlap.txt"
if test -s "$task_scratch/knowledge-overlap.txt"; then
  printf '知识刷新与本分支有路径重叠，停止合入。\n'
  exit 76
fi
if ! nice -n 19 git -C "$task_live" merge-tree --write-tree HEAD "$task_source" > "$task_scratch/merge-preflight.log" 2>&1; then
  printf '合入预检存在冲突，未开始merge。\n'
  exit 77
fi
git -C "$task_live" merge --no-edit "$task_source" > "$task_scratch/live-merge.log" 2>&1
git -C "$task_live" rev-parse HEAD > "$task_scratch/live-merge-commit.txt"
cd "$task_live/agent"
set +e
bash tools/test-sandbox.sh > "$task_scratch/live-sandbox.log" 2>&1
task_checks=$?
set -e
printf '%s\n' "$task_checks" > "$task_scratch/live-sandbox.rc"
if test "$task_checks" -ne 0; then
  git -C "$task_live" reset --merge "$task_before" > "$task_scratch/live-rollback.log" 2>&1
  printf '合后检查失败，已回退并保留刷新数据：%s\n' "$task_before"
  exit "$task_checks"
fi
git -C "$task_live" merge-base --is-ancestor "$task_source" HEAD
git -C "$task_live" rev-parse HEAD > "$task_scratch/live-checked-commit.txt"
PYTHONDONTWRITEBYTECODE=1 nice -n 19 python3 "$task_scratch/record_release.py" > "$task_scratch/release-record.log" 2>&1
printf '源码已实际合入，合后沙箱通过：%s\n' "$(cat "$task_scratch/live-checked-commit.txt")"
tail -n 16 "$task_scratch/live-sandbox.log"
