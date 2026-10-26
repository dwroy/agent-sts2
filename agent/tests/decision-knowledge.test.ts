/** Synthetic format fixtures only. No learned rules, game runs or production knowledge. */
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it, vi } from "vitest";
import { Brain } from "../src/brain/brain.js";
import { BrainRouter } from "../src/brain/router.js";
import type { BrainRequest } from "../src/brain/types.js";
import { pickSpec } from "../src/brain/specs.js";
import { attachDecisionKnowledge, decisionContextTool, decisionPoints, selectDecisionContext } from "../src/brain/decision-knowledge.js";
import { DECISION_CONTEXT_FILE, parseDecisionContext, type DecisionContextEntry, type DecisionPoint } from "../src/knowledge/decision-context.js";
import { KnowledgeStore, type Candidate } from "../src/knowledge/runtime/store.js";
import { closeIndexedReaders, KnowledgeReader } from "../src/knowledge/runtime/reader.js";
import { validateDocuments, validateUpdate } from "../src/knowledge/runtime/validation.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { loadConfig } from "../src/core/config.js";
import type { ToolContext } from "../src/brain/tools/types.js";
import type { JsonValue } from "../src/core/util/json.js";
import * as archetypes from "../src/knowledge/strategy-archetypes.js";

const stores: KnowledgeStore[] = [], dirs: string[] = [];
afterEach(() => { vi.restoreAllMocks(); closeIndexedReaders(); stores.splice(0).forEach(s => s.close()); dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); setKnowledgeCharacter(null); });
const sha = "a".repeat(64);
const enabled = { enabled: true, bytes: 8000 };
function entry(id = "fixture-entry", patch: Partial<DecisionContextEntry> = {}): DecisionContextEntry {
  return { id, dimension: "夹具维度", status: "active", triggers: ["选牌"], conditions: { character: "silent", ascensions: [10], acts: [1] },
    priority: 50, summary: "格式摘要，无游戏知识。", rule_candidate: "格式正文，无游戏知识。", confidence: .25,
    denominators: { own_runs: 0, external: { unit: "uploads", n: 7 }, association_only: true },
    evidence_refs: [{ type: "external_aggregate", source: "external:fixture", url: "https://example.com/fixture", version: "fixture-v1", downloaded_at: "2026-10-27",
      sha256: sha, filters: "synthetic", denominator: { unit: "uploads", n: 7 }, role: "support" }],
    counterexamples: [{ id: "synthetic-counterexample", n: 1 }], limitations: ["仅格式夹具；观察性、非因果。"], conflicts_with: [{ id: "fixture-old", knowledge_version: `K1-${sha}`, reason: "保留旧反证。" }],
    review_origin: { schema: "issue80-review-candidates-v1", id, sha256: sha, conditions: { observable_build: "待审原文，不自动猜条件" } }, ...patch };
}
const document = (entries: DecisionContextEntry[]) => JSON.stringify({ schema: "decision-context-v1", character: "silent", status: "published", entries });
function runtime(entries: DecisionContextEntry[]) {
  setKnowledgeCharacter("silent");
  const root = mkdtempSync(join(tmpdir(), "decision-context-")); dirs.push(root);
  const store = new KnowledgeStore(root); stores.push(store);
  const publish = (id: string, next: DecisionContextEntry[]) => {
    const c: Candidate = { schema: "knowledge-candidate-v1", id, base: store.current(), character: "silent", source: "fixture:only", files: { [DECISION_CONTEXT_FILE]: document(next) } };
    store.submit(c); store.validate(id); const version = store.publish(id);
    return { version, directory: join(root, "snapshots", version) };
  };
  return { store, publish, ...publish("fixture-first", entries) };
}
function request(directory: string, label = "reward/card", payload: Record<string, unknown> = { facts: { act: 1, floor: 3, deck: ["FIXTURE_CARD 夹具"] } }): BrainRequest {
  const ctx: ToolContext = { label, payload, ascension: 10, act: 1, knowledgeDir: directory, logsDir: "/unused", state: {
    game_version: "fixture-v1", run: { character_id: "SILENT", act_id: 0, floor: 3, deck: [{ card_id: "FIXTURE_CARD" }] },
    reward: { card_options: [{ card_id: "FIXTURE_CARD" }] }, selection: { cards: [{ card_id: "FIXTURE_CARD" }] }, shop: { cards: [{ card_id: "FIXTURE_CARD" }] },
  } };
  return { label, system: "fixed system", question: "fixed question", payload, options: { a: null }, toolContext: ctx,
    spec: pickSpec(label, { a: null }), knowledge: { mode: "tools" } };
}
const view = (req: BrainRequest, bytes = 8000) => (attachDecisionKnowledge(req, { enabled: true, bytes }).payload as any).decision_knowledge;

