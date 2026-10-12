import bisect
import collections
import hashlib
import json
import re
from pathlib import Path

O = Path(__file__).parent
K = O.parents[2] / 'knowledge'
RUN = 'RC61MFQM63Y6'
A = json.load(open(O/'audit.json'))
C = json.load(open(O/'changes.json'))
X = json.load(open(O/'experience-before.json'))
Y = json.load(open(K/'characters/silent/experience.json'))
meta = {r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
assert len(meta)==113 and all(r['character'].lower()=='silent' for r in meta.values())
assert max(r['ended'] for r in meta.values())=='2026-10-07T17:26:17.487Z'
assert sum(r['ascension']==10 for r in meta.values())==73
assert all(r['identical'] for r in json.load(open(O/'baseline-check.json')).values())
assert (len(A['fights']),sum(r['death'] for r in A['fights']))==(1650,103)
old={e['id']:e for e in X['entries']}
changed=[]
for e in Y['entries']:
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
    assert all(re.fullmatch('[A-Z0-9]{12}',r) and r in meta for r in e['evidence'])
    assert len(e['evidence'])==len(set(e['evidence']))==e['n_support']
    assert len(e.get('contradicting',[]))==e['n_contradict']
    assert 0<=e['asc'][0]<=e['asc'][1]<=20
    if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')
    if e!=old[e['id']]:
        changed.append(e['id'])
        assert e['evidence']==old[e['id']]['evidence']+[RUN]
        assert e['last_seen']=='2026-10-08'
        assert e['asc']==old[e['id']]['asc']
assert set(changed)==set(C['updated']) and len(changed)==15
active=[e for e in Y['entries'] if e['status']=='active']
assert len(active)==159 and sum(len(e['lesson']) for e in active)<=55000
for f,row in json.load(open(O/'other-knowledge.json')).items():
    assert hashlib.sha256((K/'characters/silent'/f).read_bytes()).hexdigest()==row['sha256']

P=O/RUN
S=[json.loads(l) for l in (P/'states.jsonl').open()]
D=[json.loads(l) for l in (P/'decisions.jsonl').open()]
B=[json.loads(l) for l in (P/'brain.jsonl').open()]
F=json.load(open(P/'facts.json'))
assert (len(S),len(D),len(B))==(694,674,33)
assert all(s['state']['run']['character_id'].lower()=='silent' and s['state']['run_id']==RUN for s in S)
assert all(b['engine']=='codex' for b in B)
assert not (P/'deepseek-reasoning.jsonl').read_bytes()
SM={s['ts']:s['state'] for s in S}
assert all(d['ts'] in SM for d in D)
def one(floor,turn,card,attempt=1):
    return next(r for r in F if (r['floor'],r['turn'],r['card'],r['attempt'])==(floor,turn,card,attempt))
def end(floor,turn,attempt=1):
    return next(r for r in F if (r['floor'],r['turn'],r['attempt'],r['action'])==(floor,turn,attempt,'end_turn'))
def enemy(v,name):return next(e for e in v['enemies'] if e['id']==name)
def damage(e):return sum(i.get('total_damage') or 0 for i in e['intents'])
acc=one(33,1,'ACCELERANT',6)
assert acc['after']['powers']['ACCELERANT_POWER']==1
assert enemy(acc['before'],'CRUSHER')['powers']['POISON_POWER']==3
assert acc['before']['block']==acc['after']['block']==0
for turn,poison,loss in [(1,3,5),(3,5,9),(4,6,11)]:
    e=end(33,turn,6)
    target='CRUSHER' if turn==1 else 'ROCKET'
    before,after=enemy(e['before'],target),enemy(e['after'],target)
    assert before['powers']['POISON_POWER']==poison
    assert before['hp']-after['hp']==loss
    assert after['powers']['POISON_POWER']==poison-2
first,last=end(33,1,1),end(33,1,6)
assert (first['before']['block'],last['before']['block'])==(16,12)
assert (first['before']['hp']-first['after']['hp'],last['before']['hp']-last['after']['hp'])==(4,8)
for attempt in [1,3]:
    r=one(33,4,'SURVIVOR',attempt)
    assert r['before']['powers']['DEXTERITY_POWER']==2 and r['after']['block']==7
    st=SM[r['ts']]
    assert [c['card_id'] for c in st['combat']['hand']]==['SURVIVOR','STRIKE_SILENT']
    t=next(s['state'] for s in S if s['ts']>r['ts'])
    assert t['combat']['hand']==[]
    if attempt==3:assert damage(enemy(r['after'],'ROCKET'))==57
defends=[r for r in F if (r['floor'],r['turn'],r['attempt'],r['card'])==(33,4,6,'DEFEND_SILENT')]
assert len(defends)==2 and all(r['after']['block']-r['before']['block']==3 for r in defends)
terminal=end(33,4,6)
assert (terminal['before']['hp'],terminal['before']['block'])==(31,6)
assert damage(enemy(terminal['before'],'ROCKET'))==38
assert terminal['after']['hp']==0
assert [(e['id'],e['hp']) for e in terminal['after']['enemies']]==[('CRUSHER',167),('ROCKET',149)]
fysh=end(17,11)
assert (fysh['before']['hp'],fysh['after']['hp'])==(8,2)
assert sum(damage(e) for e in fysh['before']['enemies'])==0
assert any(c['card_id']=='BECKON' for c in SM[fysh['ts']]['combat']['hand'])
fumes=one(17,2,'NOXIOUS_FUMES')
assert fumes['after']['powers']['NOXIOUS_FUMES_POWER']==3
assert enemy(fumes['before'],'SOUL_FYSH')['powers']['POISON_POWER']==enemy(fumes['after'],'SOUL_FYSH')['powers']['POISON_POWER']==7
assert not any(r['card'] in ['NOXIOUS_FUMES','PHANTOM_BLADES'] and r['floor']==33 and r['attempt']==6 for r in F)
ant=one(23,3,'ANTICIPATE')
assert (ant['after']['powers']['ANTICIPATE_POWER'],ant['after']['powers']['DEXTERITY_POWER'],ant['after']['powers']['STRENGTH_POWER'])==(2,1,-1)
speed=next(r for r in F if (r['floor'],r['turn'],r['action'])==(23,3,'use_potion'))
assert speed['before']['powers']['DEXTERITY_POWER']==1 and speed['after']['powers']['DEXTERITY_POWER']==6
assert speed['after']['powers']['SPEED_POTION_POWER']==5
cloak,defend=one(23,3,'CLOAK_AND_DAGGER'),one(23,3,'DEFEND_SILENT')
assert cloak['after']['block']==12 and cloak['after']['powers']['DEXTERITY_POWER']==5
assert defend['before']['powers']['DEXTERITY_POWER']==4 and defend['after']['block']-defend['before']['block']==9
for key in ['SPEED_POTION_POWER','ANTICIPATE_POWER','DEXTERITY_POWER','STRENGTH_POWER']:
    assert end(23,3)['after']['powers'].get(key,0)==0
shiv=one(23,3,'SHIV')
assert shiv['before']['enemies']==shiv['after']['enemies']
assert shiv['after']['block']-shiv['before']['block']==4
phantom=one(29,3,'PHANTOM_BLADES')
assert phantom['after']['powers']['PHANTOM_BLADES_POWER']==9
assert phantom['before']['block']==phantom['after']['block']==5
knife=one(29,4,'SHIV')
assert enemy(knife['before'],'BOWLBUG_ROCK')['hp']-enemy(knife['after'],'BOWLBUG_ROCK')['hp']==14
assert len([r for r in F if (r['floor'],r['turn'],r['card'])==(29,4,'SHIV')])==1

fights=[f for f in A['fights'] if f['run']==RUN]
assert [(f['floor'],f['hp'],f['last_hp']) for f in fights]==[(2,56,56),(3,56,46),(4,46,44),(5,44,23),(7,23,8),(12,29,23),(14,44,44),(17,59,2),(19,56,56),(20,56,46),(21,46,29),(23,44,20),(29,62,31),(33,52,0)]
assert sum(f['loss'] for f in fights[:-1])==193
assert sum(f['loss'] for f in fights if 18<f['floor']<33)==82
rests=[r for r in A['rests'] if r['run']==RUN]
assert len(rests)==7 and sum(r['after']-r['before'] for r in rests)==105
sl=[json.loads(l) for l in (P/'sl-attempts.jsonl').open()]
assert [a['result'] for a in sl]==['won']+['predicted_death']*5+['died']
assert sum(52-a['end_hp'] for a in sl[1:-1])==197
assert sum(d['chosen'].get('action')=='use_potion' for d in D)==15
assert not any(d['chosen'].get('action')=='discard_potion' for d in D)

# Recheck the complete inherited speed-potion denominator from own-character states.
speed_e=next(e for e in Y['entries'] if e['id']=='silent-speed-potion-temporary-dexterity')
windows=[]
for run in speed_e['evidence']:
    ss=[json.loads(l) for l in (O/run/'states.jsonl').open()]
    times=[s['ts'] for s in ss]
    by={s['ts']:s['state'] for s in ss}
    for d in map(json.loads,(O/run/'decisions.jsonl').open()):
        if d.get('chosen',{}).get('action')!='use_potion' or d.get('expect',{}).get('potion',{}).get('id')!='SPEED_POTION' or not str(d.get('result','')).startswith('completed'):continue
        a=by[d['ts']]
        z=ss[min(bisect.bisect_right(times,d['ts']),len(ss)-1)]['state']
        def pp(s):return {p['power_id']:p['amount'] for p in s['combat']['player'].get('powers',[])}
        pa,pz=pp(a),pp(z)
        assert pz.get('DEXTERITY_POWER',0)-pa.get('DEXTERITY_POWER',0)==5
        assert pz.get('SPEED_POTION_POWER',0)-pa.get('SPEED_POTION_POWER',0)==5
        later=next((s['state'] for s in ss if s['ts']>d['ts'] and s['state']['run']['floor']==d['floor'] and s['state'].get('combat') and s['state'].get('turn',0)>d['turn']),None)
        if later:assert pp(later).get('SPEED_POTION_POWER',0)==0
        windows.append(dict(run=run,floor=d['floor'],turn=d['turn'],before=pa,after=pz,next=pp(later) if later else None))
assert len(windows)==41 and len({w['run'] for w in windows})==35
(O/'speed-potion-windows.json').write_text(json.dumps(windows,ensure_ascii=False,indent=2)+'\n')
history=[]
for c in C['entries']:
    e=c['after']
    matching=[r for r in A['cards'] if r['run'] in c['before']['evidence'] and e['scope'].startswith('card:') and r['card']==e['scope'].split(':')[1]]
    history.append(dict(id=e['id'],support=e['n_support'],contradict=e['n_contradict'],asc_counts=dict(collections.Counter(meta[r]['ascension'] for r in e['evidence'])),inherited_card_windows=len(matching),note='旧支持/子公式边界保持；新增子窗口不外推为所有n局都验证同一组合。'))
(O/'mechanism-evidence.json').write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n')
result=dict(character='silent',completed_runs=113,cutoff=A['cutoff'],fights=1650,deaths=103,active=159,chars=C['chars_after'],changed=15,states=694,decisions=674,brain_codex=33,deepseek=0,baseline='七数组/血档/节点转移/回复/SL逐行一致',speed_potion_runs=35,speed_potion_windows=41,other_knowledge='八文件未变')
(O/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(result)
