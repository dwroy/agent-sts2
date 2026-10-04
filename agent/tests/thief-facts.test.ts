/**
 * strategy/thief.ts (THIEF_FACTS, docs/thief.md): what each thief carries, from the fight's first frame (the deck, the
 * gold) less the run now; our turns left to kill it; the facts' wording (facts and numbers, no advice); the lines kept
 * for a kill before it leaves. Hand-made states and lines.
 */

import { describe, expect, it } from "vitest";

import { parseGameState, type GameState } from "../src/hand/mod/schema.js";
import { createScreenMemory, type ScreenMemory } from "../src/memory/types.js";
import type { LineEstimate } from "../src/reflex/rollout.js";
import { rolloutKillLine, thiefSamples } from "../src/reflex/rollout-live.js";
import {
  goldTaken,
  killsThief,
  lastTurnKillLine,
  missingCards,
  noteFightStart,
  shownKillLine,
  stunsThief,
  thiefContextJson,
  thiefFact,
  thievesOf,
  turnsLeftOf,
  type Thief,
} from "../src/reflex/thief.js";
import type { Plan } from "../src/reflex/turn-solver.js";
import { baseState, runPayload } from "./scenarios.js";

type Raw = Record<string, unknown>;

const card = (id: string, name: string, upgraded = false) => ({ card_id: id, name, upgraded });
const DECK = [card("STRIKE_IRONCLAD", "打击"), card("STRIKE_IRONCLAD", "打击"), card("BASH", "痛击+", true), card("STONE_ARMOR", "岩石铠甲"), card("DISMANTLE", "拆解")];

function power(id: string, amount: number): Raw {
  return { power_id: id, name: id, amount };
}

function enemy(index: number, id: string, name: string, hp: number, move: string, powers: Raw[], maxHp = hp): Raw {
  return { index, enemy_id: id, name, current_hp: hp, max_hp: maxHp, block: 0, is_alive: true, move_id: move, powers, intents: [] };
}

function combatState(turn: number, enemies: Raw[], deck = DECK, gold = 137, floor = 20): GameState {
  return parseGameState(
    baseState("COMBAT", {
      run_id: "RPC6X61N9FQ0",
      in_combat: true,
      turn,
      available_actions: ["end_turn"],
      run: runPayload({ floor, act_id: "1", gold, deck }),
      combat: { player: { current_hp: 54, max_hp: 80, energy: 3, block: 0, powers: [] }, hand: [], enemies },
    }),
  );
}

const hopper = (hp: number, move: string, escapeArtist: number, extra: Raw[] = []) =>
  enemy(0, "THIEVING_HOPPER", "偷窃草蜢", hp, move, [power("ESCAPE_ARTIST_POWER", escapeArtist), ...extra], 84);

describe("the fight's first frame and what was taken since", () => {
  it("the first combat frame of a fight is kept; a later frame or another screen does not replace it; a new fight does", () => {
    const memory: ScreenMemory = createScreenMemory("COMBAT");
    noteFightStart(memory, combatState(1, [hopper(84, "THIEVERY_MOVE", 5)]));
    expect(memory.thiefStart).toEqual({ fight: "RPC6X61N9FQ0:1:20", deck: ["STRIKE_IRONCLAD|打击", "STRIKE_IRONCLAD|打击", "BASH+|痛击+", "STONE_ARMOR|岩石铠甲", "DISMANTLE|拆解"], gold: 137 });
    // T2: one card short (the theft), less gold: still the first frame's.
    const t2 = combatState(2, [hopper(84, "FLUTTER_MOVE", 4, [power("SWIPE_POWER", 1)])], DECK.filter((c) => c.card_id !== "STONE_ARMOR"), 117);
    noteFightStart(memory, t2);
    expect(memory.thiefStart?.deck).toHaveLength(5);
    expect(missingCards(memory, t2)).toEqual(["岩石铠甲"]);
    expect(goldTaken(memory, t2)).toBe(20);
    // Out of combat: nothing noted. Another fight: noted afresh, and the old one is no longer this fight's.
    noteFightStart(memory, parseGameState(baseState("MAP", { run_id: "RPC6X61N9FQ0", run: runPayload({ floor: 20 }) })));
    expect(memory.thiefStart?.fight).toBe("RPC6X61N9FQ0:1:20");
    const next = combatState(1, [hopper(84, "THIEVERY_MOVE", 5)], DECK, 150, 21);
    expect(missingCards(memory, next)).toBeNull();
    noteFightStart(memory, next);
    expect(memory.thiefStart?.fight).toBe("RPC6X61N9FQ0:1:21");
  });

  it("an upgraded copy is a different card (the name carries the +)", () => {
    const memory: ScreenMemory = createScreenMemory("COMBAT");
    noteFightStart(memory, combatState(1, [hopper(84, "THIEVERY_MOVE", 5)]));
    const now = combatState(2, [hopper(84, "FLUTTER_MOVE", 4, [power("SWIPE_POWER", 1)])], DECK.filter((c) => c.card_id !== "BASH"));
    expect(missingCards(memory, now)).toEqual(["痛击+"]);
  });
});

