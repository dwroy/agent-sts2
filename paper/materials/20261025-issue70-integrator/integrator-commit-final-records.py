from pathlib import Path
import subprocess, json, os, fcntl

R = Path('/home/dw/Projects/agent-sts2')
A = Path(__file__).resolve().parent
M = R / 'paper/materials/20261025-issue70-integrator'

def git(*args, data=None, env=None):
    return subprocess.check_output(['git', *args], cwd=R, input=data, env=env, stderr=subprocess.PIPE)

i = json.loads((M / 'main-integration.json').read_text())
p = json.loads((M / 'main-push-readback.json').read_text())
assert p['remote_main'] == i['commit'] and p['source_commit_pushed']
folders = [M, R / 'paper/materials/20261026-issue61-notices0020-integrator', R / 'paper/materials/20261026-issue61-notices0043-integrator']
paths = [str(x.relative_to(R)) for folder in folders for x in folder.rglob('*') if x.is_file()]
paths.append('paper/materials/20261025-issue69-combination-integrator/final-records-push-readback.json')
paths.append('notes/integrator-current.md')
files = {n: (R / n).read_bytes() for n in paths}
scan = subprocess.run(['gitleaks', 'stdin', '--redact', '--no-banner'], input=b'\n'.join(files.values()), capture_output=True, env={**os.environ, 'GOMAXPROCS': '1'})
(A / 'final-records-gitleaks.log').write_bytes(scan.stdout + scan.stderr)
assert scan.returncode == 0
locks = []
fd = None
guard = None
try:
    for name in ['ops/knowledge-refresh.lock', 'ops/live-merge.lock']:
        f = (R / name).open('a')
        locks.append(f)
        try:
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print(json.dumps(dict(phase='waiting-original-lock', lock=name)))
            raise SystemExit(75)
    assert git('branch', '--show-current').strip() == b'main'
    parent = git('rev-parse', 'HEAD').decode().strip()
    git('merge-base', '--is-ancestor', i['commit'], parent)
    index = Path(git('rev-parse', '--path-format=absolute', '--git-path', 'index').decode().strip())
    guard = Path(str(index) + '.lock')
    fd = os.open(guard, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    private = A / 'final-records.index'
    assert not private.exists()
    private.write_bytes(index.read_bytes())
    env = {**os.environ, 'GIT_INDEX_FILE': str(private)}
    assert git('write-tree', env=env).strip() == git('rev-parse', parent + '^{tree}').strip()
    for n, b in files.items():
        assert (R / n).read_bytes() == b, ('parallel record changed', n)
        h = git('hash-object', '-w', '--stdin', data=b).decode().strip()
        git('update-index', '--add', '--cacheinfo', f'100644,{h},{n}', env=env)
    tree = git('write-tree', env=env).decode().strip()
    changed = git('diff', '--name-only', parent, tree).decode().splitlines()
    assert changed and set(changed).issubset(files)
    commit = git('commit-tree', tree, '-p', parent, data=b'Record #70 combined verification and #61 notice receipts\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\nAgent: codex@xdwin1\n').decode().strip()
    journal = dict(phase='prepared', parent=parent, commit=commit, paths=changed)
    (A / 'final-records-transaction.json').write_text(json.dumps(journal, indent=2) + '\n')
    for n, b in files.items():
        assert (R / n).read_bytes() == b
    git('update-ref', 'refs/heads/main', commit, parent)
    with os.fdopen(fd, 'wb') as out:
        fd = None
        out.write(private.read_bytes())
        out.flush()
        os.fsync(out.fileno())
    os.replace(guard, index)
    guard = None
    journal['phase'] = 'committed'
    (A / 'final-records-transaction.json').write_text(json.dumps(journal, indent=2) + '\n')
    print(json.dumps(journal))
finally:
    if fd is not None:
        os.close(fd)
    if guard is not None and guard.exists():
        guard.unlink()
    for f in reversed(locks):
        f.close()
