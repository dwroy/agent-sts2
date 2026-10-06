import bisect, collections, json
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
RUN = 'QNTW139MGECA'
S = [json.loads(l) for l in (O/RUN/'states.jsonl').open()]
D = [json.loads(l) for l in (O/RUN/'decisions.jsonl').open()]
times = [s['observed_ts'] for s in S]
assert len(S) == 487 and len(D) == 476
assert all(s['state']['run']['character_id'].lower() == 'silent' for s in S)
for d in D:
    assert S[max(0,bisect.bisect_right(times,d['observed_ts'])-1)]['fingerprint'] == d['fingerprint']

def powers(p): return {q['power_id']:q['amount'] for q in p.get('powers',[])}
def before(d): return S[max(0,bisect.bisect_right(times,d['observed_ts'])-1)]['state']
def after(d): return S[min(bisect.bisect_right(times,d['observed_ts']),len(S)-1)]['state']
def ds(f,t,card):
    return [d for d in D if d['floor']==f and d['turn']==t and d.get('chosen',{}).get('action')=='play_card' and d.get('expect',{}).get('card',{}).get('id')==card]
def one(f,t,card):
    d=ds(f,t,card)[0]
    return before(d)['combat'],after(d)['combat']
def enemy(c): return c['enemies'][0]
def threat(c): return sum(i.get('total_damage') or 0 for e in c['enemies'] if e['is_alive'] for i in e['intents'])

a,z=one(28,3,'PROWESS')
assert powers(z['player'])['STRENGTH_POWER']==powers(z['player'])['DEXTERITY_POWER']==1
assert z['player']['block']==a['player']['block']==0
assert 'TAINTED_POWER' not in powers(z['player'])
a,z=one(28,3,'FOOTWORK')
assert powers(z['player'])['DEXTERITY_POWER']==3 and 'TAINTED_POWER' not in powers(z['player'])
assert [after(d)['combat']['player']['block']-before(d)['combat']['player']['block'] for c in ['DEFEND_SILENT','BACKFLIP'] for d in ds(28,5,c)]==[8,8,8]
assert [powers(after(d)['combat']['player'])['TAINTED_POWER'] for d in D if d['floor']==28 and d['turn']==5 and d.get('chosen',{}).get('action')=='play_card' and d.get('expect',{}).get('card',{}).get('id') in ['DEFEND_SILENT','BACKFLIP']]==[6,12,18]
assert [threat(after(d)['combat']) for d in D if d['floor']==28 and d['turn']==5 and d.get('chosen',{}).get('action')=='play_card' and d.get('expect',{}).get('card',{}).get('id') in ['DEFEND_SILENT','BACKFLIP']]==[21,27,33]
a,z=one(28,4,'PIERCING_WAIL')
assert powers(enemy(a))['STRENGTH_POWER']==-2 and powers(enemy(z))['STRENGTH_POWER']==-8
end4=before(next(d for d in D if (d['floor'],d['turn'],d.get('chosen',{}).get('action'))==(28,4,'end_turn')))['combat']
assert threat(end4)==end4['player']['block']==8
start5=before(next(d for d in D if d['floor']==28 and d['turn']==5 and d['screen']=='COMBAT'))['combat']
assert powers(enemy(start5))['STRENGTH_POWER']==-2
for t,n in [(1,3),(5,6),(9,9)]:
    c=before(next(d for d in D if d['floor']==28 and d['turn']==t and d['screen']=='COMBAT'))['combat']
    assert powers(enemy(c))['VITAL_SPARK_POWER']==n
