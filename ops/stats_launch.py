"""Prepare outside the game boundary; launch only reads a small sealed bundle."""
import argparse
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
import uuid

from stats_runtime import call, capture, durable, ordinary, packed, sha

CAPABILITIES = ['agent/src/knowledge/resources.ts', 'agent/src/knowledge/resource-fs.ts',
                'agent/src/brain/tools/mcp-launch.ts',
                'agent/src/knowledge/stats-required.ts',
                'agent/src/knowledge/assets-binding.ts', 'agent/src/knowledge/runtime/stats-schema.ts',
                'agent/src/knowledge/runtime/stats-store.ts', 'agent/src/knowledge/runtime-data.ts',
                'agent/src/knowledge/runtime-paths.ts', 'agent/src/construction/data.ts',
                'agent/src/sim/boss-clock.ts', 'agent/src/sim/v6-history-pack.ts', 'agent/src/v6/projection-input.ts',
                'agent/src/knowledge/render/data.ts', 'agent/src/reflex/rollout-live.ts', 'agent/src/reflex/fight-value.ts',
                'agent/src/sim/global-build-pool.ts', 'agent/src/reflex/rollout.ts', 'agent/src/sim/boss-start.ts',
                'agent/src/knowledge/experience.ts', 'agent/src/knowledge/catalog.ts', 'agent/src/knowledge/card-upgrades.ts',
                'agent/src/knowledge/query-sources.ts', 'agent/src/knowledge/potion-equivalents.ts',
                'agent/src/knowledge/monster-db.ts', 'agent/src/knowledge/room-costs.ts']


def capabilities(code_root):
    return sha(packed({name: sha(ordinary(Path(code_root) / name)) for name in CAPABILITIES}).encode())


def requires_stats(code_root):
    path = Path(code_root) / 'agent/src/knowledge/stats-required.ts'
    if not path.exists():
        return False  # An original pre-migration source retains its contract.
    values = re.findall(r'^export const STATS_REQUIRED = (true|false);$', ordinary(path, 4096).decode(), re.MULTILINE)
    if len(values) != 1:
        raise ValueError('unknown source data-retirement contract')
    return values[0] == 'true'


def prepare(root, code_root, selection=None):
    """The natural refresh/deployment owner calls this while a game is in progress."""
    root, code_root = Path(root).resolve(), Path(code_root).resolve()
    selected = selection if selection is not None else capture(root)
    if not selected['enabled']:
        return {'status': 'disabled'}
    directory = Path(selected['directory'])
    version = call(code_root, 'current', directory)['version']
    if not version:
        raise ValueError('stats baseline is not seeded')
    manifest = call(code_root, 'manifest', directory, version=version)
    from learning_runtime_data import knowledge_binding
    formal = knowledge_binding(root)
    if any(not formal or formal['manifest'].get(key) != digest for key, digest in manifest['dependencies'].items()):
        return {'status': 'held_dependency', 'previous_ready_retained': (directory / 'ready.json').is_file()}
    # The operational view is an immutable set of original completion identities,
    # not an assertion that their findings have become formal knowledge.
    from learning_runtime import capture as operational_capture
    operational = operational_capture(root)
    view = None
    if operational.get('enabled'):
        database = Path(operational['directory']) / 'learning.sqlite'
        if not database.is_file():
            raise ValueError('original operational database unavailable')
        connection = sqlite3.connect(database.as_uri() + '?mode=ro', uri=True, timeout=1)
        try:
            connection.execute('PRAGMA query_only=ON')
            rows = list(connection.execute('SELECT id,digest FROM completions ORDER BY id'))
        finally:
            connection.close()
        raw = packed({'schema': 'operational-resource-view-v1', 'completions': rows}).encode()
        view = sha(raw)
        durable(directory / 'operational-views' / (view + '.json'), raw)
    call(code_root, 'verify', directory, version=version)
    bundle = {'schema': 'knowledge-resource-bundle-v1', 'stats_version': version,
              'k1_version': formal['version'] if formal else None, 'operational_view_sha': view,
              'capabilities_sha': capabilities(code_root), 'dependencies': manifest['dependencies']}
    digest = sha(packed(bundle).encode())
    body = {'schema': 'stats-ready-v1', 'root': str(root), 'directory': str(directory), 'bundle_sha': digest,
            'bundle': bundle, 'methods': manifest['methods']}
    raw = (packed(body) + '\n').encode()
    durable(directory / 'ready-bundles' / (digest + '.json'), raw)
    target = directory / 'ready.json'
    temporary = directory / ('.ready-' + uuid.uuid4().hex)
    durable(temporary, raw)
    os.replace(temporary, target)
    fd = os.open(directory, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)
    return {'status': 'ready', 'bundle_sha': digest, 'stats_version': version}


def original_assets(config_log, run_id):
    path = Path(config_log)
    if not path.is_file():
        raise ValueError('original run config unavailable')
    with path.open('rb') as stream:
        stream.seek(0, 2)
        size = stream.tell()
        stream.seek(max(0, size - 2 * 1024 * 1024))
        if size > 2 * 1024 * 1024:
            stream.readline()
        lines = stream.read().splitlines()
    for raw in reversed(lines):
        value = json.loads(raw)
        if value.get('run_id') == run_id:
            return value.get('knowledge', {}).get('assets')
    raise ValueError('original resource/run binding unavailable')


