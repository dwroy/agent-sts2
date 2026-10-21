import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { Brain } from "../src/brain/brain.js";
import type { BrainRouter } from "../src/brain/router.js";
import type { BrainRequest } from "../src/brain/types.js";
import { pickSpec } from "../src/brain/specs.js";
import { userMessage } from "../src/brain/message.js";
import { applyStrategyEntries, parseStrategyLibrary, questionTypes, retrieveStrategies, StrategyEntries, STRATEGY_LIMITS, type StrategyEntry, type StrategyLibrary } from "../src/knowledge/strategy-entries.js";
const entry = (id = "fixture"): StrategyEntry => ({ id, version: "test-v1", trigger: { question_types: ["card_reward"] }, strategy: "仅测试占位文字，不是游戏建议。", source: "own", evidence: [{ run: "FIXTURE", floor: 4 }], confidence: .5 });
const library = (...entries: StrategyEntry[]): StrategyLibrary => ({ schema: "brain-strategies-v1", character: "silent", entries });
const payload = { run_brief: { character: "静默猎手", act: "1", floor: 4 }, facts: { act: 1, floor: 4, hp: "35/70 (50%)", act_boss: "FIXTURE_BOSS", deck_size: 3, deck: ["2x FIXTURE_A (Skill, 1 energy): 测试", "FIXTURE_B (Attack, 0 energy): 测试"] } };
const request = (label = "reward/card", p: unknown = payload): BrainRequest => ({ label, system: "fixed", question: "测试问题", payload: p, options: { yes: null }, spec: pickSpec(label, { yes: null }) });
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function store(lib: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "strategy-fixture-")); dirs.push(dir);
  const sub = join(dir, "characters", "silent"); mkdirSync(sub, { recursive: true });
  const path = join(sub, "strategy-entries.json"); writeFileSync(path, JSON.stringify(lib)); return { dir, path };
}
it("validates metadata and refuses malformed or misspelled triggers", () => {
  expect(parseStrategyLibrary(library(entry()))).toEqual(library(entry()));
  for (const change of [{ evidence: [] }, { version: "" }, { confidence: 1.1 }, { strategy: "中".repeat(500) }, { trigger: { question_types: ["event"], typo: 1 } }, { trigger: { question_types: [] } }, { trigger: { question_types: ["event"], hp_ratio: { min: .9, max: .1 } } }, { source: "external:fixture" }]) expect(() => parseStrategyLibrary(library({ ...entry(), ...change } as StrategyEntry))).toThrow();
  expect(() => parseStrategyLibrary(library(entry(), entry()))).toThrow();
  expect(() => parseStrategyLibrary(library({ ...entry(), source: "external:fixture", provenance: { url: "https://example.org/fixture", version: "fixture-v1", sha256: "a".repeat(64), license: "fixture" } }))).not.toThrow();
});
it("matches every trigger inclusively and rejects missing facts", () => {
  const exact: StrategyEntry = { ...entry(), trigger: { question_types: ["card_reward"], acts: [1], floor: { min: 4, max: 4 }, bosses: ["FIXTURE_BOSS"], hp_ratio: { min: .5, max: .5 }, deck_size: { min: 3, max: 3 }, deck_cards: [{ name: "FIXTURE_A", count: { min: 2, max: 2 } }, { name: "ABSENT", count: { max: 0 } }] } };
  const lib = parseStrategyLibrary(library(exact));
  expect(retrieveStrategies(lib, "reward/card", payload)).toEqual([exact]);
  for (const [key, value] of Object.entries({ act: 2, floor: 5, hp: "34/70", act_boss: "OTHER", deck_size: 2, deck: ["FIXTURE_A (Skill)"] })) expect(retrieveStrategies(lib, "reward/card", { ...payload, facts: { ...payload.facts, [key]: value } })).toEqual([]);
  expect(retrieveStrategies(lib, "reward/card", {})).toEqual([]);
  expect(retrieveStrategies(lib, "rest/plan", payload)).toEqual([]);
});
it("recognizes all five types, including standalone and merged act starts", () => {
  for (const [label, type] of [["reward/card", "card_reward"], ["event/choose", "event"], ["rest/plan", "rest"], ["shop/plan", "shop"], ["event/act-plan", "act_plan"]]) expect(questionTypes(label!, payload)).toContain(type);
  expect(questionTypes("run-plan", { run_state: { trigger: "act" } })).toEqual(["act_plan"]);
  expect(questionTypes("run-plan", { run_state: { trigger: "hp_drop" } })).toEqual([]);
  expect(questionTypes("event/plan", { run_plan_task: { trigger: "start" } })).toEqual(["event", "act_plan"]);
  expect(questionTypes("combat/plan", {})).toEqual([]);
});
it("ranks specificity/confidence/id, bounding count and UTF-8 bytes including evidence", () => {
  const specific: StrategyEntry = { ...entry("specific"), trigger: { question_types: ["card_reward"], acts: [1] } };
  const req = applyStrategyEntries(request(), library(entry("z"), { ...entry("a"), confidence: .8 }, specific, entry("b")));
  const block = (req.payload as { strategy_entries: { entries: StrategyEntry[] } }).strategy_entries;
  expect(block.entries.map((e) => e.id)).toEqual(["specific", "a", "b"]);
  const big = Array.from({ length: 10 }, (_, i) => ({ ...entry(String(i)), strategy: "中".repeat(400) }));
  const bounded = (applyStrategyEntries(request(), library(...big)).payload as { strategy_entries: unknown }).strategy_entries;
  expect(Buffer.byteLength(JSON.stringify(bounded))).toBeLessThanOrEqual(STRATEGY_LIMITS.bytes);
  const original = request(); expect(applyStrategyEntries(original, library({ ...entry(), evidence: [{ run: "x".repeat(5000), floor: 1 }] }))).toBe(original);
});
it("no match, missing or invalid file preserve request identity and prompt bytes", () => {
  const req = request(), loader = new StrategyEntries(), { dir, path } = store(library()), before = userMessage(req);
  expect(loader.apply(req, dir, "silent")).toBe(req);
  writeFileSync(path, '{"bad":true}'); expect(loader.apply(req, dir, "silent")).toBe(req);
  rmSync(path); expect(loader.apply(req, dir, "silent")).toBe(req);
  expect(applyStrategyEntries(req, library({ ...entry(), trigger: { question_types: ["shop"] } }))).toBe(req);
  expect(userMessage(req)).toBe(before);
});
it("reloads changes and isolates other characters and combat", () => {
  const { dir, path } = store(library(entry())), loader = new StrategyEntries(), req = request();
  expect(loader.apply(req, dir, "silent")).not.toBe(req);
  const iron = request("reward/card", { ...payload, run_brief: { character: "铁甲战士" } });
  expect(loader.apply(iron, dir, "ironclad")).toBe(iron);
  const combat = request("combat/plan"); expect(loader.apply(combat, dir, "silent")).toBe(combat);
  writeFileSync(path, JSON.stringify(library())); expect(loader.apply(req, dir, "silent")).toBe(req);
});
it("brain choose, choosePlan and askJson send retrieved entries to the router", async () => {
  const { dir } = store(library({ ...entry(), trigger: { question_types: ["card_reward", "event", "rest", "shop", "act_plan"] } }));
  const sent: BrainRequest[] = [];
  const router = { config: { knowledgePrefix: "off", fallback: null }, codexOnly: false, engineFor: () => "deepseek", toolsFor: () => false,
    decide: async (req: BrainRequest) => { sent.push(req); return { answer: { choice: "yes", reason: "fixture", plan: [] }, engine: "fixture", model: "fixture", attempts: 1, toolCalls: [], problems: [], usage: { inputTokens: 0, outputTokens: 0 }, latencyMs: 0 }; } } as unknown as BrainRouter;
  const brain = new Brain(router, { systemPrompt: "fixture" }); brain.setToolContext({ ascension: 0, knowledgeDir: dir, logsDir: dir });
  for (const label of ["reward/card", "event/choose", "rest/plan", "event/act-plan"]) await brain.choose(payload, "测试问题", { yes: null }, { label });
  await brain.choosePlan(payload, "测试问题", { yes: null }, { label: "shop/plan" });
  await brain.askJson({ run_state: { trigger: "act", act: 1, floor: 18 }, run_brief: { character: "静默猎手" } }, "run-plan");
  expect(sent).toHaveLength(6); for (const req of sent) expect(userMessage(req)).toContain('"strategy_entries"');
});
