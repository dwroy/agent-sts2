"""Read-only closure check plus disposable negative probes; never admits methods.

Usage: python3 verify-combination.py --root COMBINATION --output OWN_OUTPUT
COMBINATION must already include #84 declarations and #85 r2 source.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
root, output = args.root.resolve(), args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(root / 'ops'))
from fixed_producer_methods import manifest, method

def dump(name, value):
    (output / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

registry = 'ops/fixed-producer-dependencies.json'
original = (root / registry).read_bytes()
declaration = json.loads(original)
results = {}
for producer in declaration['producers']:
    value = manifest(root, producer, root)
    results[producer] = dict(passed=True, leaves=len(value['inputs']), method_sha256=method(root, producer, root))
assert results['outcome']['method_sha256'] == 'f50b9ea3c7debe7724ad29e0d36d654791442f252ede0d6f2dc28a5fe8fdfaf9'
assert not any('agent/src/' in p for p in manifest(root, 'outcome', root)['inputs'])
dump('closure-after.json', results)
probes = []
with tempfile.TemporaryDirectory(prefix='negative-probes-', dir=output) as directory:
    probe = Path(directory)
    leaves = dict(declaration['common'])
    for name in ('outcome', 'v6-history', 'silent-boss-calibration'):
        leaves.update(declaration['producers'][name]['inputs'])
    for identity in leaves:
        path = identity.split(':', 1)[1]
        destination = probe / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root / path, destination)
    (probe / registry).write_bytes(original)

    def reject(label, producer, expected):
        try:
            manifest(probe, producer, probe)
        except ValueError as error:
            assert expected in str(error), (label, str(error))
            probes.append(dict(probe=label, rejected=True, error=str(error)))
        else:
            raise AssertionError('guard accepted ' + label)

    exposure = 'code:agent/src/brain/decision-knowledge-exposure.ts'
    for producer, expected in [('v6-history', 'incomplete fixed dependency'), ('silent-boss-calibration', 'source read family')]:
        modified = copy.deepcopy(declaration)
        del modified['producers'][producer]['inputs'][exposure]
        (probe / registry).write_text(json.dumps(modified))
        reject('missing new exposure leaf:' + producer, producer, expected)
    (probe / registry).write_bytes(original)
    source = probe / exposure.split(':', 1)[1]
    raw = source.read_bytes()
    try:
        source.write_bytes(raw + b'\n// Synthetic unreviewed ledger IO revision.\n')
        reject('changed ledger source without review', 'v6-history', 'engineering declaration')
        modified = copy.deepcopy(declaration)
        # Even a raw SHA update cannot bless the old opaque-site declaration.
        modified['producers']['v6-history']['inputs'][exposure]['sha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
        (probe / registry).write_text(json.dumps(modified))
        reject('hash update without opaque IO review', 'v6-history', 'opaque dependency site')
    finally:
        source.write_bytes(raw)
        (probe / registry).write_bytes(original)
    modified = copy.deepcopy(declaration)
    modified['producers']['v6-history']['inputs']['code:agent/src/brain/router.ts']['dependencies'].remove(exposure)
    (probe / registry).write_text(json.dumps(modified))
    reject('deleted static exposure edge', 'v6-history', 'undeclared static dependency')
    (probe / registry).write_bytes(original)
    unknown = probe / 'agent/src/issue84-unreviewed.ts'
    unknown.write_text('export const unreviewed = true;\n')
    reject('unreviewed new calibration read leaf', 'silent-boss-calibration', 'source read family')
    assert method(probe, 'outcome', probe) == results['outcome']['method_sha256']
    probes.append(dict(probe='unrelated agent/src leaf preserves outcome', unchanged=True))
    unknown.unlink()
    ledger = probe / 'logs/decision-knowledge-exposure/test.jsonl'
    ledger.parent.mkdir(parents=True)
    ledger.write_text('{"synthetic_data_only":true}\n')
    for producer in ('outcome', 'v6-history', 'silent-boss-calibration'):
        assert method(probe, producer, probe) == results[producer]['method_sha256']
    probes.append(dict(probe='ledger data changes preserve source methods', unchanged=True))
    assert (probe / registry).read_bytes() == original
assert (root / registry).read_bytes() == original
dump('negative-probes.json', dict(passed=True, probes=probes, source_root_mutated=False,
                                 admission=False, production_control=False))
print(json.dumps(dict(closed=len(results), outcome_leaves=results['outcome']['leaves'], probes=len(probes))))
