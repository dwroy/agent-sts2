/**
 * SL_RETRY_KNOWN_HAND_ORDER (docs/sl.md §10.2, src/sl/draws.ts): a card played from the hand that draws a copy of itself, on
 * logged frames (tests/sl-draws-data, make-fixtures.ts) and on synthetic boards.
 * - RJZGFGNYK56W F33 (知识恶魔, 6 attempts, V4.5 GPT ops review 2026-10-04): the deck holds 2 Pommel Strikes (剑柄打击, 「造成9点伤害。
 *   抽1张牌。」) and no Hellraiser. In attempts 1-4 and 6, T4's hand held one; playing it drew the other (the draw pile lost a
 *   Pommel Strike, the discard pile gained one, the hand still held one, now at its end). Live (6d2ce32, before the hand's
 *   order was read) that broke the order at T4: the known draws stayed at 21. The hand's order (appendedCards, v4 2dee437)
 *   reads it: 29 known, to the T6 reshuffle, every prediction right.
 * - The hand's order shows nothing when the played card was the hand's last (M6P7KAWMF6BC F29 T1: 旋风斩, 剑柄打击 -> 旋风斩,
 *   剑柄打击): then the hand less the cards it lost to the discard or exhaust pile (handExits, 2026-10-04). VBHZ77A3N496 F20
 *   T1: Battle Trance from the hand's end drew Battle Trance and two more; JW925EDF9ZTQ F12 T1: a hand selection replaced
 *   Strike and Defend and drew Defend and Omnislice.
 * No logs/ or .cache, no model.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { checkKnown, DrawTracker, knownOrderOf, type DrawTrackerOptions, type KnownOrder, type SlDraws } from "../src/sl/draws.js";
import { bossBoard, state } from "./sl-support.js";

type Raw = Record<string, unknown>;
const DATA = join(dirname(fileURLToPath(import.meta.url)), "sl-draws-data");
interface Fixture {
  source: string;
  attempts: Raw[][];
  rows: { attempt: number; result: string; draws?: SlDraws }[];
}
const fixture = (name: string): Fixture => JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Fixture;

/** The live options when RJZG was played (6d2ce32); NEW: today's (v4 with the hand exits); V4: v4 2dee437's (no hand exits). */
const OLD: DrawTrackerOptions = { inserts: true, tops: true, picks: true };
const NEW: DrawTrackerOptions = { ...OLD, offTop: true, handOrder: true };
const V4: DrawTrackerOptions = { ...NEW, handExits: false };
const LEFT = "left the draw pile without coming into the hand (played from the top, discarded, exhausted, or past the 10-card hand)";

function track(frames: readonly Raw[], options: DrawTrackerOptions): SlDraws {
  const tracker = new DrawTracker(options);
  for (const frame of frames) tracker.observe(parseGameState(frame));
  return tracker.record;
}

/** Each frame's known cards ahead against the places the next step took off the pile (as tests/sl-draws-offtop.test.ts). */
function predictions(known: KnownOrder, frames: readonly Raw[], options: DrawTrackerOptions): { checked: number; wrong: number; knownAtStart: number; off: string | null } {
  const tracker = new DrawTracker(options);
  let prev: { from: number; keys: string[] } | null = null;
  let checked = 0;
  let wrong = 0;
  let knownAtStart = -1;
  let off: string | null = null;
  for (const frame of frames) {
    tracker.observe(parseGameState(frame));
    const record = tracker.record;
    const to = Math.min(record.order.length, record.clean);
    if (prev && to > prev.from) {
      for (let at = prev.from; at < Math.min(to, prev.from + prev.keys.length); at += 1) {
        checked += 1;
        if (prev.keys[at - prev.from]!.replace(/\+$/, "") !== record.order[at]!.replace(/\+$/, "")) wrong += 1;
      }
    }
    let keys: string[] = [];
    if (off === null) {
      const check = checkKnown(known, tracker);
      if (!check.ok) off = check.reason;
      else keys = check.keys.slice(tracker.topped.keys.length);
      if (knownAtStart < 0) knownAtStart = check.ok ? check.keys.length : 0;
    }
    prev = { from: record.order.length, keys };
  }
  return { checked, wrong, knownAtStart, off };
}