it.each([
  ["reward/card", "选牌", {}], ["selection/add", "选牌", {}], ["shop/plan", "商店", {}], ["shop/buy", "商店", {}],
  ["selection/upgrade", "升级", {}], ["selection/remove", "删牌", {}], ["run-plan", "开局", { run_state: { trigger: "start" } }],
  ["run-plan", "幕复核", { run_state: { trigger: "act" } }], ["event/act-plan", "幕复核", {}], ["map/act-start", "幕复核", {}],
  ["fight-plan", "Boss入场", { fight_state: { fight: "boss", act: 1, floor: 3, enemies: [{ enemy_id: "FIXTURE_BOSS" }] } }],
  ["map/route", "路线", {}], ["map/route-plan", "路线", {}], ["map/route-review", "路线", {}], ["rest/plan", "营火", {}], ["rest/choose", "营火", {}],
] as [string, DecisionPoint, Record<string, unknown>][])("%s injects %s content with complete denominators and no tool call", (label, point, extra) => {
  const { directory, version } = runtime([entry("match", { triggers: [point] }), entry("other-act", { triggers: [point], conditions: { character: "silent", ascensions: [10], acts: [2] } })]);
  const req = request(directory, label, { facts: { act: 1 }, ...extra }), original = JSON.stringify(req.payload), result = view(req);
  expect(result).toMatchObject({ status: "ok", knowledge_version: version, returned: 1, total_matches: 1, truncated: false });
  expect(result.entries[0]).toMatchObject({ id: "match", denominators: entry().denominators, counterexamples: entry().counterexamples,
    limitations: entry().limitations, conflicts_with: entry().conflicts_with, confidence: .25, summary: entry().summary });
  expect(result.sha256).toBe(createHash("sha256").update(document([entry("match", { triggers: [point] }), entry("other-act", { triggers: [point], conditions: { character: "silent", ascensions: [10], acts: [2] } })])).digest("hex"));
  expect(JSON.stringify(req.payload)).toBe(original); expect(req.tools).toBeUndefined();
});

it("supports a run-plan checkpoint riding on an ordinary question and does not interpret prose", () => {
  const { directory } = runtime([entry("checkpoint", { triggers: ["幕复核"] })]);
  expect(view(request(directory, "reward/card", { facts: { act: 1 }, run_plan_task: { trigger: "act" } })).entries[0].id).toBe("checkpoint");
  expect(decisionPoints("run-plan", { run_state: { trigger: "hp_drop" } })).toEqual([]);
  const bad = JSON.parse(document([entry()])); bad.entries[0].conditions.observable_build = "guess this";
  expect(() => parseDecisionContext(bad)).toThrow("conditions");
});

