import json,subprocess
from pathlib import Path
O=Path(__file__).parent;CLI=Path('/home/dw/Projects/agent-sts2/learner/ledger.py');C=json.load(open(O/'changes.json'));commit=(O/'commit.txt').read_text().strip()
title=f'2026-10-07 静默猎手 第七十二次增量：1 局 A10（version {C["version"]}，分支 exp-silent，{commit[:8]}）'
p=subprocess.run(['python3',str(CLI),'fold'],capture_output=True,text=True,check=True);items={x['id']:x for x in json.loads(p.stdout)}
mapping={'silent-0005':['silent-strength-weak-observation'],'silent-0007':['silent-lagavulin-siphon-poison-sl'],'silent-0019':['silent-route-hp-observation'],'silent-0020':['silent-rest-buffer-observation'],'silent-0021':['silent-deck-burst-observation'],'silent-0027':['silent-accelerant-triggers'],'silent-0030':['silent-lagavulin-siphon-poison-sl'],'silent-0046':['silent-piercing-wail-temporary-strength'],'silent-0109':['silent-bread-energy-timing'],'silent-0220':['silent-snakebite-retained-poison']}
assert set(C['updated'])=={eid for v in mapping.values() for eid in v}
updates=[]
for id,eids in mapping.items():
 item=items[id];assert item['character']=='silent' and any(e['run']=='W7BHM8U02RKG' and e.get('role','support')=='support' for e in item['evidence'])
 payload=dict(id=id,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]),note='关联第72批已测静默经验、源提交与变更节；本局support在复盘时已登记，不重复添加。保留原claim、first_run、asc、prior、support/repeat及既往上线历史；仅proposed，实际合入由运维据完成事件核实后登记shipped。')
 updates.append(payload)
(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates))
r=subprocess.run(['python3',str(CLI),'update'],input=''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates),text=True,capture_output=True);(O/'ledger-update.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
c=subprocess.run(['python3',str(CLI),'check'],text=True,capture_output=True);(O/'ledger-check.log').write_text(c.stdout+c.stderr);assert c.returncode==0,c.stderr
result=dict(added=[],proposed=list(mapping),retired=[],check=c.returncode);(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(O/'changelog-title.txt').write_text(title+'\n')
print(json.dumps(result,ensure_ascii=False))
