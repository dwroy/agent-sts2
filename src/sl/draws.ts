/**
 * SL known draws (docs/sl.md §10, SL_RETRY_KNOWN_DRAWS): the order cards come off the draw pile in one attempt at a
 * fight, read from the states the loop sees, and on a retry the order an earlier attempt saw, checked against this
 * attempt's own draws as they come.
 *
 * What the logs say (2026-10-02, every fight played more than once from its room-entry save):
 * - The draw pile's order at the fight's start is the same in every attempt, whatever is played: VNKN9952ZNA0 F25
 *   (three attempts, different plays from T1 on) drew the same 25 cards, the whole pile, in the same order on T1-T5;
 *   VNKN F33, JW925EDF9ZTQ F48 and ZPPVDTSFJXJM F33 (a restart) the same.
 * - The hand lists the cards in the order they were drawn (a draw is added at the end: VNKN F25 attempt 3 T5, Pommel
 *   Strike's two cards last), so the hand gives the order within a turn's draw.
 * - The state's pile listing (agent_view.combat.draw) is NOT the draw order: it is grouped and sorted by name (168 of
 *   168 sampled piles), so it gives only which cards are in the pile.
 * - A reshuffle breaks it: after VNKN F25's T5 reshuffle the three attempts drew different cards (their discard piles
 *   differed). So does a card put into the draw pile at a random place (a status), and a card leaving the pile without
 *   coming into the hand (played from the top, discarded, exhausted, or past the 10-card hand): where it was is unknown.
 * So the known order is an earlier attempt's draws up to its first such event (`clean`), and this attempt uses it only
 * while its own draws so far are exactly that order and nothing broke it here either.
 *
 * SL_RETRY_KNOWN_INSERTS (Dai 2026-10-02; DrawTracker `inserts`): new cards added to the draw pile (the Insatiable's
 * Frantic Escape, the Entomancer's Dazed, the Soul Fysh's Beckon, Metamorphosis's attacks) go in at random places and
 * leave the rest of the pile in its order, so the known order goes on through them: the order records the pile's own
 * cards only, the added ones are skipped (and listed in `inserted`), and a retry's known draws carry the added cards still
 * in the pile, which the samples place at random. The logs (notes/sl-retry-report.md §9, 2026-10-02):
 * - random places: over every draw while added cards were in the pile, the chance the next card is one of them under a
 *   uniform random place, I/(I+O), predicts 148.1 of the Insatiable's 149 drawn (1026 draws), 388.4 of the Entomancer's
 *   396 (1348), 62.3 of the Soul Fysh's 72 (542; some Beckons go straight to the hand); not the top, not the bottom;
 * - the rest keeps its order: 12 of 12 times a card Headbutt put on top was still the first pile card drawn after cards
 *   were added (piles of 8-22: a shuffle would keep it first about once in 12), e.g. XSPHCB4GUSEU F25 T7 (Shrug It Off,
 *   then 3 added), H14TDJAE4JB9 F25 T6 (Blood Wall, then 4 Dazed).
 * A card moved onto the pile from the discard pile or the hand (Headbutt, Thinking Ahead: on top) ends the order, as do
 * a reshuffle and a card leaving the pile other than into the hand; so does drawing a card that may be either an added
 * copy or the pile's own (Metamorphosis adding a card the deck has).
 *
 * SL_RETRY_KNOWN_TOP (2026-10-02; DrawTracker `tops`, with `inserts`): a card moved onto the pile goes on top, the last one
 * moved first (the logs: 246 of 252 moves in the Insatiable's, Entomancer's, Soul Fysh's, Waterfall Giant's, crab's,
 * Knowledge Demon's and Kin Priest's fights were the next pile card drawn; the 6 others were a Beckon added at random and
 * counted as moved, two Headbutts stacking, a hand kept by Stable Serum). So the order goes on: the moved cards are drawn
 * next (`topped`, not in `order`), then the pile's own. Their place is certain: the known draws stay exact.
 */
import type { GameState } from "../mod/schema.js";
import { asArray, asRecord, bool, str } from "../util/json.js";

