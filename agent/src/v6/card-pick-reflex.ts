import { createHash } from "node:crypto";
import type { DecisionEnv } from "../memory/types.js";
import { contrastConfidence } from "./contrast-statistics.js";
import { v6Config } from "./config.js";
import type { V6Knowledge } from "./knowledge.js";
import { evaluatePredicate } from "./predicate.js";
import { plain, safeKey } from "./schema.js";

type Row = Record<string, unknown>;
const finite = (v: unknown): number | undefined => typeof v === "number" && Number.isFinite(v) ? v : undefined;
const text = (v: unknown): string | undefined => typeof v === "string" && v.length > 0 ? v : undefined;
const boolean = (v: unknown): boolean | undefined => typeof v === "boolean" ? v : undefined;
const rows = (v: unknown): Row[] | undefined => Array.isArray(v) && v.length <= 1000 && v.every(plain) ? v : undefined;
const compact = (row: Row): Row => Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));

/** Actual pre-pick inventory plus already-computed results only; no simulation or history backfill. */
export function cardPickPredicateFacts(env: DecisionEnv, option: string, candidate: Row, weights: Readonly<Record<string, number>>) {
  const context: Row = {}, sources: Record<string, string> = {}, unavailable: Record<string, string> = {};
  const put = (path: string, value: unknown, source: string, reason = "source_missing_or_invalid") => {
    if (value == null) { unavailable[path] = reason; return; }
    const parts = path.split("."); let scope = context;
    for (const part of parts.slice(0, -1)) scope = scope[part] as Row ?? (scope[part] = {}) as Row;
    scope[parts.at(-1)!] = value; sources[path] = source;
  };
  const run = env.state.run, raw = run?.raw ?? {};
  put("act", run?.act_id != null && /^\d+$/.test(run.act_id) ? Number(run.act_id) + 1 : undefined, "state.run.act_id + 1");
  put("floor", finite(run?.floor), "state.run.floor");
  for (const [field, value] of [["hp", run?.current_hp], ["max_hp", run?.max_hp], ["gold", run?.gold]] as const)
    put(`player.${field}`, finite(value), `state.run.${field === "hp" ? "current_hp" : field}`);
  const card = (r: Row) => compact({ id: text(r["card_id"]), upgraded: boolean(r["upgraded"]), cost: finite(r["energy_cost"]) });
  const deck = rows(raw["deck"]);
  const validDeck = deck?.every(r => text(r["card_id"])) ? deck.map(card) : undefined;
  put("player.deck", validDeck, "state.run.raw.deck (pre-pick physical cards)");
  put("player.deck_size", validDeck?.length, "state.run.raw.deck.length (complete observed deck only)");
  const relics = rows(raw["relics"]);
  put("player.relics", relics?.every(r => text(r["relic_id"])) ? relics.map(r => r["relic_id"]) : undefined, "state.run.raw.relics[*].relic_id");
  put("player.relic_counters", relics ? Object.fromEntries(relics.filter(r => typeof r["relic_id"] === "string" && safeKey(r["relic_id"]) && finite(r["stack"]) !== undefined)
    .map(r => [String(r["relic_id"]), r["stack"]])) : undefined, "state.run.raw.relics[relic_id,stack] (missing stacks omitted)");
  const cardFields = { id: "card_id", upgraded: "upgraded", cost: "energy_cost" };
  const dto = card(candidate);
  for (const [key, rawField] of Object.entries(cardFields)) put(`card.${key}`, dto[key], `state.raw.reward.card_options[option_id=${option}].${rawField}`);
  put("direction_weights", Object.keys(weights).length ? weights : undefined, "current run's latest validated direction weights");
  const progress = env.v6CardResults?.progress[option];
  put("combos.items", progress?.map(p => ({ id: p.combo, direction: p.direction, missing_before: p.missing_before,
    missing_after: p.missing_after, advanced: p.advanced })), "env.v6CardResults.progress[current option]", "current_option_combo_progress_unavailable");
  // An elite pool is not the next encountered elite. Only explicitly current Bosses are upcoming facts.
  const targets = env.v6CardResults?.targets.filter(t => t.kind === "current");
  put("targets.items", targets?.length ? targets.map(t => ({ id: t.id, boss: t.boss, kind: t.kind, act: t.act, floor: t.floor })) : undefined,
    "env.v6CardResults.targets[kind=current]", "no_explicit_current_boss; elite_pool_and_future_targets_are_not_observed_next_encounters");
  unavailable["target.next_elite"] = "no_authoritative_next_elite_identity; observed_elite_pool_is_not_a_route_forecast";
  return { context, sources, unavailable };
}

/** Legacy labels and uncontrolled numeric observations never become comparative pick advice. */
export function cardPickReflex(env: DecisionEnv, knowledge: V6Knowledge, option: string, candidate: Row, weights: Readonly<Record<string, number>>) {
  if (v6Config().reflex !== "on" || knowledge.reflex.status !== "loaded") return [];
  const ascension = env.state.run?.ascension;
  if (ascension == null || knowledge.character == null) return [];
  const facts = cardPickPredicateFacts(env, option, candidate, weights);
  return knowledge.reflex.value.filter(entry => {
    const s = entry.signal;
    return entry.applies_to === "card_pick" && entry.scope.character === knowledge.character && entry.scope.ascensions.includes(ascension)
      && s.kind === "contrast" && (s.uncertainty.interval.lower > 0 || s.uncertainty.interval.upper < 0)
      && evaluatePredicate(entry.predicate, facts.context) === true;
  }).map(entry => {
    const s = entry.signal;
    if (s.kind !== "contrast") throw new Error("contrast filter invariant");
    return { id: entry.id, label_en: entry.label_en, signal: s, confidence: contrastConfidence(s.value, s.se, s.n.clusters),
      confidence_method: "two_sided_run_cluster_t_coverage_not_causal_probability", cores: entry.cores ?? [], combos: entry.combos ?? [],
      source: { file: knowledge.reflex.path, version: entry.version, sha256: createHash("sha256").update(JSON.stringify(entry)).digest("hex"),
        evidence_runs: [...new Set(entry.evidence.observations.map(o => o.run_id))], source_experience: entry.source_experience },
      interpretation: "Observed adjusted take-minus-same-offer-not-taken difference; association, not causal benefit. Negative HP loss means less observed loss; fewer turns alone need not mean a better outcome." };
  });
}
