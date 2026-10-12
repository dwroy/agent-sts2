import json, collections
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-034303-postmortem')
def rows(name):
    out=[]
    with (P/(name+'.lines')).open() as h:
        for line in h:
            n,raw=line.split(':',1); d=json.loads(raw); d['_line']=int(n); out.append(d)
    return out
D=rows('decisions'); PL=rows('plans'); SL=rows('sl')
with (P/'decisions-summary.txt').open('w') as out:
    def emit(*v): print(*v,file=out)
    emit('决策窗',D[0]['ts'],D[-1]['ts'],'观测起点',D[0]['observed_ts'])
    emit('决策',len(D),'决策者',dict(collections.Counter(x['decider'] for x in D)))
    emit('低信心',len([x for x in D if x['decider']=='jev' and (x.get('confidence') or 1)<.35]))
    rc=[x for x in D if type(x.get('rollout_best_chosen')) is bool]
    emit('推演最优',len(rc),collections.Counter(x['rollout_best_chosen'] for x in rc))
    emit('护栏',[(x['_line'],x['floor'],x['turn'],x.get('hp_guard'),x.get('rationale')) for x in D if 'guard' in str(x).lower() and ('hp_guard' in x or 'guard' in x.get('rationale','').lower())])
    emit('非零兜底',[(x['_line'],x['floor'],x['label']) for x in D if x.get('fallback') or x.get('no_jev')])
    for x in PL: emit('计划',x['_line'],x['floor'],x['trigger'],json.dumps(x['plan'],ensure_ascii=False))
    for x in SL: emit('SL',json.dumps({k:x.get(k) for k in ['_line','floor','attempt','started_at','ended_at','result','turns','end_hp','judge','reload','give_up_reason']},ensure_ascii=False))
    for x in D:
        if x['decider']=='codex' or x.get('chosen',{}).get('action','') in ['use_potion','discard_potion','drink_potion'] or 'potion' in x.get('chosen',{}).get('action',''):
            emit('d'+str(x['_line']),x['floor'],x['turn'],x['label'],json.dumps(x.get('chosen'),ensure_ascii=False),x.get('journal'),x['rationale'],x.get('result'))
    for x in D:
        if x['floor']>=27 or x.get('hp_guard'):
            emit('d'+str(x['_line']),x['floor'],x['turn'],x['label'],x['decider'],x['rationale'],x.get('confidence'),json.dumps(x.get('chosen'),ensure_ascii=False))
    for decider in ['jev','codex','code','jev-plan']:
        xs=[x for x in D if x['decider']==decider]; emit('用量',decider,{k:sum((x.get('usage') or {}).get(k,0) or 0 for x in xs) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
    emit('延迟', {k:sum((x.get('latency_ms') or {}).get(k,0) or 0 for x in D) for k in ['plan','jev','action','deepseek','planner','pre']})
start,end=D[0]['ts'],D[-1]['ts']
count=0
with Path('/home/dw/Projects/agent-sts2/logs/deepseek-reasoning.jsonl').open() as h, (P/'reasoning-window.jsonl').open('w') as o:
    for i,line in enumerate(h,1):
        try: x=json.loads(line)
        except ValueError: continue
        ts=x.get('ts','')
        if start <= ts <= end:
            x['_line']=i; o.write(json.dumps({k:x.get(k) for k in ['_line','floor','attempt','started_at','ended_at','result','turns','end_hp','judge','reload','give_up_reason']},ensure_ascii=False)+'\n'); count+=1
print('摘要已保存，时间窗内DeepSeek推理条数',count)
