import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
M=json.load(open(O/'ledger-map.json'))
source=(O/'source-commit.txt').read_text().strip()
title=f'## 2026-10-09 静默猎手 第一百四十次增量：1 局 A10（version 2026-10-09.29，分支 exp-silent，{source[:8]}）'
calls=[]
ids=list(dict.fromkeys(i for values in M.values() for i in values))
for ident in ids:
    subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
    data=dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=[e for e in M if ident in M[e]],commits=[source],changelog=[title]),note='第140次经验更新源分支已提交并通过固定沙箱自测；来源/首证/prior/既有反例和历史保留，实际live上线由运维核完成事件登记，不冒称源码实现。')
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/ledger.py'),'update'],input=json.dumps(data,ensure_ascii=False),text=True,capture_output=True)
    calls.append(dict(data=data,stdout=p.stdout,stderr=p.stderr,exit=p.returncode))
    (O/'final-ledger-cli.json').write_text(json.dumps(calls,ensure_ascii=False,indent=2)+'\n')
    assert p.returncode==0,p.stderr
p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True)
(O/'ledger-check-final.log').write_text(p.stdout+p.stderr)
assert p.returncode==0
(O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=ids,retired=[],check=p.returncode),ensure_ascii=False,indent=2)+'\n')
print('账本proposed',len(ids),'项，校验0')
