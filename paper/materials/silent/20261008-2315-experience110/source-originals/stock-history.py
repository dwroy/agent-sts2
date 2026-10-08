import json,collections
from pathlib import Path
O=Path(__file__).parent
A=json.load(open(O/'audit.json'))
rows=[]
for fight in A['fights']:
 if 'AXEBOT' not in fight['enemies']:continue
 run=fight['run']; floor=fight['floor']; stages=collections.defaultdict(set); transitions=[]; previous=None
 for line in (O/run/'states.jsonl').open():
  r=json.loads(line);s=r['state']
  if s['run']['floor']!=floor or not s.get('combat'):continue
  for e in s['combat']['enemies']:
   if e['enemy_id']!='AXEBOT':continue
   pw={p['power_id']:p['amount'] for p in e.get('powers',[])};stock=pw.get('STOCK_POWER',0)
   stages[stock].add(e['max_hp'])
   if previous and previous['stock']>stock:
    transitions.append(dict(ts=r['ts'],turn=s['turn'],before=previous,after=dict(hp=e['current_hp'],max_hp=e['max_hp'],stock=stock,powers=pw)))
   previous=dict(hp=e['current_hp'],max_hp=e['max_hp'],stock=stock,powers=pw)
 rows.append(dict(run=run,asc=fight['asc'],floor=floor,stages={str(k):sorted(v) for k,v in stages.items()},transitions=transitions,death=fight['death']))
(O/'stock-history.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
for x in rows:print(x['run'],x['asc'],x['floor'],x['stages'],'恢复',len(x['transitions']),'死',x['death'])
