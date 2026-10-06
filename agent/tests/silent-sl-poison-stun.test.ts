/** KUZVERN40NGK SILENT A10 F17 attempts 3/5/final T5/T6; ledger silent-0195. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-sl-poison-stun-evidence.json";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { enemySims } from "../src/reflex/combat-plan.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";
import { judgeEndTurn } from "../src/sl/judge.js";

// Optional solver references must never load refreshing knowledge data.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed poison stun references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [], powers: [], relics: [] }, "cache");
function board(key: keyof typeof evidence) {
  const frame = structuredClone(evidence[key]);
  return { ...frame, state_version: 1, run_id: "KUZVERN40NGK", screen: "COMBAT", in_combat: true,
    session: { mode: "singleplayer", phase: "run" }, available_actions: ["end_turn"] };
}
function judge(raw: ReturnType<typeof board>) {
  return judgeEndTurn(parseGameState(raw), { label: "combat/end_turn", revives: [], ethereal: () => false, knowledge });
}
function outcome(raw: ReturnType<typeof board>) {
  const player = raw.combat.player;
  const input: SolverInput = {
    hand: [], player: { hp: player.current_hp, maxHp: player.max_hp, block: player.block, energy: player.energy,
      weak: false, vulnerable: false, intangible: false,
      poisonExtraTriggers: player.powers.find((power) => power.power_id === "ACCELERANT_POWER")?.amount ?? 0 },
    enemies: enemySims(raw.combat), fightKind: "boss", turn: raw.turn,
  };
  return replaySteps(input, [])!.outcome;
}

it.each([
  ["attempt3-turn5", 11, 153, 11],
  ["attempt5-turn6", 23, 144, 3],
  ["attempt6-turn6", 17, 156, 3],
] as const)("F17 %s: poison crosses 160 HP, cancelling the attack in both judge and solver", (key, damage, hp, playerHp) => {
  const raw = board(key);
  expect(raw.combat.end_turn_will_kill_player).toBe(true);
  expect(outcome(raw)).toMatchObject({ damageDealt: damage, hpLoss: 0, hpAfter: playerHp,
    enemyHpAfter: [expect.objectContaining({ hp })] });
  expect(judge(raw)).toMatchObject({ certain: false, tier: null });
  expect(judge(raw).reason).toContain("its stun at 160 HP");
});

it("final T6 needs both decremented triggers; without Accelerant nine poison does not cross 160", () => {
  const raw = board("attempt6-turn6");
  raw.combat.player.powers = raw.combat.player.powers.filter((power) => power.power_id !== "ACCELERANT_POWER");
  expect(outcome(raw)).toMatchObject({ damageDealt: 9, hpLoss: 28 });
  expect(judge(raw).reason).not.toContain("may be stunned first");
});

it("poison reaching the threshold exactly vetoes death, but one HP above it does not", () => {
  const raw = board("attempt3-turn5");
  raw.combat.enemies[0]!.current_hp = 171;
  expect(judge(raw).certain).toBe(false);
  raw.combat.enemies[0]!.current_hp = 172;
  expect(judge(raw).certain).toBe(true);
  expect(outcome(raw)).toMatchObject({ damageDealt: 11, hpLoss: 26 });
});

it("poison does not strip counters or reuse a spent threshold, and another lethal attacker still counts", () => {
  const raw = board("attempt3-turn5");
  raw.combat.enemies[0]!.powers = raw.combat.enemies[0]!.powers.filter((power) => power.power_id !== "PLOW_POWER");
  raw.combat.enemies[0]!.powers.push({ index: 9, power_id: "CURL_UP_POWER", name: "蜷身", amount: 9, is_debuff: false });
  expect(judge(raw).certain).toBe(true);
  const spent = board("attempt3-turn5");
  spent.combat.enemies[0]!.current_hp = 160;
  expect(judge(spent).certain).toBe(true);
  const extra = board("attempt3-turn5");
  const enemy = structuredClone(extra.combat.enemies[0]!);
  enemy.index = 1;
  enemy.powers = [];
  extra.combat.enemies.push(enemy);
  expect(judge(extra).certain).toBe(true);
});

it("the observed final T7 keeps three HP after poison and has spent Plow and Strength", () => {
  const raw = board("attempt6-turn7");
  expect(raw.combat.player.current_hp).toBe(3);
  expect(raw.combat.enemies[0]!.current_hp).toBe(156);
  expect(raw.combat.enemies[0]!.powers.some((power) => ["PLOW_POWER", "STRENGTH_POWER"].includes(power.power_id))).toBe(false);
  expect(judge(raw).certain).toBe(false);
});

it("preserves poison-free verdicts and other characters' existing single-trigger judge", () => {
  const dry = board("attempt3-turn5");
  dry.combat.enemies[0]!.powers = dry.combat.enemies[0]!.powers.filter((power) => power.power_id !== "POISON_POWER");
  expect(judge(dry).certain).toBe(true);
  const other = board("attempt3-turn5");
  other.run.character_id = "IRONCLAD";
  expect(judge(other).certain).toBe(true);
  // Removing Plow and placing the enemy between one and two triggers isolates the poison upper bound.
  other.combat.enemies[0]!.powers = other.combat.enemies[0]!.powers.filter((power) => power.power_id !== "PLOW_POWER");
  other.combat.enemies[0]!.current_hp = 10;
  expect(judge(other).certain).toBe(true);
  other.run.character_id = "SILENT";
  expect(judge(other).certain).toBe(false);
});
