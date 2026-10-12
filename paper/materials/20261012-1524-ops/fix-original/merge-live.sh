#!/usr/bin/env bash
set -euo pipefail
ROOT=/home/dw/Projects/agent-sts2
SOURCE="$ROOT/.worktrees/codex-fix-silent-20261012-144302"
OUT="$SOURCE/learner/runs/20261012-144317-fix-batch"
LIVE="$ROOT/.worktrees/live"
BRANCH=codex-fix-silent-20261012-144302
export TMPDIR="$OUT"
export PATH="$HOME/.local/node/bin:$PATH"
export SANDBOX_WORKERS=1
exec 9>"$ROOT/ops/live-merge.lock"
flock 9
while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done
cd "$LIVE"
git status --porcelain > "$OUT/live-before-refresh.status"
git diff --cached --quiet || { echo '已有暂存内容，停止合入'; exit 3; }
git diff --name-only -- knowledge notes/fight-value-backtest.md > "$OUT/live-refreshed.paths"
sha256sum notes/fight-value-backtest-silent.md notes/monster-db-check.md > "$OUT/live-unrelated-before.sha256"
git add notes/fight-value-backtest.md knowledge
if ! git diff --cached --quiet; then
  git diff --cached | nice -n 19 gitleaks stdin --redact --no-banner > "$OUT/gitleaks-refresh.log" 2>&1
  git commit -m "Refresh knowledge data" -m "Co-Authored-By: Codex GPT-6 <noreply@openai.com>" > "$OUT/live-refresh-commit.log" 2>&1
fi
before=$(git rev-parse HEAD)
printf '%s\n' "$before" > "$OUT/live-before-merge.txt"
base=$(git merge-base HEAD "$BRANCH")
git diff --name-only "$base..$BRANCH" -- knowledge notes/fight-value-backtest.md | sort > "$OUT/source-knowledge.paths"
git diff --name-only "$base..HEAD" -- knowledge notes/fight-value-backtest.md | sort > "$OUT/live-knowledge.paths"
comm -12 "$OUT/source-knowledge.paths" "$OUT/live-knowledge.paths" > "$OUT/knowledge-overlap.paths"
if [ -s "$OUT/knowledge-overlap.paths" ]; then
  echo '刷新知识与分支路径重叠，停止合入'
  exit 4
fi
if git merge --no-edit "$BRANCH" > "$OUT/live-merge.log" 2>&1; then
  git rev-parse HEAD > "$OUT/live-merged.txt"
else
  result=$?
  printf '%s\n' "$result" > "$OUT/live-merge.exit"
  git status --porcelain > "$OUT/live-merge-failed.status"
  git diff --name-only --diff-filter=U > "$OUT/live-conflicts.paths"
  if git rev-parse -q --verify MERGE_HEAD >/dev/null; then git merge --abort; fi
  git rev-parse HEAD > "$OUT/live-after-abort.txt"
  sha256sum notes/fight-value-backtest-silent.md notes/monster-db-check.md > "$OUT/live-unrelated-after.sha256"
  echo 'live合入失败，原冲突与退出码已保存，未覆盖刷新数据'
  tail -25 "$OUT/live-merge.log"
  exit 5
fi
set +e
(cd agent && nice -n 19 bash tools/test-sandbox.sh) > "$OUT/sandbox-live.log" 2>&1
result=$?
set -e
printf '%s\n' "$result" > "$OUT/sandbox-live.exit"
if [ "$result" -ne 0 ]; then
  git reset --merge "$before" > "$OUT/live-rollback.log" 2>&1
  echo '合后测试失败，回退合并并保留刷新数据'
  exit 6
fi
stamp=$(date '+%Y-%m-%d %H:%M:%S %Z')
source_commit=$(git rev-parse "$BRANCH")
merged_commit=$(git rev-parse HEAD)
printf '\n- %s [学习者 codex fix-batch] 来源fix-queue-v4的ops-stall-recovery-test-subprocess-timeout：源码%s合入live %s；仅测试执行器改为异步有界等待，保留真实脚本、恢复/闸/静默断言，固定6秒启动延迟撤码1败/恢复6过，非零退出和挂起终止回归通过。证据检查批20261012-131301-strategy-proposal（组合树f1e8a6cda3f1b37f20f78bdf650e0e3ce2a997b9），游戏局号/层/回合与账本id不适用；原宿主失败精确负载根因仍未证。源及合后沙箱tsc/vitest通过，gitleaks通过；不改生产轮询/知识/对局行为，无eval版本或提案，宿主完整检查由原完成事件接续。报告learner/runs/20261012-144317-fix-batch/report.md。\n' "$stamp" "$source_commit" "$merged_commit" >> paper/materials/decision-log.md
git add paper/materials/decision-log.md
git diff --cached | nice -n 19 gitleaks stdin --redact --no-banner > "$OUT/gitleaks-deployment.log" 2>&1
git commit -m "Record stall recovery fixture deployment" -m "Co-Authored-By: Codex GPT-6 <noreply@openai.com>" > "$OUT/live-deployment-commit.log" 2>&1
git rev-parse HEAD > "$OUT/live-final.txt"
echo 'live合入及合后自测完成'
