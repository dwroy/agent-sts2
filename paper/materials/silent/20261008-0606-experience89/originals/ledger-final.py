import json
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
commit=sys.argv[1]
branch=subprocess.check_output(['git','branch','--show-current'],text=True).strip()
title=f'## {stamp[:10]} 静默猎手 第八十九次增量：2 局 A10（version 2026-10-08.6，分支 {branch}，{commit[:8]}）'
mapping=json.load(open(O/'ledger-map.json'))
ids=json.load(open(O/'ledger-ids.json'))
rows=[]
for lid in ids:
 experience=[eid for eid,lids in mapping.items() if lid in lids]
 if lid=='silent-0125':experience=['silent-deck-burst-observation']
 rows.append(dict(id=lid,by='learner:experience-update',status='proposed',
                  where=dict(experience=experience,commits=[commit],changelog=[title]),
                  note='第89批经验源提交已完成；只登记本批经验与来源，保留原claim/首证/prior/repeat及全部旧上线历史，学习者不标accepted/shipped；三代码提案交独立strategy-proposal。'))
payload=''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows)
(O/'ledger-final-input.jsonl').write_text(payload)
q=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=payload,text=True,capture_output=True)
(O/'ledger-final.log').write_text(q.stdout+q.stderr);q.check_returncode()
q=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True)
(O/'ledger-check.log').write_text(q.stdout+q.stderr);(O/'ledger-check.rc').write_text(str(q.returncode)+'\n');q.check_returncode()
(O/'ledger-result.json').write_text(json.dumps(dict(added=[],proposed=ids,retired=[],check=q.returncode),ensure_ascii=False,indent=2)+'\n')
print(q.stdout.strip())