it("keeps absent knowledge and unmatched conditions distinct, without file or latest fallback", () => {
  const { directory, store } = runtime([]);
  expect(view(request(directory))).toMatchObject({ status: "ok", entries: [], total_matches: 0 });
  const unbound = request(join(store.root, "not-a-snapshot"));
  expect(view(unbound)).toMatchObject({ status: "unbound", entries: [], knowledge_version: null });
  const absent = new KnowledgeStore(mkdtempSync(join(tmpdir(), "decision-missing-"))); stores.push(absent); dirs.push(absent.root);
  const c: Candidate = { schema: "knowledge-candidate-v1", id: "empty", base: null, character: "silent", source: "fixture", files: { "characters/silent/experience.json": '{"version":"fixture","entries":[]}' } };
  absent.submit(c); absent.validate(c.id); const version = absent.publish(c.id);
  expect(view(request(join(absent.root, "snapshots", version)))).toMatchObject({ status: "missing", knowledge_version: version, entries: [] });
  expect(view(request(join(store.root, "snapshots", `K1-${sha}`)))).toMatchObject({ status: "unavailable", entries: [] });
});

it("matches exact offers/deck/act/ascension/version and never treats history or descriptions as offers", () => {
  const { directory } = runtime([]), req = request(directory), ctx = req.toolContext!;
  const scoped = entry("scoped", { conditions: { character: "silent", ascensions: [10], acts: [1], floors: [3], game_versions: ["fixture-v1"],
    candidate_ids: ["FIXTURE_CARD"], deck_cards: [{ id: "FIXTURE_CARD", min: 1 }] } });
  expect(selectDecisionContext([scoped], ctx)).toHaveLength(1);
  for (const patch of [{ acts: [2] }, { ascensions: [9] }, { floors: [4] }, { game_versions: ["wrong"] }, { candidate_ids: ["UNSEEN_CARD"] }, { deck_cards: [{ id: "FIXTURE_CARD", min: 2 }] }]) {
    expect(selectDecisionContext([{ ...scoped, conditions: { ...scoped.conditions, ...patch } }], ctx)).toEqual([]);
  }
  const noOffers = { ...ctx, state: { run: { deck: [{ card_id: "FIXTURE_CARD" }] } }, options: { a: JSON.stringify({ description: "FIXTURE_CARD", history: { card_id: "FIXTURE_CARD" } }) } };
  expect(selectDecisionContext([scoped], noOffers)).toEqual([]);
  expect(selectDecisionContext([entry("unknown-deck", { conditions: { character: "silent", ascensions: [10], deck_cards: [{ id: "FIXTURE_CARD", min: 1 }] } })], { ...ctx, payload: {}, state: {} })).toEqual([]);
  expect(selectDecisionContext([scoped], { ...ctx, payload: { run_brief: { character: "IRONCLAD" } } })).toEqual([]);
  expect(selectDecisionContext([entry("retired", { status: "retired" })], ctx)).toEqual([]);
});

it("requires a versioned archetype and current boss identity; an act boss clock cannot impersonate the encounter", () => {
  const { directory } = runtime([]);
  const req = request(directory, "fight-plan", { facts: { act: 1, act_boss: "STALE_BOSS" }, fight_state: { fight: "boss", enemies: [{ enemy_id: "FIXTURE_BOSS" }] } });
  const e = entry("boss", { triggers: ["Boss入场"], conditions: { character: "silent", ascensions: [10], bosses: ["FIXTURE_BOSS"] } });
  expect(selectDecisionContext([e], req.toolContext!)).toHaveLength(1);
  expect(selectDecisionContext([{ ...e, conditions: { ...e.conditions, bosses: ["STALE_BOSS"] } }], req.toolContext!)).toEqual([]);
  expect(decisionPoints("fight-plan", { fight_state: { fight: "elite" } })).toEqual([]);
  expect(selectDecisionContext([entry("archetype", { conditions: { character: "silent", ascensions: [10], archetype: { model_sha256: sha, version: "fixture", clusters: [1] } } })], request(directory).toolContext!)).toEqual([]);
});

