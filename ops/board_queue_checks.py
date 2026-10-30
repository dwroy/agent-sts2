#!/usr/bin/env python3
"""STS2 candidate checks: isolated ROOT/LIVE views, frozen inputs and inherited leases."""
import argparse
from contextlib import ExitStack
import fcntl
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import time
import unittest

from board_queue_pin import local, sha, verify
from issue_session_support import Board, secret_name
from shared_tools import matching
from worktree_checkout import cold, sparse_patterns
from disk_capacity import require_worktree_capacity

NAMES = ['root-tsc', 'runtime-tsc', 'live-tsc', 'host', 'consumers', 'full']
PREFIXES = ('agent/', 'learner/', 'eval/', 'ops/', 'knowledge/', 'docs/', '.agents/', 'paper/materials/')


def fds():
    value = tuple(int(fd) for fd in os.environ['MAS_QUEUE_LEASE_FDS'].split(','))
    if len(value) != 3 or len(set(value)) != 3:
        raise ValueError('three distinct inherited queue leases required')
    for fd in value:
        os.fstat(fd)
    return value


def git(root, *args, data=None, env=None, umask=-1):
    return subprocess.check_output(['git', '-c', 'submodule.recurse=false', '-c', 'diff.ignoreSubmodules=all',
                                    '-c', 'status.submoduleSummary=false',
                                    '-c', 'core.sparseCheckout=true', '-c', 'core.sparseCheckoutCone=false',
                                    '-C', str(root), *map(str, args)], input=data, stderr=subprocess.PIPE,
                                   env=env, pass_fds=fds(), umask=umask)


def text(root, *args):
    return git(root, *args).decode().strip()


def identity():
    return dict(pid=os.getpid(), start=Path('/proc/self/stat').read_text().rsplit(')', 1)[1].split()[19],
                boot_id=Path('/proc/sys/kernel/random/boot_id').read_text().strip())


def exec_descriptors(context):
    # Keep IPC/stdout descriptors available to Vitest's fork pool. Lease fds
    # must not collide with the conventional child IPC descriptor 3.
    originals = (*fds(), context['full_lock_fd'])
    copies = []
    for fd in originals:
        copy = fcntl.fcntl(fd, fcntl.F_DUPFD, 100)
        os.set_inheritable(copy, True)
        copies.append(copy)
    for fd in originals:
        os.set_inheritable(fd, False)
    os.environ['MAS_QUEUE_LEASE_FDS'] = ','.join(map(str, copies[:3]))
    context['full_lock_fd'] = copies[3]
    context['lease_fds'] = copies[:3]


def fingerprint(path):
    info = path.lstat()
    if path.is_symlink():
        return dict(kind='symlink', target=os.readlink(path))
    if not stat.S_ISREG(info.st_mode):
        raise ValueError('only explicit file inputs can be frozen')
    return dict(kind='file', sha256=sha(path.read_bytes()), mode=stat.S_IMODE(info.st_mode))


def tool_snapshot():
    result = {}
    for name, command in (('python', sys.executable), ('node', 'node'), ('git', 'git')):
        executable = shutil.which(command)
        if not executable:
            raise ValueError('installed check executable missing: ' + name)
        path = Path(executable).resolve()
        info = path.stat()
        result[name] = dict(path=str(path), device=info.st_dev, inode=info.st_ino, **fingerprint(path))
    return result


def snapshot(tree, fixtures=()):
    names = git(tree, 'ls-files', '-z').decode().split('\0')
    files = {}
    for name in names:
        if (not name or secret_name(name) or name.startswith('third_party/')
                or (cold(name) and name not in fixtures)):
            continue
        path = local(tree, name)
        files[name] = fingerprint(path) if path.is_file() else None
    return dict(head=text(tree, 'rev-parse', 'HEAD'), tree=text(tree, 'rev-parse', 'HEAD^{tree}'), files=files,
                entries=sha(git(tree, 'ls-files', '--stage', '-z')), flags=sha(git(tree, 'ls-files', '-v', '-z')))


def unchanged(tree, before, fixtures=()):
    return snapshot(tree, fixtures) == before


