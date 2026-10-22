"""Append-only raw evidence index and content-addressed per-run intermediates.

Changed sources have their old prefixes byte-hashed. Exact unchanged inode/stat
tuples reuse that verification; only new rows are decoded. Rotation, truncation
and changed prefixes rebuild their index. Cached aggregates are disposable.
"""
import gzip
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import uuid

from evidence_identity import identities, run_identity


def token(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def implementation(*paths):
    return token([(str(Path(p).name), hashlib.sha256(Path(p).read_bytes()).hexdigest()) for p in paths])


def prefix_hash(path, limit):
    sha = hashlib.sha256()
    with Path(path).open('rb') as source:
        left = limit
        while left:
            part = source.read(min(left, 4 * 1024 * 1024))
            if not part:
                raise ValueError('frozen source truncated')
            sha.update(part)
            left -= len(part)
    return sha.hexdigest()


class FrozenLogIndex:
    def __init__(self, directory, logs):
        self.directory, self.logs = Path(directory), Path(logs).resolve()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.directory / 'rows.sqlite')
        self.db.execute('CREATE TABLE IF NOT EXISTS streams (name TEXT PRIMARY KEY, metadata TEXT)')
        self.db.execute('CREATE TABLE IF NOT EXISTS rows (stream TEXT, offset INTEGER, line INTEGER, bytes INTEGER, sha TEXT, rid TEXT, reason TEXT, PRIMARY KEY(stream, offset))')
        self.db.execute('CREATE INDEX IF NOT EXISTS run_rows ON rows(stream, rid, offset)')
        self.stats = dict(decoded_rows=0, indexed_rows=0, rebuilt_streams=[], rebuild_reasons={},
                          unchanged_streams=[], prefix_bytes_read=0, cache_hits=0, cache_misses=0)

    def close(self):
        self.db.close()

    def metadata(self, stream):
        found = self.db.execute('SELECT metadata FROM streams WHERE name=?', (stream,)).fetchone()
        return json.loads(found[0]) if found else None

    def update(self, stream, limit):
        path = self.logs / (stream + '.jsonl')
        if type(limit) is not int or limit < 0 or not path.exists() or path.stat().st_size < limit:
            raise ValueError('incomplete frozen source: ' + str(path))
        old = self.metadata(stream)
        stat = path.stat()
        identity = [stat.st_dev, stat.st_ino]
        stamp = [*identity, stat.st_size, stat.st_mtime_ns, stat.st_ctime_ns]
        # Within one append cycle all builders share this index. An unchanged
        # inode/stat tuple reuses the already verified prefix, without rereading it.
        if old and old.get('generation') and old.get('stat') == stamp and old['source_size'] == limit and old['source'] == str(path):
            self.stats['unchanged_streams'].append(stream)
            self.stats['indexed_rows'] += old['rows']
            return old
        sha = hashlib.sha256()
        reusable = bool(old and old['source'] == str(path) and old['source_size'] <= limit
                        and old.get('identity') == identity and old.get('generation'))
        reason = 'cold' if old is None else ('rotation_or_identity' if old.get('identity') != identity
                 or old['source'] != str(path) else 'truncated' if old['source_size'] > limit else 'prefix_changed')
        if reusable:
            with path.open('rb') as source:
                left = old['source_size']
                while left:
                    data = source.read(min(left, 4 * 1024 * 1024))
                    if not data:
                        raise ValueError('source truncated during prefix check')
                    sha.update(data)
                    self.stats['prefix_bytes_read'] += len(data)
                    left -= len(data)
            reusable = sha.hexdigest() == old['source_sha256']
        if not reusable:
            old, sha = None, hashlib.sha256()
            self.stats['rebuilt_streams'].append(stream)
            self.stats['rebuild_reasons'][stream] = reason
        start = old['source_size'] if old else 0
        info = dict(old) if old else dict(source=str(path), rows=0, invalid_lines=0, incomplete_lines=0,
                                         gap_refs=[], gap_refs_limit=5, generation=uuid.uuid4().hex,
                                         rebuild_reason=reason)
        number = info['rows']
        with self.db:
            if old is None:
                self.db.execute('DELETE FROM rows WHERE stream=?', (stream,))
            with path.open('rb') as source:
                source.seek(start)
                offset = start
                while offset < limit:
                    data = source.readline(limit - offset)
                    if not data or not data.endswith(b'\n'):
                        raise ValueError('incomplete frozen source: ' + str(path))
                    number += 1
                    sha.update(data)
                    digest = hashlib.sha256(data).hexdigest()
                    rid, reason = None, None
                    try:
                        row = json.loads(data)
                    except (ValueError, UnicodeDecodeError):
                        reason = 'invalid_json'
                        info['invalid_lines'] += 1
                        if len(info['gap_refs']) < info['gap_refs_limit']:
                            info['gap_refs'].append(dict(source=str(path), source_size=limit, offset=offset, line=number, bytes=len(data), sha256=digest, reason=reason))
                    else:
                        if len(set(identities(row).values())) > 1:
                            raise ValueError('conflicting explicit run fields')
                        rid = run_identity(row)
                    self.db.execute('INSERT INTO rows VALUES (?,?,?,?,?,?,?)', (stream, offset, number, len(data), digest, rid, reason))
                    offset += len(data)
                    self.stats['decoded_rows'] += 1
            for ref in info['gap_refs']:
                ref['source_size'] = limit
            after = path.stat()
            after_stamp = [after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns]
            info.update(source_size=limit, rows=number, status='scanned', source_sha256=sha.hexdigest(),
                        identity=identity, stat=stamp if stamp == after_stamp else None)
            self.db.execute('INSERT OR REPLACE INTO streams VALUES (?,?)', (stream, json.dumps(info)))
        self.stats['indexed_rows'] += number
        return info

    def references(self, stream, run_ids=None, start_offset=0):
        sql, args = 'SELECT offset,line,bytes,sha,rid,reason FROM rows WHERE stream=?', [stream]
        sql += ' AND offset>=?'
        args.append(start_offset)
        if run_ids is not None:
            if not run_ids:
                return
            sql += ' AND rid IN (' + ','.join('?' for _ in run_ids) + ')'
            args.extend(run_ids)
        info = self.metadata(stream)
        for offset, line, size, sha, rid, reason in self.db.execute(sql + ' ORDER BY offset', args):
            yield dict(source=info['source'], source_size=info['source_size'], offset=offset, line=line, bytes=size, sha256=sha), rid, reason

    def rows(self, stream, run_ids=None, on_gap=None):
        with (self.logs / (stream + '.jsonl')).open('rb') as source:
            for ref, _rid, reason in self.references(stream, run_ids):
                if reason:
                    if on_gap is None:
                        raise ValueError('unlisted malformed source row')
                    on_gap(dict(ref, reason=reason))
                    continue
                source.seek(ref['offset'])
                data = source.read(ref['bytes'])
                if hashlib.sha256(data).hexdigest() != ref['sha256']:
                    raise ValueError('indexed original row SHA mismatch')
                yield json.loads(data), ref

    def run_signature(self, rid, streams):
        sha = hashlib.sha256()
        for stream in streams:
            sha.update(str((self.logs / (stream + '.jsonl')).resolve()).encode())
            for ref, _rid, reason in self.references(stream, [rid]):
                sha.update(json.dumps([stream, ref['offset'], ref['bytes'], ref['sha256'], reason]).encode())
        return sha.hexdigest()

    def cached(self, namespace, key, produce):
        identity = token([namespace, key])
        path = self.directory / 'objects' / identity[:2] / (identity + '.json.gz')
        try:
            with gzip.open(path, 'rt') as source:
                envelope = json.load(source)
            if envelope['identity'] != identity or token(envelope['value']) != envelope['sha256']:
                raise ValueError('cache content checksum mismatch')
            self.stats['cache_hits'] += 1
            return envelope['value']
        except (OSError, ValueError, KeyError, EOFError):
            pass
        self.stats['cache_misses'] += 1
        value = produce()
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(dir=path.parent, prefix='.cache-')
        try:
            with os.fdopen(fd, 'wb') as target, gzip.GzipFile(fileobj=target, mode='wb', compresslevel=1, mtime=0) as out:
                out.write(json.dumps(dict(identity=identity, sha256=token(value), value=value), separators=(',', ':'), allow_nan=False).encode())
            os.replace(temporary, path)
        finally:
            Path(temporary).unlink(missing_ok=True)
        return value
