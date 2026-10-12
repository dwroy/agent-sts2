"""Join disjoint fixed-runner segments without changing original line seeds."""
import copy
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent


def rows(path):
    result = []
    incomplete = []
    for index, raw in enumerate(path.read_bytes().splitlines()):
        try:
            result.append(json.loads(raw))
        except ValueError:
            incomplete.append(index)
    return result, incomplete


def normalized(row):
    result = copy.deepcopy(row)
    if result.get('sim'):
        result['sim'].pop('ms', None)
    return result


plan = json.loads((OUT / 'parallel-replay-plan.json').read_text())
fights, invalid = rows(OUT / 'dataset/fights.jsonl')
assert not invalid
serial_path = OUT / 'before-serial-results/results-0.jsonl'
tail_path = OUT / 'before-tail-results/results-0.jsonl'
serial, serial_invalid = rows(serial_path)
tail, tail_invalid = rows(tail_path)
assert not tail_invalid
prefix_keys = {row['key'] for row in fights[:plan['prefix_fights']]}
tail_keys = {row['key'] for row in fights[plan['prefix_fights']:]}
prefix = {(r['key'], r['start']): r for r in serial if r['key'] in prefix_keys}
suffix = {(r['key'], r['start']): r for r in tail}
assert len(prefix) == plan['prefix_expected_rows']
assert len(suffix) == plan['tail_expected_rows'] == len(tail)
assert {k for k, _ in suffix} == tail_keys
assert not set(prefix) & set(suffix)
overlap = [r for r in serial if (r['key'], r['start']) in suffix]
differences = [dict(key=r['key'], start=r['start']) for r in overlap
               if normalized(r) != normalized(suffix[r['key'], r['start']])]
assert not differences, differences
all_rows = {**prefix, **suffix}
ordered = [all_rows[r['key'], s] for r in fights for s in ('t1', 'pre')]
assert len(ordered) == 2 * len(fights)
(OUT / 'before-results').mkdir(exist_ok=False)
out_path = OUT / 'before-results/results-0.jsonl'
out_path.write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in ordered))
proof = {'plan': 'parallel-replay-plan.json', 'rows': len(ordered),
         'prefix_rows': len(prefix), 'tail_rows': len(suffix),
         'raw_serial_rows': len(serial), 'raw_serial_invalid_lines_retained': serial_invalid,
         'extra_serial_rows_retained': len(serial) - len(prefix),
         'duplicate_rows_checked_excluding_only_sim_ms': len(overlap),
         'duplicate_differences': differences,
         'seed_rule': plan['seed_rule'],
         'files': {str(p.relative_to(OUT)): {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
                                           'bytes': p.stat().st_size}
                   for p in (serial_path, tail_path, out_path, OUT / 'tail-keys.json')}}
(OUT / 'parallel-replay-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=1) + '\n')
print(json.dumps(proof, ensure_ascii=False))
