from pathlib import Path
import hashlib, json, subprocess

r = Path.cwd(); p = r / 'ops/codex-ops/record-staging/20261017-2059'; pub = r / 'paper/materials/20261017-2059-ops'
info = json.loads((pub / 'registration.json').read_bytes()); bid = info['batch']
assert not (pub / 'host-action-start.json').exists()
log = r / 'ops/codex-ops/learner' / (bid + '.fallback-' + info['tree'] + '.checks.log')
assert not log.exists()
state = json.loads((r / 'ops/codex-ops/learn.json').read_bytes())['batches'][bid]
assert state['state'] == 'done' and state['rc'] == 0 and state['merged'] == '3d691cff96dedd19855b00f4e9d448c43fe1d219'
assert not any(x['tree'] == info['tree'] for x in state.get('fallback_checks', []))
for proc in Path('/proc').iterdir():
    if not proc.name.isdigit(): continue
    try: args = (proc / 'cmdline').read_bytes().split(b'\0')
    except OSError: continue
    if b'recheck' in args and bid.encode() in args and any(x.endswith(b'/codex-ops-learn.py') for x in args): raise AssertionError('Original check is already running')
command = ['nice', '-n', '19', 'bash', 'ops/codex-ops-do.sh', 'learner-recheck', bid]
at = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
with (p / 'host-action.log').open('wb') as stream:
    process = subprocess.Popen(command, cwd=r, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
stat = Path(f'/proc/{process.pid}/stat').read_text().split(') ', 1)[1].split()
receipt = dict(at=at, batch=bid, command=command, pid=process.pid, birth_ticks=stat[19], actual_live=info['actual_live'], tree=info['tree'],
    canonical_log=str(log.relative_to(r)), action_output=str((p / 'host-action.log').relative_to(r)),
    route='Authorized primary host invokes the same existing allow-listed action and original batch lock, no additional test pipeline',
    action_script_sha256=hashlib.sha256((r / 'ops/codex-ops-do.sh').read_bytes()).hexdigest(),
    actual_subprocess_started=True, full_result=None, original_source_full_not_repeated=True, no_other_role_ACK=True)
(pub / 'host-action-start.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(dict(pid=process.pid, birth=stat[19], batch=bid, actual_subprocess_started=True, full_result=None)), flush=True)