/** One attempt's draws, as the attempt's row in sl-attempts.jsonl keeps them. */
export interface SlDraws {
  /** Every card that came off the draw pile this attempt, in order: the card id, "+" when upgraded ("STRIKE_IRONCLAD+"). */
  order: string[];
  /** Their names as the hand showed them, parallel to `order`. */
  names: string[];
  /** The turn each came off on, parallel to `order`. */
  turns: number[];
  /**
   * How many leading entries of `order` are the fight's starting pile order: before the first reshuffle, card put into
   * the draw pile, or card leaving it any other way than into the hand. The rest is recorded but not known order.
   */
  clean: number;
  /** Why the clean part ended ("T5: reshuffle (the discard pile shuffled into the draw pile)"), null when it did not. */
  broke: string | null;
  /**
   * SL_RETRY_KNOWN_INSERTS: new cards added to the draw pile at random places (not in `order`): the turn, how many entries
   * `order` had then, their keys still in the pile (`cards`), and statuses that came into the hand not off the pile in that
   * step (`drawn`: added and drawn at once, most likely). Absent when none, and always with the switch off.
   */
  inserted?: { turn: number; at: number; cards: string[]; drawn?: string[] }[];
  /**
   * SL_RETRY_KNOWN_TOP: cards moved onto the draw pile from the discard pile or the hand (Headbutt, Thinking Ahead), on top:
   * the turn, how many entries `order` had then, the cards (not in `order`: drawn next, before the pile's own). Absent when
   * none, and always with the switch off.
   */
  topped?: { turn: number; at: number; cards: string[] }[];
}

/**
 * Status cards enemies add to our draw pile (the logs: the Entomancer's Dazed, the Insatiable's Frantic Escape, the Soul
 * Fysh's Beckon; and the usual others): one in the hand that did not come off the pile was most likely added and drawn in
 * the same step (SL_RETRY_KNOWN_INSERTS: recorded as added, `drawn`, so the attempt's draws are no longer exactly known).
 */
const ADDED_STATUSES = new Set(["DAZED", "FRANTIC_ESCAPE", "BECKON", "SLIMED", "WOUND", "BURN", "VOID"]);

/** The card's key: its id, and "+" when upgraded (the pile listing tells upgrades by the "+" after the name). */
export function cardKey(cardId: string, upgraded: boolean): string {
  return `${cardId}${upgraded ? "+" : ""}`;
}

interface HandCard {
  key: string;
  name: string;
}

interface Snapshot {
  turn: number;
  hand: HandCard[];
  /** The draw pile as a multiset of card keys. */
  draw: Map<string, number>;
  /** Cards in the discard pile. */
  discard: number;
  /** The discard pile as a multiset of card keys (empty when the state does not list it). */
  discardCards: Map<string, number>;
  /** The draw pile's card names by key (the listing's line), for the added cards' names. */
  drawNames: Map<string, string>;
  /** A card selection screen's prompt (in the fight: Seeker Strike's 「选择一张牌加入你的手牌」), "" otherwise. */
  selection: string;
}

/**
 * A selection that puts the chosen card into the hand: a card leaving the draw pile for the hand right after it was taken by
 * choice (Seeker Strike, Droplet of Precognition), not drawn from the top (RTF3KZLZPV2L F42 T1: Seeker Strike took Blood
 * Wall+ out of the pile while Shrug It Off+ was on top). Choices among generated cards (Attack Potion) take nothing from
 * the pile, so they never look like one.
 */
const TO_HAND_SELECTION = /加入你的手牌|放入你的手牌|into your hand/i;

/** "打击+*3 [1费]：…": the count after "*", 1 without one. */
function lineCount(line: string): number {
  return Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(line)?.[1] ?? 1);
}

