import json, collections, hashlib, bisect
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
A = json.load(open(O/'audit.json'))
R = {r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
NEW = ['HSX4HYATB4E2', 'WYB0NCD6W83J']
selected = ['EXPOSE','PANIC_BUTTON','FOOTWORK','BURST','AFTERIMAGE','MAUL','ROLLING_BOULDER','PIERCING_WAIL','ACCELERANT','DEADLY_POISON','BOUNCING_FLASK']
facts = [x for x in A['cards'] if x['card'] in selected]
(O/'mechanism-actions.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2)+'\n')
supports = {k:sorted({x['run'] for x in facts if x['card']==k},key=lambda r:R[r]['ended']) for k in selected}
gardener=[]
for x in A['cards']:
    before=x['before']['enemies']; after=x['after']['enemies']
    for e in before:
        if e['id']!='PHANTASMAL_GARDENER' or not e['alive']:continue
        z=next((z for z in after if z['index']==e['index'] and z['id']==e['id']),None)
        if z and z['alive'] and z['hp']<e['hp'] and z['block']-e['block']==e['powers'].get('SKITTISH_POWER'):
            gardener.append(x);break
supports['GARDENER']=sorted({x['run'] for x in gardener},key=lambda r:R[r]['ended'])
(O/'gardener-actions.json').write_text(json.dumps(gardener,ensure_ascii=False,indent=2)+'\n')
(O/'mechanism-supports.json').write_text(json.dumps(supports,ensure_ascii=False,indent=2)+'\n')
for key,rs in supports.items():print(key,len(rs),dict(collections.Counter(R[r]['ascension'] for r in rs)),rs)
for run in NEW:
    S=[json.loads(l) for l in (O/run/'states.jsonl').open()]
    D=[json.loads(l) for l in (O/run/'decisions.jsonl').open()]
    stamps={s['observed_ts']:s for s in S}
    assert all(d['observed_ts'] in stamps and d['fingerprint']==stamps[d['observed_ts']]['fingerprint'] for d in D)
    print('指纹一致',run,len(S),len(D))
    print('战斗房',run,[x for x in A['fights'] if x['run']==run])
    print('营火',run,[(x['floor'],x['action'],x['before'],x['after']) for x in A['rests'] if x['run']==run])
    sl=[json.loads(l) for l in (O/run/'sl-attempts.jsonl').open()]
    groups=collections.defaultdict(list)
    for x in sl:groups[x['floor']].append(x)
    comparison=[]
    for f,attempts in groups.items():
        if len(attempts)<2:continue
        first=attempts[0]
        for x in attempts:
            draw=x.get('draws') or {}; fd=first.get('draws') or {}
            comparison.append(dict(run=run,floor=f,attempt=x['attempt'],result=x['result'],turns=x['turns'],
                clean=draw.get('clean'),order=draw.get('order'),same_order=draw.get('order')==fd.get('order'),
                rounds=draw.get('rounds'),explore=x.get('explore')))
    (O/(run+'-sl-comparison.json')).write_text(json.dumps(comparison,ensure_ascii=False,indent=2)+'\n')
    print('SL',run,[(x['floor'],x['attempt'],x['result'],x['turns'],x['same_order']) for x in comparison])
out=[]
for f in (ROOT/'.worktrees/exp/knowledge/characters/silent').glob('*.json'):
    if f.name=='experience.json':continue
    data=json.load(open(f));out.append(dict(file=f.name,sha256=hashlib.sha256(f.read_bytes()).hexdigest(),meta=data.get('meta'),generated=data.get('generated'),generated_from=data.get('generated_from'),baselines={k:v.get('baseline') for k,v in data.get('by_ascension',{}).items()}))
(O/'other-knowledge.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
for run in NEW:
    print('新关键动作',run)
    for x in facts:
        if x['run']==run and (x['floor'] in [13,15,17,33,43,48]) and (x['card'] in ['EXPOSE','PANIC_BUTTON','ROLLING_BOULDER'] or (x['floor']==48 and x['attempt']==6 and x['turn'] in [1,5,7])):
            print(json.dumps(x,ensure_ascii=False))
