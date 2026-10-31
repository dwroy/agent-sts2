/** Mechanical answer validation, never a judgment of the brain's construction choice. */
import { asArray, asRecord, str } from "../core/util/json.js";
import type { AnswerSpec } from "./types.js";
import type { JsonSchema } from "./tools/types.js";

export interface BossTarget { boss_ids: string[]; gap: string; reason: string }
export interface BossTargetContext {
  schema: "boss-target-context-v1";
  run: string;
  floor: number;
  act: number;
  act_boss: string | null;
  final: [string | null, string | null];
  candidates: string[];
  review_required: boolean;
}
export const BOSS_TARGET_NOTE = "构筑必填boss_target，按题内Boss ID列缺口及本步取舍；本步不补则空ID并说明保血/过渡。能力需求由你依机制推为本局假设，未知不补数。endgame须列有序终局候选/未知后场、各Boss缺口和两战血药。";
export const BOSS_REVEAL_NOTE = "目标首见/揭晓变化：本题run_plan.endgame显式复核win_condition、gaps、resources（可原文沿用）；其余计划/路线复用，实际改线给change_reason。";
export const BOSS_TARGET_SCHEMA: JsonSchema = {
  type: "object", properties: { boss_ids: { type: "array", items: { type: "string" }, description: "题内规范Boss ID，去重，最多3个；本步不补则[]" },
    gap: { type: "string", description: "非空，最多80 Unicode字符；无证写unknown" },
    reason: { type: "string", description: "非空，最多120 Unicode字符；空ID时解释本步不补的原因" } },
  required: ["boss_ids", "gap", "reason"], additionalProperties: false,
};
export function bossTargetContext(payload: unknown): BossTargetContext | null {
  const c = asRecord(asRecord(asRecord(payload)["facts"])["boss_target_context"]);
  return c["schema"] === "boss-target-context-v1" && Array.isArray(c["candidates"]) && Array.isArray(c["final"])
    ? c as unknown as BossTargetContext : null;
}
export function bossReviewRequired(payload: unknown): boolean { return bossTargetContext(payload)?.review_required === true; }
export function bossTargetProblems(value: unknown, payload: unknown): string[] {
  const context = bossTargetContext(payload);
  if (!context) return [];
  const v = asRecord(value), ids = v["boss_ids"], problems: string[] = [];
  if (!Array.isArray(ids) || ids.length > 3 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== "string" || !context.candidates.includes(id))) problems.push("boss_target.boss_ids must be up to 3 distinct Boss IDs from facts.boss_target_context.candidates");
  for (const [key, max] of [["gap", 80], ["reason", 120]] as const) {
    if (typeof v[key] !== "string" || !str(v[key]).trim() || Array.from(str(v[key])).length > max) problems.push(`boss_target.${key} must be nonempty text of at most ${max} Unicode characters`);
  }
  if (Object.keys(v).some(k => !["boss_ids", "gap", "reason"].includes(k))) problems.push("boss_target has unknown fields");
  return problems;
}
export function bossReviewProblems(value: unknown, payload: unknown): string[] {
  if (!bossReviewRequired(payload)) return [];
  const e = asRecord(asRecord(value)["endgame"]);
  return ["win_condition", "gaps", "resources"].filter(k => typeof e[k] !== "string" || !str(e[k]).trim())
    .map(k => `run_plan.endgame.${k} must explicitly review the revealed/candidate Boss targets (unknown is allowed)`);
}
export function withBossTargetSpec(spec: AnswerSpec, payload: unknown): AnswerSpec {
  if (!bossTargetContext(payload)) return spec;
  const review = bossReviewRequired(payload), standalone = spec.label === "run-plan";
  const properties: Record<string, JsonSchema> = { ...spec.schema.properties, boss_target: BOSS_TARGET_SCHEMA };
  if (review && !standalone && !properties["run_plan"]) properties["run_plan"] = {
    type: "object", properties: { endgame: { type: "object", properties: Object.fromEntries(["win_condition", "gaps", "resources"].map(k => [k, { type: "string" as const }])),
      required: ["win_condition", "gaps", "resources"], additionalProperties: false } }, required: ["endgame"], additionalProperties: false,
  };
  const required = [...new Set([...(spec.schema.required ?? []), "boss_target", ...(review && !standalone && properties["run_plan"] ? ["run_plan"] : [])])];
  return { ...spec, reask: true, schema: { ...spec.schema, properties, required }, validate: answer => [
    ...spec.validate(answer), ...bossTargetProblems(asRecord(answer)["boss_target"], payload),
    ...bossReviewProblems(standalone ? answer : asRecord(answer)["run_plan"], payload),
  ] };
}

/** Only server-observed identities are persisted, outside the model's plan fields. */
export function observedBossContext(payload: unknown): BossTargetContext | undefined {
  const c = bossTargetContext(payload);
  return c ? { ...c, candidates: [...c.candidates], final: [...c.final], review_required: false } : undefined;
}
export function bossContextKey(value: unknown): string {
  const c = asRecord(value);
  return JSON.stringify([c["act"] ?? null, c["act_boss"] ?? null, asArray(c["final"])]);
}
