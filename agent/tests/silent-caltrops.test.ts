/** CA5KE8GFJ9X2 F9 T6 / F13 T1; ledger bug-infra silent-0229. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-caltrops-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims } from "../src/reflex/combat-plan.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";
import { rolloutDecision, simulateFight } from "../src/reflex/rollout.js";
import { board } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Caltrops references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "CALTROPS", type: "Power" }, { id: "SURVIVOR", type: "Skill" },
  ...["FLICK_FLACK", "ASSASSINATE", "NEUTRALIZE"].map((id) => ({ id, type: "Attack" })),
] }, "cache");
const raw = evidence[0]!.hand.find((c) => c.card_id === "CALTROPS")!;
const caltrops = () => modelHandCard(raw, 0, knowledge, "silent");
const step = (cardIndex: number, cardId: string, target?: number) => ({ cardIndex, cardId, name: cardId, upgraded: false, target: target ?? null, targetName: null });
const played = step(0, "CALTROPS");

function persistentBoard() {
  const input = board();
  input.solver.hand = [caltrops()];
  input.piles = { handBase: input.solver.hand, draw: [], discard: [] };
  input.options = { handSize: 0, horizon: 3, samples: 1, k: 1, now: () => 0 };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  return input;
}

it("CA5 F9 T6: Caltrops exposes the observed three Thorns", () => {
  expect(caltrops()).toMatchObject({ thorns: 3, cost: 1, type: "Power", retaliate: 0 });
});

it("CA5 F9 T6: the seven action damage and three enemy-turn damage stay separate", () => {
  const frame = evidence[0]!;
  const input: SolverInput = {
    hand: frame.hand.map((c) => modelHandCard(c, c.index, knowledge, "silent")),
    player: { hp: 5, maxHp: 70, energy: 3, block: 0, weak: false, vulnerable: false, intangible: false },
    enemies: enemySims({ enemies: frame.enemies }), fightKind: "monster", turn: 6,
  };
  const outcome = replaySteps(input, [played, step(1, "SURVIVOR"), step(2, "FLICK_FLACK")])!.outcome;
  expect(outcome.damageDealt).toBe(7);
  expect(outcome.retaliated).toEqual([{ index: 0, amount: 3 }]);
});

it("CA5 F13 T1: fifteen action damage excludes the new three Thorns", () => {
  const frame = evidence[1]!;
  const input: SolverInput = {
    hand: frame.hand.map((c) => modelHandCard(c, c.index, knowledge, "silent")),
    // Isolate the damage bookkeeping from the other cards drawn during the actual turn.
    player: { hp: 70, maxHp: 70, energy: 3, block: 0, weak: false, vulnerable: false, intangible: false },
    enemies: enemySims({ enemies: frame.enemies }), fightKind: "monster", turn: 1,
  };
  const outcome = replaySteps(input, [step(0, "ASSASSINATE", 0), step(2, "NEUTRALIZE", 0),
    step(3, "CALTROPS"), step(6, "FLICK_FLACK")])!.outcome;
  expect(outcome.damageDealt).toBe(15);
  expect(outcome.enemyHpAfter[0]!.hp).toBe(43);
  expect(outcome.retaliated).toEqual([{ index: 0, amount: 3 }]);
});

it("new Thorns persists in the later turns of both rollout paths", () => {
  const input = persistentBoard();
  const plan = replaySteps(input.solver, [played])!;
  input.plans = [plan];
  for (const fullFight of [false, true]) {
    const records = simulateFight(input, plan, 3, 1, fullFight).records;
    expect(records).toHaveLength(3);
    expect(records.map((r) => r.hpLeft![0])).toEqual([117, 114, 111]);
    expect(records.map((r) => r.snap.pw.THORNS_POWER)).toEqual([3, 3, 3]);
  }
  const rolled = rolloutDecision(input);
  expect(rolled.horizon).toBe(3);
  expect(rolled.lines[0]!.enemyHpLeft).toBe(111);
});

it("reading existing Thorns does not add it again in later turns", () => {
  const input = persistentBoard();
  input.solver.hand = [];
  input.piles.handBase = [];
  input.playerPowers = { THORNS_POWER: 3 };
  input.solver.player.retaliate = 3;
  const records = simulateFight(input, replaySteps(input.solver, [])!, 3, 1, false).records;
  expect(records.map((r) => r.hpLeft![0])).toEqual([117, 114, 111]);
  expect(records.map((r) => r.snap.pw.THORNS_POWER)).toEqual([3, 3, 3]);
});

it("non-attacking turns do not trigger the newly established Thorns", () => {
  const input = persistentBoard();
  input.solver.enemies[0]!.attacks = [];
  input.tables.TEST_BOSS!.moves.HIT!.damage = 0;
  const records = simulateFight(input, replaySteps(input.solver, [played])!, 3, 1, false).records;
  expect(records.map((r) => r.hpLeft![0])).toEqual([120, 120, 120]);
  expect(records[2]!.snap.pw.THORNS_POWER).toBe(3);
});

it("unobserved upgrades and other characters keep their existing Caltrops model", () => {
  expect(modelHandCard({ ...raw, upgraded: true }, 0, knowledge, "silent").thorns).toBeUndefined();
  expect(modelHandCard(raw, 0, knowledge, "ironclad").thorns).toBeUndefined();
});
