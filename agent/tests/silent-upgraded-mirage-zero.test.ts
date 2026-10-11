/** K2JAGKVJAWZJ F46 T1/T6; 79UCJ0K6R9C1 F14 T6/T10/T11; silent-0010/0286. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-upgraded-mirage-zero-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims } from "../src/reflex/combat-plan.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";
import { card } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed zero-poison evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "MIRAGE", type: "Skill" }, { id: "INFECTION", type: "Status" },
] }, "cache");
type Frame = keyof typeof evidence.frames;
const rawMirage = evidence.frames.zeroBefore.hand.find((c) => c.card_id === "MIRAGE")!;

function inputAt(key: Frame = "zeroBefore", character = "silent", ascension = 10): SolverInput {
  const frame = evidence.frames[key];
  const player = frame.player;
  return {
    hand: frame.hand.map((c) => modelHandCard(c, c.index, knowledge, character, ascension)),
    player: { hp: player.current_hp, maxHp: player.max_hp, block: player.block, energy: player.energy,
      weak: false, vulnerable: false, intangible: false,
      dexterityNow: player.powers.find((p) => p.power_id === "DEXTERITY_POWER")?.amount ?? 0 },
    enemies: enemySims({ enemies: frame.enemies }, ascension, character),
    fightKind: "monster", turn: frame.turn,
  };
}
const step = (input: SolverInput, id = "MIRAGE") => {
  const c = input.hand.find((c) => c.cardId === id)!;
  return { cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded,
    target: c.target === "single" ? 0 : null };
};
function prior(input: SolverInput): SolverInput {
  return { ...input, hand: input.hand.map(({ observedZeroPoisonMirage: _flag, ...c }) => c) };
}

it("removes the invented lasting bonus only when the observed upgraded play still has zero poison", () => {
  const input = inputAt();
  const before = JSON.stringify(input);
  const chosen = [step(input)];
  const result = replaySteps(input, chosen)!.outcome;
  const old = replaySteps(prior(input), chosen)!.outcome;
  expect(old.lasting).toBeGreaterThan(0);
  expect(old.unknownCards).toContain("蜃景+");
  expect(result.lasting).toBe(0);
  expect(result.unknownCards).not.toContain("蜃景+");
  expect(result.blockGained).toBe(0);
  expect(result.damageDealt).toBe(0);
  expect(evidence.frames.zeroAfter.player.block).toBe(evidence.frames.zeroBefore.player.block);
  expect(evidence.frames.zeroAfter.player.energy).toBe(evidence.frames.zeroBefore.player.energy - 1);
  expect(JSON.stringify(input)).toBe(before);
  input.player.energy = 2;
  expect(replaySteps(input, [...chosen, ...chosen])).toBeNull();
});

it("rechecks poison after earlier cards instead of declaring the whole upgraded template known", () => {
  const input = inputAt();
  input.player.energy = 2;
  input.hand.push(card(99, "FIXED_POISON", { type: "Skill", poison: 5 }));
  const before = [step(input), step(input, "FIXED_POISON")];
  const after = [...before].reverse();
  expect(replaySteps(input, before)!.outcome.lasting).toBe(0);
  expect(replaySteps(input, after)).toEqual(replaySteps(prior(input), after));
  expect(replaySteps(input, after)!.outcome.unknownCards).toContain("蜃景+");
});

it.each(["poison", "dexterity", "newDexterity", "frail", "unmovable", "shadowmeld", "replay", "firstReplay", "burst", "free"])(
  "preserves the prior model for the unobserved %s combination", (kind) => {
    const input = inputAt();
    const mirage = input.hand.find((c) => c.cardId === "MIRAGE")!;
    if (kind === "poison") input.enemies[0]!.poison = 8;
    if (kind === "dexterity") input.player.dexterityNow = 2;
    if (kind === "frail") input.player.frail = true;
    if (kind === "unmovable") input.player.unmovableArmed = true;
    if (kind === "shadowmeld") input.player.shadowmeldActive = true;
    if (kind === "replay") mirage.replay = 1;
    if (kind === "firstReplay") input.player.firstCardReplay = true;
    if (kind === "burst") input.player.duplicateSkills = 1;
    if (kind === "free") mirage.cost = 0;
    const sequence = [step(input)];
    if (kind === "newDexterity") {
      input.player.energy = 2;
      input.hand.push(card(99, "FIXED_DEXTERITY", { type: "Power", target: "self", dexterity: 2 }));
      sequence.unshift(step(input, "FIXED_DEXTERITY"));
    }
    expect(replaySteps(input, sequence)).toEqual(replaySteps(prior(input), sequence));
  });

it("retains the ordinary Mirage's observed eight-poison plus two-Dexterity ten Block", () => {
  const input = inputAt("plainBefore");
  const result = replaySteps(input, [step(input)])!.outcome;
  expect(result.blockGained).toBe(10);
  expect(evidence.frames.plainAfter.player.block - evidence.frames.plainBefore.player.block).toBe(10);
});

it.each([["ironclad", 10], ["silent", 9], ["silent", 11], ["", 10]] as const)(
  "keeps %s A%i unchanged", (character, ascension) => {
    const input = inputAt("zeroBefore", character, ascension);
    expect(input.hand.find((c) => c.cardId === "MIRAGE")!.observedZeroPoisonMirage).toBeUndefined();
    expect(replaySteps(input, [step(input)])).toEqual(replaySteps(prior(input), [step(input)]));
  });

it("rejects altered templates and unexplained dynamic values", () => {
  for (const patch of [
    { upgraded: false }, { energy_cost: 0 }, { enchantment: { id: "UNOBSERVED" } },
    { resolved_rules_text: "获得1点格挡。" },
    { dynamic_values: rawMirage.dynamic_values.map((v) => v.name === "CalculationExtra" ? { ...v, current_value: 2 } : v) },
  ]) {
    expect(modelHandCard({ ...rawMirage, ...patch }, 0, knowledge, "silent", 10).observedZeroPoisonMirage).toBeUndefined();
  }
});

it.each([["infection6Before", "infection6After", 32], ["infection10Before", "infection10After", 11]] as const)(
  "keeps the already-correct held Infection loss in %s", (before, after, loss) => {
    const input = inputAt(before);
    const result = replaySteps(input, [])!.outcome;
    expect(result.hpLoss).toBe(loss);
    expect(evidence.frames[before].player.current_hp - evidence.frames[after].player.current_hp).toBe(loss);
  });

it("keeps lethal held Infection ahead of poison, without claiming an unplayed winning line", () => {
  const input = inputAt("infection11Before");
  const result = replaySteps(input, [])!.outcome;
  expect(result).toMatchObject({ dies: true, diesOwnTurn: true, winsFight: false, hpLoss: 2, damageDealt: 0 });
  expect(result.enemyHpAfter[0]).toMatchObject({ hp: 8, poison: 10 });
  expect(evidence.frames.infection11After.enemies[0]!.current_hp).toBe(8);
});