def launch(root, code_root, screen, run_id, session, config_log, code, command):
    root, code_root = Path(root).resolve(), Path(code_root).resolve()
    env = {key: value for key, value in os.environ.items() if not key.startswith('STS2_ASSETS_')}
    existing = screen not in ('MAIN_MENU', 'CHARACTER_SELECT', 'GAME_OVER')
    saved_launch = root / 'data/stats-game-launches' / (sha(('launch:' + str(session)).encode()) + '.json')
    if not existing and saved_launch.is_file():
        selection = json.loads(ordinary(saved_launch, 1024 * 1024))
        if selection == {'disabled': True}:
            if capture(root).get('retired_git_data'):
                raise ValueError('original disabled launch requires its original legacy source')
            return command, env
        existing = True
        original = selection
    elif existing:
        if not re.fullmatch(r'[A-Z0-9]{12}', run_id):
            # With no S1 selected, preserve the original launcher while the
            # mod has not supplied a run identity. Retired data cannot use it.
            if not capture(root).get('enabled') and not requires_stats(code_root):
                return command, env
            raise ValueError('unknown existing run identity')
        original = original_assets(config_log, run_id)
        if original is None:
            if capture(root).get('retired_git_data'):
                raise ValueError('original legacy run needs retained original code/data; cannot invent S1 binding')
            return command, env
        selection = original
    if existing:
        directory = Path(selection['directory'])
        if not directory.is_relative_to(root / 'data') or directory.resolve() != directory:
            raise ValueError('original stats runtime redirected')
        prior = directory / 'launches' / (sha(selection['binding']['run_key'].encode()) + '.json')
        if ordinary(prior, 1024 * 1024) != (packed(selection) + '\n').encode():
            raise ValueError('original durable stats launch binding differs')
        if selection['binding']['bundle']['capabilities_sha'] != capabilities(code_root):
            raise ValueError('original resource capability differs; retain original recovery entry')
    else:
        selected = capture(root)
        if not selected['enabled']:
            if requires_stats(code_root):
                raise ValueError('retired source data requires its prepared S1 runtime; no empty legacy fallback')
            durable(saved_launch, (packed({'disabled': True}) + '\n').encode())
            return command, env
        directory = Path(selected['directory'])
        ready = json.loads(ordinary(directory / 'ready.json', 1024 * 1024))
        bundle = ready['bundle']
        if (ready['schema'] != 'stats-ready-v1' or ready['root'] != str(root) or ready['directory'] != str(directory)
                or ready['bundle_sha'] != sha(packed(bundle).encode()) or bundle['capabilities_sha'] != capabilities(code_root)
                ):
            raise ValueError('prepared resource bundle no longer matches deployed capabilities/methods')
        key = 'launch:' + session
        if not re.fullmatch(r'[a-f0-9]{40}', code) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:+-]{0,180}', key):
            raise ValueError('invalid original resource launch identity')
        # Persist the small run binding with exclusive files. Never contend with
        # the stats WAL writer while a game is waiting at the launch boundary.
        binding = {'run_key': key, 'bundle_sha': ready['bundle_sha'], 'code_sha': code,
                   'backend': 'sqlite' if selected['backend'] == 'sqlite' else 'json', 'bundle': bundle}
        selection = {'directory': str(directory), 'binding': binding, 'mode': selected['backend']}
        if selected['backend'] == 'shadow':
            log = root / 'logs/stats-shadow' / (sha(key.encode()) + '.jsonl')
            log.parent.mkdir(parents=True, exist_ok=True)
            selection['shadow_log'] = str(log)
        # This selection is the run-config contract; it never follows later controls.
        durable(directory / 'launches' / (sha(key.encode()) + '.json'), (packed(selection) + '\n').encode())
        durable(saved_launch, (packed(selection) + '\n').encode())
    env['STS2_ASSETS_SELECTION'] = packed(selection)
    version = selection['binding']['bundle']['k1_version']
    if version is not None:
        env['STS2_ASSETS_K1_VERSION'] = version
    return command, env


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True)
    parser.add_argument('--code-root', required=True)
    parser.add_argument('--prepare', action='store_true')
    parser.add_argument('--control')
    for key in ['screen', 'run-id', 'session', 'config-log', 'code']:
        parser.add_argument('--' + key)
    args, command = parser.parse_known_args()
    if args.control and not args.prepare:
        parser.error('--control is preparation-only; it does not enable a runtime')
    try:
        if args.prepare:
            from stats_runtime import parse_control
            selected = parse_control(args.root, ordinary(Path(args.control).resolve(), 16 * 1024)) if args.control else None
            print(packed(prepare(args.root, args.code_root, selected)))
        else:
            if not command or command[0] != '--' or len(command) < 2:
                parser.error('requires -- command')
            argv, env = launch(args.root, args.code_root, args.screen, args.run_id or '', args.session,
                               args.config_log, args.code, command[1:])
            os.execvpe(argv[0], argv, env)
    except (OSError, ValueError, KeyError, TypeError) as error:
        print('stats launch/preparation held: ' + type(error).__name__, file=sys.stderr)
        sys.exit(78)
