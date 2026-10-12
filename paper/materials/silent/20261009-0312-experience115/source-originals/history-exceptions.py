import bisect,json
from pathlib import Path
O=Path(__file__).parent
A=json.load(open(O/'audit.json'))
rows=[x for x in A['cards'] if x['card']=='FOOTWORK' and x['after']['powers'].get('DEXTERITY_POWER',0)-x['before']['powers'].get('DEXTERITY_POWER',0)==1]
result=[]
for run in dict.fromkeys(x['run'] for x in rows):
 S=[json.loads(l) for l in (O/run/'states.jsonl').open()];T=[x['ts'] for x in S]
 for a in [x for x in rows if x['run']==run]:
  i=bisect.bisect_left(T,a['ts']);b,z=S[i]['state'],S[i+1]['state'];card=next(c for c in b['combat']['hand'] if c['card_id']=='FOOTWORK')
  tender=next(p for p in b['combat']['player']['powers'] if p['power_id']=='TENDER_POWER')
  assert a['before']['powers'].get('TENDER_POWER')==1 and card['dynamic_values'][0]['current_value']==2
  assert a['after']['powers'].get('STRENGTH_POWER',0)-a['before']['powers'].get('STRENGTH_POWER',0)==-1
  result.append(dict(run=run,floor=a['floor'],turn=a['turn'],ts=a['ts'],card=card,tender=tender,before=a['before'],after=a['after'],conclusion='普通步法现场2敏与柔嫩逐牌−1同时兑现，净+1并伴−1力，非基础机制反例；不把净增1改写为普通步法只加1。'))
(O/'historical-exceptions.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('历史五次净增1均有柔嫩1、普通文本2和同步−1力；跨机制净变化非反例')
