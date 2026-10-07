import json,subprocess
from pathlib import Path
O=Path(__file__).parent;CLI=Path('/home/dw/Projects/agent-sts2/learner/ledger.py');C=json.load(open(O/'changes.json'));commit=(O/'commit.txt').read_text().strip()
title=f'2026-10-07 静默猎手 第七十一次增量：1 局 A10（version {C["version"]}，分支 exp-silent，{commit[:8]}）'
p=subprocess.run(['python3',str(CLI),'fold'],capture_output=True,text=True,check=True);items={x['id']:x for x in json.loads(p.stdout)}
mapping={'silent-0006':['silent-strength-weak-observation'],'silent-0007':['silent-poisoned-stab-components'],'silent-0018':['silent-insatiable-dual-clock'],'silent-0019':['silent-route-hp-observation'],'silent-0020':['silent-rest-buffer-observation'],'silent-0021':['silent-deck-burst-observation'],'silent-0023':['silent-afterimage-per-card-block'],'silent-0046':['silent-piercing-wail-temporary-strength'],'silent-0079':['silent-berserker-growth-sl-observation'],'silent-0120':['silent-lords-parasol-shop-acquisition']}
assert set(C['updated'])=={eid for v in mapping.values() for eid in v}
updates=[]
for id,eids in mapping.items():
 item=items[id];assert item['character']=='silent'
 payload=dict(id=id,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]))
 if not any(e['run']=='MCT1GPTL8D35' for e in item['evidence']):
  notes={'silent-0018':'A10 F33两次63/77进场，初28抽序同、到手回合仅前10同；首T7敌56、18血4挡对25需21判死，胜T7两次逃离延长沙坑却实损21，T9以19毒截扣9血取消22攻、余9胜。没有单能力整战对照。','silent-0030':'A10 F42首试T4普通毒刺使敌184→178直6、毒11→14另3，不即时結算；末T6混合来源8毒仅80→72未斩，玩家7血8挡对32差17死。','silent-0057':'A10 F42四試均建跟踪，仅第二试建谋划专家并同盘多付8血、T4伤害仍52；四次毒雾均未建立，末六轮扣209仍缺72。F33勝试未建跟踪、九轮扣341余9，未施放能力不预支收益。'}
  payload['evidence']=[dict(run='MCT1GPTL8D35',role='support',note=notes[id])]
 payload['note']='关联第71批已测经验/源提交/变更节；保留原claim、first_run、asc、prior、support/repeat和旧版本历史；仅proposed，实际live合入由运维据完成事件核验后登记shipped。'
 updates.append(payload)
(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates))
r=subprocess.run(['python3',str(CLI),'update'],input=''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates),text=True,capture_output=True);(O/'ledger-update.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
c=subprocess.run(['python3',str(CLI),'check'],text=True,capture_output=True);(O/'ledger-check.log').write_text(c.stdout+c.stderr);assert c.returncode==0,c.stderr
result=dict(added=[],proposed=list(mapping),retired=[],check=c.returncode);(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(O/'changelog-title.txt').write_text(title+'\n')
print(json.dumps(result,ensure_ascii=False))
