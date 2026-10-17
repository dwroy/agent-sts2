import { currentDecisionBudget, shadowBudgetAvailable, budgetUnknown } from "../core/decision-budget.js";
/**
 * B3 (Roy 2026-09-30): each option of a deck-building question against the act boss, by whole fight simulation. The
 * current deck and every option's deck (and HP) run on the same seeds (common random numbers) from the synthetic
 * pre-fight start (boss-start.ts), each under every kill order with its best kept (as boss-sim runBestOrder), within a
 * deadline (build-sim-pool.ts). Per option: the calibrated win rate (the "pre" Platt map, boss-sim BOSS_SIM_PLATT), its
 * difference from the current deck with a standard error from the paired samples, the median HP lost in the won
 * samples and the median turns. Facts, not a verdict: no option is scored, ranked or dropped.
 */

import { ADAPTIVE_RULE, safeAdaptiveShadow } from "./adaptive-shadow.js";
import { asRecord, toJsonValue } from "../core/util/json.js";
import type { RolloutInput } from "../reflex/rollout.js";
import { BOSS_POLICY_THREAT, BOSS_SIM_LOOKAHEAD, calibratedWinProb, compareLines, fightOrders, summarizeLine, type BossSimLineResult, type FightSampleResult } from "./boss-sim.js";
import type { DeckSimRunner, DeckRunResult } from "./build-sim-pool.js";
import type { JsonValue } from "../core/util/json.js";
import { quantitativeFightFacts } from "./quantitative-facts.js";
import { memoKey } from "./compute-memo.js";
import { bossReadiness, type BossReadiness } from "./boss-readiness.js";
import { buildRank } from "./build-rank.js";
import { runAdaptiveDecks } from "./adaptive-decks.js";
import { isAdaptiveComplete } from "./adaptive-sampler.js";
import { continuousBossResult, type ContinuousBossResult } from "./continuous-boss-result.js";
import { f48JointShadow, type F48JointScope } from "./f48-joint-shadow.js";

/** Samples per deck (docs/boss-sim.md §8: 1000 per option gives a paired standard error of about 1-1.5 points). */
export const BUILD_SIM_SAMPLES = 1000;
/** Seed of the question's samples (the same for every option: common random numbers). */
export const BUILD_SIM_SEED = 7;
/** The simulation's share of a question's time budget (Roy: 10-15 s more per deck-building question). */
export const BUILD_SIM_DEADLINE_MS = 11_000;
/**
 * A boss with a kill order to choose (the Kin, the Queen, the Crab): the current deck runs this many samples under the
 * solver's own targets and every kill order first, and every deck then runs under the order that won most (running
 * every deck under every order took 3x the time: 16 samples a deck in 11 s on a 25-option shop against the Crab).
 */
export const BUILD_SIM_ORDER_SAMPLES = 100;
/**
 * The sample count the "pre" Platt map was fitted at (B1.5: 200 samples a fight): a rate of 0 or 1 is clipped half a
 * sample in at this count whatever the question ran, so the calibrated floor does not move with a deadline's cut (0 of 72
 * read 13%, 0 of 1000 4%; the map's own fit put 0 of 200 at ~8%).
 */
export const BUILD_SIM_CALIBRATION_SAMPLES = 200;

/** One option's deck (and HP) as the base input's fields it changes; null: the current deck as it is. */
export interface DeckOption {
  key: string;
  change: Partial<RolloutInput> | null;
  /** Several decks each taking a share of the samples (sample i: deck i % n): a random outcome's expectation (transform). */
  mixture?: Partial<RolloutInput>[];
}

export interface OptionSim {
  continuous?: ContinuousBossResult;
  sampling?: { samples: number; stop: string; rounds: number };
  pairedReference?: { samples: number; rawWin: number; calibratedWin: number; bossLeft: number };
  quantitative?: JsonValue;
  key: string;
  samples: number;
  /** Raw and calibrated win rate. */
  win: number;
  winCal: number;
  /**
   * Against the current deck on the same samples: the raw paired difference and standard error, and the difference of
   * the calibrated rates with the standard error scaled by the map's slope between them. null for the current deck.
   */
  diff: { raw: number; se: number; cal: number; calSe: number; hpLoss: number; hpLossSe: number; bossLeft: number; bossLeftSe: number } | null;
  /** The boss's mean HP left at the fight's end (0 in a won sample). */
  bossLeft: number;
  /** Mean HP lost over every sample (a death: all of it; THIEF_COST reads it where the boss is mostly won). */
  hpLossMean: number;
  hpLossWon: number | null;
  /** Median turns of the won samples (of all samples when none was won). */
  turns: number | null;
  deathTurn: number | null;
  order: string | null;
  /** Entry HP of this option's start. */
  hp: number;
}

