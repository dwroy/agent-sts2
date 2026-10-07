import collections
import hashlib
import json
import re
from pathlib import Path

O = Path(__file__).parent
N = '9Z9H2EXKLF3T'
def read(p): return json.load(open(O/p))
A = read('audit.json')
F = read(N+'/facts.json')
S = [json.loads(x) for x in (O/N/'states.jsonl').open()]
D = [json.loads(x) for x in (O/N/'decisions.jsonl').open()]
brain = [json.loads(x) for x in (O/N/'brain.jsonl').open()]
def one(t,c): return next(r for r in F if (r['floor'],r['turn'],r['card'],r['attempt'])==(48,t,c,3))
def end(t): return next(r for r in F if (r['floor'],r['turn'],r['action'],r['attempt'])==(48,t,'end_turn',3))
def power(x,p): return x['powers'].get(p,0)
assert (len(S),len(D),len(brain))==(1018,932,51)
assert all(x['state']['run']['character_id'].lower()=='silent' and x['state']['run_id']==N for x in S)
assert all(x['engine']=='codex' for x in brain)
assert not (O/N/'deepseek-reasoning.jsonl').read_bytes()
assert power(one(2,'NOXIOUS_FUMES')['after'],'NOXIOUS_FUMES_POWER')==3
assert power(one(4,'NOXIOUS_FUMES')['after'],'NOXIOUS_FUMES_POWER')==6
acc=one(3,'ACCELERANT')
assert power(acc['after'],'ACCELERANT_POWER')==1
assert power(acc['before']['enemies'][0],'POISON_POWER')==power(acc['after']['enemies'][0],'POISON_POWER')==3
assert power(one(5,'FOOTWORK')['after'],'DEXTERITY_POWER')==2
shadow=one(8,'SHADOWMELD');cloak=one(8,'CLOAK_AND_DAGGER')
assert shadow['before']['block']==shadow['after']['block']==0
assert cloak['after']['block']-cloak['before']['block']==32
defs=[r for r in F if (r['floor'],r['turn'],r['card'],r['attempt'])==(48,10,'DEFLECT',3)]
assert [r['after']['block']-r['before']['block'] for r in defs]==[18,9]
e8=end(8);e10=end(10);e11=end(11)
assert (e8['before']['hp'],e8['before']['block'],e8['after']['hp'])==(11,32,0)
assert next(x['state']['run']['current_hp'] for x in S if x['ts']>e8['ts'] and x['state']['run']['floor']==48 and x['state']['turn']==9)==20
assert (e10['before']['hp'],e10['before']['block'],e10['after']['hp'])==(18,37,3)
assert len([c for c in e10['before']['hand'] if c['id']=='WITHER' and '12' in c['text']])==2
assert (e11['before']['hp'],e11['before']['block'],e11['after']['hp'])==(3,0,0)
assert not any(c['id']=='WITHER' for c in e11['before']['hand'])
enemy=e11['before']['enemies'][0]
assert (enemy['hp'],power(enemy,'POISON_POWER'),power(enemy,'STRENGTH_POWER'))==(112,39,12)
assert sum(i.get('total_damage') or 0 for i in enemy['intents'])==48
assert e11['after']['enemies'][0]['hp']==112-39-38-3==32
assert power(e8['before']['enemies'][0],'STRENGTH_POWER')==6
assert sum(i.get('total_damage') or 0 for i in e8['before']['enemies'][0]['intents'])==36
fights=[r for r in A['fights'] if r['run']==N]
assert len(fights)==20 and sum(r['death'] for r in fights)==1
assert [(r['floor'],r['hp'],r['last_hp'],r['loss']) for r in fights if r['floor']>=35]==[(35,66,30,36),(38,30,19,11),(39,19,11,8),(45,31,7,24),(48,27,0,27)]
assert next(r['type'] for r in fights if r['floor']==38)=='Unknown'
rests=[r for r in A['rests'] if r['run']==N]
assert len(rests)==9
assert sum(r['after']-r['before'] for r in rests)==125
assert sum((r.get('chosen') or {}).get('action')=='use_potion' for r in D)==22
assert not any((r.get('chosen') or {}).get('action')=='discard_potion' for r in D)
attempts=[r for r in A['attempts'] if r['run']==N and r['floor']==48]
assert [(r['attempt'],r['result']) for r in attempts]==[(1,'predicted_death'),(2,'predicted_death'),(3,'died')]
assert all(v['identical'] for v in read('baseline-check.json').values())
meta={r['run_id']:r for r in read('run-metadata.json')}
assert len(meta)==116 and sum(r['ascension']==10 for r in meta.values())==76
assert all(r['character'].lower()=='silent' for r in meta.values())
K=O.parents[2]/'knowledge/characters/silent'
data=json.load(open(K/'experience.json'))
old={e['id']:e for e in read('experience-before.json')['entries']}
changed={c['id']:c for c in read('changes.json')['entries']}
mechanisms=[]
for e in data['entries']:
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
    assert len(e['evidence'])==len(set(e['evidence']))==e['n_support']
    assert len(e.get('contradicting',[]))==e['n_contradict']
    assert all(re.fullmatch('[A-Z0-9]{12}',r) and r in meta for r in e['evidence']+e.get('contradicting',[]))
    if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')
    assert 0<=e['asc'][0]<=e['asc'][1]<=20
    if e['id'] in changed:
        assert e['status']=='active' and e['last_seen']=='2026-10-08'
        if e['id'] in old:
            assert e['evidence'][:-1]==old[e['id']]['evidence'] and e['evidence'][-1]==N
            assert e['asc']==old[e['id']]['asc']
        card=e['scope'].split(':',1)[1]
        windows=[r for r in A['cards'] if r['run'] in e['evidence'] and r['card']==card] if e['scope'].startswith('card:') else []
        mechanisms.append(dict(id=e['id'],support=e['evidence'],contradicting=e.get('contradicting',[]),asc=dict(collections.Counter(str(meta[r]['ascension']) for r in e['evidence'])),old_windows=sum(r['run']!=N for r in windows),new_windows=sum(r['run']==N for r in windows),examples=windows))
assert len(mechanisms)==15
assert sum(len(e['lesson']) for e in data['entries'] if e['status']=='active')==54254
(O/'mechanism-evidence.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
power_rows=[]
for card,power_id in [('FOOTWORK','DEXTERITY_POWER'),('NOXIOUS_FUMES','NOXIOUS_FUMES_POWER'),('ACCELERANT','ACCELERANT_POWER')]:
    rows=[r for r in A['cards'] if r['card']==card]
    delta=collections.Counter(power(r['after'],power_id)-power(r['before'],power_id) for r in rows)
    power_rows.append(dict(card=card,runs=len({r['run'] for r in rows}),windows=len(rows),net_deltas=dict(delta),exceptions=[r for r in rows if power(r['after'],power_id)-power(r['before'],power_id) not in ([2,3] if card!='ACCELERANT' else [1,2])]))
(O/'historical-power-deltas.json').write_text(json.dumps(power_rows,ensure_ascii=False,indent=2)+'\n')
for f,row in read('other-knowledge.json').items():assert hashlib.sha256((K/f).read_bytes()).hexdigest()==row['sha256']
print('旧基线、新局实帧、历史机制窗口、跨幕转换、字段/角色/预算、其他知识哈希通过')
print([{k:v for k,v in r.items() if k!='exceptions'} for r in power_rows])
