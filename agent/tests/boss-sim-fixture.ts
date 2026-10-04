/**
 * Synthetic boss boards for tests/boss-sim.test.ts (no knowledge data, no model call), and the live-path digest: the
 * solver's and the 5-turn rollout's numbers on them, pinned in the test as computed before the whole-fight simulator's
 * B1.5 policy knobs (89b8cd0), so the live planner is shown unchanged.
 */
import type { CardModel } from "../src/reflex/card-model.js";
import { rolloutDecision, type EnemyTable, type FightMeta, type RolloutEnemy, type RolloutInput } from "../src/reflex/rollout.js";
import { solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/reflex/turn-solver.js";

export function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
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

export const strike = (i: number) => card(i, "STRIKE", { damage: 6 });
export const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 5 });
export const bash = (i: number) => card(i, "BASH", { cost: 2, damage: 8, vulnerable: 2 });

export const META: FightMeta = { act: 1, t: 1, asc: 8, kind: "boss", enc: "TEST_BOSS", deck: { n: 12, atk: 7, skl: 5, pow: 0, junk: 0, dmg: 50, blk: 25, up: 0 }, relics: 1, max_en: 3 };

/** A boss with a random two-move chain: a hit, or Strength and block. */
export const BOSS: EnemyTable = {
  moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 }, BUFF: { damage: 0, hits: 1, strength: 2, block: 8 }, FLURRY: { damage: 4, hits: 3, strength: 0, block: 0 } },
  next: { HIT: { BUFF: 1, FLURRY: 1 }, BUFF: { HIT: 2, FLURRY: 1 }, FLURRY: { HIT: 1, BUFF: 1 } },
};

export function board(opts: { bossHp?: number; playerHp?: number; enemies?: { sim: EnemySim; info: RolloutEnemy }[]; tables?: Record<string, EnemyTable> } = {}): RolloutInput {
  const hand = [strike(0), strike(1), defend(2), bash(3), defend(4)];
  const player: PlayerSim = { hp: opts.playerHp ?? 70, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
  const boss: EnemySim = { index: 0, name: "Boss", hp: opts.bossHp ?? 120, maxHp: opts.bossHp ?? 120, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 10, hits: 1 }] };
  const enemies = opts.enemies ?? [{ sim: boss, info: { index: 0, id: "TEST_BOSS", move: "HIT", strength: 0, powers: {} } }];
  const solver: SolverInput = { hand, player, enemies: enemies.map((e) => e.sim), fightKind: "boss", turn: 1 };
  const draw = [5, 6, 7, 8, 9, 10, 11].map((i) => (i % 2 ? defend(i) : strike(i)));
  return {
    solver,
    plans: solveTurn(solver).plans,
    enemies: enemies.map((e) => e.info),
    tables: opts.tables ?? { TEST_BOSS: BOSS },
    piles: { draw, discard: [], handBase: hand },
    meta: META,
    playerPowers: {},
    potions: 0,
    mm: {},
    model: null,
    gates: null,
  };
}


/** The live planner's numbers on synthetic boards: the solver's lines and the 5-turn rollout's estimates. */
export function liveDigest(): unknown[] {
  const r = (x: number | null | undefined) => (x === null || x === undefined ? null : Math.round(x * 1000) / 1000);
  const boards: RolloutInput[] = [board(), board({ playerHp: 18 }), board({ bossHp: 40 })];
  const gunk: EnemySim = { index: 1, name: "Gunk", hp: 30, maxHp: 30, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 7, hits: 2 }] };
  const two = board();
  const pair = board({
    enemies: [
      { sim: two.solver.enemies[0]!, info: two.enemies[0]! },
      { sim: gunk, info: { index: 1, id: "TEST_BOSS", move: "FLURRY", strength: 0, powers: {} } },
    ],
  });
  boards.push(pair);
  const out: unknown[] = [];
  for (const input of boards) {
    const solved = solveTurn(input.solver);
    out.push(solved.plans.slice(0, 6).map((p) => [p.steps.map((s) => `${s.cardId}>${s.target ?? "-"}`).join(","), r(p.score), p.outcome.hpLoss, p.outcome.damageDealt]));
    const res = rolloutDecision({ ...input, options: { budgetMs: 1e9, seed: 3, samples: 8, horizon: 5, k: 3 } });
    out.push(res.lines.map((l) => [l.plan.steps.map((s) => s.cardId).join(","), r(l.hpLoss), r(l.winProb), r(l.turnsToWin), l.deaths, l.wins]));
  }
  return out;
}
