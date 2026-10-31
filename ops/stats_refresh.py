"""Run the original fixed pipeline on a frozen projection, then publish one S1.

Only the original caller holds K. No builder receives a production knowledge
output directory. Failed projections/receipts remain at their original paths.
"""
from datetime import datetime, timezone
from contextlib import contextmanager
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess

from stats_runtime import bind_refresh, call, capture, durable, ordinary, packed, sha


def resource_key(key):
    if key in {'catalog.json', 'reports/monster-db-check.md', 'common/enemies/_legacy-meta.json'}:
        return True
    if re.fullmatch(r'common/enemies/[A-Za-z0-9_~-]+/(mechanics|model)-observed.json', key):
        return True
    names = {'monster-db.json', 'move-model.json', 'card-upgrades.json', 'monster-records.json', 'outcome-stats.json',
             'room-costs.json', 'boss-damage.json', 'potion-equivalents.json', 'fight-value.json',
             'fight-value-gates.json', 'construction-opportunities.json', 'v6-history.json'}
    common = Path(key).name in {'monster-db.json', 'move-model.json', 'card-upgrades.json'}
    return bool(re.fullmatch(r'(common|characters/[a-z][a-z0-9_]*)/[^/]+\.json', key)
                and Path(key).name in names and (common if key.startswith('common/') else not common))


def producers(options, characters):
    only = options.get('only_producer')
    if only:
        if only not in {'monster-db', 'card-upgrades', 'outcome', 'construction-opportunities', 'room-costs',
                        'boss-damage', 'potion-equivalents', 'v6-history', 'fight-value', 'move-model'}:
            raise ValueError('non-A producer needs its original separate runtime')
        chosen = {only}
    else:
        chosen = set() if options.get('fight_value') and not options.get('all') else {
            'monster-db', 'card-upgrades', 'outcome', 'room-costs', 'boss-damage', 'potion-equivalents', 'monster-db-check'}
        if chosen and 'silent' in characters:
            chosen.update({'construction-opportunities', 'v6-history'})
        if options.get('fight_value') or options.get('all'):
            chosen.add('fight-value')
    return sorted(chosen | {'catalog'})


def copy_checked(source, target, digest=None):
    raw = ordinary(source)
    if digest is not None and sha(raw) != digest:
        raise ValueError('frozen projection source changed')
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.parent.resolve() != target.parent:
        raise ValueError('projection target redirected')
    target.write_bytes(raw)
    return sha(raw)


def freeze_code(code_root, ops_root, stage, declarations):
    """Copy only reviewed code edges plus explicit Node package/tsconfig metadata."""
    selected = {}
    for declaration in declarations.values():
        for identity, digest in declaration['inputs'].items():
            scope, name = identity.split(':', 1)
            source = Path(code_root if scope == 'code' else ops_root) / name
            if name in selected and selected[name]['sha256'] != digest:
                raise ValueError('ROOT/LIVE projection path has different reviewed bytes')
            selected[name] = {'sha256': digest, 'source': source}
    # The dispatcher itself and its imports must also be reviewed inputs.
    for name in ['knowledge/builders/refresh_driver.py', 'ops/stats_runtime.py', 'ops/stats_refresh.py']:
        if name not in selected:
            raise ValueError('stats dispatcher missing from fixed method declaration: ' + name)
    result = {}
    for name, item in selected.items():
        result[name] = copy_checked(item['source'], stage / name, item['sha256'])
    for name in ['agent/package.json', 'agent/tsconfig.json', 'agent/tsconfig.knowledge-runtime.json']:
        if name not in selected:
            raise ValueError('Node projection metadata missing from method declaration: ' + name)
    dependency = Path(code_root) / 'agent/node_modules'
    if not dependency.is_dir():
        raise ValueError('existing Node dependencies unavailable; do not install')
    (stage / 'agent/node_modules').symlink_to(dependency.resolve(), target_is_directory=True)
    return result


