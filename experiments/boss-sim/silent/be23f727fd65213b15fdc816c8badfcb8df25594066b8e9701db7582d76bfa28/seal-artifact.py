"""Verify source states, synchronize the immutable candidate, and retain its audit files."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')

def read(path):
    return json.loads(path.read_text())

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

assert (HERE / 'finish-pinned.exit').read_text().strip() == '0'
assert (LIVE / 'knowledge/characters/silent/boss-trust.json').read_bytes() == (HERE / 'previous-live-trust.json').read_bytes()
fights = [json.loads(line) for line in (HERE / 'dataset/fights.jsonl').read_text().splitlines()]
sources = {r['key']: r for line in (HERE / 'dataset/sources.jsonl').read_text().splitlines()
           if (r := json.loads(line)).get('key')}
checked = []
with Path('/home/dw/Projects/agent-sts2/logs/states.jsonl').open('rb') as handle:
    for row in fights:
        source = sources[row['key']]['source']
        handle.seek(source['t1_off'])
        raw = handle.read(source['t1_len'])
        assert hashlib.sha256(raw).hexdigest() == source['t1_sha256']
        state = json.loads(raw)['state']
        assert state == row['t1']['state'], row['key']
        assert state['run']['character_id'] == 'SILENT'
        checked.append(row['key'])
write('opening-state-equality.json', {'count': len(checked), 'all_actual_opening_states_equal': True, 'keys': checked})

args = [sys.executable, str(ROOT / 'agent/tools/boss-sim/refresh-silent.py'),
        '--scratch', str(HERE), '--logs', '/home/dw/Projects/agent-sts2/logs',
        '--db', '/home/dw/Projects/agent-sts2/data/logdb',
        '--game-data', '/home/dw/Projects/agent-sts2/data/game-data.json',
        '--previous', str(LIVE / 'knowledge/characters/silent/boss-trust.json'),
        '--dataset', str(HERE / 'dataset'), '--results', str(HERE / 'results.jsonl'),
        '--provenance', str(HERE / 'provenance.json'),
        '--out', str(ROOT / 'knowledge/characters/silent/boss-trust.json'),
        '--report', str(ROOT / 'paper/materials/silent/boss-sim-calibration.md')]
subprocess.run(args, check=True)
trust = read(HERE / 'candidate-boss-trust.json')
previous = read(HERE / 'previous-live-trust.json')
assert (ROOT / 'knowledge/characters/silent/boss-trust.json').read_bytes() == (HERE / 'candidate-boss-trust.json').read_bytes()
(HERE / 'report.md').write_bytes((HERE / 'generated-report.md').read_bytes())
table = [{ 'boss': key, **{start: boss[start] for start in ('t1', 'pre')}} for key, boss in trust['bosses'].items()]
write('boss-trust-table.json', table)
write('final-boss-table.json', table)
write('candidate-vs-live.json', {'previous_artifact': previous['refresh']['artifact'],
    'candidate_artifact': trust['refresh']['artifact'],
    'tune_unchanged': trust['split']['tune'] == previous['split']['tune'],
    'cutoff_unchanged': trust['split']['cutoff_ts'] == previous['split']['cutoff_ts'],
    'previous_validation': previous['split']['val_n'], 'candidate_validation': trust['split']['val_n'],
    'trusted': {s: {'previous': previous['trusted_' + s], 'candidate': trust['trusted_' + s]} for s in ('b2', 'b3')}})

source = HERE / trust['refresh']['artifact']
manifest = read(source / 'completed.json')
for name, expected in manifest['files_sha256'].items():
    assert sha(source / name) == expected, name
target = ROOT / 'experiments/boss-sim/silent' / trust['refresh']['artifact']
assert not target.exists(), 'Never overwrite a historical artifact.'
shutil.copytree(source, target)
names = ['prepare-pinned.py', 'finish-pinned.py', 'audit-sources.py', 'seal-artifact.py',
         'previous-live-trust.json', 'previous-candidate-report.md', 'cached-trust.json', 'new-fights.json', 'new-since-live.json',
         'new-run-code-provenance.json', 'new-outcome-audit.json', 'model-changes.json', 'pinned-input-integrity.json',
         'pinned-replay-audit.json', 'control-replay-comparison.json', 'idempotency-audit.json',
         'opening-audit.json', 'first-hit-identifiers.json', 'model-input-audit.json',
         'input-audit-summary.json', 'opening-source-integrity.json', 'opening-state-equality.json',
         'cadence-before.json', 'replay-identifiers.json']
for stem in ['extract', 'prepare-pinned', 'pinned-replay', 'audit-board', 'audit-sources', 'finish-pinned']:
    names.extend([stem + '.log', stem + '.exit'])
for name in names:
    shutil.copyfile(HERE / name, target / name)
audit_manifest = {p.name: sha(p) for p in sorted(target.iterdir()) if p.is_file()}
(target / 'audit-manifest.json').write_text(json.dumps(audit_manifest, indent=1) + '\n')
write('artifact-integrity.json', {'artifact': trust['refresh']['artifact'], 'files_verified': len(audit_manifest),
      'completed_manifest_verified': True, 'new_directory_only': True})
print(json.dumps({'artifact': trust['refresh']['artifact'], 'verified_states': len(checked),
      'overall': {s: {k:trust['overall'][s][k] for k in ('n', 'brier', 'platt')} for s in ('t1', 'pre')}}))
