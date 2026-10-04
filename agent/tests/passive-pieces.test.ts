/**
 * PASSIVE_PIECES (src/reflex/passive-pieces.ts): the passive damage and block pieces in the rollout's later turns, the
 * whole-fight boss sim (B2 / B3) and the boss clock. Logged boards (tests/logged-states/passive/boards.json, states.jsonl
 * lines as the mod sent them) with the fixed test knowledge (tests/logged-states/game-data.json) and a fixed monster DB
 * and boss shares written here, never the refreshing knowledge files; no model call, nothing written under logs/.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { bossHitsByTurn, setMonsterDbForTests, type MonsterDb, type MonsterEntry } from "../src/knowledge/monster-db.js";
import { parseGameState, type GameState } from "../src/hand/mod/schema.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { passiveSimRelic } from "../src/sim/boss-start.js";
import { bossClock, bossClockJson, BOSSES, bossLossPerTurn, deckEstimate, deckProfileForBoss, mechanicFactor, rawDeckDamage, setUnblockedSharesForTests } from "../src/sim/boss-clock.js";
import { CLOCK_PASSIVE_BLOCK_SHARE, clockBlockAt, clockRelicPieces, LETTER_OPENER, liveSolverFields, ORNAMENTAL_FAN, PARRYING_SHIELD, passivePiecesOptions, solverPiecesOf } from "../src/reflex/passive-pieces.js";
import { rolloutDecision, type EnemyTable, type FightMeta, type RolloutInput } from "../src/reflex/rollout.js";
import { boardRolloutInput, fightRelicsOf, relicBlockOf, rolloutLiveOptions, type MonsterMoves } from "../src/reflex/rollout-live.js";
import { solveTap, solveTurn, type EnemySim, type Plan, type PlayerSim, type SolveResult, type SolverInput } from "../src/reflex/turn-solver.js";
import { loggedEnv, loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;
const BOARDS = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "logged-states", "passive", "boards.json"), "utf8")) as { states: Record<string, Raw> };
/** A fresh copy of one logged board. */
const board = (key: string): Raw => JSON.parse(JSON.stringify(BOARDS.states[key])) as Raw;

afterEach(() => {
  passivePiecesOptions.enabled = true;
  rolloutLiveOptions.enabled = true;
  solveTap.onSolve = null;
  setMonsterDbForTests(null);
  setUnblockedSharesForTests(null);
});

/** The live planner's solver input and result on a logged board (its rollout off). */
function solved(raw: Raw): { input: SolverInput; result: SolveResult } {
  let captured: { input: SolverInput; result: SolveResult } | null = null;
  solveTap.onSolve = (input, result) => {
    captured ??= { input, result };
  };
  rolloutLiveOptions.enabled = false;
  try {
    planCombatTurn(loggedEnv({ source: "", decision: { label: "", decider: "", chosen: null, rationale: "" }, state: raw }));
  } finally {
    solveTap.onSolve = null;
  }
  if (!captured) throw new Error("the planner did not solve the board");
  return captured;
}

const steps = (plan: Plan) => plan.steps.map((step) => step.cardId).join(",");
/** A solver input without the passive pieces' fields (the live planner sets them with PASSIVE_PIECES on). */
const bare = (input: SolverInput): SolverInput => {
  const { orichalcum: _o, rippleBasin: _r, letterOpener: _l, ornamentalFan: _f, parryingShield: _p, orichalcumPlating: _op, ...player } = input.player;
  return { ...input, player };
};
const hpBlock = (plan: Plan, input: SolverInput) =>
  plan.outcome.enemyHpAfter.map((e) => e.hp + (e.block ?? input.enemies.find((x) => x.index === e.index)?.block ?? 0));

