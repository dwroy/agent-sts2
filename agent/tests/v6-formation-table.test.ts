import { expect, it } from "vitest";
import { v6FormationTableSource, type V6FormationTable } from "../src/sim/v6-formation-table.js";
import type { V6CompletionContext } from "../src/sim/v6-completion.js";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { direction, FixedRunner, req, request, state } from "./v6-projection-fixture.js";

const table = (): V6FormationTable => ({ character: "silent", cutoff: "2026-10-18", runs: [{ run_id: "history", ended: "2026-10-17" }],
  cards: ["A", "B"].flatMap(card_id => (["reward", "shop"] as const).map(source => ({ card_id, source, rarity: "UNCOMMON", n: 100,
    probability: source === "reward" ? .2 : .5, upgraded_appearances: 10 }))),
  remaining: ["reward", "shop", "upgrade"].map(kind => ({ from_floor: 5, target_floor: 16, kind, median: kind === "reward" ? 2 : 1 })),
  labels: ["observational_fixture"] });
function context(requirements = [req("A"), req("B")]): V6CompletionContext {
  return { direction: direction("D", requirements), options: [{ id: "skip", state: state() }, { id: "take", state: state(["A"]) }],
    target: { id: "boss", floor: 16 }, samples: 20, seed: 42, deadline: Infinity, phase: "pick" };
}
function provider(t: V6FormationTable | undefined = table()) {
  return v6FormationTableSource({ character: "silent", ascension: 10, signature: "fixed", table: t, excludeRun: "current", asOf: "2026-10-20" });
}
it("uses exact remaining opportunities, source probabilities and the option's held cards without supply worlds", () => {
  const row = provider().resolve(context())!.combinations[0]!, perCard = 1 - .8 ** 2 * .5;
  expect(row.availability.skip).toBeCloseTo(perCard ** 2);
  expect(row.availability.take).toBeCloseTo(perCard);
  expect(row.general).toEqual([]); expect(row.supply).toEqual({});
  expect(row.samples).toHaveLength(20); expect(row.labels).toContain("observational_fixture");
  expect(row.samples[0]!.states.skip).toEqual(row.samples[0]!.states.take);
});
it("keeps missing tables, exact checkpoints, sources and card denominators unknown, while observed zero is zero", () => {
  const c = context([req("A")]);
  const absent = v6FormationTableSource({ character: "silent", ascension: 10, signature: "fixed", excludeRun: "current", asOf: "2026-10-20" });
  expect(absent.resolve(c)!.combinations[0]!.availability).toEqual({ skip: null, take: 1 });
  for (const edit of [(t: V6FormationTable) => { t.remaining = t.remaining.filter(r => r.kind !== "shop"); },
    (t: V6FormationTable) => { t.remaining = t.remaining.map(r => ({ ...r, target_floor: 17 })); },
    (t: V6FormationTable) => { t.cards = t.cards.filter(r => r.source !== "shop"); },
    (t: V6FormationTable) => { t.cards = t.cards.map(r => ({ ...r, n: 0, probability: null })); }]) {
    const t = table(); edit(t); expect(provider(t).resolve(c)!.combinations[0]!.availability.skip).toBeNull();
  }
  const t = table(); t.cards = t.cards.map(r => ({ ...r, probability: 0 }));
  expect(provider(t).resolve(c)!.combinations[0]!.availability).toEqual({ skip: 0, take: 1 });
});
it("isolates character, current run and future data without substituting another source", () => {
  for (const edit of [(t: V6FormationTable) => { t.character = "regent"; },
    (t: V6FormationTable) => { t.runs = [{ run_id: "current", ended: "2026-10-17" }]; },
    (t: V6FormationTable) => { t.cutoff = "2026-10-21"; }]) {
    const t = table(); edit(t); expect(provider(t).resolve(context())!.combinations[0]!.availability.skip).toBeNull();
  }
  const c = context(); c.direction.character = "regent"; expect(provider().resolve(c)).toBeNull();
});
it("does not infer duplicate-copy joints from at-least-one observations", () => {
  const c = context([req("A", 2)]), t = table();
  t.remaining = t.remaining.map(r => ({ ...r, median: r.kind === "reward" ? 2 : 0 }));
  expect(provider(t).resolve(c)!.combinations[0]!.availability.skip).toBeNull();
  expect(provider(t).resolve(c)!.combinations[0]!.unknownReasons?.skip).toContain("duplicate_missing_copies_joint_probability_unknown");
  expect(provider(t).resolve(c)!.combinations[0]!.availability.take).toBeCloseTo(1 - .8 ** 2);
  t.remaining = t.remaining.map(r => ({ ...r, median: r.kind === "reward" ? 1.5 : 0 }));
  expect(provider(t).resolve(c)!.combinations[0]!.availability.skip).toBeNull();
  expect(provider(t).resolve(c)!.combinations[0]!.availability.take).toBeCloseTo(1 - .8 ** 1.5);
});
it("respects explicit prerequisites and does not manufacture upgrades from ordinary offers", () => {
  const c = context([req("A", 1, true)]), t = table();
  t.remaining = t.remaining.map(r => ({ ...r, median: r.kind === "upgrade" ? 0 : r.median }));
  t.cards = t.cards.map(r => ({ ...r, upgraded_appearances: 0 }));
  const row = provider(t).resolve(c)!.combinations[0]!;
  expect(row.availability.skip).toBe(0); expect(row.availability.take).toBeNull();
  c.direction.combos[0]!.prerequisites = { op: "contains", field: "player.relics", value: "TEST_RELIC" };
  expect(provider().resolve(c)!.combinations[0]!.availability.skip).toBe(0);
  c.direction.combos[0]!.prerequisites = { op: "gt", field: "player.hp", value: 1 };
  expect(provider().resolve(c)!.combinations[0]!.availability.skip).toBeNull();
});
it("ranks by cheap formation lookup before the four-combo cap, shares completed fights and never reads W0", async () => {
  const r = request(), t = table(), runner = new FixedRunner(), engine = new V6ProjectionEngine(runner);
  r.directions[0]!.combos = Array.from({ length: 6 }, (_, i) => ({ ...r.directions[0]!.combos[0]!, id: `k${i}`, requirements: [req(i === 5 ? "A" : "MISSING")] }));
  const source = provider(t), resolve = source.resolve;
  source.resolve = c => { const result = resolve(c)!; for (const row of result.combinations) {
    Object.defineProperty(row, "general", { get() { throw new Error("W0 read"); } });
    Object.defineProperty(row, "supply", { get() { throw new Error("supply MC read"); } });
  } return result; };
  r.completionSources = [source];
  const out = await engine.evaluate(r);
  expect(out.combinations[0]!.combination_id).toBe("k5");
  expect(out.entries.every(e => e.combo_id === "k5" && e.win?.n === 20)).toBe(true);
  expect(out.entries.find(e => e.option_id === "take")).toMatchObject({ expected_win: 1, win_incomplete: null });
  expect(out.entries.find(e => e.option_id === "skip")!.expected_win).toBeCloseTo(1 - .8 ** 2 * .5);
  expect(out.telemetry.simulations).toBe(20); // Both options complete to the same physical deck.
  expect(runner.calls).toHaveLength(1);
});
