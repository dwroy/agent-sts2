import { expect, it, vi, afterEach } from "vitest";
import { V6CardResultsEngine, cardCombatRow, cardResultKnown, completedCore } from "../src/sim/v6-card-results.js";
import type { DeckRunRequest, DeckSimRunner } from "../src/sim/build-sim-pool.js";
import { outcome, request, state, req, direction } from "./v6-projection-fixture.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import { constructionCoverage } from "../src/v6/construction-safety.js";
afterEach(() => vi.unstubAllEnvs());
class Runner implements DeckSimRunner {
  calls: DeckRunRequest[] = [];
  constructor(private tick: () => void = () => {}) {}
  async run(r: DeckRunRequest) {
    this.calls.push(r); this.tick();
    const outcomes = r.decks.map(deck => [Array.from({ length: r.samples }, (_, i) => {
      if (i < r.range!.from || i >= r.range!.to) return undefined;
      const better = deck.meta?.enc === "completed", won = better || i % 2 === 0;
      return { ...outcome(won), hpLoss: (better ? 5 : 15) + i, turns: better ? 2 : 4,
        dmgByTurn: better ? [40, 40] : [20, 20, 20, 20] };
    })]);
    return { outcomes, complete: Array.from({ length: r.range!.to - r.range!.from }, (_, i) => i + r.range!.from),
      elapsedMs: 1, timedOut: false, workers: 1 };
  }
}
it("A uses the actual option deck and common absolute seeds, never completion sources or trust gates", async () => {
  const r = request(), prepare = vi.fn(r.prepare), completion = vi.fn(() => { throw Error("ideal sampling must not run"); });
  r.prepare = prepare; r.completionSources = [{ kind: "fixed", signature: "forbidden", resolve: completion }];
  const runner = new Runner(), engine = new V6CardResultsEngine(runner, () => 0, 20);
  const table = await engine.evaluate(r, { fingerprint: "actual" });
  expect(completion).not.toHaveBeenCalled(); expect(prepare.mock.calls.map(c => c[1])).toEqual([r.baseline.state, r.options[0]!.state]);
  expect(runner.calls.map(c => c.range)).toEqual([{ from: 0, to: 2 }, { from: 2, to: 10 }, { from: 10, to: 18 }, { from: 18, to: 20 }]);
  expect(runner.calls.every(c => c.seed === r.seed && c.samples === 20)).toBe(true);
  const take = table.immediate.find(row => row.option_id === "take")!;
  expect(take.metrics.hp_loss).toEqual({ mean: 14.5, se: expect.any(Number), n: 20 });
  expect(take.paired_delta.hp_loss).toEqual({ mean: -10, se: 0, n: 20 });
  expect(take.paired_delta.death_rate).toMatchObject({ mean: -.5, n: 20 });
  expect(take.trust.value).toBe("unknown"); expect(cardResultKnown(table, "take")).toBe(true);
  expect(table.progress.take).toEqual([{ direction: "D", combo: "D:minimal", missing_before: 1, missing_after: 0, advanced: 1 }]);
  expect(table.long_term).toEqual([]); expect(JSON.stringify(table)).not.toContain("expected_win");
});
it("retains bounded partial paired rows and continues without re-running absolute samples", async () => {
  let now = 0; const runner = new Runner(() => { now += 10; }), engine = new V6CardResultsEngine(runner, () => now, 20), r = request();
  const first = await engine.evaluate(r, { fingerprint: "partial" }, 9);
  expect(first.immediate.every(row => row.samples === 2 && row.missing === 18)).toBe(true);
  expect(first.telemetry.pending_work).toBe(true);
  const later = await engine.evaluate(r, { fingerprint: "partial" }, 40);
  expect(later.immediate.every(row => row.samples === 20)).toBe(true);
  expect(runner.calls.map(c => c.range!.from)).toEqual([0, 2, 10, 18]);
  r.weights = { D: .1 }; await engine.evaluate(r, { fingerprint: "partial" }, 30);
  expect(runner.calls).toHaveLength(4);
  // A new published snapshot is still required, but identical complete simulator inputs reuse samples.
  await engine.evaluate(r, { fingerprint: "snapshot_changed" }, 9); expect(runner.calls).toHaveLength(4);
});
it("B is populated only by background calls and preserves original held-resource identity", async () => {
  const r = request(), original = r.prepare;
  r.targets.push({ ...r.targets[0]!, id: "future", kind: "future", act: 2 });
  r.prepare = vi.fn((target, s, option) => {
    if (target.kind !== "current") expect(option!.id).toBe("skip");
    return original(target, s, option);
  });
  const runner = new Runner(), engine = new V6CardResultsEngine(runner, () => 0, 8), context = { fingerprint: "B" };
  expect((await engine.evaluate(r, context)).long_term).toEqual([]);
  expect(r.prepare).toHaveBeenCalledTimes(2);
  await engine.precompute(r, context, 100);
  const before = runner.calls.length, warm = await engine.evaluate(r, context);
  expect(runner.calls).toHaveLength(before);
  expect(warm.long_term).toHaveLength(1); expect(warm.long_term[0]).toMatchObject({ target_id: "future", samples: 8, added_cards: [{ id: "A", upgraded: false }] });
  expect(warm.telemetry.long_term_cache).toBe("hit");
  expect((await engine.evaluate(r, { fingerprint: "changed" })).long_term).toEqual([]);
});
it("samples B before preparing all targets and rotates interrupted slices without losing cached rows", async () => {
  const r = request(), prepare = r.prepare;
  // Distinct targets must have distinct effective inputs; identical inputs intentionally share samples.
  r.prepare = (...args) => { const p = prepare(...args); if (p) p.input.solver.enemies[0]!.hp += args[0].act; return p; };
  r.targets.push(...[2, 3].map(act => ({ ...r.targets[0]!, id: `future${act}`, kind: "future" as const, act })));
  const controller = new AbortController(), runner = new Runner(() => controller.abort());
  const engine = new V6CardResultsEngine(runner, () => 0, 20), context = { fingerprint: "fair_B" };
  await engine.precompute(r, context, 100, controller.signal);
  expect(runner.calls).toHaveLength(1);
  expect(runner.calls[0]!.decks).toHaveLength(2); // Prepare one target, then promptly sample its baseline and core.
  expect(runner.calls[0]!.range).toEqual({ from: 0, to: 2 });
  const table = await engine.evaluate(r, context, 0);
  expect(table.long_term.map(row => [row.target_id, row.samples])).toEqual([["future2", 2]]);
  const before = runner.calls.length;
  await engine.precompute(r, context, 100, controller.signal);
  expect(runner.calls).toHaveLength(before);
  expect((await engine.evaluate(r, context, 0)).long_term).toEqual(table.long_term);
  const next = new AbortController();
  runner.run = vi.fn(async input => { const result = await Runner.prototype.run.call(runner, input); next.abort(); return result; });
  await engine.precompute(r, context, 100, next.signal);
  expect((await engine.evaluate(r, context, 0)).long_term.map(row => [row.target_id, row.samples]))
    .toEqual([["future2", 2], ["future3", 2]]);
});
it("samples a B core before constructing all 17 cold openings and resumes the next core", async () => {
  let now = 0; const r = request(), prepare = r.prepare;
  r.directions = Array.from({ length: 17 }, (_, i) => direction(`D${i}`, [req(`CORE${i}`)]));
  r.targets.push({ ...r.targets[0]!, id: "future2", kind: "future", act: 2 });
  r.prepare = (...args) => {
    now += 10; const p = prepare(...args);
    // These synthetic cores represent different combat inputs, rather than duplicate fixture decks.
    if (p && args[1].cards[0]) p.input.solver.enemies[0]!.hp += Number(args[1].cards[0].id.replace("CORE", "")) + 1;
    return p;
  };
  const engine = new V6CardResultsEngine(new Runner(() => { now += 20; }), () => now, 20), context = { fingerprint: "cold_17_B" };
  await engine.precompute(r, context, 35);
  expect((await engine.evaluate(r, context, 0)).long_term.map(row => [row.combo_id, row.samples])).toEqual([["D0:minimal", 2]]);
  await engine.precompute(r, context, 35);
  expect((await engine.evaluate(r, context, 0)).long_term.map(row => [row.combo_id, row.samples]))
    .toEqual([["D0:minimal", 2], ["D1:minimal", 2], ["D2:minimal", 0]]);
  expect(engine.peekCompletedCore(context.fingerprint)![2]!.unknown_reasons).toContain("background_sampling_budget_exhausted");
});
it("distinguishes unavailable prerequisites, resources and an exhausted preparation slice", async () => {
  const r = request(), base = r.directions[0]!;
  r.directions = [
    { ...base, combos: [{ ...base.combos[0]!, id: "unknown", prerequisiteResolution: "unknown" }] },
    { ...base, combos: [{ ...base.combos[0]!, id: "relic", requirements: [{ id: "needed_relic", count: 1, any: [{ kind: "relic", id: "ABSENT" }] }] }] },
  ];
  r.targets.push({ ...r.targets[0]!, id: "future", kind: "future", act: 2 });
  const engine = new V6CardResultsEngine(new Runner(), () => 0, 2);
  await engine.precompute(r, { fingerprint: "guard_reasons" }, 100);
  const rows = engine.peekCompletedCore("guard_reasons")!;
  expect(rows[0]!.unknown_reasons).toContain("core_prerequisite_resolution_unknown");
  expect(rows[1]!.unknown_reasons).toContain("core_required_resource_unavailable:needed_relic");
  expect(rows.every(row => row.metrics.hp_loss === null && !row.unknown_reasons.includes("opening_unavailable"))).toBe(true);
  let now = 0; const cold = request(), prepare = cold.prepare;
  cold.targets.push({ ...cold.targets[0]!, id: "future", kind: "future", act: 2 });
  cold.prepare = (...args) => { now += 20; return prepare(...args); };
  const coldEngine = new V6CardResultsEngine(new Runner(), () => now, 2);
  await coldEngine.precompute(cold, { fingerprint: "budget_reason" }, 10);
  expect(coldEngine.peekCompletedCore("budget_reason")![0]!.unknown_reasons).toContain("background_preparation_budget_exhausted");
});

