import json,collections,re,datetime
from pathlib import Path
p=Path(__file__).parent;S=[json.loads(l) for l in (p/'states.jsonl').open()];D=[json.loads(l) for l in (p/'decisions.jsonl').open()];B=[json.loads(l) for l in (p/'brain.jsonl').open()];R=json.loads((p/'J8PHG72DGD90-resources.json').read_text());by={x['_line']:x['state'] for x in S};checks=[]
def check(n,v):checks.append({'item':n,'ok':bool(v)});assert v,n
check('记录数量', (len(D),len(S),len(B),len(R['combats']))==(818,978,33,20))
check('终轮HP挡伤',by[313158]['run']['current_hp']==3 and by[313158]['combat']['player']['block']==7 and by[313158]['combat']['enemies'][0]['intents'][0]['total_damage']==24)
check('死亡与敌残',by[313159]['run']['current_hp']==0 and by[313159]['combat']['enemies'][0]['current_hp']==177)
check('末试T12双方同盘', all(by[i]['run']['current_hp']==3 and by[i]['combat']['enemies'][0]['current_hp']==207 for i in [313074,313148]))
check('两线挡14/20',by[313078]['combat']['player']['block']==14 and by[313152]['combat']['player']['block']==20)
check('两线下一轮HP1/3与敌204/213',by[313080]['run']['current_hp']==1 and by[313153]['run']['current_hp']==3 and by[313080]['combat']['enemies'][0]['current_hp']==204 and by[313153]['combat']['enemies'][0]['current_hp']==213)
check('第5试回血独立中间帧174→204',by[313079]['combat']['enemies'][0]['current_hp']==174 and by[313080]['combat']['enemies'][0]['current_hp']==204)
check('小刀锁住',len(by[313158]['combat']['hand'])==2 and all(c['card_id']=='SHIV' and c['playable'] is False and c['unplayable_reason']=='blocked_by_hook' for c in by[313158]['combat']['hand']))
check('毒药先施毒后扣血',by[313157]['combat']['enemies'][0]['current_hp']==by[313158]['combat']['enemies'][0]['current_hp']==213 and next(x['amount'] for x in by[313157]['combat']['enemies'][0]['powers'] if x['power_id']=='POISON_POWER')==30 and next(x['amount'] for x in by[313158]['combat']['enemies'][0]['powers'] if x['power_id']=='POISON_POWER')==36)
check('新获8瓶',sum(len(e['to']['potions'])-len(e['from']['potions']) for e in R['resource_changes'] if not e['restart_boundary'] and e['combat_sequence'] is None and len(e['to']['potions'])>len(e['from']['potions']))==8)
check('饮14弃0',sum(d['chosen'].get('action')=='use_potion' for d in D)==14 and not any(d['chosen'].get('action')=='discard_potion' for d in D))
restores=[e for e in R['resource_changes'] if e['restart_boundary']]
check('恢复6次130血',len(restores)==6 and sum(e['to']['hp']-e['from']['hp'] for e in restores)==130)
check('正充能续火',next(x['stack'] for x in by[312605]['run']['relics'] if x['relic_id']=='PUMPKIN_CANDLE')==1 and next(x['stack'] for x in by[312606]['run']['relics'] if x['relic_id']=='PUMPKIN_CANDLE')==6 and by[312605]['run']['current_hp']==by[312606]['run']['current_hp']==50 and len(by[312605]['run']['deck'])==len(by[312606]['run']['deck'])==28)
check('药槽2→3',len(by[312182]['run']['potions'])==2 and len(by[312183]['run']['potions'])==3)
check('最终牌组29',len(by[313159]['run']['deck'])==29)
check('Jev低信心28',sum(d['decider']=='jev' and d.get('confidence',1)<.35 for d in D)==28)
bs=[d for d in D if type(d.get('rollout_best_chosen')) is bool]
check('最优272/286',len(bs)==286 and sum(d['rollout_best_chosen'] for d in bs)==272)
check('脑token',sum(b['usage']['inputTokens'] for b in B)==4430517 and sum(b['usage']['outputTokens'] for b in B)==8100 and sum(b['usage']['cacheHitTokens'] for b in B)==2711808)
print('药槽实际字段',len(by[312182]['run']['potions']),len(by[312183]['run']['potions']))
print('缓存比例',2711808/4430517*100)
# Verify early multi-target deaths using alive flags, allowing final removal at REWARD.
for floor in [13,17,21,30]:
 last={}
 for x in S:
  s=x['state']
  if s['run']['floor']!=floor:continue
  now={(e['enemy_id'],e['max_hp']):e for e in (s.get('combat') or {}).get('enemies',[])}
  for key,e in last.items():
   if e['is_alive'] and (key not in now or not now[key]['is_alive']):print('death/removed',floor,s['turn'],key,x['_line'])
  last=now
(p/'verification-v1.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('PASS',len(checks))
