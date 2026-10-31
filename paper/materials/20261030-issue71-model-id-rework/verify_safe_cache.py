"""Read-only verification of the existing anonymous cache, never the source database."""
import argparse
from collections import Counter
from datetime import datetime
import gzip
import io
import json
from pathlib import Path
import re
import subprocess
import sys
import types

TREE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(TREE / 'ops'))
import external_stock_source as current
from strategy_backfill_jobs import artifact
from strategy_research_jobs import digest

BASE = '1b7c652cbd5ef2355687e1e159fccacb2a73da06'
parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
args = parser.parse_args()
root = args.root.resolve()


def ref(relative):
    raw = (root / relative).read_bytes()
    return dict(path=relative, sha256=digest(raw), bytes=len(raw))


cache_ref = ref('data/external/issue54-safe-cache/runs.json.gz')
receipt_ref = ref('data/external/issue54-safe-cache/receipt.json')
assert cache_ref['sha256'] == '5c040c644cce7ad28eb247aef33f90413030ee23bc7015ac84366390e830b58f'
assert receipt_ref['sha256'] == '8f71e081787e100cf1ae1ebbf05e95ccd0f69b58e74cd42c95dfcf4e65dcd57c'
manifest_ref = ref('knowledge/external/sts2fun/builds-v1/manifest.json')
manifest = json.loads(artifact(root, manifest_ref))
package_ref = dict(path='knowledge/external/sts2fun/builds-v1/archetypes.json', **manifest['files']['archetypes.json'])
package = json.loads(artifact(root, package_ref))
baseline = types.ModuleType('baseline_stock_source')
old_source = subprocess.check_output(['git', '-C', str(TREE), 'show', BASE + ':ops/external_stock_source.py'])
exec(compile(old_source, BASE + ':ops/external_stock_source.py', 'exec'), baseline.__dict__)
try:
    list(baseline.cached_records(root, receipt_ref, cache_ref, package))
except ValueError as error:
    assert str(error) == 'invalid projected model ID'
    baseline_error = str(error)
else:
    raise AssertionError('baseline did not reproduce the incident')

with gzip.GzipFile(fileobj=io.BytesIO(artifact(root, cache_ref))) as stream:
    raw = stream.read(current.MAX_SOURCE_BYTES + 1)
assert len(raw) <= current.MAX_SOURCE_BYTES
original = json.loads(raw)
invalid = Counter()
invalid_windows = set()
for row in original:
    for point in row['nodes']:
        for room in point['rooms']:
            ident = room['id']
            if ident is not None and not re.fullmatch(r'[A-Z][A-Z0-9_.]*', ident):
                assert current.namespaced_room(room['kind'], ident)
                invalid[room['kind']] += 1
                invalid_windows.add(row['content_sha256'])
assert (sum(invalid.values()), len(invalid_windows)) == (55, 2)
rows = list(current.cached_records(root, receipt_ref, cache_ref, package))
assert len(rows) == len(original) == 6348
by_hash = {row['content_sha256']: row for row in original}
assert len(by_hash) == len(rows)
for row in rows:
    old = by_hash[row['content_sha256']]
    assert (row['version'], row['build'], row['win']) == (old['version'], old['build'], old['win'])
    assert row['window'] == [1, len(old['nodes'])]
    assert [point[3] for point in row['timeline']] == [
        [[room['kind'], room['id'], room['turns']] for room in point['rooms']] for point in old['nodes']]
    assert current.record_key(row) == baseline.record_key(row)
assert cache_ref == ref(cache_ref['path']) and receipt_ref == ref(receipt_ref['path'])
result = dict(verified_at=datetime.now().astimezone().isoformat(), base=BASE,
    runtime_sha256={name: digest((TREE / name).read_bytes()) for name in
                    ['ops/external_stock_source.py', 'ops/external_stock.py', 'ops/tests/test_external_stock.py',
                     'agent/tests/external-stock.test.ts']},
    package_manifest=manifest_ref, package=package_ref, cache=cache_ref, receipt=receipt_ref,
    baseline=dict(error=baseline_error, invalid_room_fields=sum(invalid.values()),
                  affected_complete_windows=len(invalid_windows), fields_by_kind=dict(invalid)),
    fixed=dict(input_records=len(original), normalized_records=len(rows),
               versions=dict(Counter(row['version'] for row in rows)),
               exact_builds=dict(Counter(str(row['build']) for row in rows)),
               wins=sum(row['win'] for row in rows),
               record_identity_digest=current.fingerprint(sorted(current.record_key(row) for row in rows)),
               raw_cache_and_receipt_unchanged=True, room_ids_windows_outcomes_and_keys_unchanged=True),
    scope='read-only safe-cache validation; no raw DB, production prepare/control/tick, model or publication')
print(json.dumps(result, ensure_ascii=False, indent=2))
