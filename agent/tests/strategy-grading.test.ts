import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { KnowledgeStore, type Candidate } from "../src/knowledge/runtime/store.js";
import { KnowledgeReader, closeIndexedReaders } from "../src/knowledge/runtime/reader.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { gradingDigest, gradedBodyEligible, strategyGrading } from "../src/knowledge/strategy-grading.js";
import { parseStrategyLibrary, retrieveStrategies } from "../src/knowledge/strategy-entries.js";
import { attachDecisionKnowledge, decisionContextTool } from "../src/brain/decision-knowledge.js";
import { DecisionKnowledgeExposure } from "../src/brain/decision-knowledge-exposure.js";
import { consumerPage } from "../src/brain/tools/knowledge-projection.js";
import type { BrainRequest } from "../src/brain/types.js";

const roots: string[] = [], stores: KnowledgeStore[] = [], path = "characters/silent/strategy-entries.json", hash = "a".repeat(64);
afterEach(() => { closeIndexedReaders(); stores.forEach(s => { if (s.db.isOpen) s.close(); }); stores.length = 0; roots.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); setKnowledgeCharacter(null); });
function root() { const d = mkdtempSync(join(tmpdir(), "graded-strategy-")); roots.push(d); return d; }
function entry(id: string, grade = "B+", mechanism = false, category = "构筑组合", confidence = .2): any {
 const g = { schema: "strategy-grading-v1", grade, category, evidence_type: mechanism ? "机制事实" : grade === "A" ? "同向对照关联" : "单臂统计",
  summary: mechanism ? "机制事实（已从原件复核）；单次观察窗口：仅格式夹具。" : "非对照；仅格式夹具。", single_observation_window: mechanism,
  basis: { checkpoint_sha256: hash, original_entry_sha256: hash, assessment_sha256: hash } };
 return { id, version: "fixture", trigger: { question_types: ["card_reward"] }, strategy: "仅格式夹具，无新增游戏知识。", evidence: [{ type: "own", run: "FIXTURE00001", floor: 3, ref: "fixture", role: "support" }], source: "own",
  confidence: mechanism ? null : confidence, evidence_type: g.evidence_type, grading: g,
  formal_publication: { schema: "strategy-publication-v1", status: grade === "B−" ? "reference_only" : "published", authorization: "https://github.com/dwroy/agent-sts2/issues/85#issuecomment-6512932583", grading_sha256: gradingDigest(g as any) } };
}
const document = (entries: any[]) => JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries });
function publish(s: KnowledgeStore, id: string, entries: any[]) {
 const c: Candidate = { schema: "knowledge-candidate-v1", id, base: s.current(), character: "silent", source: "fixture", files: { [path]: document(entries) } };
 s.submit(c); s.validate(id); return s.publish(id);
}
function setup(entries: any[]) {
 setKnowledgeCharacter("silent"); const dir = root(), s = new KnowledgeStore(dir); stores.push(s); const version = publish(s, "first", entries);
 const payload = { facts: { act: 1, floor: 3, deck: [] } };
 const req = { runId: "FIXTURE00001", questionId: "q1", label: "reward/card", payload, knowledge: { mode: "tools" },
  toolContext: { label: "reward/card", payload, ascension: 10, knowledgeDir: join(dir, "snapshots", version), logsDir: dir } } as BrainRequest;
 return { s, req, dir, version };
}
const view = (req: BrainRequest, exposure?: DecisionKnowledgeExposure) => (attachDecisionKnowledge(req, { enabled: true, bytes: 8000 }, exposure).payload as any).decision_knowledge;

it("requires null only for approved mechanism facts and orders category/tier/score/specificity", () => {
 const fact = entry("fact", "B+", true), specific = entry("specific", "B+", true); specific.trigger.acts = [1];
 const all = [entry("card-a", "A", false, "单牌选牌"), fact, specific, entry("stat-low"), entry("stat-high", "B+", false, "构筑组合", .3), entry("a", "A"), entry("ref", "B−")];
 const library = parseStrategyLibrary(JSON.parse(document(all)));
 expect(retrieveStrategies(library, "reward/card", { facts: { act: 1 } }).map(e => e.id)).toEqual(["a", "stat-high", "stat-low", "specific", "fact", "ref", "card-a"]);
 expect(gradedBodyEligible(fact)).toBe(true); expect(gradedBodyEligible(all[6])).toBe(false);
 expect(strategyGrading({ ...fact, confidence: .01 })).toBeNull();
 expect(() => parseStrategyLibrary(JSON.parse(document([{ ...entry("bad"), confidence: null }])))).toThrow();
 expect(gradedBodyEligible({ ...fact, formal_publication: { ...fact.formal_publication, grading_sha256: "b".repeat(64) } })).toBe(false);
});

