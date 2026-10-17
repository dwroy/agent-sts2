/** Concrete read-only plan fields. Never invent a brain commitment or a gameplay preference. */
import type { Knowledge } from "../knowledge/index.js";
import type { CoreTemplate } from "../construction/types.js";
import type { RunPlan } from "../memory/run-plan.js";

export function shadowCardList(values: readonly string[], knowledge?: Knowledge) {
  const cards = knowledge?.cards() ?? [];
  return values.map((text, index) => {
    const matches = cards.filter((card) => card.id === text || card.name === text);
    const id = matches.length === 1 ? matches[0]!.id : /^[A-Z][A-Z0-9_]+$/.test(text) ? text : null;
    return { priority: index + 1, card_id: id, original: text, source: "accepted_brain_list",
      unknown: id ? null : "not_an_exact_unique_card_reference" };
  });
}

export function projectActPlan(plan: RunPlan, cores: readonly CoreTemplate[] = [], knowledge?: Knowledge) {
  const primary = plan.construction?.primary ?? "uncommitted";
  const take = shadowCardList(plan.want, knowledge), avoid = shadowCardList(plan.avoid, knowledge);
  const ids = (rows: ReturnType<typeof shadowCardList>) => rows.flatMap((row) => row.card_id ? [row.card_id] : []);
  const takeIds = ids(take), avoidIds = ids(avoid), conflicts = takeIds.filter((id) => avoidIds.includes(id));
  const explicit = primary !== "uncommitted";
  return { schema: "human-pace-act-plan-details-v1", delivered: false, direction_status: explicit ? "committed" : "uncommitted",
    direction: explicit ? { id: primary, source: "accepted_brain_construction_primary" } : null,
    candidate_directions: (plan.construction?.alternatives ?? []).map((id) => ({ id,
      source: "accepted_brain_alternative_not_commitment", learner_template: cores.some((core) => core.id === id) })),
    take_rules: take, avoid_rules: avoid, remove_rules: shadowCardList(plan.remove, knowledge), conflicts,
    coverage: { committed_direction: explicit, concrete_take_ids: takeIds, concrete_avoid_ids: avoidIds,
      unresolved: [...take, ...avoid].filter((row) => row.unknown !== null).map((row) => row.original),
      usable: explicit && takeIds.length + avoidIds.length > 0 && conflicts.length === 0 },
    rest_and_upgrade: { policy: plan.rest, original_preparation: plan.bossPrep,
      limits: "保留大脑原条件文本；auto不扩写为新的回血/升级阈值。" },
    route: { elites: plan.elites },
    wake: { review_floor: plan.construction?.checkpoint ?? null, original_pivot_condition: plan.construction?.pivot_if ?? null,
      initial_direction_needed: !explicit },
    limits: "只将既有大脑已接受计划具体化并保留来源；候选不算承诺，缺失不补。实际题面、决策要求和RunPlan均不改写。" };
}
