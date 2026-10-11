/** Silent A10 UV5YK5721RPB F27 and 7X0W3U8TVA2A F31; ledger silent-0273/0064. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims } from "../src/reflex/combat-plan.js";
import { boardRolloutInput, type MonsterMoves } from "../src/reflex/rollout-live.js";
import { rolloutDecision, simulateFight, type RolloutInput } from "../src/reflex/rollout.js";
import { replaySteps, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: [] }, "cache");
const ids = ["FRONT", "MIDDLE", "BACK"].map((part) => `DECIMILLIPEDE_SEGMENT_${part}`);
// Fixed observations: UV5 T1 shows unmodified 6x2/7/9; T1->T2 Bulk adds two Strength.
// Reattach successors differ (UV5 T4/T7, 7X0 T6/T8). Counts here are fixtures, not fitted probabilities.
const db: MonsterMoves = Object.fromEntries(ids.map((id) => [id, { moves: Object.fromEntries([
  ["WRITHE_MOVE", 6, 2], ["BULK_MOVE", 7, 1], ["CONSTRICT_MOVE", 9, 1],
  ["DEAD_MOVE", 0, 1], ["REATTACH_MOVE", 0, 1],
].map(([move, damage, hits]) => [move, {
  n_seen: 1, damage_by_asc: { "10": { base_per_hit: { [damage!]: 1 }, hits: { [hits!]: 1 } } },
  next: move === "REATTACH_MOVE" ? { BULK_MOVE: 1, WRITHE_MOVE: 1, CONSTRICT_MOVE: 1 } :
    move === "WRITHE_MOVE" ? { CONSTRICT_MOVE: 1 } : move === "CONSTRICT_MOVE" ? { BULK_MOVE: 1 } : { WRITHE_MOVE: 1 },
  ...(move === "BULK_MOVE" ? { self_powers_gained: { STRENGTH_POWER: { "2": 1 } }, self_powers_gained_by_asc: { "10": { STRENGTH_POWER: { "2": 1 } } } } : {}),
}])) }]));

function observed(line: string, change?: (raw: Raw) => void) {
  const raw: Raw = JSON.parse(readFileSync(new URL("./silent-reattach-state.json", import.meta.url), "utf8"))[line];
  change?.(raw);
  const state = parseGameState(raw);
  const p = raw.combat.player;
  const power = (id: string) => p.powers.find((x: Raw) => x.power_id === id)?.amount ?? 0;
  const solver: SolverInput = {
    hand: raw.combat.hand.map((c: Raw, i: number) => modelHandCard(c, i, knowledge, raw.run.character_id, raw.run.ascension)),
    player: { hp: p.current_hp, maxHp: p.max_hp, block: p.block, energy: p.energy,
      weak: power("WEAK_POWER") > 0, vulnerable: power("VULNERABLE_POWER") > 0, intangible: false,
      strengthNow: power("STRENGTH_POWER"), dexterity: power("DEXTERITY_POWER") },
    enemies: enemySims(raw.combat, raw.run.ascension), turn: raw.turn, fightKind: "elite",
  };
  const built = boardRolloutInput(state, knowledge, solver, raw.run.ascension, db, {});
  return { raw, solver, built };
}

// End-turn frames isolate the observed transition: no future cards, policies or refreshed knowledge.
function endTurn(line: string, change?: (raw: Raw) => void): RolloutInput {
  const { raw, built } = observed(line, change);
  const solver = { ...built.solver, hand: [] };
  const plan = replaySteps(solver, [])!;
  return { ...built, solver, plans: [plan], piles: { draw: [], discard: [], handBase: [] },
    meta: { act: 2, t: raw.turn, asc: 10, kind: "elite", enc: ids.join("+"),
      deck: { n: 0, atk: 0, skl: 0, pow: 0, junk: 0, dmg: 0, blk: 0, up: 0 }, relics: 0, max_en: 3 },
    mm: {}, model: null, gates: null, options: { horizon: 2, samples: 1, budgetMs: 1e9, now: () => 0 } };
}

describe("Silent pending segments survive rollout reconstruction", () => {
  it("keeps the dead middle's stable index and HP without adding a target or current attack", () => {
    const { solver, built } = observed("351774");
    expect(solver.enemies.map((e) => e.index)).toEqual([0, 2]);
    expect(built.enemies.map((e) => e.index)).toEqual([0, 1, 2]);
    expect(built.enemies.find((e) => e.index === 1)).toMatchObject({ move: "REATTACH_MOVE", reattachIn: 1, strength: 0 });
    expect(built.solver.enemies.find((e) => e.index === 1)).toMatchObject({ hp: 0, reattach: true, reattachHp: 25, attacks: [] });
    expect(solver.hand.every((c) => !c.validTargets.includes(1))).toBe(true);
    expect(solveTurn(built.solver).plans.every((p) => p.steps.every((s) => s.target !== 1))).toBe(true);
    expect(replaySteps(built.solver, [])!.outcome.hpLoss).toBe(replaySteps(solver, [])!.outcome.hpLoss);
  });

  it("UV5 T3 retains 13 actual loss and restores 25 HP next turn with no stale poison/Strength", () => {
    const input = endTurn("351777");
    const records = simulateFight(input, input.plans[0]!, 2, 1, false).records;
    expect(records[0]).toMatchObject({ loss: 13, won: false, died: false });
    expect(records[0]!.hpLeft?.[1]).toBe(25);
    const returned = records[1]!.snap.E.find((e) => e[0] === 1)!;
    expect(returned.slice(2, 6)).toEqual([25, 50, 0, true]);
    expect(["BULK_MOVE", "WRITHE_MOVE", "CONSTRICT_MOVE"]).toContain(returned[8]);
    expect(returned[9]).not.toHaveProperty("POISON_POWER");
    expect(returned[9]).not.toHaveProperty("STRENGTH_POWER");
    // Removing just the dead input reproduces the loss of its entire future HP budget.
    const absent = { ...input, solver: { ...input.solver, enemies: input.solver.enemies.filter((e) => e.index !== 1) },
      enemies: input.enemies.filter((e) => e.index !== 1) };
    const old = simulateFight(absent, input.plans[0]!, 2, 1, false).records;
    expect(old[0]!.loss).toBe(records[0]!.loss);
    expect(old[1]!.snap.E.some((e) => e[0] === 1)).toBe(false);
  });

  it("UV5 T6 poison kills the attacking back before it hits; two HP survive as the middle returns", () => {
    const input = endTurn("351790");
    const records = simulateFight(input, input.plans[0]!, 2, 1, false).records;
    expect(records[0]).toMatchObject({ loss: 0, died: false, won: false });
    expect(records[1]!.snap.E.find((e) => e[0] === 1)?.[2]).toBe(25);
    expect(records[1]!.snap.E.find((e) => e[0] === 2)?.[5]).toBe(false);
  });

  it("7X0 T5 keeps both returning segments and the observed 71 HP before the next poison tick", () => {
    const input = endTurn("288429");
    const records = simulateFight(input, input.plans[0]!, 2, 1, false).records;
    expect(records[0]).toMatchObject({ loss: 0, died: false, won: false });
    expect(records[0]!.hpLeft).toEqual({ 0: 25, 1: 25, 2: 21 });
    expect(records[1]!.snap.E.filter((e) => e[0] < 2).map((e) => e[2])).toEqual([25, 25]);
    // The record is after that next turn's poison, not its opening: the back now has 21 - 5 HP.
    expect(records[1]!.snap.E.find((e) => e[0] === 2)?.[2]).toBe(16);
  });

  it("distinguishes a newly dead stage from the next-turn reattachment stage", () => {
    expect(observed("351785").built.enemies.find((e) => e.index === 1)?.reattachIn).toBe(2);
    expect(observed("351786").built.enemies.find((e) => e.index === 1)?.reattachIn).toBe(1);
    const input = endTurn("351785");
    const records = simulateFight(input, input.plans[0]!, 2, 1, false).records;
    expect(records[1]!.snap.E.find((e) => e[0] === 1)?.[5]).toBe(false);
    expect(records[1]!.snap.E.find((e) => e[0] === 1)?.[8]).toBe("REATTACH_MOVE");
  });

  it("reports missing stage/successor data instead of inventing a precise safe continuation", () => {
    const unknown = endTurn("351777", (raw) => { raw.combat.enemies[1].move_id = null; });
    expect(unknown.enemies.find((e) => e.index === 1)?.reattachIn).toBeNull();
    expect(rolloutDecision(unknown)).toMatchObject({ horizon: 0, samples: 0, degraded: ["missing reattach model"] });
    const missing = endTurn("351777");
    missing.tables[ids[1]!]!.next.REATTACH_MOVE = {};
    expect(rolloutDecision(missing).unavailable).toContain("接续");
    const stale = endTurn("351777", (raw) => {
      raw.combat.enemies[1].powers.push({ power_id: "POISON_POWER", amount: 5 });
    });
    expect(rolloutDecision(stale).unavailable).toContain("接续");
  });

  it("ends the fight when the remaining live segments die together; pending bodies do not return", () => {
    const input = endTurn("351777", (raw) => {
      for (const e of raw.combat.enemies.filter((e: Raw) => e.is_alive)) {
        e.current_hp = 1;
        e.powers = [{ power_id: "REATTACH_POWER", amount: 25 }, { power_id: "POISON_POWER", amount: 1 }];
      }
    });
    const records = simulateFight(input, input.plans[0]!, 3, 1, false).records;
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ won: true, died: false, hpLeft: { 0: 0, 1: 0, 2: 0 } });
  });

  it("keeps all-dead, permanent-dead, other characters and unobserved ascensions unchanged", () => {
    for (const change of [
      (r: Raw) => { r.run.character_id = "IRONCLAD"; },
      (r: Raw) => { r.run.ascension = 11; },
      (r: Raw) => { r.combat.enemies[1].powers = []; },
      (r: Raw) => { r.combat.enemies[1].enemy_id = "WATERFALL_GIANT"; },
    ]) {
      const { solver, built } = observed("351774", change);
      expect(built.solver).toBe(solver);
      expect(built.enemies.some((e) => e.index === 1)).toBe(false);
    }
    const { built } = observed("351774", (raw) => {
      for (const e of raw.combat.enemies) { e.is_alive = false; e.current_hp = 0; }
    });
    expect(built.enemies).toEqual([]);
    expect(built.solver.enemies).toEqual([]);
    const living = observed("351778");
    expect(living.built.solver).toBe(living.solver);
    expect(living.built.enemies.every((e) => e.reattachIn === undefined)).toBe(true);
  });
});
