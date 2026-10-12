import bisect
import collections
import hashlib
import json
import statistics
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=O.parents[2]
RUN='0PH64C4AWAX9'
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
S=[json.loads(l) for l in (O/RUN/'states.jsonl').open()]
D=[json.loads(l) for l in (O/RUN/'decisions.jsonl').open()]
times=[s['ts'] for s in S]
cards=[x for x in A['cards'] if x['run']==RUN]
ends=[x for x in A['ends'] if x['run']==RUN]

flasks=[x for x in cards if x['floor']==24 and x['card']=='BOUNCING_FLASK']
assert len(flasks)==3
for x in flasks:
    assert [e['powers'].get('POISON_POWER',0) for e in x['after']['enemies']]==[6,6,0]
    assert [e['hp'] for e in x['before']['enemies']]==[e['hp'] for e in x['after']['enemies']]
    checks+=2
bubbles=[x for x in cards if x['floor']==24 and x['card']=='BUBBLE_BUBBLE']
assert len(bubbles)==2
for x in bubbles:
    assert x['before']['energy']-x['after']['energy']==1
    assert x['before']['enemies']==x['after']['enemies']
    checks+=2
bubble=next(x for x in cards if x['floor']==23 and x['card']=='BUBBLE_BUBBLE')
assert bubble['before']['enemies'][0]['powers']['POISON_POWER']==16
assert bubble['after']['enemies'][0]['powers']['POISON_POWER']==25
assert bubble['before']['enemies'][0]['hp']==bubble['after']['enemies'][0]['hp']==62
checks+=3
wails=[x for x in cards if x['floor']==23 and x['turn']==1 and x['card']=='PIERCING_WAIL']
assert [x['after']['enemies'][0]['powers']['STRENGTH_POWER'] for x in wails]==[-6,-12]
assert [x['before']['enemies'][0]['intents'][0]['total_damage'] for x in wails]==[7,3]
assert wails[-1]['after']['enemies'][0]['intents'][0]['total_damage']==0
next_turn=next(s['state'] for s in S if s['state']['run']['floor']==23 and s['screen']=='COMBAT' and s['state']['turn']==2)
assert not any(p['power_id'] in ['STRENGTH_POWER','PIERCING_WAIL_POWER'] for p in next_turn['combat']['enemies'][0]['powers'])
checks+=4
end23=next(x for x in ends if x['floor']==23 and x['turn']==3)
assert end23['before']['block']==6 and end23['before']['hp']-end23['after']['hp']==11
assert end23['before']['enemies'][0]['intents'][0]['total_damage']==17
checks+=2
lag=next(s['state'] for s in S if s['state']['run']['floor']==17 and s['screen']=='COMBAT' and s['state']['turn']==8)
pw={p['power_id']:p['amount'] for p in lag['combat']['player']['powers']}
assert pw['STRENGTH_POWER']==pw['DEXTERITY_POWER']==-2
assert {p['power_id']:p['amount'] for p in lag['combat']['enemies'][0]['powers']}['STRENGTH_POWER']==2
for turn,poison in [(8,27),(9,26),(10,25)]:
    x=next(x for x in ends if x['floor']==17 and x['turn']==turn)
    assert x['before']['enemies'][0]['powers']['POISON_POWER']==poison
    assert x['before']['enemies'][0]['hp']-x['after']['enemies'][0]['hp']==poison
    checks+=2
assert next(x for x in ends if x['floor']==17 and x['turn']==10)['before']['block']==11
checks+=3
fumes=next(x for x in cards if x['floor']==24 and x['card']=='NOXIOUS_FUMES')
assert fumes['after']['powers']['NOXIOUS_FUMES_POWER']==2
assert fumes['before']['enemies']==fumes['after']['enemies']
assert not any(s['state']['run']['floor']==24 and s['state'].get('turn',0)>3 for s in S)
checks+=3
revivals=[]
for attempt,block,hp in [(1,0,8),(2,0,8),(3,5,14)]:
    x=next(x for x in ends if x['floor']==24 and x['attempt']==attempt and x['turn']==1)
    assert x['before']['block']==block and x['after']['hp']==0
    actual=next(s for s in S if s['ts']>x['ts'] and s['screen']=='COMBAT' and s['state']['run']['floor']==24 and s['state']['turn']==2)
    assert actual['state']['run']['current_hp']==hp
    assert not any(p and p.get('potion_id')=='FAIRY_IN_A_BOTTLE' for p in actual['state']['run']['potions'])
    revivals.append(dict(attempt=attempt,block=block,hp=hp,ts=actual['ts'],enemies=[(e['enemy_id'],e['current_hp']) for e in actual['state']['combat']['enemies']]))
    checks+=3
