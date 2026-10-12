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
 * SL_RETRY_KNOWN_INSERTS (Roy 2026-10-02; DrawTracker `inserts`): new cards added to the draw pile (the Insatiable's
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
 *
 * SL_RETRY_KNOWN_PICKS (2026-10-03; DrawTracker `picks`, with `inserts`): a card a selection takes out of the draw pile into
 * the hand (Seeker Strike: 1 of 3 random pile cards) is not a draw; the game takes only that card and the rest of the pile
 * keeps its order (R1QJUBVBSSB2 F33: every one of 6 attempts drew the same 35 cards in the same order around the T2 pick,
 * the known draws ending at 10 each time). So the card goes out of the order (`picked`, not in `order`) and the order goes on.
 * On a retry the earlier attempts' picks and this attempt's are matched by card: a card this attempt took that they did not
 * comes out of the known order (its first place from the pick on); one they took and this attempt has not (yet): the known
 * order past that moment is not exact, and once this attempt drew past it, the card is in the pile at an unknown place
 * (added at random, as SL_RETRY_KNOWN_INSERTS models it). Without the switch a pick ends the order (as before).
 *
 * SL_RETRY_KNOWN_OFF_TOP (2026-10-03, RNTVAT76BPV0 F38; DrawTracker `offTop`, with `inserts`): the potion Distilled Chaos, Havoc and
 * Cascade play the pile's top cards without drawing them; they were its next cards, so they are places of the order (`offTop`)
 * and the rest of it goes on (attempts 1-4 there broke at the potion, 10 known; now 29). Several in one step: their order among
 * themselves is not known (one frame before, one after), a span of `KnownOrder.unordered` until an attempt drew them in order.
 * With Hellraiser on, a Strike it plays as it is drawn leaves the pile among the step's draws (C4F14F3XPN0N F33 T4-T5): the
 * step's draws are one such span (where the Strike was among them is not known), and the order goes on (18 known -> 30).
 *
 * SL_RETRY_KNOWN_HAND_ORDER (2026-10-03; DrawTracker `handOrder`, with `inserts`): a card played from the hand and a copy of it
 * drawn in the same step (Shrug It Off drawing Shrug It Off) shows by the hand's order, not its counts (appendedCards). When the
 * played card was the hand's last, the hand looks the same before and after (RJZGFGNYK56W F33 T8: 耸肩无视, 打击, 打击, 剑柄打击
 * both times, Pommel Strike played and the other Pommel Strike drawn): then by where the played card went (handExits, 2026-10-04).
 */
import type { GameState } from "../hand/mod/schema.js";
import { asArray, asRecord, bool, str } from "../core/util/json.js";

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
  /**
   * SL_RETRY_KNOWN_PICKS: cards taken out of the draw pile into the hand by a selection (Seeker Strike): the turn, how many
   * entries `order` had then, the cards and their names (not in `order`: the rest of the pile kept its order). Absent when
   * none, and always with the switch off.
   */
  picked?: { turn: number; at: number; cards: string[]; names: string[] }[];
  /**
   * SL_RETRY_KNOWN_OFF_TOP: cards that came off the top of the draw pile without coming into the hand (Distilled Chaos,
   * Havoc, Cascade play them): the turn, how many entries `order` had then (`at`), the cards and their names (in `order`
   * from `at` on: they were the pile's next cards), and what played them. More than one card in one step: their order
   * among themselves is not known (`order` lists them as the pile listing does). Absent when none, and always with the
   * switch off.
   */
  offTop?: { turn: number; at: number; cards: string[]; names: string[]; source: string }[];
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
  /** The exhaust pile as a multiset of card keys (empty when the state does not list it). */
  exhaustCards: Map<string, number>;
  /** The draw pile's card names by key (the listing's line), for the added cards' names. */
  drawNames: Map<string, string>;
  /** A card selection screen's prompt (in the fight: Seeker Strike's 「选择一张牌加入你的手牌」), "" otherwise. */
  selection: string;
  /** The potions in the belt, by id (SL_RETRY_KNOWN_OFF_TOP: Distilled Chaos drunk). */
  potions: string[];
  /** Our powers, by id (SL_RETRY_KNOWN_OFF_TOP: Hellraiser on). */
  powers: string[];
  /** Cards played this turn (combat.player.cards_played_this_turn), NaN when the state does not say. */
  played: number;
  /** A card selection screen's kind ("combat_hand_select": cards chosen from the hand, to exhaust or discard), "" otherwise. */
  selectionKind: string;
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
export function pileMultiset(state: GameState, pile: "draw" | "discard" | "exhaust"): Map<string, number> | null {
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
  const potions = asArray(asRecord(state.raw["run"])["potions"]).map((raw) => str(asRecord(raw)["potion_id"])).filter((id) => id !== "");
  const player = asRecord(asRecord(state.raw["combat"])["player"]);
  const powers = asArray(player["powers"]).map((raw) => str(asRecord(raw)["power_id"])).filter((id) => id !== "");
  const played = typeof player["cards_played_this_turn"] === "number" ? player["cards_played_this_turn"] : Number.NaN;
  const selectionKind = state.screen === "CARD_SELECTION" ? str(asRecord(state.raw["selection"])["kind"]) : "";
  return { turn: state.turn, hand, draw, discard: discard === null ? 0 : size(discard), discardCards: discard ?? new Map(), exhaustCards: pileMultiset(state, "exhaust") ?? new Map(), drawNames: pileNames(state, "draw"), selection, potions, powers, played, selectionKind };
}

