#!/usr/bin/env bash
set -euo pipefail
export CODEX_HOME=/home/dw/Projects/agent-sts2/ops/codex-ops/accounts/codex3/learner
cd /home/dw/Projects/agent-sts2/.worktrees/issue-28-task
exec codex resume 01a1632e-bc91-7883-b0aa-9115ce0114ad -C /home/dw/Projects/agent-sts2/.worktrees/issue-28-task -m gpt-6.1-sol -c model_reasoning_effort=high -s danger-full-access -a never
