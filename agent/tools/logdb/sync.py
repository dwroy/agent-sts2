#!/usr/bin/env python3
"""Incremental sync of the raw JSONL logs into the log database (docs/logdb.md).

The JSONL files in logs/ stay the only raw record and are only read. For each source file the manifest
(data/logdb/manifest.json) keeps the byte offset processed so far; a sync reads only the complete lines
appended since, turns each into one compact row (tools/logdb/extract.py) and writes them as a new Parquet
shard data/logdb/<table>/part-<source>-<start>-<end>.parquet (zstd). A shard is never modified after it is
written; small shards are merged into a new one now and then and the old ones deleted. The database can be
deleted at any time and rebuilt from the JSONL.

A source is rebuilt from scratch when it was truncated or replaced (the recorded offset is past the end of
the file, the byte before it is not a newline, or the hash of the first line changed) and when its
extractor version (extract.VERSIONS) changed.

Runs at nice 19 / idle IO priority and with two DuckDB threads, so the game loop keeps the machine.

Usage:
  tools/logdb/sync.py [--logs DIR] [--db DIR] [--quiet] [--no-wait] [--upto-ts ISO] [--reset]
  --upto-ts   process only lines logged before this time (stops at the first later line; for measuring)
  --reset     delete the whole database first (full rebuild)
Run with data/logdb-venv/bin/python (needs duckdb).
"""
import argparse
import contextlib
import errno
import fcntl
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = str(Path(__file__).resolve().parents[3])  # the project root (docs/layout.md)
sys.path.insert(0, HERE)

import extract  # noqa: E402

DEFAULT_LOGS = os.path.join(ROOT, "logs")
DEFAULT_DB = os.path.join(ROOT, "data", "logdb")
MANIFEST_VERSION = 1
SHARD_ROWS = 100_000  # rows per shard while catching up (bounds the temp file and memory)
HEAD_CAP = 1 << 20  # the first line's hash covers at most this many bytes
SMALL_SHARD = 16 << 20  # shards below this size are merged ...
MERGE_AT = 8  # ... once this many consecutive small ones exist for a source
EMPTY = "part-0-empty.parquet"  # zero-row shard with the table's schema, so every view binds


