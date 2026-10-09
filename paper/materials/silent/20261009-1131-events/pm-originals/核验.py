import json,pathlib,hashlib,collections,datetime,re
root=pathlib.Path('/home/dw/Projects/agent-sts2');p=pathlib.Path(__file__).parent;r='XZUJR08FW801'
checks=[]
for local,source in [(f'{r}-decisions.jsonl','decisions'),(f'{r}-states.jsonl','states'),(f'{r}-run-plans.jsonl','run-plans'),(f'{r}-sl-attempts.jsonl','sl-attempts'),('先验-decisions.jsonl','decisions'),('先验-runs.jsonl','runs'),('先验-ENKY状态.jsonl','states')]:
 with (root/f'logs/{source}.jsonl').open('rb') as original:
  for line in (p/local).open():
   row=json.loads(line);offset=row.pop('_offset');number=row.pop('_line');original.seek(offset);raw=original.readline()
   assert json.loads(raw)==row,(local,number)
   checks.append({'文件':source,'行':number,'偏移':offset,'长度':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
d=[json.loads(x) for x in (p/f'{r}-decisions.jsonl').open()];s=[json.loads(x) for x in (p/f'{r}-states.jsonl').open()];res=json.load((p/f'{r}-resources.json').open())
assert len(d)==471 and len(s)==493 and len(res['combats'])==17
assert [c['entry']['hp'] for c in res['combats']]==[56,55,54,54,49,44,58,31,52,57,46,46,23,5,5,5,5]
assert [c['exit']['hp'] if c['exit'] else None for c in res['combats']]==[55,54,54,49,44,37,31,31,8,57,46,23,5,None,None,None,0]
assert all(c['entry']['max_hp']==70 and c['entry_is_turn_one'] for c in res['combats'])
byline={x['_line']:x for x in s};dec={x['_line']:x for x in d}
for n,hp,block in [(319424,46,0),(319470,23,0),(319479,14,0),(319484,5,0),(319542,5,0),(319546,5,10),(319547,0,0)]:
 a=byline[n]['state'];assert a['run']['current_hp']==hp and a['combat']['player']['block']==block
end=byline[319546]['state']['combat'];assert sum(i.get('total_damage') or 0 for e in end['enemies'] for i in e['intents'])==20
assert next(x['amount'] for x in end['player']['powers'] if x['power_id']=='PLATING_POWER')==3
assert [(e['enemy_id'],e['current_hp']) for e in byline[319547]['state']['combat']['enemies']]==[('PARAFRIGHT',15),('THE_OBSCURA',67)]
q=dec[311199]['questions']['plan']['criteria'];assert json.loads(q['plan4'])['cards_drawn']==2
assert [v['card_id'] for v in byline[319511]['state']['combat']['hand']].count('SHIV')==2
assert all(not e['powers'] or not any(w['power_id']=='WEAK_POWER' for w in e['powers']) for e in byline[319479]['state']['combat']['enemies'][:3])
turns=[]
for c in res['combats']:
 if c['floor'] not in [14,17,25,27,29]:continue
 frames=[x for x in s if c['entry']['line']<=x['_line']<=(c['exit'] or c['last'])['line']];first={}
 for x in frames:
  if x['state'].get('in_combat'):first.setdefault(x['state']['turn'],x)
 result=[]
 for t,x in first.items():
  stop=first.get(t+1) or next((a for a in frames if not a['state'].get('in_combat')),None)
  a=x['state'];enemies=a['combat']['enemies'];start=sum(e['current_hp'] for e in enemies if e['is_alive']);mother=next((e['current_hp'] for e in enemies if e['enemy_id']=='OVICOPTER'),None)
  end_hp=None;need=None;net=None;mother_net=None
  if stop:
   b=stop['state'];end_hp=b['run']['current_hp'];new=(b.get('combat') or {}).get('enemies',[]);need=sum(e['current_hp'] for e in new if e['is_alive']);net=start-need
   if mother is not None:mother_net=mother-next((e['current_hp'] for e in new if e['enemy_id']=='OVICOPTER'),0)
  result.append({'回合':t,'首帧':x['_line'],'结束帧':stop['_line'] if stop else None,'所需敌血':start,'血池净清':net,'母体所需':mother,'母体净清':mother_net,'玩家净损':a['run']['current_hp']-end_hp if end_hp is not None else None})
 turns.append({'战斗序':c['sequence'],'层':c['floor'],'逐轮':result})
assert [z['玩家净损'] for z in next(a for a in turns if a['层']==25)['逐轮']]==[12,1,0,7,3,0]
assert [z['母体净清'] for z in next(a for a in turns if a['层']==27)['逐轮']]==[38,68,16,9]
plans=[x for x in d if x['decider']=='jev' and x['label'].startswith('combat/plan-choice')];flags=[x for x in plans if isinstance(x.get('rollout_best_chosen'),bool)]
low=[x for x in d if x['decider']=='jev' and x.get('confidence') is not None and x['confidence']<.35]
focus=[x for x in plans if x.get('focus')]
assert (len(plans),len(flags),sum(x['rollout_best_chosen'] for x in flags),len(low),len(focus))==(118,115,108,15,27)
assert not any('guard' in x.get('rationale','').lower() for x in d)
summary={'局号':r,'原件核验条数':len(checks),'决策数':len(d),'状态数':len(s),'计划数':4,'SL记录':6,'战斗窗口':17,'逐轮':turns,'首末决策秒':(datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['ts'])).total_seconds(),'首次观察至结束秒':(datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['observed_ts'])).total_seconds(),'Jev最优比例':round(108/115*100,2),'代码rank1比例':round(74/118*100,2),'大脑缓存比例':round(2108800/3761214*100,2)}
(p/'原件核验.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n');(p/'数字核验.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
