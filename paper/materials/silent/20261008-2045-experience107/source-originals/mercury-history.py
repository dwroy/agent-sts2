import collections
import json
from pathlib import Path

O=Path(__file__).parent
runs=json.load((O/'runs.json').open())
findings=[]
for run in runs:
    frames=[]
    for raw in (O/run/'states.jsonl').open():
        if 'MERCURY_HOURGLASS' not in raw:
            continue
        r=json.loads(raw); s=r['state']
        assert s['run']['character_id'].lower()=='silent'
        if not any(x['relic_id']=='MERCURY_HOURGLASS' for x in s['run'].get('relics',[])):
            continue
        if s['screen']=='COMBAT' and s.get('combat'):
            frames.append(r)
    if not frames:
        continue
    floors=collections.defaultdict(list)
    for r in frames:floors[r['state']['run']['floor']].append(r)
    cases=[]
    for floor, rows in floors.items():
        a=rows[0]; z=rows[1] if len(rows)>1 else a
        def enemies(r):
            return [(e['enemy_id'],e['current_hp'],e.get('powers',[])) for e in r['state']['combat']['enemies']]
        cases.append(dict(floor=floor,before_ts=a['ts'],after_ts=z['ts'],before=enemies(a),after=enemies(z),player_hp=[a['state']['run']['current_hp'],z['state']['run']['current_hp']],ready=[a['state']['combat']['player']['energy'],z['state']['combat']['player']['energy']]))
    findings.append(dict(run=run,cases=cases,limitation='持有不当机制支持；独立触发/动作/其他被动尚需逐例核，首可行动已就绪的帧不推补初始伤害。'))
(O/'mercury-history.json').write_text(json.dumps(findings,ensure_ascii=False,indent=2)+'\n')
print('历史141局检索',[(x['run'],len(x['cases'])) for x in findings])
