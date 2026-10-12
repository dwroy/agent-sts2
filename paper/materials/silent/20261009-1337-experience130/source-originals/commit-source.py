import json,re,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();EXP=O.parents[2]
assert int((O/'test-exp.exit').read_text())==0
log=(O/'test-exp.log').read_text();files=[int(x) for x in re.findall(r'Test Files\s+(\d+) passed',log)];cases=[int(x) for x in re.findall(r'\bTests\s+(\d+) passed',log)];assert len(files)==len(cases)==2
T=dict(tsc=0,vitest=0,files=sum(files),cases=sum(cases),rerun=False);(O/'test-results.json').write_text(json.dumps(T,ensure_ascii=False,indent=2)+'\n')
def run(args):
    p=subprocess.run(args,cwd=EXP,text=True,capture_output=True)
    with (O/'source-commit.log').open('a') as h:h.write(' '.join(args)+'\n'+p.stdout+p.stderr)
    assert p.returncode==0,p.stderr
    return p.stdout.strip()
assert not run(['git','diff','--cached','--name-only'])
run(['git','diff','--check']);run(['git','add','knowledge/characters/silent/experience.json'])
assert run(['git','diff','--cached','--name-only'])=='knowledge/characters/silent/experience.json'
patch=subprocess.check_output(['git','diff','--cached'],cwd=EXP)
scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=patch,capture_output=True,cwd=EXP);(O/'gitleaks-staged.log').write_bytes(scan.stdout+scan.stderr);assert scan.returncode==0
check=subprocess.run(['python3','/home/dw/Projects/agent-sts2/learner/code_proposals.py','check-experience','--character','silent','--before',str(O/'experience-before.json'),'--after',str(EXP/'knowledge/characters/silent/experience.json')],capture_output=True,text=True);(O/'check-experience-precommit.log').write_text(check.stdout+check.stderr);assert check.returncode==0
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();(O/'source-time.txt').write_text(stamp+'\n')
run(['git','commit','-m','Update Silent experience 2026-10-09.19: add 0, update 22, retire 0','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'])
source=run(['git','rev-parse','HEAD']);(O/'source-commit.txt').write_text(source+'\n')
title=f'## 2026-10-09 静默猎手 第一百三十次增量：1 局 A10（version 2026-10-09.19，分支 exp-silent，{source[:8]}）';(O/'changelog-title.txt').write_text(title+'\n')
print(source,T)
