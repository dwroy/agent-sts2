/**
 * Thieves (THIEF_FACTS, docs/thief.md; Dai 2026-10-02: step 1, facts and option coverage, no cost in the ranking).
 *
 * Two hallway fights steal from the run, and what they take comes back only if the thief dies before it leaves:
 *  - Thieving Hopper (偷窃草蜢, always alone in the 98 A8+ fights to 2026-10-02): THIEVERY_MOVE on T1 hits and takes one card out of
 *    the run deck (the deck is one card short from the T1 enemy turn; SWIPE_POWER 1 「击杀这名敌人时，会取回被偷走的
 *    卡牌」 shows from then). Its moves are fixed: Thievery, Flutter (FLUTTER_POWER 5), Hat Trick 21, Nab 14, Escape.
 *    ESCAPE_ARTIST_POWER is the game's own countdown: 5 on T1, 4, 3, 2, 1 with ESCAPE_MOVE (intent Escape) on T5 in
 *    every logged fight; the Escape resolves on that enemy turn and the fight ends at once (REWARD next frame, no
 *    SpecialCard, the card gone for the run: RPC6X61N9FQ0 F20, 岩石铠甲 lost; 7 of 98 fights). Killed, it leaves the
 *    reward 「取回你被偷走的牌。」 (SpecialCard; 90 of 98, NZWRZWY0URJJ F19 killed on T1 before the theft).
 *    Flutter loses a stack per attack hit; at 0 the Hopper is stunned (move STUNNED, 45 frames in 29 fights) and that
 *    turn's move is cancelled: T4's Nab of 14 dealt nothing (MCK9SMSK40ZY F19 T4, Q97BWZJ011BB F19 T4: 0 block, 0 HP
 *    lost), a T4 stun leaves the countdown going (Escape on T5 as usual: SCBC3F0QT8BC, P57H9Z324EEW), and a stun on
 *    the Escape turn cancels the Escape: ESCAPE_ARTIST_POWER stays 1 and it leaves at the end of T6 (6HRZZ5BP01U0,
 *    9V09G0TKK5EQ, FN0HCB4DVKZK, NJSZDS6U5X9G, XMY29WWQDC1Y, FA82FQHSJG2F, VNWR16YEJASM: the 7 fights that lasted 6).
 *  - Gremlin Merc (地精佣兵): THIEVERY_POWER 20 「攻击时偷走金币」: each of its moves (all attacks) takes min(20, gold)
 *    on its enemy turn (BUUYP94Y04NQ F12: 222, 202, 182, 162). SURPRISE_POWER: when it dies a Sneaky and a Fat Gremlin
 *    appear (the dead Merc leaves the enemy list, the others' indices shift); the Fat Gremlin (胖地精) carries the gold
 *    as HEIST_POWER (the amount stolen, exactly: 20/40/60/80, 0 gold -> no power: 5SSRC26ZFKWC F12), shows SPAWNED_MOVE
 *    (intent Stun) the turn it appears and FLEE_MOVE (Escape) the next, and is gone after that enemy turn (JF8NMA78VE0Y
 *    F9: T2 spawned, T3 Flee, T4 only the Sneaky Gremlin left). Killed, the reward has 「N金币（偷回）」 (LSWUK6D2EV89
 *    F15: 20). A Merc killed on its own turn (Demise) spawns them with UNSET_MOVE, SPAWNED on our next turn
 *    (KY3YZ0DMRY0G F15). In 45 of 46 A8+ fights the Fat Gremlin came (44 carrying gold); the gold came back in 12, the
 *    other 32 lost 38 on average (1203 in all).
 *
 * The state never says which card was stolen, nor the gold before the Fat Gremlin carries it: both are what the fight's
 * first frame had less what the run has now (noteFightStart, kept in screen memory and rebuilt from the logged frames
 * after a restart: journal-replay.ts).
 *
 * Code gives facts, Jev decides: thief_context and each option's `thief` fact (combat-plan.ts), the escape in the
 * rollout (rollout.ts RolloutInput.escapes), and a kill line kept among the options. No HP value is put on a lost card
 * or gold (step 2, Dai's conversion pending). THIEF_FACTS=off: the question as before (tests/thief.test.ts).
 */

import type { GameState } from "../mod/schema.js";
import type { ScreenMemory } from "../project/types.js";
import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { fightKey } from "./fight-plan.js";
import type { Plan } from "./turn-solver.js";

