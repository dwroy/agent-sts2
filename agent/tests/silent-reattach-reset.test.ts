/** 1913SE84AXQF A10 F31 T2-T4, states 282770/282777; silent-0064. */
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import evidence from "./silent-reattach-evidence.json";
import { enemySims, planCombatTurn } from "../src/reflex/combat-plan.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { loadConfig } from "../src/core/config.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { board } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed reattachment evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
afterEach(() => { solveTap.onSolve = null; });
function revive(character = "silent", ascension = 10) {
  const raw = evidence["282770"];
  const sims = enemySims(raw.combat, ascension, character);
  const input = board({ playerHp: 150, enemies: sims.map((sim, index) => {
    const enemy = raw.combat.enemies[index]!;
    const powers = Object.fromEntries(enemy.powers.map((p) => [p.power_id, p.amount]));
    return { sim, info: { index: sim.index, id: enemy.enemy_id, move: enemy.move_id,
      strength: powers.STRENGTH_POWER ?? 0, powers } };
  }) });
  input.solver.hand = [];
  input.solver.player.maxHp = 150;
  input.solver.turn = 2;
  input.meta.t = 2;
  input.meta.asc = ascension;
  input.piles = { handBase: [], draw: [], discard: [] };
  // Isolate the reset with a stationary clock. The six-damage middle attack is observed after revival.
  // This is not a claim that the actual monster repeats these moves or that the logged player had 150 HP.
  input.tables = Object.fromEntries(raw.combat.enemies.map((enemy, index) => [enemy.enemy_id, {
    moves: { [enemy.move_id]: { damage: index === 1 ? 6 : 0, hits: index === 1 ? 2 : 1, strength: 0, block: 0 } },
    next: { [enemy.move_id]: { [enemy.move_id]: 1 } },
  }]));
  const seen: { hp: number; poison: number | undefined; attacks: { damage: number; hits: number }[] }[] = [];
  solveTap.onSolve = (value) => {
    const middle = value.enemies.find((e) => e.index === 1);
    if (!middle) return;
    seen.push({ hp: middle.hp, poison: middle.poison, attacks: middle.attacks.map((a) => ({ ...a })) });
  };
  simulateFight(input, replaySteps(input.solver, [])!, 3, 1, false);
  return { sims, seen, returned: seen.find((e) => e.hp === 25) };
}
it("the recorded middle reattaches at 25 without the old poison or two Strength", () => {
  const result = revive();
  expect(result.returned).toBeDefined();
  expect(result.returned!.poison ?? 0).toBe(0);
  expect(result.returned!.attacks).toEqual([{ damage: 6, hits: 2 }]);
  const actual = evidence["282777"].combat.enemies[1]!;
  expect(actual.current_hp).toBe(25);
  expect(actual.powers.map((p) => p.power_id)).not.toContain("POISON_POWER");
  expect(actual.powers.map((p) => p.power_id)).not.toContain("STRENGTH_POWER");
});
it("other characters and unobserved ascensions preserve the existing simulation", () => {
  for (const [character, ascension] of [["ironclad", 10], ["", 10], ["silent", 9], ["silent", 0]] as const) {
    const result = revive(character, ascension);
    expect(result.returned!.poison).toBe(6);
    expect(result.returned!.attacks).toEqual([{ damage: 8, hits: 2 }]);
  }
});

it("the real planner passes the observed character scope to the enemy model", () => {
  const raw = evidence["282770"];
  const state = parseGameState(raw);
  const knowledge = makeKnowledge({ cards: raw.combat.hand.map((c) => ({ id: c.card_id, name: c.name,
    type: c.card_type, cost: c.energy_cost, description: c.resolved_rules_text,
    description_raw: c.rules_text, vars: c.dynamic_values })) }, "cache");
  const inputs: SolverInput[] = [];
  const enabled = rolloutLiveOptions.enabled;
  rolloutLiveOptions.enabled = false;
  solveTap.onSolve = (input) => { inputs.push(input); };
  try {
    planCombatTurn({ state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
      runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
      screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] });
  } finally { solveTap.onSolve = null; rolloutLiveOptions.enabled = enabled; }
  expect(inputs.length).toBeGreaterThan(0);
  expect(inputs[0]!.enemies.find((e) => e.index === 1)?.reattachClearsPoisonStrength).toBe(true);
  expect(inputs[0]!.enemies.filter((e) => e.index !== 1).every((e) => !e.reattachClearsPoisonStrength)).toBe(true);
});
