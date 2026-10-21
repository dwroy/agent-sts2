import argparse
import csv
import json
from pathlib import Path
import sys

sys.path.insert(0, 'eval')
import sts2fun_combat_diagnostic as M

parser = argparse.ArgumentParser(description='Verify aggregate replay and preserved original delivery; run at repository root.')
parser.add_argument('--repeat', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent
repeat = args.repeat
manifest = json.loads((root/'manifest.json').read_text())
for name, digest in manifest.items():
    assert M.sha(root/name) == digest, name
for p in root.glob('*.csv'):
    assert M.sha(p) == M.sha(repeat/p.name), p.name
    with p.open(newline='') as f:
        rows = list(csv.DictReader(f))
        assert rows
        assert not {'player_id', 'run_id', 'username', 'edit_token', 'raw_json'} & rows[0].keys()
        for r in rows:
            assert None not in r, p.name
summary = json.loads((root/'summary.json').read_text())
assert summary == json.loads((repeat/'summary.json').read_text())
assert summary['shared_encounter_groups'] == 80
assert summary['external'] == dict(runs=1739, wins=492, combat_points=29391,
    multi_room_or_non_solo_points_excluded=248, players=98, fights=29143)
assert summary['own']['finished_runs'] == 336
assert summary['own']['encounters'] == 4739
assert summary['own']['sl_events'] == 903
assert summary['strict_native_id_comparisons'] == 0
assert summary['own']['shared_victory_disagreements'] == 0
provenance = json.loads((root/'provenance.json').read_text())
other = json.loads((repeat/'provenance.json').read_text())
provenance.pop('generated_at'); other.pop('generated_at')
assert provenance == other
assert provenance['script_sha256'] == M.sha('eval/sts2fun_combat_diagnostic.py')
assert provenance['shared_stats_script_sha256'] == M.sha('eval/sts2fun_stats.py')
assert provenance['views_sha256'] == M.sha('agent/tools/logdb/views.sql')
assert provenance['paper_runs_sha256'] == M.sha('paper/data/runs.csv')
rows = list(csv.DictReader((root/'same_encounter_comparison.csv').open()))
assert len(rows) == 80
assert sum(int(r['external_fights']) for r in rows) == summary['external_matched_fights']
assert sum(int(r['own_fights']) for r in rows) == summary['own_matched_fights']
for r in rows:
    assert r['damage_difference'] == ''
    assert r['mapping'] == 'unique_empirical_not_native'
    for side in ('external', 'own'):
        for key in ('death', 'turns'):
            assert int(r[f'{side}_{key}_n']) + int(r[f'{side}_{key}_unknown']) == int(r[f'{side}_fights'])
            assert int(r[f'{side}_{key}_independent_runs']) <= int(r[f'{side}_runs'])
            assert int(r[f'{side}_{key}_independent_units']) <= int(r[f'{side}_players' if side == 'external' else 'own_runs'])
versions = list(csv.DictReader((root/'own_versions.csv').open()))
assert len(versions) == 133
assert sum(int(r['runs']) for r in versions) == 336
assert all(r['game_patch'] == 'unknown' for r in versions)
strata = list(csv.DictReader((root/'own_entry_strata.csv').open()))
assert sum(int(r['fights']) for r in strata) == summary['own_matched_fights']
assert all(r['external_same_stratum'] == '' for r in strata)
for row in csv.DictReader((root/'combat_distribution.csv').open()):
    if row['source'] == 'own' and row['kind'] == 'boss':
        assert int(row['net_hp_n']) == 0
        assert int(row['net_hp_unknown']) == int(row['fights'])
old = Path('paper/materials/2026-10-21-sts2fun-stats')
receipt = json.loads((old/'verification.json').read_text())
for name, digest in receipt['artifacts'].items():
    assert M.sha(old/name) == digest, 'Changed original artifact: '+name
for name, digest in json.loads((old/'manifest.json').read_text()).items():
    assert M.sha(old/name) == digest, 'Changed original aggregate: '+name
print('PASS: byte-identical CSV and summary replay; provenance differs only in generated_at')
print('PASS: manifest/source hashes, per-metric denominators, SL HP exclusions, strata/versions sums, public schemas')
print('PASS: original delivery artifacts and original aggregate manifest unchanged')
print(json.dumps(summary, ensure_ascii=False, indent=2))
