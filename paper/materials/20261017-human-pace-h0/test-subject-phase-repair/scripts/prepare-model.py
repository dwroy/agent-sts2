"""Snapshot a new narrowly repaired object; never alter the completed baseline closure."""
import hashlib
import json
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
WORK = OUT.parents[2]
PHASE = OUT / 'validation-phase-2'
terminals = [json.loads(p.read_text()) for p in PHASE.glob('exit-*.json')]
assert terminals and all(t['exit_code'] == 0 for t in terminals), 'A real completed worker must free a slot.'
plan = json.loads((OUT / 'validation-resume-plan-v2.json').read_text())
new_plan = dict(plan)
files = dict(plan['frozen_inputs'])
precompiled = (HERE / 'compiled').exists()
if precompiled:
    assert (HERE / 'precompile-receipt.json').exists() and (HERE / 'compiled-manifest.json').exists()
else:
    (HERE / 'source-repair').mkdir()
for rel in ['agent/src/reflex/rollout.ts', 'agent/src/reflex/rollout-live.ts']:
    raw = (WORK / rel).read_bytes()
    assert b'observedSilentTestSubjectPhasePowers' in raw
    snapshot = HERE / 'source-repair' / Path(rel).name
    if precompiled:
        assert snapshot.read_bytes() == raw, 'Do not change the verified source before calibration.'
    else:
        snapshot.write_bytes(raw)
    files[rel] = hashlib.sha256(raw).hexdigest()
new_model = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()
new_plan.update(model_sha256=new_model, frozen_inputs=files, baseline_model_sha256=plan['model_sha256'],
                baseline_complete_reference=str(PHASE / 'validation-completed.json'),
                cached_tuning_artifact=plan['artifact'],
                cached_tuning_results_sha256=plan['tuning_results_sha256'],
                repair_plan_sha256=hashlib.sha256((PHASE / 'test-subject-phase-power-plan.json').read_bytes()).hexdigest(),
                source_status='Uncommitted candidate source snapshots; actual probes/tests and source/live commits recorded separately later.')
new_plan.pop('commands')
new_plan.pop('artifact')
new_plan.pop('tuning_results_sha256')
new_plan.pop('tuning_fit_sha256')
new_plan.pop('compiled_manifest_sha256')
for key in ['after', 'preconditions', 'previous_plan_snapshot']:
    new_plan.pop(key, None)
new_plan.update(status='source-snapshotted-probes-and-new-fit-pending',
                new_simulations={'tuning_keys': 2, 'validation_keys': 29, 'starts': ['t1', 'pre']},
                reuse_rule='557 keys outside the exact observed Silent A10 Test Subject predicate remain on the same numerical branch. Reuse requires the actual compiled isolation and B2/pre metadata probes; no old 7e1193 predictions used as this baseline.')
(HERE / 'model-plan.json').write_text(json.dumps(new_plan, ensure_ascii=False, indent=2) + '\n')
if not precompiled:
    shutil.copytree(OUT / 'repaired-v2-compiled', HERE / 'compiled', symlinks=True)
affected = json.loads((PHASE / 'test-subject-phase-power-plan.json').read_text())['calibration_plan']
for side in ['tune', 'val']:
    keys = affected['affected_' + side]
    (HERE / (side + '-keys.json')).write_text(json.dumps(keys, ensure_ascii=False, indent=2) + '\n')
    if side == 'tune':
        for index, key in enumerate(keys):
            (HERE / f'tune-key-{index}.json').write_text(json.dumps([key]) + '\n')
print(json.dumps({'model_sha256': new_model, 'input_files': len(files), 'affected_tune': len(affected['affected_tune']), 'affected_val': len(affected['affected_val'])}))
