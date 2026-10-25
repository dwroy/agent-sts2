from pathlib import Path
import subprocess, json, os, sys

R = Path('/home/dw/Projects/agent-sts2')
A = Path(__file__).resolve().parent
M = R / 'paper/materials/20261025-issue70-integrator'
records = '--records' in sys.argv
i = json.loads((M / 'main-integration.json').read_text())
if records:
    transaction = json.loads((A / 'final-records-transaction.json').read_text())
    assert transaction['phase'] == 'committed'
    commit = transaction['commit']
else:
    transaction = json.loads((A / 'integration-transaction.json').read_text())
    assert transaction['phase'] == 'committed-and-root-materialized'
    commit = i['commit']
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=R, text=True).strip() == commit
assert not subprocess.check_output(['git', 'diff', '--cached', '--name-only'], cwd=R).strip()
transport = '/mnt/c/Windows/System32/OpenSSH/ssh.exe'
env = {**os.environ, 'GIT_SSH_COMMAND': transport}
prefix = 'final-records' if records else 'main'
p = subprocess.run(['git', 'push', 'origin', commit + ':refs/heads/main'], cwd=R, env=env, capture_output=True)
(A / (prefix + '-push.log')).write_bytes(p.stdout + p.stderr)
remote = subprocess.run(['git', 'ls-remote', 'origin', 'refs/heads/main'], cwd=R, env=env, capture_output=True)
(A / (prefix + '-remote-readback.log')).write_bytes(remote.stdout + remote.stderr)
assert remote.returncode == 0, 'remote readback failed; inspect actual remote before retry'
remote_main = remote.stdout.decode().split()[0]
assert remote_main == commit, ('remote main differs; inspect actual state before retry', p.returncode, remote_main, commit)
assert p.returncode == 0, ('remote matches, but original push did not return success', p.returncode)
out = dict(at=subprocess.check_output(['date', '-Is'], text=True).strip(), remote_main=remote_main, source_commit_pushed=True, source_commit=i['commit'], pushed_commit=commit, push_exit_code=p.returncode, transport=transport, actual_live_preserved=subprocess.check_output(['git', '-C', '.worktrees/live', 'rev-parse', 'HEAD'], cwd=R, text=True).strip())
(M / (prefix + '-push-readback.json')).write_text(json.dumps(out, indent=2) + '\n')
print(json.dumps(out))
