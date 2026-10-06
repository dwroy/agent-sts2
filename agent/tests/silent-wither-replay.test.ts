/** DPYF2BAA3DKT SILENT A10 F48 final T1/T7; ledger bug-infra silent-0199 (mechanic silent-0200 independent). */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { resetFightMemory } from "../src/hand/loop.js";
import { replayRun } from "../src/memory/journal-replay.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { fightPlaysPerTurn, planCombatTurn, witherInput } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-wither-replay-state.json", import.meta.url), "utf8")) as Raw[];
const knowledge = makeKnowledge({ cards: rows[0]!.state.run.deck.map((card: Raw) =>
  ({ id: card.card_id, type: card.card_type })) }, "cache");
const before = rows.find((row) => row.ts === "2026-10-06T17:10:26.356Z")!;
const t7 = rows.find((row) => row.ts === "2026-10-06T17:12:12.747Z")!;
const skewer = rows.find((row) => row.ts === "2026-10-06T17:12:16.432Z")!;
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function logs(selected = rows, result = "completed: ok") {
  return { runId: "DPYF2BAA3DKT", states: structuredClone(selected), runPlans: [], decisions: [{
    ts: before.ts, fingerprint: before.fingerprint, label: "combat/plan", result,
    chosen: { action: "play_card", card_index: 1 },
  }] };
}
function env(row: Raw, memory = createScreenMemory("COMBAT")): DecisionEnv {
  const state = parseGameState(structuredClone(row.state));
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: memory, shopDiscardPotions: [] };
}
function restored(selected: Raw[], result = "completed: ok") {
  const memory = createScreenMemory("COMBAT");
  memory.fightCards = replayRun(logs(selected, result), knowledge).fightCards ?? undefined;
  return memory;
}
function count(row: Raw, memory = restored(rows.filter((r) => r.ts <= row.ts))) {
  const e = env(row, memory);
  const hand = row.state.combat.hand.map((card: Raw, i: number) => modelHandCard(card, i, knowledge, "silent"));
  return witherInput(e, row.state.combat, hand, row.state.combat.player.cards_played_this_turn)!;
}

it("F48 final T7: the first-turn enchantment makes twenty-six plays, without changing the manual mean", () => {
  const memory = restored(rows.filter((row) => row.ts <= t7.ts));
  expect(count(t7, memory)).toMatchObject({ every: 6, played: 26, damage: 9 });
  expect(fightPlaysPerTurn(env(t7, memory), 7)).toBe(25 / 6);
  expect(count(t7, memory).played).toBe(26); // A second question must not count the replay again.
});

it("F48 final T7: Skewer reaches the thirtieth play and the complete loss is thirty-five, not twenty-six", () => {
  const e = env(skewer, restored(rows.filter((row) => row.ts <= skewer.ts)));
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  planCombatTurn(e);
  expect(input).toBeDefined();
  const card = input!.hand.find((entry) => entry.cardId === "SKEWER")!;
  const plan = replaySteps(input!, [{ cardIndex: card.index, cardId: card.cardId, name: card.name,
    upgraded: card.upgraded, target: 0 }])!;
  expect(input!.wither?.played).toBe(29);
  expect(plan.outcome).toMatchObject({ withersAdded: 1, heldDamage: 18, incomingAfterBlock: 35 });
  // The required loss is not capped at the player's 28 HP or replaced by a fixture's missing revive history.
  expect(input!.player.hp - plan.outcome.incomingAfterBlock).toBe(-7);
});

it.each(["failed (timeout): rejected", "not dispatched: changed"])("%s adds no enchantment play", (result) => {
  expect(count(t7, restored(rows.filter((row) => row.ts <= t7.ts), result)).played).toBe(25);
});

it("a restart immediately after accepted dispatch retains one replay before the next state was logged", () => {
  const selected = rows.filter((row) => row.ts <= before.ts);
  const memory = restored(selected, "pending: accepted");
  expect(count(before, memory).played).toBe(5); // Four raw manual plays plus the accepted source card's replay.
  expect(Object.values(memory.fightCards!.replays ?? {})).toEqual([1]);
});

it("duplicate logged source rows and later questions retain only one extra play", () => {
  const input = logs(rows.filter((row) => row.ts <= t7.ts));
  input.decisions.push(structuredClone(input.decisions[0]!));
  const memory = createScreenMemory("COMBAT");
  memory.fightCards = replayRun(input, knowledge).fightCards ?? undefined;
  expect(count(t7, memory).played).toBe(26);
});

it("SL counter regression and the loop's successful reset discard the previous attempt's replay", () => {
  const memory = restored(rows.filter((row) => row.ts <= t7.ts));
  expect(count(rows[0]!, memory).played).toBe(0);
  const fresh = restored(rows.filter((row) => row.ts <= before.ts));
  resetFightMemory(fresh);
  expect(count(rows[0]!, fresh).played).toBe(0);
});

it("a retry inside T1 and a new room clear extras while enemy-turn counter resets preserve them", () => {
  const selection = rows.filter((row) => row.ts <= "2026-10-06T17:10:28.351Z");
  const opening = structuredClone(rows[0]!);
  expect(count(opening, restored(selection)).played).toBe(0);
  const enemyTurn = structuredClone(opening);
  enemyTurn.ts = "2026-10-06T17:10:28.900Z";
  enemyTurn.observed_ts = enemyTurn.ts;
  enemyTurn.state.combat.action_readiness.can_use_combat_actions = false;
  const memory = restored([...selection, enemyTurn]);
  expect(Object.values(memory.fightCards!.replays ?? {})).toEqual([1]);
  const room = structuredClone(t7); room.state.run.floor = 49;
  expect(count(room, restored(rows.filter((row) => row.ts <= t7.ts))).played).toBe(0);
});

it("restart retains observed nine-damage Withers when the current hand contains none", () => {
  const empty = structuredClone(t7); empty.state.combat.hand = [];
  expect(count(empty, restored(rows.filter((row) => row.ts <= t7.ts)))).toMatchObject({ played: 26, damage: 9 });
});

it("Throwing Axe is counted separately and Ironclad keeps the original raw-count behavior", () => {
  const memory = restored(rows.filter((row) => row.ts <= t7.ts));
  const axe = structuredClone(t7);
  axe.state.run.relics.push({ relic_id: "THROWING_AXE" });
  expect(count(axe, memory).played).toBe(27);
  const ironclad = rows.map((row) => {
    const copy = structuredClone(row); copy.state.run.character_id = "IRONCLAD"; return copy;
  });
  expect(replayRun(logs(ironclad), knowledge).fightCards).toBeNull();
});
