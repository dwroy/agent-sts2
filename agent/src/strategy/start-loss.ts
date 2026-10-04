/**
 * Our own HP loss at the start of our next turn, read off a state: Inferno's 1 for each copy up and Crimson Mantle's
 * cost (turn-solver mantleHpCost). One count for the SL judge (src/sl/judge.ts), the turn planner's solver input
 * (screens/combat-plan.ts startTurnHpLoss) and the per-card planner (screens/combat.ts), so the three agree; the rollout's
 * later turns carry the copies on (strategy/rollout.ts SimPlayer.infernoCopies).
 */

import type { GameState } from "../mod/schema.js";
import { asArray, asRecord, num, str } from "../util/json.js";
import { INFERNO_MOST_PER_COPY, infernoCopiesOf, mantleHpCost } from "./turn-solver.js";

/**
 * Inferno's own HP loss at the start of our turn: 1 for each copy up (the card, upgraded or not: 「在你的回合开始时，失去1点生命」),
 * one loss of that much (Inferno's sweep comes once). The power shows only the copies' damage summed (6, Inferno+ 9), so the
 * copies are counted at the fewest that sum can be: its amount (`amount`, INFERNO_POWER) over the most one copy adds (9, or
 * a listed Inferno's InfernoPower above it: the deck, the hand, the piles' lines), rounded up; a count too low only makes
 * fewer deaths certain. From the logs (states.jsonl to 2026-10-03; each turn ended with no attack shown and no Crimson
 * Mantle, Regen or poison on us, the HP at the next turn before its first play): one copy (6, 9) lost 1 526 times (0 six
 * times: Tungsten Rod, or a frame captured before the loss); two (12, 15, 18) lost 2 42 times and 4 once, never less
 * (B3PJGKHAQGK6, Inferno 12: the enemy 14 -> 2, one sweep). The count was 1 whatever the copies: C4F14F3XPN0N F33 attempt 5
 * (A9, two Inferno+, 18), 14 HP + 9 block against the Knowledge Demon's 21 at T6's end, "the mod does not flag"; the enemy
 * turn left 2 HP and T7's start took them, the last retry unused.
 */
export function infernoCopies(state: GameState, amount: number): number {
  if (amount <= 0) return 0;
  let most = INFERNO_MOST_PER_COPY;
  const cards = [...asArray(asRecord(state.raw["run"])["deck"]), ...asArray(asRecord(state.raw["combat"])["hand"])].map(asRecord);
  for (const card of cards.filter((entry) => str(entry["card_id"]) === "INFERNO")) {
    for (const value of asArray(card["dynamic_values"]).map(asRecord).filter((entry) => str(entry["name"]) === "InfernoPower")) {
      most = Math.max(most, num(value["base_value"]), num(value["current_value"]), num(value["enchanted_value"]));
    }
  }
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  for (const entry of ["draw", "discard", "exhaust"].flatMap((pile) => asArray(view[pile]).map(asRecord))) {
    if (!asArray(entry["card_ids"]).includes("INFERNO")) continue;
    for (const hit of str(entry["line"]).matchAll(/造成(\d+)点伤害|deal (\d+) damage/gi)) most = Math.max(most, Number(hit[1] ?? hit[2]));
  }
  return infernoCopiesOf(amount, most);
}

/** HP lost at the start of our next turn from the powers up: Inferno's copies and Crimson Mantle's (by their amounts). */
export function startTurnHpLossOf(state: GameState, inferno: number, mantle: number): number {
  return infernoCopies(state, inferno) + mantleHpCost(mantle);
}
