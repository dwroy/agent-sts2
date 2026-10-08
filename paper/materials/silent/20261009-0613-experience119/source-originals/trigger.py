import collections,json
from pathlib import Path
O=Path(__file__).parent;A=json.load(open(O/'audit.json'));N='0DJ6GFZZ0TG9'
rows={}
for label,items,key in [('饰品',A['potions'],'REPTILE_TRINKET_POWER'),('肌肉药',A['potions'],'FLEX_POTION_POWER')]:
 selected=[p for p in items if p['after']['powers'].get(key,0)>p['before']['powers'].get(key,0)]
 delta=collections.Counter(p['after']['powers'].get(key,0)-p['before']['powers'].get(key,0) for p in selected)
 assert set(delta)==({3} if label=='饰品' else {5}), (label,delta)
 rows[label]=dict(actions=len(selected),runs=sorted({p['run'] for p in selected}),deltas=dict(delta),cases=[{k:p[k] for k in ['run','floor','turn','ts','potion','before','after']} for p in selected])
card_ids=['SPEEDSTER','SERPENT_FORM','EXTERMINATE','ADRENALINE','EXPERTISE']
rows['能力动作']={cid:dict(actions=len(cs:=[c for c in A['cards'] if c['card']==cid]),runs=sorted({c['run'] for c in cs})) for cid in card_ids}
P=O/N;S=[json.loads(l)['state'] for l in (P/'states.jsonl').open()]
def first(f,t):return next(s for s in S if s['run']['floor']==f and s['screen']=='COMBAT' and s['turn']==t)
def powers(s):return {p['power_id']:p['amount'] for p in s['combat']['player']['powers']}
assert not any(k in powers(first(33,3)) for k in ['REPTILE_TRINKET_POWER','FLEX_POTION_POWER','STRENGTH_POWER'])
assert not any(k in powers(first(33,5)) for k in ['REPTILE_TRINKET_POWER','FLEX_POTION_POWER','STRENGTH_POWER'])
F=json.load(open(O/'new-state-facts.json'))
def action(f,t,c):return next(r for r in F if (r['floor'],r['turn'],r['card'])==(f,t,c))
r=action(33,4,'EXTERMINATE');assert [a['current_hp']-b['current_hp'] for a,b in zip(r['before']['enemies'],r['after']['enemies'])]==[40,40]
for cid in ['ADRENALINE','EXPERTISE']:
 r=action(33,5,cid);assert [a['current_hp']-b['current_hp'] for a,b in zip(r['before']['enemies'],r['after']['enemies'])]==[4,4]
r=action(17,8,'DEFEND_SILENT');assert (r['before']['block'],r['after']['block'])==(11,16);assert (r['before']['enemies'][0]['current_hp'],r['after']['enemies'][0]['current_hp'])==(999999988,999999984)
r=next(r for r in F if r['floor']==33 and r['turn']==6 and r['action']=='end_turn');assert r['after']['hp']==0 and [(e['enemy_id'],e['current_hp'],e['block'],e['powers']['STRENGTH_POWER']) for e in r['after']['enemies']]==[('CRUSHER',68,99,9)]
rows['本局核验']='414帧/401决策；两次撤临时力、四段双敌各40、两抽二各敌4、残壳伤与挡、单侧死亡末态均通过'
(O/'historical-trigger-checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:{kk:vv for kk,vv in v.items() if kk!='cases'} if isinstance(v,dict) else v for k,v in rows.items()},ensure_ascii=False))