export interface CompareResult {
  f48JointShadow?: Record<string, unknown>;
  buildRanking?: JsonValue;
  adaptive?: JsonValue;
  readiness?: BossReadiness;
  readinessMs?: number;
  completion?: { required: true; uniqueDecks: number; originalDecks: number; memoHit: boolean; originalComputeMs?: number };
  diagnostics?: { decks: number; options: number; deckCards: number; deadlineMs: number | null; orderSearch: Record<string, JsonValue> | null; comparison: Record<string, JsonValue> };
  base: OptionSim;
  options: OptionSim[];
  samples: number;
  requested: number;
  timedOut: boolean;
  elapsedMs: number;
  workers: number;
  /** Kill orders tried on the current deck (1: none to choose), and the one every deck ran under. */
  orders: number;
  order: string | null;
}

// Only fully computed deterministic comparisons are reused, within this runner/process.
// The key includes all inputs, policies, sample identities and loaded data version.
const completeComparisons = new WeakMap<DeckSimRunner, { key: string; result: CompareResult }>();

/** A deck's outcomes on the complete samples under one order (a mixture: sample i from its member i % n). */
function lineOf(outcomes: (FightSampleResult | undefined)[][][], decks: number[], order: number, complete: number[]): FightSampleResult[] {
  return complete.map((i) => outcomes[decks[i % decks.length]!]![order]![i]!);
}

/** Of the kill orders, the one with the most wins (then the least HP lost), as boss-sim runBestOrder keeps it. */
function bestOrder(lines: BossSimLineResult[]): number {
  let pick = 0;
  for (let k = 1; k < lines.length; k += 1) {
    const a = lines[k]!;
    const b = lines[pick]!;
    if (a.winProb > b.winProb || (a.winProb === b.winProb && a.hpLoss.mean < b.hpLoss.mean)) pick = k;
  }
  return pick;
}

const r4 = (x: number) => Math.round(x * 10000) / 10000;

const mean = (xs: number[]) => xs.reduce((sum, x) => sum + x, 0) / Math.max(1, xs.length);

/** The boss's HP left at the end (0 when won), paired over the same samples: what an option changes when both lose. */
function bossLeftDiff(a: BossSimLineResult, b: BossSimLineResult): { bossLeft: number; bossLeftSe: number } {
  const n = Math.min(a.outcomes.length, b.outcomes.length);
  const d = Array.from({ length: n }, (_, i) => a.outcomes[i]!.enemyHpLeft - b.outcomes[i]!.enemyHpLeft);
  const m = mean(d);
  const variance = n > 1 ? d.reduce((sum, x) => sum + (x - m) ** 2, 0) / (n - 1) : 0;
  return { bossLeft: r4(m), bossLeftSe: r4(Math.sqrt(variance / Math.max(1, n))) };
}

/** The calibrated difference and its standard error: the raw paired SE times the Platt map's slope between the two rates. */
export function calibratedDiff(pOption: number, pBase: number, rawSe: number, samples: number, asc = 0): { cal: number; calSe: number } {
  const cal = calibratedWinProb(pOption, samples, "pre", asc) - calibratedWinProb(pBase, samples, "pre", asc);
  const dp = pOption - pBase;
  const h = 0.5 / (samples + 1);
  const slope = Math.abs(dp) > 1e-9 ? cal / dp : (calibratedWinProb(Math.min(1, pBase + h), samples, "pre", asc) - calibratedWinProb(Math.max(0, pBase - h), samples, "pre", asc)) / Math.max(1e-9, Math.min(1, pBase + h) - Math.max(0, pBase - h));
  return { cal: r4(cal), calSe: r4(Math.abs(slope) * rawSe) };
}

/**
 * Every option against the current deck (`base`): one run of the current deck, each option's deck (or mixture) and
 * every kill order on the same seeds, until done or the deadline; the numbers come from the samples every deck
 * finished. Options with no change share the current deck's numbers. `hpOf` gives an option's entry HP (for the text).
 */
export function completeAdaptiveBuild(result: CompareResult): boolean {
  return !result.timedOut && result.samples === result.base.samples
    && isAdaptiveComplete(result.adaptive, "b3", result.requested,
      new Map([["@current", result.base.samples], ...result.options.map((option): [string, number] => [option.key, option.samples])]));
}

