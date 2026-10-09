import hashlib
import json
import re
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
W=O.parents[2]
assert int((O/'test-source-retry.rc').read_text())==0
text=(O/'test-source-retry.log').read_text()
files=[int(n) for n in re.findall(r'Test Files\s+(\d+) passed',text)]
cases=[int(n) for n in re.findall(r'Tests\s+(\d+) passed',text)]
assert len(files)==len(cases)==2,(files,cases)
T=dict(tsc=0,vitest=0,files=sum(files),cases=sum(cases),rerun=True,first_session_exit=130,first_vitest_result=None)
(O/'test-results.json').write_text(json.dumps(T,ensure_ascii=False,indent=2)+'\n')
assert subprocess.check_output(['git','diff','--name-only'],cwd=W,text=True).strip()=='knowledge/characters/silent/experience.json'
assert not subprocess.check_output(['git','diff','--cached','--name-only'],cwd=W,text=True).strip()
assert hashlib.sha256((W/'agent/tests/experience.test.ts').read_bytes()).hexdigest()==(O/'experience-test.sha256').read_text().strip()
subprocess.run(['python3','/home/dw/Projects/agent-sts2/learner/code_proposals.py','check-experience','--character','silent','--before',str(O/'experience-before.json'),'--after',str(W/'knowledge/characters/silent/experience.json')],cwd=W,check=True)
subprocess.run(['git','diff','--check'],cwd=W,check=True)
subprocess.run(['git','add','knowledge/characters/silent/experience.json'],cwd=W,check=True)
patch=subprocess.check_output(['git','diff','--cached'],cwd=W,text=True)
scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],cwd=W,input=patch,text=True,capture_output=True)
(O/'gitleaks-staged.log').write_text(scan.stdout+scan.stderr)
assert scan.returncode==0
subprocess.run(['date','+%Y-%m-%d %H:%M:%S %z'],check=True)
r=subprocess.run(['git','commit','-m','Update Silent experience 2026-10-09.12: add 1, update 9, retire 0','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'],cwd=W,text=True,capture_output=True)
(O/'source-commit.stdout').write_text(r.stdout+r.stderr)
assert r.returncode==0,r.stderr
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip()
(O/'source-commit.txt').write_text(commit+'\n')
heading=f'## 2026-10-09 静默猎手 第一百二十三次增量：1 局 A10（version 2026-10-09.12，分支 exp-silent，{commit[:8]}）'
(O/'changelog-heading.txt').write_text(heading+'\n')
print(json.dumps(dict(commit=commit,tests=T),ensure_ascii=False))
