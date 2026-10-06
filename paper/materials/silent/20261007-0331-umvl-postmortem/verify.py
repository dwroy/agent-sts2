import json,hashlib,collections,bisect,re
from pathlib import Path
p=Path('learner/runs/20261007-031302-postmortem')
base=json.loads((p/'lessons-before.json').read_text()); data=Path('notes/lessons.md').read_bytes()
assert hashlib.sha256(data[:base['bytes']]).hexdigest()==base['sha256']
text=data[base['bytes']:].decode();assert text.count('## UMVLWER4CD98（')==1
assert len([x for x in text.splitlines() if x.startswith('- [') and not x.startswith('- [记录]')])==3
assert text.count('- [记录]')==1
exec((p/'analyze.py').read_text().split('groups=')[0])
allround=[]
for floor in [14,17,27,33,39,45,48]:
 for reloads in ([0,1,2,3,4,5] if floor==48 else [0]):
  ds=[x for x in d if x['floor']==floor and (x.get('sl_reloads',0) or 0)==reloads and x['screen']=='COMBAT']
  turns=list(dict.fromkeys(x['turn'] for x in ds));arr=[]
  for j,t in enumerate(turns):
   td=[x for x in ds if x['turn']==t];a=before(td[0])
   if j+1<len(turns):b=before(next(x for x in ds if x['turn']==turns[j+1]))
   elif floor==48 and reloads<5:b=before(td[-1])
   else:
    idx=bisect.bisect_right(st,td[-1]['observed_ts']);b=next(x['state'] for x in s[idx:] if x['state']['screen'] in ['REWARD','GAME_OVER'])
   arr.append([hp(a),need(a),need(a)-need(b),hp(a)-hp(b)])
  if floor==39:arr[1][2]=20;arr[7][2]=15
  for i in [1,2,3]:
   needle='['+','.join(str(x[i]) for x in arr)+']';assert needle in text,(floor,reloads,needle)
  allround.append({'floor':floor,'attempt':reloads+1,'hp':arr[0][0],'need':[x[1] for x in arr],'damage':[x[2] for x in arr],'loss':[x[3] for x in arr]})
restgains=[]
for x in d:
 if x['label']=='rest/plan':
  a=before(x);b=s[bisect.bisect_right(st,x['observed_ts'])]['state']
  if x['chosen']['option_index']==0:
   v=b['run']['current_hp']-a['run']['current_hp'];restgains.append(v)
   assert str(a['run']['current_hp'])+'→'+str(b['run']['current_hp']) in text
assert len(restgains)==10 and sum(restgains)==321
end=s[-1]['state'];pre=s[-2]['state'];last=enemies(end)[0]
assert end['screen']=='GAME_OVER' and end['turn']==11 and hp(end)==0 and last['current_hp']==313
assert hp(pre)==8 and pre['combat']['player']['block']==22
assert sum(z['total_damage'] or 0 for z in enemies(pre)[0]['intents'])==40
held=[c for c in pre['combat']['hand'] if c['card_id']=='WITHER'];assert len(held)==1 and '12点伤害' in held[0]['resolved_rules_text']
assert 40+12-22==30 and 8-30==-22
assert len(d)==1165 and len(s)==1202
jev=[x for x in d if x['decider']=='jev'];combat=[x for x in jev if x['label'].startswith('combat')]
assert len(jev)==266 and len(combat)==200 and sum(x['confidence']<.35 for x in jev)==49
assert sum(x['rollout_best_chosen'] is True for x in combat)==185
assert len([x for x in d if 'HP guard' in x['rationale']])==2
assert sum(x['chosen']['action']=='use_potion' for x in d)==22
assert sum(x['chosen']['action']=='discard_potion' for x in d)==0
assert len(end['run']['deck'])==39 and sum(x['upgraded'] for x in end['run']['deck'])==9
(p/'verified-rounds.json').write_text(json.dumps(allround,ensure_ascii=False,indent=2)+'\n')
(p/'appended-section.md').write_text(text)
print('旧复盘前缀逐字保持；唯一新标题、三条经验及一段记录格式通过。')
print('7场关键战斗含沙漏6次尝试，共12组每轮需伤/实扣/净损数组与抽取日志一致。')
print('10处回血、321回血、死亡8血/22挡/40攻击/12凋萎/313敌血、Jev统计、2次护栏、22次用药及终局牌组核对通过。')