describe("thieves on the board", () => {
  const start = (): ScreenMemory => {
    const memory = createScreenMemory("COMBAT");
    noteFightStart(memory, combatState(1, [hopper(84, "THIEVERY_MOVE", 5)]));
    return memory;
  };

  it("the Hopper carries from its theft on (SWIPE_POWER), not before", () => {
    const memory = start();
    expect(thievesOf(combatState(1, [hopper(84, "THIEVERY_MOVE", 5)]), memory)).toEqual([]);
    const [thief] = thievesOf(combatState(3, [hopper(62, "HAT_TRICK_MOVE", 3, [power("SWIPE_POWER", 1), power("FLUTTER_POWER", 5)])], DECK.slice(0, 4)), memory);
    expect(thief).toMatchObject({ index: 0, id: "THIEVING_HOPPER", name: "偷窃草蜢", hp: 62, maxHp: 84, cards: ["拆解"], turnsLeft: 3, flutter: 5 });
  });

  it("the Gremlin Merc carries the gold taken since the first frame; the Fat Gremlin its HEIST_POWER", () => {
    const memory = start();
    const merc = (gold: number, turn: number) => thievesOf(combatState(turn, [enemy(0, "GREMLIN_MERC", "地精佣兵", 30, "HEHE_MOVE", [power("SURPRISE_POWER", 1), power("THIEVERY_POWER", 20)], 52)], DECK, gold), memory);
    expect(merc(137, 1)).toEqual([]);
    expect(merc(97, 3)).toMatchObject([{ id: "GREMLIN_MERC", gold: 40, turnsLeft: null, stealsPerAttack: 20 }]);
    // No first frame (a restart with no logged frame of the fight): from T2 on it carries an unknown amount.
    expect(thievesOf(combatState(2, [enemy(0, "GREMLIN_MERC", "地精佣兵", 30, "DOUBLE_SMASH_MOVE", [power("THIEVERY_POWER", 20)], 52)]), createScreenMemory("COMBAT"))).toMatchObject([{ gold: null }]);
    const fat = thievesOf(combatState(4, [enemy(0, "SNEAKY_GREMLIN", "卑鄙地精", 12, "TACKLE_MOVE", []), enemy(1, "FAT_GREMLIN", "胖地精", 14, "FLEE_MOVE", [power("HEIST_POWER", 40)])]), memory);
    expect(fat).toMatchObject([{ index: 1, id: "FAT_GREMLIN", gold: 40, turnsLeft: 1 }]);
    // A Fat Gremlin carrying nothing (the Merc stole from 0 gold: no HEIST_POWER, 5SSRC26ZFKWC F12) is no thief.
    expect(thievesOf(combatState(4, [enemy(0, "FAT_GREMLIN", "胖地精", 14, "FLEE_MOVE", [])]), memory)).toEqual([]);
  });

  it("turns left: the Hopper's countdown, one more when stunned on its Escape turn; the Fat Gremlin 2 then 1", () => {
    expect(turnsLeftOf("THIEVING_HOPPER", "FLUTTER_MOVE", 4)).toBe(4);
    expect(turnsLeftOf("THIEVING_HOPPER", "ESCAPE_MOVE", 1)).toBe(1);
    // XMY29WWQDC1Y F19 T5: STUNNED at 1, Escape again on T6. SCBC3F0QT8BC F19 T4: STUNNED at 2, Escape on T5.
    expect(turnsLeftOf("THIEVING_HOPPER", "STUNNED", 1)).toBe(2);
    expect(turnsLeftOf("THIEVING_HOPPER", "STUNNED", 2)).toBe(2);
    expect(turnsLeftOf("FAT_GREMLIN", "SPAWNED_MOVE", 0)).toBe(2);
    expect(turnsLeftOf("FAT_GREMLIN", "UNSET_MOVE", 0)).toBe(2);
    expect(turnsLeftOf("FAT_GREMLIN", "FLEE_MOVE", 0)).toBe(1);
    expect(turnsLeftOf("GREMLIN_MERC", "GIMME_MOVE", 0)).toBeNull();
  });
});

