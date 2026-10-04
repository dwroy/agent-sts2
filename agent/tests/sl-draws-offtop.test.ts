/**
 * SL_RETRY_KNOWN_OFF_TOP and SL_RETRY_KNOWN_HAND_ORDER (docs/sl.md §10.2, src/sl/draws.ts) on logged frames
 * (tests/sl-draws-data, make-fixtures.ts: the frames cut to what the tracker reads, checked against the whole ones):
 * - RNTVAT76BPV0 F38 (巨斧机器人, 4 attempts): the potion Distilled Chaos (精炼混沌, 「打出你抽牌堆顶部的{Repeat}张牌」) played the
 *   pile's top 3 without drawing them, attempt 1 on T2 (places 11-13), attempt 2 on T1 (6-8), attempts 3 and 4 as attempt 1.
 *   Live, each broke the known order there ("left the draw pile without coming into the hand"): attempts 3-4 knew 10 draws.
 *   Now the 3 are places of the order (their order among themselves not known until an attempt draws them), the order goes on.
 * - P68P7CDJRDH3 F25 T1: Shrug It Off played from the hand drew Shrug It Off (the hand's order shows it, counting does not).
 * - H1FAYT87VH2Q F2 T2 (Havoc, one card, then a reshuffle), VTREB5A9XWS7 F2 T1 (Cascade, two cards).
 * - C4F14F3XPN0N F33 (5 attempts): Hellraiser (地狱狂徒) plays each Strike it draws at once, so on T4-T5 a Strike left the pile
 *   among the turn's draws (where among them not known): the old order broke at T4 (18 known); now the turn's draws are a span
 *   of unknown order and the order goes on (30), resolved by attempt 4 (no Hellraiser: its draws in order).
 * - Off (the options without them): the tracker's record is the live one (the rows' `draws`).
 * No logs/ or .cache, no model.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/hand/mod/schema.js";
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

const OLD: DrawTrackerOptions = { inserts: true, tops: true, picks: true };
const NEW: DrawTrackerOptions = { ...OLD, offTop: true, handOrder: true };

function track(frames: readonly Raw[], options: DrawTrackerOptions): DrawTracker {
  const tracker = new DrawTracker(options);
  for (const frame of frames) tracker.observe(parseGameState(frame));
  return tracker;
}

/**
 * Every prediction against what came: on each frame the known cards ahead (checkKnown, the cards moved on top left out),
 * compared with the places the next step took off the pile (within the attempt's clean part; a place of unknown order by its
 * cards). A step that also took a card by choice or added one to the pile changes what is next and is not compared.
 */
function predictions(known: KnownOrder, frames: readonly Raw[], options: DrawTrackerOptions): { checked: number; wrong: number; knownAtStart: number; off: string | null } {
  const tracker = new DrawTracker(options);
  let prev: { from: number; keys: string[]; picks: number; inserts: number } | null = null;
  let checked = 0;
  let wrong = 0;
  let knownAtStart = -1;
  let off: string | null = null;
  for (const frame of frames) {
    tracker.observe(parseGameState(frame));
    const record = tracker.record;
    const picks = record.picked?.length ?? 0;
    const inserts = record.inserted?.length ?? 0;
    const to = Math.min(record.order.length, record.clean);
    if (prev && to > prev.from && picks === prev.picks && inserts === prev.inserts) {
      for (let at = prev.from; at < Math.min(to, prev.from + prev.keys.length); at += 1) {
        const predicted = prev.keys[at - prev.from]!.replace(/\+$/, "");
        const block = (record.offTop ?? []).find((step) => step.cards.length > 1 && step.at <= at && at < step.at + step.cards.length);
        const came = block ? block.cards.map((card) => card.replace(/\+$/, "")) : [record.order[at]!.replace(/\+$/, "")];
        checked += 1;
        if (!came.includes(predicted)) wrong += 1;
      }
    }
    let keys: string[] = [];
    if (off === null) {
      const check = checkKnown(known, tracker);
      if (!check.ok) off = check.reason;
      else keys = check.keys.slice(tracker.topped.keys.length);
      if (knownAtStart < 0) knownAtStart = check.ok ? check.keys.length : 0;
    }
    prev = { from: record.order.length, keys, picks, inserts };
  }
  return { checked, wrong, knownAtStart, off };
}

