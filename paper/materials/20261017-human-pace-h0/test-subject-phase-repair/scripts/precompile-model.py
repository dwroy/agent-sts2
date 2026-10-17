"""Use a free worker slot for source-only verification; no predictions or calibration."""
import hashlib
import json
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
WORK = OUT.parents[2]
terminals = [json.loads(p.read_text()) for p in (OUT / 'validation-phase-2').glob('exit-*.json')]
assert terminals and all(t['exit_code'] == 0 for t in terminals), 'A real completed backtest must free a slot first.'
assert not (HERE / 'compiled').exists() and not (HERE / 'source-repair').exists()
(HERE / 'source-repair').mkdir()
source = []
for rel in ['agent/src/reflex/rollout.ts', 'agent/src/reflex/rollout-live.ts']:
    raw = (WORK / rel).read_bytes()
    assert b'observedSilentTestSubjectPhasePowers' in raw
    (HERE / 'source-repair' / Path(rel).name).write_bytes(raw)
    source.append({'path': rel, 'sha256': hashlib.sha256(raw).hexdigest()})
shutil.copytree(OUT / 'repaired-v2-compiled', HERE / 'compiled', symlinks=True)
(HERE / 'precompile-receipt.json').write_text(json.dumps({'completed_baseline_workers': terminals,
    'source': source, 'scope': 'Source snapshot/compiler/probes in a freed slot; no MC or fit in this step. Independent cached-tuning work may follow the scheduling addendum. Original source/data/keys/seeds remain untouched.'}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': 'source-only-snapshot', 'source_files': len(source), 'free_slots': len(terminals)}))