def dependencies(root, tree):
    matching(root, tree, ('agent/package.json', 'agent/package-lock.json'))
    modules = root / 'agent/node_modules'
    if not modules.is_dir():
        raise ValueError('existing Node dependencies required')
    expected = json.loads((root / 'agent/package-lock.json').read_text())['packages']
    installed = json.loads((modules / '.package-lock.json').read_text())['packages']
    package = json.loads((root / 'agent/package.json').read_text())
    required = set(package.get('dependencies', {})) | set(package.get('devDependencies', {}))
    if not installed or any('node_modules/' + name not in installed for name in required):
        raise ValueError('required installed package metadata missing')
    for name, row in installed.items():
        if name not in expected or any(row.get(key) != expected[name].get(key) for key in ('version', 'integrity')):
            raise ValueError('installed package differs from frozen lock')
    destination = tree / 'agent/node_modules'
    if destination.exists() or destination.is_symlink():
        raise ValueError('candidate dependencies already exist; retain them')
    destination.symlink_to(modules.resolve(), target_is_directory=True)
    return modules.resolve()


def dependency_snapshot(modules):
    # Freeze executable package input bytes, not just package-lock or directory mtime.
    files = {}
    for base, dirs, names in os.walk(modules, followlinks=False):
        dirs[:] = [name for name in dirs if name not in ('.cache', '.vite', '.vite-temp', '__pycache__')]
        for name in names + [name for name in dirs if (Path(base) / name).is_symlink()]:
            path = Path(base) / name
            if not secret_name(path.relative_to(modules)):
                files[str(path.relative_to(modules))] = fingerprint(path)
    info = modules.stat()
    return dict(realpath=str(modules), device=info.st_dev, inode=info.st_ino, files=files)


def python_dependency(root, tree):
    source = root / 'data/logdb-venv'
    if not source.is_dir():
        return None
    matching(root, tree, ('agent/tools/logdb/requirements.txt',))
    if not (source / 'pyvenv.cfg').is_file():
        raise ValueError('installed Python environment identity missing')
    runtime = json.loads(subprocess.check_output([str(source / 'bin/python'), '-B', '-c',
        'import sys,json,importlib.metadata as m;print(json.dumps({"python":list(sys.version_info[:3]),"duckdb":m.version("duckdb")}))'],
        pass_fds=fds(), text=True))
    requirements = [line.strip() for line in (root / 'agent/tools/logdb/requirements.txt').read_text().splitlines()
                    if line.strip() and not line.lstrip().startswith('#')]
    if requirements != ['duckdb==' + runtime['duckdb']]:
        raise ValueError('Python tools differ from the fixed requirements')
    destination = tree / 'data/logdb-venv'
    if destination.exists() or destination.is_symlink():
        raise ValueError('existing Python dependency path retained')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.symlink_to(source.resolve(), target_is_directory=True)
    return source.resolve()


def view(root, destination, commit, fixtures):
    if destination.exists():
        raise ValueError('validation view already exists; no duplicate check or implicit cleanup')
    require_worktree_capacity(root, commit, keep=lambda name: not cold(name) or name in fixtures)
    git(root, 'worktree', 'add', '--no-checkout', '--detach', destination, commit)
    profile = Path(text(destination, 'rev-parse', '--path-format=absolute', '--git-path', 'info/sparse-checkout'))
    profile.parent.mkdir(parents=True, exist_ok=True)
    profile.write_text(sparse_patterns(fixtures) + '!/third_party/jev-sts2\n')
    # Freeze canonical checkout permissions, independent of the caller's umask.
    # Tests may set executable fixtures to 0755; this must not alter inputs.
    git(destination, 'read-tree', '-mu', 'HEAD', umask=0o022)
    sources = []
    for name in fixtures:
        path = local(destination, name)
        if not path.is_file():
            raise ValueError('required fixed fixture not materialized: ' + name)
        entry, _, source_name = git(destination, 'ls-tree', '-z', commit, '--', name).decode().rstrip('\0').partition('\t')
        entry = entry.split()
        if (len(entry) != 3 or entry[0] not in ('100644', '100755') or entry[1] != 'blob'
                or source_name != name or text(destination, 'hash-object', '--', name) != entry[2]):
            raise ValueError('required fixed fixture differs from Git source: ' + name)
        sources.append(dict(path=name, commit=commit, blob=entry[2], fingerprint=fingerprint(path)))
    return sources


