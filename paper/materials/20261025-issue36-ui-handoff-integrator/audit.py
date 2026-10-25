"""Independently read preserved learner evidence without lifecycle mutations."""
from pathlib import Path
import hashlib
import json
import subprocess

R = Path('/home/dw/Projects/agent-sts2')
M = Path(__file__).resolve().parent
A = R / '.artifacts/integrator36-ui-handoff-20261025'
A.mkdir(parents=True, exist_ok=True)
O = R / 'paper/materials/20261025-issue59-learning-ui-ops'
H = lambda b: hashlib.sha256(b).hexdigest()


def run(*args):
    return subprocess.check_output(args, cwd=R, timeout=40)


def proof(path):
    p = Path(path)
    b = p.read_bytes()
    return dict(path=str(p.relative_to(R)) if p.is_relative_to(R) else str(p),
                bytes=len(b), sha256=H(b))


def birth(pid):
    try:
        s = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
        return dict(birth=s[19], state=s[0])
    except FileNotFoundError:
        return None


at = run('date', '-Is').decode().strip()
source = json.loads((O / 'six-ui-handoff.json').read_bytes())
batches = json.loads((R / 'ops/codex-ops/learn.json').read_bytes())['batches']
lifecycle = json.loads((R / 'ops/codex-ops/learner-tabs.json').read_bytes())
rows = []
failures = []
for row in source['rows']:
    batch = row['batch']
    checks = []
    for f in row['files']:
        snap = proof(R / f['snapshot'])
        original = proof(Path(f['original'])) if Path(f['original']).exists() else None
        ok = snap['sha256'] == f['sha256'] and snap['bytes'] == f['bytes']
        checks.append(dict(snapshot=snap, snapshot_exact=ok, original=original,
                           original_exact=original is not None and original['sha256'] == f['sha256']))
        if original is not None and original['sha256'] != f['sha256']:
            prefix = (R / f['snapshot']).read_bytes()
            current_bytes = Path(f['original']).read_bytes()
            appended = current_bytes[len(prefix):]
            events = [json.loads(line) for line in appended.splitlines()] if current_bytes.startswith(prefix) else []
            checks[-1]['original_append_only'] = current_bytes.startswith(prefix)
            checks[-1]['appended_bytes'] = len(appended)
            checks[-1]['append_sha256'] = H(appended)
            checks[-1]['appended_events'] = [dict(timestamp=v.get('timestamp'), type=v.get('type'),
                 payload_type=v.get('payload', {}).get('type'),
                 turn_id=v.get('payload', {}).get('turn_id'),
                 item_type=v.get('payload', {}).get('item', {}).get('type'),
                 item_status=v.get('payload', {}).get('item', {}).get('status'),
                 exit_code=v.get('payload', {}).get('item', {}).get('exit_code')) for v in events]
            if not events or any(v.get('type') != 'event_msg' or v.get('payload', {}).get('type') != 'item_completed'
                                 or v.get('payload', {}).get('turn_id') != row['turn'] for v in events):
                failures.append(f'{batch}: unexpected original append')
        if not ok:
            failures.append(f'{batch}: snapshot {f["snapshot"]}')
    saved_batch = json.loads((R / row['exact_registration_snapshot']).read_bytes())
    registration_same = saved_batch == batches[batch]
    identities = {p['pid']: str(p['birth']) for p in row['processes']}
    identities[row['native_pid']] = str(row['native_birth'])
    identities[row['supervisor_pid']] = None
    processes = []
    for pid, expected in identities.items():
        current = birth(pid)
        absent = current is None or (expected is not None and current['birth'] != expected)
        processes.append(dict(pid=pid, expected_birth=expected, current=current,
                              original_process_absent=absent))
        if not absent:
            failures.append(f'{batch}: original process {pid}')
    ui = []
    for kind, identifier in [('tab', row['tab']), ('pane', row['pane'])]:
        p = subprocess.run(['herdr', kind, 'get', identifier], cwd=R,
                           timeout=30, capture_output=True)
        payload = p.stdout + p.stderr
        (A / f'{batch}.{kind}.json').write_bytes(payload)
        parsed = json.loads(payload)
        error = parsed.get('error', {}).get('code')
        absent = error == f'{kind}_not_found'
        ui.append(dict(kind=kind, id=identifier, rc=p.returncode, error=error, absent=absent))
        if not absent:
            failures.append(f'{batch}: {kind} still present')
    activity = [v for v in lifecycle['activity'] if v.get('batch') == batch
                and v.get('kind') == 'ops-ui-closed-business-pending']
    event = lifecycle['events'].get(batch)
    worktree = Path(row['original_cwd'])
    kept = worktree.is_dir()
    refs = dict(branch=row['branch'], original_head=row['head'], worktree_present=kept)
    if kept:
        refs['current_head'] = run('git', '-C', str(worktree), 'rev-parse', 'HEAD').decode().strip()
    refs['branch_head'] = run('git', 'rev-parse', 'refs/heads/' + row['branch']).decode().strip()
    run('git', 'cat-file', '-e', row['head'] + '^{commit}')
    if not registration_same or not kept or len(activity) != 1 or event is not None:
        failures.append(f'{batch}: registration/tree/activity/event mismatch')
    rows.append(dict(batch=batch, files=checks,
                     original_registration=proof(R / row['exact_registration_snapshot']),
                     current_registration_deep_equal=registration_same,
                     state=batches[batch].get('state'),
                     processes=processes, ui=ui, refs=refs,
                     ui_activity=activity, retirement_event=event,
                     source_session=row['session'], source_turn=row['turn'],
                     source_account=row['original_account']))

