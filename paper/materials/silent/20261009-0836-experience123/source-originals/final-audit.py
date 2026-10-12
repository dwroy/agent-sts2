import hashlib
import json
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
W = O.parents[2]
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
result = json.loads((O / 'report.json').read_text())
merge = json.loads((O / 'live-merge.json').read_text())
append = json.loads((O / 'changelog-append.json').read_text())
source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=W, text=True).strip()
assert source == result['commit']
assert subprocess.check_output(['git', 'status', '--porcelain'], cwd=W, text=True) == ''
assert subprocess.check_output(['git', 'diff-tree', '--no-commit-id', '--name-only', '-r', source], cwd=W, text=True).splitlines() == ['knowledge/characters/silent/experience.json']
experience = (W / 'knowledge/characters/silent/experience.json').read_bytes()
assert subprocess.check_output(['git', 'show', source + ':knowledge/characters/silent/experience.json'], cwd=W) == experience
entries = json.loads(experience)['entries']
active = [e for e in entries if e['status'] == 'active']
assert len(active) == result['active'] == 193
assert sum(len(e['lesson']) for e in active) == 51873
assert result['merged'] is None and merge['merged'] is None
live_head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=LIVE, text=True).strip()
assert live_head == merge['pre']
assert subprocess.check_output(['git', 'status', '--porcelain'], cwd=LIVE, text=True) == ''
assert subprocess.run(['git', 'merge-base', '--is-ancestor', source, live_head], cwd=LIVE).returncode == 1
changelog = (ROOT / 'paper/materials/experience-changelog-silent.md').read_bytes()
old_size = append['before_size']
assert hashlib.sha256(changelog[:old_size]).hexdigest() == append['before_sha256']
section = (O / 'changelog-section.md').read_bytes()
assert changelog[old_size:old_size + append['bytes_added']] == b'\n' + section
assert changelog.count(append['heading'].encode()) == 1
report = O / 'report.md'
body = report.read_text()
body = body.replace('## 经验库更新回报\n-', '## 经验库更新回报\n\n-', 1)
body = body.replace('- 机制推理：\n  -', '- 机制推理：\n\n  -', 1)
report.write_text(body)
scan_paths = [O / 'changelog-section.md', report]
scan_paths += sorted(O.glob('proposal-*.md')) + sorted(O.glob('proposal-*.json'))
scan_text = '\n'.join(p.read_text() for p in scan_paths)
scan = subprocess.run(['nice', '-n', '19', 'gitleaks', 'stdin', '--redact', '--no-banner'], input=scan_text, text=True, capture_output=True, cwd=W)
(O / 'gitleaks-final-records.log').write_text(scan.stdout + scan.stderr)
assert scan.returncode == 0
checks = [
    ['python3', str(ROOT / 'learner/ledger.py'), 'check'],
    ['python3', str(ROOT / 'learner/code_proposals.py'), 'check-experience', '--character', 'silent', '--before', str(O / 'experience-before.json'), '--after', str(W / 'knowledge/characters/silent/experience.json')],
]
for i, command in enumerate(checks):
    check = subprocess.run(command, cwd=W, text=True, capture_output=True)
    (O / ('final-cli-' + str(i) + '.log')).write_text(check.stdout + check.stderr)
    assert check.returncode == 0
audit = dict(source=source, source_clean=True, source_only_experience=True, live=live_head, merged=False, live_clean=True, changelog_append_only=True, active=len(active), chars=51873, gitleaks=scan.returncode, ledger=0, code_proposals=0)
(O / 'final-audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(audit, ensure_ascii=False))
