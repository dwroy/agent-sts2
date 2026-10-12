import json,collections,importlib.util
from pathlib import Path
p=Path('learner/runs/20261009-071302-postmortem')
s=[json.loads(x) for x in (p/'states.jsonl').open()];d=[json.loads(x) for x in (p/'decisions.jsonl').open()]
res=json.loads((p/'CSLHFCBSC1UM-resources.json').read_text())
spec=importlib.util.spec_from_file_location('ledger','learner/ledger.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
items=m.fold(m.read_rows('paper/materials/learning/ledger.jsonl'))
for ident in ('silent-0019','silent-0021','silent-0030','silent-0079','silent-0125','silent-0200','silent-0235','silent-0025'):
    x=items[ident]; print('LEDGER',ident,x['status'],x.get('version'),x['claim']);print('FIRST',x['first_run'],x['prior']);print('RECENT_EVIDENCE',x['evidence'][-2:])
print('GUARDS',[(r['_line'],r['floor'],r['turn'],r['rationale']) for r in d if 'HP guard' in r['rationale'] or 'guard bound' in r['rationale']])
print('SL')
for line in (p/'sl-attempts.jsonl').open():
    r=json.loads(line); print({k:r.get(k) for k in ('_line','attempt','started_at','ended_at','turns','end_hp','end_block','incoming','result')});print('DEV',(r.get('explore') or {}).get('deviation'))
print('JEV_KEYS')
r=next(r for r in d if r['floor']==17 and r['turn']==3 and r['decider']=='jev');print('keys',r.keys());print('question',r['questions']);print('rationale',r['rationale']);print('other',{k:v for k,v in r.items() if k not in ('questions','fingerprint','deepseek','boss_sim','usage','journal','expect','rationale')})
print('BRAIN REST')
for r in d:
    if r['label']=='rest/plan':
        print(r['_line'],r['floor'],r['rationale']);print('questions keys',{k:list(v) for k,v in r['questions'].items()});print('journal',r.get('journal'))
print('STATE_BOSS')
for c in res['combats'][9:]:
    frames=[r for r in s if c['entry']['line']<=r['_line']<=c['last']['line']]
    print('ATTEMPT',c['sequence']-9)
    for turn in sorted({r['state']['turn'] for r in frames}):
        rr=[r for r in frames if r['state']['turn']==turn];a,b=rr[0],rr[-1];aa,bb=a['state'],b['state'];pa=aa['combat']['player'];pb=bb['combat']['player'];e=bb['combat']['enemies'];print('T',turn,'s',a['_line'],b['_line'],'hp',aa['run']['current_hp'],'->',bb['run']['current_hp'],'block',pb['block'],'energy',pa['energy'],'powers',[(x['power_id'],x['amount']) for x in pb['powers']],'enemy',[(x['current_hp'],x['block'],x['intent'],[(y['power_id'],y['amount']) for y in x['powers']],x['intents']) for x in e])
