import collections, hashlib, json
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'))
E=json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
C=json.load(open(O/'changes.json'));by={e['id']:e for e in E['entries']}
facts={}
for eid in C['updated']:
    e=by[eid]
    facts[eid]=dict(evidence=e['evidence'],contradicting=e.get('contradicting',[]),asc_support=dict(collections.Counter(R[r]['ascension'] for r in e['evidence'])))
for eid,card in [('silent-footwork-block','FOOTWORK'),('silent-abrasive-thorns-dexterity','ABRASIVE'),('silent-fasten-defend-extra-block','FASTEN'),('silent-expose-vulnerable','EXPOSE')]:
    plays=[x for x in A['cards'] if x['card']==card]
    support=set(by[eid]['evidence']);actual={x['run'] for x in plays}
    assert support<=actual,(eid,support-actual)
    facts[eid]['actions']=[x for x in plays if x['run'] in support]
    facts[eid]['actual_runs']=len(actual);facts[eid]['actual_plays']=len(plays)
    if card=='EXPOSE':assert all('消耗' in x['text'] for x in facts[eid]['actions'] if x['text'])
    print(eid,'纳证',len(support),'均有实际施放；历史实际',len(actual),'局',len(plays),'次')
eid='silent-gorget-plating'
data=[x for x in A['ends'] if x['run'] in by[eid]['evidence'] and 'PLATING_POWER' in x['before']['powers']]
assert {x['run'] for x in data}==set(by[eid]['evidence'])
facts[eid]['end_turns']=data
eid='silent-nightmare-next-turn-copies'
data=[]
for run in by[eid]['evidence']:
    seen=False
    for line in (O/run/'states.jsonl').open():
        x=json.loads(line);s=x['state'];c=s.get('combat')
        if c and any(p['power_id']=='NIGHTMARE_POWER' and p['amount']==3 for p in c['player'].get('powers',[])):
            data.append(dict(run=run,ts=x['ts'],floor=s['run']['floor'],turn=s['turn'],player=c['player'],hand=c['hand']));seen=True
    assert seen,run
facts[eid]['established_states']=data
eid='silent-dowsing-rod-question-task'
data=[]
for run in by[eid]['evidence']:
    seen=set()
    for line in (O/run/'states.jsonl').open():
        x=json.loads(line);s=x['state']
        for card in s['run'].get('deck',[]):
            cid=card.get('card_id')
            if cid in ['DOWSING','ABUNDANCE'] and cid not in seen:
                data.append(dict(run=run,ts=x['ts'],floor=s['run']['floor'],card=card));seen.add(cid)
    assert seen=={'DOWSING','ABUNDANCE'},(run,seen)
facts[eid]['task_states']=data
eid='silent-obscura-summon-growth'
fs=[f for f in A['fights'] if f['run'] in by[eid]['evidence'] and any(i in ['THE_OBSCURA','FOGMOG'] for i in f['enemies'])]
assert set(x['run'] for x in fs)==set(by[eid]['evidence'])
facts[eid]['fights']=fs
facts[eid]['end_turns']=[x for x in A['ends'] if x['run'] in by[eid]['evidence'] and any(e['id'] in ['THE_OBSCURA','PARAFRIGHT','FOGMOG'] for e in x['before']['enemies'])]
facts['silent-strength-weak-observation']['actions']=[x for x in A['cards'] if x['run'] in by['silent-strength-weak-observation']['evidence'] and (x['before']['powers'].get('STRENGTH_POWER') or x['before']['powers'].get('DEXTERITY_POWER') or any(e['powers'].get('STRENGTH_POWER') or e['powers'].get('WEAK_POWER') for e in x['before']['enemies']))]
(O/'historical-facts.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2)+'\n')
common=json.load(open(ROOT/'.worktrees/exp/knowledge/common/monster-db.json'))['monsters']
db={}
for enemy,moves in {'KIN_PRIEST':['BEAM_MOVE'],'PARAFRIGHT':['SLAM_MOVE'],'THE_OBSCURA':['PIERCING_GAZE_MOVE','HARDENING_STRIKE_MOVE','SAIL_MOVE'],'BYRDONIS':['PECK_MOVE']}.items():
    m=common[enemy];db[enemy]=dict(hp=m.get('hp_by_asc'),moves={k:m['moves'][k] for k in moves})
(O/'common-facts-check.json').write_text(json.dumps(db,ensure_ascii=False,indent=2)+'\n')
assert common['PARAFRIGHT']['moves']['SLAM_MOVE']['damage_by_asc']['10']['base_per_hit'].get('17')
print('全部支持/反例及进阶',[(i,x['asc_support']) for i,x in facts.items()])
print('所有机制只用静默；子机制样本与整战因果分别核。')