def fixture_scopes(root, options):
    # Older policies deliberately require the same fixtures in both views.
    scopes = dict(root=options['fixtures'], live=options.get('live_fixtures', options['fixtures']))
    for names in scopes.values():
        if (not isinstance(names, list) or any(not isinstance(name, str) or not name
                or Path(name).is_absolute() for name in names) or len(set(names)) != len(names)):
            raise ValueError('explicit unique project-relative fixture lists required')
        for name in names:
            local(root, name)
            if secret_name(name):
                raise ValueError('credential path is not a validation input')
    return scopes


def overlay_data(source, destination, changed):
    evidence = []
    names = git(source, 'ls-files', '-z', '--', 'knowledge/common', 'knowledge/characters').decode().split('\0')
    for name in names:
        if not name or name in changed or not name.endswith(('.json', '.md')):
            continue
        original = local(source, name)
        if not original.is_file():
            raise ValueError('actual data baseline has a missing input')
        target = local(destination, name)
        before = fingerprint(original)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(original, target)
        target.chmod(stat.S_IMODE(original.stat().st_mode))
        evidence.append(dict(path=name, fingerprint=before))
    return evidence


def mirror(source, destination, inputs):
    for name, recorded in inputs.items():
        target = local(destination, name)
        if recorded is None:
            if target.is_file():
                target.unlink()
            continue
        original = local(source, name)
        if fingerprint(original) != recorded:
            raise ValueError('actual LIVE input changed before snapshot copy')
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(original, target)
        target.chmod(recorded['mode'])


def anchor(tree, label):
    git(tree, 'add', '--sparse', '-u')
    value = text(tree, 'write-tree')
    parent = text(tree, 'rev-parse', 'HEAD')
    commit = git(tree, 'commit-tree', value, '-p', parent,
                 data=(label + '\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n').encode()).decode().strip()
    git(tree, 'update-ref', 'HEAD', commit, parent)


def policy(root, job):
    name = '.agents/queue-checks.json'
    path = local(root, name)
    value = json.loads(path.read_text())
    if (job['policy_sha256'].get(name) != sha(path.read_bytes())
            or value.get('schema') != 'sts2-queue-checks-v1' or value.get('repo') != job['repo']
            or job['required_checks'] != NAMES):
        raise ValueError('project policy must be frozen and account for all STS2 checks')
    for name in ('runtime_install_paths', 'root_only_prefixes', 'fixtures', 'host_modules', 'consumer_commands'):
        if not isinstance(value.get(name), list):
            raise ValueError('explicit project check/mapping lists required')
    fixture_scopes(root, value)
    for name in value['runtime_install_paths']:
        local(root, name)
        if secret_name(name):
            raise ValueError('credential path is not a validation input')
    return value


