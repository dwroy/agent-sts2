import json,collections,datetime
from pathlib import Path
p=Path('learner/runs/20261008-071302-postmortem');run='PD9AYQVMLQW6'
ds=[json.loads(x) for x in (p/f'{run}-decisions.jsonl').open()];ss=[json.loads(x) for x in (p/f'{run}-states.jsonl').open()];res=json.load((p/f'{run}-resources.json').open())
def powers(xs):return ','.join(f"{x['power_id']}:{x['amount']}" for x in xs or [])
for c in res['combats']:
 if c['floor'] not in [33,35,48,49]:continue
 print('\n战斗',c['sequence'],'F',c['floor'])
 rows=[x for x in ss if c['entry']['line']<=x['_source_line']<=(c.get('exit') or c['last'])['line']]
 by=collections.defaultdict(list)
 for x in rows:
  if x['state']['in_combat']:by[x['state']['turn']].append(x)
 for t,rs in by.items():
  a,b=rs[0],rs[-1];state=b['state'];player=state['combat']['player'];en=state['combat']['enemies'];hand=state['combat']['hand']
  start_hp=sum(e['current_hp'] for e in a['state']['combat']['enemies'] if e['is_alive']);end_hp=sum(e['current_hp'] for e in en if e['is_alive'])
  nxt=next((x for x in rows if x['_source_line']>b['_source_line']),None)
  print('T',t,'lines',a['_source_line'],b['_source_line'],'玩家',a['state']['run']['current_hp'],'→',state['run']['current_hp'],'下一帧',nxt['state']['run']['current_hp'] if nxt else None,'挡',player['block'],'能',player['energy'],'增益',powers(player['powers']))
  print('敌',[(e['name'],e['enemy_id'],e['current_hp'],e['block'],powers(e['powers']),[(i['damage'],i['hits']) for i in e['intents']]) for e in en]);print('本轮敌可见净扣',start_hp-end_hp,'下一帧敌',[(e['enemy_id'],e['current_hp']) for e in nxt['state']['combat']['enemies']] if nxt else None)
  print('末手牌',[(h['name'],h['card_id'],h.get('cost'),h.get('description')) for h in hand])
print('\nJEV')
jev=[d for d in ds if d['decider']=='jev'];r=[d for d in jev if d.get('rollout',{}).get('available')]
print('calls',len(jev),'low<.5',sum(d.get('confidence',1)<.5 for d in jev),'<.6',sum(d.get('confidence',1)<.6 for d in jev),'available',len(r),'best',sum(d.get('rollout_best_chosen')==True for d in r));print('focus',collections.Counter(str(d.get('focus')) for d in r));print('orders',collections.Counter(str(d.get('chosen_order')) for d in r));print('fallback',sum(d['fallback'] for d in jev))
code=[d for d in ds if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue'];print('code自主',len(code),'turns',len(set((d['floor'],d.get('sl_reloads',0),d['turn']) for d in code)))
print('guard keys',collections.Counter(k for d in ds for k in d if any(w in k.lower() for w in ['guard','override','replace'])))
print('jevctx',json.dumps(next(d for d in ds if d['decider']=='jev').get('jev_context'),ensure_ascii=False)[:1300])
print('POTION ACTION')
for d in ds:
 if 'potion' in d['chosen']['action'] or d['label'] in ['shop/discard']:
  print(d['_source_line'],d['floor'],d['turn'],d['chosen'],d['rationale'][:400])
print('CODEX')
for d in ds:
 if d['decider']=='codex':
  print(d['_source_line'],'F',d['floor'],d['label'],d['chosen'],'chosen_name',d.get('journal',{}).get('choice'),'reason',d.get('deepseek',{}).get('reason','')[:250])
