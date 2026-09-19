/**
 * Damage resolution. The mod hands us the card's own number; Vulnerable on the target and Weak on
 * the attacker are applied at resolution and have to be added here (PLAN.md §6.1).
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { planDecision } from "../src/screens/index.js";
import { resolveDamage } from "../src/strategy/damage.js";
import { loadConfig } from "../src/config.js";
import { combatPayload, testKnowledge } from "./scenarios.js";

const config = loadConfig({} as NodeJS.ProcessEnv);

const POWER = {
  vulnerable: { id: "VULNERABLE_POWER", amount: 2 },
  weak: { id: "WEAK_POWER", amount: 1 },
  intangible: { id: "INTANGIBLE_POWER", amount: 1 },
};

describe("resolveDamage", () => {
  it("leaves a plain hit alone", () => {
    const outcome = resolveDamage({ perHit: 6, hits: 1, targetBlock: 0, targetPowers: [], attackerPowers: [] });
    expect(outcome).toMatchObject({ hpLoss: 6, total: 6, modifiers: [] });
  });

  it("applies Vulnerable on the target", () => {
    const outcome = resolveDamage({ perHit: 6, hits: 1, targetBlock: 0, targetPowers: [POWER.vulnerable], attackerPowers: [] });
    expect(outcome.total).toBe(9);
    expect(outcome.modifiers.join(" ")).toContain("x1.5");
  });

  it("applies Weak on the attacker", () => {
    const outcome = resolveDamage({ perHit: 8, hits: 1, targetBlock: 0, targetPowers: [], attackerPowers: [POWER.weak] });
    expect(outcome.total).toBe(6);
    expect(outcome.modifiers.join(" ")).toContain("x0.75");
  });

  it("floors each hit of a multi-hit attack, not the total", () => {
    // 5 x2 with Vulnerable: 7 + 7 = 14, whereas multiplying the total would give floor(10 * 1.5) = 15.
    const outcome = resolveDamage({ perHit: 5, hits: 2, targetBlock: 0, targetPowers: [POWER.vulnerable], attackerPowers: [] });
    expect(outcome.total).toBe(14);
  });

  it("consumes block hit by hit", () => {
    const outcome = resolveDamage({ perHit: 6, hits: 2, targetBlock: 8, targetPowers: [], attackerPowers: [] });
    expect(outcome).toMatchObject({ total: 12, hpLoss: 4, blockAfter: 0 });
  });

  it("caps every hit at 1 against an Intangible target", () => {
    const outcome = resolveDamage({ perHit: 30, hits: 3, targetBlock: 0, targetPowers: [POWER.intangible], attackerPowers: [] });
    expect(outcome.total).toBe(3);
  });

  it("ignores a power with zero stacks", () => {
    const outcome = resolveDamage({
      perHit: 6,
      hits: 1,
      targetBlock: 0,
      targetPowers: [{ id: "VULNERABLE_POWER", amount: 0 }],
      attackerPowers: [],
    });
    expect(outcome.total).toBe(6);
  });
});

describe("combat options use the resolved damage", () => {
  function plan(raw: Record<string, unknown>) {
    const state = parseGameState(raw);
    const env = {
      state,
      knowledge: testKnowledge,
      brief: buildRunBrief(state, testKnowledge),
      screenMemory: { screen: state.screen, shopOpened: false },
      thresholds: config.thresholds,
      runStart: "auto" as const,
      characterPreference: null,
      allowFtueModals: false,
      strictJev: true,
      shopDiscardPotions: ["FOUL_POTION"],
    };
    const planned = planDecision(env);
    if (planned.kind !== "decision" || planned.decision.kind !== "ask") throw new Error(`no ask: ${planned.kind}`);
    const question = planned.decision.questions["play"];
    if (!question || question.type !== "choice") throw new Error("no play question");
    return { criteria: question.criteria, state: planned.decision.state };
  }

  it("shows the Vulnerable-increased damage and the kill", () => {
    // Strike deals 6; the target has Vulnerable 2 and 9 HP, so 9 damage is exactly lethal.
    const { criteria } = plan(combatPayload({ enemyVulnerable: 2, enemyHp: 9 }));
    const strike = JSON.parse(String(criteria["c0->e0"])) as Record<string, unknown>;
    expect(strike["damage"]).toBe(9);
    expect(strike["damage_after_block"]).toBe(9);
    expect(strike["kills_target"]).toBe(true);
    expect(String(strike["modifiers"])).toContain("Vulnerable");
  });

  it("does not call a kill when Vulnerable is absent", () => {
    const { criteria } = plan(combatPayload({ enemyHp: 9 }));
    const strike = JSON.parse(String(criteria["c0->e0"])) as Record<string, unknown>;
    expect(strike["damage"]).toBe(6);
    expect(strike["kills_target"]).toBe(false);
  });

  it("raises the incoming estimate when the player is Vulnerable", () => {
    const plain = plan(combatPayload());
    const vulnerable = plan(combatPayload({ playerVulnerable: 2 }));
    const plainSituation = plain.state["situation"] as Record<string, unknown>;
    const vulnSituation = vulnerable.state["situation"] as Record<string, unknown>;
    // Enemies deal 11 + 6; Vulnerable turns 17 into floor(16.5) + 9 = 25.
    expect(plainSituation["incoming_damage_if_turn_ends"]).toBe(17);
    expect(vulnSituation["incoming_damage_if_turn_ends"]).toBe(25);
  });
});
