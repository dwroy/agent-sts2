/** Synthetic returned samples only; no game claims or stochastic simulation. */
import { board } from "./boss-sim-fixture.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import type { F48JointCandidate } from "../src/sim/f48-joint-shadow.js";
export const scope = { character: "silent", floor: 48, ascension: 10 };
export function jointInput() {
  const input = board({ bossHp: 12 });
  input.continuation = { variants: [{ boss: "FIXED_SECOND", count: 1, input: board() }],
    potions: [{ key: "POTION:BLOCK_POTION:0", id: "BLOCK_POTION" }, { key: "POTION:BLOCK_POTION:1", id: "BLOCK_POTION" }],
    source: "synthetic fixture", limitation: "unknown production calibration" };
  return input;
}
export function sample(seed: number, hp: number, won: boolean): FightSampleResult {
  const slots = ["POTION:BLOCK_POTION:1"];
  return { won, died: !won, capped: false, timeUp: false, turns: 2, hpLoss: 1,
    revived: 0, drunk: [], enemyHpLeft: won ? 0 : 8, lossByTurn: [1], dmgByTurn: [12],
    incomingByTurn: [1], enemyLossByTurn: [12], policyTurns: 1, policyNodes: 1,
    resources: { hp: won ? 5 : 0, revives: [], drunkKeys: [] },
    sequence: { seed, firstWon: true, firstDied: false, firstCapped: false, firstTimeUp: false,
      firstHp: hp, firstPotions: slots.slice(), firstTurns: 1, secondBoss: "FIXED_SECOND", secondWon: won, secondDied: !won,
      firstResources: { hp, revives: [], potionSlots: slots.slice() }, secondEntry: { hp: hp - 2, revives: [], potionSlots: slots.slice() }, openingHpLoss: 2 } };
}
export const candidate = (key: string, outcomes: FightSampleResult[], requested = outcomes.length): F48JointCandidate =>
  ({ key, outcomes, requested, order: null });
