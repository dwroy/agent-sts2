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
}

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
}

/** "打击+*3 [1费]：…": the count after "*", 1 without one. */
function lineCount(line: string): number {
  return Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(line)?.[1] ?? 1);
}

/** The upgrade mark "+" right after the name (before any "*N" and the cost), as combat-plan pileCardModels reads it. */
function lineUpgraded(line: string): boolean {
  return /^[^[*：:]*?\+\s*(?:\*\d+\s*)?\[/.test(line);
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
  return { turn: state.turn, hand, draw, discard: discard === null ? 0 : size(discard) };
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

/** One attempt's draws, from every state the loop reads during it (DrawTracker.observe). */
export class DrawTracker {
  private prev: Snapshot | null = null;
  readonly record: SlDraws = { order: [], names: [], turns: [], clean: 0, broke: null };

  /** Whether the draws so far are all the fight's starting pile order (nothing broke it). */
  get intact(): boolean {
    return this.record.broke === null;
  }

  /** The draw pile now (the last state with the piles listed), or null. */
  get drawPile(): Map<string, number> | null {
    return this.prev?.draw ?? null;
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
      this.take(now.hand, now.turn, this.intact);
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
}

/**
 * The draw order the earlier attempts' rows agree on: each attempt's clean part, the longest one where the others
 * agree with it on their overlap. Attempts that disagree (the order was not the same: something in the fight is not
 * what the logs showed) leave no known order at all: null, with the reason.
 */
export function knownOrderOf(rows: readonly { attempt: number; draws?: SlDraws | null }[]): { known: KnownOrder | null; reason: string | null } {
  let known: KnownOrder | null = null;
  for (const row of [...rows].sort((a, b) => a.attempt - b.attempt)) {
    const draws = row.draws;
    if (!draws || !Array.isArray(draws.order) || !(draws.clean > 0)) continue;
    const keys = draws.order.slice(0, draws.clean);
    const names = (draws.names ?? []).slice(0, draws.clean);
    if (!known) {
      known = { keys, names, attempts: [row.attempt] };
      continue;
    }
    const overlap = Math.min(known.keys.length, keys.length);
    for (let i = 0; i < overlap; i += 1) {
      if (baseKey(known.keys[i]!) !== baseKey(keys[i]!)) return { known: null, reason: `attempts ${known.attempts.join(", ")} and ${row.attempt} drew differently at draw ${i + 1} (${known.keys[i]} vs ${keys[i]})` };
    }
    if (keys.length > known.keys.length) known = { keys, names: names.length === keys.length ? names : [...known.names, ...keys.slice(known.keys.length)], attempts: [...known.attempts, row.attempt] };
    else known = { ...known, attempts: [...known.attempts, row.attempt] };
  }
  return { known, reason: known ? null : "no earlier attempt recorded its draws" };
}

export type KnownCheck = { ok: true; keys: string[]; names: string[] } | { ok: false; reason: string };

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
  if (drawn.order.length >= known.keys.length) return { ok: true, keys: [], names: [] };
  const keys = known.keys.slice(drawn.order.length);
  // By the card itself (an upgrade on the way to the hand aside).
  const need = new Map<string, number>();
  for (const key of keys) need.set(baseKey(key), (need.get(baseKey(key)) ?? 0) + 1);
  const held = new Map<string, number>();
  for (const [key, n] of pile) held.set(baseKey(key), (held.get(baseKey(key)) ?? 0) + n);
  const missing = minus(need, held);
  if (size(missing) > 0) return { ok: false, reason: `the draw pile does not hold the known next cards (${listOf(missing)} missing)` };
  return { ok: true, keys, names: known.names.slice(drawn.order.length) };
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
