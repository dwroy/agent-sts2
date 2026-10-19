import { expect, it } from "vitest";
import { projectV6RouteEntries, type V6RouteInput } from "../src/sim/v6-route-entry.js";
import { v6EntryHp, type V6TargetContext } from "../src/sim/v6-targets.js";
import type { V6ProjectionTarget } from "../src/sim/v6-projection.js";
const cost = { median: 5, p75: 9, source: "fixed fixture" };
const input = (): V6RouteInput => ({ character: "silent", ascension: 10, floor: 5, act: 1, hp: 40, max_hp: 60, signature: "fixture-route-v1",
  costs: { 1: { act: 1, maxHp: 60, monster: cost, elite: cost, unknown: cost }, 2: { act: 2, maxHp: 60, monster: cost, elite: cost, unknown: cost } },
  steps: [{ act: 1, floor: 6, type: "Monster" }, { act: 1, floor: 17, type: "Boss" },
    { act: 2, floor: 18, type: "Monster" }, { act: 2, floor: 33, type: "Boss" }] });
const context = (): V6TargetContext => ({ character: "silent", ascension: 10, floor: 5, act: 1, visible: [], doubleBoss: null,
  observations: [{ run_id: "old", character: "silent", ascension: 10, floor: 33, act: 2, boss: "FIXTURE", first_attempt: true, entry_hp: 60, max_hp: 60 }] });
const future: V6ProjectionTarget = { id: "later", act: 2, floor: 33, boss: "FIXTURE", kind: "future", probability: 1, labels: [] };
it("chains the existing route model through explicit simulated boss boundaries and preserves unmodelled losses", () => {
  const table = projectV6RouteEntries({ mode: "shadow" }, input())!;
  expect(table.entries.map(e => e.hp)).toEqual([35, null]);
  expect(v6EntryHp({ ...context(), routeEntries: table }, future, 60, 40).hp).toBeNull();
  const continued = projectV6RouteEntries({ mode: "shadow" }, { ...input(), bossExit: () => 23 })!;
  expect(continued.entries.map(e => e.hp)).toEqual([35, 18]);
  expect(v6EntryHp({ ...context(), routeEntries: continued }, future, 60, 40)).toMatchObject({ hp: 18, source: "explicit_route_projection" });
  expect(v6EntryHp(context(), future, 60, 40)).toMatchObject({ hp: 60, source: "own_first_entry_hp_ratio_median" });
});
it("rejects stale or cross-character tables, duplicate checkpoints and future max-HP substitution", () => {
  const table = projectV6RouteEntries({ mode: "shadow" }, { ...input(), bossExit: () => 23 })!;
  for (const changed of [{ character: "regent" as const }, { ascension: 9 }, { source_floor: 6 }, { max_hp: 80 }])
    expect(v6EntryHp({ ...context(), routeEntries: { ...table, ...changed } }, future, 60, 40).hp).toBeNull();
  expect(v6EntryHp({ ...context(), routeEntries: { ...table, entries: [...table.entries, table.entries[1]!] } }, future, 60, 40).hp).toBeNull();
  table.entries[1]!.max_hp = 65;
  expect(v6EntryHp({ ...context(), routeEntries: table }, future, 60, 40).labels).toContain("future_max_hp_change_not_modelled");
});
it("does no work when off, never revives dead routes and rejects invented exit HP", () => {
  expect(projectV6RouteEntries({ mode: "off" }, null as unknown as V6RouteInput)).toBeNull();
  const table = projectV6RouteEntries({ mode: "shadow" }, { ...input(), hp: 1, bossExit: () => { throw new Error("dead route must not simulate"); } })!;
  expect(table.entries.map(e => e.hp)).toEqual([0, 0]);
  expect(() => projectV6RouteEntries({ mode: "shadow" }, { ...input(), bossExit: () => 80 })).toThrow("invalid simulated");
  expect(() => projectV6RouteEntries({ mode: "shadow" }, { ...input(), steps: [...input().steps].reverse() })).toThrow("ordered steps");
});
it("uses own exact-ascension checkpoint HP when route steps are absent, without crossing roles, attempts or runs", () => {
  const c = context(), current = { ...future, kind: "current" as const };
  c.observations = [c.observations[0]!, { ...c.observations[0]!, run_id: "old2", entry_hp: 20 },
    { ...c.observations[0]!, run_id: "other-role", character: "ironclad", entry_hp: 0 },
    { ...c.observations[0]!, run_id: "other-asc", ascension: 9, entry_hp: 0 },
    { ...c.observations[0]!, run_id: "sl", first_attempt: false, entry_hp: 0 },
    { ...c.observations[0]!, run_id: "self", entry_hp: 0 }]; c.excludeRun = "self";
  c.routeEntries = projectV6RouteEntries({ mode: "shadow" }, { ...input(), steps: [] })!;
  expect(v6EntryHp(c, current, 60, null)).toMatchObject({ hp: 40, n: 2, source: "own_first_entry_hp_ratio_median" });
  expect(v6EntryHp(c, current, 60, 0)).toMatchObject({ hp: 0, source: "existing_route_projection" });
  c.observations = [];
  expect(v6EntryHp(c, current, 60, null).hp).toBeNull();
});
