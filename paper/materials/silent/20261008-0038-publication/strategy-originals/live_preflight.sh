#!/usr/bin/env bash
set -u
set -o pipefail
task_root=/home/dw/Projects/agent-sts2
task_tree=$task_root/.worktrees/codex-dev
task_live=$task_root/.worktrees/live
export TMPDIR=$task_tree/learner/runs/20261008-000409-strategy-proposal
source_commit=$1
exec 9>"$task_root/ops/live-merge.lock"
if ! flock -w 10 9; then
  printf '%s\n' 'live-merge.lock在10秒内未取得；不触碰live。' > "$TMPDIR/live-preflight-blocked.txt"
  exit 2
fi
while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done
git -C "$task_live" status --porcelain > "$TMPDIR/live-status-before.txt"
git -C "$task_live" diff --cached --name-only > "$TMPDIR/live-staged-before.txt"
if test -s "$TMPDIR/live-staged-before.txt"; then
  printf '%s\n' 'live有先前已暂存的并行改动；不把它们纳入本批提交。' > "$TMPDIR/live-preflight-blocked.txt"
  exit 3
fi
git -C "$task_live" add notes/fight-value-backtest.md knowledge || exit 4
if ! git -C "$task_live" diff --cached --quiet; then
  git -C "$task_live" diff --cached | nice -n 19 gitleaks stdin --redact --no-banner \
    --report-format json --report-path "$TMPDIR/gitleaks-live-refresh.json" \
    > "$TMPDIR/gitleaks-live-refresh.log" 2>&1 || exit 5
  git -C "$task_live" commit -m 'Refresh knowledge data' \
    -m 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>' > "$TMPDIR/live-refresh-commit.log" 2>&1 || exit 6
fi
live_before=$(git -C "$task_live" rev-parse HEAD)
printf '%s\n' "$live_before" > "$TMPDIR/live-before-merge.txt"
printf '%s\n' "$source_commit" > "$TMPDIR/source-commit.txt"
common=$(git -C "$task_live" merge-base "$live_before" "$source_commit")
git -C "$task_tree" diff --name-only "$source_commit^" "$source_commit" > "$TMPDIR/source-paths.txt"
git -C "$task_live" diff --name-only "$common" "$live_before" -- knowledge notes/fight-value-backtest.md > "$TMPDIR/refreshed-paths.txt"
comm -12 <(sort "$TMPDIR/source-paths.txt") <(sort "$TMPDIR/refreshed-paths.txt") > "$TMPDIR/knowledge-overlap.txt"
if test -s "$TMPDIR/knowledge-overlap.txt"; then
  printf '%s\n' '刷新数据与本次源码提交重叠；按任务要求停止，不覆盖刷新。' > "$TMPDIR/live-preflight-blocked.txt"
  exit 7
fi
git -C "$task_live" merge-tree --write-tree "$live_before" "$source_commit" > "$TMPDIR/live-merge-preview.txt" 2>&1
preview_rc=$?
printf '%s\n' "$preview_rc" > "$TMPDIR/live-merge-preview.rc"
if test "$preview_rc" -ne 0; then
  printf '%s\n' '锁内merge-tree预检发现整枝合入冲突；按任务要求停止，未执行git merge、未覆盖并行记录。' > "$TMPDIR/live-preflight-blocked.txt"
  git -C "$task_live" rev-parse HEAD > "$TMPDIR/live-after-preflight.txt"
  git -C "$task_live" status --porcelain > "$TMPDIR/live-status-after.txt"
  exit 8
fi
printf '%s\n' '预检无冲突；本脚本未执行合入，需要在锁内再次核当前父提交后执行正式流程。' > "$TMPDIR/live-preflight-ready.txt"
