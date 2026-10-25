from pathlib import Path
import datetime as dt
import hashlib
import json
import os
import subprocess
import sys

R = Path('/home/dw/Projects/agent-sts2')
M = Path(__file__).resolve().parent
A = R / '.artifacts/integrator36-recovery-20261025-0759'
H = lambda b: hashlib.sha256(b).hexdigest()


def run(*args):
    return subprocess.check_output(args, cwd=R, timeout=40)


def load(p):
    return json.loads(Path(p).read_bytes())


def save(name, value):
    (M / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def proof(p, b=None, offset=None):
    p = Path(p)
    b = p.read_bytes() if b is None else b
    value = dict(path=str(p.relative_to(R)), bytes=len(b), sha256=H(b))
    if offset is not None:
        value['offset'] = offset
    return value


def birth(pid):
    try:
        fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
        return None if fields[0] in ('Z', 'X') else fields[19]
    except FileNotFoundError:
        return None


at = run('date', '-Is').decode().strip()
head = run('git', 'rev-parse', 'HEAD').decode().strip()
sys.path.insert(0, str(R / 'ops'))
import learner_tui
import issue_session

# Reuse only the read-only native window scanner from the earlier audit.
scanner = (R / 'paper/materials/20261024-issue36-resume-2327-integrator/audit-program.py').read_text()
exec(scanner[scanner.index('def native(j):'):scanner.index('finished=[];active=[]')])

state = load(R / 'ops/codex-ops/learn.json')
prior = load(R / 'paper/materials/20261025-issue36-dialog-integrator/dialog-and-recovery-readback.json')
old = {row['batch_key']: row for row in prior['rows']}
held_prior = load(R / 'paper/materials/20261025-issue36-natural-hold-integrator/natural-hold-readback.json')['held']
old_deferrals = {row['batch'].removesuffix('-postmortem'): row for row in held_prior}
retirement = load(R / 'ops/codex-ops/learner-tabs.json')
rows = []
screens = []
keys = list(old) + ['20261025-071302']
for key in keys:
    batch = state['batches'][key]
    label = 'learner-' + key + ('-postmortem' if batch.get('task', 'postmortem') == 'postmortem' else '')
    path = R / 'ops/codex-ops/learner' / (label + '.tui.json')
    raw = path.read_bytes()
    j = json.loads(raw)
    learner_tui.verify_native(j)
    n = native(j)
    assert len(n['terminal']) == 1
    assert n['terminal'][0]['message_sha256'] == H(j['result']['message'].encode())
    pane = json.loads(run('herdr', 'pane', 'get', j['pane']))['result']['pane']
    assert all(pane.get(k) == j['identity'][k] for k in ('pane_id', 'tab_id', 'terminal_id', 'workspace_id'))
    agent_query = subprocess.run(['herdr', 'agent', 'get', j['pane']], cwd=R, capture_output=True, timeout=40)
    if agent_query.returncode:
        missing = json.loads(agent_query.stderr or agent_query.stdout)
        assert key == '20261025-021310' and missing['error']['code'] == 'agent_not_found'
        agent = dict(agent=None, agent_status='not-found-after-native-exit')
    else:
        agent = json.loads(agent_query.stdout)['result']['agent']
    process = json.loads(run('herdr', 'pane', 'process-info', '--pane', j['pane']))['result']['process_info']
    if key == '20261025-021310':
        assert process['foreground_process_group_id'] == process['shell_pid'] and birth(j['pid']) is None
    else:
        assert birth(j['pid']) == j['birth'] and process['foreground_process_group_id'] == j['pid']
        assert agent['name'] == j['agent_name'] and agent['foreground_cwd'] == j['cwd'] and agent['agent_status'] == 'done'
    screen = run('herdr', 'pane', 'read', j['pane'], '--source', 'visible', '--format', 'ansi')
    (A / (key + '-visible.ansi')).write_bytes(screen)
    screens.append(screen)
    seals = [R / 'ops/codex-ops/learner' / (name + '.tab-retirement.json') for name in (label, key)]
    matching_events = {k: v for k, v in retirement.get('events', {}).items() if key in k or key in json.dumps(v)}
    selected = {k: batch.get(k) for k in ('state', 'rc', 'finished', 'pid', 'pane', 'task', 'review_required', 'verification_deferred', 'tui_recovery')}
    row = dict(batch=key, receipt=proof(path, raw), native=n, native_file=proof(Path(j['rollout'])), native_reconstruction_verified=True,
               session=j['session'], turn=j['turn'], pid=j['pid'], birth=j['birth'], current_birth=birth(j['pid']),
               current_supervisor_birth=birth(batch['pid']), result={k: j['result'].get(k) for k in ('code', 'reason', 'failure_reason', 'stopped')},
               state=j['state'], retirement_authorized=j['retirement_authorized'], batch_record=selected,
               pane={k: pane.get(k) for k in ('pane_id', 'tab_id', 'terminal_id', 'workspace_id', 'label')},
               agent={k: agent.get(k) for k in ('agent', 'agent_status', 'name', 'foreground_cwd')},
               process={k: process.get(k) for k in ('foreground_process_group_id', 'shell_pid')},
               foreground=[{k: p.get(k) for k in ('pid', 'name', 'cwd')} for p in process.get('foreground_processes', [])],
               screen_sha256=H(screen), composer=issue_session.composer_state(screen.decode()),
               quota_modal_visible=b'Keep current model' in screen,
               queued_followup_visible=b'Queued follow-up inputs' in screen,
               seal_files=[dict(path=str(p.relative_to(R)), exists=p.exists()) for p in seals], retirement_events=matching_events)
    assert not any(p.exists() for p in seals) and not matching_events
    if key != '20261025-021310':
        assert learner_tui.verification_blocked(path, 75)
        assert batch['state'] == 'awaiting_review' and batch.get('rc') is None and batch.get('finished') is None
        assert not batch.get('tui_recovery') and not j.get('wrapper') and j['retirement_authorized'] is False
        deferred = Path(batch['verification_deferred'])
        row['deferral'] = proof(deferred)
        defer_record = load(deferred)
        assert defer_record['batch'] == key and defer_record['supervisor']['pid'] == batch['pid']
        assert all(batch.get(k) == defer_record['registration'].get(k) for k in learner_tui.REGISTRATION_FIELDS)
        assert all(defer_record[k] is False for k in ('finish_authorized', 'retirement_authorized', 'automatic_replay_authorized'))
        row['deferral_authorizations'] = {k: defer_record[k] for k in ('finish_authorized', 'retirement_authorized', 'automatic_replay_authorized')}
        assert birth(batch['pid']) is None
        if key in old:
            row['receipt_unchanged_since_0600'] = H(raw) == old[key]['receipt']['sha256']
            row['deferral_unchanged_since_0400'] = H(deferred.read_bytes()) == old_deferrals[key]['deferral']['sha256']
            assert row['receipt_unchanged_since_0600'] and row['deferral_unchanged_since_0400']
    rows.append(row)

scan = subprocess.run(['gitleaks', 'stdin', '--redact', '--no-banner'], input=b'\n'.join(screens), capture_output=True, env={**os.environ, 'GOMAXPROCS': '1'})
(A / 'screens-scan.log').write_bytes(scan.stdout + scan.stderr)
assert scan.returncode == 0
save('native-and-pane-readback.json', dict(at=at, rows=rows, screens_gitleaks_rc=0, control_or_recovery_executed=False))

key = '20261025-021310'
record = state['batches'][key]
canonical = R / f'ops/codex-ops/learner/learner-{key}-postmortem.tui.json'
j = load(canonical)
archive = Path(j['recovery']['archive'])
journal = load(archive / 'recovery.json')
original = load(archive / 'original.tui.json')
original_registration = load(archive / 'original.registration.json')
guard = load(record['tui_recovery']['liveness_guard'])
learner_tui.verify_native(original)
assert H((archive / 'original.tui.json').read_bytes()) == journal['origin_sha256'] == old[key]['receipt']['sha256']
assert H((archive / 'original.out').read_bytes()) == journal['original_output_sha256']
assert H((archive / 'native.jsonl').read_bytes()) == H(Path(original['rollout']).read_bytes()) == journal['native_sha256']
assert j['recovery']['origin_result'] == original['result']
assert all(j.get(k) == original.get(k) for k in ('pid', 'birth', 'identity', 'session', 'turn', 'rollout', 'bindings', 'submissions', 'input_hold'))
assert journal['phase'] == 'finished' and record['state'] == 'done' and record['rc'] == 0 and record['finished']
wrapper = j['wrapper']
assert wrapper['batch_sha256'] == H(json.dumps(record, sort_keys=True, separators=(',', ':')).encode())
assert wrapper['supervisor'] == journal['supervisor'] == j['recovery']['supervisor']
assert wrapper['state'] == record['state'] and wrapper['rc'] == wrapper['launcher_rc'] == j['result']['code'] == 0
assert wrapper['finished'] == record['finished']
assert j['state'] == 'session-ended' and j['retirement_authorized'] is True and j['result']['stopped'] is True
assert birth(j['pid']) is None and birth(wrapper['supervisor']['pid']) is None
out = Path(j['output']['path']).read_bytes()
assert H(out) == j['output']['sha256']
assert out == (archive / 'original.out').read_bytes() + ('\n' + j['result']['message'] + '\n').encode()
assert H(Path(j['artifacts']['log']).read_bytes()) == j['artifacts']['sha256']
events = [json.loads(line) for line in Path(j['artifacts']['log']).read_text().splitlines()]
assert events[0]['origin_sha256'] == journal['origin_sha256'] and events[0]['native_sha256'] == journal['native_sha256']
assert events[1]['type'] == 'learner_summary' and events[1]['exit_code'] == 0 and events[1]['summary']['sessionId'] == j['session']
guard_matches = (record.get('state') == 'running' and record.get('pid') == guard.get('supervisor', {}).get('pid')
                 and all(record.get(k) == guard['registration'].get(k) for k in learner_tui.REGISTRATION_FIELDS))
assert guard_matches is False and guard['wait_for_owner_exit'] is True
assert not (archive / 'verification-deferred.json').exists()
assert not (R / f'ops/codex-ops/learner/{key}.wrapper-attention-recovery.json').exists()
save('recovery-terminal-readback.json', dict(at=at, canonical=proof(canonical), archive=[proof(p) for p in sorted(archive.iterdir()) if p.is_file()],
     original_registration_state=original_registration['state'], original_75_preserved=True, native_bytes_unchanged=True,
     old_output_preserved_as_prefix=True, wrapper_exact_batch_sha256=wrapper['batch_sha256'], wrapper=wrapper,
     recovery_journal=journal, guard=dict(file=proof(Path(record['tui_recovery']['liveness_guard'])), armed_at=guard['at'],
        captured_registration_state=guard['registration']['state'], wait_for_owner_exit=True, applies_to_current_row=guard_matches,
        current_row_state=record['state'], recovery_attention_exists=False, incorrect_archive_child_path_exists=False),
     source=proof(R / 'ops/learner_tui.py'), completion_verified=True, historical_ops_apply_admission=proof(R / 'paper/materials/20261025-issue36-ops/ops-response.md'),
     historical_apply_authorization_or_fresh_precontrol_sampling_retroactively_proven=False, seal_or_reclaim_authorized=False))
save('021310-registration-readback.json', record)

new = load(R / 'ops/codex-ops/learner/learner-20261025-071302-postmortem.tui.json')
log = Path(new['artifacts']['log'])
holds, resumes, summaries = [], [], []
offset = 0
for line in log.read_bytes().splitlines(keepends=True):
    ev = json.loads(line)
    window = proof(log, line, offset)
    offset += len(line)
    if ev.get('type') == 'learner_tui_input_hold':
        holds.append(dict(window=window, event=ev))
    elif ev.get('type') == 'learner_tui_input_resumed':
        resumes.append(dict(window=window, event=ev))
    elif ev.get('type') == 'learner_summary':
        summaries.append(dict(window=window, ts=ev['ts'], exit_code=ev['exit_code'], session=ev['summary']['sessionId']))
assert len(holds) == len(summaries) == 1 and not resumes
hold = new['input_hold']
assert all(hold[k] == holds[0]['event'][k] for k in ('since_ms', 'deadline_ms', 'screen_sha256'))
assert hold['deadline_ms'] - hold['since_ms'] == 120000
assert int(dt.datetime.fromisoformat(summaries[0]['ts'].replace('Z', '+00:00')).timestamp() * 1000) >= hold['deadline_ms']
save('071302-natural-hold.json', dict(at=at, receipt=proof(R / 'ops/codex-ops/learner/learner-20261025-071302-postmortem.tui.json'),
     log=proof(log), holds=holds, resumes=resumes, summaries=summaries, bound_ms=120000, deadline_elapsed=True,
     ops_source=proof(R / 'paper/materials/20261025-learner-071302-ops/attention-check.md'),
     current_quota_modal_is_not_historical_hold_screen_proof=True, human_draft_authorship_proven=False, injected_input=False))

previous = load(R / 'paper/materials/20261025-issue36-dialog-integrator/full-coverage.json')
coverage = []
for row in previous['rows']:
    p = row['path']
    actual, committed = H((R / p).read_bytes()), H(run('git', 'show', head + ':' + p))
    assert actual == committed == row['full_input_sha256']
    coverage.append(dict(path=p, current_sha256=actual, head_sha256=committed, full_input_sha256=row['full_input_sha256']))
assert H((R / previous['full_result']['path']).read_bytes()) == previous['full_result']['sha256']
save('full-coverage.json', dict(at=at, head=head, rows=coverage, suites=previous['suites'], full_result=previous['full_result'],
     all_17_exact=True, new_full_runs=0, entire_current_main_or_live_verified=False))
data_path = R / 'paper/data/verification.json'
data = load(data_path)
report_root = R / 'learner/runs/20261025-021346-adc84f6c-d991-4f2c-8eb5-ee01d934785f-postmortem'
save('science-output-boundary.json', dict(at=at, original_report_files=[proof(report_root / name) for name in
    ('report.md', 'whole-run-summary.json', 'playbook-rk-candidates.json')],
    dataset_verification=proof(data_path), current_dataset_checks=data,
    scope='Read existing output and dataset verification only; no dataset rebuild, new game evidence, publication, consumer adoption or benefit validation.'))
current_state = load(R / 'ops/codex-ops/learn.json')
for row in rows:
    key = row['batch']
    assert current_state['batches'][key] == state['batches'][key]
    assert H((R / row['receipt']['path']).read_bytes()) == row['receipt']['sha256']
    assert H((R / row['native_file']['path']).read_bytes()) == row['native_file']['sha256']
    if 'deferral' in row:
        assert H((R / row['deferral']['path']).read_bytes()) == row['deferral']['sha256']
print(json.dumps(dict(at=at, head=head, recovery_completion_verified=True, guard_applies=False, panes=len(rows),
     four_unchanged_75=True, new_hold_ms=120000, new_branch_rc=75, full_leaves=len(coverage), new_full_runs=0)))
