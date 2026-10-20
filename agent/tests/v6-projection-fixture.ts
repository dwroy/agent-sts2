import type { BuildState, CoreTemplate, Requirement } from "../src/construction/types.js";
import { v6Directions, type V6CompletionSource } from "../src/sim/v6-completion.js";
import { v6Config } from "../src/v6/config.js";
import type { V6ProjectionRequest } from "../src/sim/v6-projection.js";
import type { DeckSimRunner, DeckRunRequest } from "../src/sim/build-sim-pool.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import { board } from "./boss-sim-fixture.js";
export const req = (id: string, count = 1, upgraded = false): Requirement => ({ id, count, any: [{ kind: "card", id, upgraded }] });
export function state(ids: string[] = [], gold = 0): BuildState { return { cards: ids.map(id => ({ id, upgraded: false })), relics: [], hp: 40, maxHp: 60, gold, floor: 5, cap: null }; }
export function direction(id = "D", requirements = [req("A")]) {
  const core: CoreTemplate = { id, name: id, character: "silent", ascensions: [10], status: "candidate", requirements,
    evidence: { runs: ["fixture"], source: "fixed", sha256: "fixed" }, limits: [] };
  return v6Directions("silent", 10, [core], null)[0]!;
}
export function outcome(won: boolean): FightSampleResult { return { won, died: !won, capped: false, timeUp: false, turns: 4, hpLoss: 20, revived: [], drunk: [], enemyHpLeft: won ? 0 : 20,
  lossByTurn: [], dmgByTurn: [], incomingByTurn: [], enemyLossByTurn: [], policyTurns: 4, policyNodes: 0, resources: { hp: won ? 20 : 0, revives: [], drunkKeys: [] } }; }
export class FixedRunner implements DeckSimRunner {
  calls: DeckRunRequest[] = [];
  async run(r: DeckRunRequest) { this.calls.push(r);
    const outcomes = r.decks.map((d, j) => [Array.from({ length: r.samples }, (_, i) => {
      const stripe = r.stripes?.[j]; if (stripe && i % stripe.of !== stripe.at) return undefined;
      const tag = d.meta?.enc ?? r.base.meta.enc;
      return outcome(tag === "completed" || i % 4 === 0);
    })]);
    return { outcomes, complete: Array.from({ length: r.samples }, (_, i) => i), timedOut: false, elapsedMs: 1, workers: 1 };
  }
}
export function source(probabilities = { skip: .5, take: .75 }, count = 1): V6CompletionSource {
  return { kind: "fixed", signature: "fixed", resolve(c) { return { source: "fixed", signature: "fixed", labels: [], combinations: Array.from({ length: count }, (_, j) => ({
    id: `k${j}`, source: "construction_adapter", requirements: [req("A")], summary: null, roles: {}, labels: [],
    availability: probabilities, supply: Object.fromEntries(Object.entries(probabilities).map(([id, p]) => [id, Array.from({ length: 200 }, (_, i) => i < 200 * p)])),
    samples: Array.from({ length: c.samples }, (_, i) => ({ id: `seed:${i}`, states: Object.fromEntries(c.options.map(o => [o.id, state(["A"])])) })),
    general: Array.from({ length: c.samples }, (_, i) => ({ id: `seed:${i}`, states: Object.fromEntries(c.options.map(o => [o.id, state(["G"])])) })),
  })) }; } };
}
export function request(): V6ProjectionRequest { return { config: v6Config({ V6_BUILD: "shadow" }), phase: "pick", character: "silent", ascension: 10, act: 1,
  baseline: { id: "skip", state: state() }, options: [{ id: "take", state: state(["A"]), card: { id: "A", upgraded: false } }], directions: [direction()], weights: { D: 1 },
  targets: [{ id: "boss", boss: "SOUL_FYSH", act: 1, floor: 16, kind: "current", probability: 1, labels: [] }], completionSources: [source()], seed: 42, modelVersion: "fixture", contextDigest: "held-resources",
  prepare(_t, s) { const b = board(); b.meta = { ...b.meta, enc: s.cards.some(c => c.id === "A") ? "completed" : "general" }; return { input: b, maxHp: 60, bossHp: 120, labels: [] }; },
  trust: () => ({ value: "unknown", labels: ["partial_model"] }) }; }

/** Minimal complete current-Boss row for consumer routing tests. */
export function knownCurrentRows(table: import("../src/sim/v6-projection.js").V6ProjectionTable, ids: readonly string[]): void {
  for (const option_id of ids) table.combinations.push({ combination_id: "fixture:combo", entry: {
    option_id, target_id: table.targets.find(t => t.kind === "current")!.id, direction_id: "fixture",
    availability: { take: .5, skip: .5 }, win_complete: { value: 1, se: 0, n: 20 }, expected_win: .5,
  } } as never);
}
