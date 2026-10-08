import json,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');source=(O/'source-commit.txt').read_text().strip();mapping=json.load(open(O/'ledger-map.json'))
title=f'## 2026-10-08 静默猎手 第九十一次增量：1 局 A10（version 2026-10-08.8，分支 exp-silent，{source[:8]}）'
rows={}
for eid,lids in mapping.items():
    for lid in lids:
        row=rows.setdefault(lid,dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[],commits=[source],changelog=[title]),note='静默第91批经验数据已提交；代码提案独立strategy-proposal。保留原首证/prior/claim/repeat与历史版本，未标accepted/shipped。'))
        row['where']['experience'].append(eid)
payload=''.join(json.dumps(row,ensure_ascii=False)+'\n' for row in rows.values());(O/'ledger-final-input.jsonl').write_text(payload)
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=payload,text=True,capture_output=True);(O/'ledger-final.log').write_text(p.stdout+p.stderr);p.check_returncode()
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True);(O/'ledger-check-final.log').write_text(p.stdout+p.stderr);p.check_returncode()
(O/'ledger-result.json').write_text(json.dumps(dict(added=[],proposed=sorted(rows),retired=[],check=p.returncode),ensure_ascii=False,indent=2)+'\n');print('已关联提交并改proposed',len(rows),'账本校验',p.returncode)
