/** Waterfall Giant: a kill is not a win (it explodes at the end of our next turn); Jev's facts say so. */

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { describePlan, enemySims, planCombatTurn, planFacts } from "../src/reflex/combat-plan.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { solveTurn } from "../src/reflex/turn-solver.js";
import { combatPayload, testKnowledge } from "./scenarios.js";

type Raw = Record<string, unknown>;
const config = loadConfig({} as NodeJS.ProcessEnv);

function env(raw: Raw): DecisionEnv {
  const state = parseGameState(raw);
  return {
    state, knowledge: testKnowledge, brief: buildRunBrief(state, testKnowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, combatPlanner: "turn", screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [],
  };
}

describe("Waterfall Giant kill (N7SAK F17)", () => {
  const board = (): Raw => {
    const raw = combatPayload();
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["current_hp"] = 24;
    const [first] = combat["enemies"] as Raw[];
    combat["enemies"] = [{
      ...first, enemy_id: "WATERFALL_GIANT", name: "Waterfall Giant", current_hp: 6, max_hp: 240,
      powers: [{ index: 0, power_id: "STEAM_ERUPTION_POWER", name: "Steam Eruption", amount: 51, is_debuff: false }],
      intents: [{ index: 0, intent_type: "Attack", label: "10", damage: 10, hits: 1, total_damage: 10 }],
    }];
    ((raw["run"] as Raw)["potions"] as Raw[])[0]!["can_use"] = false;
    return raw;
  };

  it("is not played as a lethal (a kill that ends nothing yet)", () => {
    const decision = planCombatTurn(env(board()));
    expect(decision?.kind === "act" ? decision.label : "ask").not.toBe("combat/lethal");
    expect(decision?.kind === "act" ? decision.rationale : "").not.toMatch(/^lethal/);
  });

  it("the kill line's facts say it explodes for 51 at the end of the next turn and the fight is not over", () => {
    const solved = solveTurn({
      hand: [modelHandCard({ index: 0, card_id: "STRIKE_R", name: "Strike", card_type: "Attack", energy_cost: 1, playable: true, requires_target: true, target_type: "AnyEnemy", valid_target_indices: [0], dynamic_values: [{ name: "Damage", base_value: 6, current_value: 6 }] }, 0, testKnowledge)],
      player: { hp: 24, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false },
      enemies: enemySims(board()["combat"] as Raw),
      fightKind: "boss",
    });
    const kill = solved.plans.find((plan) => plan.outcome.kills.length > 0)!;
    const described = describePlan(kill, 80);
    expect(String(described["result"])).toContain("NOT over: it explodes for 51 at the end of my next turn");
    expect(String(described["result"])).toContain("needs 28+ block");
    const facts = planFacts(kill, { maxHp: 80, hand: [], enemies: enemySims(board()["combat"] as Raw), nextThreat: new Map(), noAttack: false });
    expect(facts["lethal_now"]).toBe("kills Waterfall Giant (explodes for 51 at the end of my next turn)");
  });
});
