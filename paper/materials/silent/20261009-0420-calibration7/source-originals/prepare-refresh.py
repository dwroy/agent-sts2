"""Audit immutable prior results and prepare the new validation replay without changing seeds."""
import hashlib
import json
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


shutil.copyfile(LIVE / 'knowledge/characters/silent/boss-trust.json', HERE / 'previous-trust.json')
previous = json.loads((HERE / 'previous-trust.json').read_text())
parent = ROOT / 'experiments/boss-sim/silent' / previous['refresh']['artifact']
for name in ('completed.json', 'audit-manifest.json'):
    manifest = json.loads((parent / name).read_text())
    for path, expected in manifest.get('files_sha256', manifest).items():
        assert sha(parent / path) == expected, (name, path)
initial = HERE / 'c9ad3bd34190c8c6d4ca9f0d2e682d930deefb6c7d85edba4f7fdafa188f6b1c'
provenance = json.loads((initial / 'provenance.json').read_text())
old = previous['source']['input_files']
new = provenance['input_files']
changed = [p for p in sorted(set(old) | set(new)) if old.get(p) != new.get(p)]
assert changed == ['knowledge/characters/silent/experience.json'], changed
fights = rows(HERE / 'dataset/fights.jsonl')
prior = rows(parent / 'fights.jsonl')
assert fights[:len(prior)] == prior, 'historical inputs or seed indices changed'
prior_turns = rows(parent / 'turns.jsonl')
turns = rows(HERE / 'dataset/turns.jsonl')
assert turns[:len(prior_turns)] == prior_turns, 'historical observations changed'
prior_results = {(r['key'], r['start']): r for r in rows(parent / 'results.jsonl')}
replayed = rows(initial / 'results/results-0.jsonl')
def strip_ms(value):
    if isinstance(value, dict):
        return {k: strip_ms(v) for k, v in value.items() if k != 'ms'}
    if isinstance(value, list):
        return [strip_ms(v) for v in value]
    return value
for r in replayed:
    assert strip_ms(r) == strip_ms(prior_results[r['key'], r['start']]), (r['key'], r['start'])
assert len(replayed) >= 4
added = fights[len(prior):]
assert len(added) == 20
assert all(r['key'] not in previous['split']['tune'] for r in added)
for name, value in [('new-keys.json', [r['key'] for r in added]), ('new-fights.json', added), ('model-changes.json', changed)]:
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')
audit = {
    'previous_artifact': previous['refresh']['artifact'],
    'previous_model_sha256': previous['source']['model_sha256'],
    'current_model_sha256': provenance['model_sha256'],
    'changed_paths': changed, 'reused_fights': len(prior), 'new_replayed_fights': len(added),
    'identical_old_inputs_and_order': True, 'identical_old_turns': True,
    'checked_replays_except_ms': len(replayed),
    'reason': 'Only experience text changed. The backtest captures the solver input before fightLessons/jevExperience; the boss simulator does not read experience text. All numerical source, model data, game-data, historical inputs and seed indices are byte-identical. Historical replays match every non-timing field. Reuse immutable prior results and replay all new fights at the original full-dataset indices.',
    'initial_replay_exit': 130,
    'initial_replay_preserved': str((initial / 'results/results-0.jsonl').relative_to(ROOT)),
}
provenance['result_reuse'] = audit
for name, value in [('result-reuse-audit.json', audit), ('provenance.json', provenance)]:
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')
(HERE / 'refresh.exit').write_text('130\n')
(HERE / 'initial-interruption.md').write_text('Initial all-fight replay was interrupted through its own execution session (exit 130) after confirming that only experience text changed. All partial results and logs are preserved; the frozen dataset remains unchanged. Continue with audited prior results and full replays of the 20 new keys.\n')
print(json.dumps(audit, ensure_ascii=False))
