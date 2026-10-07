/** HSX4HYATB4E2 F31 T2; P5HT1272P5SB F25 T9; ledgers silent-0218 / silent-0143. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-fasten-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims } from "../src/reflex/combat-plan.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Fasten references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "FASTEN", type: "Power" }, { id: "DEFEND_SILENT", type: "Skill" },
  { id: "STRIKE_SILENT", type: "Attack" },
] }, "cache");
const rawFasten = evidence.hand.find((entry) => entry.card_id === "FASTEN")!;
const fasten = (index = 0) => modelHandCard({ ...rawFasten, index }, index, knowledge, "silent");
const defend = (index: number, block = 5) => card(index, "DEFEND_SILENT", {
  type: "Skill", target: "self", validTargets: [], block, blockBase: 5,
});
const step = (cardIndex: number, cardId: string, target?: number) => ({ cardIndex, cardId, name: cardId, upgraded: false, target });

it("P5HT F25 T9: Fasten then Defend gains 13 Block and still loses 13 HP", () => {
  const input: SolverInput = {
    hand: evidence.hand.map((raw) => modelHandCard(raw, raw.index, knowledge, "silent")),
    player: { hp: 3, maxHp: 77, energy: 3, block: 0, dexterityNow: 4,
      weak: false, vulnerable: false, intangible: false },
    enemies: enemySims({ enemies: evidence.enemies }), fightKind: "monster", turn: 9,
  };
  const plan = replaySteps(input, [step(0, "STRIKE_SILENT", 1), step(3, "FASTEN"), step(4, "DEFEND_SILENT")])!;
  expect(plan.outcome).toMatchObject({ blockGained: 13, hpLoss: 13 });
});

it("HSX F31 T2: Burst repeats the newly enhanced Defend for the observed 23 Block", () => {
  const input = board().solver;
  input.hand = [fasten(), card(1, "RING_OF_FORTITUDE", { type: "Skill", target: "self", block: 5 }),
    card(2, "BURST", { type: "Skill", target: "self", cost: 0, burst: true, burstSkills: 1 }), defend(3)];
  expect(replaySteps(input, input.hand.map((c) => step(c.index, c.cardId)))!.outcome.blockGained).toBe(23);
});

it("only Defends after Fasten gain the new Block; another Skill remains unchanged", () => {
  const input = board().solver;
  input.player.energy = 4;
  input.hand = [defend(0), fasten(1), defend(2), card(3, "TEST_BLOCK_SKILL", { type: "Skill", target: "self", block: 5 })];
  expect(replaySteps(input, input.hand.map((c) => step(c.index, c.cardId)))!.outcome.blockGained).toBe(19);
});

it("0143: Frail rounds after adding Fasten, for plain and upgraded Defends", () => {
  for (const [base, shown, expected] of [[5, 10, 13], [8, 12, 15]]) {
    const input = board().solver;
    input.player.frail = true;
    input.player.dexterityNow = 9;
    input.hand = [fasten(), { ...defend(1, shown), blockBase: base, upgraded: base === 8 }];
    const plan = replaySteps(input, [step(0, "FASTEN"), { ...step(1, "DEFEND_SILENT"), upgraded: base === 8 }]);
    expect(plan).not.toBeNull();
    expect(plan!.outcome.blockGained).toBe(expected);
  }
});

it("existing Fasten in the displayed Defend is not added again", () => {
  const input = board().solver;
  input.hand = [defend(0, 13)];
  expect(replaySteps(input, [step(0, "DEFEND_SILENT")])!.outcome.blockGained).toBe(13);
});

it("Fasten persists to later rollout turns without adding the current display twice", () => {
  const input = board();
  input.solver.hand = [fasten(), defend(1)];
  const plan = replaySteps(input.solver, [step(0, "FASTEN"), step(1, "DEFEND_SILENT")])!;
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 6 }, (_, i) => defend(10 + i)), discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 27, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const records = simulateFight(input, plan, 3, 1, false).records;
  expect(records[0]!.snap.pw.FASTEN_POWER).toBe(4);
  expect(records[1]!.loss).toBe(0);
  expect(records[2]!.loss).toBe(0);
  input.playerPowers = { FASTEN_POWER: 4 };
  input.solver.hand = [defend(0, 9)];
  input.piles.handBase = [defend(0)];
  const active = simulateFight(input, replaySteps(input.solver, [])!, 2, 1, false).records;
  expect(active[1]!.loss).toBe(0);
  expect(active[1]!.snap.pw.FASTEN_POWER).toBe(4);
});

it("unobserved Fasten upgrades and other characters do not gain this model", () => {
  expect(modelHandCard({ ...rawFasten, upgraded: true }, 0, knowledge, "silent").fasten).toBeUndefined();
  expect(modelHandCard(rawFasten, 0, knowledge, "ironclad").fasten).toBeUndefined();
});