describe("the pieces as the later turns' solver and the B3 relic list read them", () => {
  it("relics -> solver pieces; none held or the switch off -> null", () => {
    expect(solverPiecesOf(["LETTER_OPENER", "ORNAMENTAL_FAN", "PARRYING_SHIELD", "ORICHALCUM", "RIPPLE_BASIN", "SAI"])).toEqual({
      orichalcum: 6,
      rippleBasin: 4,
      letterOpener: { every: 3, damage: 5 },
      ornamentalFan: { every: 3, block: 4 },
      parryingShield: { block: 10, damage: 6 },
    });
    expect(solverPiecesOf(["SAI", "BURNING_BLOOD"])).toBeNull();
    expect(solverPiecesOf(["LETTER_OPENER"], false)).toBeNull();
    expect(passiveSimRelic("LETTER_OPENER", true)).toBe(true);
    expect(passiveSimRelic("LETTER_OPENER", false)).toBe(false);
    expect(passiveSimRelic("SAI", true)).toBe(false);
  });

  it("Horn Cleat: the 5-turn rollout's (relicBlockOf) with the switch on, the whole fight's alone (fightRelicsOf) off; once either way", () => {
    const run = board("rbj4-f48-t1")["run"] as Raw;
    expect(relicBlockOf(run, 40, true)).toEqual([{ amount: 14, turn: 2 }]);
    expect(fightRelicsOf(run, 1, 40, true).block).toEqual([]);
    expect(relicBlockOf(run, 40, false)).toEqual([]);
    expect(fightRelicsOf(run, 1, 40, false).block).toEqual([{ amount: 14, turn: 2 }]);
  });

  it("PASSIVE_PIECES: on by default, off when set so, a bad value warns and stays on", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).passivePieces).toBe(true);
    expect(loadConfig({ PASSIVE_PIECES: "off" } as NodeJS.ProcessEnv).passivePieces).toBe(false);
    const bad = loadConfig({ PASSIVE_PIECES: "maybe" } as NodeJS.ProcessEnv);
    expect(bad.passivePieces).toBe(true);
    expect(bad.warnings.some((w) => w.startsWith("PASSIVE_PIECES"))).toBe(true);
  });
});

