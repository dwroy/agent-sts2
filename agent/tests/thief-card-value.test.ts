/**
 * THIEF_COST (docs/thief.md §7): a Thieving Hopper's stolen card in HP, by the B3 boss simulator (src/sim/thief-card-value.ts).
 * The conversion rules on fixed numbers (cardHpOf: the win rate where it moves, the boss's HP left where the deck mostly
 * loses, the HP lost where it mostly wins; noise, a worse card, no slope, the cap), and one computation end to end on the
 * B3 fixture (a logged reward board, a small beatable stand-in boss: tests/boss-sim-build-fixture.ts) with the serial
 * runner: the three decks on the same seeds, the numbers the facts show, the loop's once-per-fight step. No model call.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/mod/schema.js";
import { createScreenMemory } from "../src/project/types.js";
import { SerialDeckRunner } from "../src/sim/build-sim-pool.js";
import { cardHpOf, cardValueText, ensureThiefCardValue, thiefCardValue, THIEF_CARD_CAP_HP, type ThiefCardMeasures } from "../src/sim/thief-card-value.js";
import { cardLoot } from "../src/strategy/thief.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { board, env, play, FakeDeepSeek, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { mainMenuPayload } from "./scenarios.js";

setupOneshotTests();
beforeAll(() => setMonsterDbForTests(FIXTURE_DB));
afterAll(() => setMonsterDbForTests(null));

/** Measures with the base deck's raw win rate `win` and the given paired differences (the rest 0). */
function measures(win: number, over: Partial<ThiefCardMeasures> = {}): ThiefCardMeasures {
  return {
    win: { with: win, without: win, lower: win },
    cardDiff: { value: 0, se: 0.01 },
    perHp: { value: 0, se: 0.001 },
    bossLeft: { with: 100, card: { value: 0, se: 1 }, perHp: { value: 0, se: 0.1 } },
    hpLost: { with: 30, card: { value: 0, se: 1 } },
    ...over,
  };
}

describe("THIEF_COST: a card's HP from the paired numbers (cardHpOf)", () => {
  it("the win rate (Dai's conversion): Δwin ÷ Δwin per HP of entry HP", () => {
    // 46% -> 38% without it, 10 HP less -> 39%: 0.08 / 0.007 = 11.4 HP.
    const m = measures(0.46, { win: { with: 0.46, without: 0.38, lower: 0.39 }, cardDiff: { value: 0.08, se: 0.014 }, perHp: { value: 0.007, se: 0.0012 } });
    expect(cardHpOf(m)).toEqual({ route: "win", ratio: 11.4, hp: 11.4, status: "ok", why: null });
  });

  it("noise: a card difference within 2 standard errors is 0; a card the deck does better without is 0", () => {
    const slope = { perHp: { value: 0.007, se: 0.0012 } };
    expect(cardHpOf(measures(0.5, { ...slope, cardDiff: { value: 0.02, se: 0.015 } }))).toMatchObject({ route: "win", hp: 0, status: "not_significant" });
    expect(cardHpOf(measures(0.5, { ...slope, cardDiff: { value: -0.05, se: 0.015 } }))).toMatchObject({ route: "win", hp: 0, status: "worse_with" });
  });

  it("no slope (the win rate does not move with entry HP): no value at all, no cost", () => {
    const got = cardHpOf(measures(0.5, { cardDiff: { value: 0.1, se: 0.01 }, perHp: { value: 0.001, se: 0.001 } }));
    expect(got).toMatchObject({ route: "win", hp: null, status: "flat" });
    expect(got.why).toContain("does not move with entry HP");
  });

  it("the deck mostly loses this boss (raw win under 10%): read on the boss's HP left", () => {
    // Without it the boss keeps 21 more HP; an HP of entry HP takes 1.1 off: 19.1 HP.
    const m = measures(0, { bossLeft: { with: 176, card: { value: 21, se: 1 }, perHp: { value: 1.1, se: 0.1 } } });
    expect(cardHpOf(m)).toMatchObject({ route: "progress", ratio: 19.1, hp: 19.1, status: "ok" });
    expect(cardHpOf(measures(0, { bossLeft: { with: 176, card: { value: 21, se: 1 }, perHp: { value: 0.1, se: 0.1 } } }))).toMatchObject({ route: "progress", hp: null, status: "flat" });
    expect(cardHpOf(measures(0.05, { bossLeft: { with: 176, card: { value: 1, se: 1 }, perHp: { value: 1.1, se: 0.1 } } }))).toMatchObject({ route: "progress", hp: 0, status: "not_significant" });
  });

  it("the deck mostly wins (raw win over 90%): the HP the card saves in the boss fight", () => {
    expect(cardHpOf(measures(0.97, { hpLost: { with: 20, card: { value: 6.4, se: 0.8 } } }))).toMatchObject({ route: "hp", ratio: 6.4, hp: 6.4, status: "ok" });
  });

  it("the cap: a card worth more than THIEF_CARD_CAP_HP counts the cap", () => {
    const got = cardHpOf(measures(0.5, { cardDiff: { value: 0.35, se: 0.02 }, perHp: { value: 0.007, se: 0.001 } }));
    expect(got).toMatchObject({ route: "win", ratio: 50, hp: THIEF_CARD_CAP_HP, status: "capped" });
  });
});