def freeze_inputs(code_root, ops_root, stage, selected, version, manifest):
    directory = Path(selected['directory'])
    for key, digest in manifest['files'].items():
        if not resource_key(key):
            raise ValueError('unknown S1 resource capability')
        relative = 'notes/monster-db-check.md' if key == 'reports/monster-db-check.md' else 'knowledge/' + key
        copy_checked(directory / 'json' / version / key, stage / relative, digest)
    # Unmigrated formal assets are frozen references, never output members of S1.
    from learning_runtime_data import knowledge_binding
    formal = knowledge_binding(ops_root)
    formal_files = formal['manifest'] if formal else {}
    for base, dirs, files in os.walk(Path(code_root) / 'knowledge', followlinks=False):
        dirs[:] = [name for name in dirs if name not in {'builders', 'schemas'}
                   and not (Path(base) / name).is_symlink()]
        for name in files:
            source = Path(base) / name
            key = str(source.relative_to(Path(code_root) / 'knowledge'))
            if source.suffix not in {'.json', '.md'} or resource_key(key) or key in formal_files:
                continue
            copy_checked(source, stage / 'knowledge' / key)
    if formal:
        for key, digest in formal_files.items():
            if resource_key(key):
                raise ValueError('formal K1 unexpectedly owns an A resource')
            copy_checked(Path(formal['snapshot']) / key, stage / 'knowledge' / key, digest)
    # D1 remains authoritative for explicitly selected, unmigrated B inputs.
    from learning_runtime import capture as operational_capture
    from learning_runtime_data import managed_paths
    from learning_runtime_store import Store
    old = operational_capture(ops_root)
    fixed = None
    if old.get('enabled') and managed_paths(old):
        store = Store(old['directory'], readonly=True)
        try:
            original_version = store.current()
            members = store.manifest(original_version)
            selected_b = {}
            for key, digest in members.items():
                if resource_key(key) or not any(pattern == key or pattern.replace('{character}', key.split('/')[1]) == key for pattern in managed_paths(old)):
                    continue
                row = store.db.execute('SELECT body FROM objects WHERE digest=?', (digest,)).fetchone()
                if row is None or sha(row[0]) != digest:
                    raise ValueError('original B fixed input unavailable')
                target = stage / 'knowledge' / key
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(row[0])
                selected_b[key] = digest
            fixed = {'version': original_version, 'files': selected_b}
        finally:
            store.close()
    for rel in ['data/game-data.json', 'data/fight-value-rows.jsonl', 'data/fight-value-rows-silent.jsonl']:
        source = Path(code_root) / rel
        if source.is_file():
            copy_checked(source, stage / rel)
    for rel in ['logs', 'data/logdb', 'data/logdb-venv']:
        source = (Path(code_root) / rel).resolve()
        if not source.is_dir():
            raise ValueError('original producer input unavailable: ' + rel)
        target = stage / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.symlink_to(source, target_is_directory=True)
    return {'knowledge': formal, 'fixed_data': fixed}


