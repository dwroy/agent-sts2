/** LWQYSREHMMJ7 SILENT A10 F30 attempts 1/2; ledger silent-0326. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-sl-beetle-evidence.json";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { judgeEndTurn } from "../src/sl/judge.js";

// Keep optional imports independent of refreshing knowledge files.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).includes("/knowledge/characters/")) {
      throw Object.assign(new Error("ENOENT: fixed beetle evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [], powers: [], relics: [] }, "cache");
function board(key: keyof typeof evidence = "attempt2-turn3"): Record<string, any> {
  return structuredClone(evidence[key]);
}
function judge(raw: Record<string, any>, revives: Parameters<typeof judgeEndTurn>[1]["revives"] = []) {
  return judgeEndTurn(parseGameState(raw), { label: "combat/end_turn", revives, knowledge });
}

it("counts the awakened beetle after poison kills the rock: 13 against 3 HP + 5 block", () => {
  const raw = board();
  const result = judge(raw);
  expect(result).toMatchObject({ certain: true, tier: "rules", hp: 3, block: 5 });
  expect(result.reason).toContain("石虫毒死后甲虫滚动攻击仍计入下界");
  const after = board("attempt2-death");
  expect(after.combat.player.current_hp).toBe(0);
  expect(after.combat.enemies.map((e: any) => e.enemy_id)).toEqual(["BOWLBUG_SILK", "SLUMBERING_BEETLE"]);
  expect(after.combat.enemies[1]).toMatchObject({ current_hp: 82, move_id: "ROLL_OUT_MOVE" });
});

it("preserves the actual surviving first attempt and its later correct death verdict", () => {
  const before = board("attempt1-turn4");
  expect(judge(before).certain).toBe(false);
  expect(board("attempt1-turn5").combat.player.current_hp).toBe(4);
  expect(judge(board("attempt1-turn8")).certain).toBe(true);
});

it("uses only the retained attack: eight HP dies, nine HP lives; revival still vetoes death", () => {
  const raw = board();
  raw.combat.player.current_hp = 8;
  expect(judge(raw).certain).toBe(true);
  raw.combat.player.current_hp = 9;
  expect(judge(raw).certain).toBe(false);
  expect(judge(board(), ["FAIRY_IN_A_BOTTLE"]).certain).toBe(false);
});

it.each(["IRONCLAD", "DEFECT"])("leaves %s's existing conservative verdict unchanged", (character) => {
  const raw = board();
  raw.run.character_id = character;
  expect(judge(raw).certain).toBe(false);
});

it.each([7, 9, 11])("leaves unobserved ascension %s unchanged", (ascension) => {
  const raw = board();
  raw.run.ascension = ascension;
  expect(judge(raw).certain).toBe(false);
});

it.each([
  ["another companion", (raw: any) => { raw.combat.enemies[0].enemy_id = "BOWLBUG_EGG"; }],
  ["silk also dying", (raw: any) => { raw.combat.enemies[1].current_hp = 3; }],
  ["silk dying instead", (raw: any) => { raw.combat.enemies[0].current_hp = 40; raw.combat.enemies[1].current_hp = 3; }],
  ["another beetle move", (raw: any) => { raw.combat.enemies[2].move_id = "SLEEP_MOVE"; }],
  ["missing move", (raw: any) => { delete raw.combat.enemies[2].move_id; }],
  ["another beetle power", (raw: any) => { raw.combat.enemies[2].powers.push({ power_id: "UNKNOWN_POWER", amount: 1 }); }],
  ["another companion power", (raw: any) => { raw.combat.enemies[0].powers.push({ power_id: "UNKNOWN_POWER", amount: 1 }); }],
  ["beetle also dying", (raw: any) => { raw.combat.enemies[2].current_hp = 3; }],
  ["a multi-hit move", (raw: any) => { raw.combat.enemies[2].intents[0].hits = 2; }],
  ["retaliation", (raw: any) => { raw.combat.player.powers.push({ power_id: "THORNS_POWER", amount: 1 }); }],
  ["another pre-attack damage source", (raw: any) => { raw.run.relics.push({ relic_id: "STONE_CALENDAR", stack: 7 }); raw.turn = 7; }],
] as const)("keeps the conservative bound for %s", (_label, change) => {
  const raw = board();
  change(raw);
  expect(judge(raw).certain).toBe(false);
});
