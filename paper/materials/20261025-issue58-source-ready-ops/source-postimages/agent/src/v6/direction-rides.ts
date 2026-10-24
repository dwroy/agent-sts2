/** Direction updates ride on existing V5 brain calls; this module never asks a model or simulates. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { asArray, asRecord, numOrNull, str, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { DecisionEnv } from "../memory/types.js";
import { endgameScope } from "../memory/endgame-plan.js";
import { actOf, logRunPlan, type RunPlan, type RunPlanTrigger } from "../memory/run-plan.js";
import type { BuildState } from "../construction/types.js";
import { KNOWLEDGE_DIR } from "../knowledge/files.js";
import { v6Config } from "./config.js";
import { v6Directions } from "./direction-runtime.js";
import { directionContext, directionTask } from "./direction-plan.js";
import { validateDirectionWeights } from "./formats.js";
import { boundDirectionPrompt, DIRECTION_PROMPT_CHARS, type DirectionCompletedSnapshot } from "./direction-prompt.js";

export interface DirectionRideMemory {
  run: string; cards: Record<string, number>; relics: string[]; pending: string[];
  /** A failed/missing optional update is not retried on every subsequent room. */
  attempted: string[];
}
export const DIRECTION_RIDE_KEY = "v6_direction_task";
const enabled = () => v6Config().mode === "on";
/** Replace the old competing construction answer instruction only when a V6 ride is attached. */
function withoutLegacyContext(task: Record<string, JsonValue>): Record<string, JsonValue> {
  const { construction_context: _legacy, ...base } = task;
  const run = asRecord(base.run_state);
  if (!("construction_context" in run)) return base;
  const { construction_context: _nestedLegacy, ...runState } = run;
  return { ...base, run_state: toJsonValue(runState) };
}
const fileOf = (log: string, run: string) => join(dirname(log), "v6-direction-rides", `${createHash("sha256").update(run).digest("hex")}.json`);
function persist(env: DecisionEnv, log: string, event: Record<string, JsonValue>): void {
  const m = env.screenMemory.v6DirectionRide!;
  const file = fileOf(log, m.run), temporary = `${file}.${process.pid}.tmp`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(temporary, JSON.stringify(m)); renameSync(temporary, file);
  logRunPlan(log, { run: m.run, floor: env.state.run?.floor ?? null, v6_direction_ride: event });
}
function current(env: DecisionEnv, log: string): DirectionRideMemory {
  const run = str(env.state.raw.run_id), raw = asRecord(env.state.run?.raw);
  if (env.screenMemory.v6DirectionRide?.run === run) return env.screenMemory.v6DirectionRide;
  try {
    const m = asRecord(JSON.parse(readFileSync(fileOf(log, run), "utf8")));
    if (m.run === run && Array.isArray(m.pending) && Array.isArray(m.attempted) && Array.isArray(m.relics)
      && [m.pending, m.attempted, m.relics].every(a => (a as unknown[]).every(v => typeof v === "string"))
      && m.cards !== null && typeof m.cards === "object" && !Array.isArray(m.cards)
      && Object.values(asRecord(m.cards)).every(v => Number.isInteger(v) && Number(v) >= 0)) {
      return env.screenMemory.v6DirectionRide = m as unknown as DirectionRideMemory;
    }
  } catch { /* No durable observation for this run. Never borrow another run. */ }
  env.screenMemory.v6DirectionRide = { run, cards: counts(raw.deck), relics: ids(raw.relics, "relic_id"), pending: [], attempted: [] };
  persist(env, log, { stage: "baseline", unknown_reasons: ["T3_current_option_fingerprint_unavailable"] });
  return env.screenMemory.v6DirectionRide;
}
const ids = (value: unknown, field: string) => asArray(value).map(c => str(asRecord(c)[field])).filter(Boolean);
function counts(value: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  for (const id of ids(value, "card_id")) result[id] = (result[id] ?? 0) + 1;
  return result;
}
function prerequisiteRelics(value: unknown): string[] {
  const v = asRecord(value);
  return [...(v.field === "player.relics" && v.op === "contains" && typeof v.value === "string" ? [v.value] : []),
    ...asArray(v.args).flatMap(prerequisiteRelics), ...("arg" in v ? prerequisiteRelics(v.arg) : [])];
}
/** Actual newly acquired core components only. Unverifiable T3 comparisons stay unknown. */
export function observeDirectionRide(env: DecisionEnv, log: string, dir = KNOWLEDGE_DIR): void {
  if (!enabled() || env.state.in_combat || !str(env.state.raw.run_id)) return;
  const raw = asRecord(env.state.run?.raw);
  if (!Array.isArray(raw.deck) || !Array.isArray(raw.relics)) return;
  const m = current(env, log), cards = counts(raw.deck), relics = ids(raw.relics, "relic_id");
  const directions = v6Directions(env, dir), requirements = directions.flatMap(d => d.combos.flatMap(c => asArray(c.requirements))).map(asRecord);
  const coreCards = new Set(requirements.flatMap(r => asArray(r.any).map(asRecord).filter(c => c.kind === "card").map(c => str(c.id))));
  const coreRelics = new Set([...requirements.flatMap(r => asArray(r.any).map(asRecord).filter(c => c.kind === "relic").map(c => str(c.id))),
    ...directions.flatMap(d => d.combos.flatMap(c => prerequisiteRelics(asRecord(c.details).prerequisites)))]);
  const reasons = [...Object.keys(cards).filter(id => coreCards.has(id) && cards[id]! > (m.cards[id] ?? 0)).map(id => `T4:card:${id}:${cards[id]}`),
    ...relics.filter(id => coreRelics.has(id) && !m.relics.includes(id)).map(id => `T4:relic:${id}`)];
  // W4 candidate-minus-skip estimates are not paired direction comparisons, and
  // existing comparisons carry no verified current-option fingerprint. T3 stays unknown.
  const added = reasons.filter(r => !m.pending.includes(r) && !m.attempted.includes(r));
  const changed = JSON.stringify(m.cards) !== JSON.stringify(cards) || JSON.stringify(m.relics) !== JSON.stringify(relics);
  m.cards = cards; m.relics = relics; m.pending = [...new Set([...m.pending, ...added])];
  if (changed || added.length) persist(env, log, { stage: "marked", reasons: added, pending: m.pending, act: actOf(env.state) });
}

