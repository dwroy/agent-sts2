import bisect
import json
from pathlib import Path

O=Path(__file__).parent
A=json.load(open(O/'audit.json'))
cases=[c for c in A['cards'] if c['card']=='PANACHE']
runs=sorted({c['run'] for c in cases})
rows=[]
for run in runs:
    states=[json.loads(line) for line in (O/run/'states.jsonl').open()]
    stamps=[s['ts'] for s in states]
    for line in (O/run/'decisions.jsonl').open():
        d=json.loads(line)
        if not d.get('chosen') or d['chosen']['action']!='play_card' or not str(d.get('result','')).startswith('completed'):continue
        i=bisect.bisect_right(stamps,d['ts'])-1
        if i<0 or i+1>=len(states):continue
        a,b=states[i]['state'],states[i+1]['state']
        ca,cb=a.get('combat') or {},b.get('combat') or {}
        p,q=ca.get('player') or {},cb.get('player') or {}
        powers={x['power_id']:x['amount'] for x in p.get('powers',[])}
        count=p.get('cards_played_this_turn',0)
        if powers.get('PANACHE_POWER')!=10 or count!=4 or q.get('cards_played_this_turn')!=5 or a.get('turn')!=b.get('turn'):continue
        before=ca.get('enemies',[])
        after={e['enemy_id']:e for e in cb.get('enemies',[])}
        deltas=[]
        if len({e['enemy_id'] for e in before})==len(before):
            for e in before:
                if e['enemy_id'] in after:
                    z=after[e['enemy_id']]
                    deltas.append(dict(enemy=e['enemy_id'],hp=[e['current_hp'],z['current_hp']],block=[e['block'],z['block']],total=e['current_hp']+e['block']-z['current_hp']-z['block']))
        rows.append(dict(run=run,floor=d['floor'],attempt=d.get('sl_attempt') or 1,turn=d['turn'],card=d.get('expect',{}).get('card',{}).get('id'),count=[count,q['cards_played_this_turn']],powers=powers,deltas=deltas,ts=d['ts']))
(O/'panache-history.json').write_text(json.dumps(dict(establishments=cases,candidate_runs=runs,fifth_card_pairs=rows),ensure_ascii=False,indent=2)+'\n')
print('历史神气建立',len(cases),'次/',len(runs),'局；第五张配对',len(rows))
for row in rows:print(row['run'],row['floor'],row['turn'],row['card'],row['deltas'])
