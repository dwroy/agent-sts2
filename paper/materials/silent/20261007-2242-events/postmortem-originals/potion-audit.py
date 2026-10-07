import json,collections,re
from pathlib import Path
p=Path('learner/runs/20261007-221303-postmortem')
def rows(n):
 for l in (p/n).open():
  no,s=l.split(':',1);r=json.loads(s);r['_line']=int(no);yield r
S=list(rows('states-lines.jsonl'));D=list(rows('decisions-lines.jsonl'));by={s['observed_ts']:i for i,s in enumerate(S)}
for d in D:
 if d['chosen']['action']=='use_potion' and d['floor']==33:
  i=by[d['observed_ts']];bef=S[i];aft=S[i+1]
  b=bef['state']['combat'];a=aft['state']['combat']
  print('DRINK',d['_line'],d.get('sl_attempt'),d['turn'],'slot',d['chosen']['option_index'],'states',bef['_line'],aft['_line'],'hand',len(b['hand']),len(a['hand']),'shiv',sum(c['card_id']=='SHIV' for c in b['hand']),sum(c['card_id']=='SHIV' for c in a['hand']),'HP',bef['state']['run']['current_hp'],aft['state']['run']['current_hp'],'enemy',b['enemies'][0]['current_hp'],a['enemies'][0]['current_hp'])
  if d.get('sl_attempt') in [5,6]:
   print('BEFORE',[(c['index'],c['card_id'],c['upgraded'],c.get('can_play'),c.get('blocked_reason')) for c in b['hand']]);print('AFTER',[(c['index'],c['card_id'],c['upgraded']) for c in a['hand']]);print('QUESTION',json.dumps(d.get('questions'),ensure_ascii=False)[:16000])
for d in D:
 if d['_line'] in [275628,275712,276150,275894,275960,276139]:print('COMPARE',d['_line'],d['rationale'],'Q',json.dumps(d['questions'],ensure_ascii=False))
