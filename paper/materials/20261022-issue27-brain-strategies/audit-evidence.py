"""Offline evidence extraction; exact frozen files and indexed bounded log slices only."""
import collections
import csv
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = ROOT / 'learner/runs/20261022-184754-e08ce39d-b6e8-490b-9b69-c66a8f59dd38-issue-27-brain-strategies-task'
HERE = Path(__file__).resolve().parent
MANIFEST = ROOT / '.artifacts/ops-issue27-20261022/inputs.json'
m = json.loads(MANIFEST.read_bytes())
files = {f['original_path']: f for f in m['files']}
sha = lambda b: hashlib.sha256(b).hexdigest()
def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def frozen(name):
    return Path(files[name]['path'])
assert (m['request_id'], m['issue'], m['task'], m['batch'], m['character']) == (
    'github-issue-27-brain-strategies-20261022', 27, 'issue-27-brain-strategies-task',
    'issue-27-brain-strategies-20261022-1010', 'silent')
checks = []
for f in m['files'] + [m['runs_snapshot'], m['run_inventory']]:
    b = Path(f['path']).read_bytes()
    assert sha(b) == f['sha256'] and len(b) == f.get('bytes', len(b)), f['path']
    checks.append({'path': f['path'], 'bytes': len(b), 'sha256': sha(b), 'ok': True})
write('input-verification.json', {'input_sha256': sha(MANIFEST.read_bytes()), 'identity': {
    k: m[k] for k in ['request_id', 'issue', 'task', 'batch', 'character', 'base']}, 'checks': checks})
inventory = json.loads(Path(m['run_inventory']['path']).read_bytes())
ended = {r['run_id'] for r in inventory}
assert len(ended) == 434
refs = []
windows = [
    ('FETDVL1P59B9', 17, 'first', '2026-10-12T22:06:32.977Z', '2026-10-12T22:10:20.999Z'),
    ('VGNDNGPFYRE3', 17, 'first', '2026-10-12T23:45:22.896Z', '2026-10-12T23:46:36.999Z'),
    ('YZQEEDWQ6AY6', 33, 'first', '2026-10-13T00:48:26.929Z', '2026-10-13T00:51:47.102Z'),
    ('YZQEEDWQ6AY6', 33, 'sl6', '2026-10-13T01:05:02.462Z', '2026-10-13T01:09:40.999Z'),
]
idx = json.loads((OUT / 'state-index.json').read_bytes())
frames = []
with (ROOT / 'logs/states.jsonl').open('rb') as stream:
    for row in idx['rows']:
        run, act, floor, turn, screen, off, size = row
        if (run, floor) not in {(w[0], w[1]) for w in windows}:
            continue
        assert run in ended and off + size <= m['log_byte_limits']['logs/states.jsonl']
        # Timestamp is indexed, but inspect only the four explicit fight windows.
        stream.seek(off)
        b = stream.read(size)
        z = json.loads(b)
        window = next((w for w in windows if (run, floor) == w[:2] and w[3] <= z['ts'] <= w[4]), None)
        if window is None:
            continue
        s = z['state']; combat = s.get('combat') or {}; player = combat.get('player') or {}
        assert s['run_id'] == run and s['run']['character_id'] == 'SILENT'
        refid = f'states:{off}'
        refs.append({'id': refid, 'source': 'own', 'run': run, 'floor': floor, 'turn': turn,
                     'path': 'logs/states.jsonl', 'offset': off, 'bytes': size, 'sha256': sha(b),
                     'stream_sha256': None, 'frozen_byte_limit': m['log_byte_limits']['logs/states.jsonl'],
                     'attempt_scope': window[2]})
        frames.append({'ref': refid, 'run': run, 'floor': floor, 'attempt_scope': window[2],
                       'ts': z['ts'], 'turn': turn, 'screen': screen,
                       'hp': player.get('current_hp', s['run'].get('current_hp')),
                       'block': player.get('block'), 'energy': player.get('energy'),
                       'enemies': [{k: e.get(k) for k in ['index', 'enemy_id', 'current_hp', 'block', 'is_alive', 'powers', 'move_id', 'intents']}
                                   for e in combat.get('enemies', [])]})
