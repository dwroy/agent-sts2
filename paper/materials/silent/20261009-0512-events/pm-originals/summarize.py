import json,collections
from pathlib import Path
p=Path(__file__).parent
D=[json.loads(x) for x in (p/'decisions.jsonl').open()];S=[json.loads(x) for x in (p/'states.jsonl').open()];R=json.loads((p/'J8PHG72DGD90-resources.json').read_text())
with (p/'decisions-compact.jsonl').open('w') as f:
 for d in D:
  f.write(json.dumps({k:d.get(k) for k in ['_line','ts','floor','turn','label','decider','chosen','rationale','confidence','fallback','usage','journal','result']},ensure_ascii=False)+'\n')
print('keys',D[0].keys());print('journal example',next((d.get('journal') for d in D if d.get('journal')),None))
for d in D:
 if d['decider']=='codex':print('BRAIN',d['_line'],d['floor'],d['label'],d['chosen'],d['rationale'])
print('CHANGES NONCOMBAT')
for e in R['resource_changes']:
 if e['combat_sequence'] is None: print(e['from']['line'],e['to']['line'],e['to']['floor'],e['from']['screen'],e['to']['screen'],e['from']['hp'],e['to']['hp'],e['from']['max_hp'],e['to']['max_hp'],e['from']['potions'],e['to']['potions'],'SL',e['restart_boundary'])
print('SL')
for x in (p/'sl-attempts.jsonl').open():
 a=json.loads(x);print({k:a.get(k) for k in ['_line','floor','attempt','turns','result','end_hp','end_block','incoming','judge','started_at','ended_at']})
