import json,collections
from pathlib import Path
p=Path(__file__).parent;r='G33HU22H2543'
ds=[json.loads(x) for x in (p/f'{r}-decisions.jsonl').open()]; ss=[json.loads(x) for x in (p/f'{r}-states.jsonl').open()];res=json.loads((p/f'{r}-resources.json').read_text())
for x in (p/f'{r}-sl-attempts.jsonl').open():
 a=json.loads(x);print('SL',a['_line'],{k:a.get(k) for k in ['floor','attempt','started_at','ended_at','result','turns','end_hp','end_block','incoming','judge','reload']})
print('玩家结构',next(x['state']['combat']['player'] for x in ss if x['state']['in_combat']))
print('敌人结构',next(x['state']['combat']['enemies'][0] for x in ss if x['state']['in_combat']))
for d in ds:
 if d['decider']=='codex':
  print('大脑',d['_line'],d['floor'],d['label'],d['chosen'],d['rationale'],d.get('deepseek',{}).get('engine'))
for d in ds:
 if 'guard' in json.dumps(d.get('journal',{})).lower() or 'override' in d['label'] or 'potion' in str(d['chosen']).lower():
  print('专项',d['_line'],d['floor'],d['turn'],d['label'],d['chosen'],d['rationale'],d.get('journal'))
print('非战资源变化')
for e in res['resource_changes']:
 if e['combat_sequence'] is None:print(e)
