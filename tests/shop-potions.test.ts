/** Shop potions for DeepSeek: expected HP saved in the act boss fight and the empty-slot fact (audit 2026-09-28). */

import { describe, expect, it } from "vitest";

import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { planDecision } from "../src/screens/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { potionHpSaved } from "../src/strategy/potion-value.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;

function shopOptions(name: string, edit: (state: Raw) => void = () => {}, over: Partial<DecisionEnv> = { buildDecider: "deepseek" } as Partial<DecisionEnv>): Record<string, Record<string, unknown>> {
  const fx = logged(name);
  edit(fx.state);
  const memory = createScreenMemory("SHOP");
  memory.shopOpened = true;
  const outcome = planDecision(loggedEnv(fx, { ...over, screenMemory: memory }));
  if (outcome.kind !== "decision" || outcome.decision.kind !== "ask") throw new Error("expected a shop question");
  const question = Object.values(outcome.decision.questions)[0] as { criteria: Record<string, string> };
  return Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(value) as Record<string, unknown>]));
}

const byName = (options: Record<string, Record<string, unknown>>, name: string): Record<string, unknown> =>
  Object.values(options).find((option) => option["buy"] === name)!;

describe("potionHpSaved", () => {
  const state = parseGameState(logged("sfce-f15-shop").state);

  it("block, heal and regen potions are worth their HP; damage potions shorten the boss fight", () => {
    expect(potionHpSaved("BLOCK_POTION", state, loggedKnowledge)?.hp).toBe(12);
    expect(potionHpSaved("BLOOD_POTION", state, loggedKnowledge)?.hp).toBeCloseTo(0.2 * (state.run?.max_hp ?? 0));
    expect(potionHpSaved("REGEN_POTION", state, loggedKnowledge)?.hp).toBe(15);
    const fire = potionHpSaved("FIRE_POTION", state, loggedKnowledge)!;
    expect(fire.hp).toBeGreaterThan(0);
    expect(fire.why).toMatch(/20 damage = [\d.]+ turns .* HP lost a turn there \(monster DB A8, n=\d+\)/);
  });

  it("card and energy potions are not modelled (null), not guessed", () => {
    expect(potionHpSaved("ENERGY_POTION", state, loggedKnowledge)).toBeNull();
    expect(potionHpSaved("ATTACK_POTION", state, loggedKnowledge)).toBeNull();
  });
});

describe("shop potions when DeepSeek decides", () => {
  it("SFCE F11 (1 of 2 slots empty): Blood Potion's code_value is its HP, above leave, not -6.7", () => {
    const options = shopOptions("sfce-f11-shop");
    const blood = byName(options, "鲜血药水");
    expect(blood["code_value"]).toBeGreaterThan(0);
    expect(blood["potion_slots"]).toBe("1 of 2 potion slots empty");
    expect(String(blood["expected_hp_saved_in_boss"])).toMatch(/HP: heals 20% of max HP/);
    // Not a purchase rule: the removal still ranks above it, and leave stays an option.
    expect(Number(options["remove"]!["code_value"])).toBeGreaterThan(Number(blood["code_value"]));
    expect(options["leave"]).toBeDefined();
  });

  it("SFCE F15: Block Potion shows ~12 HP saved; an unmodelled potion says so and costs only its price", () => {
    const options = shopOptions("sfce-f15-shop");
    expect(byName(options, "格挡药水")["code_value"]).toBeCloseTo(12 - 52 / 25, 1);
    const energy = byName(options, "能量药水");
    expect(energy["expected_hp_saved_in_boss"]).toBe("not modelled");
    expect(energy["code_value"]).toBeCloseTo(-50 / 25, 1);
    expect(String(energy["why"])).toContain("not modelled");
  });

  it("with every slot full the fact says a discard comes first", () => {
    const options = shopOptions("sfce-f15-shop", (state) => {
      const run = state["run"] as Raw;
      run["potions"] = (run["potions"] as Raw[]).map((slot) => ({ ...slot, occupied: true, potion_id: "FIRE_POTION", name: "火焰药水" }));
    });
    expect(String(byName(options, "格挡药水")["potion_slots"])).toContain("no empty potion slot");
  });

  it("the Jev/code path keeps its old potion score", () => {
    const fx = logged("sfce-f15-shop");
    const memory = createScreenMemory("SHOP");
    memory.shopOpened = true;
    const outcome = planDecision(loggedEnv(fx, { screenMemory: memory }));
    expect(outcome.kind).toBe("decision");
    expect(JSON.stringify(outcome.kind === "decision" ? outcome.decision : {})).not.toContain("expected_hp_saved_in_boss");
  });
});
