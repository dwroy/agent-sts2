import json,re
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2'); O=P/'learner/runs/20261009-161301-postmortem'; rid='C6Z8ATNBNHZ7'
def numbered(name):
    rows=[]
    for line in (O/name).open():
        n,t=line.split(':',1); x=json.loads(t); x['_line']=int(n); rows.append(x)
    return rows
D=numbered('decisions.numbered.jsonl'); a,b=D[0]['ts'],D[-1]['ts']
for fname,match in [('states.jsonl',lambda line,x: x.get('state',{}).get('run_id',x.get('run_id'))==rid),('deepseek-reasoning.jsonl',lambda line,x: a<=x.get('ts','')<=b),('brain.jsonl',lambda line,x: rid in line),('run-config.jsonl',lambda line,x: rid in line)]:
    count=0
    with (P/'logs'/fname).open() as h,(O/(fname.replace('.jsonl','')+'.selected.jsonl')).open('w') as w:
        for n,line in enumerate(h,1):
            if fname not in ['deepseek-reasoning.jsonl'] and rid not in line: continue
            try: x=json.loads(line)
            except ValueError: continue
            if match(line,x):
                w.write(json.dumps({'line':n,'data':x},ensure_ascii=False)+'\n'); count+=1
    print(fname,count)
compact=[]
for d in D:
    compact.append({k:d.get(k) for k in ['_line','ts','floor','turn','label','decider','chosen','rationale','confidence','fallback','usage','journal','rollout_best_chosen','hp_guard','sl_attempt','sl_reloads'] if k in d})
(O/'decisions.compact.json').write_text(json.dumps(compact,ensure_ascii=False,indent=2))
for d in D:
    if d['decider']=='codex' or d['chosen']['action'] in ['use_potion','discard_potion'] or re.search('guard|mismatch|least.loss',d['rationale'],re.I):
        print('D',d['_line'],d['floor'],d.get('turn'),d['label'],d['chosen'],d['rationale'])
print('TIME',a,b)
for s in numbered('sl.numbered.jsonl'):
    print('SL',s['_line'],{k:s.get(k) for k in ['floor','attempt','result','turns','end_hp','incoming','judge','reload','started_at','ended_at']})
