import { expect, it } from "vitest";
import { v6Complete, v6Match, v6SupplySource, type V6SupplyData } from "../src/sim/v6-supply.js";
import { direction, req, state } from "./v6-projection-fixture.js";
function data(kind: "reward" | "shop" = "reward", price = 0): V6SupplyData { return { character: "silent", ascension: 10, excludeRun: "current", asOf: "2026-10-19", signature: "fixed",
  histories: [{ run: "history", character: "silent", ascension: 10, endedAt: "2026-10-18", floors: [5, 6, 7, 16], changes: [] }],
  opportunities: { schema: "construction-opportunities-v1", character: "silent", generated: "fixed", cutoff: "fixed", digest: "fixed", limitations: [],
    rows: [{ id: "offer", run: "history", ts: "2026-10-17", act: 1, ascension: 10, floor: 6, kind, offers: ["A", "B"].map(id => ({ id, upgraded: false, price })), source: { offset: 0, bytes: 1, sha256: "fixed" } }] } }; }
function context(ids = ["A"], gold = 0, upgraded = false) { return { direction: direction("D", ids.map(id => req(id, 1, upgraded))), options: [{ id: "skip", state: state([], gold) }], target: { id: "boss", floor: 16 }, samples: 20, seed: 42, deadline: 100, phase: "pick" as const }; }
const resolve = (d: V6SupplyData, ids = ["A"], gold = 0, upgraded = false) => v6SupplySource(d, () => 0).resolve(context(ids, gold, upgraded))!;
it("matches physical cards once, distinct identities once, and upgrades without duplication", () => {
  expect(v6Match(state(["A"]), [req("A"), req("A")]).missing).toBe(1);
  const s = state(["A", "A"]); s.cards[1]!.upgraded = true;
  expect(v6Match(s, [{ id: "r", count: 2, distinct: true, any: [{ id: "A", kind: "card" }, { id: "A", kind: "card", upgraded: true }] }]).missing).toBe(1);
  expect(v6Complete(state(["A"]), [req("A", 1, true)])?.cards).toEqual([{ id: "A", upgraded: true }]);
  expect(v6Complete(state(), [{ id: "r", count: 1, any: [{ id: "R", kind: "relic" }] }])).toBeNull();
});
it("counts disjoint alternatives, duplicate upgrades and relic identities without changing capacity constraints", () => {
  const s = state(["A", "A", "B"]); s.cards[1]!.upgraded = true; s.relics = ["R"];
  const alternatives = [{ id: "r", count: 3, any: [{ id: "A", kind: "card" as const },
    { id: "A", kind: "card" as const, upgraded: true }, { id: "B", kind: "card" as const }] }];
  expect(v6Match(s, alternatives)).toEqual({ missing: 0, counts: [0] });
  expect(v6Match(s, alternatives.map(r => ({ ...r, distinct: true })))).toEqual({ missing: 1, counts: [1] });
  expect(v6Match(s, [req("A", 2, true), { id: "relic", count: 1, any: [{ id: "R", kind: "relic" }] }]))
    .toEqual({ missing: 1, counts: [1, 0] });
  // The overlapping A alternative needs an augmenting path to reserve A for the second requirement.
  expect(v6Match(state(["A", "B"]), [{ ...alternatives[0]!, count: 1 }, req("A")]).missing).toBe(0);
});
it("takes at most one card per reward", () => { expect(resolve(data(), ["A", "B"]).combinations[0]?.availability.skip).toBe(0); expect(resolve(data()).combinations[0]?.availability.skip).toBe(1); });
it("caps shops by current gold plus historical positive growth", () => {
  const d = data("shop", 30); expect(resolve(d, ["A", "B"], 30).combinations[0]?.availability.skip).toBe(0); expect(resolve(d, ["A", "B"], 60).combinations[0]?.availability.skip).toBe(1);
  d.histories[0]!.changes.push({ floor: 6, act: 1, adds: [], removes: [], upgrades: [], rest: false, positiveGold: 30 });
  expect(resolve(d, ["A", "B"], 30).combinations[0]?.availability.skip).toBe(1);
});
it("permits at most one upgrade at each historical rest", () => {
  const d = data("shop"); expect(resolve(d, ["A"], 0, true).combinations[0]?.availability.skip).toBe(0);
  d.histories[0]!.changes.push({ floor: 7, act: 1, adds: [], removes: [], upgrades: [], rest: true, positiveGold: 0 });
  expect(resolve(d, ["A"], 0, true).combinations[0]?.availability.skip).toBe(1); expect(resolve(d, ["A", "B"], 0, true).combinations[0]?.availability.skip).toBe(0);
});
it("reproduces 200 shared worlds and splits 20 fights among empirical edits", () => {
  const d = data(); d.histories[0]!.changes.push({ floor: 7, act: 1, adds: [{ id: "G", upgraded: false }], removes: [], upgrades: [], rest: true, positiveGold: 0 });
  const a = resolve(d); expect(a).toEqual(resolve(d)); expect(a.combinations[0]?.supply.skip).toHaveLength(200); expect(a.combinations[0]?.samples).toHaveLength(20);
  expect(a.combinations[0]?.general[0]?.states.skip?.cards).toEqual([{ id: "G", upgraded: false }]);
});
it("keeps absent own first-attempt histories unknown", () => {
  for (const mutate of [(d: V6SupplyData) => { d.histories[0]!.character = "ironclad"; },
    (d: V6SupplyData) => { d.histories[0]!.run = "current"; }, (d: V6SupplyData) => { d.histories[0]!.endedAt = "2027"; }, (d: V6SupplyData) => { d.histories[0]!.floors = [5]; }]) {
    const d = data(); mutate(d); expect(resolve(d).combinations[0]?.availability.skip).toBeNull();
  }
});
it("caps picks to ranked four; evaluates all at act start and restricts brain override", () => {
  const c = context(), s = v6SupplySource(data(), () => 0); c.direction.combos = Array.from({ length: 6 }, (_, i) => ({ ...c.direction.combos[0]!, id: `k${i}` }));
  expect(s.resolve({ ...c, ranking: ["k5", "k4"] })?.combinations.map(x => x.id)).toEqual(["k5", "k4", "k0", "k1"]);
  expect(s.resolve({ ...c, phase: "act" })?.combinations).toHaveLength(6);
  expect(s.resolve({ ...c, phase: "act", combinationIds: ["k5"] })?.combinations.map(x => x.id)).toEqual(["k5"]);
  expect(s.resolve({ ...c, ranking: ["k5", "k4"], combinationIds: ["k5"] })?.combinations.map(x => x.id)).toEqual(["k5"]);
  expect(() => s.resolve({ ...c, idealOverrides: { D: ["UNLEARNED"] } })).toThrow();
  expect(s.resolve({ ...c, phase: "act", idealOverrides: { D: ["A"] } })?.combinations[0]?.source).toBe("brain");
  expect(s.resolve({ ...c, phase: "act", appearedCards: ["SEEN"], idealOverrides: { D: ["SEEN"] } })?.combinations[0]?.id).toBe("D:brain");
});

