"""Frozen LogDB offsets feed the original outcome reducer with complete raw bytes."""
from contextlib import contextmanager
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import sys

SOURCES = {'runs': ('runs.jsonl', 'runs_raw'), 'decisions': ('decisions.jsonl', 'decisions'), 'states': ('states.jsonl', 'frames')}


def regular(path):
    path = Path(path)
    if path.is_symlink() or path.parent.resolve() != path.parent:
        raise ValueError('linked LogDB evidence')
    return path


def digest(path, length=None):
    path = regular(path)
    value = hashlib.sha256()
    with path.open('rb') as source:
        size = source.seek(0, 2) if length is None else length
        source.seek(0)
        left = size
        while left:
            chunk = source.read(min(left, 1024 * 1024))
            if not chunk:
                raise ValueError('truncated frozen LogDB source')
            value.update(chunk)
            left -= len(chunk)
    return value.hexdigest()


class IndexedOutcome:
    def __init__(self, logs, db, since):
        self.logs, self.db = Path(logs).resolve(), Path(db).resolve()
        self.since = datetime.fromisoformat(since.replace('Z', '+00:00'))
        if self.since.tzinfo is None:
            raise ValueError('backfill cutoff requires an explicit timezone')
        self.receipt = dict(schema='outcome-logdb-input-v1', since=since, sources={}, finished_runs=0, finished_since=0)
        self.cuts, self.shards = {}, {}

    @contextmanager
    def frozen(self):
        root = Path(__file__).resolve().parents[2]
        sys.path.insert(0, str(root / 'agent/tools/logdb'))
        import sync as logsync
        import duckdb
        with logsync.read_lock(str(self.db)):
            raw = regular(self.db / 'manifest.json').read_bytes()
            manifest = json.loads(raw)
            if manifest.get('version') != 1:
                raise ValueError('unsupported LogDB source manifest')
            self.receipt['manifest_sha256'] = hashlib.sha256(raw).hexdigest()
            for stream, (name, table) in SOURCES.items():
                rec = manifest['sources'][stream]
                if rec['file'] != name or rec['table'] != table or rec['offset'] <= 0:
                    raise ValueError('missing original LogDB source binding')
                source = regular(self.logs / name)
                size = rec['offset']
                with source.open('rb') as handle:
                    handle.seek(size - 1)
                    if handle.read(1) != b'\n':
                        raise ValueError('LogDB cut is not a complete raw prefix')
                    # Appends after this complete prefix belong to a later request.
                    if source.stat().st_size > size and handle.read(1):
                        raise ValueError('LogDB is behind raw logs; synchronize before explicit outcome refresh')
                    handle.seek(0)
                    if hashlib.sha1(handle.read(rec['head_len'])).hexdigest() != rec['head']:
                        raise ValueError('LogDB raw source identity changed')
                shards = []
                for shard in rec['shards']:
                    if Path(shard).name != shard or not shard.endswith('.parquet'):
                        raise ValueError('unsafe LogDB shard')
                    path = self.db / table / shard
                    shards.append((str(path), digest(path)))
                if not shards:
                    raise ValueError('missing LogDB indexed rows')
                self.shards[stream] = shards
                self.cuts[stream] = size
                self.receipt['sources'][stream] = dict(bytes=size, sha256=digest(source, size), rows=rec['rows'], bad=rec['bad'], shards=shards)
            self.con = duckdb.connect(config={'threads': 1})
            try:
                yield self
                for stream, (name, _table) in SOURCES.items():
                    if digest(self.logs / name, self.cuts[stream]) != self.receipt['sources'][stream]['sha256']:
                        raise ValueError('raw LogDB evidence changed during reduction')
                    for path, value in self.shards[stream]:
                        if digest(path) != value:
                            raise ValueError('frozen LogDB shard changed')
                if hashlib.sha256((self.db / 'manifest.json').read_bytes()).hexdigest() != self.receipt['manifest_sha256']:
                    raise ValueError('LogDB manifest changed under read lease')
            finally:
                self.con.close()

    def lines(self, stream):
        paths = [p for p, _digest in self.shards[stream]]
        cursor = self.con.execute('SELECT off,len FROM read_parquet(?,union_by_name=true) ORDER BY off', [paths])
        count, last = 0, 0
        with (self.logs / SOURCES[stream][0]).open('rb') as source:
            while True:
                rows = cursor.fetchmany(1024)
                if not rows:
                    break
                for offset, size in rows:
                    if type(offset) is not int or type(size) is not int or offset < last or size <= 0 or offset + size > self.cuts[stream]:
                        raise ValueError('invalid/duplicate LogDB source offset')
                    source.seek(offset)
                    raw = source.read(size)
                    if len(raw) != size or not raw.endswith(b'\n'):
                        raise ValueError('incomplete indexed raw line')
                    last = offset + size
                    count += 1
                    yield raw
        if count != self.receipt['sources'][stream]['rows']:
            raise ValueError('incomplete LogDB index denominator')

    def count_runs(self, runs, included):
        self.receipt['finished_runs'] = len(runs)
        self.receipt['statistic_runs'] = len(included)
        # Match read_runs: the last original row for an ID is authoritative.
        endings = {}
        for raw in self.lines('runs'):
            row = json.loads(raw)
            if row.get('run_id') in runs:
                endings[row['run_id']] = row.get('ended')
        ids, unknown = set(), set()
        for rid, ended in endings.items():
            try:
                value = datetime.fromisoformat(ended.replace('Z', '+00:00'))
                if value.tzinfo is None:
                    raise ValueError('unknown original timezone')
            except (AttributeError, ValueError):
                unknown.add(rid)
                continue
            if value > self.since:
                ids.add(rid)
        self.receipt['finished_since'] = len(ids)
        self.receipt['statistic_since'] = len(ids.intersection(included))
        self.receipt['finished_since_ids'] = sorted(ids)
        self.receipt['unknown_ended_ids'] = sorted(unknown)
        self.receipt['no_state_ids'] = sorted(set(runs) - included)
