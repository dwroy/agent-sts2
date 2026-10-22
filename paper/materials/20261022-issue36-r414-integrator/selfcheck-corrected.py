from pathlib import Path
import json, os, subprocess, time

R = Path('/home/dw/Projects/agent-sts2')
A = R / '.artifacts/issue36-r414-integrator-20261022'
W = R / '.worktrees/integrator36-r414-20261022'
F = A / 'selfcheck-corrected'
F.mkdir(exist_ok=False)
env = {**os.environ, 'PATH': str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],
       'PYTHONDONTWRITEBYTECODE': '1', 'OMP_NUM_THREADS': '1', 'OPENBLAS_NUM_THREADS': '1'}
env.pop('CHARACTER', None)
files = ['legacy-refresh-incremental']
commands = [
    ('tsc', ['node', 'node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit'], W/'agent'),
    ('targeted', ['node', 'node_modules/vitest/vitest.mjs', 'run', '--pool=forks', '--maxWorkers=1',
                  '--no-file-parallelism', '--reporter=default', '--reporter=json',
                  '--outputFile.json='+str(F/'vitest.json'),
                  *['tests/'+name+'.test.ts' for name in files]], W/'agent'),
    ('python-view', ['python3', '-B', 'ops/tests/test_brain_view.py', '-v'], W),
    ('python-tui', ['python3', '-B', 'ops/tests/test_learner_tui.py', '-v'], W),
    ('shell', ['bash', '-n', 'ops/codex-ops-learner.sh', 'ops/codex-ops.sh', 'ops/herdr-host.sh', 'ops/run.sh'], W),
]
state = {'steps': [], 'state': 'running', 'production_written': False}
for name, argv, cwd in commands:
    start = time.monotonic()
    with (F/(name+'.log')).open('xb') as out:
        result = subprocess.run(['nice', '-n', '19', *argv], cwd=cwd, env=env, stdout=out, stderr=subprocess.STDOUT)
    state['steps'].append({'name': name, 'argv': argv, 'exit_code': result.returncode,
                           'seconds': round(time.monotonic()-start, 3)})
    print(json.dumps(state['steps'][-1]), flush=True)
    (A/'selfcheck-corrected.json').write_text(json.dumps(state, ensure_ascii=False, indent=2)+'\n')
    if result.returncode:
        raise SystemExit(result.returncode)
prior = json.loads((A/'selfcheck/vitest.json').read_text())
assert len(prior['testResults']) == 9
assert all(t['status']=='passed' for t in prior['testResults'] if not t['name'].endswith('/legacy-refresh-incremental.test.ts'))
state['prior_eight_files_passed'] = True
state['prior_failure_preserved'] = 'selfcheck-first.json'
state['state'] = 'passed'
state['tree'] = subprocess.check_output(['git', 'write-tree'], cwd=W, text=True).strip()
assert not subprocess.check_output(['git', 'diff', '--name-only'], cwd=W).strip()
(A/'selfcheck-corrected.json').write_text(json.dumps(state, ensure_ascii=False, indent=2)+'\n')

(A/'selfcheck.json').write_text(json.dumps(state, ensure_ascii=False, indent=2)+'\n')