/**
 * SL_RETRY_KNOWN_OFF_TOP: Hellraiser (地狱狂徒, 「每当你抽到名字中有“打击”的牌时，对一名随机敌人打出这张牌」) plays a card it draws at once:
 * a card whose name (or id) says Strike that left the pile while it is on.
 */
function strikeNamed(key: string, names: Map<string, string>): boolean {
  return (names.get(key) ?? "").includes("打击") || /STRIKE/.test(baseKey(key));
}

/**
 * SL_RETRY_KNOWN_OFF_TOP: what plays cards off the top of the draw pile (game data): the potion Distilled Chaos (精炼混沌,
 * 「打出你抽牌堆顶部的{Repeat}张牌」), Havoc (破灭, 「打出抽牌堆顶部的牌并将其消耗」: one card) and Cascade (倾泻, 「打出你抽牌堆顶部的X张牌」).
 * Not here: Mayhem (乱战, at the turn's start: before or after the turn's draw is not known), I Am Invincible (on top at
 * the turn's end), Catastrophe and Uproar (random cards of the pile, not the top).
 */
const OFF_TOP_POTIONS: ReadonlyMap<string, string> = new Map([["DISTILLED_CHAOS", "Distilled Chaos"]]);
const OFF_TOP_CARDS: ReadonlyMap<string, { name: string; one: boolean }> = new Map([
  ["HAVOC", { name: "Havoc", one: true }],
  ["CASCADE", { name: "Cascade", one: false }],
]);
/** Cards that play random cards of the draw pile (not its top): a step with one of them is never read as off the top. */
const RANDOM_PILE_PLAYERS = new Set(["CATASTROPHE", "UPROAR"]);

/**
 * SL_RETRY_KNOWN_OFF_TOP: the one thing in this step that plays cards off the top of the pile, or null (none, or more than
 * one, or a card playing random pile cards too): a potion of OFF_TOP_POTIONS gone from the belt, a card of OFF_TOP_CARDS gone
 * from the hand. `one`: it plays a single card (Havoc).
 */
function offTopSource(before: Snapshot, now: Snapshot): { name: string; one: boolean } | null {
  const sources: { name: string; one: boolean }[] = [];
  const belt = countOf(now.potions.map((key) => ({ key, name: key })));
  for (const [id, n] of countOf(before.potions.map((key) => ({ key, name: key })))) {
    const name = OFF_TOP_POTIONS.get(id);
    if (name && n > (belt.get(id) ?? 0)) sources.push({ name, one: false });
  }
  const left = minus(byBase(before.hand.map((card) => card.key)), byBase(now.hand.map((card) => card.key)));
  if ([...left.keys()].some((id) => RANDOM_PILE_PLAYERS.has(id))) return null;
  for (const id of left.keys()) {
    const card = OFF_TOP_CARDS.get(id);
    if (card) sources.push(card);
  }
  return sources.length === 1 ? sources[0]! : null;
}

/**
 * SL_RETRY_KNOWN_HAND_ORDER: the hand's cards that left it in this step for the discard or the exhaust pile, when nothing in
 * the step can have put a draw-pile card there: a card was played from the hand (cards played this turn went up) or a hand
 * selection took cards (Burning Pact's exhaust, a replace), no potion was drunk, nothing that plays pile cards was played
 * (Havoc, Cascade, Catastrophe, Uproar; Hellraiser off), no card went onto the pile, and the hand is under 10 (a draw past it
 * goes to the discard pile). Null when any of that fails or none left. A card played from the hand's end whose copy it drew
 * leaves the hand looking the same (RJZGFGNYK56W F33 T8, the logs' 31 such steps: Pommel Strike, Shrug It Off, Slimed …):
 * without the hand less these, neither its counts nor its order show the drawn copy.
 */