fullm = R / 'paper/materials/20261025-issue59-production-trap-combination-integrator'
old = json.loads((R / 'paper/materials/20261025-issue36-seal-integrator/full-coverage.json').read_bytes())
inputs = {v['path']: v for v in json.loads((fullm / 'source-inputs.json').read_bytes())}
full = json.loads((fullm / 'full.json').read_bytes())
fullstate = json.loads((fullm / 'full-state.json').read_bytes())
coverage = []
for path in [v['path'] for v in old['rows']] + ['ops/brain_view.py']:
    p = proof(R / path)
    p['head_sha256'] = H(run('git', 'show', 'HEAD:' + path))
    p['full_input_sha256'] = inputs[path]['sha256']
    p['exact'] = p['sha256'] == p['head_sha256'] == p['full_input_sha256']
    coverage.append(p)
    if not p['exact']:
        failures.append('full input changed: ' + path)
names = {Path(s['path']).name for s in old['suites']}
suites = [dict(path=s['name'], status=s['status'], assertions=len(s['assertionResults']))
          for s in full['testResults'] if Path(s['name']).name in names]
assert len(suites) == len(names) == 8
assert all(s['status'] == 'passed' for s in suites)
assert sum(s['assertions'] for s in suites) == 281
assert fullstate['phase'] == 'full-passed'
assert proof(fullm / 'full.json')['sha256'] == '68e3842192ca147375ca078d14f10df2cd85c2ed628ce16ff5023a2b59f5e445'
result = dict(at=at, head=run('git', 'rev-parse', 'HEAD').decode().strip(),
              sources=[proof(O / name) for name in ['six-ui-handoff.json', 'close-readback.json',
                       'ui-control.json', 'lifecycle-ui-receipt.json', 'old-test-interruption.json']],
              rows=rows, snapshot_count=sum(len(r['files']) for r in rows),
              original_file_changes=[dict(batch=r['batch'], **f) for r in rows
                                     for f in r['files'] if not f['original_exact']],
              applicable_coverage=coverage, suites=suites,
              full_result=proof(fullm / 'full.json'), full_state=proof(fullm / 'full-state.json'),
              no_new_full=True, no_business_or_ui_mutation=True,
              historical_ui_controls_not_independently_witnessed=True,
              manual_draft_identity_not_established=True, failures=failures)
(M / 'independent-readback.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(dict(rows=len(rows), snapshots=result['snapshot_count'],
                      original_file_changes=[dict(batch=v['batch'], path=v['original']['path'] if v['original'] else None)
                                             for v in result['original_file_changes']],
                      states=[(v['batch'], v['state']) for v in rows],
                      coverage=len(coverage), suites=len(suites), assertions=281,
                      failures=failures), ensure_ascii=False))
if failures:
    raise SystemExit(1)
