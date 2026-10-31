"""Recount frozen evidence; selected uploads and inherited own populations stay separate."""
import hashlib
import json
from pathlib import Path
import tarfile

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
LOCAL = OUT.parents[2]
def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    raw = (OUT / 'frozen-input.json').read_bytes()
    assert sha(raw) == '15042ed977def62948321bac6d3e2fbc2bee85ba80b8cc76c48c608d6fd2c81e'
    original = json.loads(raw)
    metadata = json.loads((LOCAL / 'paper/materials/20261030-issue85-grading/supplemental-sources.json').read_text())
    meta = next(e for e in metadata if '154405' in e['path'] and e['path'].endswith('context-statistics.json'))
    archive = ROOT / meta['archive']
    assert sha(archive.read_bytes()) == meta['archive_sha256']
    with tarfile.open(archive) as tar:
        member = next(m for m in tar.getmembers() if m.name.endswith('154405-88073fe8-19ea-495d-ae90-2a1696c9b015-strategy-proposal/scratch/context-statistics.json'))
        population_raw = tar.extractfile(member).read()
    assert sha(population_raw) == meta['sha256']
    p = json.loads(population_raw)['rest_elite_branch']['all']
    assert len(p['runs']) == len(set(p['runs'])) == p['independent_runs'] == 280 and p['opportunities'] == 524
    scratch = ROOT / '.worktrees/codex-strategy-silent-20261026-182334/learner/runs/20261026-182350-3d4240bd-1639-4ecf-af46-77fa2eed9716-strategy-proposal/scratch'
    ledger_raw = (scratch / 'source-ledger.json').read_bytes()
    ledger = json.loads(ledger_raw)
    statistics_raw, cases_raw = (scratch / 'evidence-statistics.json').read_bytes(), (scratch / 'trajectory-cases.json').read_bytes()
    assert sha(statistics_raw) == ledger['statistics_sha256'] and sha(cases_raw) == ledger['complete_cases_sha256']
    cases = json.loads(cases_raw)['cases']
    assert len(cases) == len({c['safe_projection_sha256'] for c in cases}) == 20
    assert sum(c['win'] == 1 for c in cases) == sum(c['win'] == 0 for c in cases) == 10
    assert sum(c['node_count'] for c in cases) == 859
    receipts = json.loads((scratch / 'read-receipts.json').read_text())
    pages = []
    for page in receipts['pages']:
        b = Path(page['path']).read_bytes()
        assert len(b) == page['page_bytes'] and sha(b) == page['page_sha256']
        pages.append({'path': page['path'], 'bytes': len(b), 'sha256': sha(b)})
    selected = []
    for c in cases:
        rows = c['resource_and_acquisition_prefix']
        qualified = [r for r in rows if r['act'] in (1, 2) and all(r['recorded_acquisition_prefix_proxy'].get(k, 0) >= 1 for k in ['SNAKEBITE', 'ACCELERANT', 'FOOTWORK'])]
        if qualified:
            selected.append({'example': c['example'], 'safe_projection_sha256': c['safe_projection_sha256'], 'win': c['win'], 'first_qualified_node': qualified[0]['node'], 'act': qualified[0]['act']})
    assert len(selected) == 4 and all(c['win'] == 1 for c in selected)
    resource = []
    expected = {'1a0a': {24: (3, 23, 0), 25: (39, 0, 36), 27: (8, 31, 0)}, '8f86': {18: (47, 0, 42), 24: (33, 0, 17), 25: (0, 33, 0)}}
    for prefix, nodes in expected.items():
        c = next(c for c in cases if c['example'].startswith('projection-' + prefix))
        for node, values in nodes.items():
            r = next(r for r in c['resource_and_acquisition_prefix'] if r['node'] == node)
            assert (r['hp_end_proxy'], r['gross_damage'], r['recorded_healed']) == values
            resource.append({'example': c['example'], 'win': c['win'], **{k: r[k] for k in ['node', 'act', 'hp_end_proxy', 'gross_damage', 'recorded_healed']}})
    old_maps = json.loads((LOCAL / 'paper/materials/20261030-issue85-grading/source-map.json').read_text())['entries']
    windows = []
    for entry in old_maps:
        if entry['id'] not in [e['id'] for e in original['entries']]:
            continue
        for ev in entry['evidence']:
            if ev.get('type') != 'own':
                continue
            for w in ev.get('windows', []):
                with (ROOT / w['path']).open('rb') as f:
                    f.seek(w['offset']); b = f.read(w['length'])
                assert len(b) == w['length'] and sha(b) == w['sha256']
                windows.append({'entry': entry['id'], 'run': ev['run'], **w})
    result = {'schema': 'issue85-regrade79-evidence-audit-v1', 'frozen_input_sha256': sha(raw),
              'historical_route_population': {'archive': str(archive), 'archive_sha256': meta['archive_sha256'], 'member': member.name,
                 'sha256': sha(population_raw), 'pointer': '/rest_elite_branch/all', 'independent_runs': 280, 'opportunities': 524,
                 'whole_run_win_runs': p['whole_run_win_runs'], 'scope': 'own Silent A10 unknown-version opportunity population; historical descriptive claim only'},
              'new_external': {'source_ledger_sha256': sha(ledger_raw), 'statistics_sha256': sha(statistics_raw), 'cases_sha256': sha(cases_raw),
                 'dataset_sha256': ledger['source']['database_sha256'], 'version': 'v0.111', 'selected_uploads': 20, 'selected_winners': 10,
                 'selected_losers': 10, 'nodes': 859, 'new_system_runs': 0, 'qualifying_first_two_acts': selected,
                 'route_resource_rows': resource, 'verified_pages': pages},
              'reverified_own_windows': windows,
              'limits': ['20 outcome-balanced uploads are not 20 independent players or an unbiased success denominator.',
                         'Four qualifying selected winners are not a 4/10 estimate of success after holding the signature.',
                         'Historical 280 own runs do not enlarge the new external two-case denominator.',
                         'Legacy auxiliary locator gaps stay in the old source map; missing files are not treated as new evidence.']}
    (OUT / 'evidence-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'historical_runs_recounted': 280, 'external_uploads_checked': 20, 'pages_checked': len(pages), 'qualifying_selected_winners': 4, 'own_windows': len(windows)}))


if __name__ == '__main__':
    main()
