/** Prompt-only views. Published evidence and complete projection rows stay in audit data. */
import { asArray, asRecord, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { QuestionSet } from "../reflex/jev/questions.js";
import type { ProjectionEntry } from "./formats.js";
import { v6Config } from "./config.js";
import { v6DeltaTier } from "../sim/v6-projection.js";

// These are application ceilings, not claims about the provider's undocumented token limit.
// State may use spare question space; the complete wire request still cannot exceed 24 KB.
export const V6_JEV_STATE_BYTES = 22_000;
export const V6_JEV_REQUEST_BYTES = 24_000;
export const V6_BRAIN_CHARS = 64_000;
export const V6_OPENING_NOTE = "Wk is the completed-combo branch; W0 is the incomplete empirical branch. 'opening unknown' means an evaluated opening outcome is unavailable or unreported; provider reasons do not necessarily identify its cause. Missing upgrade models remain unknown; more compute cannot supply a model. Null is not zero. Retain failed samples; never substitute Wk for W0.";
const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v));
const stat = (v: unknown): JsonValue => {
  const s = asRecord(v);
  return { value: typeof s.value === "number" && Number.isFinite(s.value) ? s.value : null,
    n: typeof s.n === "number" ? s.n : 0, ...(typeof s.se === "number" ? { se: s.se } : {}) };
};
/** Main pooled strata only; never copy provenance groups, evidence, simulation grids or shrinkage. */
export function compactBuildMetrics(value: unknown, targets: readonly string[] = []): JsonValue {
  if (value == null) return null;
  return toJsonValue(asArray(value).slice(0, 2).map(raw => {
    const m = asRecord(raw), o = asRecord(m.observed), counts = asRecord(m.raw_counts);
    const regression = asArray(m.regression).map(asRecord);
    const targetKey = (v: unknown) => String(v).toUpperCase().replace(/^F(\d+):(.+)$/, "$2-F$1");
    const relevant = regression.filter(r => targets.some(t => targetKey(t) === targetKey(r.target)));
    const selected = (relevant.length ? relevant : regression).slice(0, 2);
    return { attempt: m.attempt ?? "unknown", target_ascension: m.target_ascension ?? null,
      dpr_boss: stat(o.dpr_boss ?? m.dpr_boss), startup_turn: stat(o.startup_turn ?? m.startup_turn),
      formed_runs: stat(o.formed_runs), cleared_runs: stat(o.cleared_runs),
      chain_f48_f49: { reached: stat(o.chain_reached), won: stat(o.chain_won), win_rate: stat(o.chain_win_rate) },
      pooled_runs: counts.runs ?? null,
      adjusted_win_rates: selected.map(r => ({ target: r.target, ...asRecord(stat(r.win_rate)) })),
      adjusted_targets_omitted: regression.length - selected.length };
  }));
}
export function compactCombo(combo: { id: string; source: string; requirements: JsonValue; metrics: JsonValue; details: JsonValue }, targets: readonly string[] = [], metrics = combo.metrics): JsonValue {
  return toJsonValue({ id: combo.id, source: combo.source, types: asRecord(combo.details).types ?? [],
    cards: combo.requirements, metrics: compactBuildMetrics(metrics, targets) });
}
/** projection-entry-v1 numeric semantics are unchanged; metric snapshots are sent once per combo. */
export function compactProjection(entry: ProjectionEntry, reasons?: readonly string[]): JsonValue {
  const { combo_metrics: _audit, ...fields } = entry;
  return toJsonValue({ ...fields,
    // A missing estimate is not proof of an opening-construction failure, including P=1's unused W0.
    opening: { Wk: entry.win_complete ? "evaluated" : "opening unknown", W0: entry.win_incomplete ? "evaluated" : "opening unknown" },
    ...(reasons?.length ? { unknown_reasons: [...reasons] } : {}) });
}
export function prioritize<T>(rows: readonly T[], weights: Readonly<Record<string, number>>, direction: (v: T) => string, score: (v: T) => number = () => 0): T[] {
  return rows.map((v, i) => ({ v, i })).sort((a, b) => (weights[direction(b.v)] ?? 0) - (weights[direction(a.v)] ?? 0)
    || score(b.v) - score(a.v) || a.i - b.i).map(r => r.v);
}
export interface PromptBudget {
  limit: number; unit: "bytes" | "chars"; before: number; after: number;
  truncated: boolean; omitted: Record<string, number>;
}
/** Keep action identity, resources and potion holding comparisons; verbose rules are secondary. */
function optionFacts(value: unknown): JsonValue {
  if (typeof value === "string") return value.slice(0, 180);
  const source = asRecord(value);
  const secondary = new Set(["text", "description", "card_text", "card_outcome_stats", "projections", "reflex", "note", "selection_screen_prediction"]);
  return toJsonValue(Object.fromEntries(Object.entries(source).filter(([k]) => !secondary.has(k)).map(([k, v]) => [k,
    k === "potion_entries" ? asArray(v).map(entry => optionFacts(entry)) : typeof v === "string" ? v.slice(0, 180) : v])));
}
/** Never derive an aggregate from marginal errors or renormalize incomplete target mass. */
function optionMinimum(key: string, value: unknown, mixtures: readonly unknown[]): Record<string, JsonValue> {
  const option = asRecord(value), rows = asArray(option.projections).map(asRecord), leading = rows[0];
  if (!leading) return { facts: optionFacts(option.facts ?? value), ...(option.resources_after ? { resources_after: toJsonValue(option.resources_after) } : {}) };
  const config = v6Config();
  const comparison = (kind: string) => {
    const m = asRecord(mixtures.find(raw => { const r = asRecord(raw); return r.option_id === key && r.kind === kind; }));
    const delta = m.paired_delta as ProjectionEntry["paired_delta"] | undefined;
    return { delta: delta ?? null, tier: v6DeltaTier(delta ?? null, config), known_mass: m.known_mass ?? null };
  };
  const availability = asRecord(leading.availability);
  const mixtureReasons = mixtures.filter(raw => asRecord(raw).option_id === key && asRecord(raw).paired_delta == null)
    .flatMap(raw => asArray(asRecord(raw).labels));
  const reasons = [...new Set([option.unknown_reason, ...asArray(leading.unknown_reasons), ...mixtureReasons].filter((s): s is string => typeof s === "string" && s.length > 0))];
  return toJsonValue({ facts: optionFacts(option.facts ?? value),
    ...(option.resources_after ? { resources_after: option.resources_after } : {}),
    comparison: { weighted_chain: comparison("clearance"), current_boss: comparison("current_gate") },
    projections: [{ direction_id: leading.direction_id ?? null, combo_id: leading.combo_id ?? null, target_id: leading.target_id ?? null,
      availability: { take: availability.take ?? null, skip: availability.skip ?? null },
      availability_change: typeof availability.take === "number" && typeof availability.skip === "number" ? availability.take - availability.skip : null,
      ...(leading.opening ? { opening: leading.opening } : {}) }],
    unknown_reasons: reasons }) as Record<string, JsonValue>;
}
/** Reserve every option's comparison before trimming shared facts or lower-priority combo details. */
export function boundV6State(input: Record<string, JsonValue>, limit: number, unit: "bytes" | "chars" = "bytes", omitted: Record<string, number> = {}): Record<string, JsonValue> {
  const state = structuredClone({ ...input, opening_note: V6_OPENING_NOTE }) as Record<string, JsonValue>, size = unit === "bytes" ? bytes : (v: unknown) => JSON.stringify(v).length;
  const budget: PromptBudget = { limit, unit, before: size(state), after: 0, truncated: Object.keys(omitted).length > 0, omitted: { ...omitted } };
  state.prompt_budget = toJsonValue(budget);
  const options = asRecord(state.options), minima = Object.fromEntries(Object.entries(options)
    .map(([key, value]) => [key, optionMinimum(key, value, asArray(state.target_mixtures))]));
  for (const [key, value] of Object.entries(options)) if (minima[key]!.comparison)
    options[key] = { ...asRecord(value), comparison: minima[key]!.comparison };
  const protectedPaths = new Set(["v6_direction_context", "direction_weights", "act_route", "opening_note"]);
  const candidates = (): { path: string; value: JsonValue[]; cost: number }[] => {
    const result: { path: string; value: JsonValue[]; cost: number }[] = [];
    const walk = (v: JsonValue, path: string) => {
      if (protectedPaths.has(path) || path === "options") return;
      if (Array.isArray(v)) {
        // Keep cards, metric strata, and potion comparisons intact when removing optional rows.
        if (v.length > 1 && !/\.(cards|any|types|metrics|comparisons|adjusted_win_rates)$/.test(path))
          result.push({ path, value: v, cost: size(v[v.length - 1]) });
        v.forEach((child, i) => walk(child, `${path}[${i}]`));
      } else if (v && typeof v === "object") for (const [k, child] of Object.entries(v)) if (k !== "prompt_budget") walk(child, path ? `${path}.${k}` : k);
    };
    walk(state, ""); return result.sort((a, b) => b.cost - a.cost || a.path.localeCompare(b.path));
  };
  const update = () => { for (let i = 0; i < 4; i++) { state.prompt_budget = toJsonValue(budget); budget.after = size(state); } state.prompt_budget = toJsonValue(budget); };
  update();
  // Shared duplicate tables can go only after their per-option paired estimates have been reserved.
  const secondary = Object.keys(state).filter(k => !protectedPaths.has(k)
    && !["options", "task", "prompt_budget", "core_metrics", "build_cores", "direction_evaluation", "inventory"].includes(k))
    .sort((a, b) => size(state[b]) - size(state[a]) || a.localeCompare(b));
  for (const key of secondary) if (Object.keys(options).length && size(state) > limit) { delete state[key]; budget.omitted[key] = 1; budget.truncated = true; update(); }
  if (Object.keys(options).length && size(state) > limit && state.inventory) {
    const inventory = asRecord(state.inventory);
    state.inventory = toJsonValue(Object.fromEntries(Object.entries(inventory).filter(([k]) => !["deck", "relics"].includes(k))));
    budget.omitted["inventory.deck_relics"] = 1; budget.truncated = true; update();
  }
  let optionsCompacted = false;
  while (size(state) > limit) {
    const candidate = candidates()[0];
    if (candidate) {
      // Batch whole rows from one array. Serializing the entire shop once per row was quadratic.
      let remaining = size(state) - limit + 256;
      // Each legal option keeps its leading numeric comparison, including the skip baseline.
      const minimum = 1;
      while (candidate.value.length > minimum && remaining > 0) {
        remaining -= size(candidate.value.pop()) + 1;
        budget.omitted[candidate.path] = (budget.omitted[candidate.path] ?? 0) + 1;
      }
    } else {
      const optional = !Object.keys(options).length ? Object.keys(state).filter(k => !protectedPaths.has(k)
        && !["options", "task", "prompt_budget", "core_metrics", "build_cores"].includes(k))
        .sort((a, b) => size(state[b]) - size(state[a]) || a.localeCompare(b))[0] : undefined;
      if (optional) { delete state[optional]; budget.omitted[optional] = 1; }
      else if (!optionsCompacted && Object.keys(options).length) {
        // Every row survives. Leading projections already follow brain weight and expected-win order.
        state.options = toJsonValue(minima); optionsCompacted = true;
        budget.omitted["options.secondary_and_combo_details"] = Object.keys(options).length;
      } else {
        // Defensive minimum for malformed/oversized ancillary data. Direction keys and legal choices survive.
        const context = asRecord(state.v6_direction_context);
        if (state.act_route != null) { delete state.act_route; budget.omitted.act_route = 1; }
        else if (Object.keys(context).length && !budget.omitted.minimal_answer_context) {
          context.catalog = toJsonValue(Object.fromEntries(Object.keys(asRecord(context.catalog)).map(id => [id, []])));
          context.appeared_cards = []; context.potion_ids = []; budget.omitted.minimal_answer_context = 1;
        } else {
          const last = ["task", "build_cores", "core_metrics"].find(k => k in state);
          if (!last) break; // Valid bounded IDs and catalogs fit far below either application ceiling.
          delete state[last]; budget.omitted[last] = 1;
        }
      }
    }
    budget.truncated = true; update();
  }
  // Stabilize the size field, which is itself part of the serialized prompt.
  for (let i = 0; i < 4; i++) update();
  return state;
}
/** Bound questions as well: potion choice criteria can contain an entire serialized option. */
export function boundedV6Jev(state: Record<string, JsonValue>, questions: QuestionSet): { state: Record<string, JsonValue>; questions: QuestionSet } {
  const qs = structuredClone(questions);
  const clip = (s: string, n: number) => { let out = s; while (Buffer.byteLength(out) > n) out = out.slice(0, Math.max(0, Math.floor(out.length * n / Buffer.byteLength(out)))); return out; };
  for (const q of Object.values(qs)) {
    q.instructions = clip(q.instructions, 600);
    if (q.type === "choice") q.criteria = Object.fromEntries(Object.entries(q.criteria).map(([k, v]) => [k, v == null ? v : clip(v, 600)]));
  }
  // Preserve every legal candidate key even for large shops; shorten only descriptive text.
  for (let textLimit = 300; bytes(qs) > V6_JEV_REQUEST_BYTES - V6_JEV_STATE_BYTES - 128 && textLimit >= 0; textLimit = textLimit ? Math.floor(textLimit / 2) : -1)
    for (const q of Object.values(qs)) {
      q.instructions = clip(q.instructions, textLimit);
      if (q.type === "choice") for (const [k, v] of Object.entries(q.criteria)) if (v != null) q.criteria[k] = clip(v, textLimit);
    }
  // Reserve room for model, protocol framing, and questions, all measured as actual UTF-8 bytes.
  const allowance = Math.min(V6_JEV_STATE_BYTES, V6_JEV_REQUEST_BYTES - bytes({ model: "typesafe/jev-1.14", questions: qs }) - 64);
  return { state: boundV6State(state, allowance, "bytes", bytes(qs) < bytes(questions) ? { question_text_bytes: bytes(questions) - bytes(qs) } : {}), questions: qs };
}
export function promptBudgetLabels(state: Record<string, JsonValue>): string[] {
  const b = asRecord(state.prompt_budget);
  return b.truncated ? [`prompt_truncated:${b.before}:${b.after}:${b.limit}:${b.unit}`] : [];
}
