import fcntl
import hashlib
import json
import re
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
W = ROOT / '.worktrees/exp'
source = (O / 'source-commit.txt').read_text().strip()
tests = json.load((O / 'test-results.json').open())
ledger = json.load((O / 'ledger-results.json').open())
merge = json.load((O / 'live-merge.json').open())
summary = json.load((O / 'update-summary.json').open())
mechanisms = json.load((O / 'mechanisms.json').open())
proposals = json.load((O / 'proposal-ids.json').open())
assert tests['tsc'] == tests['vitest'] == 0
assert re.fullmatch('[0-9a-f]{40}', source)
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=W, text=True).strip() == source
assert subprocess.check_output(['git', 'show', source + ':knowledge/characters/silent/experience.json'], cwd=W) == (W / 'knowledge/characters/silent/experience.json').read_bytes()
assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=W, text=True).strip()

heading = (O / 'changelog-heading.txt').read_text().strip()
section = (O / 'changelog-section.md').read_bytes()
target = ROOT / 'paper/materials/experience-changelog-silent.md'
receipt = O / 'changelog-append.json'
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %z'], text=True).strip()
if not receipt.exists():
    with target.open('a+b') as h:
        fcntl.flock(h, fcntl.LOCK_EX)
        h.seek(0)
        old = h.read()
        assert heading.encode() not in old, '本节标题已存在，停止避免重复追加'
        addition = (b'\n' if old.endswith(b'\n') else b'\n\n') + section
        h.seek(0, 2)
        h.write(addition)
        h.flush()
        h.seek(0)
        now = h.read()
        assert now[:len(old)] == old and now[len(old):] == addition
        value = dict(time=stamp, target=str(target), heading=heading, before_bytes=len(old), after_bytes=len(now), before_sha256=hashlib.sha256(old).hexdigest(), after_sha256=hashlib.sha256(now).hexdigest(), section_sha256=hashlib.sha256(section).hexdigest(), preserved_prefix=True)
        receipt.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
else:
    value = json.load(receipt.open())
    current = target.read_bytes()
    assert hashlib.sha256(current[:value['before_bytes']]).hexdigest() == value['before_sha256']
    assert heading.encode() in current

result = dict(task='experience-update', version=summary['after']['version'], commit=source, merged=merge.get('merged'), added=summary['added'], updated=summary['updated'], retired=summary['retired'], active=summary['after']['active'], mechanisms=[x['name'] for x in mechanisms], tests=dict(tsc=tests['tsc'], vitest=tests['vitest'], cases=tests['cases']), ledger=dict(added=ledger['added'], proposed=ledger['proposed'], retired=ledger['retired'], check=0), code_proposals=proposals, implementation_domains=['combat', 'potion', 'sl', 'terminal', 'structure'], report=str(O / 'report.md'))
(O / 'report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(dict(changelog=value, result=result), ensure_ascii=False))
