import { expect, it, vi } from "vitest";
import * as bossStart from "../src/sim/boss-start.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { cardUpgrade } from "../src/knowledge/card-upgrades.js";
import { v6Config } from "../src/v6/config.js";
import { sealV6History } from "../src/sim/v6-history-pack.js";
import { createV6ProjectionFactory, type V6FactorySnapshot, type V6ProjectionSituation } from "../src/sim/v6-request-factory.js";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { slimInput } from "../src/sim/boss-sim.js";
import { v6Complete } from "../src/sim/v6-supply.js";
import { FixedRunner, request, source } from "./v6-projection-fixture.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { board, setupOneshotTests } from "./oneshot-support.js";
import { loggedKnowledge } from "./logged.js";
setupOneshotTests();
const sha = "a".repeat(64), at = "2020-01-01T00:00:00.000Z";
function fixture() {
  const raw = board("xljq-f5-reward", "reward"), run = asRecord(raw["run"]);
  run["character_id"] = "SILENT"; run["potions"] = [{ index: 0, occupied: false }]; run["gold"] = 100;
  const state = parseGameState(raw), asc = state.run!.ascension!;
  const pack = sealV6History({ character: "silent", cutoff: at, sources: ["a", "b", "c", "d"].map(name => ({ name, sha256: sha, bytes: 1 })),
    coverage: [], floor_frames: [], histories: [], observations: [], combo_metrics: [], labels: [],
    opportunities: { schema: "construction-opportunities-v1", character: "silent", generated: at, cutoff: at, digest: sha, limitations: [], rows: [] } }, at);
  const config = v6Config({ V6_BUILD: "on" });
  const snapshot: V6FactorySnapshot = { config, character: "silent", history: { status: "loaded", path: "frozen", value: pack },
    knowledge: loggedKnowledge, templates: [{ id: "fixture", name: "fixture", character: "silent", ascensions: [asc], status: "candidate",
      requirements: [{ id: "first", count: 1, any: [{ id: String(asRecord(asArray(run["deck"])[0])["card_id"]), kind: "card" }] }],
      evidence: { runs: [], source: "fixed logged fixture", sha256: sha }, limits: [] }], support: null,
    doubleBoss: null, trust: null, modelVersion: "fixed-fixture", models: { db: FIXTURE_DB, mm: FIXTURE_MM } };
  const situation: V6ProjectionSituation = { state, phase: "pick", runId: String(raw["run_id"] || "fixture"), asOf: "2020-01-02T00:00:00.000Z",
    seed: 17, weights: { fixture: 1 }, options: [], visibleBosses: [{ act: 1, floor: 17, boss: "SOUL_FYSH" }],
    currentRouteHp: 27, currentRouteSignature: "fixed-route" };
  return { snapshot, situation, raw, run };
}
it("disabled factory reads neither snapshot dependencies nor actual situations for every role", () => {
  for (const character of ["silent", "ironclad", "regent", "defect", "necrobinder"]) {
    const factory = createV6ProjectionFactory({ config: { mode: "off" }, character, get history() { throw new Error("read while off"); } } as unknown as V6FactorySnapshot);
    expect(factory.create(new Proxy({} as V6ProjectionSituation, { get() { throw new Error("state read while off"); } }))).toMatchObject({ status: "disabled" });
  }
});
it("reuses frozen supply and openings across idle/pick while invalidating changed route resources", () => {
  const { snapshot, situation } = fixture(), factory = createV6ProjectionFactory(snapshot);
  const a = factory.create({ ...situation, phase: "act" }), b = factory.create(situation);
  expect(a.status).toBe("ready"); expect(b.status).toBe("ready");
  if (a.status !== "ready" || b.status !== "ready") return;
  expect(a.request.completionSources[0]).toBe(b.request.completionSources[0]);
  const spy = vi.spyOn(bossStart, "syntheticBossStart");
  try {
    const t = a.request.targets[0]!, first = a.request.prepare(t, a.request.baseline.state, a.request.baseline);
    expect(first).not.toBeNull();
    expect(b.request.prepare(t, b.request.baseline.state, b.request.baseline)).toBe(first);
    expect(spy).toHaveBeenCalledTimes(1);
    const changed = factory.create({ ...situation, currentRouteHp: 19, currentRouteSignature: "changed-route" });
    expect(changed.status).toBe("ready");
    if (changed.status === "ready") expect(changed.request.prepare(t, changed.request.baseline.state, changed.request.baseline)).not.toBe(first);
    expect(spy).toHaveBeenCalledTimes(2);
  } finally { spy.mockRestore(); }
});
it("builds all five option types with real costs, immutable inputs and preserved instance counters", () => {
  const { snapshot, situation, run, raw } = fixture(), cards = asArray(run["deck"]).map(asRecord);
  const index = cards.findIndex(c => !c["upgraded"] && !!cardUpgrade(String(c["card_id"])));
  expect(index).toBeGreaterThanOrEqual(0); cards[index]!["fixture_counter"] = 7;
  const potion = "BLOCK_POTION"; expect(loggedKnowledge.potion(potion)).not.toBeNull();
  situation.state = parseGameState(raw);
  situation.options = [
    { id: "add", changes: [{ kind: "add", card: { id: String(cards[index]!["card_id"]), upgraded: false }, price: 5 }] },
    { id: "remove", changes: [{ kind: "remove", index: 0, price: 7 }] },
    { id: "upgrade", changes: [{ kind: "upgrade", index, price: 11 }] },
    { id: "heal", changes: [{ kind: "heal", amount: 10, price: 13 }] },
    { id: "potion", changes: [{ kind: "potion", slot: 0, value: { potion_id: potion }, price: 0 }] },
    { id: "unaffordable", changes: [{ kind: "heal", amount: 1, price: 101 }] },
    { id: "invent-slot", changes: [{ kind: "potion", slot: 1, value: { potion_id: potion }, price: 0 }] },
  ];
  const before = JSON.stringify(raw), result = createV6ProjectionFactory(snapshot).create(situation);
  expect(result.status).toBe("ready"); if (result.status !== "ready") return;
  const r = result.request, option = (id: string) => r.options.find(o => o.id === id)!;
  expect(option("add").state.cards.length).toBe(r.baseline.state.cards.length + 1);
  expect(option("remove").state.cards.length).toBe(r.baseline.state.cards.length - 1);
  expect(option("upgrade").state.cards[index]!.upgraded).toBe(true);
  expect(option("upgrade").state.gold).toBe(89);
  expect(result.rejected_options.map(o => o.id)).toEqual(["unaffordable", "invent-slot"]);
  // Potion options can have identical BuildState. Preparation must still use their own held belt.
  expect(option("potion").state).toEqual(r.baseline.state);
  expect(option("potion").preparationKey).not.toBe(r.baseline.preparationKey);
  const spy = vi.spyOn(bossStart, "syntheticBossStart");
  try {
    const target = r.targets.find(t => t.kind === "current")!;
    expect(r.prepare(target, option("upgrade").state, option("upgrade"))).not.toBeNull();
    expect(asArray(spy.mock.calls[0]![0].run!.raw["deck"]).map(asRecord).find(c => c["fixture_counter"] === 7)?.["upgraded"]).toBe(true);
    expect(r.prepare(target, option("potion").state, option("potion"))).not.toBeNull();
    expect(asRecord(asArray(spy.mock.calls[1]![0].run!.raw["potions"])[0])["potion_id"]).toBe(potion);
    expect(r.prepare(target, r.baseline.state, r.baseline)).not.toBeNull();
    expect(asRecord(asArray(spy.mock.calls[2]![0].run!.raw["potions"])[0])["occupied"]).toBe(false);
    if (option("heal").state.hp !== r.baseline.state.hp) expect(r.prepare(target, option("heal").state, option("heal"))).toBeNull();
  } finally { spy.mockRestore(); }
  expect(JSON.stringify(raw)).toBe(before);
});
it("addresses held potion slots by identity rather than belt position and rejects ambiguous slots", () => {
  const { snapshot, situation, run, raw } = fixture();
  run["potions"] = [{ index: 3, occupied: false }, { index: 0, occupied: false }]; situation.state = parseGameState(raw);
  situation.options = [{ id: "fill", changes: [{ kind: "potion", slot: 3, value: { potion_id: "BLOCK_POTION" }, price: 4 }] },
    { id: "invent", changes: [{ kind: "potion", slot: 1, value: null, price: 0 }] }];
  const result = createV6ProjectionFactory(snapshot).create(situation); expect(result.status).toBe("ready"); if (result.status !== "ready") return;
  expect(result.rejected_options.map(o => o.id)).toEqual(["invent"]);
  expect(result.request.options[0]!.state.gold).toBe(96);
  const spy = vi.spyOn(bossStart, "syntheticBossStart");
  try {
    const option = result.request.options[0]!;
    result.request.prepare(result.request.targets[0]!, option.state, option);
    expect(asArray(spy.mock.calls[0]![0].run!.raw["potions"])).toEqual([
      { index: 3, occupied: true, potion_id: "BLOCK_POTION" }, { index: 0, occupied: false },
    ]);
  } finally { spy.mockRestore(); }
  run["potions"] = [{ index: 3, occupied: false }, { index: 3, occupied: false }]; situation.state = parseGameState(raw);
  const ambiguous = createV6ProjectionFactory(snapshot).create(situation);
  expect(ambiguous.status === "ready" && ambiguous.rejected_options.map(o => o.id)).toContain("fill");
});
it("reprojects healing through the supplied route and preserves unknown after an unmodelled boss", () => {
  const { snapshot, situation, run, raw } = fixture(); run["current_hp"] = 20; situation.state = parseGameState(raw);
  const cost = { act: 1, maxHp: Number(run["max_hp"]), monster: { median: 5, p75: 5, source: "fixture" },
    elite: { median: 5, p75: 5, source: "fixture" }, unknown: { median: 0, p75: 0, source: "fixture" } };
  situation.route = { signature: "fixed-route-costs", steps: [{ act: 1, floor: 6, type: "Monster" }, { act: 1, floor: 17, type: "Boss" },
    { act: 2, floor: 33, type: "Boss" }], costs: { 1: cost, 2: { ...cost, act: 2 } } };
  situation.options = [{ id: "heal", changes: [{ kind: "heal", amount: 10, price: 0 }] }];
  const r = createV6ProjectionFactory(snapshot).create(situation); expect(r.status).toBe("ready"); if (r.status !== "ready") return;
  const spy = vi.spyOn(bossStart, "syntheticBossStart");
  try {
    const target = r.request.targets[0]!, healed = r.request.options[0]!;
    r.request.prepare(target, r.request.baseline.state); r.request.prepare(target, healed.state, healed);
    expect(spy.mock.calls.map(c => c[3])).toEqual([15, 25]);
    const future = { ...target, id: "future", act: 2, floor: 33, kind: "future" as const };
    expect(r.request.prepare(future, healed.state, healed)).toBeNull();
  } finally { spy.mockRestore(); }
});
it("refuses cross-role, future or hash-mutated history and duplicate options without fallback", () => {
  const { snapshot, situation } = fixture();
  expect(createV6ProjectionFactory({ ...snapshot, character: "regent" }).create(situation)).toMatchObject({ status: "unavailable" });
  expect(createV6ProjectionFactory(snapshot).create({ ...situation, asOf: "2019-01-01T00:00:00.000Z" })).toMatchObject({ status: "unavailable" });
  expect(createV6ProjectionFactory(snapshot).create({ ...situation, options: [{ id: "skip", changes: [] }] })).toMatchObject({ status: "unavailable" });
  const factory = createV6ProjectionFactory(snapshot);
  if (snapshot.history.status === "loaded") snapshot.history.value.data.labels.push("mutated-after-start");
  const r = factory.create(situation); expect(r.status).toBe("ready"); if (r.status === "ready") expect(r.labels).not.toContain("mutated-after-start");
  expect(createV6ProjectionFactory(snapshot).create(situation)).toMatchObject({ status: "unavailable" });
});
it("engine preparation cache distinguishes held potion changes with identical completed decks", async () => {
  const r = request(), prepare = r.prepare, seen: string[] = [];
  r.baseline.preparationKey = "empty-belt"; r.options[0]!.preparationKey = "filled-belt";
  r.options[0]!.state = structuredClone(r.baseline.state); r.completionSources = [source({ skip: 1, take: 1 })];
  r.prepare = (target, state, option) => { seen.push(option!.id); return prepare(target, state, option); };
  await new V6ProjectionEngine(new FixedRunner()).evaluate(r);
  expect(new Set(seen)).toEqual(new Set(["skip", "take"]));
});
it("shares the actual completed combat input when taking a missing combination member", () => {
  const { snapshot, situation, run, raw } = fixture();
  const requirements = snapshot.templates[0]!.requirements;
  const id = requirements[0]!.any[0]!.id;
  run["deck"] = asArray(run["deck"]).filter(c => asRecord(c)["card_id"] !== id);
  situation.state = parseGameState(raw);
  situation.options = [{ id: "member", changes: [{ kind: "add", card: { id, upgraded: false }, price: 0 }] }];
  const ready = createV6ProjectionFactory(snapshot).create(situation);
  expect(ready.status).toBe("ready"); if (ready.status !== "ready") return;
  const r = ready.request, target = r.targets[0]!, member = r.options[0]!;
  const complete = (o: typeof member) => {
    const s = v6Complete(o.state, requirements)!;
    s.cards.sort((a, b) => a.id.localeCompare(b.id) || Number(a.upgraded) - Number(b.upgraded));
    return r.prepare(target, s, o);
  };
  const skip = complete(r.baseline), take = complete(member);
  expect(skip).not.toBeNull(); expect(take).not.toBeNull();
  expect(slimInput(skip!.input)).toEqual(slimInput(take!.input));
});