function handExits(before: Snapshot, now: Snapshot): Map<string, number> | null {
  if (now.turn !== before.turn || now.hand.length >= 10) return null;
  if (size(minus(now.draw, before.draw)) > 0) return null;
  if (TO_HAND_SELECTION.test(before.selection)) return null;
  const playedOne = now.played > before.played;
  if (!playedOne && before.selectionKind !== "combat_hand_select") return null;
  if (size(minus(countOf(before.potions.map((key) => ({ key, name: key }))), countOf(now.potions.map((key) => ({ key, name: key }))))) > 0) return null;
  if (before.powers.includes("HELLRAISER_POWER") || now.powers.includes("HELLRAISER_POWER")) return null;
  const leftHand = minus(byBase(before.hand.map((card) => card.key)), byBase(now.hand.map((card) => card.key)));
  if ([...leftHand.keys()].some((id) => OFF_TOP_CARDS.has(id) || RANDOM_PILE_PLAYERS.has(id))) return null;
  const gained = minus(now.discardCards, before.discardCards);
  for (const [key, n] of minus(now.exhaustCards, before.exhaustCards)) gained.set(key, (gained.get(key) ?? 0) + n);
  const held = countOf(before.hand);
  const out = new Map<string, number>();
  for (const [key, n] of gained) {
    const m = Math.min(n, held.get(key) ?? 0);
    if (m > 0) out.set(key, m);
  }
  return out.size > 0 ? out : null;
}

/**
 * SL_RETRY_KNOWN_HAND_ORDER: within a turn, the cards added to the hand's end: the hand past its longest start that is a
 * subsequence of the last hand (the cards kept keep their order, the drawn and made ones come last). A card played and a
 * copy of it drawn in the same step (P68P7CDJRDH3 F25 T1: Shrug It Off from 防御, 挑衅, 耸肩无视, 打击 drew Shrug It Off, the
 * hand 防御, 打击, 耸肩无视) is new here, where counting the hand's cards sees none.
 */
