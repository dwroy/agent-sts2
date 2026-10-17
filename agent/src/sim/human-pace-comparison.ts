/** H2 reuses the existing B3 runner and start adapters, never another pool or game model. */
import { asArray, asRecord, str } from "../core/util/json.js";
import type { DecisionBudget } from "../core/decision-budget.js";
import type { BuildState } from "../construction/types.js";
import type { DecisionEnv } from "../memory/types.js";
import { parseGameState } from "../hand/mod/schema.js";
import { doubleBossFor } from "../knowledge/double-boss.js";
import { cardUpgrade } from "../knowledge/card-upgrades.js";
import { simAdaptivePolicy } from "../core/config.js";
import { syntheticBossStart } from "./boss-start.js";
import { withDoubleBossStart } from "./double-boss-start.js";
import { compareOptions, BUILD_SIM_SEED, BUILD_SIM_SAMPLES, type CompareResult } from "./build-sim.js";
import type { BuildSimSetup } from "./build-sim-facts.js";
import type { GlobalBossTarget } from "./global-build.js";
import type { DirectionMetric, DirectionVariant } from "./human-pace-direction.js";
import type { DeckSimRunner } from "./build-sim-pool.js";

const observers = new WeakMap<DeckSimRunner, DeckSimRunner>();
/** Separate compareOptions memo namespace, same underlying workers and queue. */
export function humanPaceShadowRunner(runner: DeckSimRunner): DeckSimRunner {
  let proxy = observers.get(runner);
  if (!proxy) { proxy = { run: (request) => runner.run(request) }; observers.set(runner, proxy); }
  return proxy;
}

export function directionMetric(result: CompareResult, key: string, modelLimits: readonly string[] = []): DirectionMetric {
  const row = key === "@current" ? result.base : result.options.find((r) => r.key === key);
  if (!row || row.samples < 2) return { status: "unknown", reason: "no_paired_model_samples", win: null, win_se: null, s: null, samples: row?.samples ?? 0, requested: result.requested };
  const margin = asRecord(asRecord(row.quantitative)["boss_relative_margin"]), score = asRecord(margin["score"]);
  const s = !modelLimits.length && margin["rankingEligible"] === true && typeof score["mean"] === "number" && typeof score["meanSe"] === "number"
    ? { mean: score["mean"], se: score["meanSe"] } : null;
  return { status: result.timedOut ? "partial" : "computed", reason: result.timedOut ? "budgeted_model_prefix" : null,
    win: row.win, win_se: Math.sqrt(row.win * (1 - row.win) / row.samples), s, samples: row.samples,
    requested: result.requested, model_limits: [...new Set(modelLimits)], ...(row.continuous ? { continuous: row.continuous } : {}) };
}

/** Only already modelled components can be added to a hypothetical raw inventory. */
export function validDirectionInventory(state: BuildState | null): state is BuildState {
  return !!state && [state.hp, state.maxHp].every(Number.isFinite) && state.hp > 0 && state.maxHp >= state.hp
    && (state.cap === null || state.cards.length <= state.cap);
}
export function directionStart(env: DecisionEnv, state: BuildState, target: GlobalBossTarget, setup: BuildSimSetup,
  modelLimits?: string[]) {
  if (!validDirectionInventory(state)) throw new Error("invalid_inventory_resource_contract");
  const raw = structuredClone(env.state.raw), run = asRecord(raw["run"]);
  const original = asArray(asRecord(env.state.run?.raw)["deck"]).map(asRecord), remaining = [...original];
  run["deck"] = state.cards.map((card, index) => {
    const at = remaining.findIndex((own) => str(own["card_id"]) === card.id && (own["upgraded"] === true) === card.upgraded);
    if (at >= 0) return { ...remaining.splice(at, 1)[0], index };
    if (!env.knowledge.card(card.id) || card.upgraded && !cardUpgrade(card.id)) throw new Error("unmodelled_core_component");
    return { card_id: card.id, upgraded: card.upgraded, index };
  });
  const relics = asArray(run["relics"]).map(asRecord);
  run["relics"] = state.relics.map((id) => relics.find((r) => r["relic_id"] === id)
    ?? { relic_id: id, stack: null, is_melted: false });
  run["current_hp"] = state.hp; run["max_hp"] = state.maxHp;
  run["act_id"] = String(target.act - 1); run["boss_id"] = `${target.boss}_BOSS`;
  const projected = parseGameState(raw);
  const start = syntheticBossStart(projected, env.knowledge, `${target.boss}_BOSS`, state.hp, setup);
  if (start.relics.unmodelled.length) {
    // A labelled Act2 benchmark may reuse the existing partial model for unchanged held relics.
    // This never asserts that omitted relic effects cancel, and never admits hypothetical unknown relics.
    const held = asArray(asRecord(env.state.run?.raw)["relics"]).map((r) => str(asRecord(r)["relic_id"])).sort();
    const unchanged = JSON.stringify(held) === JSON.stringify([...state.relics].sort());
    if (!modelLimits || target.act !== 2 || str(run["character_id"]).toLowerCase() !== "silent" || !unchanged)
      throw new Error("hypothetical_inventory_has_unmodelled_relics");
    modelLimits.push("partial_model_benchmark_shared_held_relics_not_modelled;effects_do_not_assume_cancellation",
      ...start.relics.unmodelled.map((name) => `unmodelled_held_relic:${name}`));
  }
  return target.act === 3 ? withDoubleBossStart(projected, env.knowledge, start.input, doubleBossFor(projected), setup) : start.input;
}

