import bisect,collections,json,hashlib
from pathlib import Path
O=Path(__file__).parent; A=json.load(open(O/'audit.json'));checks=[]
def check(name,value):
 assert value,name
 checks.append(name)
N=['FU8ZUQHBHNV9','456MRNGCPD8E'];F=json.load(open(O/'new-state-facts.json'))
def fact(run,floor,turn,card=None,potion=None,action=None):
 return next(x for x in F if x['run']==run and x['floor']==floor and x['turn']==turn and (not card or x['card'].get('id')==card) and (not potion or x['potion'].get('id')==potion) and (not action or x['action']['action']==action))
fu=N[0];r=N[1]
f=fact(fu,8,9,action='end_turn');check('骇鳗末轮20血0挡，攻击27，敌18',f['before']['hp']==20 and f['before']['block']==0 and f['before']['enemies'][0]['intents'][0]['total_damage']==27 and f['before']['enemies'][0]['hp']==18 and f['after']['hp']==0)
f=fact(fu,8,7,card='FOOTWORK');check('骇鳗步法普通加2且原挡不补',f['after']['powers']['DEXTERITY_POWER']==2 and f['after']['block']==f['before']['block']==0)
f=fact(fu,8,4,card='PIERCING_WAIL');check('骇鳗尖啸力量负6、三击0',f['after']['enemies'][0]['powers']['STRENGTH_POWER']==-6 and f['after']['enemies'][0]['intents'][0]['total_damage']==0)
f=fact(r,31,6,action='end_turn');es=f['before']['enemies'];e=next(e for e in es if e['id']=='SLUMBERING_BEETLE');z=f['after']['enemies'][0]
check('末轮甲虫10毒三结27、丝退场、仍16攻击杀2血14挡',len(es)==2 and e['hp']==46 and e['powers']['POISON_POWER']==10 and e['intents'][0]['total_damage']==16 and z['hp']==19 and z['id']=='SLUMBERING_BEETLE' and z['intents'][0]['total_damage']==16 and f['before']['hp']==2 and f['before']['block']==14 and f['after']['hp']==0)
f=fact(r,31,5,potion='GHOST_IN_A_JAR');check('罐装幽灵实建1、甲虫20降1',f['after']['powers']['INTANGIBLE_POWER']==1 and next(x for x in f['after']['enemies'] if x['id']=='SLUMBERING_BEETLE')['intents'][0]['total_damage']==1)
f=fact(r,31,2,card='ACCELERANT');check('触媒升级建2非施毒',f['after']['powers']['ACCELERANT_POWER']==2 and f['before']['enemies']==f['after']['enemies'])
f=fact(r,29,6,action='end_turn');check('虱虫力14猛扑30、暗影脆弱实13、失17',f['before']['enemies'][0]['powers']['STRENGTH_POWER']==14 and f['before']['enemies'][0]['intents'][0]['total_damage']==30 and f['before']['block']==13 and f['before']['hp']-f['after']['hp']==17)
f=fact(r,31,4,action='end_turn');check('两敏暗影28挡抵28零损',f['before']['block']==28 and f['before']['powers']['DEXTERITY_POWER']==2 and f['before']['hp']==f['after']['hp'])
f=fact(r,30,2,card='FOOTWORK');check('柔嫩使第二步法净敏2到3、力负1',f['before']['powers']['DEXTERITY_POWER']==2 and f['after']['powers']['DEXTERITY_POWER']==3 and f['after']['powers']['STRENGTH_POWER']==-1)
f=fact(r,23,1,potion='DEXTERITY_POTION');check('敏捷药实2且已有挡不补',f['after']['powers']['DEXTERITY_POWER']==2 and f['before']['block']==f['after']['block']==0)
for f in [f for f in F if f['card'].get('id')=='NOXIOUS_FUMES']:
 check('本局毒雾各建2 '+f['run']+' '+str(f['floor'])+'/'+str(f['turn']),f['after']['powers'].get('NOXIOUS_FUMES_POWER',0)-f['before']['powers'].get('NOXIOUS_FUMES_POWER',0)==2 and f['before']['enemies']==f['after']['enemies'])
rock_actions=[p for p in A['potions'] if (p.get('potion') or {}).get('id')=='POTION_SHAPED_ROCK']
rock_runs=sorted({p['run'] for p in rock_actions}); rock=[]
for run in rock_runs:
 S=[json.loads(x) for x in (O/run/'states.jsonl').open()];sm={s['ts']:s['state'] for s in S};stamps=[s['ts'] for s in S]
 def has_to(s):return any(x['relic_id']=='PETRIFIED_TOAD' for x in s['run'].get('relics',[]))
 def stones(s):return [x['slot_index'] for x in s['run'].get('potions',[]) if x.get('occupied') and x.get('potion_id')=='POTION_SHAPED_ROCK']
 # Potion fields are preserved from the source state.
 generated=[]
 for i,s in enumerate(S):
  a=S[i-1]['state'] if i else None;z=s['state']
  if a and has_to(z) and z.get('combat') and z['turn']==1 and len(stones(z))>len(stones(a)):
   generated.append(dict(floor=z['run']['floor'],ts=s['ts'],slot=stones(z),before_potions=a['run']['potions'],after_potions=z['run']['potions']))
 used=[]
 for p in [x for x in rock_actions if x['run']==run]:
  a=sm[p['ts']]; z=S[min(bisect.bisect_right(stamps,p['ts']),len(S)-1)]['state'];target=p['chosen'].get('target_index')
  enemy=next(x for x in a['combat']['enemies'] if x['index']==target);after=next((x for x in (z.get('combat') or {}).get('enemies',[]) if x['enemy_id']==enemy['enemy_id'] and x.get('index')==target),None)
  used.append(dict(floor=p['floor'],turn=p['turn'],ts=p['ts'],target=enemy['enemy_id'],hp_before=enemy['current_hp'],hp_after=after['current_hp'] if after else None,block_before=enemy['block'],block_after=after['block'] if after else None,player_before=a['run']['current_hp'],player_after=z['run']['current_hp'],has_to=has_to(a),potion=p['potion']))
 rock.append(dict(run=run,generated=generated,used=used))
check('新局四次石头投15、玩家血不变',len(v:=[p for x in rock if x['run']==r for p in x['used']])==4 and all(p['hp_before']-p['hp_after']==15 and p['player_before']==p['player_after'] for p in v))
old=next(x for x in rock if x['run']=='ZZMYZ5UBCG72');check('旧A2族母201到186、玩家52',any(p['floor']==17 and p['hp_before']==201 and p['hp_after']==186 and p['player_before']==p['player_after']==52 for p in old['used']))
(O/'rock-history.json').write_text(json.dumps(rock,ensure_ascii=False,indent=2)+'\n')
(O/'verified.json').write_text(json.dumps(dict(checks=checks,passed=len(checks)),ensure_ascii=False,indent=2)+'\n')
print('关键帧通过',len(checks),'；蟾蜍历史',[(x['run'],len(x['generated']),len(x['used'])) for x in rock])
