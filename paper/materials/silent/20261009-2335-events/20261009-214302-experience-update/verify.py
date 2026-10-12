import collections
import hashlib
import json
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=O.parents[2]
RUN='9663Y88TYK73'
A=json.load(open(O/'audit.json'))
C=json.load(open(O/'changes.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
checks=0
evidence=[]
for c in C:
    e=c['after']
    assert e['n_support']==len(set(e['evidence']))
    assert e['n_contradict']==len(set(e.get('contradicting',[])))
    for run in e['evidence']+e.get('contradicting',[]):
        assert len(run)==12 and R[run]['character'].lower()=='silent'
        checks+=1
    evidence.append(dict(id=e['id'],support=e['evidence'],contradict=e.get('contradicting',[]),by_asc=dict(collections.Counter(R[r]['ascension'] for r in e['evidence']))))
(O/'mechanism-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
cards=[x for x in A['cards'] if x['run']==RUN]
ends=[x for x in A['ends'] if x['run']==RUN]
potions=[x for x in A['potions'] if x['run']==RUN]
speed=next(x for x in potions if (x['potion'] or {}).get('id')=='SPEED_POTION')
assert speed['floor']==17 and speed['turn']==5
assert speed['before']['block']==speed['after']['block']==0
assert speed['after']['powers']['DEXTERITY_POWER']==5
blocks=[x for x in cards if x['floor']==17 and x['turn']==5 and x['card'] in ['SURVIVOR','DEFEND_SILENT']]
assert [x['after']['block']-x['before']['block'] for x in blocks]==[13,10,10]
end=next(x for x in ends if x['floor']==17 and x['turn']==5)
assert end['before']['block']==33
assert end['before']['hp']==end['after']['hp']==59
assert not end['after']['powers'].get('DEXTERITY_POWER')
assert not end['after']['powers'].get('SPEED_POTION_POWER')
checks+=8
wail=next(x for x in cards if x['floor']==46 and x['attempt']==4 and x['turn']==3 and x['card']=='PIERCING_WAIL')
a,z=wail['before']['enemies'][0],wail['after']['enemies'][0]
assert a['powers']['WEAK_POWER']==1
assert a['powers'].get('STRENGTH_POWER',0)==0 and z['powers']['STRENGTH_POWER']==-6
assert a['intents'][0]['total_damage']==12 and z['intents'][0]['total_damage']==8
defend=next(x for x in cards if x['floor']==46 and x['attempt']==4 and x['turn']==3 and x['card']=='DEFEND_SILENT')
assert defend['before']['powers']['FRAIL_POWER']==1
assert defend['after']['block']-defend['before']['block']==3
last=next(x for x in ends if x['floor']==46 and x['attempt']==4 and x['turn']==3)
assert last['before']['hp']==5 and last['before']['block']==3 and last['after']['hp']==0
assert last['before']['enemies'][0]['hp']==82 and last['after']['enemies'][0]['hp']==49
poisons=[x for x in potions if (x['potion'] or {}).get('id')=='POISON_POTION']
assert len(poisons)==8
for x in poisons:
    a,z=x['before']['enemies'][0],x['after']['enemies'][0]
    assert a['hp']==z['hp']
    assert z['powers']['POISON_POWER']-a['powers']['POISON_POWER']==6
    checks+=2
for floor,turn,damage in [(43,4,54),(45,4,60),(45,5,63)]:
    x=next(x for x in ends if x['floor']==floor and x['turn']==turn)
    assert x['before']['powers']['ACCELERANT_POWER']==2
    a,z=x['before']['enemies'][0],x['after']['enemies'][0]
    p=a['powers']['POISON_POWER']
    assert p+(p-1)+(p-2)==damage==a['hp']-z['hp']
    checks+=2
after=next(x for x in ends if x['floor']==43 and x['turn']==3)
assert after['before']['block']==8 and after['before']['powers']['AFTERIMAGE_POWER']==1
assert after['before']['hp']-after['after']['hp']==20
checks+=10

parameters={}
for ident,card in [('silent-piercing-wail-temporary-strength','PIERCING_WAIL'),('silent-deadly-poison-application','DEADLY_POISON'),('silent-accelerant-triggers','ACCELERANT'),('silent-afterimage-per-card-block','AFTERIMAGE')]:
    ev=next(c['after']['evidence'] for c in C if c['id']==ident)
    rows=[x for x in A['cards'] if x['run'] in ev and x['card']==card]
    parameters[ident]=dict(actions=len(rows),runs=len({x['run'] for x in rows}),cases=rows)
for ident,potion in [('silent-speed-potion-temporary-dexterity','SPEED_POTION'),('silent-poison-potion-observed-application','POISON_POTION')]:
    ev=next(c['after']['evidence'] for c in C if c['id']==ident)
    rows=[x for x in A['potions'] if x['run'] in ev and (x['potion'] or {}).get('id')==potion]
    parameters[ident]=dict(actions=len(rows),runs=len({x['run'] for x in rows}),cases=rows)
(O/'historical-parameters.json').write_text(json.dumps(parameters,ensure_ascii=False,indent=2)+'\n')
metadata=[]
for p in (ROOT/'knowledge/characters/silent').glob('*.json'):
    if p.name=='experience.json':continue
    x=json.load(p.open())
    row=dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x),character=x.get('character'),generated=x.get('generated'),source_note=str(x.get('_about') or x.get('note') or '')[:500],generated_from=x.get('generated_from'),meta=x.get('meta'))
    if row['character']:assert row['character'].lower()=='silent'
    metadata.append(row)
(O/'other-knowledge.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
(O/'verification.json').write_text(json.dumps(dict(checks=checks,new_original_records=len(json.load(open(O/'original-offsets.json'))),parameter_summary={k:dict(actions=v['actions'],runs=v['runs']) for k,v in parameters.items()}),ensure_ascii=False,indent=2)+'\n')
print('证据角色及机制公式核验',checks,'项通过')
