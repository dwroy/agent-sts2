import json,collections
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-191302-postmortem')
D=[json.loads(x) for x in (p/'decisions.jsonl').open()];S=[json.loads(x) for x in (p/'states.jsonl').open()];R=json.loads((p/'HNX4A2WBC34W-resources.json').read_text())
def emit(name,rows):
 (p/name).write_text('\n'.join(json.dumps(x,ensure_ascii=False) for x in rows)+'\n')
def res(x):return {k:x.get(k) for k in ['line','ts','floor','turn','hp','max_hp','potions','screen']}
emit('combats-summary.jsonl',[dict(seq=c['sequence'],floor=c['floor'],enemies=c['enemies'],entry=res(c['entry']),last=res(c['last']),exit=res(c['exit']) if c['exit'] else None,end=c['end'],net=c['observed_net_hp_loss']) for c in R['combats']])
emit('changes-summary.jsonl',[dict(seq=c['combat_sequence'],restart=c['restart_boundary'],before=res(c['from']),after=res(c['to'])) for c in R['resource_changes']])
sl=[json.loads(x) for x in (p/'sl-attempts.jsonl').open()]
emit('sl-summary.jsonl',[{k:x.get(k) for k in ['_line','floor','attempt','started_at','ended_at','result','turns','end_hp','end_block','incoming','judge','reload','give_up_reason']} for x in sl])
emit('brain-summary.jsonl',[{k:d.get(k) for k in ['_line','ts','floor','label','chosen','rationale','journal','result']} for d in D if d['decider']=='codex'])
emit('guard-summary.jsonl',[{k:d.get(k) for k in ['_line','ts','floor','turn','label','chosen','rationale','journal']} for d in D if 'HP guard' in d.get('rationale','') or '护栏' in d.get('rationale','')])
emit('potion-decisions.jsonl',[{k:d.get(k) for k in ['_line','ts','floor','turn','label','chosen','rationale','result']} for d in D if d.get('chosen',{}).get('action') in ['use_potion','discard_potion'] or (d.get('label')=='reward/claim' and '药' in str(d.get('rationale')))])
print('sample keys',D[55].keys())
d=next(d for d in D if d['label']=='combat/plan-choice');print('jev sample',json.dumps({k:d.get(k) for k in ['_line','chosen','answers','answer','journal','questions','result','usage']},ensure_ascii=False)[:7000])
s=next(x['state'] for x in S if x['state'].get('in_combat'));print('combat sample',json.dumps(s['combat'],ensure_ascii=False)[:3000])
print('combats',[(c['floor'],c['entry']['hp'],c['last']['hp'],c['end']) for c in R['combats']])
print('SL',[(x['floor'],x['attempt'],x['turns'],x['result'],x['end_hp']) for x in sl])
