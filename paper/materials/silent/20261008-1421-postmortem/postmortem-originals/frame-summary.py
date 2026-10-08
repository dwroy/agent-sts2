import json
from pathlib import Path
p=Path(__file__).parent
D=json.loads((p/'decisions.jsonl').read_text());S=json.loads((p/'states.jsonl').read_text())
for s in S:
 st=s['state'];r=st.get('run') or {};c=st.get('combat') or {};f=r.get('floor',st.get('floor'))
 if f is None:f=next((d['floor'] for d in D if d['ts']==s['ts']),None)
 if f not in [17,22,23,29,30]:continue
 print(s['_line'],s['ts'],f,st['screen'],'T',c.get('turn'), 'HP',r.get('current_hp'),'player',json.dumps(c.get('player'),ensure_ascii=False),'敌',json.dumps(c.get('enemies'),ensure_ascii=False))
 if c:print('手',[(a.get('index'),a.get('card_id'),a.get('name'),a.get('cost'),a.get('current_cost'),a.get('description')) for a in c.get('hand',[])])
 for d in D:
  if d['ts']==s['ts']:print('决策',d['_line'],d['label'],d['rationale'],str(d['chosen']))
