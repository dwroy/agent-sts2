import json,collections,hashlib
from pathlib import Path
O=Path(__file__).parent;N='RMNXHZKV716Y';A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};checks=[]
def check(label,ok):
    assert ok,label
    checks.append(label)
F=[f for f in A['fights'] if f['run']==N]
check('22房1实死',len(F)==22 and sum(f['death'] for f in F)==1)
check('获胜损血及末死亡',[(f['floor'],f['loss']) for f in F]==list(zip([2,3,5,6,7,9,15,17,19,21,23,25,29,30,33,35,36,37,44,46,48,49],[0,0,4,20,7,35,14,56,3,0,0,11,6,12,59,0,0,52,23,21,87,13])))
check('三幕走廊44问号52',sum(f['loss'] for f in F if f['act']==3 and f['type']=='Monster')==44 and sum(f['loss'] for f in F if f['act']==3 and f['type']=='Unknown')==52)
cards=[c for c in A['cards'] if c['run']==N]
def card(key,f,t):return next(x for x in cards if x['card']==key and x['floor']==f and x['turn']==t and x['attempt']==(6 if f==49 else 3))
x=card('MAD_SCIENCE',49,2);check('科学专长2力2敏不追补',x['before']['powers'].get('STRENGTH_POWER',0)==0 and x['after']['powers']['STRENGTH_POWER']==2 and x['before']['powers']['DEXTERITY_POWER']==1 and x['after']['powers']['DEXTERITY_POWER']==3 and x['after']['block']==0)
x=card('LEG_SWEEP',49,3);y=card('BACKFLIP',49,3);check('首挡25后挡6合31',x['after']['block']-x['before']['block']==25 and y['after']['block']-y['before']['block']==6 and y['after']['block']==31)
x=card('FOOTWORK',49,4);check('步法3到5仍无挡',x['before']['powers']['DEXTERITY_POWER']==3 and x['after']['powers']['DEXTERITY_POWER']==5 and x['before']['block']==x['after']['block']==0)
pots=[p for p in A['potions'] if p['run']==N];check('21成功用药含六石',len(pots)==21 and sum((p.get('potion') or {}).get('id')=='POTION_SHAPED_ROCK' for p in pots)==6)
ghost=next(p for p in pots if p['floor']==48 and p['attempt']==3 and (p.get('potion') or {}).get('id')=='GHOST_IN_A_JAR');check('幽灵30变1零当步HP',ghost['before']['enemies'][0]['intents'][0]['total_damage']==30 and ghost['after']['enemies'][0]['intents'][0]['total_damage']==1 and ghost['after']['hp']==ghost['before']['hp']==38)
rests=[r for r in A['rests'] if r['run']==N];check('九火六HEAL三锻造',len(rests)==9 and sum(r['after']>r['before'] for r in rests)==6)
param=[]
for c in C:
    e=c['after'];ev=e['evidence'];check(e['id']+'证据去重',len(set(ev))==e['n_support']);check(e['id']+'反例数',len(set(e.get('contradicting',[])))==e['n_contradict'])
    for r in ev+e.get('contradicting',[]):check(e['id']+':'+r+'角色',R[r]['character'].lower()=='silent' and json.loads((O/r/'states.jsonl').open().readline())['state']['run']['character_id'].lower()=='silent')
    typ,key=e['scope'].split(':',1)
    cases=[x for x in A['cards'] if x['run'] in ev and x['card']==key] if typ=='card' else [x for x in A['potions'] if x['run'] in ev and (x.get('potion') or {}).get('id')==key] if typ=='potion' else [x for x in A['fights'] if x['run'] in ev and (typ not in ['boss','hallway','elite'] or key in x['enemies'])]
    param.append(dict(entry=e['id'],support=e['n_support'],contradict=e['n_contradict'],asc=dict(collections.Counter(R[r]['ascension'] for r in ev)),evidence=ev,contradicting=e.get('contradicting',[]),actions_or_rooms=len(cases),parameter_runs=len({x['run'] for x in cases}),parameter_cases=cases if typ in ['card','potion'] else [],limitation='主题支持局数不是逐公式独立受控实验；遗物参数另据原帧/复盘，不以战房数假称触发次数。'))
B=json.load(open(O/'experience-before.json'));E=json.load(open(O.parents[2]/'knowledge/characters/silent/experience.json'))
check('未改条目全等',all(e==next(x for x in B['entries'] if x['id']==e['id']) for e in E['entries'] if e['id'] not in {c['id'] for c in C}))
other=[]
for p in sorted((O.parents[2]/'knowledge/characters/silent').glob('*.json')):
    if p.name=='experience.json':continue
    x=json.load(open(p));other.append(dict(file=str(p.relative_to(O.parents[2])),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x)[:20],assessment='核对自有生成时间、样本口径、A10双boss及模拟限制；没有本局直接反驳的手写知识。统计/模拟非实测血价，不覆刷新。'))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n');(O/'mechanism-evidence.json').write_text(json.dumps(param,ensure_ascii=False,indent=2)+'\n')
(O/'verification.json').write_text(json.dumps(dict(checks=len(checks),passed=checks,rest_gain=sum(r['after']-r['before'] for r in rests)),ensure_ascii=False,indent=2)+'\n');print('验证通过',len(checks),'HEAL实回',sum(r['after']-r['before'] for r in rests))
