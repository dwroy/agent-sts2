"""Extend validation under the exact previously published model and tune split."""
import collections
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
spec = importlib.util.spec_from_file_location('refresh', ROOT / 'agent/tools/boss-sim/refresh-silent.py')
module = importlib.util.module_from_spec(spec)
sys.path.insert(0, str(ROOT / 'agent/tools/boss-sim'))
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

previous = json.loads((HERE / 'previous-trust.json').read_text())
parent = LIVE / 'experiments/boss-sim/silent' / previous['refresh']['artifact']
for name, expected in previous['source']['input_files'].items():
    path = Path(name) if name.startswith('/') else HERE / '.pinned-model' / name
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, ('model drift', name)
fights = rows(HERE / 'dataset/fights.jsonl')
historical = rows(parent / 'fights.jsonl')
assert fights[:len(historical)] == historical
assert rows(HERE / 'dataset/turns.jsonl')[:len(historical)] == rows(parent / 'turns.jsonl')
keys = json.loads((HERE / 'replay-identifiers.json').read_text())
replay_map = {(r['key'],r['start']):r for r in rows(HERE/'pinned-results/results-0.jsonl')}
assert (HERE/'replay-resume.exit').read_text().strip() == '0'
for r in rows(HERE/'resumed-results/results-0.jsonl') + rows(HERE/'resumed-pre-results/results-0.jsonl'):
    pair = (r['key'], r['start'])
    if pair in replay_map:
        assert without_time(r) == without_time(replay_map[pair]), pair
    replay_map[pair] = r
replayed = [replay_map[(k,start)] for k in keys for start in ('t1','pre')]
assert len(replayed) == 2 * len(keys)
assert {(r['key'], r['start']) for r in replayed} == {(k, s) for k in keys for s in ('t1', 'pre')}
assert all(r['character'] == 'silent' for r in replayed)
old = {(r['key'], r['start']): r for r in rows(parent / 'results.jsonl')}
controls = [r for r in replayed if (r['key'], r['start']) in old]
assert len(controls) == 4
for row in controls:
    assert without_time(row) == without_time(old[row['key'], row['start']]), (row['key'], row['start'])
write('control-replay-comparison.json', [{'key':r['key'], 'start':r['start'], 'identical_except_ms':True} for r in controls])
combined = dict(old)
combined.update({(r['key'], r['start']): r for r in replayed})
results = [combined[r['key'], s] for r in fights for s in ('t1', 'pre')]
(HERE / 'results.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in results))
openings = json.loads((HERE / 'opening-audit.json').read_text())
by_key = {r['key']:r for r in fights}
hp, first, damage = collections.Counter(), collections.Counter(), collections.Counter()
missing = []
for opening in openings:
    if by_key[opening['key']]['asc'] == 10:
        for part in opening['source']:
            hp[str(part['hpAsc'])] += 1
            first[str(part['openingAsc'])] += 1
for band in json.loads((HERE / 'model-input-audit.json').read_text()):
    if band['asc'] == 10:
        for monster in band['monsters']:
            for move in monster['moves']:
                if move['damage'] is None:
                    missing.append(monster['id'] + ':' + move['move'])
                else:
                    damage[str(move['damage']['from'])] += 1
scope = {'openings': len(openings), 'a10_hp_asc_sources': dict(hp), 'a10_opening_asc_sources':dict(first),
         'corrected_first_hit':sum(r['needs_corrected_first_hit_replay'] for r in openings),
         'a10_move_damage_asc_sources':dict(damage), 'a10_no_damage_records':missing}
write('input-audit-summary.json', scope)
source = dict(previous['source'])
source['result_reuse'] = {**json.loads((HERE / 'reuse-audit.json').read_text()),
    'reused_fights':len(historical)-2, 'replayed_fights':len(keys), 'control_results_identical_except_ms':True}
source['boss_input_scope'] = scope
write('provenance.json', source)
args = ['--scratch',str(HERE),'--logs','/home/dw/Projects/agent-sts2/logs','--db','/home/dw/Projects/agent-sts2/data/logdb',
        '--game-data','/home/dw/Projects/agent-sts2/data/game-data.json','--previous',str(HERE/'previous-trust.json'),
        '--dataset',str(HERE/'dataset'),'--results',str(HERE/'results.jsonl'),'--provenance',str(HERE/'provenance.json'),
        '--out',str(HERE/'candidate-boss-trust.json'),
        '--report',str(HERE/'candidate-report.md')]
assert (LIVE/'knowledge/characters/silent/boss-trust.json').read_bytes() == (HERE/'previous-trust.json').read_bytes()
write('refresh-command.json', [sys.executable,str(ROOT/'agent/tools/boss-sim/refresh-silent.py'),*args])
assert module.main(args) == 0
trust_path = HERE/'candidate-boss-trust.json'
report_path = HERE/'candidate-report.md'
trust_bytes, report_bytes = trust_path.read_bytes(), report_path.read_bytes()
trust = json.loads(trust_bytes)
assert trust['split']['tune'] == previous['split']['tune']
assert trust['split']['cutoff_ts'] == previous['split']['cutoff_ts']
assert trust['split']['val'][:len(previous['split']['val'])] == previous['split']['val']
assert set(trust['split']['val'][len(previous['split']['val']):]) == set(keys[2:])
for start in ('t1','pre'):
    assert trust['overall'][start]['platt'] == previous['overall'][start]['platt']
    assert trust['selection'][start] == previous['selection'][start]
with patch.object(module.subprocess,'run') as child:
    assert module.main(args) == 0
    child.assert_not_called()
threshold = args[:]
threshold[threshold.index('--previous')+1] = str(trust_path)
with patch.object(module.subprocess,'run') as child:
    assert module.main(threshold) == 0
    child.assert_not_called()
assert trust_path.read_bytes() == trust_bytes and report_path.read_bytes() == report_bytes
write('idempotency-audit.json', {'complete_artifact_skip':True,'updated_previous_threshold_skip':True,
    'no_subprocess_on_skips':True,'tune_keys_and_cutoff_unchanged':True,'platt_and_selection_unchanged':True,
    'new_keys_only_in_validation':True,'new_validation_fights':len(keys)-2,'validation':len(trust['split']['val'])})
(HERE/'artifact.txt').write_text(trust['refresh']['artifact']+'\n')
write('trust-changes.json', {use:{'added':sorted(set(trust['trusted_'+use])-set(previous['trusted_'+use])),
    'removed':sorted(set(previous['trusted_'+use])-set(trust['trusted_'+use]))} for use in ('b2','b3')})
print(json.dumps({'artifact':trust['refresh']['artifact'],'trusted_b2':trust['trusted_b2'],'trusted_b3':trust['trusted_b3']}))
