#!/usr/bin/env bash
set -euo pipefail
export CODEX_HOME=/home/dw/Projects/agent-sts2/ops/codex-ops/accounts/codex3/learner
cd /home/dw/Projects/agent-sts2/.worktrees/issue-50-task
exec codex resume 01a167f0-bcfe-7543-bba3-47b4bdd50122 -C /home/dw/Projects/agent-sts2/.worktrees/issue-50-task -m gpt-6.1-sol -c model_reasoning_effort=high -s danger-full-access -a never