/** Attach only to an already scheduled request. Start/act or a marked T3/T4 never schedules a call. */
export async function attachDirectionRide(env: DecisionEnv, task: Record<string, JsonValue>, trigger: RunPlanTrigger | null,
  label: string, log: string, dir = KNOWLEDGE_DIR): Promise<Record<string, JsonValue>> {
  if (!enabled() || env.state.in_combat || !str(env.state.raw.run_id)) return task;
  const m = current(env, log), initial = trigger === "start" || trigger === "act";
  if (!initial && (!m.pending.length || !/^(shop\/|rest\/|event\/|map\/)/.test(label))) return task;
  const summaries = v6Directions(env, dir); if (!summaries.length) return task;
  let completed: DirectionCompletedSnapshot | null = null;
  try { completed = env.v6Projection?.peekCompletedCore?.(env) ?? null; } catch { /* Exact cache miss stays unknown. */ }
  const raw = asRecord(env.state.run?.raw), hp = numOrNull(raw.current_hp), maxHp = numOrNull(raw.max_hp), gold = numOrNull(raw.gold);
  const deck = asArray(raw.deck).map(asRecord), relics = asArray(raw.relics).map(asRecord);
  const inventory: BuildState | undefined = hp !== null && maxHp !== null && gold !== null && Array.isArray(raw.deck) && Array.isArray(raw.relics)
    && deck.every(c => str(c.card_id) && typeof c.upgraded === "boolean") && relics.every(r => str(r.relic_id))
    ? { cards: deck.map(c => ({ id: str(c.card_id), upgraded: c.upgraded === true })), relics: relics.map(r => str(r.relic_id)), hp, maxHp, gold, floor: env.state.run?.floor ?? 0, cap: null } : undefined;
  const previous = env.screenMemory.runPlan?.runId === m.run ? env.screenMemory.runPlan.v6 : undefined;
  const nested = directionTask({ summaries, entries: [], completed, inventory, appearedCards: Object.keys(m.cards),
    potionIds: ids(raw.potions, "potion_id"), floor: env.state.run?.floor ?? 0, current: {},
    ...(previous ? { previous: toJsonValue(previous) } : {}) });
  nested.task = "In this SAME answer, optionally add v6 using direction-weights-v1: weights for ALL listed directions sum to 1; use completed combo results and missing cards, no appearance probabilities. Unknown stays unknown. Keep route=keep; do not change the question's own route/choice. No extra request follows an omitted/invalid v6.";
  if (endgameScope(env.state)) nested.task += " 已有方向默认复用，不必重新评估全部方向；仅结合当前情况判断相较原方向值得调整、预期有利于本局胜率时才更新v6，并在原reason说明取舍与收益，未知保持未知。仅刷新checkpoint或改写reason不要求重新计算投影。";
  nested.ride_reasons = initial ? [trigger!] : [...m.pending];
  const base = withoutLegacyContext(task);
  logRunPlan(log, { run: m.run, floor: env.state.run?.floor ?? null, v6_direction_ride: { stage: "prepared", label, reasons: nested.ride_reasons },
    ...(completed ? { v6_completed_core: toJsonValue(completed) } : {}) });
  return { ...base, [DIRECTION_RIDE_KEY]: nested };
}

