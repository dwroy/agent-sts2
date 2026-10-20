/** Supply Monte Carlo and empirical fallback use only scoped historical observations. */
import { evaluateBuildPrerequisites } from "../v6/build-core-conditions.js";
import type { BuildState, Component, Requirement, OpportunityModel } from "../construction/types.js";
import { v6Digest, type V6Combo, type V6CompletionSource, type V6CompletionContext, type V6CompletionCombination } from "./v6-completion.js";
export interface V6HistoryChange {
  floor: number; act: number; adds: BuildState["cards"]; removes: BuildState["cards"];
  upgrades: string[]; positiveGold: number; rest: boolean;
}
export interface V6HistoryRun {
  run: string; character: string; ascension: number; endedAt: string;
  /** First-attempt checkpoints only; missing floors must not be filled from final decks. */
  floors: number[]; changes: V6HistoryChange[];
}
export interface V6SupplyData {
  character: string; ascension: number; opportunities: OpportunityModel; histories: readonly V6HistoryRun[];
  excludeRun: string; asOf: string; signature: string;
  draws?: number; floorBand?: number;
}
/** Integer hash: world, step and purpose are shared by all options, with no option-dependent RNG consumption. */
function uniform(seed: number, ...parts: (string | number)[]): number {
  let h = seed >>> 0;
  for (const ch of parts.join("\0")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); h ^= h >>> 13; }
  h = Math.imul(h ^ (h >>> 16), 2246822507); return (h >>> 0) / 4294967296;
}
/** Capacity-constrained matching prevents one card satisfying overlapping requirements twice. */
export function v6Match(state: BuildState, requirements: readonly Requirement[]): { missing: number; counts: number[] } {
  // Disjoint identities cannot compete for physical cards. Count them directly instead of
  // allocating a flow graph for every candidate in every supply world.
  const owners = new Map<string, number>();
  const groups = requirements.map((r, ri) => {
    const alternatives = new Map<string, Component[]>();
    for (const c of r.any) { const key = `${c.kind}\0${c.id}`;
      if (!owners.has(key)) owners.set(key, ri);
      else if (owners.get(key) !== ri) owners.set(key, -1);
      const group = alternatives.get(key) ?? []; group.push(c); alternatives.set(key, group);
    }
    return alternatives;
  });
  if (![...owners.values()].includes(-1)) {
    const counts = requirements.map((r, ri) => {
      let available = 0;
      for (const alternatives of groups[ri]!.values()) {
        const c = alternatives[0]!, matches = c.kind === "card"
          ? state.cards.filter(t => t.id === c.id && alternatives.some(a => !a.upgraded || t.upgraded)).length
          : alternatives.some(a => !a.upgraded) ? state.relics.filter(id => id === c.id).length : 0;
        available += r.distinct ? Math.min(1, matches) : matches;
      }
      return Math.max(0, r.count - available);
    });
    return { missing: counts.reduce((a, b) => a + b, 0), counts };
  }
  const things: Component[] = [...state.cards.map(c => ({ ...c, kind: "card" as const })), ...state.relics.map(id => ({ id, kind: "relic" as const }))];
  type Edge = { to: number; rev: number; cap: number };
  const graph: Edge[][] = [[], []], source = 0, sink = 1;
  const node = () => (graph.push([]), graph.length - 1);
  const edge = (a: number, b: number, cap: number) => { const e = { to: b, rev: graph[b]!.length, cap }; graph[a]!.push(e); graph[b]!.push({ to: a, rev: graph[a]!.length - 1, cap: 0 }); return e; };
  const itemNodes = things.map(() => node()); itemNodes.forEach(n => edge(n, sink, 1));
  const roots = requirements.map(r => { const n = node(), root = edge(source, n, r.count);
    const groups = new Map<string, Component[]>();
    for (const c of r.any) { const key = JSON.stringify([c.kind, c.id]); groups.set(key, [...groups.get(key) ?? [], c]); }
    for (const alternatives of groups.values()) { const cn = node(); edge(n, cn, r.distinct ? 1 : r.count);
      things.forEach((t, i) => { if (alternatives.some(c => c.kind === t.kind && c.id === t.id && (!c.upgraded || t.upgraded))) edge(cn, itemNodes[i]!, 1); }); }
    return root;
  });
  for (;;) { const prev: ({ at: number; index: number } | undefined)[] = Array(graph.length); const q = [source]; prev[source] = { at: source, index: 0 };
    for (let i = 0; i < q.length && !prev[sink]; i++) graph[q[i]!]!.forEach((e, j) => { if (e.cap > 0 && !prev[e.to]) { prev[e.to] = { at: q[i]!, index: j }; q.push(e.to); } });
    if (!prev[sink]) break;
    for (let n = sink; n !== source;) { const p = prev[n]!, e = graph[p.at]![p.index]!; e.cap--; graph[n]![e.rev]!.cap++; n = p.at; }
  }
  const counts = roots.map(e => e.cap); return { missing: counts.reduce((a, b) => a + b, 0), counts };
}
function add(state: BuildState, card: BuildState["cards"][number]): BuildState | null {
  if (state.cap !== null && state.cards.length >= state.cap) return null;
  const next = structuredClone(state); next.cards.push({ ...card }); return next;
}
/** A fixed signature is completed without adding future relics or changing current resources. */
export function v6Complete(state: BuildState, requirements: readonly Requirement[]): BuildState | null {
  let s = structuredClone(state), m = v6Match(s, requirements);
  for (let step = 0; m.missing && step < 500; step++) {
    let chosen: BuildState | null = null, best = m.missing;
    for (const [ri, r] of requirements.entries()) if (m.counts[ri]) for (const c of r.any) {
      if (c.kind !== "card") continue;
      const candidates: BuildState[] = [];
      if (c.upgraded) s.cards.forEach((x, i) => { if (x.id === c.id && !x.upgraded) { const u = structuredClone(s); u.cards[i]!.upgraded = true; candidates.push(u); } });
      const a = add(s, { id: c.id, upgraded: c.upgraded ?? false }); if (a) candidates.push(a);
      for (const next of candidates) { const missing = v6Match(next, requirements).missing; if (missing < best) { best = missing; chosen = next; } }
    }
    if (!chosen) return null; s = chosen; m = v6Match(s, requirements);
  }
  return m.missing ? null : s;
}
function general(state: BuildState, route: V6HistoryRun, end: number): BuildState | null {
  const s = structuredClone(state);
  for (const c of route.changes.filter(c => c.floor > state.floor && c.floor < end)) {
    for (const card of c.removes) { const i = s.cards.findIndex(x => x.id === card.id && x.upgraded === card.upgraded); if (i >= 0) s.cards.splice(i, 1); }
    for (const id of c.upgrades) { const card = s.cards.find(x => x.id === id && !x.upgraded); if (card) card.upgraded = true; }
    for (const card of c.adds) { if (s.cap !== null && s.cards.length >= s.cap) return null; s.cards.push({ ...card }); }
  }
  return s;
}
export function v6SupplySource(data: V6SupplyData, now: () => number = () => performance.now()): V6CompletionSource {
  const draws = data.draws ?? 200, band = data.floorBand ?? 4;
  if (!data.signature || !Number.isSafeInteger(draws) || draws < 1 || draws > 10000 || !Number.isSafeInteger(band) || band < 0) throw new Error("invalid frozen V6 supply data");
  const scoped = data.histories.filter(h => h.character === data.character && h.run !== data.excludeRun && h.endedAt < data.asOf);
  const offers = data.opportunities.character === data.character ? data.opportunities.rows.filter(o => o.run !== data.excludeRun && o.ts < data.asOf) : [];
  const pools = new Map<string, typeof offers>();
  const pool = (act: number, floor: number, kind: string) => { const key = `${act}:${floor}:${kind}`; let p = pools.get(key);
    if (!p) { p = offers.filter(o => o.act === act && o.kind === kind && Math.abs(o.floor - floor) <= band); pools.set(key, p); } return p; };
  const kind = "historical_supply_v1";
  type Progress = { world: number; outcomes: boolean[]; reasons: string[]; completed: BuildState | null };
  const progress = new Map<string, Progress>();
  const routeCache = new Map<string, { routes: V6HistoryRun[]; eventsByRun: Map<string,
    ({ floor: number; change: V6HistoryChange | null; offer: typeof offers[number] | null })[]> }>();
  return { kind, signature: v6Digest([data.signature, draws, band]), resolve(context: V6CompletionContext) {
    const { direction: d, options, target, samples: n, seed } = context;
    if (d.character !== data.character || !d.ascensions.includes(data.ascension)) return null;
    const baseline = options[0]!, start = baseline.state.floor;
    const routeKey = `${start}:${target.floor}`;
    let routeData = routeCache.get(routeKey);
    if (!routeData) {
      const routes = scoped.filter(h => h.floors.some(f => f >= start && f <= start + band) && h.floors.includes(target.floor));
      const eventsByRun = new Map(routes.map(route => [route.run,
        [...route.changes.filter(x => x.floor > start && x.floor < target.floor).map(c => ({ floor: c.floor, change: c, offer: null })),
          ...offers.filter(x => x.run === route.run && x.floor > start && x.floor < target.floor).map(x => ({ floor: x.floor, change: null, offer: x }))]
          .sort((a, b) => a.floor - b.floor || Number(!!a.offer) - Number(!!b.offer))]));
      routeData = { routes, eventsByRun };
      if (routeCache.size >= 64) routeCache.delete(routeCache.keys().next().value!);
      routeCache.set(routeKey, routeData);
    }
    const { routes, eventsByRun } = routeData;
    const labels = ["historical_reached_target_selection", "supply_pooled_versions_and_ascensions", "historical_net_positive_gold_conservative", "signature_not_operability",
      "future_relics_and_potions_not_predicted", "empirical_same_floor_actual_add_upgrade_remove", "supply_mc_uncertainty_excludes_model_error",
      "supply_greedy_signature_distance_policy_not_optimal_acquisition", "empirical_absent_removal_or_upgrade_target_skipped"];
    let combos = [...d.combos]; const override = context.idealOverrides?.[d.id];
    if (override?.length) {
      const permitted = new Set([...d.combos.flatMap(k => [...Object.keys(k.roles), ...k.requirements.flatMap(r => r.any.filter(x => x.kind === "card").map(x => x.id))]), ...baseline.state.cards.map(c => c.id), ...context.appearedCards ?? []]);
      if (override.some(id => !permitted.has(id))) throw new Error("brain override outside build pool or current deck");
      const counts = new Map<string, number>(); for (const id of override) counts.set(id, (counts.get(id) ?? 0) + 1);
      const temporary: V6Combo = { id: `${d.id}:brain`, source: "brain", summary: null, prerequisites: null, roles: {},
        requirements: [...counts].map(([id, count]) => ({ id, count, any: [{ id, kind: "card" }] })) };
      // A brain list cannot silently discard executable prerequisites from a matching formal combo.
      const matching = d.combos.filter(c => v6Match({ ...baseline.state, cards: override.map(id => ({ id, upgraded: true })) }, c.requirements).missing === 0);
      if (matching.length && matching.every(c => c.prerequisites !== null)) temporary.prerequisites = matching.length === 1
        ? matching[0]!.prerequisites : { op: "or", args: matching.map(c => c.prerequisites!) };
      else if (!matching.length && d.combos.some(c => c.prerequisites !== null)) temporary.prerequisiteResolution = "unknown";
      combos.unshift(temporary);
    }
    if (context.phase === "pick") { const rank = context.ranking ?? []; combos.sort((a, b) => {
      const ia = rank.indexOf(a.id), ib = rank.indexOf(b.id); return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
    }); if (!rank.length) labels.push("act_ranking_unavailable_stable_catalog_order"); combos = combos.slice(0, 4); }
    if (context.combinationIds) combos = combos.filter(c => context.combinationIds!.includes(c.id));
    const combinations: V6CompletionCombination[] = [];
    for (const combo of combos) {
      const wanted = new Set(combo.requirements.flatMap(r => r.any.filter(c => c.kind === "card").map(c => c.id)));
      const relaxed = combo.requirements.map(r => ({ ...r, any: r.any.map(c => ({ ...c, upgraded: false })) }));
      const matchCache = new Map<string, ReturnType<typeof v6Match>>();
      const match = (state: BuildState, reqs: readonly Requirement[]) => { const key = JSON.stringify([state.cards.map(c => [c.id, c.upgraded]), state.relics, reqs === combo.requirements ? 0 : 1]);
        let v = matchCache.get(key); if (!v) { v = v6Match(state, reqs); if (matchCache.size < 20000) matchCache.set(key, v); } return v; };
      // Only forecast facts are supplied. Missing HP/counters/powers must not become an invented condition.
      const forecastable = (p: NonNullable<V6Combo["prerequisites"]>): boolean => p.op === "and" || p.op === "or" ? p.args.every(forecastable)
        : p.op === "not" ? forecastable(p.arg) : p.op === "any" || p.op === "all" ? p.field === "player.deck" && forecastable(p.arg)
          : "field" in p && ["floor", "player.gold", "player.relics", "player.deck", "card.id", "card.upgraded"].includes(p.field);
      const condition = (state: BuildState): boolean | null => combo.prerequisiteResolution === "unknown" || combo.prerequisites && !forecastable(combo.prerequisites) ? null
        : evaluateBuildPrerequisites(combo, { floor: target.floor, player: { gold: state.gold, relics: state.relics,
          deck: state.cards.map(card => ({ id: card.id, upgraded: card.upgraded })) } });
      const formed = (state: BuildState): boolean | null => match(state, combo.requirements).missing ? false : condition(state);
      const outcomes: Record<string, boolean[] | null> = {}, availability: Record<string, number | null> = {};
      const completed: Record<string, BuildState | null> = {}, unknownReasons: Record<string, string[]> = {};
      for (const o of options) {
        // Adding candidates to an idle baseline request does not invalidate its supply worlds.
        // Option identities, metrics, target boss and combat sample count do not affect the RNG.
        const key = v6Digest([combo.requirements, combo.prerequisites, combo.prerequisiteResolution, o.state, start, target.floor, seed]);
        let saved = progress.get(key);
        if (!saved) {
          const state = v6Complete(o.state, combo.requirements);
          saved = { world: 0, outcomes: [], reasons: [], completed: state && condition(state) === true ? state : null };
          if (progress.size >= 512) progress.delete(progress.keys().next().value!);
          progress.set(key, saved);
        }
        completed[o.id] = saved.completed;
        const initial = formed(o.state), heldMissing = combo.prerequisites?.op === "contains"
          && combo.prerequisites.field === "player.relics" && condition(o.state) === false;
        let interrupted = false;
        const reason = (value: string) => { if (!saved.reasons.includes(value)) saved.reasons.push(value); };
        for (let world = saved.world; world < draws && initial !== true && !heldMissing; world++) {
          if (now() >= context.deadline) { interrupted = true; break; }
          const route = routes[Math.floor(uniform(seed, world, "route") * routes.length)];
          if (!route) { reason("own_reached_target_route_missing"); break; }
          let state = structuredClone(o.state);
          const events = eventsByRun.get(route.run)!;
          for (const [ei, e] of events.entries()) {
            if (formed(state) === true) break;
            if (now() >= context.deadline) { interrupted = true; break; }
            if (e.change) { state.gold += e.change.positiveGold;
              if (e.change.rest) { let best = match(state, combo.requirements).missing, choice = -1;
                state.cards.forEach((c, i) => { if (!c.upgraded && wanted.has(c.id)) { c.upgraded = true; const m = match(state, combo.requirements).missing; c.upgraded = false; if (m < best) { best = m; choice = i; } } });
                if (choice >= 0) state.cards[choice]!.upgraded = true;
              } continue;
            }
            const own = e.offer!, p = pool(own.act, own.floor, own.kind);
            const sampled = p[Math.floor(uniform(seed, world, ei, "offers") * p.length)];
            if (!sampled) { reason("historical_supply_pool_missing"); break; }
            const remaining = [...sampled.offers];
            for (let taken = 0; taken < (own.kind === "reward" ? 1 : sampled.offers.length); taken++) {
              let choice = -1, best = match(state, combo.requirements).missing, next: BuildState | null = null;
              remaining.forEach((card, i) => { if (!wanted.has(card.id) || !Number.isFinite(card.price) || card.price < 0 || card.price > state.gold) return;
                const s = add(state, card); if (!s) return; const m = match(s, combo.requirements).missing;
                // An unupgraded required card can be useful before a later rest.
                const gain = best - m, relaxedGain = match(state, relaxed).missing - match(s, relaxed).missing;
                if (gain > 0 || gain === 0 && relaxedGain > 0 && choice < 0) { if (gain > 0 || choice < 0) { choice = i; best = m; next = s; } }
              });
              if (choice < 0 || !next) break; (next as BuildState).gold -= remaining[choice]!.price; remaining.splice(choice, 1); state = next;
            }
          }
          // Interrupted worlds are not committed and resume at the same absolute RNG index.
          if (interrupted) break;
          const result = formed(state);
          if (result === null) reason("unforecast_prerequisite_facts");
          else saved.outcomes.push(result);
          saved.world = world + 1;
        }
        unknownReasons[o.id] = [...saved.reasons];
        if (initial === true || heldMissing) { outcomes[o.id] = Array.from({ length: draws }, () => !heldMissing); unknownReasons[o.id] = []; }
        else if (saved.world !== draws || saved.reasons.length || saved.outcomes.length !== draws) {
          outcomes[o.id] = null;
          if (interrupted) unknownReasons[o.id]!.push("supply_budget_exhausted");
        } else outcomes[o.id] = saved.outcomes.slice();
        availability[o.id] = outcomes[o.id] ? outcomes[o.id]!.filter(Boolean).length / draws : null;
      }
      const scenarioIds = Array.from({ length: n }, (_, i) => `seed:${i}`);
      const gs = scenarioIds.map((id, i) => { const route = routes[i % routes.length]; return { id, states: Object.fromEntries(options.map(o => [o.id, route ? general(o.state, route, target.floor) : null])) }; });
      combinations.push({ id: combo.id, source: combo.source, requirements: combo.requirements, summary: combo.summary, roles: combo.roles,
        samples: scenarioIds.map(id => ({ id, states: completed })), general: gs, availability, supply: outcomes, unknownReasons,
        labels: ["completed_signature_adds_only_missing_cards_and_upgrades", ...(combo.prerequisites !== null || combo.prerequisiteResolution ? ["prerequisites_evaluated_on_projected_deck_gold_and_held_relics", "unforecast_prerequisite_facts_remain_unknown"] : []), "empirical_samples_split_simulation_budget", ...(combo.requirements.some(r => r.any.length > 1) ? ["alternative_membership_completed_by_deterministic_minimum_signature"] : [])] });
    }
    return { source: kind, signature: v6Digest([data.signature,
      combos.map(c => [c.id, c.requirements, c.prerequisites, c.prerequisiteResolution]), draws, band]), combinations, labels };
  } };
}