/** The Hopper's countdown power and its card power. */
const ESCAPE_ARTIST = "ESCAPE_ARTIST_POWER";
const SWIPE = "SWIPE_POWER";
/** The Merc's gold power, and the gold the Fat Gremlin carries. */
const THIEVERY = "THIEVERY_POWER";
const HEIST = "HEIST_POWER";
const FLUTTER = "FLUTTER_POWER";
/** The move a stunned enemy shows for the rest of the turn (Flutter stripped, Imbalanced, Shriek). */
const STUNNED = "STUNNED";

/** Who takes over a dying carrier's loot: the Merc's gold goes to the Fat Gremlin it spawns. */
export const LOOT_HEIRS: Record<string, string> = { GREMLIN_MERC: "FAT_GREMLIN" };

/** The moves after which each thief is out of the fight (the monster DB's Escape intent: these two only). */
export const LEAVE_MOVES: Record<string, string> = { THIEVING_HOPPER: "ESCAPE_MOVE", FAT_GREMLIN: "FLEE_MOVE" };

/** A fight as noteFightStart keys it: "<run id>:<act>:<floor>". */
export function thiefFightOf(state: GameState): string {
  return `${str(state.raw["run_id"])}:${fightKey(state)}`;
}

/** A deck card as the game shows it ("痛击+": the name carries the upgrade), with its id. */
interface DeckCard {
  id: string;
  name: string;
}

function deckOf(state: GameState): DeckCard[] {
  return asArray(asRecord(state.run?.raw)["deck"])
    .map(asRecord)
    .filter((card) => str(card["card_id"]) !== "")
    .map((card) => ({ id: `${str(card["card_id"])}${bool(card["upgraded"]) ? "+" : ""}`, name: str(card["name"], str(card["card_id"])) }));
}

/**
 * The run deck and gold at the fight's first combat frame (memory.thiefStart), noted on every state the loop reads and
 * on the logged frames a restart replays; a fight already noted keeps its first. A thief's take is that less what the
 * run has now (the Hopper's card, the Merc's gold so far).
 */
export function noteFightStart(memory: ScreenMemory, state: GameState): void {
  // Called on every state the loop reads: never throws (an odd state leaves the note as it was; the facts then say the
  // card is unknown).
  try {
    if (!state.in_combat || !state.run) return;
    const fight = thiefFightOf(state);
    if (memory.thiefStart?.fight === fight) return;
    const gold = numOrNull(asRecord(state.run.raw)["gold"]);
    memory.thiefStart = { fight, deck: deckOf(state).map((card) => `${card.id}|${card.name}`), gold };
  } catch {
    // keep what was there
  }
}

/** The cards of the fight's first frame missing from the deck now (the Hopper's theft), as the game names them; null: the start was not seen. */
export function missingCards(memory: ScreenMemory, state: GameState): string[] | null {
  const start = memory.thiefStart;
  if (!start || start.fight !== thiefFightOf(state)) return null;
  const now = deckOf(state).map((card) => `${card.id}|${card.name}`);
  const missing: string[] = [];
  for (const key of start.deck) {
    const at = now.indexOf(key);
    if (at >= 0) now.splice(at, 1);
    else missing.push(key.slice(key.indexOf("|") + 1));
  }
  return missing;
}

/** Gold taken since the fight's first frame (the Merc's so far), or null when the start was not seen. */
export function goldTaken(memory: ScreenMemory, state: GameState): number | null {
  const start = memory.thiefStart;
  if (!start || start.fight !== thiefFightOf(state) || start.gold === null) return null;
  const now = numOrNull(asRecord(state.run?.raw)["gold"]);
  return now === null ? null : Math.max(0, start.gold - now);
}

/** A living enemy carrying something of ours. */
export interface Thief {
  /** Board index (the options' enemyHpAfter index). */
  index: number;
  id: string;
  /** The name the options use (combat-plan distinctNames). */
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  /** The Hopper's take: the card names, null when it cannot be told which (the fight's start not seen). */
  cards?: string[] | null;
  /** Gold carried (the Fat Gremlin's HEIST, the Merc's take so far; null: unknown). */
  gold?: number | null;
  /** Our turns left to kill it, this one included; null: it does not leave (the Merc). */
  turnsLeft: number | null;
  /** The Hopper's Flutter now: stripping the last stack stuns it (its move this turn cancelled). */
  flutter: number;
  /** The Merc's gold a move (THIEVERY_POWER). */
  stealsPerAttack?: number;
}