def assemble(root, job, options, directory):
    scopes = fixture_scopes(root, options)
    candidate = Path(job['cwd'])
    if text(candidate, 'rev-parse', 'HEAD') != job['candidate'] or text(candidate, 'write-tree') != job['tree']:
        raise ValueError('actual candidate differs from queue job')
    manifest = json.loads((directory / 'manifest.json').read_text())
    baseline = manifest['baseline']
    if text(root, 'rev-parse', 'refs/heads/main') != baseline:
        raise ValueError('expected main advanced before candidate snapshot')
    changed = git(root, 'diff', '--name-only', '-z', baseline, job['candidate']).decode().split('\0')
    changed = {name for name in changed if name}
    runtime = set(options['runtime_install_paths'])
    for name in changed:
        if name not in runtime and not any(name.startswith(prefix) for prefix in options['root_only_prefixes']):
            raise ValueError('delivery has no explicit ROOT/LIVE mapping: ' + name)
    if runtime - changed:
        raise ValueError('runtime map contains leaves outside this exact candidate delta')
    live = local(root, '.worktrees/live')
    actual_live = text(live, 'rev-parse', 'HEAD')
    before_live = snapshot(live, scopes['live'])
    workspace_path = root / '.agents/queue-workspace.json'
    bindings = json.loads(workspace_path.read_text()).get('gitlinks', {}) if workspace_path.exists() else {}
    for tree in (root, live):
        for name, oid in bindings.items():
            wanted = f'160000 {oid} 0\t{name}'
            if text(tree, 'ls-files', '--stage', '--', name) != wanted:
                raise ValueError('actual ROOT/LIVE gitlink index differs from frozen metadata')
    w, g = directory / 'validation-root', directory / 'validation-live'
    sources = dict(root=view(root, w, job['candidate'], scopes['root']),
                   live=view(root, g, actual_live, scopes['live']))
    mirror(live, g, before_live['files'])
    for row in sources['live']:
        actual = fingerprint(local(g, row['path']))
        committed = row['fingerprint']
        # Git records only the owner executable bit, not checkout umask bits.
        # Full permissions remain frozen by the actual LIVE and view snapshots.
        if (actual['kind'] != committed['kind'] or actual['sha256'] != committed['sha256']
                or (actual['mode'] & stat.S_IXUSR) != (committed['mode'] & stat.S_IXUSR)):
            raise ValueError('actual LIVE fixture differs from Git source: ' + row['path'])
    overlays = dict(root=overlay_data(root, w, changed), live=overlay_data(live, g, set()))
    mapping = []
    for name in sorted(runtime):
        path = local(g, name)
        preimage = fingerprint(path) if path.is_file() else None
        patch = git(root, 'diff', '--binary', baseline, job['candidate'], '--', name)
        git(g, 'apply', '--check', '-', data=patch)
        git(g, 'apply', '-', data=patch)
        postimage = fingerprint(path) if path.is_file() else None
        mapping.append(dict(path=name, preimage=preimage, postimage=postimage, patch_sha256=sha(patch),
                            source_blob=git(root, 'ls-tree', job['candidate'], '--', name).decode().strip()))
        git(g, 'add', '--sparse', '-A', '--', name)
    anchor(w, 'Freeze isolated ROOT validation view (#68)')
    anchor(g, 'Freeze isolated LIVE validation view (#68)')
    modules = dependencies(root, w)
    if dependencies(root, g) != modules:
        raise ValueError('ROOT/LIVE dependency providers differ')
    python = python_dependency(root, w)
    if python_dependency(root, g) != python:
        raise ValueError('ROOT/LIVE Python providers differ')
    (w / '.worktrees').mkdir(exist_ok=True)
    (w / '.worktrees/live').symlink_to(g, target_is_directory=True)
    if not unchanged(live, before_live, scopes['live']):
        raise ValueError('actual LIVE changed during read-only assembly')
    return dict(candidate=job['candidate'], baseline=baseline, live=str(live), live_commit=actual_live,
                live_before=before_live, root=str(w), runtime=str(g), overlays=overlays, deployment=mapping,
                fixtures=scopes['root'], fixture_scopes=scopes, fixture_sources=sources,
                root_inputs=snapshot(w, scopes['root']),
                runtime_inputs=snapshot(g, scopes['live']), dependencies=dependency_snapshot(modules),
                python_dependencies=dependency_snapshot(python) if python else None,
                gitlink=text(root, 'ls-tree', job['candidate'], '--', 'third_party/jev-sts2'),
                upstream_contents_read_or_modified=False, submodule_initialized=False)


