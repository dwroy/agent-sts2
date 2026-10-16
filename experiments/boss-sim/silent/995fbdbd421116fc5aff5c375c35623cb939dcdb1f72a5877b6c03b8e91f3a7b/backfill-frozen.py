"""Recover indexed frames only within the original frozen runs/SL snapshot."""
import hashlib
import json
from pathlib import Path
import shutil
import sys

HERE=Path(__file__).resolve().parent
ROOT=Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')
sys.path.insert(0,str(ROOT/'agent/tools/boss-sim'))
from character_extract import extract
logs=HERE/'.frozen-log-inputs'
logs.mkdir()
for source,name in (('runs-snapshot.jsonl','runs.jsonl'),('sl-snapshot.jsonl','sl-attempts.jsonl')):
    (logs/name).symlink_to(HERE/'dataset'/source)
(logs/'states.jsonl').symlink_to('/home/dw/Projects/agent-sts2/logs/states.jsonl')
new=HERE/'dataset-backfilled'
extract(logs,'/home/dw/Projects/agent-sts2/data/logdb',new)
def rows(path):
    return [json.loads(l) for l in path.read_text().splitlines()]
for name in ('fights.jsonl','sources.jsonl'):
    data=rows(new/name)
    for row in data:
        source=row.get('source',{})
        if source.get('file')==str(logs/'states.jsonl'):
            source['file']='/home/dw/Projects/agent-sts2/logs/states.jsonl'
    (new/name).write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in data))
old=HERE/'dataset'
previous=rows(old/'fights.jsonl')
assert rows(new/'fights.jsonl')[:len(previous)]==previous
assert rows(new/'turns.jsonl')[:len(previous)]==rows(old/'turns.jsonl')
for name in ('runs-snapshot.jsonl','sl-snapshot.jsonl'):
    assert (new/name).read_bytes()==(old/name).read_bytes(),name
new_fights=rows(new/'fights.jsonl')[len(previous):]
assert len(new_fights)==1 and new_fights[0]['run_id']=='JH49PP3EYJH8'
for name in ('source-audit-summary.json','version-audit-summary.json','fight-code-provenance.json','opening-source-integrity.json','new-outcome-integrity.json','missing-indexed-frames.json'):
    shutil.copyfile(HERE/name,HERE/('initial-'+name))
receipt={'frozen_ended_max':json.loads((new/'extraction.json').read_text())['snapshot_ended_max'],
    'original_fights':len(previous),'after_fights':len(previous)+1,'historical_fights_and_turns_unchanged':True,
    'same_run_and_sl_snapshot_bytes':True,'recovered_attempts':6,'recovered_actual_outcomes':1,
    'added':[{k:r[k] for k in ('key','run_id','floor','attempt','encounter','turns','outcome')} for r in new_fights],
    'original_extraction_sha256':hashlib.sha256((old/'extraction.json').read_bytes()).hexdigest(),
    'scope':'Index caught up through an existing live refresh; no log/DB writes and no newly finished run added.'}
(HERE/'index-lag-recovery.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=1)+'\n')
old.rename(HERE/'dataset-initial')
new.rename(old)
print(json.dumps(receipt,ensure_ascii=False))
