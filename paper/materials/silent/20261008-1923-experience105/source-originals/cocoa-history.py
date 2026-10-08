import collections, json
from pathlib import Path
O=Path(__file__).parent
runs=json.load((O/'run-metadata.json').open())
rows=[]
for meta in runs:
    openings={}
    for line in (O/meta['run_id']/'states.jsonl').open('rb'):
        if b'VERY_HOT_COCOA' not in line:
            continue
        r=json.loads(line);s=r['state'];c=s.get('combat')
        if not c or s['screen']!='COMBAT' or s['turn']!=1 or not c['hand'] or c['player']['cards_played_this_turn']!=0:
            continue
        if not any(x['relic_id']=='VERY_HOT_COCOA' for x in s['run']['relics']):
            continue
        key=s['run']['floor']
        if key in openings:
            continue
        openings[key]=dict(run=meta['run_id'],asc=meta['ascension'],floor=key,ts=r['ts'],energy=c['player']['energy'],powers=c['player']['powers'],relics=[x['relic_id'] for x in s['run']['relics']],hand=[x['card_id'] for x in c['hand']])
    rows.extend(openings.values())
(O/'cocoa-history.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('历史可可开场',len(rows),'战',len({r['run'] for r in rows}),'局',dict(collections.Counter(r['energy'] for r in rows)))
for n in dict.fromkeys(r['run'] for r in rows):
    cases=[r for r in rows if r['run']==n]
    print(n,cases[0]['asc'],len(cases),dict(collections.Counter(r['energy'] for r in cases)))