function powerOf(enemy: Record<string, unknown>, id: string): number {
  for (const entry of asArray(enemy["powers"])) {
    const power = asRecord(entry);
    if (str(power["power_id"]) === id) return numOrNull(power["amount"]) ?? 1;
  }
  return 0;
}

/**
 * Our turns left to kill an enemy that leaves, this one included. The Hopper: its ESCAPE_ARTIST_POWER (5 on T1 ... 1 on
 * the Escape turn); stunned now (its last Flutter stripped mid-turn), the stun cancels this turn's move, so on its
 * Escape turn it has one more (XMY29WWQDC1Y F19 T5: STUNNED at 1, Escape again on T6). The Fat Gremlin: 1 on its Flee
 * turn, else 2 (SPAWNED or UNSET: the Flee comes next).
 */
export function turnsLeftOf(id: string, move: string, escapeArtist: number): number | null {
  if (id === "THIEVING_HOPPER") {
    if (move === STUNNED) return Math.max(2, escapeArtist);
    if (move === LEAVE_MOVES[id]) return 1;
    return escapeArtist > 0 ? escapeArtist : null;
  }
  if (id === "FAT_GREMLIN") return move === LEAVE_MOVES[id] ? 1 : 2;
  return null;
}

/**
 * The living enemies carrying something of ours, in board order. `names`: the names the options use, by board index
 * (combat-plan distinctNames); the game's name otherwise.
 */
export function thievesOf(state: GameState, memory: ScreenMemory, names: Map<number, string> = new Map()): Thief[] {
  const out: Thief[] = [];
  const enemies = asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord);
  enemies.forEach((enemy, fallback) => {
    if (enemy["is_alive"] === false || num(enemy["current_hp"]) <= 0) return;
    const id = str(enemy["enemy_id"]);
    const index = numOrNull(enemy["index"]) ?? fallback;
    const move = str(enemy["move_id"]);
    const base = {
      index,
      id,
      name: names.get(index) ?? str(enemy["name"], id),
      hp: num(enemy["current_hp"]),
      maxHp: num(enemy["max_hp"]),
      block: num(enemy["block"]),
      flutter: powerOf(enemy, FLUTTER),
    };
    if (id === "THIEVING_HOPPER" && powerOf(enemy, SWIPE) > 0) {
      out.push({ ...base, cards: missingCards(memory, state), turnsLeft: turnsLeftOf(id, move, powerOf(enemy, ESCAPE_ARTIST)) });
    } else if (id === "FAT_GREMLIN" && powerOf(enemy, HEIST) > 0) {
      out.push({ ...base, gold: powerOf(enemy, HEIST), turnsLeft: turnsLeftOf(id, move, 0) });
    } else if (id === "GREMLIN_MERC" && powerOf(enemy, THIEVERY) > 0) {
      // Its take so far: what the fight's first frame had less the gold now. Unknown start: from T2 on it has
      // attacked (every move is an attack), so it carries something, how much unknown.
      const taken = goldTaken(memory, state);
      if (taken === null ? (state.turn ?? 1) >= 2 : taken > 0) out.push({ ...base, gold: taken, turnsLeft: null, stealsPerAttack: powerOf(enemy, THIEVERY) });
    }
  });
  return out;
}

// ---------------------------------------------------------------- facts

/** What a thief carries, as the facts say it. */
export function lootText(thief: Thief): string {
  if (thief.cards !== undefined) {
    if (thief.cards === null || thief.cards.length === 0) return "one card from your deck (which one is unknown: the fight's start was not seen)";
    return thief.cards.length === 1 ? thief.cards[0]! : `one of ${thief.cards.join(", ")}`;
  }
  return thief.gold === null || thief.gold === undefined ? "the gold it stole (amount unknown: the fight's start was not seen)" : `${thief.gold} gold`;
}

/** When it leaves, from now: "at the end of this turn", "at the end of next turn", "at the end of turn T+k". */
function leavesText(turnsLeft: number, turn: number | null): string {
  if (turnsLeft <= 1) return "at the end of this turn";
  if (turnsLeft === 2) return "at the end of next turn";
  return turn === null ? `at the end of the turn ${turnsLeft - 1} turns from now` : `at the end of turn ${turn + turnsLeft - 1}`;
}

/**
 * The top-level facts while a carrying thief is alive (thief_context): who, what it carries, our turns left to kill it,
 * its HP and block; and how the rollout plays an escape. Numbers and facts only.
 */
