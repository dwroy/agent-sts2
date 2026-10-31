/** Synthetic archival contracts only; these are never production knowledge. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { KnowledgeStore, digest, auditApprovedChanges, type Candidate } from "../src/knowledge/runtime/store.js";
import { KnowledgeReader, closeIndexedReaders } from "../src/knowledge/runtime/reader.js";
import { validateDocuments } from "../src/knowledge/runtime/validation.js";
import { classificationDigest } from "../src/knowledge/runtime/classification.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { toolCapabilities } from "../src/brain/tools/capabilities.js";
import { agentSystemPrompt } from "../src/brain/brain.js";
import { main as runtimeMain } from "../tools/knowledge-runtime.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { mergeApprovedDelta } from "../src/knowledge/runtime/continuation.js";
import { buildResearchTool } from "../src/brain/tools/build-research.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import type { ToolContext } from "../src/brain/tools/types.js";

const roots: string[] = [], stores: KnowledgeStore[] = [], readers: KnowledgeReader[] = [];
afterEach(() => { closeIndexedReaders(); readers.splice(0).forEach(r => r.close()); stores.splice(0).forEach(s => { if (s.db.isOpen) s.close(); }); roots.splice(0).forEach(r => rmSync(r, { recursive: true, force: true })); setKnowledgeCharacter(null); });
const path = "characters/silent/build-research.json";
const doc = (entries: any[]) => JSON.stringify({ schema: "build-research-v1", character: "silent", entries });
function fixture(id = "fixture-research") {
 const original = JSON.stringify({ phases: ["START", "BOSS1", "TRANSITION", "RESOURCE", "FINAL"], observation: "仅测试原文，不是游戏知识" });
 return { id, revision: "fixture-r1", title: "仅格式测试整局构筑", scope: { character: "silent", ascensions: [8, 10], game_version: "fixture-version" as string | null },
  source: "external:fixture", status: "candidate", confidence: .2, evidence_status: "conflict", verified_complete_playbook: false, validation_status: "unverified",
  sources: [{ id: "source-a", source: "external:fixture", url: "https://example.org/fixture", game_version: "fixture-version", sha256: "a".repeat(64),
   downloaded_at: "2026-10-21", sample: { n: 10, unit: "uploads", players: null }, filters: "synthetic only", license: "synthetic fixture", design: "observational", limitations: ["非随机、自选上传"] }],
  evidence: [{ id: "support", source_id: "source-a", role: "support", ref: "synthetic:1", observation: "原顺序甲→乙", limitations: ["unknown战前"] },
   { id: "counter", source_id: "source-a", role: "contradict", ref: "synthetic:2", observation: "反向顺序乙→甲", limitations: ["unknown药水"] }],
  phases: ["START", "BOSS1", "TRANSITION", "RESOURCE", "FINAL"].map((stage, i) => ({ id: `p${i}`, stage, acts: [Math.min(3, Math.floor(i / 2) + 1)], goals: [`goal-${i}`], evidence_ids: ["support", "counter"],
   content: { condition: `原条件${i}`, acquisition_order: "甲→乙；反例乙→甲", pivot_reason: "仅原观察", next_checkpoint: `下个检查点${i}`, resource_continuity: "前段HP→恢复→后段；unknown用药", final_preparation: "原文终局准备", unknown: "缺可执行DTO", original_phase: { stage } } })),
  limitations: ["仅外部观察；不估计胜率或收益"], unknowns: ["真实战前/场间/药水"], original: { sha256: digest(original), content: original }, references: [] as any[] };
}
function store() { const root = mkdtempSync(join(tmpdir(), "build-research-")); roots.push(root); const s = new KnowledgeStore(root); stores.push(s); return s; }
function candidate(s: KnowledgeStore, entries = [fixture()], id = "fixture"): Candidate { return { schema: "knowledge-candidate-v1", id, base: s.current(), character: "silent", source: "fixture", files: { [path]: doc(entries) } }; }
function publish(s: KnowledgeStore, c = candidate(s)) { s.submit(c); s.validate(c.id); return s.publish(c.id); }
it("bounds aggregate research archives separately while retaining each original object and other document limits", () => {
 const a = fixture("large-a"), b = fixture("large-b");
 for (const entry of [a, b]) { entry.original.content = "x".repeat(4 * 1024 * 1024 + 1); entry.original.sha256 = digest(entry.original.content); }
 const text = doc([a, b]); expect(Buffer.byteLength(text)).toBeGreaterThan(8 * 1024 * 1024);
 expect(() => validateDocuments({ [path]: text })).not.toThrow();
 a.original.content = "x".repeat(8 * 1024 * 1024); a.original.sha256 = digest(a.original.content);
 expect(() => validateDocuments({ [path]: doc([a]) })).toThrow("entry exceeds 8 MiB");
 const oversized = doc([]) + " ".repeat(32 * 1024 * 1024);
 expect(() => validateDocuments({ [path]: oversized })).toThrow("path/size");
 expect(() => validateDocuments({ "characters/silent/classification.json": text })).toThrow("path/size");
});
it("continues disjoint new research IDs with original approval, bytes and prior failures retained", () => {
 const s = store(), seed = fixture("existing"), other = fixture("concurrent"), added = fixture("new-research");
 const base = publish(s, candidate(s, [seed], "seed"));
 const original = candidate(s, [seed, added], "original-batch"); original.base = base;
 s.submit(original); s.validate(original.id);
 const current = publish(s, candidate(s, [seed, other], "parallel"));
 const approvalPath = join(s.root, "approved-original.json"); writeFileSync(approvalPath, JSON.stringify([added]));
 const approval = [{ id: added.id, path: approvalPath }];
 const saved = s.db.prepare("SELECT * FROM candidates WHERE id=?").get(original.id);
 expect(() => s.complete(original, "a".repeat(40), approval)).toThrow("version conflict");
 expect(() => s.admitContinuation(original.id, original.id, current, [])).toThrow("approved artifacts");
 expect(() => s.admitContinuation(original.id, original.id, current, [{ ...approval[0]!, sha256: "f".repeat(64) }])).toThrow("checksum");
 writeFileSync(approvalPath, JSON.stringify([{ ...added, revision: "unapproved" }]));
 expect(() => s.admitContinuation(original.id, original.id, current, approval)).toThrow("absent from frozen-source");
 expect(s.status(original.id).continuation).toBeUndefined();
 writeFileSync(approvalPath, JSON.stringify([added]));
 const admitted = s.admitContinuation(original.id, original.id, current, approval);
 expect(s.admitContinuation(original.id, original.id, current, approval)).toEqual(admitted);
 const receipt = s.complete(original, "a".repeat(40), approval);
 expect(JSON.parse(s.files(receipt.version)[path]!).entries).toEqual([seed, other, added]);
 expect(s.db.prepare("SELECT * FROM candidates WHERE id=?").get(original.id)).toEqual(saved);
 expect(s.status(original.id).failures).toHaveLength(4);
 expect(s.complete(original, "b".repeat(40), approval)).toEqual(receipt);
 expect(() => mergeApprovedDelta("silent", { [path]: doc([seed]) }, { [path]: doc([seed, added]) }, { [path]: doc([seed, added]) })).toThrow("object conflict");
 expect(() => mergeApprovedDelta("silent", { [path]: doc([seed]) }, { [path]: doc([{ ...seed, title: "changed" }]) }, { [path]: doc([seed]) })).toThrow("only appends");
 expect(() => mergeApprovedDelta("silent", { [path]: doc([seed]) }, { [path]: doc([]) }, { [path]: doc([seed]) })).toThrow("delete");
 expect(() => mergeApprovedDelta("silent", { [path]: doc([seed]) }, { [path]: JSON.stringify({ ...JSON.parse(doc([seed, added])), character: "ironclad" }) }, { [path]: doc([seed]) })).toThrow("header");
});
function context(s: KnowledgeStore, run = "fixture"): ToolContext { return { ascension: 10, act: 2, knowledgeDir: String(s.bind(run, "fixture").snapshot), logsDir: s.root, label: "reward/card", payload: {} }; }
async function call(ctx: ToolContext, input: Record<string, unknown>) { const tool = buildKnowledgeTools(ctx).find(t => t.name === "kb_build_research")!; const result = await tool.run(input, ctx); expect(result.isError, result.text).toBeUndefined(); expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(24000); return JSON.parse(result.text); }

it("publishes full five-stage JSON, independent provenance/counterevidence and immutable original bytes", async () => {
 setKnowledgeCharacter("silent"); const s = store(), c = candidate(s), v = publish(s, c), ctx = context(s);
 expect(s.files(v)[path]).toBe(c.files[path]);
 const entry = fixture(), parts = new Map<string, string[]>(); let offset: number | null = 0, pages = 0;
 do { const page = await call(ctx, { query: "*", id: entry.id, page_offset: offset });
  expect(page).toMatchObject({ knowledge_version: v, verified_complete_playbook: false, confidence: .2, validation_status: "unverified", evidence_status: "conflict", condition_evaluation: "not_evaluated" });
  expect(page.phase_order.map((p: any) => p.stage)).toEqual(entry.phases.map(p => p.stage));
  expect(page.phase_order[2]).toMatchObject({ previous: "p1", next: "p3" });
  for (const section of page.sections) { const a = parts.get(section.pointer) ?? []; expect(a.length).toBe(section.part); a.push(section.json_fragment); parts.set(section.pointer, a); }
  offset = page.next_page_offset; pages++;
 } while (offset !== null && pages < 100);
 expect(offset).toBeNull(); expect(pages).toBeGreaterThanOrEqual(1);
 for (const [key, value] of Object.entries(entry)) {
  if (Array.isArray(value) && value.length) value.forEach((v, i) => expect(JSON.parse(parts.get(`/${key}/${i}`)!.join(""))).toEqual(v));
  else expect(JSON.parse(parts.get(`/${key}`)!.join(""))).toEqual(value);
 }
 expect(s.db.prepare("SELECT count(*) n FROM business_items").get()!.n).toBe(0);
 expect(s.query({ version: v, character: "silent", kind: "reflex" })).toEqual([]);
});

it("recalls short/long semantic text, exact same-phase act/stage/goal and isolated role/ascension/version", async () => {
 setKnowledgeCharacter("silent"); const s = store(); publish(s); const ctx = context(s);
 for (const input of [{ query: "顺" }, { query: "顺序" }, { query: "原文终局准备" }, { query: "*", act: 2, stage: "TRANSITION", goal: "goal-2" }, { query: "*", game_version: "fixture-version" }]) expect((await call(ctx, input)).entries).toHaveLength(1);
 for (const input of [{ query: "*", game_version: "wrong" }, { query: "*", act: 1, stage: "FINAL" }, { query: "*", act: 1, goal: "goal-2" }, { query: "不存在" }]) expect((await call(ctx, input)).entries).toEqual([]);
 expect((await call({ ...ctx, ascension: 9 }, { query: "*" })).entries).toEqual([]);
 setKnowledgeCharacter("ironclad"); expect(JSON.parse((await buildResearchTool().run({ query: "*" }, ctx)).text).entries).toEqual([]);
 expect(buildKnowledgeTools(ctx).some(t => t.name === "kb_build_research")).toBe(false);
});

it("paginates result lists and arbitrarily long evidence/original/stage text without skipping or truncation", async () => {
 setKnowledgeCharacter("silent"); const s = store(), entries = Array.from({ length: 5 }, (_, i) => fixture(`f${i}`));
 const large = entries[0]!; large.phases[0]!.content.condition = "观测😀\"\\\n".repeat(12000);
 large.evidence[0]!.observation = "来源中文\"\\\n".repeat(4000);
 publish(s, candidate(s, entries)); const ctx = context(s), ids: string[] = []; let offset: number | null = 0;
 do { const page = await call(ctx, { query: "*", limit: 2, offset }); ids.push(...page.entries.map((e: any) => e.id)); offset = page.next_offset; } while (offset !== null);
 expect(ids).toEqual(entries.map(e => e.id));
 let cursor: number | null = 0, text = "", count = 0;
 do { const page = await call(ctx, { query: "*", id: "f0", page_offset: cursor });
  text += page.sections.filter((s: any) => s.pointer === "/phases/0").map((s: any) => s.json_fragment).join(""); cursor = page.next_page_offset; count++;
 } while (cursor !== null && count < 500);
 expect(cursor).toBeNull(); expect(count).toBeGreaterThan(1); expect(JSON.parse(text)).toEqual(large.phases[0]);
});

it("rejects execution promotion, bad provenance/references, missing original bytes and hidden fields", () => {
 const entries = [fixture()];
 const invalid = (change: (e: any) => void) => { const e = structuredClone(entries[0]); change(e); expect(() => validateDocuments({ [path]: doc([e]) })).toThrow(); };
 invalid(e => { e.verified_complete_playbook = true; }); invalid(e => { e.confidence = .8; }); invalid(e => { e.status = "active"; }); invalid(e => { e.validation_status = "verified"; });
 invalid(e => { e.predicate = { op: "true" }; }); invalid(e => { e.sources[0].sha256 = "bad"; }); invalid(e => { e.sources[0].sample.players = 0; }); invalid(e => { e.sources[0].downloaded_at = "2026-02-30"; });
 invalid(e => { e.evidence_status = "aligned"; }); invalid(e => { e.evidence[0].source_id = "missing"; }); invalid(e => { e.phases[0].evidence_ids = ["missing"]; });
 invalid(e => { e.references = [{ path: "../../.env", id: "x", type: "strategy", sha256: "a".repeat(64) }]; }); invalid(e => { e.original.content = "changed"; });
});

it("retains historical fragment copies without blocking subsequent strategy revisions", () => {
 const s = store(), e = fixture(), refPath = "characters/silent/strategy-entries.json";
 const fragment = { id: "fixture-strategy", version: "r1", trigger: { question_types: ["act_plan"] }, strategy: "格式测试", source: "own", confidence: .2, evidence: [{ run: "SILENT000001", floor: 1 }] };
 e.references = [{ path: refPath, type: "strategy", id: fragment.id, sha256: classificationDigest(fragment), content: fragment }];
 const c = candidate(s, [e]); c.files[refPath] = JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: [fragment] }); publish(s, c);
 const next = { ...fragment, version: "r2", strategy: "格式测试修订" };
 publish(s, { ...candidate(s, [e], "next"), files: { [refPath]: JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: [next] }) } });
 const bad = structuredClone(e); bad.references[0].sha256 = "b".repeat(64);
 expect(() => validateDocuments({ ...s.files(s.current()), [path]: doc([bad]) })).toThrow("reference");
});

it("preserves old K bindings, rollback/idempotency and original evidence on research updates", async () => {
 setKnowledgeCharacter("silent"); const s = store(); const v1 = publish(s), old = context(s, "old");
 const next = fixture(); next.revision = "fixture-r2"; next.title = "新修订";
 const c = candidate(s, [next], "next"), v2 = publish(s, c);
 expect(s.publish(c.id)).toBe(v2); expect(s.submit(c).status).toBe("published");
 expect((await call(old, { query: "*" })).entries[0].revision).toBe("fixture-r1"); expect((await call(context(s, "new"), { query: "*" })).entries[0].revision).toBe("fixture-r2");
 s.rollback(v1, "rollback"); expect((await call(context(s, "rollback"), { query: "*" })).knowledge_version).toBe(v1);
 for (const [i, mutate] of [(e: any) => { e.evidence.pop(); }, (e: any) => { e.phases[0].content.condition = "删旧观察"; }, (e: any) => { e.unknowns = []; }].entries()) {
  const e = fixture(); e.revision = "bad"; mutate(e); const bad = candidate(s, [e], `bad${i}`); s.submit(bad); expect(() => s.validate(bad.id)).toThrow();
 }
});

it("migrates schema3 atomically without changing prior K1, revisions or bindings; old reader needs no write", async () => {
 setKnowledgeCharacter("silent"); const s = store(), version = publish(s), ctx = context(s);
 const revisions = s.db.prepare("SELECT * FROM revisions").all();
 s.db.exec("DROP TABLE research_grams; DROP TABLE research_terms; UPDATE metadata SET value='3' WHERE key='schema'");
 const old = new KnowledgeReader(s.root, version); readers.push(old); expect(old.schema).toBe(3);
 expect(() => old.research({ character: "silent", ascension: 10, limit: 1, offset: 0 })).toThrow("migration");
 expect(buildKnowledgeTools(ctx).some(t => t.name === "kb_build_research")).toBe(false); closeIndexedReaders();
 expect(() => new KnowledgeStore(s.root, { migrationFailpoint: () => { throw Error("fixture migration failure"); } })).toThrow("failure");
 expect(s.db.prepare("SELECT value FROM metadata WHERE key='schema'").get()!.value).toBe("3");
 const migrated = new KnowledgeStore(s.root); stores.push(migrated);
 expect(migrated.current()).toBe(version); expect(migrated.db.prepare("SELECT * FROM revisions").all()).toEqual(revisions);
 expect(migrated.bind("fixture", "different").version).toBe(version);
 expect((await call(ctx, { query: "*" })).entries).toHaveLength(1);
});

it("registers the identical read-only dynamic capability and rejects paths/SQL/network/version rebinding", async () => {
 setKnowledgeCharacter("silent"); const s = store(); publish(s); const ctx = context(s), tools = buildKnowledgeTools(ctx), tool = tools.find(t => t.name === "kb_build_research")!;
 const host = new ToolHost([tool], ctx); expect(host.list()[0]!.description).toBe(tool.description);
 expect(toolCapabilities(tools)).toContain(tool.description); expect(agentSystemPrompt(undefined, tools)).toContain(tool.description);
 expect(agentSystemPrompt(undefined, tools)).toContain("按需");
 for (const input of [{ query: "*", path: ".env" }, { query: "*", sql: "SELECT 1" }, { query: "*", url: "https://example.org" }, { query: "*", version: "latest" }, { query: "*", character: "ironclad" }, { query: "*", page_offset: 1 }, { query: "*", offset: -1 }]) expect((await tool.run(input, ctx)).isError).toBe(true);
 const reader = new KnowledgeReader(s.root, s.current()!); readers.push(reader); expect(() => reader.db.exec("DELETE FROM releases")).toThrow(/readonly/);
 expect(buildKnowledgeTools({ ...ctx, knowledgeDir: s.root }).some(t => t.name === "kb_build_research")).toBe(false);
});

it("marks unknown version explicitly and never invents version alignment", async () => {
 setKnowledgeCharacter("silent"); const s = store(), e = fixture(); e.scope.game_version = null; publish(s, candidate(s, [e]));
 const page = await call(context(s), { query: "*", game_version: "fixture-version" }); expect(page.entries[0].game_version_status).toBe("unknown");
});

it("completes a source-approved research artifact through the real K1 CLI idempotently", async () => {
 const s = store(), c = candidate(s), entry = fixture(), artifact = join(s.root, "artifact.json"), approval = join(s.root, "approval.json"), file = join(s.root, "candidate.json");
 writeFileSync(artifact, JSON.stringify(entry)); writeFileSync(file, JSON.stringify(c));
 const permitted = [{ id: entry.id, path: artifact }]; writeFileSync(approval, JSON.stringify(permitted));
 expect(() => auditApprovedChanges({}, c.files, [])).toThrow("absent");
 expect(() => auditApprovedChanges({}, c.files, permitted)).not.toThrow();
 const args = ["complete", "--runtime", s.root, "--candidate", file, "--id", c.id, "--code", "fixture", "--approval", approval];
 await runtimeMain(args); const first = s.current(); await runtimeMain(args);
 expect(s.current()).toBe(first); expect(s.db.prepare("SELECT count(*) n FROM releases").get()!.n).toBe(1);
 expect(s.files(first)[path]).toBe(c.files[path]);
});

it("archives addressable trajectory/availability/Markdown artifacts and bounds selection to stored JSON", async () => {
 setKnowledgeCharacter("silent"); const s = store(), e: any = fixture();
 const cases = { columns: { previous_hp: "proxy", potion: "unknown", node: "not_floor" }, limitations: ["synthetic only"],
  cases: Array.from({ length: 20 }, (_, i) => ({ id: `anonymous-${i}`, nodes: [{ order: 1, next: 2, availability: "unknown" }],
   narrative: "观测😀\"\\\n".repeat(i === 19 ? 6000 : 5) })), "escaped/key": { "~value": "original" } };
 const raw = JSON.stringify(cases), markdown = "# Original observation\nNo executable DTO.\n";
 e.attachments = [{ id: "trajectories", media_type: "application/json", sha256: digest(raw), content: raw },
  { id: "playbook", media_type: "text/markdown", sha256: digest(markdown), content: markdown }];
 publish(s, candidate(s, [e])); const ctx = context(s);
 const read = async (input: Record<string, unknown>) => {
  let offset: number | null = 0, text = "", pages = 0;
  do { const page = await call(ctx, { query: "*", id: e.id, ...input, page_offset: offset });
   expect(page.evidence_read).toBe("selected_section_only_not_complete_evidence");
   expect(page.context_pointers).toContain("/limitations");
   text += page.sections.map((s: any) => s.json_fragment).join(""); offset = page.next_page_offset; pages++;
  } while (offset !== null && pages < 100);
  expect(offset).toBeNull(); return JSON.parse(text);
 };
 expect(await read({ artifact: "trajectories", pointer: "/cases/19" })).toEqual(cases.cases[19]);
 expect(await read({ artifact: "trajectories", pointer: "/columns" })).toEqual(cases.columns);
 expect(await read({ artifact: "trajectories", pointer: "/escaped~1key/~0value" })).toBe("original");
 expect(await read({ pointer: "/phases/2" })).toEqual(e.phases[2]);
 expect(await read({ pointer: "/attachments/0/content" })).toBe(raw);
 expect(await read({ artifact: "playbook" })).toBe(markdown);
 const tool = buildResearchTool();
 for (const input of [{ artifact: "../../.env" }, { artifact: "https://example.org" }, { artifact: "trajectories", pointer: "../../.env" },
  { artifact: "trajectories", pointer: "/cases/20" }, { artifact: "trajectories", pointer: "/constructor" }, { pointer: "/bad~2escape" }, { artifact: "playbook", pointer: "/cases" }])
  expect((await tool.run({ query: "*", id: e.id, ...input }, ctx)).isError).toBe(true);
 const changed = structuredClone(e); changed.revision = "r2"; changed.attachments[0].content = "{}";
 expect(() => validateDocuments({ [path]: doc([changed]) })).toThrow("checksum");
 changed.attachments = []; const bad = candidate(s, [changed], "drop-artifacts"); s.submit(bad); expect(() => s.validate(bad.id)).toThrow("attachments");
 expect(s.db.prepare("SELECT count(*) n FROM business_items").get()!.n).toBe(0);
});
