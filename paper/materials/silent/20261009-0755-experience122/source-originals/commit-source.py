import hashlib
import json
import re
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
W = O.parents[2]
subprocess.run(['date', '+%Y-%m-%d %H:%M:%S %z'], check=True)
assert (O / 'test-source.rc').read_text().strip() == '0'
assert (O / 'history.rc').read_text().strip() == '0'
log = (O / 'test-source.log').read_text()
files = sum(int(n) for n in re.findall(r'Test Files\s+(\d+) passed', log))
cases = sum(int(n) for n in re.findall(r'Tests\s+(\d+) passed', log))
assert files and cases
sha = hashlib.sha256((W / 'agent/tests/experience.test.ts').read_bytes()).hexdigest()
assert sha == (O / 'test-source-before.sha256').read_text().strip()
(O / 'test-source-after.sha256').write_text(sha + '\n')
(O / 'test-results.json').write_text(json.dumps(dict(tsc=0, vitest=0, files=files, cases=cases, rerun=False), ensure_ascii=False, indent=2) + '\n')
status = subprocess.check_output(['git', 'status', '--short'], cwd=W, text=True)
assert status.strip() == 'M knowledge/characters/silent/experience.json', status
subprocess.run(['git', 'diff', '--check'], cwd=W, check=True)
patch = subprocess.check_output(['git', 'diff', '--', 'knowledge/characters/silent/experience.json'], cwd=W)
scan = subprocess.run(['nice', '-n', '19', 'gitleaks', 'stdin', '--redact', '--no-banner'], input=patch, cwd=W, capture_output=True)
(O / 'gitleaks-commit.log').write_bytes(scan.stdout + scan.stderr)
assert scan.returncode == 0
subprocess.run(['git', 'add', 'knowledge/characters/silent/experience.json'], cwd=W, check=True)
with (O / 'source-commit.log').open('w') as h:
    subprocess.run(['git', 'commit', '-m', 'Update Silent experience 2026-10-09.11: add 0, update 9, retire 0', '-m', 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'], cwd=W, stdout=h, stderr=subprocess.STDOUT, check=True)
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=W, text=True).strip()
(O / 'source-commit.txt').write_text(commit + '\n')
heading = f'## 2026-10-09 静默猎手 第一百二十二次增量：1 局 A10（version 2026-10-09.11，分支 exp-silent，{commit[:8]}）'
(O / 'changelog-heading.txt').write_text(heading + '\n')
print(commit, json.dumps(dict(files=files, cases=cases), ensure_ascii=False))