function appendedCards(before: readonly HandCard[], now: readonly HandCard[]): HandCard[] {
  let j = 0;
  let k = 0;
  for (; k < now.length; k += 1) {
    while (j < before.length && before[j]!.key !== now[k]!.key) j += 1;
    if (j >= before.length) break;
    j += 1;
  }
  return now.slice(k);
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
  /** SL_RETRY_KNOWN_PICKS (with `inserts`): a card a selection takes out of the pile (Seeker Strike) leaves the order going on (default: it ends it). */
  picks?: boolean;
  /**
   * SL_RETRY_KNOWN_OFF_TOP (with `inserts`): cards played off the top of the pile (Distilled Chaos, Havoc, Cascade) are the
   * pile's next cards, in `order` (`offTop`), and the order goes on; with Hellraiser on, a step's draws with a Strike it played
   * at once are a span of unknown order (default: it ends there).
   */
  offTop?: boolean;
  /**
   * SL_RETRY_KNOWN_HAND_ORDER (with `inserts`): within a turn, a card drawn while a copy of it was played from the hand in the
   * same step is read by the hand's order (appendedCards), not taken for one that left the pile without coming into the hand;
   * when the hand looks the same (the played card was its last), by the hand less the cards it lost to the discard or exhaust
   * pile (handExits).
   */
  handOrder?: boolean;
  /**
   * With `handOrder` (default on; false only for the offline comparison, tools/sl-draws-replay.ts): the hand less the cards it
   * lost to the discard or exhaust pile in the step (handExits), when its order shows nothing (the played card was its last).
   */
  handExits?: boolean;
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

  private readonly picks: boolean;
  private readonly offTop: boolean;
  private readonly handOrder: boolean;
  private readonly handExits: boolean;

  constructor(options: DrawTrackerOptions = {}) {
    this.inserts = options.inserts === true;
    this.tops = this.inserts && options.tops === true;
    this.picks = this.inserts && options.picks === true;
    this.offTop = this.inserts && options.offTop === true;
    this.handOrder = this.inserts && options.handOrder === true;
    this.handExits = this.handOrder && options.handExits !== false;
  }

  /** SL_RETRY_KNOWN_TOP: the cards moved onto the pile still on it, the next one drawn first; empty without the switch. */
  get topped(): { keys: string[]; names: string[] } {
    const stack = [...this.topStack].reverse();
    return { keys: stack.map((card) => card.key), names: stack.map((card) => card.name) };
  }

  /**
   * Whether a card was added to the draw pile in this attempt (SL_RETRY_KNOWN_INSERTS: an `inserted` event; without it: the
   * order broke on a card put into the pile): then its draws hold chance (Roy 2026-10-02: no early reload).
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
    let left = minus(before.draw, now.draw);
    const grew = minus(now.draw, before.draw);
    let candidates = now.turn !== before.turn ? now.hand : newCards(before.hand, now.hand);
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
    let drawn = matchDrawn(candidates, left);
    // SL_RETRY_KNOWN_HAND_ORDER: within a turn, a card left the pile and no new card by count came into the hand: a copy of a
    // card played in this step was drawn (the hand's order shows it, appendedCards). Taken when it accounts for more of
    // the cards that left the pile.
    if (this.handOrder && size(left) > 0 && now.turn === before.turn) {
      const rest = minus(before.draw, now.draw);
      const ordered = appendedCards(before.hand, now.hand);
      const again = matchDrawn(ordered, rest);
      if (size(rest) < size(left)) {
        candidates = ordered;
        drawn = again;
        left = rest;
      }
      // Still some unaccounted for: the hand less the cards that went to the discard or exhaust pile from it (handExits), and
      // what it holds past that is new (a card played from the hand's end drew its copy: the hand looks the same).
      const exits = this.handExits && size(left) > 0 ? handExits(before, now) : null;
      if (exits) {
        const kept = [...before.hand];
        for (const [key, n] of exits) {
          for (let k = 0; k < n; k += 1) {
            const at = kept.map((card) => card.key).lastIndexOf(key);
            if (at >= 0) kept.splice(at, 1);
          }
        }
        const came = newCards(kept, now.hand);
        const unread = minus(before.draw, now.draw);
        const read = matchDrawn(came, unread);
        if (size(unread) < size(left)) {
          candidates = came;
          drawn = read;
          left = unread;
        }
      }
    }
    // A card taken out of the pile by choice (the step after a to-hand selection): not a draw. SL_RETRY_KNOWN_PICKS: out of
    // the pile, the rest in its order; without it, where it was is unknown and the order ends.
    const picked = drawn.length > 0 && TO_HAND_SELECTION.test(before.selection);
    if (picked && !this.picks) this.breakAt(now.turn, `${drawn.map((card) => card.name).join(", ")} taken from the draw pile by choice (${before.selection})`);
    // A status that came into the hand not off the pile: added and drawn at once (or put straight into the hand).
    const strays = [...minus(byBase(candidates.map((card) => card.key)), byBase(drawn.map((card) => card.key)))].filter(([key]) => ADDED_STATUSES.has(key)).flatMap(([key, n]) => Array.from({ length: n }, () => key));
    if (size(fresh) > 0 || strays.length > 0) {
      (this.record.inserted ??= []).push({ turn: now.turn, at: this.record.order.length, cards: [...fresh].flatMap(([key, n]) => Array.from({ length: n }, () => key)), ...(strays.length > 0 ? { drawn: strays } : {}) });
    }
    // SL_RETRY_KNOWN_OFF_TOP: the cards left the pile's top, played by the one thing in this step that does that
    // (offTopSource), nothing else coming in or out by choice: they were its next cards, before this step's draws (a card
    // played off the top draws after it). Several at once with draws among them: which drew is not known, so not here.
    let offTop: { cards: Map<string, number>; source: string } | null = null;
    if (this.offTop && size(left) > 0 && size(grew) === 0 && !picked && !TO_HAND_SELECTION.test(before.selection)) {
      const source = offTopSource(before, now);
      if (source && (drawn.length === 0 || (source.one && size(left) === 1)) && (!source.one || size(left) === 1)) offTop = { cards: left, source: source.name };
    }
    // SL_RETRY_KNOWN_OFF_TOP: with Hellraiser on, the Strikes that left the pile were drawn and played at once (C4F14F3XPN0N F33
    // T4, every attempt): this step's draws, where among them they were not known, so all of them one span of unknown order.
    let drawnAndPlayed: Map<string, number> | null = null;
    if (this.offTop && !offTop && size(left) > 0 && size(grew) === 0 && !picked && (before.powers.includes("HELLRAISER_POWER") || now.powers.includes("HELLRAISER_POWER")) && [...left.keys()].every((key) => strikeNamed(key, before.drawNames))) {
      drawnAndPlayed = new Map(left);
      for (const card of drawn) drawnAndPlayed.set(card.key, (drawnAndPlayed.get(card.key) ?? 0) + 1);
    }
    if (size(left) > 0 && !offTop && !drawnAndPlayed) this.breakAt(now.turn, `${listOf(left)} left the draw pile without coming into the hand (played from the top, discarded, exhausted, or past the 10-card hand)`);
    // A card added and drawn in the same step never shows in the pile (not in `left`): when the pile's own cards hold the
    // same card, which of the two came is unknown.
    if (size(fresh) > 0) {
      const unmatched = minus(byBase(candidates.map((card) => card.key)), byBase(drawn.map((card) => card.key)));
      const freshBase = byBase([...fresh].flatMap(([key, n]) => Array.from({ length: n }, () => key)));
      const ownBase = byBase([...own].flatMap(([key, n]) => Array.from({ length: n }, () => key)));
      const doubt = [...unmatched.keys()].find((key) => freshBase.has(key) && ownBase.has(key));
      if (doubt) this.breakAt(now.turn, `drew ${doubt} as cards like it were added to the draw pile: the added one or the pile's own`);
    }
    if (picked && this.picks) this.takePicked(drawn, own, added, now.turn);
    else if (drawnAndPlayed) this.takeOffTop(before, drawnAndPlayed, own, added, now.turn, "Hellraiser");
    else {
      if (offTop) this.takeOffTop(before, offTop.cards, own, added, now.turn, offTop.source);
      this.takeOwn(drawn, own, added, now.turn);
    }
    this.topStack.push(...movedOnTop);
  }

  /**
   * SL_RETRY_KNOWN_OFF_TOP: cards played off the top of the pile (`cards`, as the pile listed them): the cards moved on top
   * first (SL_RETRY_KNOWN_TOP), then the pile's own, into the order (`offTop` says which entries and what played them; two
   * or more at once: their order among themselves is not known), an added one skipped (SL_RETRY_KNOWN_INSERTS). One that may
   * be either an added copy or the pile's own, or one not among the cards moved on top while some still are, ends the order.
   */
  private takeOffTop(before: Snapshot, cards: Map<string, number>, own: Map<string, number>, added: Map<string, number>, turn: number, source: string): void {
    const rest: HandCard[] = [...cards].flatMap(([key, n]) => Array.from({ length: n }, () => ({ key, name: before.drawNames.get(key) ?? key })));
    while (this.topStack.length > 0 && rest.length > 0) {
      const top = this.topStack.at(-1)!;
      const at = rest.findIndex((card) => baseKey(card.key) === baseKey(top.key));
      if (at < 0) {
        this.breakAt(turn, `${rest.map((card) => card.name).join(", ")} played off the top of the draw pile (${source}) where ${top.name}, moved on top, was`);
        this.topStack = [];
        break;
      }
      this.topStack.pop();
      rest.splice(at, 1);
    }
    const mine: HandCard[] = [];
    for (const card of rest) {
      const m = own.get(card.key) ?? 0;
      const t = added.get(card.key) ?? 0;
      if (m > 0 && t > 0) this.breakAt(turn, `${card.name} played off the top of the draw pile (${source}), which may be the one added to it or the pile's own`);
      if (m > 0) {
        own.set(card.key, m - 1);
        mine.push(card);
      } else if (t > 0) added.set(card.key, t - 1);
      else mine.push(card);
    }
    if (mine.length === 0) return;
    (this.record.offTop ??= []).push({ turn, at: this.record.order.length, cards: mine.map((card) => card.key), names: mine.map((card) => card.name), source });
    this.take(mine, turn, this.intact);
  }

  /**
   * SL_RETRY_KNOWN_PICKS: cards a selection took out of the pile into the hand: out of the pile's own cards (or off the top
   * stack, or an added one), recorded apart (`picked`), the order going on. One that may be either an added copy or the
   * pile's own ends the clean order (which of them is left in the pile is unknown).
   */
  private takePicked(cards: HandCard[], own: Map<string, number>, added: Map<string, number>, turn: number): void {
    for (const card of cards) {
      const onTop = this.topStack.findIndex((top) => baseKey(top.key) === baseKey(card.key));
      if (onTop >= 0) {
        this.topStack.splice(onTop, 1);
        continue;
      }
      const mine = own.get(card.key) ?? 0;
      const theirs = added.get(card.key) ?? 0;
      if (mine > 0 && theirs > 0) this.breakAt(turn, `picked ${card.name}, which may be the one added to the draw pile or the pile's own`);
      if (mine > 0) own.set(card.key, mine - 1);
      else if (theirs > 0) added.set(card.key, theirs - 1);
    }
    (this.record.picked ??= []).push({ turn, at: this.record.order.length, cards: cards.map((card) => card.key), names: cards.map((card) => card.name) });
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
   * rest in order), good for planning, never for the certain-death judge (Roy 2026-10-02). Absent: all exact.
   */
  exact?: number;
  /**
   * SL_RETRY_KNOWN_PICKS: the cards the attempt the order comes from took out of the pile by a selection, and how many of
   * `keys` were drawn before each (not in `keys`). Absent: none.
   */
  picked?: { at: number; keys: string[]; names: string[] }[];
  /**
   * SL_RETRY_KNOWN_OFF_TOP: places in `keys` that hold the cards listed there, in an order not known (several cards played
   * off the top of the pile in one step, in every attempt the order comes from): `at` the first, `n` how many. checkKnown
   * gives the next cards only up to the first of them. Absent: every place known.
   */
  unordered?: { at: number; n: number }[];
}

