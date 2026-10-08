#!/usr/bin/env bash
set -eu
export TMPDIR=/home/dw/Projects/agent-sts2/learner/runs/20261007-084302-experience-update
export PATH="$HOME/.local/node/bin:$PATH"
cd /home/dw/Projects/agent-sts2/.worktrees/exp
while [ ! -f "$TMPDIR/test-source.rc" ]; do sleep 10; done
if [ "$(cat "$TMPDIR/test-source.rc")" != 0 ]; then exit 3; fi
if [ "$(git hash-object knowledge/characters/silent/experience.json)" != "$(cat "$TMPDIR/source-tested-blob.txt")" ]; then exit 4; fi
git diff --check
git add knowledge/characters/silent/experience.json
git -c user.name=dwroy -c user.email=roy.dongwei@gmail.com commit -m 'Update Silent experience to 2026-10-07.13 (add 1, update 6, retire 0)' -m 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>' > "$TMPDIR/git-commit.log" 2>&1
git rev-parse HEAD > "$TMPDIR/commit.txt"
date '+%Y-%m-%d %H:%M:%S %z'
python3 - <<'PY'
from pathlib import Path
O=Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-084302-experience-update');c=(O/'commit.txt').read_text().strip()
(O/'changelog-title.txt').write_text('## 2026-10-07 静默猎手 第六十七次增量：1 局 A10（version 2026-10-07.13，分支 exp-silent，'+c[:8]+'）\n')
PY
nice -n 19 python3 "$TMPDIR/ledger-update.py" > "$TMPDIR/ledger-update.log" 2>&1
printf '源提交与账本登记完成\n'
