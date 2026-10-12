import collections
import hashlib
import json
import re
from pathlib import Path

O = Path(__file__).parent
B, X = 'BTSRF7JL1W1Y', 'XTSV1U9JD34T'
def read(name): return json.load(open(O/name))
A = read('audit.json')
F = {n: read(n+'/facts.json') for n in [B,X]}
def one(n,f,t,c,a=1): return next(r for r in F[n] if (r['floor'],r['turn'],r['card'],r['attempt'])==(f,t,c,a))
def end(n,f,t,a=1): return next(r for r in F[n] if (r['floor'],r['turn'],r['attempt'],r['action'])==(f,t,a,'end_turn'))
def enemy(s,e): return next(x for x in s['enemies'] if x['id']==e)
def damage(e): return sum(x.get('total_damage') or 0 for x in e['intents'])
def power(s,p): return s['powers'].get(p,0)
fb=one(B,17,5,'FOOTWORK',4)
assert power(fb['after'],'DEXTERITY_POWER')==3
defs=[r for r in F[B] if (r['floor'],r['turn'],r['attempt'],r['card'])==(17,5,4,'DEFEND_SILENT')]
assert len(defs)==2 and all(r['after']['block']-r['before']['block']==8 for r in defs)
sur=one(B,31,2,'SURVIVOR')
assert [c['id'] for c in sur['before']['hand']]==['SURVIVOR','SUCKER_PUNCH']
assert sur['after']['hand']==[]
eb=end(B,31,2)
assert (eb['before']['hp'],eb['after']['hp'],eb['before']['block'])==(35,21,13)
assert power(eb['before'],'PLATING_POWER')==3
sh=one(B,31,2,'DARK_SHACKLES')
assert enemy(sh['after'],'BOWLBUG_ROCK')['powers']['STRENGTH_POWER']==-9
assert damage(enemy(sh['before'],'BOWLBUG_ROCK'))==16
assert damage(enemy(sh['after'],'BOWLBUG_ROCK'))==7
for t,poison,hp in [(2,2,None),(3,3,None),(4,4,None)]:
    row=end(B,31,t)
    assert enemy(row['before'],'SLUMBERING_BEETLE')['powers']['POISON_POWER']==poison
last=end(B,31,4)
assert (last['before']['hp'],last['before']['block'],last['after']['hp'])==(14,5,0)
assert power(last['before'],'PLATING_POWER')==1
assert damage(enemy(last['before'],'SLUMBERING_BEETLE'))==22
assert enemy(last['after'],'SLUMBERING_BEETLE')['hp']==13
sa=end(X,48,8)
assert power(sa['before'],'ACCELERANT_POWER')==2
assert enemy(sa['before'],'AEONGLASS')['powers']['POISON_POWER']==54
assert (enemy(sa['before'],'AEONGLASS')['hp'],sa['before']['hp'],sa['after']['hp'])==(132,32,23)
assert any(c['id']=='WITHER' and '9' in c['text'] for c in sa['before']['hand'])
fx=one(X,49,3,'FOOTWORK',6)
assert power(fx['after'],'DEXTERITY_POWER')==3
assert fx['before']['block']==fx['after']['block']==5
night=one(X,49,4,'NIGHTMARE',6)
dx=one(X,49,4,'DEFEND_SILENT',6)
assert power(dx['before'],'NIGHTMARE_POWER')==3
assert dx['after']['block']-dx['before']['block']==6
w=one(X,49,4,'PIERCING_WAIL',6)
assert (enemy(w['before'],'TORCH_HEAD_AMALGAM')['powers']['STRENGTH_POWER'],enemy(w['after'],'TORCH_HEAD_AMALGAM')['powers']['STRENGTH_POWER'])==(1,-5)
assert (damage(enemy(w['before'],'TORCH_HEAD_AMALGAM')),damage(enemy(w['after'],'TORCH_HEAD_AMALGAM')))==(25,16)
lx=end(X,49,4,6)
assert (lx['before']['hp'],lx['before']['block'],lx['after']['hp'])==(1,6,0)
assert {e['id']:e['hp'] for e in lx['after']['enemies']}=={'QUEEN':401,'TORCH_HEAD_AMALGAM':168}
for n,expected in [(B,(653,635,28)),(X,(810,775,49))]:
    states=list(map(json.loads,(O/n/'states.jsonl').open()))
    decisions=list(map(json.loads,(O/n/'decisions.jsonl').open()))
    brain=list(map(json.loads,(O/n/'brain.jsonl').open()))
    assert (len(states),len(decisions),len(brain))==expected
    assert all(s['state']['run']['character_id'].lower()=='silent' and s['state']['run_id']==n for s in states)
    assert all(b['engine']=='codex' for b in brain)
    assert not (O/n/'deepseek-reasoning.jsonl').read_bytes()
assert all(v['identical'] for v in read('baseline-check.json').values())
meta={r['run_id']:r for r in read('run-metadata.json')}
assert len(meta)==115 and sum(r['ascension']==10 for r in meta.values())==75
data=json.load(open(O.parents[2]/'knowledge/characters/silent/experience.json'))
old={e['id']:e for e in read('experience-before.json')['entries']}
mechanisms=[]
for e in data['entries']:
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
    assert len(e['evidence'])==len(set(e['evidence']))==e['n_support']
    assert len(e.get('contradicting',[]))==e['n_contradict']
    assert all(re.fullmatch('[A-Z0-9]{12}',r) and r in meta for r in e['evidence']+e.get('contradicting',[]))
    if e['scope'].split(':')[0] in ['card','relic','potion','event']: assert e.get('name')
    assert 0<=e['asc'][0]<=e['asc'][1]<=20
    if e!=old[e['id']]:
        assert e['status']=='active' and e['last_seen']=='2026-10-08'
        assert e['evidence'][:len(old[e['id']]['evidence'])]==old[e['id']]['evidence']
        assert e['asc']==old[e['id']]['asc']
        scoped=e['scope'].split(':',1)[1]
        occurrences=[r for r in A['cards'] if r['run'] in e['evidence'] and r['card']==scoped] if e['scope'].startswith('card:') else []
        mechanisms.append(dict(id=e['id'],support=e['evidence'],contradicting=e.get('contradicting',[]),asc=dict(collections.Counter(str(meta[r]['ascension']) for r in e['evidence'])),old_windows=sum(r['run'] not in [B,X] for r in occurrences),new_windows=sum(r['run'] in [B,X] for r in occurrences),examples=occurrences))
assert len(mechanisms)==21
(O/'mechanism-evidence.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
for f,row in read('other-knowledge.json').items():
    assert hashlib.sha256((O.parents[2]/'knowledge/characters/silent'/f).read_bytes()).hexdigest()==row['sha256']
print('旧基线、两局原帧与关键机制、角色/字段/条目预算和其他知识哈希全部通过')