export async function compareOptions(
  runner: DeckSimRunner,
  base: RolloutInput,
  options: DeckOption[],
  opts: { samples?: number; seed?: number; deadlineMs?: number; now?: () => number; quantitative?: boolean; diagnostics?: boolean; requireComplete?: boolean; adaptive?: { allowS: boolean; mode?: "shadow" | "on" }; onProgress?: import("./computation-wait.js").SimProgress; readiness?: boolean;
    f48JointScope?: F48JointScope;
    buildRank?: { lowTrust: string | null; calibratedFloor: number; tieSe: number; sSort?: "on" | "shadow" } } = {},
): Promise<CompareResult> {
  if (opts.quantitative) base = { ...base, captureBossMargin: true,
    ...(base.meta.asc === 10 ? { captureCore: true, captureResources: true } : {}) };
  const samples = opts.samples ?? BUILD_SIM_SAMPLES;
  const required = opts.requireComplete === true;
  const pace = currentDecisionBudget();
  if (pace) opts = { ...opts, deadlineMs: Math.max(0, Math.min(opts.deadlineMs ?? Infinity, pace.remaining() - 1000)) };
  const cacheKey = required ? memoKey(pace ? "human-pace-b3-v1" : "required-b3-v1", { base, options, samples, seed: opts.seed ?? BUILD_SIM_SEED,
    quantitative: opts.quantitative, diagnostics: opts.diagnostics, readiness: opts.readiness, buildRank: opts.buildRank,
    ...(opts.adaptive ? { adaptive: { ...ADAPTIVE_RULE, ...opts.adaptive } } : {}), policy: { BOSS_POLICY_THREAT, BOSS_SIM_LOOKAHEAD } }) : null;
  const cached = cacheKey ? completeComparisons.get(runner) : undefined;
  if (cached?.key === cacheKey) {
    const result = structuredClone(cached.result);
    // Logging never invalidates the compute memo or asks the runner for missing diagnostics.
    if (!opts.f48JointScope) delete result.f48JointShadow;
    else if (!result.f48JointShadow) result.f48JointShadow = f48JointShadow(opts.f48JointScope, [], base,
      { reason: "memo_predates_joint_shadow; no_extra_computation" });
    result.completion = { ...result.completion!, memoHit: true, originalComputeMs: result.elapsedMs };
    result.elapsedMs = 0;
    return result;
  }
  const decks: Partial<RolloutInput>[] = [{}];
  const stripes: ({ at: number; of: number } | null)[] = [null];
  const deckOf = new Map<string, number[]>();
  const sameDeck = new Map<string, number>();
  const baseKey = required ? memoKey("required-deck", base) : null;
  if (baseKey) sameDeck.set(baseKey, 0);
  let originalDecks = 1;
  for (const option of options) {
    if (option.mixture && option.mixture.length > 0) {
      const ids: number[] = [];
      option.mixture.forEach((change, m) => {
        originalDecks += 1;
        ids.push(decks.length);
        decks.push(change);
        stripes.push({ at: m, of: option.mixture!.length });
      });
      deckOf.set(option.key, ids);
    } else if (option.change) {
      originalDecks += 1;
      const key = required ? memoKey("required-deck", { ...base, ...option.change }) : null;
      const existing = key ? sameDeck.get(key) : undefined;
      if (existing !== undefined) {
        deckOf.set(option.key, [existing]);
        continue;
      }
      deckOf.set(option.key, [decks.length]);
      if (key) sameDeck.set(key, decks.length);
      decks.push(option.change);
      stripes.push(null);
    } else deckOf.set(option.key, [0]);
  }
  const now = opts.now ?? (() => performance.now());
  const started = now();
  const seed = opts.seed ?? BUILD_SIM_SEED;
  const allOrders = [null, ...fightOrders(base)];
  // The kill order: the one the current deck wins most with (boss-sim runBestOrder's rule), on a first short run.
  const phase = (run: DeckRunResult, deadline: number | undefined): Record<string, JsonValue> => ({
    samples: run.complete.length, elapsedMs: run.elapsedMs, timedOut: run.timedOut, workers: run.workers,
    deadlineMs: deadline ?? null, ...(run.diagnostics ? { pool: { ...run.diagnostics } } : {}),
  });
  let orderSearch: Record<string, JsonValue> | null = null;
  let order = allOrders[0]!;
  if (allOrders.length > 1) {
    const first = await runner.run({ ...(opts.onProgress ? { onProgress: opts.onProgress } : {}), base, decks: [{}], orders: allOrders, samples: Math.min(samples, BUILD_SIM_ORDER_SAMPLES), seed, ...(required && !pace ? { progressTimeoutMs: 120_000 } : {}), ...(opts.diagnostics ? { diagnostics: true } : {}), ...((!required || pace) && opts.deadlineMs !== undefined ? { deadlineMs: Math.max(0, Math.min(opts.deadlineMs / 4, pace?.remaining() ?? Infinity)) } : {}), ...(opts.now ? { now: opts.now } : {}) });
    if (required && !pace && (first.timedOut || first.complete.length !== Math.min(samples, BUILD_SIM_ORDER_SAMPLES) || first.complete.some((id, i) => id !== i))) throw new Error("required boss order search incomplete");
    if (opts.diagnostics) orderSearch = { ...phase(first, required && !pace || opts.deadlineMs === undefined ? undefined : opts.deadlineMs / 4),
      ...(pace ? { status: first.complete.length ? "measured" : "unknown", basis: first.complete.length ? "completed_paired_samples" : "existing_default_order_no_samples" } : {}) };
    const lines = allOrders.map((_, o) => summarizeLine(0, lineOf(first.outcomes, [0], o, first.complete)));
    if (first.complete.length > 0 || !pace) order = allOrders[bestOrder(lines)]!;
  }
  const orders = [order];
  const left = (!required || pace) && opts.deadlineMs !== undefined ? Math.max(0, Math.min(opts.deadlineMs - (now() - started), pace ? pace.remaining() - 1000 : Infinity)) : undefined;
  const request = { ...(opts.onProgress ? { onProgress: opts.onProgress } : {}), base, decks, stripes, orders, samples, seed, ...(required && !pace ? { progressTimeoutMs: 120_000 } : {}), ...(opts.diagnostics ? { diagnostics: true } : {}), ...(left !== undefined ? { deadlineMs: left } : {}), ...(opts.now ? { now: opts.now } : {}) };
  if (opts.adaptive?.mode === "on" && !required && !pace) throw new Error("adaptive B3 requires complete computation");
  const actual = opts.adaptive?.mode === "on" && options.length ? await runAdaptiveDecks(runner, request, deckOf, opts.adaptive.allowS) : null;
  const run = actual?.run ?? await runner.run(request);
  const complete = run.complete;
  if (required && !pace && (run.timedOut || (!actual && complete.length !== samples) || complete.some((id, i) => id !== i))) {
    throw new Error(`required boss comparison incomplete: ${complete.length}/${samples}`);
  }
  const summarize = (ids: number[], count = complete.length): BossSimLineResult & { order: string | null } => ({ ...summarizeLine(0, lineOf(run.outcomes, ids, 0, complete.slice(0, count))), order: order?.label ?? null });
  const hpOf = (change: Partial<RolloutInput> | null | undefined) => change?.solver?.player.hp ?? base.solver.player.hp;
  const baseLine = summarize([0]);
  const n = complete.length;
  const measured = new Map<BossSimLineResult, OptionSim>();
  const simOf = (key: string, line: BossSimLineResult & { order: string | null }, hp: number, isBase: boolean): OptionSim => {
    const ready = required ? measured.get(line) : undefined;
    if (ready) return { ...ready, key, hp };
    const reference = line.samples === baseLine.samples ? baseLine : summarize([0], line.samples);
    const d = isBase ? null : compareLines(line, reference);
    const value: OptionSim = {
      key,
      ...(base.continuation ? { continuous: continuousBossResult(line.outcomes, actual ? line.samples : samples, true) } : {}),
      ...(opts.quantitative ? { quantitative: quantitativeFightFacts(line.outcomes, reference.outcomes, complete.slice(0, line.samples)) } : {}),
      samples: line.samples,
      ...(actual ? { sampling: actual.counts.get(key === "current" ? "@current" : key),
        pairedReference: { samples: reference.samples, rawWin: reference.winProb, bossLeft: mean(reference.outcomes.map((o) => o.enemyHpLeft)),
          calibratedWin: base.continuation ? reference.winProb : calibratedWinProb(reference.winProb, BUILD_SIM_CALIBRATION_SAMPLES, "pre", base.meta.asc) } } : {}),
      win: r4(line.winProb),
      winCal: r4(base.continuation ? line.winProb : calibratedWinProb(line.winProb, BUILD_SIM_CALIBRATION_SAMPLES, "pre", base.meta.asc)),
      diff: d ? { raw: d.winDiff, se: d.winSe, ...(base.continuation ? { cal: d.winDiff, calSe: d.winSe } : calibratedDiff(line.winProb, reference.winProb, d.winSe, BUILD_SIM_CALIBRATION_SAMPLES, base.meta.asc)), hpLoss: d.hpLossDiff, hpLossSe: d.hpLossSe, ...bossLeftDiff(line, reference) } : null,
      bossLeft: r4(mean(line.outcomes.map((o) => o.enemyHpLeft))),
      hpLossMean: r4(line.hpLoss.mean),
      hpLossWon: line.hpLossWon ? line.hpLossWon.median : null,
      turns: line.turnsWon ? line.turnsWon.median : n > 0 ? line.turns.median : null,
      deathTurn: line.deathTurn ? line.deathTurn.median : null,
      order: line.order,
      hp,
    };
    if (required) measured.set(line, value);
    return value;
  };
  const summaries = new Map<string, BossSimLineResult & { order: string | null }>();
  const optionLines = new Map<string, BossSimLineResult>();
  const out = options.map((option) => {
    const ids = deckOf.get(option.key)!;
    const count = actual?.counts.get(option.key)?.samples ?? n;
    if (ids.length === 1 && ids[0] === 0 && count === n) {
      optionLines.set(option.key, baseLine);
      const value = simOf(option.key, baseLine, base.solver.player.hp, true);
      return actual ? { ...value, sampling: actual.counts.get(option.key) } : value;
    }
    const key = `${ids.join(",")}:${count}`;
    const line = summaries.get(key) ?? summarize(ids, count);
    summaries.set(key, line);
    optionLines.set(option.key, line);
    const value = simOf(option.key, line, option.mixture ? hpOf(option.mixture[0]) : hpOf(option.change), false);
    return actual ? { ...value, sampling: actual.counts.get(option.key) } : value;
  });
  const readinessStart = performance.now();
  const readiness = opts.readiness && opts.quantitative && shadowBudgetAvailable("P1_readiness_shadow") ? bossReadiness(baseLine.outcomes, {
    calibratedWin: base.continuation ? baseLine.winProb : calibratedWinProb(baseLine.winProb, BUILD_SIM_CALIBRATION_SAMPLES, "pre", base.meta.asc),
    ...(base.continuation ? {} : { calibrate: (raw: number) => calibratedWinProb(raw, BUILD_SIM_CALIBRATION_SAMPLES, "pre", base.meta.asc) }),
  }) : undefined;
  const readinessMs = readiness ? performance.now() - readinessStart : undefined;
  const adaptive = !actual && required && opts.adaptive && options.length && n === samples && shadowBudgetAvailable("C2_sampling_shadow") ? safeAdaptiveShadow([
    { key: "@current", samples: baseLine.outcomes, baseline: true, workGroup: "0" },
    ...options.map((option) => ({ key: option.key, samples: summarize(deckOf.get(option.key)!).outcomes, workGroup: deckOf.get(option.key)!.join(",") })),
  ], { lane: "b3", requested: samples, allowS: opts.adaptive.allowS }) : null;
  if (adaptive && "work" in adaptive) {
    const orderWork = allOrders.length > 1 ? Math.min(samples, BUILD_SIM_ORDER_SAMPLES) * allOrders.length : 0;
    adaptive.work.full += orderWork;
    adaptive.work.shadow += orderWork;
    adaptive.work.savedFraction = 1 - adaptive.work.shadow / adaptive.work.full;
  }
  let buildRanking: JsonValue | undefined;
  if (opts.buildRank && !shadowBudgetAvailable("P2_S_build_counterfactual")) buildRanking = budgetUnknown("P2_S_build_counterfactual");
  if (opts.buildRank && shadowBudgetAvailable("P2_S_build_counterfactual")) {
    try {
      buildRanking = toJsonValue(buildRank(simOf("current", baseLine, base.solver.player.hp, true), out,
        { base: baseLine.outcomes, options: new Map(options.map((option) => [option.key, optionLines.get(option.key)!.outcomes])) },
        { ...opts.buildRank, allowPrefixes: !!actual, calibrationSamples: BUILD_SIM_CALIBRATION_SAMPLES,
          calibrate: (p) => base.continuation ? p : calibratedWinProb(p, BUILD_SIM_CALIBRATION_SAMPLES, "pre", base.meta.asc) }));
    } catch (error) {
      // A diagnostic failure cannot turn an otherwise completed computation into an infinite retry.
      buildRanking = { schema: "build-ranking-v1", status: "unavailable", reason: String(error).slice(0, 180) };
    }
  }
  let productionComparison: JsonValue | undefined;
  if (adaptive && "candidates" in adaptive && shadowBudgetAvailable("C2_ranking_counterfactual") && opts.buildRank && asRecord(buildRanking)["status"] === "produced") {
    try {
      const counts = new Map(adaptive.candidates.map((candidate) => [candidate.key, candidate.samples]));
      const prefixBase = summarize([0], counts.get("@current")!);
      const prefixOptions = options.map((option) => {
        const line = summarize(deckOf.get(option.key)!, counts.get(option.key)!);
        return { option, line, reference: summarize([0], line.samples) };
      });
      const shortened = buildRank({ ...simOf("current", baseLine, base.solver.player.hp, true), samples: prefixBase.samples },
        prefixOptions.map(({ option, line, reference }) => {
          const original = out.find((item) => item.key === option.key)!;
          const d = compareLines(line, reference);
          return { ...original, samples: line.samples, win: line.winProb, diff: { ...original.diff!, hpLoss: d.hpLossDiff } };
        }), { base: prefixBase.outcomes, options: new Map(prefixOptions.map(({ option, line }) => [option.key, line.outcomes])) },
        { ...opts.buildRank, allowPrefixes: true, calibrationSamples: BUILD_SIM_CALIBRATION_SAMPLES,
          calibrate: (p) => base.continuation ? p : calibratedWinProb(p, BUILD_SIM_CALIBRATION_SAMPLES, "pre", base.meta.asc) });
      const full = asRecord(buildRanking)["best_group"] as string[];
      productionComparison = { metric: "deployed-ranking-first-group", full: [...full].sort(), partial: [...shortened.best_group].sort(),
        agreement: JSON.stringify([...full].sort()) === JSON.stringify([...shortened.best_group].sort()) };
    } catch (error) { productionComparison = { metric: "deployed-ranking-first-group", agreement: null, error: String(error).slice(0, 180) }; }
  }
  const result: CompareResult = {
    ...(opts.f48JointScope ? { f48JointShadow: f48JointShadow(opts.f48JointScope, [
      { key: "@current", outcomes: baseLine.outcomes, requested: samples, order: order?.label ?? null, input: base },
      ...options.map((option) => ({ key: option.key, outcomes: optionLines.get(option.key)!.outcomes,
        requested: samples, order: order?.label ?? null, input: option })),
    ], base) } : {}),
    ...(actual ? { adaptive: toJsonValue({ ...actual.adaptive, input_key: cacheKey, fixed_order_search_in_work: true,
      work: { ...actual.adaptive.work,
        full: actual.adaptive.work.full + (allOrders.length > 1 ? Math.min(samples, BUILD_SIM_ORDER_SAMPLES) * allOrders.length : 0),
        actual: actual.adaptive.work.actual + (allOrders.length > 1 ? Math.min(samples, BUILD_SIM_ORDER_SAMPLES) * allOrders.length : 0),
        savedFraction: (actual.adaptive.work.full - actual.adaptive.work.actual) /
          (actual.adaptive.work.full + (allOrders.length > 1 ? Math.min(samples, BUILD_SIM_ORDER_SAMPLES) * allOrders.length : 0)) } }) } : {}),
    ...(buildRanking ? { buildRanking } : {}),
    ...(adaptive ? { adaptive: toJsonValue({ ...adaptive, ...(productionComparison ? { production_comparison: productionComparison } : {}),
      input_key: cacheKey, fixed_order_search_in_work: true }) } : {}),
    ...(readiness ? { readiness, readinessMs } : {}),
    ...(required ? { completion: { required: true as const, uniqueDecks: decks.length, originalDecks, memoHit: false } } : {}),
    ...(opts.diagnostics ? { diagnostics: { decks: decks.length, options: options.length, deckCards: base.piles.draw.length,
      deadlineMs: opts.deadlineMs ?? null, orderSearch, comparison: phase(run, left) } } : {}),
    base: simOf("current", baseLine, base.solver.player.hp, true),
    options: out,
    samples: n,
    requested: samples,
    timedOut: run.timedOut,
    elapsedMs: Math.round(now() - started),
    workers: run.workers,
    orders: allOrders.length,
    order: order?.label ?? null,
  };
  if (required && cacheKey && (!pace || n > 0)) completeComparisons.set(runner, { key: cacheKey, result: structuredClone(result) });
  return result;
}