describe("RNTVAT76BPV0 F38: Distilled Chaos plays the draw pile's top 3", () => {
  const fx = fixture("rntvat-f38");

  it("the old options track the live rows' draws: the order breaks at the potion (clean 10, 5, 10, 10)", () => {
    expect(fx.attempts).toHaveLength(4);
    fx.attempts.forEach((frames, i) => {
      const live = fx.rows.find((row) => row.attempt === i + 1)!.draws!;
      const record = track(frames, OLD).record;
      expect(record.clean).toBe(live.clean);
      expect(record.broke).toBe(live.broke);
      expect(record.order.slice(0, record.clean)).toEqual(live.order.slice(0, live.clean));
      expect(record.offTop).toBeUndefined();
    });
    expect(fx.rows.map((row) => row.draws!.clean)).toEqual([10, 5, 10, 10]);
    expect(fx.rows[0]!.draws!.broke).toBe("T2: MANGLE, STRIKE_IRONCLAD, ASCENDERS_BANE left the draw pile without coming into the hand (played from the top, discarded, exhausted, or past the 10-card hand)");
  });

  it("the cards off the top are the pile's next places: attempt 1's order goes on to 29 (26 drawn, 3 played)", () => {
    const one = track(fx.attempts[0]!, NEW).record;
    expect(one.offTop).toEqual([{ turn: 2, at: 10, cards: ["MANGLE", "STRIKE_IRONCLAD", "ASCENDERS_BANE"], names: ["凌虐", "打击", "进阶之灾"], source: "Distilled Chaos" }]);
    expect(one).toMatchObject({ clean: 29, broke: null });
    // The live order's first 10, the three off the top, then the live order's draws after them, unchanged.
    const live = fx.rows[0]!.draws!;
    expect(one.order.slice(0, 10)).toEqual(live.order.slice(0, 10));
    expect(one.order.slice(13)).toEqual(live.order.slice(10));
    const two = track(fx.attempts[1]!, NEW).record;
    expect(two.offTop).toEqual([{ turn: 1, at: 5, cards: ["STRIKE_IRONCLAD", "BLOODLETTING+", "DEFEND_IRONCLAD"], names: ["打击", "放血+", "防御"], source: "Distilled Chaos" }]);
    expect(two).toMatchObject({ clean: 20, broke: null });
  });

  it("attempt 2 knows 29 places from attempt 1 (11-13 in an order not known), and every prediction is the next draws", () => {
    const one = track(fx.attempts[0]!, NEW).record;
    const known = knownOrderOf([{ attempt: 1, draws: one }]).known!;
    expect(known.keys).toHaveLength(29);
    expect(known.unordered).toEqual([{ at: 10, n: 3 }]);
    const result = predictions(known, fx.attempts[1]!, NEW);
    expect(result).toMatchObject({ wrong: 0, off: null });
    // T1's hand drawn before the first frame; then places 6-10 (the potion took 6-8 as a block), 14-20 on T3.
    expect(result.checked).toBe(12);
    // Live (the old options) attempt 2 knew 10 and lost them at its own potion on T1.
    const old = predictions(knownOrderOf([{ attempt: 1, draws: fx.rows[0]!.draws! }]).known!, fx.attempts[1]!, OLD);
    expect(old.off).toMatch(/^T1: STRIKE_IRONCLAD, BLOODLETTING\+, DEFEND_IRONCLAD left the draw pile/);
  });

  it("attempts 3 and 4 know all 29 from attempts 1-2 (attempt 2 drew 11-13 into the hand), every prediction right", () => {
    const records = fx.attempts.map((frames) => track(frames, NEW).record);
    const known = knownOrderOf([{ attempt: 1, draws: records[0]! }, { attempt: 2, draws: records[1]! }]).known!;
    expect(known.keys).toHaveLength(29);
    expect(known.unordered).toBeUndefined();
    expect(known.keys.slice(10, 13)).toEqual(["MANGLE", "ASCENDERS_BANE", "STRIKE_IRONCLAD"]);
    for (const k of [2, 3]) {
      const result = predictions(known, fx.attempts[k]!, NEW);
      expect(result).toMatchObject({ wrong: 0, off: null, knownAtStart: 24 });
      expect(result.checked).toBeGreaterThan(10);
    }
    // Live: 10 known (the rows' order), lost at the potion.
    const live = knownOrderOf(fx.rows.slice(0, 2).map((row) => ({ attempt: row.attempt, draws: row.draws! }))).known!;
    expect(live.keys).toHaveLength(10);
  });
});

