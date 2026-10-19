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
  for (const mutate of [(d: V6SupplyData) => { d.histories[0]!.character = "ironclad"; }, (d: V6SupplyData) => { d.histories[0]!.ascension = 9; },
    (d: V6SupplyData) => { d.histories[0]!.run = "current"; }, (d: V6SupplyData) => { d.histories[0]!.endedAt = "2027"; }, (d: V6SupplyData) => { d.histories[0]!.floors = [5]; }]) {
    const d = data(); mutate(d); expect(resolve(d).combinations[0]?.availability.skip).toBeNull();
  }
});
it("caps picks to ranked four; evaluates all at act start and restricts brain override", () => {
  const c = context(), s = v6SupplySource(data(), () => 0); c.direction.combos = Array.from({ length: 6 }, (_, i) => ({ ...c.direction.combos[0]!, id: `k${i}` }));
  expect(s.resolve({ ...c, ranking: ["k5", "k4"] })?.combinations.map(x => x.id)).toEqual(["k5", "k4", "k0", "k1"]);
  expect(s.resolve({ ...c, phase: "act" })?.combinations).toHaveLength(6);
  expect(() => s.resolve({ ...c, idealOverrides: { D: ["UNLEARNED"] } })).toThrow();
  expect(s.resolve({ ...c, phase: "act", idealOverrides: { D: ["A"] } })?.combinations[0]?.source).toBe("brain");
  expect(s.resolve({ ...c, phase: "act", appearedCards: ["SEEN"], idealOverrides: { D: ["SEEN"] } })?.combinations[0]?.id).toBe("D:brain");
});
