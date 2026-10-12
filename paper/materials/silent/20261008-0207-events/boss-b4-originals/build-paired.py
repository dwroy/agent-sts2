import copy
import hashlib
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]

def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def normalized(row):
    result = copy.deepcopy(row)
    if result.get('sim'):
        result['sim'].pop('ms', None)
    return result

before = rows(OUT / 'before-results/results-0.jsonl')
repeat = rows(OUT / 'target-replay-results/results-0.jsonl')
fights = {r['key']: r for r in rows(OUT / 'dataset/fights.jsonl')}
expected = {(k, s) for k in fights for s in ('t1', 'pre')}
assert len(before) == len(expected)
assert {(r['key'], r['start']) for r in before} == expected
assert len(repeat) == 2 * sum(r['encounter'] == 'THE_INSATIABLE' for r in fights.values())
targets = {(r['key'], r['start']): r for r in repeat}
differences = []
after = []
for r in before:
    k = (r['key'], r['start'])
    assert r['character'] == 'silent'
    assert r['actual']['won'] == (fights[r['key']]['outcome'] == 'won')
    if r.get('sim'):
        assert r['sim']['samples'] == 200
    if r['enc'] == 'THE_INSATIABLE':
        other = targets[k]
        if normalized(r) != normalized(other):
            differences.append({'key': k[0], 'start': k[1]})
        after.append(other)
    else:
        after.append(r)
assert not differences, differences
provenance = json.loads((OUT / 'before-provenance.json').read_text())
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip() == provenance['simulator_base']
assert not subprocess.check_output(['git', 'diff', '--name-only', '--', 'agent/src', 'agent/tools', 'knowledge'], cwd=ROOT, text=True).strip()
for path, sha in provenance['input_files'].items():
    assert digest(ROOT / path) == sha, path
for relative, field in [('dataset/fights.jsonl', 'dataset_sha256'),
                        ('dataset/sources.jsonl', 'sources_sha256'),
                        ('dataset/turns.jsonl', 'turns_sha256'),
                        ('split.json', 'split_sha256')]:
    assert digest(OUT / relative) == provenance[field], relative
split = json.loads((OUT / 'split.json').read_text())
dispatch = json.loads((OUT / 'dispatch-evidence.json').read_text())
assert split['tune'] == dispatch['split']['tune']
assert split['cutoff_ts'] == dispatch['split']['cutoff_ts']
assert set(dispatch['split']['val']) <= set(split['val'])
(OUT / 'after-results').mkdir(exist_ok=True)
(OUT / 'after-results/results-0.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in after))
(OUT / 'after-provenance.json').write_bytes((OUT / 'before-provenance.json').read_bytes())
proof = {'base': provenance['simulator_base'], 'head': provenance['simulator_base'],
         'before_rows': len(before), 'after_rows': len(after), 'fights': len(fights),
         'target_rows_independently_replayed': len(repeat), 'target_differences_excluding_only_sim_ms': differences,
         'other_boss_rows_reused_by_exact_key': len(before) - len(repeat),
         'source_inputs_unchanged': True, 'samples': 200, 'seed_rule': provenance['seed_rule'],
         'before_results_sha256': digest(OUT / 'before-results/results-0.jsonl'),
         'after_results_sha256': digest(OUT / 'after-results/results-0.jsonl'),
         'errors': [{k: r.get(k) for k in ('key', 'start', 'error', 'simError')} for r in before if not r.get('sim')]}
(OUT / 'paired-replay-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=1) + '\n')
for side in ('before', 'after'):
    cmd = ['python3', str(ROOT / 'agent/tools/boss-sim/trust.py'), '--character', 'silent',
           '--results', str(OUT / (side + '-results/results-0.jsonl')),
           '--fights', str(OUT / 'dataset/fights.jsonl'), '--split', str(OUT / 'split.json'),
           '--turns', str(OUT / 'dataset/turns.jsonl'), '--provenance', str(OUT / (side + '-provenance.json')),
           '--out', str(OUT / (side + '-trust.json'))]
    with (OUT / (side + '-trust.log')).open('w') as handle:
        subprocess.run(cmd, cwd=ROOT, stdout=handle, stderr=subprocess.STDOUT, check=True)

# Record the actual per-turn validation pairs used by the unchanged leak function.
turns = {r['key']: {t[0]: t for t in r['turns']} for r in rows(OUT / 'dataset/turns.jsonl')}
coverage = {}
for side, results in [('before', before), ('after', after)]:
    coverage[side] = {}
    for start in ('t1', 'pre'):
        selected = [r for r in results if r['key'] in split['val'] and r['start'] == start]
        per_boss = {}
        for enc in sorted({r['enc'] for r in selected}):
            mine = [r for r in selected if r['enc'] == enc]
            success = [r for r in mine if r.get('sim')]
            pairs = []
            for r in success:
                for k in range(2, 8):
                    here = turns.get(r['key'], {}).get(k)
                    per = r['sim'].get('perTurn', [])
                    if here and here[5] is not None and here[3] is not None and len(per) >= k and per[k - 1][0] != 0:
                        pairs.append([r['key'], k])
            per_boss[enc] = {'attempts': len(mine), 'successful_predictions': len(success),
                             'actual_won': sum(r['actual']['won'] for r in mine),
                             'actual_died': sum(not r['actual']['won'] for r in mine),
                             'successful_keys': sorted(r['key'] for r in success),
                             'leak_pairs': sorted(pairs)}
        coverage[side][start] = per_boss
assert coverage['before'] == coverage['after']
(OUT / 'validation-coverage.json').write_text(json.dumps(coverage, ensure_ascii=False, indent=1) + '\n')
print(json.dumps({'paired_rows': len(before), 'target_repeat_identical': True,
                  'profiles_identical': (OUT / 'before-trust.json').read_bytes() == (OUT / 'after-trust.json').read_bytes(),
                  'errors': proof['errors']}, ensure_ascii=False))