/** The upgrade mark "+" right after the name (before any "*N" and the cost), as combat-plan pileCardModels reads it. */
function lineUpgraded(line: string): boolean {
  return /^[^[*：:]*?\+\s*(?:\*\d+\s*)?\[/.test(line);
}

/** The card's name in a pile line ("狂乱逃离*2 [1费]：…" -> 狂乱逃离, "打击+ [1费]" -> 打击+), or null. */
function lineName(line: string): string | null {
  return /^([^[*：:]*?)\s*(?:\*\d+\s*)?\[/.exec(line)?.[1]?.trim() || null;
}

/** The names of a pile's cards by key (agent_view.combat's lines). */
function pileNames(state: GameState, pile: "draw" | "discard"): Map<string, string> {
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  const out = new Map<string, string>();
  for (const raw of asArray(view[pile])) {
    const entry = asRecord(raw);
    const cardId = str(asArray(entry["card_ids"])[0]);
    const line = str(entry["line"]);
    const name = lineName(line);
    if (cardId && name) out.set(cardKey(cardId, lineUpgraded(line)), name);
  }
  return out;
}

/** A pile of agent_view.combat as a multiset of card keys, or null when the state does not list it. */
export function pileMultiset(state: GameState, pile: "draw" | "discard"): Map<string, number> | null {
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  if (!Array.isArray(view[pile])) return null;
  const out = new Map<string, number>();
  for (const raw of asArray(view[pile])) {
    const entry = asRecord(raw);
    const cardId = str(asArray(entry["card_ids"])[0]);
    if (!cardId) continue;
    const line = str(entry["line"]);
    const key = cardKey(cardId, lineUpgraded(line));
    out.set(key, (out.get(key) ?? 0) + Math.max(1, lineCount(line)));
  }
  return out;
}

function size(set: Map<string, number>): number {
  let n = 0;
  for (const count of set.values()) n += count;
  return n;
}

/** a - b as multisets (counts above 0 only). */
function minus(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
  const out = new Map<string, number>();
  for (const [key, count] of a) {
    const left = count - (b.get(key) ?? 0);
    if (left > 0) out.set(key, left);
  }
  return out;
}

function listOf(set: Map<string, number>): string {
  return [...set].map(([key, count]) => (count > 1 ? `${key} x${count}` : key)).join(", ");
}

function snapshotOf(state: GameState): Snapshot | null {
  if (!(state.in_combat || state.screen === "COMBAT") || state.turn === null) return null;
  const draw = pileMultiset(state, "draw");
  if (draw === null) return null;
  const discard = pileMultiset(state, "discard");
  const hand = asArray(asRecord(state.raw["combat"])["hand"]).map((raw) => {
    const card = asRecord(raw);
    const cardId = str(card["card_id"]);
    return { key: cardKey(cardId, bool(card["upgraded"])), name: str(card["name"], cardId) };
  });
  const selection = state.screen === "CARD_SELECTION" ? str(asRecord(state.raw["selection"])["prompt"]) : "";
  return { turn: state.turn, hand, draw, discard: discard === null ? 0 : size(discard), discardCards: discard ?? new Map(), drawNames: pileNames(state, "draw"), selection };
}

function countOf(cards: HandCard[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const card of cards) out.set(card.key, (out.get(card.key) ?? 0) + 1);
  return out;
}

/** Card keys counted by the card itself (the upgrade mark dropped). */
function byBase(keys: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const key of keys) out.set(baseKey(key), (out.get(baseKey(key)) ?? 0) + 1);
  return out;
}

/** The cards of `now` not in `before` by count, in hand order (a card played and drawn again is new). */
function newCards(before: HandCard[], now: HandCard[]): HandCard[] {
  const had = new Map<string, number>();
  for (const card of before) had.set(card.key, (had.get(card.key) ?? 0) + 1);
  const seen = new Map<string, number>();
  return now.filter((card) => {
    const n = (seen.get(card.key) ?? 0) + 1;
    seen.set(card.key, n);
    return n > (had.get(card.key) ?? 0);
  });
}

/** A card key without its upgrade mark: the card itself, whatever upgraded it on the way to the hand. */
export function baseKey(key: string): string {
  return key.endsWith("+") ? key.slice(0, -1) : key;
}

/**
 * The candidates that came off the pile (`left`, consumed), matched from the hand's end (draws are added last, so a kept
 * card of the same name earlier in the hand is not taken for a drawn one), returned in hand order with the key the pile
 * listed them by. A card the hand shows upgraded and the pile listed plain is the same card (VNKN9952ZNA0 F25: Bellows
 * upgrades the opening hand, the pile listed "打击*4" and the hand drew 打击+ x3).
 */
function matchDrawn(candidates: HandCard[], left: Map<string, number>): HandCard[] {
  const taken: (HandCard | null)[] = candidates.map(() => null);
  const pass = (keyOf: (card: HandCard) => string | null) => {
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      if (taken[i]) continue;
      const card = candidates[i]!;
      const key = keyOf(card);
      if (key === null || (left.get(key) ?? 0) <= 0) continue;
      left.set(key, left.get(key)! - 1);
      taken[i] = { key, name: card.name };
    }
  };
  pass((card) => card.key);
  // The same card under the other upgrade mark.
  pass((card) => {
    const other = card.key.endsWith("+") ? baseKey(card.key) : `${card.key}+`;
    return left.has(other) ? other : null;
  });
  for (const [key, n] of [...left]) if (n <= 0) left.delete(key);
  return taken.filter((card): card is HandCard => card !== null);
}

/**
 * The first state's hand cards that came off the draw pile, in hand order: those the deck less the pile now accounts for
 * (matchDrawn, as a later state's pile difference is read). A card made into the hand is not one: X7BX5DYHFZ3N F48 (ops,
 * 2026-10-02) attempt 2's first state after the reload, T1, held 血墙, 铁斩波+, 预备打击, 愤怒+, 打击 and Crossbow's 怨恨
 * (states off 5327571715); taking the whole hand recorded 怨恨 as draw 6, attempt 1 (its first state's hand empty, the
 * draw read from the pile) had 愤怒 there, and the known draws were off for attempts 2-6 ("drew 怨恨 where the earlier
 * attempt drew 愤怒 (draw 6)"). A state without the deck listed: the whole hand, as before.
 */
function openingDraws(state: GameState, now: Snapshot): HandCard[] {
  const deck = asArray(asRecord(state.raw["run"])["deck"]).map(asRecord);
  if (deck.length === 0) return now.hand;
  const cards = new Map<string, number>();
  for (const card of deck) {
    const key = cardKey(str(card["card_id"]), bool(card["upgraded"]));
    if (key) cards.set(key, (cards.get(key) ?? 0) + 1);
  }
  return matchDrawn(now.hand, minus(cards, now.draw));
}

export interface DrawTrackerOptions {
  /** SL_RETRY_KNOWN_INSERTS: new cards added to the draw pile at random places keep the order (default: they end it, as before). */
  inserts?: boolean;
  /** SL_RETRY_KNOWN_TOP (with `inserts`): a card moved onto the pile (Headbutt) is the next one drawn (default: it ends the order). */
  tops?: boolean;
}

/** One attempt's draws, from every state the loop reads during it (DrawTracker.observe). */
export class DrawTracker {
  private prev: Snapshot | null = null;
  readonly record: SlDraws = { order: [], names: [], turns: [], clean: 0, broke: null };
  private readonly inserts: boolean;
  /** SL_RETRY_KNOWN_INSERTS: the fight's own pile cards still in the draw pile (the rest of the pile are added cards). */
  private own: Map<string, number> | null = null;
  /** A status came into the hand not off the pile (ADDED_STATUSES): added to the pile and drawn at once, most likely. */
  private strayed = false;
  private readonly tops: boolean;
  /** SL_RETRY_KNOWN_TOP: cards moved onto the pile, still on it (the last one on top). */
  private topStack: HandCard[] = [];

  constructor(options: DrawTrackerOptions = {}) {
    this.inserts = options.inserts === true;
    this.tops = this.inserts && options.tops === true;
  }

  /** SL_RETRY_KNOWN_TOP: the cards moved onto the pile still on it, the next one drawn first; empty without the switch. */
  get topped(): { keys: string[]; names: string[] } {
    const stack = [...this.topStack].reverse();
    return { keys: stack.map((card) => card.key), names: stack.map((card) => card.name) };
  }

  /**
   * Whether a card was added to the draw pile in this attempt (SL_RETRY_KNOWN_INSERTS: an `inserted` event; without it: the
   * order broke on a card put into the pile): then its draws hold chance (Dai 2026-10-02: no early reload).
   */
  get addedToPile(): boolean {
    return this.strayed || (this.record.inserted?.length ?? 0) > 0 || /put into the draw pile/.test(this.record.broke ?? "");
  }

  /** Whether the draws so far are all the fight's starting pile order (nothing broke it). */
  get intact(): boolean {
    return this.record.broke === null;
  }

  /** The draw pile now (the last state with the piles listed), or null. */
  get drawPile(): Map<string, number> | null {
    return this.prev?.draw ?? null;
  }

  /**
   * SL_RETRY_KNOWN_INSERTS: the added cards still in the draw pile (at random places among the known ones), with their
   * names; empty without the switch.
   */
  get added(): { keys: string[]; names: string[] } {
    if (!this.inserts || !this.prev || !this.own) return { keys: [], names: [] };
    const keys = [...minus(minus(this.prev.draw, this.own), countOf(this.topStack))].flatMap(([key, n]) => Array.from({ length: n }, () => key));
    return { keys, names: keys.map((key) => this.prev!.drawNames.get(key) ?? key) };
  }

  /** The turn of the last state read. */
  get turn(): number | null {
    return this.prev?.turn ?? null;
  }

  observe(state: GameState): void {
    const now = snapshotOf(state);
    if (!now) return;
    const before = this.prev;
    this.prev = now;
    if (!before) {
      // The attempt's first state: a hand already there came off the pile in hand order (after a reload the game is
      // back on T1 with its hand drawn; the first attempt's first state usually has the hand still empty). Tracking that
      // starts later (a restarted process: the fight is open on a later turn, or cards were played already) knows
      // nothing of the earlier draws.
      if (now.turn !== 1 || now.discard > 0) this.breakAt(now.turn, `tracking began after the fight's start (T${now.turn}, ${now.discard} card(s) in the discard pile): the earlier draws are not known`);
      this.take(openingDraws(state, now), now.turn, this.intact);
      if (this.inserts) this.own = new Map(now.draw);
      return;
    }
    // Either mode (the record untouched): a status in the hand that did not come off the pile.
    const stepDrawn = now.turn !== before.turn ? now.hand : newCards(before.hand, now.hand);
    const fromPile = matchDrawn(stepDrawn, minus(before.draw, now.draw));
    if ([...minus(byBase(stepDrawn.map((card) => card.key)), byBase(fromPile.map((card) => card.key)))].some(([key]) => ADDED_STATUSES.has(key))) this.strayed = true;
    if (this.inserts) {
      this.observeInserts(before, now);
      return;
    }
    const left = minus(before.draw, now.draw);
    const grew = minus(now.draw, before.draw);
    // A new turn: the last hand was discarded (or kept: Retain), so any card in hand may be a new draw; within a turn
    // only the cards the hand did not have.
    const candidates = now.turn !== before.turn ? now.hand : newCards(before.hand, now.hand);
    if (size(grew) === 0) {
      const drawn = matchDrawn(candidates, left);
      if (size(left) > 0) {
        // Where those were in the pile, and so the order from here, is unknown.
        this.breakAt(now.turn, `${listOf(left)} left the draw pile without coming into the hand (played from the top, discarded, exhausted, or past the 10-card hand)`);
      }
      this.take(drawn, now.turn, this.intact);
      return;
    }
    // The discard pile went into the draw pile, or more cards were drawn than the old pile held.
    const reshuffle = (before.discard > 0 && now.discard < before.discard) || candidates.length > size(before.draw);
    if (reshuffle) {
      // The old pile was drawn to the end first (hand order), then the discard pile was shuffled in.
      const old = size(before.draw);
      const first = candidates.slice(0, old);
      const firstSet = new Map<string, number>();
      for (const card of first) firstSet.set(baseKey(card.key), (firstSet.get(baseKey(card.key)) ?? 0) + 1);
      const oldSet = new Map<string, number>();
      for (const [key, n] of before.draw) oldSet.set(baseKey(key), (oldSet.get(baseKey(key)) ?? 0) + n);
      const whole = first.length === old && size(minus(firstSet, oldSet)) === 0 && size(minus(oldSet, firstSet)) === 0;
      if (whole) this.take(first, now.turn, this.intact);
      this.breakAt(now.turn, "reshuffle (the discard pile shuffled into the draw pile)");
      this.take(whole ? candidates.slice(old) : candidates, now.turn, false);
      return;
    }
    this.breakAt(now.turn, `${listOf(grew)} put into the draw pile (at a random place, or a card back from the hand)`);
    this.take(matchDrawn(candidates, left), now.turn, false);
  }

  /**
   * SL_RETRY_KNOWN_INSERTS: observe() with added cards kept apart. The pile's own cards still in it (`own`) are what the
   * order is about; the rest of the draw pile are cards added at random places, skipped when drawn.
   */
  private observeInserts(before: Snapshot, now: Snapshot): void {
    const own = this.own ?? new Map(before.draw);
    this.own = own;
    // The added cards in the pile before this step (the pile less its own cards and the ones moved on top).
    const added = minus(minus(before.draw, own), countOf(this.topStack));
    const left = minus(before.draw, now.draw);
    const grew = minus(now.draw, before.draw);
    const candidates = now.turn !== before.turn ? now.hand : newCards(before.hand, now.hand);
    // SL_RETRY_KNOWN_TOP: one card from the discard pile onto the pile with nothing drawn past the pile is Headbutt's pick (a
    // step of its own after the selection screen), not a reshuffle (which only comes with a draw from an empty pile).
    const discardLost = minus(before.discardCards, now.discardCards);
    const oneMoved = this.tops && size(grew) === 1 && size(discardLost) === 1 && discardLost.has([...grew.keys()][0]!) && candidates.length <= size(before.draw);
    if (!oneMoved && size(grew) > 0 && ((before.discard > 0 && now.discard < before.discard) || candidates.length > size(before.draw))) {
      // A reshuffle, as observe() reads it: the old pile drawn to its end first, its own cards still the order.
      const old = size(before.draw);
      const first = candidates.slice(0, old);
      const firstSet = new Map<string, number>();
      for (const card of first) firstSet.set(baseKey(card.key), (firstSet.get(baseKey(card.key)) ?? 0) + 1);
      const oldSet = new Map<string, number>();
      for (const [key, n] of before.draw) oldSet.set(baseKey(key), (oldSet.get(baseKey(key)) ?? 0) + n);
      const whole = first.length === old && size(minus(firstSet, oldSet)) === 0 && size(minus(oldSet, firstSet)) === 0;
      if (whole) this.takeOwn(matchDrawn(first, new Map(before.draw)), own, added, now.turn);
      this.breakAt(now.turn, "reshuffle (the discard pile shuffled into the draw pile)");
      this.take(whole ? candidates.slice(old) : candidates, now.turn, false);
      this.topStack = [];
      return;
    }
    // New cards in the pile: moved in from the discard pile or the hand (Headbutt, Thinking Ahead: on top) ends the order;
    // anything else was added at a random place.
    const fresh = new Map<string, number>();
    let movedOnTop: HandCard[] = [];
    if (size(grew) > 0) {
      const fromDiscard = discardLost;
      const fromHand = minus(countOf(before.hand), countOf(now.hand));
      const moved = new Map<string, number>();
      for (const [key, n] of grew) {
        // SL_RETRY_KNOWN_TOP: a status is added at a random place even when a copy left the discard pile in the same step.
        const m = this.tops && ADDED_STATUSES.has(baseKey(key)) ? 0 : Math.min(n, (fromDiscard.get(key) ?? 0) + (fromHand.get(key) ?? 0));
        if (m > 0) moved.set(key, m);
        if (n - m > 0) fresh.set(key, n - m);
      }
      if (size(moved) > 0) {
        if (!this.tops) this.breakAt(now.turn, `${listOf(moved)} moved onto the draw pile from the discard pile or the hand (Headbutt-like: on top)`);
        else if (moved.size > 1) this.breakAt(now.turn, `${listOf(moved)} moved onto the draw pile in one step: which is on top is unknown`);
        else {
          // On top, after this step's draws (Thinking Ahead draws, then puts a card back).
          const [key, n] = [...moved][0]!;
          const name = before.hand.find((card) => card.key === key)?.name ?? now.drawNames.get(key) ?? key;
          movedOnTop = Array.from({ length: n }, () => ({ key, name }));
          (this.record.topped ??= []).push({ turn: now.turn, at: this.record.order.length, cards: movedOnTop.map((card) => card.key) });
        }
      }
    }
    const drawn = matchDrawn(candidates, left);
    // A card taken out of the pile by choice (the step after a to-hand selection): where it was is unknown, the order ends.
    if (drawn.length > 0 && TO_HAND_SELECTION.test(before.selection)) this.breakAt(now.turn, `${drawn.map((card) => card.name).join(", ")} taken from the draw pile by choice (${before.selection})`);
    // A status that came into the hand not off the pile: added and drawn at once (or put straight into the hand).
    const strays = [...minus(byBase(candidates.map((card) => card.key)), byBase(drawn.map((card) => card.key)))].filter(([key]) => ADDED_STATUSES.has(key)).flatMap(([key, n]) => Array.from({ length: n }, () => key));
    if (size(fresh) > 0 || strays.length > 0) {
      (this.record.inserted ??= []).push({ turn: now.turn, at: this.record.order.length, cards: [...fresh].flatMap(([key, n]) => Array.from({ length: n }, () => key)), ...(strays.length > 0 ? { drawn: strays } : {}) });
    }
    if (size(left) > 0) this.breakAt(now.turn, `${listOf(left)} left the draw pile without coming into the hand (played from the top, discarded, exhausted, or past the 10-card hand)`);
    // A card added and drawn in the same step never shows in the pile (not in `left`): when the pile's own cards hold the
    // same card, which of the two came is unknown.
    if (size(fresh) > 0) {
      const unmatched = minus(byBase(candidates.map((card) => card.key)), byBase(drawn.map((card) => card.key)));
      const freshBase = byBase([...fresh].flatMap(([key, n]) => Array.from({ length: n }, () => key)));
      const ownBase = byBase([...own].flatMap(([key, n]) => Array.from({ length: n }, () => key)));
      const doubt = [...unmatched.keys()].find((key) => freshBase.has(key) && ownBase.has(key));
      if (doubt) this.breakAt(now.turn, `drew ${doubt} as cards like it were added to the draw pile: the added one or the pile's own`);
    }
    this.takeOwn(drawn, own, added, now.turn);
    this.topStack.push(...movedOnTop);
  }

  /**
   * SL_RETRY_KNOWN_INSERTS: drawn cards (pile keys, hand order) into the order when they are the pile's own; added ones
   * (`added`: the added cards that were in the pile) skipped. One that may be either ends the clean order.
   */
  private takeOwn(drawn: HandCard[], own: Map<string, number>, added: Map<string, number>, turn: number): void {
    for (const card of drawn) {
      // SL_RETRY_KNOWN_TOP: the cards moved on top come first (an added card may still have landed above them).
      const top = this.topStack.at(-1);
      if (top && baseKey(top.key) === baseKey(card.key)) {
        this.topStack.pop();
        continue;
      }
      if (top && (added.get(card.key) ?? 0) <= 0) {
        this.breakAt(turn, `drew ${card.name} where ${top.name}, moved on top, was next`);
        this.topStack = [];
      }
      const mine = own.get(card.key) ?? 0;
      const theirs = added.get(card.key) ?? 0;
      if (mine > 0 && theirs > 0) this.breakAt(turn, `drew ${card.name}, which may be the one added to the draw pile or the pile's own`);
      if (mine > 0) {
        own.set(card.key, mine - 1);
        this.take([card], turn, this.intact);
      } else if (theirs > 0) added.set(card.key, theirs - 1);
      else this.take([card], turn, this.intact);
    }
  }

  private take(cards: HandCard[], turn: number, clean: boolean): void {
    for (const card of cards) {
      this.record.order.push(card.key);
      this.record.names.push(card.name);
      this.record.turns.push(turn);
    }
    if (clean && this.intact) this.record.clean = this.record.order.length;
  }

  private breakAt(turn: number, why: string): void {
    if (this.record.broke === null) this.record.broke = `T${turn}: ${why}`;
  }
}

/** The order earlier attempts saw, and which attempts it comes from. */
export interface KnownOrder {
  keys: string[];
  names: string[];
  attempts: number[];
  /**
   * SL_RETRY_KNOWN_INSERTS: how many leading `keys` were drawn before any card was added to the pile at a random place in
   * the attempt that saw them: those are known exactly; past them the order rests on the logs' model (added cards leave the
   * rest in order), good for planning, never for the certain-death judge (Dai 2026-10-02). Absent: all exact.
   */
  exact?: number;
}

/** A record's clean prefix drawn before its first added card (all of it without any). */
function exactLength(draws: SlDraws): number {
  const first = draws.inserted?.[0];
  return first ? Math.min(draws.clean, first.at) : draws.clean;
}

/**
 * The draw order the earlier attempts' rows agree on: each attempt's clean part, the longest one where the others
 * agree with it on their overlap. Attempts that disagree keep the draws before the first disagreement, all of them agreeing
 * there, and nothing from it on (with the reason); disagreeing on the first draw, no known order (null). Before 2026-10-02
 * any disagreement dropped the whole order: X7BX5DYHFZ3N F48 lost its 5 agreed draws to one card counted wrongly at draw 6.
 */
export function knownOrderOf(rows: readonly { attempt: number; draws?: SlDraws | null }[]): { known: KnownOrder | null; reason: string | null } {
  let known: KnownOrder | null = null;
  // SL_RETRY_KNOWN_INSERTS: the longest exact prefix of any of them (rows written without the switch have no `inserted`).
  let exact: number | null = null;
  let modelled = false;
  /** The first disagreement: nothing from this draw on is known (Infinity: none), and why. */
  let cap = Infinity;
  let cut: string | null = null;
  for (const row of [...rows].sort((a, b) => a.attempt - b.attempt)) {
    const draws = row.draws;
    if (!draws || !Array.isArray(draws.order) || !(draws.clean > 0)) continue;
    const keys = draws.order.slice(0, Math.min(draws.clean, cap));
    const names = (draws.names ?? []).slice(0, Math.min(draws.clean, cap));
    if (Array.isArray(draws.inserted) && draws.inserted.length > 0) modelled = true;
    exact = Math.max(exact ?? 0, exactLength(draws));
    if (!known) {
      known = { keys, names, attempts: [row.attempt] };
      continue;
    }
    const overlap = Math.min(known.keys.length, keys.length);
    const differ = Array.from({ length: overlap }, (_, i) => i).find((i) => baseKey(known!.keys[i]!) !== baseKey(keys[i]!));
    if (differ !== undefined) {
      cut ??= `attempts ${known.attempts.join(", ")} and ${row.attempt} drew differently at draw ${differ + 1} (${known.keys[differ]} vs ${keys[differ]})`;
      cap = differ;
      known = { keys: known.keys.slice(0, cap), names: known.names.slice(0, cap), attempts: [...known.attempts, row.attempt] };
      continue;
    }
    if (keys.length > known.keys.length) known = { keys, names: names.length === keys.length ? names : [...known.names, ...keys.slice(known.keys.length)], attempts: [...known.attempts, row.attempt] };
    else known = { ...known, attempts: [...known.attempts, row.attempt] };
  }
  if (known && known.keys.length === 0) return { known: null, reason: cut ?? "no earlier attempt recorded its draws" };
  if (known && modelled && exact !== null && exact < known.keys.length) known = { ...known, exact };
  if (!known) return { known: null, reason: "no earlier attempt recorded its draws" };
  return { known, reason: cut ? `${cut}: the ${known.keys.length} draw${known.keys.length === 1 ? "" : "s"} before it kept` : null };
}

export type KnownCheck =
  | {
      ok: true;
      keys: string[];
      names: string[];
      /** SL_RETRY_KNOWN_INSERTS: cards added to the draw pile, at random places among `keys` (absent: none). */
      inserted?: { keys: string[]; names: string[] };
      /**
       * SL_RETRY_KNOWN_INSERTS: how many leading `keys` are known exactly (not resting on the added-cards model: none once a
       * card was added to the pile in this attempt). Absent: all of them.
       */
      exact?: number;
    }
  | { ok: false; reason: string };

/**
 * This attempt against the known order: every card it drew so far is the known one at that place (nothing broke it),
 * and the draw pile now holds the known cards still to come. `keys` are those cards, the next one drawn first (empty
 * once past the known part).
 */
export function checkKnown(known: KnownOrder, tracker: DrawTracker): KnownCheck {
  const drawn = tracker.record;
  if (!tracker.intact) return { ok: false, reason: drawn.broke ?? "the draws broke the order" };
  const pile = tracker.drawPile;
  if (pile === null) return { ok: false, reason: "the state does not list the draw pile" };
  const upto = Math.min(drawn.order.length, known.keys.length);
  for (let i = 0; i < upto; i += 1) {
    if (baseKey(drawn.order[i]!) !== baseKey(known.keys[i]!)) return { ok: false, reason: `T${drawn.turns[i] ?? "?"}: drew ${drawn.names[i] ?? drawn.order[i]} where the earlier attempt drew ${known.names[i] ?? known.keys[i]} (draw ${i + 1})` };
  }
  // SL_RETRY_KNOWN_TOP: the cards moved on top come before the known ones.
  const topped = tracker.topped;
  if (drawn.order.length >= known.keys.length && topped.keys.length === 0) return { ok: true, keys: [], names: [] };
  const ownKeys = known.keys.slice(drawn.order.length);
  const keys = [...topped.keys, ...ownKeys];
  const added = tracker.added;
  // By the card itself (an upgrade on the way to the hand aside).
  const need = new Map<string, number>();
  for (const key of keys) need.set(baseKey(key), (need.get(baseKey(key)) ?? 0) + 1);
  const held = new Map<string, number>();
  for (const [key, n] of pile) held.set(baseKey(key), (held.get(baseKey(key)) ?? 0) + n);
  const missing = minus(need, held);
  if (size(missing) > 0) return { ok: false, reason: `the draw pile does not hold the known next cards (${listOf(missing)} missing)` };
  // Exactly known: none once this attempt saw a card added to its pile; else the cards on top and the earlier attempts'
  // exact part left.
  const exact = tracker.addedToPile ? 0 : topped.keys.length + (known.exact !== undefined ? Math.max(0, Math.min(ownKeys.length, known.exact - drawn.order.length)) : ownKeys.length);
  const names = [...topped.names, ...known.names.slice(drawn.order.length)];
  return { ok: true, keys, names, ...(added.keys.length > 0 ? { inserted: added } : {}), ...(exact < keys.length ? { exact } : {}) };
}

/**
 * The known top cards as indices into a pile's card list (the pile listing's cards, combat-plan pileCardModels' order:
 * the solver's, the rollout's, the random potions' and B2's piles are all built from it), the next one drawn first.
 * Null when the pile does not hold them all (by card id and upgrade, else by card id).
 */
export function knownTopIndices(keys: readonly string[], pile: readonly { cardId: string; upgraded: boolean }[]): number[] | null {
  const used = new Set<number>();
  const out: number[] = [];
  for (const key of keys) {
    // The card as the pile lists it, else the same card under the other upgrade mark.
    let at = pile.findIndex((card, i) => !used.has(i) && cardKey(card.cardId, card.upgraded) === key);
    if (at < 0) at = pile.findIndex((card, i) => !used.has(i) && card.cardId === baseKey(key));
    if (at < 0) return null;
    used.add(at);
    out.push(at);
  }
  return out;
}

/**
 * SL_RETRY_KNOWN_INSERTS: a sample's draw order, the next card first: `order` (the known cards in their order, then the
 * rest of the pile shuffled) with each added card put at a uniformly random place among them, as the game adds them
 * (module comment). Placing them one after another at uniform places gives every interleaving the same chance.
 */
export function withAddedAtRandom<T>(order: readonly T[], added: readonly T[], random: () => number): T[] {
  const out = order.slice();
  for (const card of added) out.splice(Math.floor(random() * (out.length + 1)), 0, card);
  return out;
}