export function thiefContextJson(thieves: Thief[], turn: number | null, heirName = "胖地精"): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  for (const thief of thieves) {
    const entry: Record<string, JsonValue> = { hp: `${thief.hp}/${thief.maxHp}`, block: thief.block };
    if (thief.cards !== undefined) {
      entry["carries"] = `${lootText(thief)}: the card it stole from your deck on turn 1; back in the deck if it is killed, gone for the run if it leaves`;
    } else if (thief.id === "GREMLIN_MERC") {
      entry["carries"] = `${lootText(thief)} stolen so far (it takes ${thief.stealsPerAttack ?? 20} more on each attack); when it dies the gold goes to the ${heirName} it spawns: back if that one is killed, gone if it flees`;
    } else {
      entry["carries"] = `${lootText(thief)}: back if it is killed, gone if it flees`;
    }
    if (thief.turnsLeft === null) {
      entry["turns_left"] = `it does not leave; the ${heirName} it spawns on death flees at the end of the turn after it appears (that turn and the next to kill it)`;
    } else {
      const flee = thief.id === "FAT_GREMLIN" ? "it flees" : "it leaves (Escape)";
      entry["turns_left"] = thief.turnsLeft === 1 ? `1: this turn is the last, ${flee} at the end of this turn` : `${thief.turnsLeft}, this one included: ${flee} ${leavesText(thief.turnsLeft, turn)}`;
    }
    if (thief.flutter > 0) entry["flutter"] = `${thief.flutter}: each attack hit removes one; at 0 it is stunned and this turn's move is cancelled${thief.turnsLeft === 1 ? " (its Escape too: it leaves a turn later)" : ""}`;
    out[thief.name] = entry;
  }
  out["rollout"] = "the rollout plays the escape: an enemy whose Escape/Flee resolves is gone (no kill, nothing comes back), and with no enemy left the fight is over (its 'fight over' counts that end too)";
  return out;
}

/** The enemy a line leaves at `index` (none: not in the outcome). */
function afterOf(plan: Plan, index: number): { hp: number; flutter?: number; strippedStun?: unknown } | undefined {
  return plan.outcome.enemyHpAfter.find((entry) => entry.index === index);
}

/** The line kills this thief this turn. */
export function killsThief(plan: Plan, thief: Thief): boolean {
  if (plan.outcome.winsFight) return true;
  const after = afterOf(plan, thief.index);
  return after !== undefined && after.hp <= 0;
}

/** The line strips the thief's last Flutter: it is stunned, this turn's move cancelled. */
export function stunsThief(plan: Plan, thief: Thief): boolean {
  if (thief.flutter <= 0 || killsThief(plan, thief)) return false;
  return (afterOf(plan, thief.index)?.flutter ?? thief.flutter) <= 0;
}

/** Rollout samples of a line, per thief tag: the loot back (killed before it left), gone (it left), of `samples`. */
export interface ThiefSamples {
  back: number;
  gone: number;
  samples: number;
  /**
   * With kill orders (two or more kinds of enemy), the line's numbers are its best order's (by value): the order whose
   * later turns get the loot back most often when that is another one (a Fat Gremlin deals no damage, so the
   * value-best order aims at the Sneaky Gremlin first), its label and count.
   */
  order?: { label: string; back: number };
}

/** The tag a thief carries in the rollout (RolloutInput.escapes.carriers). */
export function thiefTag(thief: Thief): string {
  return `${thief.id}@${thief.index}`;
}

/** The share of a line's samples getting a thief's loot back, under its best order or the order best at it. */
export function backShare(samples: ThiefSamples): number {
  return Math.max(samples.back, samples.order?.back ?? 0) / Math.max(1, samples.samples);
}

/**
 * One option's `thief` fact: this turn, exact (the kill and what comes back, or the HP it is left at and when it
 * leaves, a stun from its last Flutter), then the rollout's samples in which the loot came back before it left
 * (`samplesOf`: rollout-live thiefSamples of the line's rollout, null without one).
 */
