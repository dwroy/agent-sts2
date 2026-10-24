from pathlib import Path
import hashlib, json, os, subprocess, time

W = Path(__file__).resolve().parents[3]
A = W / '.artifacts/issue42-integrator'
assert W.name == 'integrator42-20261022'
SOURCE = '2c2d9f1aa8027f59afc1969514a697559419a069'
def git(*args):
    return subprocess.check_output(['git', *args], cwd=W)
def sha(b):
    return hashlib.sha256(b).hexdigest()
def snapshot():
    names = git('ls-files', '-z', '--cached', '--others', '--exclude-standard',
                'agent', 'learner', 'eval', 'ops', 'knowledge', 'tools').decode().split('\0')
    return [{'path': n, 'sha256': sha((W/n).read_bytes())}
            for n in sorted(set(names)) if n and (W/n).is_file()]
def save(name, value):
    (A/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')

assert not (A/'before.json').exists()
paths = git('diff-tree', '--no-commit-id', '--name-only', '-r', SOURCE).decode().splitlines()
source = []
for p in paths:
    if p == 'paper/materials/decision-log.md':
        continue
    expected = git('show', f'{SOURCE}:{p}')
    # Cold archived report files are intentionally sparse: compare their staged blob.
    actual = (W/p).read_bytes() if (W/p).is_file() else git('show', f':{p}')
    source.append({'path': p, 'source_sha256': sha(expected), 'actual_sha256': sha(actual), 'match': expected == actual})
assert all(r['match'] for r in source)
save('source-readback.json', {'base': git('rev-parse','HEAD').decode().strip(), 'source': SOURCE, 'files': source})
before = snapshot(); save('before.json', before)
env = {**os.environ, 'PATH': str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],
       'PYTHONDONTWRITEBYTECODE': '1', 'ISSUE42_RECEIPT_DIR': str(A/'e2e')}
checks = []
commands = [
    ('tsc-first', W/'agent', ['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit']),
    ('vitest-targeted-first', W/'agent', ['node','node_modules/vitest/vitest.mjs','run',
        'tests/external-strategy-evidence.test.ts','tests/strategy-entries.test.ts',
        'tests/learning-ledger-metadata.test.ts','tests/brain-agent-mode.test.ts',
        'tests/learning-ledger.test.ts','tests/ledger-repeats.test.ts',
        'tests/ledger-rerelease.test.ts','tests/ledger-publication-baseline.test.ts',
        '--pool=threads','--maxWorkers=1','--no-file-parallelism']),
    ('python-external-first', W, ['python3','-B','agent/tests/external_strategy_ledger_test.py']),
]
for name, cwd, argv in commands:
    start = subprocess.check_output(['date','-Is'],text=True).strip(); tick = time.monotonic()
    log = A/'raw'/f'{name}.log'
    with log.open('xb') as f:
        result = subprocess.run(['nice','-n','19',*argv], cwd=cwd, env=env, stdout=f, stderr=subprocess.STDOUT)
    checks.append({'name': name, 'cwd': str(cwd.relative_to(W)), 'argv': ['nice','-n','19',*argv],
        'started_at':start,'duration_seconds':round(time.monotonic()-tick,3),'exit_code':result.returncode,
        'log':str(log.relative_to(A))})
    save('checks-first.json',checks)
    print(json.dumps(checks[-1]), flush=True)
    if result.returncode:
        break
after = snapshot(); save('after.json',after)
save('targeted-result.json', {'inputs':len(before),'inputs_unchanged':before==after,
    'source_matches':len(source),'all_commands_passed':len(checks)==len(commands) and all(c['exit_code']==0 for c in checks),
    'full_suite_executed':False,'source_merged_main':False,'changed_live':False})
assert before==after
assert len(checks)==len(commands) and all(c['exit_code']==0 for c in checks)
