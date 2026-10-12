import bisect, collections, hashlib, json
from pathlib import Path

O = Path(__file__).parent
NEW = ['79UCJ0K6R9C1', 'NEWRFAYKTQHR']
RUNS = json.load(open(O/'runs.json'))
META = {r['run_id']: r for r in json.load(open(O/'run-metadata.json'))}
rows, infection, calendar, relic_first, played = [], [], [], [], []
targets = {'FOOTWORK','ANTICIPATE','PIERCING_WAIL','MIRAGE','TORIC_TOUGHNESS','ENVENOM','NOXIOUS_FUMES','AFTERIMAGE'}

def brief(s):
    c=s.get('combat') or {}; p=c.get('player') or {}
    return dict(hp=s['run']['current_hp'],block=p.get('block'),energy=p.get('energy'),
                powers={q['power_id']:q['amount'] for q in p.get('powers',[])},
                enemies=[dict(id=e['enemy_id'],index=e['index'],hp=e['current_hp'],block=e['block'],alive=e['is_alive'],
                              powers={q['power_id']:q['amount'] for q in e.get('powers',[])},intents=e['intents']) for e in c.get('enemies',[])])

for run in RUNS:
    S=[json.loads(s) for s in (O/run/'states.jsonl').open()]
    assert all(s['state']['run']['character_id'].lower()=='silent' for s in S)
    M={s['ts']:s['state'] for s in S}; times=[s['ts'] for s in S]
    first={}
    for s in S:
        r=s['state']; c=r.get('combat') or {}
        if c:
            f=r['run']['floor']
            if f not in first:
                first[f]=True
                relic_first.append(dict(run=run,asc=META[run]['ascension'],floor=f,relics=[q['relic_id'] for q in r['run'].get('relics',[])],state=brief(r)))
    for line in (O/run/'decisions.jsonl').open():
        d=json.loads(line); ch=d.get('chosen') or {}; action=ch.get('action')
        if not str(d.get('result','')).startswith('completed') or not action: continue
        b=M[d['ts']]; z=S[min(bisect.bisect_right(times,d['ts']),len(S)-1)]['state']
        if not b.get('combat'): continue
        card=(d.get('expect') or {}).get('card',{}).get('id')
        r=dict(run=run,asc=META[run]['ascension'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,
               ts=d['ts'],action=action,card=card,chosen=ch,before=brief(b),after=brief(z))
        if action=='play_card':
            hand=next((h for h in b['combat']['hand'] if h['card_id']==card),{})
            r['text']=hand.get('resolved_rules_text');r['upgraded']=hand.get('upgraded')
            played.append(dict(run=run,card=card,asc=r['asc']))
            if card in targets: rows.append(r)
        if run in NEW: rows.append(dict(r,detail='本批动作'))
        if action=='end_turn':
            h=[q for q in b['combat']['hand'] if q['card_id']=='INFECTION']
            if h:
                infection.append(dict(r,n_infection=len(h),texts=[q.get('resolved_rules_text') for q in h],screen_after=z['screen']))
            if d['turn']==7 and any(q['relic_id']=='STONE_CALENDAR' for q in b['run'].get('relics',[])):
                calendar.append(dict(r,screen_after=z['screen']))
    if run in NEW:
        (O/run/'final-deck.json').write_text(json.dumps(S[-1]['state']['run']['deck'],ensure_ascii=False,indent=2)+'\n')

for name,value in [('mechanism-actions',rows),('infection-ends',infection),('calendar-ends',calendar),('relic-first',relic_first),('played-cards',played)]:
    (O/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
summary={card:dict(runs=list(dict.fromkeys(r['run'] for r in played if r['card']==card)),actions=sum(r['card']==card for r in played)) for card in targets}
(O/'mechanism-counts.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print('逐动作机制验证', {k:(len(v['runs']),v['actions']) for k,v in summary.items()})
print('感染结束',len({r['run'] for r in infection}),len(infection),'历石T7结束',len({r['run'] for r in calendar}),len(calendar))

history=[];section=[]
def keep(section):
    if not section or '静默猎手' not in section[0] or section[0][3:15] not in RUNS:return
    for line in section[1:]:
        if any(w in line for w in ['感染','历石','蜃景','覆甲','步法','敏捷','力量','再生','毒','士兵','SL','回血']):history.append(section[0]+'\n'+line)
for line in Path('/home/dw/Projects/agent-sts2/notes/lessons.md').open():
    if line.startswith('## '):keep(section);section=[line.rstrip()]
    elif section:section.append(line.rstrip())
keep(section)
(O/'historical-mechanism-notes.txt').write_text('\n\n'.join(history)+'\n')
other=[]
for path in sorted(Path('knowledge/characters/silent').glob('*.json')):
    if path.name=='experience.json':continue
    x=json.load(open(path));other.append(dict(file=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),keys=list(x)[:20],metadata={k:x[k] for k in ['character','generated','generated_at','ascension','limitation'] if k in x}))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
