/** 61E2QS63Y9WU SILENT A10 F28 T2-T3; silent-0232. Fixed states, no generated knowledge. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed delayed-Block test"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-dodge-roll-state.json", import.meta.url), "utf8")) as Raw[];
const knowledge = makeKnowledge({ cards: [{ id: "DODGE_AND_ROLL", type: "Skill", cost: 1 }] }, "cache");
const frame = (line: number): Raw => structuredClone(rows.find((row) => row.line === line)!.row.state);
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function inputFor(raw: Raw): SolverInput {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return input;
}

function dodgeStep(input: SolverInput) {
  const c = input.hand.find((entry) => entry.cardId === "DODGE_AND_ROLL")!;
  return { cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded };
}

it.each([[273712, 273713, 3], [273725, 273726, 5]])("frame %i captures the observed amount before Tender reduces Dexterity", (before, after, amount) => {
  const input = inputFor(frame(before));
  const plan = replaySteps(input, [dodgeStep(input)])!;
  expect(plan.outcome.blockGained).toBe(amount);
  expect(plan.outcome.nextTurnBlock).toBe(amount);
  const actual = frame(after).combat.player;
  expect(actual.block - input.player.block).toBe(amount);
  expect(actual.powers.find((p: Raw) => p.power_id === "BLOCK_NEXT_TURN_POWER").amount).toBe(amount);
});

it("a card played earlier in the same plan reduces the captured amount, rather than using entry Dexterity", () => {
  const input = inputFor(frame(273712));
  const dodge = input.hand.find((c) => c.cardId === "DODGE_AND_ROLL")!;
  input.player.energy = 2;
  input.hand = [card(99, "FIXED_PREFIX", { type: "Skill", target: "self", cost: 0 }), { ...dodge, block: 6 }];
  const plan = replaySteps(input, [{ cardIndex: 99, cardId: "FIXED_PREFIX", name: "prefix", upgraded: false }, dodgeStep(input)])!;
  expect(plan.outcome).toMatchObject({ blockGained: 5, nextTurnBlock: 5 });
});

it.each([[273714, 273715, 3], [273729, 273730, 5]])("replanning at %i retains the pending amount without current-turn credit", (before, after, amount) => {
  const input = inputFor(frame(before));
  expect(input.player.nextTurnBlock).toBe(amount);
  const plan = replaySteps(input, [])!;
  expect(plan.outcome).toMatchObject({ blockGained: 0, nextTurnBlock: amount });
  const actual = frame(after).combat.player;
  expect(actual.block).toBe(amount);
  expect(actual.powers.some((p: Raw) => p.power_id === "BLOCK_NEXT_TURN_POWER" || p.power_id === "DEXTERITY_POWER")).toBe(false);
});

it.each([[273712, 3], [273725, 5]])("newly captured Block from %i is paid once after attribute reset", (line, amount) => {
  const input = board({ playerHp: 70 });
  input.solver = inputFor(frame(line));
  input.solver.player.hp = 70;
  const plan = replaySteps(input.solver, [dodgeStep(input.solver)])!;
  input.meta = { ...input.meta, asc: 10, t: 2 };
  input.playerPowers = Object.fromEntries(frame(line).combat.player.powers.map((p: Raw) => [p.power_id, p.amount]));
  input.enemies = [{ index: 0, id: "FIXED_HUNTER", move: "HIT", strength: 0, powers: {} }];
  input.tables = { FIXED_HUNTER: { moves: { HIT: { damage: 24, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 20 }, (_, i) =>
    card(100 + i, "FIXED_EMPTY", { type: "Skill", target: "self", cost: 0 })), discard: [] };
  const records = simulateFight(input, plan, 3, 1, false).records;
  expect(records[0]!.snap.pw.BLOCK_NEXT_TURN_POWER).toBe(amount);
  expect(records[1]!.loss).toBe(24 - amount);
  expect(records[1]!.snap.pw.DEXTERITY_POWER).toBeUndefined();
  expect(records[1]!.snap.pw.BLOCK_NEXT_TURN_POWER).toBeUndefined();
  expect(records[2]!.loss).toBe(24);
});

it("outside Silent A10 and the observed upgrade, the original card model is unchanged", () => {
  const raw = frame(273725).combat.hand.find((c: Raw) => c.card_id === "DODGE_AND_ROLL");
  for (const [character, ascension, upgraded] of [["IRONCLAD", 10, true], ["silent", 9, true], ["silent", 10, false]] as const) {
    expect(modelHandCard({ ...raw, upgraded }, 0, knowledge, character, ascension).dodgeRollNextBlock).toBeUndefined();
  }
});

it.each([["IRONCLAD", 10], ["SILENT", 9]])("%s A%i live replanning preserves the original outcome on identical state data", (character, ascension) => {
  const raw = frame(273729);
  raw.run.character_id = character;
  raw.run.ascension = ascension;
  const input = inputFor(raw);
  expect(input.player.nextTurnBlock).toBeUndefined();
  expect(replaySteps(input, [])!.outcome.nextTurnBlock).toBeUndefined();
  // The control removes only the unmodelled pending power from the same Silent evidence frame.
  raw.combat.player.powers = raw.combat.player.powers.filter((p: Raw) => p.power_id !== "BLOCK_NEXT_TURN_POWER");
  const control = inputFor(raw);
  expect(replaySteps(input, [])).toEqual(replaySteps(control, []));
});

it.each(["frail", "replay", "duplicate", "unknown-amount"])("unobserved %s keeps the option and marks delayed Block unknown", (scope) => {
  const input = inputFor(frame(273725));
  const dodge = input.hand.find((c) => c.cardId === "DODGE_AND_ROLL")!;
  input.player.frail = scope === "frail";
  input.player.duplicateSkills = scope === "duplicate" ? 1 : 0;
  input.hand = [{ ...dodge, ...(scope === "replay" ? { replay: 1 } : {}), ...(scope === "unknown-amount" ? { block: 4 } : {}) }];
  const plan = replaySteps(input, [dodgeStep(input)])!;
  expect(plan).not.toBeNull();
  expect(plan.outcome.nextTurnBlock).toBeUndefined();
  expect(plan.outcome.unknownCards.some((name) => name.includes("下回合格挡"))).toBe(true);
});
