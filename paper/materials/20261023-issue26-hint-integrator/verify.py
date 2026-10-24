from pathlib import Path
import csv
import gzip
import hashlib
import io
import json
import os
import re
import subprocess
import time

R = Path('/home/dw/Projects/agent-sts2')
B = Path(__file__).resolve().parent
W = R / '.worktrees/integrator26-hint-20261023'
S = 'c9848dd6b3e258a2c7ab5433479dc0725e4e73ba'
P = '5d2bc7a2c42b70b209cf419069f34bac7790b146'
LEAVES = ['agent/src/hand/screens/reward.ts', 'agent/src/hand/screens/reward-external-stats.ts',
          'agent/src/hand/screens/reward-external-stats-ids.ts', 'agent/tests/reward-external-stats.test.ts']
TESTS = ['tests/reward-external-stats.test.ts', 'tests/silent-reward-addition.test.ts',
         'tests/reward-special.test.ts', 'tests/v6-card-reward-scope.test.ts', 'tests/v6-card-pick.test.ts']
SHA = lambda b: hashlib.sha256(b).hexdigest()

def git(*args, cwd=R):
    return subprocess.check_output(['git', *args], cwd=cwd)

def snapshot():
    paths = git('ls-files', '-z', cwd=W).decode().split('\0')
    return {p: SHA((W / p).read_bytes()) for p in paths if p and (W / p).is_file() and
            (p.startswith(('agent/src/', 'agent/tests/', 'knowledge/')) or
             p.startswith(('agent/tsconfig', 'agent/vitest', 'agent/package')))}

assert git('rev-parse', 'HEAD', cwd=W).decode().strip() == S
assert git('rev-parse', S + '^').decode().strip() == P
assert not git('status', '--porcelain', cwd=W).strip()
source_paths = git('diff-tree', '--no-commit-id', '--name-only', '-r', S).decode().splitlines()
assert set(source_paths) == set(LEAVES + ['paper/materials/decision-log.md'] +
    ['paper/materials/20261023-issue26-reward-stats-hint/' + n for n in
     ['mapping-provenance.json', 'verification.json', 'verify-mapping.py', 'vitest.txt.gz']])
main = git('rev-parse', 'main').decode().strip()
preimage = {}
for p in LEAVES:
    assert (W / p).read_bytes() == git('show', S + ':' + p)
    old = subprocess.run(['git', 'cat-file', '-e', P + ':' + p], cwd=R, capture_output=True).returncode == 0
    now = subprocess.run(['git', 'cat-file', '-e', main + ':' + p], cwd=R, capture_output=True).returncode == 0
    assert old == now
    if old:
        assert git('show', P + ':' + p) == git('show', main + ':' + p)
    preimage[p] = {'exists': old, 'current_main_matches_source_preimage': True}

mapping = git('show', '04340d95fcad838801d11750e1982c960f8b0d16:paper/materials/2026-10-21-sts2fun-stats/id_mapping.csv')
assert SHA(mapping) == '5b37c495f081e2b17d8500d56087b83997743870a30896e88e0f93279bec3d6d'
rows = [r for r in csv.DictReader(io.StringIO(mapping.decode())) if r['kind'] == 'cards']
valid = [r for r in rows if r['mapped'] == 'True']
code = (W / LEAVES[2]).read_text()
tokens = ' '.join(re.findall(r'"([A-Z_0-9 ]+)"', code.split('new Set([', 1)[1].split('].join(', 1)[0])).split()
expected = [r['local_id'] for r in valid]
assert len(tokens) == len(set(tokens)) == len(expected) == 505
assert set(tokens) == set(expected)
assert all(r['external_id'] == 'CARD.' + r['local_id'] for r in valid)
unmapped = [r for r in rows if r['mapped'] != 'True']
assert len(unmapped) == 3 and not {r['local_id'] for r in unmapped} & set(tokens)
gz = git('show', S + ':paper/materials/20261023-issue26-reward-stats-hint/vitest.txt.gz')
raw = gzip.decompress(gz)
assert SHA(gz) == '2113faff13abdfe95eedc4f4d820fd3bd74b978f9044049e7cd8151ed6e90af9'
assert SHA(raw) == '4f0dc4820fd8deaf9075d1779ab2de97fc7073b67ee8d957ade0bed77b2de554'
(B / 'developer-vitest-original.txt').write_bytes(raw)

