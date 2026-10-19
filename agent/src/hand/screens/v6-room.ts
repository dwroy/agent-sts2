/** Shared W7 route: concrete inventory choices, W3 combinations, bounded Jev, legal fallback. */
import { join, dirname } from "node:path";
import { V6BuildLog } from "../../v6/log.js";
import { asRecord, str, toJsonValue, type JsonValue } from "../../core/util/json.js";
import { currentDecisionBudget, DecisionBudget, withDecisionBudget, withinDecisionBudget } from "../../core/decision-budget.js";
import type { AskDecision, Decision, DecisionEnv, ResolvedAction } from "../../memory/types.js";
import type { AnswerSet, ChoiceAnswer } from "../../reflex/jev/answers.js";
import { choiceQ } from "../../reflex/jev/questions.js";
import { v6ProjectionEntries } from "../../sim/v6-projection-entries.js";
import { v6DeltaTier, type V6ProjectionTable } from "../../sim/v6-projection.js";
import { v6Config } from "../../v6/config.js";
import { v6Directions } from "../../v6/direction-runtime.js";
import { boundedV6Jev, compactCombo, prioritize, promptBudgetLabels } from "../../v6/prompt-summary.js";
import { directionCombos } from "../../v6/direction-plan.js";
import { validateProjectionEntry, type ProjectionEntry } from "../../v6/formats.js";
import { potionAnswersComplete } from "../../v6/potion-entries.js";
import { KNOWLEDGE_DIR } from "../../knowledge/files.js";
import type { V6RoomOptions } from "./v6-room-options.js";

export interface V6RoomProjectionResult {
  table: V6ProjectionTable | null; reason: string; labels: string[];
  rejected_options: { id: string; reason: string }[];
}
/** A missing change never permits the provider to substitute an unchanged deck. */
export type V6RoomProjection = (env: DecisionEnv, input: V6RoomOptions, context: {
  budget_ms: number; signal: AbortSignal;
}) => Promise<V6ProjectionTable | V6RoomProjectionResult | null>;
export interface V6RoomDecision extends AskDecision {
  v6Room: V6RoomOptions;
  roomProjection?: V6ProjectionTable;
  roomProjectionReason: string;
  roomEntries: ProjectionEntry[];
  roomProjectionSource?: Omit<V6RoomProjectionResult, "table">;
}
export function isV6RoomDecision(value: Decision): value is V6RoomDecision { return value.kind === "ask" && "v6Room" in value; }
function compact(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(compact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== "evidence" && key !== "run_ids" && key !== "card_outcome_stats").map(([key, v]) => [key, compact(v)]));
  return value;
}

function answerOf(answers: AnswerSet, keys: string[]): ChoiceAnswer | null {
  const a = answers.pick;
  if (a?.type !== "choice" || !keys.includes(a.choice) || !Number.isFinite(a.confidence) || a.confidence < 0 || a.confidence > 1) return null;
  return a.probabilities && typeof a.probabilities === "object" && !Array.isArray(a.probabilities)
    && Object.entries(a.probabilities).every(([key, p]) => keys.includes(key) && Number.isFinite(p) && p >= 0 && p <= 1) ? a : null;
}
function fallbackOf(input: V6RoomOptions, table?: V6ProjectionTable): string {
  if (!input.baseline || !table?.enabled || table.phase !== "pick") table = undefined;
  const keys = input.options.map(o => o.option.key), config = v6Config();
  const delta = (key: string, kind: "clearance" | "current_gate") => table?.target_mixtures.find(t => t.option_id === key && t.kind === kind)?.paired_delta;
  const known = keys.filter(key => input.baseline !== null
    && v6DeltaTier(delta(key, "current_gate") ?? null, config) !== "much_worse"
    && (delta(key, "clearance") || delta(key, "current_gate")));
  const preferred = input.kind === "shop" ? "leave" : input.options.find(o => !o.option.jev)?.option.key;
  return known.sort((a, b) => {
    for (const kind of ["clearance", "current_gate"] as const) {
      const x = delta(a, kind)?.mean ?? -Infinity, y = delta(b, kind)?.mean ?? -Infinity;
      if (x !== y) return x > y ? -1 : 1;
    }
    return Number(b === preferred) - Number(a === preferred) || keys.indexOf(a) - keys.indexOf(b);
  })[0] ?? preferred ?? input.options.find(o => !o.option.jev)?.option.key ?? keys[0]!;
}

