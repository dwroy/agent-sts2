import collections, json
from pathlib import Path
O=Path(__file__).parent
A=json.load(open(O/'audit.json'));E=json.load(open('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json'))
result=json.load(open(O/'resource-history-initial.json'))
entry=next(e for e in E['entries'] if e['id']=='silent-act-transition-missing-hp-heal')
records=[];missing=[]
for run in entry['evidence']:
    states=[json.loads(l)['state'] for l in (O/run/'states.jsonl').open()]
    found=False
    for fight in [f for f in A['fights'] if f['run']==run and f['type']=='Boss' and not f['death']]:
        before=[s for s in states if s['run']['floor']==fight['floor']]
        after=[s for s in states if s['run']['floor']==fight['floor']+1]
        first=next(s for s in before if s.get('combat'))
        if not after or after[0]['run']['act_id']==first['run']['act_id']:continue
        a=before[-1]['run'];z=after[0]['run']
        records.append(dict(run=run,floor=fight['floor'],before=a['current_hp'],after=z['current_hp'],max_before=a['max_hp'],max_after=z['max_hp'],expected=(a['max_hp']-a['current_hp'])*4//5,observed=z['current_hp']-a['current_hp'],same_cap=a['max_hp']==z['max_hp']))
        found=True
    if not found:missing.append(run)
result['transitions']=records;result['missing_raw_transition']=missing
(O/'resource-history.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
good=[r for r in records if r['same_cap'] and r['observed']==r['expected']]
bad=[r for r in records if r not in good]
print('沙虫重打',result['insatiable_sl'],'；同上限80%跨幕',len(good),'；其他先古/上限变化/缺帧需另核',bad,missing)