def be_gentle():
    """Lowest CPU and IO priority for this process (the game loop runs next to us)."""
    try:
        os.nice(19 - os.nice(0))
    except OSError:
        pass
    if shutil.which("ionice"):
        subprocess.run(["ionice", "-c3", "-p", str(os.getpid())], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def columns_sql(table):
    return "{" + ", ".join(f"'{name}': '{kind}'" for name, kind in extract.TABLES[table]) + "}"


def select_list(table):
    return ", ".join(f'CAST(NULL AS {kind}) AS "{name}"' for name, kind in extract.TABLES[table])


@contextlib.contextmanager
def flock(path, mode, wait=True):
    """An advisory lock on `path`; yields False instead of blocking when wait=False and it is taken."""
    handle = open(path, "a+")
    try:
        try:
            fcntl.flock(handle, mode | (0 if wait else fcntl.LOCK_NB))
        except OSError as caught:
            if caught.errno in (errno.EAGAIN, errno.EACCES):
                yield False
                return
            raise
        yield True
    finally:
        handle.close()


def read_lock(db, shared=True, wait=True):
    """Readers (query.py) hold it shared while a query runs; sync holds it exclusive while deleting or
    renaming shards that replace others, so no query sees a half-swapped table."""
    return flock(os.path.join(db, "read.lock"), fcntl.LOCK_SH if shared else fcntl.LOCK_EX, wait)


class LogDb:
    def __init__(self, logs, db, quiet=False, upto_ts=None, shard_rows=SHARD_ROWS):
        self.logs = os.path.abspath(logs)
        self.db = os.path.abspath(db)
        self.quiet = quiet
        self.upto_ts = upto_ts
        self.shard_rows = shard_rows
        self.tmp = os.path.join(self.db, "tmp")
        self.manifest_path = os.path.join(self.db, "manifest.json")
        self.con = None
        self.stats = {}
        self.sources = dict(extract.SOURCES)
        self.versions = dict(extract.VERSIONS)

    # -- small helpers
    def say(self, text):
        if not self.quiet:
            print(text, file=sys.stderr)

    def duck(self):
        if self.con is None:
            import duckdb

            self.con = duckdb.connect()
            self.con.execute("SET threads = 2")
            self.con.execute("SET memory_limit = '2GB'")
            self.con.execute("SET preserve_insertion_order = true")
        return self.con

    def load_manifest(self):
        try:
            with open(self.manifest_path, encoding="utf8") as handle:
                manifest = json.load(handle)
            if manifest.get("version") == MANIFEST_VERSION:
                manifest.setdefault("sources", {})
                return manifest
        except (OSError, ValueError):
            pass
        return {"version": MANIFEST_VERSION, "sources": {}}

    def save_manifest(self, manifest):
        manifest["updated"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        tmp = self.manifest_path + ".tmp"
        with open(tmp, "w", encoding="utf8") as handle:
            json.dump(manifest, handle, indent=1, sort_keys=True)
            handle.write("\n")
        os.replace(tmp, self.manifest_path)

    def table_dir(self, table):
        return os.path.join(self.db, table)

    # -- setup and cleanup
    def ensure_layout(self):
        os.makedirs(self.tmp, exist_ok=True)
        for table in extract.TABLES:
            os.makedirs(self.table_dir(table), exist_ok=True)
            empty = os.path.join(self.table_dir(table), EMPTY)
            if os.path.exists(empty) and self.shard_columns(empty) == [name for name, _ in extract.TABLES[table]]:
                continue
            # A new table, or its columns changed (extract.TABLES): the zero-row shard carries the schema the view
            # binds to, so columns added for one source exist even while only older shards of another are there.
            with read_lock(self.db, shared=False):
                self.copy_to(f"SELECT {select_list(table)} WHERE false", empty)

    def shard_columns(self, path):
        try:
            return [row[0] for row in self.duck().execute(f"DESCRIBE SELECT * FROM read_parquet('{path}')").fetchall()]
        except Exception:  # an unreadable shard is rewritten
            return None

    def listed_shards(self, manifest):
        return {(rec["table"], shard) for rec in manifest["sources"].values() for shard in rec.get("shards", [])}

    def remove_orphans(self, manifest):
        """Shards on disk that the manifest does not list (a sync or merge that died half-way) and temp files."""
        listed = self.listed_shards(manifest)
        doomed = []
        for table in extract.TABLES:
            for name in os.listdir(self.table_dir(table)):
                if name == EMPTY:
                    continue
                if name.endswith(".tmp") or (name.endswith(".parquet") and (table, name) not in listed):
                    doomed.append(os.path.join(self.table_dir(table), name))
        if doomed:
            with read_lock(self.db, shared=False):
                for path in doomed:
                    with contextlib.suppress(FileNotFoundError):
                        os.remove(path)
            self.say(f"logdb: removed {len(doomed)} unlisted shard file(s)")
        for name in os.listdir(self.tmp):
            with contextlib.suppress(FileNotFoundError):
                os.remove(os.path.join(self.tmp, name))

    def drop_source(self, manifest, key, why):
        rec = manifest["sources"].pop(key, None)
        if rec and rec.get("shards"):
            with read_lock(self.db, shared=False):
                for shard in rec["shards"]:
                    with contextlib.suppress(FileNotFoundError):
                        os.remove(os.path.join(self.table_dir(rec["table"]), shard))
            self.save_manifest(manifest)
        if rec:
            self.say(f"logdb: {key}: rebuilding ({why})")

    # -- Parquet
    def copy_to(self, select, path):
        tmp = path + ".tmp"
        self.duck().execute(f"COPY ({select}) TO '{tmp}' (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 100000)")
        os.replace(tmp, path)

    def write_shard(self, table, key, start, end, rows_path):
        name = f"part-{key}-{start:012d}-{end:012d}.parquet"
        select = (
            f"SELECT * FROM read_json('{rows_path}', format = 'newline_delimited', columns = {columns_sql(table)}, "
            f"maximum_object_size = 67108864)"
        )
        self.copy_to(select, os.path.join(self.table_dir(table), name))
        return name

    # -- one source
    def head_hash(self, path):
        """(sha1 of the first line, its length), or None while the file has no complete line."""
        with open(path, "rb") as handle:
            line = handle.readline(HEAD_CAP)
        if not line or (not line.endswith(b"\n") and len(line) < HEAD_CAP):
            return None
        return hashlib.sha1(line).hexdigest(), len(line)

    def check_source(self, manifest, key, path):
        """Drop the source's shards when the file was truncated or replaced, or its extractor changed."""
        rec = manifest["sources"].get(key)
        if rec is None:
            return
        if rec.get("extractor") != self.versions[key]:
            return self.drop_source(manifest, key, f"extractor version {rec.get('extractor')} -> {self.versions[key]}")
        if not os.path.exists(path):
            return self.drop_source(manifest, key, "file is gone")
        size = os.path.getsize(path)
        offset = rec.get("offset", 0)
        if offset > size:
            return self.drop_source(manifest, key, f"file shrank below the synced offset ({size} < {offset})")
        if offset == 0:
            return
        with open(path, "rb") as handle:
            handle.seek(offset - 1)
            if handle.read(1) != b"\n":
                return self.drop_source(manifest, key, "synced offset is not at a line end")
            handle.seek(0)
            head = handle.read(rec.get("head_len", 0))
        if hashlib.sha1(head).hexdigest() != rec.get("head"):
            return self.drop_source(manifest, key, "first line changed (file replaced)")

    def sync_source(self, manifest, key):
        file_name, table, row_of = self.sources[key]
        path = os.path.join(self.logs, file_name)
        self.check_source(manifest, key, path)
        if not os.path.exists(path):
            return
        rec = manifest["sources"].setdefault(key, {"file": file_name, "table": table, "extractor": self.versions[key],
                                                   "offset": 0, "rows": 0, "bad": 0, "shards": []})
        size = os.path.getsize(path)
        start = rec["offset"]
        if size <= start:
            return
        started = time.time()
        added = bad = 0
        stop = False
        with open(path, "rb") as handle:
            handle.seek(start)
            pos = start
            while not stop:
                chunk_start = pos
                rows_path = os.path.join(self.tmp, f"{table}-{key}-{chunk_start}.jsonl")
                count = 0
                with open(rows_path, "w", encoding="utf8") as out:
                    while count < self.shard_rows:
                        raw = handle.readline()
                        if not raw or not raw.endswith(b"\n") or pos + len(raw) > size:
                            stop = True  # end of the snapshot, or a line still being written
                            break
                        if self.upto_ts is not None:
                            ts = extract.line_ts(raw)
                            if ts is not None and ts >= self.upto_ts:
                                stop = True
                                break
                        try:
                            row = row_of(raw, pos)
                        except (ValueError, TypeError, AttributeError, KeyError, IndexError):
                            row = None
                            bad += 1
                        pos += len(raw)
                        if row is not None:
                            out.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")))
                            out.write("\n")
                            count += 1
                if pos > chunk_start:
                    if count:
                        rec["shards"].append(self.write_shard(table, key, chunk_start, pos, rows_path))
                    if chunk_start == 0 or "head" not in rec:
                        head = self.head_hash(path)
                        if head:
                            rec["head"], rec["head_len"] = head
                    rec["offset"] = pos
                    rec["rows"] += count
                    rec["bad"] = rec.get("bad", 0) + bad
                    added += count
                    bad = 0
                    self.save_manifest(manifest)
                os.remove(rows_path)
                if count < self.shard_rows:
                    stop = True
        if added or pos > start:
            self.stats[key] = {"rows": added, "bytes": pos - start, "seconds": round(time.time() - started, 2)}
            self.say(f"logdb: {key}: +{added} rows from {(pos - start) / 1e6:.1f} MB in {time.time() - started:.1f} s")

    # -- merge small shards
    def compact(self, manifest):
        for key, rec in manifest["sources"].items():
            shards = rec.get("shards", [])
            table_dir = self.table_dir(rec["table"])
            small = []
            for shard in shards:
                try:
                    is_small = os.path.getsize(os.path.join(table_dir, shard)) < SMALL_SHARD
                except OSError:
                    is_small = False
                if is_small:
                    small.append(shard)
                else:
                    small = []
            # `small` is the trailing run of consecutive small shards (older ones were merged before).
            if len(small) < MERGE_AT:
                continue
            first_start = small[0].split("-")[-2]
            last_end = small[-1].split("-")[-1].split(".")[0]
            name = f"part-{key}-{first_start}-{last_end}.parquet"
            files = ", ".join(f"'{os.path.join(table_dir, s)}'" for s in small)
            tmp = os.path.join(table_dir, name + ".tmp")
            self.duck().execute(f"COPY (SELECT * FROM read_parquet([{files}]) ORDER BY off) TO '{tmp}' (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 100000)")
            with read_lock(self.db, shared=False):
                os.replace(tmp, os.path.join(table_dir, name))
                rec["shards"] = shards[: len(shards) - len(small)] + [name]
                self.save_manifest(manifest)
                for shard in small:
                    with contextlib.suppress(FileNotFoundError):
                        os.remove(os.path.join(table_dir, shard))
            self.say(f"logdb: {key}: merged {len(small)} small shards into {name}")

    def run(self, reset=False, wait=True):
        os.makedirs(self.db, exist_ok=True)
        with flock(os.path.join(self.db, "sync.lock"), fcntl.LOCK_EX, wait) as got:
            if not got:
                self.say("logdb: another sync is running; skipped")
                return None
            if reset:
                with read_lock(self.db, shared=False):
                    for name in list(extract.TABLES) + ["tmp"]:
                        shutil.rmtree(os.path.join(self.db, name), ignore_errors=True)
                    with contextlib.suppress(FileNotFoundError):
                        os.remove(self.manifest_path)
            started = time.time()
            self.ensure_layout()
            manifest = self.load_manifest()
            dynamic = extract.component_usage.discover(self.logs)
            self.sources.update(dynamic)
            self.versions.update({key: 1 for key in dynamic})
            for key in list(manifest["sources"]):
                if key.startswith("usage-") and key not in dynamic:
                    self.drop_source(manifest, key, "usage source is gone")
            self.remove_orphans(manifest)
            for key in self.sources:
                self.sync_source(manifest, key)
            self.compact(manifest)
            self.save_manifest(manifest)
            self.stats["seconds"] = round(time.time() - started, 2)
            return self.stats


def sync(logs=DEFAULT_LOGS, db=DEFAULT_DB, quiet=False, wait=True, upto_ts=None, reset=False, shard_rows=SHARD_ROWS):
    """Bring the database up to date with the JSONL files; returns per-source stats, or None when another
    sync holds the lock and wait=False."""
    return LogDb(logs, db, quiet=quiet, upto_ts=upto_ts, shard_rows=shard_rows).run(reset=reset, wait=wait)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--logs", default=os.environ.get("LOGDB_LOGS", DEFAULT_LOGS))
    parser.add_argument("--db", default=os.environ.get("LOGDB_DIR", DEFAULT_DB))
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--no-wait", action="store_true", help="skip instead of waiting when another sync runs")
    parser.add_argument("--upto-ts", default=None)
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--shard-rows", type=int, default=SHARD_ROWS)
    args = parser.parse_args(argv)
    be_gentle()
    stats = sync(args.logs, args.db, quiet=args.quiet, wait=not args.no_wait, upto_ts=args.upto_ts, reset=args.reset, shard_rows=args.shard_rows)
    if stats is not None and not args.quiet:
        print(json.dumps(stats, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
