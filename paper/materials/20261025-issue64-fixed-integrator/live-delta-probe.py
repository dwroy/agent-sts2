from pathlib import Path
import subprocess, hashlib, json

R = Path('/home/dw/Projects/agent-sts2')
A = Path(__file__).resolve().parent
M = R / 'paper/materials/20261025-issue64-fixed-integrator'
L = R / '.worktrees/live'
D = 'bc80005598d615516a36e3824f8bdba7e65356b3'
B = '614687462eaed74a0264f29730b73e883e2b25ee'
S = '2a11e1d4c5791ed4a193398aaeb959f065150adc'
sha = lambda data: hashlib.sha256(data).hexdigest()

def git(*args, data=None):
    return subprocess.check_output(['git', '-C', str(R), *args], input=data, stderr=subprocess.PIPE)

contract_path = 'paper/materials/20261025-issue64-route-reason/integration-contract.json'
contract_bytes = git('show', S + ':' + contract_path)
assert contract_bytes == (R / '.worktrees/issue-64-route-reason-schema' / contract_path).read_bytes()
contract = json.loads(contract_bytes)
files = [x for x in contract['files'] if x['kind'] in ('production', 'test')]
image = A / 'live-delta-image'
image.mkdir(exist_ok=False)
before = {}
for x in files:
    n = x['path']
    p = L / n
    before[n] = p.read_bytes() if p.exists() else None
    if before[n] is not None:
        target = image / n
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(before[n])
patch = git('diff', '--binary', B, D, '--', *[x['path'] for x in files])
prefix = str(image.relative_to(R))
git('apply', '--check', '--directory=' + prefix, '-', data=patch)
git('apply', '--directory=' + prefix, '-', data=patch)
after = {}
for x in files:
    n = x['path']
    value = (image / n).read_bytes()
    if x['kind'] == 'production' or before[n] is None:
        assert sha(value) == x['source_sha256'], n
    after[n] = {'path': n, 'kind': x['kind'], 'live_preimage_sha256': sha(before[n]) if before[n] is not None else None,
                'bounded_patch_postimage_sha256': sha(value), 'source_postimage_sha256': x['source_sha256'],
                'source_postimage_equal': sha(value) == x['source_sha256']}
    (A / ('postimage-' + Path(n).name)).write_bytes(value)
git('apply', '--reverse', '--check', '--directory=' + prefix, '-', data=patch)
git('apply', '--reverse', '--directory=' + prefix, '-', data=patch)
for n, value in before.items():
    p = image / n
    assert (p.read_bytes() if p.exists() else None) == value, n
    assert ((L / n).read_bytes() if (L / n).exists() else None) == value, n
result = {
    'at': subprocess.check_output(['date', '-Is'], text=True).strip(),
    'source_commit': D, 'supplement_commit': S, 'supplement_sha256': sha(contract_bytes),
    'actual_live_head': subprocess.check_output(['git', '-C', str(L), 'rev-parse', 'HEAD'], text=True).strip(),
    'patch_sha256': sha(patch), 'files': list(after.values()),
    'bounded_apply_and_reverse_exact': True, 'actual_live_unchanged': True,
    'production_or_developer_source_writes': 0, 'tests_or_full_runs': 0,
    'scope': 'Patch applicability and exact inverse in an isolated file image only; not a compatibility test result or production install.',
    'next': 'Freeze the actual ROOT/LIVE combination after the active issue63 full exits; retain the distinct LIVE session test postimage.'
}
(M / 'live-delta-applicability.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
(M / 'developer-integration-contract.json').write_bytes(contract_bytes)
print(json.dumps(result, ensure_ascii=False))
