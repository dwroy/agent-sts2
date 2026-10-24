"""Offline audit of the exact frozen batch, without scanning original log streams."""
import collections
import csv
import gzip
import hashlib
import io
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
MANIFEST = Path('/home/dw/Projects/agent-sts2/.artifacts/ops-issue27-batch2-20261022/inputs.json')
M = json.loads(MANIFEST.read_text())
FILES = {f['original_path']: f for f in M['files']}
REFS = []


def sha(b):
    return hashlib.sha256(b).hexdigest()


def dump(name, obj):
    (HERE / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')


def frozen(name):
    return Path(FILES[name]['path'])


def table(name):
    data = frozen(name).read_bytes()
    lines = data.splitlines(keepends=True)
    header = next(csv.reader([lines[0].decode()]))
    offset = len(lines[0])
    rows = []
    for line_number, raw in enumerate(lines[1:], 2):
        row = dict(zip(header, next(csv.reader([raw.decode()]))))
        rows.append((row, {'id': f'{Path(name).stem}:{line_number}',
                          'path': str(frozen(name)), 'original_path': name,
                          'snapshot_sha256': sha(data), 'line': line_number,
                          'offset': offset, 'bytes': len(raw), 'sha256': sha(raw), 'row': row}))
        offset += len(raw)
    return rows


if __name__ == '__main__':
    assert (M['request_id'], M['issue'], M['task'], M['batch'], M['character']) == (
        'github-issue-27-brain-strategies-20261022', 27, 'issue-27-brain-strategies-task',
        'issue-27-brain-strategies-batch2-20261022-224403', 'silent')
    verified = []
    for f in M['files']:
        raw = Path(f['path']).read_bytes()
        assert len(raw) == f['bytes'] and sha(raw) == f['sha256'], f['original_path']
        verified.append({'path': f['path'], 'original_path': f['original_path'],
                         'bytes': len(raw), 'sha256': sha(raw)})
    for key in ['runs_snapshot', 'run_inventory']:
        f = M[key]
        b = Path(f['path']).read_bytes()
        assert sha(b) == f['sha256']
        if 'bytes' in f:
            assert len(b) == f['bytes']
    dump('input-verification.json', {'manifest': str(MANIFEST), 'input_sha256': sha(MANIFEST.read_bytes()),
                                    'identity_verified': True, 'files': verified,
                                    'runs_snapshot_verified': True, 'inventory_verified': True,
                                    'missing': M['missing'], 'log_byte_limits': M['log_byte_limits']})
    inventory = json.loads(Path(M['run_inventory']['path']).read_text())
    ended = {r['run_id'] for r in inventory}
    assert len(ended) == 446 and all(r['character'] == 'SILENT' and r.get('ended') for r in inventory)
    stats = 'paper/materials/2026-10-21-sts2fun-stats/'
    selected = {}
    for name in ['skip_rates.csv', 'card_choices.csv']:
        for row, ref in table(stats + name):
            if row['version'] == 'v0.111' and (
                name == 'skip_rates.csv' or row['act'] == '1' and row['card'] in ['BLADE_DANCE', 'DEADLY_POISON', 'FOOTWORK']):
                REFS.append(ref)
                selected[ref['id']] = row
    combat_name = 'paper/materials/2026-10-21-sts2fun-combat-diagnostic/combat_distribution.csv'
    for row, ref in table(combat_name):
        if row['source'] == 'external' and row['act'] in ['2', '3'] and row['kind'] in ['boss', 'elite']:
            REFS.append(ref)
            selected[ref['id']] = row
    dump('external-review.json', selected)
    types, unknown, runs = collections.Counter(), collections.Counter(), set()
    questions = {}
    offset = 0
    dataset = 'paper/materials/2026-10-21-issue-16-strategy-library/dataset.jsonl.gz'
    with gzip.open(frozen(dataset), 'rb') as handle:
        for line_number, raw in enumerate(handle, 1):
            r = json.loads(raw)
            if r['run'] not in ended:
                offset += len(raw)
                continue
            runs.add(r['run'])
            types[r['question_type']] += 1
            for key in ['boss_pass', 'remaining_hp_loss', 'final_floor']:
                unknown[key] += r.get('outcome', {}).get(key) is None
            q, typ = r['question'], r['question_type']
            wanted = (typ == 'card_reward' and q.get('act') == 2 or
                      typ in ['event', 'rest'] and q.get('boss') == 'TEST_SUBJECT_BOSS' or
                      typ in ['shop', 'act_plan'] and q.get('boss') == 'KNOWLEDGE_DEMON_BOSS')
            if wanted and typ not in questions:
                questions[typ] = {'type': typ, 'dataset_id': r['id'], 'label': r['label'],
                    'question': q, 'source_sha256': r['source_sha256'],
                    'dataset_ref': {'path': str(frozen(dataset)), 'snapshot_sha256': FILES[dataset]['sha256'],
                                    'uncompressed_offset': offset, 'bytes': len(raw), 'line': line_number,
                                    'sha256': sha(raw)}}
            offset += len(raw)
    dump('fixed-questions.json', list(questions.values()))
    prior = json.loads(frozen('knowledge/characters/silent/strategy-entries.json').read_text())
    current = json.loads((ROOT / 'knowledge/characters/silent/strategy-entries.json').read_text())
    assert prior == current, 'formal library changed before content work'
    terms = ['BLADE_DANCE', 'DEADLY_POISON', 'FOOTWORK', '跳过', 'KNOWLEDGE_DEMON', 'TEST_SUBJECT', '知识恶魔', '试验体']
    dedup = {'formal_ids': [e['id'] for e in prior['entries']], 'terms': terms, 'experience': [], 'ledger': []}
    exp = json.loads(frozen('knowledge/characters/silent/experience.json').read_text())
    for e in exp['entries']:
        if any(t in json.dumps(e, ensure_ascii=False) for t in terms):
            dedup['experience'].append({'id': e['id'], 'scope': e.get('scope'), 'lesson': e.get('lesson'), 'evidence': e.get('evidence')})
    with frozen('paper/materials/learning/ledger.jsonl').open() as handle:
        for line_number, raw in enumerate(handle, 1):
            r = json.loads(raw)
            if r.get('character') == 'silent' and r.get('claim') and any(t in r['claim'] for t in terms):
                dedup['ledger'].append({'line': line_number, 'id': r['id'], 'claim': r['claim'], 'status': r.get('status')})
    dump('dedup-review.json', dedup)
    (HERE / 'evidence-refs.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in REFS))
    dump('coverage.json', {
        'design': 'observational', 'frozen_ended_silent_runs': len(ended),
        'inventory_ascensions': dict(collections.Counter(str(r['ascension']) for r in inventory)),
        'own_new_strategy_support_runs': 0, 'own_raw_observation_windows_this_batch': [],
        'retained_prior_entries': {'count': 3, 'independent_runs_per_entry': 1,
            'raw_revalidated_this_batch': False, 'reference': 'frozen first-batch coverage.json; no denominator promoted'},
        'dataset': {'rows': sum(types.values()), 'independent_runs': len(runs), 'primary_types': types,
            'unknown_outcomes': unknown, 'ended_runs_not_in_dataset': sorted(ended - runs),
            'scope': 'metadata count only; five factual question envelopes selected for fixed consumer replay; no answers/reasons used'},
        'external': {'source': 'external:sts2fun', 'version': 'v0.111.0', 'cohort_runs': 1739,
            'cohort_players': 98, 'filters': "SILENT/A10/single-player/valid/not-abandoned/no-modifiers",
            'reward_screens_by_act': {'1': 13307, '2': 7821, '3': 4411},
            'blade_dance_act1': {'offers': 1054, 'players': 83, 'matched_offers': 983, 'matched_players': 49},
            'knowledge_demon': {'fights': 360, 'runs': 360, 'players': 68},
            'test_subject': {'fights': 501, 'runs': 501, 'players': 70},
            'denominators_additive': False, 'row_refs': 'evidence-refs.jsonl'},
        'external_reference': {'source': 'external:spire-codex', 'strategy_support_this_batch': False,
            'scope': 'frozen library/provenance inspected as available reference; no mechanic recommendation derived'},
        'unread_or_excluded': ['all original raw states/brain/decisions streams; whole streams not hashed this batch',
            'other characters; new/unfinished runs; bytes beyond frozen caps',
            'v0.107-v0.110 and other versions from recommendations',
            'simulation/MC outputs; old model reasons; accepted answers as executed choice/causal outcome',
            'most historical lessons, ledger evidence windows, build-cores and v6-history'],
        'missing': M['missing'], 'causal_effect': None, 'first_attempt_vs_including_sl':
            'No new own outcome aggregation. External SL policy unknown, uploaded attempt only. Prior own windows remain first/SL separate.'})
    print(json.dumps({'verified_files': len(verified), 'ended_runs': len(ended), 'dataset_rows': sum(types.values()),
                      'fixed_questions': list(questions), 'external_rows': len(REFS),
                      'dedup_experience_hits': len(dedup['experience']), 'dedup_ledger_hits': len(dedup['ledger'])}))
