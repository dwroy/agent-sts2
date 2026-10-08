import bisect,collections,json
from pathlib import Path
O=Path(__file__).parent
rows=[]
for run in json.load(open(O/'runs.json')):
 S=[json.loads(s) for s in (O/run/'states.jsonl').open()];times=[s['ts'] for s in S];M={s['ts']:s['state'] for s in S}
 def brief(s):
  c=s.get('combat') or {};p=c.get('player') or {}
  return dict(hp=s['run']['current_hp'],block=p.get('block'),energy=p.get('energy'),powers={p['power_id']:p['amount'] for p in p.get('powers',[])},relics=s['run'].get('relics'),enemies=[dict(id=e['enemy_id'],index=e['index'],hp=e['current_hp'],powers={p['power_id']:p['amount'] for p in e.get('powers',[])}) for e in c.get('enemies',[])])
 for line in (O/run/'decisions.jsonl').open():
  d=json.loads(line)
  if d.get('chosen',{}).get('action')!='use_potion' or not str(d.get('result','')).startswith('completed'):continue
  potion=d.get('expect',{}).get('potion',{}).get('id')
  if potion not in ['DEXTERITY_POTION','HEART_OF_IRON','POISON_POTION']:continue
  before=M[d['ts']];after=S[min(bisect.bisect_right(times,d['ts']),len(S)-1)]['state']
  rows.append(dict(run=run,potion=potion,floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,ts=d['ts'],target=d['chosen'].get('target_index'),before=brief(before),after=brief(after)))
(O/'historical-potions.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
for potion,power in [('DEXTERITY_POTION','DEXTERITY_POWER'),('HEART_OF_IRON','PLATING_POWER'),('POISON_POTION','POISON_POWER')]:
 rr=[r for r in rows if r['potion']==potion]
 if potion=='POISON_POTION':
  delta=collections.Counter(z['powers'].get(power,0)-b['powers'].get(power,0) for r in rr for b,z in zip(r['before']['enemies'],r['after']['enemies']) if b['index']==r['target'])
 else:delta=collections.Counter(r['after']['powers'].get(power,0)-r['before']['powers'].get(power,0) for r in rr)
 print(potion,'局',len({r['run'] for r in rr}),'动作',len(rr),'增量',dict(delta),'首局',rr[0]['run'] if rr else None)