sl = json.loads((OUT / 'sl-index.json').read_bytes())
with (ROOT / 'logs/sl-attempts.jsonl').open('rb') as stream:
    for row in sl['rows']:
        z = dict(zip(sl['columns'], row)); off, size = z['off'], z['len']
        assert off + size <= m['log_byte_limits']['logs/sl-attempts.jsonl']
        stream.seek(off); b = stream.read(size); original = json.loads(b)
        assert original['run_id'] == z['run_id']
        refs.append({'id': f'sl:{off}', 'source': 'own', 'run': z['run_id'], 'floor': z['floor'],
                     'path': 'logs/sl-attempts.jsonl', 'offset': off, 'bytes': size, 'sha256': sha(b),
                     'stream_sha256': None, 'frozen_byte_limit': m['log_byte_limits']['logs/sl-attempts.jsonl']})
write('observed-frames.json', frames)
by_ref = {r['ref']: r for r in frames}
kin = by_ref['states:12040774765']
assert kin['hp'] == 3 and [e['current_hp'] for e in kin['enemies']] == [55, 62, 16]
assert next(p['amount'] for p in kin['enemies'][2]['powers'] if p['power_id'] == 'POISON_POWER') == 25
assert by_ref['states:12039634787']['hp'] == 53
assert by_ref['states:12040838947']['screen'] == 'REWARD'
assert by_ref['states:12040838947']['hp'] == 3
v = [r for r in frames if r['run'] == 'VGNDNGPFYRE3']
starts = [next(r for r in v if r['turn'] == t) for t in range(1, 7)]
assert [r['enemies'][0]['current_hp'] for r in starts] == [183, 180, 177, 133, 74, 11]
assert [r['hp'] for r in starts] == [55, 49, 45, 20, 20, 17]
assert v[-1]['screen'] == 'REWARD' and v[-1]['hp'] == 17
assert by_ref['states:12108239410']['hp'] == 77
first_end = by_ref['states:12110446436']
assert first_end['hp'] == 7 and [e['current_hp'] for e in first_end['enemies']] == [91, 56]
crab = by_ref['states:12123299008']
assert crab['hp'] == 1 and len(crab['enemies']) == 1
assert (crab['enemies'][0]['current_hp'], crab['enemies'][0]['block']) == (88, 99)
assert next(p['amount'] for p in crab['enemies'][0]['powers'] if p['power_id'] == 'STRENGTH_POWER') == 12
assert by_ref['states:12123455148']['screen'] == 'GAME_OVER'
assert by_ref['states:12123455148']['hp'] == 0
assert by_ref['states:12123455148']['enemies'][0]['current_hp'] == 85
formal = json.loads((HERE.parents[2] / 'knowledge/characters/silent/strategy-entries.json').read_bytes())
refids = {r['id'] for r in refs}
for e in formal['entries']:
    assert e['sample']['independent_runs'] == len({r['run'] for r in e['evidence']}) == 1
    assert all(ev['ref'].split('#')[-1] in refids for ev in e['evidence'])
dataset_name = 'paper/materials/2026-10-21-issue-16-strategy-library/dataset.jsonl.gz'
rows = [json.loads(l) for l in gzip.open(frozen(dataset_name), 'rt')]
eligible = [r for r in rows if r['run'] in ended]
ds_runs = {r['run'] for r in eligible}
types = collections.Counter(r['question_type'] for r in eligible)
unknown = {k: sum(r.get('outcome', {}).get(k) is None for r in eligible)
           for k in ['boss_pass', 'remaining_hp_loss', 'final_floor']}
replay = []
selectors = [
    ('card_reward', 'VGNDNGPFYRE3', None), ('event', 'FETDVL1P59B9', 1),
    ('rest', 'VGNDNGPFYRE3', 16), ('shop', 'VGNDNGPFYRE3', None),
    ('act_plan', 'YZQEEDWQ6AY6', 18)]
for kind, run, floor in selectors:
    r = next(r for r in eligible if r['question_type'] == kind and r['run'] == run
             and (floor is None or r['question']['floor'] == floor))
    replay.append({'type': kind, 'dataset_id': r['id'], 'label': r['label'],
                   'source_sha256': r['source_sha256'], 'dataset_sha256': files[dataset_name]['sha256'],
                   'question': r['question']})
