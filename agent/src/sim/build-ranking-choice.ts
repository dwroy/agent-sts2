/** P2 answer validation and logging share the same candidate identity mapping. */
import { asArray, asRecord } from "../core/util/json.js";

export function buildRankingSelection(value: unknown, answer: Record<string, unknown>, shop = false) {
  const ranking = asRecord(value), best = asArray(ranking["best_group"]).filter((key): key is string => typeof key === "string");
  const candidates = asArray(ranking["candidates"]).map(asRecord);
  let choice = typeof answer["choice"] === "string" ? answer["choice"] : null;
  let card = asArray(answer["cards"]).find((item): item is string => typeof item === "string") ?? null;
  if (shop) {
    const plan = asArray(answer["plan"]).filter((step): step is string => typeof step === "string");
    const step = plan.find((item) => !item.startsWith("discard_potion")) ?? "leave";
    if (step.startsWith("remove:")) { choice = "remove"; card = step.slice("remove:".length); }
    else choice = step;
  }
  const possible = candidates.filter((candidate) => candidate["choice_key"] === choice
    && (candidate["card_key"] === null || card === null || candidate["card_key"] === card));
  const keys = possible.map((candidate) => String(candidate["key"]));
  const targetPending = possible.some((candidate) => candidate["card_key"] !== null) && card === null;
  const deviation = !best.length || choice === null ? null : keys.some((key) => best.includes(key)) ? targetPending ? null : false : true;
  const reason = typeof answer["ranking_override_reason"] === "string" ? answer["ranking_override_reason"].trim() : null;
  return { choice, card, candidate_keys: keys, target_pending: targetPending, deviated: deviation,
    ranking_override_reason: reason, mode: ranking["mode"] ?? "on", scope: shop ? "first_purchase_or_removal_only" : "current_choice_only" };
}

export function rankingOverrideProblems(value: unknown, answer: Record<string, unknown>, shop = false): string[] {
  const selection = buildRankingSelection(value, answer, shop);
  if (selection.deviated !== true) return [];
  const reason = selection.ranking_override_reason;
  if (!reason) return ["selection is outside facts.build_ranking.best_group: ranking_override_reason is required (max 25 words)"];
  const words = [...new Intl.Segmenter("zh", { granularity: "word" }).segment(reason)].filter((part) => part.isWordLike).length;
  return words < 1 || words > 25 ? ["ranking_override_reason must contain 1 to 25 words"] : [];
}
