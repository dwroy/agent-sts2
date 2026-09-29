/** The monster DB as DeepSeek sees it, and the per-fight move model the solver reads. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { actThreats, ascensionDamageRatio, bossDossier, moveDamageAt, monsterLine, monstersNamedIn, nearestAscension, type MonsterMoveData } from "../src/knowledge/monster-db.js";
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

  it("the real DB: A9 moves hit harder than A8 on average; The Insatiable (no A9 fight) is scaled and says so", () => {
    const ratio = ascensionDamageRatio({}, "NONE", 8, 9);
    expect(ratio).toBeNull();
    const bite = moveDamageAt(realMonsters(), "THE_INSATIABLE", "LUNGING_BITE_MOVE", 9)!;
    expect(bite.estimated).toBe(true);
    expect(bite.from).toBe(8);
    expect(bite.ratio).toBeGreaterThan(1);
    expect(bite.perHit).toBe(Math.round(28 * bite.ratio));
    expect(bossDossier("THE_INSATIABLE_BOSS", 9)).toMatch(/A9估: A8×\d\.\d\d/);
    // The rollout's move table takes the same number and marks it.
    const table = enemyTable("THE_INSATIABLE", 9, realMonsters() as never, {})!;
    expect(table.moves["LUNGING_BITE_MOVE"]).toMatchObject({ damage: bite.perHit, estimated: true });
    expect(enemyTable("THE_INSATIABLE", 8, realMonsters() as never, {})!.moves["LUNGING_BITE_MOVE"]!.estimated).toBeUndefined();
  });
});

function realMonsters(): MonsterMoveData {
  return (JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/knowledge/monster-db.json"), "utf8")) as { monsters: MonsterMoveData }).monsters;
}

