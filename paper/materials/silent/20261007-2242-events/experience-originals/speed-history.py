import bisect,collections,json
from pathlib import Path
O=Path(__file__).parent; runs=json.load(open(O/'runs.json')); meta={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
def pow(s):return {p['power_id']:p['amount'] for p in (s.get('combat') or {}).get('player',{}).get('powers',[])}
cases=[]
for n in runs:
 ds=[d for l in (O/n/'decisions.jsonl').open() if (d:=json.loads(l)).get('chosen',{}).get('action')=='use_potion' and d.get('expect',{}).get('potion',{}).get('id')=='SPEED_POTION']
 if not ds:continue
 ss=[json.loads(l) for l in (O/n/'states.jsonl').open()]; times=[s['ts'] for s in ss]; sm={s['ts']:s['state'] for s in ss}
 for d in ds:
  b=sm[d['ts']];i=bisect.bisect_right(times,d['ts']);z=ss[min(i,len(ss)-1)]['state'];p0=pow(b);p1=pow(z)
  nexts=[r['state'] for r in ss[i:] if r['state']['screen']=='COMBAT' and r['state']['run']['floor']==d['floor'] and r['state']['turn']==d['turn']+1]
  q=nexts[0] if nexts else None
  row=dict(run=n,asc=meta[n]['ascension'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,ts=d['ts'],before=p0,after=p1,next=pow(q) if q else None,next_hp=q['run']['current_hp'] if q else None,result=d.get('result'),hand_before=[dict(id=c['card_id'],text=c.get('resolved_rules_text'),dyn=c.get('dynamic_values')) for c in b['combat']['hand']],hand_after=[dict(id=c['card_id'],text=c.get('resolved_rules_text'),dyn=c.get('dynamic_values')) for c in z['combat']['hand']])
  row['dex_delta']=p1.get('DEXTERITY_POWER',0)-p0.get('DEXTERITY_POWER',0)
  row['speed_delta']=p1.get('SPEED_POTION_POWER',0)-p0.get('SPEED_POTION_POWER',0)
  cases.append(row)
support=sorted({r['run'] for r in cases if r['dex_delta']==5 and r['speed_delta']==5},key=lambda n:meta[n]['ended']);bad=[r for r in cases if r['dex_delta']!=5 or r['speed_delta']!=5]
result=dict(cases=cases,support=support,contradicting=sorted({r['run'] for r in bad}),asc_support=dict(collections.Counter(meta[n]['ascension'] for n in support)),instant_uses=len(cases),complete_period_runs=sorted({r['run'] for r in cases if r['next'] is not None and 'SPEED_POTION_POWER' not in r['next']}))
(O/'speed-history.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in result.items() if k!='cases'})
for r in cases:print(r['run'],r['floor'],r['turn'],r['dex_delta'],r['before'],r['after'],r['next'])