it("pins the original K1 document after publication and rollback", () => {
  const original = entry("same", { summary: "旧版格式摘要" }), { directory, version, store, publish } = runtime([original]);
  const req = request(directory);
  expect(view(req).entries[0].summary).toBe("旧版格式摘要");
  const later = publish("fixture-next", [{ ...original, summary: "新版格式摘要" }]);
  expect(view(req).knowledge_version).toBe(version); expect(view(req).entries[0].summary).toBe("旧版格式摘要");
  expect(view(request(later.directory)).entries[0].summary).toBe("新版格式摘要");
  store.rollback(version, "fixture-rollback");
  expect(view(request(later.directory)).knowledge_version).toBe(later.version);
  // The consumer reads SQLite release membership, never a mutable working-tree leaf.
  const reader = new KnowledgeReader(store.root, version);
  try { expect(reader.document(DECISION_CONTEXT_FILE)?.text).toBe(document([original])); expect(reader.document("../../.env")).toBeNull(); } finally { reader.close(); }
});

it("uses pinned observable geometry for archetype matching, with no model/version/cluster fallback", () => {
  const { directory } = runtime([]), ctx = request(directory).toolContext!;
  vi.spyOn(archetypes, "matchStrategyArchetype").mockReturnValue({ status: "matched", match: { model_sha256: sha, version: "fixture-v1", cluster: 2, similarity: .3, margin: .1, overlap: 1 } });
  const e = entry("geometry", { conditions: { character: "silent", ascensions: [10], archetype: { model_sha256: sha, version: "fixture-v1", clusters: [2] } } });
  expect(selectDecisionContext([e], ctx)).toHaveLength(1);
  for (const patch of [{ model_sha256: "b".repeat(64) }, { version: "other" }, { clusters: [3] }]) expect(selectDecisionContext([{ ...e, conditions: { ...e.conditions, archetype: { ...e.conditions.archetype!, ...patch } } }], ctx)).toEqual([]);
});

it("requires all exact observable conditions and rejects unknown paths rather than broadening scope", () => {
  const { directory } = runtime([]), req = request(directory, "fight-plan", { fight_state: { fight: "boss", act: 1, hp: "7/10", enemies: [{ enemy_id: "FIXTURE_BOSS" }] } });
  const e = entry("observed", { triggers: ["Boss入场"], conditions: { character: "silent", ascensions: [10],
    observed: [{ path: "payload.fight_state.hp", equals: "7/10" }, { path: "payload.fight_state.enemies.0.enemy_id", equals: "FIXTURE_BOSS" }] } });
  expect(() => parseDecisionContext(JSON.parse(document([e])))).not.toThrow();
  expect(selectDecisionContext([e], req.toolContext!)).toHaveLength(1);
  expect(selectDecisionContext([e], { ...req.toolContext!, payload: { fight_state: { fight: "boss", act: 1, hp: "8/10" } } })).toEqual([]);
  for (const path of ["payload.memory.previous.hp", "state.run.__proto__.hp", "state.run.constructor.name", "payload.history.hp"]) {
    expect(() => parseDecisionContext(JSON.parse(document([{ ...e, conditions: { ...e.conditions, observed: [{ path, equals: 1 }] } }])))).toThrow("observed");
  }
});

