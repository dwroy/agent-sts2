/**
 * Fix batch K (notes/fix-queue.md "From fix batch J"): pure bugs and Dai's potion rule. One describe per fix; boards are
 * synthetic or logged fixtures (tests/logged-states/batch-k, out of the rollout-live / potion-mc sweeps), never the
 * refreshing knowledge files.
 */

import { afterEach, describe, expect, it } from "vitest";

import { planCombatTurn } from "../src/screens/combat-plan.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { logged, loggedEnv, type Logged } from "./logged.js";

type Raw = Record<string, unknown>;

/** A logged board with `potionId` in potion slot `slot` (usable, no target). */
function withPotion(fx: Logged, slot: number, potionId: string, name: string, description: string): Logged {
  const run = fx.state["run"] as Raw;
  run["potions"] = (run["potions"] as Raw[]).map((potion) =>
    potion["index"] === slot
      ? { ...potion, potion_id: potionId, name, description, rarity: "Uncommon", occupied: true, usage: "CombatOnly", target_type: "AnyPlayer", requires_target: false, valid_target_indices: [], can_use: true, can_discard: true }
      : potion,
  );
  return fx;
}

describe("1a. Dai: a potion is a 0-cost one-shot card. An unsimulated potion is always an option (it was one only under T1: the cheapest potion-free option losing 12% of HP)", () => {
  afterEach(() => {
    rolloutLiveOptions.enabled = true;
  });

  it("the logged RTF3 F17 T1 board, code's own line on it: with Entropic Brew in the empty slot Jev is asked, the Brew an option with no numbers", () => {
    rolloutLiveOptions.enabled = false;
    // As logged (a Block Potion, modelled): code's line is clear, nothing to ask.
    const plain = planCombatTurn(loggedEnv(logged("batch-k/rtf3-f17-t1-plan")));
    expect(plain?.kind).toBe("act");
    expect(plain?.kind === "act" ? plain.label : "").toBe("combat/plan");
    const brew = withPotion(logged("batch-k/rtf3-f17-t1-plan"), 1, "ENTROPIC_BREW", "混沌药水", "在所有空药水栏位中获得随机药水。");
    const decision = planCombatTurn(loggedEnv(brew));
    if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind} ${decision?.kind === "act" ? decision.label : ""}`);
    expect(decision.label).toBe("combat/plan-choice+potion");
    const question = decision.questions["plan"]!;
    const criteria = question.type === "choice" ? question.criteria : {};
    const option = JSON.parse(String(criteria["p1"])) as Raw;
    expect(String(option["plays"])).toMatch(/^drink 混沌药水 first: /);
    expect(String(option["offered"])).toMatch(/^always: every potion that can be drunk is an option/);
    expect(option["hp_lost"]).toBeUndefined();
    expect(option["damage_dealt"]).toBeUndefined();
    expect(decision.resolve({ plan: { type: "choice", choice: "p1", probabilities: { p1: 0.5 }, confidence: 0.5, raw: {} } }).intent).toEqual({ action: "use_potion", option_index: 1 });
  }, 30_000);
});