it("does not turn capped, missing, or invalid continuous samples into deaths or survivals", () => {
  const r = request(), target = r.targets[0]!, prepared = r.prepare(target, r.baseline.state)!;
  const samples = [{ ...outcome(false), died: false, capped: true }, undefined, outcome(false)];
  const row = cardCombatRow("skip", target, prepared, samples, samples, r.trust(target), 4);
  expect(row).toMatchObject({ samples: 2, capped: 1, missing: 2, metrics: { hp_loss: { n: 2 }, death_rate: { mean: 1, n: 1 }, losing_enemy_hp_fraction: { mean: 20 / 120, n: 1 } } });
  const chain = cardCombatRow("skip", { ...target, kind: "chain" }, prepared, samples, samples, r.trust(target), 4);
  expect(chain.metrics.death_rate).toBeNull();
});
it("uses the sampled second Boss opening for the continuous losing-HP denominator", () => {
  const r = request(), target = { ...r.targets[0]!, kind: "chain" as const }, prepared = r.prepare(target, r.baseline.state)!;
  const input = structuredClone(prepared.input); input.solver.enemies[0]!.hp = 200;
  prepared.input.continuation = { variants: [{ boss: "SECOND", count: 1, input }], potions: [], source: "fixed", limitation: "fixed" };
  const sample: FightSampleResult = { ...outcome(false), sequence: { firstWon: true, firstDied: false, firstCapped: false, firstTimeUp: false,
    firstHp: 20, firstPotions: [], firstTurns: 4, secondBoss: "SECOND", secondWon: false, secondDied: true } };
  const row = cardCombatRow("skip", target, prepared, [sample, sample], [sample, sample], r.trust(target));
  expect(row.metrics.death_rate).toMatchObject({ mean: 1, n: 2 });
  expect(row.metrics.losing_enemy_hp_fraction).toMatchObject({ mean: 20 / input.solver.enemies.reduce((n, e) => n + e.hp, 0), n: 2 });
  const baseline = structuredClone(prepared);
  baseline.input.continuation!.variants[0]!.input.solver.enemies[0]!.hp = 400;
  const delta = cardCombatRow("take", target, prepared, [sample, sample], [sample, sample], r.trust(target), 100, baseline);
  expect(delta.paired_delta.losing_enemy_hp_fraction!.mean).toBeCloseTo(20 / 200 - 20 / 400);
});
it("retains remaining encounter HP above its opening HP instead of dropping phases or clamping the ratio", () => {
  const r = request(), target = r.targets[0]!, prepared = r.prepare(target, r.baseline.state)!;
  const sample = { ...outcome(false), enemyHpLeft: prepared.bossHp * 1.5 };
  const row = cardCombatRow("skip", target, prepared, [sample, sample], [sample, sample], r.trust(target));
  expect(row.metrics.losing_enemy_hp_fraction).toEqual({ mean: 1.5, se: 0, n: 2 });
  expect(row.labels).toContain("remaining_enemy_hp_includes_later_phases_and_spawns_not_clamped_to_one");
  const invalid = { ...sample, hpLoss: NaN, turns: Infinity, enemyHpLeft: NaN };
  const unknown = cardCombatRow("skip", target, prepared, [invalid], [invalid], r.trust(target));
  expect(unknown.metrics).toEqual({ hp_loss: null, turns: null, damage_per_turn: null, death_rate: { mean: 1, se: null, n: 1 }, losing_enemy_hp_fraction: null });
});
it("keeps illegal prerequisites or missing relics unknown, and adds only missing published cards", () => {
  const d = direction("D", [req("A", 2)]), c = d.combos[0]!;
  expect(completedCore(state(["A"]), d, c, 1)!.cards).toHaveLength(2);
  expect(completedCore(state(), d, { ...c, prerequisiteResolution: "unknown" }, 1)).toBeNull();
  expect(completedCore(state(), d, { ...c, requirements: [{ id: "relic", count: 1, any: [{ kind: "relic", id: "MISSING" }] }] }, 1)).toBeNull();
});
it("keeps the existing >=2 and configurable ratio gate using A only", async () => {
  vi.stubEnv("V6_BUILD", "on"); const r = request(), engine = new V6CardResultsEngine(new Runner(), () => 0, 8);
  const results = await engine.evaluate(r, { fingerprint: "gate" });
  const known = (id: string) => cardResultKnown(results, id);
  expect(constructionCoverage(["take", "skip"], undefined, undefined, known).reason).toBeNull();
  expect(constructionCoverage(["take", "skip", "x", "y", "z"], undefined, undefined, known).reason).toBe("known_ratio_below_threshold");
  expect(constructionCoverage(["take", "x"], undefined, undefined, known).reason).toBe("insufficient_known_options");
});
it("keeps Boss rows if an optional elite opening throws, with the failure retained in audit", async () => {
  const r = request(), target = { ...r.targets[0]!, id: "elite", kind: "elite" as const };
  const engine = new V6CardResultsEngine(new Runner(), () => 0, 2);
  const results = await engine.evaluate(r, { fingerprint: "failed_elite", eliteTargets: [target],
    prepareElite() { throw Error("fixed missing opening"); } });
  expect(cardResultKnown(results, "take")).toBe(true);
  expect(results.immediate.filter(row => row.target_id === "elite").every(row => row.unknown_reasons.includes("opening_builder_error:Error: fixed missing opening"))).toBe(true);
});
it("does not simulate or publish a playable unmodelled card as a blank measured option", async () => {
  const r = request(), prepare = r.prepare;
  r.prepare = (target, state, option) => {
    const result = prepare(target, state, option)!;
    if (state.cards.some(c => c.id === "A")) result.input.piles.draw.push({ ...result.input.piles.draw[0]!,
      cardId: "UNMODELLED_FIXTURE", key: "unsupported", playable: true, type: "Skill", known: false });
    return result;
  };
  const runner = new Runner(), engine = new V6CardResultsEngine(runner, () => 0, 8);
  const table = await engine.evaluate(r, { fingerprint: "unsupported" });
  expect(runner.calls.every(call => call.decks.every(deck => !deck.piles.draw.some(c => c.cardId === "UNMODELLED_FIXTURE")))).toBe(true);
  const row = table.immediate.find(row => row.option_id === "take")!;
  expect(row).toMatchObject({ samples: 0, metrics: { hp_loss: null, death_rate: null },
    paired_delta: { hp_loss: null, death_rate: null }, unknown_reasons: expect.arrayContaining(["unmodelled_card:UNMODELLED_FIXTURE"]) });
  expect(cardResultKnown(table, "take")).toBe(false); expect(cardResultKnown(table, "skip")).toBe(true);
  const prepared = r.prepare(r.targets[0]!, r.options[0]!.state)!;
  // Even stale externally supplied numbers cannot override the unsupported-card guard.
  const samples = [outcome(true), outcome(true)];
  expect(Object.values(cardCombatRow("take", r.targets[0]!, prepared, samples, samples, r.trust(r.targets[0]!)).metrics)
    .every(value => value === null)).toBe(true);
  // An unsupported baseline cannot provide a fabricated paired comparison for a supported option.
  const baseline = prepare(r.targets[0]!, r.baseline.state)!;
  const paired = cardCombatRow("skip", r.targets[0]!, baseline, samples, samples, r.trust(r.targets[0]!), 8, prepared);
  expect(paired.metrics.death_rate).toMatchObject({ mean: 0, n: 2 });
  expect(Object.values(paired.paired_delta).every(value => value === null)).toBe(true);
  expect(paired.unknown_reasons).toContain("baseline_unmodelled_card:UNMODELLED_FIXTURE");
});