/** A line as the solver gives it, with only what the thief facts read. */
function line(name: string, after: { index: number; hp: number; flutter?: number }[], opts: { wins?: boolean; potion?: boolean; hpLoss?: number } = {}): Plan {
  return {
    steps: [{ cardId: opts.potion ? "POTION:FIRE_POTION:0" : "STRIKE", cardIndex: 0, name, target: 0, targetName: "偷窃草蜢", upgraded: false }],
    score: 0,
    outcome: { winsFight: opts.wins === true, hpLoss: opts.hpLoss ?? 0, enemyHpAfter: after.map((entry) => ({ ...entry, name: "x", vulnerable: 0, weak: 0, block: 0 })), kills: [] },
  } as unknown as Plan;
}

/** A rollout line estimate with the thief counts given. */
function estimate(plan: Plan, back: number, gone: number, value = 0, orders: { label: string; back: number }[] = []): LineEstimate {
  const own = { order: { key: "own", label: "own", groups: [] }, thieves: { "THIEVING_HOPPER@0": { back, gone } } };
  return {
    plan,
    samples: 8,
    value,
    thieves: { "THIEVING_HOPPER@0": { back, gone } },
    order: orders.length > 0 ? own.order : null,
    orders: orders.length > 0 ? [own, ...orders.map((entry) => ({ order: { key: entry.label, label: entry.label, groups: [] }, thieves: { "THIEVING_HOPPER@0": { back: entry.back, gone: 8 - entry.back } } }))] : [],
  } as unknown as LineEstimate;
}

const HOPPER: Thief = { index: 0, id: "THIEVING_HOPPER", name: "偷窃草蜢", hp: 30, maxHp: 84, block: 0, cards: ["拆解"], turnsLeft: 1, flutter: 2 };

describe("the facts", () => {
  it("this turn exact: the kill and what comes back, or the HP left and when it leaves; a stun from its last Flutter", () => {
    expect(killsThief(line("a", [{ index: 0, hp: 0 }]), HOPPER)).toBe(true);
    expect(thiefFact(line("a", [{ index: 0, hp: 0 }], { wins: true }), [HOPPER], () => null, 5)).toBe("kills 偷窃草蜢: 拆解 comes back");
    expect(thiefFact(line("b", [{ index: 0, hp: 12, flutter: 1 }]), [HOPPER], () => null, 5)).toBe("偷窃草蜢 left at 12 HP, leaves at the end of this turn with 拆解");
    const stripped = line("c", [{ index: 0, hp: 20, flutter: 0 }]);
    expect(stunsThief(stripped, HOPPER)).toBe(true);
    expect(thiefFact(stripped, [HOPPER], (thief) => thiefSamples(estimate(stripped, 6, 2), thief), 5)).toBe(
      "偷窃草蜢 left at 20 HP, leaves at the end of next turn; its last Flutter stripped: stunned, this turn's move cancelled (its Escape: one more turn); rollout: killed before it leaves in 6/8 samples, left with it in 2/8",
    );
    // Earlier: the stun cancels its attack, which the line's own numbers still count.
    expect(thiefFact(stripped, [{ ...HOPPER, turnsLeft: 2 }], () => null, 4)).toBe("偷窃草蜢 left at 20 HP, leaves at the end of next turn; its last Flutter stripped: stunned, this turn's move cancelled (hp_lost above still counts its attack)");
    expect(thiefFact(line("d", [{ index: 0, hp: 50 }]), [{ ...HOPPER, turnsLeft: 4, flutter: 0 }], () => null, 2)).toBe("偷窃草蜢 left at 50 HP, leaves at the end of turn 5");
    // With kill orders, the order whose later turns get it back most often when that is not the line's best.
    const fat: Thief = { index: 0, id: "THIEVING_HOPPER", name: "胖地精", hp: 15, maxHp: 15, block: 0, gold: 40, turnsLeft: 2, flutter: 0 };
    expect(thiefFact(line("e", [{ index: 0, hp: 15 }]), [fat], (thief) => thiefSamples(estimate(line("e", []), 0, 8, 0, [{ label: "胖地精 > 卑鄙地精", back: 5 }]), thief), 3)).toBe(
      "胖地精 left at 15 HP, leaves at the end of next turn; rollout: killed before it leaves in 0/8 samples, left with it in 8/8 (its best order; with the later turns aiming 胖地精 > 卑鄙地精: 5/8)",
    );
  });

  it("thief_context: who, what, turns left, HP and block; the Merc's gold and where it goes", () => {
    const merc: Thief = { index: 0, id: "GREMLIN_MERC", name: "地精佣兵", hp: 28, maxHp: 52, block: 3, gold: 40, turnsLeft: null, flutter: 0, stealsPerAttack: 20 };
    expect(thiefContextJson([HOPPER, merc], 5)).toEqual({
      偷窃草蜢: {
        hp: "30/84",
        block: 0,
        carries: "拆解: the card it stole from your deck on turn 1; back in the deck if it is killed, gone for the run if it leaves",
        turns_left: "1: this turn is the last, it leaves (Escape) at the end of this turn",
        flutter: "2: each attack hit removes one; at 0 it is stunned and this turn's move is cancelled (its Escape too: it leaves a turn later)",
      },
      地精佣兵: {
        hp: "28/52",
        block: 3,
        carries: "40 gold stolen so far (it takes 20 more on each attack); when it dies the gold goes to the 胖地精 it spawns: back if that one is killed, gone if it flees",
        turns_left: "it does not leave; the 胖地精 it spawns on death flees at the end of the turn after it appears (that turn and the next to kill it)",
      },
      rollout: "the rollout plays the escape: an enemy whose Escape/Flee resolves is gone (no kill, nothing comes back), and with no enemy left the fight is over (its 'fight over' counts that end too)",
    });
  });

  it("facts and numbers only: no advice, no code score in any of it", () => {
    const texts = [
      JSON.stringify(thiefContextJson([HOPPER, { ...HOPPER, turnsLeft: 3, cards: null }, { index: 1, id: "FAT_GREMLIN", name: "胖地精", hp: 9, maxHp: 15, block: 0, gold: 60, turnsLeft: 2, flutter: 0 }], 3)),
      thiefFact(line("a", [{ index: 0, hp: 0 }], { wins: true }), [HOPPER], () => null, 5),
      thiefFact(line("c", [{ index: 0, hp: 20, flutter: 0 }]), [HOPPER], (thief) => thiefSamples(estimate(line("c", []), 6, 2), thief), 5),
    ].join("\n");
    expect(texts).not.toMatch(/\b(should|must|recommend|better|worse|worth|prefer|good|bad|best line|score|value|priority|important)\b/i);
  });
});

