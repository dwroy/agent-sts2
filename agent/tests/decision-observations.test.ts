/** Synthetic published-observation contracts, never gameplay knowledge. */
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { attachDecisionKnowledge, decisionContextTool } from "../src/brain/decision-knowledge.js";
import { observationConsumerProjection } from "../src/brain/tools/knowledge-projection.js";
import { typedKnowledgeTool } from "../src/brain/tools/typed-knowledge.js";
import { strategyTool } from "../src/brain/tools/strategy-tool.js";
import { strategyMatches } from "../src/brain/tools/query-guidance.js";
import { publishedObservation, questionTypes, retrieveStrategies, type StrategyEntry } from "../src/knowledge/strategy-entries.js";
import { KnowledgeStore, type Candidate } from "../src/knowledge/runtime/store.js";
import { closeIndexedReaders } from "../src/knowledge/runtime/reader.js";
import { classificationDigest } from "../src/knowledge/runtime/classification.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainRequest } from "../src/brain/types.js";

const dirs: string[] = [], stores: KnowledgeStore[] = [], path = "characters/silent/strategy-entries.json";
afterEach(() => { closeIndexedReaders(); stores.splice(0).forEach(s => s.close()); dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); setKnowledgeCharacter(null); });
function entry(id: string, patch: Record<string, unknown> = {}): StrategyEntry {
 return { id, version: "fixture-v1", trigger: { question_types: ["rest"], acts: [1] }, strategy: "仅合成格式提示。", source: "own", confidence: .25,
  evidence: [{ run: "SILENT000001", floor: 3 }], scope: { character: "silent", ascensions: [10] },
  formal_publication: { approved_by: "fixture-owner", authorization: "https://example.com/approval", authorization_sha256: "a".repeat(64), source_candidate_sha256: "b".repeat(64), observation_only: true, original_review_candidate_retained_without_edit: true },
  review_observation: { triggers: ["营火", "路线"], conditions: { character: "silent", observable_build_conditions: "原文字条件不能猜成规则。" },
   summary: "合成观察摘要。", rule_candidate: "合成候选正文。", denominators: { own: { unit: "runs", n: 3 }, external: { unit: "uploads", n: 7 } },
   counterexamples: [{ label: "保留的反例", n: 1 }], limitations: ["观察性且未求值。"], conflicts_with: ["fixture-old"], status: "review-only" }, ...patch } as StrategyEntry;
}
function runtime(entries: StrategyEntry[], classified = false) {
 setKnowledgeCharacter("silent"); const root = mkdtempSync(join(tmpdir(), "decision-observations-")); dirs.push(root);
 const store = new KnowledgeStore(root); stores.push(store);
 const publish = (id: string, values: StrategyEntry[], classify = classified) => {
  const files: Record<string, string> = { [path]: JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: values }) };
  if (classify) files["characters/silent/classification.json"] = JSON.stringify({ schema: "knowledge-classification-v1", character: "silent", entries: values.map(e => ({
   id: `class-${e.id}`, target: { path, type: "strategy", id: e.id, sha256: classificationDigest(e) }, topics: ["climb_route"], entities: [], aliases: [], evidence: ["fixture-only"], rationale: "显式合成分类。" })) });
  const c: Candidate = { schema: "knowledge-candidate-v1", id, base: store.current(), character: "silent", source: "fixture", files };
  store.submit(c); store.validate(id); const version = store.publish(id); return { version, directory: join(root, "snapshots", version) };
 };
 return { store, publish, ...publish("first", entries) };
}
function request(directory: string, label = "rest/plan"): BrainRequest {
 const payload = { facts: { act: 1, floor: 3, deck: ["FIXTURE_A 格式"] } }, ctx = { label, payload, ascension: 10, knowledgeDir: directory, logsDir: "", options: { a: null } };
 return { label, payload, toolContext: ctx, knowledge: { mode: "tools" }, options: ctx.options, system: "fixed", question: "fixed", spec: pickSpec(label, ctx.options) };
}
const view = (r: BrainRequest, bytes = 8000) => (attachDecisionKnowledge(r, { enabled: true, bytes }).payload as any).decision_knowledge;

