import json,collections,datetime
from pathlib import Path
p=Path(__file__).parent;r='G33HU22H2543';ds=[json.loads(x) for x in (p/f'{r}-decisions.jsonl').open()];ss=[json.loads(x) for x in (p/f'{r}-states.jsonl').open()];res=json.loads((p/f'{r}-resources.json').read_text())
for c in res['combats']:
 rows=[x for x in ss if c['entry']['line']<=x['_line']<=(c['exit'] or c['last'])['line']]; rounds={}
 for x in rows:
  s=x['state'];co=s.get('combat') or {};pl=co.get('player') or {}
  if s.get('in_combat') and 'play_card' in s.get('available_actions',[]) and s.get('turn') not in rounds:rounds[s['turn']]=x
 c['rounds']=[]
 for turn,x in sorted(rounds.items()):
  later=[a for a in rows if a['_line']>=x['_line']];nextx=rounds.get(turn+1) or rows[-1]; s=x['state']; ns=nextx['state']; co=s['combat']; nco=ns.get('combat') or {}
  need=sum(e['current_hp'] for e in co['enemies'] if e['is_alive']);end=sum(e['current_hp'] for e in nco.get('enemies',[]) if e['is_alive'])
  last=next((a for a in reversed(later) if a['_line']<nextx['_line']),x)
  c['rounds'].append({'turn':turn,'line':x['_line'],'next_line':nextx['_line'],'hp':s['run']['current_hp'],'need':need,'net_enemy':need-end,'loss':s['run']['current_hp']-ns['run']['current_hp'],'enemies':[(e['enemy_id'],e['current_hp'],e['block'],e['powers'],e['intents']) for e in co['enemies']],'player':co['player'],'end':last['state'].get('combat',{}).get('player')})
 print('回合',c['sequence'],'F',c['floor'],'需',[x['need'] for x in c['rounds']],'净扣',[x['net_enemy'] for x in c['rounds']],'净损',[x['loss'] for x in c['rounds']],'首轮HP',c['rounds'][0]['hp'] if c['rounds'] else None)
(p/'rounds.json').write_text(json.dumps(res,ensure_ascii=False,indent=2))
jev=[d for d in ds if d['decider']=='jev'];low=[d for d in jev if isinstance(d.get('confidence'),(int,float)) and d['confidence']<.35]
print('Jev',len(jev),'low',len(low),collections.Counter(d['label'] for d in low))
for d in jev:
 if d['label'].startswith('combat/plan-choice'):
  print('选线',d['_line'],d['floor'],d['turn'],d['sl_attempt'],'journal',d.get('journal',{}),'deepseek',d.get('deepseek'))
print('用量',collections.Counter(d['decider'] for d in ds))
print('usage keys',collections.Counter(k for d in ds for k in (d.get('usage') or {})))
print('brain keys',next(d.get('deepseek') for d in ds if d.get('deepseek')))