describe("RJZGFGNYK56W F33: Pommel Strike played from the hand drew the other Pommel Strike (T1-T6 of 6 attempts)", () => {
  const fx = fixture("rjzg-f33");

  it("the live options track the live rows' draws: attempts 1-4 and 6 break at T4 (clean 21), attempt 5 does not (29)", () => {
    expect(fx.attempts).toHaveLength(6);
    fx.attempts.forEach((frames, i) => {
      const live = fx.rows.find((row) => row.attempt === i + 1)!.draws!;
      const record = track(frames, OLD);
      expect(record.clean).toBe(live.clean);
      expect(record.broke).toBe(live.broke);
      expect(record.order.slice(0, record.clean)).toEqual(live.order.slice(0, live.clean));
    });
    expect(fx.rows.map((row) => row.draws!.clean)).toEqual([21, 21, 21, 21, 29, 21]);
    expect(fx.rows[0]!.draws!.broke).toBe(`T4: POMMEL_STRIKE ${LEFT}`);
  });

  it("now the drawn Pommel Strike is a draw: every attempt's order goes on to its T6 reshuffle (29), the same cards", () => {
    for (const [k, frames] of fx.attempts.entries()) {
      const record = track(frames, NEW);
      expect(record).toMatchObject({ clean: 29, broke: "T6: reshuffle (the discard pile shuffled into the draw pile)" });
      // Read by the hand's order already in v4 (the played Pommel Strike was not the hand's last): the same record.
      expect(track(frames, V4)).toEqual(record);
      if (k !== 4) {
        // T4: the turn's Pommel Strike (draw 20), then the one it drew (22); then the Defend (23: drawn by the second one, or
        // on T5 when it was kept).
        expect(record.order.slice(17, 23)).toEqual(["TREMBLE", "TWIN_STRIKE", "POMMEL_STRIKE", "IRON_WAVE", "POMMEL_STRIKE", "DEFEND_IRONCLAD"]);
        expect(record.turns.slice(17, 22)).toEqual([4, 4, 4, 4, 4]);
      }
    }
    // Attempt 5 drew the same 29 in the same order (it played its first Pommel Strike elsewhere).
    expect(track(fx.attempts[4]!, NEW).order.slice(0, 29)).toEqual(track(fx.attempts[0]!, NEW).order.slice(0, 29));
  });

  it("attempts 2-6 know 29 draws (live: 21, and attempt 6 lost its 29 at its own T4), every prediction right", () => {
    const records = fx.attempts.map((frames) => track(frames, NEW));
    for (let k = 1; k < 6; k += 1) {
      const now = knownOrderOf(records.slice(0, k).map((draws, i) => ({ attempt: i + 1, draws }))).known!;
      expect(now.keys).toHaveLength(29);
      expect(predictions(now, fx.attempts[k]!, NEW)).toEqual({ checked: 24, wrong: 0, knownAtStart: 24, off: "T6: reshuffle (the discard pile shuffled into the draw pile)" });
      const live = knownOrderOf(fx.rows.slice(0, k).map((row) => ({ attempt: row.attempt, draws: row.draws! }))).known!;
      expect(live.keys).toHaveLength(k < 5 ? 21 : 29);
      const before = predictions(live, fx.attempts[k]!, OLD);
      expect(before).toMatchObject({ checked: 16, wrong: 0 });
      if (k !== 4) expect(before.off).toBe(`T4: POMMEL_STRIKE ${LEFT}`);
    }
  });
});

