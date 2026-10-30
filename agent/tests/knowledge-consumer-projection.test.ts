/** Synthetic oversized entries exercise the actual bound production ToolDefs. */
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { KnowledgeStore } from "../src/knowledge/runtime/store.js";
import { closeIndexedReaders } from "../src/knowledge/runtime/reader.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { consumerPage, consumerProjection } from "../src/brain/tools/knowledge-projection.js";
import { reflex } from "./v6-fixtures.js";

const dirs: string[] = [], stores: KnowledgeStore[] = [];
afterEach(() => { closeIndexedReaders(); stores.splice(0).forEach(s => s.close()); dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); setKnowledgeCharacter(null); });
function dir() { const d = mkdtempSync(join(tmpdir(), "consumer-projection-")); dirs.push(d); return d; }
const long = "格式证据😀\"\\\n".repeat(1000);
const entry = (id = "oversized-strategy") => ({ id, version: "fixture", source: "own", confidence: .25,
 trigger: { question_types: ["card_reward"], acts: [1], floor: { min: 5, max: 18 }, deck_cards: [{ name: "TEST_CARD", count: { min: 1 } }] },
 strategy: "格式测试正文，非游戏知识", evidence_status: "conflict",
 evidence: [{ run: "SILENT000001", floor: 5, role: "support", ref: long }, { run: "SILENT000002", floor: 6, role: "contradict", ref: "反证保持" }],
 limits: ["合成夹具，不能用于游戏"] });
const experience = { id: "oversized-experience", scope: "general:deck", asc: [0, 20], lesson: "格式测试结论", status: "active", confidence: "low",
 n_support: 1000, n_contradict: 1, evidence: Array.from({ length: 1000 }, (_, i) => `SYNTHETIC_${i}`), contradicting: ["COUNTEREXAMPLE"], last_seen: "2026-10-26" };
function fixture() {
 const r = { ...reflex, directions: undefined, source_experience: ["TEST_EXPERIENCE"], evidence: { n_support: 1000, n_contradict: 2,
  observations: Array.from({ length: 1000 }, (_, i) => ({ run_id: `SYNTHETIC_${i}`, floor: 8, turn: 1 })) } };
 const files = {
  "characters/silent/strategy-entries.json": JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: Array.from({ length: 7 }, (_, i) => entry(`oversized-${i}`)) }),
  "characters/silent/experience.json": JSON.stringify({ version: "fixture", entries: [experience] }),
  "characters/silent/reflex.json": JSON.stringify({ schema: "reflex-file-v1", character: "silent", entries: [r] }),
 };
 const root = dir(), s = new KnowledgeStore(root); stores.push(s);
 s.submit({ schema: "knowledge-candidate-v1", id: "fixture", base: null, character: "migration", source: "fixture", files }); s.validate("fixture"); const version = s.publish("fixture");
 const snapshot = String(s.bind("FIXTURE", "fixed-code").snapshot);
 setKnowledgeCharacter("silent");
 const ctx = { knowledgeDir: snapshot, logsDir: snapshot, ascension: 0, act: 1, label: "reward/card", payload: { facts: { act: 1, floor: 10, deck: "TEST_CARD" } } };
 const call = async (name: string, input: Record<string, unknown>) => {
  const result = await new ToolHost(buildKnowledgeTools(ctx), ctx).call(name, input);
  expect(result.isError, result.text).not.toBe(true); expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(24000);
  return JSON.parse(result.text);
 };
 return { ctx, call, s, version, files, r };
}
async function full(call: ReturnType<typeof fixture>["call"], name: string, input: Record<string, unknown>, id: string) {
 let offset: number | null = 0, raw = "", digest = "", count = 0;
 while (offset !== null) {
  const page = await call(name, { ...input, detail: "full", document_id: id, document_offset: offset });
  expect(page.entries).toEqual([{ id }]); expect(page.document_offset).toBe(offset);
  digest ||= page.document_sha256; expect(page.document_sha256).toBe(digest);
  raw += page.json_fragment; offset = page.next_document_offset; expect(++count).toBeLessThan(100);
 }
 expect(createHash("sha256").update(raw).digest("hex")).toBe(digest);
 return JSON.parse(raw);
}

