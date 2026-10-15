import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-pounce-coverage-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { board } from "./boss-sim-fixture.js";

// Fixed Silent frames only; refreshed knowledge cannot certify missing card effects.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Pounce coverage evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "POUNCE", type: "Attack" }] }, "cache");
const model = (raw: Record<string, unknown>, character = "silent", ascension: number | null = 10) =>
  modelHandCard(raw, 0, knowledge, character, ascension);

it.each(evidence.cases)("keeps F$floor T$turn's unmodelled free Skill visible while retaining its damage", (row) => {
  const raw = row.before.hand.find((c) => c.card_id === "POUNCE")!;
  const modeled = model(raw);
  const saved = JSON.stringify(raw);
  const free = (powers: { power_id: string; amount: number }[]) =>
    powers.find((p) => p.power_id === "FREE_SKILL_POWER")?.amount ?? 0;
  expect(free(row.after.player.powers) - free(row.before.player.powers)).toBe(1);
  expect(row.before.player.energy - row.after.player.energy).toBe(2);
  expect(modeled).toMatchObject({ known: false, cost: 2, flatValue: 0,
    damage: raw.dynamic_values[0]!.current_value });
  const input = board().solver;
  input.hand = [modeled];
  input.player.energy = 2;
  input.enemies[0]!.attacks = [];
  const plan = replaySteps(input, [{ cardIndex: modeled.index, cardId: modeled.cardId,
    name: modeled.name, upgraded: modeled.upgraded, target: 0 }])!;
  expect(plan.steps).toHaveLength(1);
  expect(plan.outcome.unknownCards).toContain(modeled.name);
  expect(plan.outcome.damageDealt).toBe(raw.dynamic_values[0]!.current_value);
  expect(plan.outcome.energyLeft).toBe(0);
  expect(JSON.stringify(raw)).toBe(saved);
});

it("leaves other characters, ascensions and unobserved previews at their existing coverage", () => {
  const raw = evidence.cases[0]!.before.hand.find((c) => c.card_id === "POUNCE")!;
  for (const [character, ascension] of [["ironclad", 10], ["silent", null], ["silent", 9], ["silent", 11]] as const) {
    expect(model(raw, character, ascension).known).toBe(true);
  }
  for (const changed of [
    { ...raw, upgraded: false }, { ...raw, energy_cost: 0 }, { ...raw, enchantment: {} },
    { ...raw, star_cost: 1 }, { ...raw, card_id: "OTHER_ATTACK" },
    { ...raw, rules_text: "造成{Damage:diff()}点伤害。" },
    { ...raw, dynamic_values: raw.dynamic_values.map((v) => ({ ...v, current_value: 22 })) },
  ]) expect(model(changed).known).toBe(true);
});