/** A pile's cards by place, and the places whose order among themselves is not known (SL_RETRY_KNOWN_OFF_TOP). */
interface PileSeq {
  keys: readonly string[];
  unordered: readonly { at: number; n: number }[];
}

/** SL_RETRY_KNOWN_OFF_TOP: a record's places of unknown order within its first `length` entries (its steps off the top of more than one card). */
function unorderedOf(draws: Pick<SlDraws, "offTop">, length: number): { at: number; n: number }[] {
  return (draws.offTop ?? []).filter((step) => step.cards.length > 1 && step.at + step.cards.length <= length).map((step) => ({ at: step.at, n: step.cards.length }));
}

/** a's keys by the card itself (the upgrade mark dropped), as a multiset. */
function baseCounts(keys: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const key of keys) out.set(baseKey(key), (out.get(baseKey(key)) ?? 0) + 1);
  return out;
}

/**
 * The first place where two pile sequences disagree within their common length (null: none), and its end: a place both know
 * by the card; places of unknown order (either side's, joined while they overlap) by the multiset of the span, a span past
 * the shorter sequence's end by the shorter's part fitting into the longer's. The span starts are where a cut can go.
 */
function disagreement(a: PileSeq, b: PileSeq): { at: number; end: number } | null {
  const upto = Math.min(a.keys.length, b.keys.length);
  const ranges = [...a.unordered, ...b.unordered];
  let p = 0;
  while (p < upto) {
    const covering = ranges.filter((range) => range.at <= p && p < range.at + range.n);
    if (covering.length === 0) {
      if (baseKey(a.keys[p]!) !== baseKey(b.keys[p]!)) return { at: p, end: p + 1 };
      p += 1;
      continue;
    }
    let end = Math.max(...covering.map((range) => range.at + range.n));
    for (let grown = true; grown; ) {
      grown = false;
      for (const range of ranges) {
        if (range.at < end && range.at + range.n > end) {
          end = range.at + range.n;
          grown = true;
        }
      }
    }
    if (end <= upto) {
      const left = baseCounts(a.keys.slice(p, end));
      const right = baseCounts(b.keys.slice(p, end));
      if (size(minus(left, right)) > 0 || size(minus(right, left)) > 0) return { at: p, end };
    } else {
      const [short, long] = a.keys.length <= b.keys.length ? [a, b] : [b, a];
      if (size(minus(baseCounts(short.keys.slice(p, upto)), baseCounts(long.keys.slice(p, end)))) > 0) return { at: p, end };
    }
    p = end;
  }
  return null;
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
  /** SL_RETRY_KNOWN_OFF_TOP: the known keys' places of unknown order (none in rows written without the switch). */
  let unordered: { at: number; n: number }[] = [];
  for (const row of [...rows].sort((a, b) => a.attempt - b.attempt)) {
    const draws = row.draws;
    if (!draws || !Array.isArray(draws.order) || !(draws.clean > 0)) continue;
    // A cut inside a step off the top of several cards goes back to its start (its places hold them in an unknown order).
    let length = Math.min(draws.clean, cap);
    for (const step of draws.offTop ?? []) if (step.cards.length > 1 && step.at < length && length < step.at + step.cards.length) length = step.at;
    const keys = draws.order.slice(0, length);
    const names = (draws.names ?? []).slice(0, length);
    const mine = unorderedOf(draws, keys.length);
    if (Array.isArray(draws.inserted) && draws.inserted.length > 0) modelled = true;
    exact = Math.max(exact ?? 0, exactLength(draws));
    // SL_RETRY_KNOWN_PICKS: the picks within the kept part (none in rows written without the switch).
    const picksOf = (length: number) => (draws.picked ?? []).filter((pick) => pick.at < length).map((pick) => ({ at: pick.at, keys: [...pick.cards], names: [...(pick.names ?? pick.cards)] }));
    if (!known) {
      const picked = picksOf(keys.length);
      known = { keys, names, attempts: [row.attempt], ...(picked.length > 0 ? { picked } : {}) };
      unordered = mine;
      continue;
    }
    const differ = disagreement({ keys: known.keys, unordered }, { keys, unordered: mine });
    if (differ !== null) {
      const at = differ.at;
      const what = differ.end - at > 1 ? `draws ${at + 1}-${differ.end} (in an order not known: ${known.keys.slice(at, differ.end).join(", ")} vs ${keys.slice(at, differ.end).join(", ")})` : `draw ${at + 1} (${known.keys[at]} vs ${keys[at]})`;
      cut ??= `attempts ${known.attempts.join(", ")} and ${row.attempt} drew differently at ${what}`;
      cap = at;
      const before: KnownOrder = known;
      const kept = (before.picked ?? []).filter((pick) => pick.at < cap);
      known = { keys: before.keys.slice(0, cap), names: before.names.slice(0, cap), attempts: [...before.attempts, row.attempt], ...(kept.length > 0 ? { picked: kept } : {}) };
      unordered = unordered.filter((range) => range.at + range.n <= cap);
      continue;
    }
    // SL_RETRY_KNOWN_OFF_TOP: the longer one, its places of unknown order taken from the other where it knows each of them.
    const longer: boolean = keys.length > known.keys.length;
    const base: { keys: string[]; names: string[]; unordered: { at: number; n: number }[] } = longer ? { keys: [...keys], names: names.length === keys.length ? [...names] : [...known.names, ...keys.slice(known.keys.length)], unordered: mine } : { keys: [...known.keys], names: [...known.names], unordered };
    const other: PileSeq & { names: readonly string[] } = longer ? { keys: known.keys, names: known.names, unordered } : { keys, names, unordered: mine };
    const resolved = base.unordered.filter((range: { at: number; n: number }) => range.at + range.n <= other.keys.length && !other.unordered.some((o) => o.at < range.at + range.n && range.at < o.at + o.n));
    for (const range of resolved) {
      for (let i = range.at; i < range.at + range.n; i += 1) {
        base.keys[i] = other.keys[i]!;
        base.names[i] = other.names[i] ?? other.keys[i]!;
      }
    }
    unordered = base.unordered.filter((range) => !resolved.includes(range));
    if (longer) {
      const picked = picksOf(keys.length);
      known = { keys: base.keys, names: base.names, attempts: [...known.attempts, row.attempt], ...(picked.length > 0 ? { picked } : {}) };
    } else known = { ...known, keys: base.keys, names: base.names, attempts: [...known.attempts, row.attempt] };
  }
  // SL_RETRY_KNOWN_OFF_TOP with SL_RETRY_KNOWN_PICKS' picks: the picks move the places (withPicks), so the order ends at its
  // first place of unknown order.
  if (known && unordered.length > 0 && known.picked !== undefined) {
    const at = Math.min(...unordered.map((range) => range.at));
    const kept = known.picked.filter((pick) => pick.at < at);
    const { picked: _picked, ...rest } = known;
    known = { ...rest, keys: known.keys.slice(0, at), names: known.names.slice(0, at), ...(kept.length > 0 ? { picked: kept } : {}) };
    unordered = [];
  }
  if (known && unordered.length > 0) known = { ...known, unordered: [...unordered].sort((a, b) => a.at - b.at) };
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
  const record = tracker.record;
  if (!tracker.intact) return { ok: false, reason: record.broke ?? "the draws broke the order" };
  const pile = tracker.drawPile;
  if (pile === null) return { ok: false, reason: "the state does not list the draw pile" };
  // SL_RETRY_KNOWN_OFF_TOP: the places whose order is not known, this attempt's (its steps off the top of several cards) and
  // the known order's. A pick moves the places (withPicks): with both, the order is not followed.
  const mine = unorderedOf(record, record.order.length);
  const theirs = known.unordered ?? [];
  if ((mine.length > 0 || theirs.length > 0) && (record.picked !== undefined || known.picked !== undefined)) return { ok: false, reason: "cards played off the top of the draw pile in one step and a card taken from it by choice: their places are not followed" };
  // SL_RETRY_KNOWN_PICKS: the known order and this attempt's draws with the selections' picks accounted for (as they were
  // without any pick on either side).
  const picks = record.picked !== undefined || known.picked !== undefined ? withPicks(known, record) : null;
  const knownKeys = picks?.keys ?? known.keys;
  const knownNames = picks?.names ?? known.names;
  const drawn = picks ? { ...record, order: picks.order, names: picks.orderNames, turns: picks.turns } : record;
  const differ = disagreement({ keys: drawn.order, unordered: mine }, { keys: knownKeys, unordered: theirs });
  if (differ !== null) {
    const i = differ.at;
    if (differ.end - i === 1) return { ok: false, reason: `T${drawn.turns[i] ?? "?"}: drew ${drawn.names[i] ?? drawn.order[i]} where the earlier attempt drew ${knownNames[i] ?? knownKeys[i]} (draw ${i + 1})` };
    const end = Math.min(differ.end, drawn.order.length);
    return { ok: false, reason: `T${drawn.turns[i] ?? "?"}: draws ${i + 1}-${end} came off the pile as ${drawn.names.slice(i, end).join(", ")} where the earlier attempt had ${knownNames.slice(i, Math.min(differ.end, knownNames.length)).join(", ")} (in an order not known)` };
  }
  // SL_RETRY_KNOWN_TOP: the cards moved on top come before the known ones.
  const topped = tracker.topped;
  if (drawn.order.length >= knownKeys.length && topped.keys.length === 0 && (picks?.inPile.length ?? 0) === 0) return { ok: true, keys: [], names: [] };
  // SL_RETRY_KNOWN_OFF_TOP: the known cards from here up to the next place of unknown order (none while in one).
  const from = drawn.order.length;
  const stop = theirs.some((range) => range.at <= from && from < range.at + range.n) ? from : Math.min(knownKeys.length, ...theirs.filter((range) => range.at >= from).map((range) => range.at));
  const ownKeys = knownKeys.slice(from, Math.max(from, stop));
  const keys = [...topped.keys, ...ownKeys];
  // A card an earlier attempt picked that this one has not, past that moment: in the pile at an unknown place.
  const added = picks && picks.inPile.length > 0 ? { keys: [...tracker.added.keys, ...picks.inPile.map((card) => card.key)], names: [...tracker.added.names, ...picks.inPile.map((card) => card.name)] } : tracker.added;
  // By the card itself (an upgrade on the way to the hand aside).
  const need = new Map<string, number>();
  for (const key of keys) need.set(baseKey(key), (need.get(baseKey(key)) ?? 0) + 1);
  const held = new Map<string, number>();
  for (const [key, n] of pile) held.set(baseKey(key), (held.get(baseKey(key)) ?? 0) + n);
  const missing = minus(need, held);
  if (size(missing) > 0) return { ok: false, reason: `the draw pile does not hold the known next cards (${listOf(missing)} missing)` };
  // Exactly known: none once this attempt saw a card added to its pile; else the cards on top and the earlier attempts'
  // exact part left (SL_RETRY_KNOWN_PICKS: up to an earlier attempt's pick this one has not made yet; none past one it did
  // not make).
  const ownExact = known.exact !== undefined ? Math.max(0, Math.min(ownKeys.length, known.exact - drawn.order.length)) : ownKeys.length;
  const exact = tracker.addedToPile || (picks?.inPile.length ?? 0) > 0 ? 0 : topped.keys.length + Math.min(ownExact, picks?.exactAhead ?? Infinity);
  const names = [...topped.names, ...knownNames.slice(from, from + ownKeys.length)];
  return { ok: true, keys, names, ...(added.keys.length > 0 ? { inserted: added } : {}), ...(exact < keys.length ? { exact } : {}) };
}