def execute(root, code_root, request, options, characters, runner=None):
    root, code_root = Path(root).resolve(), Path(code_root).resolve()
    selected = bind_refresh(root, code_root, request, options)
    if not selected['enabled']:
        return None
    directory = Path(selected['directory'])
    if not (directory / 'stats.sqlite').is_file():
        raise ValueError('stats database not seeded; no legacy fallback')
    chosen = producers(options, characters)
    existing = call(code_root, 'status', directory, request=request)
    if existing['state'] == 'published':
        return {'schema': 'stats-refresh-receipt-v1', 'request': request, 'status': 'already_published', 'version': existing['version']}
    from fixed_producer_methods import manifest as method_manifest, method
    methods = {name: method(code_root, name, root) for name in chosen}
    if any(selected['methods'].get(name) != value for name, value in methods.items()):
        raise ValueError('stats fixed method needs engineering admission')
    authority = call(code_root, 'authority', directory)
    if (not authority or authority['blocked']
            or any(authority['methods'].get(name) != value for name, value in methods.items())):
        raise ValueError('stats database method authority needs same-publication admission')
    attempt = root / 'data/stats-refresh' / sha(request.encode())
    attempt.mkdir(parents=True, exist_ok=True)
    stage = attempt / 'root'
    if stage.exists():
        raise ValueError('original stats attempt retained; inspect/resume fixed candidate before recomputing')
    stage.mkdir()
    receipt = {'schema': 'stats-refresh-receipt-v1', 'request': request, 'started_at': datetime.now(timezone.utc).isoformat(),
               'status': 'preparing', 'producers': chosen, 'control_sha256': selected['control_sha256'], 'methods': methods}
    try:
        current = call(code_root, 'current', directory)['version']
        if current is None:
            raise ValueError('stats baseline must be explicitly seeded before enabling refresh')
        manifest = call(code_root, 'manifest', directory, version=current)
        receipt['base'] = current
        declarations = {name: method_manifest(code_root, name, root) for name in chosen}
        receipt['frozen_code'] = freeze_code(code_root, root, stage, declarations)
        projection = attempt / 'projection.json'
        durable(projection, (packed({'schema': 'stats-projection-v1', 'root': str(stage), 'original_root': str(root),
                'request': request, 'code_inputs': receipt['frozen_code']}) + '\n').encode())
        input_binding = freeze_inputs(code_root, root, stage, selected, current, manifest)
        formal = input_binding['knowledge']
        receipt['legacy_fixed_inputs'] = input_binding['fixed_data']
        receipt['k1_version'] = formal['version'] if formal else None
        core_dependencies = {key: digest for key, digest in (formal['manifest'] if formal else {}).items() if key.endswith('/build-cores.json')}
        if 'v6-history' not in chosen and core_dependencies != manifest['dependencies']:
            raise ValueError('K1 core changed; full V6 refresh required before replacing this bundle')
        args = ['--ops-root', str(stage), '--queue-entered', '--request', request]
        for flag in ['character', 'only_producer', 'outcome_since']:
            if options.get(flag):
                args += ['--' + flag.replace('_', '-'), str(options[flag])]
        for flag in ['all', 'fight_value', 'idle', 'outcome_logdb']:
            if options.get(flag):
                args.append('--' + flag.replace('_', '-'))
        env = {key: value for key, value in os.environ.items() if not key.startswith(('STS2_DATA_', 'STS2_ASSETS_', 'STS2_KNOWLEDGE_', 'STS2_FIXED_'))
               and key not in {'STS2_REFRESH_SELECTION_FILE', 'STS2_REFRESH_SELECTION_SHA256', 'CODEX_OPS_DIR'}}
        env.update(STS2_WORKSPACE=str(stage), STS2_STATS_STAGING_ROOT=str(stage),
                   STS2_STATS_STAGING_CONTRACT_SHA256=sha(ordinary(projection)),
                   OMP_NUM_THREADS='1', OPENBLAS_NUM_THREADS='1', MKL_NUM_THREADS='1', NUMEXPR_NUM_THREADS='1')
        with (attempt / 'stdout.log').open('wb') as stdout, (attempt / 'stderr.log').open('wb') as stderr:
            result = (runner or subprocess.run)([os.environ.get('STS2_PYTHON_BIN', 'python3'),
                      str(stage / 'knowledge/builders/refresh_driver.py'), *args], cwd=stage,
                      env=env, stdout=stdout, stderr=stderr, check=False,
                      pass_fds=(int(os.environ['STS2_STATS_LOCK_FD']),) if os.environ.get('STS2_STATS_LOCK_FD') else ())
        receipt['producer_exit_code'] = result.returncode
        if result.returncode:
            raise ValueError('original fixed pipeline failed; S1 remains unchanged')
        # An unrelated source publication need not wait for K; stale methods cannot publish.
        current_control = capture(root)
        if (not current_control.get('enabled') or current_control.get('directory') != selected['directory']
                or any(current_control.get('methods', {}).get(name) != value for name, value in methods.items())
                or any(method(code_root, name, root) != value for name, value in methods.items())):
            raise ValueError('stats method/admission changed while computing; retain original attempt')
        files = {}
        for path in (stage / 'knowledge').rglob('*'):
            if path.is_file() and resource_key(str(path.relative_to(stage / 'knowledge'))):
                key = str(path.relative_to(stage / 'knowledge'))
                files[key] = 'knowledge/' + key
        report = stage / 'notes/monster-db-check.md'
        if report.is_file():
            files['reports/monster-db-check.md'] = 'notes/monster-db-check.md'
        dependencies = core_dependencies if 'v6-history' in chosen else manifest['dependencies']
        candidate = {'request': request, 'base': current, 'directory': str(stage), 'files': files, 'methods': {**manifest['methods'], **methods},
                     'executed_methods': methods, 'admission_epoch': authority['epoch'],
                     'dependencies': dependencies, 'provenance': {'source': 'original-fixed-refresh', 'characters': characters,
                     'control_sha256': selected['control_sha256'], 'k1_version': receipt['k1_version'], 'code_inputs': receipt['frozen_code']}}
        path = attempt / 'candidate.json'
        durable(path, (packed(candidate) + '\n').encode())
        published = call(code_root, 'publish', directory, candidate=path)
        receipt.update(status='published', version=published['version'], publication_committed=True, candidate_sha256=sha(ordinary(path)))
        durable(attempt / 'publication.json', (packed({'request': request, 'version': published['version'],
                'candidate_sha256': receipt['candidate_sha256']}) + '\n').encode())
        from stats_launch import prepare
        receipt['ready_bundle'] = prepare(root, code_root)
    except Exception as error:
        receipt.update(status='published_ready_held' if receipt.get('publication_committed') else 'failed',
                       error_type=type(error).__name__, reason=str(error))
        if not receipt.get('publication_committed'):
            raise
        event = root / 'ops/codex-ops/queue' / ('stats-ready-held-' + sha(request.encode()) + '.md')
        durable(event, ('[stats-refresh] S1 committed but ready bundle preparation is held; request=' + request
                       + '; version=' + receipt['version'] + '; inspect original stats-refresh receipt.\n').encode())
    finally:
        receipt['ended_at'] = datetime.now(timezone.utc).isoformat()
        durable(attempt / 'receipt.json', (packed(receipt) + '\n').encode())
    return receipt


