/** The monster DB as DeepSeek sees it, and the per-fight move model the solver reads. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { actThreats, ascensionDamageRatio, backAttackShare, bossDossier, bossHpLoss, chainedDamageRatio, monsterDamageByTurn, moveDamageAt, monsterLine, monstersNamedIn, nearestAscension, selfGainAt, setMonsterDbForTests, type MonsterMoveData } from "../src/knowledge/monster-db.js";
import { forcedFightCost } from "../src/hand/screens/event.js";
import { enemyTable } from "../src/reflex/rollout-live.js";
import { expectedNextDamage, moveModel } from "../src/knowledge/move-model.js";
import { knowledgeFile } from "../src/knowledge/files.js";

describe("monster DB facts for DeepSeek", () => {
  it("uses the ascension asked for, else says n=0 and labels the nearest logged one", () => {
    expect(nearestAscension({ "0": 1, "7": 1, "8": 1 }, 8)).toEqual({ key: "8", exact: true });
    expect(nearestAscension({ "0": 1, "7": 1, "8": 1 }, 9)).toEqual({ key: "8", exact: false });
    expect(nearestAscension({ "6": 1, "8": 1 }, 7)).toEqual({ key: "8", exact: false });
    expect(bossDossier("VANTOM_BOSS", 8)).toMatch(/A8: HP .*\(n=\d+\)/);
    // An ascension no run has reached (the logged ones grow with every refresh: VANTOM has A9 rows now).
    expect(bossDossier("VANTOM_BOSS", 20)).toMatch(/A20 无记录 \(n=0\)，以下为最近的 A\d+/);
    expect(bossDossier("NOT_A_BOSS", 8)).toBeNull();
  });

  it("the boss entry has HP with n, the move cycle with damage, and our record", () => {
    const text = bossDossier("VANTOM_BOSS", 8)!;
    const hp = Number(/HP \S+ (\d+)/.exec(text)?.[1]);
    expect(hp).toBeGreaterThan(150);
    expect(hp).toBeLessThan(220);
    expect(text).toMatch(/胜率 \d+% \(n=\d+\)/);
    expect(text).toMatch(/赢局失血 中位\/p75 [\d.]+\/[\d.]+ \(n=\d+\)/);
    expect(text).toMatch(/招式: .+ → .+/);
    // Our debuffs on it are not its powers.
    expect(text).not.toMatch(/能力:.*易伤/);
  });

  it("lists the act's elites and dangerous hallway fights, one line each with n", () => {
    const lines = actThreats(1, 8);
    expect(lines.some((line) => line.includes("[精英]"))).toBe(true);
    for (const line of lines) expect(line).toMatch(/HP [\d.]+ \(n=\d+\)/);
    expect(lines.filter((line) => line.includes("[小怪]")).length).toBeLessThanOrEqual(8);
  });

  it("finds the enemy an event names", () => {
    expect(monstersNamedIn("前方传来墨影幻灵的气息")).toContain("VANTOM");
    expect(monsterLine("VANTOM", 8)).toMatch(/墨影幻灵 \(VANTOM\) A8: HP [\d.]+ \(n=\d+\)/);
  });
});

describe("per-fight move model", () => {
  it("loads in the solver's format with plausible damage", () => {
    const model = moveModel();
    expect(Object.keys(model).length).toBeGreaterThan(50);
    const chomper = model["CHOMPER"]!;
    expect(Object.keys(chomper.next).length).toBeGreaterThan(0);
    for (const damage of Object.values(chomper.damage)) expect(damage).toBeGreaterThanOrEqual(0);
    // Chomper alternates: after a Screech comes an attack worth roughly 10-25.
    const next = expectedNextDamage("CHOMPER", "SCREECH_MOVE");
    expect(next).not.toBeNull();
    expect(next!).toBeGreaterThan(8);
    expect(next!).toBeLessThan(30);
  });
});

describe("a move never logged at this ascension: the nearest one's damage scaled by the measured ratio", () => {
  const at = (bases: Record<string, number>, hits = 1) =>
    ({ damage_by_asc: Object.fromEntries(Object.entries(bases).map(([asc, base]) => [asc, { base_per_hit: { [String(base)]: 3 }, hits: { [String(hits)]: 3 } }])) });
  const db: MonsterMoveData = {
    // Its own moves seen at both A8 and A9: 10 -> 12 and 20 -> 22 (x 34/30).
    CLAW: { moves: { A: at({ "8": 10, "9": 12 }), B: at({ "8": 20, "9": 22 }), C: at({ "8": 15 }, 2) } },
    // No move of its own at both: every monster's pairs (here CLAW's).
    SLIME: { moves: { D: at({ "8": 30 }) } },
  };

  it("scales by the monster's own moves at both ascensions, else every monster's, rounded and marked", () => {
    expect(ascensionDamageRatio(db, "CLAW", 8, 9)).toEqual({ ratio: 34 / 30, n: 2, own: true });
    expect(moveDamageAt(db, "CLAW", "A", 9)).toMatchObject({ perHit: 12, hits: 1, estimated: false, from: 9 });
    expect(moveDamageAt(db, "CLAW", "C", 9)).toMatchObject({ perHit: 17, hits: 2, estimated: true, from: 8, ratioOwn: true });
    expect(moveDamageAt(db, "SLIME", "D", 9)).toMatchObject({ perHit: 34, estimated: true, from: 8, ratioOwn: false, ratioN: 2 });
    // Logged at the ascension asked for: as logged.
    expect(moveDamageAt(db, "CLAW", "C", 8)).toMatchObject({ perHit: 15, estimated: false });
  });

  it("the real DB: A9 moves hit harder than A8 on average", () => {
    expect(ascensionDamageRatio({}, "NONE", 8, 9)).toBeNull();
    expect(ascensionDamageRatio(realMonsters(), "NONE", 8, 9)!.ratio).toBeGreaterThan(1);
  });

  it("a boss with no A9 fight is scaled and says so: DB text, dossier, rollout table (a fixture: the real DB gains A9 fights with every refresh)", () => {
    const monsters: MonsterMoveData = {
      // Lunging Bite 28 at A8 only; the Crusher's Guarded Strike 19 -> 22 measures the A8 -> A9 ratio.
      THE_INSATIABLE: { moves: { LUNGING_BITE_MOVE: { ...at({ "8": 28 }), name: "猛扑啃咬", turns_seen: { "1": 3 }, next: { LUNGING_BITE_MOVE: 3 } } } },
      CRUSHER: { moves: { GUARDED_STRIKE_MOVE: at({ "8": 19, "9": 22 }) } },
    };
    const bite = moveDamageAt(monsters, "THE_INSATIABLE", "LUNGING_BITE_MOVE", 9)!;
    expect(bite).toMatchObject({ estimated: true, from: 8, perHit: Math.round((28 * 22) / 19), ratioOwn: false, ratioN: 1 });
    expect(bite.ratio).toBeCloseTo(22 / 19, 10);
    setMonsterDbForTests({ bosses: { THE_INSATIABLE: { "8": { fights: 3, parts: { THE_INSATIABLE: { median: 341, n: 3 } } } } }, encounters: {}, monsters } as never);
    try {
      expect(bossDossier("THE_INSATIABLE_BOSS", 9)).toMatch(/A9 无记录 \(n=0\)，以下为最近的 A8/);
      expect(bossDossier("THE_INSATIABLE_BOSS", 9)).toMatch(/猛扑啃咬 32 \(A9估: A8×1\.16\)/);
    } finally {
      setMonsterDbForTests(null);
    }
    // The rollout's move table takes the same number and marks it.
    expect(enemyTable("THE_INSATIABLE", 9, monsters as never, {})!.moves["LUNGING_BITE_MOVE"]).toMatchObject({ damage: bite.perHit, estimated: true });
    expect(enemyTable("THE_INSATIABLE", 8, monsters as never, {})!.moves["LUNGING_BITE_MOVE"]!.estimated).toBeUndefined();
  });
});

describe("an ascension no fight is logged at yet (A10): the A8 -> A9 ratio carries on, not the bare A8 damage (review 2026-09-29 #1)", () => {
  const at = (bases: Record<string, number>, hits = 1) =>
    ({ damage_by_asc: Object.fromEntries(Object.entries(bases).map(([asc, base]) => [asc, { base_per_hit: { [String(base)]: 3 }, hits: { [String(hits)]: 3 } }])) });
  // Logged at A8 and A9 (measures A8 -> A9 = 22/19); nothing anywhere at A10.
  const monsters: MonsterMoveData = {
    CRUSHER: { moves: { GUARDED_STRIKE_MOVE: at({ "8": 19, "9": 22 }) } },
    // An act-3 body only ever fought at A8: its damage at A9 and A10 is A8 x 22/19.
    TORCH_HEAD_AMALGAM: {
      moves: {
        STRONG_TACKLE_MOVE: { ...at({ "8": 26 }), name: "强力冲撞", turns_seen: { "1": 3 }, next: { BEAM_MOVE: 3 } },
        // Base never measured (a debuff always in the way): the shown hit, scaled the same way.
        BEAM_MOVE: { damage_by_asc: { "8": { shown: { "12x3": 3 } } }, next: { STRONG_TACKLE_MOVE: 3 } },
      },
    },
    // Logged at A9 only: A9's number at A10 (x1 until A10 is logged).
    VANTOM: { moves: { DISMEMBER_MOVE: at({ "9": 30 }) } },
  };

  it("moveDamageAt at A10 equals A9's estimate, with where the measured chain stops", () => {
    const a9 = moveDamageAt(monsters, "TORCH_HEAD_AMALGAM", "STRONG_TACKLE_MOVE", 9)!;
    const a10 = moveDamageAt(monsters, "TORCH_HEAD_AMALGAM", "STRONG_TACKLE_MOVE", 10)!;
    expect(a9).toMatchObject({ perHit: Math.round((26 * 22) / 19), estimated: true, from: 8, ratioTo: 9 });
    expect(a10).toMatchObject({ perHit: a9.perHit, estimated: true, from: 8, ratioTo: 9, ratioN: 1, ratioOwn: false });
    expect(a10.ratio).toBeCloseTo(22 / 19, 10);
    expect(chainedDamageRatio(monsters, "TORCH_HEAD_AMALGAM", 8, 10)).toMatchObject({ reached: 9, n: 1 });
    // Logged at A9 only: A9's number at A10, estimated, the chain at A9.
    expect(moveDamageAt(monsters, "VANTOM", "DISMEMBER_MOVE", 10)).toMatchObject({ perHit: 30, estimated: true, from: 9, ratio: 1, ratioTo: 9 });
  });

  it("the per-turn damage (boss clock, rollout) and the dossier at A10 carry the A9 scaling", () => {
    const a9 = monsterDamageByTurn("TORCH_HEAD_AMALGAM", 9, 3, monsters)!;
    const a10 = monsterDamageByTurn("TORCH_HEAD_AMALGAM", 10, 3, monsters)!;
    // T1 Strong Tackle 26 x 22/19 = 30; T2 Beam shown 12 x 22/19 = 14, x3.
    expect(a9.perTurn).toEqual([30, 42, 30]);
    expect(a10).toEqual(a9);
    expect(enemyTable("TORCH_HEAD_AMALGAM", 10, monsters as never, {})!.moves["STRONG_TACKLE_MOVE"]).toMatchObject({ damage: 30, estimated: true });
    setMonsterDbForTests({ bosses: { QUEEN: { "8": { fights: 3, parts: { TORCH_HEAD_AMALGAM: { median: 211, n: 3 } } } } }, encounters: {}, monsters } as never);
    try {
      expect(bossDossier("QUEEN_BOSS", 10)).toMatch(/强力冲撞 30 \(A10估: A8×1\.16，A9→A10 未测按 ×1\)/);
      expect(bossDossier("QUEEN_BOSS", 9)).toMatch(/强力冲撞 30 \(A9估: A8×1\.16\)/);
    } finally {
      setMonsterDbForTests(null);
    }
  });
});

describe("buffs at the ascension asked for, not pooled over every ascension (review 2026-09-29 #6)", () => {
  // Kin Priest as logged: Ritual +2 at A8 (39 fights of 80 pooled), +3 at A9 (6); the pooled mode says +2.
  const monsters = {
    KIN_PRIEST: {
      name: { zh: "同族神官" },
      moves: {
        BEAM_MOVE: { name: "灵魂光束", turns_seen: { "1": 5 }, next: { RITUAL_MOVE: 5 }, damage_by_asc: { "8": { base_per_hit: { "3": 5 }, hits: { "3": 5 } }, "9": { base_per_hit: { "3": 5 }, hits: { "3": 5 } } } },
        RITUAL_MOVE: {
          name: "黑暗仪式",
          next: { BEAM_MOVE: 5 },
          self_powers_gained: { STRENGTH_POWER: { "2": 80, "3": 6 } },
          self_powers_gained_by_asc: { "0": { STRENGTH_POWER: { "2": 41 } }, "8": { STRENGTH_POWER: { "2": 39 } }, "9": { STRENGTH_POWER: { "3": 6 } } },
        },
      },
    },
    WATERFALL_GIANT: {
      name: { zh: "瀑布巨兽" },
      moves: { RAM_MOVE: { name: "撞击", turns_seen: { "1": 3 }, next: { RAM_MOVE: 3 }, damage_by_asc: { "9": { base_per_hit: { "11": 3 }, hits: { "1": 3 } } } } },
      // Steam Eruption first seen at 15 up to A8, 20 at A9; pooled 15.
      powers: { STEAM_ERUPTION_POWER: { name: "蒸汽喷发", type: "Buff", n_fights: 58, amount_at_first_sight: { "15": 53, "20": 5 }, amount_at_first_sight_by_asc: { "8": { "15": 27 }, "9": { "20": 5 } } } },
    },
    // No per-ascension split: the pooled counts.
    TERROR_EEL: { moves: { THRASH_MOVE: { self_powers_gained: { VIGOR_POWER: { "6": 75 } } } } },
  };
  const ritual = monsters.KIN_PRIEST.moves.RITUAL_MOVE;

  it("selfGainAt: this ascension, else the nearest logged one, else the pooled counts", () => {
    expect(selfGainAt(ritual, "STRENGTH_POWER", 8)).toBe(2);
    expect(selfGainAt(ritual, "STRENGTH_POWER", 9)).toBe(3);
    expect(selfGainAt(ritual, "STRENGTH_POWER", 10)).toBe(3);
    expect(selfGainAt(monsters.TERROR_EEL.moves.THRASH_MOVE, "VIGOR_POWER", 9)).toBe(6);
    expect(selfGainAt(ritual, "VIGOR_POWER", 9)).toBeNull();
  });

  it("the rollout's move table, the damage by turn and the dossier take A9's Ritual and Steam Eruption", () => {
    expect(enemyTable("KIN_PRIEST", 9, monsters as never, {})!.moves["RITUAL_MOVE"]!.strength).toBe(3);
    expect(enemyTable("KIN_PRIEST", 8, monsters as never, {})!.moves["RITUAL_MOVE"]!.strength).toBe(2);
    // T1 Beam 3x3, T2 Ritual, T3 Beam (3+3)x3 at A9, (3+2)x3 at A8.
    expect(monsterDamageByTurn("KIN_PRIEST", 9, 3, monsters as never)!.perTurn).toEqual([9, 0, 18]);
    expect(monsterDamageByTurn("KIN_PRIEST", 8, 3, monsters as never)!.perTurn).toEqual([9, 0, 15]);
    setMonsterDbForTests({
      bosses: {
        THE_KIN: { "9": { fights: 4, parts: { KIN_PRIEST: { median: 199, n: 4 } } } },
        WATERFALL_GIANT: { "9": { fights: 5, parts: { WATERFALL_GIANT: { median: 250, n: 5 } } } },
      },
      encounters: {},
      monsters,
    } as never);
    try {
      expect(bossDossier("THE_KIN_BOSS", 9)).toContain("黑暗仪式 +3力");
      expect(bossDossier("THE_KIN_BOSS", 8)).toContain("黑暗仪式 +2力");
      expect(bossDossier("WATERFALL_GIANT_BOSS", 9)).toContain("能力: 蒸汽喷发 20");
      expect(bossDossier("WATERFALL_GIANT_BOSS", 8)).toContain("能力: 蒸汽喷发 15");
    } finally {
      setMonsterDbForTests(null);
    }
  });
});

describe("block a move gives at the ascension asked for (review 2026-09-29 #6: the Matriarch's Slash 2)", () => {
  it("12 up to A7, 14 from A8: the rollout reads the split, not the pooled 30/30 tie", () => {
    const db = {
      LAGAVULIN_MATRIARCH: {
        moves: {
          SLASH2_MOVE: {
            damage_by_asc: { "8": { base_per_hit: { "12": 5 }, hits: { "1": 5 } } },
            block_gained: { "12": 30, "14": 30 },
            block_gained_by_asc: { "0": { "12": 26 }, "7": { "12": 4 }, "8": { "12": 1, "14": 29 }, "9": { "14": 1 } },
          },
        },
      },
    };
    expect(enemyTable("LAGAVULIN_MATRIARCH", 8, db as never, {})!.moves["SLASH2_MOVE"]!.block).toBe(14);
    expect(enemyTable("LAGAVULIN_MATRIARCH", 9, db as never, {})!.moves["SLASH2_MOVE"]!.block).toBe(14);
    expect(enemyTable("LAGAVULIN_MATRIARCH", 10, db as never, {})!.moves["SLASH2_MOVE"]!.block).toBe(14);
    expect(enemyTable("LAGAVULIN_MATRIARCH", 7, db as never, {})!.moves["SLASH2_MOVE"]!.block).toBe(12);
    // A DB built before the split: the pooled counts.
    const pooled = { X: { moves: { GUARD_MOVE: { block_gained: { "9": 3, "12": 8 } } } } };
    expect(enemyTable("X", 9, pooled as never, {})!.moves["GUARD_MOVE"]!.block).toBe(12);
  });
});

describe("the Terror Eel's Vigor reaches the rollout's move table (XLJQ6FPQAU7N F7)", () => {
  it("Thrash's self-given Vigor is the move's vigor; Crash keeps its base (the builder leaves Vigor turns out of it)", () => {
    const base = (asc: string, perHit: number, hits = 1) => ({ damage_by_asc: { [asc]: { base_per_hit: { [String(perHit)]: 4 }, hits: { [String(hits)]: 4 } } } });
    const db = { TERROR_EEL: { moves: { CRASH_MOVE: base("9", 18), THRASH_MOVE: { ...base("9", 4, 3), self_powers_gained: { VIGOR_POWER: { "6": 75 } } } } } };
    const a9 = enemyTable("TERROR_EEL", 9, db as never, {})!;
    expect(a9.moves["CRASH_MOVE"]).toMatchObject({ damage: 18, hits: 1 });
    expect(a9.moves["CRASH_MOVE"]!.vigor).toBeUndefined();
    expect(a9.moves["THRASH_MOVE"]).toMatchObject({ damage: 4, hits: 3, vigor: 6 });
  });
});

describe("Surrounded: a Kaiser Crab claw's base and how often it hit from behind (A9 Laser 35 < A8 47 was A8's back attack)", () => {
  // Monster DB as the builder now writes it: bases from turns that showed both facings (A8 Laser 31, 49 from
  // behind; A9 35), and how many logged turns each move came from behind or from in front.
  const monsters: MonsterMoveData = {
    ROCKET: {
      moves: {
        LASER_MOVE: {
          name: "激光",
          turns_seen: { "1": 3 },
          next: { LASER_MOVE: 3 },
          damage_by_asc: { "8": { base_per_hit: { "31": 16 }, hits: { "1": 29 } }, "9": { base_per_hit: { "35": 1 }, hits: { "1": 2 } } },
          back_attack_by_asc: { "8": { behind: 24, facing: 5 }, "9": { behind: 1, facing: 1 } },
        },
      },
    },
  };

  it("the hit as it lands on average: the base x (1 + 0.5 x the share of turns behind), pooled over ascensions", () => {
    const share = 25 / 31;
    expect(backAttackShare(monsters["ROCKET"]!.moves!["LASER_MOVE"])).toBeCloseTo(share, 10);
    expect(moveDamageAt(monsters, "ROCKET", "LASER_MOVE", 9)).toMatchObject({ base: 35, perHit: Math.round(35 * (1 + 0.5 * share)), estimated: false });
    expect(moveDamageAt(monsters, "ROCKET", "LASER_MOVE", 8)).toMatchObject({ base: 31, perHit: Math.round(31 * (1 + 0.5 * share)) });
    // A9 hits harder than A8 on the bases.
    expect(ascensionDamageRatio(monsters, "ROCKET", 8, 9)!.ratio).toBeCloseTo(35 / 31, 10);
    // The rollout's table takes the average; the dossier shows the base and the back attack.
    expect(enemyTable("ROCKET", 9, monsters as never, {})!.moves["LASER_MOVE"]!.damage).toBe(Math.round(35 * (1 + 0.5 * share)));
    setMonsterDbForTests({ bosses: { KAISER_CRAB: { "9": { fights: 2, parts: { ROCKET: { median: 209, n: 2 } } } } }, encounters: {}, monsters } as never);
    try {
      expect(bossDossier("KAISER_CRAB_BOSS", 9)).toContain("激光 35 (在背后 ×1.5 = 52，记录中 81% 的回合在背后)");
    } finally {
      setMonsterDbForTests(null);
    }
    // A move never logged under Surrounded is its base.
    expect(backAttackShare({ damage_by_asc: {} })).toBeNull();
  });
});

function realMonsters(): MonsterMoveData {
  return (JSON.parse(readFileSync(knowledgeFile(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "knowledge"), "monster-db.json"), "utf8")) as { monsters: MonsterMoveData }).monsters;
}

describe("a monster's expected attack by turn, along its logged moves", () => {
  it("turn-1 move, then its successors; Strength its moves gain adds to later hits; a fight-ending move is no turn", () => {
    const db: MonsterMoveData = {
      BRUTE: {
        moves: {
          // T1 always Roar (+2 Strength, no attack), then Smash 10x2, then Roar again; Smash sometimes ends in Explode (death).
          ROAR: { turns_seen: { "1": 5 }, next: { SMASH: 5 }, self_powers_gained: { STRENGTH_POWER: { "2": 5 } } },
          SMASH: { next: { ROAR: 4, EXPLODE: 1 }, damage_by_asc: { "8": { base_per_hit: { "10": 5 }, hits: { "2": 5 } } } },
          EXPLODE: { damage_by_asc: { "8": { base_per_hit: { "60": 1 }, hits: { "1": 1 } } } },
        },
      },
    };
    const out = monsterDamageByTurn("BRUTE", 8, 4, db)!;
    // T1 Roar 0; T2 Smash (10 + 2) x 2; T3 Roar 0; T4 Smash (10 + 4) x 2. Explode (no successors) is never walked into.
    expect(out.perTurn).toEqual([0, 24, 0, 28]);
    expect(out.estimated).toBe(false);
    // At A9 (not logged) the Smash is scaled by the pooled ratio; with no pairs anywhere it stays x1, marked.
    expect(monsterDamageByTurn("BRUTE", 9, 2, db)).toEqual({ perTurn: [0, 24], estimated: true });
  });
});


describe("the act boss's HP cost when the nearest ascension has no win (review 2026-09-29 #7)", () => {
  // Kaiser Crab as logged: A8 wins; A9 0 wins in 2 fights, their per-turn loss 13.4. Test Subject: no win at A8 or A9.
  const db = {
    bosses: {
      KAISER_CRAB: {
        "8": { fights: 23, win_rate: 0.4, hp_loss_won: { median: 38, p75: 52, n: 9 }, hp_loss_per_turn: { median: 9.8, p75: 12, n: 23 } },
        "9": { fights: 2, win_rate: 0, hp_loss_won: { median: null, p75: null, n: 0 }, hp_loss_per_turn: { median: 13.4, p75: 13.6, n: 2 } },
      },
      TEST_SUBJECT: { "8": { fights: 3, win_rate: 0, hp_loss_won: { median: null, p75: null, n: 0 }, hp_loss_per_turn: { median: 7.1, p75: 8, n: 3 } } },
    },
    encounters: {},
    monsters: {},
  };

  it("the win sample walks to the nearest ascension with a win; the per-turn loss and the record stay at the nearest logged one", () => {
    setMonsterDbForTests(db as never);
    try {
      expect(bossHpLoss("KAISER_CRAB_BOSS", 9)).toEqual({
        won: { median: 38, p75: 52, n: 9, asc: 8 },
        fights: 2,
        winRate: 0,
        recordAsc: 9,
        perTurn: { median: 13.4, n: 2, asc: 9 },
      });
      expect(bossHpLoss("KAISER_CRAB_BOSS", 10)).toMatchObject({ won: { asc: 8 }, recordAsc: 9, perTurn: { median: 13.4, asc: 9 } });
      expect(bossHpLoss("KAISER_CRAB_BOSS", 8)).toMatchObject({ won: { median: 38, asc: 8 }, perTurn: { median: 9.8, asc: 8 } });
      // No win anywhere: no win sample, but the per-turn loss is still measured.
      expect(bossHpLoss("TEST_SUBJECT_BOSS", 10)).toMatchObject({ won: null, perTurn: { median: 7.1, n: 3, asc: 8 } });
      expect(bossHpLoss("NOT_A_BOSS", 9)).toBeNull();
      // The forced-boss cost says which ascension its wins come from.
      expect(forcedFightCost("Boss", 2, 9, "KAISER_CRAB_BOSS")).toEqual({
        median: 38,
        p75: 52,
        source: "act boss KAISER_CRAB_BOSS, HP lost in our A8 (no A9 win logged) wins, n=9; A9 win rate 0% over 2 fights",
      });
      expect(forcedFightCost("Boss", 3, 10, "TEST_SUBJECT_BOSS")).toBeNull();
    } finally {
      setMonsterDbForTests(null);
    }
  });
});