/** Pure lookup: embedding must not turn a V5 run-plan spec into a standalone direction task. */
export function directionRideTask(state: unknown): Record<string, JsonValue> | null {
  const root = asRecord(state), value = asRecord(root[DIRECTION_RIDE_KEY] ?? asRecord(root.run_plan_task)[DIRECTION_RIDE_KEY]);
  return directionContext(value) ? value as Record<string, JsonValue> : null;
}
/** Budget the combined question/state/memory; a pre-existing oversized V5 request remains usable. */
export function fitDirectionRide(state: Record<string, JsonValue>, surrounding: Record<string, JsonValue>): Record<string, JsonValue> {
  const nested = directionRideTask(state); if (!nested) return state;
  state = DIRECTION_RIDE_KEY in state ? withoutLegacyContext(state)
    : { ...state, run_plan_task: withoutLegacyContext(asRecord(state.run_plan_task) as Record<string, JsonValue>) };
  const total = JSON.stringify({ ...surrounding, state }).length;
  const limit = DIRECTION_PROMPT_CHARS - (total - JSON.stringify(nested).length);
  let fitted: Record<string, JsonValue>;
  try { fitted = boundDirectionPrompt(nested, limit); }
  catch {
    // Never reject the original V5 action because optional direction context cannot fit.
    fitted = { unknown_reason: "direction_ride_required_context_exceeds_remaining_30000_char_budget" };
  }
  return DIRECTION_RIDE_KEY in state ? { ...state, [DIRECTION_RIDE_KEY]: fitted }
    : { ...state, run_plan_task: { ...asRecord(state.run_plan_task), [DIRECTION_RIDE_KEY]: fitted } as JsonValue };
}
/** Missing/invalid optional weights retain the latest validated plan without a second call. */
export function acceptDirectionRide(env: DecisionEnv, plan: RunPlan, answer: unknown, task: Record<string, JsonValue> | null,
  label: string, log: string): void {
  if (!enabled()) return;
  const previous = env.screenMemory.runPlan;
  if (previous?.runId === plan.runId && previous.v6) plan.v6 = previous.v6;
  if (!task) return;
  const context = directionContext(task); if (!context) return;
  const parsed = validateDirectionWeights(asRecord(answer).v6, context);
  if (parsed.ok) plan.v6 = parsed.value;
  finishDirectionRide(env, task, label, log, parsed.ok ? "stored" : "retained",
    parsed.ok ? { direction_weights: toJsonValue(parsed.value.direction_weights) } : { issues: parsed.issues });
}
/** An unsuccessful optional update is consumed; a genuinely new cause may mark a future request. */
export function finishDirectionRide(env: DecisionEnv, task: Record<string, JsonValue>, label: string, log: string,
  stage: string, extra: Record<string, JsonValue> = {}): void {
  const m = current(env, log), reasons = asArray(task.ride_reasons).map(String);
  m.attempted = [...new Set([...m.attempted, ...reasons])]; m.pending = m.pending.filter(r => !reasons.includes(r));
  persist(env, log, { stage, label, reasons, ...extra });
}