export function thiefFact(plan: Plan, thieves: Thief[], samplesOf: (thief: Thief) => ThiefSamples | null, turn: number | null, heirName = "胖地精"): string {
  const parts: string[] = [];
  for (const thief of thieves) {
    let now: string;
    if (killsThief(plan, thief)) {
      now =
        thief.id === "GREMLIN_MERC"
          ? `kills ${thief.name}: its ${lootText(thief)} goes to the ${heirName} it spawns, which flees at the end of next turn`
          : thief.cards !== undefined
            ? `kills ${thief.name}: ${thief.cards && thief.cards.length > 0 ? lootText(thief) : "the stolen card"} comes back`
            : `kills ${thief.name}: its ${lootText(thief)} comes back`;
    } else {
      const hp = Math.max(0, afterOf(plan, thief.index)?.hp ?? thief.hp);
      const stunned = stunsThief(plan, thief);
      const left = thief.turnsLeft === null ? null : stunned && thief.turnsLeft === 1 ? 2 : thief.turnsLeft;
      const leaves = left === null ? `it keeps the ${lootText(thief)}` : `${thief.id === "FAT_GREMLIN" ? "flees" : "leaves"} ${leavesText(left, turn)}${left === 1 ? ` with ${lootText(thief)}` : ""}`;
      now = `${thief.name} left at ${hp} HP, ${leaves}`;
      // MECH_RULES: with the learned strip-stun applied (the solver's strippedStun) hp_lost already leaves the attack out.
      const counted = afterOf(plan, thief.index)?.strippedStun === undefined;
      if (stunned) now += `; its last Flutter stripped: stunned, this turn's move cancelled${thief.turnsLeft === 1 ? " (its Escape: one more turn)" : counted ? " (hp_lost above still counts its attack)" : " (hp_lost above leaves its attack out)"}`;
    }
    const samples = samplesOf(thief);
    if (samples && !(killsThief(plan, thief) && thief.id !== "GREMLIN_MERC")) {
      const what = thief.id === "GREMLIN_MERC" ? `its gold back (the ${heirName} killed before it flees)` : "killed before it leaves";
      now += `; rollout: ${what} in ${samples.back}/${samples.samples} samples, left with it in ${samples.gone}/${samples.samples}${samples.order ? ` (its best order; with the later turns aiming ${samples.order.label}: ${samples.order.back}/${samples.samples})` : ""}`;
    }
    parts.push(now);
  }
  return parts.join("; ");
}

// ---------------------------------------------------------------- option coverage

/**
 * A line that kills a thief on its last turn, when no line in `shown` does: the first potion-free one of `plans` (code's
 * rank order), else the first. Null when every such thief is killed by a shown line, or no line kills it.
 */
export function lastTurnKillLine(plans: Plan[], shown: Plan[], thieves: Thief[], drinks: (plan: Plan) => boolean): Plan | null {
  for (const thief of thieves) {
    if (thief.turnsLeft !== 1) continue;
    if (shown.some((plan) => killsThief(plan, thief))) continue;
    const kills = plans.filter((plan) => killsThief(plan, thief));
    const line = kills.find((plan) => !drinks(plan)) ?? kills[0];
    if (line) return line;
  }
  return null;
}

/**
 * The shown line that kills a thief on its last turn (to keep it through the potion options' trim), or null.
 */
export function shownKillLine(shown: Plan[], thieves: Thief[]): Plan | null {
  for (const thief of thieves) {
    if (thief.turnsLeft !== 1) continue;
    const line = shown.find((plan) => killsThief(plan, thief));
    if (line) return line;
  }
  return null;
}

// ---------------------------------------------------------------- the rollout's escapes

/**
 * The rollout's escape input (RolloutInput.escapes): the moves that take each enemy out of the fight (the monster DB's
 * moves whose intent is Escape: the Hopper's ESCAPE_MOVE, the Fat Gremlin's FLEE_MOVE), the carriers now by board
 * index, and who inherits a carrier's loot when it dies.
 */
export function escapeInput(thieves: Thief[], db: Record<string, { moves?: Record<string, { intents?: Record<string, number> }> }>): { moves: Record<string, string[]>; carriers: Record<number, string>; heirs: Record<string, string> } {
  const moves: Record<string, string[]> = {};
  for (const [id, entry] of Object.entries(db)) {
    const leaving = Object.entries(entry.moves ?? {})
      .filter(([, move]) => (move.intents?.["Escape"] ?? 0) > 0)
      .map(([move]) => move);
    if (leaving.length > 0) moves[id] = leaving;
  }
  // The two the evidence is about, whatever the DB holds (a fresh DB without their intents).
  for (const [id, move] of Object.entries(LEAVE_MOVES)) if (!(moves[id] ?? []).includes(move)) moves[id] = [...(moves[id] ?? []), move];
  return {
    moves,
    carriers: Object.fromEntries(thieves.map((thief) => [thief.index, thiefTag(thief)])),
    heirs: { ...LOOT_HEIRS },
  };
}
