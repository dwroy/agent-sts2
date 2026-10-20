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
/** Card outcomes have a fixed catalog and metric cells, rather than optional projection rows. */
function boundCardResults(input: Record<string, JsonValue>, limit: number, unit: "bytes" | "chars", omitted: Record<string, number>, minimum = false): Record<string, JsonValue> {
  const measure = unit === "bytes" ? bytes : (v: unknown) => JSON.stringify(v).length;
  const state = structuredClone(input), catalog: JsonValue[] = [], refs = new Map<string, number>();
  const ref = (value: unknown) => {
    const json = toJsonValue(value), key = JSON.stringify(json);
    let id = refs.get(key);
    if (id === undefined) { id = catalog.length; refs.set(key, id); catalog.push(json); }
    return id;
  };
  const targets = asArray(input.targets), targetIds = targets.map(t => String(asRecord(t).id));
  const targetRef = (value: unknown): JsonValue => { const i = targetIds.indexOf(String(value)); return i < 0 ? toJsonValue(value) : i; };
  // Prompt display precision only. Full precision, labels and denominators remain in the audit.
  const cell = (value: unknown): JsonValue => value == null ? null : toJsonValue(asArray(value).map((v, i) =>
    i < 2 && typeof v === "number" && Number.isFinite(v) ? Number(v.toPrecision(i === 0 ? 5 : 3)) : v));
  const rows = (value: unknown, paired: boolean): Record<string, JsonValue>[] => asArray(value).map(raw => {
    const row = asRecord(raw), result = asArray(row.result);
    return { target: targetRef(row.target), result: result.length ? result.map(cell) : null,
      ...(paired ? { vs_skip: asArray(row.vs_skip).map(cell) } : {}),
      samples: toJsonValue(row.samples ?? 0),
      ...(row.requested !== 100 ? { requested: toJsonValue(row.requested ?? null) } : {}),
      ...(row.capped ? { capped: toJsonValue(row.capped) } : {}), ...(row.time_up ? { time_up: toJsonValue(row.time_up) } : {}),
      trust_ref: ref(row.trust ?? null),
      ...(asArray(row.unknown_reasons).length ? { reason_ref: ref(row.unknown_reasons) } : {}) };
  });
  state.targets = targets.map(raw => {
    const { labels, ...target } = asRecord(raw);
    // The full target id already names its encounters. Preserve identity and all trust labels once.
    delete target.boss; delete target.secondBoss;
    return toJsonValue({ ...target, ...(asArray(labels).length ? { labels_ref: ref(labels) } : {}) });
  });
  const cores = asArray(input.core_metrics).map(raw => {
    const core = asRecord(raw);
    // Requirement-local ids repeat the combo id; the actual card ids, counts, alternatives,
    // upgrades and distinctness are the useful information in this display.
    const cards = asArray(core.cards).map(raw => {
      const requirement = asRecord(raw);
      return [requirement.count, asArray(requirement.any).map(raw => {
        const component = asRecord(raw);
        return component.kind === "card" && component.upgraded === false ? component.id
          : [component.id, component.upgraded ?? null, component.kind];
      }), ...(requirement.distinct ? [true] : [])];
    });
    const available = rows(core.outcomes, true).sort((a, b) =>
      Number(asArray(b.result).some(v => v !== null)) - Number(asArray(a.result).some(v => v !== null)));
    return { core: toJsonValue({ ...core, cards, outcomes: [], outcomes_omitted: [] }) as Record<string, JsonValue>, rows: available };
  });
  const comboIndex = new Map(cores.map(({ core }, i) => [String(core.id), i]));
  const resultCounts = new Map<string, number>();
  if (input.card_criteria_schema === "paired-criteria-v1") for (const raw of Object.values(asRecord(input.options)))
    for (const row of asArray(asRecord(raw).immediate)) {
      const key = JSON.stringify(asArray(asRecord(row).result).map(cell));
      resultCounts.set(key, (resultCounts.get(key) ?? 0) + 1);
    }
  const immediateRows = (value: unknown) => rows(value, input.card_criteria_schema !== "paired-criteria-v1").map(row => {
    if ((resultCounts.get(JSON.stringify(row.result)) ?? 0) < 2) return row;
    // Share identical absolute vectors; each candidate's paired cells remain directly in its criteria.
    const { result, ...rest } = row;
    return { ...rest, result_ref: ref(result) };
  });
  state.options = toJsonValue(Object.fromEntries(Object.entries(asRecord(input.options)).map(([id, raw]) => {
    const option = asRecord(raw);
    return [id, { ...optionFacts(option) as Record<string, JsonValue>,
      ...(asArray(option.reflex).length ? { reflex: option.reflex } : {}),
      // All immediate Boss and elite targets survive, including paired deltas and unknown reasons.
      immediate: immediateRows(option.immediate), advances: asArray(option.advances).map(raw => {
        const advance = asRecord(raw);
        return [comboIndex.get(String(advance.combo)) ?? String(advance.combo), advance.advanced ?? null, advance.missing_after ?? null];
      }) }];
  })));
  state.core_metrics = cores.map(c => c.core);
  state.card_display = { target: "index into targets", refs: "indices into display_catalog", numeric_precision: "mean 5 and SE 3 significant digits; n exact; audit keeps full precision",
    A_paired_location: input.card_criteria_schema === "paired-criteria-v1" ? "questions.pick.criteria: A_vs_skip.delta" : "options.immediate.vs_skip",
    A_result_ref: "identical absolute result vectors shared in display_catalog; result or result_ref retains all metric cells",
    requested_samples_default: 100, advance_columns: ["core_metrics index (or combo id)", "advanced", "missing_after"],
    cards: "requirements [count, alternatives, distinct?]; string alternative is an unupgraded card; otherwise [id, upgraded|null, kind]",
    B_row_columns: ["target", "result", "vs_skip", "samples", "trust_ref", "optional exception facts"],
    B: "vs_skip compares the completed core with the current deck at the same future target, independent of this reward. outcomes_omitted lists cached targets whose numeric details did not fit; absent targets are not cached, never zero" };
  state.display_catalog = catalog;
  const budget: PromptBudget = { limit, unit, before: measure(input), after: 0, truncated: Object.keys(omitted).length > 0, omitted: { ...omitted } };
  state.prompt_budget = toJsonValue(budget);
  const update = () => {
    delete state.prompt_budget;
    const payload = measure(state), separator = Object.keys(state).length ? 1 : 0;
    for (let i = 0; i < 4; i++) budget.after = payload + separator + measure("prompt_budget") + 1 + measure(budget);
    state.prompt_budget = toJsonValue(budget);
    return budget.after;
  };
  // Reserve the complete combo catalog and all option/elite rows before assigning B detail space.
  for (const { core, rows: available } of cores) core.outcomes_omitted = toJsonValue(available.map(r => r.target));
  if (update() > limit) {
    delete state.temporary_combos; // Already represented by its named core and cards.
    for (const option of Object.values(asRecord(state.options))) delete asRecord(option).reflex;
    budget.omitted.secondary_card_facts = 1; budget.truncated = true;
    update();
  }
  // Round-robin by target, then brain-priority core order: no direction loses its entire catalog.
  let excluded = minimum ? cores.reduce((n, c) => n + Math.max(0, c.rows.length - 1), 0) : 0;
  // Include the counter before allocating rows, so adding it cannot displace a core's sole row.
  budget.omitted["core_metrics.outcome_details"] = cores.reduce((n, c) => n + c.rows.length, 0);
  const rounds = Math.max(0, ...cores.map(c => c.rows.length));
  for (let i = 0; i < (minimum ? Math.min(1, rounds) : rounds); i++) for (const { core, rows: available } of cores) {
    const row = available[i]; if (!row) continue;
    const kept = asArray(core.outcomes), missing = asArray(core.outcomes_omitted), at = missing.indexOf(row.target);
    const extra = Object.fromEntries(Object.entries(row).filter(([k]) => !["target", "result", "vs_skip", "samples", "trust_ref"].includes(k)));
    kept.push(toJsonValue([row.target, row.result, row.vs_skip, row.samples, row.trust_ref,
      ...(Object.keys(extra).length ? [extra] : [])]));
    if (at >= 0) missing.splice(at, 1);
    if (update() > limit) { kept.pop(); if (at >= 0) missing.splice(at, 0, row.target); excluded++; }
  }
  if (excluded) { budget.omitted["core_metrics.outcome_details"] = excluded; budget.truncated = true; }
  else delete budget.omitted["core_metrics.outcome_details"];
  // Reserve the final omission counter as well, without discarding a combo or an immediate row.
  while (update() > limit) {
    const donor = [...cores].reverse().find(c => asArray(c.core.outcomes).length > 1);
    if (!donor) break;
    const row = asArray(asArray(donor.core.outcomes).pop());
    asArray(donor.core.outcomes_omitted).push(row[0] as JsonValue);
    budget.omitted["core_metrics.outcome_details"] = (budget.omitted["core_metrics.outcome_details"] ?? 0) + 1; budget.truncated = true;
  }
  update();
  if (budget.after > limit) {
    // An impossible mandatory catalog must hand over to the ordinary brain, never
    // send an oversized request or silently erase A targets to make it look valid.
    const unavailable: Record<string, JsonValue> = { card_result_schema: input.card_result_schema!,
      card_prompt_unavailable: "mandatory_A_and_core_catalog_exceed_budget" };
    budget.omitted.mandatory_card_summary = 1; budget.truncated = true;
    for (let i = 0; i < 4; i++) {
      unavailable.prompt_budget = toJsonValue(budget); budget.after = measure(unavailable);
    }
    unavailable.prompt_budget = toJsonValue(budget);
    return unavailable;
  }
  return state;
}
/** Keep action identity, resources and potion holding comparisons; verbose rules are secondary. */
function optionFacts(value: unknown): JsonValue {
  if (typeof value === "string") return value.slice(0, 180);
  const source = asRecord(value);
  const secondary = new Set(["text", "description", "card_text", "card_outcome_stats", "projections", "best_by_target", "immediate", "advances", "reflex", "note", "selection_screen_prediction"]);
  return toJsonValue(Object.fromEntries(Object.entries(source).filter(([k]) => !secondary.has(k)).map(([k, v]) => [k,
    k === "potion_entries" ? asArray(v).map(entry => optionFacts(entry)) : typeof v === "string" ? v.slice(0, 180) : v])));
}
/** Never derive an aggregate from marginal errors or renormalize incomplete target mass. */
function optionMinimum(key: string, value: unknown, mixtures: readonly unknown[]): Record<string, JsonValue> {
  const option = asRecord(value), rows = asArray(option.projections).map(asRecord), leading = rows[0];
  if (Array.isArray(option.immediate)) return { facts: optionFacts(value), immediate: toJsonValue(option.immediate.slice(0, 1)), advances: toJsonValue(option.advances ?? []) };
  const targetValues = asArray(option.best_by_target);
  const targets: Record<string, JsonValue> = targetValues.length ? { best_by_target: toJsonValue(targetValues.filter(v => asRecord(v).kind === "current")), optional_targets_omitted: targetValues.filter(v => asRecord(v).kind !== "current").length } : {};
  if (!leading) return { ...targets, facts: optionFacts(option.facts ?? value), ...(option.resources_after ? { resources_after: toJsonValue(option.resources_after) } : {}) };
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
  if (input.card_result_schema === "v6-card-combat-results-v1") return boundCardResults(input, limit, unit, omitted);
  const state = structuredClone({ ...input, opening_note: input.card_result_schema === "v6-card-combat-results-v1" ? input.opening_note : V6_OPENING_NOTE }) as Record<string, JsonValue>, size = unit === "bytes" ? bytes : (v: unknown) => JSON.stringify(v).length;
  const budget: PromptBudget = { limit, unit, before: size(state), after: 0, truncated: Object.keys(omitted).length > 0, omitted: { ...omitted } };
  state.prompt_budget = toJsonValue(budget);
  const options = asRecord(state.options), minima = Object.fromEntries(Object.entries(options)
    .map(([key, value]) => [key, optionMinimum(key, value, asArray(state.target_mixtures))]));
  for (const [key, value] of Object.entries(options)) if (minima[key]!.comparison)
    options[key] = { ...asRecord(value), comparison: minima[key]!.comparison };
  const protectedPaths = new Set(["v6_direction_context", "direction_weights", "act_route", "opening_note", "option_reason_catalog", "target_validation", "resources_after_defaults"]);
  if (input.card_result_schema === "v6-card-combat-results-v1")
    for (const key of ["card_result_schema", "result_columns", "estimate_columns", "targets", "long_term_cache"]) protectedPaths.add(key);
  const candidates = (): { path: string; value: JsonValue[]; cost: number }[] => {
    const result: { path: string; value: JsonValue[]; cost: number }[] = [];
    const walk = (v: JsonValue, path: string) => {
      if (protectedPaths.has(path) || path === "options") return;
      // Combat columns and [mean,se,n] cells are atomic; truncation cannot change their schema.
      if (input.card_result_schema === "v6-card-combat-results-v1" && /\.(result|vs_skip)$/.test(path)) return;
      if (Array.isArray(v)) {
        // Keep cards, metric strata, and potion comparisons intact when removing optional rows.
        if (v.length > 1 && !(input.card_result_schema === "v6-card-combat-results-v1" && path === "core_metrics")
          && !/\.(cards|any|types|metrics|comparisons|adjusted_win_rates)$/.test(path))
          result.push({ path, value: v, cost: size(v[v.length - 1]) });
        v.forEach((child, i) => walk(child, `${path}[${i}]`));
      } else if (v && typeof v === "object") for (const [k, child] of Object.entries(v)) if (k !== "prompt_budget") walk(child, path ? `${path}.${k}` : k);
    };
    walk(state, ""); return result.sort((a, b) => b.cost - a.cost || a.path.localeCompare(b.path));
  };
  let total = 0;
  const update = () => {
    // Serialize the compact payload once per mutation, then stabilize only the small budget record.
    delete state.prompt_budget;
    const payload = size(state), separator = Object.keys(state).length ? 1 : 0;
    for (let i = 0; i < 4; i++) budget.after = payload + separator + size("prompt_budget") + 1 + size(budget);
    state.prompt_budget = toJsonValue(budget); total = budget.after;
  };
  update();
  // Shared duplicate tables can go only after their per-option paired estimates have been reserved.
  const secondary = Object.keys(state).filter(k => !protectedPaths.has(k)
    && !["options", "task", "prompt_budget", "core_metrics", "build_cores", "direction_evaluation", "inventory"].includes(k))
    .sort((a, b) => size(state[b]) - size(state[a]) || a.localeCompare(b));
  for (const key of secondary) if (Object.keys(options).length && total > limit) { delete state[key]; budget.omitted[key] = 1; budget.truncated = true; update(); }
  if (Object.keys(options).length && total > limit && state.inventory) {
    const inventory = asRecord(state.inventory);
    state.inventory = toJsonValue(Object.fromEntries(Object.entries(inventory).filter(([k]) => !["deck", "relics"].includes(k))));
    budget.omitted["inventory.deck_relics"] = 1; budget.truncated = true; update();
  }
  let optionsCompacted = false;
  while (total > limit) {
    const candidate = candidates()[0];
    if (candidate) {
      // Batch whole rows from one array. Serializing the entire shop once per row was quadratic.
      let remaining = total - limit + 256;
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
  update();
  return state;
}
/** Bound questions as well: potion choice criteria can contain an entire serialized option. */
export function boundedV6Jev(state: Record<string, JsonValue>, questions: QuestionSet): { state: Record<string, JsonValue>; questions: QuestionSet } {
  const qs = structuredClone(questions);
  if (state.card_criteria_schema === "paired-criteria-v1") {
    // Optional numeric B copies in criteria cannot evict the shared core catalog,
    // its first cached outcome per core, or any mandatory A target. Measure the
    // compact view once; never serialize full published metrics during trimming.
    const minimum = boundCardResults(state, V6_JEV_STATE_BYTES, "bytes", {}, true);
    const questionLimit = V6_JEV_REQUEST_BYTES - bytes(minimum) - 64;
    const criteria = Object.values(qs).filter(q => q.type === "choice").flatMap(q =>
      Object.entries(q.criteria).flatMap(([key, value]) => {
        if (typeof value !== "string") return [];
        try { return [{ q, key, body: asRecord(JSON.parse(value)) }]; } catch { return []; }
      }));
    while (bytes({ model: "typesafe/jev-1.14", questions: qs }) > questionLimit) {
      const donor = [...criteria].reverse().flatMap(c => [...asArray(c.body.B_progress)].reverse()
        .map(raw => ({ ...c, core: asRecord(raw) }))).find(c => asArray(c.core.results).length > 0);
      if (!donor) break;
      asArray(donor.core.results).pop();
      donor.core.numeric_targets_omitted = Number(donor.core.numeric_targets_omitted ?? 0) + 1;
      donor.q.criteria[donor.key] = JSON.stringify(donor.body);
    }
    // Card criteria contain mandatory paired estimates, not disposable descriptions.
    // Reserve their actual wire bytes and trim only the secondary shared B display.
    const allowance = Math.min(V6_JEV_STATE_BYTES, V6_JEV_REQUEST_BYTES - bytes({ model: "typesafe/jev-1.14", questions: qs }) - 64);
    if (allowance < 512) {
      for (const q of Object.values(qs)) {
        q.instructions = "Numeric criteria exceed the request budget; use the original brain decision.";
        if (q.type === "choice") q.criteria = Object.fromEntries(Object.keys(q.criteria).map(key => [key, key]));
      }
      return { state: { card_prompt_unavailable: "mandatory_card_criteria_exceed_budget" }, questions: qs };
    }
    return { state: boundV6State(state, Math.max(0, allowance), "bytes"), questions: qs };
  }
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
  return [...(b.truncated ? [`prompt_truncated:${b.before}:${b.after}:${b.limit}:${b.unit}`] : []),
    ...(state.card_prompt_unavailable ? [`card_prompt_unavailable:${state.card_prompt_unavailable}`] : [])];
}
