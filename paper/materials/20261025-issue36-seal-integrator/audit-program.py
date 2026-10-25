"""Read-only continuation audit; writes only new local audit artifacts."""
from pathlib import Path
import datetime as dt
import hashlib
import json
import os
import subprocess
import sys

R = Path('/home/dw/Projects/agent-sts2')
M = Path(__file__).resolve().parent
A = R / '.artifacts/integrator36-seal-20261025-1044'
A.mkdir(parents=True, exist_ok=True)
sys.dont_write_bytecode = True
sys.path.insert(0, str(R / 'ops'))
import learner_tui
import issue_session

H = lambda b: hashlib.sha256(b).hexdigest()


def run(*args):
    return subprocess.check_output(args, cwd=R, timeout=45)


def load(p):
    return json.loads(Path(p).read_bytes())


def save(name, value):
    (M / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def proof(p, b=None, offset=None):
    p = Path(p)
    b = p.read_bytes() if b is None else b
    row = dict(path=str(p.relative_to(R)), bytes=len(b), sha256=H(b))
    if offset is not None:
        row['offset'] = offset
    return row


def birth(pid):
    try:
        parts = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
        return None if parts[0] in ('Z', 'X') else parts[19]
    except FileNotFoundError:
        return None


def query(*args):
    p = subprocess.run(['herdr', *args], cwd=R, capture_output=True, timeout=45)
    data = json.loads(p.stdout or p.stderr)
    return dict(rc=p.returncode, response=data)


scanner = (R / 'paper/materials/20261024-issue36-resume-2327-integrator/audit-program.py').read_text()
exec(scanner[scanner.index('def native(j):'):scanner.index('finished=[];active=[]')])
at = run('date', '-Is').decode().strip()
head = run('git', 'rev-parse', 'HEAD').decode().strip()
state = load(R / 'ops/codex-ops/learn.json')
journal_path = R / 'ops/codex-ops/learner-tabs.json'
journal = load(journal_path)
host = load(R / 'ops/codex-ops/herdr.json')
previous = load(R / 'paper/materials/20261025-issue36-recovery-terminal-integrator/native-and-pane-readback.json')
old = {row['batch']: row for row in previous['rows']}
held = [
    '20261025-024302-fix-batch',
    '20261025-024302-s2-strategy-proposal',
    '20261025-024302-strategy-proposal',
    '20261025-031302-strategy-proposal',
    '20261025-060422-strategy-proposal',
    '20261025-071302',
]
keys = ['20261025-021310', *held, '20261025-101312-strategy-proposal']
rows, screens, stable = [], [], []
for key in keys:
    batch = state['batches'][key]
    label = 'learner-' + key + ('-postmortem' if batch.get('task', 'postmortem') == 'postmortem' else '')
    receipt = R / 'ops/codex-ops/learner' / (label + '.tui.json')
    raw = receipt.read_bytes()
    j = json.loads(raw)
    learner_tui.verify_native(j)
    native_file = proof(Path(j['rollout']))
    n = native(j)
    assert len(n['terminal']) == 1
    assert n['terminal'][0]['message_sha256'] == H(j['result']['message'].encode())
    stable.extend([proof(receipt, raw), native_file])
    row = dict(batch=key, receipt=proof(receipt, raw), native_file=native_file,
               native=n, native_reconstruction_verified=True,
               session=j['session'], turn=j['turn'], pid=j['pid'], birth=j['birth'], current_birth=birth(j['pid']),
               supervisor_pid=batch['pid'], current_supervisor_birth=birth(batch['pid']),
               state=j['state'], result={k: j['result'].get(k) for k in ('code', 'reason', 'failure_reason', 'stopped')},
               retirement_authorized=j['retirement_authorized'],
               registration={k: batch.get(k) for k in ('state', 'rc', 'finished', 'pid', 'pane', 'task', 'worktree', 'verification_deferred')},
               matching_events={k: v for k, v in journal.get('events', {}).items() if key in k or key in json.dumps(v)})
    if key in old:
        row['receipt_unchanged_since_0802'] = H(raw) == old[key]['receipt']['sha256']
        assert row['receipt_unchanged_since_0802']
    if key in held:
        assert learner_tui.verification_blocked(receipt, 75)
        assert batch['state'] == 'awaiting_review' and batch.get('rc') is None and not batch.get('finished')
        assert row['current_supervisor_birth'] is None and row['current_birth'] == j['birth']
        assert j['retirement_authorized'] is False and not j.get('wrapper') and not batch.get('tui_recovery')
        defer = Path(batch['verification_deferred'])
        d = load(defer)
        row['deferral'] = proof(defer)
        stable.append(row['deferral'])
        assert all(d[k] is False for k in ('finish_authorized', 'retirement_authorized', 'automatic_replay_authorized'))
        assert all(batch.get(k) == d['registration'].get(k) for k in learner_tui.REGISTRATION_FIELDS)
        assert d['supervisor']['pid'] == batch['pid']
        if key in old:
            assert row['deferral']['sha256'] == old[key]['deferral']['sha256']
            row['deferral_unchanged_since_0802'] = True
        pane = query('pane', 'get', j['pane'])
        agent = query('agent', 'get', j['pane'])
        process = query('pane', 'process-info', '--pane', j['pane'])
        assert pane['rc'] == agent['rc'] == process['rc'] == 0
        p = pane['response']['result']['pane']
        a = agent['response']['result']['agent']
        pro = process['response']['result']['process_info']
        assert all(p[k] == j['identity'][k] for k in ('pane_id', 'tab_id', 'terminal_id', 'workspace_id'))
        assert a['name'] == j['agent_name'] and a['foreground_cwd'] == j['cwd'] and a['agent_status'] in ('done', 'idle'), (key, {k: a.get(k) for k in ('name', 'foreground_cwd', 'agent_status')}, j['agent_name'], j['cwd'])
        assert pro['foreground_process_group_id'] == j['pid']
        screen = run('herdr', 'pane', 'read', j['pane'], '--source', 'visible', '--format', 'ansi')
        (A / (key + '-visible.ansi')).write_bytes(screen)
        screens.append(screen)
        row.update(pane=p, agent={k: a.get(k) for k in ('name', 'foreground_cwd', 'agent_status')},
                   process={k: pro.get(k) for k in ('foreground_process_group_id', 'shell_pid')},
                   screen_sha256=H(screen), composer=issue_session.composer_state(screen.decode()),
                   quota_modal_visible=b'Keep current model' in screen,
                   queued_followup_visible=b'Queued follow-up inputs' in screen)
        row['seal_exists'] = (receipt.parent / (label + '.tab-retirement.json')).exists()
        assert not row['seal_exists'] and not row['matching_events']
        events = []
        offset = 0
        log = Path(j['artifacts']['log'])
        for line in log.read_bytes().splitlines(keepends=True):
            ev = json.loads(line)
            if ev.get('type') in ('learner_tui_input_hold', 'learner_tui_input_resumed', 'learner_summary'):
                fields = ('type', 'ts', 'since_ms', 'deadline_ms', 'screen_sha256', 'exit_code')
                events.append(dict(window=proof(log, line, offset), event={k: ev.get(k) for k in fields if k in ev}))
            offset += len(line)
        holds = [e for e in events if e['event']['type'] == 'learner_tui_input_hold']
        summaries = [e for e in events if e['event']['type'] == 'learner_summary']
        assert len(holds) == len(summaries) == 1
        assert not any(e['event']['type'] == 'learner_tui_input_resumed' for e in events)
        h, summary = holds[0]['event'], summaries[0]['event']
        assert h['deadline_ms'] - h['since_ms'] == 120000 and summary['exit_code'] == 75
        assert dt.datetime.fromisoformat(summary['ts'].replace('Z', '+00:00')).timestamp() * 1000 >= h['deadline_ms']
        row.update(log=proof(log), hold_events=events, bounded_wait_elapsed=True, human_draft_authorship_proven=False)
        stable.append(row['log'])
    elif key == '20261025-021310':
        seal_path = receipt.parent / (label + '.tab-retirement.json')
        seal = load(seal_path)
        assert seal['authority'] == 'ops-recovery' and seal['batch'] == key
        assert all(batch.get(k) == v for k, v in seal['binding'].items())
        assert all(proof(R / f['path'])['sha256'] == f['sha256'] for f in seal['files'].values())
        assert proof(R / seal['recovery']['evidence']['path'])['sha256'] == seal['recovery']['evidence']['sha256']
        assert proof(seal_path)['sha256'] == load(R / 'paper/materials/20261025-issue36-ops/ops-followup-0808.json')['021310']['seal_sha256']
        assert row['current_birth'] is None and row['current_supervisor_birth'] is None
        assert journal['events'][key]['phase'] == 'done' and journal['events'][key]['state'] == 'reclaimed'
        absent = query('tab', 'get', seal['identity']['tab_id'])
        assert absent['rc'] != 0 and absent['response']['error']['code'] == 'tab_not_found'
        assert label not in host['panes']
        archive = Path(j['recovery']['archive'])
        recovery = load(archive / 'recovery.json')
        assert recovery['phase'] == 'finished'
        assert proof(archive / 'original.tui.json')['sha256'] == recovery['origin_sha256'] == '130648492824e4dc20fcaa951d9b86679e188ed184ae9e44dcddd7b3994d3e70'
        assert j['wrapper']['batch_sha256'] == H(json.dumps(batch, sort_keys=True, separators=(',', ':')).encode())
        assert batch['state'] == 'done' and batch['rc'] == 0
        row.update(seal=seal, seal_proof=proof(seal_path), seal_files_verified=True,
                   actual_tab_absent=absent, host_label_absent=True,
                   retirement_tail=proof(R / journal['events'][key]['tail']),
                   recovery_journal=proof(archive / 'recovery.json'), original_75_preserved=True,
                   seal_and_tab_reclamation_verified=True, checkout_retention_or_scientific_parent_completed=False)
        stable.extend([proof(seal_path), *[proof(R / f['path']) for f in seal['files'].values()]])
    else:
        assert batch['state'] == 'done' and batch['rc'] == 0 and batch['finished']
        assert row['current_birth'] is None and row['current_supervisor_birth'] is None
        assert j['state'] == 'session-ended' and j['retirement_authorized'] and j['result']['stopped']
        assert j['wrapper']['batch_sha256'] == H(json.dumps(batch, sort_keys=True, separators=(',', ':')).encode())
        assert proof(Path(j['output']['path']))['sha256'] == j['output']['sha256']
        row.update(ordinary_completion_verified=True,
                   seal_exists=(receipt.parent / (label + '.tab-retirement.json')).exists(),
                   output=proof(Path(j['output']['path'])), wrapper=j['wrapper'])
    rows.append(row)

assert all(proof(R / p['path'])['sha256'] == p['sha256'] for p in stable)
fresh = load(R / 'ops/codex-ops/learn.json')
assert all(fresh['batches'][k] == state['batches'][k] for k in keys)
scan = subprocess.run(['gitleaks', 'stdin', '--redact', '--no-banner'], input=b'\n'.join(screens), capture_output=True, env={**os.environ, 'GOMAXPROCS': '1'})
(A / 'screens-gitleaks.log').write_bytes(scan.stdout + scan.stderr)
assert scan.returncode == 0
save('batch-readback.json', dict(at=at, finished_at=run('date', '-Is').decode().strip(), rows=rows,
    all_native_and_canonical_bytes_stable=True, selected_registrations_stable=True,
    screens_gitleaks_rc=0, actions_executed=False, models_started=0))

context_path = R / 'paper/materials/20261025-issue60-dual-root-integrator/full-context.json'
context = load(context_path)
inputs = {r['path']: r for r in context['inputs']}
prev = load(R / 'paper/materials/20261025-issue36-recovery-terminal-integrator/full-coverage.json')
coverage = []
for r in prev['rows']:
    p = r['path']
    actual = proof(R / p)
    committed = H(run('git', 'show', head + ':' + p))
    assert actual['sha256'] == committed == inputs[p]['sha256']
    coverage.append(dict(**actual, head_sha256=committed, full_input_sha256=inputs[p]['sha256']))
full_path = Path(context['result'])
full = load(full_path)
assert proof(full_path)['sha256'] == '37160e3d10cf64319982a4ea8b7caaedb8b83e6fe4e2149c1c3f03e41803ec01'
suites = [s for s in full['testResults'] if Path(s['name']).name in {Path(r['path']).name for r in prev['rows']}]
assert len(suites) == 8 and all(s['status'] == 'passed' for s in suites)
assert sum(len(s['assertionResults']) for s in suites) == 281
terminal_path = R / 'paper/materials/20261025-issue60-dual-root-integrator/full-terminal-verification.json'
terminal = load(terminal_path)
assert terminal['result_sha256'] == proof(full_path)['sha256']
assert terminal['tsc_rc'] == terminal['runtime_tsc_rc'] == 0
assert terminal['original_worker_exited'] and terminal['original_check_lock_available']
save('full-coverage.json', dict(at=at, head=head, rows=coverage, all_17_exact=True,
    context=proof(context_path), full_result=proof(full_path), terminal_verification=proof(terminal_path),
    suites=[dict(path=s['name'], status=s['status'], assertions=len(s['assertionResults'])) for s in suites],
    reused_result=dict(files=len(full['testResults']), passed=full['numPassedTests'], failed=full['numFailedTests'], skipped=full['numPendingTests']),
    tsc_rc=0, runtime_tsc_rc=0, new_full_runs=0, entire_current_main_or_live_verified=False))
print(json.dumps(dict(rows=len(rows), held=len(held), seal_and_tab_reclamation_verified=True, full_inputs=len(coverage), full_runs=0), ensure_ascii=False))