export async function compareDirection(env: DecisionEnv, current: BuildState, target: GlobalBossTarget,
  variant: DirectionVariant, budget: DecisionBudget, setup: BuildSimSetup): Promise<DirectionMetric> {
  const modelLimits: string[] = [];
  const base = directionStart(env, current, target, setup, modelLimits), changed = directionStart(env, variant.state, target, setup, modelLimits);
  const adaptive = simAdaptivePolicy("silent").mode;
  const result = await compareOptions(humanPaceShadowRunner(setup.runner), base, [{ key: variant.key, change: changed }], {
    samples: setup.samples ?? BUILD_SIM_SAMPLES, seed: setup.seed ?? BUILD_SIM_SEED,
    deadlineMs: Math.max(0, budget.remaining() - 1000), requireComplete: true, quantitative: true,
    ...(adaptive !== "off" ? { adaptive: { mode: adaptive, allowS: false } } : {}),
    ...(setup.now ? { now: setup.now } : {}),
  });
  return directionMetric(result, variant.key, modelLimits);
}

/** One sample-major comparison per target spreads its share of60s across all directions. */
export async function compareDirectionBatch(env: DecisionEnv, current: BuildState, target: GlobalBossTarget,
  variants: readonly DirectionVariant[], budget: DecisionBudget, cap: number, setup: BuildSimSetup): Promise<ReadonlyMap<string, DirectionMetric>> {
  const modelLimits: string[] = [];
  const started = budget.now(), base = directionStart(env, current, target, setup, modelLimits);
  const rows = new Map<string, DirectionMetric>(), options = [];
  for (const variant of variants) {
    if (budget.remaining() <= 1000 || budget.now() - started >= cap - 1000) {
      rows.set(variant.key, { status: "unknown", reason: "direction_budget_exhausted_preparing_inventory", win: null, win_se: null, s: null, samples: 0, requested: 0 }); continue;
    }
    try { options.push({ key: variant.key, change: directionStart(env, variant.state, target, setup, modelLimits) }); }
    catch { rows.set(variant.key, { status: "unknown", reason: "unmodelled_core_or_resource_contract", win: null, win_se: null, s: null, samples: 0, requested: 0 }); }
  }
  if (!options.length) return rows;
  const mode = simAdaptivePolicy("silent").mode;
  const result = await compareOptions(humanPaceShadowRunner(setup.runner), base, options, {
    samples: setup.samples ?? BUILD_SIM_SAMPLES, seed: setup.seed ?? BUILD_SIM_SEED,
    deadlineMs: Math.max(0, Math.min(budget.remaining(), cap - (budget.now() - started)) - 1000),
    requireComplete: true, quantitative: true, ...(mode !== "off" ? { adaptive: { mode, allowS: false } } : {}),
    ...(setup.now ? { now: setup.now } : {}),
  });
  for (const option of options) rows.set(option.key, directionMetric(result, option.key, modelLimits));
  return rows;
}
