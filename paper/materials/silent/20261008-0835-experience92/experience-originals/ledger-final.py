import json, subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
source=(O/'source-commit.txt').read_text().strip()
C=json.load(open(O/'changes.json'))
mapping=json.load(open(O/'ledger-map.json'))
subprocess.run(['date','+%Y-%m-%d %H:%M:%S %z'],check=True)
title=f'## 2026-10-08 静默猎手 第九十二次增量：2 局 A10（version {C["version"]}，分支 exp-silent，{source[:8]}）'
updates={}
for c in C['entries']:
    for lid in mapping[c['id']]:
        row=updates.setdefault(lid,dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[],commits=[source],changelog=[title]),note='第92批源提交已完成；仅追加本批经验去处，原first_run/prior/claim/support/repeat与旧上线版本历史保持。三个代码提案独立strategy-proposal，学习者不标accepted/implemented/shipped。'))
        row['where']['experience'].append(c['id'])
payload=json.dumps(list(updates.values()),ensure_ascii=False)
(O/'ledger-final-input.json').write_text(payload+'\n')
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=payload,text=True,capture_output=True)
(O/'ledger-final.log').write_text(p.stdout+p.stderr)
p.check_returncode()
check=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True)
(O/'ledger-check-final.log').write_text(check.stdout+check.stderr)
check.check_returncode()
result=dict(added=json.load(open(O/'ledger-added.json')),proposed=sorted(updates),retired=[],check=check.returncode)
(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(result)
