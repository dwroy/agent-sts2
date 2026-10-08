import json,collections,hashlib,re,statistics
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');K=O.parents[2]/'knowledge'
C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
Z=json.load(open(K/'characters/silent/experience.json'));active=[e for e in Z['entries'] if e['status']=='active']
assert len({e['id'] for e in Z['entries']})==len(Z['entries'])
for row in C['entries']:
    e=row['after'];n=e['n_support'];q=e['n_contradict']
    assert n==len(set(e['evidence'])) and q==len(set(e.get('contradicting',[])))
    assert all(re.fullmatch('[A-Z0-9]{12}',r) and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
    assert not set(e['evidence'])&set(e.get('contradicting',[]))
    assert e['confidence']==('high' if n>=5 and q<=n/3 else 'med' if n>=2 else 'low')
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
    if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')
    assert e['last_seen']=='2026-10-08'
assert sum(len(e['lesson']) for e in active)<=60000
history={}
for card,power in [('ACCELERANT','ACCELERANT_POWER'),('FOOTWORK','DEXTERITY_POWER'),('NOXIOUS_FUMES','NOXIOUS_FUMES_POWER'),('BURST','BURST_POWER')]:
    rr=[r for r in A['cards'] if r['card']==card]
    history[card]=dict(runs=len({r['run'] for r in rr}),casts=len(rr),deltas=dict(collections.Counter(r['after']['powers'].get(power,0)-r['before']['powers'].get(power,0) for r in rr)),cases=rr)
(O/'historical-power-deltas.json').write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n')
H=json.load(open(O/'historical-potions.json'))
for potion,power,amount in [('DEXTERITY_POTION','DEXTERITY_POWER',2),('HEART_OF_IRON','PLATING_POWER',7)]:
    assert all(r['after']['powers'].get(power,0)-r['before']['powers'].get(power,0)==amount and r['before']['block']==r['after']['block'] for r in H if r['potion']==potion)
for r in H:
    if r['potion']!='POISON_POTION':continue
    assert [e['hp'] for e in r['before']['enemies']]==[e['hp'] for e in r['after']['enemies']]
    for b,z in zip(r['before']['enemies'],r['after']['enemies']):
        if b['index']!=r['target']:continue
        delta=z['powers'].get('POISON_POWER',0)-b['powers'].get('POISON_POWER',0)
        skull=any(x['relic_id']=='SNECKO_SKULL' for x in r['before']['relics'])
        if delta==0:assert b['powers'].get('ARTIFACT_POWER')==1 and z['powers'].get('ARTIFACT_POWER',0)==0
        elif delta==7:assert skull
        else:assert delta==6 and not skull and not b['powers'].get('ARTIFACT_POWER',0)
transitions=[]
for run in next(e['evidence'] for e in active if e['id']=='silent-act-transition-missing-hp-heal'):
    S=[json.loads(s)['state'] for s in (O/run/'states.jsonl').open()]
    for before,after in zip(S,S[1:]):
        b,z=before['run'],after['run']
        if z['floor'] not in [18,34] or b['floor']!=z['floor']-1:continue
        assert b['max_hp']==z['max_hp'];gain=(b['max_hp']-b['current_hp'])*80//100;assert z['current_hp']-b['current_hp']==gain
        transitions.append(dict(run=run,floor=z['floor'],before=b['current_hp'],after=z['current_hp'],gain=gain))
(O/'transition-heal-evidence.json').write_text(json.dumps(transitions,ensure_ascii=False,indent=2)+'\n')
other=[]
for p in sorted((K/'characters/silent').glob('*.json')):
    if p.name=='experience.json':continue
    x=json.load(open(p));other.append(dict(file=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),metadata={k:v for k,v in x.items() if k in ['version','generated','_about','meta','source','generated_from','limitation','note']},keys=list(x)))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
result=dict(character='silent',runs=len(R),cutoff=A['cutoff'],deaths=sum(r['death'] for r in A['fights']),transitions=len(transitions),active=len(active),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),asc={str(a):dict(entries=len(t:=[e for e in active if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in t)) for a in [8,9,10]},history={k:{a:b for a,b in v.items() if a!='cases'} for k,v in history.items()},other_files=len(other))
(O/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(result)
