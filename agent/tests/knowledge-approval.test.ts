import { afterEach, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approvalEvidence, auditApprovedChanges, type Approval } from "../src/knowledge/runtime/approval.js";
import { KnowledgeStore, type Candidate } from "../src/knowledge/runtime/store.js";
import { classificationDigest } from "../src/knowledge/runtime/classification.js";
import { KnowledgeReader } from "../src/knowledge/runtime/reader.js";

const dirs: string[] = [], stores: KnowledgeStore[] = [];
afterEach(() => { stores.splice(0).forEach(s => s.close()); dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); });
const strategyPath = "characters/silent/strategy-entries.json", classPath = "characters/silent/classification.json";
const entry = { id: "format-fixture", version: "fixture", trigger: { question_types: ["card_reward"], acts: [1] }, strategy: "仅格式夹具", source: "own", evidence: [{ run: "SILENT000001", floor: 4 }], confidence: .25 };
const classification = { id: "class-fixture", target: { path: strategyPath, type: "strategy", id: entry.id, sha256: classificationDigest(entry) }, topics: ["build_route"], entities: [], aliases: [], evidence: ["SILENT000001"], rationale: "固定格式夹具" };
const files = (metadata: unknown = classification) => ({
 [strategyPath]: JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: [entry] }),
 [classPath]: JSON.stringify({ schema: "knowledge-classification-v1", character: "silent", entries: [metadata] }),
});
function setup() {
 const dir = mkdtempSync(join(tmpdir(), "approval-")); dirs.push(dir);
 const archive = join(dir, "playbook.md"), artifact = join(dir, "strategies.json");
 writeFileSync(archive, "# 历史证据\n\n只供留档。\n"); writeFileSync(artifact, JSON.stringify({ entries: [entry] }));
 const approved = (path: string, id: string) => ({ path, id, bytes: readFileSync(path).length, sha256: createHash("sha256").update(readFileSync(path)).digest("hex"), unit_id: "fixture-unit" });
 const approval: Approval = [approved(archive, "archive"), approved(artifact, entry.id)];
 return { dir, archive, artifact, approval };
}

it("audits mixed Markdown/JSON approvals by bytes and exact objects without parsing archives", () => {
 const { approval, archive } = setup(), original = JSON.stringify(approval);
 expect(() => auditApprovedChanges({}, files(), approval)).not.toThrow();
 expect(approvalEvidence(approval)).toEqual(approval);
 expect(JSON.stringify(approval)).toBe(original);
 writeFileSync(archive, "# changed archive\n");
 expect(() => auditApprovedChanges({}, files(), approval)).toThrow("approval changed");
 expect(() => approvalEvidence(approval)).toThrow("approval changed");
});

it("never grants object permission from an archive and requires its frozen checksum", () => {
 const { archive, approval } = setup();
 writeFileSync(archive, JSON.stringify(entry));
 const proof = { id: entry.id, path: archive, bytes: readFileSync(archive).length, sha256: createHash("sha256").update(readFileSync(archive)).digest("hex") };
 expect(() => auditApprovedChanges({}, files(), [proof])).toThrow("absent from frozen-source");
 expect(() => auditApprovedChanges({}, files(), [{ id: "archive", path: archive }, approval[1]!])).toThrow("missing archive checksum");
 expect(() => auditApprovedChanges({}, files(), [{ ...approval[1]!, bytes: 1 }])).toThrow("approval changed");
});

it("keeps malformed JSON as a rejection, even when all changes have another approval", () => {
 const { dir, approval } = setup(), broken = join(dir, "broken.json"); writeFileSync(broken, "# not JSON");
 expect(() => auditApprovedChanges({}, files(), [...approval, { id: "broken", path: broken }])).toThrow(SyntaxError);
});

it("rejects classification without a declaration or without its exact approved strategy", () => {
 const { approval } = setup();
 const { target: _target, ...undeclared } = classification;
 expect(() => auditApprovedChanges({}, files(undeclared), approval)).toThrow("invalid classification");
 expect(() => auditApprovedChanges({}, files(), [approval[0]!])).toThrow("absent from frozen-source");
 expect(() => auditApprovedChanges({}, files(), [{ ...approval[1]!, id: "another-id" }])).toThrow("absent from frozen-source");
 const changed = files(); changed[strategyPath] = changed[strategyPath].replace("仅格式夹具", "不同格式夹具");
 expect(() => auditApprovedChanges({}, changed, approval)).toThrow("absent from frozen-source");
});

