/** Replay fixed original artifacts through public store APIs in a fresh isolated runtime. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { KnowledgeStore, type Candidate, type Approval } from "../../../agent/src/knowledge/runtime/store.js";
import { KnowledgeReader } from "../../../agent/src/knowledge/runtime/reader.js";
import { canonical } from "../../../agent/src/knowledge/runtime/classification.js";
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const root = resolve(process.argv[2] ?? ".artifacts/issue73-frozen"), runtime = resolve(process.argv[3] ?? ".artifacts/issue73-replay-runtime");
assert(!existsSync(runtime), "retain previous replay; choose a new isolated destination");
const read = (name: string) => JSON.parse(readFileSync(join(root, name), "utf8"));
const frozen = JSON.parse(readFileSync(new URL("./frozen-inputs.json", import.meta.url), "utf8"));
for (const [name, ref] of Object.entries(frozen) as Array<[string, { sha256: string; bytes: number }]>) {
 const raw = readFileSync(join(root, name)); assert.equal(raw.length, ref.bytes); assert.equal(sha(raw), ref.sha256);
}
const candidate = read("candidate.json") as Candidate, approval = read("approval.json") as Approval;
assert.equal(sha(readFileSync(join(root, "candidate.json"))), "88dc35cd2a74f4849106153b7ead92109786f2491b9d20dd4470849043a80616");
mkdirSync(runtime, { recursive: true }); const s = new KnowledgeStore(runtime);
try {
 const lineage = read("lineage.json") as Array<{ version: string; candidate: Candidate }>;
 for (const row of lineage) { s.submit(row.candidate); s.validate(row.candidate.id); assert.equal(s.publish(row.candidate.id), row.version); }
 const current = s.current()!; assert.equal(current, "K1-c23573a8a8c796eab98534d87d106c34f24dbd8da743ed01ec3ed20b7a1c2377");
 s.submit(candidate); s.validate(candidate.id);
 const old = s.db.prepare("SELECT * FROM candidates WHERE id=?").get(candidate.id);
 assert.equal(old!.digest, "5773057c4c17ded98ca973de07c079e6dc16f34438c2cb5703ef91095876a455");
 assert.throws(() => s.complete(candidate, "a".repeat(40), approval), /version conflict/);
 const admitted = s.admitContinuation(candidate.id, candidate.id, current, approval);
 const proof = JSON.parse(admitted.continuation.evidence), successor = s.db.prepare("SELECT body FROM candidates WHERE id=?").get(admitted.continuation.successor)!;
 const merged = JSON.parse(String(successor.body)).files;
 const reviewed = read("review.json");
 for (const path of Object.keys(candidate.files)) assert.equal(canonical(JSON.parse(merged[path])), canonical(JSON.parse(reviewed.files[path])));
 assert.equal(proof.delta.filter((d: any) => d.path.endsWith("strategy-entries.json")).length, 4);
 assert.equal(proof.delta.filter((d: any) => d.path.endsWith("classification.json")).length, 4);
 // Leave the admitted, unpublished fixture available for the real Python callback probe.
 const checkpoint = join(resolve(".artifacts/issue73-callback-backup-final.sqlite")); await s.backup(checkpoint);
 const receipt = s.complete(candidate, "a".repeat(40), approval);
 assert.deepEqual(s.db.prepare("SELECT * FROM candidates WHERE id=?").get(candidate.id), old);
 assert.deepEqual(s.complete(candidate, "b".repeat(40), approval), receipt);
 const reader = new KnowledgeReader(runtime, receipt.version);
 try {
  for (const d of proof.delta.filter((d: any) => d.path.endsWith("strategy-entries.json"))) {
   const queried = reader.query({ character: "silent", type: "strategy", id: d.id }); assert.equal(queried.length, 1);
   assert.equal(sha(canonical(queried[0]!.value)), d.after);
  }
 } finally { reader.close(); }
 const releaseCount = s.db.prepare("SELECT count(*) n FROM releases WHERE candidate=?").get(receipt.publication_candidate)!.n;
 const completionCount = s.db.prepare("SELECT count(*) n FROM events WHERE request=?").get(receipt.event_request)!.n;
 assert.equal(releaseCount, 1); assert.equal(completionCount, 1);
 const result = { isolated: true, frozen_lineage_replayed: lineage.length, original_candidate_raw_sha256: sha(readFileSync(join(root, "candidate.json"))),
  original_candidate_unchanged: true, original_digest: old!.digest, original_base: candidate.base, admitted_base: current,
  successor: receipt.publication_candidate, delta: proof.delta, combined_matches_original_review: true,
  combined_strategy_count: JSON.parse(s.files(receipt.version)["characters/silent/strategy-entries.json"]!).entries.length,
  combined_classification_count: JSON.parse(s.files(receipt.version)["characters/silent/classification.json"]!).entries.length,
  exact_four_strategy_consumer_bodies: true, actual_publications: releaseCount, completion_events: completionCount, receipt };
 writeFileSync(new URL("./original-replay.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
 console.log(JSON.stringify({ isolated: true, original_unchanged: true, delta_objects: proof.delta.length, releaseCount, completionCount }));
} finally { s.close(); }
