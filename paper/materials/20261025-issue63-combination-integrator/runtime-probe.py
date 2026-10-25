"""Read original issue63 retirement evidence without invoking control APIs."""
from pathlib import Path
import subprocess, json, hashlib, os

R = Path('/home/dw/Projects/agent-sts2')
M = R / 'paper/materials/20261025-issue63-combination-integrator'
O = R / 'paper/materials/20261025-issue63-runtime-ops'
D = R / '.artifacts/ops-issue59-63-release-20261025/sessions/63'
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads(p.read_text())

def git(*args):
    return subprocess.check_output(['git', *args], cwd=R)

def herdr(*args):
    result = subprocess.run(['herdr', *args], env={**os.environ, 'HERDR_ENV': '1'},
                            capture_output=True, check=True)
    return json.loads(result.stdout)['result']['tabs']

def native_summary(raw, session, turn):
    records = [json.loads(line) for line in raw.splitlines() if line]
    meta = [x['payload'] for x in records if x.get('type') == 'session_meta']
    assert meta and meta[0]['id'] == session
    contexts = [x['payload'] for x in records if x.get('type') == 'turn_context'
                and x['payload'].get('turn_id') == turn]
    assert contexts and contexts[-1]['model'] == 'gpt-6.1-sol'
    assert contexts[-1]['effort'] == 'high'
    terminal = [x for x in records if x.get('type') == 'event_msg'
                and x.get('payload', {}).get('type') in ('task_complete', 'turn_aborted')]
    assert terminal and terminal[-1]['payload']['type'] == 'task_complete'
    assert terminal[-1]['payload']['turn_id'] == turn
    return dict(session=session, turn=turn, model=contexts[-1]['model'],
                effort=contexts[-1]['effort'], terminal=terminal[-1]['payload']['type'],
                ended=terminal[-1]['timestamp'])

prep = read(O / 'prepared-closure-and-originals.json')
actual = read(O / 'actual-original-retirement.json')
results = {x['batch']: x for x in actual['results']}
tabs = {w: herdr('tab', 'list', '--workspace', w) for w in ('w1H', 'wJ')}
learn = read(R / 'ops/codex-ops/learn.json')
journal = read(R / 'ops/codex-ops/learner-tabs.json')
host = read(R / 'ops/codex-ops/herdr.json')
production = []
for x in prep['paired_old_backup_and_admitted_new_files']:
    path = Path(x['actual_path'])
    content = path.read_bytes()
    assert sha(content) == x['new_sha256']
    assert content == git('show', 'a94f8244ae71f5838ecdc506bbf2d94176938904:' + str(path.relative_to(R)))
    assert sha((R / x['backup']).read_bytes()) == x['old_sha256']
    production.append(dict(path=str(path.relative_to(R)), sha256=sha(content), old_backup_verified=True))
assert 'path = safe_path(root, root / "ops/learner_tui.py")' in (R / 'ops/learner_tabs.py').read_text()
samples = []
for original in prep['original_samples']:
    batch = original['batch']
    result = results[batch]
    seal_path = R / result['seal_path']
    raw_seal = seal_path.read_bytes()
    seal = json.loads(raw_seal)
    assert sha(raw_seal) == result['seal_sha256']
    assert seal['batch'] == batch and seal['authority'] == 'ops-recovery'
    assert seal['identity'] == result['identity']
    assert seal['native_pid'] == original['native_pid'] and seal['native_birth'] == original['native_birth']
    row = learn['batches'][batch]
    canonical = json.dumps(row, sort_keys=True, separators=(',', ':')).encode()
    assert sha(canonical) == original['original_batch_row_sha256']
    assert Path(row['worktree']).is_dir()
    originals = []
    for item in original['original_files']:
        source = Path(item['original_path']).read_bytes()
        retained = (R / item['retained_copy']).read_bytes()
        assert len(source) == item['bytes'] and source == retained and sha(source) == item['sha256']
        assert seal['files'][item['kind']]['sha256'] == item['sha256']
        originals.append(dict(kind=item['kind'], path=item['original_path'], bytes=len(source), sha256=sha(source)))
        if item['kind'] == 'rollout':
            native = native_summary(source, original['native_session'], original['native_turn'])
    evidence = seal['recovery']['evidence']
    assert sha((R / evidence['path']).read_bytes()) == evidence['sha256']
    event = journal['events'][batch]
    assert event['phase'] == 'done' and event['state'] == 'reclaimed'
    assert event['tab'] == seal['identity']['tab_id'] and event['pane'] == original['pane']
    tail = (R / event['tail']).read_bytes()
    assert sha(tail) in event['tail']
    assert all(t['tab_id'] != event['tab'] for t in tabs[seal['identity']['workspace_id']])
    assert original['pane'] not in json.dumps(host['panes']) and batch not in json.dumps(host['panes'])
    pids = [original['native_pid'], original['supervisor_pid'], seal['identity']['shell_pid']]
    assert all(not Path(f'/proc/{pid}').exists() for pid in pids)
    samples.append(dict(batch=batch, seal_path=str(seal_path.relative_to(R)), seal_sha256=sha(raw_seal),
                        authority=seal['authority'], journal=event, tab_absent=True,
                        original_pids_absent=pids, business_row_sha256=sha(canonical),
                        original_files=originals, native=native, worktree_retained=True))

