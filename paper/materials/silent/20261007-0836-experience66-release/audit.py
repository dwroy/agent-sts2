import bisect,collections,json,random,statistics
from pathlib import Path
OUT=Path(__file__).parent
RUNS=json.load(open(OUT/'runs.json'))
fights=[]; nexts=[]; cards=[]; ends=[]; rests=[]; samples=[]; attempts=[]; growth=[]
def powers(entity):return {p['power_id']:p['amount'] for p in entity.get('powers',[])}
def brief(s):
    c=s.get('combat') or {}; p=c.get('player') or {}
    return {'hp':s['run']['current_hp'],'block':p.get('block'),'energy':p.get('energy'),'powers':powers(p),'enemies':[{'id':e['enemy_id'],'index':e['index'],'hp':e['current_hp'],'block':e['block'],'alive':e['is_alive'],'move':e.get('move_id'),'powers':powers(e),'intents':e['intents']} for e in c.get('enemies',[])]}
for run in RUNS:
    path=OUT/run; A=json.loads((path/'analysis.json').read_text())
    fights.extend([dict(r,run=run) for r in A['fights']]); nexts.extend([dict(r,run=run) for r in A['next_fights'] if r['origin']!='Ancient'])
    attempts.extend([dict(r,run=run) for r in A['attempts']])
    S=[json.loads(x) for x in (path/'states.jsonl').open()]; D=[json.loads(x) for x in (path/'decisions.jsonl').open()]; samples.extend(S)
    stamps=[s['ts'] for s in S]; SM={s['ts']:s['state'] for s in S}
    for d in D:
        if not d.get('chosen'): continue
        if not str(d.get('result','')).startswith('completed') and d['screen'] != 'REST': continue
        before=SM[d['ts']]; after=S[min(bisect.bisect_right(stamps,d['ts']),len(S)-1)]['state']
        action=d['chosen']['action']; meta={'run':run,'floor':d['floor'],'attempt':(2 if run=='TD1HVGS7H6LB' and d['floor']==17 and d['ts']>='2026-10-06T02:16:17.321Z' else d.get('sl_attempt') or 1),'turn':d['turn'],'ts':d['ts']}
        if d['screen']=='REST' and action in ['rest_heal','rest_smith','choose_rest_option']:
            rests.append(dict(meta,action=action,chosen=d['chosen'],before=before['run']['current_hp'],after=after['run']['current_hp']))
        if action=='play_card':
            card=d.get('expect',{}).get('card',{}).get('id'); played=next((c for c in before['combat']['hand'] if c['card_id']==card),{})
            cards.append(dict(meta,card=card,target=d['chosen'].get('target_index'),text=played.get('resolved_rules_text'),dynamic=played.get('dynamic_values'),before=brief(before),after=brief(after)))
        if action=='end_turn' and before.get('combat'):
            ends.append(dict(meta,before=brief(before),after=brief(after)))
    for state in S:
        s=state['state']
        if s['screen']=='COMBAT' and s.get('combat'):
            for e in s['combat']['enemies']:
                if e['enemy_id'] in ['KIN_FOLLOWER','KIN_PRIEST']:
                    growth.append({'run':run,'floor':s['run']['floor'],'turn':s['turn'],'ts':state['ts'],'enemy':e['enemy_id'],'index':e['index'],'move':e.get('move_id'),'powers':powers(e),'intents':e['intents']})
asc_by_run={run:json.loads((OUT/run/'completed-runs.json').read_text())[-1]['ascension'] for run in RUNS}
bands=[]
for asc in range(11):
 for act in [1,2,3]:
  for room in ['Monster','Elite','Unknown','Boss']:
   for band in ['<25%','25–40%','40–60%','≥60%']:
    r=[x for x in fights if (x['asc'],x['act'],x['type'],x['band'])==(asc,act,room,band)]; wins=[x['loss'] for x in r if not x['death']]
    bands.append({'asc':asc,'act':act,'type':room,'band':band,'n':len(r),'runs':len({x['run'] for x in r}),'deaths':sum(x['death'] for x in r),'median_win':statistics.median(wins) if wins else None,'losses':[x['loss'] for x in r],'cases':[(x['run'],x['floor']) for x in r]})
transfers=[]
for asc in range(11):
 for act in [1,2,3]:
  for screen in ['REST','SHOP','EVENT']:
   for band in ['<25%','25–40%','40–60%','≥60%']:
    r=[x for x in nexts if (asc_by_run[x['run']],x['act'],x['screen'],x['band'])==(asc,act,screen,band)]; wins=[x['next_loss'] for x in r if not x['next_death']]
    transfers.append({'asc':asc,'act':act,'screen':screen,'band':band,'n':len(r),'unique_fights':len({(x['run'],x['next_floor']) for x in r}),'deaths':sum(x['next_death'] for x in r),'median_win':statistics.median(wins) if wins else None,'cases':r})
rng=random.Random(20260929); manifest=[]
for asc in sorted({s['state']['run']['ascension'] for s in samples})[-2:]:
    for screen in ['COMBAT','REWARD','MAP','EVENT','REST','SHOP']:
        pool=[s for s in samples if s['screen']==screen and s['state']['run']['ascension']==asc and s['state']['run']['character_id'].lower()=='silent']
        selected=rng.sample(pool,min(20,len(pool)))
        assert selected, (asc, screen, len(pool))
        if len(selected) < 20:
            selected += rng.choices(pool, k=20-len(selected))
        (OUT/f'sample-a{asc}-{screen.lower()}.jsonl').write_text(''.join(json.dumps(s,ensure_ascii=False)+'\n' for s in selected))
        manifest.append({'asc':asc,'screen':screen,'pool':len(pool),'selected':len(selected),'unique':len({s['ts'] for s in selected}),'timestamps':[s['ts'] for s in selected]})
data={'runs':RUNS,'cutoff':'2026-10-06T23:23:38.170Z','fights':fights,'bands':bands,'nexts':nexts,'transfers':transfers,'rests':rests,'cards':cards,'ends':ends,'attempts':attempts,'growth':growth}
(OUT/'audit.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n'); (OUT/'sample-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('完成审计',len(fights),'场；',len(samples),'帧；',len(manifest)*20,'切片')