it.each([
 { path: "characters/ironclad/strategy-entries.json" }, { id: "another-id" }, { type: "experience" },
 { sha256: "f".repeat(64) }, { parent_id: "wrong-parent" },
])("rejects an invalid declared classification target: %j", patch => {
 const { approval } = setup();
 expect(() => auditApprovedChanges({}, files({ ...classification, target: { ...classification.target, ...patch } }), approval)).toThrow(/classification/);
});

it("does not derive classification permission for other business types", () => {
 const { dir } = setup(), artifact = join(dir, "experience.json"), path = "characters/silent/experience.json";
 const experience = { id: "experience-fixture" };
 writeFileSync(artifact, JSON.stringify(experience));
 const c = { ...classification, target: { path, type: "experience", id: experience.id, sha256: classificationDigest(experience) } };
 expect(() => auditApprovedChanges({}, { [path]: JSON.stringify({ entries: [experience] }), [classPath]: JSON.stringify({ schema: "knowledge-classification-v1", character: "silent", entries: [c] }) }, [{ path: artifact, id: experience.id }])).toThrow("absent from frozen-source");
});

it("accepts the same submitted ID after rejection and reads it through release-bound production queries", () => {
 const { dir, approval, archive } = setup(), s = new KnowledgeStore(join(dir, "runtime")); stores.push(s);
 const candidate: Candidate = { schema: "knowledge-candidate-v1", id: "same-original-batch", base: null, character: "silent", source: "fixture", files: files() };
 const originalCandidate = JSON.stringify(candidate), originalApproval = JSON.stringify(approval), originalArchive = readFileSync(archive);
 expect(() => s.complete(candidate, "a".repeat(40), [approval[0]!])).toThrow("absent from frozen-source");
 expect(s.status(candidate.id)).toMatchObject({ status: "submitted", version: null });
 const receipt = s.complete(candidate, "a".repeat(40), approval);
 expect(s.complete(candidate, "b".repeat(40), approval)).toEqual(receipt);
 expect(s.db.prepare("SELECT count(*) n FROM releases").get()!.n).toBe(1);
 expect(s.db.prepare("SELECT count(*) n FROM events WHERE action='complete'").get()!.n).toBe(1);
 expect(s.status(candidate.id).failures).toHaveLength(1);
 const reader = new KnowledgeReader(s.root, receipt.version);
 try {
  const result = reader.query({ type: "strategy", character: "silent", topic: "build_route", limit: 10 });
  expect(JSON.stringify(result)).toContain(entry.id);
  expect(JSON.stringify(result)).toContain(classification.id);
 } finally { reader.close(); }
 expect(JSON.stringify(candidate)).toBe(originalCandidate); expect(JSON.stringify(approval)).toBe(originalApproval);
 expect(readFileSync(archive)).toEqual(originalArchive);
});

it("reuses the explicit continuation contract with evidence-only archives and linked classifications", () => {
 const { dir, approval, archive } = setup(), s = new KnowledgeStore(join(dir, "runtime")); stores.push(s);
 const seed: Candidate = { schema: "knowledge-candidate-v1", id: "seed", base: null, character: "silent", source: "fixture", files: { [strategyPath]: JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: [] }) } };
 s.complete(seed, "a".repeat(40));
 const candidate: Candidate = { ...seed, id: "original-batch", base: s.current(), files: files() }; s.submit(candidate); s.validate(candidate.id);
 s.complete({ ...seed, id: "concurrent", base: s.current() }, "a".repeat(40));
 const current = s.current()!;
 const admitted = s.admitContinuation(candidate.id, candidate.id, current, approval);
 expect(JSON.parse(admitted.continuation.evidence).approved).toEqual(approval);
 expect(s.admitContinuation(candidate.id, candidate.id, current, approval)).toEqual(admitted);
 writeFileSync(archive, "# modified\n");
 expect(() => s.complete(candidate, "a".repeat(40), approval)).toThrow("approval changed");
 writeFileSync(archive, "# 历史证据\n\n只供留档。\n");
 const receipt = s.complete(candidate, "a".repeat(40), approval);
 expect(s.complete(candidate, "b".repeat(40), approval)).toEqual(receipt);
 expect(s.status(candidate.id)).toMatchObject({ status: "validated", version: null });
});
