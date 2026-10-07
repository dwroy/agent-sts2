import json,pathlib,collections
p=pathlib.Path('learner/runs/20261008-051302-postmortem'); load=lambda n:[json.loads(s) for s in (p/(n+'.jsonl')).open()]
d=load('decisions');s=load('states'); b=load('brain'); sl=load('sl-attempts'); plans=load('run-plans')
print('LINES',[(n,len(load(n)),load(n)[0]['_line'],load(n)[-1]['_line']) for n in ['decisions','states','brain','run-plans','sl-attempts']])
for r in d:
 if r['decider']=='codex':print('脑决策',r['_line'],r['floor'],r['label'],r['chosen'],r['rationale'])
for r in plans:print('PLAN',r['_line'],json.dumps(r,ensure_ascii=False)[:4500])
for r in sl:print('SL',r['_line'],{k:r.get(k) for k in ['floor','attempt','started_at','ended_at','result','turns','end_hp','incoming','judge','reload','give_up_reason']},'DEVIATE',r.get('explore',{}).get('deviation'))
print('JEVMETRIC',len([r for r in d if r['decider']=='jev']),len([r for r in d if r['decider']=='jev' and isinstance(r.get('confidence'),(float,int)) and r['confidence']<.35]))
for r in d:
 if r['label'].startswith('combat/') and ('guard' in r['rationale'].lower() or 'override' in r['rationale'].lower()):print('GUARD',r['_line'],r['rationale'])
print('USAGE', {k:sum(r.get('usage',{}).get(k,0) or 0 for r in d if r['decider']=='jev') for k in ['input_tokens','output_tokens','cache_hit_tokens']})
for r in b:print('BRAIN',r['_line'],r.keys(),r.get('usage')) if r==b[0] else None
r=json.loads((p/'MTQ0EUBJ3R6T-resources.json').read_text())
for c in r['combats']:
 print('COMBAT',c['sequence'],c['floor'],c['enemies'],'ENTRY',c['entry'],'EXIT',c['exit'],'LAST',c['last'],'END',c['end'])
print('CHANGES')
for ch in r['resource_changes']:print(ch)
