import json,collections
from pathlib import Path
p=Path('learner/runs/20261009-071302-postmortem');s=[json.loads(x) for x in (p/'states.jsonl').open()];d=[json.loads(x) for x in (p/'decisions.jsonl').open()];res=json.loads((p/'CSLHFCBSC1UM-resources.json').read_text())
for c in res['combats']:
    end=(c['exit'] or c['last'])['line']; frames=[r for r in s if c['entry']['line']<=r['_line']<=end]; turns=sorted({r['state']['turn'] for r in frames}); hp=lambda r:sum(e['current_hp'] for e in r['state']['combat']['enemies'] if e['is_alive']); losses=[];dmg=[];parts=[];blocks=[];threat=[]
    for t in turns:
        rr=[r for r in frames if r['state']['turn']==t];a,b=rr[0],rr[-1];later=next((r for r in frames if r['_line']>b['_line']),None);tail=later or b
        dmg.append(hp(a)-hp(tail));losses.append(a['state']['run']['current_hp']-tail['state']['run']['current_hp']);parts.append((hp(a),hp(tail)));blocks.append((b['state'].get('combat',{}).get('player') or {}).get('block'));threat.append(sum(y['total_damage'] or 0 for e in b['state']['combat']['enemies'] for y in e['intents']))
    print('C',c['sequence'],'F',c['floor'],'IDS',sorted({(e['name'],e['enemy_id'],e['max_hp']) for r in frames for e in r['state']['combat']['enemies']}),'NET_DMG',dmg,'HP_LOSS',losses,'PARTS',parts,'BLOCK',blocks,'THREAT',threat)
print('FOCUS')
count=chosen=0
for r in d:
    plan=r.get('questions',{}).get('plan',{}); opts={k:json.loads(v) for k,v in plan.get('criteria',{}).items()}; focus={k:v['focus'] for k,v in opts.items() if 'focus' in v}
    if not focus:continue
    count+=1; key=r.get('answers',{}).get('plan',{}).get('choice'); picked=focus.get(key)
    if picked:chosen+=1;print('D',r['_line'],r['floor'],r['turn'],key,picked,r['rationale'])
print('FOCUS_COUNTS',count,chosen)
print('CODE_NONEND',len({(r['floor'],r.get('sl_attempt') or 0,r['turn']) for r in d if r['turn'] and r['label'].startswith('combat/') and r['decider']=='code' and not r['rationale'].startswith('continuing') and r['chosen']['action']!='end_turn'}))
print('JEVPLAN_BOSS',len([r for r in d if r['floor']==17 and 'plan' in r.get('questions',{})]),sum(r.get('rollout_best_chosen') is True for r in d if r['floor']==17 and 'plan' in r.get('questions',{})))
print('ROUTE_SELECTED')
for line in (p/'brain.jsonl').open():
    r=json.loads(line);payload=r.get('payload',{})
    if r['label']=='map/route-plan':
        cand=payload.get('route_map',{}).get('candidate_routes',{});print('B',r['_line'],'cand keys',cand.keys())
        for route in cand.get('routes',[]):
            if 'r1c4 r2c4' in route:print('CAND',route)
    if r['label']=='rest/plan':
        route=payload.get('route_review',{});print('B',r['_line'], 'floor',next(x['floor'] for x in d if x.get('deepseek') and x['label']==r['label'] and x['deepseek']['reason']==r['answer']['reason']),'projection',(route.get('plan_facts') or {}))
print('RESOURCE_CHANGES_OUTSIDE')
for r in res['resource_changes']:
    if r['combat_sequence'] is None:print(r)
