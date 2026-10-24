from pathlib import Path
import os, json, fcntl, subprocess, hashlib, traceback, sys

R = Path('/home/dw/Projects/agent-sts2')
A = Path(__file__).resolve().parent
M = R / 'paper/materials/20261024-issue37-20-r434-integrator'
a = json.loads((M / 'assembly.json').read_bytes())
W = Path(a['worktree'])
mode = sys.argv[1]
assert mode in ('directed', 'full')
sha = lambda b: hashlib.sha256(b).hexdigest()
now = lambda: subprocess.check_output(['date', '-Iseconds'], text=True).strip()

def save(s):
    p = M / (mode + '-state.json')
    q = p.with_suffix('.tmp')
    q.write_text(json.dumps(s, indent=2) + '\n')
    os.replace(q, p)

s = dict(at=now(), phase='preflight', mode=mode, worker_pid=os.getpid(),
         worker_birth=Path('/proc/self/stat').read_text().rsplit(')', 1)[1].split()[19],
         new_full_runs=0, model_calls=0, production_operations=0, check_lock_released=False)
try:
    lock = (R / 'ops/integrator-full-check.lock').open('a')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    os.close(os.open(A / (mode + '.once'), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600))
    inputs = json.loads((M / 'inputs-before.json').read_bytes())
    dependencies = json.loads((M / 'dependencies-before.json').read_bytes())
    node = (W / 'agent/node_modules').resolve()
    for x in inputs:
        assert sha((W / x['path']).read_bytes()) == x['sha256'], x['path']
    for x in dependencies:
        assert sha((node / x['path']).read_bytes()) == x['sha256'], x['path']
    assert subprocess.check_output(['git', '-C', str(W), 'write-tree'], text=True).strip() == a['validation_tree']
    env = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ.get('PATH', ''),
           'PYTHONDONTWRITEBYTECODE': '1', 'GOMAXPROCS': '1', 'PYTHONPATH': str(W / 'ops/tests'), 'GIT_OPTIONAL_LOCKS': '0', 'TMPDIR': str(A / 'deliberately-long-temp-path-for-the-original-bounded-ENOENT-diagnostic-check')}
    Path(env['TMPDIR']).mkdir(exist_ok=True)
    if mode == 'directed':
        with (A / 'shell-syntax.log').open('wb') as out:
            shell = subprocess.run(['bash', '-n', str(W / 'ops/codex-ops-learner.sh')], env=env, stdout=out, stderr=subprocess.STDOUT)
        s['shell_syntax_rc'] = shell.returncode
        assert shell.returncode == 0
        s.update(at=now(), phase='python-issue-session')
        save(s)
        with (A / 'python-issue-session.log').open('wb') as out:
            q = subprocess.run(['python3', '-B', 'ops/tests/test_issue_session.py'], cwd=W,
                               env=env, stdout=out, stderr=subprocess.STDOUT, timeout=600)
        s['python_issue_session_rc'] = q.returncode
        assert q.returncode == 0
        assert b'Ran 62 tests' in (A / 'python-issue-session.log').read_bytes()
        for label, project in (('production-tsc', 'tsconfig.json'), ('tools-tsc', 'tools/v6/tsconfig.json')):
            s.update(at=now(), phase=label)
            save(s)
            with (A / (label + '.log')).open('wb') as out:
                q = subprocess.run(['node', 'node_modules/typescript/bin/tsc', '-p', project, '--noEmit'],
                                   cwd=W / 'agent', env=env, stdout=out, stderr=subprocess.STDOUT, timeout=900)
            s[label + '_rc'] = q.returncode
            save(s)
            assert q.returncode == 0
    else:
        d = json.loads((M / 'directed-state.json').read_bytes())
        assert d['phase'] == 'directed-passed' and d['failed'] == 0 and d['passed'] > 0
        assert d['python_issue_session_rc'] == 0
        for k in ('production-tsc_rc', 'tools-tsc_rc'):
            assert d[k] == 0
            s[k] = d[k]
        s['python_issue_session_rc'] = 0
        s['new_full_runs'] = 1
    fd = lock.fileno()
    os.set_inheritable(fd, True)
    index = Path(subprocess.check_output(['git', '-C', str(W), 'rev-parse', '--path-format=absolute', '--git-path', 'index'], text=True).strip())
    before = dict()
    for label, args0 in [('entries', ['ls-files', '--stage', '-z']), ('flags', ['ls-files', '-v', '-z'])]:
        data = subprocess.check_output(['git', '-C', str(W), *args0], env=env)
        (A / (mode + '-index-' + label + '-before.bin')).write_bytes(data)
        before[label] = sha(data)
    (A / (mode + '-index-before.bin')).write_bytes(index.read_bytes())
    c = dict(index_semantic_before=before, root=str(R), artifacts=str(A), material=str(M), worktree=str(W), node_root=str(node),
             inputs=inputs, dependencies=dependencies, index=str(index), index_sha256=sha(index.read_bytes()),
             tree=a['validation_tree'], lock_fd=fd, lock_inode=(R / 'ops/integrator-full-check.lock').stat().st_ino,
             state=s, result=str(A / (mode + '.json')))
    context = A / (mode + '-context.json')
    context.write_text(json.dumps(c) + '\n')
    env['INTEGRATOR20_CHECK_CONTEXT'] = str(context)
    args = ['node', '--import', str(A / 'finalize.mjs'), 'node_modules/vitest/vitest.mjs', 'run',
            '--pool=forks', '--testTimeout=60000', '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json', '--outputFile=' + c['result']]
    if mode == 'directed':
        args.extend(['tests/agent-board-poll.test.ts', 'tests/brain-claude.test.ts', 'tests/brain-view.test.ts', 'tests/check-imports.test.ts', 'tests/learner-tabs.test.ts', 'tests/learner-wrapper-scripts.test.ts', 'tests/external-strategy-evidence.test.ts', 'tests/run-plan-merge.test.ts', 'tests/paths.test.ts', 'tests/worktree-retention.test.ts', 'tests/shared-tools.test.ts', 'tests/reclaim-gates.test.ts', 'tests/strategy-external.test.ts'])
    os.chdir(W / 'agent')
    os.execvpe('node', args, env)
except BaseException as e:
    s.update(at=now(), phase='preflight-stopped', error=repr(e), check_lock_released=True)
    save(s)
    (A / (mode + '-error.log')).write_text(traceback.format_exc())
    raise
