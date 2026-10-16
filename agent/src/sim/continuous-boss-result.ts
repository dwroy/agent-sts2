import type { Revive } from "../reflex/turn-solver.js";
import type { FightSampleResult } from "./boss-sim.js";

/** Captured simulation state, not rewards or a verified next-combat opening. */
export interface ContinuousResources {
  hp: number;
  revives: Revive[];
  potionSlots: string[];
}

export interface ContinuousSample {
  firstWon: boolean;
  firstHp: number | null;
  firstPotions: string[];
  secondBoss: string | null;
  firstTurns: number;
  secondWon: boolean | null;
  secondDied: boolean | null;
  seed?: number;
  firstDied?: boolean;
  firstCapped?: boolean;
  firstTimeUp?: boolean;
  firstResources?: ContinuousResources | null;
  secondEntry?: ContinuousResources | null;
  openingHpLoss?: number | null;
}

export interface ContinuousRate {
  value: number | null;
  wins: number;
  samples: number;
  unknown: number;
  reason: string | null;
}

export interface ContinuousBossResult {
  schema: "continuous-boss-result-v1";
  scope: "raw_simulation";
  samples: number;
  expectedSamples: number;
  missingSamples: number;
  first: ContinuousRate;
  secondGivenFirstWin: ContinuousRate;
  joint: ContinuousRate;
  calibration: { status: "unknown"; singleFightMapApplied: false };
  S: { status: "unknown"; value: null };
  resourceModel: {
    transfer: "same_sample";
    rewardsBetweenFights: "unknown";
    actualSecondOpening: "unknown";
    unobservedOpeningEffects: "unknown";
  };
  /** At most three deterministic samples, for consumer readback without logging all outcomes. */
  traces: ContinuousSample[];
}

/** Raw two-stage rates never borrow a single-fight calibration or an independent second-fight rate. */
export function continuousBossResult(outcomes: FightSampleResult[], expectedSamples = outcomes.length, required = false): ContinuousBossResult | undefined {
  if (!required && !outcomes.some((outcome) => outcome.sequence)) return undefined;
  const missingSamples = Math.max(0, expectedSamples - outcomes.length);
  const firstWins = outcomes.filter((outcome) => outcome.sequence?.firstWon);
  const firstUnknown = outcomes.filter(({ sequence: s }) => !s || s.firstCapped !== false || s.firstTimeUp !== false
    || (!s.firstWon && s.firstDied !== true)).length + missingSamples;
  const secondUnknown = firstWins.filter(({ sequence: s, capped, timeUp }) => !s?.firstResources || !s.secondEntry
    || (s.secondWon !== true && s.secondDied !== true) || capped || timeUp
    || s.firstHp === null || !Number.isFinite(s.firstHp) || s.firstHp <= 0).length;
  const secondWins = firstWins.filter(({ sequence: s }) => s?.secondWon).length;
  const rate = (wins: number, samples: number, unknown: number, reason: string | null): ContinuousRate => ({
    value: reason ? null : wins / samples, wins, samples, unknown, reason,
  });
  const firstReason = !expectedSamples ? "no_samples" : firstUnknown ? "missing_or_unfinished_first_samples" : null;
  const secondReason = firstReason ?? (!firstWins.length ? "no_first_win_samples" : secondUnknown ? "missing_resources_or_unfinished_second_samples" : null);
  return {
    schema: "continuous-boss-result-v1", scope: "raw_simulation", samples: outcomes.length, expectedSamples, missingSamples,
    first: rate(firstWins.length, expectedSamples, firstUnknown, firstReason),
    secondGivenFirstWin: rate(secondWins, firstWins.length, secondUnknown, secondReason),
    joint: rate(secondWins, expectedSamples, firstUnknown + secondUnknown, secondReason),
    calibration: { status: "unknown", singleFightMapApplied: false }, S: { status: "unknown", value: null },
    resourceModel: { transfer: "same_sample", rewardsBetweenFights: "unknown", actualSecondOpening: "unknown", unobservedOpeningEffects: "unknown" },
    traces: outcomes.flatMap((outcome) => outcome.sequence ? [outcome.sequence] : []).slice(0, 3),
  };
}