it("pools supply across ascensions while preserving role, cutoff and run isolation", () => {
  const d = data(); d.histories[0]!.ascension = 0; d.opportunities.rows[0]!.ascension = 1;
  expect(resolve(d).combinations[0]?.availability.skip).toBe(1);
  expect(resolve(d).labels).toContain("supply_pooled_versions_and_ascensions");
});
it("gates formation and completed simulations on held prerequisite relics", () => {
  const c = context(); c.direction.combos[0]!.prerequisites = { op: "contains", field: "player.relics", value: "FIXTURE_RELIC" };
  const s = v6SupplySource(data(), () => 0);
  const absent = s.resolve(c)!.combinations[0]!;
  expect(absent.availability.skip).toBe(0); expect(absent.samples[0]!.states.skip).toBeNull();
  c.options[0]!.state.relics = ["FIXTURE_RELIC"];
  expect(s.resolve(c)!.combinations[0]!.availability.skip).toBe(1);
  expect(s.resolve(c)!.combinations[0]!.samples[0]!.states.skip).not.toBeNull();
  expect(c.options[0]!.state.cards).toEqual([]);
});
it("keeps unforecast prerequisite facts unknown and does not simulate an assumed completion", () => {
  const c = context(); c.direction.combos[0]!.prerequisites = { op: "gte", field: "player.relic_counters.FIXTURE_RELIC", value: 2 };
  const row = v6SupplySource(data(), () => 0).resolve(c)!.combinations[0]!;
  expect(row.availability.skip).toBeNull(); expect(row.samples[0]!.states.skip).toBeNull();
});
it("brain overrides inherit formal prerequisites and cannot invent prerequisite relics", () => {
  const c = context(); c.direction.combos[0]!.prerequisites = { op: "contains", field: "player.relics", value: "FIXTURE_RELIC" };
  const row = v6SupplySource(data(), () => 0).resolve({ ...c, idealOverrides: { D: ["A"] } })!.combinations[0]!;
  expect(row.source).toBe("brain"); expect(row.availability.skip).toBe(0); expect(row.samples[0]!.states.skip).toBeNull();
});
it("resumes interrupted worlds and reuses idle baseline supply when candidates or boss identities change", () => {
  let time = 0;
  const s = v6SupplySource(data(), () => time++), c = context(); c.deadline = 45;
  const partial = s.resolve(c)!.combinations[0]!;
  expect(partial.availability.skip).toBeNull(); expect(partial.unknownReasons?.skip).toContain("supply_budget_exhausted");
  time = 0;
  const complete = s.resolve({ ...c, deadline: 10000 })!.combinations[0]!;
  expect(complete.supply).toEqual(resolve(data()).combinations[0]!.supply);
  time = 100;
  const withCandidate = { ...c, target: { id: "another-boss", floor: 16 }, samples: 100,
    options: [...c.options, { id: "take", state: state(["A"]) }] };
  const hot = s.resolve(withCandidate)!.combinations[0]!;
  expect(hot.supply.skip).toEqual(complete.supply.skip); expect(hot.availability).toEqual({ skip: 1, take: 1 });
  const changed = s.resolve({ ...withCandidate, seed: 43 })!.combinations[0]!;
  expect(changed.availability.skip).toBeNull();
});