def verify_after(context):
    root = Path(context['job']['root'])
    for name, checksum in context['job']['policy_sha256'].items():
        if sha(local(root, name).read_bytes()) != checksum:
            raise ValueError('check policy/kit changed')
    assembly = context['assembly']
    if context.get('tools') and tool_snapshot() != context['tools']:
        raise ValueError('check executable input/provider drift')
    if text(root, 'rev-parse', 'refs/heads/main') != assembly['baseline']:
        raise ValueError('main advanced during check')
    for key, recorded in (('root', 'root_inputs'), ('runtime', 'runtime_inputs'), ('live', 'live_before')):
        scopes = assembly.get('fixture_scopes')
        fixtures = (scopes['root' if key == 'root' else 'live'] if scopes is not None
                    else assembly['fixtures'] if key != 'live' else ())
        if not unchanged(Path(assembly[key]), assembly[recorded], fixtures):
            raise ValueError('frozen tree/input/index drift: ' + key)
    if dependency_snapshot(Path(assembly['dependencies']['realpath'])) != assembly['dependencies']:
        raise ValueError('installed dependency input drift')
    if (root / 'agent/node_modules').resolve() != Path(assembly['dependencies']['realpath']):
        raise ValueError('installed dependency provider changed')
    python = assembly['python_dependencies']
    if python and (dependency_snapshot(Path(python['realpath'])) != python
                   or (root / 'data/logdb-venv').resolve() != Path(python['realpath'])):
        raise ValueError('Python dependency input/provider drift')
    for key, source in (('root', root), ('live', Path(assembly['live']))):
        for row in assembly['overlays'][key]:
            if fingerprint(local(source, row['path'])) != row['fingerprint']:
                raise ValueError('actual data preimage drift')


def command(context, name, argv, cwd, environment):
    from merge_queue import atomic
    directory = Path(context['job_path']).parent
    if argv[0] in ('node', 'python3'):
        argv = [context['tools']['node' if argv[0] == 'node' else 'python']['path'], *argv[1:]]
    row = dict(name=name, argv=argv, cwd=str(cwd), started_at=time.time(), environment=environment)
    context['commands'].append(row)
    atomic(directory / 'sts2-progress.json', context)
    with (directory / (name + '.log')).open('ab') as log:
        process = subprocess.Popen(argv, cwd=cwd, env=dict(os.environ, **environment), stdout=log, stderr=log,
                                   pass_fds=(*fds(), context['full_lock_fd']))
        row['pid'] = process.pid
        try:
            row['start'] = Path('/proc', str(process.pid), 'stat').read_text().rsplit(')', 1)[1].split()[19]
        except FileNotFoundError:
            row['start'] = None
        row['exit_code'] = process.wait()
    row['ended_at'] = time.time()
    context['checks'][name] = 'passed' if row['exit_code'] == 0 else 'failed'
    atomic(directory / 'sts2-progress.json', context)
    if row['exit_code']:
        raise RuntimeError('check failed: ' + name)


def run(job_path):
    job_path = Path(job_path)
    job = json.loads(job_path.read_text())
    root, directory = Path(job['root']), job_path.parent
    board = Board(root)
    verify(root, board.data['dispatcher']['install'])
    kit = local(root, board.data['dispatcher']['install'])
    sys.path.insert(0, str(kit))
    from merge_queue import atomic, complete_check
    options = policy(root, job)
    # Validate actual inherited machine locks before considering the project lock.
    from board_heavy import inherited
    if not inherited(root):
        raise ValueError('queue check must already own a verified machine slot')
    context = dict(schema='sts2-queue-check-context-v1', job_path=str(job_path), job=job,
                   worker=identity(), commands=[], checks=dict.fromkeys(NAMES, 'unavailable'), full_runs=0)
    with ExitStack() as stack:
        lock = stack.enter_context(local(root, 'ops/integrator-full-check.lock').open('a'))
        fcntl.flock(lock, fcntl.LOCK_EX)
        context.update(full_lock_fd=lock.fileno(), full_lock_inode=os.fstat(lock.fileno()).st_ino)
        try:
            from publication_gate import source_locks
            with source_locks(root):
                context['assembly'] = assemble(root, job, options, directory)
            w, g = Path(context['assembly']['root']), Path(context['assembly']['runtime'])
            environment = dict(PATH=str(Path.home() / '.local/node/bin') + ':' + os.environ.get('PATH', ''),
                               PYTHONDONTWRITEBYTECODE='1', GIT_OPTIONAL_LOCKS='0', GOMAXPROCS='1',
                               PYTHONPATH=str(w / 'ops/tests'))
            for name in list(os.environ):
                if (name in ('CHARACTER', 'STS2_LIVE', 'STS2_WORKSPACE', 'CODEX_OPS_ROOT', 'CODEX_OPS_DIR', 'NODE_OPTIONS', 'NODE_PATH')
                        or name.startswith(('STS2_KNOWLEDGE_RUNTIME', 'STS2_LEARNING_RUNTIME', 'STS2_LEARNING_DATA'))):
                    os.environ.pop(name)
            os.environ['PATH'] = environment['PATH']
            context['tools'] = tool_snapshot()
            for name, tree, config in (('root-tsc', w, 'tsconfig.json'), ('runtime-tsc', w, 'tsconfig.knowledge-runtime.json'),
                                       ('live-tsc', g, 'tsconfig.json')):
                command(context, name, ['node', 'node_modules/typescript/bin/tsc', '-p', config, '--noEmit'], tree / 'agent', environment)
            context['environment'] = environment
            exec_descriptors(context)
            atomic(directory / 'sts2-context.json', context)
            # Replace the preflight adapter before Python tests can spawn any
            # child. Their imports now come from the frozen validation ROOT.
            os.chdir(w)
            os.execvpe(sys.executable, [sys.executable, '-B', str(w / 'ops/board_queue_checks.py'),
                       '--host', str(directory / 'sts2-context.json')], dict(os.environ, **environment))
        except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
            return failed(context, error)


