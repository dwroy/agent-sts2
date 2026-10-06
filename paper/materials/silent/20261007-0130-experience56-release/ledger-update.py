import json,subprocess
from pathlib import Path
O=Path(__file__).parent;CLI=['python3','/home/dw/Projects/agent-sts2/learner/ledger.py'];RUN='VPW8YH7A4QFM';C=json.load(open(O/'changes.json'));commit=(O/'commit.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d'],text=True).strip();title=f'{stamp} 静默猎手 第五十六次增量：1 局 A10（version 2026-10-07.2，分支 exp-silent，{commit[:8]}）';(O/'changelog-title.txt').write_text(title+'\n')
mapping={'silent-0006':['silent-strength-weak-observation'],'silent-0017':['silent-giant-explosion-window'],'silent-0019':['silent-route-hp-observation'],'silent-0020':['silent-rest-buffer-observation'],'silent-0021':['silent-deck-burst-observation'],'silent-0011':['silent-noxious-fumes-growth'],'silent-0010':['silent-bubble-bubble-condition'],'silent-0027':['silent-accelerant-triggers'],'silent-0023':['silent-afterimage-per-card-block'],'silent-0046':['silent-piercing-wail-temporary-strength'],'silent-0125':['silent-aeonglass-artifact-growth-sl'],'silent-0080':['silent-anticipate-temporary-dexterity'],'silent-0110':['silent-grand-finale-empty-draw'],'silent-0115':['silent-burst-next-skills-replay'],'silent-0198':['silent-royal-poison-blood-vial-opening-net']}
assert {e for es in mapping.values() for e in es}==set(C['updated']+C['added'])
lessons={e['id']:e for e in json.load(open('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']};rows=[];before={}
for ident,entries in mapping.items():
 old=json.loads(subprocess.check_output(CLI+['show',ident],text=True));assert old['character']=='silent' and old['kind']!='bug-infra';before[ident]=old
 row=dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=entries,commits=[commit],changelog=[title]),note='静默经验2026-10-07.2：VPW8YH7A4QFM A10及01:01勘误、本角色历史。'+('仅压缩旧例，不增新局证据。' if entries[0] in C['compressed_only'] else '机制/实际触发/本体输出/开场遗物/净损与操作损分账；王室猛毒仅组合净值观察，不拆独立数值。')+'无新用药规则/源码变更，仅proposed；首证/先验/claim/旧version/repeat保持，交运维核实际合入后登记shipped。')
 if entries[0] in C['support'] and not any(e['run']==RUN and e.get('role','support')=='support' for e in old['evidence']):
  text=lessons[entries[0]]['lesson'].split(RUN)[-1];row['evidence']=[dict(run=RUN,role='support',note=(RUN+' '+text)[:790])]
 rows.append(row)
(O/'ledger-before.json').write_text(json.dumps(before,ensure_ascii=False,indent=2)+'\n');payload=''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in rows);(O/'ledger-updates.jsonl').write_text(payload)
subprocess.run(['date','+%Y-%m-%d %H:%M:%S %z'],check=True)
r=subprocess.run(CLI+['update'],input=payload,text=True,capture_output=True);(O/'ledger-update.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
r=subprocess.run(CLI+['check'],capture_output=True,text=True);(O/'ledger-check.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stdout+r.stderr
for ident,old in before.items():
 now=json.loads(subprocess.check_output(CLI+['show',ident],text=True))
 for field in ['first_run','prior','prior_runs','prior_note','claim','version']:assert now.get(field)==old.get(field),(ident,field)
 assert now['evidence'][:len(old['evidence'])]==old['evidence']
 assert [x for x in now['evidence'] if x.get('role')=='repeat']==[x for x in old['evidence'] if x.get('role')=='repeat']
result=dict(added=[],proposed=list(mapping),retired=[],check=0);(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