describe("the lines kept for a kill before it leaves", () => {
  const dry = line("kill", [{ index: 0, hp: 0 }]);
  const drink = line("kill with a potion", [{ index: 0, hp: 0 }], { potion: true });
  const block = line("block", [{ index: 0, hp: 30 }]);
  const drinks = (plan: Plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:"));

  it("its last turn: a killing line when none shown kills it, potion-free first; none when one is shown or none kills", () => {
    expect(lastTurnKillLine([block, drink, dry], [block], [HOPPER], drinks)).toBe(dry);
    expect(lastTurnKillLine([block, drink], [block], [HOPPER], drinks)).toBe(drink);
    expect(lastTurnKillLine([block, dry], [block, dry], [HOPPER], drinks)).toBeNull();
    expect(lastTurnKillLine([block], [block], [HOPPER], drinks)).toBeNull();
    // Not its last turn: the rollout's line, not this one.
    expect(lastTurnKillLine([block, dry], [block], [{ ...HOPPER, turnsLeft: 2 }], drinks)).toBeNull();
    expect(shownKillLine([block, dry], [HOPPER])).toBe(dry);
  });

  it("a later turn: the rollout's line most often killing it in time, a shown one at that count kept, ties by value", () => {
    const thief = { ...HOPPER, turnsLeft: 3 };
    const a = line("a", [{ index: 0, hp: 40 }]);
    const b = line("b", [{ index: 0, hp: 50 }]);
    const c = line("c", [{ index: 0, hp: 45 }]);
    const lines = [estimate(a, 2, 6, -5), estimate(b, 6, 2, -12), estimate(c, 6, 2, -9)];
    expect(rolloutKillLine(lines, () => true, [a], [thief])).toBe(c);
    expect(rolloutKillLine(lines, () => true, [a, b], [thief])).toBe(b);
    expect(rolloutKillLine(lines, (entry) => entry.plan !== c, [a], [thief])).toBe(b);
    // An order of its own that gets it back more often counts too.
    expect(rolloutKillLine([estimate(a, 2, 6, -5), estimate(b, 1, 7, -3, [{ label: "x > y", back: 7 }])], () => true, [a], [thief])).toBe(b);
    // No sample gets it back: nothing to keep.
    expect(rolloutKillLine([estimate(a, 0, 8), estimate(b, 0, 8)], () => true, [a], [thief])).toBeNull();
  });
});