/** No direction maxima are substituted for combination expectations. */
export function buildV6RoomDecision(env: DecisionEnv, input: V6RoomOptions, table?: V6ProjectionTable,
  reason = "projection_provider_unavailable", dir = KNOWLEDGE_DIR, source?: Omit<V6RoomProjectionResult, "table">): V6RoomDecision {
  const config = v6Config(), keys = input.options.map(o => o.option.key), summaries = v6Directions(env, dir);
  if (!input.baseline || !table?.enabled || table.phase !== "pick") table = undefined;
  const plan = env.screenMemory.runPlan?.runId === str(env.state.raw.run_id) ? env.screenMemory.runPlan.v6 : undefined;
  const combos = summaries.flatMap(d => directionCombos(d, toJsonValue(plan)).map(c => ({ direction: d.id, combo: c })));
  const projected = table?.enabled ? v6ProjectionEntries(table, config).filter(e => keys.includes(e.option_id)
    && input.baseline !== null && table!.targets.some(t => t.id === e.target_id)
    && validateProjectionEntry(e).ok) : [];
  // Published files can change during a run. The factory's frozen combinations remain authoritative.
  for (const e of projected) if (e.combo_id && e.combo_source
    && !combos.some(c => c.direction === e.direction_id && c.combo.id === e.combo_id && c.combo.source === e.combo_source)) {
    combos.push({ direction: e.direction_id, combo: { id: e.combo_id, source: e.combo_source,
      requirements: null, metrics: e.combo_metrics ?? null, details: null } });
  }
  const entries = projected.filter(e => combos.some(c => c.direction === e.direction_id && c.combo.id === e.combo_id && c.combo.source === e.combo_source));
  const targets = table?.targets.length ? table.targets : [{ id: "current_boss_unknown", kind: "current" }, { id: "chain_unknown", kind: "chain" }];
  for (const { direction, combo } of combos) for (const key of keys) for (const target of targets) {
    if (entries.some(e => e.option_id === key && e.direction_id === direction && e.combo_id === combo.id && e.target_id === target.id)) continue;
    entries.push({ schema: "projection-entry-v1", option_id: key, direction_id: direction, target_id: target.id, combo_id: combo.id, combo_source: combo.source,
      combo_metrics: combo.metrics, win_complete: null, win_incomplete: null, incomplete_source: "unknown", expected_win: null, direction_value: null,
      win: null, paired_delta: null, losing_boss_hp_fraction: null, winning_player_hp_fraction: null, turns: null, joint_win: null, joint_paired_delta: null,
      availability: { take: null, skip: null }, weighted_current_boss_delta: null, weighted_joint_delta: null, deck_count_change: null, core_first_cast_turn: null,
      win_tier: "unknown", delta_tier: "unknown", direction_role: "unknown", trust: "unknown", reflex_ids: [] });
  }
  const fallback = fallbackOf(input, table);
  const decision: V6RoomDecision = { kind: "ask", label: `${input.kind}/v6`, v6Room: input, roomProjection: table, roomProjectionReason: reason, roomEntries: entries, roomProjectionSource: source,
    state: { factory: toJsonValue(source ?? { reason, labels: [], rejected_options: [] }), inventory: toJsonValue({ deck: input.baseline?.cards ?? null, relics: input.baseline?.relics ?? null,
        hp: env.state.run?.current_hp ?? null, max_hp: env.state.run?.max_hp ?? null,
        gold: env.state.run?.gold ?? null, floor: env.state.run?.floor ?? null,
        potions: Array.isArray(asRecord(env.state.run?.raw).potions) ? asRecord(env.state.run?.raw).potions : null }),
      direction_weights: toJsonValue(plan?.direction_weights ?? {}), targets: toJsonValue(targets),
      core_metrics: toJsonValue(prioritize(combos, plan?.direction_weights ?? {}, c => c.direction,
        c => Math.max(-1, ...entries.filter(e => e.direction_id === c.direction && e.combo_id === c.combo.id).map(e => e.expected_win ?? -1)))
        .map(({ direction, combo }) => ({ direction, ...asRecord(compactCombo(combo, targets.map(t => t.id),
          table?.combinations.find(row => row.combination_id === combo.id && row.entry.direction_id === direction
            && row.entry.combo_source === combo.source)?.summary ?? combo.metrics)) }))),
      options: compact(toJsonValue(Object.fromEntries(input.options.map(o => [o.option.key, { facts: o.option.summary, unknown_reason: o.unknown_reason,
        resources_after: o.state ? { hp: o.state.hp, max_hp: o.state.maxHp, gold: o.state.gold, deck_count: o.state.cards.length } : null,
        projections: prioritize(entries.filter(e => e.option_id === o.option.key), plan?.direction_weights ?? {}, e => e.direction_id,
          e => e.expected_win ?? -1).map(e => {
          const row = table?.combinations.find(r => r.entry.option_id === e.option_id && r.entry.direction_id === e.direction_id
            && r.entry.target_id === e.target_id && r.combination_id === e.combo_id);
          const { combo_metrics: _metrics, ...fields } = e;
          return { ...fields, formation_n: row?.formation_n ?? null, formation_se: row?.formation_se ?? null,
            combo_role: row?.role ?? "unknown", role_labels: row?.role_labels ?? [], model_labels: row?.model_labels ?? [],
            unknown_reasons: row?.unknown_reasons ?? [source?.rejected_options.find(r => r.id === o.option.key)?.reason ?? o.unknown_reason ?? reason] };
        }) }])))),
      target_mixtures: toJsonValue(table?.target_mixtures ?? []),
      limitations: toJsonValue(table?.telemetry.degradation ?? [reason]),
      note: "Compare concrete decks and combinations, current-boss safety and weighted chain deltas. Null is unknown. Observational core metrics are descriptive, not causal. Potion projections require an explicit observed slot and complete modeled inventory transition; compare their holding-value entries too." },
    questions: { pick: choiceQ(`Choose one legal ${input.kind} action using the supplied facts. Treat null as unknown. Compare completion, expected win, uncertainty and trust for each combination.`,
      Object.fromEntries(input.options.map(o => [o.option.key, o.option.label ?? o.option.key]))),
      ...Object.assign({}, ...input.options.map(o => o.option.jev?.questions ?? {})) },
    resolve(answers): ResolvedAction {
      let answer = answerOf(answers, keys);
      let option = input.options.find(o => o.option.key === answer?.choice)?.option;
      if (option?.jev && !potionAnswersComplete(option.jev.questions, answers)) { answer = null; option = undefined; }
      option ??= input.options.find(o => o.option.key === fallback)!.option;
      let plan = option.plan?.(option.jev ? option.jev.answer(answers) : { cards: [] });
      if (plan && "invalid" in plan) {
        answer = null;
        option = input.options.find(o => o.option.key === fallback)!.option;
        plan = option.plan?.(option.jev ? option.jev.answer({}) : { cards: [] });
        if (plan && "invalid" in plan) return { intent: null, rationale: `V6 ${input.kind} fallback follow-up invalid: ${plan.invalid}`, confidence: null, fallback: true };
      }
      return { intent: plan?.intent ?? option.intent, rationale: answer ? `V6 Jev chose ${option.key}` : `V6 ${input.kind} fallback chose ${option.key}`,
        confidence: answer?.confidence ?? null, fallback: !answer,
        ...(plan ? { plan: { id: plan.id, steps: plan.steps }, journal: plan.journal } : {}),
        apply: () => { option.apply?.(); plan?.apply?.(); } };
    } };
  Object.assign(decision, boundedV6Jev(decision.state, decision.questions));
  return decision;
}

