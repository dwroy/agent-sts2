/** Reward-only, observed-data whole-fight predictions. No combat simulation or card-value constants. */
import { join } from "node:path";
import { asArray, asRecord, bool, num, str } from "../core/util/json.js";
import type { DecisionEnv } from "../memory/types.js";
import { permanentCardGain } from "../memory/run-constraints.js";
import { actOf } from "../memory/run-plan.js";
import { actPlan } from "../hand/screens/route-plan.js";
import { actFirstFloor } from "../sim/route-map.js";
import { v6Digest } from "../sim/v6-completion.js";
import { v6PublishedKnowledge } from "./direction-runtime.js";
import { evaluatePredicate } from "./predicate.js";
import type { BuildCore, BuildCombo } from "./build-core.js";
import { loadOpeningModel, openingCardKey, predictOpening, type FightKind, type OpeningInput, type OpeningModel } from "./opening-value.js";

export interface ValueTarget {
  id: string; kind: FightKind; act: number; floor: number; weight: number; count: number; n: number; runs: number;
  hp_loss: number; win: number; win_delta: number; turns: number; saved_hp: number; error: number;
}
export interface ValueCore {
  direction: string; combo: string; missing: number; unknown: string[];
  bosses: { act: number; id: string; hp_loss: number; error: number; n: number; runs: number }[];
}
export interface CardValueOption {
  id: string; card: string | null; known: boolean; saved_hp: number | null; error: number | null;
  rank: number | null; tier: string; next_boss_saved_hp: number | null; next_boss_error: number | null; advances: { direction: string; combo: string; missing: number; advanced: number }[];
  targets: ValueTarget[]; unknown: string[];
}
export interface CardValueTable {
  schema: "card-value-v2"; model_id: string | null; fingerprint: string; options: CardValueOption[]; cores: ValueCore[];
  route: { source: string; counts: Record<FightKind, number> }; labels: string[];
  telemetry: { elapsed_ms: number; cache_hits: number };
}
export function openingInput(env: DecisionEnv): OpeningInput {
  const raw = asRecord(env.state.run?.raw);
  return { hp: env.state.run?.current_hp ?? num(raw.current_hp), max_hp: env.state.run?.max_hp ?? num(raw.max_hp),
    max_energy: num(raw.max_energy, 3), ascension: env.state.run?.ascension ?? 0, act: actOf(env.state), floor: env.state.run?.floor ?? 0,
    deck: asArray(raw.deck).map(asRecord), relics: asArray(raw.relics).map(v => str(asRecord(v).relic_id)).filter(Boolean),
    potions: asArray(raw.potions).filter(v => bool(asRecord(v).occupied)).map(v => str(asRecord(v).potion_id)).filter(Boolean) };
}
const canonicalBoss = (s: string) => s.replace(/_BOSS$/, "").split("+").sort().join("+");
function distribution(model: OpeningModel, act: number, kind: FightKind, visible = "") {
  const rows = (model.encounters[String(act)] ?? []).filter(r => r.kind === kind);
  const selected = kind === "boss" && visible ? rows.filter(r => r.boss_ids.some(id => canonicalBoss(id) === canonicalBoss(visible)) || canonicalBoss(r.id) === canonicalBoss(visible)) : rows;
  const mass = selected.reduce((sum, r) => sum + r.weight, 0);
  // Conditioning on a visible Boss is explicit; an unobserved Boss never falls back to a different one.
  return mass > 0 ? selected.map(r => ({ ...r, weight: r.weight / mass })) : [];
}
function remaining(env: DecisionEnv, model: OpeningModel, input: OpeningInput): CardValueTable["route"] {
  const plan = actPlan(env, input.act), steps = plan?.path.filter(p => actFirstFloor(input.act) + p.row > input.floor);
  if (steps?.length && steps.some(p => p.type === "Boss")) return { source: "selected_route", counts: {
    hallway: steps.filter(p => p.type === "Monster").length, elite: steps.filter(p => p.type === "Elite").length,
    boss: steps.filter(p => p.type === "Boss").length } };
  const counts = model.remaining[`${input.act}:${input.floor}`];
  return { source: counts ? "observed_remaining_fights_conditional_on_reaching_floor" : "remaining_fights_unknown",
    counts: counts ?? { hallway: 0, elite: 0, boss: 0 } };
}
function missingCards(deck: OpeningInput["deck"], combo: BuildCombo) {
  const used = new Set<number>(), missing: { id: string; upgraded: boolean }[] = [];
  for (const req of combo.cards) for (let copy = 0; copy < req.count; copy++) {
    const ids = "id" in req ? [req.id] : req.any_of;
    const found = deck.findIndex((c, i) => !used.has(i) && ids.includes(str(c.card_id)) && (!req.upgraded || bool(c.upgraded)));
    if (found >= 0) used.add(found); else missing.push({ id: ids[0]!, upgraded: req.upgraded });
  }
  return missing;
}
function completedCores(env: DecisionEnv, model: OpeningModel, input: OpeningInput, cores: BuildCore[], check: () => void): ValueCore[] {
  const context = { act: input.act, floor: input.floor, player: { hp: input.hp, max_hp: input.max_hp,
    gold: num(asRecord(env.state.run?.raw).gold), relics: input.relics, deck: input.deck.map(c => ({ ...c, id: str(c.card_id) })) } };
  return cores.filter(c => c.scope.ascensions.includes(input.ascension)).flatMap(core => core.combos.map(combo => {
    check();
    const missing = missingCards(input.deck, combo), unknown: string[] = [], deck = [...input.deck];
    if (combo.prerequisites && evaluatePredicate(combo.prerequisites, context) !== true) unknown.push("core_prerequisite_or_required_resource_unavailable");
    for (const c of missing) {
      const face = model.catalog[c.id + (c.upgraded ? "+" : "")];
      if (face) deck.push(face); else unknown.push(`unobserved_core_card:${c.id}${c.upgraded ? "+" : ""}`);
    }
    const bosses: ValueCore["bosses"] = [];
    if (!unknown.length) for (let act = input.act + 1; act <= 3; act++) for (const target of distribution(model, act, "boss")) {
      check();
      const result = predictOpening(model, { ...input, deck, act, floor: target.floor_mean }, target.id, "boss"), error = model.errors.boss ?? model.errors.all!;
      bosses.push({ act, id: target.id, hp_loss: result.hp_loss, error: error.hp_rmse, n: target.n, runs: target.runs });
    }
    if (!unknown.length && !bosses.length) unknown.push("no_observed_later_boss");
    return { direction: core.direction, combo: combo.id, missing: missing.length, unknown: [...new Set(unknown)], bosses };
  }));
}
/** Per-run immutable model/cores snapshot. Forecasts are cheap; full details are retained for audits. */
export class CardValueRuntime {
  private run: string | null = null; private model: OpeningModel | null = null; private cores: BuildCore[] = [];
  private cache = new Map<string, CardValueTable>();
  constructor(private dir: string, private record: (env: DecisionEnv, table: CardValueTable) => void = () => {}) {}
  supports(env: DecisionEnv): boolean { return str(asRecord(env.state.run?.raw).character_id).toLowerCase() === "silent"; }
  private load(env: DecisionEnv) {
    const run = str(env.state.raw.run_id), character = str(asRecord(env.state.run?.raw).character_id).toLowerCase();
    if (run !== this.run) {
      this.run = run; this.cache.clear();
      this.model = loadOpeningModel(join(this.dir, "characters", character, "opening-value.json"), character);
      const loaded = v6PublishedKnowledge(env, this.dir).cores; this.cores = loaded.status === "loaded" ? loaded.value : [];
    }
  }
  evaluate(env: DecisionEnv, budgetMs = Infinity): CardValueTable | undefined {
    // Preserve other roles' existing path until their own observed-data packet is explicitly adopted.
    if (!this.supports(env)) return undefined;
    const started = performance.now();
    const check = () => { if (performance.now() - started >= budgetMs) throw new Error("card_value_preparation_budget"); };
    this.load(env); check();
    const input = openingInput(env), offers = asArray(asRecord(env.state.raw.reward).card_options).map(asRecord);
    const visible = str(asRecord(env.state.run?.raw).boss_id);
    const fingerprint = v6Digest([input, offers, visible, env.screenMemory.routePlan, this.model?.model_id]);
    const cached = this.cache.get(fingerprint);
    if (cached) { const table = structuredClone(cached); table.telemetry = { elapsed_ms: performance.now() - started, cache_hits: 1 }; this.record(env, table); return table; }
    const model = this.model, route = model ? remaining(env, model, input) : { source: "model_unavailable", counts: { hallway: 0, elite: 0, boss: 0 } };
    const cores = model ? completedCores(env, model, input, this.cores, check) : [];
    const choices = offers.map((card, index) => ({ id: `card${num(card.index, index)}`, card, copies: permanentCardGain(env.state, { action: "choose_reward_card", option_index: num(card.index, index) }) }));
    if (env.state.available_actions.includes("skip_reward_cards")) choices.push({ id: "skip", card: {}, copies: 0 });
    const options: CardValueOption[] = choices.map(choice => {
      check();
      const unknown: string[] = [], targets: ValueTarget[] = [];
      if (!model) unknown.push("opening_model_unavailable");
      if (choice.copies === null) unknown.push("permanent_card_gain_unknown");
      const deck = [...input.deck, ...Array.from({ length: choice.copies ?? 0 }, () => choice.card)];
      // Novel card IDs retain observed descriptors but are explicitly out of training support.
      if (model && choice.copies && !model.catalog[openingCardKey(choice.card)]) unknown.push("candidate_outside_training_card_support");
      if (model && !unknown.length) for (const kind of ["hallway", "elite", "boss"] as const) {
        const pool = distribution(model, input.act, kind, kind === "boss" ? visible : "");
        if (!pool.length && (kind === "boss" || route.counts[kind] > 0)) unknown.push(`unobserved_current_${kind}`);
        for (const target of pool) {
          check();
          const future = { ...input, floor: Math.max(input.floor + 1, target.floor_mean) };
          const baseline = predictOpening(model, future, target.id, kind), result = predictOpening(model, { ...future, deck }, target.id, kind);
          const error = model.errors[kind] ?? model.errors.all!;
          targets.push({ id: target.id, kind, act: input.act, floor: Math.max(input.floor + 1, target.floor_mean), weight: target.weight, count: route.counts[kind], n: target.n, runs: target.runs,
            ...result, win_delta: result.win - baseline.win, saved_hp: baseline.hp_loss - result.hp_loss, error: choice.id === "skip" ? 0 : 2 * error.hp_rmse });
        }
      }
      if (route.source === "remaining_fights_unknown") unknown.push("remaining_fights_unknown");
      const known = targets.some(t => t.kind === "boss") && !unknown.length;
      const sum = (field: "saved_hp" | "error") => targets.reduce((total, t) => total + t[field] * t.weight * t.count, 0);
      const saved = known ? sum("saved_hp") : null, error = known ? sum("error") : null;
      let next: number | null = null, nextError: number | null = null;
      if (model && !unknown.length && route.counts.hallway + route.counts.elite <= 2 && input.act < 3) {
        const pool = distribution(model, input.act + 1, "boss");
        if (pool.length) { nextError = choice.id === "skip" ? 0 : 2 * (model.errors.boss ?? model.errors.all!).hp_rmse;
          next = pool.reduce((s, t) => s + t.weight * (predictOpening(model, { ...input, act: input.act + 1, floor: t.floor_mean }, t.id, "boss").hp_loss
          - predictOpening(model, { ...input, deck, act: input.act + 1, floor: t.floor_mean }, t.id, "boss").hp_loss), 0); }
      }
      const advances = this.cores.flatMap(core => core.combos.flatMap(combo => {
        check();
        const before = missingCards(input.deck, combo).length, after = missingCards(deck, combo).length;
        return before > after ? [{ direction: core.direction, combo: combo.id, missing: after, advanced: before - after }] : [];
      }));
      const tier = saved === null || error === null ? "unknown" : Math.abs(saved) <= error ? "indistinguishable"
        : saved > 2 * error ? "clearly_better" : saved > 0 ? "slightly_better" : saved < -2 * error ? "clearly_worse" : "slightly_worse";
      return { id: choice.id, card: choice.id === "skip" ? null : openingCardKey(choice.card), known, saved_hp: saved, error,
        rank: null, tier, next_boss_saved_hp: next, next_boss_error: nextError, advances, targets, unknown };
    });
    [...options].filter(o => o.known).sort((a, b) => b.saved_hp! - a.saved_hp! || Number(b.id === "skip") - Number(a.id === "skip") || a.id.localeCompare(b.id))
      .forEach((o, i) => { o.rank = i + 1; });
    const table: CardValueTable = { schema: "card-value-v2", model_id: model?.model_id ?? null, fingerprint, options, cores, route,
      labels: [...(model?.limitations ?? ["opening_model_unavailable"]), ...(this.cores.length ? [] : ["completed_cores_unavailable"]),
        "F48_F49_joint_prediction_unavailable_whole_fight_model_has_no_joint_target", "core_any_of_uses_first_published_alternative",
        "error_scale_is_twice_calibration_fight_RMSE_summed_without_independence_assumption",
        "tiers_compare_saved_HP_with_error_and_twice_error", "next_boss_added_as_separate_summary_only_with_at_most_two_remaining_nonboss_fights"],
      telemetry: { elapsed_ms: performance.now() - started, cache_hits: 0 } };
    this.cache.set(fingerprint, structuredClone(table)); if (this.cache.size > 16) this.cache.delete(this.cache.keys().next().value!);
    this.record(env, table); return table;
  }
}
