/**
 * Shop potions for DeepSeek: the empty-slot fact (audit 2026-09-28). V4 M2: the potion model's "expected HP saved in the
 * act boss fight" (strategy/potion-value.ts, kept and tested here) is code's estimate and no longer in the question.
 */

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

describe("shop potions when DeepSeek decides (V4 M2: the belt fact only, no code estimate of a potion's worth)", () => {
  it("SFCE F11 (1 of 2 slots empty): Blood Potion carries the free-slot fact, no code value or expected HP saved", () => {
    const options = shopOptions("sfce-f11-shop");
    const blood = byName(options, "鲜血药水");
    expect(blood["potion_slots"]).toBe("1 of 2 potion slots empty");
    for (const key of ["code_value", "code_rank", "why", "expected_hp_saved_in_boss"]) expect(blood[key]).toBeUndefined();
    expect(options["leave"]).toBeDefined();
  });

  it("SFCE F15: every potion is listed the same way, modelled or not", () => {
    const options = shopOptions("sfce-f15-shop");
    for (const name of ["格挡药水", "能量药水"]) {
      expect(byName(options, name)["potion_slots"]).toEqual(expect.any(String));
      expect(byName(options, name)["expected_hp_saved_in_boss"]).toBeUndefined();
    }
  });

  it("with every slot full the fact says a discard comes first", () => {
    const options = shopOptions("sfce-f15-shop", (state) => {
      const run = state["run"] as Raw;
      run["potions"] = (run["potions"] as Raw[]).map((slot) => ({ ...slot, occupied: true, potion_id: "FIRE_POTION", name: "火焰药水" }));
    });
    expect(String(byName(options, "格挡药水")["potion_slots"])).toContain("no empty potion slot");
  });

  it("the Jev/code path keeps its old potion score and shows no DeepSeek facts", () => {
    const fx = logged("sfce-f15-shop");
    const memory = createScreenMemory("SHOP");
    memory.shopOpened = true;
    const outcome = planDecision(loggedEnv(fx, { screenMemory: memory }));
    expect(outcome.kind).toBe("decision");
    expect(JSON.stringify(outcome.kind === "decision" ? outcome.decision : {})).not.toContain("expected_hp_saved_in_boss");
  });
});
