"""Independent fixed fixture: check whether valid imported .mts inputs are bound.

Full command execution is mocked solely to exercise the release receipt state
machine. The single Vitest consumer is run for real, separately; this script
does not claim a full suite result or touch a production queue.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

W = Path(os.environ['REVIEW_WORKTREE']).resolve()
sys.path.insert(0, str(W / 'ops/tests'))
from test_release_order import ReleaseOrder
import release_plan

out = Path(os.environ['REVIEW_OUTPUT']).resolve()
assert out.is_relative_to(W), 'review output must stay in isolated worktree'
out.mkdir(parents=True, exist_ok=False)
os.environ['TMPDIR'] = str(out / 'tmp')
Path(os.environ['TMPDIR']).mkdir()
import tempfile
tempfile.tempdir = os.environ['TMPDIR']
case = ReleaseOrder('test_untracked_runtime_cannot_hide_outside_tree_fingerprint')
case.setUp()
try:
    (case.root / 'agent/node_modules').symlink_to((W / 'agent/node_modules').resolve(), target_is_directory=True)
    module = case.root / 'agent/tests/runtime-helper.mts'
    module.write_text('export const fixed = 1;\n')
    wrapper = 'agent/tests/imported-module.test.ts'
    (case.root / wrapper).write_text('import {it,expect} from "vitest";\n'
        'import {fixed} from "./runtime-helper.mts";\n'
        'it("uses the actual module",()=>expect(fixed).toBe(1));\n')
    case.git('add', wrapper)
    case.manifest = case.make_plan()
    plan = json.loads(case.manifest.read_text())
    plan['deliveries'][wrapper] = dict(value=release_plan.file_value(case.root, wrapper), preimage=None)
    case.manifest.write_text(json.dumps(plan))
    def actual(label):
        argv = ['nice', '-n', '19', 'node', str(W / 'agent/node_modules/vitest/vitest.mjs'),
                'run', 'tests/imported-module.test.ts', '--pool=forks', '--maxWorkers=1', '--no-file-parallelism']
        with (out / (label + '.log')).open('wb') as log:
            result = subprocess.run(argv, cwd=case.root / 'agent', stdout=log, stderr=subprocess.STDOUT,
                                    timeout=45, env={**os.environ, 'NO_COLOR': '1'})
        return result.returncode
    before_inventory = release_plan.inventory(case.root)
    before_sha = hashlib.sha256(module.read_bytes()).hexdigest()
    consumer_before = actual('consumer-before')
    first = case.check()
    original = case.first.read_bytes()
    (out / 'mocked-original-receipt.json').write_bytes(original)
    module.write_text('export const fixed = 2;\n')
    after_inventory = release_plan.inventory(case.root)
    consumer_after = actual('consumer-after')
    count = len(case.calls)
    reused = case.root / '.state/reuse.json'
    second = case.check(reused, reuse=case.first)
    receipt = json.loads(reused.read_text())
    (out / 'mocked-reuse-receipt.json').write_bytes(reused.read_bytes())
    result = dict(source='d9c4849b1fa69b6fae5510a82f20cf95abf796a8',
        fixture_only=True, full_commands_mocked=True, actual_vitest_scope='one fixed imported-module.test.ts',
        input='agent/tests/runtime-helper.mts', before_sha256=before_sha,
        after_sha256=hashlib.sha256(module.read_bytes()).hexdigest(),
        inventory_before_after_same=before_inventory == after_inventory,
        inventory_contains_module='agent/tests/runtime-helper.mts' in before_inventory,
        actual_consumer_before_exit=consumer_before, actual_consumer_after_exit=consumer_after,
        initial_mocked_check_exit=first, reused_check_exit=second,
        reuse_mode=receipt.get('mode'), reused_state=receipt.get('state'),
        extra_mocked_commands=len(case.calls)-count, original_receipt_unchanged=case.first.read_bytes()==original,
        observed_boundary_failure=(consumer_before == 0 and consumer_after != 0 and second == 0
                                   and receipt.get('mode') == 'exact-reuse' and len(case.calls) == count))
    (out / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    sys.exit(1 if result['observed_boundary_failure'] else 0)
finally:
    case.doCleanups()
