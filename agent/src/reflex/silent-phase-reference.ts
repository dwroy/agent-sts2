import { asArray, asRecord, num, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { Plan } from "./turn-solver.js";

/** UACFSW4VDDLD F48 attempt 6 T4, silent-0100: expose the phase window separately from the rollout. */
export function silentPhaseReference(state: GameState, shown: { key: string; plan: Plan }[]): Map<Plan, Record<string, JsonValue>> {
  const facts = new Map<Plan, Record<string, JsonValue>>();
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent") return facts;
  const living = asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((enemy) => num(enemy["current_hp"]) > 0);
  if (living.length !== 1) return facts;
  const enemy = living[0]!;
  if (enemy["enemy_id"] !== "TEST_SUBJECT" || !asArray(enemy["powers"]).map(asRecord).some((power) => power["power_id"] === "ADAPTABLE_POWER" && num(power["amount"]) > 0)) return facts;
  const ends = (plan: Plan): boolean => {
    const o = plan.outcome;
    const after = o.enemyHpAfter.find((entry) => entry.index === num(enemy["index"]));
    return !o.winsFight && !o.dies && after !== undefined && after.hp <= 0;
  };
  // Random-potion medians are not exact outcomes and are not supplied by the caller.
  const ending = shown.filter(({ plan }) => ends(plan) && !plan.outcome.revived && Number.isFinite(plan.outcome.hpLoss));
  if (ending.length === 0) return facts;
  const least = Math.min(...ending.map(({ plan }) => plan.outcome.hpLoss));
  const references = ending.filter(({ plan }) => plan.outcome.hpLoss === least);
  const keys = references.map(({ key }) => key).join("、");
  for (const { plan } of shown) {
    facts.set(plan, {
      current_phase_ends: ends(plan),
      phase_end_reference: `当前阶段结束参考：${keys}，本回合预测损血${least}。仅按已列出的阶段结束线的本回合损血比较；${references.length > 1 ? "这些参考线在该指标上并列；" : ""}后续阶段仍需战斗，整场胜负未验证。与长程推演一起交由Jev选择。`,
      ...(references.some((entry) => entry.plan === plan) ? { phase_end_min_loss: true } : {}),
    });
  }
  return facts;
}