a,z=one(17,2,'FOOTWORK')
assert a['player']['block']==z['player']['block']==5 and powers(z['player'])['DEXTERITY_POWER']==2
a,z=one(17,2,'SURVIVOR')
assert z['player']['block']-a['player']['block']==10 and z['player']['block']==15
assert sum(after(d)['combat']['player']['block']-before(d)['combat']['player']['block'] for d in ds(17,8,'DEFEND_SILENT'))==14
a,z=one(17,4,'MALAISE')
assert a['player']['energy']==3 and powers(enemy(a))['STRENGTH_POWER']==4
assert powers(enemy(z))['STRENGTH_POWER']==1 and powers(enemy(z))['WEAK_POWER']==3
assert threat(a)==24 and threat(z)==15 and z['player']['block']==0
assert not ds(28,1,'BURST')
assert not any(d.get('chosen',{}).get('action')=='play_card' and d.get('expect',{}).get('card',{}).get('id')=='SERPENT_FORM' for d in D)
last=S[-1]['state']
assert last['run']['current_hp']==0 and last['combat']['enemies'][0]['current_hp']==2
terminal=before(next(d for d in D if d['floor']==28 and d['turn']==9 and d.get('chosen',{}).get('action')=='end_turn'))['combat']
assert terminal['player']['current_hp']==6 and terminal['player']['block']==8 and threat(terminal)==24
assert enemy(terminal)['current_hp']==5 and powers(enemy(terminal))['POISON_POWER']==3

burrows=[]
all_runs=json.load(open(O/'runs.json'))
for run in all_runs:
    prev=None
    for line in (O/run/'states.jsonl').open():
        r=json.loads(line);s=r['state'];c=s.get('combat')
        if not c or s['screen']!='COMBAT':prev=None;continue
        e=next((e for e in c['enemies'] if e['enemy_id']=='TUNNELER'),None)
        if not e:prev=None;continue
        row=dict(run=run,ts=r['ts'],floor=s['run']['floor'],turn=s['turn'],asc=s['run']['ascension'],hp=e['current_hp'],block=e['block'],burrow='BURROWED_POWER' in powers(e),move=e.get('move_id'),threat=threat(c),player_hp=c['player']['current_hp'])
        if prev and (prev['floor'],prev['turn'])==(row['floor'],row['turn']) and prev['burrow'] and not row['burrow'] and row['hp']>0 and row['block']==0:
            assert row['move']=='STUNNED' and row['threat']==0
            burrows.append(dict(before=prev,after=row))
        prev=row
(O/'tunneler-draft-facts.json').write_text(json.dumps(burrows,ensure_ascii=False,indent=2)+'\n')
print('埋地原始触发', [(r['after']['run'], r['after']['floor'], r['after']['turn']) for r in burrows],flush=True)
assert {r['after']['run'] for r in burrows}=={'LRN0HPZ0FZS1','ZZMYZ5UBCG72','HMVJKM56S4Q8','F4QKG4J1AJJZ','PU80F84P6HPN','VPW8YH7A4QFM',RUN}
assert [(r['before']['block'],r['after']['hp'],r['before']['threat']) for r in burrows]==[(7,29,17),(7,29,23),(37,32,26),(17,44,26),(3,21,26),(8,34,15),(5,24,23)]
(O/'tunneler-facts.json').write_text(json.dumps(burrows,ensure_ascii=False,indent=2)+'\n')

B=json.load(open(O/'experience-before.json'))
feather=next(e for e in B['entries'] if e['id']=='silent-eternal-feather-rest-arrival-heal')
arrivals=[]
for run in feather['evidence']+[RUN]:
    prev=None
    for line in (O/run/'states.jsonl').open():
        r=json.loads(line);s=r['state']
        if prev and prev['screen']=='MAP' and s['screen']=='REST' and any(q.get('relic_id')=='ETERNAL_FEATHER' for q in s['run'].get('relics',[])):
            n=len(s['run']['deck']);a=prev['run']['current_hp'];z=s['run']['current_hp'];cap=s['run']['max_hp']
            assert z-a==min(cap-a,3*(n//5)),(run,n,a,z)
            arrivals.append(dict(run=run,floor=s['run']['floor'],cards=n,before=a,after=z,gain=z-a))
        prev=s
assert len([a for a in arrivals if a['run']!=RUN])==55
assert [a['gain'] for a in arrivals if a['run']==RUN]==[12,12,15]
(O/'feather-facts.json').write_text(json.dumps(arrivals,ensure_ascii=False,indent=2)+'\n')
print('487帧/476指纹、力敏/污染/临时减力/萎靡/死亡截断、全历史七次埋地清盾及58次羽毛到火校验通过')
