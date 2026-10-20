import { describe, expect, it } from "vitest";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import type { DeckRunRequest } from "../src/sim/build-sim-pool.js";
import { direction, outcome, request, source } from "./v6-projection-fixture.js";
import { board } from "./boss-sim-fixture.js";

function pairedRequest() {
  const r = request(); r.directions = [direction("D"), direction("B")]; r.weights = { D: .6, B: .4 };
  r.targets = ["chain1", "chain2"].map((id, i) => ({ ...r.targets[0]!, id, kind: "chain", probability: i ? .75 : .25,
    secondBoss: "SECOND", secondFloor: 49 }));
  const prepare = r.prepare;
  r.prepare = (t, s) => { const p = prepare(t, s)!;
    p.input.continuation = { variants: [{ boss: "SECOND", count: 1, input: board() }], potions: [], source: "fixture", limitation: "fixture" };
    return p; };
  const provider = source(), original = provider.resolve;
  provider.resolve = c => c.direction.id === "B" ? source({ skip: 1, take: 1 }).resolve(c) : original(c);
  r.completionSources = [provider]; return r;
}
class PairedRunner {
  async run(r: DeckRunRequest) {
    return { outcomes: r.decks.map((d, j) => [Array.from({ length: r.samples }, (_, i) => {
      const stripe = r.stripes?.[j]; if (stripe && i % stripe.of !== stripe.at) return undefined;
      const won = d.meta.enc === "completed" || i % 4 === 0;
      return { ...outcome(won), sequence: { firstWon: true, firstDied: false, firstCapped: false, firstTimeUp: false,
        firstHp: 20, firstPotions: [], secondBoss: "SECOND", firstTurns: 4, secondWon: won, secondDied: !won,
        firstResources: { hp: 20, revives: [], potionSlots: [] }, secondEntry: { hp: 20, revives: [], potionSlots: [] }, openingHpLoss: 0 } };
    })]), complete: Array.from({ length: r.samples }, (_, i) => i), timedOut: false, elapsedMs: 1, workers: 1 };
  }
}
describe("V6 pick direction comparisons", () => {
  it("compares each option to the highest brain probability direction and preserves covariance across targets", async () => {
    const r = pairedRequest(), t = await new V6ProjectionEngine(new PairedRunner()).evaluate(r);
    const take = t.pick_direction_comparisons.find(x => x.option_id === "take" && x.direction_id === "B")!;
    expect(take.reference_direction_id).toBe("D"); expect(take.known_mass).toBe(1);
    expect(take.joint_paired_delta?.mean).toBeCloseTo(.25); expect(take.joint_paired_delta?.n).toBe(20);
    expect(take.joint_paired_delta!.se).toBe(0); // Both completed decks win on every combat seed; P is a fixed lookup.
    // Identical target worlds are perfectly correlated, rather than independent measurements.
    expect(take.joint_paired_delta!.se).toBeCloseTo(take.targets[0]!.joint_paired_delta!.se, 12);
    const skip = t.pick_direction_comparisons.find(x => x.option_id === "skip" && x.direction_id === "B")!;
    expect(skip.joint_paired_delta?.mean).toBeCloseTo(.5);
    const self = t.pick_direction_comparisons.find(x => x.option_id === "take" && x.direction_id === "D")!;
    expect(self.joint_paired_delta).toEqual({ mean: 0, se: 0, n: 20 });
    expect(r.weights).toEqual({ D: .6, B: .4 });
  });
  it("retains unknown target mass and does not manufacture a paired error from mismatched sample IDs", async () => {
    const r = pairedRequest(); r.targets = r.targets.map(t => t.id === "chain2" ? { ...t, unknown: "missing opening" } : t);
    const partial = await new V6ProjectionEngine(new PairedRunner()).evaluate(r);
    const b = partial.pick_direction_comparisons.find(x => x.direction_id === "B")!;
    expect(b.known_mass).toBe(.25); expect(b.joint_paired_delta).toBeNull();
    expect(b.targets[0]!.joint_paired_delta).not.toBeNull(); expect(b.targets[1]!.joint_paired_delta).toBeNull();
    const mismatch = pairedRequest(), original = mismatch.completionSources[0]!.resolve;
    mismatch.completionSources[0]!.resolve = c => { const result = original(c)!;
      if (c.direction.id === "B") for (const combo of result.combinations) for (const rows of [combo.samples, combo.general])
        for (const row of rows) row.id += "-other-world";
      return result; };
    expect((await new V6ProjectionEngine(new PairedRunner()).evaluate(mismatch)).pick_direction_comparisons
      .find(x => x.direction_id === "B")!.joint_paired_delta).toBeNull();
  });
  it("uses deterministic ties, rejects incomplete brain probabilities, and emits no pick comparisons at act start or when off", async () => {
    const r = pairedRequest(); r.weights = { D: .5, B: .5 };
    const engine = new V6ProjectionEngine(new PairedRunner());
    expect((await engine.evaluate(r)).pick_direction_comparisons.every(x => x.reference_direction_id === "B")).toBe(true);
    r.weights = { D: .5 };
    expect((await engine.evaluate(r)).pick_direction_comparisons.every(x => x.reference_direction_id === null && x.joint_paired_delta === null)).toBe(true);
    r.phase = "act"; expect((await engine.evaluate(r)).pick_direction_comparisons).toEqual([]);
    r.phase = "pick"; r.config.mode = "off";
    expect((await engine.evaluate(r)).pick_direction_comparisons).toEqual([]);
  });
});
