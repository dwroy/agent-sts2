import type { FightSampleResult } from "../src/sim/boss-sim.js";
import type { DeckRunRequest, DeckRunResult, DeckSimRunner } from "../src/sim/build-sim-pool.js";

/** Synthetic receipts for question consumers; they make no claim about a logged fight's outcome. */
export class FixedDeckRunner implements DeckSimRunner {
  readonly requests: DeckRunRequest[] = [];

  async run(request: DeckRunRequest): Promise<DeckRunResult> {
    this.requests.push(request);
    const samples = Array.from({ length: request.samples }, (_, index) => index);
    const outcome = (sample: number): FightSampleResult => {
      const won = sample % 2 === 0;
      return {
        won, died: !won, capped: false, timeUp: false, turns: 1,
        hpLoss: won ? 1 : request.base.solver.player.hp,
        revived: 0, drunk: [], enemyHpLeft: won ? 0 : 1,
        lossByTurn: [], dmgByTurn: [], incomingByTurn: [], enemyLossByTurn: [],
        policyTurns: 0, policyNodes: 0,
      };
    };
    return {
      outcomes: request.decks.map((_, deck) => request.orders.map(() => samples.map((sample) => {
        const stripe = request.stripes?.[deck];
        return !stripe || sample % stripe.of === stripe.at ? outcome(sample) : undefined;
      }))),
      complete: samples, timedOut: false, elapsedMs: 0, workers: 0,
    };
  }
}
