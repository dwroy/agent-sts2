import bisect,json,re
from pathlib import Path
O=Path(__file__).parent;H=json.load(open(O/'gamble-history.json'));checks=[]
def count(c):
 total=0
 for row in c['exhaust']:
  if 'CALCULATED_GAMBLE' in row['card_ids'] and row['line'].startswith('计算下注+'):
   m=re.match(r'计算下注\+(?:\*(\d+))?',row['line']);total+=int(m.group(1) or 1)
 return total
for run in dict.fromkeys(x['run'] for x in H):
 S=[json.loads(l) for l in (O/run/'states.jsonl').open()];T=[s['ts'] for s in S]
 for x in [h for h in H if h['run']==run]:
  i=bisect.bisect_left(T,x['ts']);a,b=S[i]['state']['agent_view']['combat'],S[i+1]['state']['agent_view']['combat']
  assert count(b)-count(a)==1,(run,x['ts'],a['exhaust'],b['exhaust'])
  checks.append(dict(run=run,ts=x['ts'],before=count(a),after=count(b)))
(O/'gamble-exhaust-verified.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('32次升级消耗数量实增1；旧普通版消耗另账。')
