/** YF0LXT1QSTGG F48 T1 attempts 2/3 / silent-0079: predictions and executed outcomes stay separate. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { asRecord } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setMoveModelForTests } from "../src/knowledge/move-model.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { enemySims, planCombatTurn } from "../src/reflex/combat-plan.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";
import { noEffectTwin } from "../src/reflex/rollout-live.js";
import { silentSlResourceComparison } from "../src/reflex/silent-sl-resource-comparison.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import type { SlExploreEnv } from "../src/sl/explore.js";

vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__silent_sl_resources_fixed__/${name}`,
}));
vi.mock("../src/knowledge/monster-db.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/monster-db.js")>(),
  readMonsterDbJson: () => ({ monsters: {}, bosses: {}, encounters: {} }),
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
vi.mock("../src/reflex/rollout-live.js", async (original) => ({
  ...await original<typeof import("../src/reflex/rollout-live.js")>(),
  liveRollout: () => ({ available: false, reason: "固定输入未运行长程推演", elapsedMs: 0 }),
}));

const board = () => JSON.parse(readFileSync(new URL("./silent-sl-resource-state.json", import.meta.url), "utf8"));
const state = () => parseGameState(board());
const noMedians = { original: false, replacement: false };
const line = (hpLoss: number, damageDealt: number, cardsDrawn = 0) => ({
  steps: [], outcome: { hpLoss, damageDealt, blockGained: 0, strengthGained: 0, cardsDrawn, unknownCards: [], dies: false },
});
const comparison = (a: ReturnType<typeof line> | null, b: ReturnType<typeof line> | null, medians = noMedians) =>
  asRecord(silentSlResourceComparison(state(), a, b, medians).resource_comparison);

beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  setMoveModelForTests({});
  bossLinesOptions.enabled = false;
});
afterEach(() => {
  setMonsterDbForTests(null);
  setMoveModelForTests(null);
  bossLinesOptions.enabled = false;
});

it("records the observed 0/10 HP and 54/36 damage candidate costs without turning them into actual 0/9 and 45/38", () => {
  const record = comparison(line(0, 54), line(10, 36));
  expect(record).toMatchObject({ scope: "current_turn_prediction", delta: { hp_loss: 10, damage_dealt: -18 },
    original: { hp_loss: 0, damage_dealt: 54, execution: "unverified" },
    replacement: { hp_loss: 10, damage_dealt: 36, execution: "unverified" } });
});

it("retains draw and unknown-effect boundaries and never labels the listed continuation executed", () => {
  const draw = { ...line(0, 54, 1), steps: [{ cardIndex: 0, cardId: "DAGGER_THROW", name: "投掷匕首", upgraded: false, target: 0 }],
    outcome: { ...line(0, 54, 1).outcome, unknownCards: ["固定未建模牌"] } };
  const before = JSON.stringify(draw);
  expect(comparison(draw, line(9, 0))).toMatchObject({ original: { cards_drawn: 1, unmodelled_cards: ["固定未建模牌"],
    steps: [{ card: "DAGGER_THROW", hand_index: 0, target_index: 0 }], execution: "unverified" } });
  expect(JSON.stringify(draw)).toBe(before);
});

it("preserves unknowns for missing candidates, non-finite values and random-potion medians", () => {
  expect(comparison(line(0, 54), null)).toMatchObject({ replacement: null, delta: { hp_loss: null, damage_dealt: null } });
  expect(comparison(null, line(10, 36))).toMatchObject({ original: null, delta: { hp_loss: null } });
  expect(comparison(line(NaN, 54), line(10, 36))).toMatchObject({ original: { hp_loss: null }, delta: { hp_loss: null, damage_dealt: -18 } });
  expect(comparison(line(0, 54), line(10, 36), { original: false, replacement: true })).toMatchObject({
    replacement: { random_potion_median: true }, delta: { hp_loss: null, damage_dealt: null, block_gained: null, strength_gained: null } });
});

it("adds no record for another character or an unobserved ascension", () => {
  for (const change of [{ character_id: "IRONCLAD" }, { ascension: 9 }]) {
    const raw = board(); Object.assign(raw.run, change);
    expect(silentSlResourceComparison(parseGameState(raw), line(0, 54), line(10, 36), noMedians)).toEqual({});
  }
});

function planner(explore: Partial<SlExploreEnv> = {}) {
  const raw = board();
  const observed = parseGameState(raw);
  const knowledge = makeKnowledge({ cards: raw.run.deck.map((card: { card_id: string; type: string }) => ({ id: card.card_id, type: card.type })),
    monsters: [{ id: "TEST_SUBJECT", type: "Boss" }] }, "cache");
  const env: DecisionEnv = { state: observed, knowledge, brief: buildRunBrief(observed, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [], jevContext: "off",
    sl: { attempt: 3, maxAttempts: 6, previousAttempts: {}, showSim: true,
      explore: { played: { canon: [], text: [] }, ...explore } } };
  const decision = planCombatTurn(env);
  expect(decision?.kind).toBe("ask");
  return decision as AskDecision;
}

it("logs the replay comparison through the real planner while keeping the reference line's dispatched action", () => {
  const ask = planner();
  const entries = Object.entries(ask.questions.plan!.criteria!).filter(([key]) => key.startsWith("plan"));
  expect(entries.length).toBeGreaterThan(1);
  const original = entries[0]!;
  const reference = entries[1]!;
  const plays = String(JSON.parse(reference[1]!).plays).replace(/, then /g, ", ");
  const replay = planner({ replay: { line: plays, reference: 2, point: "T2, fixed resource audit" } });
  const answer = (choice: string) => ({ plan: { type: "choice" as const, choice, confidence: 0.9, probabilities: { [choice]: 1 }, raw: {} } });
  const baseline = ask.resolve(answer(reference[0]));
  const result = replay.resolve(answer(original[0]));
  expect(result.intent).toEqual(baseline.intent);
  const log = asRecord(asRecord(result.log?.sl_explore).replay);
  expect(log.overridden).toBe(true);
  expect(log.resource_comparison).toMatchObject({ scope: "current_turn_prediction",
    original: { execution: "unverified" }, replacement: { execution: "unverified" } });
  expect(asRecord(log.resource_comparison).original).not.toEqual(asRecord(log.resource_comparison).replacement);
});

it("records the deviation and later-turn avoidance in the same prediction scope", () => {
  const ask = planner();
  const [key, text] = Object.entries(ask.questions.plan!.criteria!).find(([entry]) => entry.startsWith("plan"))!;
  const plays = String(JSON.parse(text!).plays).replace(/, then /g, ", ");
  const answer = { plan: { type: "choice" as const, choice: key, confidence: 0.9, probabilities: { [key]: 1 }, raw: {} } };
  const point = "T1, fixed resource audit";
  const deviation = planner({ deviate: { point, excluded: [plays], attempts: [1, 2] } }).resolve(answer);
  expect(asRecord(deviation.log?.sl_explore).resource_comparison).toMatchObject({ scope: "current_turn_prediction" });
  const avoidance = planner({ avoid: { point, tried: { canon: [], loose: [] }, attempts: [1, 2] } }).resolve(answer);
  expect(asRecord(asRecord(avoidance.log?.sl_explore).avoid).resource_comparison).toMatchObject({
    scope: "current_turn_prediction", original_stage: "after_plan_guards_before_sl" });
});

function prism() {
  const raw = JSON.parse(readFileSync(new URL("./silent-sl-prism-resource-evidence.json", import.meta.url), "utf8")).board;
  const knowledge = makeKnowledge({ cards: raw.run.deck.map((c: { card_id: string; card_type: string }) => ({ id: c.card_id, type: c.card_type })) }, "cache");
  const player = raw.combat.player;
  const input: SolverInput = {
    hand: raw.combat.hand.map((c: { index: number }) => modelHandCard(c, c.index, knowledge, "silent", 10)),
    player: { hp: player.current_hp, maxHp: player.max_hp, block: player.block, energy: player.energy,
      weak: false, vulnerable: false, intangible: false },
    enemies: enemySims(raw.combat, 10, "silent"), fightKind: "elite", turn: 2,
  };
  const sequence = (ids: string[]) => ids.map((id) => {
    const c = input.hand.find((card) => card.cardId === id)!;
    return { cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded, target: c.target === "single" ? 0 : null };
  });
  const original = replaySteps(input, sequence(["SLICE", "STRIKE_SILENT", "DEADLY_POISON", "MIRAGE"]))!;
  const replacement = replaySteps(input, sequence(["MIRAGE", "SLICE", "STRIKE_SILENT"]))!;
  return { raw, state: parseGameState(raw), original, replacement };
}

it("keeps the Prism's observed 5 HP / -7 damage / -7 Block / -3 Tainted / -7 poison costs under saturated deaths", () => {
  const { state, original, replacement } = prism();
  expect(original.outcome).toMatchObject({ hpLoss: 3, damageDealt: 30, blockGained: 11, taintedGained: 6,
    enemyHpAfter: [{ hp: 121, poison: 10 }] });
  expect(replacement.outcome).toMatchObject({ hpLoss: 8, damageDealt: 23, blockGained: 4, taintedGained: 3,
    enemyHpAfter: [{ hp: 128, poison: 3 }] });
  const before = JSON.stringify([original, replacement]);
  const record = asRecord(silentSlResourceComparison(state, original, replacement, { ...noMedians, saturated: true }).resource_comparison);
  expect(record).toMatchObject({ rollout_saturated: true, observed_tainted_before_plays: 0,
    original: { tainted_gained_during_plays: 6, enemy_poison_after_turn: { "0": 10 }, execution: "unverified" },
    replacement: { tainted_gained_during_plays: 3, enemy_poison_after_turn: { "0": 3 }, execution: "unverified" },
    delta: { hp_loss: 5, damage_dealt: -7, block_gained: -7, tainted_gained_during_plays: -3, enemy_poison_after_turn: { "0": -7 } } });
  expect(JSON.stringify([original, replacement])).toBe(before);
});

it("keeps missing Tainted/poison forecasts and sampled medians unknown, and never interprets existing Tainted as newly gained", () => {
  const { raw, original, replacement } = prism();
  raw.combat.player.powers.push({ power_id: "TAINTED_POWER", amount: 3 });
  const observed = parseGameState(raw);
  const record = asRecord(silentSlResourceComparison(observed, original, replacement, { ...noMedians, saturated: false }).resource_comparison);
  expect(record).toMatchObject({ rollout_saturated: false, observed_tainted_before_plays: 3,
    original: { tainted_gained_during_plays: 6 }, delta: { tainted_gained_during_plays: -3 } });
  const missing = comparison(line(0, 0), line(0, 0));
  expect(missing).toMatchObject({ rollout_saturated: null, original: { tainted_gained_during_plays: null, enemy_poison_after_turn: null },
    delta: { tainted_gained_during_plays: null, enemy_poison_after_turn: null } });
  const median = asRecord(silentSlResourceComparison(observed, original, replacement, { original: false, replacement: true, saturated: true }).resource_comparison);
  expect(median).toMatchObject({ delta: { tainted_gained_during_plays: null, enemy_poison_after_turn: null } });
});

it("keeps an audit annotation out of the existing no-effect potion equivalence", () => {
  const { original } = prism();
  const annotated = { ...original, steps: [...original.steps, { cardId: "POTION:FIXED_AUDIT:0", cardIndex: 99, name: "fixed audit marker", upgraded: false, target: null }],
    outcome: { ...original.outcome, taintedGained: 123 } };
  expect(noEffectTwin(annotated, [original, annotated])).toBe(original);
});