it("includes upgrade/removal priorities on legal combined rest/shop questions without confusing shelf cards with removable cards", () => {
  const { directory } = runtime([]), rest = request(directory, "rest/plan", { facts: { act: 1 }, options: { smith: { facts: { kind: "SMITH", id: "FIXTURE_CARD" } } } });
  rest.toolContext!.state = { rest: { options: [{ option_id: "SMITH", is_enabled: true }] } };
  const upgrade = entry("upgrade", { triggers: ["升级"], conditions: { character: "silent", ascensions: [10], candidate_ids: ["FIXTURE_CARD"] } });
  expect(selectDecisionContext([upgrade], rest.toolContext!)).toHaveLength(1);
  expect(selectDecisionContext([upgrade], { ...rest.toolContext!, state: { rest: { options: [{ option_id: "SMITH", is_enabled: false }] } } })).toEqual([]);
  const shop = request(directory, "shop/plan", { facts: { act: 1 }, your_cards: { c0: "FIXTURE_REMOVE 夹具" } });
  shop.toolContext!.state = { shop: { cards: [{ card_id: "FIXTURE_SHELF" }], card_removal: { available: true, enough_gold: true, used: false } } };
  const removal = entry("remove", { triggers: ["删牌"], conditions: { character: "silent", ascensions: [10], candidate_ids: ["FIXTURE_REMOVE"] } });
  expect(selectDecisionContext([removal], shop.toolContext!)).toHaveLength(1);
  expect(selectDecisionContext([{ ...removal, conditions: { ...removal.conditions, candidate_ids: ["FIXTURE_SHELF"] } }], shop.toolContext!)).toEqual([]);
});

it.each([2048, 4000, 8000, 24000])("bounds the entire UTF-8 envelope to %i bytes, preserving highest priority and explicit truncation", limit => {
  const large = entry("first", { priority: 100, summary: '格式中文😀"\\\n'.repeat(3000), details: { table: Array.from({ length: 2000 }, (_, n) => ({ n, text: "夹具" })) } });
  const { directory } = runtime([entry("low", { priority: 0 }), large, ...Array.from({ length: 20 }, (_, i) => entry(`many-${i}`))]);
  const result = view(request(directory), limit);
  expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(limit);
  expect(result.total_matches).toBe(22); expect(result.returned).toBeGreaterThan(0); expect(result.entries[0].id).toBe("first");
  expect(result.truncated).toBe(true); expect(result.entries[0].truncated).toBe(true); expect(result.entries[0].full_document).toMatchObject({ tool: "kb_decision_context" });
  expect(result.entries[0].omitted_fields.length).toBeGreaterThan(0); expect(result.omitted).toBe(22 - result.returned);
});

it("round-trips large full documents losslessly via the same scoped, versioned fragment protocol as #78", async () => {
  const large = entry("large", { summary: "中文😀\"\\\n".repeat(6000) }), { directory, version } = runtime([large]);
  const ctx = request(directory).toolContext!, tool = decisionContextTool();
  let offset: number | null = 0, raw = "", count = 0;
  while (offset !== null) {
    const result = await tool.run({ detail: "full", document_id: "large", document_offset: offset }, ctx), part = JSON.parse(result.text);
    expect(result.isError).toBeUndefined(); expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(24000);
    expect(part).toMatchObject({ knowledge_version: version, representation: "full_document_fragment", document_sha256: createHash("sha256").update(JSON.stringify(large)).digest("hex") });
    raw += part.json_fragment; offset = part.next_document_offset; count++;
    expect(count).toBeLessThan(100);
  }
  expect(count).toBeGreaterThan(1); expect(JSON.parse(raw)).toEqual(large);
  expect(JSON.parse((await tool.run({ detail: "full", document_id: "other" }, ctx)).text).status).toBe("no_match");
  expect((await tool.run({ detail: "full", document_id: "large", document_offset: 9999 }, ctx)).isError).toBe(true);
  expect((await tool.run({ detail: "full", document_id: "large", path: "../../.env" }, ctx)).isError).toBe(true);
  expect(JSON.parse((await tool.run({ detail: "full", document_id: "large" }, { ...ctx, ascension: 9 })).text).status).toBe("no_match");
});

it("keeps off/unconfigured/legacy/Ironclad/non-target requests byte-equivalent without accessing a database", () => {
  setKnowledgeCharacter("silent"); const req = request("/must-not-be-read");
  expect(attachDecisionKnowledge(req)).toBe(req); expect(attachDecisionKnowledge(req, { ...enabled, enabled: false })).toBe(req);
  expect(attachDecisionKnowledge({ ...req, knowledge: { mode: "off" } }, enabled).payload).toBe(req.payload);
  const combat = { ...req, label: "combat/plan" }; expect(attachDecisionKnowledge(combat, enabled)).toBe(combat);
  setKnowledgeCharacter("ironclad"); expect(attachDecisionKnowledge(req, enabled)).toBe(req);
});

