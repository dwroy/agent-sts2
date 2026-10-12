import bisect, collections, hashlib, json
from pathlib import Path

O=Path(__file__).parent
N='T0DGVABPV60U'
A=json.load(open(O/'audit.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
B=json.load(open(O/'experience-before.json'))
rows=[r for r in A['cards'] if r['card'] in ['FOOTWORK','ROLLING_BOULDER','SPEEDSTER','ALCHEMIZE','SHIV','BACKFLIP','DEFLECT','DEFEND_SILENT','LEG_SWEEP']]
(O/'mechanism-actions.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
potions=[];alchemize=[];helical=[];akabeko=[]; checkpoints=[]
for run in A['runs']:
    ds=[json.loads(l) for l in (O/run/'decisions.jsonl').open()]
    ss=[json.loads(l) for l in (O/run/'states.jsonl').open()]
    assert all(s['state']['run']['character_id'].lower()=='silent' for s in ss)
    tt=[s['ts'] for s in ss]
    for d in ds:
        action=(d.get('chosen') or {}).get('action')
        if not str(d.get('result','')).startswith('completed'):continue
        card=(d.get('expect') or {}).get('card',{}).get('id')
        relevant=action=='use_potion' or card in ['ALCHEMIZE','SHIV','STRIKE_SILENT'] or (run==N and d['floor']==48)
        if not relevant:continue
        i=bisect.bisect_left(tt,d['ts']);assert tt[i]==d['ts']
        b=ss[i]['state'];z=ss[min(i+1,len(ss)-1)]['state']
        def pw(s):return {q['power_id']:q['amount'] for q in (s.get('combat') or {}).get('player',{}).get('powers',[])}
        pb=pw(b);pz=pw(z)
        meta=dict(run=run,asc=R[run]['ascension'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,ts=d['ts'])
        if action=='use_potion':
            potions.append(dict(meta,potion=d['expect']['potion']['id'],before=pb,after=pz))
        if action=='play_card' and card=='ALCHEMIZE':
            alchemize.append(dict(meta,before=b['run']['potions'],after=z['run']['potions'],hp_before=b['run']['current_hp'],hp_after=z['run']['current_hp'],powers_before=pb,powers_after=pz))
        if action=='play_card' and card=='SHIV' and any(r['relic_id']=='HELICAL_DART' for r in b['run']['relics']):
            assert pz.get('DEXTERITY_POWER',0)-pb.get('DEXTERITY_POWER',0)==1,(run,meta)
            assert pz.get('HELICAL_DART_POWER',0)-pb.get('HELICAL_DART_POWER',0)==1,(run,meta)
            helical.append(dict(meta,upgraded=d['expect']['card'].get('upgraded'),before=pb,after=pz,block_before=b['combat']['player']['block'],block_after=z['combat']['player']['block']))
        if action=='play_card' and any(r['relic_id']=='AKABEKO' for r in b['run']['relics']) and pb.get('VIGOR_POWER'):
            akabeko.append(dict(meta,card=card,before=pb,after=pz))
        if run==N and d['floor']==48:checkpoints.append(dict(decision=d,before=ss[i],after=ss[min(i+1,len(ss)-1)]))
for potion,power,inc in [('DEXTERITY_POTION','DEXTERITY_POWER',2),('REGEN_POTION','REGEN_POWER',5)]:
    pp=[p for p in potions if p['potion']==potion]
    assert all(p['after'].get(power,0)-p['before'].get(power,0)==inc for p in pp)
for name,value in [('historical-potions',potions),('historical-alchemize',alchemize),('historical-helical',helical),('historical-akabeko',akabeko),('new-checkpoints',checkpoints)]:
    (O/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
new=[f for f in A['fights'] if f['run']==N]
assert len(new)==22 and sum(f['death'] for f in new)==1
assert [(f['floor'],f['hp'],f['last_hp']) for f in new[-4:]]==[(43,77,63),(45,63,51),(46,51,13),(48,55,0)]
assert all(f['type']!='unclassified' for f in new)
assert next(f for f in new if f['floor']==28)['type']=='Elite'
ns=[json.loads(l) for l in (O/N/'states.jsonl').open()];nd=[json.loads(l) for l in (O/N/'decisions.jsonl').open()]
assert len(ns)==1116 and len(nd)==1071
tt=[s['ts'] for s in ns]
def at(ts):return ns[bisect.bisect_left(tt,ts)]['state']
def cardrows(turn,att,card):return [r for r in A['cards'] if (r['run'],r['floor'],r['turn'],r['attempt'],r['card'])==(N,48,turn,att,card)]
t4shiv=cardrows(4,6,'SHIV')[0]
assert t4shiv['before']['powers']['DEXTERITY_POWER']==3 and t4shiv['after']['powers']['DEXTERITY_POWER']==4
de=cardrows(4,6,'DEFLECT')[0];df=cardrows(4,6,'DEFEND_SILENT')[0]
assert de['after']['block']-de['before']['block']==8
assert df['after']['block']-df['before']['block']==12
assert len([p for p in helical if (p['run'],p['floor'],p['turn'],p['attempt'])==(N,48,2,6)])==4
first3=next(s['state'] for s in ns if s['state']['run']['floor']==48 and s['state']['turn']==3 and s['ts']>='2026-10-08T04:15:36.154Z')
assert not any(p['power_id'] in ['DEXTERITY_POWER','HELICAL_DART_POWER'] for p in first3['combat']['player']['powers'])
end=next(r for r in A['ends'] if (r['run'],r['floor'],r['attempt'],r['turn'])==(N,48,6,5))
assert end['before']['hp']==16 and end['before']['block']==0 and end['before']['powers']['DEXTERITY_POWER']==8
assert ns[-1]['state']['run']['current_hp']==0 and ns[-1]['state']['combat']['enemies'][0]['current_hp']==104
newal=[r for r in alchemize if r['run']==N];assert len(newal)==4
assert [(r['floor'],r['turn'],r['attempt']) for r in newal]==[(35,2,1),(45,3,1),(46,2,1),(48,4,5)]
assert all(r['hp_before']==r['hp_after'] for r in newal)
model_comparisons=[]
for att in [1,6]:
    t=[r for r in A['cards'] if (r['run'],r['floor'],r['attempt'],r['turn'])==(N,48,att,2)]
    model_comparisons.append(dict(attempt=att,first=t[0]['before'],plays=[r['card'] for r in t]))
assert all(v['first']['hp']==38 and v['first']['enemies'][0]['hp']==86 for v in model_comparisons)
assert 'LEG_SWEEP' in model_comparisons[0]['plays'] and 'LEG_SWEEP' not in model_comparisons[1]['plays']
(O/'sl-comparison.json').write_text(json.dumps(model_comparisons,ensure_ascii=False,indent=2)+'\n')
other=[]
for p in sorted(Path('knowledge/characters/silent').glob('*.json')):
    if p.name=='experience.json':continue
    x=json.load(open(p));other.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x)[:15],metadata={k:x[k] for k in ['character','generated','generated_at','ascension','limitation'] if k in x}))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
summary=dict(fights=len(new),helical_runs=list(dict.fromkeys(r['run'] for r in helical)),helical_actions=len(helical),alchemize_runs=list(dict.fromkeys(r['run'] for r in alchemize)),alchemize_actions=len(alchemize),card_counts={c:dict(runs=len({r['run'] for r in rows if r['card']==c}),actions=sum(r['card']==c for r in rows)) for c in sorted({r['card'] for r in rows})})
(O/'mechanism-counts.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
