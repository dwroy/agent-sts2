/** The monster DB as DeepSeek sees it, and the per-fight move model the solver reads. */

import { describe, expect, it } from "vitest";

import { actThreats, bossDossier, monsterLine, monstersNamedIn, nearestAscension } from "../src/knowledge/monster-db.js";
import { expectedNextDamage, moveModel } from "../src/knowledge/move-model.js";

describe("monster DB facts for DeepSeek", () => {
  it("uses the ascension asked for, else says n=0 and labels the nearest logged one", () => {
    expect(nearestAscension({ "0": 1, "7": 1, "8": 1 }, 8)).toEqual({ key: "8", exact: true });
    expect(nearestAscension({ "0": 1, "7": 1, "8": 1 }, 9)).toEqual({ key: "8", exact: false });
    expect(nearestAscension({ "6": 1, "8": 1 }, 7)).toEqual({ key: "8", exact: false });
    expect(bossDossier("VANTOM_BOSS", 8)).toMatch(/A8: HP .*\(n=\d+\)/);
    expect(bossDossier("VANTOM_BOSS", 9)).toContain("A9 无记录 (n=0)，以下为最近的 A8");
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
