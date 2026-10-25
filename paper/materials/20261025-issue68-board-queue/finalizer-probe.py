"""Real exec/exit/FD continuation using a tiny fixture result, never a project full."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
from unittest.mock import patch

PROJECT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT / 'ops/tests'))
from test_board_queue_checks import CandidateChecks
import board_queue_checks as checks
from issue_session_support import Board

mode = sys.argv[1]
assert mode in ('pass', 'nonzero', 'drift', 'policy')
original_temp = tempfile.TemporaryDirectory
with patch.object(tempfile, 'TemporaryDirectory', side_effect=lambda *a, **kw: original_temp(dir=PROJECT / '.cache')):
    case = CandidateChecks()
    case.setUp()
root = case.root
assembly = case.assemble()
board = Board(PROJECT).data
board['dispatcher']['install'] = '.state/kit'
(root / '.agents').mkdir(exist_ok=True)
(root / '.agents/board.yaml').write_text(json.dumps(board))
shutil.copytree(PROJECT / '.cache/board-kit-51c289c', root / '.state/kit',
                ignore=shutil.ignore_patterns('.state', '__pycache__', 'test_*.py'))
modules = ('board_queue_checks.py', 'board_queue_pin.py', 'issue_session_support.py', 'shared_tools.py',
           'worktree_checkout.py', 'disk_capacity.py', 'learner_retention.py', 'learner_checks.py',
           'board_queue_finalize.mjs', 'board_queue_leases.mjs')
for name in modules:
    target = root / 'ops' / name
    target.parent.mkdir(exist_ok=True)
    shutil.copyfile(PROJECT / 'ops' / name, target)
policy = dict(schema='sts2-queue-checks-v1', repo='dwroy/agent-sts2', runtime_install_paths=[],
              root_only_prefixes=['ops/'], fixtures=[], host_modules=[], consumer_commands=[], allowed_skips=[])
(root / '.agents/queue-checks.json').write_text(json.dumps(policy))
job = {**case.job, 'repo': 'dwroy/agent-sts2', 'required_checks': checks.NAMES, 'fixture_only': True}
job['policy_sha256'] = {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
                        for path in [root / '.agents/queue-checks.json', *[root / 'ops' / n for n in modules]]}
job_path = case.directory / 'job.json'
job_path.write_text(json.dumps(job))
context = dict(schema='sts2-queue-check-context-v1', job=job, job_path=str(job_path), assembly=assembly,
               worker=checks.identity(), commands=[], checks=dict.fromkeys(checks.NAMES, 'passed'), full_runs=0,
               full_result=str(case.directory / 'vitest-result.json'), tools=checks.tool_snapshot(),
               fixture_only=True, fixture_mode=mode)
context['checks']['full'] = 'unavailable'
full = (root / 'ops/integrator-full-check.lock').open('a')
fcntl.flock(full, fcntl.LOCK_EX)
for handle in case.handles:
    fcntl.flock(handle, fcntl.LOCK_EX)
context.update(full_lock_fd=full.fileno(), full_lock_inode=os.fstat(full.fileno()).st_ino)
checks.exec_descriptors(context)
context_path = case.directory / 'sts2-context.json'
context_path.write_text(json.dumps(context))
(case.directory / 'vitest-result.json').write_text(json.dumps(dict(success=mode != 'nonzero',
    testResults=[dict(assertionResults=[dict(fullName='synthetic continuation fixture', status='passed' if mode != 'nonzero' else 'failed')])],
    numPassedTests=1 if mode != 'nonzero' else 0, numFailedTests=1 if mode == 'nonzero' else 0, numPendingTests=0)))
script = root / '.state/runner.mjs'
script.write_text("import fs from 'node:fs';\n" +
    ("fs.writeFileSync(" + json.dumps(str(Path(assembly['root']) / 'agent/src/value.ts')) + ", 'frozen source drift\\n');\n" if mode == 'drift' else '') +
    ("fs.appendFileSync(" + json.dumps(str(root / 'ops/learner_checks.py')) + ", '\\n# fixture policy drift\\n');\n" if mode == 'policy' else '') +
    ('process.exitCode=7;\n' if mode == 'nonzero' else ''))
locator = PROJECT / 'paper/materials/20261025-issue68-board-queue' / ('finalizer-' + mode + '-' + root.name + '-locator.json')
locator.write_text(json.dumps(dict(root=str(root), context=str(context_path), job=str(job_path),
                                 fixture_only=True, mode=mode, parent=context['worker']), indent=2)+'\n')
print(json.dumps(dict(fixture_only=True, mode=mode, locator=str(locator))), flush=True)
os.environ['STS2_BOARD_CHECK_CONTEXT'] = str(context_path)
os.execvp('node', ['node', '--import', str(root / 'ops/board_queue_finalize.mjs'), str(script)])