it("keeps a large strategy consumable with exact trigger/body/confidence and the late counterexample", async () => {
 const { call, s, version, files } = fixture();
 const result = await call("kb_strategies", { query: "oversized-0", limit: 1, offset: 0 });
 expect(result).toMatchObject({ returned: 1, total_matches: 1, oversized_skipped: 0, truncated: true, knowledge_version: version });
 const e = result.entries[0], original = entry("oversized-0");
 expect(e).toMatchObject({ id: original.id, trigger: original.trigger, strategy: original.strategy, confidence: original.confidence, evidence_status: "conflict",
  evidence_summary: { references: 2, own_runs: 2, contradict_references: 1 } });
 expect(e.evidence).toContainEqual(original.evidence[1]);
 expect(e.full_document.input).toMatchObject({ query: "oversized-0", detail: "full", document_id: "oversized-0" });
 expect(await full(call, "kb_strategies", { query: "oversized-0" }, "oversized-0")).toEqual(original);
 expect(s.files(version)).toEqual(files);
});

it("does not skip rows when byte budgets shorten a multi-hit page; limit/offset stay stable", async () => {
 const { call } = fixture(); const ids: string[] = []; let offset: number | null = 0, pages = 0;
 while (offset !== null) {
  const p = await call("kb_strategies", { query: "*", limit: 6, offset });
  expect(p.returned).toBeGreaterThan(0); expect(p.oversized_skipped).toBe(0); expect(p.total_matches).toBe(7);
  ids.push(...p.entries.map((e: any) => e.id)); offset = p.next_offset; pages++;
 }
 expect(ids).toEqual(Array.from({ length: 7 }, (_, i) => `oversized-${i}`)); expect(pages).toBeGreaterThan(1);
 expect((await call("kb_strategies", { query: "*", limit: 1, offset: 3 })).entries[0].id).toBe("oversized-3");
 expect(await call("kb_strategies", { query: "*", offset: 7 })).toMatchObject({ entries: [], next_offset: null, pagination_empty: true });
 const largeRows = Array.from({ length: 12 }, (_, i) => ({ ...entry(`multi-${i}`), strategy: "说明".repeat(180),
  evidence: [0, 1, 2, 3].map(i => ({ ref: long + i, run: `FIXTURE${i}`, role: i === 3 ? "contradict" : "support" })) }));
 const p = JSON.parse(consumerPage({ tool: "kb_strategies", input: { limit: 12 }, rows: largeRows, value: e => e, sources: () => [], envelope: {} }).text);
 expect(p.returned).toBeLessThan(12); expect(p.returned).toBeGreaterThan(0); expect(p.next_offset).toBe(p.returned);
});

it("retains oversized experience and construction-rk evidence counts and reconstructs their full payloads", async () => {
 const { call, r } = fixture();
 const exp = await call("kb_experience", { id: experience.id });
 expect(exp.entries[0]).toMatchObject({ id: experience.id, lesson: experience.lesson, confidence: "low", evidence_summary: { n_support: 1000, n_contradict: 1, references: 1000 } });
 expect(exp.entries[0].counterevidence.contradicting).toEqual(["COUNTEREXAMPLE"]);
 expect(await full(call, "kb_experience", { id: experience.id }, experience.id)).toEqual(experience);
 expect(await full(call, "kb_experience", {}, experience.id)).toEqual(experience);
 const rk = await call("kb_reflex", { query: r.id });
 expect(rk.entries[0]).toMatchObject({ id: r.id, confidence: r.confidence, evidence_summary: { n_support: 1000, n_contradict: 2, references: 1000 } });
 expect(rk.predicate_evaluation).toBe("not_evaluated");
 expect(await full(call, "kb_reflex", { query: r.id }, r.id)).toEqual(JSON.parse(JSON.stringify(r)));
});

it("applies dynamic, keyword and role filters to full retrieval too, without widening scope", async () => {
 const { call, ctx } = fixture();
 for (const facts of [{ act: 1, floor: 25, deck: "TEST_CARD" }, { act: 1, floor: 10, deck: "OTHER_CARD" }]) {
  ctx.payload = { facts };
  for (const detail of ["projection", "full"]) expect((await call("kb_strategies", { query: "oversized-0", detail, ...(detail === "full" ? { document_id: "oversized-0" } : {}) })).entries).toEqual([]);
 }
 ctx.payload = { facts: { act: 1, floor: 10, deck: "TEST_CARD" } };
 expect((await call("kb_strategies", { query: "unknown", detail: "full", document_id: "oversized-0" })).entries).toEqual([]);
 setKnowledgeCharacter("ironclad");
 expect((await call("kb_strategies", { query: "oversized-0", detail: "full", document_id: "oversized-0" })).entries).toEqual([]);
});

