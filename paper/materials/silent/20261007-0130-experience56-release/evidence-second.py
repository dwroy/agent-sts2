import collections,json,re
from pathlib import Path
O=Path(__file__).parent;RUN='VPW8YH7A4QFM';A=json.load(open(O/'audit.json'));old=json.load(open(O/'experience-before.json'));E={e['id']:e for e in old['entries']};R={r['run_id']:r for r in json.load(open(O/RUN/'completed-runs.json'))}
C=[x for x in A['cards'] if x['run']==RUN];ends=[x for x in A['ends'] if x['run']==RUN];S=[json.loads(x) for x in (O/RUN/'states.jsonl').open()]
for x in S:assert x['state']['run']['character_id'].lower()=='silent' and x['state']['run_id']==RUN
for e in old['entries']:
 for run in e['evidence']+e.get('contradicting',[]):assert R[run]['character'].lower()=='silent',(e['id'],run)
def c(t,k):return next(x for x in C if (x['floor'],x['turn'],x['card'])==(39,t,k))
def end(t):return next(x for x in ends if (x['floor'],x['turn'])==(39,t))
def power(x,k):
 p=x['powers'];return p.get(k,0) if isinstance(p,dict) else next((v['amount'] for v in p if v['power_id']==k),0)
def enemy(x,k):return next(e for e in x['enemies'] if e['id']==k)
def hit(x):return sum(i.get('total_damage') or 0 for e in x['enemies'] for i in e['intents'])
x=c(4,'AFTERIMAGE');assert x['before']['block']==x['after']['block']==0 and power(x['after'],'AFTERIMAGE_POWER')==1
x=c(4,'CLOAK_AND_DAGGER');assert x['after']['block']-x['before']['block']==5
assert end(4)['before']['block']==9 and end(4)['after']['hp']==19
assert (end(5)['before']['block'],hit(end(5)['before']),end(5)['before']['hp']-end(5)['after']['hp'])==(11,25,14)
x=c(6,'ANTICIPATE');assert (power(x['before'],'DEXTERITY_POWER'),power(x['after'],'DEXTERITY_POWER'),power(x['after'],'ANTICIPATE_POWER'))==(0,2,2)
assert x['after']['block']-x['before']['block']==1
x=c(6,'DEFEND_SILENT');assert x['after']['block']-x['before']['block']==6
assert (end(6)['before']['hp'],end(6)['before']['block'],enemy(end(6)['before'],'FABRICATOR')['intents'][0]['total_damage'],end(6)['after']['hp'])==(5,10,21,0)
x=c(3,'ACCELERANT');assert power(x['after'],'ACCELERANT_POWER')==2
assert (enemy(end(3)['before'],'ZAPBOT')['hp'],power(enemy(end(3)['before'],'ZAPBOT'),'POISON_POWER'))==(8,4)
assert not any(e['id']=='ZAPBOT' for e in end(3)['after']['enemies']) and end(3)['after']['hp']==19
w=[x for x in C if (x['floor'],x['turn'],x['card'])==(39,4,'PIERCING_WAIL')];assert len(w)==2
assert (hit(w[0]['before']),hit(w[-1]['after']))==(42,6)
assert power(enemy(end(5)['before'],'FABRICATOR'),'STRENGTH_POWER')==0
x=c(3,'BURST');assert power(x['after'],'BURST_POWER')==1
x=c(3,'BACKFLIP');assert x['after']['block']-x['before']['block']==10 and power(x['after'],'BURST_POWER')==0
assert not any(x['card'] in ['NOXIOUS_FUMES','APOTHEOSIS','OUTBREAK','MAD_SCIENCE','FOOTWORK'] for x in C if x['floor']==39)
assert not any(power(x['state']['combat']['player'],'STRENGTH_POWER')!=0 for x in S if x['screen']=='COMBAT' and x['state']['run']['floor']==39)
royal=[]
for f,before,after in [(38,80,78),(39,47,45)]:
 rows=[x['state'] for x in S if x['screen']=='COMBAT' and x['state']['run']['floor']==f];first=rows[0]
 assert first['run']['current_hp']==before
 settled=next(x for x in rows if x['run']['current_hp']==after)
 relics={r['relic_id'] for r in settled['run']['relics']};assert {'ROYAL_POISON','BLOOD_VIAL'}<=relics
 first_play=min(x['ts'] for x in C if x['floor']==f)
 assert any(x['ts']<first_play and x['state']['run']['current_hp']==after for x in S if x['state']['run']['floor']==f)
 royal.append(dict(run=RUN,floor=f,before=before,after=after,gain=after-before))
prior_royal=[]
for run in A['runs']:
 if run==RUN:continue
 for line in (O/run/'states.jsonl').open():
  x=json.loads(line)
  if any(r['relic_id']=='ROYAL_POISON' for r in x['state']['run'].get('relics',[])):
   prior_royal.append(run);break
assert not prior_royal,prior_royal
cards={'silent-afterimage-per-card-block':'AFTERIMAGE','silent-accelerant-triggers':'ACCELERANT','silent-piercing-wail-temporary-strength':'PIERCING_WAIL','silent-anticipate-temporary-dexterity':'ANTICIPATE','silent-burst-next-skills-replay':'BURST','silent-noxious-fumes-growth':'NOXIOUS_FUMES'}
played={card:sorted({x['run'] for x in A['cards'] if x['card']==card}) for card in cards.values()}
for ident,card in cards.items():assert set(E[ident]['evidence']+[RUN])<=set(played[card]),(ident,set(E[ident]['evidence'])-set(played[card]))
# The first COMBAT frame precedes opening relic settlement; preserve the historical aggregation convention.
new=[x for x in A['fights'] if x['run']==RUN];assert len(new)==17 and sum(x['death'] for x in new)==1
assert [(x['floor'],x['hp'],x['loss']) for x in new if x['floor'] in [28,35,38,39]]==[(28,70,27),(35,68,30),(38,80,33),(39,47,47)]
D=[json.loads(x) for x in (O/RUN/'decisions.jsonl').open()];state_by_ts={x['ts']:x['state'] for x in S}
grand=[]
for d in D:
 if 'scores 60' in str(d.get('rationale','')):
  s=state_by_ts[d['ts']];grand.append(dict(ts=d['ts'],floor=d['floor'],rationale=d['rationale'],chosen=d['chosen'],hand=s['combat']['hand']))
assert grand
assert any(any(c['card_id']=='GRAND_FINALE' and c['playable'] is False for c in x['state'].get('combat',{}).get('hand',[])) for x in S if x['state']['run']['floor']==39)
assert all(x['attempt']==1 for x in A['attempts'] if x['run']==RUN)
result=dict(new_cards=C,new_ends=ends,royal=royal,prior_royal=prior_royal,played=played,grand=grand,first_frame_differences=[dict(floor=x['floor'],hp=x['hp'],loss=x['loss']) for x in new if x['floor'] in [28,35,38,39]])
(O/'mechanisms.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('新局逐帧机制、旧六牌所有支持局实打、67旧局无王室猛毒、首帧口径均通过；本局无重打')
