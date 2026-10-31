"""S1 authority extension to the original checked engineering publication.

No independent source approval, writer, or lock protocol is introduced. The
original fixed_method_admission ticket owns source proof and recovery identity.
"""
import json
from pathlib import Path

from learning_runtime_store import atomic, checked_file
from stats_runtime import call, capture, ordinary, packed, parse_control, sha


def extension(root, dest, code_source, proposed=None):
    current = capture(root, dest)
    target = parse_control(root, checked_file(root, proposed)) if proposed is not None else current
    if not target.get('enabled'):
        if current.get('enabled'):
            raise ValueError('stats rollback uses backend=json; do not silently disable its source')
        return None
    if current.get('enabled') and current['directory'] != target['directory']:
        raise ValueError('stats source publication cannot rebind an active runtime directory')
    before_path = Path(dest) / 'stats-runtime.json'
    before = checked_file(root, before_path).decode() if before_path.exists() else None
    body = {key: value for key, value in target.items() if key not in {'source', 'control_sha256'}}
    authority = call(code_source, 'authority', target['directory'])
    if authority and authority['blocked']:
        raise ValueError('original stats method authority is blocked; recover its owner first')
    return {'schema': 'stats-method-publication-v1', 'directory': target['directory'],
            'before_control': before, 'before_sha256': sha(before.encode()) if before is not None else None,
            'target': body, 'before_authority': authority}


def checked_current(root, dest, ext):
    target = parse_control(root, (packed(ext['target']) + '\n').encode())
    if target['directory'] != ext['directory'] or not target['enabled']:
        raise ValueError('foreign stats method target')
    before = ext['before_control']
    if (sha(before.encode()) if before is not None else None) != ext['before_sha256']:
        raise ValueError('original stats control identity differs')
    if before is not None:
        old = parse_control(root, before.encode())
        if old['enabled'] and old['directory'] != target['directory']:
            raise ValueError('stats method target cannot rebind an active source')
    path = Path(dest) / 'stats-runtime.json'
    current = checked_file(root, path).decode() if path.exists() else None
    if current not in (ext['before_control'], ext.get('after_control')):
        raise ValueError('stats control CAS conflict; preserve original publication')
    return current


def records(ext, marker, evidence):
    """Persist deterministic requests before changing the SQLite authority."""
    before = ext['before_authority']
    methods = ext['target']['methods']
    ext['after_control'] = packed(ext['target']) + '\n'
    ext['unchanged_authority'] = bool(before and not before['blocked'] and before['methods'] == methods)
    if ext['unchanged_authority']:
        ext['block_epoch'] = ext['final_epoch'] = before['epoch']
        return
    token = marker.get('fixed_method_transaction', marker['token'])
    block = {'request': 'fixed-method:' + token + ':stats-block', 'expected': before['epoch'] if before else None,
             'methods': before['methods'] if before else {}, 'blocked': True, 'evidence_sha256': evidence}
    def epoch(record):
        signature = packed({'request': record['request'], 'expected': record['expected'], 'methods': record['methods'],
                            'blocked': record['blocked'], 'evidence': record['evidence_sha256']})
        return sha(('stats-method-authority-v1:' + signature).encode())
    ext['block_record'], ext['block_epoch'] = block, epoch(block)
    final = {'request': 'fixed-method:' + token + ':stats-admit', 'expected': ext['block_epoch'],
             'methods': methods, 'blocked': False, 'evidence_sha256': evidence}
    ext['final_record'], ext['final_epoch'] = final, epoch(final)


def transition(root, dest, ext, code_root, name):
    if ext['unchanged_authority']:
        authority = call(code_root, 'authority', ext['directory'])
        if not authority or authority['epoch'] != ext['final_epoch'] or authority['blocked']:
            raise ValueError('unchanged stats authority changed during source publication')
        return
    authority = call(code_root, 'authority', ext['directory'])
    expected_epoch = ext[name + '_epoch']
    if authority and authority['epoch'] == expected_epoch:
        return
    # A successful final commit with a lost file receipt must never be reblocked.
    if name == 'block' and authority and authority['epoch'] == ext['final_epoch']:
        return
    record = ext[name + '_record']
    if (authority['epoch'] if authority else None) != record['expected']:
        raise ValueError('stats engineering authority CAS conflict')
    path = Path(dest) / 'fixed-method-publications' / (sha(record['request'].encode()) + '.stats.json')
    raw = (packed(record) + '\n').encode()
    if path.exists():
        if checked_file(root, path) != raw:
            raise ValueError('original stats authority request changed')
    else:
        atomic(path, raw)
    actual = call(code_root, 'admit', ext['directory'], record=path)
    if actual['epoch'] != expected_epoch:
        raise ValueError('stats authority response differs from original source receipt')


def ready(root, code_root, ext):
    from stats_launch import capabilities
    body = json.loads(ordinary(Path(ext['directory']) / 'ready.json', 1024 * 1024))
    bundle = body['bundle']
    if (body['schema'] != 'stats-ready-v1' or body['root'] != str(Path(root).resolve())
            or body['directory'] != ext['directory'] or body['bundle_sha'] != sha(packed(bundle).encode())
            or bundle['capabilities_sha'] != capabilities(code_root)):
        raise ValueError('stats bundle must be prepared for the final source before this game boundary')


def finish(root, dest, ext, code_root):
    checked_current(root, dest, ext)
    ready(root, code_root, ext)
    # Only tiny control/authority CAS writes occur here. JSON mirrors were prepared earlier.
    path = Path(dest) / 'stats-runtime.json'
    if not path.exists() or checked_file(root, path).decode() != ext['after_control']:
        atomic(path, ext['after_control'].encode())
    transition(root, dest, ext, code_root, 'final')


def verify(root, dest, ext, code_root):
    if checked_current(root, dest, ext) != ext['after_control']:
        raise ValueError('stats method control not admitted')
    authority = call(code_root, 'authority', ext['directory'])
    if (not authority or authority['blocked'] or authority['epoch'] != ext['final_epoch']
            or authority['methods'] != ext['target']['methods']):
        raise ValueError('stats database authority not admitted')
    ready(root, code_root, ext)
