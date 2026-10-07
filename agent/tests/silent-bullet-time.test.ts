/** KV0JHNJCKXLS SILENT A10 F33 final T1-T5; silent-0246/0248/0249. Fixed observations only. */
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
import { replaySteps, solveTap, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const read = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Bullet Time evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync: read, default: { ...fs, readFileSync: read } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-bullet-time-states.json", import.meta.url), "utf8")) as Raw[];
const frame = (line = 279536): Raw => structuredClone(rows.find((r) => r.line === line)!.state);
const knowledge = makeKnowledge({ cards: frame().run.deck.map((c: Raw) => ({ id: c.card_id, type: c.card_type })) }, "cache");
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
function step(input: SolverInput, id: string) {
  const c = input.hand.find((entry) => entry.cardId === id)!;
  if (!c) throw new Error("missing fixed card: " + id);
  return { cardIndex: c.index, cardId: id, name: c.name, upgraded: c.upgraded, target: c.target === "single" ? 0 : null };
}
const prefix = ["BULLET_TIME", "SNAKEBITE", "BACKFLIP", "ADRENALINE", "POTION:RADIANT_TINCTURE:0"];

it("the final T1 prefix pays three, draws zero and preserves five Block plus both energy gains", () => {
  const input = inputFor();
  const plan = replaySteps(input, prefix.map((id) => step(input, id)))!;
  expect(plan.outcome).toMatchObject({ cardsDrawn: 0, blockGained: 5, energyLeft: 7, unknownCards: [] });
  expect(plan.steps.map((s) => s.cost)).toEqual([3, 0, 0, 0, 0]);
  expect(frame(279541).combat.player).toMatchObject({ energy: 7, block: 5 });
  expect(frame(279541).combat.hand).toHaveLength(3);
  for (const line of [279536, 279537, 279539, 279540, 279541]) {
    const draw = frame(line).agent_view.run.piles.draw as Raw[];
    expect(draw.reduce((n, c) => n + Number(/\*(\d+)/.exec(c.line)?.[1] ?? 1), 0)).toBe(22);
  }
  expect(input.hand.find((c) => c.cardId === "BACKFLIP")!.cost).toBe(1);
});

it("three starting energy can pay Bullet Time and then the formerly unaffordable hand", () => {
  const input = inputFor(); input.player.energy = 3;
  const plan = replaySteps(input, prefix.slice(0, 4).map((id) => step(input, id)))!;
  expect(plan.outcome).toMatchObject({ cardsDrawn: 0, blockGained: 5, energyLeft: 1 });
  const narrow = { ...input, hand: input.hand.filter((c) => ["BULLET_TIME", "SNAKEBITE", "BACKFLIP"].includes(c.cardId)) };
  narrow.hand.push({ ...narrow.hand.find((c) => c.cardId === "BACKFLIP")!, index: 50, key: "second-backflip" });
  narrow.enemies = narrow.enemies.map((e) => ({ ...e, attacks: [{ damage: 20, hits: 1 }] }));
  expect(solveTurn(narrow).plans.some((p) => p.steps[0]?.cardId === "BULLET_TIME" &&
    p.steps.some((s) => s.cardId === "BACKFLIP") && p.outcome.cardsDrawn === 0)).toBe(true);
  expect(replaySteps(input, [step(input, "BULLET_TIME"), step(input, "ASCENDERS_BANE")])).toBeNull();
  const locked = input.hand.find((c) => c.cardId === "SNAKEBITE")!;
  locked.playable = false;
  expect(replaySteps(input, [step(input, "BULLET_TIME"), step(input, "SNAKEBITE")])).toBeNull();
});

it("known pile cards cannot be borrowed after the lock, while a draw made before it remains", () => {
  const input = inputFor();
  const footwork = card(777, "FOOTWORK", { type: "Power", target: "self", cost: 1, dexterity: 2 });
  input.knownTop = [footwork];
  const locked = replaySteps(input, [step(input, "BULLET_TIME"), step(input, "BACKFLIP")])!;
  expect(locked.outcome.cardsDrawn).toBe(0);
  expect(replaySteps(input, [...locked.steps, { cardIndex: 777, cardId: "FOOTWORK", target: null }])).toBeNull();
  const before = replaySteps(input, [step(input, "BACKFLIP"), step(input, "BULLET_TIME"),
    { cardIndex: 777, cardId: "FOOTWORK", target: null }])!;
  expect(before.outcome.cardsDrawn).toBe(2);
  expect(before.steps[2]!.cost).toBe(0);
});

it("a replan on the actual locked frame retains energy and never invents draws", () => {
  const input = inputFor(frame(279537));
  expect(input.player.noDraw).toBe(true);
  const plan = replaySteps(input, [step(input, "BACKFLIP"), step(input, "ADRENALINE")])!;
  expect(plan.outcome).toMatchObject({ cardsDrawn: 0, blockGained: 5, energyLeft: 6 });
});

it("the draw lock also stops an existing expected-draw adapter without granting new cards a free cost", () => {
  const input = inputFor();
  const backflip = input.hand.find((c) => c.cardId === "BACKFLIP")!;
  const generated = card(777, "FIXED_DRAW", { cost: 2, damage: 9 });
  const potion = card(222, "POTION:FIXED_DRAW:1", { type: "Potion", target: "self", cost: 0,
    special: "gamble", discards: [backflip.key], generates: generated });
  input.hand.push(potion);
  const steps = [step(input, "BULLET_TIME"), step(input, potion.cardId)];
  expect(replaySteps(input, [...steps, { cardIndex: 7770, cardId: "FIXED_DRAW", target: 0 }])).toBeNull();
  // This is a protocol control, not a new potion or an observed drinking recommendation.
  const put = { ...potion, special: null, discards: undefined, generates: generated };
  input.hand[input.hand.indexOf(potion)] = put;
  const plan = replaySteps(input, [...steps, { cardIndex: 777, cardId: "FIXED_DRAW", target: 0 }])!;
  expect(plan.steps[2]!.cost).toBe(2);
});

it.each([false, true])("%s fullFight: free costs and the lock expire, Radiance adds energy for exactly three later turns", (whole) => {
  const before = inputFor();
  const observed = inputFor(frame(279537));
  const input = board({ playerHp: 70 });
  input.solver = observed;
  input.solver.enemies[0]!.attacks = [];
  input.solver.player.endTurnBlock = 0;
  input.meta = { ...input.meta, asc: 10, max_en: 3 };
  input.enemies = [{ index: 0, id: "FIXED_ENEMY", move: "WAIT", strength: 0, powers: {} }];
  input.tables = { FIXED_ENEMY: { moves: { WAIT: { damage: 20, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } } };
  input.playerPowers = {};
  input.potions = 1;
  // Paid draws in later hands expose any leaked free cost or lock. Base costs come from the observed deck.
  const backflip = before.hand.find((c) => c.cardId === "BACKFLIP")!;
  input.piles = { handBase: observed.hand.map((c) => before.hand.find((base) => base.cardId === c.cardId) ?? c),
    draw: Array.from({ length: 40 }, (_, i) => ({ ...backflip, index: 100 + i, key: `later-${i}` })), discard: [] };
  const first = replaySteps(observed, prefix.slice(1).map((id) => step(observed, id)))!;
  const later: SolverInput[] = [];
  solveTap.onSolve = (value) => later.push(structuredClone(value));
  const records = simulateFight(input, first, 5, 1, whole).records;
  solveTap.onSolve = null;
  expect(records).toHaveLength(5);
  expect(records[0]!.snap.en).toBe(7);
  expect(later.map((s) => s.player.energy)).toEqual([4, 4, 4, 3]);
  for (const s of later) {
    expect(s.player.noDraw).not.toBe(true);
    expect(s.hand.every((c) => c.cost === 1)).toBe(true);
    const chosen = solveTurn(s).plans[0]!;
    expect(chosen.steps).toHaveLength(s.player.energy);
    // The original hand can reshuffle back too; later draws must resume without assuming every card is Backflip.
    expect(chosen.outcome.cardsDrawn).toBeGreaterThan(0);
  }
});

it("observed start-of-turn energy independently confirms Radiance's three-turn expiry", () => {
  expect([279545, 279548, 279553, 279560].map((line) => frame(line).combat.player.energy)).toEqual([4, 4, 4, 3]);
});

it.each([["IRONCLAD", 10], ["SILENT", 9], ["SILENT", 10, true]])("%s A%i upgrade=%s keeps the old unobserved model", (character, asc, upgraded) => {
  const raw = frame(); raw.run.character_id = character; raw.run.ascension = asc;
  raw.combat.hand.find((c: Raw) => c.card_id === "BULLET_TIME").upgraded = upgraded ?? false;
  const input = inputFor(raw);
  expect(input.hand.find((c) => c.cardId === "BULLET_TIME")!.bulletTime).toBeUndefined();
  const plan = replaySteps(input, prefix.slice(0, 4).map((id) => step(input, id)))!;
  expect(plan.outcome).toMatchObject({ cardsDrawn: 4, blockGained: 5, energyLeft: 3 });
  expect(plan.outcome.unknownCards).toContain("子弹时间");
});

it("without Bullet Time the original Backflip and Adrenaline draws remain unchanged", () => {
  const input = inputFor();
  expect(replaySteps(input, [step(input, "BACKFLIP"), step(input, "ADRENALINE")])!.outcome)
    .toMatchObject({ cardsDrawn: 4, blockGained: 5, energyLeft: 8 });
  const raw = frame().combat.hand.find((c: Raw) => c.card_id === "BULLET_TIME");
  expect(modelHandCard({ ...raw, rules_text: "unknown", resolved_rules_text: "unknown" }, 0, knowledge, "silent", 10).bulletTime).toBeUndefined();
});
