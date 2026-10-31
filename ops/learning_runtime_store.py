"""Immutable operational records and fixed-method data releases, separate from decision knowledge.

Uses DELETE journaling: the Python SQLite shipped on this host predates the WAL
reset fix required by the knowledge runtime. No connection is shared with K1.
"""
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import tempfile

ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.:+-]{0,180}")
SHA = re.compile(r"[a-f0-9]{64}")
KINDS = {"postmortem", "audit", "finding", "evidence", "counterevidence", "proposal-link", "audit-status", "refresh"}


def packed(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def checked_file(base, path, limit=32 * 1024 * 1024, *, offset=0, length=None):
    """Do not follow a scratch/evidence link or read credential-named inputs."""
    base, path = Path(base).resolve(), Path(path)
    if not path.is_absolute():
        path = base / path
    path.relative_to(base)
    if any(part in (".", "..") or part.startswith(".env") or "api_key" in part.lower() for part in path.relative_to(base).parts):
        raise ValueError("unsafe artifact path")
    current = path
    while current != base:
        if current.is_symlink():
            raise ValueError("linked artifact retained")
        current = current.parent
    if type(offset) is not int or offset < 0 or length is not None and (type(length) is not int or not 1 <= length <= limit):
        raise ValueError("invalid artifact byte range")
    size = path.stat().st_size if path.is_file() else -1
    if size < 0 or length is None and size > limit or length is not None and offset + length > size:
        raise ValueError("missing or oversized artifact")
    # Open the final component without following links; verify its identity after read.
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        before = os.fstat(fd)
        with os.fdopen(fd, "rb", closefd=False) as stream:
            stream.seek(offset)
            raw = stream.read(length if length is not None else limit + 1)
        after = os.fstat(fd)
        stable = (before.st_dev, before.st_ino) == (after.st_dev, after.st_ino)
        if length is None:
            stable = stable and (before.st_size, before.st_mtime_ns) == (after.st_size, after.st_mtime_ns)
        if len(raw) > limit or length is not None and len(raw) != length or not stable:
            raise ValueError("artifact changed during read")
        current = path.stat()
        if (current.st_dev, current.st_ino) != (before.st_dev, before.st_ino):
            raise ValueError("artifact replaced during read")
        return raw
    finally:
        os.close(fd)


def atomic(path, raw):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".learning-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
        directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        Path(temp).unlink(missing_ok=True)


class Store:
    def __init__(self, directory, readonly=False):
        self.directory = Path(directory).resolve()
        path = self.directory / "learning.sqlite"
        if path.is_symlink():
            raise ValueError("linked runtime database")
        if not readonly:
            self.directory.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path.as_uri() + ("?mode=ro" if readonly else "?mode=rwc"), uri=True, timeout=5)
        self.db.row_factory = sqlite3.Row
        version = self.db.execute("PRAGMA user_version").fetchone()[0]
        if version not in (0, 1) or readonly and version != 1 or version == 0 and self.db.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0]:
            self.db.close()
            raise ValueError("unknown operational database schema")
        self.db.execute("PRAGMA foreign_keys=ON")
        if not readonly:
            self.db.execute("PRAGMA journal_mode=DELETE")
            self.db.execute("PRAGMA synchronous=FULL")
            self.db.executescript("""
            PRAGMA user_version=1;
            CREATE TABLE IF NOT EXISTS objects(digest TEXT PRIMARY KEY, body BLOB NOT NULL);
            CREATE TABLE IF NOT EXISTS completions(
              id TEXT PRIMARY KEY, digest TEXT NOT NULL, task TEXT NOT NULL, character TEXT NOT NULL,
              body TEXT NOT NULL CHECK(json_valid(body)), receipt TEXT NOT NULL CHECK(json_valid(receipt)));
            CREATE TABLE IF NOT EXISTS submissions(
              batch TEXT NOT NULL, digest TEXT NOT NULL REFERENCES objects(digest), task TEXT NOT NULL, character TEXT NOT NULL,
              PRIMARY KEY(batch,digest));
            CREATE TABLE IF NOT EXISTS submission_events(
              id INTEGER PRIMARY KEY, batch TEXT NOT NULL, digest TEXT NOT NULL, state TEXT NOT NULL, error TEXT,
              created TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
              FOREIGN KEY(batch,digest) REFERENCES submissions(batch,digest));
            CREATE INDEX IF NOT EXISTS submission_scope ON submissions(character,task,batch);
            CREATE INDEX IF NOT EXISTS submission_history ON submission_events(batch,digest,id);
            CREATE TABLE IF NOT EXISTS records(
              character TEXT NOT NULL, id TEXT NOT NULL, revision TEXT NOT NULL,
              completion TEXT NOT NULL REFERENCES completions(id), kind TEXT NOT NULL,
              status TEXT, payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(character,id,revision));
            CREATE INDEX IF NOT EXISTS records_scope ON records(character,kind,completion);
            CREATE INDEX IF NOT EXISTS records_status ON records(character,kind,status);
            CREATE TABLE IF NOT EXISTS record_evidence(
              completion TEXT NOT NULL REFERENCES completions(id), record_id TEXT NOT NULL, ordinal INTEGER NOT NULL,
              role TEXT NOT NULL, source_path TEXT NOT NULL, source_sha256 TEXT NOT NULL REFERENCES objects(digest),
              character TEXT NOT NULL, run TEXT, ascension INTEGER, payload TEXT NOT NULL CHECK(json_valid(payload)),
              PRIMARY KEY(completion,record_id,ordinal));
            CREATE INDEX IF NOT EXISTS operational_evidence_scope ON record_evidence(character,run,ascension,role);
            CREATE INDEX IF NOT EXISTS operational_evidence_source ON record_evidence(source_sha256,completion,record_id);
            CREATE TABLE IF NOT EXISTS links(
              completion TEXT NOT NULL REFERENCES completions(id), kind TEXT NOT NULL, target TEXT NOT NULL,
              PRIMARY KEY(completion,kind,target));
            CREATE INDEX IF NOT EXISTS links_target ON links(kind,target,completion);
            CREATE TABLE IF NOT EXISTS data_releases(
              version TEXT PRIMARY KEY, parent TEXT, request TEXT UNIQUE NOT NULL, digest TEXT NOT NULL,
              manifest TEXT NOT NULL CHECK(json_valid(manifest)), provenance TEXT NOT NULL CHECK(json_valid(provenance)));
            CREATE TABLE IF NOT EXISTS pointers(name TEXT PRIMARY KEY, version TEXT NOT NULL REFERENCES data_releases(version));
            CREATE TABLE IF NOT EXISTS data_bindings(
              run TEXT PRIMARY KEY, version TEXT NOT NULL REFERENCES data_releases(version), code TEXT NOT NULL,
              managed_paths TEXT NOT NULL CHECK(json_valid(managed_paths)));
            CREATE TABLE IF NOT EXISTS switches(request TEXT PRIMARY KEY, version TEXT NOT NULL REFERENCES data_releases(version));
            CREATE TABLE IF NOT EXISTS data_attempts(request TEXT PRIMARY KEY, version TEXT,
              payload TEXT NOT NULL CHECK(json_valid(payload)));
            """)

    def close(self):
        self.db.close()

    @contextmanager
    def transaction(self):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            yield
            self.db.commit()
        except BaseException:
            self.db.rollback()
            raise

    def completion(self, ident):
        row = self.db.execute("SELECT receipt FROM completions WHERE id=?", (ident,)).fetchone()
        return json.loads(row[0]) if row else None

    def submit_raw(self, batch, task, character, raw):
        digest = sha(raw)
        with self.transaction():
            self.db.execute("INSERT OR IGNORE INTO objects VALUES(?,?)", (digest, raw))
            inserted = self.db.execute("INSERT INTO submissions VALUES(?,?,?,?) ON CONFLICT(batch,digest) DO NOTHING", (batch, digest, task, character)).rowcount
            if inserted:
                self.db.execute("INSERT INTO submission_events(batch,digest,state) VALUES(?,?,'received')", (batch, digest))
        return digest

    def submission_state(self, batch, digest, state, error=None):
        if state not in ("pending", "published"):
            raise ValueError("invalid submission outcome")
        with self.transaction():
            previous = self.db.execute("SELECT state,error FROM submission_events WHERE batch=? AND digest=? ORDER BY id DESC LIMIT 1", (batch, digest)).fetchone()
            if previous is None or tuple(previous) != (state, error):
                self.db.execute("INSERT INTO submission_events(batch,digest,state,error) VALUES(?,?,?,?)", (batch, digest, state, error))

    def submission_history(self, batch):
        return [dict(row) for row in self.db.execute("SELECT digest,state,error,created FROM submission_events WHERE batch=? ORDER BY id", (batch,))]

    def complete(self, body, objects, engineering=False):
        identity = body["id"]
        digest = sha(packed(body).encode())
        receipt = {"schema": "operational-completion-v1", "id": identity, "digest": digest,
                   "task": body["task"], "character": body["character"], "records": len(body["records"]),
                   "source_delivery": False, "parent_closed": False, "engineering_required": engineering}
        with self.transaction():
            prior = self.db.execute("SELECT digest,receipt FROM completions WHERE id=?", (identity,)).fetchone()
            if prior:
                if prior[0] != digest:
                    raise ValueError("completion ID reused with different bytes")
                return json.loads(prior[1])
            for digest_key, raw in objects.items():
                if sha(raw) != digest_key:
                    raise ValueError("corrupt object")
                self.db.execute("INSERT OR IGNORE INTO objects VALUES(?,?)", (digest_key, raw))
            self.db.execute("INSERT INTO completions VALUES(?,?,?,?,?,?)", (identity, digest, body["task"], body["character"], packed(body), packed(receipt)))
            for record in body["records"]:
                payload = packed(record)
                status = record["payload"].get("status")
                self.db.execute("INSERT INTO records VALUES(?,?,?,?,?,?,?) ON CONFLICT(character,id,revision) DO NOTHING", (body["character"], record["id"], sha(payload.encode()), identity, record["kind"], status if isinstance(status, str) else None, payload))
                for ordinal, evidence in enumerate(record["evidence"]):
                    self.db.execute("INSERT INTO record_evidence VALUES(?,?,?,?,?,?,?,?,?,?)", (identity, record["id"], ordinal,
                                    "contradict" if record["kind"] == "counterevidence" else "source", evidence["path"], evidence["sha256"],
                                    body["character"], evidence.get("run"), evidence.get("ascension"), packed(evidence)))
            for kind in ("parents", "proposals", "ledger_ids", "runs"):
                for target in body[kind]:
                    self.db.execute("INSERT INTO links VALUES(?,?,?)", (identity, kind, target))
        return receipt

    def records(self, character, kind=None, limit=100, offset=0, run=None):
        if not 1 <= limit <= 100 or not 0 <= offset <= 100000:
            raise ValueError("query bounds")
        rows = self.db.execute("SELECT completion,payload FROM records WHERE character=? AND (? IS NULL OR kind=?) AND (? IS NULL OR EXISTS(SELECT 1 FROM links WHERE links.completion=records.completion AND links.kind='runs' AND links.target=?)) ORDER BY rowid LIMIT ? OFFSET ?",
                               (character, kind, kind, run, run, limit, offset))
        return [{"completion": r[0], **json.loads(r[1])} for r in rows]

    def report(self, ident):
        row = self.db.execute("SELECT body FROM completions WHERE id=?", (ident,)).fetchone()
        if row is None:
            raise ValueError("unknown operational completion")
        digest = json.loads(row[0])["report"]["sha256"]
        result = self.db.execute("SELECT body FROM objects WHERE digest=?", (digest,)).fetchone()
        if result is None or sha(result[0]) != digest:
            raise ValueError("report object corrupt/missing")
        return result[0]

    def run_ids(self, character):
        return {row[0] for row in self.db.execute("SELECT l.target FROM links l JOIN completions c ON c.id=l.completion WHERE l.kind='runs' AND c.character=? AND c.task='postmortem'", (character,))}

    def current(self):
        row = self.db.execute("SELECT version FROM pointers WHERE name='data'").fetchone()
        return row[0] if row else None

    def manifest(self, version):
        row = self.db.execute("SELECT manifest FROM data_releases WHERE version=?", (version,)).fetchone()
        if not row:
            raise ValueError("unknown data version")
        return json.loads(row[0])

    def knowledge_dependencies(self, version, managed_paths=None):
        """Resolve effective leaves' origin metadata along this D1 ancestry only."""
        remaining = self.manifest(version)
        if managed_paths is not None:
            remaining = {name: digest for name, digest in remaining.items() if any(
                pattern == name or pattern.replace("{character}", name.split("/")[1]) == name for pattern in managed_paths)}
        required = {}
        while remaining and version:
            row = self.db.execute("SELECT parent,manifest,provenance FROM data_releases WHERE version=?", (version,)).fetchone()
            if row is None:
                raise ValueError("broken data ancestry")
            parent = self.manifest(row[0]) if row[0] else {}
            touched = [name for name, digest in remaining.items() if parent.get(name) != digest]
            if touched:
                for name, digest in json.loads(row[2]).get("knowledge_dependencies", {}).items():
                    if name.replace("build-cores.json", "v6-history.json") not in touched:
                        continue
                    if name in required and required[name] != digest:
                        raise ValueError("conflicting data knowledge dependencies")
                    required[name] = digest
                for name in touched:
                    remaining.pop(name)
            version = row[0]
        return required

    def snapshot(self, version, manifest=None):
        manifest = manifest if manifest is not None else self.manifest(version)
        destination = self.directory / "data-snapshots" / version
        for name, digest in manifest.items():
            if not re.fullmatch(r"(?:common|characters/[a-z][a-z0-9_]*)/[a-z0-9-]+\.json", name) or not SHA.fullmatch(digest):
                raise ValueError("unsafe snapshot manifest")
            row = self.db.execute("SELECT body FROM objects WHERE digest=?", (digest,)).fetchone()
            if row is None or sha(row[0]) != digest:
                raise ValueError("missing/corrupt snapshot object")
            path = destination / name
            current = path
            while current != self.directory:
                if current.is_symlink():
                    raise ValueError("linked immutable snapshot path")
                current = current.parent
            if path.exists():
                if sha(checked_file(destination, path, 128 * 1024 * 1024)) != digest:
                    raise ValueError("immutable snapshot changed")
            else:
                atomic(path, row[0])
        return str(destination)

    def publish(self, request, base, files, provenance):
        if not ID.fullmatch(request) or not files:
            raise ValueError("data request identity/outputs missing")
        signature = sha(packed({"base": base, "files": {p: sha(raw) for p, raw in files.items()}, "provenance": provenance}).encode())
        with self.transaction():
            prior = self.db.execute("SELECT version,digest FROM data_releases WHERE request=?", (request,)).fetchone()
            if prior:
                if prior[1] != signature:
                    raise ValueError("data request ID conflict")
                self.snapshot(prior[0])
                return prior[0]
            if base != self.current():
                raise ValueError("data version conflict; preserve candidate")
            manifest = self.manifest(base) if base else {}
            for name, raw in files.items():
                digest = sha(raw)
                self.db.execute("INSERT OR IGNORE INTO objects VALUES(?,?)", (digest, raw))
                manifest[name] = digest
            version = "D1-" + sha(packed({"manifest": manifest, "provenance": provenance, "request": request, "parent": base}).encode())
            # Files are durable before a pointer can become visible. A crash here leaves only reusable orphan files.
            self.snapshot(version, manifest)
            self.db.execute("INSERT INTO data_releases VALUES(?,?,?,?,?,?)", (version, base, request, signature, packed(manifest), packed(provenance)))
            self.db.execute("INSERT OR REPLACE INTO pointers VALUES('data',?)", (version,))
        return version

    def bind(self, run, code, managed_paths=None):
        if not ID.fullmatch(run) or not re.fullmatch(r"[a-f0-9]{40}", code):
            raise ValueError("invalid data binding")
        with self.transaction():
            prior = self.db.execute("SELECT version,code,managed_paths FROM data_bindings WHERE run=?", (run,)).fetchone()
            if prior:
                version = prior[0]
                selected = json.loads(prior[2])
            else:
                version = self.current()
                if not version:
                    raise ValueError("data baseline not installed")
                selected = sorted(set(managed_paths if managed_paths is not None else self.manifest(version)))
                self.db.execute("INSERT INTO data_bindings VALUES(?,?,?,?)", (run, version, code, packed(selected)))
        return {"version": version, "snapshot": self.snapshot(version), "run": run, "code": prior[1] if prior else code, "managed_paths": selected}

    def rollback(self, version, request):
        self.manifest(version)
        self.snapshot(version)
        with self.transaction():
            prior = self.db.execute("SELECT version FROM switches WHERE request=?", (request,)).fetchone()
            if prior:
                if prior[0] != version:
                    raise ValueError("rollback ID conflict")
                return version
            self.db.execute("INSERT INTO switches VALUES(?,?)", (request, version))
            self.db.execute("INSERT OR REPLACE INTO pointers VALUES('data',?)", (version,))
        return version

    def backup(self, destination):
        destination = Path(destination)
        if destination.exists():
            raise ValueError("backup destination exists")
        target = sqlite3.connect(destination)
        try:
            self.db.backup(target)
        finally:
            target.close()

    def data_receipt(self, request):
        row = self.db.execute("SELECT payload FROM data_attempts WHERE request=?", (request,)).fetchone()
        return json.loads(row[0]) if row else None

    @classmethod
    def restore(cls, backup, directory):
        directory = Path(directory)
        if directory.exists():
            raise ValueError("restore requires a new directory")
        store = cls(directory)
        source = sqlite3.connect(Path(backup).resolve().as_uri() + "?mode=ro", uri=True)
        try:
            source.backup(store.db)
            if store.db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise ValueError("backup integrity failure")
            for digest, raw in store.db.execute("SELECT digest,body FROM objects"):
                if sha(raw) != digest:
                    raise ValueError("backup object checksum failure")
            for ident, digest, body, receipt in store.db.execute("SELECT id,digest,body,receipt FROM completions"):
                if sha(packed(json.loads(body)).encode()) != digest or json.loads(receipt).get("id") != ident or json.loads(receipt).get("digest") != digest:
                    raise ValueError("backup completion checksum failure")
            for version, in store.db.execute("SELECT version FROM data_releases"):
                store.snapshot(version)
            return store
        except BaseException:
            store.close()
            raise
        finally:
            source.close()
