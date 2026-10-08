import json, subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
W = O.parents[2]
T = json.load(open(O/'test-results.json'))
assert T['tsc'] == T['vitest'] == 0 and T['snapshot_unchanged']
path = 'knowledge/characters/silent/experience.json'
assert subprocess.check_output(['git','status','--porcelain'],cwd=W,text=True).strip() == 'M '+path
subprocess.run(['git','diff','--check'],cwd=W,check=True)
subprocess.run(['python3','/home/dw/Projects/agent-sts2/learner/code_proposals.py','check-experience','--character','silent','--before',str(O/'experience-before.json'),'--after',str(W/path)],cwd=W,check=True)
subprocess.run(['date'],cwd=W,check=True)
subprocess.run(['git','add','--',path],cwd=W,check=True)
assert subprocess.check_output(['git','diff','--cached','--name-only'],cwd=W,text=True).strip() == path
patch = subprocess.check_output(['git','diff','--cached'],cwd=W)
scan = subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=patch,capture_output=True,cwd=W)
(O/'gitleaks-commit.log').write_bytes(scan.stdout+scan.stderr)
assert scan.returncode == 0
p = subprocess.run(['git','commit','-m','Update Silent experience to 2026-10-09.8 (+1/~11/-0)','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'],cwd=W,text=True,capture_output=True)
(O/'source-commit.stdout').write_text(p.stdout+p.stderr)
assert p.returncode == 0, p.stderr
commit = subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip()
(O/'source-commit.txt').write_text(commit+'\n')
heading = f'## 2026-10-09 静默猎手 第一百一十九次增量：1 局 A10（version 2026-10-09.8，分支 exp-silent，{commit[:8]}）'
(O/'changelog-heading.txt').write_text(heading+'\n')
assert not subprocess.check_output(['git','status','--porcelain'],cwd=W,text=True).strip()
print(commit)