it("injects the actual published strategy shape without requiring a second knowledge document", () => {
 const e = entry("zz-published"), { directory, version } = runtime([e]); const result = view(request(directory));
 expect(result).toMatchObject({ status: "ok", knowledge_version: version, path, returned: 1 });
 expect(result.entries[0]).toMatchObject({ id: e.id, confidence: e.confidence, review_observation: e.review_observation,
  condition_evaluation: "not_evaluated", applicability: "formal_trigger_only" });
 expect(result.entries[0].full_document.input).toMatchObject({ source: "strategy_observation", detail: "full", document_id: e.id });
});

it("routes permanent add-card selection to the existing card-reward contract", () => {
 const { directory } = runtime([entry("add", { trigger: { question_types: ["card_reward"], acts: [1] } })]);
 expect(questionTypes("selection/add", {})).toEqual(["card_reward"]);
 expect(view(request(directory, "selection/add")).entries[0].id).toBe("add");
 const combat = request(directory, "selection/add"); combat.toolContext!.state = { in_combat: true };
 expect(attachDecisionKnowledge(combat, { enabled: true, bytes: 8000 })).toBe(combat);
});

it("does not inject unpublished drafts, legacy tasks, wrong role/ascension/act or unknown machine conditions", () => {
 const e = entry("good"), { directory } = runtime([e, entry("pending", { formal_publication: "pending" }), entry("legacy", { formal_publication: undefined })]);
 const req = request(directory); expect(view(req).entries.map((e: any) => e.id)).toEqual(["good"]);
 expect(view({ ...req, toolContext: { ...req.toolContext!, ascension: 9 } }).entries).toEqual([]);
 expect(view({ ...req, payload: { facts: { act: 2 } } }).entries).toEqual([]);
 expect(view({ ...req, payload: { run_brief: { character: "Ironclad" }, facts: { act: 1 } } }).entries).toEqual([]);
 const off = attachDecisionKnowledge(req, { enabled: false, bytes: 8000 }); expect(off).toBe(req);
 setKnowledgeCharacter("ironclad"); expect(attachDecisionKnowledge(req, { enabled: true, bytes: 8000 })).toBe(req);
 expect(publishedObservation(entry("bad-proof", { formal_publication: { observation_only: true } }))).toBeNull();
});

it("preserves exact noncontiguous ascension scope instead of accepting an index min/max gap", () => {
 const { directory } = runtime([entry("gap", { scope: { character: "silent", ascensions: [1, 10] } })]);
 const req = request(directory);
 expect(view({ ...req, toolContext: { ...req.toolContext!, ascension: 9 } }).entries).toEqual([]);
 expect(view(req).entries[0].id).toBe("gap");
});

it.each([2048, 4000, 8000, 24000])("bounds an oversized original observation to %i UTF-8 bytes and explicitly marks lost fields", budget => {
 const e = entry("large"), review = e.review_observation!;
 for (const key of ["conditions", "denominators", "counterexamples", "limitations"]) review[key] = { original: '中文😀"\\\n'.repeat(3000) };
 const { directory } = runtime([e]); const result = view(request(directory), budget);
 expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(budget); expect(result.returned).toBe(1);
 expect(result.entries[0]).toMatchObject({ id: e.id, truncated: true, condition_evaluation: "not_evaluated" });
 for (const key of ["conditions", "denominators", "counterexamples", "limitations"]) expect(result.entries[0].review_observation).toHaveProperty(key);
 expect(result.entries[0].omitted_fields).toContain("review_observation.conditions");
});

it("recovers every original condition/denominator/counterexample/limit byte via the bound full-document protocol", async () => {
 const e = entry("large", { full_review_evidence: ["合成原证据".repeat(5000)] });
 const { directory, version, publish } = runtime([e]);
 const later = publish("next", [{ ...e, strategy: "后继摘要。" }]);
 const tool = decisionContextTool(), ctx = request(directory).toolContext!;
 let offset: number | null = 0, raw = "";
 do {
  const result = await tool.run({ detail: "full", source: "strategy_observation", document_id: e.id, document_offset: offset }, ctx);
  expect(result.isError).toBeUndefined(); expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(24000);
  const data = JSON.parse(result.text); expect(data.knowledge_version).toBe(version); expect(data.path).toBe(path);
  raw += data.json_fragment; offset = data.next_document_offset;
 } while (offset !== null);
 expect(JSON.parse(raw)).toEqual(e); expect(view(request(later.directory)).knowledge_version).toBe(later.version);
 expect(view(request(directory)).knowledge_version).toBe(version);
 expect(JSON.parse((await tool.run({ detail: "full", document_id: e.id, source: "strategy_observation" }, { ...ctx, ascension: 9 })).text).status).toBe("no_match");
});

