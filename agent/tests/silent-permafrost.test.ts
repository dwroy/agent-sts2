/** 25226ZFLNR1J F29 T1 and PJ2LL9KU7FHD F17 attempt 3 T4; ledger silent-0172/0173. */
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
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { notePermafrostPlay, observePermafrost, permafrostBlock } from "../src/reflex/permafrost.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-permafrost-state.json", import.meta.url), "utf8")) as Raw[];
const knowledge = makeKnowledge({ cards: [...new Map(rows.flatMap((row) => row.state.run.deck)
  .map((entry: Raw) => [entry.card_id, { id: entry.card_id, type: entry.card_type }])).values()] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  setMonsterDbForTests(null);
  rolloutLiveOptions.enabled = oldRollout;
});
const frame = (ts: string) => structuredClone(rows.find((row) => row.ts.includes(ts))!.state) as Raw;
const state = (ts: string) => parseGameState(frame(ts));
const start = () => state("02:38:45");
const before = () => state("02:39:13");
const after = () => state("02:39:16");
function remembered(ts = "02:39:13") {
  const memory = createScreenMemory("COMBAT");
  for (const row of rows.filter((row) => row.run === "PJ2LL9KU7FHD" && row.ts <= `2026-10-06T${ts}.999Z`)) {
    observePermafrost(memory, parseGameState(row.state));
  }
  return memory;
}
function inputFor(raw: Raw, memory = createScreenMemory("COMBAT")) {
  const current = parseGameState(raw);
  const env: DecisionEnv = { state: current, knowledge, brief: buildRunBrief(current, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: memory, shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the fixed board was not solved");
  return input;
}
function step(input: SolverInput, id: string, occurrence = 0) {
  const entry = input.hand.filter((c) => c.cardId === id)[occurrence]!;
  return { cardIndex: entry.index, cardId: id, name: entry.name, upgraded: entry.upgraded,
    target: entry.target === "single" ? 0 : null };
}

it("PJ2 F17 attempt 3 T4: Phantom Blades and two potion-adjusted Defends give 21 Block and zero loss", () => {
  const input = inputFor(frame("02:39:13"), remembered());
  expect(input.player.permafrostBlock).toBe(7);
  const potion = input.hand.find((entry) => entry.cardId.startsWith("POTION:DEXTERITY_POTION"))!;
  expect(potion).toBeDefined();
  const plan = replaySteps(input, [step(input, "SLICE"), step(input, "PHANTOM_BLADES"),
    step(input, potion.cardId), step(input, "DEFEND_SILENT"), step(input, "DEFEND_SILENT", 1)])!;
  expect(plan.outcome).toMatchObject({ blockGained: 21, hpLoss: 0, permafrostBlockLeft: 0 });
});

it("25226 F29 T1: the first Footwork gives seven Block before any defending card", () => {
  const raw = frame("21:35:34");
  const input = inputFor(raw);
  expect(replaySteps(input, [step(input, "FOOTWORK")])!.outcome.blockGained).toBe(7);
  expect(replaySteps(input, [step(input, "FOOTWORK"), step(input, "FOOTWORK", 1)])!.outcome.blockGained).toBe(7);
});

it("continuation counts the seven existing Block once and cannot arm a second Power", () => {
  const memory = remembered("02:39:16");
  const input = inputFor(frame("02:39:16"), memory);
  expect(input.player.permafrostBlock).toBeUndefined();
  expect(input.player.block).toBe(7);
  expect(replaySteps(input, [step(input, "DEFEND_SILENT"), step(input, "DEFEND_SILENT", 1)])!.outcome.blockGained).toBe(10);
  const later = frame("02:39:16");
  later.turn = 5; later.combat.player.block = 0;
  for (const key of ["cards_played_this_turn", "attacks_played_this_turn", "skills_played_this_turn"]) later.combat.player[key] = 0;
  expect(permafrostBlock(memory, parseGameState(later))).toBeUndefined();
});

it("SL restores the observed opening, including a retry inside the first turn", () => {
  const memory = remembered("02:39:16");
  expect(permafrostBlock(memory, after())).toBeUndefined();
  expect(permafrostBlock(memory, start())).toBe(7);
  const t1 = frame("02:39:13"); t1.turn = 1;
  notePermafrostPlay(memory, parseGameState(t1), { action: "play_card", card_index: 1 }, knowledge);
  const counted = structuredClone(t1); counted.combat.player.cards_played_this_turn = 1;
  observePermafrost(memory, parseGameState(counted));
  expect(permafrostBlock(memory, start())).toBe(7);
});

it("unrecorded mid-fight history, missing counts and skipped turns never invent an unused trigger", () => {
  expect(permafrostBlock(createScreenMemory("COMBAT"), before())).toBeUndefined();
  const memory = remembered();
  const missing = frame("02:39:13"); delete missing.combat.player.skills_played_this_turn;
  expect(permafrostBlock(memory, parseGameState(missing))).toBeUndefined();
  const skipped = frame("02:39:13"); skipped.turn = 6;
  expect(permafrostBlock(remembered(), parseGameState(skipped))).toBeUndefined();
});

it("in-combat selections preserve availability, and enemy-turn counter resets do not look like SL", () => {
  const memory = remembered("02:39:16");
  const reset = frame("02:39:13"); reset.turn = 4;
  reset.combat.player.cards_played_this_turn = 0;
  reset.combat.action_readiness.can_use_combat_actions = false;
  observePermafrost(memory, parseGameState(reset));
  expect(memory.permafrost!.status).not.toBe("armed");
  const selection = frame("02:39:13"); selection.screen = "CARD_SELECTION";
  expect(permafrostBlock(remembered(), parseGameState(selection))).toBe(7);
});

it("journal replay restores availability before a Power and consumption immediately after accepted dispatch", () => {
  const selected = rows.filter((row) => row.run === "PJ2LL9KU7FHD" && row.ts <= "2026-10-06T02:39:13.999Z");
  const states = selected.map((row, index) => ({ ts: row.ts, observed_ts: row.ts, fingerprint: `p${index}`, state: row.state }));
  const last = states.at(-1)!;
  const logs = { runId: "PJ2LL9KU7FHD", states, decisions: [], runPlans: [] };
  expect(replayRun(logs, knowledge).permafrost?.status).toBe("armed");
  for (const result of ["completed: ok", "pending: accepted", "failed (timeout): rejected", "not dispatched: changed"]) {
    const replay = replayRun({ ...logs, decisions: [{ ts: last.ts, fingerprint: last.fingerprint,
      label: "combat/plan", result, chosen: { action: "play_card", card_index: 1 } }] }, knowledge);
    expect(replay.permafrost?.status).toBe(result.startsWith("completed") || result.startsWith("pending") ? "spent" : "armed");
  }
});

it("the loop's successful SL reset restores availability even before a post-Power frame was read", () => {
  const memory = createScreenMemory("COMBAT");
  const t1 = frame("02:39:13"); t1.turn = 1;
  notePermafrostPlay(memory, parseGameState(t1), { action: "play_card", card_index: 1 }, knowledge);
  expect(memory.permafrost?.status).toBe("spent");
  resetFightMemory(memory);
  expect(permafrostBlock(memory, start())).toBe(7);
});

it("a timed-out action that really applied is detected from the next observed counters", () => {
  const memory = remembered();
  observePermafrost(memory, after());
  expect(permafrostBlock(memory, after())).toBeUndefined();
});

it("Ironclad and boards without Permafrost keep their previous solver numbers", () => {
  const raw = frame("21:35:34");
  raw.run.character_id = "IRONCLAD";
  const ironclad = inputFor(raw);
  expect(ironclad.player.permafrostBlock).toBeUndefined();
  expect(replaySteps(ironclad, [step(ironclad, "FOOTWORK")])!.outcome.blockGained).toBe(0);
  raw.run.character_id = "SILENT";
  raw.run.relics = raw.run.relics.filter((r: Raw) => r.relic_id !== "PERMAFROST");
  const absent = inputFor(raw);
  expect(replaySteps(absent, [step(absent, "FOOTWORK")])!.outcome.blockGained).toBe(0);
});

it("rollout spends the trigger across turns and keeps it when this turn plays no Power", () => {
  for (const immediate of [true, false]) {
    const input = board({ bossHp: 500 });
    const power = card(0, "FOOTWORK", { type: "Power", target: "self", validTargets: [], cost: 1, dexterity: 2 });
    input.solver.hand = immediate ? [power] : [];
    input.solver.player.permafrostBlock = 7;
    input.solver.player.energy = 3;
    const plan = replaySteps(input.solver, immediate ? [step(input.solver, "FOOTWORK")] : [])!;
    input.plans = [plan]; input.options = { handSize: 1 };
    input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 8 }, (_, i) => ({ ...power, index: 10 + i, key: `c${10 + i}` })), discard: [] };
    input.tables.TEST_BOSS = { moves: { HIT: { damage: 20, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const records = simulateFight(input, plan, 3, 1, false).records;
    expect(records).toHaveLength(3);
    expect(records[0]!.snap.blk).toBe(immediate ? 7 : 0);
    expect(records[1]!.snap.blk).toBe(immediate ? 0 : 7);
    expect(records[2]!.snap.blk).toBe(0);
  }
});

it("unverified repeated Power triggers are explicitly uncertain", () => {
  const input = board().solver;
  input.player.permafrostBlock = 7;
  input.hand = [card(0, "FOOTWORK", { type: "Power", target: "self", replay: 1 })];
  const outcome = replaySteps(input, [step(input, "FOOTWORK")])!.outcome;
  expect(outcome.blockGained).toBe(7);
  expect(outcome.unknownCards).toContain("永冻冰晶（能力重放触发未验证）");
});