@contextmanager
def worker(root):
    """Keep the original K descriptor alive in the entire fixed worker subtree."""
    with (Path(root) / 'ops/knowledge-refresh.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        old_fd = os.environ.get('STS2_STATS_LOCK_FD')
        inheritable = os.get_inheritable(lock.fileno())
        os.set_inheritable(lock.fileno(), True)
        os.environ['STS2_STATS_LOCK_FD'] = str(lock.fileno())
        try:
            yield
        finally:
            if old_fd is None:
                os.environ.pop('STS2_STATS_LOCK_FD', None)
            else:
                os.environ['STS2_STATS_LOCK_FD'] = old_fd
            os.set_inheritable(lock.fileno(), inheritable)


def run(root, code_root, request, options, characters):
    # Match the original worker lock; never acquire any source/publication lock.
    with worker(root):
        from refresh_health import observe
        scoped = {'outcome', 'construction-opportunities', 'room-costs', 'boss-damage', 'potion-equivalents', 'v6-history', 'fight-value'}
        steps = [name + ':' + char if name in scoped else name for name in producers(options, characters)
                 for char in (characters if name in scoped else ['']) if name not in {'construction-opportunities', 'v6-history'} or char == 'silent']
        for name in steps:
            observe(root, name, request, 'running')
        try:
            result = execute(root, code_root, request, options, characters)
        except Exception:
            for name in steps:
                observe(root, name, request, 'failed')
            raise
        if result and result['status'] == 'already_published':
            # Close an interrupted original health event without asserting a
            # new publication/freshness for an already committed request.
            for name in steps:
                observe(root, name, request, 'succeeded', version=result['version'], published=False)
        elif result:
            from learning_runtime_data import OUTPUTS
            old = call(code_root, 'manifest', bind_refresh(root, code_root, request, options)['directory'], version=result['base'])['files']
            new = call(code_root, 'manifest', bind_refresh(root, code_root, request, options)['directory'], version=result['version'])['files']
            for name in steps:
                producer, _, character = name.partition(':')
                if producer == 'catalog':
                    keys = [key for key in new if key == 'catalog.json' or key.startswith('common/enemies/')]
                elif producer == 'monster-db-check':
                    keys = ['reports/monster-db-check.md']
                else:
                    keys = [key.replace('{character}', char) for key in OUTPUTS[producer]
                            for char in (characters if '{character}' in key and not character else [character])]
                changed = any(new.get(key) != old.get(key) for key in keys)
                observe(root, name, request, 'succeeded', version=result['version'], published=changed)
        return result