write('fixed-questions.json', replay)
external = []
for name in ['card_choices.csv', 'skip_rates.csv', 'deck_sizes.csv']:
    original = 'paper/materials/2026-10-21-sts2fun-stats/' + name
    physical = frozen(original).read_bytes().splitlines(keepends=True)
    offsets = [0]
    for raw_line in physical:
        offsets.append(offsets[-1] + len(raw_line))
    with frozen(original).open() as f:
        for line, r in enumerate(csv.DictReader(f), 2):
            if r['version'] != 'v0.111': continue
            if name == 'card_choices.csv' and not (r['act'] == '1' and r['card'] in ['BLADE_DANCE', 'FOOTWORK', 'DEADLY_POISON']): continue
            if name == 'deck_sizes.csv' and r['scope'] != 'all': continue
            raw_line = physical[line - 1]
            assert next(csv.DictReader([physical[0].decode(), raw_line.decode()])) == r
            external.append({'source': 'external:sts2fun', 'namespace': 'aggregate:sts2fun:v0.111:Silent:A10',
                             'table': original, 'line': line, 'offset': offsets[line - 1], 'bytes': len(raw_line),
                             'sha256': sha(raw_line), 'snapshot_sha256': files[original]['sha256'], 'row': r})
openbook = json.loads(frozen('knowledge/common/open-book.json').read_bytes())
selected = [e for e in openbook['entries'] if e['kind'] == 'monsters' and e['id'] in
            ['KIN_PRIEST', 'KIN_FOLLOWER', 'VANTOM', 'KNOWLEDGE_DEMON']]
write('external-review.json', {'separate_from_own': True, 'sts2fun_provenance': json.loads(frozen(
    'paper/materials/2026-10-21-sts2fun-stats/provenance.json').read_bytes()),
    'cohorts': json.loads(frozen('knowledge/external/sts2fun/silent-a10.json').read_bytes())['cohorts'],
    'reviewed_aggregates': external, 'open_book_sources': openbook['sources'], 'reviewed_reference_entries': selected,
    'reference_independent_runs': 0, 'reference_independent_players': 0,
    'limits': ['No external run ids or exact global floors in these selected aggregates/reference facts.',
               'No new causal card-pick recommendation derived from observational associations.']})
write('coverage.json', {'design': 'observational', 'ended_own_independent_runs': 434,
    'dataset': {'rows': len(rows), 'eligible_rows': len(eligible), 'independent_runs': len(ds_runs),
                'primary_types': dict(types), 'unknown_outcomes': unknown,
                'not_covered_ended_runs': sorted(ended - ds_runs),
                'reading_scope': 'Mechanical metadata/count pass; selected five questions read; answers/reasons not strategy evidence.'},
    'own_raw': {'independent_runs': 3, 'fight_windows': windows, 'observed_frames': len(frames),
                'indexed_frames': len(idx['rows']), 'sl_index_rows': len(sl['rows']),
                'independent_boss_fights': 3, 'retry_denominator_added': 0,
                'unhashed_whole_streams': ['logs/states.jsonl', 'logs/sl-attempts.jsonl'],
                'limits': ['Only these boss windows support published entries; not all 434 runs read.',
                           'YZ first predicted-death SL cutoff is not executed death; SL6 kept separately.',
                           'No counterfactual choice, causal gain, or historical complete dirty code tree.']},
    'external': {'sources_reviewed': ['external:sts2fun', 'external:spire-codex'],
                 'v0.111.0_silent_a10_cohort_runs': 1739, 'v0.111.0_silent_a10_cohort_players': 98,
                 'not_a_common_denominator': 'Card slots, screens, deck cohorts and player counts remain per table/row; not additive.',
                 'other_versions': 'v0.107–v0.110 inspected as cohort metadata only; excluded from strategy.'},
    'unread_or_excluded': ['Other raw fights/characters; runs outside frozen inventory; bytes beyond manifest limits',
        'Most of frozen experience/ledger text (dedup scoped to selected claims); v6-history/build-cores not used as evidence',
        'Original model reasons/plan examples, simulation/MC estimates and accepted-only answers as action/cause evidence'],
    'missing': m['missing'], 'missing_note': 'knowledge-tools.ts absent in manifest; actual #33 path is agent-knowledge.ts, present frozen and current.'})
(OUT / 'evidence-refs.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in refs))
print(json.dumps({'frames': len(frames), 'refs': len(refs), 'dataset_rows': len(rows),
                  'dataset_runs': len(ds_runs), 'uncovered_ended': len(ended - ds_runs)}, ensure_ascii=False))
