"""Revalidate explicitly mapped LIVE data changes without changing old evidence."""
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import time
import uuid

from board_heavy import resource_fds, settings
from board_queue_pin import local
from issue_session_support import secret_name


def policy(root, options):
    value = options.get('natural_refresh')
    if value is None:
        return None
    if (not isinstance(value, dict) or value.get('schema') != 'sts2-natural-refresh-v1'
            or not isinstance(value.get('paths'), list) or not isinstance(value.get('checks'), dict)):
        raise ValueError('explicit natural refresh path/check mapping required')
    for row in value['paths']:
        pattern = row.get('pattern') if isinstance(row, dict) else None
        checks = row.get('checks') if isinstance(row, dict) else None
        if (not isinstance(pattern, str) or not pattern or Path(pattern).is_absolute()
                or '..' in Path(pattern).parts or secret_name(pattern)
                or not ((pattern.startswith('knowledge/') and pattern.endswith('.json'))
                        or (pattern.startswith('notes/') and pattern.endswith('.md')))
                or not isinstance(checks, list) or not checks
                or any(not isinstance(name, str) for name in checks) or len(checks) != len(set(checks))
                or any(name not in value['checks'] for name in checks)):
            raise ValueError('natural refresh has an unknown or incomplete affected set')
        local(root, pattern)
    for ident, check in value['checks'].items():
        if not isinstance(ident, str) or not re.fullmatch(r'[a-z][a-z0-9-]{0,63}', ident) or not isinstance(check, dict):
            raise ValueError('invalid natural refresh check identity')
        if type(check.get('timeout')) is not int or not 1 <= check['timeout'] <= 600:
            raise ValueError('bounded natural refresh check timeout required')
        if check.get('kind') == 'vitest':
            names = check.get('files')
            if (not isinstance(names, list) or not names or len(names) != len(set(names))
                    or any(not isinstance(name, str) or not name.startswith('tests/')
                           or not name.endswith('.test.ts') or any(c in name for c in '*?[')
                           or '..' in Path(name).parts for name in names)):
                raise ValueError('explicit affected test files required; full is not a refresh check')
        elif check.get('kind') == 'consumer':
            argv = check.get('argv')
            if (not isinstance(argv, list) or not argv or argv[0] not in ('node', 'python3')
                    or not all(isinstance(arg, str) and arg for arg in argv)):
                raise ValueError('explicit natural refresh consumer command required')
        else:
            raise ValueError('unknown natural refresh check kind')
    # Freeze a JSON copy, rather than retaining a mutable caller-owned policy.
    return json.loads(json.dumps(value))


def differences(before, after):
    return [dict(path=name, before=before.get(name), after=after.get(name))
            for name in sorted(set(before) | set(after)) if before.get(name) != after.get(name)]


def record(path, event):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(event, ensure_ascii=False, indent=2) + '\n')
    os.replace(temporary, path)


def gate(path, result, reason=None):
    event = json.loads(Path(path).read_text())
    event.update(gate_result=result, gate_reason=reason)
    record(Path(path), event)


