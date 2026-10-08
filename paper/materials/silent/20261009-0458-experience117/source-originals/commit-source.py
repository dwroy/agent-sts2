import json
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
W = ROOT / '.worktrees/exp'
tests = json.load((O / 'test-results.json').open())
assert tests['tsc'] == tests['vitest'] == 0 and tests['snapshot_unchanged']

def run(args, check=True):
    p = subprocess.run(args, cwd=W, text=True, capture_output=True)
    with (O / 'source-commit.log').open('a') as h:
        h.write(' '.join(args) + '\n' + p.stdout + p.stderr)
    if check:
        assert p.returncode == 0, p.stderr
    return p

run(['date'])
assert run(['git', 'branch', '--show-current']).stdout.strip() == 'exp-silent'
assert run(['git', 'diff', '--cached', '--name-only']).stdout.strip() == ''
assert run(['git', 'diff', '--name-only']).stdout.splitlines() == ['knowledge/characters/silent/experience.json']
assert subprocess.check_output(['git', 'show', 'HEAD:knowledge/characters/silent/experience.json'], cwd=W) == (O / 'experience-before.json').read_bytes()
run(['nice', '-n', '19', 'python3', str(O / 'final-checks.py')])
run(['nice', '-n', '19', 'python3', str(ROOT / 'learner/code_proposals.py'), 'check-experience', '--character', 'silent', '--before', str(O / 'experience-before.json'), '--after', str(W / 'knowledge/characters/silent/experience.json')])
run(['nice', '-n', '19', 'python3', str(ROOT / 'learner/ledger.py'), 'check'])
run(['git', 'diff', '--check'])
run(['git', 'add', 'knowledge/characters/silent/experience.json'])
patch = run(['git', 'diff', '--cached']).stdout
scan = subprocess.run(['nice', '-n', '19', 'gitleaks', 'stdin', '--redact', '--no-banner'], input=patch, text=True, capture_output=True, cwd=W)
(O / 'gitleaks-source-final.log').write_text(scan.stdout + scan.stderr)
assert scan.returncode == 0
run(['date'])
run(['git', 'commit', '-m', 'Update silent experience to 2026-10-09.6 (add 1, update 18, retire 0)', '-m', 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'])
commit = run(['git', 'rev-parse', 'HEAD']).stdout.strip()
(O / 'source-commit.txt').write_text(commit + '\n')
assert run(['git', 'status', '--porcelain']).stdout.strip() == ''
print(commit)