describe("SL_RETRY_KNOWN_HAND_ORDER's hand exits: the played card was the hand's last (logged single-attempt fights)", () => {
  it("M6P7KAWMF6BC F29 T1: Pommel Strike from 旋风斩, 剑柄打击 drew the other; v4 broke there (5 known), now 13 to T2's end", () => {
    const frames = fixture("m6p7-f29").attempts[0]!;
    expect(track(frames, V4)).toMatchObject({ clean: 5, broke: `T1: POMMEL_STRIKE ${LEFT}` });
    const record = track(frames, NEW);
    expect(record).toMatchObject({ clean: 13, broke: null });
    expect(record.order.slice(0, 6)).toEqual(["INFERNO", "DEFEND_IRONCLAD", "STRIKE_IRONCLAD", "WHIRLWIND", "POMMEL_STRIKE", "POMMEL_STRIKE"]);
    expect(record.turns.slice(0, 6)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("VBHZ77A3N496 F20 T1: Battle Trance from the hand's end drew Battle Trance, One-Two Punch, Strike (in the hand's order)", () => {
    const frames = fixture("vbhz-f20").attempts[0]!;
    expect(track(frames, V4)).toMatchObject({ clean: 5, broke: `T1: BATTLE_TRANCE ${LEFT}` });
    const record = track(frames, NEW);
    expect(record.order.slice(0, 8)).toEqual(["DEFEND_IRONCLAD", "DEFEND_IRONCLAD", "ASCENDERS_BANE", "SETUP_STRIKE", "BATTLE_TRANCE", "BATTLE_TRANCE", "ONE_TWO_PUNCH", "STRIKE_IRONCLAD"]);
    // The turn's end (hand discarded, Prowess off the pile): another break, after the 8.
    expect(record).toMatchObject({ clean: 8, broke: `T1: PROWESS ${LEFT}` });
  });

  it("JW925EDF9ZTQ F12 T1: a hand selection (combat_hand_select) replaced Strike and Defend: the Defend drawn is a draw", () => {
    const frames = fixture("jw92-f12").attempts[0]!;
    expect(track(frames, V4)).toMatchObject({ clean: 5, broke: `T1: DEFEND_IRONCLAD ${LEFT}` });
    const record = track(frames, NEW);
    expect(record).toMatchObject({ clean: 12, broke: null });
    expect(record.order.slice(5, 7)).toEqual(["DEFEND_IRONCLAD", "OMNISLICE"]);
  });
});

describe("SL_RETRY_KNOWN_HAND_ORDER's hand exits on synthetic boards", () => {
  /** A board: hand (in order), piles; `played`: cards played this turn; `exhaust`, `potions`, `powers`, a hand selection. */
  const board = (o: { turn?: number; hand: string[]; draw: string[]; discard?: string[]; exhaust?: string[]; played?: number; potions?: string[]; powers?: string[]; handSelect?: boolean }): Raw => {
    const raw = bossBoard({ turn: o.turn ?? 1, hp: 60, lethal: false, playable: true });
    const combat = raw["combat"] as Raw;
    combat["hand"] = o.hand.map((key, index) => ({ index, card_id: key.replace(/\+$/, ""), name: key, upgraded: key.endsWith("+"), energy_cost: 1, playable: true, target_type: "AnyEnemy", requires_target: true, valid_target_indices: [0] }));
    const player = combat["player"] as Raw;
    if (o.played !== undefined) player["cards_played_this_turn"] = o.played;
    if (o.powers) player["powers"] = o.powers.map((id) => ({ power_id: id, amount: 1 }));
    const lines = (keys: string[]) => {
      const counts = new Map<string, number>();
      for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
      return [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, n]) => ({ line: `${key}${n > 1 ? `*${n}` : ""} [1费]：text`, card_ids: [key.replace(/\+$/, "")] }));
    };
    raw["agent_view"] = { combat: { draw: lines(o.draw), discard: lines(o.discard ?? []), exhaust: lines(o.exhaust ?? []) } };
    const run = raw["run"] as Raw;
    run["deck"] = [...o.hand, ...o.draw, ...(o.discard ?? []), ...(o.exhaust ?? [])].map((key, index) => ({ index, card_id: key.replace(/\+$/, ""), name: key, upgraded: key.endsWith("+") }));
    run["potions"] = (o.potions ?? []).map((id, index) => ({ index, potion_id: id, name: id, occupied: true, can_use: true }));
    if (o.handSelect) {
      raw["screen"] = "CARD_SELECTION";
      raw["selection"] = { kind: "combat_hand_select", prompt: "[center]选择[blue]1[/blue]张牌来[gold]消耗[/gold]。[/center]", cards: [] };
    }
    return raw;
  };
  const run = (options: DrawTrackerOptions, steps: Raw[]) => {
    const t = new DrawTracker(options);
    for (const step of steps) t.observe(state(step));
    return t.record;
  };
  // Hand A, POMMEL (drawn on T1: the pile's first two); the pile then POMMEL, B. Pommel Strike played, the other one drawn.
  const start = board({ hand: [], draw: ["A", "POMMEL", "POMMEL", "B"], played: 0 });
  const drawn = board({ hand: ["A", "POMMEL"], draw: ["POMMEL", "B"], played: 0 });

  it("the hand looks the same, the played one in the discard pile, a card played: the copy is the pile's next draw", () => {
    const record = run(NEW, [start, drawn, board({ hand: ["A", "POMMEL"], draw: ["B"], discard: ["POMMEL"], played: 1 })]);
    expect(record).toMatchObject({ order: ["A", "POMMEL", "POMMEL"], turns: [1, 1, 1], clean: 3, broke: null });
    // v4 (no hand exits) and the switch off: the order ends there, as before.
    for (const options of [V4, OLD]) expect(run(options, [start, drawn, board({ hand: ["A", "POMMEL"], draw: ["B"], discard: ["POMMEL"], played: 1 })]).broke).toBe(`T1: POMMEL ${LEFT}`);
  });

  it("to the exhaust pile (Slimed drawing Slimed), and by a hand selection (Burning Pact's exhaust, no card counted as played)", () => {
    const slimed = run(NEW, [board({ hand: [], draw: ["A", "SLIMED", "SLIMED"], played: 0 }), board({ hand: ["A", "SLIMED"], draw: ["SLIMED"], played: 0 }), board({ hand: ["A", "SLIMED"], draw: [], exhaust: ["SLIMED"], played: 1 })]);
    expect(slimed).toMatchObject({ order: ["A", "SLIMED", "SLIMED"], clean: 3, broke: null });
    // Burning Pact's selection exhausts B; it draws 2: B (a copy) and C.
    const pact = run(NEW, [
      board({ hand: [], draw: ["A", "B", "B", "C", "D"], played: 0 }),
      board({ hand: ["A", "B"], draw: ["B", "C", "D"], played: 0 }),
      board({ hand: ["A", "B"], draw: ["B", "C", "D"], played: 1, handSelect: true }),
      board({ hand: ["A", "B", "C"], draw: ["D"], discard: ["BURNING_PACT"], exhaust: ["B"], played: 1 }),
    ]);
    expect(pact).toMatchObject({ order: ["A", "B", "B", "C"], clean: 4, broke: null });
  });

  it("not read so when something else may have put a pile card there: no card played, a potion, Havoc, Hellraiser, a full hand", () => {
    const after = (o: Partial<Parameters<typeof board>[0]>) => board({ hand: ["A", "POMMEL"], draw: ["B"], discard: ["POMMEL"], played: 1, ...o });
    // No card played and no hand selection (the state says 0 played, or does not say).
    expect(run(NEW, [start, drawn, after({ played: 0 })]).broke).toBe(`T1: POMMEL ${LEFT}`);
    expect(run(NEW, [board({ hand: [], draw: ["A", "POMMEL", "POMMEL", "B"] }), board({ hand: ["A", "POMMEL"], draw: ["POMMEL", "B"] }), after({ played: undefined })]).broke).toBe(`T1: POMMEL ${LEFT}`);
    // A potion drunk in the step.
    expect(run(NEW, [board({ hand: [], draw: ["A", "POMMEL", "POMMEL", "B"], played: 0, potions: ["SOME_POTION"] }), board({ hand: ["A", "POMMEL"], draw: ["POMMEL", "B"], played: 0, potions: ["SOME_POTION"] }), after({ potions: [] })]).broke).toBe(`T1: POMMEL ${LEFT}`);
    // Hellraiser on: its Strike-named draws are played at once (SL_RETRY_KNOWN_OFF_TOP reads those, not the hand exits).
    const hell = run(NEW, [
      board({ hand: [], draw: ["A", "POMMEL_STRIKE", "POMMEL_STRIKE", "B"], played: 0, powers: ["HELLRAISER_POWER"] }),
      board({ hand: ["A", "POMMEL_STRIKE"], draw: ["POMMEL_STRIKE", "B"], played: 0, powers: ["HELLRAISER_POWER"] }),
      board({ hand: ["A", "POMMEL_STRIKE"], draw: ["B"], discard: ["POMMEL_STRIKE"], played: 1, powers: ["HELLRAISER_POWER"] }),
    ]);
    expect(hell.offTop).toEqual([{ turn: 1, at: 2, cards: ["POMMEL_STRIKE"], names: ["POMMEL_STRIKE"], source: "Hellraiser" }]);
    // Havoc left the hand in the step (it plays the pile's top): read as off the top, not as a drawn copy.
    const havoc = run(NEW, [board({ hand: [], draw: ["A", "HAVOC", "POMMEL", "B"], played: 0 }), board({ hand: ["A", "HAVOC"], draw: ["POMMEL", "B"], played: 0 }), board({ hand: ["A"], draw: ["B"], discard: ["HAVOC"], exhaust: ["POMMEL"], played: 1 })]);
    expect(havoc.offTop).toEqual([{ turn: 1, at: 2, cards: ["POMMEL"], names: ["POMMEL"], source: "Havoc" }]);
    // A hand of 10 after the step: a draw past it goes to the discard pile.
    const ten = ["C", "D", "E", "F", "G", "H", "I", "J", "A", "POMMEL"];
    const full = run(NEW, [board({ hand: [], draw: [...ten, "POMMEL", "B"], played: 0 }), board({ hand: ten, draw: ["POMMEL", "B"], played: 0 }), board({ hand: ten, draw: ["B"], discard: ["POMMEL"], played: 1 })]);
    expect(full.broke).toBe(`T1: POMMEL ${LEFT}`);
  });

  it("the hand's order first: a played copy that was not the hand's last is read as before (no hand exits needed)", () => {
    const steps = [board({ hand: [], draw: ["POMMEL", "A", "POMMEL", "B"], played: 0 }), board({ hand: ["POMMEL", "A"], draw: ["POMMEL", "B"], played: 0 }), board({ hand: ["A", "POMMEL"], draw: ["B"], discard: ["POMMEL"], played: 1 })];
    expect(run(NEW, steps)).toEqual(run(V4, steps));
    expect(run(NEW, steps)).toMatchObject({ order: ["POMMEL", "A", "POMMEL"], clean: 3, broke: null });
  });
});
