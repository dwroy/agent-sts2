/** Selective updates to the existing plan; omission is reuse, never a new planning call. */
import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../hand/mod/schema.js";
import { asRecord, str } from "../core/util/json.js";
import { ENDGAME_FIELDS, endgameCheckpointRequired, endgameProblems, endgameReuse, parseEndgamePlan } from "./endgame-plan.js";
import { actOf, hpFraction, parseRunPlan, type RunPlan, type RunPlanTrigger } from "./run-plan.js";
import { bossReviewProblems } from "../brain/boss-target.js";

const FIELDS = ["archetype", "want", "avoid", "remove", "block_target", "elites", "rest", "boss_prep", "summary", "construction"] as const;
const canonical = (v: unknown): string => JSON.stringify(v, (_k, value: unknown) => value && typeof value === "object" && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
const live = (v: unknown): boolean => v !== null && v !== undefined;
export function runPlanReply(plan: RunPlan): Record<string, unknown> {
  return { archetype: plan.archetype, want: plan.want, avoid: plan.avoid, remove: plan.remove, block_target: plan.blockTarget,
    elites: plan.elites, rest: plan.rest, boss_prep: plan.bossPrep, summary: plan.summary,
    ...(plan.construction ? { construction: plan.construction } : {}), ...(plan.endgame ? { endgame: plan.endgame } : {}),
    ...(plan.bossContext ? { boss_context: plan.bossContext } : {}) };
}
/** Null optional fields from strict engine schemas also mean reuse. Arrays, including [], are deliberate updates. */
export function runPlanPatch(value: unknown): Record<string, unknown> {
  const patch = asRecord(value), endgame = Object.fromEntries(Object.entries(asRecord(patch["endgame"])).filter(([k, v]) => [...ENDGAME_FIELDS, "checkpoint"].includes(k) && live(v)));
  return { ...Object.fromEntries(FIELDS.filter(k => live(patch[k])).map(k => [k, patch[k]])),
    ...(Object.keys(endgame).length ? { endgame } : {}) };
}
function priorReply(payload: unknown): Record<string, unknown> {
  const p = asRecord(payload), task = asRecord(p["run_plan_task"]);
  // facts uses answer names; the fallback previous_plan is a stored RunPlan.
  return asRecord(asRecord(p["facts"])["your_run_plan"] ?? task["previous_plan"]);
}
export function runPlanUpdateProblems(value: unknown, payload: unknown): string[] {
  if (!endgameReuse(payload)) return [];
  if (value !== undefined && value !== null && (typeof value !== "object" || Array.isArray(value))) return ["run_plan must be an object when updating"];
  const patch = runPlanPatch(value), before = priorReply(payload), problems: string[] = [];
  problems.push(...bossReviewProblems(value, payload));
  const endgame = asRecord(patch["endgame"]), oldEndgame = asRecord(before["endgame"]);
  const substantive = Object.keys(patch).filter(k => k !== "endgame").some(k => {
    const stored = k === "block_target" ? "blockTarget" : k === "boss_prep" ? "bossPrep" : k;
    return canonical(patch[k]) !== canonical(before[k] ?? before[stored]);
  }) || ENDGAME_FIELDS.some(k => k in endgame && endgame[k] !== oldEndgame[k]);
  for (const key of ["want", "avoid", "remove"]) if (key in patch && (!Array.isArray(patch[key]) || !(patch[key] as unknown[]).every(v => typeof v === "string"))) problems.push(`run_plan.${key} must contain card IDs`);
  for (const key of ["archetype", "boss_prep", "summary"]) if (key in patch && typeof patch[key] !== "string") problems.push(`run_plan.${key} must be text`);
  if ("elites" in patch && !["seek", "normal", "avoid"].includes(String(patch["elites"]))) problems.push("run_plan.elites is invalid");
  if ("rest" in patch && !["heal", "smith", "auto"].includes(String(patch["rest"]))) problems.push("run_plan.rest is invalid");
  if ("block_target" in patch && (!Number.isInteger(patch["block_target"]) || Number(patch["block_target"]) < 0 || Number(patch["block_target"]) > 20)) problems.push("run_plan.block_target must be an integer in 0..20");
  if (substantive && !str(asRecord(value)["change_reason"]).trim()) problems.push("run_plan.change_reason must explain current facts, the tradeoff and expected win benefit before changing the plan");
  if (Object.keys(endgame).length || endgameCheckpointRequired(payload)) {
    const merged = { ...oldEndgame, ...endgame, checkpoint: endgame["checkpoint"] ?? "" };
    problems.push(...endgameProblems(merged, endgameCheckpointRequired(payload)));
  }
  return problems;
}

export function updateRunPlan(previous: RunPlan, value: unknown, state: GameState, knowledge: Knowledge, trigger: RunPlanTrigger): {
  plan: RunPlan; outcome: "reused" | "updated" | "checkpoint"; changed: string[]; reason: string;
} {
  const patch = runPlanPatch(value), reply = runPlanReply(previous), changed: string[] = [];
  for (const key of FIELDS) if (key in patch && canonical(patch[key]) !== canonical(reply[key])) changed.push(key);
  const eg = asRecord(patch["endgame"]);
  for (const [key, v] of Object.entries(eg)) if (v !== asRecord(reply["endgame"])[key]) changed.push(`endgame.${key}`);
  const reason = str(asRecord(value)["change_reason"]).trim();
  if (!changed.length) return { plan: previous, outcome: "reused", changed, reason };
  const plan: RunPlan = { ...previous, act: actOf(state), floor: state.run?.floor ?? 0, hpPct: hpFraction(state), trigger };
  // Normalize only requested strategy fields. A checkpoint must not reparse the deck or drop an untouched removal.
  const fields = FIELDS.filter(k => changed.includes(k));
  if (fields.length) {
    const parsed = parseRunPlan(patch, state, knowledge, trigger);
    for (const key of fields) {
      const stored = key === "block_target" ? "blockTarget" : key === "boss_prep" ? "bossPrep" : key;
      Object.assign(plan, { [stored]: parsed[stored] });
    }
  }
  if (Object.keys(eg).length) {
    const endgame = parseEndgamePlan({ ...previous.endgame, ...eg });
    if (!endgame) throw new Error("invalid endgame update");
    plan.endgame = endgame;
  }
  return { plan, outcome: changed.every(k => k === "endgame.checkpoint") ? "checkpoint" : "updated", changed, reason };
}
