import bisect, collections, hashlib, json
from pathlib import Path

O=Path(__file__).parent
A=json.load(open(O/'audit.json'))
mapping={'FOOTWORK':'DEXTERITY_POWER','AFTERIMAGE':'AFTERIMAGE_POWER','NOXIOUS_FUMES':'NOXIOUS_FUMES_POWER','ACCELERANT':'ACCELERANT_POWER','ROLLING_BOULDER':'ROLLING_BOULDER_POWER'}
casts={}
for card,power in mapping.items():
    rr=[r for r in A['cards'] if r['card']==card]
    casts[card]=dict(runs=len({r['run'] for r in rr}),casts=len(rr),deltas=dict(collections.Counter(r['after']['powers'].get(power,0)-r['before']['powers'].get(power,0) for r in rr)),rows=rr)
(O/'historical-power-deltas.json').write_text(json.dumps(casts,ensure_ascii=False,indent=2)+'\n')
def p(e):return {r['power_id']:r['amount'] for r in e.get('powers',[])}
cases={}
for n,f,t in [('PD9AYQVMLQW6',49,10),('L2TSFU62Z57Z',17,8)]:
    facts=json.load(open(O/n/'facts.json'))
    last=next(r for r in facts if (r['floor'],r['attempt'],r['turn'],r['action'])==(f,6,t,'end_turn'))
    b,z=last['before'],last['after']
    assert z['hp']==0
    if f==49:
        assert (b['hp'],b['block'])==(3,32)
        assert b['powers']['DEXTERITY_POWER']==4 and b['powers']['AFTERIMAGE_POWER']==1
        assert len([c for c in b['hand'] if c['id']=='WITHER'])==2
        assert b['enemies'][0]['hp']==250 and z['enemies'][0]['hp']==244
        last['full_threat']=24+23
        last['full_loss']=47-32
        last['strict_survival_extra_hp']=15+1-3
    else:
        assert (b['hp'],b['block'])==(17,0)
        assert b['powers']['RINGING_POWER']==1 and b['powers']['STRENGTH_POWER']==1
        assert b['enemies'][0]['hp']==113
        assert sum(c['blocked']=='blocked_by_hook' for c in b['hand'])==4
        last['full_loss']=17
        last['strict_survival_extra_hp']=1
    cases[n]=last
(O/'terminal-facts.json').write_text(json.dumps(cases,ensure_ascii=False,indent=2)+'\n')
groups=collections.defaultdict(list)
for r in A['attempts']:groups[(r['run'],r['floor'])].append(r)
sl=[]
for (n,f),r in groups.items():
    if max(x['attempt'] for x in r)<=1:continue
    fight=next(x for x in A['fights'] if (x['run'],x['floor'])==(n,f))
    sl.append(dict(run=n,floor=f,asc=fight['asc'],enemies=fight['enemies'],attempts=len(r),wins=sum(x['result']=='won' for x in r),results=[x['result'] for x in r],details=r))
(O/'sl-multiple-fights.json').write_text(json.dumps(sl,ensure_ascii=False,indent=2)+'\n')
slboss={}
for enemy in ['AEONGLASS','CEREMONIAL_BEAST','QUEEN']:
    rr=[r for r in sl if enemy in r['enemies']]
    slboss[enemy]=dict(fights=len(rr),attempts=sum(r['attempts'] for r in rr),wins=sum(r['wins'] for r in rr),by_asc={str(a):dict(fights=sum(r['asc']==a for r in rr),attempts=sum(r['attempts'] for r in rr if r['asc']==a),wins=sum(r['wins'] for r in rr if r['asc']==a)) for a in sorted({r['asc'] for r in rr})})
(O/'sl-boss-summary.json').write_text(json.dumps(slboss,ensure_ascii=False,indent=2)+'\n')
S=[json.loads(s) for s in (O/'L2TSFU62Z57Z/states.jsonl').open()]
D=[json.loads(s) for s in (O/'L2TSFU62Z57Z/decisions.jsonl').open()]
M={s['ts']:s['state'] for s in S}
controls=[]
for d in D:
    if d['floor']==17 and d['turn'] in [2,3] and 'HP guard' in d.get('rationale',''):
        controls.append(dict(decision=d,state=M[d['ts']]))
(O/'sl-guard-controls.json').write_text(json.dumps(controls,ensure_ascii=False,indent=2)+'\n')
other=[]
K=O.parents[2]/'knowledge/characters/silent'
for path in sorted(K.glob('*.json')):
    if path.name=='experience.json':continue
    obj=json.load(open(path))
    other.append(dict(file=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),keys=list(obj)[:18],metadata={k:obj[k] for k in ['character','ascension','generated','limitation'] if k in obj}))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
print('能力全史', {k:{a:b for a,b in v.items() if a!='rows'} for k,v in casts.items()})
print('多次SL',slboss)
print('终局实帧核验通过；独立其他知识文件',len(other))
