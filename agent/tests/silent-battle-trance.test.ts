/** 9R916WW0V65N A10 F49 T2; silent-0290/0292. Fixed observations, no live knowledge. */
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
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, traceSteps, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const isKnowledge = (path: unknown) => typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/");
  const read = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (isKnowledge(path)) throw Object.assign(new Error("ENOENT: fixed Battle Trance evidence"), { code: "ENOENT" });
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  const existsSync: typeof fs.existsSync = (path) => !isKnowledge(path) && fs.existsSync(path);
  return { ...fs, existsSync, readFileSync: read, default: { ...fs, existsSync, readFileSync: read } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-battle-trance-states.json", import.meta.url), "utf8")) as Raw[];
const frame = (line = 295458): Raw => structuredClone(rows.find((r) => r.line === line)!.state);
const knowledge = makeKnowledge({ cards: rows.flatMap((r) => r.state.run.deck.map((c: Raw) => ({ id: c.card_id, type: c.card_type }))) }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function inputFor(raw = frame()): SolverInput {
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
function step(input: SolverInput, id: string): Step {
  const c = input.hand.find((entry) => entry.cardId === id)!;
  if (!c) throw new Error("missing fixed card: " + id);
  return { cardIndex: c.index, cardId: id, upgraded: c.upgraded, target: c.target === "single" ? 0 : null };
}
function withBackflip(input = inputFor()): SolverInput {
  const raw = frame(295428).combat.hand.find((c: Raw) => c.card_id === "BACKFLIP");
  input.hand.push(modelHandCard({ ...raw, index: 90 }, 90, knowledge, "silent", 10));
  return input;
}

it("the live planner draws Trance's own three before locking, and Footwork retains its Dexterity", () => {
  const input = inputFor();
  const trace = traceSteps(input, [step(input, "BATTLE_TRANCE"), step(input, "FOOTWORK")]);
  expect(trace.complete).toBe(true);
  expect(trace.transitions[0]!.after).toMatchObject({ drawn: 3, noDraw: true, dexterity: 3 });
  expect(trace.transitions[1]!.after).toMatchObject({ drawn: 3, noDraw: true, dexterity: 5 });
  expect(frame(295459).combat.player.powers).toContainEqual(expect.objectContaining({ power_id: "NO_DRAW_POWER", amount: 1 }));
  expect(frame(295460).combat.hand).toHaveLength(frame(295459).combat.hand.length - 1);
});

it("a later draw keeps its Block but cannot borrow a fourth known card", () => {
  const input = withBackflip();
  const known = [0, 1, 2, 3].map((i) => card(100 + i, `FIXED_${i}`, { cost: 0, damage: 1 }));
  input.knownTop = known;
  const prefix = [step(input, "BATTLE_TRANCE"), step(input, "BACKFLIP")];
  expect(replaySteps(input, prefix)!.outcome).toMatchObject({ cardsDrawn: 3, blockGained: 5 });
  expect(replaySteps(input, [...prefix, { cardIndex: 100, cardId: "FIXED_0", target: 0 }])).not.toBeNull();
  expect(replaySteps(input, [...prefix, { cardIndex: 103, cardId: "FIXED_3", target: 0 }])).toBeNull();
});

it("draws made before Trance stay available; an existing lock blocks its own draw too", () => {
  const input = withBackflip();
  expect(replaySteps(input, [step(input, "BACKFLIP"), step(input, "BATTLE_TRANCE")])!.outcome.cardsDrawn).toBe(5);
  input.player.noDraw = true;
  expect(replaySteps(input, [step(input, "BATTLE_TRANCE"), step(input, "BACKFLIP")])!.outcome)
    .toMatchObject({ cardsDrawn: 0, blockGained: 5 });
});

it("sampled and SL optimistic draw adapters respect the same lock after their own draw", () => {
  const input = withBackflip();
  const trance = input.hand.find((c) => c.cardId === "BATTLE_TRANCE")!;
  const flip = input.hand.find((c) => c.cardId === "BACKFLIP")!;
  const drawn = card(101, "OWN_DRAW", { cost: 0, damage: 1 });
  Object.assign(trance, { draw: 0, drawn: [drawn] });
  Object.assign(flip, { draw: 0, drawn: [card(102, "LATER_DRAW", { cost: 0, damage: 1 })] });
  const prefix = [step(input, "BATTLE_TRANCE"), step(input, "BACKFLIP")];
  expect(replaySteps(input, prefix)!.outcome.cardsDrawn).toBe(1);
  expect(replaySteps(input, [...prefix, { cardIndex: 101, cardId: "OWN_DRAW", target: 0 }])).not.toBeNull();
  expect(replaySteps(input, [...prefix, { cardIndex: 102, cardId: "LATER_DRAW", target: 0 }])).toBeNull();
});

it("a replan reads the actual lock and the next observed turn has no lock", () => {
  const locked = inputFor(frame(295459));
  expect(locked.player.noDraw).toBe(true);
  expect(traceSteps(locked, [step(locked, "FOOTWORK")]).transitions[0]!.after.drawn).toBe(0);
  expect(inputFor(frame(295464)).player.noDraw).not.toBe(true);
});

it("the independent earlier A0 observation has the same three draws and a readable replan lock", () => {
  const input = inputFor(frame(211456));
  expect(traceSteps(input, [step(input, "BATTLE_TRANCE")]).transitions[0]!.after)
    .toMatchObject({ drawn: 3, noDraw: true });
  expect(inputFor(frame(211457)).player.noDraw).toBe(true);
  expect(frame(211458).combat.hand).toHaveLength(frame(211457).combat.hand.length - 1);
});

it.each([false, true])("fullFight=%s: later-turn draws resume without changing the existing rollout boundary", (whole) => {
  const firstInput = withBackflip();
  const first = replaySteps(firstInput, [step(firstInput, "BATTLE_TRANCE"), step(firstInput, "BACKFLIP")])!;
  const input = board({ playerHp: 70 });
  input.solver = firstInput;
  input.solver.player.hp = 70;
  input.solver.player.endTurnBlock = 0;
  input.solver.enemies = input.solver.enemies.slice(0, 1).map((e) => ({ ...e, hp: 500, maxHp: 500, attacks: [] }));
  input.enemies = [{ index: 0, id: "FIXED_ENEMY", move: "WAIT", strength: 0, powers: {} }];
  input.tables = { FIXED_ENEMY: { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } } };
  input.playerPowers = {};
  input.meta = { ...input.meta, asc: 10, max_en: 3 };
  const flip = firstInput.hand.find((c) => c.cardId === "BACKFLIP")!;
  input.piles = { handBase: firstInput.hand, draw: Array.from({ length: 30 }, (_, i) => ({ ...flip, index: 200 + i, key: `later-${i}` })), discard: [] };
  const later: SolverInput[] = [];
  solveTap.onSolve = (value) => later.push(structuredClone(value));
  simulateFight(input, first, 2, 1, whole);
  solveTap.onSolve = null;
  expect(later.length).toBeGreaterThan(0);
  const next = later[0]!;
  expect(next.player.noDraw).not.toBe(true);
  expect(replaySteps(next, [step(next, "BACKFLIP")])!.outcome.cardsDrawn).toBe(2);
});

it.each([["IRONCLAD", 10, false], ["SILENT", 9, false], ["SILENT", 10, true]])("%s A%i upgraded=%s keeps the previous model", (character, asc, upgraded) => {
  const raw = frame(); raw.run.character_id = character; raw.run.ascension = asc;
  raw.combat.hand.find((c: Raw) => c.card_id === "BATTLE_TRANCE").upgraded = upgraded;
  const input = withBackflip(inputFor(raw));
  expect(input.hand.find((c) => c.cardId === "BATTLE_TRANCE")!.drawLockAfter).toBeUndefined();
  expect(replaySteps(input, [step(input, "BATTLE_TRANCE"), step(input, "BACKFLIP")])!.outcome.cardsDrawn).toBe(5);
});

it("unverified replay and altered templates stay outside the certified lock", () => {
  const input = withBackflip();
  input.hand.find((c) => c.cardId === "BATTLE_TRANCE")!.replay = 1;
  const line = replaySteps(input, [step(input, "BATTLE_TRANCE"), step(input, "BACKFLIP")])!;
  expect(line.outcome.cardsDrawn).toBe(8);
  expect(line.outcome.unknownCards).toContain("战斗专注（自动出牌、重放或升级未验证）");
  const raw = frame().combat.hand.find((c: Raw) => c.card_id === "BATTLE_TRANCE");
  expect(modelHandCard({ ...raw, rules_text: "unknown" }, 0, knowledge, "silent", 10).drawLockAfter).toBeUndefined();
});
