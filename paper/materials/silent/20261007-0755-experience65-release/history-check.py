import json,collections
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'));E=json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};by={e['id']:e for e in E['entries']}
ids=['silent-strength-weak-observation','silent-noxious-fumes-growth','silent-terror-eel-vigor-vulnerable','silent-byrdonis-strength-multihit-observation','silent-deck-burst-observation'];facts={}
for i in ids:
 e=by[i];facts[i]=dict(evidence=e['evidence'],contradicting=e.get('contradicting',[]),asc_support=dict(collections.Counter(R[r]['ascension'] for r in e['evidence'])))
for i,enemy in [('silent-terror-eel-vigor-vulnerable','TERROR_EEL'),('silent-byrdonis-strength-multihit-observation','BYRDONIS')]:
 e=by[i];fs=[x for x in A['fights'] if x['run'] in e['evidence'] and enemy in x['enemies']];assert set(x['run'] for x in fs)==set(e['evidence'])
 facts[i]['fights']=fs;facts[i]['end_turns']=[x for x in A['ends'] if x['run'] in e['evidence'] and any(z['id']==enemy for z in x['before']['enemies'])];facts[i]['actions']=[x for x in A['cards'] if x['run'] in e['evidence'] and any(z['id']==enemy for z in x['before']['enemies'])]
 print(i,len(fs),'房',sum(x['death'] for x in fs),'死',[(x['run'],x['asc'],x['loss'],x['death']) for x in fs])
i='silent-noxious-fumes-growth';plays=[x for x in A['cards'] if x['card']=='NOXIOUS_FUMES'];observed={x['run'] for x in plays};missing=set(by[i]['evidence'])-observed
assert not missing,missing
facts[i]['actions']=[x for x in plays if x['run'] in by[i]['evidence']];facts[i]['end_turns']=[x for x in A['ends'] if x['run'] in by[i]['evidence'] and x['before']['powers'].get('NOXIOUS_FUMES_POWER')]
print('毒雾已纳证40局均有实际施放，全历史施放',len(observed),'局',len(plays),'次')
i='silent-strength-weak-observation';facts[i]['actions']=[x for x in A['cards'] if x['run'] in by[i]['evidence'] and (x['before']['powers'].get('STRENGTH_POWER') or x['before']['powers'].get('DEXTERITY_POWER') or any(z['powers'].get('STRENGTH_POWER') or z['powers'].get('WEAK_POWER') or z['powers'].get('VIGOR_POWER') for z in x['before']['enemies']))]
print('力量等综合条目按局支持',by[i]['n_support'],'，子公式与胜因不合并计算')
common=json.load(open(ROOT/'.worktrees/exp/knowledge/common/monster-db.json'));db={}
for enemy,moves in {'TERROR_EEL':['CRASH_MOVE'],'BYRDONIS':['PECK_MOVE','SWOOP_MOVE'],'GREMLIN_MERC':['GIMME_MOVE']}.items():
 m=common['monsters'][enemy];db[enemy]=dict(hp=m.get('hp_by_asc'),moves={k:m['moves'][k]['damage_by_asc'] for k in moves})
(O/'historical-facts.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2)+'\n');(O/'common-facts-check.json').write_text(json.dumps(db,ensure_ascii=False,indent=2)+'\n')
print('全部机制支持进阶',[(i,v['asc_support']) for i,v in facts.items()])
