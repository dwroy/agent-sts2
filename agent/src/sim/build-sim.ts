/**
 * B3 (Dai 2026-09-30): each option of a deck-building question against the act boss, by whole fight simulation. The
 * current deck and every option's deck (and HP) run on the same seeds (common random numbers) from the synthetic
 * pre-fight start (boss-start.ts), each under every kill order with its best kept (as boss-sim runBestOrder), within a
 * deadline (build-sim-pool.ts). Per option: the calibrated win rate (the "pre" Platt map, boss-sim BOSS_SIM_PLATT), its
 * difference from the current deck with a standard error from the paired samples, the median HP lost in the won
 * samples and the median turns. Facts, not a verdict: no option is scored, ranked or dropped.
 */

import type { RolloutInput } from "../reflex/rollout.js";
import { calibratedWinProb, compareLines, fightOrders, summarizeLine, type BossSimLineResult, type FightSampleResult } from "./boss-sim.js";
import type { DeckSimRunner } from "./build-sim-pool.js";

/** Samples per deck (docs/boss-sim.md §8: 1000 per option gives a paired standard error of about 1-1.5 points). */
export const BUILD_SIM_SAMPLES = 1000;
/** Seed of the question's samples (the same for every option: common random numbers). */
export const BUILD_SIM_SEED = 7;
/** The simulation's share of a question's time budget (Dai: 10-15 s more per deck-building question). */
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
export function calibratedDiff(pOption: number, pBase: number, rawSe: number, samples: number): { cal: number; calSe: number } {
  const cal = calibratedWinProb(pOption, samples, "pre") - calibratedWinProb(pBase, samples, "pre");
  const dp = pOption - pBase;
  const h = 0.5 / (samples + 1);
  const slope = Math.abs(dp) > 1e-9 ? cal / dp : (calibratedWinProb(Math.min(1, pBase + h), samples, "pre") - calibratedWinProb(Math.max(0, pBase - h), samples, "pre")) / Math.max(1e-9, Math.min(1, pBase + h) - Math.max(0, pBase - h));
  return { cal: r4(cal), calSe: r4(Math.abs(slope) * rawSe) };
}

/**
 * Every option against the current deck (`base`): one run of the current deck, each option's deck (or mixture) and
 * every kill order on the same seeds, until done or the deadline; the numbers come from the samples every deck
 * finished. Options with no change share the current deck's numbers. `hpOf` gives an option's entry HP (for the text).
 */
export async function compareOptions(
  runner: DeckSimRunner,
  base: RolloutInput,
  options: DeckOption[],
  opts: { samples?: number; seed?: number; deadlineMs?: number; now?: () => number } = {},
): Promise<CompareResult> {
  const samples = opts.samples ?? BUILD_SIM_SAMPLES;
  const decks: Partial<RolloutInput>[] = [{}];
  const stripes: ({ at: number; of: number } | null)[] = [null];
  const deckOf = new Map<string, number[]>();
  for (const option of options) {
    if (option.mixture && option.mixture.length > 0) {
      const ids: number[] = [];
      option.mixture.forEach((change, m) => {
        ids.push(decks.length);
        decks.push(change);
        stripes.push({ at: m, of: option.mixture!.length });
      });
      deckOf.set(option.key, ids);
    } else if (option.change) {
      deckOf.set(option.key, [decks.length]);
      decks.push(option.change);
      stripes.push(null);
    } else deckOf.set(option.key, [0]);
  }
  const now = opts.now ?? (() => performance.now());
  const started = now();
  const seed = opts.seed ?? BUILD_SIM_SEED;
  const allOrders = [null, ...fightOrders(base)];
  // The kill order: the one the current deck wins most with (boss-sim runBestOrder's rule), on a first short run.
  let order = allOrders[0]!;
  if (allOrders.length > 1) {
    const first = await runner.run({ base, decks: [{}], orders: allOrders, samples: Math.min(samples, BUILD_SIM_ORDER_SAMPLES), seed, ...(opts.deadlineMs !== undefined ? { deadlineMs: opts.deadlineMs / 4 } : {}), ...(opts.now ? { now: opts.now } : {}) });
    const lines = allOrders.map((_, o) => summarizeLine(0, lineOf(first.outcomes, [0], o, first.complete)));
    order = allOrders[bestOrder(lines)]!;
  }
  const orders = [order];
  const left = opts.deadlineMs !== undefined ? Math.max(0, opts.deadlineMs - (now() - started)) : undefined;
  const run = await runner.run({ base, decks, stripes, orders, samples, seed, ...(left !== undefined ? { deadlineMs: left } : {}), ...(opts.now ? { now: opts.now } : {}) });
  const complete = run.complete;
  const summarize = (ids: number[]): BossSimLineResult & { order: string | null } => ({ ...summarizeLine(0, lineOf(run.outcomes, ids, 0, complete)), order: order?.label ?? null });
  const hpOf = (change: Partial<RolloutInput> | null | undefined) => change?.solver?.player.hp ?? base.solver.player.hp;
  const baseLine = summarize([0]);
  const n = complete.length;
  const simOf = (key: string, line: BossSimLineResult & { order: string | null }, hp: number, isBase: boolean): OptionSim => {
    const d = isBase ? null : compareLines(line, baseLine);
    return {
      key,
      samples: n,
      win: r4(line.winProb),
      winCal: r4(calibratedWinProb(line.winProb, BUILD_SIM_CALIBRATION_SAMPLES, "pre")),
      diff: d ? { raw: d.winDiff, se: d.winSe, ...calibratedDiff(line.winProb, baseLine.winProb, d.winSe, BUILD_SIM_CALIBRATION_SAMPLES), hpLoss: d.hpLossDiff, hpLossSe: d.hpLossSe, ...bossLeftDiff(line, baseLine) } : null,
      bossLeft: r4(mean(line.outcomes.map((o) => o.enemyHpLeft))),
      hpLossMean: r4(line.hpLoss.mean),
      hpLossWon: line.hpLossWon ? line.hpLossWon.median : null,
      turns: line.turnsWon ? line.turnsWon.median : n > 0 ? line.turns.median : null,
      deathTurn: line.deathTurn ? line.deathTurn.median : null,
      order: line.order,
      hp,
    };
  };
  const summaries = new Map<string, BossSimLineResult & { order: string | null }>();
  const out = options.map((option) => {
    const ids = deckOf.get(option.key)!;
    if (ids.length === 1 && ids[0] === 0) return simOf(option.key, baseLine, base.solver.player.hp, true);
    const key = ids.join(",");
    const line = summaries.get(key) ?? summarize(ids);
    summaries.set(key, line);
    return simOf(option.key, line, option.mixture ? hpOf(option.mixture[0]) : hpOf(option.change), false);
  });
  return {
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
}