describe("C4F14F3XPN0N F33: Hellraiser plays the Strikes it draws, among the turn's draws (T1-T6 of 5 attempts)", () => {
  const fx = fixture("c4f1-f33");
  const records = (options: DrawTrackerOptions) => fx.attempts.map((frames) => track(frames, options).record);

  it("old: the order breaks at T4 (the Strike drawn and played at once); new: the turn's draws are a span of unknown order", () => {
    const old = records(OLD);
    for (const k of [0, 1, 2, 4]) expect(old[k]).toMatchObject({ clean: 18, broke: "T4: STRIKE_IRONCLAD left the draw pile without coming into the hand (played from the top, discarded, exhausted, or past the 10-card hand)" });
    // Attempt 4 played no Hellraiser: its draws in order.
    expect(old[3]).toMatchObject({ clean: 28, broke: null });
    const neu = records(NEW);
    expect(neu[0]!.offTop).toEqual([
      { turn: 4, at: 18, cards: ["STRIKE_IRONCLAD", "TREMBLE", "BLUDGEON", "INFERNO+", "INFERNO+"], names: ["打击", "战栗", "重锤", "狱火+", "狱火+"], source: "Hellraiser" },
      { turn: 5, at: 23, cards: ["STRIKE_IRONCLAD", "SETUP_STRIKE", "BLOOD_WALL", "BLOOD_WALL"], names: ["打击", "预备打击", "血墙", "血墙"], source: "Hellraiser" },
    ]);
    expect(neu[0]).toMatchObject({ clean: 30, broke: "T6: reshuffle (the discard pile shuffled into the draw pile)" });
    expect(neu[3]).toEqual(old[3]);
  });

  it("attempts 2-3 know 30 places from attempt 1 (two spans of unknown order), attempt 5 all 30 in order (attempt 4's draws): every prediction right", () => {
    const neu = records(NEW);
    const fromOne = knownOrderOf([{ attempt: 1, draws: neu[0]! }]).known!;
    expect(fromOne).toMatchObject({ unordered: [{ at: 18, n: 5 }, { at: 23, n: 4 }] });
    expect(fromOne.keys).toHaveLength(30);
    const oldKnown = knownOrderOf([{ attempt: 1, draws: records(OLD)[0]! }]).known!;
    expect(oldKnown.keys).toHaveLength(18);
    for (const k of [1, 2]) {
      const now = predictions(fromOne, fx.attempts[k]!, NEW);
      const before = predictions(oldKnown, fx.attempts[k]!, OLD);
      // Known to the attempt's own T6 reshuffle (the old one: to its T4 Hellraiser).
      expect(now).toMatchObject({ wrong: 0, off: "T6: reshuffle (the discard pile shuffled into the draw pile)" });
      expect(before).toMatchObject({ wrong: 0, off: expect.stringMatching(/^T4: STRIKE_IRONCLAD left the draw pile/) });
      expect(now.checked).toBeGreaterThan(before.checked);
    }
    const fromFour = knownOrderOf(neu.slice(0, 4).map((draws, i) => ({ attempt: i + 1, draws }))).known!;
    expect(fromFour.keys).toHaveLength(30);
    expect(fromFour.unordered).toBeUndefined();
    expect(predictions(fromFour, fx.attempts[4]!, NEW)).toMatchObject({ wrong: 0, off: "T6: reshuffle (the discard pile shuffled into the draw pile)" });
  });
});

