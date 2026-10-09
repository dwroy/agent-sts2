import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import evidence from "./silent-gardener-skittish-evidence.json";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { enemySims } from "../src/reflex/combat-plan.js";
import { boardRolloutInput } from "../src/reflex/rollout-live.js";
import { rolloutDecision, simulateFight, type RolloutInput } from "../src/reflex/rollout.js";
import { replaySteps, solveTurn } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

// No refreshed knowledge or network can supply a number to these fixed own-character cases.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Gardener evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [] }, "cache");

function probe(character = "silent", asc = 10, id = "PHANTASMAL_GARDENER", amount = 7): RolloutInput {
  const input = board();
  const raw = structuredClone(evidence.frames.before3.enemy);
  raw.enemy_id = id;
  raw.powers = [{ index: 0, power_id: "SKITTISH_POWER", name: "胆小", amount, is_debuff: false }];
  // A controlled two-attack probe of the observed shield; this is not a claim about a winning line.
  raw.current_hp = 90;
  raw.max_hp = 90;
  raw.intents = [];
  const state = parseGameState({ state_version: 16, screen: "COMBAT", in_combat: true, turn: 2,
    session: { mode: "singleplayer", phase: "run" }, available_actions: ["end_turn", "play_card"],
    run: { character_id: character.toUpperCase(), ascension: asc, floor: 9, act_id: "0", deck: [], relics: [], potions: [] },
    combat: { player: { current_hp: 60, max_hp: 80, energy: 2, block: 0, powers: [] }, enemies: [raw] } });
  const hand = [0, 1].map((index) => card(index, "STRIKE_SILENT", { damage: 6 }));
  const solver = { ...input.solver, hand, turn: 2,
    player: { ...input.solver.player, energy: 2 }, enemies: enemySims({ player: {}, enemies: [raw] }, asc) };
  const context = boardRolloutInput(state, knowledge, solver, asc, {}, {});
  return { ...input, ...context, solver, plans: solveTurn(solver).plans,
    meta: { ...input.meta, asc, t: 2, kind: "hallway", enc: id, max_en: 2 },
    tables: { [id]: { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } } },
    enemies: context.enemies.map((enemy) => ({ ...enemy, move: "WAIT", strength: 0 })),
    piles: { handBase: hand, draw: Array.from({ length: 12 }, (_, i) => card(i + 10, "STRIKE_SILENT", { damage: 6 })), discard: [] },
    model: null, gates: null, mm: {},
    options: { samples: 1, horizon: 3, budgetMs: 1e9, now: () => 0, seed: 1, k: 1 } };
}

describe("CA5KE8GFJ9X2 A10 F9 Skittish on successive turns", () => {
  for (const turn of [2, 3, 4] as const) {
    it(`replays the observed T${turn} nonlethal hit and seven block`, () => {
      const before = evidence.frames[`before${turn}`].enemy;
      const after = evidence.frames[`after${turn}`].enemy;
      const damage = before.current_hp - after.current_hp;
      const input = probe().solver;
      input.hand = [card(0, "OBSERVED_ATTACK", { damage })];
      input.enemies = enemySims({ enemies: [before] }, 10);
      const plan = replaySteps(input, [{ cardIndex: 0, cardId: "OBSERVED_ATTACK", name: "OBSERVED_ATTACK", target: 0 }])!;
      expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ hp: after.current_hp, block: after.block });
    });
  }

  it("keeps the shield in T3 and T4 of the live five-turn rollout, without changing the input", () => {
    const input = probe();
    const before = JSON.stringify(input);
    const line = rolloutDecision(input).lines[0]!;
    expect(line.perTurn.map((turn) => turn.dmg.mean)).toEqual([6, 6]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("also carries the observed shield through whole-fight policy turns", () => {
    const input = probe();
    const initial = replaySteps(input.solver, [{ cardIndex: 0, cardId: "STRIKE_SILENT", name: "STRIKE_SILENT", target: 0 }])!;
    expect(simulateFight(input, initial, 3, 1, false).records.map((turn) => turn.dmg)).toEqual([6, 6, 6]);
  });

  for (const [character, asc] of [["ironclad", 10], ["", 10], ["silent", 9], ["silent", 11]] as const) {
    it(`preserves the previous later-turn path for ${character || "unknown"} A${asc}`, () => {
      const input = probe(character, asc);
      expect(input.observedGardenerSkittish).toBeUndefined();
      expect(rolloutDecision(input).lines[0]!.perTurn.map((turn) => turn.dmg.mean)).toEqual([12, 12]);
    });
  }

  for (const [id, amount] of [["UNOBSERVED_ENEMY", 7], ["PHANTASMAL_GARDENER", 6], ["PHANTASMAL_GARDENER", 0]] as const) {
    it(`keeps ${id} with ${amount} stacks outside the observed scope`, () => {
      const input = probe("silent", 10, id, amount);
      expect(rolloutDecision(input).lines[0]!.perTurn.map((turn) => turn.dmg.mean)).toEqual([12, 12]);
    });
  }
});
