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
  turnSpreads,
  type TurnRecord,
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

  it("a burrowed Tunneler keeps its block in later turns, and breaking it stuns Below (RWWG F20)", () => {
    const TUNNELER: EnemyTable = {
      moves: {
        BELOW_MOVE: { damage: 23, hits: 1, strength: 0, block: 0 },
        BITE_MOVE: { damage: 13, hits: 1, strength: 0, block: 0 },
        BURROW_MOVE: { damage: 0, hits: 1, strength: 0, block: 32, burrows: true },
      },
      next: { BELOW_MOVE: { BELOW_MOVE: 99, BITE_MOVE: 63 }, BITE_MOVE: { BURROW_MOVE: 1 }, BURROW_MOVE: { BELOW_MOVE: 1 }, STUNNED: { BITE_MOVE: 1 } },
    };
    const run = (block: number, burrowed: boolean, hand: CardModel[]) => {
      const input = scenario(1e9, fakeClock(0.01));
      const solver: SolverInput = {
        ...input.solver,
        hand,
        player: { ...input.solver.player, hp: 90, maxHp: 90 },
        enemies: [{ index: 0, name: "Tunneler", hp: 13, maxHp: 87, block, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 23, hits: 1 }], ...(burrowed ? { burrowed: true } : {}) }],
      };
      return rolloutDecision({
        ...input,
        solver,
        plans: solveTurn(solver).plans,
        piles: { draw: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (i % 2 ? defend(10 + i) : strike(10 + i))), discard: [], handBase: hand },
        enemies: [{ index: 0, id: "TUNNELER", move: "BELOW_MOVE", strength: 0, powers: burrowed ? { BURROWED_POWER: 1 } : {} }],
        tables: { TUNNELER },
        options: { budgetMs: 1e9, seed: 7, now: fakeClock(0.01), k: 8 },
      });
    };
    // Pure block against 37 block: the 32+ it keeps stays up, 13 HP is not "~2 turns to the end".
    const blockHand = [defend(0), defend(1), defend(2), defend(3), defend(4)];
    const kept = run(37, true, blockHand).lines[0]!;
    const plain = run(37, false, blockHand).lines[0]!;
    expect(plain.turnsToWin).not.toBeNull();
    // Seed 7: dropped block wins 8/8 in ~2.5 turns losing 10; kept block wins 0/8 in 5 turns, losing ~49.
    expect(plain.wins).toBe(plain.samples);
    expect(plain.turnsToWin!).toBeLessThanOrEqual(3);
    expect(kept.wins).toBeLessThan(plain.wins);
    expect(kept.turnsToWin === null || kept.turnsToWin >= 4).toBe(true);
    expect(kept.hpLoss).toBeGreaterThan(plain.hpLoss + 20);
    // Breaking the block stuns it: Below 23 does not land, and it surfaces (Bite, then Burrow again).
    const strikes = [strike(0), strike(1), strike(2), defend(3), defend(4)];
    const broken = run(12, true, strikes);
    const line = broken.lines.find((l) => l.plan.outcome.enemyHpAfter[0]!.block === 0)!;
    expect(line).toBeDefined();
    expect(line.plan.outcome.incomingAfterBlock).toBe(0);
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

  it("the Sandpit counts down across rollout turns: at 0 every sample is eaten (LXB3 F33)", () => {
    const run = (sandpit: number | undefined) => {
      const input = scenario(1e9, fakeClock(0.01));
      const solver: SolverInput = {
        ...input.solver,
        player: { ...input.solver.player, hp: 80 },
        enemies: [{ ...input.solver.enemies[0]!, hp: 300, maxHp: 300, attacks: [{ damage: 3, hits: 1 }], ...(sandpit ? { sandpit } : {}) }],
      };
      const table: EnemyTable = { moves: { NIBBLE: { damage: 3, hits: 1, strength: 0, block: 0 } }, next: { NIBBLE: { NIBBLE: 1 } } };
      return rolloutDecision({ ...input, solver, plans: solveTurn(solver).plans, enemies: [{ index: 0, id: "WORM", move: "NIBBLE", strength: 0, powers: {} }], tables: { WORM: table } });
    };
    for (const line of run(3).lines) {
      expect(line.deaths).toBe(line.samples);
      expect(line.turnsToDeath).toBeLessThanOrEqual(3);
    }
    for (const line of run(undefined).lines) expect(line.deaths).toBe(0);
  });

  it("expected further HP loss never exceeds the HP we have (GG0Y F33)", () => {
    const input = scenario(1e9, fakeClock(0.01));
    const solver: SolverInput = {
      ...input.solver,
      player: { ...input.solver.player, hp: 20 },
      enemies: [{ ...input.solver.enemies[0]!, hp: 400, maxHp: 400, attacks: [{ damage: 4, hits: 1 }] }],
    };
    const table: EnemyTable = { moves: { POKE: { damage: 4, hits: 1, strength: 0, block: 0 } }, next: { POKE: { POKE: 1 } } };
    const r = rolloutDecision({ ...input, solver, plans: solveTurn(solver).plans, enemies: [{ index: 0, id: "WALL", move: "POKE", strength: 0, powers: {} }], tables: { WALL: table } });
    for (const line of r.lines) expect(line.hpLoss).toBeLessThanOrEqual(20 + 1e-9);
  });

  it("an illusion killed comes back at full HP: the fight goes on until the real enemy dies (FA82 F27)", () => {
    const run = (illusion: boolean) => {
      const input = scenario(1e9, fakeClock(0.01));
      const solver: SolverInput = {
        ...input.solver,
        enemies: [
          { ...input.solver.enemies[0]!, index: 0, name: "Obscura", hp: 90, maxHp: 90, attacks: [] },
          { ...input.solver.enemies[0]!, index: 1, name: "Parafright", hp: 1, maxHp: 21, attacks: [{ damage: 12, hits: 1 }], ...(illusion ? { illusion: true } : {}) },
        ],
      };
      const still: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
      const bite: EnemyTable = { moves: { HIT: { damage: 12, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
      return rolloutDecision({ ...input, solver, plans: solveTurn(solver).plans, enemies: [{ index: 0, id: "OBSCURA", move: "WAIT", strength: 0, powers: {} }, { index: 1, id: "PARAFRIGHT", move: "HIT", strength: 0, powers: {} }], tables: { OBSCURA: still, PARAFRIGHT: bite } });
    };
    const mean = (r: ReturnType<typeof run>) => r.lines.reduce((a, l) => a + l.hpLoss, 0) / r.lines.length;
    expect(mean(run(true))).toBeGreaterThan(mean(run(false)));
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

describe("Waterfall Giant explodes when killed (N7SAK F17: killed on T14 at eruption 51, dead on T15)", () => {
  const giant = (hp: number, eruption: number): EnemySim => ({
    index: 0, name: "Waterfall Giant", hp, maxHp: 240, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, eruption, attacks: [{ damage: 10, hits: 1 }],
  });

  it("the solver: a kill is not a win; the outcome carries the blast at the end of the next turn", () => {
    const player: PlayerSim = { hp: 24, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false };
    const result = solveTurn({ hand: [strike(0), strike(1), defend(2)], player, enemies: [giant(10, 51)], fightKind: "boss", turn: 14 });
    const kill = result.plans.find((plan) => plan.outcome.kills.length > 0)!;
    expect(kill).toBeDefined();
    expect(kill.outcome.winsFight).toBe(false);
    expect(kill.outcome.explodesNext).toBe(51);
    // No Steam Eruption: a kill is a win as before.
    const plain = solveTurn({ hand: [strike(0), strike(1), defend(2)], player, enemies: [giant(10, 0)], fightKind: "boss", turn: 14 });
    expect(plain.plans[0]!.outcome.winsFight).toBe(true);
    expect(plain.plans[0]!.outcome.explodesNext).toBeUndefined();
  });

  it("the rollout: the kill line lives only if next turn's hand blocks the blast; a small blast is a win next turn", () => {
    const run = (hp: number, eruption: number, draw: CardModel[]) => {
      const player: PlayerSim = { hp, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
      const hand = [strike(0), strike(1), defend(2)];
      const solver: SolverInput = { hand, player, enemies: [giant(10, eruption)], fightKind: "boss", turn: 14 };
      const plans = solveTurn(solver).plans;
      const kill = plans.find((plan) => plan.outcome.kills.length > 0)!;
      const result = rolloutDecision({
        solver, plans, enemies: [{ index: 0, id: "WATERFALL_GIANT", move: "RAM", strength: 0, powers: { STEAM_ERUPTION_POWER: eruption } }],
        tables: {}, piles: { draw, discard: [], handBase: hand }, meta: { ...META, kind: "boss", enc: "WATERFALL_GIANT", t: 14 }, playerPowers: {}, potions: 0, mm: {},
        model: null, gates: null, options: { budgetMs: 10_000, seed: 3, include: [kill] },
      });
      return result.lines.find((line) => line.plan === kill)!;
    };
    // 24 HP, a 51 blast, next hand all Strikes: dead in every sample (the old rollout: "win 100%").
    const dead = run(24, 51, Array.from({ length: 10 }, (_, i) => strike(20 + i)));
    expect(dead.wins).toBe(0);
    expect(dead.deaths).toBe(dead.samples);
    // A 20 blast at 24 HP: survived, the fight is over after the next turn.
    const safe = run(24, 20, Array.from({ length: 10 }, (_, i) => strike(20 + i)));
    expect(safe.deaths).toBe(0);
    expect(safe.wins).toBe(safe.samples);
    // 40 HP, 51 blast, next hand of Defends (3 energy: 15 block): 40 + 15 > 51, lived through.
    const blocked = run(40, 51, Array.from({ length: 10 }, (_, i) => defend(20 + i)));
    expect(blocked.deaths).toBe(0);
  });
});

describe("the rollout policy's later turns hold the potions like 0-cost cards (Dai 2026-09-28)", () => {
  it("a Fire Potion kept this turn is drunk by a later policy turn when its best line uses it", () => {
    const fire: CardModel = card(100, "POTION:FIRE_POTION:0", { type: "Potion", cost: 0, damage: 20, exhausts: true });
    const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
    const enemy: EnemySim = { index: 0, name: "Jaw Worm", hp: 20, maxHp: 44, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 5, hits: 1 }] };
    const hand = [defend(0), defend(1), defend(2), fire];
    const solver: SolverInput = { hand, player, enemies: [enemy], fightKind: "monster", turn: 1 };
    const plans = solveTurn(solver).plans;
    // This turn's potion-free line keeps it; every later hand is Defends, so only the potion can kill.
    const keep = plans.find((plan) => !plan.steps.some((step) => step.cardId.startsWith("POTION:")) && plan.steps.length > 0)!;
    const input: RolloutInput = {
      solver, plans, enemies: [{ index: 0, id: "JAW_WORM", move: "CHOMP", strength: 0, powers: {} }], tables: {},
      piles: { draw: Array.from({ length: 12 }, (_, i) => defend(20 + i)), discard: [], handBase: hand }, meta: META, playerPowers: {}, potions: 1, mm: {},
      model: null, gates: null, options: { budgetMs: 10_000, seed: 5, include: [keep], horizon: 3, samples: 2 },
    };
    const line = rolloutDecision(input).lines.find((entry) => entry.plan === keep)!;
    expect(line.wins).toBe(line.samples);
    expect(line.turnsToWin).toBe(2);
  });
});

describe("a phase boss revives into its real later phases (FSPK F48: Test Subject A8 111/212/313, the monster DB)", () => {
  it("laterPhaseHps: the phases after the current one, by the nearest phase HP; an unknown reviver gets one at 1.5x", async () => {
    const { laterPhaseHps } = await import("../src/strategy/boss-clock.js");
    // Phase 3 at A8 is logged now (313; it was assumed ~318).
    expect(laterPhaseHps(111, 8)).toEqual([212, 313]);
    expect(laterPhaseHps(212, 8)).toEqual([313]);
    expect(laterPhaseHps(100, 0)).toEqual([200, 300]);
    expect(laterPhaseHps(200, 0)).toEqual([300]);
    expect(laterPhaseHps(300, 0)).toEqual([]);
    expect(laterPhaseHps(60, 0)).toEqual([90]);
  });

  it("the rollout plays phase 2 at 212 and phase 3 at 313, not one more phase at the current 111", () => {
    const big = (i: number) => card(i, "BIG", { damage: 120, cost: 1 });
    const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
    const boss: EnemySim = { index: 0, name: "Test Subject", hp: 10, maxHp: 111, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, revives: true, attacks: [] };
    const hand = [big(0), defend(1), defend(2)];
    const solver: SolverInput = { hand, player, enemies: [boss], fightKind: "boss", turn: 5 };
    const plans = solveTurn(solver).plans;
    const kill = plans.find((plan) => plan.outcome.kills.length > 0)!;
    expect(kill.outcome.winsFight).toBe(false);
    const line = rolloutDecision({
      solver, plans, enemies: [{ index: 0, id: "TEST_SUBJECT", move: null, strength: 0, powers: { ADAPTABLE_POWER: 1 } }], tables: {},
      piles: { draw: Array.from({ length: 20 }, (_, i) => big(20 + i)), discard: [], handBase: hand }, meta: { ...META, kind: "boss", enc: "TEST_SUBJECT", asc: 8 },
      playerPowers: {}, potions: 0, mm: {}, model: null, gates: null, options: { budgetMs: 10_000, seed: 2, include: [kill], horizon: 5, samples: 8 },
    }).lines.find((entry) => entry.plan === kill)!;
    // T1 kills phase 1; T2 (360 damage) kills phase 2 (212, not 111: that alone would end the fight on T2);
    // phase 3 (313) starts Intangible (Nemesis): T3's three hits deal 1 each; T4 kills it.
    expect(line.wins).toBe(line.samples);
    expect(line.turnsToWin).toBe(4);
    expect(line.perTurn[0]!.dmg.mean).toBe(212);
    expect(line.perTurn[1]!.dmg.mean).toBe(3);
    expect(line.perTurn[2]!.dmg.mean).toBe(310);
  });

  it("Nemesis: Intangible every other turn in phase 3 (VQKX F48 T6: \"win 88%\" with Intangible never coming back)", () => {
    const big = (i: number) => card(i, "BIG", { damage: 100, cost: 1 });
    const player: PlayerSim = { hp: 200, maxHp: 200, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
    const run = (intangible: boolean) => {
      const boss: EnemySim = { index: 0, name: "Test Subject", hp: 600, maxHp: 600, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible, attacks: [] };
      const hand = [big(0), big(1), big(2)];
      const solver: SolverInput = { hand, player, enemies: [boss], fightKind: "boss", turn: 6 };
      const plans = solveTurn(solver).plans;
      const all = plans.find((plan) => plan.steps.length === 3)!;
      return rolloutDecision({
        solver, plans, enemies: [{ index: 0, id: "TEST_SUBJECT", move: null, strength: 0, powers: { NEMESIS_POWER: 1, ...(intangible ? { INTANGIBLE_POWER: 1 } : {}) } }], tables: {},
        piles: { draw: Array.from({ length: 30 }, (_, i) => big(20 + i)), discard: [], handBase: hand }, meta: { ...META, kind: "boss", enc: "TEST_SUBJECT", asc: 8 },
        playerPowers: {}, potions: 0, mm: {}, model: null, gates: null, options: { budgetMs: 10_000, seed: 3, include: [all], horizon: 5, samples: 8 },
      }).lines.find((entry) => entry.plan === all)!;
    };
    // Not Intangible now (T6): 300 now, Intangible next turn (3), 300 after: dead on the third turn.
    const now = run(false);
    expect(now.plan.outcome.damageDealt).toBe(300);
    expect(now.plan.outcome.damageDealt).toBe(300);
    expect(now.turnsToWin).toBe(3);
    // Intangible now (T5): 3 now, 300, 3, 300: dead on the fourth turn, not the third.
    const later = run(true);
    expect(later.plan.outcome.damageDealt).toBe(3);
    expect(later.perTurn[0]!.dmg.mean).toBe(300);
    expect(later.perTurn[1]!.dmg.mean).toBe(3);
    expect(later.turnsToWin).toBe(4);
  });
});

describe("cards a line exhausts leave the rollout's piles (FSPK F48 T1: Fiend Fire's hand came back)", () => {
  const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
  const dummy: EnemySim = { index: 0, name: "Dummy", hp: 500, maxHp: 500, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };
  const run = (hand: CardModel[], line: (plan: { steps: { cardId: string }[] }) => boolean) => {
    const solver: SolverInput = { hand, player, enemies: [dummy], fightKind: "boss", turn: 1 };
    const plans = solveTurn(solver).plans;
    const plan = plans.find(line)!;
    const result = rolloutDecision({
      solver, plans, enemies: [{ index: 0, id: "DUMMY", move: null, strength: 0, powers: {} }], tables: {},
      piles: { draw: [], discard: [], handBase: hand }, meta: { ...META, kind: "boss", enc: "DUMMY" }, playerPowers: {}, potions: 0, mm: {},
      model: null, gates: null, options: { budgetMs: 10_000, seed: 4, include: [plan], horizon: 3, samples: 2 },
    });
    return { plan, line: result.lines.find((entry) => entry.plan === plan)! };
  };

  it("Fiend Fire alone: the four Strikes it burns are not drawn again next turn", () => {
    const fiend = card(0, "FIEND_FIRE", { cost: 2, damage: 7, exhausts: true, special: "fiend_fire" });
    const hand = [fiend, strike(1), strike(2), strike(3), strike(4)];
    const { plan, line } = run(hand, (p) => p.steps.length === 1 && p.steps[0]!.cardId === "FIEND_FIRE");
    expect(plan.outcome.exhausted?.sort()).toEqual([1, 2, 3, 4]);
    // Nothing left to draw: turn 2 deals nothing (it drew the burnt Strikes back before: 18).
    expect(line.perTurn[0]!.dmg.mean).toBe(0);
  });

  it("a random exhaust (plain True Grit) takes one unplayed card out; the rest is discarded and drawn again", () => {
    const grit = card(0, "TRUE_GRIT", { type: "Skill", target: "self", validTargets: [], block: 7, randomExhaust: true });
    const hand = [grit, strike(1), strike(2)];
    const { plan, line } = run(hand, (p) => p.steps.length === 1 && p.steps[0]!.cardId === "TRUE_GRIT");
    expect(plan.outcome.randomExhausts).toBe(1);
    // One Strike comes back next turn (6), not both (12).
    expect(line.perTurn[0]!.dmg.mean).toBe(6);
  });
});

describe("turnSpreads (per-turn rollout facts)", () => {
  const rec = (loss: number, dmg: number, flags: { won?: boolean; died?: boolean } = {}): TurnRecord =>
    ({ loss, enemyPart: 0, dmg, snap: {} as Snapshot, won: flags.won ?? false, died: flags.died ?? false });
  it("turns 2..h: mean and min-max over the samples still fighting, alive and won counts over all", () => {
    const spreads = turnSpreads(
      [
        [rec(3, 10), rec(4, 12), rec(2, 20, { won: true })],
        [rec(3, 10), rec(10, 6), rec(30, 0, { died: true })],
        [rec(3, 10), rec(0, 30, { won: true })],
      ],
      3,
    );
    expect(spreads).toHaveLength(2);
    expect(spreads[0]).toMatchObject({ turn: 2, fighting: 3, alive: 3, won: 1, loss: { min: 0, max: 10 }, dmg: { min: 6, max: 30 } });
    expect(spreads[0]!.loss.mean).toBeCloseTo(14 / 3);
    expect(spreads[1]).toMatchObject({ turn: 3, fighting: 2, alive: 2, won: 2, loss: { mean: 16, min: 2, max: 30 } });
  });
});

describe("powers played in the line stay up in later rollout turns (0B5Y F33 T1: Inferno ignored after T1)", () => {
  const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
  const dummy: EnemySim = { index: 0, name: "Dummy", hp: 500, maxHp: 500, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };
  const inferno = (i: number) => card(i, "INFERNO", { type: "Power", target: "self", validTargets: [], inferno: 6, powerAmount: 6, flatValue: 10 });
  const mantle = (i: number) => card(i, "CRIMSON_MANTLE", { type: "Power", target: "self", validTargets: [], special: "crimson_mantle", powerAmount: 7, flatValue: 10 });
  const run = (hand: CardModel[], ids: string[]) => {
    const solver: SolverInput = { hand, player, enemies: [dummy], fightKind: "boss", turn: 1 };
    const plans = solveTurn(solver).plans;
    const plan = plans.find((p) => p.steps.map((s) => s.cardId).join(",") === ids.join(","))!;
    expect(plan).toBeDefined();
    const draw = Array.from({ length: 10 }, (_, k) => strike(20 + k));
    const result = rolloutDecision({
      solver, plans, enemies: [{ index: 0, id: "DUMMY", move: null, strength: 0, powers: {} }], tables: {},
      piles: { draw, discard: [], handBase: hand }, meta: { ...META, kind: "boss", enc: "DUMMY" }, playerPowers: {}, potions: 0, mm: {},
      model: null, gates: null, options: { budgetMs: 10_000, seed: 4, include: [plan], horizon: 3, samples: 2 },
    });
    return result.lines.find((entry) => entry.plan === plan)!;
  };

  it("Inferno played on T1 hits every enemy for 6 at the start of each later turn, and costs 1 HP a turn", () => {
    const hand = [inferno(0), strike(1), strike(2)];
    const withIt = run(hand, ["INFERNO", "STRIKE", "STRIKE"]);
    const without = run(hand, ["STRIKE", "STRIKE"]);
    // T2 and T3: three Strikes (18) each; the Inferno line adds its 6 at the start of each.
    expect(without.perTurn[0]!.dmg.mean).toBe(18);
    expect(without.perTurn[1]!.dmg.mean).toBe(18);
    expect(withIt.perTurn[0]!.dmg.mean).toBe(24);
    expect(withIt.perTurn[1]!.dmg.mean).toBe(24);
    expect(withIt.perTurn[0]!.loss.mean).toBe(1);
    expect(without.perTurn[0]!.loss.mean).toBe(0);
  });

  it("Crimson Mantle with Inferno: 7 block and a second loss event, so Inferno hits twice (12) each later turn", () => {
    const hand = [inferno(0), mantle(1), strike(2)];
    const line = run(hand, ["INFERNO", "CRIMSON_MANTLE", "STRIKE"]);
    expect(line.perTurn[0]!.dmg.mean).toBe(18 + 12);
    expect(line.perTurn[0]!.loss.mean).toBe(2);
  });
});

describe("enemy Vigor (XLJQ6FPQAU7N F7: Thrash's Vigor 6 made Crash 18 + 6)", () => {
  const EEL: EnemyTable = {
    moves: {
      THRASH_MOVE: { damage: 4, hits: 3, strength: 0, block: 0, vigor: 6 },
      CRASH_MOVE: { damage: 18, hits: 1, strength: 0, block: 0 },
      TERROR_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 },
    },
    next: { THRASH_MOVE: { CRASH_MOVE: 1 }, CRASH_MOVE: { TERROR_MOVE: 1 }, TERROR_MOVE: { CRASH_MOVE: 1 }, STUNNED: { TERROR_MOVE: 1 } },
  };
  const run = (move: string, powers: Record<string, number>, attacks: { damage: number; hits: number }[], extra: Partial<EnemySim> = {}) => {
    const input = scenario(1e9, fakeClock(0.01));
    const hand = [strike(0), strike(1), strike(2), strike(3), strike(4)];
    const solver: SolverInput = {
      ...input.solver,
      hand,
      player: { ...input.solver.player, hp: 200, maxHp: 200 },
      enemies: [{ index: 0, name: "Terror Eel", hp: 500, maxHp: 500, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks, ...extra }],
      fightKind: "elite",
    };
    return rolloutDecision({
      ...input,
      solver,
      plans: solveTurn(solver).plans,
      piles: { draw: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((i) => strike(i)), discard: [], handBase: hand },
      enemies: [{ index: 0, id: "TERROR_EEL", move, strength: 0, powers }],
      tables: { TERROR_EEL: EEL },
    }).lines[0]!;
  };
  const lossOn = (line: ReturnType<typeof run>, turn: number) => line.perTurn.find((t) => t.turn === turn)!.loss.mean;

  it("Vigor up now lands on its next attack, then is spent", () => {
    // Terror now (no attack), Crash on turn 2 with the Vigor, Terror, Crash on turn 4 without it.
    const vigor = run("TERROR_MOVE", { VIGOR_POWER: 6 }, []);
    expect(lossOn(vigor, 2)).toBe(24);
    expect(lossOn(vigor, 3)).toBe(0);
    expect(lossOn(vigor, 4)).toBe(18);
    expect(lossOn(run("TERROR_MOVE", {}, []), 2)).toBe(18);
  });

  it("Thrash gives itself Vigor: the Crash after it hits for 18 + 6", () => {
    expect(lossOn(run("THRASH_MOVE", {}, [{ damage: 4, hits: 3 }]), 2)).toBe(24);
  });

  it("stunned by Shriek on this turn, it keeps its Vigor and goes on from STUNNED", () => {
    // 80 HP, Shriek at 75: any Strike line crosses it, the shown Crash 24 is cancelled; Terror next, then Crash 24.
    const line = run("CRASH_MOVE", { VIGOR_POWER: 6, SHRIEK_POWER: 75 }, [{ damage: 24, hits: 1 }], { hp: 80, maxHp: 150, shriek: 75 });
    expect(line.plan.outcome.incomingAfterBlock).toBe(0);
    expect(lossOn(line, 2)).toBe(0);
    expect(lossOn(line, 3)).toBe(24);
  });
});

describe("a turn limit ends the rollout unwon (Battleworn Dummy, SK1USHSB1U7U F43)", () => {
  const NOTHING: EnemyTable = { moves: { NOTHING_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { NOTHING_MOVE: { NOTHING_MOVE: 1 } } };
  const run = (hp: number, limit: number | undefined) => {
    const input = scenario(1e9, fakeClock(0.01));
    const hand = [strike(0), strike(1), strike(2), strike(3), strike(4)];
    const solver: SolverInput = {
      ...input.solver,
      hand,
      enemies: [{ index: 0, name: "Dummy", hp, maxHp: 150, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...(limit ? { timeLimit: limit } : {}) }],
    };
    return rolloutDecision({
      ...input,
      solver,
      plans: solveTurn(solver).plans,
      piles: { draw: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map((i) => strike(i)), discard: [], handBase: hand },
      enemies: [{ index: 0, id: "BATTLE_FRIEND_V2", move: "NOTHING_MOVE", strength: 0, powers: limit ? { BATTLEWORN_DUMMY_TIME_LIMIT_POWER: limit } : {} }],
      tables: { BATTLE_FRIEND_V2: NOTHING },
    }).lines[0]!;
  };

  it("18 a turn into 150 HP with 3 turns left: out of time on turn 3, never won", () => {
    const line = run(150, 3);
    expect(line.wins).toBe(0);
    expect(line.winProb).toBe(0);
    expect(line.timeUps).toBe(line.samples);
    expect(line.turnsToWin).toBe(3);
    // Nothing is simulated past the limit.
    expect(line.perTurn.find((t) => t.turn === 4)!.fighting).toBe(0);
    // With 2 turns left it ends a turn sooner; without a limit the harmless dummy reads as a win.
    expect(run(150, 2).turnsToWin).toBe(2);
    expect(run(150, undefined).winProb).toBeGreaterThan(0.5);
  });

  it("a dummy the deck can finish in time is a win", () => {
    const line = run(50, 3);
    expect(line.wins).toBe(line.samples);
    expect(line.timeUps).toBeUndefined();
  });
});

describe("debuffs enemy moves put on us carry into the rollout's later turns (XLJQ6FPQAU7N F7 T6: Terror's 99 Vulnerable)", () => {
  const EEL: EnemyTable = {
    moves: {
      CRASH_MOVE: { damage: 18, hits: 1, strength: 0, block: 0 },
      TERROR_MOVE: { damage: 0, hits: 1, strength: 0, block: 0, playerPowers: { VULNERABLE_POWER: 99 } },
    },
    next: { CRASH_MOVE: { TERROR_MOVE: 1 }, TERROR_MOVE: { CRASH_MOVE: 1 } },
  };
  const run = (table: EnemyTable, move: string, powers: Record<string, number>, draw: CardModel[], hp = 200) => {
    const input = scenario(1e9, fakeClock(0.01));
    const hand = [strike(0), strike(1), strike(2), strike(3), strike(4)];
    const solver: SolverInput = {
      ...input.solver,
      hand,
      player: { ...input.solver.player, hp, maxHp: 200 },
      enemies: [{ index: 0, name: "E", hp: 500, maxHp: 500, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] }],
      fightKind: "elite",
    };
    return rolloutDecision({
      ...input,
      solver,
      plans: solveTurn(solver).plans,
      piles: { draw, discard: [], handBase: hand },
      enemies: [{ index: 0, id: "E", move, strength: 0, powers }],
      tables: { E: table },
    }).lines[0]!;
  };
  const lossOn = (line: ReturnType<typeof run>, turn: number) => line.perTurn.find((t) => t.turn === turn)!.loss.mean;
  const strikes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((i) => strike(i));

  it("Terror's Vulnerable: the Crash after it hits x1.5 (18 + 6 Vigor = 36, as it did)", () => {
    expect(lossOn(run(EEL, "TERROR_MOVE", {}, strikes), 2)).toBe(27);
    expect(lossOn(run(EEL, "TERROR_MOVE", { VIGOR_POWER: 6 }, strikes), 2)).toBe(36);
    // And the 99 lasts: the next Crash (turn 4) too.
    expect(lossOn(run(EEL, "TERROR_MOVE", {}, strikes), 4)).toBe(27);
  });

  it("Frail cuts our card block, Weak our attacks, a drain our Strength", () => {
    const spores: EnemyTable = {
      moves: { SPORES: { damage: 0, hits: 1, strength: 0, block: 0, playerPowers: { FRAIL_POWER: 2 } }, HIT: { damage: 10, hits: 1, strength: 0, block: 0 } },
      next: { SPORES: { HIT: 1 }, HIT: { SPORES: 1 } },
    };
    const defends = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((i) => defend(i));
    // Three Defends: 15 block unFrailed, 3 x floor(5 x 0.75) = 9 under Frail: 1 through.
    expect(lossOn(run(spores, "SPORES", {}, defends), 2)).toBe(1);
    expect(lossOn(run({ ...spores, moves: { ...spores.moves, SPORES: { ...spores.moves["SPORES"]!, playerPowers: {} } } }, "SPORES", {}, defends), 2)).toBe(0);
    const weak: EnemyTable = { moves: { GOOP: { damage: 0, hits: 1, strength: 0, block: 0, playerPowers: { WEAK_POWER: 2 } } }, next: { GOOP: { GOOP: 1 } } };
    const drain: EnemyTable = { moves: { SIPHON: { damage: 0, hits: 1, strength: 0, block: 0, playerPowers: { STRENGTH_POWER: -2 } } }, next: { SIPHON: { SIPHON: 1 } } };
    const plain: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
    const dmgOn = (line: ReturnType<typeof run>, turn: number) => line.perTurn.find((t) => t.turn === turn)!.dmg.mean;
    expect(dmgOn(run(plain, "WAIT", {}, strikes), 2)).toBe(18);
    expect(dmgOn(run(weak, "GOOP", {}, strikes), 2)).toBe(12);
    expect(dmgOn(run(drain, "SIPHON", {}, strikes), 2)).toBe(12);
  });

  it("the real DB: Terror puts 99 Vulnerable on us", async () => {
    const { enemyTable } = await import("../src/strategy/rollout-live.js");
    const db = JSON.parse(readFileSync(join(ROOT, "src/knowledge/monster-db.json"), "utf8")) as { monsters: Record<string, never> };
    expect(enemyTable("TERROR_EEL", 9, db.monsters, {})!.moves["TERROR_MOVE"]!.playerPowers).toEqual({ VULNERABLE_POWER: 99 });
  });
});
