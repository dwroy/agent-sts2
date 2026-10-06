import json,collections,re
from pathlib import Path
O=Path(__file__).parent;RUN='ZVYUL2YP3518';A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/RUN/'completed-runs.json'))}
C=[x for x in A['cards'] if x['run']==RUN];E=[x for x in A['ends'] if x['run']==RUN]
def enemy(b):return next(e for e in b['enemies'] if e['id']=='TEST_SUBJECT')
def p(b,k):return b['powers'].get(k,0)
def c(t,ident):return next(x for x in C if (x['floor'],x['turn'],x['card'],x['attempt'])==(49,t,ident,6))
def end(t):return next(x for x in E if (x['floor'],x['turn'],x['attempt'])==(49,t,6))
x=c(1,'FOOTWORK');assert (p(x['before'],'DEXTERITY_POWER'),p(x['after'],'DEXTERITY_POWER'))==(1,4)
assert x['before']['block']==x['after']['block']==17
for t,ident in [(1,'FOOTWORK'),(1,'FAN_OF_KNIVES'),(3,'NOXIOUS_FUMES'),(3,'ACCURACY')]:
 x=c(t,ident);assert p(enemy(x['before']),'STRENGTH_POWER')==p(enemy(x['after']),'STRENGTH_POWER')
for ident,want in [('DEFLECT',8),('BACKFLIP',9),('SURVIVOR',12)]:
 x=c(5,ident);assert x['after']['block']-x['before']['block']==want
x=c(4,'PURITY');assert (p(enemy(x['before']),'STRENGTH_POWER'),p(enemy(x['after']),'STRENGTH_POWER'))==(3,6)
x=end(5);assert (enemy(x['before'])['hp'],p(enemy(x['before']),'POISON_POWER'),p(enemy(x['before']),'STRENGTH_POWER'))==(29,19,18)
assert enemy(x['after'])['hp']==212 and p(enemy(x['after']),'POISON_POWER')==3 and p(enemy(x['after']),'ENRAGE_POWER')==0 and x['after']['hp']==13
for key,want in [('DEXTERITY_POWER',4),('ACCELERANT_POWER',1),('NOXIOUS_FUMES_POWER',3),('ACCURACY_POWER',4),('FAN_OF_KNIVES_POWER',1)]:assert p(x['after'],key)==want
for t,poison,hurt in [(6,3,5),(7,4,7),(8,5,9)]:
 x=end(t);assert p(enemy(x['before']),'POISON_POWER')==poison
 assert enemy(x['before'])['hp']-enemy(x['after'])['hp']==hurt
x=c(6,'ANTICIPATE');assert (p(x['before'],'DEXTERITY_POWER'),p(x['after'],'DEXTERITY_POWER'))==(4,8)
assert p(end(6)['after'],'DEXTERITY_POWER')==4
x=c(7,'PIERCING_WAIL');assert p(enemy(x['after']),'STRENGTH_POWER')==-6
hit=lambda b:sum(i.get('total_damage') or 0 for i in enemy(b)['intents'])
assert (hit(x['before']),hit(x['after']))==(44,20)
x=c(7,'DEFLECT');assert x['after']['block']-x['before']['block']==15
x=end(8);assert (x['before']['hp'],x['before']['block'],hit(x['before']),x['after']['hp'],enemy(x['after'])['hp'])==(13,27,55,0,124)
shivs=[x for x in C if (x['floor'],x['turn'],x['attempt'],x['card'])==(49,8,6,'SHIV')]
assert len(shivs)==3 and all(enemy(x['before'])['hp']-enemy(x['after'])['hp']==9 and '8' in x['text'] for x in shivs)
sl=[x for x in A['attempts'] if x['run']==RUN and x['floor']==49]
assert [x['result'] for x in sl]==['predicted_death']*5+['died'] and all(x['reload']['ok'] for x in sl[:-1])
def common(seqs):
 n=0
 while n<min(map(len,seqs)) and len({str(s[n]) for s in seqs})==1:n+=1
 return n
prefix=common([s['draws']['order'] for s in sl]);turn_prefix=common([s['draws']['turns'] for s in sl])
# Arrival healing is measured at MAP-to-REST, separately from REST actions.
old=json.load(open(O/'experience-before.json'));entries={e['id']:e for e in old['entries']}
feather=[];stone=[];candle=[]
for run in A['runs']:
 previous=None;seen=set()
 for line in (O/run/'states.jsonl').open():
  row=json.loads(line);s=row['state'];rr=s['run'];relics={r['relic_id']:r for r in rr.get('relics',[])}
  if s['screen']=='REST' and previous and previous['screen']=='MAP' and 'ETERNAL_FEATHER' in relics and run in entries['silent-eternal-feather-rest-arrival-heal']['evidence']+[RUN]:
   before=previous['run']['current_hp'];size=len(previous['run']['deck']);after=rr['current_hp'];cap=rr['max_hp']
   feather.append(dict(run=run,floor=rr['floor'],deck=size,before=before,after=after,gain=after-before,expected=min(cap-before,3*(size//5))))
  if s['screen']=='COMBAT' and s.get('combat'):
   key=rr['floor']
   if key not in seen:
    seen.add(key)
    if run in entries['silent-smooth-stone-opening-dexterity']['evidence']+[RUN] and 'ODDLY_SMOOTH_STONE' in relics:
     powers={v['power_id']:v['amount'] for v in s['combat']['player']['powers']};stone.append(dict(run=run,floor=key,dexterity=powers.get('DEXTERITY_POWER',0)))
  if run==RUN and 'PUMPKIN_CANDLE' in relics and (not previous or previous['run'].get('relics')!=rr['relics']):
   candle.append(dict(floor=rr['floor'],screen=s['screen'],hp=rr['current_hp'],relic=relics['PUMPKIN_CANDLE']))
  previous=s
assert feather and all(x['gain']==x['expected'] for x in feather),feather
assert stone and all(x['dexterity']==1 for x in stone),stone
cards=['FOOTWORK','DEADLY_POISON','NOXIOUS_FUMES','ACCELERANT','PIERCING_WAIL','ACCURACY','FAN_OF_KNIVES','ANTICIPATE']
played={k:sorted({x['run'] for x in A['cards'] if x['card']==k}) for k in cards}
for e in old['entries']:
 if e['scope'].split(':')[-1] in played and e['id'] in ['silent-footwork-block','silent-deadly-poison-application','silent-noxious-fumes-growth','silent-accelerant-triggers','silent-piercing-wail-temporary-strength','silent-accuracy-shiv-scaling','silent-fan-of-knives-capacity','silent-anticipate-temporary-dexterity']:
  assert set(e['evidence']+[RUN])<=set(played[e['scope'].split(':')[-1]]),(e['id'],set(e['evidence'])-set(played[e['scope'].split(':')[-1]]))
q=dict(sl_common_order=prefix,sl_common_turns=turn_prefix,sl_clean=[x['draws']['clean'] for x in sl],sl=sl,feather=feather,stone=stone,candle=candle,new_cards=C,new_ends=E,played=played)
(O/'mechanisms.json').write_text(json.dumps(q,ensure_ascii=False,indent=2)+'\n')
print('新局机制逐帧断言通过；历史八牌所有支持局均有实打；羽毛',len(feather),'到火/0反例；石头',len(stone),'开战/0反例')
print('SL抽序共同前缀',prefix,'到手回合共同前缀',turn_prefix,'clean',q['sl_clean'])
print('新羽毛',[x for x in feather if x['run']==RUN]);print('蜡烛',candle)
