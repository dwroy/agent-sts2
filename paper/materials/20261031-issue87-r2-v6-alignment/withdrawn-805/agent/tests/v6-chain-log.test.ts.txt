import { describe, expect, it } from "vitest";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { v6ProjectionLog } from "../src/sim/v6-projection-log.js";
import { v6ProjectionEntries } from "../src/sim/v6-projection-entries.js";
import { V6BuildLog } from "../src/v6/log.js";
import { v6Config } from "../src/v6/config.js";
import { request, outcome } from "./v6-projection-fixture.js";
import type { DeckRunRequest } from "../src/sim/build-sim-pool.js";
import { board } from "./boss-sim-fixture.js";

function chainRequest() {
  const r = request(); r.targets = [{ ...r.targets[0]!, kind: "chain", secondBoss: "SECOND", secondFloor: 49 }];
  const prepare = r.prepare; r.prepare = (t, s) => { const p = prepare(t, s)!;
    p.input.continuation = { variants: [{ boss: "SECOND", count: 1, input: board() }], potions: [], source: "fixture", limitation: "partial fixture" }; return p; };
  return r;
}
class ChainRunner {
  constructor(private missingResource = false) {}
  async run(r: DeckRunRequest) {
    return { outcomes: r.decks.map((_, j) => [Array.from({ length: r.samples }, (_, i) => {
      const stripe = r.stripes?.[j]; if (stripe && i % stripe.of !== stripe.at) return undefined;
      const firstWon = i % 2 === 0, secondWon = firstWon ? i % 4 === 0 : null;
      return { ...outcome(secondWon === true), sequence: { firstWon, firstDied: !firstWon, firstCapped: false, firstTimeUp: false,
        firstHp: firstWon ? 20 : 0, firstPotions: [], secondBoss: "SECOND", firstTurns: 4, secondWon, secondDied: firstWon ? !secondWon : null,
        firstResources: this.missingResource || !firstWon ? null : { hp: 20, revives: [], potionSlots: [] },
        secondEntry: firstWon ? { hp: 20, revives: [], potionSlots: [] } : null, openingHpLoss: 0, seed: r.seed + i } };
    })]), complete: Array.from({ length: r.samples }, (_, i) => i), timedOut: false, elapsedMs: 1, workers: 1 };
  }
}
describe("V6 continuous projection and explicit logs", () => {
  it("uses joint same-sample outcomes and retains missing resources as unknown", async () => {
    const r = chainRequest(), good = await new V6ProjectionEngine(new ChainRunner()).evaluate(r);
    // Lookup P=.5 multiplies the first-fight W=.5 and relay W=.25; W0 is not computed.
    expect(good.entries[0]!.win?.value).toBe(.25);
    expect(good.entries[0]!.joint_win?.value).toBeCloseTo(.125);
    expect(good.combinations[0]!.completed_joint_win?.value).not.toBe(.5 * .25);
    const consumer = v6ProjectionEntries(good, r.config)[0]!;
    expect(consumer.win?.value).toBeCloseTo(.125); expect(consumer.win_complete?.value).toBeCloseTo(.25);
    expect(consumer.direction_value).toBeCloseTo(.125);
    expect(good.combinations[0]!.continuous?.traces[0]?.secondEntry?.hp).toBe(20);
    const missing = await new V6ProjectionEngine(new ChainRunner(true)).evaluate(r);
    expect(missing.entries[0]!.joint_win).toBeNull();
  });
  it("does no I/O with all five characters off and writes a strict projection log only explicitly", async () => {
    const dir = mkdtempSync(join(tmpdir(), "v6-log-")), path = join(dir, "v6-build.jsonl");
    try {
      const r = request();
      for (const character of ["ironclad", "silent", "regent", "defect", "necrobinder"] as const) {
        r.character = character; r.config = v6Config({});
        const before = JSON.stringify([r.baseline, r.options, r.targets]);
        const table = await new V6ProjectionEngine(new ChainRunner()).evaluate(r);
        expect(v6ProjectionLog(r.config, table, { ts: "2026-10-19T00:00:00Z", run_id: "fixed", character, question_id: "q" }, new V6BuildLog(r.config, path)).written).toBe(false);
        expect(JSON.stringify([r.baseline, r.options, r.targets])).toBe(before);
      }
      expect(existsSync(path)).toBe(false);
      const enabled = request(), table = await new V6ProjectionEngine(new ChainRunner()).evaluate(enabled);
      expect(v6ProjectionLog(enabled.config, table, { ts: "2026-10-19T00:00:00Z", run_id: "fixed", character: "silent", question_id: "q" }, new V6BuildLog(enabled.config, path)).written).toBe(true);
      expect(JSON.parse(readFileSync(path, "utf8")).entries).toHaveLength(2);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
