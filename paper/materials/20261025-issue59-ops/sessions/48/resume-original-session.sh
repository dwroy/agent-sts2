#!/usr/bin/env bash
set -euo pipefail
export CODEX_HOME=/home/dw/Projects/agent-sts2/ops/codex-ops/accounts/codex3/learner
cd /home/dw/Projects/agent-sts2/.worktrees/issue-48-backfill-entry
exec codex resume 01a167ed-138a-7473-859c-afb4dba26198 -C /home/dw/Projects/agent-sts2/.worktrees/issue-48-backfill-entry -m gpt-6.1-sol -c model_reasoning_effort=high -s danger-full-access -a never
