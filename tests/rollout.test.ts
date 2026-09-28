/**
 * Offline rollout (src/strategy/rollout.ts): deterministic under a seed, degrades to fit its time budget,
 * the gating math agrees with the builder's gates file, the features mirror the Python builder, and decision
 * code reaches it only through the combat facts (rollout-live.ts; tests/rollout-live.test.ts).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { CardModel } from "../src/strategy/card-model.js";
import {
  blend,
  calibrate,
  clockEstimate,
  featuresOf,
  gateFor,
  gateWeight,
  loadFightValueGates,
  rolloutDecision,
  selectCandidates,
  type EnemyTable,
  type FightMeta,
  type FightValueGates,
  type RolloutInput,
  type Snapshot,
} from "../src/strategy/rollout.js";
import { solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index,
    key: `c${index}`,
    cardId,
    name: cardId,
    type: "Attack",
    upgraded: false,
    cost: 1,
    xCost: false,
    playable: true,
    target: "single",
    validTargets: [0],
    damage: null,
    hits: 1,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: 0,
    heldPenalty: 0,
    text: "",
    ...overrides,
  };
}

const strike = (i: number) => card(i, "STRIKE", { damage: 6 });
const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 5 });
const bash = (i: number) => card(i, "BASH", { cost: 2, damage: 8, vulnerable: 2 });
const inflame = (i: number) => card(i, "INFLAME", { type: "Power", target: "self", validTargets: [], strength: 2, flatValue: 10 });

const META: FightMeta = {
  act: 1,
  t: 1,
  asc: 8,
  kind: "hallway",
  enc: "JAW_WORM",
  deck: { n: 10, atk: 5, skl: 4, pow: 1, junk: 0, dmg: 38, blk: 20, up: 0 },
  relics: 1,
  max_en: 3,
};

const TABLE: EnemyTable = {
  moves: { CHOMP: { damage: 11, hits: 1, strength: 0, block: 0 }, BELLOW: { damage: 0, hits: 1, strength: 3, block: 6 }, THRASH: { damage: 7, hits: 1, strength: 0, block: 5 } },
  next: { CHOMP: { BELLOW: 3, THRASH: 1 }, BELLOW: { THRASH: 2, CHOMP: 2 }, THRASH: { CHOMP: 1, BELLOW: 1 } },
};

function scenario(budgetMs: number, now?: () => number, seed = 7): RolloutInput {
  const hand = [strike(0), strike(1), defend(2), bash(3), inflame(4)];
  const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
  const enemy: EnemySim = { index: 0, name: "Jaw Worm", hp: 44, maxHp: 44, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 11, hits: 1 }] };
  const solver: SolverInput = { hand, player, enemies: [enemy], fightKind: "monster", turn: 1 };
  const plans = solveTurn(solver).plans;
  const draw = [strike(10), strike(11), strike(12), defend(13), defend(14), defend(15), bash(16), defend(17)];
  return {
    solver,
    plans,
    enemies: [{ index: 0, id: "JAW_WORM", move: "CHOMP", strength: 0, powers: {} }],
    tables: { JAW_WORM: TABLE },
    piles: { draw, discard: [], handBase: hand },
    meta: META,
    playerPowers: {},
    potions: 0,
    mm: {},
    model: null,
    gates: null,
    options: { budgetMs, seed, ...(now ? { now } : {}) },
  };
}

/** A fake clock: every read advances it by `step` ms (the policy's cost is what the budget sees). */
function fakeClock(step: number): () => number {
  let t = 0;
  return () => (t += step);
}