describe("the solver's new pieces (set only by the later turns; the live current turn leaves them unset)", () => {
  it("Letter Opener (7PWU4CD3QCP3 F48 T4, the Queen's Weak 98): the 3rd Skill deals 5 to every enemy, through block", () => {
    const input = bare(solved(board("7pwu-f48-t4")).input);
    // Three Defends (1 energy each): three Skills (Chains of Binding's Soulbound taken off: one of them locks the rest).
    const hand = input.hand.filter((card) => card.cardId === "DEFEND_IRONCLAD").slice(0, 3).map((card) => ({ ...card, soulbound: false }));
    expect(hand).toHaveLength(3);
    const base = { ...input, hand, player: { ...input.player, energy: 3 } };
    const plain = solveTurn(base).plans.find((plan) => steps(plan) === "DEFEND_IRONCLAD,DEFEND_IRONCLAD,DEFEND_IRONCLAD")!;
    const opener = solveTurn({ ...base, player: { ...base.player, letterOpener: { ...LETTER_OPENER, count: 0 } } }).plans.find((plan) => steps(plan) === "DEFEND_IRONCLAD,DEFEND_IRONCLAD,DEFEND_IRONCLAD")!;
    expect(plain).toBeDefined();
    expect(opener).toBeDefined();
    expect(hpBlock(opener, input).map((v, i) => hpBlock(plain, input)[i]! - v)).toEqual(input.enemies.filter((e) => e.hp > 0).map(() => LETTER_OPENER.damage));
    // Two Skills already played this turn: the next one is the 3rd.
    const one = solveTurn({ ...base, hand: hand.slice(0, 1), player: { ...base.player, letterOpener: { ...LETTER_OPENER, count: 2 } } }).plans.find((plan) => steps(plan) === "DEFEND_IRONCLAD")!;
    const onePlain = solveTurn({ ...base, hand: hand.slice(0, 1) }).plans.find((plan) => steps(plan) === "DEFEND_IRONCLAD")!;
    expect(hpBlock(onePlain, input)[0]! - hpBlock(one, input)[0]!).toBe(LETTER_OPENER.damage);
  });

  it("Ornamental Fan (4JGPCH3WX6JV F48 T3, Frail 99): the 3rd Attack gives 4 block, not cut by Frail", () => {
    const input = bare(solved(board("4jgp-f48-t3")).input);
    // Chains of Binding's Soulbound taken off (one of them locks the rest).
    const attacks = input.hand.filter((card) => card.type === "Attack" && card.cost <= 1).slice(0, 3).map((card) => ({ ...card, soulbound: false }));
    expect(attacks).toHaveLength(3);
    const base = { ...input, hand: attacks, player: { ...input.player, energy: 3 } };
    const key = (plan: Plan) => plan.steps.length === 3;
    const plain = solveTurn(base).plans.find(key)!;
    const fan = solveTurn({ ...base, player: { ...base.player, ornamentalFan: { ...ORNAMENTAL_FAN, count: 0 } } }).plans.find((plan) => key(plan) && steps(plan) === steps(plain))!;
    expect(fan.outcome.blockGained - plain.outcome.blockGained).toBe(ORNAMENTAL_FAN.block);
  });

  it("Parrying Shield (8D8DZ9K680C2 F48 T7): 10+ block at the end, Plating counted, hits a random enemy for 6 before it attacks", () => {
    const input = bare(solved(board("8d8d-f48-t7")).input);
    const shield = { ...PARRYING_SHIELD };
    const queen = (plan: Plan) => plan.outcome.enemyHpAfter[0]!.hp;
    // No card played: the block left is the state's (0) and nothing at the end: no hit.
    const idle: SolverInput = { ...input, hand: [] };
    expect(queen(solveTurn({ ...idle, player: { ...idle.player, parryingShield: shield } }).plans[0]!)).toBe(queen(solveTurn(idle).plans[0]!));
    // Plating 10 at the turn's end: the shield fires (6 off the Queen, no block on her now).
    const plated: SolverInput = { ...idle, player: { ...idle.player, endTurnBlock: 10 } };
    expect(queen(solveTurn(plated).plans[0]!) - queen(solveTurn({ ...plated, player: { ...plated.player, parryingShield: shield } }).plans[0]!)).toBe(PARRYING_SHIELD.damage);
  });

  it("the live planner's current turn: the run's pieces with the relics' counters, 0 before the turn's first card; none off", () => {
    // 7PWU4CD3QCP3 F48 T4: Letter Opener, no card played yet (its stack shows the last turn's count).
    expect(solved(board("7pwu-f48-t4")).input.player.letterOpener).toEqual({ every: 3, damage: 5, count: 0 });
    // 4JGPCH3WX6JV F48 T3: Ornamental Fan and Parrying Shield.
    const fan = solved(board("4jgp-f48-t3")).input.player;
    expect(fan.ornamentalFan).toEqual({ every: 3, block: 4, count: 0 });
    expect(fan.parryingShield).toEqual({ block: 10, damage: 6 });
    // A8ENYFR4ZWKG F48 T7: Orichalcum, with Plating not stopping it.
    const ori = solved(board("a8en-f48-t7")).input.player;
    expect(ori.orichalcum).toBe(6);
    expect(ori.orichalcumPlating).toBe(true);
    // Mid-turn: the relic's own counter mod 3 (2 Skills counted).
    const mid = board("7pwu-f48-t4");
    const combat = mid["combat"] as Raw;
    (combat["player"] as Raw)["cards_played_this_turn"] = 2;
    for (const relic of (mid["run"] as Raw)["relics"] as Raw[]) if (relic["relic_id"] === "LETTER_OPENER") relic["stack"] = 2;
    expect(solved(mid).input.player.letterOpener?.count).toBe(2);
    // Ripple Basin (the run's relics given here): on a fresh turn; not once an Attack was played this turn.
    const basin = { relics: [{ relic_id: "RIPPLE_BASIN", stack: null }] };
    expect(liveSolverFields(basin, 0, 0).rippleBasin).toBe(4);
    expect(liveSolverFields(basin, 2, 1).rippleBasin).toBeUndefined();
    expect(liveSolverFields(basin, 2, 0).rippleBasin).toBe(4);
    // Off: none of the fields.
    passivePiecesOptions.enabled = false;
    for (const key of ["7pwu-f48-t4", "4jgp-f48-t3", "a8en-f48-t7"]) {
      const player = solved(board(key)).input.player;
      expect([player.letterOpener, player.ornamentalFan, player.parryingShield, player.orichalcum, player.rippleBasin, player.orichalcumPlating]).toEqual([undefined, undefined, undefined, undefined, undefined, undefined]);
    }
  });

  it("Orichalcum (A8ENYFR4ZWKG F48 T7, Plating 9 up): Plating played this turn does not stop it either, with orichalcumPlating; before, it did", () => {
    const input = bare(solved(board("a8en-f48-t7")).input);
    // One card: a Plating card of the hand's model (Stone Armor-like: 4 Plating, no block), nothing else this turn.
    const plating = { ...input.hand[0]!, cardId: "STONE_ARMOR", name: "Stone Armor", type: "Power", cost: 0, xCost: false, damage: null, hits: 0, block: 0, plating: 4, target: "self", validTargets: [], playable: true, special: "plating" } as SolverInput["hand"][number];
    const one = { ...input, hand: [plating], player: { ...input.player, block: 0, energy: 1 } };
    const played = (player: Partial<PlayerSim>) => solveTurn({ ...one, player: { ...one.player, ...player } }).plans.find((plan) => steps(plan) === "STONE_ARMOR")!;
    const before = played({ orichalcum: 6 });
    const after = played({ orichalcum: 6, orichalcumPlating: true });
    const none = played({});
    // Before: Plating played stopped Orichalcum (the same HP lost as without it); now its 6 comes on top.
    expect(before.outcome.hpLoss).toBe(none.outcome.hpLoss);
    expect(none.outcome.hpLoss - after.outcome.hpLoss).toBe(Math.min(6, none.outcome.incomingAfterBlock));
  });

  it("unset, the solver is as before: the logged boards' plans are the same with the fields absent", () => {
    passivePiecesOptions.enabled = false;
    for (const key of ["8d8d-f48-t7", "7pwu-f48-t4", "f4k8-f48-t3"]) {
      const { input, result } = solved(board(key));
      expect(JSON.stringify(solveTurn(input).plans)).toBe(JSON.stringify(result.plans));
      expect(JSON.stringify(solveTurn(bare(input)).plans)).toBe(JSON.stringify(result.plans));
    }
  });
});

