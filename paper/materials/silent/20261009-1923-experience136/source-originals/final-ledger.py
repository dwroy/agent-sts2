import json,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');M=json.load(open(O/'ledger-map.json'));source=(O/'source-commit.txt').read_text().strip();title='## 2026-10-09 静默猎手 第一百三十六次增量：1 局 A10（version 2026-10-09.25，分支 exp-silent，'+source[:8]+'）';commands=[];ids=list(dict.fromkeys(i for values in M.values() for i in values))
for ident in ids:
 data=dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=[k for k,v in M.items() if ident in v],commits=[source],changelog=[title]),note='第136次经验源自测提交已完成；保留旧claim/prior/首证/证据/版本与全部历史。实际数据shipped交运维核完成事件，三独立源码提案pending，不登记implemented。')
 subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
 p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/ledger.py'),'update'],input=json.dumps(data,ensure_ascii=False),text=True,capture_output=True);commands.append(dict(data=data,stdout=p.stdout,stderr=p.stderr,exit=p.returncode));(O/'final-ledger-cli.json').write_text(json.dumps(commands,ensure_ascii=False,indent=2)+'\n');assert p.returncode==0,p.stderr
p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True);(O/'ledger-check-final.log').write_text(p.stdout+p.stderr);assert p.returncode==0
results=dict(added=json.load(open(O/'ledger-added.json')),proposed=ids,retired=[],check=p.returncode);(O/'ledger-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print(json.dumps(results,ensure_ascii=False))
