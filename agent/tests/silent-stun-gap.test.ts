/** silent-0127: 3KME36ADUE4U A7 F27 T1/T2; earliest 53FLQ68CETW0 A6 F30 T3/T4. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import { board, card } from "./boss-sim-fixture.js";
import { rolloutDecision, simulateFight, type EnemyTable } from "../src/reflex/rollout.js";
import { liveRollout, rolloutFacts } from "../src/reflex/rollout-live.js";
import { solveTurn } from "../src/reflex/turn-solver.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { createScreenMemory } from "../src/memory/types.js";

// Missing references are intentional fixed inputs, never the refreshing knowledge files.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed missing stun model"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const move = (damage: number) => ({ damage, hits: 1, strength: 0, block: 0 });
const known: EnemyTable = {
  moves: { STUNNED: move(0), ROLL_OUT_MOVE: move(16) },
  next: { STUNNED: { ROLL_OUT_MOVE: 1 }, ROLL_OUT_MOVE: { ROLL_OUT_MOVE: 1 } },
};

function observed(table?: EnemyTable) {
  const sim = (index: number, hp: number, damage: number) => ({
    index, name: index === 0 ? "熟睡甲虫" : "盛碗虫（丝）", hp, maxHp: index === 0 ? 86 : 43,
    block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false,
    attacks: damage ? [{ damage, hits: 1 }] : [],
  });
  const input = board({ playerHp: 23, enemies: [
    { sim: sim(0, 65, 0), info: { index: 0, id: "SLUMBERING_BEETLE", move: "STUNNED", strength: 0, powers: {} } },
    { sim: sim(1, 29, 8), info: { index: 1, id: "BOWLBUG_SILK", move: "ATTACK", strength: 0, powers: {} } },
  ], tables: { ...(table ? { SLUMBERING_BEETLE: table } : {}), BOWLBUG_SILK: { moves: { ATTACK: move(8) }, next: { ATTACK: { ATTACK: 1 } } } } });
  input.meta = { ...input.meta, act: 2, asc: 7, t: 1, kind: "hallway", enc: "SLUMBERING_BEETLE|BOWLBUG_SILK" };
  input.solver = { ...input.solver, hand: [], fightKind: "monster", player: { ...input.solver.player, block: 8, energy: 0 } };
  input.plans = solveTurn(input.solver).plans;
  input.piles = { draw: [0, 1].map((i) => card(i, "DEFEND_SILENT", { type: "Skill", target: "self", validTargets: [], block: 7 })), discard: [], handBase: [] };
  input.options = { horizon: 3, samples: 2, budgetMs: 1000, now: () => 0 };
  return input;
}

it.each([undefined, { moves: { STUNNED: move(0) }, next: {} }, { moves: { STUNNED: move(0) }, next: { STUNNED: {} } }])(
  "F27 T1: absent or empty stun successors cannot report harmless future turns (%s)", (table) => {
    const input = observed(table);
    const result = rolloutDecision(input);
    expect(result.unavailable).toContain("后续预测未知");
    expect(result.lines).toEqual([]);
    expect(result.samples).toBe(0);
    // A full-fight caller must reject the same unknown future instead of interpreting it as no damage.
    expect(() => simulateFight(input, input.plans[0]!, 3, 1, false)).toThrow("后续预测未知");
  },
);

it("a recorded successor with no damage model cannot reuse the shown zero attack", () => {
  const result = rolloutDecision(observed({ moves: { STUNNED: move(0) }, next: known.next }));
  expect(result.unavailable).toContain("伤害数据缺失");
  expect(result.lines).toEqual([]);
});

it("observed successor damage gives 16 + 8 incoming and ten HP loss after fourteen Block", () => {
  const input = observed(known);
  const result = rolloutDecision(input);
  expect(result.unavailable).toBeUndefined();
  const records = simulateFight(input, input.plans[0]!, 2, 1, false).records;
  expect(records[0]!.loss).toBe(0);
  expect(records[1]!.snap.E.reduce((sum, enemy) => sum + enemy[7], 0)).toBe(24);
  expect(records[1]!.snap.blk).toBe(14);
  expect(records[1]!.loss).toBe(10);
});

it("missing-model facts contain the reason and provide no best or survival ranking", () => {
  const input = observed();
  const state = parseGameState({ state_version: 1, session: { mode: "singleplayer", phase: "run" }, available_actions: [],
    screen: "COMBAT", in_combat: true, run_id: "3KME36ADUE4U", turn: 1,
    run: { character_id: "SILENT", ascension: 7, floor: 27, current_hp: 23, max_hp: 70, max_energy: 3, deck: [], relics: [], potions: [] },
    combat: { player: { current_hp: 23, max_hp: 70, block: 8, energy: 0, powers: [] }, hand: [], enemies: [
      { index: 0, enemy_id: "SLUMBERING_BEETLE", move_id: "STUNNED", is_alive: true, current_hp: 65, max_hp: 86, powers: [] },
      { index: 1, enemy_id: "BOWLBUG_SILK", move_id: "ATTACK", is_alive: true, current_hp: 29, max_hp: 43, powers: [] },
    ] } });
  const r = liveRollout({ state, knowledge: makeKnowledge({ cards: [] }, "cache"), memory: createScreenMemory("COMBAT"),
    solver: input.solver, plans: input.plans, shown: input.plans, piles: input.piles, model: null, gates: null });
  expect(r.available).toBe(false);
  const facts = rolloutFacts(input.plans[0]!, r);
  expect(facts).toEqual({ rollout: "rollout unavailable (眩晕后继招式或伤害数据缺失，后续预测未知)" });
});