describe("SL_RETRY_KNOWN_HAND_ORDER: a played card's copy drawn in the same step (P68P7CDJRDH3 F25 T1)", () => {
  const fx = fixture("p68p-f25");
  it("old: the drawn Shrug It Off is taken for one that left the pile otherwise; new: drawn, the order goes on", () => {
    const old = track(fx.attempts[0]!, OLD).record;
    expect(old).toMatchObject({ clean: 5, broke: "T1: SHRUG_IT_OFF left the draw pile without coming into the hand (played from the top, discarded, exhausted, or past the 10-card hand)" });
    expect(fx.rows[0]!.draws!.clean).toBe(5);
    const neu = track(fx.attempts[0]!, { ...OLD, handOrder: true }).record;
    expect(neu).toMatchObject({ clean: 11, broke: null });
    expect(neu.order.slice(0, 6)).toEqual(["ASCENDERS_BANE", "DEFEND_IRONCLAD", "TAUNT", "SHRUG_IT_OFF", "STRIKE_IRONCLAD", "SHRUG_IT_OFF"]);
    expect(neu.offTop).toBeUndefined();
  });

  it("synthetic: 防御, 耸肩无视, 打击 -> 耸肩无视 played and drawn again lands last (counting the hand sees no new card)", () => {
    const board = (hand: string[], draw: string[], discard: string[]) => withCards(bossBoard({ turn: 1, hp: 60, lethal: false, playable: true }), hand, draw, discard);
    const t = new DrawTracker({ ...OLD, handOrder: true });
    t.observe(state(board([], ["DEFEND", "SHRUG", "STRIKE", "SHRUG", "BASH"], [])));
    t.observe(state(board(["DEFEND", "SHRUG", "STRIKE"], ["SHRUG", "BASH"], [])));
    t.observe(state(board(["DEFEND", "STRIKE", "SHRUG"], ["BASH"], ["SHRUG"])));
    expect(t.record).toMatchObject({ order: ["DEFEND", "SHRUG", "STRIKE", "SHRUG"], clean: 4, broke: null });
    const off = new DrawTracker(OLD);
    off.observe(state(board([], ["DEFEND", "SHRUG", "STRIKE", "SHRUG", "BASH"], [])));
    off.observe(state(board(["DEFEND", "SHRUG", "STRIKE"], ["SHRUG", "BASH"], [])));
    off.observe(state(board(["DEFEND", "STRIKE", "SHRUG"], ["BASH"], ["SHRUG"])));
    expect(off.record.broke).toMatch(/^T1: SHRUG left the draw pile without coming into the hand/);
  });
});

describe("Havoc and Cascade (single-attempt fights)", () => {
  it("H1FAYT87VH2Q F2 T2: Havoc plays the top card, the order goes on to the T3 reshuffle", () => {
    const frames = fixture("h1fa-f2").attempts[0]!;
    expect(track(frames, OLD).record).toMatchObject({ clean: 10, broke: "T2: STRIKE_IRONCLAD left the draw pile without coming into the hand (played from the top, discarded, exhausted, or past the 10-card hand)" });
    const neu = track(frames, NEW).record;
    expect(neu.offTop).toEqual([{ turn: 2, at: 10, cards: ["STRIKE_IRONCLAD"], names: ["打击"], source: "Havoc" }]);
    expect(neu).toMatchObject({ clean: 14, broke: "T3: reshuffle (the discard pile shuffled into the draw pile)" });
  });

  it("VTREB5A9XWS7 F2 T1: Cascade plays the top 2", () => {
    const neu = track(fixture("vtre-f2").attempts[0]!, NEW).record;
    expect(neu.offTop).toEqual([{ turn: 1, at: 5, cards: ["STRIKE_IRONCLAD", "ASCENDERS_BANE"], names: ["打击", "进阶之灾"], source: "Cascade" }]);
    expect(neu.clean).toBe(11);
  });
});