def failed(context, error):
    from merge_queue import atomic, complete_check
    context.update(error=type(error).__name__ + ': ' + str(error), ended_at=time.time())
    atomic(Path(context['job_path']).parent / 'sts2-failed.json', context)
    complete_check(context['job_path'], 'failed', checks={key: context['checks'][key] for key in NAMES},
                   failure_kind='unknown' if isinstance(error, RuntimeError) else 'environment', evidence=context)
    return 1


def host(context_path):
    context = json.loads(Path(context_path).read_text())
    job = context['job']
    root, directory = Path(job['root']), Path(context_path).parent
    sys.path.insert(0, str(local(root, Board(root).data['dispatcher']['install'])))
    from merge_queue import atomic
    try:
        options = policy(root, job)
        w, g = Path(context['assembly']['root']), Path(context['assembly']['runtime'])
        environment = context['environment']
        modules = options['host_modules']
        if not modules or any(not name.startswith('ops.tests.test_') for name in modules):
            raise ValueError('explicit applicable host regression modules required')
        if Path.cwd() != w or Path(__file__).resolve() != w / 'ops/board_queue_checks.py':
            raise ValueError('host tests must import the frozen candidate ROOT')
        sys.path.insert(0, str(w))
        with (directory / 'host.log').open('a') as output:
            result = unittest.TextTestRunner(stream=output, verbosity=2).run(unittest.defaultTestLoader.loadTestsFromNames(modules))
        context['checks']['host'] = 'passed' if result.wasSuccessful() else 'failed'
        context['host'] = dict(tests=result.testsRun, failures=len(result.failures), errors=len(result.errors),
                               skipped=len(result.skipped), worker=identity())
        atomic(directory / 'sts2-progress.json', context)
        if not result.wasSuccessful():
            raise RuntimeError('host regression failed')
        for number, row in enumerate(options['consumer_commands']):
            tree = w if row['tree'] == 'root' else g if row['tree'] == 'live' else None
            if tree is None or not row['argv'] or not all(isinstance(arg, str) for arg in row['argv']):
                raise ValueError('explicit ROOT/LIVE consumer command required')
            cwd = tree if row['cwd'] == '.' else local(tree, row['cwd'])
            command(context, 'consumer-' + str(number), row['argv'], cwd, environment)
        context['checks']['consumers'] = 'passed'
        verify_after(context)
        result = directory / 'vitest-result.json'
        if result.exists() or (directory / 'full.once').exists():
            raise ValueError('full already started; inspect original lease/result instead of repeating')
        (directory / 'full.once').touch(exist_ok=False)
        context.update(full_runs=0, full_result=str(result), full_exec_requested_at=time.time())
        atomic(directory / 'sts2-context.json', context)
        for fd in (*fds(), context['full_lock_fd']):
            os.set_inheritable(fd, True)
        env = dict(os.environ, **environment, STS2_BOARD_CHECK_CONTEXT=str(directory / 'sts2-context.json'))
        argv = ['node', '--import', str(local(root, 'ops/board_queue_finalize.mjs')),
                'node_modules/vitest/vitest.mjs', 'run', '--pool=forks', '--testTimeout=60000', '--maxWorkers=1',
                '--no-file-parallelism', '--reporter=default', '--reporter=json', '--outputFile=' + str(result)]
        os.chdir(w / 'agent')
        os.execvpe(argv[0], argv, env)
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        return failed(context, error)