it("validates provenance, strict machine scope and preservation before accepting any published document", () => {
  const original = document([entry()]); expect(() => validateDocuments({ [DECISION_CONTEXT_FILE]: original })).not.toThrow();
  for (const patch of [{ status: "review-only" }, { schema: "issue80-review-candidates-v1" }, { character: "ironclad" }]) {
    expect(() => parseDecisionContext({ ...JSON.parse(original), ...patch })).toThrow();
  }
  expect(() => validateDocuments({ "characters/ironclad/decision-context.json": original })).toThrow("cross-character");
  for (const update of [
    { conditions: { character: "silent", ascensions: [9, 10] } }, { evidence_refs: [] }, { limitations: ["removed original"] }, { conflicts_with: [] }, { denominators: { n: 999 } },
  ]) {
    const next = document([{ ...entry(), ...update } as DecisionContextEntry]);
    expect(() => validateUpdate({ [DECISION_CONTEXT_FILE]: original }, { [DECISION_CONTEXT_FILE]: next })).toThrow();
  }
  const bad = JSON.parse(original); bad.entries[0].evidence_refs[0].sha256 = "bad";
  expect(() => parseDecisionContext(bad)).toThrow("evidence");
});

it("defaults off, freezes configuration and rejects invalid byte budgets", () => {
  expect(loadConfig({}).brain.decisionKnowledge).toEqual({ enabled: false, bytes: 8000 });
  expect(loadConfig({ BRAIN_DECISION_KNOWLEDGE: "on", BRAIN_DECISION_KNOWLEDGE_BYTES: "4096" }).brain.decisionKnowledge).toEqual({ enabled: true, bytes: 4096 });
  for (const bytes of ["0", "2047", "24001", "1.1", "bad"]) expect(() => loadConfig({ BRAIN_DECISION_KNOWLEDGE_BYTES: bytes })).toThrow();
});

it.each(["codex", "deepseek"] as const)("delivers automatic content to the %s brain without a tool call and preserves default-off request bytes", async engine => {
  const { directory } = runtime([entry()]);
  const seen: BrainRequest[] = [];
  const ask = async (setting: boolean | undefined) => {
    const config = loadConfig({ BRAIN_LOG: "off" }).brain;
    config.decisionKnowledge = setting === undefined ? undefined : { enabled: setting, bytes: 8000 };
    const router = new BrainRouter({ config: { ...config, engine }, knowledgeAgent: true, codexOnly: engine === "codex", log: () => {}, engine: () => ({ name: engine,
      decide: async req => { seen.push(req); return { engine, model: "fixture", answer: { choice: "a", reason: "fixture" }, problems: [], attempts: 1, latencyMs: 0, usage: { inputTokens: 0, outputTokens: 0 }, toolCalls: [] }; } }) });
    const brain = new Brain(router, { systemPrompt: "fixed" }, () => []), req = request(directory);
    brain.setToolContext(req.toolContext!);
    await brain.choose(req.payload as Record<string, JsonValue>, "fixed question", { a: null }, { label: "reward/card" });
    return seen.at(-1)!;
  };
  const old = await ask(undefined), off = await ask(false), on = await ask(true);
  for (const k of ["system", "question", "memory", "payload", "tools", "knowledge"] as const) expect(JSON.stringify(off[k])).toBe(JSON.stringify(old[k]));
  expect((on.payload as any).decision_knowledge.entries[0].id).toBe("fixture-entry");
  expect(on.tools?.map(t => t.name)).toContain("kb_decision_context"); expect(old.tools?.map(t => t.name) ?? []).not.toContain("kb_decision_context");
});
