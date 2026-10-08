import json,pathlib,re,sys,collections,datetime
p=pathlib.Path('learner/runs/20261008-051302-postmortem');checks={
288591:(11,1,65,None),288592:(11,1,67,0),288617:(11,6,34,None),
288678:(17,1,67,None),288679:(17,1,69,0),288721:(17,11,19,None),
288730:(19,1,59,None),288731:(19,1,61,0),288744:(19,3,46,None),
288750:(20,1,46,None),288751:(20,1,48,0),288762:(20,3,42,0),288763:(20,4,23,0),288776:(20,7,8,None),
288791:(23,1,8,None),288792:(23,1,10,0),288822:(23,6,1,0),288823:(23,1,10,0),288853:(23,6,1,0),288854:(23,1,10,0),288884:(23,6,1,0),288885:(23,1,10,0),288904:(23,3,10,19),288905:(23,4,2,0),288914:(23,5,2,0),288915:(23,5,0,0)}
found={}
for line in sys.stdin:
 n,raw=line.split(':',1);n=int(n)
 if n not in checks:continue
 r=json.loads(raw);st=r['state'];c=st.get('combat') or {};hp=st['run']['current_hp'];floor=st['run']['floor'];turn=st['turn'];block=(c.get('player') or {}).get('block')
 expect=checks[n];assert (floor,turn,hp)==expect[:3],(n,expect,(floor,turn,hp));assert expect[3] is None or block==expect[3],(n,'block',block,expect)
 found[n]=r
assert set(found)==set(checks),set(checks)-set(found)
e=found[288914]['state']['combat']['enemies'];assert e[0]['intents'][0]['total_damage']==13 and e[0]['current_hp']==36 and e[1]['current_hp']==2
e=found[288915]['state']['combat']['enemies'];assert len(e)==1 and e[0]['current_hp']==29
for ln in [288792,288823,288854,288885]:assert [(x['index'],x['potion_id']) for x in found[ln]['state']['run']['potions'] if x['occupied']]==[(0,'ENERGY_POTION'),(1,'SPEED_POTION')]
d=[json.loads(x) for x in (p/'decisions.jsonl').open()];cs=[r for r in d if r['decider']=='jev' and r['label'].startswith('combat/')]
assert len(d)==424 and len(cs)==68;assert collections.Counter(str(r.get('rollout_best_chosen')) for r in cs)=={'True':66,'False':1,'None':1}
assert sum(r['decider']=='jev' and r.get('confidence') is not None and r['confidence']<.35 for r in d)==5
assert len([r for r in d if 'HP guard:' in r['rationale']])==1
assert len([r for r in d if r['chosen'].get('action')=='use_potion'])==13
assert len([r for r in d if r['chosen'].get('action')=='discard_potion'])==0
last=next(r for r in d if r['_line']==282449);assert '(-11)' in last['rationale'] and last['chosen']['action']=='end_turn'
time=(datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds();assert time==1192
result={'核对帧':len(found),'决策':len(d),'末次死亡回合':5,'死亡前HP':2,'格挡':0,'攻击':13,'死亡后敌HP':29,'时间秒':time,'勘误':'预计剩血-11；动作伤害预测未记录','错误':0}
(p/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