def finalize(context_path, code):
    context = json.loads(Path(context_path).read_text())
    context['finalizer'] = identity()
    job = context['job']
    root = Path(job['root'])
    sys.path.insert(0, str(local(root, Board(root).data['dispatcher']['install'])))
    from merge_queue import atomic, complete_check
    try:
        info = os.fstat(context['full_lock_fd'])
        if info.st_ino != context['full_lock_inode']:
            raise ValueError('inherited full lock identity changed')
        result_path = Path(context['full_result'])
        if code != 0:
            context['checks']['full'] = 'failed'
            if not result_path.is_file():
                raise RuntimeError('full process exited nonzero without a complete JSON result')
        result = json.loads(result_path.read_text())
        context['vitest'] = dict(files=len(result['testResults']), passed=result['numPassedTests'],
                                failed=result['numFailedTests'], skipped=result['numPendingTests'], sha256=sha(result_path.read_bytes()))
        skipped = [row['fullName'] for suite in result['testResults'] for row in suite.get('assertionResults', [])
                   if row.get('status') not in ('passed', 'failed')]
        context['vitest']['skipped_names'] = skipped
        if set(skipped) - set(policy(root, job)['allowed_skips']):
            raise ValueError('full regression introduced an unapproved skip')
        if code != 0 or not result['success'] or result['numFailedTests']:
            context['checks']['full'] = 'failed'
            raise RuntimeError('full regression failed; original output retained')
        children = []
        for path in (Path(context_path).parent / 'check-children').glob('*.json'):
            row = json.loads(path.read_text())
            if (row.get('schema') != 'sts2-check-child-v1' or row.get('job_path') != context['job_path']
                    or row.get('candidate') != job['candidate'] or row.get('boot_id') != context['worker']['boot_id']):
                raise ValueError('foreign child process evidence')
            if not row.get('finished'):
                try:
                    fields = Path('/proc', str(row['pid']), 'stat').read_text().rsplit(')', 1)[1].split()
                    if fields[0] not in ('Z', 'X') and (row.get('start') is None or fields[19] == row['start']):
                        raise ValueError('check descendant still live; do not release or repeat the check')
                except FileNotFoundError:
                    pass
            children.append(row)
        context['children'] = children
        verify_after(context)
        context['checks']['full'] = 'passed'
        context.update(ended_at=time.time(), exit_code=code)
        complete_check(context['job_path'], 'passed', checks={key: context['checks'][key] for key in NAMES}, evidence=context)
        atomic(Path(context_path).parent / 'sts2-terminal.json', context)
        return 0
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        context.update(error=type(error).__name__ + ': ' + str(error), ended_at=time.time(), exit_code=code)
        complete_check(context['job_path'], 'failed', checks={key: context['checks'][key] for key in NAMES},
                       failure_kind='unknown' if isinstance(error, RuntimeError) else 'environment', evidence=context)
        atomic(Path(context_path).parent / 'sts2-terminal.json', context)
        return 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--finalize', type=Path)
    parser.add_argument('--host', type=Path)
    parser.add_argument('--exit-code', type=int)
    args = parser.parse_args()
    os.setpriority(os.PRIO_PROCESS, 0, 19)
    if args.host:
        return host(args.host)
    return finalize(args.finalize, args.exit_code) if args.finalize else run(os.environ['MAS_QUEUE_JOB'])


if __name__ == '__main__':
    raise SystemExit(main())