it("rejects incomplete/invalid full requests and arbitrary paths, SQL or versions", async () => {
 const { ctx } = fixture(); const host = new ToolHost(buildKnowledgeTools(ctx), ctx);
 for (const input of [{ query: "*", detail: "full" }, { query: "*", document_offset: 1 }, { query: "*", detail: "full", document_id: "oversized-0", document_offset: 99999 },
  { query: "*", detail: "full", document_id: "oversized-0", limit: 2 }, { query: "*", sql: "SELECT 1" }, { query: "*", path: "/tmp/arbitrary" }, { query: "*", version: "latest" }]) {
  expect((await host.call("kb_strategies", input)).isError).toBe(true);
 }
});

it("keeps external conflict, distinct denominators and latest/largest references without claiming summed evidence", () => {
 const evidence = [1, 10, 2].map((n, i) => ({ type: "external_aggregate", source: `external:fixture${i}`, denominator: { n, unit: "runs" }, role: i === 0 ? "contradict" : "support", limitations: ["observational"] }));
 const e = { ...entry(), evidence, supplements: long };
 const p = consumerProjection(e, "kb_strategies", { query: "*" });
 expect(p.evidence).toEqual([evidence[0], evidence[2], evidence[1]]);
 expect(p.evidence_summary).toMatchObject({ external_references: 3, own_runs: 0, contradict_references: 1 });
 expect(p.evidence_summary).not.toHaveProperty("external_runs"); expect(p.evidence_status).toBe("conflict");
 const externalExperience = consumerProjection({ ...experience, source: "external:fixture" }, "kb_experience", { id: experience.id });
 expect(externalExperience.evidence_summary).toMatchObject({ external_references: 1000, own_references: 0, own_runs: 0, unclassified_references: 0 });
 const unknown = consumerProjection({ ...experience, source: "mixed" }, "kb_experience", { id: experience.id });
 expect(unknown.evidence_summary).toMatchObject({ unclassified_references: 1000, own_runs: 0 });
});

it("bounds pathological core/source fields explicitly instead of passing a partial trigger as a complete condition", () => {
 const e = { ...entry(), trigger: { unknown: long }, strategy: long };
 const result = consumerPage({ tool: "kb_strategies", input: {}, rows: [e], value: e => e,
  sources: () => [{ entry_id: e.id, knowledge_version: "K1-fixture", limits: [long] }], envelope: {} });
 const parsed = JSON.parse(result.text); expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(24000);
 expect(parsed.entries[0]).toMatchObject({ id: e.id, truncated: true, partial_fields: { truncated: true } });
 expect(parsed.entries[0]).not.toHaveProperty("trigger");
 expect(parsed.sources[0]).toMatchObject({ entry_id: e.id, knowledge_version: "K1-fixture", truncated: true });
 const many = consumerPage({ tool: "kb_strategies", input: {}, rows: [e], value: e => e,
  sources: () => Array.from({ length: 100 }, (_, i) => ({ entry_id: e.id, source: "external:fixture", version: String(i), dataset_sha256: "a".repeat(64) })), envelope: {} });
 const m = JSON.parse(many.text); expect(m.returned).toBe(1); expect(m.sources_truncated).toBe(true);
 expect(m.sources.at(-1).omitted_source_records).toBeGreaterThan(0); expect(Buffer.byteLength(many.text)).toBeLessThanOrEqual(24000);
});

it("uses the same projections and full fragments on legacy file sources", async () => {
 const { files, ctx, call } = fixture(); const root = dir();
 for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); }
 ctx.knowledgeDir = root;
 for (const [tool, input, id] of [["kb_strategies", { query: "oversized-0" }, "oversized-0"], ["kb_experience", { id: experience.id }, experience.id], ["kb_reflex", { query: "test_reflex" }, "test_reflex"]] as const) {
  expect((await call(tool, input)).entries[0]).toMatchObject({ id, truncated: true });
  expect((await full(call, tool, input, id)).id).toBe(id);
 }
});
