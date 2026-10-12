import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { namedCardFacts, type CardReferenceContext } from "../src/knowledge/card-references.js";
import { loadKnowledge, makeKnowledge, type Knowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import type { ModClient } from "../src/hand/mod/client.js";
import { planEvent } from "../src/hand/screens/event.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { asRecord } from "../src/core/util/json.js";
import fixture from "./named-card-facts-fixture.json";

// Isolate the transport regression from every refreshed strategy table and from model calls.
vi.mock("../src/brain/build-facts.js", () => ({ buildFacts: () => ({}), deepseekDecides: () => true }));
vi.mock("../src/knowledge/monster-db.js", () => ({ monstersNamedIn: () => [] }));
vi.mock("../src/knowledge/outcome-facts.js", () => ({ eventOptionOutcome: () => null, outcomeStatsBasis: () => "", OUTCOME_BASIS_KEY: "basis" }));
vi.mock("../src/knowledge/enchant-text.js", () => ({ enchantsNamed: () => [], annotateEnchants: (text: string) => text }));
vi.mock("../src/hand/screens/route-review.js", () => ({ routeReviewBlock: () => null, withRouteReview: (_env: unknown, decision: unknown) => decision }));
vi.mock("../src/hand/screens/rest.js", () => ({ EVENT_NODES: [], forcedNext: () => null, forcedEliteWithin: () => false }));
vi.mock("../src/knowledge/event-pages.js", () => ({ isLastEventPage: () => false }));

const context: CardReferenceContext = { character: "silent", run: "64VJC5XT2AT2", floor: 34, source: "event:VAKUU:o1", modVersion: "0.16.2" };
const knowledge = makeKnowledge({ cards: fixture.cards }, "cache", fixture.catalog);
const getFacts = (text: string, data = knowledge, overrides: Partial<CardReferenceContext> = {}) =>
  asRecord(namedCardFacts(text, data, { ...context, ...overrides })["card_references"]) as { cards: Record<string, unknown>[]; unknowns: Record<string, unknown>[]; catalog: Record<string, unknown> };
const fake = (id: string, name: string, description = "固定测试文本。", extra = {}) => ({ id, name, description, cost: 1, keywords: [], is_x_cost: false, ...extra });

function eventQuestion(character = "SILENT", data: Knowledge = knowledge): AskDecision {
  const raw = structuredClone(fixture.state);
  raw.run.character_id = character;
  const state = parseGameState(raw);
  const env: DecisionEnv = {
    state, knowledge: data, screenMemory: createScreenMemory("EVENT"),
    brief: { character, act: "3", floor: 34, hp: "88/105", gold: raw.run.gold, ascension: 10, deck: "固定事件夹具", relics: [], relic_effects: [], potions: [], notes: [] },
    thresholds: { act: 0.8, strong: 0.9 }, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, shopDiscardPotions: [], buildDecider: "deepseek", oneshot: "off",
  };
  const result = planEvent(env);
  expect(result?.kind).toBe("ask");
  return result as AskDecision;
}

function optionsOf(question: AskDecision): Record<string, Record<string, unknown>> {
  const pick = question.questions["pick"]!;
  if (pick.type !== "choice") throw new Error("expected a fixed choice question");
  return Object.fromEntries(Object.entries(pick.criteria).map(([key, value]) => [key, JSON.parse(value!)]));
}

describe("named card fact transport", () => {
  it("64VJC5XT2AT2 F34: delivers WISH facts without changing choices, costs or actions", () => {
    const question = eventQuestion();
    const options = optionsOf(question);
    expect(Object.keys(options)).toEqual(["o0", "o1", "o2"]);
    expect(options.o1).toMatchObject({
      option: "原初之爪", description: fixture.state.event.options[1]!.description,
      max_hp_cost: 9, hp_after: "88/96 (92% of max)",
      card_references: {
        cards: [{ id: "WISH", name: "许愿", cost: 0, is_x_cost: false,
          description: "将你抽牌堆中的一张牌放入你的手牌。 消耗。", keywords: ["Exhaust"],
          upgrade: { description: "将你抽牌堆中的一张牌放入你的手牌。 消耗。" } }],
        catalog: { mod_version: "0.16.2", source: "cache" }, unknowns: [],
      },
    });
    expect(options.o0?.card_references).toBeUndefined();
    expect(options.o2?.card_references).toBeUndefined();
    for (let index = 0; index < 3; index++) {
      const choice = `o${index}`;
      const resolved = question.resolve({ pick: { type: "choice", choice, probabilities: { [choice]: 1 }, confidence: 1, raw: {} } });
      expect(resolved.intent).toEqual({ action: "choose_event_option", option_index: index });
    }
  });

  it("keeps other characters' question bytes independent of the new catalogue facts", () => {
    for (const character of ["IRONCLAD", "DEFECT"]) {
      expect(eventQuestion(character).questions).toEqual(eventQuestion(character, makeKnowledge({}, "cache")).questions);
      expect(JSON.stringify(eventQuestion(character).questions)).not.toContain("card_references");
    }
  });

  it("retains unknown names once with a character/version/field identity and no fabricated values", () => {
    const result = getFacts("将1张[purple]未知牌[/purple]和1张[purple]未知牌[/purple]加入手牌。");
    expect(result.cards).toEqual([]);
    expect(result.unknowns).toHaveLength(1);
    expect(result.unknowns[0]).toMatchObject({ identity: "未知牌", missing_fields: ["definition"], run_id: "64VJC5XT2AT2", floor: 34 });
    expect(result.unknowns[0]!.key).toContain("silent");
  });

  it("does not treat short ordinary words or contained names as separate card references", () => {
    const data = makeKnowledge({ cards: [fake("SHORT", "愿"), fake("WISH", "许愿"), fake("LONG", "美好许愿")] }, "cache");
    expect(namedCardFacts("希望愿望成真", data, context)).toEqual({});
    expect(getFacts("获得1张[purple]美好许愿[/purple]。", data).cards.map((card) => card.id)).toEqual(["LONG"]);
    expect(namedCardFacts("LONGER", data, context)).toEqual({});
  });

  it("marks same-name ambiguity and lets an explicit id resolve it", () => {
    const data = makeKnowledge({ cards: [fake("A", "同名牌"), fake("B", "同名牌")] }, "cache");
    const ambiguous = getFacts("获得1张[purple]同名牌[/purple]。", data);
    expect(ambiguous.cards).toEqual([]);
    expect(ambiguous.unknowns[0]).toMatchObject({ missing_fields: ["identity"], candidates: ["A", "B"] });
    const resolved = getFacts("获得1张[purple]同名牌[/purple]。", data, { cardIds: ["B"] });
    expect(resolved.cards.map((card) => card.id)).toEqual(["B"]);
    expect(resolved.unknowns).toEqual([]);
  });

  it("preserves a visible upgraded preview and temporary zero cost instead of cached base fields", () => {
    const result = getFacts("将1张[purple]许愿+[/purple]加入手牌。本回合耗能为0。", knowledge, {
      previews: [{ card_id: "WISH", is_upgraded: true, cost: 0, is_x_cost: false, description: "固定现场升级文本。", keywords: ["Exhaust"] }],
    });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({ id: "WISH", upgraded: true, cost: 0, description: "固定现场升级文本。", source: "本题现场预览" });
    expect(getFacts("获得1张[purple]许愿+[/purple]。").cards[0]).toMatchObject({ upgraded: true, cost: null });
    expect(getFacts("获得1张[purple]许愿+[/purple]。").unknowns[0]).toMatchObject({ missing_fields: ["cost"] });
  });

  it("carries X cost and missing definitions as data without inferring card values", () => {
    const data = makeKnowledge({ cards: [fake("X_CARD", "测试X牌", "", { cost: null, is_x_cost: true })] }, "cache");
    const result = getFacts("X_CARD", data);
    expect(result.cards[0]).toMatchObject({ cost: null, is_x_cost: true, description: null });
    expect(result.unknowns[0]).toMatchObject({ missing_fields: ["description"] });
  });

  it("stops cycles and exposes unresolved references at depth and count limits", () => {
    const data = makeKnowledge({ cards: [fake("A", "测试甲", "生成1张测试乙。"), fake("B", "测试乙", "生成1张测试甲和1张测试丙。"), fake("C", "测试丙")] }, "cache");
    expect(getFacts("获得1张测试甲。", data).cards.map((card) => card.id)).toEqual(["A", "B", "C"]);
    for (const limit of [{ maxDepth: 0 }, { maxCards: 1 }]) {
      const result = getFacts("获得1张测试甲。", data, limit);
      expect(result.cards.map((card) => card.id)).toEqual(["A"]);
      expect(result.unknowns).toEqual([expect.objectContaining({ identity: "B", missing_fields: ["reference_expansion"] })]);
    }
  });

  it("marks mismatched catalogue versions pending verification without blocking the choice", () => {
    const result = getFacts("获得1张[purple]许愿[/purple]。", knowledge, { modVersion: "different" });
    expect(result.cards[0]).toMatchObject({ verification: "版本不符，待核" });
    expect(result.unknowns[0]).toMatchObject({ identity: "WISH", missing_fields: ["version"] });
    expect(getFacts("WISH", makeKnowledge({ cards: fixture.cards }, "cache")).cards[0]).toMatchObject({ verification: "资料版本未知，待核" });
  });

  it("keeps full rule text instead of truncating away referenced card effects", () => {
    const description = "完整规则。".repeat(200) + "最后的条件。";
    const data = makeKnowledge({ cards: [fake("A", "测试牌", description)] }, "cache");
    expect(getFacts("获得1张测试牌。", data).cards[0]!.description).toBe(description);
  });

  it("retains catalogue provenance and upgrade fields for both cache and mock live loads", async () => {
    const dir = await mkdtemp(join(tmpdir(), "named-card-cache-"));
    try {
      await writeFile(join(dir, "game-data.json"), JSON.stringify({ mod_version: "0.16.2", fetched_at: fixture.catalog.fetchedAt, collections: { cards: fixture.cards } }));
      const collection = vi.fn(async (name: string) => name === "cards" ? fixture.cards : []);
      const client = { collection } as unknown as ModClient;
      const cached = await loadKnowledge(client, { cacheDir: dir, modVersion: "0.16.2" });
      expect(collection).not.toHaveBeenCalled();
      expect(cached.catalog).toEqual(fixture.catalog);
      expect(cached.card("WISH")!.upgrade).toEqual(fixture.cards[0]!.upgrade);
      const fresh = await loadKnowledge(client, { cacheDir: dir, modVersion: "new-version" });
      expect(fresh.source).toBe("live");
      expect(fresh.catalog?.modVersion).toBe("new-version");
      expect(fresh.card("WISH")!.upgrade).toEqual(fixture.cards[0]!.upgrade);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
