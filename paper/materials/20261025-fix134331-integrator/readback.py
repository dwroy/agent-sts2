from pathlib import Path
import datetime
import hashlib
import importlib.util
import json
import os
import subprocess
import sys

sys.dont_write_bytecode = True
R = Path('/home/dw/Projects/agent-sts2')
O = R / 'paper/materials/20261025-fix134331-ops'
M = Path(__file__).resolve().parent
read = lambda n: json.loads((O / n).read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()
d, h, b = [read(n) for n in ['candidate-and-original-readback.json', 'host-fallback-handoff.json', 'successor-seal-blocker.json']]
W = Path(d['original_worktree'])
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=W).decode().strip() == d['original_HEAD']
assert h['exact4_leaves'] == d['source_candidate_leaves']
originals = []
for ref in d['source_candidate_leaves'] + d['original_artifacts'] + d['five_native_originals']:
    path = Path(ref['path'])
    if not path.is_absolute():
        path = (W if ref in d['source_candidate_leaves'] else R) / path
    raw = path.read_bytes()
    assert len(raw) == ref['bytes'] and sha(raw) == ref['sha256'], str(path)
    assert (R / ref['retained_copy']).read_bytes() == raw
    originals.append(dict(path=str(path), sha256=sha(raw), bytes=len(raw)))
for ref in d['source_candidate_leaves']:
    for root, key in [(R, 'actual_main_before_sha256'), (R / '.worktrees/live', 'actual_live_before_sha256')]:
        path = root / ref['path']
        assert (sha(path.read_bytes()) if path.exists() else None) == ref[key]
patch = R / d['candidate_patch']['path']
assert sha(patch.read_bytes()) == d['candidate_patch']['sha256']
checks = []
for root in [R, R / '.worktrees/live']:
    p = subprocess.run(['git', 'apply', '--check', str(patch)], cwd=root, capture_output=True)
    assert p.returncode == 0, p.stderr.decode()
    checks.append(dict(root=str(root), readonly_apply_check_rc=p.returncode))
row = json.loads((R / 'ops/codex-ops/learn.json').read_text())['batches'][d['batch']]
assert row == json.loads((R / '.artifacts/ops-fix134331-20261025/originals/original-batch-row.json').read_text())
assert sha(json.dumps(row, ensure_ascii=True, sort_keys=True, separators=(',', ':')).encode()) == d['original_batch_row_sha256']
assert row['state'] == 'failed' and row['rc'] == 0
tui = json.loads(Path(d['five_native_originals'][0]['path']).read_text())
assert tui['state'] == 'session-ended' and tui['retirement_authorized'] is True
assert tui['session'] == d['learner_native_UUID'] and tui['turn'] == d['learner_native_turn']
assert all(tui['identity'][k] == b['identity_and_empty_shell_without_jobs'][k] for k in ['pane_id', 'tab_id', 'workspace_id', 'terminal_id'])
log_ref = next(x for x in d['five_native_originals'] if x['kind'] == 'learner_log')
events = [json.loads(x) for x in Path(log_ref['path']).read_bytes().splitlines()]
launches = [x for x in events if x.get('type') == 'learner_launch']
assert len(launches) == 1
launch = launches[0]
assert launch['engine'] == 'codex' and launch['cwd'] == tui['cwd'] == str(W)
assert 'batch' not in launch['params'] and launch['params']['worktree'] == str(W)
assert len([x for x in events if x.get('type') == 'learner_tui_session' and x.get('pane') == tui['pane'] and x.get('session') == tui['session'] and x.get('rollout') == tui['rollout']]) == 1
native = [json.loads(x) for x in Path(next(x for x in d['five_native_originals'] if x['kind'] == 'rollout')['path']).read_bytes().splitlines()]
context = [x['payload'] for x in native if x.get('type') == 'turn_context' and x['payload'].get('turn_id') == tui['turn']][-1]
assert context['model'] == 'gpt-6.1-sol' and context['effort'] == 'high'
assert [x for x in native if x.get('type') == 'event_msg' and x['payload'].get('type') == 'task_complete' and x['payload'].get('turn_id') == tui['turn']]
assert not Path('/proc/132294').exists() and not Path('/proc/130560').exists()
shell = Path('/proc/130501')
assert shell.exists() and (shell / 'stat').read_text().split(') ', 1)[1].split()[19] == '33154593'
tabs = json.loads(subprocess.check_output(['herdr', 'tab', 'list', '--workspace', 'w1H'], env={**os.environ, 'HERDR_ENV': '1'}))['result']['tabs']
tab = next(x for x in tabs if x['tab_id'] == 'w1H:tFG')
assert tab['label'] == b['identity_and_empty_shell_without_jobs']['tab_label']
for name, expected in [('learner_tabs.py', b['actual_source']['tabs']), ('learner_tui.py', b['actual_source']['tui'])]:
    assert sha((R / 'ops' / name).read_bytes()) == expected
spec = importlib.util.spec_from_file_location('readonly_tabs134331', R / 'ops/learner_tabs.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
try:
    module.native_evidence(R, R / 'ops/codex-ops', tui)
except ValueError as error:
    assert str(error) == b['new_error']
    rejection = str(error)
else:
    raise AssertionError('Expected original production binding rejection')
status = json.loads((R / '.artifacts/ops-fix134331-20261025/originals/full-test-status.json').read_text())
assert status['exit_code'] == 130 and status['final_summary_available'] is False
assert len(status['observed_file_results']) == 13 and sum(x['failed'] for x in status['observed_file_results']) == 59
for name, expected in [('final-tsc.rc', 0), ('both-fixed.rc', 0), ('both-without-fix.rc', 1)]:
    assert int((R / '.artifacts/ops-fix134331-20261025/originals' / name).read_text()) == expected
assert not (R / ('ops/codex-ops/learner/learner-' + d['batch'] + '.tab-retirement.json')).exists()
result = dict(at=datetime.datetime.now().astimezone().isoformat(), ops_receipts=[6394313064, 6394313303], batch=d['batch'], readonly=True, head=d['original_HEAD'], patch_sha256=sha(patch.read_bytes()), originals=originals, main_live_before_and_readonly_apply_checks=checks, original_failed_rc0_unchanged=True, original_native_sol_high_task_complete_verified=True, launch_count=1, original_tui_session_matches=1, original_launch_batch_field_absent=True, native_evidence_rejection=rejection, actual_tab_preserved=tab, native_and_supervisor_absent=True, original_shell_identity_preserved=True, seal_apply_reclaim_close=0, code_commit_or_merge=0, full_started=0, queue='Exact four-leaf host final combination checks after original64 priority window; source-owner narrow fix-binding rework separately via lead-supported original63 restoration.', limitations=['Original full130/13files59fail/no final denominator preserved; only run-config candidate then, not final two-candidate full.', 'Only separately evidenced listen EPERM is attributed to sandbox; remaining causes not inferred.', 'Current shell existence and identity checked; empty input/no jobs uses retained ops fresh audit, no control command sent.', 'Original three #63 samples remain accepted; new fix-batch schema gap does not authorize bypass.', 'No old launch/receipt mutation, producer success rewrite, candidate publication or new model.'])
(M / 'independent-readback.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k:v for k,v in result.items() if k != 'originals'}, ensure_ascii=False))
