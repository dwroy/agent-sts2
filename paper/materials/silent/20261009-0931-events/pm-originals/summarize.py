import json,collections
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-091302-postmortem')
for run in ['VAC6Z1PZ1QJG','NG1FBJTSRLHS']:
    d=[json.loads(x) for x in (p/f'{run}-decisions.jsonl').open()]
    states=[json.loads(x) for x in (p/f'{run}-states.jsonl').open()]
    sm={x['_line']:x for x in states};res=json.loads((p/f'{run}-resources.json').read_text())
    output=[]
    def emit(*args):output.append(' '.join(json.dumps(a,ensure_ascii=False) if not isinstance(a,str) else a for a in args))
    emit('METRICS',{'deciders':dict(collections.Counter(x['decider'] for x in d)),'low':sum(x['decider']=='jev' and isinstance(x.get('confidence'),(int,float)) and x['confidence']<.35 for x in d),'first':d[0]['ts'],'observed':d[0]['observed_ts'],'last':d[-1]['ts']})
    for c in res['combats']:
        ent,end=c['entry'],c.get('exit') or c['last']
        emit('COMBAT',c['sequence'],c['floor'],c['enemies'],'ENTRY',ent,'END',end,c['end'],'NET',None if not c.get('exit') else end['hp']-ent['hp'])
    for e in res['resource_changes']:
        if e['combat_sequence'] is None:emit('OUTSIDE',e)
    for x in d:
        if x['decider']=='codex':emit('BRAIN',x['_line'],x['floor'],x['label'],x.get('chosen',{}),x.get('journal'), 'SIM',x.get('boss_sim'))
        if 'potion' in x.get('chosen',{}).get('action','') or 'HP' in x.get('rationale','') or 'guard' in x.get('rationale','').lower():emit('SPECIAL',x['_line'],x['floor'],x['turn'],x['label'],x.get('chosen',{}),x['rationale'])
    emit('LAST DECK',states[-1]['state']['run']['deck']);emit('LAST RELICS',states[-1]['state']['run']['relics'])
    for x in [json.loads(z) for z in (p/f'{run}-sl-attempts.jsonl').open()]:emit('SL',x)
    (p/f'{run}-summary.txt').write_text('\n'.join(output)+'\n')
    compact=[]
    for c in res['combats']:
        a,b=c['entry']['line'],(c.get('exit') or c['last'])['line']
        rows=[s for s in states if a<=s['_line']<=b]
        groups=[]
        for s in rows:
            t=(s['state'].get('combat') or {}).get('turn')
            if t is None:t=(s['state'].get('agent_view') or {}).get('turn')
            if not groups or groups[-1][0]!=t:groups.append([t,[]])
            groups[-1][1].append(s)
        for t,ss in groups:
            def brief(s):
                st=s['state'];co=st.get('combat') or {};pl=co.get('player') or {}
                return {'line':s['_line'],'ts':s['ts'],'hp':st['run']['current_hp'],'enemies':[{k:e.get(k) for k in ['index','enemy_id','name','current_hp','max_hp','block','powers','intents','move_id','is_alive']} for e in co.get('enemies',[])],'player':{k:pl.get(k) for k in ['block','energy','powers']},'hand':[{k:h.get(k) for k in ['index','card_id','name','resolved_rules_text','energy_cost']} for h in co.get('hand',[])]}
            compact.append({'seq':c['sequence'],'floor':c['floor'],'turn':t,'start':brief(ss[0]),'end':brief(ss[-1]),'next':brief(sm[b]) if t==groups[-1][0] else brief(groups[groups.index([t,ss])+1][1][0])})
    (p/f'{run}-turns.json').write_text(json.dumps(compact,ensure_ascii=False,indent=2)+'\n')
    jev=[x for x in d if x['decider']=='jev' and x['label'].startswith('combat/')]
    (p/f'{run}-jev.txt').write_text('\n'.join(json.dumps({k:x.get(k) for k in ['_line','floor','turn','label','rationale','confidence','answer','response','jev','rollout_best_chosen','chosen','sl_attempt']},ensure_ascii=False) for x in jev)+'\n')
    print(run,len(output),'lines',list(d[5].keys()),'combat keys',next((list(s['state']['combat'].keys()) for s in states if s['state'].get('combat')),[]))
