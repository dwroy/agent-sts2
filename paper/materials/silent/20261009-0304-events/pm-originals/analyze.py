import json,re
from pathlib import Path
from collections import Counter
p=Path('learner/runs/20261009-024302-postmortem')
D=[json.loads(x) for x in (p/'decisions.jsonl').open()]
S=[json.loads(x) for x in (p/'states.jsonl').open()]
R=json.loads((p/'PBUBM0LRTEDD-resources.json').read_text())
print('决策',len(D),'时间窗',D[0]['ts'],D[-1]['ts'],'状态',len(S),S[0]['ts'],S[-1]['ts'])
print('字段',list(D[-5]),'状态字段',list(S[-5]['state']))
print('职责',Counter(x['decider'] for x in D),'低信心',sum(x['decider']=='jev' and x.get('confidence',1)<.35 for x in D if isinstance(x.get('confidence'),(int,float))))
print('代码标签',Counter(x['label'] for x in D if x['decider']=='code'))
print('Jev计划',Counter(x['label'] for x in D if x['decider']=='jev'))
print('rank',Counter(re.search(r'code rank (\d+)',x.get('rationale','')).group(1) for x in D if re.search(r'code rank (\d+)',x.get('rationale',''))))
print('代码自主轮',len({(x.get('sl_attempt'),x['floor'],x['turn']) for x in D if x['decider']=='code' and x['label'] in ['combat/plan','combat/lethal','combat/least-loss']}))
for c in R['combats']:
    e,l,z=c['entry'],c['last'],c['exit']
    print('战',c['sequence'],'F',c['floor'],c['enemies'],'进',e['hp'],e['max_hp'],e['potions'],'末',l['hp'],l['turn'],'出',z and (z['hp'],z['max_hp'],z['potions'],z['screen']),'边界',c['end'],'行',e['line'],l['line'],z and z['line'])
with (p/'decisions-summary.txt').open('w') as f:
    for d in D:
        if d['decider']=='codex' or d['floor']>=48 or any(w in d.get('rationale','').lower() for w in ['guard','focus','potion','override']):
            f.write(f"d{d['_line']} {d['ts']} F{d['floor']}T{d['turn']} a{d.get('sl_attempt')} {d['decider']} {d['label']} {json.dumps(d['chosen'],ensure_ascii=False)} {d.get('rationale')}\n")
with (p/'resources-summary.txt').open('w') as f:
    for c in R['resource_changes']:
        a,b=c['from'],c['to']
        f.write(f"s{a['line']}→{b['line']} F{a['floor']}T{a['turn']}→F{b['floor']}T{b['turn']} {a['hp']}/{a['max_hp']}→{b['hp']}/{b['max_hp']} {a['potions']}→{b['potions']} {b['screen']} SL={c['restart_boundary']}\n")
with (p/'sl-summary.json').open('w') as f:
    data=[]
    for x in map(json.loads,(p/'sl-attempts.jsonl').open()):
        data.append({k:x.get(k) for k in ['_line','floor','attempt','started_at','ended_at','result','turns','end_hp','end_block','incoming','judge','reload','summary','explore']})
    json.dump(data,f,ensure_ascii=False,indent=2)
