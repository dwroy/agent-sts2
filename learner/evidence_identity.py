"""Bounded exact identity joins for offline JSONL evidence (never inspect prompt text)."""
import hashlib
import json
import os
from pathlib import Path


def identities(row):
    if not isinstance(row, dict):
        return {}
    state = row.get('state')
    fields = {'run_id': row.get('run_id'), 'run': row.get('run'),
              'state.run_id': state.get('run_id') if isinstance(state, dict) else None}
    fingerprint = row.get('fingerprint')
    if isinstance(fingerprint, str):
        try:
            fingerprint = json.loads(fingerprint)
        except ValueError:
            fingerprint = None
    if isinstance(fingerprint, dict):
        fields['fingerprint.run'] = fingerprint.get('run')
    return {k: v for k, v in fields.items() if isinstance(v, str) and v and v != 'run_unknown'}


def run_identity(row):
    values = set(identities(row).values())
    return next(iter(values)) if len(values) == 1 else None


def frozen_sizes(logs, streams):
    return {s: (Path(logs) / (s + '.jsonl')).stat().st_size
            if (Path(logs) / (s + '.jsonl')).exists() else None for s in streams}


def scan(path, limit, info):
    """Hash the whole frozen prefix, preserving partial/invalid rows as explicit gaps."""
    path = Path(path)
    info.update(source=str(path), source_size=limit, invalid_lines=0, incomplete_lines=0, rows=0, gap_refs=[], gap_refs_limit=5)
    if limit is None:
        info.update(status='missing', source_sha256=None)
        return
    with path.open('rb') as handle:
        if type(limit) is not int or not 0 <= limit <= os.fstat(handle.fileno()).st_size:
            raise ValueError('source size must be within the observed file')
        sha, offset, number = hashlib.sha256(), 0, 0
        while offset < limit:
            raw = handle.readline(limit - offset)
            if not raw:
                raise ValueError('source truncated during scan')
            start = offset
            offset += len(raw)
            number += 1
            sha.update(raw)
            info['rows'] += 1
            ref = dict(source=str(path), source_size=limit, line=number, offset=start,
                       bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
            if not raw.endswith(b'\n'):
                info['incomplete_lines'] += 1
                info['gap_refs'] = (info['gap_refs'] + [dict(ref, reason='incomplete_at_frozen_cutoff')])[-5:]
                continue
            try:
                row = json.loads(raw)
            except (ValueError, UnicodeDecodeError):
                info['invalid_lines'] += 1
                info['gap_refs'] = (info['gap_refs'] + [dict(ref, reason='invalid_json')])[-5:]
                continue
            yield row, ref
        info.update(status='scanned', source_sha256=sha.hexdigest())


def decision_index(path, runs, limit, max_entries=100000):
    """Index selected decisions only, then reject collisions anywhere in the same cut."""
    index, info = {}, {}
    for row, ref in scan(path, limit, info):
        rid = run_identity(row)
        did = row.get('decision_id') if isinstance(row, dict) else None
        if rid in runs and isinstance(did, str) and did:
            if did not in index:
                if len(index) >= max_entries:
                    raise ValueError('decision index limit exceeded; split the evidence batch')
                index[did] = {'run_id': rid, 'ref': ref, 'fields': identities(row)}
    verify = {}
    for row, ref in scan(path, limit, verify):
        did = row.get('decision_id') if isinstance(row, dict) else None
        if isinstance(did, str) and did in index and run_identity(row) != index[did]['run_id']:
            index[did]['conflict'] = True
            index[did]['conflict_ref'] = ref
    if verify.get('source_sha256') != info.get('source_sha256'):
        raise ValueError('decisions changed inside frozen cut')
    return index, info


def associate(row, index=None):
    fields = identities(row)
    values = set(fields.values())
    if len(values) > 1:
        return None, {'status': 'conflicting_run_fields', 'fields': fields}
    direct = next(iter(values)) if values else None
    did = row.get('decision_id') if isinstance(row, dict) else None
    linked = index.get(did) if index is not None and isinstance(did, str) else None
    if linked and (linked.get('conflict') or direct and direct != linked['run_id']):
        return None, {'status': 'conflicting_decision_identity', 'decision_id': did, 'fields': fields,
                      'decision_ref': linked['ref'], 'conflict_ref': linked.get('conflict_ref')}
    if direct:
        return direct, {'status': 'explicit_run', 'fields': fields,
                        'decision_ref': linked['ref'] if linked else None}
    if linked:
        return linked['run_id'], {'status': 'exact_decision_id', 'decision_id': did,
                                 'decision_ref': linked['ref'], 'decision_fields': linked['fields']}
    return None, {'status': 'unmatched_decision_id' if did else 'unknown_identity'}
