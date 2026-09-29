/** The monster DB as DeepSeek sees it, and the per-fight move model the solver reads. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { actThreats, ascensionDamageRatio, bossDossier, monsterDamageByTurn, moveDamageAt, monsterLine, monstersNamedIn, nearestAscension, type MonsterMoveData } from "../src/knowledge/monster-db.js";
import { enemyTable } from "../src/strategy/rollout-live.js";
import { expectedNextDamage, moveModel } from "../src/knowledge/move-model.js";

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

  it("the real DB: A9 moves hit harder than A8 on average; a boss with no A9 fight is scaled and says so", () => {
    const ratio = ascensionDamageRatio({}, "NONE", 8, 9);
    expect(ratio).toBeNull();
    // A boss move logged at A8 but not at A9 (The Insatiable's Lunging Bite until its first A9 fight; the
    // check is skipped once every boss has been fought at A9).
    const monsters = realMonsters();
    const logged = (id: string, move: string, asc: string) => Object.keys(monsters[id]?.moves?.[move]?.damage_by_asc?.[asc]?.base_per_hit ?? {}).length > 0;
    const pick = (["THE_INSATIABLE", "CEREMONIAL_BEAST", "AEONGLASS", "QUEEN"] as const)
      .flatMap((id) => Object.keys(monsters[id]?.moves ?? {}).map((move) => [id, move] as const))
      .find(([id, move]) => logged(id, move, "8") && !Object.values(monsters[id]?.moves ?? {}).some((entry) => Object.keys(entry.damage_by_asc?.["9"]?.base_per_hit ?? {}).length > 0));
    if (!pick) return;
    const [boss, move] = pick;
    const bite = moveDamageAt(monsters, boss, move, 9)!;
    expect(bite.estimated).toBe(true);
    expect(bite.from).toBe(8);
    expect(bite.ratio).toBeGreaterThan(1);
    expect(bite.perHit).toBe(Math.round(moveDamageAt(monsters, boss, move, 8)!.perHit * bite.ratio));
    expect(bossDossier(`${boss}_BOSS`, 9)).toMatch(/A9估: A8×\d\.\d\d/);
    // The rollout's move table takes the same number and marks it.
    const table = enemyTable(boss, 9, monsters as never, {})!;
    expect(table.moves[move]).toMatchObject({ damage: bite.perHit, estimated: true });
    expect(enemyTable(boss, 8, monsters as never, {})!.moves[move]!.estimated).toBeUndefined();
  });
});

describe("the Terror Eel's Vigor in the real DB (XLJQ6FPQAU7N F7)", () => {
  it("Crash's base damage leaves Vigor out; Thrash gives the Vigor the rollout adds to the next attack", () => {
    const a9 = enemyTable("TERROR_EEL", 9, realMonsters() as never, {})!;
    expect(a9.moves["CRASH_MOVE"]!.damage).toBe(18);
    expect(a9.moves["THRASH_MOVE"]!.vigor).toBe(6);
    expect(enemyTable("TERROR_EEL", 8, realMonsters() as never, {})!.moves["CRASH_MOVE"]!.damage).toBe(16);
  });
});

function realMonsters(): MonsterMoveData {
  return (JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/knowledge/monster-db.json"), "utf8")) as { monsters: MonsterMoveData }).monsters;
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

