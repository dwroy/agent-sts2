import json,subprocess
from pathlib import Path
O=Path(__file__).parent;CLI=['python3','/home/dw/Projects/agent-sts2/learner/ledger.py'];RUN='ZVYUL2YP3518';C=json.load(open(O/'changes.json'));commit=(O/'commit.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d'],text=True).strip();title=f'{stamp} 静默猎手 第五十五次增量：1 局 A10（version 2026-10-07.1，分支 exp-silent，{commit[:8]}）';(O/'changelog-title.txt').write_text(title+'\n')
mapping={'silent-0005':['silent-footwork-block'],'silent-0006':['silent-strength-weak-observation'],'silent-0007':['silent-deadly-poison-application'],'silent-0009':['silent-kin-poison-sl-observation'],'silent-0011':['silent-noxious-fumes-growth'],'silent-0019':['silent-route-hp-observation'],'silent-0020':['silent-rest-buffer-observation'],'silent-0021':['silent-deck-burst-observation'],'silent-0027':['silent-accelerant-triggers','silent-test-subject-phase-reset'],'silent-0028':['silent-test-subject-phase-reset'],'silent-0038':['silent-sai-start-block'],'silent-0046':['silent-piercing-wail-temporary-strength'],'silent-0054':['silent-accuracy-shiv-scaling'],'silent-0060':['silent-forgotten-soul-exhaust-damage'],'silent-0068':['silent-queen-poison-main-target'],'silent-0072':['silent-tuning-fork-skill-block'],'silent-0080':['silent-anticipate-temporary-dexterity'],'silent-0142':['silent-eternal-feather-rest-arrival-heal'],'silent-0149':['silent-fan-of-knives-capacity'],'silent-0158':['silent-smooth-stone-opening-dexterity'],'silent-0184':['silent-pumpkin-candle-charge-energy'],'silent-0185':['silent-pumpkin-candle-charge-energy']}
assert {e for es in mapping.values() for e in es}==set(C['updated'])
lessons={e['id']:e for e in json.load(open('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']};rows=[];before={}
for ident,entries in mapping.items():
 old=json.loads(subprocess.check_output(CLI+['show',ident],text=True));assert old['character']=='silent' and old['kind']!='bug-infra';before[ident]=old
 row=dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=entries,commits=[commit],changelog=[title]),note='静默经验2026-10-07.1：ZVYUL2YP3518 A10及本角色历史，技能激怒/能力、阶段清毒/能力保留、敏捷与被动挡、施毒/结算、路线/回复/SL观察分账；无新用药规则、无源码改动，仅proposed。首证/先验/claim/旧version/repeat保持，交运维核实际合入后CLI登记shipped。')
 if not any(e['run']==RUN and e.get('role','support')=='support' for e in old['evidence']):
  examples=[lessons[x]['lesson'].split(RUN)[-1] for x in entries];row['evidence']=[dict(run=RUN,role='support',note=(RUN+' '+ '；'.join(examples))[:790])]
 rows.append(row)
(O/'ledger-before.json').write_text(json.dumps(before,ensure_ascii=False,indent=2)+'\n');payload=''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in rows);(O/'ledger-updates.jsonl').write_text(payload)
subprocess.run(['date','+%Y-%m-%d %H:%M:%S %z'],check=True)
r=subprocess.run(CLI+['update'],input=payload,text=True,capture_output=True);(O/'ledger-update.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
r=subprocess.run(CLI+['check'],capture_output=True,text=True);(O/'ledger-check.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stdout+r.stderr
for id,old in before.items():
 now=json.loads(subprocess.check_output(CLI+['show',id],text=True))
 for f in ['first_run','prior','prior_runs','prior_note','claim','version']:assert now.get(f)==old.get(f),(id,f)
 assert now['evidence'][:len(old['evidence'])]==old['evidence']
 assert [x for x in now['evidence'] if x.get('role')=='repeat']==[x for x in old['evidence'] if x.get('role')=='repeat']
result=dict(added=[],proposed=list(mapping),retired=[],check=0);(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
