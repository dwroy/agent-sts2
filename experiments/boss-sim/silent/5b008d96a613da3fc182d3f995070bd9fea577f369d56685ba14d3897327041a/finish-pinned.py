"""Complete a validation-only refresh with immutable inputs and exact control replays."""
import collections
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / 'agent/tools/boss-sim'))
spec = importlib.util.spec_from_file_location('refresh', ROOT / 'agent/tools/boss-sim/refresh-silent.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

def without_time(value):
    if isinstance(value, dict):
        return {k: without_time(v) for k, v in value.items() if k != 'ms'}
    if isinstance(value, list):
        return [without_time(v) for v in value]
    return value

previous = json.loads((HERE / 'previous-live-trust.json').read_text())
for name, expected in previous['source']['input_files'].items():
    path = Path(name) if name.startswith('/') else HERE / 'pinned-model' / name
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, ('model drift', name)
cached = json.loads((HERE / 'cached-trust.json').read_text())
parent = ROOT / 'experiments/boss-sim/silent' / cached['refresh']['artifact']
fights = rows(HERE / 'dataset/fights.jsonl')
historical = rows(parent / 'fights.jsonl')
added = json.loads((HERE / 'new-fights.json').read_text())
keys = json.loads((HERE / 'replay-identifiers.json').read_text())
assert (HERE / 'pinned-replay.exit').read_text().strip() == '0'
replayed = rows(HERE / 'pinned-results/results-0.jsonl')
assert len(replayed) == 2 * len(keys)
assert {(r['key'], r['start']) for r in replayed} == {(key, start) for key in keys for start in ('t1', 'pre')}
assert all(r['character'] == 'silent' for r in replayed)
old = {(r['key'], r['start']): r for r in rows(parent / 'results.jsonl')}
control = [r for r in replayed if (r['key'], r['start']) in old]
assert len(control) == 4
comparison = []
for row in control:
    same = without_time(row) == without_time(old[row['key'], row['start']])
    comparison.append({'key': row['key'], 'start': row['start'], 'identical_except_ms': same})
    assert same, (row['key'], row['start'])
write('control-replay-comparison.json', comparison)
combined = dict(old)
combined.update({(r['key'], r['start']): r for r in replayed})
results = [combined[row['key'], start] for row in fights for start in ('t1', 'pre')]
assert len(results) == 2 * len(fights)
(HERE / 'results.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in results))

openings = json.loads((HERE / 'opening-audit.json').read_text())
by_key = {r['key']: r for r in fights}
hp = collections.Counter()
first = collections.Counter()
for opening in openings:
    if by_key[opening['key']]['asc'] == 10:
        for part in opening['source']:
            hp[str(part['hpAsc'])] += 1
            first[str(part['openingAsc'])] += 1
damage, missing = collections.Counter(), []
for band in json.loads((HERE / 'model-input-audit.json').read_text()):
    if band['asc'] == 10:
        for monster in band['monsters']:
            for move in monster['moves']:
                d = move['damage']
                if d is None:
                    missing.append(monster['id'] + ':' + move['move'])
                else:
                    damage[str(d['from'])] += 1
scope = {'openings': len(openings), 'a10_hp_asc_sources': dict(hp),
         'a10_opening_asc_sources': dict(first),
         'corrected_first_hit': sum(r['needs_corrected_first_hit_replay'] for r in openings),
         'a10_move_damage_asc_sources': dict(damage), 'a10_no_damage_records': missing}
write('input-audit-summary.json', scope)
source = dict(previous['source'])
source.pop('result_reuse', None)
source['result_reuse'] = {**json.loads((HERE / 'pinned-replay-audit.json').read_text()),
                        'reused_fights': len(historical) - 2, 'replayed_fights': len(keys),
                        'control_results_identical_except_ms': True}
source['boss_input_scope'] = scope
write('provenance.json', source)
args = ['--scratch', str(HERE), '--logs', '/home/dw/Projects/agent-sts2/logs',
        '--db', '/home/dw/Projects/agent-sts2/data/logdb',
        '--game-data', '/home/dw/Projects/agent-sts2/data/game-data.json',
        '--previous', str(HERE / 'previous-live-trust.json'), '--dataset', str(HERE / 'dataset'),
        '--results', str(HERE / 'results.jsonl'), '--provenance', str(HERE / 'provenance.json'),
        '--out', str(ROOT / 'knowledge/characters/silent/boss-trust.json'),
        '--report', str(ROOT / 'paper/materials/silent/boss-sim-calibration.md')]
assert module.main(args) == 0
trust_path = ROOT / 'knowledge/characters/silent/boss-trust.json'
report_path = ROOT / 'paper/materials/silent/boss-sim-calibration.md'
trust_bytes, report_bytes = trust_path.read_bytes(), report_path.read_bytes()
trust = json.loads(trust_bytes)
assert trust['split']['tune'] == previous['split']['tune']
assert trust['split']['cutoff_ts'] == previous['split']['cutoff_ts']
assert trust['split']['val'][:len(previous['split']['val'])] == previous['split']['val']
assert set(trust['split']['val'][len(previous['split']['val']):]) == {r['key'] for r in fights if r['key'] not in set(previous['split']['tune'] + previous['split']['val'])}
for start in ('t1', 'pre'):
    assert trust['overall'][start]['platt'] == previous['overall'][start]['platt']
    assert trust['selection'][start] == previous['selection'][start]
with patch.object(module.subprocess, 'run') as child:
    assert module.main(args) == 0
    child.assert_not_called()
threshold_args = args[:]
threshold_args[threshold_args.index('--previous') + 1] = str(trust_path)
with patch.object(module.subprocess, 'run') as child:
    assert module.main(threshold_args) == 0
    child.assert_not_called()
assert trust_path.read_bytes() == trust_bytes and report_path.read_bytes() == report_bytes
cadence = module.cadence(rows(HERE / 'dataset/runs-snapshot.jsonl'),
                        rows(HERE / 'dataset/sl-snapshot.jsonl'), trust['refresh'])
assert not cadence['due'] and cadence['new_completed_boss_attempts'] == 0
write('idempotency-audit.json', {'complete_artifact_skip': True, 'updated_previous_threshold_skip': True,
      'no_subprocess_on_skips': True, 'tune_keys_and_cutoff_unchanged': True,
      'platt_and_selection_unchanged': True, 'new_keys_only_in_validation': True,
      'replayed_new_outcomes': len(added), 'new_outcomes_since_live': len(fights) - previous['split']['tune_n'] - previous['split']['val_n'], 'validation': len(trust['split']['val']),
      'frozen_cadence': {k:v for k,v in cadence.items() if k != 'keys'}})
(HERE / 'artifact.txt').write_text(trust['refresh']['artifact'] + '\n')
print(json.dumps({'artifact': trust['refresh']['artifact'], 'scope': scope,
      'overall': {s: {k:trust['overall'][s][k] for k in ('n','brier','platt')} for s in ('t1','pre')},
      'trusted_b2': trust['trusted_b2'], 'trusted_b3': trust['trusted_b3']}, ensure_ascii=False))
