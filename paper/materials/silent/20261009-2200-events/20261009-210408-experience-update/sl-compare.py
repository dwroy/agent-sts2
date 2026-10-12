import collections
import json
from pathlib import Path

O=Path(__file__).parent.resolve()
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
groups=collections.defaultdict(list)
for run in R:
    for line in (O/run/'sl-attempts.jsonl').open():
        x=json.loads(line);groups[(run,x['floor'])].append(x)
comparisons=[]
for (run,floor),rows in groups.items():
    if max(r['attempt'] for r in rows)<=1:continue
    orders=[(r.get('draws') or {}).get('order',[])[:(r.get('draws') or {}).get('clean',0)] for r in rows]
    prefix=0
    for values in zip(*orders):
        if len(set(values))!=1:break
        prefix+=1
    decisions=[json.loads(x) for x in (O/run/'decisions.jsonl').open()]
    attempts=[]
    for r in rows:
        ds=[d for d in decisions if d['floor']==floor and (d.get('sl_attempt') or 1)==r['attempt'] and (d.get('chosen') or {}).get('action') in ['play_card','use_potion']]
        attempts.append(dict(attempt=r['attempt'],result=r['result'],turns=r['turns'],end_hp=r.get('end_hp'),draws=r.get('draws'),explore=r.get('explore'),decision_actions=[dict(turn=d['turn'],card=(d.get('expect') or {}).get('card',{}).get('id'),potion=(d.get('expect') or {}).get('potion'),target=d['chosen'].get('target_index'),sl_explore=d.get('sl_explore')) for d in ds]))
    base=attempts[0]['decision_actions']
    wins=[]
    for a in attempts:
        if a['result']!='won':continue
        other=a['decision_actions'];diff=next((i for i,(x,y) in enumerate(zip(base,other)) if x!=y),min(len(base),len(other)))
        wins.append(dict(attempt=a['attempt'],first_action_difference=diff,before=base[diff] if diff<len(base) else None,after=other[diff] if diff<len(other) else None))
    comparisons.append(dict(run=run,asc=R[run]['ascension'],floor=floor,enemies=rows[0]['enemies'],shared_recorded_prefix=prefix,attempts=attempts,wins=wins,limitation='记录共同前缀不等完整同抽/同弃牌/同轮次；首动作差异只是观察。TD1跨重放旧sl_attempt标签缺失依既有分析修正，原始动作仍保留。'))
legacy=json.load(open(O/'TD1HVGS7H6LB/analysis.json'))['attempts']
legacy=[a for a in legacy if a['floor']==17]
assert len(legacy)==2
comparisons.append(dict(run='TD1HVGS7H6LB',asc=R['TD1HVGS7H6LB']['ascension'],floor=17,enemies=['VANTOM'],shared_recorded_prefix=None,attempts=legacy,wins=[],limitation='第二次跨进程恢复缺原SL落盘和sl_attempt标记；沿上一节以02:16:17.321Z起状态/决策重建，不声称成功reload或完整同抽。'))
(O/'sl-draw-comparison.json').write_text(json.dumps(comparisons,ensure_ascii=False,indent=2)+'\n')
print('历史多次尝试对照',len(comparisons),'场，获胜尝试',sum(len(x['wins']) for x in comparisons))