dev = read(O / 'issue63-developer-release.json')
pre = read(D / 'pre-release.json')
released = read(D / 'release-state.json')
registry = read(R / 'ops/codex-ops/issue-sessions.json')['sessions']
row = registry['63']
assert row['state'] == 'waiting-worktree'
assert row['engineering_release']['native_session'] == dev['original_native']['session']
assert read(D / 'stop-control.json')['type'] == read(D / 'tab-close-control.json')['type'] == 'ok'
assert released['phase'] == 'released-native-and-tab-retained-worktree-runtime-open'
assert all(t['tab_id'] != dev['exact_original_tab'] for t in tabs['wJ'])
assert all(not Path(f'/proc/{pid}').exists() for pid in dev['all_original_idle_PIDs_absent'])
wt = Path(pre['worktree'])
assert wt.is_dir()
assert git('-C', str(wt), 'rev-parse', 'HEAD').decode().strip() == dev['developer_source']
assert git('rev-parse', 'refs/heads/' + pre['branch']).decode().strip() == dev['developer_source']
raw_native = Path(dev['original_native']['path']).read_bytes()
prefix = raw_native[:dev['native_original_retained_bytes']]
assert sha(prefix) == dev['native_original_retained_sha256']
native = native_summary(prefix, dev['original_native']['session'], dev['original_native']['turn'])
assert pre['composer'] == 'empty' and not pre['queued_inputs'] and not pre['extra_worktree_commands']
assert not pre['index_lock'] and not pre['untracked']
assert (D / 'tracked-delta.patch').read_bytes() == b''
assert Path(pre['native']['codex_home']).resolve() == Path('/home/dw/.codex1')
restore = R / dev['restore']
assert restore.is_file()
tail = D / 'terminal-tail.log'
assert tail.is_file() and tail.stat().st_size > 0
first = read(D / 'first-registry-lock-busy-release-state.json')
continuation = read(O / 'developer-prestop-continuation.json')
assert continuation['original_native_birth_and_registration_unchanged'] and continuation['stop_or_close_receipts_absent']
named_developers = [t for group in tabs.values() for t in group if t.get('label', '').startswith('issue-')]
assert len(named_developers) == dev['actual_developer_sessions'] == 1
assert git('-C', '.worktrees/live', 'rev-parse', 'HEAD').decode().strip() == 'e9a468882a4fe1da2b1b721f0271b82f6083b002'
evidence_files = {str(p.relative_to(R)): sha(p.read_bytes()) for p in O.iterdir() if p.is_file()}
result = dict(at=subprocess.check_output(['date', '-Is'], text=True).strip(),
              source_comment=6394210629, production_pair=production, original_samples=samples,
              developer=dict(original_native=native, original_native_prefix_sha256=sha(prefix),
                             original_native_bytes=len(prefix), registry_state=row['state'],
                             original_pids_absent=dev['all_original_idle_PIDs_absent'], tab_absent=True,
                             worktree=str(wt), branch=pre['branch'], head=dev['developer_source'],
                             restore=str(restore.relative_to(R)), restore_sha256=sha(restore.read_bytes()),
                             retained_terminal_tail_sha256=sha(tail.read_bytes()),
                             prestop_first_failure=first, continuation=continuation),
              actual_named_developer_sessions=len(named_developers), ops_material_sha256=evidence_files,
              live_head='e9a468882a4fe1da2b1b721f0271b82f6083b002', control_or_replay_actions=0,
              scientific_parent_closed=False,
              limits=['Historical pre-stop empty input and command state use retained original audit; stopped UIs are not reopened.',
                      'No new full check; original first-targeted failure and pre-62 freeze applicability remain.'])
(M / 'runtime-independent-readback.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(dict(at=result['at'], original_samples=len(samples), actual_named_developer_sessions=len(named_developers),
                      developer_tab_absent=True, all_original_processes_absent=True, replay_actions=0)))
