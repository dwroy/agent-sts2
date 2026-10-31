/** Fixed statistics are data, independent of formal K1 candidates and source releases. */
export const STATS_SCHEMA_VERSION = 1;
export const STATS_SCHEMA = `
CREATE TABLE stats_metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE stats_objects(
 sha256 TEXT PRIMARY KEY CHECK(length(sha256)=64), body BLOB NOT NULL,
 byte_length INTEGER NOT NULL CHECK(byte_length>=0 AND length(body)=byte_length));
CREATE TABLE stats_releases(
 version TEXT PRIMARY KEY, parent TEXT REFERENCES stats_releases(version),
 manifest TEXT NOT NULL CHECK(json_valid(manifest)), provenance TEXT NOT NULL CHECK(json_valid(provenance)));
CREATE TABLE stats_members(
 version TEXT NOT NULL REFERENCES stats_releases(version), resource_key TEXT NOT NULL,
 object_sha TEXT NOT NULL REFERENCES stats_objects(sha256),
 PRIMARY KEY(version,resource_key));
CREATE TABLE stats_publications(
 request TEXT PRIMARY KEY, digest TEXT NOT NULL, version TEXT NOT NULL REFERENCES stats_releases(version));
CREATE TABLE stats_switches(
 request TEXT PRIMARY KEY, version TEXT NOT NULL REFERENCES stats_releases(version));
CREATE TABLE stats_authority(singleton INTEGER PRIMARY KEY CHECK(singleton=1), epoch TEXT NOT NULL,
 body TEXT NOT NULL CHECK(json_valid(body)));
CREATE TABLE stats_authority_events(request TEXT PRIMARY KEY, digest TEXT NOT NULL, epoch TEXT NOT NULL,
 body TEXT NOT NULL CHECK(json_valid(body)));
CREATE TABLE stats_bundles(
 bundle_sha TEXT PRIMARY KEY, body TEXT NOT NULL CHECK(json_valid(body)));
CREATE TABLE stats_bindings(
 run_key TEXT PRIMARY KEY, body TEXT NOT NULL CHECK(json_valid(body)),
 bundle_sha TEXT NOT NULL REFERENCES stats_bundles(bundle_sha));
`;

const names = new Set(['monster-db.json', 'move-model.json', 'card-upgrades.json', 'monster-records.json',
 'outcome-stats.json', 'room-costs.json', 'boss-damage.json', 'potion-equivalents.json', 'fight-value.json',
 'fight-value-gates.json', 'construction-opportunities.json', 'v6-history.json']);

/** An explicit capability, never a directory-wide import of arbitrary learner JSON. */
export function statsResourceKey(key: string): boolean {
 if (key === 'catalog.json' || key === 'reports/monster-db-check.md' || key === 'common/enemies/_legacy-meta.json') return true;
 if (/^common\/enemies\/[A-Za-z0-9_~-]+\/(mechanics|model)-observed\.json$/.test(key)) return true;
 if (!/^(common|characters\/[a-z][a-z0-9_]*)\/[^/]+\.json$/.test(key)) return false;
 const name = key.split('/').at(-1)!;
 const common = ['monster-db.json', 'move-model.json', 'card-upgrades.json'].includes(name);
 return names.has(name) && (key.startsWith('common/') ? common : !common);
}
