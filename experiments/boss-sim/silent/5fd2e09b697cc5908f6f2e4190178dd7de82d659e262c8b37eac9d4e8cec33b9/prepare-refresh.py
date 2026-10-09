"""Reuse only immutable historical results whose changed upgrade paths cannot execute."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
INITIAL = HERE / '19c6dc4bc392dba31c1604e532a201984df395329d54c22acca27a46cc4f5cb8'

def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

previous = json.loads((HERE / 'previous-trust.json').read_text())
parent = ROOT / 'experiments/boss-sim/silent' / previous['refresh']['artifact']
for name in ('completed.json', 'audit-manifest.json'):
    manifest = json.loads((parent / name).read_text())
    for path, expected in manifest.get('files_sha256', manifest).items():
        assert sha(parent / path) == expected, (name, path)
provenance = json.loads((INITIAL / 'provenance.json').read_text())
old = previous['source']['input_files']
new = provenance['input_files']
changed = [p for p in sorted(set(old) | set(new)) if old.get(p) != new.get(p)]
assert changed == sorted([
    'agent/src/brain/engines/codex-session.ts', 'agent/src/core/config.ts',
    'agent/src/hand/screens/oneshot.ts', 'agent/src/hand/screens/selection.ts',
    'agent/src/hand/screens/shop.ts', 'agent/src/memory/types.ts',
    'agent/src/reflex/card-model.ts', 'agent/src/reflex/silent-apotheosis.ts',
    'agent/src/reflex/turn-solver.ts', 'knowledge/characters/silent/experience.json']), changed
fights = rows(HERE / 'dataset/fights.jsonl')
prior = rows(parent / 'fights.jsonl')
assert fights[:len(prior)] == prior
turns = rows(HERE / 'dataset/turns.jsonl')
prior_turns = rows(parent / 'turns.jsonl')
assert turns[:len(prior_turns)] == prior_turns
audit = json.loads((HERE / 'reuse-input-audit.json').read_text())
assert [r['key'] for r in audit] == [r['key'] for r in fights]
affected = {r['key'] for r in audit if r['replay']}
for row in fights:
    raw = row['t1']['state']
    if 'APOTHEOSIS' in json.dumps(raw) or any(
            p.get('potion_id') in ('COLORLESS_POTION', 'BLESSING_OF_THE_FORGE')
            for p in raw.get('run', {}).get('potions', []) if isinstance(p, dict)):
        affected.add(row['key'])
added = fights[len(prior):]
assert len(added) == 22
keys = [r['key'] for r in fights if r['key'] in affected or r in added]
prior_results = {(r['key'], r['start']): r for r in rows(parent / 'results.jsonl')}
def strip_ms(value):
    if isinstance(value, dict):
        return {k: strip_ms(v) for k, v in value.items() if k != 'ms'}
    if isinstance(value, list):
        return [strip_ms(v) for v in value]
    return value
checked = []
for r in rows(INITIAL / 'results/results-0.jsonl'):
    if r['key'] not in affected:
        assert strip_ms(r) == strip_ms(prior_results[r['key'], r['start']]), (r['key'], r['start'])
        checked.append([r['key'], r['start']])
assert len(checked) >= 3
write('replay-identifiers.json', keys)
write('new-fights.json', added)
write('model-changes.json', changed)
reuse = {
    'previous_artifact': previous['refresh']['artifact'],
    'previous_model_sha256': previous['source']['model_sha256'],
    'current_model_sha256': provenance['model_sha256'],
    'changed_paths': changed, 'historical_fights': len(prior),
    'reused_fights': len(prior) - len(affected & {r['key'] for r in prior}),
    'replayed_fights': len(keys), 'new_validation_fights': len(added),
    'identical_historical_inputs_turns_order_and_seed_indices': True,
    'checked_replays_except_ms': checked,
    'reason': 'The only numerical changes add poisonExtraTriggers to an upgrade delta and certify the Accelerant Apotheosis upgrade. Every historical modeled card graph (hand, all piles, generated cards, potion pools) was recursively checked; all Apotheosis/Forge paths and board failures are replayed conservatively. In graphs without any such upgrade source, neither changed numerical path can execute. turn-solver only extracts an unchanged Orichalcum sum and adds a descriptive survival guard; no numerical expression, sorting weight, or policy changed. Other source changes concern brain service tier, noncombat screens, type fields, and experience text after the captured solve. All model data and game data are identical. New and affected fights use original full-dataset row indices, 200 samples and seeds.',
    'initial_exit': 130, 'initial_partial_results_sha256': sha(INITIAL / 'results/results-0.jsonl'),
    'input_graph_audit_sha256': sha(HERE / 'reuse-input-audit.json'),
}
provenance['result_reuse'] = reuse
write('result-reuse-audit.json', reuse)
write('provenance.json', provenance)
(HERE / 'initial-interruption.md').write_text('The initial full replay was interrupted through its own execution session (exit 130). Partial output and logs are retained. Audited immutable results are reused only for upgrade-unreachable historical card graphs; all possibly affected and all new fights are replayed on the current model.\n')
print(json.dumps(reuse, ensure_ascii=False))