assert revivals[1]['enemies']==revivals[2]['enemies']
last=next(x for x in ends if x['floor']==24 and x['attempt']==3 and x['turn']==3)
assert last['before']['hp']==2 and last['before']['block']==0 and last['after']['hp']==0
assert [e['hp'] for e in last['after']['enemies']]==[0,18,50]
checks+=3
new_fights=[x for x in A['fights'] if x['run']==RUN]
assert len(new_fights)==11
assert sum(x['loss'] for x in new_fights if x['floor'] in [21,22,23])==52
assert next(x for x in new_fights if x['floor']==17)['loss']==56
assert sum(x['death'] for x in new_fights)==1
assert next(x for x in new_fights if x['floor']==24)['hp']==7
assert R[RUN]['ascension']==10 and R[RUN]['floor']==24 and not R[RUN]['victory']
checks+=6
multi=[x for x in json.load(open(O/'sl-draw-comparison.json')) if any('千足' in str(e) for e in x.get('enemies',[]))]
assert len(multi)==3 and sum(len(x['attempts']) for x in multi)==11 and not any(x['wins'] for x in multi)
new_sl=next(x for x in multi if x['run']==RUN)
assert new_sl['shared_recorded_prefix']==12
checks+=2

parameters={}
for ident,card in [('silent-bouncing-flask-poison','BOUNCING_FLASK'),('silent-bubble-bubble-condition','BUBBLE_BUBBLE'),('silent-noxious-fumes-growth','NOXIOUS_FUMES'),('silent-piercing-wail-temporary-strength','PIERCING_WAIL')]:
    ev=next(c['after']['evidence'] for c in C if c['id']==ident)
    rows=[x for x in A['cards'] if x['run'] in ev and x['card']==card]
    parameters[ident]=dict(actions=len(rows),runs=len({x['run'] for x in rows}),cases=rows)
ev=next(c['after']['evidence'] for c in C if c['id']=='silent-cunning-potion-shiv-capacity')
rows=[x for x in A['potions'] if x['run'] in ev and (x['potion'] or {}).get('id')=='CUNNING_POTION']
parameters['silent-cunning-potion-shiv-capacity']=dict(actions=len(rows),runs=len({x['run'] for x in rows}),cases=rows)
(O/'historical-parameters.json').write_text(json.dumps(parameters,ensure_ascii=False,indent=2)+'\n')

metadata=[]
for p in (ROOT/'knowledge/characters/silent').glob('*.json'):
    if p.name=='experience.json':continue
    x=json.load(p.open())
    row=dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x),character=x.get('character'),generated=x.get('generated'),source_note=str(x.get('_about') or x.get('note') or '')[:600],generated_from=x.get('generated_from'),meta=x.get('meta'),source=x.get('source'),evidence=x.get('evidence'))
    if row['character']:assert row['character'].lower()=='silent'
    metadata.append(row)
(O/'other-knowledge.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')

routes=[]
for run in R:
    states=[json.loads(l) for l in (O/run/'states.jsonl').open()]
    by_ts={s['ts']:s['state'] for s in states}
    for l in (O/run/'decisions.jsonl').open():
        d=json.loads(l)
        if (d.get('chosen') or {}).get('action')!='choose_map_node' or not str(d.get('result','')).startswith('completed'):continue
        s=by_ts[d['ts']];hp=s['run']['current_hp'];maximum=s['run']['max_hp']
        if hp/maximum>=.4:continue
        following=next((f for f in A['fights'] if f['run']==run and f['floor']>d['floor']),None)
        if not following:continue
        routes.append(dict(run=run,asc=R[run]['ascension'],act=int(s['run']['act_id'])+1,floor=d['floor'],hp=hp,max_hp=maximum,node=d['expect']['node']['type'],next_floor=following['floor'],death=following['death'],loss=following['loss'],rationale=d['rationale']))
route_summary=[]
for key in sorted({(x['asc'],x['act'],x['node']) for x in routes}):
    rows=[x for x in routes if (x['asc'],x['act'],x['node'])==key]
    wins=[x['loss'] for x in rows if not x['death']]
    route_summary.append(dict(asc=key[0],act=key[1],node=key[2],choices=len(rows),runs=len({x['run'] for x in rows}),next_fights=len({(x['run'],x['next_floor']) for x in rows}),deaths=sum(x['death'] for x in rows),median_win=statistics.median(wins) if wins else None,cases=rows))
(O/'low-hp-route-comparison.json').write_text(json.dumps(route_summary,ensure_ascii=False,indent=2)+'\n')
(O/'resource-formulas.json').write_text(json.dumps(dict(revivals=revivals,new_fights=new_fights,centipede_sl=[dict(run=x['run'],asc=x['asc'],attempts=len(x['attempts']),wins=len(x['wins']),prefix=x['shared_recorded_prefix']) for x in multi]),ensure_ascii=False,indent=2)+'\n')
(O/'verification.json').write_text(json.dumps(dict(checks=checks,new_original_records=len(json.load(open(O/'original-offsets.json'))),parameter_summary={k:dict(actions=v['actions'],runs=v['runs']) for k,v in parameters.items()},low_hp_route_groups=len(route_summary)),ensure_ascii=False,indent=2)+'\n')
print('证据角色及机制公式核验',checks,'项通过')
