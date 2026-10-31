import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KnowledgeStore, type Candidate, type Approval } from "../src/knowledge/runtime/store.js";
import { classificationDigest } from "../src/knowledge/runtime/classification.js";
import { mergeApprovedDelta } from "../src/knowledge/runtime/continuation.js";
import { main } from "../tools/knowledge-runtime.js";
const code = "a".repeat(40), strategyPath = "characters/silent/strategy-entries.json", classPath = "characters/silent/classification.json";
const dirs: string[] = [], stores: KnowledgeStore[] = [];
afterEach(() => { vi.restoreAllMocks(); stores.forEach(s => s.db.isOpen && s.close()); stores.length = 0; dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); });
const strategy = (id: string) => ({ id, version: "fixture", trigger: { question_types: ["card_reward"], acts: [1] }, strategy: "仅格式夹具", source: "own", evidence: [{ run: "SILENT000001", floor: 4, role: "contradict" }], confidence: .25 });
const classified = (entry: ReturnType<typeof strategy>) => ({ id: `class-${entry.id}`, target: { path: strategyPath, type: "strategy", id: entry.id, sha256: classificationDigest(entry) }, topics: ["build_route"], entities: [], aliases: [], evidence: ["SILENT000001"], rationale: "固定格式夹具" });
function files(entries: ReturnType<typeof strategy>[]) { return { [strategyPath]: JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries }), [classPath]: JSON.stringify({ schema: "knowledge-classification-v1", character: "silent", entries: entries.map(classified) }) }; }
function setup() {
 const dir = mkdtempSync(join(tmpdir(), "continuation-")); dirs.push(dir); const s = new KnowledgeStore(join(dir, "runtime")); stores.push(s);
 const a = strategy("original"), b = strategy("concurrent"), changed = { ...a, strategy: "格式夹具修订" };
 const publish = (c: Candidate) => { s.submit(c); s.validate(c.id); return s.publish(c.id); };
 const candidate = (id: string, body: Record<string, string>, base = s.current()): Candidate => ({ schema: "knowledge-candidate-v1", id, base, character: "silent", source: "fixture", files: body });
 const base = publish(candidate("seed", files([a])));
 const c = candidate("batch", files([changed])); s.submit(c); s.validate(c.id);
 const current = publish(candidate("parallel", files([a, b])));
 const artifact = join(dir, "approved.json"); writeFileSync(artifact, JSON.stringify([changed, classified(changed)]));
 const approval: Approval = [{ id: changed.id, path: artifact }, { id: classified(changed).id, path: artifact }];
 return { s, dir, a, b, changed, c, current, base, artifact, approval, candidate, publish };
}
it("explicitly admits reviewed disjoint objects, preserving immutable original and concurrent bytes", async () => {
 const f = setup(), { s, c, current, approval, b } = f;
 const original = s.db.prepare("SELECT * FROM candidates WHERE id=?").get(c.id);
 expect(() => s.complete(c, code, approval)).toThrow("version conflict");
 const admitted = s.admitContinuation(c.id, c.id, current, approval);
 expect(admitted.continuation).toMatchObject({ original: c.id, batch: c.id, old_base: c.base, new_base: current });
 expect(JSON.parse(admitted.continuation.evidence).delta).toHaveLength(2);
 expect(s.admitContinuation(c.id, c.id, current, approval)).toEqual(admitted);
 const receipt = s.complete(c, code, approval);
 expect(receipt).toMatchObject({ candidate: c.id, publication_candidate: admitted.continuation.successor, event_request: "complete:batch", code });
 expect(s.db.prepare("SELECT * FROM candidates WHERE id=?").get(c.id)).toEqual(original);
 const actual = JSON.parse(s.files(receipt.version)[strategyPath]!);
 expect(actual.entries).toEqual([f.changed, b]);
 expect(s.query({ version: receipt.version, character: "silent", kind: "classification" })).toHaveLength(2);
 const reopened = new KnowledgeStore(s.root); stores.push(reopened);
 expect(reopened.complete(c, "b".repeat(40), approval)).toEqual(receipt);
 expect(s.db.prepare("SELECT count(*) n FROM events WHERE action='complete'").get()!.n).toBe(1);
 expect(s.db.prepare("SELECT count(*) n FROM releases WHERE candidate=?").get(receipt.publication_candidate)!.n).toBe(1);
 // CLI recovers the original batch's receipt, never the successor as a new learner batch.
 const candidatePath = join(f.dir, "candidate.json"), receiptPath = join(f.dir, "receipt.json"), approvedPath = join(f.dir, "approval.json");
 writeFileSync(candidatePath, JSON.stringify(c)); writeFileSync(approvedPath, JSON.stringify(approval));
 await main(["complete", "--runtime", s.root, "--candidate", candidatePath, "--id", c.id, "--code", code, "--approval", approvedPath, "--receipt", receiptPath]);
 expect(JSON.parse(readFileSync(receiptPath, "utf8"))).toEqual(receipt);
});
it("refuses same-object concurrent edits, unsupported headers/deletion/paths and wrong batch", () => {
 const { s, c, current, approval, a } = setup();
 expect(() => s.admitContinuation(c.id, "another-batch", current, approval)).toThrow("batch");
 const before = files([a]), updated = files([{ ...a, strategy: "另一格式修订" }]);
 expect(() => mergeApprovedDelta("silent", before, c.files, updated)).toThrow("object conflict");
 expect(() => mergeApprovedDelta("silent", before, { [strategyPath]: JSON.stringify({ ...JSON.parse(c.files[strategyPath]!), schema: "other" }) }, before)).toThrow("header");
 expect(() => mergeApprovedDelta("silent", before, files([]), before)).toThrow("delete");
 expect(() => mergeApprovedDelta("silent", before, { "characters/ironclad/strategy-entries.json": "{}" }, before)).toThrow("unsupported");
 expect(() => mergeApprovedDelta("silent", before, { "characters/silent/experience.json": "{}" }, before)).toThrow("unsupported");
});
it("refuses unapproved source delta and bad classification target before admission", () => {
 const { s, c, current, approval, artifact, changed } = setup();
 writeFileSync(artifact, JSON.stringify([classified(changed)]));
 expect(() => s.admitContinuation(c.id, c.id, current, approval)).toThrow("absent from frozen-source");
 expect(s.status(c.id).continuation).toBeUndefined();
 const wrong = { ...c, id: "bad-target", files: { ...c.files, [classPath]: JSON.stringify({ schema: "knowledge-classification-v1", character: "silent", entries: [{ ...classified(changed), target: { ...classified(changed).target, sha256: "f".repeat(64) } }] }) } };
 s.submit(wrong); expect(() => s.validate(wrong.id)).toThrow("stale classification");
 expect(() => s.admitContinuation(wrong.id, wrong.id, current, approval)).toThrow("stale classification");
});
it("retains admitted relation and rejects current movement during snapshot IO with a real writer CAS", () => {
 const f = setup(), { s, c, current, approval } = f;
 s.admitContinuation(c.id, c.id, current, approval);
 const other = new KnowledgeStore(s.root); stores.push(other);
 const later = f.candidate("later", files([f.a, f.b, strategy("third")])); other.submit(later); other.validate(later.id);
 const verify = s.verifySnapshot.bind(s); let moved = false;
 vi.spyOn(s, "verifySnapshot").mockImplementation(manifest => { const result = verify(manifest); if (!moved) { moved = true; other.publish(later.id); } return result; });
 expect(() => s.complete(c, code, approval)).toThrow("version conflict");
 expect(s.status(c.id).continuation).toBeDefined(); expect(s.status(c.id).completion).toBeUndefined();
 expect(s.status(c.id).failures[0].reason).toBe("version conflict");
 expect(s.db.prepare("SELECT count(*) n FROM events WHERE action='complete'").get()!.n).toBe(0);
});
it("rolls back publication and receipt together, retries orphan snapshot and preserves bound approval", () => {
 const { s, c, current, approval, artifact } = setup();
 const admitted = s.admitContinuation(c.id, c.id, current, approval);
 expect(() => s.complete(c, code, approval, () => { throw Error("crash"); })).toThrow("crash");
 expect(s.current()).toBe(current); expect(s.status(c.id).completion).toBeUndefined();
 expect(s.status(admitted.continuation.successor).status).toBe("validated");
 const bytes = readFileSync(artifact); writeFileSync(artifact, bytes.toString() + " ");
 expect(() => s.complete(c, code, approval)).toThrow("approval changed");
 writeFileSync(artifact, bytes); const receipt = s.complete(c, code, approval);
 s.rollback(current, "test-rollback");
 expect(s.complete(c, code, approval)).toEqual(receipt); expect(s.current()).toBe(current);
 expect(s.db.prepare("SELECT count(*) n FROM events WHERE action='complete'").get()!.n).toBe(1);
});
it("rolls back a receipt inserted before a crash in the same publication transaction", () => {
 const { s, c, current, approval } = setup(); s.admitContinuation(c.id, c.id, current, approval);
 const original = (s as any).recordCompletion.bind(s);
 const spy = vi.spyOn(s as any, "recordCompletion").mockImplementation((...args: any[]) => { original(...args); throw Error("crash after receipt insertion"); });
 expect(() => s.complete(c, code, approval)).toThrow("crash after receipt");
 expect(s.current()).toBe(current); expect(s.status(c.id).completion).toBeUndefined();
 expect(s.db.prepare("SELECT count(*) n FROM events WHERE action='complete'").get()!.n).toBe(0);
 spy.mockRestore(); expect(s.complete(c, code, approval).candidate).toBe(c.id);
});
it("keeps the ordinary candidate path and immutable receipt across retries", () => {
 const { s, candidate, a, b } = setup();
 const ordinary = candidate("ordinary", files([a, b, strategy("ordinary")]));
 const receipt = s.complete(ordinary, code);
 expect(receipt.publication_candidate).toBe(ordinary.id); expect(s.status(ordinary.id).status).toBe("published");
 expect(s.complete(ordinary, "b".repeat(40))).toEqual(receipt);
 expect(() => s.complete({ ...ordinary, source: "changed" }, code)).toThrow("idempotency");
});