it.each(["map/route", "map/route-plan", "map/route-review"])("connects %s only to explicit published route triggers and preserves negative scenes", label => {
 const e = entry("route"), pending = entry("draft-route", { formal_publication: "pending" }), ordinary = entry("ordinary-act", { formal_publication: undefined, trigger: { question_types: ["act_plan"], acts: [1] } });
 const rest = entry("rest-only", { review_observation: { ...e.review_observation, triggers: ["营火"] } });
 const { directory } = runtime([e, pending, ordinary, rest]);
 expect(questionTypes(label, {})).toEqual(["map_route"]);
 expect(view(request(directory, label)).entries.map((e: any) => e.id)).toEqual(["route"]);
 expect(strategyMatches(request(directory, label).toolContext!).entries.map(e => e.id)).toEqual(["route"]);
});

it("ranks approved observations before ordinary and explicitly pending items without IDs/dates/confidence rewriting", () => {
 const observation = entry("zzzz"), pending = entry("aaaa", { confidence: .9, formal_publication: "pending" }), ordinary = entry("bbbb", { formal_publication: undefined, confidence: .8 });
 const lib = { schema: "brain-strategies-v1" as const, character: "silent" as const, entries: [pending, ordinary, observation] };
 expect(retrieveStrategies(lib, "rest/plan", { facts: { act: 1 } }).map(e => [e.id, e.confidence])).toEqual([["zzzz", .25], ["bbbb", .8], ["aaaa", .9]]);
 const narrow = entry("narrow"), broad = entry("broad", { trigger: { question_types: ["rest", "shop"], acts: [1] } });
 expect(retrieveStrategies({ ...lib, entries: [broad, narrow] }, "rest/plan", { facts: { act: 1 } })[0]?.id).toBe("narrow");
 const anchored = entry("anchor", { review_observation: { ...observation.review_observation, conditions: { observable_build_conditions: { core_card_ids: ["FIXTURE_A"] } } } });
 expect(retrieveStrategies({ ...lib, entries: [observation, anchored] }, "rest/plan", { facts: { act: 1, deck: ["FIXTURE_A 格式"] } })[0]?.id).toBe("anchor");
 const eventOnly = entry("a-event", { trigger: { question_types: ["event"], acts: [1] } });
 const checkpoint = entry("z-checkpoint", { trigger: { question_types: ["act_plan", "rest"], acts: [1] } });
 expect(retrieveStrategies({ ...lib, entries: [eventOnly, checkpoint] }, "event/act-plan", { facts: { act: 1 } })[0]?.id).toBe("z-checkpoint");
});

it("keeps unknown topics excluded and ranks applicable published entries first after explicit classification", async () => {
 const e = entry("zz-observation"), legacy = entry("aa-task", { formal_publication: "pending", confidence: .9 });
 const unclassified = runtime([e, legacy]), ctx = request(unclassified.directory).toolContext!, tool = typedKnowledgeTool(strategyTool());
 expect(JSON.parse((await tool.run({ query: "*", topic: "climb_route", limit: 3 }, ctx)).text).entries).toEqual([]);
 const classified = runtime([e, legacy], true), next = { ...ctx, knowledgeDir: classified.directory };
 const data = JSON.parse((await tool.run({ query: "*", topic: "climb_route", limit: 1 }, next)).text);
 expect(data.entries.map((e: any) => e.id)).toEqual(["zz-observation"]); expect(data.total_matches).toBe(2);
 const page = JSON.parse((await tool.run({ query: "*", topic: "climb_route", limit: 1, offset: 1 }, next)).text);
 expect(page.entries.map((e: any) => e.id)).toEqual(["aa-task"]);
 const negative = JSON.parse((await tool.run({ query: "*", topic: "climb_route" }, { ...next, payload: { facts: { act: 2 } } })).text);
 expect(negative.entries).toEqual([]);
});

it("retains original observation fields in typed consumer projections, including on a small response", () => {
 const e = entry("projection", { full_review_evidence: ["原证据".repeat(4000)] });
 const result = observationConsumerProjection(e, "kb_strategies", { query: "*" });
 expect(result.review_observation.conditions).toEqual(e.review_observation!.conditions);
 expect(result.full_document).toMatchObject({ tool: "kb_strategies", input: { detail: "full", document_id: e.id } });
 expect(result.omitted_fields).toContain("full_review_evidence");
});
