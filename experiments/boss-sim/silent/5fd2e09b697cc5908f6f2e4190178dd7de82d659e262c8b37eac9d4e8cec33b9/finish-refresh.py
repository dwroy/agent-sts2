"""Complete the audited replay and verify frozen splits, source integrity and idempotence."""
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

previous = json.loads((HERE / 'previous-trust.json').read_text())
parent = ROOT / 'experiments/boss-sim/silent' / previous['refresh']['artifact']
fights = rows(HERE / 'dataset/fights.jsonl')
keys = set(json.loads((HERE / 'replay-identifiers.json').read_text()))
results = rows(HERE / 'replayed-results/results-0.jsonl')
assert len(results) == 2 * len(keys)
assert {(r['key'], r['start']) for r in results} == {(k, start) for k in keys for start in ('t1', 'pre')}
assert all(r['character'] == 'silent' for r in results)
prior_results = {(r['key'], r['start']): r for r in rows(parent / 'results.jsonl')}
def strip_ms(value):
    if isinstance(value, dict):
        return {k: strip_ms(v) for k,v in value.items() if k != 'ms'}
    if isinstance(value, list):
        return [strip_ms(v) for v in value]
    return value
write('historical-replay-comparison.json', [
    {'key': r['key'], 'start': r['start'], 'same_except_ms': strip_ms(r) == strip_ms(prior_results[r['key'], r['start']]),
     'previous_win_prob': prior_results[r['key'], r['start']].get('sim', {}).get('winProb'),
     'current_win_prob': r.get('sim', {}).get('winProb')}
    for r in results if (r['key'], r['start']) in prior_results])
provenance = json.loads((HERE / 'provenance.json').read_text())
assert module.model_fingerprint(ROOT, Path('/home/dw/Projects/agent-sts2/data/game-data.json')) == provenance['input_files']
provenance['boss_input_scope'] = json.loads((HERE / 'input-audit-summary.json').read_text())
write('provenance.json', provenance)
combined = {(r['key'], r['start']): r for r in rows(parent / 'results.jsonl') if r['key'] not in keys}
combined.update({(r['key'], r['start']): r for r in results})
combined = [combined[r['key'], start] for r in fights for start in ('t1', 'pre')]
assert len(combined) == len(fights) * 2
(HERE / 'results.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in combined))
args = ['--scratch', str(HERE), '--logs', '/home/dw/Projects/agent-sts2/logs', '--db', '/home/dw/Projects/agent-sts2/data/logdb',
        '--game-data', '/home/dw/Projects/agent-sts2/data/game-data.json', '--previous', str(HERE / 'previous-trust.json'),
        '--dataset', str(HERE / 'dataset'), '--results', str(HERE / 'results.jsonl'), '--provenance', str(HERE / 'provenance.json'),
        '--out', str(ROOT / 'knowledge/characters/silent/boss-trust.json'), '--report', str(ROOT / 'paper/materials/silent/boss-sim-calibration.md')]
assert module.main(args) == 0
trust_path = ROOT / 'knowledge/characters/silent/boss-trust.json'
report_path = ROOT / 'paper/materials/silent/boss-sim-calibration.md'
trust_bytes, report_bytes = trust_path.read_bytes(), report_path.read_bytes()
with patch.object(module.subprocess, 'run') as child:
    assert module.main(args) == 0
    child.assert_not_called()
assert trust_path.read_bytes() == trust_bytes and report_path.read_bytes() == report_bytes
trust = json.loads(trust_bytes)
assert trust['split']['tune'] == previous['split']['tune']
assert trust['split']['cutoff_ts'] == previous['split']['cutoff_ts']
assert trust['split']['val'][:len(previous['split']['val'])] == previous['split']['val']
added_keys = {r['key'] for r in json.loads((HERE / 'new-fights.json').read_text())}
assert set(trust['split']['val'][len(previous['split']['val']):]) == added_keys
threshold_args = list(args)
threshold_args[threshold_args.index('--previous') + 1] = str(trust_path)
with patch.object(module.subprocess, 'run') as child:
    assert module.main(threshold_args) == 0
    child.assert_not_called()
assert trust_path.read_bytes() == trust_bytes and report_path.read_bytes() == report_bytes
current_trigger = module.cadence(module.read_jsonl('/home/dw/Projects/agent-sts2/logs/runs.jsonl'),
                                module.read_jsonl('/home/dw/Projects/agent-sts2/logs/sl-attempts.jsonl'), trust['refresh'])
frozen_trigger = module.cadence(module.read_jsonl(HERE / 'dataset/runs-snapshot.jsonl'),
                               module.read_jsonl(HERE / 'dataset/sl-snapshot.jsonl'), trust['refresh'])
assert not frozen_trigger['due'] and frozen_trigger['new_completed_boss_attempts'] == 0
write('idempotency-audit.json', {
    'identical_complete_skip': True, 'threshold_skip_with_updated_previous': True, 'no_subprocess_on_skips': True,
    'frozen_snapshot_cadence': {k:v for k,v in frozen_trigger.items() if k != 'keys'},
    'current_logs_trigger_after_snapshot': {k:v for k,v in current_trigger.items() if k != 'keys'},
    'fixed_tune_keys': len(trust['split']['tune']), 'validation': len(trust['split']['val']),
    'parameter_changes': {start: [previous['overall'][start]['platt'], trust['overall'][start]['platt']] for start in ('t1', 'pre')},
    'trust_sha256': hashlib.sha256(trust_bytes).hexdigest(),
    'original_report_sha256': hashlib.sha256(report_bytes).hexdigest(),
})
(HERE / 'artifact.txt').write_text(trust['refresh']['artifact'] + '\n')
print(json.dumps({'artifact': trust['refresh']['artifact'],
                  'overall': {s: {k: trust['overall'][s][k] for k in ('n', 'brier', 'platt')} for s in ('t1', 'pre')},
                  'trusted_b2': trust['trusted_b2'], 'trusted_b3': trust['trusted_b3'], 'errors': trust['errors']}, ensure_ascii=False))