/** A one-enemy rollout input hitting `damage` a turn, as the Sai test in fix-queue-v4-fix2 builds it. */
function dummyRollout(damage: number, extra: Partial<RolloutInput> = {}): RolloutInput {
  const table: EnemyTable = { moves: { HIT: { damage, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const meta: FightMeta = { act: 3, t: 1, asc: 8, kind: "boss", enc: "TEST_DUMMY", deck: { n: 1, atk: 0, skl: 1, pow: 0, junk: 0, dmg: 0, blk: 0, up: 0 }, relics: 0, max_en: 3 };
  const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false };
  const enemy: EnemySim = { index: 0, name: "Dummy", hp: 500, maxHp: 500, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage, hits: 1 }] };
  const solver: SolverInput = { hand: [], player, enemies: [enemy], fightKind: "boss", turn: 1 };
  return {
    solver,
    plans: solveTurn(solver).plans,
    enemies: [{ index: 0, id: "TEST_DUMMY", move: "HIT", strength: 0, powers: {} }],
    tables: { TEST_DUMMY: table },
    piles: { draw: [], discard: [], handBase: [] },
    meta,
    playerPowers: {},
    potions: 0,
    mm: {},
    model: null,
    gates: null,
    options: { budgetMs: 1e9, seed: 3, horizon: 3, samples: 2, now: (() => { let t = 0; return () => (t += 0.01); })() },
    ...extra,
  };
}