/**
 * SL_RETRY_KNOWN_PICKS: the known order and this attempt's draws with the selections' picks accounted for. The picks on both
 * sides are matched by card. A card this attempt took that the earlier ones did not comes out of the known order (its first
 * place from the pick on: the rest of the pile kept its order). One the earlier attempt took that this one has not: before
 * that moment the order is exact only up to it (`exactAhead`: of the keys still to come); past it the card is in this
 * attempt's pile at an unknown place (`inPile`, modelled as added at random), and if this attempt drew it, that draw is
 * skipped against the known order.
 */
function withPicks(known: KnownOrder, record: SlDraws): { keys: string[]; names: string[]; order: string[]; orderNames: string[]; turns: number[]; inPile: { key: string; name: string }[]; exactAhead: number } {
  const theirs = (known.picked ?? []).flatMap((pick) => pick.keys.map((key, i) => ({ at: pick.at, key, name: pick.names[i] ?? key })));
  const mine = (record.picked ?? []).flatMap((pick) => pick.cards.map((key, i) => ({ at: pick.at, key, name: pick.names[i] ?? key })));
  const unmatchedTheirs: typeof theirs = [];
  for (const pick of theirs) {
    const i = mine.findIndex((other) => baseKey(other.key) === baseKey(pick.key));
    if (i >= 0) mine.splice(i, 1);
    else unmatchedTheirs.push(pick);
  }
  const keys = [...known.keys];
  const names = [...known.names];
  for (const pick of [...mine].sort((a, b) => a.at - b.at)) {
    const j = keys.findIndex((key, index) => index >= pick.at && baseKey(key) === baseKey(pick.key));
    if (j >= 0) {
      keys.splice(j, 1);
      names.splice(j, 1);
    }
  }
  const order = [...record.order];
  const orderNames = [...record.names];
  const turns = [...record.turns];
  const inPile: { key: string; name: string }[] = [];
  let exactAhead = Infinity;
  for (const pick of unmatchedTheirs) {
    if (record.order.length <= pick.at) {
      exactAhead = Math.min(exactAhead, pick.at - record.order.length);
      continue;
    }
    const j = order.findIndex((key, index) => index >= pick.at && baseKey(key) === baseKey(pick.key));
    if (j >= 0) {
      order.splice(j, 1);
      orderNames.splice(j, 1);
      turns.splice(j, 1);
    } else inPile.push({ key: pick.key, name: pick.name });
  }
  return { keys, names, order, orderNames, turns, inPile, exactAhead };
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
