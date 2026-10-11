import { createHash } from "node:crypto";
import { traceSteps, type SolverInput, type Step, type TransitionTrace } from "../reflex/turn-solver.js";

export const CORE_REALIZATION_MODEL = "silent-realization-v1";
export const CORE_REALIZATION_EVIDENCE = [
  "L704TLETMZBM/A10/F48/attempt3/T3/silent-0194",
  "KV0JHNJCKXLS/A10/F33/attempt6/T1/silent-0248/0249",
  "54G5683J0E5S/A10/F33/attempt1/T5-9/silent-0141/0385",
];

/** A trace describes this legal prefix, including replay effects, never hypothetical future draws. */
export function coreRealization(input: SolverInput, steps: Step[]) {
  const result = traceSteps(input, steps);
  const events = result.transitions;
  const manual: Record<string, number> = {};
  const effects: Record<string, number> = {};
  for (const event of events) {
    const id = event.step.cardId;
    manual[id] = (manual[id] ?? 0) + 1;
    effects[id] = (effects[id] ?? 0) + event.effects;
  }
  const unknown = [...new Set(events.flatMap((e) => e.after.unknown))];
  if (input.player.hellraiser) unknown.push("抽入自动施放未在手动牌效果计数内；完整组合未知");
  if (!result.complete) unknown.push("计划后缀不可由当前状态合法重放；只保留已计算前缀");
  if (events.some((e) => e.after.pendingSelection)) unknown.push("选择尚未解决，后继与完整组合未知");
  if (events.some((e) => e.after.unknownHand > 0)) unknown.push("抽入牌的身份/顺序未知；不能把期望抽牌换成完整组合");
  const last = events.at(-1);
  return {
    model: CORE_REALIZATION_MODEL,
    fingerprint: createHash("sha256").update(JSON.stringify({ input, steps })).digest("hex"),
    evidence: CORE_REALIZATION_EVIDENCE,
    kind: "conditional_model",
    complete_line: result.complete,
    manual_plays: manual,
    effect_resolutions: effects,
    energy_paid: result.complete ? events.reduce((sum, e) => sum + e.payment, 0) : null,
    prefix_energy_paid: events.reduce((sum, e) => sum + e.payment, 0),
    established_before: result.initial,
    modeled_after_actions: last?.after ?? result.initial,
    actions: events.map((e) => ({ card: e.step.cardId, target: e.step.target,
      cost: e.payment, effects: e.effects, leaves_pool: e.leavesPool,
      energy_before: e.before.energy, energy_after: e.after.energy,
      hp_after: e.after.hp, block_after: e.after.block,
      damage_hp: e.after.damage - e.before.damage,
      block_gained: e.after.blockGained - e.before.blockGained,
      draws: e.after.drawn - e.before.drawn, draw_budget: e.after.drawBudget - e.before.drawBudget,
      no_draw: e.before.noDraw, discards: e.step.discards ?? [],
      pending_selection: e.after.pendingSelection })),
    complete_combinations: null,
    delayed_damage: null,
    delayed_block: result.complete ? result.plan?.outcome.nextTurnBlock ?? null : null,
    unknown,
    limits: "当前已知合法前缀的条件推演；自动重放不再次付费。已建、到手与手动施放分账，副本无物理UID不追认来源。完整组合须另核原四签名和后继；本表不证明整战收益、回流闭合或无限。",
  };
}

/** Explicit trace events can also be consumed offline, without game or knowledge access. */
export function traceTotals(events: readonly TransitionTrace[]) {
  return { paid: events.reduce((sum, e) => sum + e.payment, 0),
    manual: events.length, effects: events.reduce((sum, e) => sum + e.effects, 0) };
}