describe("the rollout's later turns (the 5-turn rollout and the whole-fight sim's)", () => {
  it("Orichalcum: a later turn that ends with no block takes 6 less (before, the whole-fight sim's alone)", () => {
    const off = rolloutDecision(dummyRollout(10)).lines[0]!;
    const on = rolloutDecision(dummyRollout(10, { passive: { orichalcum: 6 } })).lines[0]!;
    expect(off.perTurn.map((t) => t.loss.mean)).toEqual([10, 10]);
    expect(on.perTurn.map((t) => t.loss.mean)).toEqual([4, 4]);
  });

  it("Parrying Shield in the later turns: Plating 10 each turn -> 6 a turn more into the enemy", () => {
    const plated = (passive: RolloutInput["passive"]) => {
      const input = dummyRollout(10, passive ? { passive } : {});
      return rolloutDecision({ ...input, solver: { ...input.solver, player: { ...input.solver.player, endTurnBlock: 10 } }, playerPowers: { METALLICIZE_POWER: 10 } }).lines[0]!;
    };
    const off = plated(undefined);
    const on = plated({ parryingShield: { ...PARRYING_SHIELD } });
    expect(on.perTurn.map((t) => t.dmg.mean)).toEqual(off.perTurn.map((t) => t.dmg.mean + PARRYING_SHIELD.damage));
  });

  it("a board without any of the relic pieces (F4K88F267RCX F48 T3, the Queen) builds the same rollout input and the same rollout on and off", () => {
    const raw = board("f4k8-f48-t3");
    const state = parseGameState(raw) as GameState;
    const { input } = solved(raw);
    const built = (on: boolean) => {
      passivePiecesOptions.enabled = on;
      return boardRolloutInput(state, loggedKnowledge, input, 8, {} as MonsterMoves, {});
    };
    const on = built(true);
    const off = built(false);
    expect(on.passive).toBeUndefined();
    expect(JSON.stringify(on)).toBe(JSON.stringify(off));
  });

  it("a board holding Letter Opener (7PWU4CD3QCP3 F48 T4) carries it for the later turns with the switch on, nothing with it off", () => {
    const raw = board("7pwu-f48-t4");
    const state = parseGameState(raw) as GameState;
    const { input } = solved(raw);
    passivePiecesOptions.enabled = true;
    expect(boardRolloutInput(state, loggedKnowledge, input, 8, {} as MonsterMoves, {}).passive).toEqual({ letterOpener: { every: 3, damage: 5 } });
    passivePiecesOptions.enabled = false;
    expect(boardRolloutInput(state, loggedKnowledge, input, 8, {} as MonsterMoves, {}).passive).toBeUndefined();
  });
});

// A fixed Queen for the clock: the Amalgam hitting 10 once a turn, the Queen 7 x5 every turn (her hits are the ones
// retaliation counts: the clock counts her HP alone), A8 HP 211 / 419.
const attackMove = (perHit: number, hits: number) => ({
  intents: { Attack: 10 },
  turns_seen: { "1": 10 },
  next: {} as Record<string, number>,
  damage_by_asc: { "8": { base_per_hit: { [String(perHit)]: 10 }, hits: { [String(hits)]: 10 }, shown: { [`${perHit}x${hits}`]: 10 } } },
});
const QUEEN_MONSTERS: Record<string, MonsterEntry> = {
  QUEEN: { name: { zh: "女王" }, hp_by_asc: { "8": { min: 419, median: 419, max: 419, n: 10 } }, moves: { CHOP_MOVE: { ...attackMove(7, 5), next: { CHOP_MOVE: 10 } } }, powers: {} },
  TORCH_HEAD_AMALGAM: { name: { zh: "火炬头聚合体" }, hp_by_asc: { "8": { min: 211, median: 211, max: 211, n: 10 } }, moves: { TACKLE_MOVE: { ...attackMove(10, 1), next: { TACKLE_MOVE: 10 } } }, powers: {} },
} as unknown as Record<string, MonsterEntry>;
const QUEEN_DB: MonsterDb = {
  bosses: { QUEEN: { "8": { fights: 10, parts: { QUEEN: { min: 419, median: 419, max: 419, n: 10, count_per_fight: 1 }, TORCH_HEAD_AMALGAM: { min: 211, median: 211, max: 211, n: 10, count_per_fight: 1 } } } } },
  encounters: {},
  monsters: QUEEN_MONSTERS,
} as unknown as MonsterDb;

