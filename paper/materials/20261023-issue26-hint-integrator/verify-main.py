from pathlib import Path
import hashlib
import json
import os
import subprocess
import time

R = Path('/home/dw/Projects/agent-sts2')
B = Path(__file__).resolve().parent / 'current-main-candidate'
B.mkdir()
W = R / '.worktrees/integrator26-hint-main-20261023'
S = 'c9848dd6b3e258a2c7ab5433479dc0725e4e73ba'
original = json.loads((B.parent / 'verification.json').read_text())
BASE = original['current_main_at_preimage_check']
leaves = list(original['product_leaves'])

def git(*args, cwd=R, data=None, env=None):
    return subprocess.check_output(['git', *args], cwd=cwd, input=data, env=env)

assert git('rev-parse', 'HEAD', cwd=W).decode().strip() == BASE
assert not git('status', '--porcelain', cwd=W).strip()
patch = git('diff', S + '^', S, '--', *leaves)
git('apply', '--check', '-', cwd=W, data=patch)
git('apply', '-', cwd=W, data=patch)
for p, expected in original['product_leaves'].items():
    assert hashlib.sha256((W / p).read_bytes()).hexdigest() == expected
changed = set(git('diff', '--name-only', cwd=W).decode().splitlines())
new = set(git('ls-files', '--others', '--exclude-standard', cwd=W).decode().splitlines())
assert changed | new == set(leaves)
private = B / 'candidate.index'
env_index = {**os.environ, 'GIT_INDEX_FILE': str(private)}
git('read-tree', BASE, cwd=W, env=env_index)
for p in leaves:
    blob = git('hash-object', '-w', '--stdin', cwd=W, data=(W / p).read_bytes()).decode().strip()
    git('update-index', '--add', '--cacheinfo', f'100644,{blob},{p}', cwd=W, env=env_index)
tree = git('write-tree', cwd=W, env=env_index).decode().strip()
assert set(git('diff', '--name-only', BASE, tree).decode().splitlines()) == set(leaves)

def snapshot():
    paths = set(git('ls-files', '-z', cwd=W).decode().split('\0')) | set(leaves)
    return {p: hashlib.sha256((W / p).read_bytes()).hexdigest() for p in sorted(paths) if p and
            (W / p).is_file() and (p.startswith(('agent/src/', 'agent/tests/', 'knowledge/')) or
            p.startswith(('agent/tsconfig', 'agent/vitest', 'agent/package')))}

before = snapshot()
(B / 'inputs-before.json').write_text(json.dumps(before, indent=2) + '\n')
active = []
for proc in Path('/proc').iterdir():
    if not proc.name.isdigit():
        continue
    try:
        argv = (proc / 'cmdline').read_bytes().decode().split('\0')
        if Path(argv[0]).name in ('node', 'nodejs', 'npx', 'npm', 'vitest', 'tsc') and any(
                Path(a).name in ('vitest', 'vitest.mjs', 'vitest.js', 'tsc', 'tsc.js') for a in argv[1:]):
            active.append({'pid': int(proc.name), 'executable': Path(argv[0]).name})
    except (OSError, ValueError):
        pass
(B / 'active-tests-before.json').write_text(json.dumps(active, indent=2) + '\n')
assert not active
env = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'],
       'PYTHONDONTWRITEBYTECODE': '1', 'OMP_NUM_THREADS': '1', 'OPENBLAS_NUM_THREADS': '1', 'MKL_NUM_THREADS': '1'}
env.pop('CHARACTER', None)
steps = []
for name, args in [('tsc', ['npx', '--no-install', 'tsc', '-p', 'tsconfig.json', '--noEmit']),
                   ('vitest', ['npx', '--no-install', 'vitest', 'run', *original['test_files'], '--pool=threads',
                    '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json',
                    '--outputFile=' + str(B / 'vitest.json')])]:
    started = time.time()
    with (B / (name + '.txt')).open('wb') as out:
        result = subprocess.run(args, cwd=W / 'agent', env=env, stdout=out, stderr=subprocess.STDOUT)
    steps.append(dict(name=name, args=args, returncode=result.returncode, elapsed_seconds=round(time.time()-started, 3)))
    (B / 'steps.json').write_text(json.dumps(steps, indent=2) + '\n')
    assert result.returncode == 0
after = snapshot()
(B / 'inputs-after.json').write_text(json.dumps(after, indent=2) + '\n')
assert before == after
v = json.loads((B / 'vitest.json').read_text())
assert v['success'] and v['numPassedTests'] == 78 and v['numFailedTests'] == 0
assert set(git('diff', '--name-only', cwd=W).decode().splitlines()) | set(git('ls-files', '--others', '--exclude-standard', cwd=W).decode().splitlines()) == set(leaves)
report = dict(source=S, candidate_base=BASE, candidate_tree=tree, exact_product_leaves=original['product_leaves'],
              fixed_input_files=len(before), fixed_input_digest=hashlib.sha256(json.dumps(before, sort_keys=True).encode()).hexdigest(),
              all_fixed_inputs_unchanged=True, steps=steps, passed_tests=78, failed_tests=0, skipped_tests=0,
              full_test_run=False, source_merged_to_main=False, live_modified=False,
              purpose='current main plus four exact leaves compatibility; final queued full remains pending')
(B / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))