it.each(["HP", "card face", "potion", "encounter", "continuation", "seed", "model"])(
  "does not reuse absolute samples after %s changes the effective rollout", async change => {
    const r = request(), runner = new Runner(), engine = new V6CardResultsEngine(runner, () => 0, 2);
    await engine.evaluate(r, { fingerprint: "before" }); const before = runner.calls.length, prepare = r.prepare;
    if (change === "seed") r.seed++;
    else if (change === "model") r.modelVersion += "changed";
    else r.prepare = (...args) => {
      const p = prepare(...args)!;
      if (change === "HP") p.input.solver.player.hp--;
      if (change === "card face") p.input.piles.draw[0]!.cost++;
      if (change === "potion") p.input.solver.potions = [{ key: "fixed-potion" }] as never;
      if (change === "encounter") p.input.solver.enemies[0]!.hp++;
      if (change === "continuation") p.input.continuation = { variants: [{ boss: "SECOND", count: 1,
        input: structuredClone(p.input) }], potions: [], source: "fixed", limitation: "fixed" };
      return p;
    };
    await engine.evaluate(r, { fingerprint: "after" }); expect(runner.calls.length).toBeGreaterThan(before);
  });
it("yields background serial slices to the original model response before starting another slice", async () => {
  const r = request(); r.targets.push({ ...r.targets[0]!, id: "future", kind: "future", act: 2 });
  const controller = new AbortController(), runner = new Runner();
  const engine = new V6CardResultsEngine(runner, () => 0, 100);
  const response = new Promise<void>(resolve => setImmediate(() => { controller.abort(); resolve(); }));
  await engine.precompute(r, { fingerprint: "io" }, 100, controller.signal); await response;
  expect(runner.calls).toHaveLength(1); expect(runner.calls[0]!.range).toEqual({ from: 0, to: 2 });
});
