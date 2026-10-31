// Read-only metadata and byte comparison; no production mutation or raw payload output.
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = dirname(fileURLToPath(import.meta.url));
const root = resolve(out, '../../..');
const host = resolve(root, '../..');
const db = new DatabaseSync(resolve(host, 'data/knowledge-runtime/knowledge.sqlite'), { readOnly: true });
const hash = raw => createHash('sha256').update(raw).digest('hex');
let report;
try {
  db.exec('PRAGMA query_only=ON; BEGIN');
  const current = db.prepare("SELECT value FROM metadata WHERE key='current'").get().value;
  const schema = db.prepare("SELECT value FROM metadata WHERE key='schema'").get().value;
  const rows = db.prepare('SELECT f.path,f.digest,d.body FROM release_files f JOIN documents d ON f.digest=d.digest WHERE f.version=? ORDER BY f.path').all(current);
  report = { time: new Date().toISOString(), version: current, schema, files: rows.map(r => ({ path: r.path, digest: r.digest, bytes: Buffer.byteLength(r.body) })) };
  const strategy = rows.find(r => r.path === 'characters/silent/strategy-entries.json');
  if (strategy) {
    const value = JSON.parse(strategy.body);
    const local = readFileSync(resolve(root, 'knowledge', strategy.path));
    const live = readFileSync(resolve(host, '.worktrees/live/knowledge', strategy.path));
    report.strategy = { path: strategy.path, entries: value.entries?.length ?? null, db_sha256: hash(strategy.body),
      base_sha256: hash(local), live_sha256: hash(live), base_equal: hash(local) === hash(strategy.body), live_equal: hash(live) === hash(strategy.body),
      base_entries: JSON.parse(local).entries?.length, live_entries: JSON.parse(live).entries?.length,
      release_entries: db.prepare("SELECT count(*) n FROM release_entries e JOIN revisions r ON e.revision=r.revision WHERE e.version=? AND r.path=?").get(current, strategy.path).n };
  }
  db.exec('COMMIT');
} finally { db.close(); }
writeFileSync(resolve(out, 'k1-readback.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ version: report.version, schema: report.schema, files: report.files.length, strategy: report.strategy }));
