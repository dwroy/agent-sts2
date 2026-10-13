/** D9XJAX5KCSU2 SILENT A10 F48 attempt 3 T4; ledger silent-0297. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn, witherInput } from "../src/reflex/combat-plan.js";
import { observeFightPlays } from "../src/reflex/fight-plays.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-wither-visible-state.json", import.meta.url), "utf8")) as Raw[];
const frame = (line: number): Raw => structuredClone(rows.find((row) => row.line === line)!.state);
const knowledge = makeKnowledge({ cards: frame(382346).run.deck.map((card: Raw) =>
  ({ id: card.card_id, type: card.card_type })) }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function env(raw = frame(382346), memory = createScreenMemory("COMBAT")): DecisionEnv {
  const state = parseGameState(raw);
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: memory, shopDiscardPotions: [] };
}
function memoryBeforeTurn4(includePiles = false) {
  const memory = createScreenMemory("COMBAT");
  for (const line of [382330, 382335, 382340, 382345]) {
    const raw = frame(line);
    // Exercise a current frame even when earlier observations supplied only the raw hand channel.
    if (!includePiles) delete raw.agent_view;
    observeFightPlays(memory, env(raw, memory).state);
  }
  return memory;
}
function input(raw = frame(382346), memory = memoryBeforeTurn4()) {
  const e = env(raw, memory);
  const hand = raw.combat.hand.map((card: Raw, index: number) => modelHandCard(card, index, knowledge, "silent", 10));
  return witherInput(e, raw.combat, hand, raw.combat.player.cards_played_this_turn)!;
}

it("the visible discard supplies six damage before the next Wither enters the hand", () => {
  expect(input()).toEqual({ every: 6, played: 8, damage: 6 });
  expect(input(frame(382351))).toEqual({ every: 6, played: 12, damage: 6 });
});

it("the production input replays the observed four plays for 43 damage and 21 loss", () => {
  const e = env(frame(382346), memoryBeforeTurn4(true));
  let solver: SolverInput | undefined;
  solveTap.onSolve = (value) => { solver ??= value; };
  planCombatTurn(e);
  expect(solver).toBeDefined();
  const steps = [2, 3, 0, 1].map((index) => {
    const card = solver!.hand.find((entry) => entry.index === index)!;
    return { cardIndex: index, cardId: card.cardId, name: card.name, upgraded: card.upgraded,
      target: card.target === "single" ? 0 : null };
  });
  const plan = replaySteps(solver!, steps)!;
  expect(plan).not.toBeNull();
  expect(solver!.wither).toEqual({ every: 6, played: 8, damage: 6 });
  expect(plan.outcome).toMatchObject({ damageDealt: 43, withersAdded: 1, heldDamage: 6, incomingAfterBlock: 21 });
  expect(frame(382352).run.current_hp).toBe(solver!.player.hp - plan.outcome.incomingAfterBlock);
});

it("SL return to the observed T1 rebuilds three damage and the original zero count", () => {
  const memory = memoryBeforeTurn4();
  expect(input(frame(382346), memory).damage).toBe(6);
  expect(input(frame(382330), memory)).toEqual({ every: 6, played: 0, damage: 3 });
});

it.each(["draw", "discard", "exhaust"])("reads the same unambiguous rendered Wither from %s without multiplying copies", (pile) => {
  const raw = frame(382346);
  const view = raw.agent_view.combat;
  const wither = view.discard.find((entry: Raw) => entry.card_ids.includes("WITHER"));
  view.discard = view.discard.filter((entry: Raw) => !entry.card_ids.includes("WITHER"));
  view[pile] = [wither];
  expect(input(raw).damage).toBe(6);
});

it.each(["missing", "unresolved", "different-damage", "mixed-id", "hp-loss"])("%s text preserves the original input instead of choosing a pile value", (kind) => {
  const raw = frame(382346);
  const view = raw.agent_view.combat;
  const wither = view.discard.find((entry: Raw) => entry.card_ids.includes("WITHER"));
  if (kind === "missing") delete raw.agent_view;
  if (kind === "unresolved") wither.line = "凋萎+1*3 [0费]：你受到{Damage}点伤害。";
  if (kind === "different-damage") view.draw.push({ ...wither, line: wither.line.replace("6点", "3点") });
  if (kind === "mixed-id") wither.card_ids.push("CLUMSY");
  if (kind === "hp-loss") wither.line = wither.line.replace("受到6点伤害", "失去6点生命");
  expect(input(raw).damage).toBe(3);
});

it("a hand/pile disagreement keeps the existing hand cache rather than the larger pile number", () => {
  const raw = frame(382340);
  raw.agent_view.combat.discard = frame(382346).agent_view.combat.discard;
  expect(input(raw).damage).toBe(3);
});

it("a non-actionable frame cannot seed the cache from visible piles", () => {
  const raw = frame(382346);
  raw.combat.action_readiness.can_use_combat_actions = false;
  const memory = memoryBeforeTurn4();
  expect(observeFightPlays(memory, env(raw, memory).state)).toBe(false);
  expect(memory.fightCards!.witherDamage).toBe(3);
});

it.each(["IRONCLAD", "REGENT"])("%s retains its previous hand-only input on this synthetic boundary control", (character) => {
  const raw = frame(382346);
  raw.run.character_id = character;
  expect(input(raw, createScreenMemory("COMBAT")).damage).toBe(3);
});

it.each([9, 11])("unobserved A%i retains the previous hand-only input", (ascension) => {
  const raw = frame(382346);
  raw.run.ascension = ascension;
  expect(input(raw).damage).toBe(3);
});