describe("rollout (offline)", () => {
  it("is deterministic under a seeded RNG", () => {
    const a = rolloutDecision(scenario(1e9, fakeClock(0.01)));
    const b = rolloutDecision(scenario(1e9, fakeClock(0.01)));
    expect(a.horizon).toBe(5);
    expect(a.samples).toBe(8);
    expect(a.degraded).toEqual([]);
    const pick = (r: typeof a) => r.lines.map((l) => [l.hpLoss, l.winProb, l.turnsToWin, l.value, l.oneTurn.value]);
    expect(pick(a)).toEqual(pick(b));
    expect(a.lines.length).toBeGreaterThan(1);
    for (const line of a.lines) {
      expect(line.horizon).toBe(5);
      expect(line.samples).toBe(8);
      expect(line.basis.rolloutSamples).toBe(8);
      expect(line.winProb).toBeGreaterThanOrEqual(0);
      expect(line.winProb).toBeLessThanOrEqual(1);
      // Expected HP loss counts at least what the line itself costs on our own turn.
      expect(line.hpLoss).toBeGreaterThanOrEqual(Math.max(0, line.plan.outcome.hpLoss - line.plan.outcome.incomingAfterBlock) - 1e-9);
    }
    // A different seed draws different cards: some estimate moves.
    const c = rolloutDecision(scenario(1e9, fakeClock(0.01), 99));
    expect(pick(c)).not.toEqual(pick(a));
  });

  it("a Decimillipede segment killed alone reattaches: the fight is not over (63CP F25)", () => {
    const run = (reattach: boolean) => {
      const input = scenario(1e9, fakeClock(0.01));
      const seg = (index: number, hp: number): EnemySim => ({
        index, name: `Segment ${index}`, hp, maxHp: 60, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false,
        attacks: [{ damage: 6, hits: 1 }], ...(reattach ? { reattach: true, reattachHp: 25 } : {}),
      });
      const solver: SolverInput = { ...input.solver, enemies: [seg(0, 5), seg(1, 40)], fightKind: "elite" };
      const table: EnemyTable = { moves: { BITE: { damage: 6, hits: 1, strength: 0, block: 0 } }, next: { BITE: { BITE: 1 } } };
      return rolloutDecision({
        ...input,
        solver,
        plans: solveTurn(solver).plans,
        enemies: [0, 1].map((index) => ({ index, id: "DECIMILLIPEDE", move: "BITE", strength: 0, powers: {} })),
        tables: { DECIMILLIPEDE: table },
      });
    };
    const mean = (r: ReturnType<typeof run>, f: (l: (typeof r.lines)[number]) => number) => r.lines.reduce((a, l) => a + f(l), 0) / r.lines.length;
    const plain = run(false);
    const joined = run(true);
    expect(mean(joined, (l) => l.winProb)).toBeLessThan(mean(plain, (l) => l.winProb));
    expect(mean(joined, (l) => l.hpLoss)).toBeGreaterThan(mean(plain, (l) => l.hpLoss));
  });

  it("when every sample dies, there are no turns to win: deaths and the turn of death instead (69HW F33)", () => {
    const input = scenario(1e9, fakeClock(0.01));
    const solver: SolverInput = {
      ...input.solver,
      player: { ...input.solver.player, hp: 12 },
      enemies: [{ ...input.solver.enemies[0]!, hp: 300, maxHp: 300, attacks: [{ damage: 30, hits: 1 }] }],
    };
    const table: EnemyTable = { moves: { SLAM: { damage: 30, hits: 1, strength: 0, block: 0 } }, next: { SLAM: { SLAM: 1 } } };
    const r = rolloutDecision({ ...input, solver, plans: solveTurn(solver).plans, enemies: [{ index: 0, id: "BIG", move: "SLAM", strength: 0, powers: {} }], tables: { BIG: table } });
    for (const line of r.lines) {
      expect(line.deaths).toBe(line.samples);
      expect(line.turnsToWin).toBeNull();
      expect(line.turnsToDeath).toBeGreaterThanOrEqual(1);
    }
  });

  it("degrades to fit the time budget: 5 turns, then 3, then fewer samples, then 1 turn", () => {
    const run = (budget: number) => rolloutDecision(scenario(budget, fakeClock(1)));
    const full = run(1e9);
    expect([full.horizon, full.samples]).toEqual([5, 8]);
    // Measure the cost of one full wave, then budgets that force each step down.
    const wave = run(1e9);
    const perSampleFull = wave.elapsedMs / 8;
    const three = run(perSampleFull * 6);
    expect(three.horizon).toBe(3);
    expect(three.degraded).toContain("horizon 3");
    const fewer = run(perSampleFull * 2.2);
    expect(fewer.horizon).toBe(3);
    expect(fewer.samples).toBeLessThan(8);
    const tiny = run(1);
    expect([tiny.horizon, tiny.samples]).toEqual([1, 1]);
    expect(tiny.degraded).toContain("1-turn");
    for (const line of tiny.lines) {
      expect(line.basis.rolloutSamples).toBe(0);
      expect(line.hpLoss).toBeCloseTo(line.oneTurn.hpLoss);
    }
    // Work shrinks with the budget.
    expect(full.policyTurns).toBeGreaterThan(three.policyTurns);
    expect(three.policyTurns).toBeGreaterThanOrEqual(fewer.policyTurns);
  });

  it("picks the top lines plus the most damage, least HP lost and most setup", () => {
    const input = scenario(1e9);
    const picked = selectCandidates(input.plans, 2);
    const tags = picked.flatMap((p) => p.tags);
    expect(tags.filter((t) => t === "top")).toHaveLength(2);
    expect(tags).toEqual(expect.arrayContaining(["damage", "safe", "setup"]));
    const damage = picked.find((p) => p.tags.includes("damage"))!.plan;
    expect(damage.outcome.damageDealt).toBe(Math.max(...input.plans.map((p) => p.outcome.damageDealt)));
    const safe = picked.find((p) => p.tags.includes("safe"))!.plan;
    expect(safe.outcome.hpLoss).toBe(Math.min(...input.plans.map((p) => p.outcome.hpLoss)));
    expect(new Set(picked.map((p) => p.plan)).size).toBe(picked.length);
  });

  it("gating math: zero until the advantage is established, smooth in n and the lower bound", () => {
    const params = { n0: 100, a_full: 0.02 };
    expect(gateWeight(0, 0.1, 1, params)).toBe(0);
    expect(gateWeight(500, 0, 1, params)).toBe(0);
    expect(gateWeight(500, -0.05, 1, params)).toBe(0);
    expect(gateWeight(500, 0.02, 0.75, params)).toBeCloseTo(0.75 * (500 / 600));
    expect(gateWeight(500, 0.5, 1, params)).toBeCloseTo(500 / 600);
    const ws = [0.002, 0.005, 0.01, 0.015].map((lcb) => gateWeight(300, lcb, 1, params));
    for (let i = 1; i < ws.length; i += 1) expect(ws[i]!).toBeGreaterThan(ws[i - 1]!);
    expect(gateWeight(50, 0.03, 1, params)).toBeLessThan(gateWeight(400, 0.03, 1, params));
    expect(blend(0.25, -10, -30)).toBeCloseTo(-25);
  });

  it("backs off from a thin encounter to act x kind, then kind, then global", () => {
    const seg = (w: number, n: number, uses: string) => ({ level: "enc" as const, n_pairs: n * 3, n_rows: n, conc_current: 0.6, conc_model: 0.62, w_cap: 0.75, advantage: 0.02, ci: [0.01, 0.03] as [number, number], w, uses });
    const gates: FightValueGates = {
      params: { min_rows: 120, n0: 100, a_full: 0.02, death_hp: 40, grid: [0.25, 0.5, 0.75, 1] },
      calibration: {},
      segments: {
        "enc:BIG": seg(0.6, 400, "enc:BIG"),
        "enc:THIN": seg(0.4, 20, "ak:1|hallway"),
        "ak:1|hallway": { ...seg(0.4, 900, "ak:1|hallway"), level: "ak" },
        "ak:3|boss": { ...seg(0, 30, "k:boss"), level: "ak" },
        "k:boss": { ...seg(0, 800, "k:boss"), level: "k" },
        global: { ...seg(0.2, 5000, "global"), level: "global" },
      },
    };
    expect(gateFor(gates, "BIG", 1, "hallway")).toMatchObject({ segment: "enc:BIG", w: 0.6, n: 400 });
    expect(gateFor(gates, "THIN", 1, "hallway")).toMatchObject({ segment: "ak:1|hallway", w: 0.4, n: 900 });
    expect(gateFor(gates, "NEVER_SEEN", 1, "hallway")).toMatchObject({ segment: "ak:1|hallway", w: 0.4 });
    expect(gateFor(gates, "NEVER_SEEN", 3, "boss")).toMatchObject({ segment: "k:boss", w: 0 });
    expect(gateFor(gates, "NEVER_SEEN", 2, "boss")).toMatchObject({ segment: "k:boss", w: 0 });
    expect(gateFor(gates, "NEVER_SEEN", 9, "elite")).toMatchObject({ segment: "global", w: 0.2 });
    expect(gateFor(null, "BIG", 1, "hallway").w).toBe(0);
  });

  it("the committed gates file is consistent with gateWeight and its own backoff", () => {
    const gates = loadFightValueGates();
    expect(gates).not.toBeNull();
    const g = gates!;
    expect(Object.keys(g.segments)).toContain("global");
    for (const [key, seg] of Object.entries(g.segments)) {
      const used = g.segments[seg.uses]!;
      expect(used, key).toBeDefined();
      expect(used.uses).toBe(seg.uses);
      if (seg.uses === key && seg.level === "enc") expect(seg.n_rows).toBeGreaterThanOrEqual(g.params.min_rows);
      expect(seg.w).toBeCloseTo(gateWeight(used.n_rows, used.ci[0] ?? 0, used.w_cap, g.params), 3);
      expect(seg.w).toBeGreaterThanOrEqual(0);
      expect(seg.w).toBeLessThanOrEqual(1);
      if ((used.ci[0] ?? 0) <= 0) expect(seg.w).toBe(0);
    }
    for (const kind of ["hallway", "elite", "boss"]) {
      const cal = g.calibration[kind];
      expect(cal).toBeDefined();
      let last = -1;
      for (let p = 0.01; p < 1; p += 0.01) {
        const c = calibrate(cal, p);
        expect(c).toBeGreaterThanOrEqual(last - 1e-9);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
        last = c;
      }
    }
  });

  it("calibrates: none, isotonic knots (linear, flat outside), Platt", () => {
    expect(calibrate({ method: "none" }, 0.37)).toBe(0.37);
    const iso = { method: "isotonic" as const, knots: [[0.2, 0.1], [0.6, 0.5], [0.9, 0.8]] as [number, number][] };
    expect(calibrate(iso, 0.1)).toBe(0.1);
    expect(calibrate(iso, 0.4)).toBeCloseTo(0.3);
    expect(calibrate(iso, 0.95)).toBe(0.8);
    expect(calibrate({ method: "platt", ab: [1, 0] }, 0.3)).toBeCloseTo(0.3);
    expect(calibrate({ method: "platt", ab: [0.5, 0] }, 0.9)).toBeLessThan(0.9);
  });

  it("computes the builder's features for logged end-of-turn rows", () => {
    const fv = JSON.parse(readFileSync(join(ROOT, "src/knowledge/fight-value.json"), "utf8")) as {
      feature_examples: { row: FightMeta & { E: Snapshot }; features: Record<string, number> }[];
    };
    const mm = JSON.parse(readFileSync(join(ROOT, "src/knowledge/move-model.json"), "utf8"));
    expect(fv.feature_examples.length).toBeGreaterThan(0);
    for (const example of fv.feature_examples) {
      const f = featuresOf(example.row, example.row.E, mm);
      for (const [name, value] of Object.entries(example.features)) expect(f[name], name).toBeCloseTo(value, 4);
      expect(Object.keys(f).sort()).toEqual(Object.keys(example.features).sort());
    }
  });

  it("the clock estimate: no loss once every enemy is dead, more loss with more enemy HP", () => {
    const snap = (hp: number): Snapshot => ({ hp: 50, mhp: 80, blk: 0, en: 0, pw: {}, hand: 3, pots: 0, E: [[0, "JAW_WORM", hp, 44, 0, hp > 0, false, 11, "CHOMP", {}]] });
    const mm = { JAW_WORM: { next: { CHOMP: { BELLOW: 1 } }, damage: { BELLOW: 0, CHOMP: 11 } } };
    expect(clockEstimate(featuresOf(META, snap(0), mm)).hpLoss).toBe(0);
    const low = clockEstimate(featuresOf(META, snap(10), mm));
    const high = clockEstimate(featuresOf(META, snap(44), mm));
    expect(high.hpLoss).toBeGreaterThanOrEqual(low.hpLoss);
  });

  it("reaches decision code only through rollout-live.ts, and that only from the combat question's facts", () => {
    const importers = (module: string): string[] => {
      const found: string[] = [];
      const walk = (dir: string): void => {
        for (const name of readdirSync(dir)) {
          const path = join(dir, name);
          if (statSync(path).isDirectory()) walk(path);
          else if (path.endsWith(".ts") && new RegExp(`from "[./]*(strategy/)?${module}\\.js"`).test(readFileSync(path, "utf8"))) found.push(path.slice(ROOT.length + 1));
        }
      };
      walk(join(ROOT, "src"));
      return found.sort();
    };
    expect(importers("rollout")).toEqual(["src/strategy/rollout-live.ts"]);
    expect(importers("rollout-live")).toEqual(["src/screens/combat-plan.ts"]);
  });
});
