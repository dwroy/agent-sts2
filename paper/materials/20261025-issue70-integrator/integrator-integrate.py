from pathlib import Path
import fcntl, hashlib, json, os, subprocess

R = Path('/home/dw/Projects/agent-sts2')
A = Path(__file__).resolve().parent
M = R / 'paper/materials/20261025-issue70-integrator'
sha = lambda b: hashlib.sha256(b).hexdigest()

def git(*args, data=None, env=None):
    return subprocess.check_output(['git', *args], cwd=R, input=data, env=env, stderr=subprocess.PIPE)

def save(p, x):
    p.write_text(json.dumps(x, ensure_ascii=False, indent=2) + '\n')

assembly = json.loads((M / 'assembly.json').read_text())
terminal = json.loads((M / 'terminal-readback.json').read_text())
assert terminal['accepted'] and terminal['worker_absent'] and terminal['lock_available']
assert not (M / 'main-integration.json').exists()
live_probe=json.loads((M/'actual-live-consumer-state.json').read_text())
assert live_probe['phase']=='passed' and live_probe['check_lock_released']
locks = []
guard = None
fd = None
try:
    for name in ['ops/knowledge-refresh.lock', 'ops/live-merge.lock']:
        lock = (R / name).open('a')
        locks.append(lock)
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print(json.dumps(dict(phase='waiting-original-lock', lock=name)))
            raise SystemExit(75)
    live_inputs = json.loads((M / 'actual-live-consumer-inputs.json').read_text())
    live_root = R / '.worktrees/live'
    assert git('-C', str(live_root), 'rev-parse', 'HEAD').decode().strip() == live_inputs['actual_live'], 'LIVE changed after probe; review before integration'
    for leaf in live_inputs['overlay']:
        live_path = live_root / leaf['path']
        assert (sha(live_path.read_bytes()) if live_path.is_file() else None) == leaf['before_sha256'], ('LIVE preimage changed after probe', leaf['path'])
    assert git('branch', '--show-current').strip() == b'main'
    parent = git('rev-parse', 'HEAD').decode().strip()
    git('merge-base', '--is-ancestor', assembly['main'], parent)
    assert not git('diff', '--name-only', assembly['main'], parent, '--', 'agent', 'learner', 'ops', 'eval', 'knowledge/builders', '.agents', 'docs').strip(), 'code baseline changed; review before mutation'
    changes = {}
    modes = {}
    old_working = {}
    for n in assembly['delivery_paths']:
        source = git('show', assembly['candidate_commit'] + ':' + n)
        p = R / n
        old_working[n] = p.read_bytes() if p.exists() else None
        modes[n] = git('ls-tree', assembly['candidate_commit'], '--', n).split()[0].decode()
        if n == 'paper/materials/decision-log.md':
            base = git('show', assembly['developer_base'] + ':' + n)
            dev = git('show', assembly['developer'] + ':' + n)
            assert dev.startswith(base)
            delta = dev[len(base):]
            current = old_working[n]
            assert delta.strip() not in current
            now = subprocess.check_output(['date', '-Is'], text=True).strip()
            entry = f'\n{now} [watcher] #70 固定39c9b14c7独立实际main组合核收：双tsc0、宿主423过、唯一full终态及退出/冻结见20261025-issue70-integrator/terminal-readback.json，实际LIVE基线九精确生产叶隔离消费者见actual-live-consumer-state.json；九ROOT+LIVE叶含新增brain/evidence.ts，保原预算/模型/初始plan守卫，ops接自然边界发布编号与下一普通题真实返回/计划/耗时；离线绿不代后端根因或自然效果，不等68接管。\n'.encode()
            changes[n] = current + delta + entry
        else:
            baseline = git('ls-tree', parent, '--', n)
            if baseline.strip():
                expected = git('show', parent + ':' + n)
                assert old_working[n] == expected, ('parallel dirty delivery leaf', n)
            else:
                assert old_working[n] in (None, source), ('new file collision', n)
            changes[n] = source
    scan = subprocess.run(['gitleaks', 'stdin', '--redact', '--no-banner'], input=b'\n'.join(changes.values()), capture_output=True, env={**os.environ, 'GOMAXPROCS': '1'})
    (M / 'main-gitleaks.log').write_bytes(scan.stdout + scan.stderr)
    assert scan.returncode == 0
    index = Path(git('rev-parse', '--path-format=absolute', '--git-path', 'index').decode().strip())
    guard = Path(str(index) + '.lock')
    fd = os.open(guard, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    private = A / 'main-integration.index'
    assert not private.exists()
    private.write_bytes(index.read_bytes())
    env = {**os.environ, 'GIT_INDEX_FILE': str(private)}
    assert git('write-tree', env=env).strip() == git('rev-parse', parent + '^{tree}').strip(), 'preexisting staged changes'
    for n, b in changes.items():
        blob = git('hash-object', '-w', '--stdin', data=b).decode().strip()
        git('update-index', '--add', '--cacheinfo', f'{modes[n]},{blob},{n}', env=env)
    tree = git('write-tree', env=env).decode().strip()
    changed = git('diff', '--name-only', parent, tree).decode().splitlines()
    assert set(changed) == set(changes)
    commit = git('commit-tree', tree, '-p', parent, data=b'Preserve continuous brain budget and append-only failure evidence (#70)\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\nAgent: codex@xdwin1\n').decode().strip()
    journal = dict(phase='prepared', at=subprocess.check_output(['date', '-Is'], text=True).strip(), parent=parent, commit=commit, tree=tree, candidate=assembly['candidate_commit'], paths=changed, installed_sha256={n: sha(b) for n, b in changes.items()}, root_runtime_leaves=assembly['root_runtime_leaves'], live_source_leaves=assembly['live_source_leaves'], release_id=None)
    save(A / 'integration-transaction.json', journal)
    for n, old in old_working.items():
        p = R / n
        assert (p.read_bytes() if p.exists() else None) == old, ('parallel changed before commit', n)
    git('update-ref', 'refs/heads/main', commit, parent)
    with os.fdopen(fd, 'wb') as out:
        fd = None
        out.write(private.read_bytes())
        out.flush()
        os.fsync(out.fileno())
    os.replace(guard, index)
    guard = None
    for n, b in changes.items():
        p = R / n
        assert (p.read_bytes() if p.exists() else None) == old_working[n], ('parallel changed after commit', n)
        p.parent.mkdir(parents=True, exist_ok=True)
        tmp = p.with_name(p.name + '.integrator70.tmp')
        with tmp.open('xb') as out:
            out.write(b)
            out.flush()
            os.fsync(out.fileno())
        tmp.chmod(0o755 if modes[n] == '100755' else 0o644)
        tmp.replace(p)
    assert all(sha((R / n).read_bytes()) == v for n, v in journal['installed_sha256'].items())
    journal.update(phase='committed-and-root-materialized', at=subprocess.check_output(['date', '-Is'], text=True).strip())
    save(A / 'integration-transaction.json', journal)
    save(M / 'main-integration.json', journal)
    print(json.dumps(journal))
finally:
    if fd is not None:
        os.close(fd)
    if guard is not None and guard.exists():
        guard.unlink()
    for lock in reversed(locks):
        lock.close()
