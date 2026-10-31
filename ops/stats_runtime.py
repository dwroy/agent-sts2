"""Explicit S1 control and immutable refresh requests; never enable production here."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

SCHEMA = 'stats-runtime-control-v1'
BACKENDS = {'shadow', 'json', 'sqlite'}
PRODUCERS = {'monster-db', 'card-upgrades', 'outcome', 'construction-opportunities', 'room-costs',
             'boss-damage', 'potion-equivalents', 'v6-history', 'fight-value', 'move-model', 'catalog', 'monster-db-check'}


def packed(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def ordinary(path, limit=None):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.resolve() != path.absolute():
        raise ValueError('redirected/missing stats file')
    if limit is not None and path.stat().st_size > limit:
        raise ValueError('oversized stats metadata')
    return path.read_bytes()


def durable(path, raw):
    path = Path(path)
    missing, ancestor = [], path.parent
    while not ancestor.exists():
        missing.append(ancestor)
        ancestor = ancestor.parent
    if ancestor.resolve() != ancestor.absolute():
        raise ValueError('redirected stats ancestor')
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.parent.resolve() != path.parent.absolute():
        raise ValueError('redirected stats directory')
    for created in reversed(missing):
        fd = os.open(created.parent, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    if path.exists():
        if ordinary(path) != raw:
            raise ValueError('stats request identity reused')
        return
    with path.open('xb') as out:
        out.write(raw)
        out.flush()
        os.fsync(out.fileno())
    fd = os.open(path.parent, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def parse_control(root, raw):
    root = Path(root).resolve()
    body = json.loads(raw)
    allowed = {'schema', 'root', 'enabled', 'directory', 'backend', 'methods', 'retired_git_data'}
    if (set(body) != allowed or body['schema'] != SCHEMA or body['root'] != str(root)
            or type(body['enabled']) is not bool or type(body['retired_git_data']) is not bool
            or body['retired_git_data'] and not body['enabled']
            or body['backend'] not in BACKENDS or not isinstance(body['methods'], dict)
            or set(body['methods']) - PRODUCERS
            or any(not isinstance(v, str) or not re.fullmatch(r'[a-f0-9]{64}', v) for v in body['methods'].values())):
        raise ValueError('invalid stats control')
    directory = Path(body['directory'])
    if (not directory.is_absolute() or directory == root / 'data' or not directory.is_relative_to(root / 'data')
            or directory.resolve() != directory or re.match(r'^/mnt/(?:[a-z](?:/|$)|wsl/)', str(directory))):
        raise ValueError('stats runtime must remain in original host-local data')
    return {**body, 'source': 'control', 'control_sha256': sha(raw)}


def capture(root, state_dir=None):
    root = Path(root).resolve()
    state = Path(state_dir or os.environ.get('CODEX_OPS_DIR') or root / 'ops/codex-ops')
    path = state / 'stats-runtime.json'
    if not os.path.lexists(path):
        return {'enabled': False, 'root': str(root), 'source': 'absent'}
    return parse_control(root, ordinary(path, 16 * 1024))


def bind_refresh(root, code_root, request, options):
    """Call before entering the heavy queue; retries retain the original control."""
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:+-]{0,180}', request):
        raise ValueError('invalid stats refresh request')
    root, code_root = Path(root).resolve(), Path(code_root).resolve()
    path = root / 'data/stats-launches' / (sha(request.encode()) + '.json')
    identity = {'schema': 'stats-refresh-launch-v1', 'request': request, 'root': str(root),
                'code_root': str(code_root), 'options': options}
    if path.exists():
        body = json.loads(ordinary(path, 32 * 1024))
        if any(body.get(key) != value for key, value in identity.items()):
            raise ValueError('stats refresh retry changed original contract')
        return body['selection']
    selected = capture(root)
    durable(path, (packed({**identity, 'selection': selected}) + '\n').encode())
    return selected


def call(code_root, action, directory, **flags):
    """The repaired Node owns WAL IO; Python never opens stats.sqlite."""
    argv = [os.environ.get('STS2_NODE_BIN', str(Path.home() / '.local/node/bin/node')), '--import', './tools/stats-loader.mjs',
            str(Path(code_root) / 'agent/tools/stats-runtime.ts'), action, '--runtime', str(directory)]
    for name, value in flags.items():
        argv += ['--' + name.replace('_', '-'), str(value)]
    result = subprocess.run(argv, cwd=Path(code_root) / 'agent', check=True,
                            capture_output=True, text=True, timeout=120)
    return json.loads(result.stdout)


def report_environment(root, run_id):
    """Child evaluation tools inherit the finished run's data, never latest."""
    from stats_launch import original_assets
    selected = original_assets(Path(root) / 'logs/run-config.jsonl', run_id)
    if selected is None:
        return {}
    directory = Path(selected['directory'])
    if directory.resolve() != directory or not directory.is_relative_to(Path(root).resolve() / 'data'):
        raise ValueError('original report resource runtime redirected')
    saved = directory / 'launches' / (sha(selected['binding']['run_key'].encode()) + '.json')
    if ordinary(saved, 1024 * 1024) != (packed(selected) + '\n').encode():
        raise ValueError('original report resource binding differs')
    return {'STS2_ASSETS_SELECTION': packed(selected)}


def read_selected(code_root, selection, key):
    from stats_refresh import resource_key
    if not resource_key(key):
        raise ValueError('unknown report statistics resource')
    directory = Path(selection['directory'])
    version = selection['binding']['bundle']['stats_version']
    if selection['binding']['backend'] == 'json':
        exported = directory / 'json' / version
        manifest = json.loads(ordinary(exported / 'manifest.json', 1024 * 1024))
        if version != 'S1-' + sha(packed(manifest).encode()):
            raise ValueError('report fallback manifest differs')
        if key not in manifest['files']:
            return None
        raw = ordinary(exported / key, 128 * 1024 * 1024)
        if sha(raw) != manifest['files'][key]:
            raise ValueError('report fallback object differs')
        return json.loads(raw)
    manifest = call(code_root, 'manifest', directory, version=version)
    if key not in manifest['files']:
        return None
    with tempfile.TemporaryDirectory(prefix='stats-report-', dir=directory) as scratch:
        output = Path(scratch) / 'selected.json'
        call(code_root, 'read', directory, version=version, key=key, destination=output)
        return json.loads(ordinary(output, 128 * 1024 * 1024))
