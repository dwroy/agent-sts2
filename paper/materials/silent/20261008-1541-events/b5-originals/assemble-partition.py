"""Assemble only disjoint original-runner rows with unchanged original-index seeds."""
import hashlib
import json
from pathlib import Path

S = Path(__file__).resolve().parent


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


fights = rows(S / 'dataset/fights.jsonl')
part = json.loads((S / 'before-partition.receipt.json').read_text())
prefix = rows(S / 'before-prefix.frozen.jsonl')
assert hashlib.sha256((S / 'before-prefix.frozen.jsonl').read_bytes()).hexdigest() == part['prefix_sha256']
all_rows = list(prefix)
for group in (0, 1):
    keys = set(json.loads((S / f'before-tail-{group}.keys.json').read_text()))
    tail = rows(S / f'before-tail-{group}-results/results-0.jsonl')
    assert {(r['key'], r['start']) for r in tail} == {(key, start) for key in keys for start in ('t1', 'pre')}
    assert len(tail) == 2 * len(keys)
    all_rows.extend(tail)
expected = [(r['key'], start) for r in fights for start in ('t1', 'pre')]
by = {(r['key'], r['start']): r for r in all_rows}
assert len(by) == len(all_rows) == len(expected) == 466
assert set(by) == set(expected)
ordered = [by[identity] for identity in expected]
for row in ordered:
    assert row['character'] == 'silent'
    if row.get('sim'):
        assert row['sim']['samples'] == len(row['sim']['outcomes']) == 200
out = S / 'before-authoritative-results'
out.mkdir(exist_ok=True)
path = out / 'results-0.jsonl'
assert not path.exists(), 'Never overwrite an assembled baseline'
path.write_text(''.join(json.dumps(row, ensure_ascii=False)+'\n' for row in ordered))
receipt = {**part, 'rows': len(ordered), 'results_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
           'method': 'Frozen completed original prefix plus two disjoint original --keys runs, reordered only for storage to the same full fights order; no input rows/seeds/samples/models/thresholds changed'}
(S / 'before-assembly.receipt.json').write_text(json.dumps(receipt, indent=1)+'\n')
print(json.dumps({'rows': len(ordered), 'prefix': len(prefix), 'tail_groups': part['groups']}))