describe("THIEF_COST: the stolen card's value on the B3 fixture", () => {
  const REWARD = () => board("xljq-f5-reward", "reward");

  it("three decks on the same seeds: with the card, without it, with it at 10 HP less; the facts' numbers are the run's", async () => {
    const raw = REWARD();
    const deck = ((raw["run"] as Raw)["deck"] as Raw[]).map((card) => String(card["card_id"]));
    const card = { id: deck.find((id) => id.startsWith("BASH")) ?? deck[0]!, upgraded: false, name: "痛击" };
    const run = () => thiefCardValue(env(raw), card, { runner: new SerialDeckRunner(), samples: 24, db: FIXTURE_DB, mm: FIXTURE_MM, entry: { hp: 54, source: "fixed" } });
    const a = await run();
    const b = await run();
    expect({ ...a, ms: 0 }).toEqual({ ...b, ms: 0 });
    expect(a).toMatchObject({ card: "痛击", boss: "SOUL_FYSH", entryHp: 54, entrySource: "fixed", step: 10, samples: 24, requested: 24, timedOut: false });
    const m = a.measures!;
    expect(m.cardDiff.value).toBeCloseTo(m.win.with - m.win.without, 4);
    expect(m.perHp.value).toBeCloseTo((m.win.with - m.win.lower) / 10, 4);
    // The value is the rule's on these numbers, and the text says them.
    expect({ route: a.route, ratio: a.ratio, hp: a.hp, status: a.status, why: a.why }).toEqual(cardHpOf(m));
    const text = cardValueText(a);
    expect(text.startsWith(a.hp === null ? "痛击: no HP value" : `痛击 ≈ ${Math.round(a.hp * 10) / 10} HP`)).toBe(true);
    expect(text).toContain("entry 54 HP");
    // What the thief's loot reads (thief.ts cardLoot): this fight's value; another fight's: not computed.
    expect(cardLoot(a, a.fight).hp).toBe(a.hp);
    expect(cardLoot(a, "OTHER:1:20")).toMatchObject({ hp: null, short: "not computed" });
  }, 120_000);

  it("no boss on the run, a card not in the game data: no value and why, never a throw", async () => {
    const raw = REWARD();
    (raw["run"] as Raw)["boss_id"] = null;
    const noBoss = await thiefCardValue(env(raw), { id: "BASH", upgraded: false, name: "痛击" }, { runner: new SerialDeckRunner(), samples: 8 });
    expect(noBoss).toMatchObject({ hp: null, status: "no_boss" });
    const unknown = await thiefCardValue(env(REWARD()), { id: "NOT_A_CARD", upgraded: false, name: "?" }, { runner: new SerialDeckRunner(), samples: 8, db: FIXTURE_DB, mm: FIXTURE_MM });
    expect(unknown).toMatchObject({ hp: null, status: "unknown_card" });
  });

  it("the loop's step: only in a fight with a carrying Hopper, once per fight", async () => {
    const memory = createScreenMemory("CARD_REWARD");
    // Not in combat: nothing.
    expect(await ensureThiefCardValue(env(REWARD(), memory), { runner: new SerialDeckRunner(), samples: 8 })).toBeNull();
    expect(memory.thiefCardValue).toBeUndefined();
    // A value already in memory for this fight: not again.
    const state = parseGameState(REWARD());
    memory.thiefCardValue = { fight: `${String(state.raw["run_id"])}:${String((state.raw["run"] as Raw)["act_id"])}:${state.run?.floor}` } as never;
    expect(await ensureThiefCardValue({ ...env(REWARD(), memory), state: { ...state, in_combat: true } }, { runner: new SerialDeckRunner(), samples: 8 })).toBeNull();
  });
});

describe("THIEF_COST: the loop computes the card's value before the question, once, and logs it", () => {
  /** The logged RPC6X61N9FQ0 F20 Hopper fight: its first frame (turn 1, the deck before the theft) and turn 2, headed for the fixture boss. */
  function frames(): Raw[] {
    const fx = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "thief-data", "rpc6-f20-t2-hopper.json"), "utf8")) as { state: Raw; fightStart: { deck: Raw[]; gold: number } };
    const t2 = fx.state;
    (t2["run"] as Raw)["boss_id"] = "SOUL_FYSH_BOSS";
    const t1 = JSON.parse(JSON.stringify(t2)) as Raw;
    t1["turn"] = 1;
    (t1["run"] as Raw)["deck"] = fx.fightStart.deck;
    (t1["run"] as Raw)["gold"] = fx.fightStart.gold;
    return [t1, t2, JSON.parse(JSON.stringify(t2)) as Raw, mainMenuPayload()];
  }
  const thiefSim = { runner: new SerialDeckRunner(), samples: 8, db: FIXTURE_DB, mm: FIXTURE_MM };

  it("on: the turn-2 decision row carries thief_card_value (岩石铠甲), computed once for the fight; off: none", async () => {
    const on = await play(frames(), new FakeDeepSeek(() => "skip"), { thiefCost: true }, { thiefSim });
    const logged = on.records.filter((record) => record["thief_card_value"]);
    expect(logged).toHaveLength(1);
    expect(logged[0]!["thief_card_value"]).toMatchObject({ fight: "RPC6X61N9FQ0:1:20", card: "岩石铠甲", boss: "SOUL_FYSH", samples: 8 });
    expect(on.notes.filter((note) => note.startsWith("thief card value: 岩石铠甲"))).toHaveLength(1);
    const off = await play(frames(), new FakeDeepSeek(() => "skip"), { thiefCost: false }, { thiefSim });
    expect(off.records.some((record) => record["thief_card_value"])).toBe(false);
  }, 120_000);
});
