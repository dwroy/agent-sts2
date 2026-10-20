/** Deterministic appearance-table completion. No supply worlds or incomplete-deck fights. */
import type { BuildState } from "../construction/types.js";
import { evaluateBuildPrerequisites } from "../v6/build-core-conditions.js";
import { v6Complete, v6Match } from "./v6-supply.js";
import { v6Digest, type V6Combo, type V6CompletionContext, type V6CompletionSource } from "./v6-completion.js";

/** Structural subset of v6-appearance-v1; the pack loader owns full validation. */
export interface V6FormationTable {
  character: string; cutoff: string; runs: readonly { run_id: string; ended: string }[];
  cards: readonly { source: "reward" | "shop"; rarity: string; card_id: string; n: number;
    probability: number | null; upgraded_appearances: number }[];
  remaining: readonly { from_floor: number; target_floor: number; kind: string; median: number | null }[];
  labels: readonly string[];
}
/** Single-copy opportunity approximation; the table does not identify duplicate-copy joints. */
function tail(probabilities: { p: number; n: number }[], count: number): number | null {
  if (!probabilities.length || probabilities.every(x => x.p === 0 || x.n === 0)) return 0;
  if (count === 1) return 1 - probabilities.reduce((q, { p, n }) => q * (1 - p) ** n, 1);
  return null;
}
function forecastable(p: NonNullable<V6Combo["prerequisites"]>): boolean {
  return p.op === "and" || p.op === "or" ? p.args.every(forecastable) : p.op === "not" ? forecastable(p.arg)
    : p.op === "any" || p.op === "all" ? p.field === "player.deck" && forecastable(p.arg)
      : "field" in p && ["floor", "player.gold", "player.relics", "player.deck", "card.id", "card.upgraded"].includes(p.field);
}
function condition(combo: V6Combo, state: BuildState, floor: number): boolean | null {
  return combo.prerequisiteResolution === "unknown" || combo.prerequisites && !forecastable(combo.prerequisites) ? null
    : evaluateBuildPrerequisites(combo, { floor, player: { gold: state.gold, relics: state.relics, deck: state.cards } });
}
function canonical(state: BuildState): BuildState {
  state.cards.sort((a, b) => a.id.localeCompare(b.id) || Number(a.upgraded) - Number(b.upgraded)); return state;
}
function combinations(c: V6CompletionContext): V6Combo[] {
  const result = [...c.direction.combos], override = c.idealOverrides?.[c.direction.id];
  if (override?.length) {
    const allowed = new Set([...result.flatMap(k => [...Object.keys(k.roles), ...k.requirements.flatMap(r => r.any.filter(x => x.kind === "card").map(x => x.id))]),
      ...c.options[0]!.state.cards.map(x => x.id), ...c.appearedCards ?? []]);
    if (override.some(id => !allowed.has(id))) throw new Error("brain override outside build pool or current deck");
    const counts = new Map<string, number>(); override.forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1));
    const temporary: V6Combo = { id: `${c.direction.id}:brain`, source: "brain", summary: null, prerequisites: null, roles: {},
      requirements: [...counts].map(([id, count]) => ({ id, count, any: [{ id, kind: "card" }] })) };
    const matching = result.filter(k => !v6Match({ ...c.options[0]!.state, cards: override.map(id => ({ id, upgraded: true })) }, k.requirements).missing);
    if (matching.length && matching.every(k => k.prerequisites !== null)) temporary.prerequisites = matching.length === 1 ? matching[0]!.prerequisites
      : { op: "or", args: matching.map(k => k.prerequisites!) };
    else if (!matching.length && result.some(k => k.prerequisites !== null)) temporary.prerequisiteResolution = "unknown";
    result.unshift(temporary);
  }
  if (c.combinationIds) return result.filter(k => c.combinationIds!.includes(k.id));
  const rank = c.ranking ?? [];
  result.sort((a, b) => (rank.includes(a.id) ? rank.indexOf(a.id) : Infinity) - (rank.includes(b.id) ? rank.indexOf(b.id) : Infinity));
  return c.phase === "pick" ? result.slice(0, 4) : result;
}
export function v6FormationTableSource(data: { character: string; ascension: number; signature: string;
  table?: V6FormationTable; excludeRun: string; asOf: string }): V6CompletionSource {
  const kind = "historical_appearance_lookup_v1", table = data.table;
  const valid = table?.character === data.character && table.cutoff <= data.asOf
    && table.runs.every(r => r.run_id !== data.excludeRun && r.ended < data.asOf);
  const cards = new Map(table?.cards.map(c => [`${c.source}:${c.card_id}`, c]));
  const remaining = new Map(table?.remaining.map(r => [`${r.from_floor}:${r.target_floor}:${r.kind}`, r.median]));
  const lookupCache = new Map<string, ReturnType<V6CompletionSource["resolve"]>>();
  // Completion only changes the card signature. Reuse it across target floors,
  // sample counts and potion/gold alternatives; their resources stay option-local.
  const completedCards = new Map<string, BuildState["cards"] | null>();
  const complete = (state: BuildState, combo: V6Combo): BuildState | null => {
    const key = v6Digest([state.cards, state.relics, state.cap, combo.requirements]);
    if (!completedCards.has(key)) {
      if (completedCards.size >= 512) completedCards.delete(completedCards.keys().next().value!);
      completedCards.set(key, v6Complete(state, combo.requirements)?.cards ?? null);
    }
    const cards = completedCards.get(key);
    return cards ? { ...state, cards: cards.map(card => ({ ...card })) } : null;
  };
  const source: V6CompletionSource = { kind, signature: data.signature, resolve(c) {
    if (c.direction.character !== data.character || !c.direction.ascensions.includes(data.ascension)) return null;
    const key = v6Digest([c.direction.signature, c.direction.combos.map(k => [k.id, k.requirements, k.prerequisites, k.prerequisiteResolution]),
      c.options, c.target.floor, c.samples, c.phase, c.idealOverrides, c.appearedCards, c.combinationIds, c.ranking]);
    const hit = lookupCache.get(key); if (hit) return hit;
    const rows = combinations(c).map(combo => {
      const availability: Record<string, number | null> = {}, states: Record<string, BuildState | null> = {}, unknownReasons: Record<string, string[]> = {};
      const labels = ["lookup_probability_pooled_versions_and_ascensions", "independent_opportunities_and_missing_card_identities_approximation",
        "duplicate_missing_copies_joint_probability_unknown", "remaining_median_exposure_not_guaranteed_route",
        "gold_and_purchase_affordability_unmodeled", "reward_selection_conflicts_unmodeled", "signature_not_operability",
        "completion_adds_only_missing_cards_and_upgrades", "no_supply_mc_no_incomplete_deck_simulation",
        "alternative_membership_completed_by_deterministic_minimum_signature", ...table?.labels ?? []];
      for (const o of c.options) {
        const reasons: string[] = []; unknownReasons[o.id] = reasons;
        const completed = complete(o.state, combo);
        const gate = completed && condition(combo, completed, c.target.floor);
        states[o.id] = completed && gate === true ? canonical(completed) : null;
        if (gate === false) { availability[o.id] = 0; continue; }
        if (!completed || gate !== true) { availability[o.id] = null; reasons.push("unforecast_prerequisite_or_completion"); continue; }
        if (!v6Match(o.state, combo.requirements).missing) { availability[o.id] = 1; continue; }
        if (!valid) { availability[o.id] = null; reasons.push("missing_or_out_of_scope_appearance_table"); continue; }
        let p = 1;
        const ids = [...new Set(completed.cards.map(x => x.id))];
        let upgrades = 0;
        for (const id of ids) upgrades += Math.max(0, completed.cards.filter(x => x.id === id && x.upgraded).length - o.state.cards.filter(x => x.id === id && x.upgraded).length);
        const smith = remaining.get(`${o.state.floor}:${c.target.floor}:upgrade`);
        const canSmith = upgrades === 0 || smith != null && Math.floor(smith) >= upgrades;
        if (upgrades) labels.push(canSmith ? "upgrade_median_capacity_order_and_target_conflicts_unmodeled" : "direct_upgraded_offers_only_missing_smith_capacity");
        for (const id of ids) {
          const held = o.state.cards.filter(x => x.id === id), wanted = completed.cards.filter(x => x.id === id);
          const add = wanted.length - held.length, up = wanted.filter(x => x.upgraded).length - held.filter(x => x.upgraded).length;
          if (add <= 0 && up <= 0) continue;
          if (!canSmith && up > add) {
            if (smith === 0) { p = 0; break; }
            reasons.push("upgrade_opportunity_capacity_unknown_or_insufficient"); break;
          }
          const exposure: { p: number; n: number }[] = [], rarities = new Set<string>();
          for (const source of ["reward", "shop"] as const) {
            const n = remaining.get(`${o.state.floor}:${c.target.floor}:${source}`);
            if (n == null) { reasons.push(`remaining_${source}_exact_checkpoint_missing`); break; }
            if (!n) continue;
            const row = cards.get(`${source}:${id}`);
            if (!row || row.probability === null || !row.n || !row.rarity) { reasons.push(`appearance_${source}_${id}_missing`); break; }
            rarities.add(row.rarity);
            exposure.push({ n, p: !canSmith && up > 0 ? row.upgraded_appearances / row.n : row.probability });
          }
          if (rarities.size > 1) reasons.push("contradictory_card_rarity");
          if (reasons.length) break;
          if (add > 0) { const q = tail(exposure, add); if (q === null) { reasons.push("duplicate_missing_copies_joint_probability_unknown"); break; } p *= q; }
        }
        availability[o.id] = reasons.length ? null : Math.min(1, Math.max(0, p));
      }
      return { id: combo.id, source: combo.source, requirements: combo.requirements, summary: combo.summary, roles: combo.roles,
        samples: Array.from({ length: c.samples }, (_, i) => ({ id: `seed:${i}`, states })), general: [], supply: {}, availability, unknownReasons,
        labels: [...new Set(labels)] };
    });
    const result = { source: kind, signature: v6Digest([data.signature, c.target.floor, rows.map(r => r.id)]), combinations: rows,
      labels: ["formation_times_completed", "no_incomplete_case", ...table?.labels ?? []] };
    if (lookupCache.size >= 256) lookupCache.delete(lookupCache.keys().next().value!);
    lookupCache.set(key, result); return result;
  } };
  source.rank = c => {
    const rows = source.resolve({ ...c, phase: "act", samples: 1, combinationIds: undefined })?.combinations;
    if (!rows) return null;
    const score = (row: typeof rows[number]) => Math.max(-Infinity, ...Object.values(row.availability).filter((p): p is number => p !== null));
    return [...rows].sort((a, b) => score(b) - score(a)).map(r => r.id);
  };
  return source;
}
