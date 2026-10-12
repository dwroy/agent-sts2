import json,collections,bisect
from pathlib import Path
p=Path('learner/runs/20261007-081301-postmortem')
ds=[json.loads(x) for x in (p/'decisions.jsonl').open()]
ss=[json.loads(x) for x in (p/'states.jsonl').open()]
byobs={s.get('observed_ts'):s for s in ss};byts={s['ts']:s for s in ss};times=[s['ts'] for s in ss]
def state(d):
 s=byobs.get(d.get('observed_ts')) or byts.get(d.get('observed_ts'))
 if s:return s['state']
 match=[s for s in ss if s['fingerprint']==d.get('fingerprint') and s['ts']<=d['ts']]
 return (match[-1] if match else ss[max(0,bisect.bisect_right(times,d.get('observed_ts',d['ts']))-1)])['state']
def en(s):return [{'id':e['enemy_id'],'i':e['index'],'hp':e['current_hp'],'block':e['block'],'pw':[(q['power_id'],q['amount']) for q in e['powers']],'intent':e['intents']} for e in s['combat']['enemies']]
groups=collections.OrderedDict()
for i,d in enumerate(ds):
 if d['screen']!='COMBAT' or not d['label'].startswith('combat/'):continue
 key=(d['floor'],d.get('sl_attempt') or 0,d['turn']);groups.setdefault(key,[]).append((i,d,state(d)))
print('回合数量',len(groups))
print('Jev',sum(d['decider']=='jev' for d in ds),'低',sum(d['decider']=='jev' and (d.get('confidence') or 0)<.35 for d in ds))
choices=[d for d in ds if d['label'].startswith('combat/plan-choice')]
print('推演最优',collections.Counter(d.get('rollout_best_chosen') for d in choices))
print('末次推演最优',collections.Counter(d.get('rollout_best_chosen') for d in choices if d.get('sl_attempt')==6))
for a in range(7):
 z=[d for d in ds if d['decider']=='jev' and (d.get('sl_attempt') or 0)==a]
 print('分次Jev',a,len(z),'低',sum((d.get('confidence') or 0)<.35 for d in z))
code=[d for d in ds if d['screen']=='COMBAT' and d['decider']=='code' and d['label']!='combat/plan-continue']
print('代码自主',len(code),'覆盖轮',len({(d['floor'],d.get('sl_attempt') or 0,d['turn']) for d in code}),'非结束覆盖',len({(d['floor'],d.get('sl_attempt') or 0,d['turn']) for d in code if d['chosen']['action']!='end_turn'}),'无Jev选线轮',sum(not any(d['label'].startswith('combat/plan-choice') for _,d,s in x) for x in groups.values()))
print('代码续步',collections.Counter('jev' if 'Jev-chosen' in d['rationale'] else 'code' for d in ds if d['label']=='combat/plan-continue'))
for key,rows in groups.items():
 f,a,t=key
 if f not in [11,17] or (f==17 and a not in [1,6]):continue
 s=rows[0][2];last=rows[-1][2];pl=s['combat']['player'];lp=last['combat']['player']
 print('战斗',key,'开局',pl['current_hp'],'敌',[(e['id'],e['hp']) for e in en(s)],'玩家增益',[(q['power_id'],q['amount']) for q in pl['powers']],'末操作',lp['current_hp'],lp['block'],'末敌',en(last),'行动',[(i,d['chosen']['action'],d.get('expect',{}).get('card',{}).get('id')) for i,d,_ in rows])
for line in (p/'sl.jsonl').open():
 d=json.loads(line);print('SL',d['attempt'],d['result'],d['turns'],d['end_hp'],d['end_block'],d['incoming'],'末轮',d['summary']['turns'][-1],'探索',d['explore'])
for i,d in enumerate(ds):
 if d['label'] in ['reward/claim','chest/relic','rest/plan','shop/buy','event/choose'] or d['chosen']['action'] in ['use_potion','discard_potion'] or 'guard' in d['rationale'].lower() or '保血' in d['rationale']:
  print('变化',i,d['floor'],d.get('sl_attempt'),d['turn'],d['label'],d['chosen'],d.get('expect'),d['rationale'])
final=ss[-1]['state'];print('末牌组',[(c['card_id'],c['upgraded'],c['resolved_rules_text']) for c in final['run']['deck']]);print('末遗物',final['run'].get('relics'))
