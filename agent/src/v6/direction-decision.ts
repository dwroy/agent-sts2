import { createHash } from "node:crypto";
import type { Decision, DecisionEnv } from "../memory/types.js";
import { asArray, asRecord, str } from "../core/util/json.js";
import { v6Config } from "./config.js";

/** A dispatched plan step or screen transition has no new construction choice to evaluate. */
export function directionDecisionPoint(decision: Decision): boolean {
  if (decision.kind === "ask") return true;
  if (decision.plan) return false;
  // Code can make a genuine one-option construction choice, too. All other acts execute
  // an existing choice (including reward claims, opening/closing rooms and route following).
  return ["rest/choose", "event/only", "reward/card",
    "selection/add", "selection/remove", "selection/upgrade", "selection/transform", "selection/enchant", "selection/choose"].includes(decision.label);
}

/** Only physical inputs and decision context: polling/version/timestamp changes are irrelevant. */
export function directionFingerprint(env: DecisionEnv, phase: "act" | "pick"): string {
  const { state, screenMemory } = env, raw = asRecord(state.run?.raw);
  const { raw: _raw, ...run } = state.run ?? {};
  const plan = screenMemory.runPlan?.runId === state.raw.run_id ? screenMemory.runPlan : undefined;
  const input = { phase, config: v6Config(), run_id: state.raw.run_id, run,
    deck: raw.deck, relics: raw.relics, potions: raw.potions, character: raw.character_id,
    energy: raw.max_energy, constraints: raw.constraints, ascension_effects: raw.ascension_effects,
    screen: state.screen, actions: state.available_actions,
    reward: state.raw.reward, selection: state.raw.selection, shop: state.raw.shop,
    rest: state.raw.rest, event: state.raw.event, map: state.raw.map,
    weights: plan?.v6?.direction_weights, overrides: plan?.v6?.ideal_overrides,
    route: screenMemory.routePlan, rememberedMap: screenMemory.lastMap,
    appeared: [...new Set([...(screenMemory.v6Planner?.appearedCards ?? []),
      ...asArray(raw.deck).map(c => str(asRecord(c).card_id)),
      ...asArray(asRecord(state.raw.reward).card_options).map(c => str(asRecord(c).card_id)),
      ...asArray(asRecord(state.raw.selection).cards).map(c => str(asRecord(c).card_id))])].filter(Boolean).sort() };
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

/** Run-local, bounded reuse includes unknown/null results; failed evaluations remain retryable. */
export class V6DirectionCache {
  private values = new Map<string, unknown>();
  async get<T>(key: string, evaluate: () => Promise<T>): Promise<T> {
    if (this.values.has(key)) return this.values.get(key) as T;
    const value = await evaluate();
    this.values.set(key, value);
    if (this.values.size > 8) this.values.delete(this.values.keys().next().value!);
    return value;
  }
}
