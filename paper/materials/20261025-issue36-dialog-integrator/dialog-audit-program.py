from pathlib import Path
import hashlib, json, os, subprocess, sys

sys.dont_write_bytecode = True
R = Path('/home/dw/Projects/agent-sts2')
M = R / 'paper/materials/20261025-issue36-dialog-integrator'
A = R / '.artifacts/integrator36-dialog-20261025-0558'
H = lambda b: hashlib.sha256(b).hexdigest()
def run(*args):
    return subprocess.check_output(args, cwd=R)
def save(name, value):
    (M / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def proof(p, raw=None):
    raw = p.read_bytes() if raw is None else raw
    return dict(path=str(p.relative_to(R)), bytes=len(raw), sha256=H(raw))

assert os.environ.get('HERDR_ENV') == '1'
sys.path.insert(0, str(R / 'ops'))
from issue_session import composer_state
from learner_tui import recover_completed

at = run('date', '-Is').decode().strip()
prior = R / 'paper/materials/20261025-issue36-natural-hold-integrator'
past = json.loads((prior / 'natural-hold-readback.json').read_bytes())
past = {x['batch']: x for x in past['held']}
source = R / 'paper/materials/20261025-issue36-ops/dialog-resolution.json'
source_raw = source.read_bytes()
source_j = json.loads(source_raw)
assert source_j['source_comment'] == 6388880074
assert H((R / source_j['source_material']).read_bytes()) == source_j['source_sha256']
claims = {x['batch']: x for x in source_j['dialogs']}
current = json.loads((M / 'natural-hold-readback.json').read_bytes())
directory = R / 'ops/codex-ops'
state_path = directory / 'learn.json'
state = json.loads(state_path.read_bytes())
rows = []
for x in current['held']:
    batch = x['batch']
    original = past[batch]
    claim = claims[batch]
    p = R / x['receipt']['path']
    raw = p.read_bytes()
    j = json.loads(raw)
    native_path = Path(j['rollout'])
    native_raw = native_path.read_bytes()
    assert native_raw.endswith(b'\n')
    assert H(raw) == x['receipt']['sha256'] == original['receipt']['sha256']
    assert x['deferral']['sha256'] == original['deferral']['sha256']
    assert claim['pane'] == j['pane']
    agent = json.loads(run('herdr', 'agent', 'get', j['pane']))['result']['agent']
    proc = json.loads(run('herdr', 'pane', 'process-info', '--pane', j['pane']))['result']['process_info']
    visible = run('herdr', 'pane', 'read', j['pane'], '--source', 'visible')
    ansi = run('herdr', 'pane', 'read', j['pane'], '--source', 'visible', '--format', 'ansi')
    (A / (batch + '.visible.txt')).write_bytes(visible)
    (A / (batch + '.visible.ansi')).write_bytes(ansi)
    text = visible.decode()
    modal_absent = all(s not in text for s in ('Approaching rate limits', 'Switch to gpt-6-luna', 'Keep current model'))
    composer = composer_state(ansi.decode())
    assert modal_absent and composer == 'empty' and 'Queued follow-up inputs' not in text
    assert agent['agent'] == 'codex' and agent['name'] == j['agent_name']
    assert agent['pane_id'] == j['pane'] and agent['foreground_cwd'] == j['cwd']
    assert agent['agent_status'] in ('idle', 'done')
    assert proc['foreground_process_group_id'] == j['pid']
    turns, contexts, errors = [], [], []
    for line in native_raw.splitlines():
        e = json.loads(line)
        v = e.get('payload', {})
        if e.get('type') == 'event_msg' and v.get('type') == 'task_started':
            turns.append(v.get('turn_id'))
        if e.get('type') == 'turn_context':
            contexts.append({k: v.get(k) for k in ('turn_id', 'cwd', 'model', 'effort', 'service_tier')})
        if e.get('type') == 'event_msg' and v.get('type') in ('turn_aborted', 'error'):
            errors.append(dict(type=v['type'], turn_id=v.get('turn_id')))
    assert turns == [j['turn']] and contexts
    assert all(c['turn_id'] == j['turn'] and c['model'] == 'gpt-6.1-sol' and c['effort'] == 'high' and c['cwd'] == j['cwd'] for c in contexts)
    assert not errors
    record = state['batches'][x['batch_key']]
    row = dict(batch=batch, batch_key=x['batch_key'], receipt=proof(p, raw),
               receipt_unchanged_since_0400=True, deferral_unchanged_since_0400=True,
               current_modal_absent=True, visible_sha256=H(visible),
               visible_equals_ops_0404_sha256=H(visible) == claim['visible_sha256'],
               ansi_sha256=H(ansi), composer=composer, queued_followup_visible=False,
               agent=agent, process=proc, native=proof(native_path, native_raw),
               native_task_started_turns=turns, native_contexts=contexts,
               native_error_or_abort_count=0, learn_state=record['state'],
               learn_rc=record.get('rc'), finished=record.get('finished'),
               tui_recovery=record.get('tui_recovery'),
               supported_recovery_task=record.get('task', 'postmortem') in ('postmortem', 'experience-update'),
               seal_or_finish_authorized=False, controls_sent_by_watcher=False)
    assert row['learn_state'] == 'awaiting_review' and row['learn_rc'] is None and row['finished'] is None and row['tui_recovery'] is None
    protected = [p, R / x['deferral']['path'], native_path, directory / 'learner' / (x['batch_key'] + '.out')]
    before_hashes = {str(q): H(q.read_bytes()) for q in protected}
    if row['supported_recovery_task']:
        command = ['nice', '-n', '19', sys.executable, '-B', str(R / 'ops/learner_tui.py'), 'recover-completed', str(R), str(directory), x['batch_key'], H(raw)]
        result = subprocess.run(command, cwd=R, capture_output=True)
        (A / (batch + '.preflight.stdout')).write_bytes(result.stdout)
        (A / (batch + '.preflight.stderr')).write_bytes(result.stderr)
        row['readonly_recovery_preflight'] = dict(argv=command, rc=result.returncode)
        if result.returncode == 0:
            row['readonly_recovery_preflight']['result'] = json.loads(result.stdout)
            assert row['readonly_recovery_preflight']['result']['apply'] is False
        else:
            row['readonly_recovery_preflight']['stderr_sha256'] = H(result.stderr)
    else:
        row['readonly_recovery_preflight'] = dict(invoked=False, reason='unsupported retained task; no --apply or scope extension')
    row['protected_sources_unchanged_after_preflight'] = all(H(q.read_bytes()) == before_hashes[str(q)] for q in protected)
    row['registration_unchanged_after_preflight'] = json.loads(state_path.read_bytes())['batches'][x['batch_key']] == record
    assert row['protected_sources_unchanged_after_preflight'] and row['registration_unchanged_after_preflight']
    rows.append(row)

scan = subprocess.run(['gitleaks', 'stdin', '--redact', '--no-banner'],
    input=b'\n'.join(p.read_bytes() for p in A.glob('*.visible.*')),
    capture_output=True, env={**os.environ, 'GOMAXPROCS': '1'})
(A / 'visible-scan.log').write_bytes(scan.stdout + scan.stderr)
assert scan.returncode == 0
save('dialog-and-recovery-readback.json', dict(at=at, ops_source=proof(source, source_raw), rows=rows,
    gitleaks_rc=0, historical_ops_key_selection_witnessed_by_watcher=False,
    historical_human_draft_authorship_unproven=True,
    readonly_preflight_is_not_apply_dependency_or_loaded_source_verification=True,
    no_keys_restart_replay_finish_seal_or_state_write=True))
print(json.dumps(dict(at=at, rows=len(rows), modal_absent=sum(x['current_modal_absent'] for x in rows),
    visible_equals_ops=sum(x['visible_equals_ops_0404_sha256'] for x in rows),
    preflight=[dict(batch=x['batch'], result=x['readonly_recovery_preflight']) for x in rows if x['supported_recovery_task']]), ensure_ascii=False))