/** Computation and Jev have separate allowances, including when the parent is already exhausted. */
export async function prepareV6RoomDecision(decision: Decision, env: DecisionEnv, provider?: V6RoomProjection, dir = KNOWLEDGE_DIR): Promise<Decision> {
  if (!isV6RoomDecision(decision) || !provider) return decision;
  const parent = currentDecisionBudget(), running = parent?.running;
  const ms = Math.min(5000, v6Config().budgets.pick_ms), controller = new AbortController();
  parent?.pause();
  const budget = new DecisionBudget(`V6_${decision.v6Room.kind}_projection`, "routine", parent?.now, ms, 0);
  try {
    const result = await withDecisionBudget(budget, () => withinDecisionBudget("room_projection", () => provider(env, decision.v6Room, { budget_ms: ms, signal: controller.signal })));
    const report = result && "table" in result ? result : null;
    const table = report ? report.table : result as V6ProjectionTable | null;
    return buildV6RoomDecision(env, decision.v6Room, table ?? undefined, report?.reason ?? (table ? "ready" : "projection_provider_unavailable"), dir,
      report ? { reason: report.reason, labels: report.labels, rejected_options: report.rejected_options } : undefined);
  } catch {
    return buildV6RoomDecision(env, decision.v6Room, undefined, "projection_failed_or_timed_out", dir);
  } finally {
    controller.abort(); budget.pause(); parent?.independent(`V6_${decision.v6Room.kind}_projection`, budget, "L2"); if (running) parent?.resume();
  }
}

export function recordV6Room(env: DecisionEnv, decision: V6RoomDecision, logFile: string, questionId: string,
  answers: unknown, fallback: boolean, elapsedMs: number): void {
  const a = answerOf(asRecord(answers) as unknown as AnswerSet, decision.v6Room.options.map(o => o.option.key));
  const t = decision.roomProjection?.telemetry;
  new V6BuildLog(v6Config(), join(dirname(logFile), "v6-build.jsonl")).append({ schema: "v6-build-log-v1", ts: new Date().toISOString(),
    run_id: str(env.state.raw.run_id), character: str(asRecord(env.state.run?.raw).character_id).toLowerCase(), question_id: questionId,
    kind: decision.v6Room.kind, mode: v6Config().mode, entries: decision.roomEntries,
    jev_answer: a ? { choice: a.choice, confidence: a.confidence, probabilities: a.probabilities } : null,
    fallback: fallback ? "missing_invalid_or_failed_jev" : null, elapsed_ms: elapsedMs,
    cache: { hits: t?.cache_hits ?? 0, misses: t?.cache_misses ?? 0 }, degradation: [...(t?.degradation ?? [decision.roomProjectionReason]), ...(decision.roomProjectionSource?.labels ?? []), ...promptBudgetLabels(decision.state),
      ...(decision.roomProjectionSource?.rejected_options.map(r => `${r.id}:${r.reason}`.slice(0, 200)) ?? [])],
    unknown: { count: decision.roomEntries.filter(e => e.win === null).length, total: decision.roomEntries.length },
    triggers: [], merged_triggers: [], skipped_triggers: [] });
}