def verify(context, current, adapter):
    assembly = context['assembly']
    original = assembly['live_before']
    root, live = Path(context['job']['root']), Path(assembly['live'])
    rows = differences(original['files'], current['files'])
    overlay = {row['path']: row['fingerprint'] for row in assembly['overlays']['live']}
    for name, before in overlay.items():
        path = local(live, name)
        after = adapter.fingerprint(path) if path.exists() else None
        if before != after and name not in {row['path'] for row in rows}:
            rows.append(dict(path=name, before=before, after=after))
    if not rows and current == original:
        return
    directory = Path(context.get('job_path', Path(context['job']['cwd']).parent / 'job.json')).parent
    ident = uuid.uuid4().hex
    evidence = directory / 'refresh-revalidation' / ident
    evidence.mkdir(parents=True, exist_ok=False)
    event = dict(schema='sts2-refresh-revalidation-v1', id=ident, started_at=time.time(),
                 candidate=context['job']['candidate'], baseline=assembly['baseline'],
                 before=original, after=current, differences=rows, checks=[], state='checking', full_runs=0)
    context.setdefault('refresh_revalidations', []).append(str(evidence / 'evidence.json'))
    record(evidence / 'evidence.json', event)
    try:
        if any(current.get(key) != original.get(key) for key in ('head', 'tree', 'entries', 'flags')):
            raise ValueError('LIVE HEAD/tree/index metadata changed')
        contract = assembly.get('natural_refresh')
        if not contract:
            raise ValueError('no frozen natural refresh declaration; affected set unknown')
        # A prior acceptance is reusable only for the exact same data and view.
        accepted = context.get('refresh_accepted')
        if accepted and accepted['live'] == current:
            if not adapter.unchanged(Path(accepted['view']), accepted['inputs'], assembly['fixture_scopes']['live']):
                raise ValueError('accepted refresh validation view changed')
            event.update(state='reused', previous=accepted['evidence'], ended_at=time.time())
            record(evidence / 'evidence.json', event)
            return accepted
        targets = set(assembly.get('candidate_targets', []))
        if 'candidate_targets' not in assembly:
            raise ValueError('candidate target set unavailable')
        fixtures = set(assembly['fixture_scopes']['live']) | set(assembly['fixture_scopes']['root'])
        selected = set()
        for row in rows:
            name, before, after = row['path'], row['before'], row['after']
            if name in targets:
                raise ValueError('natural refresh intersects candidate target: ' + name)
            if name in fixtures:
                raise ValueError('strict LIVE fixture changed: ' + name)
            if (not before or not after or before['kind'] != 'file' or after['kind'] != 'file'
                    or before['mode'] != after['mode']):
                raise ValueError('natural refresh must preserve regular file identity/mode: ' + name)
            matches = [rule for rule in contract['paths'] if PurePosixPath(name).match(rule['pattern'])]
            if not matches:
                raise ValueError('undeclared natural refresh path; affected set unknown: ' + name)
            selected.update(check for rule in matches for check in rule['checks'])
        if not selected or selected - set(contract['checks']):
            raise ValueError('natural refresh affected check set unknown')
        event['affected_checks'] = sorted(selected)
        # A publication caller must acquire machine admission before K/L, not
        # wait for resources from this validation callback under business locks.
        descriptors = resource_fds(root)
        if (root / '.agents/board.yaml').exists() and settings(root)[1].get('enabled', False) and not descriptors:
            raise ValueError('refresh revalidation requires pre-admitted inherited machine leases')
        # Retain the active queue worker lease as well as the machine claim.
        descriptors = tuple(dict.fromkeys((*descriptors, *adapter.fds())))
        full_fd = context.get('full_lock_fd')
        if full_fd is not None:
            try:
                if os.fstat(full_fd).st_ino == context.get('full_lock_inode'):
                    descriptors = tuple(dict.fromkeys((*descriptors, full_fd)))
            except OSError:
                pass  # A later publication callback does not own the old full FD.
        event['inherited_descriptors'] = [dict(fd=fd, inode=os.fstat(fd).st_ino,
                                              target=os.readlink('/proc/self/fd/' + str(fd))) for fd in descriptors]
        view = evidence / 'validation-live'
        source = Path(assembly['runtime'])
        adapter.view(root, view, adapter.text(source, 'rev-parse', 'HEAD'), assembly['fixture_scopes']['live'])
        adapter.mirror(source, view, assembly['runtime_inputs']['files'])
        for row in rows:
            original_path, destination = local(live, row['path']), local(view, row['path'])
            if adapter.fingerprint(original_path) != row['after']:
                raise ValueError('natural data changed during refresh snapshot')
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(original_path.read_bytes())
            destination.chmod(row['after']['mode'])
            if adapter.fingerprint(destination) != row['after']:
                raise ValueError('new refresh snapshot differs from actual data')
        for provider, relative in ((assembly['dependencies'], 'agent/node_modules'),
                                   (assembly['python_dependencies'], 'data/logdb-venv')):
            if provider:
                destination = local(view, relative)
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.symlink_to(provider['realpath'], target_is_directory=True)
        inputs = adapter.snapshot(view, assembly['fixture_scopes']['live'])
        event.update(view=str(view), inputs=inputs)
        changes = evidence / 'changes.json'
        changes.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
        environment = dict(os.environ, OMP_NUM_THREADS='1', OPENBLAS_NUM_THREADS='1', MKL_NUM_THREADS='1',
                           NUMEXPR_NUM_THREADS='1', PYTHONDONTWRITEBYTECODE='1', GIT_OPTIONAL_LOCKS='0')
        for name in list(environment):
            if (name in ('CHARACTER', 'STS2_LIVE', 'STS2_WORKSPACE', 'CODEX_OPS_ROOT', 'CODEX_OPS_DIR',
                         'NODE_OPTIONS', 'NODE_PATH', 'PYTHONPATH')
                    or name.startswith(('STS2_KNOWLEDGE_RUNTIME', 'STS2_LEARNING_RUNTIME', 'STS2_LEARNING_DATA'))):
                environment.pop(name)
        for name in sorted(selected):
            check = contract['checks'][name]
            if check['kind'] == 'vitest':
                for filename in check['files']:
                    if not local(view / 'agent', filename).is_file():
                        raise ValueError('affected test missing from frozen LIVE code: ' + filename)
                argv = ['node', 'node_modules/vitest/vitest.mjs', 'run', *check['files'], '--pool=threads',
                        '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=60000']
            else:
                argv = [arg.replace('{view}', str(view)).replace('{root}', str(root))
                        .replace('{changes}', str(changes)) for arg in check['argv']]
            argv[0] = context.get('tools', {}).get('node' if argv[0] == 'node' else 'python', {}).get('path', argv[0])
            row = dict(id=name, argv=argv, cwd=str(view / 'agent'), started_at=time.time())
            event['checks'].append(row)
            record(evidence / 'evidence.json', event)
            with (evidence / (name + '.log')).open('wb') as output:
                child = subprocess.Popen(argv, cwd=view / 'agent', env=environment, pass_fds=descriptors,
                                         stdout=output, stderr=subprocess.STDOUT)
                row['pid'] = child.pid
                row['boot_id'] = Path('/proc/sys/kernel/random/boot_id').read_text().strip()
                try:
                    row['start'] = Path('/proc', str(child.pid), 'stat').read_text().rsplit(')', 1)[1].split()[19]
                except FileNotFoundError:
                    row['start'] = None
                try:
                    row['exit_code'] = child.wait(timeout=check['timeout'])
                except subprocess.TimeoutExpired:
                    # Stop only this owned check child; preserve its failed log.
                    child.terminate()
                    try:
                        child.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        child.kill()
                        child.wait()
                    raise ValueError('refresh revalidation timed out: ' + name)
            row['ended_at'] = time.time()
            if row['exit_code']:
                raise ValueError('refresh revalidation failed: ' + name)
        if not adapter.unchanged(view, inputs, assembly['fixture_scopes']['live']):
            raise ValueError('refresh revalidation modified its frozen inputs')
        if adapter.snapshot(live, assembly['fixture_scopes']['live']) != current:
            raise ValueError('LIVE changed again during refresh revalidation')
        for row in rows:
            if adapter.fingerprint(local(live, row['path'])) != row['after']:
                raise ValueError('LIVE overlay changed again during refresh revalidation')
        event.update(state='passed', ended_at=time.time())
        record(evidence / 'evidence.json', event)
        return dict(live=current, view=str(view), inputs=inputs, evidence=str(evidence / 'evidence.json'))
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        event.update(state='rejected', reason=type(error).__name__ + ': ' + str(error), ended_at=time.time())
        record(evidence / 'evidence.json', event)
        raise ValueError('frozen tree/input/index drift: live; ' + str(error)) from error
