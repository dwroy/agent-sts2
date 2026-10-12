import bisect, collections, hashlib, json
from pathlib import Path

O = Path(__file__).parent
A = json.load(open(O/'audit.json'))
RUN = '9R916WW0V65N'
R = {r['run_id']: r for r in json.load(open(O/'run-metadata.json'))}
targets = {'BATTLE_TRANCE', 'FOOTWORK', 'AFTERIMAGE', 'ROLLING_BOULDER', 'ACCURACY'}
rows = [r for r in A['cards'] if r['card'] in targets]
(O/'mechanism-actions.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2)+'\n')
summary = {c: dict(runs=list(dict.fromkeys(r['run'] for r in rows if r['card']==c)),
                   actions=sum(r['card']==c for r in rows)) for c in sorted(targets)}
(O/'mechanism-counts.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n')
trances = []
for run in summary['BATTLE_TRANCE']['runs']:
    S = [json.loads(s) for s in (O/run/'states.jsonl').open()]
    assert all(s['state']['run']['character_id'].lower()=='silent' for s in S)
    stamps = [s['ts'] for s in S]
    for r in rows:
        if r['run']!=run or r['card']!='BATTLE_TRANCE': continue
        i = bisect.bisect_left(stamps, r['ts']); b=S[i]['state']; z=S[min(i+1,len(S)-1)]['state']
        assert S[i]['ts']==r['ts']
        bh=b['combat']['hand']; zh=(z.get('combat') or {}).get('hand',[])
        appended=len(zh)-len(bh)+1
        assert r['after']['powers'].get('NO_DRAW_POWER')==1
        assert appended in [1,3,4], (run,r['floor'],r['turn'],appended)
        if appended==1: assert len(bh)==10 and len(zh)==10
        if appended==4: assert any(c['card_id']=='WITHER' for c in zh)
        trances.append(dict(r,hand_before=[c['card_id'] for c in bh],hand_after=[c['card_id'] for c in zh],net_added=appended))
(O/'trance-hands.json').write_text(json.dumps(trances, ensure_ascii=False, indent=2)+'\n')

S=[json.loads(s) for s in (O/RUN/'states.jsonl').open()]
D=[json.loads(s) for s in (O/RUN/'decisions.jsonl').open()]
T=[s['ts'] for s in S]
assert len(S)==1405 and len(D)==1165
potions=[]
for run in A['runs']:
    ds=[json.loads(s) for s in (O/run/'decisions.jsonl').open()]
    drinks=[d for d in ds if (d.get('chosen') or {}).get('action')=='use_potion' and str(d.get('result','')).startswith('completed')]
    if not drinks: continue
    ss=[json.loads(s) for s in (O/run/'states.jsonl').open()]; tt=[s['ts'] for s in ss]
    for d in drinks:
        i=bisect.bisect_left(tt,d['ts']); b=ss[i]['state']; z=ss[min(i+1,len(ss)-1)]['state']
        assert tt[i]==d['ts']
        def pw(st): return {q['power_id']:q['amount'] for q in (st.get('combat') or {}).get('player',{}).get('powers',[])}
        potions.append(dict(run=run,floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,
                            potion=d['expect']['potion']['id'],before=pw(b),after=pw(z),ts=d['ts']))
for potion,power,increment in [('DEXTERITY_POTION','DEXTERITY_POWER',2),('REGEN_POTION','REGEN_POWER',5)]:
    pp=[p for p in potions if p['potion']==potion]
    assert all(p['after'].get(power,0)-p['before'].get(power,0)==increment for p in pp)
(O/'historical-potions.json').write_text(json.dumps(potions,ensure_ascii=False,indent=2)+'\n')

handoffs=[]
for f in A['fights']:
    if f['floor']!=48 or f['death']:continue
    nxt=next((q for q in A['fights'] if q['run']==f['run'] and q['floor']==49),None)
    if nxt:handoffs.append(dict(run=f['run'],asc=f['asc'],first=f,second=nxt))
assert len(handoffs)==8 and all(h['first']['last_hp']==h['second']['hp'] and h['second']['death'] for h in handoffs)
(O/'double-boss-handoffs.json').write_text(json.dumps(handoffs,ensure_ascii=False,indent=2)+'\n')

new=[f for f in A['fights'] if f['run']==RUN]
assert len(new)==21 and sum(f['death'] for f in new)==1
assert [(f['floor'],f['hp'],f['last_hp']) for f in new[-5:]]==[(42,68,37),(43,37,1),(45,23,3),(48,25,12),(49,12,0)]
assert all(f['type']!='unclassified' for f in new), new
final=S[-1]['state']; assert final['run']['current_hp']==0
checkpoints=[]
for floor,turn,attempt in [(48,1,3),(48,15,3),(49,1,6),(49,2,6),(49,2,2),(49,3,2)]:
    dd=[d for d in D if (d['floor'],d['turn'],d.get('sl_attempt') or 1)==(floor,turn,attempt)]
    for d in dd:
        i=bisect.bisect_left(T,d['ts'])
        checkpoints.append(dict(decision=d,before=S[i],after=S[min(i+1,len(S)-1)]))
(O/'new-checkpoints.json').write_text(json.dumps(checkpoints,ensure_ascii=False,indent=2)+'\n')
other=[]
for p in sorted(Path('knowledge/characters/silent').glob('*.json')):
    if p.name=='experience.json':continue
    x=json.load(open(p));other.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x)[:15],metadata={k:x[k] for k in ['character','generated','generated_at','ascension','limitation'] if k in x}))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
print('已核',len(trances),'次普通专注、',len(handoffs),'局连续Boss、',len(new),'个新战斗房；药水逐饮验证通过。')
