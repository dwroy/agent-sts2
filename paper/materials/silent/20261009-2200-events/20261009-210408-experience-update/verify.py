import bisect
import collections
import hashlib
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
RUN='54G5683J0E5S'
A=json.load(open(O/'audit.json'))
C=json.load(open(O/'changes.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
checks=0
manifest=[]
for filename in ['decisions','brain','run-plans','sl-attempts','jev-prompts']:
    saved=(O/RUN/(filename+'.jsonl')).read_bytes().splitlines(keepends=True)
    q=subprocess.run(['nice','-n','19','rg','--byte-offset','--fixed-strings',RUN,str(ROOT/'logs'/(filename+'.jsonl'))],capture_output=True)
    assert q.returncode in [0,1]
    found=[]
    for line in q.stdout.splitlines(keepends=True):
        off,raw=line.split(b':',1)
        found.append(raw)
        manifest.append(dict(file=filename+'.jsonl',offset=int(off),sha256=hashlib.sha256(raw).hexdigest()))
    assert saved==found,filename
    checks+=len(found)
offset=json.load(open(O/RUN/'states-offsets.json'))['first']
with (ROOT/'logs/states.jsonl').open('rb') as f:
    f.seek(offset)
    for saved in (O/RUN/'states.jsonl').open('rb'):
        off=f.tell();raw=f.readline()
        assert saved==raw
        x=json.loads(raw)
        assert x['state']['run']['character_id'].lower()=='silent'
        assert x['state']['run_id']==RUN
        manifest.append(dict(file='states.jsonl',offset=off,sha256=hashlib.sha256(raw).hexdigest()))
        checks+=3
(O/'original-offsets.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

def seek_frame(ts,expected):
    p=ROOT/'logs/states.jsonl'
    with p.open('rb') as f:
        lo=0;hi=p.stat().st_size
        while hi-lo>65536:
            mid=(lo+hi)//2;f.seek(mid);f.readline();line=f.readline()
            if not line:hi=mid;continue
            if json.loads(line)['ts']<ts:lo=f.tell()
            else:hi=mid
        pos=max(0,lo-65536);f.seek(pos)
        if pos:f.readline()
        while True:
            off=f.tell();raw=f.readline()
            assert raw
            x=json.loads(raw)
            if x['ts']>ts:raise AssertionError(ts)
            if x['ts']==ts and x['state'].get('run_id')==expected['state']['run_id']:
                assert x==expected
                return dict(ts=ts,run=x['state']['run_id'],offset=off,sha256=hashlib.sha256(raw).hexdigest())

historical=[]
for run,floor,turn in [('10GPK5XGHCK3',39,1),('10GPK5XGHCK3',39,3),('5PM6JAQG6FNQ',41,3),('R3AJCGQGGMR4',45,4),('HNX4A2WBC34W',33,3)]:
    S=[json.loads(s) for s in (O/run/'states.jsonl').open()]
    candidates=[x for x in S if x['state']['run']['floor']==floor and x['state']['turn']==turn and x['state'].get('combat')]
    if not candidates and run=='5PM6JAQG6FNQ':
        candidates=[x for x in S if any(e['enemy_id']=='ZAPBOT' for e in (x['state'].get('combat') or {}).get('enemies',[]))]
    assert candidates,(run,floor,turn)
    for x in [candidates[0],candidates[-1]]:
        historical.append(seek_frame(x['ts'],x));checks+=1
(O/'historical-original-offsets.json').write_text(json.dumps(historical,ensure_ascii=False,indent=2)+'\n')

def powers(e):return {p['power_id']:p['amount'] for p in e.get('powers',[])}
S=[json.loads(s) for s in (O/RUN/'states.jsonl').open()]
D=[json.loads(s) for s in (O/RUN/'decisions.jsonl').open()]
stamps=[x['ts'] for x in S]
def pair(n):
    d=D[n-1];i=bisect.bisect_left(stamps,d['ts']);assert S[i]['ts']==d['ts']
    return d,S[i]['state'],S[i+1]['state']
d,a,z=pair(576)
assert powers(a['combat']['player'])['DEXTERITY_POWER']==4
assert powers(z['combat']['player'])['DEXTERITY_POWER']==6
assert a['combat']['player']['block']==z['combat']['player']['block']==0
d,a,z=pair(602)
assert powers(a['combat']['player'])['DEXTERITY_POWER']==9
assert powers(a['combat']['enemies'][0])['POISON_POWER']==7
assert z['combat']['player']['block']-a['combat']['player']['block']==16
d,a,z=pair(603)
assert powers(a['combat']['enemies'][0])['STRENGTH_POWER']==8
assert powers(z['combat']['enemies'][0]).get('STRENGTH_POWER',0)==0
assert a['combat']['enemies'][0]['intents'][0]['total_damage']==26
assert z['combat']['enemies'][0]['intents'][0]['total_damage']==18
d,a,z=pair(636)
assert powers(a['combat']['player'])['DEXTERITY_POWER']==1
assert powers(a['combat']['player'])['FRAIL_POWER']==1
assert z['combat']['player']['block']-a['combat']['player']['block']==8
d,a,z=pair(637)
assert a['combat']['enemies'][0]['current_hp']==z['combat']['enemies'][0]['current_hp']==3
assert powers(z['combat']['enemies'][0])['POISON_POWER']==7
assert 17+15-8==24 and 24-21+1==4
checks+=14

evidence=[]
for c in C:
    e=c['after']
    assert e['n_support']==len(set(e['evidence']))
    assert e['n_contradict']==len(set(e.get('contradicting',[])))
    for run in e['evidence']+e.get('contradicting',[]):
        assert len(run)==12 and run in R and R[run]['character'].lower()=='silent'
        checks+=1
    evidence.append(dict(id=e['id'],support=e['evidence'],contradict=e.get('contradicting',[]),by_asc=dict(collections.Counter(R[r]['ascension'] for r in e['evidence']))))
(O/'mechanism-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')

parameters={}
for ident,card,power in [('silent-footwork-block','FOOTWORK','DEXTERITY_POWER'),('silent-deadly-poison-application','DEADLY_POISON',None),('silent-piercing-wail-temporary-strength','PIERCING_WAIL',None),('silent-mirage-poison-card-block','MIRAGE',None)]:
    ev=next(c['after']['evidence'] for c in C if c['id']==ident)
    rows=[x for x in A['cards'] if x['run'] in ev and x['card']==card]
    parameters[ident]=dict(actions=len(rows),runs=len({x['run'] for x in rows}),cases=rows)
for ident,potion in [('silent-dexterity-potion-card-block','DEXTERITY_POTION'),('silent-speed-potion-temporary-dexterity','SPEED_POTION'),('silent-regen-potion-decay-heal','REGEN_POTION')]:
    ev=next(c['after']['evidence'] for c in C if c['id']==ident)
    rows=[x for x in A['potions'] if x['run'] in ev and (x['potion'] or {}).get('id')==potion]
    parameters[ident]=dict(actions=len(rows),runs=len({x['run'] for x in rows}),cases=rows)
(O/'historical-parameters.json').write_text(json.dumps(parameters,ensure_ascii=False,indent=2)+'\n')

metadata=[]
for p in (ROOT/'.worktrees/exp/knowledge/characters/silent').glob('*.json'):
    if p.name=='experience.json':continue
    x=json.load(p.open())
    row=dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x),character=x.get('character'),generated=x.get('generated'))
    row['source_note']=str(x.get('_about') or x.get('note') or '')[:500]
    row['generated_from']=x.get('generated_from')
    if row['character']:assert row['character'].lower()=='silent'
    metadata.append(row)
(O/'other-knowledge.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
(O/'verification.json').write_text(json.dumps(dict(checks=checks,new_original_records=len(manifest),historical_original_records=len(historical),parameter_summary={k:dict(actions=v['actions'],runs=v['runs']) for k,v in parameters.items()}),ensure_ascii=False,indent=2)+'\n')
print('原件/角色/公式核验通过',checks,'项')
