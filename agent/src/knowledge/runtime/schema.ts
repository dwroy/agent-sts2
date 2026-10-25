/** Schema v1: immutable revisions and releases; only candidates and the current pointer change. */
export const SCHEMA_VERSION = 4;
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS candidates(
 id TEXT PRIMARY KEY, digest TEXT NOT NULL, base TEXT, body TEXT NOT NULL CHECK(json_valid(body)),
 status TEXT NOT NULL CHECK(status IN ('submitted','validated','published')), version TEXT,
 created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS releases(
 version TEXT PRIMARY KEY, parent TEXT REFERENCES releases(version), candidate TEXT UNIQUE REFERENCES candidates(id),
 source TEXT NOT NULL, manifest TEXT NOT NULL CHECK(json_valid(manifest)),
 created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS documents(
 digest TEXT PRIMARY KEY, path TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)));
CREATE TABLE IF NOT EXISTS release_files(
 version TEXT NOT NULL REFERENCES releases(version), path TEXT NOT NULL, digest TEXT NOT NULL REFERENCES documents(digest),
 PRIMARY KEY(version,path));
CREATE TABLE IF NOT EXISTS revisions(
 revision TEXT PRIMARY KEY, path TEXT NOT NULL, entry_id TEXT NOT NULL, character TEXT NOT NULL,
 kind TEXT NOT NULL, source TEXT, confidence TEXT, evidence_status TEXT, asc_min INTEGER, asc_max INTEGER, game_version TEXT,
 payload TEXT NOT NULL CHECK(json_valid(payload)));
CREATE INDEX IF NOT EXISTS revision_scope ON revisions(character,kind,asc_min,asc_max);
CREATE INDEX IF NOT EXISTS revision_provenance ON revisions(source,evidence_status,game_version);
CREATE INDEX IF NOT EXISTS revision_identity ON revisions(path,entry_id);
CREATE TABLE IF NOT EXISTS release_entries(
 version TEXT NOT NULL REFERENCES releases(version), revision TEXT NOT NULL REFERENCES revisions(revision),
 PRIMARY KEY(version,revision));
CREATE INDEX IF NOT EXISTS release_entry_revision ON release_entries(revision,version);
CREATE TABLE IF NOT EXISTS terms(
 revision TEXT NOT NULL REFERENCES revisions(revision), category TEXT NOT NULL, term TEXT NOT NULL,
 PRIMARY KEY(revision,category,term));
CREATE INDEX IF NOT EXISTS term_lookup ON terms(category,term,revision);
CREATE TABLE IF NOT EXISTS evidence(
 revision TEXT NOT NULL REFERENCES revisions(revision), ordinal INTEGER NOT NULL, role TEXT NOT NULL,
 source TEXT, sha256 TEXT, payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(revision,ordinal));
CREATE INDEX IF NOT EXISTS evidence_source ON evidence(source,sha256,revision);
CREATE VIRTUAL TABLE IF NOT EXISTS body_search USING fts5(revision UNINDEXED, body, tokenize='trigram');
CREATE TABLE IF NOT EXISTS events(
 id INTEGER PRIMARY KEY, request TEXT UNIQUE NOT NULL, action TEXT NOT NULL, version TEXT NOT NULL REFERENCES releases(version),
 created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS run_bindings(
 run_id TEXT PRIMARY KEY, version TEXT NOT NULL REFERENCES releases(version), code TEXT NOT NULL,
 created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
`;
