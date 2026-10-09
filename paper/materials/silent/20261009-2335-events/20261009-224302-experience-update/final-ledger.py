import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
source=(O/'source-commit.txt').read_text().strip()
title=(O/'changelog-title.txt').read_text().strip()
M=json.load(open(O/'ledger-map.json'))
results=[]
ids=list(dict.fromkeys(i for rows in M.values() for i in rows))
for ident in ids:
    subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
    data=dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=[e for e,rows in M.items() if ident in rows],commits=[source],changelog=[title]),note='第141次经验已提交；来源0PH64C4AWAX9及历史本角色核验。旧claim/first_run/prior/证据历史保持；实际合入后由运维核版本登记shipped，独立源码提案仍pending。')
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/ledger.py'),'update'],input=json.dumps(data,ensure_ascii=False),text=True,capture_output=True)
    results.append(dict(input=data,exit=p.returncode,stdout=p.stdout,stderr=p.stderr))
    (O/'final-ledger-cli.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    assert p.returncode==0,p.stderr
p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True)
(O/'ledger-check-final.log').write_text(p.stdout+p.stderr)
assert p.returncode==0,p.stderr
(O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=ids,retired=[],check=p.returncode),ensure_ascii=False,indent=2)+'\n')
print('账本来源关联及proposed完成',len(ids),'项，check',p.returncode)
