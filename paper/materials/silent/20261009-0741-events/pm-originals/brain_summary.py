import json
from pathlib import Path
p=Path('learner/runs/20261009-071302-postmortem')
def walk(v,path=''):
    if isinstance(v,dict):
        for k,w in v.items():
            if any(x in k for x in ('clock','projection','route','boss_sim')): print('FIELD',path+k,str(w)[:3200])
            if isinstance(w,(dict,list)):walk(w,path+k+'.')
    elif isinstance(v,list):
        for i,w in enumerate(v):
            if isinstance(w,(dict,list)):walk(w,path+str(i)+'.')
for line in (p/'brain.jsonl').open():
    r=json.loads(line)
    print('BRAIN',r['_line'],r['ts'],r['label'],r['engine'],r['answer'])
    walk(r.get('payload'))
    if r['label']=='map/route-plan': print('ROUTE_MEMORY',r['memory'])
