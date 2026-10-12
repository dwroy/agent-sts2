import json,collections,datetime
from pathlib import Path
p=Path(__file__).parent; run='T0DGVABPV60U'
ds=[json.loads(l) for l in (p/f'{run}-decisions.jsonl').open()]
ss=[json.loads(l) for l in (p/f'{run}-states.jsonl').open()]
r=json.load((p/f'{run}-resources.json').open())
with (p/'decision-summary.txt').open('w') as w:
 for d in ds:
  w.write(f"d{d['_line']} {d['ts']} F{d.get('floor')} T{d.get('turn')} SL{d.get('sl_attempt')} {d['decider']} {d['label']} {d.get('confidence')} {json.dumps(d.get('chosen'),ensure_ascii=False)} {d.get('rationale')}\n")
with (p/'state-summary.txt').open('w') as w:
 for row in ss:
  s=row['state']; c=s.get('combat') or {}; player=c.get('player') or {}; enemies=c.get('enemies') or []
  w.write(f"s{row['_line']} {row['ts']} F{s['run']['floor']} T{s.get('turn')} {s['screen']} HP{s['run']['current_hp']}/{s['run']['max_hp']} 玩家{json.dumps(player,ensure_ascii=False)} 敌{json.dumps(enemies,ensure_ascii=False)}\n")
print('时间秒',(datetime.datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds())
print('决策数',collections.Counter(d['decider'] for d in ds))
print('低信心',collections.Counter(d['floor'] for d in ds if d['decider']=='jev' and isinstance(d.get('confidence'),(int,float)) and d['confidence']<.35))
print('自主',collections.Counter(d['label'] for d in ds if d['decider']=='code' and d['label'].startswith('combat/')))
for d in ds:
 if d['decider']=='jev' and d['label'].startswith('combat/plan-choice'):
  print('选线样本',json.dumps({k:d.get(k) for k in ['_line','floor','turn','questions','chosen','journal']},ensure_ascii=False)[:6500]);break
print('药水动作')
for d in ds:
 if (d.get('chosen') or {}).get('action') in ['drink_potion','discard_potion']:
  print(d['_line'],d['floor'],d['turn'],d.get('sl_attempt'),d['chosen'],d['rationale'])
print('非战资源变化')
for e in r['resource_changes']:
 if e['combat_sequence'] is None: print(e['from']['line'],e['to']['line'],e['to']['floor'],e['from']['hp'],e['to']['hp'],e['from']['max_hp'],e['to']['max_hp'],e['from']['potions'],e['to']['potions'],'restart',e['restart_boundary'])