function withQueenDb<T>(fn: () => T): T {
  setMonsterDbForTests(QUEEN_DB);
  setUnblockedSharesForTests({ QUEEN: { unblocked_share: 0.4, fights: 20, turns: 160 } });
  try {
    return fn();
  } finally {
    setMonsterDbForTests(null);
    setUnblockedSharesForTests(null);
  }
}

describe("the boss clock", () => {
  it("the monster DB's expected hits a turn: the Queen's own 5, the Amalgam's 1, only the parts named", () => {
    withQueenDb(() => {
      expect(bossHitsByTurn("QUEEN_BOSS", 8, 3)).toEqual([6, 6, 6]);
      expect(bossHitsByTurn("QUEEN_BOSS", 8, 3, ["QUEEN"])).toEqual([5, 5, 5]);
    });
  });

  it("the relic pieces a turn: Plating one less a turn, the one-turn relics on their turn alone", () => {
    const { damage, block } = clockRelicPieces(["MERCURY_HOURGLASS", "BRONZE_SCALES", "SAI", "GORGET", "HORN_CLEAT", "ANCHOR"]);
    expect(damage.map((p) => [p.amount, p.aoe === true, p.perHit === true])).toEqual([[3, true, false], [3, false, true]]);
    const byTurn = (t: number) => block.reduce((sum, p) => sum + clockBlockAt(p, t), 0);
    // T1 Sai 7 + Gorget 4 + Anchor 10; T2 7 + 3 + Horn Cleat 14; T3 7 + 2; T5 on: Sai alone.
    expect([1, 2, 3, 4, 5, 6].map(byTurn)).toEqual([21, 24, 9, 8, 7, 7]);
  });

  it("8D8DZ9K680C2 F48 T1 (Sai, Hourglass, Bronze Scales, Inferno+, Flame Barrier): more damage a turn, the passive part not cut by the Queen's Weak; the passive block counted at its share", () => {
    withQueenDb(() => {
      const state = parseGameState(board("8d8d-f48-t1")) as GameState;
      passivePiecesOptions.enabled = false;
      const off = bossClock(state, loggedKnowledge, 80)!;
      const deckOff = deckProfileForBoss(state, loggedKnowledge)!;
      passivePiecesOptions.enabled = true;
      const on = bossClock(state, loggedKnowledge, 80)!;
      const deckOn = deckProfileForBoss(state, loggedKnowledge)!;
      // Off: Sai's 7 alone off the loss, the old estimate; the profile carries none of the new fields.
      expect(off.lossNote).toMatch(/less 7 block a turn from Sai/);
      expect(deckOff.passivePieces).toBeUndefined();
      expect(deckOff.passiveStart).toBeUndefined();
      // On: Hourglass 3 + Thorns 3 x the Queen's 5 hits + Flame Barrier's share, from turn 1.
      expect(deckOn.passivePieces).toBe(true);
      expect(deckOn.passiveStart!).toBeGreaterThan(3 + 3 * 5);
      expect(deckOn.passive!.join("; ")).toMatch(/Mercury Hourglass/);
      expect(deckOn.passive!.join("; ")).toMatch(/Bronze Scales Thorns 3/);
      expect(on.deck).toBeGreaterThan(off.deck);
      // The same turns: the cards' part cut by Weak as before, the passive part (Inferno too) not.
      const turns = 8;
      const factor = mechanicFactor("QUEEN", deckOn, turns);
      expect(factor).toBeLessThan(1);
      expect(deckEstimate(deckOn, "QUEEN_BOSS", turns)).toBeGreaterThan(deckEstimate({ ...deckOn, passiveStart: 0, passiveStartAoe: 0 }, "QUEEN_BOSS", turns));
      expect(deckEstimate({ ...deckOn, passiveStart: 0, passiveStartAoe: 0 }, "QUEEN_BOSS", turns)).toBeGreaterThan(deckEstimate(deckOff, "QUEEN_BOSS", turns));
      // Sai (7) is one of the passive blocks now, counted at CLOCK_PASSIVE_BLOCK_SHARE (the logged share has the average
      // fight's passive block in it): 45 x 0.4 = 18 a turn less 3.5, where Sai alone took the whole 7 off before.
      expect(off.lossPerTurn).toBe(11);
      expect(on.lossPerTurn).toBe(18 - 7 * CLOCK_PASSIVE_BLOCK_SHARE);
      expect(on.lossNote).toMatch(/Sai 7/);
      expect(on.lossNote).toMatch(/counted at 50%/);
      expect(bossClockJson(state, loggedKnowledge)!["passive_block"]).toMatch(/Sai 7/);
    });
  });

  it("F4K88F267RCX F48 T3 (Crimson Mantle, Flame Barrier, Inferno): Mantle's block from the turn after the powers come out", () => {
    withQueenDb(() => {
      const state = parseGameState(board("f4k8-f48-t3")) as GameState;
      passivePiecesOptions.enabled = true;
      const deck = deckProfileForBoss(state, loggedKnowledge)!;
      const from = deck.setupTurn + 1;
      expect(deck.turnBlock![from - 2]).toBe(0);
      expect(deck.turnBlock![from - 1]).toBe(7);
      expect(deck.passiveBlock!.join("; ")).toMatch(new RegExp(`Crimson Mantle 7 from T${from}`));
    });
  });

  it("a deck and relics without any piece: the clock and its JSON the same on and off (the F4K8 board less its Mantle, Barrier and Inferno)", () => {
    withQueenDb(() => {
      const raw = board("f4k8-f48-t3");
      const run = raw["run"] as Raw;
      run["deck"] = (run["deck"] as Raw[]).filter((card) => !["CRIMSON_MANTLE", "FLAME_BARRIER", "INFERNO", "JUGGERNAUT", "STONE_ARMOR"].includes(String(card["card_id"])));
      const state = parseGameState(raw) as GameState;
      passivePiecesOptions.enabled = false;
      const off = JSON.stringify([bossClock(state, loggedKnowledge, 54), bossClockJson(state, loggedKnowledge), deckProfileForBoss(state, loggedKnowledge)]);
      passivePiecesOptions.enabled = true;
      const on = JSON.stringify([bossClock(state, loggedKnowledge, 54), bossClockJson(state, loggedKnowledge), deckProfileForBoss(state, loggedKnowledge)]);
      expect(on).toBe(off);
    });
  });

  it("a passive-only change at mechanic factor 1 (a boss without one): the old calibrated estimate exactly", () => {
    withQueenDb(() => {
      const state = parseGameState(board("8d8d-f48-t1")) as GameState;
      passivePiecesOptions.enabled = true;
      const deck = deckProfileForBoss(state, loggedKnowledge)!;
      // Vantom has no mechanic factor: the split formula is the plain calibration of the same raw number.
      expect(mechanicFactor("VANTOM", deck, 8)).toBe(1);
      expect(deckEstimate(deck, "VANTOM", 8)).toBe(Math.round(11 + 0.92 * rawDeckDamage(deck, "VANTOM", 8)));
    });
  });

  it("the loss a turn with a per-turn block list: each attacking turn less that turn's block", () => {
    withQueenDb(() => {
      const queen = { ...BOSSES["QUEEN"]!, id: "QUEEN" };
      const plain = bossLossPerTurn(queen, 8);
      // 7 x 5 + 10 = 45 a turn x 0.4 = 18.
      expect(plain.value).toBe(18);
      expect(bossLossPerTurn(queen, 8, { byTurn: [10, 0, 0, 0, 0, 0, 0, 0], names: ["Anchor 10 on T1"] }).value).toBe(Math.round(((18 - 10) + 18 * 7) / 8 * 10) / 10);
      expect(bossLossPerTurn(queen, 8, 7).value).toBe(11);
    });
  });
});
