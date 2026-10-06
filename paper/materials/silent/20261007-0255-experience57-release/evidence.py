import collections,json
from pathlib import Path
O=Path(__file__).parent;A=json.load(open(O/'audit.json'));E={e['id']:e for e in json.load(open(O/'experience-before.json'))['entries']};R={r['run_id']:r for r in json.load(open(O/'CRK2HNYKSCZC/completed-runs.json'))};DP='DPYF2BAA3DKT';CR='CRK2HNYKSCZC'
for e in E.values():
 for r in e['evidence']+e.get('contradicting',[]):assert (R[r].get('character') or '').lower()=='silent',(e['id'],r)
C=A['cards'];T=A['ends'];fact=[]
def card(r,f,t,k,att=1):return next(x for x in C if (x['run'],x['floor'],x['turn'],x['card'],x['attempt'])==(r,f,t,k,att))
def end(r,f,t,att=1):return next(x for x in T if (x['run'],x['floor'],x['turn'],x['attempt'])==(r,f,t,att))
def pow(x,k):return x['powers'].get(k,0)
def hit(x):return sum(i.get('total_damage') or 0 for e in x['enemies'] for i in e['intents'])
for t,p,hp_loss in [(4,12,23),(5,21,21),(6,23,0),(7,29,28)]:
 x=end(DP,48,t,6);enemy=x['before']['enemies'][0]
 assert pow(x['before'],'ACCELERANT_POWER')==3
 assert pow(enemy,'POISON_POWER')==p,(t,enemy)
 assert x['before']['hp']-x['after']['hp']==hp_loss
 poison=sum(max(0,p-i) for i in range(4));assert poison=={4:42,5:78,6:86,7:110}[t]
 fact.append(dict(mechanism='触媒',turn=t,poison=p,settled=poison,before=x['before'],after=x['after']))
x=card(DP,48,5,'ANTICIPATE',6);assert (pow(x['after'],'DEXTERITY_POWER'),pow(x['after'],'ANTICIPATE_POWER'),x['after']['block']-x['before']['block'])==(2,2,1)
x=card(DP,48,5,'DEFEND_SILENT',6);assert x['after']['block']-x['before']['block']==8
assert pow(end(DP,48,6,6)['before'],'DEXTERITY_POWER')==0
assert (end(DP,48,5,6)['before']['block'],hit(end(DP,48,5,6)['before']))==(11,32)
assert (end(DP,48,7,6)['before']['hp'],end(DP,48,7,6)['before']['block'],hit(end(DP,48,7,6)['before']))==(28,9,26)
x=card(DP,48,7,'BUBBLE_BUBBLE',6);assert pow(x['before']['enemies'][0],'POISON_POWER')==19 and pow(x['after']['enemies'][0],'POISON_POWER')==29
x=card(CR,11,3,'LEG_SWEEP');assert (x['before']['block'],x['after']['block'],hit(x['before']),hit(x['after']))==(3,11,22,13)
x=card(CR,11,3,'DEFEND_SILENT');assert (x['before']['block'],x['after']['block'],pow(x['before'],'FRAIL_POWER'))==(0,3,1)
for t,expected in [(1,5),(2,10),(3,15)]:assert pow(end(CR,11,t)['before'],'ROLLING_BOULDER_POWER')==expected
assert end(CR,11,3)['after']['hp']==0
plays={k:{x['run'] for x in C if x['card']==k} for k in ['ACCELERANT','AFTERIMAGE','ANTICIPATE','PIERCING_WAIL','BUBBLE_BUBBLE','ROLLING_BOULDER']}
checks={'silent-accelerant-triggers':('ACCELERANT',[DP]),'silent-afterimage-per-card-block':('AFTERIMAGE',[DP]),'silent-anticipate-temporary-dexterity':('ANTICIPATE',[DP]),'silent-piercing-wail-temporary-strength':('PIERCING_WAIL',[DP,CR]),'silent-bubble-bubble-condition':('BUBBLE_BUBBLE',[DP]),'silent-rolling-boulder-start-growth':('ROLLING_BOULDER',[CR])}
for id,(k,new) in checks.items():assert set(E[id]['evidence']+new)<=plays[k],(id,set(E[id]['evidence']+new)-plays[k])
raw=[]
for r,f,t,k,att in [(DP,48,1,'DEFEND_SILENT',6),('LRN0HPZ0FZS1',48,3,'FLICK_FLACK',1)]:
 x=card(r,f,t,k,att);ss={s['ts']:s['state'] for s in map(json.loads,(O/r/'states.jsonl').open())};ds=[d for d in map(json.loads,(O/r/'decisions.jsonl').open()) if d['ts']==x['ts']];d=ds[0]
 b=ss[d['ts']];states=[s for s in map(json.loads,(O/r/'states.jsonl').open()) if s['ts']>d['ts']];z=states[0]['state']
 bc=b['combat']['player'].get('cards_played_this_turn');zc=z['combat']['player'].get('cards_played_this_turn')
 assert zc-bc==1,(r,bc,zc)
 assert (x['before']['block'],x['after']['block'])==((0,24) if r==DP else (13,15))
 raw.append(dict(run=r,floor=f,turn=t,raw_before=bc,raw_after=zc,block_before=x['before']['block'],block_after=x['after']['block']))
(O/'mechanism-facts.json').write_text(json.dumps(dict(facts=fact,replay=raw,actual_play_support={k:sorted(v) for k,v in plays.items()}),ensure_ascii=False,indent=2)+'\n')
print('新机制逐帧与旧六牌支持局实打核验通过，重放两个窗口',raw)
