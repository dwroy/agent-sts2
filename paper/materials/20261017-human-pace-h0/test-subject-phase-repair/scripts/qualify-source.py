"""Run the unchanged full source sandbox after MC ends, keeping every earlier check."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
WORK = OUT.parents[2]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    assert not path.exists(), path
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def reference(path):
    return {'path': str(path), 'sha256': sha(path)}


def sources():
    return {rel: sha(WORK / rel) for rel in ['agent/src/reflex/rollout.ts', 'agent/src/reflex/rollout-live.ts', 'agent/tests/silent-test-subject-phase.test.ts']}


for i in range(4):
    assert json.loads((HERE / f'val-exit-{i}.json').read_text())['exit_code'] == 0
    assert json.loads((OUT / f'validation-phase-2/exit-{i}.json').read_text())['exit_code'] == 0
assert (HERE / 'calibration-completed.json').exists()
assert json.loads((OUT / 'test-history-restored-h0-ts-phase.json').read_text())['restored']
model = json.loads((HERE / 'model-plan.json').read_text())
for rel in ['agent/src/reflex/rollout.ts', 'agent/src/reflex/rollout-live.ts']:
    assert sha(WORK / rel) == model['frozen_inputs'][rel]
before = sources()
assert not (HERE / 'source-qualification.json').exists()
command = ['nice', '-n', '19', 'bash', 'tools/test-sandbox.sh']
env = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'], 'TMPDIR': str(HERE), 'SANDBOX_WORKERS': '2'}
started = dt.datetime.now(dt.timezone.utc).isoformat()
with (HERE / 'isolated2-history-preserve.log').open('wb') as handle:
    preserved = subprocess.run(['nice', '-n', '19', 'python3', str(OUT / 'preserve-test-history.py'), 'preserve', 'h0-ts-phase-isolated2'], stdout=handle, stderr=subprocess.STDOUT)
assert preserved.returncode == 0
log = HERE / 'source-sandbox-isolated2.log'
assert not log.exists()
print(json.dumps({'status': 'started', 'workers': 2, 'other_owned_mc_processes': 0, 'log': str(log)}), flush=True)
try:
    with log.open('wb') as handle:
        result = subprocess.run(command, cwd=WORK / 'agent', env=env, stdout=handle, stderr=subprocess.STDOUT)
    (HERE / 'source-sandbox-isolated2.exit').write_text(str(result.returncode) + '\n')
finally:
    with (HERE / 'isolated2-history-restore.log').open('wb') as handle:
        restored = subprocess.run(['nice', '-n', '19', 'python3', str(OUT / 'preserve-test-history.py'), 'restore', 'h0-ts-phase-isolated2'], stdout=handle, stderr=subprocess.STDOUT)
    assert restored.returncode == 0
history = OUT / 'test-history-restored-h0-ts-phase-isolated2.json'
after = sources()
first_exit = int((HERE / 'source-sandbox.exit').read_text().strip())
receipt = {'status': 'passed' if result.returncode == 0 and before == after else 'failed',
           'exit_code': result.returncode, 'started': started, 'ended': dt.datetime.now(dt.timezone.utc).isoformat(),
           'argv': command, 'cwd': str(WORK / 'agent'), 'workers': 2, 'other_owned_mc_processes': 0,
           'log': reference(log), 'history_restore': reference(history), 'source_sha256': before,
           'sources_unchanged': before == after,
           'first_full': {'exit_code': first_exit, 'log': reference(HERE / 'source-sandbox.log'),
                          'scope': 'Original full retained: scratch .ts evidence copies were scanned as incomplete modules; one unchanged Queen/Amalgam test timed out at its original 20000ms during three-MC overlap. Scratch copies now explicit text after completed calibration, canonical model .ts files unchanged.'},
           'scope': 'Same official full sandbox, assertions, time limits and exclusion list. Source bytes unchanged; final candidate experience data included. Only owned MC work has ended and official worker count is two. No borrowed old tree checks.'}
save(HERE / 'source-qualification.json', receipt)
print(json.dumps(receipt, ensure_ascii=False), flush=True)
sys.exit(0 if receipt['status'] == 'passed' else 1)
