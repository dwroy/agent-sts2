from pathlib import Path
import hashlib
import json
import subprocess
import sys

r = Path.cwd()
p = r / 'ops/codex-ops/record-staging/20261017-2120'
pub = r / 'paper/materials/20261017-2120-ops'
sys.path.insert(0, str(r / 'ops'))
import learner_check_continuation as c
sha = lambda raw: hashlib.sha256(raw).hexdigest()
def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def git(*args):
    return subprocess.check_output(['git', '-C', str(r / '.worktrees/live'), *args], stderr=subprocess.PIPE)

bid = '20261017-170116-fix-batch'
state = json.loads((r / 'ops/codex-ops/learn.json').read_bytes())['batches'][bid]
original = next(x for x in state['fallback_checks'] if x['tree'] == 'a63667ac37f20963d17dd34c52e7967bfd1c59de')
assert original['rc'] == 1 and not state['checks_pending']
raw = Path(original['log']).read_bytes()
coverage = c.coverage(raw)
assert coverage['failed'] == ['tests/build-decider.test.ts', 'tests/journal-replay.test.ts']
assert coverage['summary']['tests'] == dict(failed=2, passed=5215, skipped=2)
assert raw.decode().count('Error\x1b[22m: Test timed out in 15000ms.') == 2 or raw.decode().count('Test timed out in 15000ms.') == 2
live = dict(commit=git('rev-parse', 'HEAD').decode().strip(), tree=git('rev-parse', 'HEAD^{tree}').decode().strip())
assert live['commit'] == original['merged'] and live['tree'] == original['tree']
previous = '3d691cff96dedd19855b00f4e9d448c43fe1d219'
unchanged = ['agent/tests/build-decider.test.ts', 'agent/tests/journal-replay.test.ts', 'agent/src/hand/loop.ts']
for path in unchanged:
    assert git('show', previous + ':' + path) == git('show', live['commit'] + ':' + path)
changed = git('diff', '--name-only', previous, live['commit'], '--', 'agent').decode().splitlines()
assert changed == []
registration = json.loads((r/'paper/materials/20261017-2059-ops/registration.json').read_bytes())
assert set(git('diff', '--name-only', previous, live['commit']).decode().splitlines()) == {'eval/versions.json'} | {x['path'] for x in registration['refreshed_files']}
for item in registration['refreshed_files']:
    assert sha(git('show', live['commit']+':'+item['path'])) == item['sha256']
at = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(pub / 'original-a63667-host-full.log').write_bytes(raw)
decision = dict(at=at, batch=bid, original_full=original, original_coverage=coverage,
    original_log_sha256=sha(raw), tsc=0, vitest=1, files=531, passed_files=529,
    passed_tests=5215, failed_tests=2, skipped_tests=2, duration_seconds=921.30,
    actual_failed_tests=coverage['failed_tests'],
    observed='Both original fixed tests exceeded their unchanged 15000ms timeout. Previous24be loop assertion passed this time. The entire agent tree is unchanged from24be and the final tree additionally contains10 already-existing knowledge refreshes saved before version metadata registration; all10 SHA match the original registration receipt. No host-load causality or calibration regression is established.',
    disposition='Retain V5-R388 while supplementing only these two original timed-out exact cases with original assertions/timeouts, single worker, original batch and pinneda63667 tree. Keep both full1 results and previous24be selected0; do not repeat full or call selected0 full0.',
    unchanged_test_and_loop_paths=unchanged, changed_agent_paths=changed,
    preserved_existing_knowledge_refreshes=registration['refreshed_files'],
    earlier_2059_text_correction='Earlier root shorthand only version metadata omitted the preceding save of10 existing live knowledge refreshes e4930ae; original registration JSON already recorded them correctly. Preserve earlier text and append this correction, not a new product defect or newly computed knowledge.',
    official_number_and_main_sync='V5-R388 mapping and original narrow main integration remain complete; no additional numbering or source integration',
    ledger0506_shipped=False, six_target_quality_pass=False, f49_quality_pass=False,
    no_new_model_learner_or_game_restart=True)
write(pub / 'host-failure-disposition.json', decision)
manifest = dict(schema=1, batch=bid, task=state['task'], worktree=state['worktree'],
    original=dict(merged=original['merged'], tree=original['tree'], log_sha256=sha(raw), coverage=coverage),
    live=live, sources=list(dict.fromkeys(original['commits']+[live['commit']])),
    inputs=[dict(path='agent/'+name, source=live['commit']) for name in coverage['failed']],
    selection=[dict(file=name, tests=coverage['failed_tests'][name], reason='failed') for name in coverage['failed']],
    receipts=[dict(path=str((pub / 'host-failure-disposition.json').relative_to(r)),
                   sha256=sha((pub / 'host-failure-disposition.json').read_bytes()))])
data = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
digest = sha(data)
dest = r / f'ops/codex-ops/learner/{bid}.continuation-{digest}.json'
assert not dest.exists()
dest.write_bytes(data)
c.validate(bid, state, str(r), str(dest.parent), digest)
(p / 'supplement-manifest.json').write_bytes(data)
(pub / 'supplement-manifest.json').write_bytes(data)
(p / 'manifest-sha.txt').write_text(digest + '\n')
pending_path = r / f'ops/codex-ops/pending-integrations/{bid}.json'
pending = json.loads(pending_path.read_bytes())
pending.setdefault('preserved_supplements', []).append({key: pending.get(key) for key in ['supplement_manifest_sha256', 'supplement_requested', 'supplement_complete', 'supplement_rc', 'supplement_receipt', 'supplement_action_receipt']})
pending.update(status='V5-R388 a63667 full1 retained; only two original timed-out cases registered for selected supplement',
    host_complete=True, host_rc=1, host_terminal_receipt=str((pub / 'host-failure-disposition.json').relative_to(r)),
    supplement_manifest_sha256=digest, supplement_requested=False, supplement_complete=False, supplement_rc=None,
    ledger_shipped=False,
    next_step='On original a63667 supplement terminal event, preserve a63667 full1,24be full1/selected0 and new selected result independently. Resolve exact final-tree deployment disposition before0506 shipped. V5-R388/source sync stay complete; no new source full or learner/model/game restart.')
write(pending_path, pending)
write(pub / 'calibration-pending-readback.json', pending)
with (p / 'supplement-action.log').open('wb') as stream:
    process = subprocess.Popen(['nice', '-n', '19', 'bash', 'ops/codex-ops-do.sh', 'learner-recheck', bid + ':' + digest],
                               cwd=r, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
birth = Path(f'/proc/{process.pid}/stat').read_text().split(') ', 1)[1].split()[19]
write(pub / 'supplement-action-start.json', dict(at=at, batch=bid, manifest_sha256=digest,
    action='original allow-listed learner-recheck batch:manifest', request_process_pid=process.pid,
    birth_ticks=birth, actual_request_process_started=True, consumer_test_started_not_inferred=True,
    host_result=None, scope='only two original timed-out cases; both full1 results and previous24be selected0 retained',
    new_source_full=False, no_other_role_ACK=True))
pending.update(supplement_requested=True, supplement_action_receipt=str((pub / 'supplement-action-start.json').relative_to(r)))
write(pending_path, pending)
print(json.dumps(dict(original_full=1, selected_cases=sum(len(x['tests']) for x in manifest['selection']),
                      manifest=digest, request_pid=process.pid, host_result=None)), flush=True)
