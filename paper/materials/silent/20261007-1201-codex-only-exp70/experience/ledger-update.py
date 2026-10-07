import json,subprocess
from pathlib import Path
O=Path(__file__).parent;CLI=Path('/home/dw/Projects/agent-sts2/learner/ledger.py')
C=json.load(open(O/'changes.json'));commit=(O/'commit.txt').read_text().strip()
title=f'2026-10-07 静默猎手 第七十次增量：2 局 A10（version {C["version"]}，分支 exp-silent，{commit[:8]}）'
p=subprocess.run(['python3',str(CLI),'fold'],capture_output=True,text=True,check=True);items={x['id']:x for x in json.loads(p.stdout)}
mapping={
'silent-0005':['silent-footwork-block'],
'silent-0006':['silent-strength-weak-observation'],
'silent-0007':['silent-poisoned-stab-components'],
'silent-0011':['silent-noxious-fumes-growth'],
'silent-0016':['silent-gorget-plating'],
'silent-0019':['silent-route-hp-observation'],
'silent-0020':['silent-rest-buffer-observation'],
'silent-0021':['silent-deck-burst-observation'],
'silent-0023':['silent-afterimage-per-card-block'],
'silent-0027':['silent-accelerant-triggers'],
'silent-0028':['silent-test-subject-phase-reset'],
'silent-0030':['silent-poisoned-stab-components'],
'silent-0053':['silent-malaise-x-debuff'],
'silent-0057':['silent-deck-burst-observation'],
'silent-0068':['silent-queen-poison-main-target'],
'silent-0079':['silent-queen-poison-main-target'],
'silent-0128':['silent-slumbering-beetle-wake-growth'],
'silent-0158':['silent-smooth-stone-opening-dexterity'],
'silent-0176':['silent-beckon-held-end-turn-loss']}
assert set(C['updated'])=={eid for v in mapping.values() for eid in v}
diff={x['id']:x for x in C['diff']};updates=[]
for id,eids in mapping.items():
 item=items[id];assert item['character']=='silent'
 payload=dict(id=id,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]))
 evidence=[]
 for run in sorted({r for eid in eids for r in diff[eid]['runs']}):
  if any(e['run']==run for e in item['evidence']):continue
  evidence.append(dict(run=run,role='support',note='本轮按本角色复盘及原始逐帧日志补证；对应公式/观察、支持与反例进阶、典型战斗与控制范围见静默第70节及所链接经验。只补非药水部分，不将同局多次SL当多个支持局。'))
 if evidence:payload['evidence']=evidence
 payload['note']='关联本批已测经验/源提交/第70节；保留原claim、first_run、asc、prior、全部证据/repeat及旧版本历史；实际live合入由运维据完成事件核实后登记shipped。'
 updates.append(payload)
(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates))
r=subprocess.run(['python3',str(CLI),'update'],input=''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates),text=True,capture_output=True)
(O/'ledger-update.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
c=subprocess.run(['python3',str(CLI),'check'],text=True,capture_output=True);(O/'ledger-check.log').write_text(c.stdout+c.stderr);assert c.returncode==0,c.stderr
result=dict(added=[],proposed=list(mapping),retired=[],check=c.returncode)
(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(O/'changelog-title.txt').write_text(title+'\n')
print(json.dumps(result,ensure_ascii=False))
