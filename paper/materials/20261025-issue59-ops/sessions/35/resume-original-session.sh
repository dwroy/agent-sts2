#!/usr/bin/env bash
set -euo pipefail
export CODEX_HOME=/home/dw/Projects/agent-sts2/ops/codex-ops/accounts/codex3/learner
cd /home/dw/Projects/agent-sts2/.worktrees/issue-35-build-log
exec codex resume 01a1632e-4010-7352-9772-f074ef43ae0c -C /home/dw/Projects/agent-sts2/.worktrees/issue-35-build-log -m gpt-6.1-sol -c model_reasoning_effort=high -s danger-full-access -a never