# Inspect executable argv only; serialized orchestration strings are not running tests.
active = []
for proc in Path('/proc').iterdir():
    if not proc.name.isdigit():
        continue
    try:
        argv = (proc / 'cmdline').read_bytes().decode().split('\0')
        exe = Path(argv[0]).name
        if exe in ('node', 'nodejs', 'npx', 'npm', 'vitest', 'tsc') and any(
                Path(a).name in ('vitest', 'vitest.mjs', 'vitest.js', 'tsc', 'tsc.js') for a in argv[1:]):
            active.append({'pid': int(proc.name), 'executable': exe})
    except (OSError, ValueError):
        pass
(B / 'active-tests-before.json').write_text(json.dumps(active, indent=2) + '\n')
assert not active, 'another real test executable is running; preserve this preflight and wait for a new admission'

before = snapshot()
(B / 'inputs-before.json').write_text(json.dumps(before, indent=2) + '\n')
env = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'],
       'PYTHONDONTWRITEBYTECODE': '1', 'OMP_NUM_THREADS': '1', 'OPENBLAS_NUM_THREADS': '1', 'MKL_NUM_THREADS': '1'}
env.pop('CHARACTER', None)
steps = []
for name, args in [('tsc', ['npx', '--no-install', 'tsc', '-p', 'tsconfig.json', '--noEmit']),
                   ('vitest', ['npx', '--no-install', 'vitest', 'run', *TESTS, '--pool=threads',
                               '--maxWorkers=1', '--no-file-parallelism', '--reporter=default',
                               '--reporter=json', '--outputFile=' + str(B / 'vitest.json')])]:
    started = time.time()
    with (B / (name + '.txt')).open('wb') as out:
        result = subprocess.run(args, cwd=W / 'agent', env=env, stdout=out, stderr=subprocess.STDOUT)
    steps.append({'name': name, 'args': args, 'returncode': result.returncode, 'elapsed_seconds': round(time.time() - started, 3)})
    (B / 'steps.json').write_text(json.dumps(steps, indent=2) + '\n')
    assert result.returncode == 0, name + ' failed; original output retained'
after = snapshot()
(B / 'inputs-after.json').write_text(json.dumps(after, indent=2) + '\n')
assert before == after
assert not git('status', '--porcelain', cwd=W).strip()
v = json.loads((B / 'vitest.json').read_text())
assert v['success'] and v['numPassedTests'] == 78 and v['numFailedTests'] == 0
files = sorted({str(Path(r['name']).relative_to(W / 'agent')) for r in v['testResults']})
assert files == sorted(TESTS)
report = dict(source=S, source_parent=P, current_main_at_preimage_check=main, product_leaves={p: before[p] for p in LEAVES},
              preimage=preimage, mapped_cards=505, unmapped_cards_excluded=3, mapping_sha256=SHA(mapping),
              mapping_exact_identity_only=True, developer_gzip_sha256=SHA(gz), developer_raw_log_sha256=SHA(raw),
              fixed_input_files=len(before), fixed_input_digest=SHA(json.dumps(before, sort_keys=True).encode()),
              all_fixed_inputs_unchanged=True, steps=steps, test_files=files, passed_tests=v['numPassedTests'],
              failed_tests=v['numFailedTests'], skipped_tests=v['numPendingTests'], full_test_run=False,
              source_merged_to_main=False, live_modified=False, model_requests=0,
              pending_queue=['36-supplement', '46', '26-hint', '42-tools', '35', '28', '37', '20-after-37'])
(B / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))
