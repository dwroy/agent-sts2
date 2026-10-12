import json,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();W=O.parents[2];ROOT=Path('/home/dw/Projects/agent-sts2')
assert int((O/'test-exp.exit').read_text())==0
assert subprocess.check_output(['git','diff','--cached','--name-only'],cwd=W,text=True).strip()==''
paths=subprocess.check_output(['git','diff','--name-only'],cwd=W,text=True).splitlines();assert paths==['knowledge/characters/silent/experience.json'],paths
before=subprocess.check_output(['git','show','HEAD:knowledge/characters/silent/experience.json'],cwd=W);assert before==(O/'experience-before.json').read_bytes()
json.load(open(W/paths[0]));subprocess.run(['git','diff','--check'],cwd=W,check=True)
args=['python3',str(ROOT/'learner/code_proposals.py'),'check-experience','--character','silent','--before',str(O/'experience-before.json'),'--after',str(W/paths[0])]
p=subprocess.run(args,capture_output=True,text=True);(O/'check-experience-final.log').write_text(p.stdout+p.stderr);assert p.returncode==0
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True);(O/'ledger-precommit-check.log').write_text(p.stdout+p.stderr);assert p.returncode==0
subprocess.run(['git','add',paths[0]],cwd=W,check=True)
patch=subprocess.check_output(['git','diff','--cached'],cwd=W)
p=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=patch,capture_output=True,cwd=W);(O/'gitleaks-staged.log').write_bytes(p.stdout+p.stderr);(O/'gitleaks-staged.exit').write_text(str(p.returncode)+'\n');assert p.returncode==0
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();(O/'source-time.txt').write_text(stamp+'\n')
p=subprocess.run(['git','commit','-m','Update Silent experience to 2026-10-09.18 (add 0, update 17, retire 0)','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'],cwd=W,capture_output=True,text=True);(O/'source-commit.log').write_text(p.stdout+p.stderr);assert p.returncode==0,p.stderr
source=subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip();(O/'source-commit.txt').write_text(source+'\n');title=f'## 2026-10-09 静默猎手 第一百二十九次增量：1 局 A10（version 2026-10-09.18，分支 exp-silent，{source[:8]}）';(O/'changelog-title.txt').write_text(title+'\n')
assert subprocess.check_output(['git','status','--short'],cwd=W,text=True).strip()==''
print(source)
