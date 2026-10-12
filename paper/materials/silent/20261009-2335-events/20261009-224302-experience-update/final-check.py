import hashlib
import json
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
EXP = O.parents[2]
source = (O / 'source-commit.txt').read_text().strip()
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=EXP, text=True).strip() == source
path = 'knowledge/characters/silent/experience.json'
before = subprocess.check_output(['git', 'show', source + '^:' + path], cwd=EXP)
after = subprocess.check_output(['git', 'show', source + ':' + path], cwd=EXP)
assert before == (O / 'experience-before.json').read_bytes()
assert after == (EXP / path).read_bytes()
(O / 'commit-before.json').write_bytes(before)
(O / 'commit-after.json').write_bytes(after)
args = ['nice', '-n', '19', 'python3', str(ROOT / 'learner/code_proposals.py'), 'check-experience', '--character', 'silent', '--before', str(O / 'commit-before.json'), '--after', str(O / 'commit-after.json')]
p = subprocess.run(args, capture_output=True, text=True)
(O / 'check-source-commit.log').write_text(p.stdout + p.stderr)
assert p.returncode == 0
p = subprocess.run(['nice', '-n', '19', 'python3', str(ROOT / 'learner/ledger.py'), 'check'], capture_output=True, text=True)
(O / 'ledger-check-completion.log').write_text(p.stdout + p.stderr)
assert p.returncode == 0
patch = subprocess.check_output(['git', 'show', '--format=', source, '--', path], cwd=EXP)
p = subprocess.run(['nice', '-n', '19', 'gitleaks', 'stdin', '--redact', '--no-banner'], input=patch, capture_output=True)
(O / 'gitleaks-commit.log').write_bytes(p.stdout + p.stderr)
assert p.returncode == 0
manifest = json.load(open(O / 'test-copy-manifest.json'))
for row in manifest['files']:
    assert hashlib.sha256((EXP / row['file']).read_bytes()).hexdigest() == row['sha256']
    assert hashlib.sha256((O / 'test-checkout' / row['file']).read_bytes()).hexdigest() == row['sha256']
assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=EXP).strip()
merge = json.load(open(O / 'live-merge.json'))
assert merge['source'] == source
if merge['merged']:
    subprocess.run(['git', '-C', str(ROOT / '.worktrees/live'), 'merge-base', '--is-ancestor', source, merge['merged']], check=True)
append = json.load(open(O / 'changelog-append.json'))
with Path(append['path']).open('rb') as h:
    assert hashlib.sha256(h.read(append['before_bytes'])).hexdigest() == append['before_sha256']
U = json.load(open(O / 'update-summary.json'))
T = json.load(open(O / 'test-results.json'))
L = json.load(open(O / 'ledger-results.json'))
mechanisms = json.load(open(O / 'mechanisms.json'))
result = dict(task='experience-update', version=U['version'], commit=source, merged=merge['merged'], added=U['added'], updated=U['updated'], retired=U['retired'], active=U['after']['active'], mechanisms=[m['name'] for m in mechanisms], tests=dict(tsc=T['tsc'], vitest=T['vitest'], cases=T['cases']), ledger=L, code_proposals=json.load(open(O / 'code-proposals-results.json')), implementation_domains=['combat', 'potion', 'sl', 'terminal', 'structure'], report=str(O / 'report.md'))
(O / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print('实际来源提交、经验闭环、账本、源码测试副本和只追加记录检查均通过')
print(json.dumps(result, ensure_ascii=False))
