"""Revalidate a sealed candidate without rerunning its model or changing its split."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')


def read(path):
    return json.loads(path.read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')


previous = read(HERE / 'previous-live-trust.json')
candidate = read(HERE / 'cached-trust.json')
identity = candidate['refresh']['artifact']
archive = ROOT / 'experiments/boss-sim/silent' / identity
assert candidate['source']['input_files'] == previous['source']['input_files']
assert candidate['split']['tune'] == previous['split']['tune']
assert candidate['split']['cutoff_ts'] == previous['split']['cutoff_ts']
for start in ('t1', 'pre'):
    assert candidate['overall'][start]['platt'] == previous['overall'][start]['platt']
    assert candidate['selection'][start] == previous['selection'][start]
assert (LIVE / 'knowledge/characters/silent/boss-trust.json').read_bytes() == (HERE / 'previous-live-trust.json').read_bytes()
for manifest_name in ('completed.json', 'audit-manifest.json'):
    manifest = read(archive / manifest_name)
    for name, expected in manifest.get('files_sha256', manifest).items():
        assert digest(archive / name) == expected, (manifest_name, name)
for name in ('fights.jsonl', 'sources.jsonl', 'turns.jsonl', 'extraction.json'):
    assert (HERE / 'dataset' / name).read_bytes() == (archive / name).read_bytes(), name

# The earlier scratch snapshot is read-only; verify every pinned input again.
snapshot = HERE.parent / '20261011-131306-silent-boss-calibration/pinned-model'
for name, expected in candidate['source']['input_files'].items():
    path = Path(name) if name.startswith('/') else snapshot / name
    assert digest(path) == expected, name

fights = rows(HERE / 'dataset/fights.jsonl')
sources = {row['key']: row for row in rows(HERE / 'dataset/sources.jsonl') if row.get('key')}
with Path('/home/dw/Projects/agent-sts2/logs/states.jsonl').open('rb') as handle:
    for row in fights:
        source = sources[row['key']]['source']
        handle.seek(source['t1_off'])
        raw = handle.read(source['t1_len'])
        assert hashlib.sha256(raw).hexdigest() == source['t1_sha256']
        state = json.loads(raw)['state']
        assert state == row['t1']['state']
        assert state['run']['character_id'] == 'SILENT'

# Keep the original content directory untouched. The public entry point can then
# prove its identical-artifact branch instead of refitting unchanged samples.
scratch_archive = HERE / identity
assert not scratch_archive.exists()
shutil.copytree(archive, scratch_archive)
args = ['--scratch', str(HERE), '--logs', '/home/dw/Projects/agent-sts2/logs',
        '--db', '/home/dw/Projects/agent-sts2/data/logdb',
        '--game-data', '/home/dw/Projects/agent-sts2/data/game-data.json',
        '--previous', str(LIVE / 'knowledge/characters/silent/boss-trust.json'),
        '--dataset', str(HERE / 'dataset'), '--results', str(archive / 'results.jsonl'),
        '--provenance', str(archive / 'provenance.json'),
        '--out', str(ROOT / 'knowledge/characters/silent/boss-trust.json'),
        '--report', str(HERE / 'generated-report.md')]
write('refresh-command.json', [sys.executable, str(ROOT / 'agent/tools/boss-sim/refresh-silent.py'), *args])
result = subprocess.run([sys.executable, str(ROOT / 'agent/tools/boss-sim/refresh-silent.py'), *args],
                        capture_output=True, text=True)
(HERE / 'refresh.log').write_text(result.stdout + result.stderr)
(HERE / 'refresh.exit').write_text(str(result.returncode) + '\n')
assert result.returncode == 0, result.stderr
assert json.loads(result.stdout)['skipped'] == 'identical artifact already complete'
assert (ROOT / 'knowledge/characters/silent/boss-trust.json').read_bytes() == (HERE / 'cached-trust.json').read_bytes()
assert (HERE / 'generated-report.md').read_bytes() == (archive / 'report.md').read_bytes()

spec = importlib.util.spec_from_file_location('refresh', ROOT / 'agent/tools/boss-sim/refresh-silent.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with patch.object(module.subprocess, 'run', side_effect=AssertionError('unexpected simulation/refit')):
    assert module.main(args) == 0
    threshold_args = args[:]
    threshold_args[threshold_args.index('--previous') + 1] = str(HERE / 'cached-trust.json')
    assert module.main(threshold_args) == 0

checks = {}
for start, use in (('t1', 'b2'), ('pre', 'b3')):
    accepted = []
    limit = candidate['overall'][start]['brier'] * 1.25
    for boss, data in candidate['bosses'].items():
        row = data[start]
        passed = (row['n'] >= 10 and row['brier'] <= limit and abs(row['mean_pred'] - row['actual_win']) <= 0.15
                  and row['leak_ratio'] is not None and 0.7 <= row['leak_ratio'] <= 1.3)
        assert passed == (not row['failed'])
        assert row['missing'] == max(0, 10 - row['n'])
        if passed:
            accepted.append(boss)
    assert accepted == candidate['trusted_' + use]
    checks[start] = {'four_criteria_match': True, 'brier_limit': limit, 'trusted': accepted}
write('criteria-audit.json', checks)
receipt = {'artifact': identity, 'archive_sha256': digest(archive / 'audit-manifest.json'),
           'fixed_model': candidate['source']['simulator_base'],
           'verified_model_inputs': len(candidate['source']['input_files']),
           'actual_opening_states_verified': len(fights), 'source_manifests_verified': True,
           'fights_sources_turns_extraction_byte_equal': True,
           'tune_cutoff_platt_selection_unchanged': True,
           'identical_artifact_skipped': True, 'no_subprocess_during_repeat': True,
           'candidate_threshold_skipped': True, 'new_since_candidate': 0,
           'new_since_live': len(set(candidate['refresh']['keys']) - set(previous['refresh']['keys'])),
           'no_new_artifact_directory': True, 'no_strategy_or_model_change': True}
write('idempotency-audit.json', receipt)
print(json.dumps(receipt))