/** A board's hand (in hand order) and piles (grouped and sorted by name, as the game lists them); `potions`: the belt. */
function withCards(board: Raw, hand: string[], draw: string[], discard: string[], potions: string[] = []): Raw {
  const combat = board["combat"] as Raw;
  combat["hand"] = hand.map((key, index) => ({ index, card_id: key.replace(/\+$/, ""), name: key, upgraded: key.endsWith("+"), energy_cost: 1, playable: true, target_type: "AnyEnemy", requires_target: true, valid_target_indices: [0] }));
  const lines = (keys: string[]) => {
    const counts = new Map<string, number>();
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    return [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, n]) => ({ line: `${key}${n > 1 ? `*${n}` : ""} [1费]：text`, card_ids: [key.replace(/\+$/, "")] }));
  };
  board["agent_view"] = { combat: { draw: lines(draw), discard: lines(discard), exhaust: [] } };
  const run = board["run"] as Raw;
  run["deck"] = [...hand, ...draw, ...discard].map((key, index) => ({ index, card_id: key.replace(/\+$/, ""), name: key, upgraded: key.endsWith("+") }));
  run["potions"] = potions.map((id, index) => ({ index, potion_id: id, name: id, occupied: true, can_use: true }));
  return board;
}

describe("SL_RETRY_KNOWN_OFF_TOP: what is read as off the top, and what is not", () => {
  const board = (turn: number, hand: string[], draw: string[], discard: string[], potions: string[] = []) => withCards(bossBoard({ turn, hp: 60, lethal: false, playable: true }), hand, draw, discard, potions);
  const run = (options: DrawTrackerOptions, steps: Raw[]) => {
    const t = new DrawTracker(options);
    for (const step of steps) t.observe(state(step));
    return t.record;
  };

  it("Havoc then its card's draw: the played card first, then the drawn one", () => {
    // Hand A, HAVOC; pile B, C, D. Havoc plays B (a draw card), which draws C.
    const record = run(NEW, [board(1, ["A", "HAVOC"], ["B", "C", "D"], []), board(1, ["A", "C"], ["D"], ["HAVOC", "B"])]);
    expect(record).toMatchObject({ order: ["A", "HAVOC", "B", "C"], clean: 4, broke: null });
    expect(record.offTop).toEqual([{ turn: 1, at: 2, cards: ["B"], names: ["B"], source: "Havoc" }]);
  });

  it("Distilled Chaos with a draw among its cards: which drew is not known, the order ends (as before)", () => {
    const record = run(NEW, [board(1, ["A"], ["B", "C", "D", "E"], [], ["DISTILLED_CHAOS"]), board(1, ["A", "D"], ["E"], ["B", "C"], [])]);
    expect(record.broke).toMatch(/^T1: B, C left the draw pile without coming into the hand/);
    expect(record.offTop).toBeUndefined();
  });

  it("nothing that plays the top in the step (a random pile card: Catastrophe), or the switch off: the order ends", () => {
    const random = run(NEW, [board(1, ["A", "CATASTROPHE"], ["B", "C", "D"], []), board(1, ["A"], ["B", "D"], ["CATASTROPHE", "C"])]);
    expect(random.broke).toMatch(/^T1: C left the draw pile without coming into the hand/);
    const off = run(OLD, [board(1, ["A", "HAVOC"], ["B", "C", "D"], []), board(1, ["A"], ["C", "D"], ["HAVOC", "B"])]);
    expect(off.broke).toMatch(/^T1: B left the draw pile without coming into the hand/);
    expect(off.offTop).toBeUndefined();
  });

  it("Distilled Chaos's three at once: places of unknown order; another attempt drawing them puts them in order", () => {
    const chaos = run(NEW, [board(1, ["A"], ["B", "C", "D", "E", "F"], [], ["DISTILLED_CHAOS"]), board(1, ["A"], ["E", "F"], ["B", "C", "D"], []), board(2, ["E", "F"], [], ["A", "B", "C", "D"])]);
    expect(chaos.offTop).toEqual([{ turn: 1, at: 1, cards: ["B", "C", "D"], names: ["B", "C", "D"], source: "Distilled Chaos" }]);
    expect(chaos).toMatchObject({ order: ["A", "B", "C", "D", "E", "F"], clean: 6, broke: null });
    const alone = knownOrderOf([{ attempt: 1, draws: chaos }]).known!;
    expect(alone).toMatchObject({ keys: ["A", "B", "C", "D", "E", "F"], unordered: [{ at: 1, n: 3 }] });
    // The other attempt drew them: C, D, B (and E): their order is known from it.
    const drawn: SlDraws = { order: ["A", "C", "D", "B", "E"], names: ["A", "C", "D", "B", "E"], turns: [1, 1, 1, 2, 2], clean: 5, broke: null };
    const both = knownOrderOf([{ attempt: 1, draws: chaos }, { attempt: 2, draws: drawn }]).known!;
    expect(both.keys).toEqual(["A", "C", "D", "B", "E", "F"]);
    expect(both.unordered).toBeUndefined();
    // Drawing otherwise than the block's cards there: the order is cut where the block starts.
    const other: SlDraws = { order: ["A", "C", "E", "B"], names: ["A", "C", "E", "B"], turns: [1, 1, 1, 2], clean: 4, broke: null };
    const cut = knownOrderOf([{ attempt: 1, draws: chaos }, { attempt: 2, draws: other }]);
    expect(cut.known).toMatchObject({ keys: ["A"] });
    expect(cut.reason).toMatch(/^attempts 1 and 2 drew differently at draws 2-4 \(in an order not known/);
  });

  it("checkKnown: the next cards only up to a place of unknown order, none inside it, and on again past it", () => {
    const known: KnownOrder = { keys: ["A", "B", "C", "D", "E", "F"], names: ["A", "B", "C", "D", "E", "F"], attempts: [1], unordered: [{ at: 1, n: 3 }] };
    const t = new DrawTracker(NEW);
    t.observe(state(board(1, ["A"], ["B", "C", "D", "E", "F"], [])));
    expect(checkKnown(known, t)).toMatchObject({ ok: true, keys: [] });
    // Draw C, D (two of the block, in an order the known one does not fix): still inside it.
    t.observe(state(board(1, ["A", "C", "D"], ["B", "E", "F"], [])));
    expect(checkKnown(known, t)).toMatchObject({ ok: true, keys: [] });
    // B, the block's last: past it, E and F known.
    t.observe(state(board(2, ["B"], ["E", "F"], ["A", "C", "D"])));
    expect(checkKnown(known, t)).toMatchObject({ ok: true, keys: ["E", "F"] });
    // A card not of the block at its places: off.
    const wrong = new DrawTracker(NEW);
    wrong.observe(state(board(1, ["A"], ["B", "C", "D", "E", "F"], [])));
    wrong.observe(state(board(1, ["A", "E"], ["B", "C", "D", "F"], [])));
    expect(checkKnown(known, wrong)).toMatchObject({ ok: false });
    // Without unordered places: as before (exact places).
    const plain: KnownOrder = { keys: ["A", "B", "C"], names: ["A", "B", "C"], attempts: [1] };
    const p = new DrawTracker(NEW);
    p.observe(state(board(1, ["A"], ["B", "C"], [])));
    expect(checkKnown(plain, p)).toEqual({ ok: true, keys: ["B", "C"], names: ["B", "C"] });
  });
});