it("limits durable bodies across restart, repeated questions, SL and K1 changes while keeping B− queryable", async () => {
 const { req, s } = setup([entry("body", "B+", true), entry("ref", "B−")]);
 for (let i = 0; i < 3; i++) {
  const delivered = view(req, new DecisionKnowledgeExposure());
  expect(delivered).toMatchObject({ status: "ok", total_matches: 2, exposure_status: "reserved", returned: 1 });
  expect(delivered.entries.map((e: any) => e.id)).toEqual(["body"]);
 }
 const next = publish(s, "next", [entry("body", "B+", true), entry("ref", "B−")]);
 req.toolContext!.knowledgeDir = join(s.root, "snapshots", next);
 expect(view(req, new DecisionKnowledgeExposure()).entries).toEqual([]);
 expect(view({ ...req, runId: "FIXTURE00002" }, new DecisionKnowledgeExposure()).entries).toHaveLength(1);
 expect(view({ ...req, runId: undefined }, new DecisionKnowledgeExposure()).exposure_status).toBe("missing_identity");
 const queried = await decisionContextTool().run({ detail: "full", source: "strategy", document_id: "ref" }, req.toolContext!);
 const full = JSON.parse(queried.text); expect(full.next_document_offset).toBeNull(); expect(JSON.parse(full.json_fragment).grading.grade).toBe("B−");
});

it("fails closed on corrupt or busy journals, and records no more than three bodies", () => {
 const { req, dir } = setup([entry("body")]), key = createHash("sha256").update(req.runId!).digest("hex");
 view(req, new DecisionKnowledgeExposure());
 const journal = join(dir, "decision-knowledge-exposure", key + ".jsonl");
 writeFileSync(journal + ".lock", "other holder");
 expect(view(req, new DecisionKnowledgeExposure()).entries).toEqual([]);
 expect(readFileSync(journal + ".lock", "utf8")).toBe("other holder"); rmSync(journal + ".lock");
 writeFileSync(journal, "{partial"); expect(view(req, new DecisionKnowledgeExposure()).entries).toEqual([]);
});

it("reserves an ordinary strategy among four bodies without weakening the complete UTF-8 budget", () => {
 const observations = Array.from({ length: 4 }, (_, i) => ({ ...entry(`observation-${i}`, "B+", false, "构筑组合", .3),
  review_observation: { summary: "合成观察", denominators: { n: 1 }, counterexamples: [], limitations: ["固定格式"], conditions: { character: "silent" } } }));
 const { req } = setup([...observations, entry("ordinary")]);
 const result = view(req); expect(result.entries).toHaveLength(4);
 expect(result.entries.map((e: any) => e.id)).toContain("ordinary"); expect(result.ordinary_reservation).toBe("expanded");
 expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(8000);
});

it("migrates schema 4 atomically and preserves numeric history, K1 identities and null readback", () => {
 const { s, version, dir } = setup([entry("same")]); s.close();
 const old = new DatabaseSync(join(dir, "knowledge.sqlite"));
 old.exec("ALTER TABLE strategy_details RENAME TO nullable_old; CREATE TABLE strategy_details(item TEXT PRIMARY KEY REFERENCES business_items(item), strategy TEXT NOT NULL, trigger_json TEXT NOT NULL CHECK(json_valid(trigger_json)), confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1)); INSERT INTO strategy_details SELECT * FROM nullable_old; DROP TABLE nullable_old; UPDATE metadata SET value='4' WHERE key='schema';"); old.close();
 expect(() => new KnowledgeStore(dir, { migrationFailpoint: () => { throw Error("fixture interrupt"); } })).toThrow("fixture interrupt");
 const check = new DatabaseSync(join(dir, "knowledge.sqlite")); expect(check.prepare("SELECT value FROM metadata WHERE key='schema'").get()!.value).toBe("4"); check.close();
 const migrated = new KnowledgeStore(dir); stores.push(migrated); expect(migrated.current()).toBe(version);
 expect(migrated.files(version)[path]).toBe(document([entry("same")]));
 const next = publish(migrated, "null", [entry("same", "B+", true)]);
 const reader = new KnowledgeReader(dir, next);
 try { expect(reader.all({ type: "strategy", character: "silent" })[0]!.value.confidence).toBeNull(); } finally { reader.close(); }
 expect(migrated.db.prepare("SELECT confidence FROM strategy_details WHERE confidence IS NULL").all()).toHaveLength(1);
 expect(migrated.rollback(version, "fixture-rollback")).toBe(version);
});

it("returns fitting strategy full JSON in one response and larger Unicode JSON through explicit lossless cursors", () => {
 for (const size of [3500, 20000]) {
  const value = { id: "format", text: "中文😀\\\"".repeat(size) };
  let offset: number | null = 0, raw = "", parts = 0;
  while (offset !== null) {
   const result = consumerPage({ tool: "kb_strategies", input: { query: "*", detail: "full", document_id: "format", document_offset: offset },
    rows: [value], value: e => e, sources: () => [], envelope: {} });
   const part = JSON.parse(result.text); expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(24000);
   raw += part.json_fragment; offset = part.next_document_offset; parts++;
   if (offset !== null) expect(part.next_input).toEqual({ query: "*", detail: "full", document_id: "format", document_offset: offset });
  }
  expect(JSON.parse(raw)).toEqual(value); expect(parts).toBeGreaterThan(1);
 }
 const fitting = { id: "small", text: "中".repeat(4000) };
 const response = JSON.parse(consumerPage({ tool: "kb_strategies", input: { query: "*", detail: "full", document_id: fitting.id }, rows: [fitting], value: e => e, sources: () => [], envelope: {} }).text);
 expect(response.total_document_parts).toBe(1); expect(response.next_document_offset).toBeNull(); expect(JSON.parse(response.json_fragment)).toEqual(fitting);
});
