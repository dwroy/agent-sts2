/** KV0JHNJCKXLS SILENT A10 F33 final T8; silent-0245/0247. No generated knowledge or model calls. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { replayRun } from "../src/memory/journal-replay.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { noteFightReplay, observeFightPlays } from "../src/reflex/fight-plays.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Sloth test has no generated references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-sloth-replay-state.json", import.meta.url), "utf8")) as Raw[];
const knowledge = makeKnowledge({ cards: [
  { id: "DEFEND_SILENT", type: "Skill" }, { id: "STRIKE_SILENT", type: "Attack" },
  { id: "NEUTRALIZE", type: "Attack" }, { id: "BULLET_TIME", type: "Skill" },
] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });
const frame = (i = 0): Raw => structuredClone(rows[i]!.state);
function inputFor(raw = frame(), memory = createScreenMemory("COMBAT")) {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: memory, shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return input;
}
function step(input: SolverInput, id: string) {
  const entry = input.hand.find((c) => c.cardId === id)!;
  return { cardIndex: entry.index, cardId: id, name: entry.name, upgraded: entry.upgraded,
    target: entry.target === "single" ? 0 : null };
}
function restored(result = "completed: ok", duplicate = false) {
  const decision = { ts: rows[0]!.ts, fingerprint: rows[0]!.fingerprint, label: "combat/plan", result,
    chosen: { action: "play_card", card_index: 0 } };
  const memory = createScreenMemory("COMBAT");
  memory.fightCards = replayRun({ runId: "KV0JHNJCKXLS", states: rows.slice(0, 2), runPlans: [],
    decisions: duplicate ? [decision, structuredClone(decision)] : [decision] }, knowledge).fightCards ?? undefined;
  return memory;
}

it("final T8: rejects Defend replay, Strike, Neutralize and preserves the actually executed prefix", () => {
  const input = inputFor();
  const steps = [step(input, "DEFEND_SILENT"), step(input, "STRIKE_SILENT"), step(input, "NEUTRALIZE")];
  expect(replaySteps(input, steps)).toBeNull();
  expect(input.player).toMatchObject({ maxPlays: 3, slothDefendReplay: true });
  expect(replaySteps(input, steps.slice(0, 2))!.outcome).toMatchObject({ blockGained: 14, damageDealt: 31, hpLoss: 2 });
  expect(solveTurn(input).plans.some((p) => p.steps.some((s) => s.cardId === "DEFEND_SILENT") &&
    p.steps.length > 2 && p.outcome.unknownCards.length === 0)).toBe(false);
});

it("the observed cap still allows Neutralize before the replay, without claiming an actual winning line", () => {
  const input = inputFor();
  expect(replaySteps(input, [step(input, "NEUTRALIZE"), step(input, "DEFEND_SILENT")])!.outcome)
    .toMatchObject({ blockGained: 14, damageDealt: 28, hpLoss: 0 });
});

it("replanning after accepted Defend leaves one slot, without changing the raw manual count", () => {
  const memory = createScreenMemory("COMBAT");
  noteFightReplay(memory, parseGameState(frame()), { action: "play_card", card_index: 0 });
  const input = inputFor(frame(1), memory);
  expect(input.player.maxPlays).toBe(1);
  expect(memory.fightCards!.perTurn["8"]).toBe(1);
  expect(replaySteps(input, [step(input, "STRIKE_SILENT"), step(input, "NEUTRALIZE")])).toBeNull();
  expect(replaySteps(input, [step(input, "STRIKE_SILENT")])!.outcome).toMatchObject({ damageDealt: 31, hpLoss: 2 });
  inputFor(frame(1), memory);
  expect(memory.fightCards!.slothReplays).toEqual({ "8:0": 1 });
});

it("accepted source rows restore the same cap after restart and duplicate rows count once", () => {
  for (const duplicate of [false, true]) {
    const memory = restored("completed: ok", duplicate);
    expect(inputFor(frame(1), memory).player.maxPlays).toBe(1);
    expect(memory.fightCards!.slothReplays).toEqual({ "8:0": 1 });
  }
});

it.each(["failed (timeout): rejected", "not dispatched: changed"])("%s adds no replay slot", (result) => {
  expect(inputFor(frame(1), restored(result)).player.maxPlays).toBe(2);
});

it("later turns, same-turn SL counter regression and a new room do not inherit the extra slot", () => {
  const memory = restored();
  const later = frame(); later.turn = 9;
  expect(inputFor(later, memory).player.maxPlays).toBe(3);
  expect(inputFor(frame(), memory).player.maxPlays).toBe(3);
  const retry = restored();
  expect(inputFor(frame(), retry).player.maxPlays).toBe(3);
  const nextRoom = frame(); nextRoom.run.floor = 34;
  expect(inputFor(nextRoom, restored()).player.maxPlays).toBe(3);
});

it("raw count two after replay plus Strike leaves no remaining cap and the actual death is retained", () => {
  const memory = restored();
  observeFightPlays(memory, parseGameState(frame(2)));
  // Re-enable only the raw card flag to test the cap independently of the game's legality hook.
  const raw = frame(2);
  raw.combat.hand[1].playable = true;
  raw.combat.hand[1].unplayable_reason = null;
  const input = inputFor(raw, memory);
  expect(input.player.maxPlays).toBe(0);
  expect(replaySteps(input, [step(input, "NEUTRALIZE")])).toBeNull();
  expect(rows[3]!.state.combat.player.current_hp).toBe(0);
  expect(rows[3]!.state.combat.enemies[0].current_hp).toBe(223);
});

it("a last-slot replay remains offered with an explicit unverified boundary", () => {
  const input = inputFor(); input.player.maxPlays = 1;
  const plan = replaySteps(input, [step(input, "DEFEND_SILENT")])!;
  expect(plan).not.toBeNull();
  expect(plan.outcome.unknownCards).toContain("懒惰（重放名额边界未验证）");
});

it.each(["IRONCLAD", "silent-a9", "no-sloth"])("%s keeps the original cap and replay behavior", (scope) => {
  const raw = frame();
  if (scope === "IRONCLAD") raw.run.character_id = "IRONCLAD";
  if (scope === "silent-a9") raw.run.ascension = 9;
  if (scope === "no-sloth") raw.combat.player.powers = raw.combat.player.powers.filter((p: Raw) => p.power_id !== "SLOTH_POWER");
  const input = inputFor(raw);
  expect(input.player.slothDefendReplay).toBeUndefined();
  expect(replaySteps(input, [step(input, "DEFEND_SILENT"), step(input, "STRIKE_SILENT"), step(input, "NEUTRALIZE")])!.outcome)
    .toMatchObject({ blockGained: 14, damageDealt: 34, hpLoss: 0 });
});

it.each([false, true])("later-turn rollout preserves the observed cap (whole fight=%s)", (whole) => {
  const input = board();
  input.solver.player.slothDefendReplay = true;
  input.solver.player.maxPlays = 3;
  input.playerPowers.SLOTH_POWER = 3;
  input.solver.hand = [];
  const replay = card(20, "DEFEND_SILENT", { type: "Skill", target: "self", validTargets: [], block: 7, replay: 1, cost: 0 });
  input.piles = { handBase: [], discard: [], draw: [replay, card(21, "STRIKE_SILENT", { damage: 6, cost: 0 }),
    card(22, "NEUTRALIZE", { damage: 3, weak: 1, cost: 0 })], drawTop: [0, 1, 2] };
  input.options = { handSize: 3, policyNodes: 1000 };
  const captures: SolverInput[] = [];
  solveTap.onSolve = (value) => { captures.push(value); };
  simulateFight(input, replaySteps(input.solver, [])!, 2, 1, whole);
  const later = captures.find((s) => s.turn === 2)!;
  expect(replaySteps(later, [step(later, "DEFEND_SILENT"), step(later, "STRIKE_SILENT"), step(later, "NEUTRALIZE")])).toBeNull();
  expect(later.player).toMatchObject({ slothDefendReplay: true, maxPlays: 3 });
});
