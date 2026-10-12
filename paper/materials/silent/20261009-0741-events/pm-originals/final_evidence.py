import json,collections
from pathlib import Path
p=Path('learner/runs/20261009-071302-postmortem');s=[json.loads(x) for x in (p/'states.jsonl').open()];d=[json.loads(x) for x in (p/'decisions.jsonl').open()];brain=[json.loads(x) for x in (p/'brain.jsonl').open()];ss={r['_line']:r for r in s}
for r in d:
 if r['floor']==17 and r['turn']==2 and r.get('sl_attempt') in (1,4) and r['decider']=='jev':print('MATCH_D',r['_line'],r['observed_ts'])
a,b=ss[315632]['state'],ss[315736]['state'];selected=lambda st:{'hp':st['run']['current_hp'],'player':st['combat']['player'],'enemies':st['combat']['enemies'],'hand':st['combat']['hand']};print('T2_SAME',selected(a)==selected(b))
print('MECH_STEPS')
for n in (315810,315813,315814,315817,315818,315819,315820,315821,315822,315823,315826,315827,315828,315829,315830,315835,315840,315845,315846,315847,315848,315849,315850,315851,315852,315853):
 r=ss[n];st=r['state'];c=st['combat'];print(n,r['ts'],st['turn'],st['run']['current_hp'],'B',(c.get('player') or {}).get('block'),'E',[(e['current_hp'],e['block'],[(q['power_id'],q['amount']) for q in e['powers']]) for e in c['enemies']])
print('KILL_ORDER')
for f in (5,14,15):
 last=None
 for r in s:
  st=r['state'];
  if st['run']['floor']!=f or not st.get('combat'):continue
  es=[(e['index'],e['enemy_id'],e['current_hp'],e['is_alive']) for e in st['combat']['enemies']]
  if last is not None and len(es)<len(last):print(f,r['_line'],st['turn'],last,'->',es)
  last=es
print('POTIONS')
for r in d:
 if r['chosen']['action']=='use_potion':
  before=max([v for v in s if v['ts']<=r['observed_ts']],key=lambda v:v['ts']);after=next((v for v in s if v['_line']>before['_line'] and (v['state']['run']['potions'] !=before['state']['run']['potions'])),None)
  print(r['_line'],r['ts'],r['floor'],r['turn'],r['chosen'],'obs',r['observed_ts'],'before',before['_line'],'after',after['_line'] if after else None)
print('BRAIN_TOKENS',sum(r['latency_ms'] for r in brain),{k:sum(r['usage'].get(k,0) for r in brain) for k in ('inputTokens','outputTokens','cacheHitTokens','reasoningTokens')})
print('BRAIN_USAGE_KEYS',brain[0]['usage']);print('JEV_USAGE_KEYS',[r['usage'] for r in d if r['decider']=='jev'][:1])
