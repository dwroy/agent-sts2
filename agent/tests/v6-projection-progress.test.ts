import { expect, it } from "vitest";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import type { V6CompletionContext } from "../src/sim/v6-completion.js";
import { direction, FixedRunner, outcome, request, source } from "./v6-projection-fixture.js";

it("resolves each direction catalog once and reuses act rankings at pick", async () => {
  const r = request(), visited: string[] = [], provider = source({ skip: 1, take: 1 });
  r.phase = "act";
  r.directions = [direction("D"), direction("S")].map(d => ({ ...d,
    combos: ["low", "high", "third"].map(id => ({ ...d.combos[0]!, id: `${d.id}:${id}` })) }));
  r.weights = { D: .5, S: .5 }; r.rankings = { D: ["D:high", "D:low"], S: ["S:high", "S:low"] };
  const resolve = provider.resolve;
  provider.resolve = c => {
    const id = c.ranking?.[0]; visited.push(`${c.direction.id}/${id}`);
    const result = resolve(c)!; result.combinations[0]!.id = id!; return result;
  };
  r.completionSources = [provider];
  const engine = new V6ProjectionEngine(new FixedRunner()), act = await engine.evaluate(r);
  expect(visited).toEqual(["D/D:high", "S/S:high"]);
  expect(act.entries.every(e => e.win?.n === 100)).toBe(true);
  visited.length = 0;
  await engine.evaluate({ ...r, phase: "pick", rankings: act.rankings });
  expect(visited.slice(0, 2)).toEqual(["D/D:high", "S/S:high"]);
});

it("returns the completed target and its n while another target is structurally unknown", async () => {
  const r = request(), target = r.targets[0]!;
  r.targets = [target, { ...target, id: "missing", unknown: "no_observed_opening" }];
  const table = await new V6ProjectionEngine(new FixedRunner()).evaluate(r);
  expect(table.entries.find(e => e.target_id === target.id)?.win?.n).toBe(20);
  expect(table.entries.find(e => e.target_id === "missing")?.win).toBeNull();
  expect(table.telemetry).not.toHaveProperty("pending_work");
});

it("keeps the LIVE relay expectation unknown when no first-fight survivor was observed", async () => {
  const r = request(), runner = new FixedRunner(), prepare = r.prepare;
  r.targets = [{ ...r.targets[0]!, kind: "chain", secondBoss: "QUEEN", secondFloor: 49 }];
  r.prepare = (t, s, o) => { const input = prepare(t, s, o)!;
    input.input.continuation = { variants: [{ boss: "QUEEN", input: input.input }] } as typeof input.input.continuation;
    // A separate opening prevents the recursive fixture from entering input hashing.
    input.input.continuation.variants[0]!.input = prepare({ ...t, kind: "current" }, s, o)!.input;
    return input;
  };
  runner.run = async q => ({ outcomes: q.decks.map((_d, j) => [Array.from({ length: q.samples }, (_, i) => {
    const stripe = q.stripes?.[j]; if (stripe && i % stripe.of !== stripe.at) return undefined;
    return { ...outcome(false), sequence: { firstWon: false, firstDied: true, firstCapped: false,
      firstTimeUp: false, firstHp: 0, firstTurns: 4, firstPotions: [], secondBoss: "QUEEN", secondWon: null, secondDied: null } };
  })]), complete: [], timedOut: false, elapsedMs: 1, workers: 1 });
  const table = await new V6ProjectionEngine(runner).evaluate(r);
  expect(table.entries.every(e => e.joint_win === null)).toBe(true);
  expect(table.pick_direction_comparisons.every(e => e.joint_paired_delta === null)).toBe(true);
  expect(table.combinations[0]!.continuous?.secondGivenFirstWin.value).toBeNull();
  expect(table.combinations[0]!.continuous?.joint.reason).toBe("no_first_win_samples");
});

it("resolves the catalog in one provider call and keeps every returned combination", async () => {
  const r = request(), provider = source(undefined, 4), resolve = provider.resolve, visits: V6CompletionContext[] = [];
  r.directions[0]!.combos = Array.from({ length: 6 }, (_, i) => ({ ...r.directions[0]!.combos[0]!, id: `k${i}` }));
  provider.resolve = c => { visits.push(c); return resolve(c); };
  r.completionSources = [provider];
  const table = await new V6ProjectionEngine(new FixedRunner()).evaluate(r);
  expect(visits).toHaveLength(1);
  expect(visits[0]).not.toHaveProperty("combinationIds");
  expect([...new Set(table.combinations.map(c => c.combination_id))]).toEqual(["k0", "k1", "k2", "k3"]);
  expect(table.entries[0]?.win?.n).toBe(20);
});
