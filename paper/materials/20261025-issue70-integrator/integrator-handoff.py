from pathlib import Path
import hashlib, json, subprocess

R = Path('/home/dw/Projects/agent-sts2')
A = Path(__file__).resolve().parent
M = R / 'paper/materials/20261025-issue70-integrator'
sha = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *args: subprocess.check_output(['git', *args], cwd=R)
i = json.loads((M / 'main-integration.json').read_text())
p = json.loads((M / 'main-push-readback.json').read_text())
t = json.loads((M / 'terminal-readback.json').read_text())
v = json.loads((M / 'actual-live-consumer-state.json').read_text())
d = json.loads((M / 'actual-live-consumer-inputs.json').read_text())
assert t['accepted'] and v['phase'] == 'passed' and v['check_lock_released']
assert json.loads((M / 'actual-live-terminal-readback.json').read_text())['accepted']
assert p['remote_main'] == i['commit'] and p['source_commit_pushed']
assert git('rev-parse', 'HEAD').decode().strip() == i['commit']
assert git('-C', '.worktrees/live', 'rev-parse', 'HEAD').decode().strip() == d['actual_live']
before = {x['path']: x['before_sha256'] for x in d['overlay']}
rows = []
for n in i['root_runtime_leaves']:
    mode, _, blob, _ = git('ls-tree', i['commit'], '--', n).decode().split()
    b = git('show', i['commit'] + ':' + n)
    assert (R / n).read_bytes() == b
    live = R / '.worktrees/live' / n
    assert (sha(live.read_bytes()) if live.is_file() else None) == before[n]
    rows.append(dict(path=n, mode=mode, blob=blob, sha256=sha(b), bytes=len(b),
                     actual_root_verified=True, live_before_sha256=before[n],
                     new_file_in_live=not live.exists()))
assert len(rows) == 9 and sum(x['new_file_in_live'] for x in rows) == 1
out = dict(at=subprocess.check_output(['date', '-Is'], text=True).strip(),
           issue=70, state='engineering accepted; exact main pushed; ROOT9 verified; LIVE deployment and next ordinary question pending',
           developer='39c9b14c7eacdc58242b5c51eba79f7341564094', main=i['commit'],
           candidate=i['candidate'], checked_live_baseline=d['actual_live'],
           root_runtime_files=rows, live_source_files=rows, actual_live_writes=0,
           runtime_owner='original ops', release_id=None,
           full=dict(files=t['files'], passed=t['passed'], failed=t['failed'], skipped=t['skipped'],
                     result_sha256=t['result_sha256'], worker_absent=t['worker_absent'], lock_available=t['lock_available'], new_full_runs=1),
           live_consumer=dict(files=v['files'], passed=v['passed'], failed=v['failed'], skipped=v['skipped'],
                              tsc_rc=v['tsc_rc'], targeted_rc=v['targeted_rc'], check_lock_released=True, actual_live_source_unchanged=True),
           fixture_history='live-preflight-attempt1/2 preserve omitted LIVE imports and ESM-boundary failures; live-targeted-attempt1 preserves 144 pass/33 fail caused by omitted knowledge data; live-targeted-attempt2 preserves an unintended unchanged-input repeat after the copy script stopped. Added three actual LIVE import/module files and 469 actual LIVE knowledge data files to the isolated frozen fixture; final 11 files/177 pass/0 fail/0 skip; no product changes or full reruns',
           deployment_contract=[
               'Use the original admitted publication transaction and natural boundary; preserve the running game, learner, original FIFO and unknown global gates.',
               'Back up the actual LIVE nine preimages, including absence of new agent/src/brain/evidence.ts; verify modes, blobs and SHA. Install all nine exact production leaves from main; keep unrelated LIVE simulation changes and live knowledge refresh.',
               'Under original live-merge lock verify the actual installed commit and assign the release_id in eval/versions.json; append decision-log and dual-box old/new rule, evidence, expected impact and rollback notification after actual deployment.',
               'Keep total budget, retry cap, same engine, model/account/effort, strict initial plan, valid plan reuse, game knowledge and decision values unchanged. Brain web remains disabled. New natural brain start effort follows current AGENTS with actual native receipt.',
               'Verify the next ordinary production question: identity/version, attempts and actual native receipt or explicit unknown, tool input/output or pending, query-to-answer continuity, plan/action and time, cancellation stages and bounded cleanup. Late evidence stays append-only.',
               'Native tool completion proves local bridge return only; actual retrieval IDs, plan adoption and performance are separate. Backend latency/blank generation root cause remains unknown; later ops 429 is separate.',
               'No new model/game probe, full rerun, 68 shadow/active gate, learner dispatch, forced tick, authority or account switch.',
               'Rollback through the original publication transaction using the saved nine actual LIVE preimages and preserved new-file absence; retain release/decision/evidence history.'
           ], science_parent_close=False, dev_tree_and_native_logs_retained=True)
(M / 'deployment-handoff.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: val for k, val in out.items() if k not in ['root_runtime_files', 'live_source_files', 'deployment_contract']}, ensure_ascii=False))
