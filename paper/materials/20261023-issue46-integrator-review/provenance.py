from collections import Counter
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess

R=Path('/home/dw/Projects/agent-sts2'); B=Path(__file__).resolve().parent
S='a213612c65d6262bf4e90ab968b22cb305bed156'
f=json.loads(subprocess.check_output(['git','show',S+':paper/materials/20261023-issue46-allocation/traffic-replay.json'],cwd=R))
raw={}
for name in ['paper/materials/learning/code-proposals.jsonl','logs/runs.jsonl']:
    with (R/name).open('rb') as handle: raw[name]=handle.read(f['inputs'][name]['bytes'])
    assert hashlib.sha256(raw[name]).hexdigest()==f['inputs'][name]['sha256']
queue=[json.loads(line) for line in raw['paper/materials/learning/code-proposals.jsonl'].splitlines() if line]
runs=[json.loads(line) for line in raw['logs/runs.jsonl'].splitlines() if line]
state=json.loads((R/'ops/codex-ops/learn.json').read_text())
tz=dt.timezone(dt.timedelta(hours=8))
def at(value):return dt.datetime.fromisoformat(value).astimezone(dt.timezone.utc)
checked=0
for row in f['batches']:
    batch=state['batches'][row['batch']]
    assert (batch['task'],batch['reason'])==(row['task'],row['reason'])
    timestamp=dt.datetime.strptime(row['batch'][:15],'%Y%m%d-%H%M%S').replace(tzinfo=tz)
    count=sum(1 for run in runs if str(run.get('character','IRONCLAD')).lower()=='silent' and run.get('run_id') and at(run['ended'])<timestamp)
    assert count==row['finished_runs_at_dispatch'], (row['batch'],count,row['finished_runs_at_dispatch'])
    if row['task']!='strategy-proposal':continue
    items={}
    for event in queue:
        if event.get('ts') and at(event['ts'])>=timestamp:continue
        if event.get('op')=='add':items[event['id']]=dict(event)
        elif event.get('op')=='update' and event.get('id') in items:
            items[event['id']].update({k:v for k,v in event.items() if k not in ('op','id')})
    ids=batch.get('proposal_ids',[])
    states=dict(Counter(items.get(ident,{}).get('state','missing') for ident in ids))
    assert len(ids)==row['proposal_count'] and states==row['prior_states'],(row['batch'],states,row['prior_states'])
    assert bool(batch.get('no_change_proposals'))==row['no_change']
    checked+=1
receipt=dict(strategy_batches_reconstructed=checked,all_batch_counts_reconstructed=len(f['batches']),
    exact_queue_and_runs_prefixes=True,current_learn_snapshot_not_original=True,
    scope='Reconstruct historical counts and queue states from exact recorded append-only prefixes plus unchanged batch identities; not a byte verification of the mutable historical learn.json snapshot.')
(B/'provenance.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
