#!/usr/bin/env python3
"""Run one fixed-source canonical check; record its actual terminal status without model polling."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
TREE = ROOT / '.worktrees/codex-saving-20261018'
manifest = json.loads((OUT/'source-leaves-final.json').read_text())


def verify():
    return all(hashlib.sha256((TREE/row['path']).read_bytes()).hexdigest() == row['sha256']
               for row in manifest['leaves'])


assert verify(), 'final source differs before test'
started = dt.datetime.now().astimezone().isoformat()
clock = time.monotonic()
env = {**os.environ, 'SANDBOX_WORKERS': '1'}
command = ['bash', 'tools/test-sandbox.sh']
log = OUT/'source-sandbox-final.log'
with log.open('wb') as handle:
    result = subprocess.run(command, cwd=TREE/'agent', env=env, stdout=handle, stderr=subprocess.STDOUT)
unchanged = verify()
receipt = dict(started=started, finished=dt.datetime.now().astimezone().isoformat(),
               elapsed_seconds=round(time.monotonic()-clock, 3), command=command, workers=1,
               rc=result.returncode, source_unchanged=unchanged, log=str(log),
               log_sha256=hashlib.sha256(log.read_bytes()).hexdigest(),
               full_pass=result.returncode == 0 and unchanged,
               live_host_pass_claim=False)
(OUT/'source-checks-final.json').write_text(json.dumps(receipt, indent=2)+'\n')
print(json.dumps(receipt))
sys.exit(result.returncode or (0 if unchanged else 90))
