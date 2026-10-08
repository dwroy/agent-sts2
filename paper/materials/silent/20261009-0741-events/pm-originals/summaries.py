import json,collections
from pathlib import Path
p=Path('learner/runs/20261009-071302-postmortem')
rows=[json.loads(x) for x in (p/'decisions.jsonl').open()]
print('DECIDERS',collections.Counter(x['decider'] for x in rows))
for r in rows:
    if r['decider']=='codex' or 'HP guard' in r['rationale'] or r['chosen'].get('action') in ('use_potion','discard_potion'):
        print('D',r['_line'],r['ts'],r['floor'],r['turn'],r['label'],r['chosen'],r['rationale'])
        if r['decider']=='codex': print('SIM',r.get('boss_sim'))
print('SL')
for x in (p/'sl-attempts.jsonl').open():
    r=json.loads(x)
    print({k:r.get(k) for k in ('_line','attempt','started_at','ended_at','turns','end_hp','end_block','incoming','result','reload','give_up_reason')})
    e=r.get('explore') or {}
    print('deviation',e.get('deviation'),'target', {k:(e.get('target') or {}).get(k) for k in ('turn','reference','point')})
print('PLANS')
for x in (p/'run-plans.jsonl').open():
    r=json.loads(x);print(r['_line'],r['ts'],r['floor'],r['plan'])
print('RESOURCES')
r=json.loads((p/'CSLHFCBSC1UM-resources.json').read_text())
for c in r['combats']:
    print('C',c['sequence'],c['floor'],c['enemies'],c['entry'],c['last'],c['exit'],c['observed_net_hp_loss'],c['end'])
print('CHANGES')
for c in r['resource_changes']:
    print('R',c['combat_sequence'],c['restart_boundary'],c['from'],c['to'])
