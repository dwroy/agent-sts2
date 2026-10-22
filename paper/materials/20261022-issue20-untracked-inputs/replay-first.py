"""Prepare a fixed single-file consumer and separate mocked release-gate probes.

Run real Vitest separately with threads/one worker. No real full checks are run.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('action', choices=('prepare', 'mutate'))
parser.add_argument('--root', required=True)
args = parser.parse_args()
root = Path(args.root).resolve()
out = Path(__file__).resolve().parent
assert out.is_relative_to(root)
sys.path.insert(0, str(root / 'ops/tests'))
from test_release_order import ReleaseOrder
import release_plan

fixture = out / 'fixture'
module = fixture / 'agent/tests/runtime-helper.mts'
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
if args.action == 'mutate':
    module.write_text('export const fixed = 2;\n')
    data = json.loads((out / 'result.json').read_text())
    data['after_sha256'] = sha(module)
    (out / 'result.json').write_text(json.dumps(data, indent=2) + '\n')
    sys.exit(0)

if fixture.exists(): raise ValueError('preserve the original replay; choose a fresh output directory')
case = ReleaseOrder(); case.prepare_root(fixture)
(fixture / 'agent/node_modules').symlink_to((root / 'agent/node_modules').resolve(), target_is_directory=True)
wrapper = 'agent/tests/imported-module.test.ts'
(fixture / wrapper).write_text('import {it,expect} from "vitest";\n'
    'import {fixed} from "./runtime-helper.mts";\n'
    'it("uses the actual module",()=>expect(fixed).toBe(1));\n')
config = 'agent/vitest.config.mjs'
(fixture / config).write_text('export default {envDir:false,cacheDir:"../.state/vite-cache",'
    'test:{include:["tests/imported-module.test.ts"],pool:"threads",maxWorkers:1,fileParallelism:false}};\n')
case.git('add', wrapper, config)
case.manifest = case.make_plan()
value = json.loads(case.manifest.read_text())
for name in (wrapper, config):
    value['deliveries'][name] = dict(value=release_plan.file_value(fixture, name), preimage=None)
case.manifest.write_text(json.dumps(value))
# Only the injected executor creates this synthetic full receipt, not real Vitest.
assert case.check() == 0
original = case.first.read_bytes()
(out / 'mocked-origin.json').write_bytes(original)
module.write_text('export const fixed = 1;\n'); module.chmod(0o644)
result = dict(fixture_only=True, full_commands_mocked=True, real_consumer_scope='one imported-module.test.ts',
              origin_note='synthetic full executor; module absent at origin; no real full proof',
              input='agent/tests/runtime-helper.mts', before_sha256=sha(module), states=[])
for mode in ('exact', 'data'):
    if mode == 'data':
        case.queue.transition('high40', {'failed-retained'}, 'reserved', evidence='fixed fixture reconciliation')
        case.rebase_data()
    before = len(case.calls)
    receipt = fixture / f'.state/rejected-{mode}.json'
    code = case.check(receipt, reuse=case.first)
    proof = json.loads(receipt.read_text())
    (out / f'mocked-rejected-{mode}.json').write_bytes(receipt.read_bytes())
    result['states'].append(dict(requested_reuse=mode, exit=code, state=proof['state'], mode=proof.get('mode'),
                                 extra_mocked_commands=len(case.calls)-before))
    assert code == 1 and proof['state'] == 'failed-retain-original' and proof.get('mode') is None
    assert len(case.calls) == before
result['original_receipt_unchanged'] = case.first.read_bytes() == original
assert result['original_receipt_unchanged']
(out / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
