/** Offline reconstruction of the two immutable K1 releases reported by ops. */
import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { closeIndexedReaders } from "../../../agent/src/knowledge/runtime/reader.js";
import { buildKnowledgeTools } from "../../../agent/src/brain/tools/agent-knowledge.js";
import { ToolHost } from "../../../agent/src/brain/tools/mcp-server.js";
import { setKnowledgeCharacter } from "../../../agent/src/knowledge/files.js";

const args = process.argv.slice(2), arg = (key: string) => { const i = args.indexOf(key); assert(i >= 0 && args[i + 1], `missing ${key}`); return args[i + 1]!; };
const source = resolve(arg("--source-runtime")), output = resolve(arg("--output"));
assert(output.startsWith(resolve(".artifacts") + "/") && output !== source, "output must be an isolated .artifacts directory");
mkdirSync(output, { recursive: true });
const db = new DatabaseSync(join(source, "knowledge.sqlite"), { readOnly: true });
db.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000");
const versions = ["K1-98d57ac54451c8e114ecaad5fe4fd198f5542e493ee2010385500f9367d756d6", "K1-533bcdcf7832a397912dde52919892be2ddf92a6b97f560d27f4b00409a25c95"];
const ids = ["silent-route-hp-observation", "silent-brain-first-boss-power-hp-review", "silent-brain-blade-flexible-formation-review"];
const receipts: any[] = [], selectorNegatives: any[] = [], sameVersionReplay: any[] = [];
const localRoot = join(output, "runtime"); mkdirSync(localRoot, { recursive: true });
await backup(db, join(localRoot, "knowledge.sqlite"));
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
for (const [index, version] of versions.entries()) {
 const documents = db.prepare("SELECT f.path,d.body,f.digest FROM release_files f JOIN documents d ON d.digest=f.digest WHERE f.version=? ORDER BY f.path").all(version);
 assert(documents.length > 0);
 for (const row of documents) assert.equal(hash(String(row.body)), row.digest);
 const files = Object.fromEntries(documents.map(r => [String(r.path), String(r.body)]));
 const snapshot = join(localRoot, "snapshots", version);
 for (const [path, text] of Object.entries(files)) { const dest = join(snapshot, path); mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, text); }
 const originals = JSON.parse(files["characters/silent/strategy-entries.json"]!).entries;
 for (const id of ids.filter(id => index !== 0 || id !== ids[1])) {
  const original = originals.find((e: any) => e.id === id); assert(original);
  const ctx = { ascension: 10, label: "event/act-plan", act: 1, knowledgeDir: snapshot, logsDir: snapshot,
   payload: { facts: { act: 1, floor: 16, hp: "50/70", deck: "FOOTWORK\nTEST_CARD", deck_size: 20 } } };
  // Fixed selector facts are not a natural game observation or effectiveness sample.
  ctx.label = original.trigger.question_types.includes("act_plan") ? "event/act-plan" : "reward/card";
  const call = async (input: Record<string, unknown>) => {
   const result = await new ToolHost(buildKnowledgeTools(ctx), ctx).call("kb_strategies", input);
   assert(!result.isError, result.text); assert(Buffer.byteLength(result.text) <= 24000);
   return { ...result, data: JSON.parse(result.text) };
  };
  setKnowledgeCharacter("silent");
  const positive = await call({ query: id, limit: 1, offset: 0 }), e = positive.data.entries[0];
  assert.equal(positive.data.returned, 1, JSON.stringify({id, label:ctx.label, result:positive.data})); assert.equal(positive.data.total_matches, 1);
  assert.deepEqual(e.trigger, original.trigger); assert.equal(e.strategy, original.strategy);
  assert.equal(e.confidence, original.confidence); assert.equal(e.evidence_status, original.evidence_status);
  let cursor: number | null = 0, raw = "", pages = 0, digest: string | null = null;
  while (cursor !== null) {
   const full = (await call({ query: id, detail: "full", document_id: id, document_offset: cursor })).data;
   assert.equal(full.document_offset, cursor); digest ??= full.document_sha256; assert.equal(full.document_sha256, digest);
   raw += full.json_fragment; cursor = full.next_document_offset; assert(++pages < 100);
  }
  assert.equal(hash(raw), digest); assert.deepEqual(JSON.parse(raw), original);
  const negatives: Record<string, number> = {};
  if (original.trigger.floor) {
   ctx.payload.facts.floor = 99;
   negatives.floor = (await call({ query: id, detail: "full", document_id: id })).data.entries.length;
   assert.equal(negatives.floor, 0); ctx.payload.facts.floor = 16;
  }
  if (original.trigger.deck_cards) {
   ctx.payload.facts.deck = "TEST_CARD";
   negatives.missing_required_card = (await call({ query: id })).data.entries.length;
   assert.equal(negatives.missing_required_card, 0); ctx.payload.facts.deck = "FOOTWORK\nTEST_CARD";
  }
  setKnowledgeCharacter("ironclad");
  negatives.ironclad = (await call({ query: id, detail: "full", document_id: id })).data.entries.length;
  assert.equal(negatives.ironclad, 0);
  receipts.push({ version, id, raw_bytes: Buffer.byteLength(raw), raw_sha256: digest, response_bytes: Buffer.byteLength(positive.text), returned: 1,
   trigger_body_confidence_conflict_exact: true, original_document_roundtrip: true, pages, negatives });
 }
 const negativeContext = { ascension: 10, act: 1, label: "event/act-plan", knowledgeDir: snapshot, logsDir: snapshot,
  payload: { facts: { act: 1, floor: 16, hp: "50/70", deck: "SNAKEBITE\nACCELERANT", deck_size: 20 } } };
 setKnowledgeCharacter("silent");
 const negativeHost = new ToolHost(buildKnowledgeTools(negativeContext), negativeContext);
 const negativeResult = await negativeHost.call("kb_strategies", { query: "silent-brain-poison-footwork-realization-review", detail: "full", document_id: "silent-brain-poison-footwork-realization-review" });
 assert(!negativeResult.isError); assert.equal(JSON.parse(negativeResult.text).returned, 0);
 negativeContext.payload.facts.deck += "\nFOOTWORK";
 const restored = await negativeHost.call("kb_strategies", { query: "silent-brain-poison-footwork-realization-review", limit: 1 });
 assert(!restored.isError); assert.equal(JSON.parse(restored.text).returned, 1);
 selectorNegatives.push({ version, missing_footwork_returned: 0, required_cards_restored_returned: 1, same_bound_version: true });
 if (index === 1) {
  // Five reported failures have three distinct IDs. Repeated IDs remain explicit, not extra knowledge items.
  const cases = [ids[0]!, ids[2]!, ...ids];
  const h = new ToolHost(buildKnowledgeTools(negativeContext), negativeContext);
  for (const [caseIndex, id] of cases.entries()) {
   const result = await h.call("kb_strategies", { query: id, limit: 1, offset: 0 });
   assert(!result.isError, result.text); assert(Buffer.byteLength(result.text) <= 24000);
   const p = JSON.parse(result.text), original = originals.find((e: any) => e.id === id);
   assert.equal(p.knowledge_version, version); assert.equal(p.returned, 1); assert.equal(p.total_matches, 1);
   assert.deepEqual(p.entries[0].trigger, original.trigger); assert.equal(p.entries[0].strategy, original.strategy);
   assert.equal(p.entries[0].confidence, original.confidence); assert.equal(p.entries[0].evidence_status, original.evidence_status);
   sameVersionReplay.push({ case_index: caseIndex, version, id, total_matches: 1, returned: 1, bytes: Buffer.byteLength(result.text), trigger_body_confidence_conflict_exact: true });
  }
 }
 for (const [path, text] of Object.entries(files)) assert.equal(readFileSync(join(snapshot, path), "utf8"), text);
 closeIndexedReaders();
 writeFileSync(join(output, `manifest-${index}.json`), JSON.stringify(documents.map(r => ({ path: r.path, digest: r.digest })), null, 2));
}
db.close(); setKnowledgeCharacter(null);
const result = { schema: "issue78-frozen-k1-probe-v1", source_access: "readonly SQLite consistent backup; exact K1 release identities/manifests; isolated snapshot documents checked unchanged",
 scope: "five failure records, three distinct IDs; per-original-version plus same-current-version replay; not LIVE installation, natural model queries, adoption or benefit", receipts, selectorNegatives, sameVersionReplay, production_writes: 0, game_or_model_calls: 0 };
writeFileSync(join(output, "receipt.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ cases: receipts.length, passed: true, bytes: receipts.map(r => r.response_bytes) }));
