import json,collections,datetime
from pathlib import Path
p=Path(__file__).parent;r='G33HU22H2543';ds=[json.loads(x) for x in (p/f'{r}-decisions.jsonl').open()];ss=[json.loads(x) for x in (p/f'{r}-states.jsonl').open()]
choice=[d for d in ds if d['label'].startswith('combat/plan-choice')];known=[d for d in choice if type(d.get('rollout_best_chosen')) is bool];print('最优',len(choice),len(known),sum(d['rollout_best_chosen'] for d in known))
focus=[d for d in choice if d.get('focus')];print('focus',len(focus),sum(len(d['focus']) for d in focus),sum(d.get('answers',{}).get('plan',{}).get('choice') in d['focus'] for d in focus))
print('fallback',sum(bool(d['fallback']) for d in ds),'guard')
for d in ds:
 if any(k in d['rationale'].lower() for k in ['hp guard','hp-guard','preserv','override','guardrail']):print(d['_line'],d['rationale'])
key=lambda d:(d['floor'],d.get('sl_attempt') or 1,d['turn'])
a=[d for d in ds if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue'];b=[d for d in a if d['chosen']['action']!='end_turn'];c=[d for d in ds if 'SL explore' in d['rationale']]
print('自主',len(a),len(set(map(key,a))),len(b),len(set(map(key,b))),'SL覆盖',len(c),len(set(map(key,c))),'合计非结束轮',len(set(map(key,b+c))))
print('续步',collections.Counter('Jev' if 'Jev-chosen' in d['rationale'] else 'code' for d in ds if d['label']=='combat/plan-continue'))
for d in c:print('SL换线',d['_line'],d['sl_attempt'],d['turn'],d['rationale'][:220])
for who in ['jev','codex']:
 a=[d for d in ds if d['decider']==who];print(who,'输入',sum(d['usage']['input_tokens'] for d in a),'输出',sum(d['usage']['output_tokens'] for d in a),'缓存',sum(d['usage'].get('cache_hit_tokens',0) for d in a),'带token回答',sum(d['usage']['input_tokens']>0 for d in a))
print('用时', (datetime.datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds())
for d in ds:
 if d['label'].startswith('rest/') and d['label']!='rest/proceed' or d['chosen']['action'] in ['use_potion','discard_potion']:
  print('行动',d['_line'],d['ts'],d['floor'],d['turn'],d['sl_attempt'],d['chosen'],d.get('expect'))
print('HP/药栏变化')
prev=None
for x in ss:
 s=x['state'];ru=s['run'];belt=[(v['index'],v['potion_id']) for v in ru['potions'] if v['occupied']];key=(ru['current_hp'],ru['max_hp'],belt)
 if prev and key!=prev[0]:
  if s['floor'] if 'floor' in s else False:pass
  print(x['_line'],x['ts'][11:23],ru['floor'],s['turn'],s['screen'],prev[0],'→',key)
 prev=(key,x)
