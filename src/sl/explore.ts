/**
 * SL_RETRY_EXPLORE (docs/sl.md §11, Dai 2026-10-02: "retries must try different play"): a retried fight's attempts 3 and
 * later change the line at one decision point of the failed attempts, so that a retry does not replay the death.
 *
 * Why (A9, 2026-10-02): with the known draws (§10) the same board gives the same rollout (its seed is the board's, not the
 * attempt's) and Jev answers the same, so the retries repeated themselves to the card: 63WBEEF2JVM5 F33 (the Knowledge
 * Demon) attempts 2-6 made the same picks at all 9 questions and died on T7 at 9 HP + 25 block against 36 five times;
 * 1YXMHF6FSPK4 F33 (the Crusher and Rocket) attempts 2-6 died on T6 at 11 HP + 10 block against 27 five times.
 * previous_attempts listed the same plays every time; Jev still picked the same line at 0.98.
 *
 * - Recording (every attempt from the 2nd): each decision point's board (slBoardKey: the turn, the hand, the piles, our HP,
 *   block, energy and powers, the potions, the enemies' HP, block, powers and intents) and the line chosen there, as the
 *   options write it; a question's point also keeps the shown lines that could have replaced it. Kept in the attempt's row
 *   in sl-attempts.jsonl (`explore`), so a restarted process has them.
 * - The deviation point (exploreTarget, at the start of attempts 3+): a decision point on the path of the first recorded
 *   attempt (attempt 2: the first with the known draws; the later attempts follow it until their own deviation), where a
 *   shown line was never played on that board by any failed attempt. The point deviated at the fewest times, and among
 *   those the latest: attempt 3 changes the question closest to the death, attempt 4 the one before it, and so on back;
 *   once every point had its turn, the latest with a line still untried again. Only Jev's questions: code's own turns
 *   (the only line, a dominating line, a lethal, every line dying) have no line it would play instead. SL_RETRY_EXPLORE_ORDER:
 *   points where every line loses in every sample come after all others (R1QJUBVBSSB2 F33: T5 on, all 24/24 dead).
 * - SL_RETRY_EXPLORE_REPLAY: before the deviation point the attempt plays the reference attempt's line on each board of its
 *   path (replayPath, replayChoice), so that it reaches the point (R1QJ F33 attempt 3: Jev answered T5 otherwise and the
 *   fight died before its T8 point); a board off the path stops it.
 * - On that board only, the line about to be played, when a failed attempt played it there, is replaced after Jev's answer
 *   (exploreReplacement): by the shown line the question's ranking (B2's where it ranks, its ties the rollout's; else the rollout's) puts first
 *   among those no failed attempt played there, preferring the ones not worse than it (the gate: on a boss B2 is trusted on,
 *   B2's win rate within 2 paired standard errors, SL_RETRY_EXPLORE_B2; else the rollout's share of samples dead), never
 *   one dying this turn while one survives, never one drinking a potion the pick does not drink (but in a boss fight,
 *   SL_RETRY_EXPLORE_BOSS_POTIONS: potions cost nothing there, so the shown potion lines and the random potions' Monte
 *   Carlo lines count like the dry ones). Every other board plays as usual. The decision row says so (`sl_explore`).
 * - SL_RETRY_EXPLORE_CANON (2026-10-03, A9 runs 10-12): a line is "tried" on a board by the turn's plays, not by its text:
 *   the multiset of card id (with "+") and target (the options' distinctNames name), potions included (turnCanon), the
 *   cards already played that turn counted in. Attempt 1 is recorded too (its turns: each action's board and play), so its
 *   plays count as tried where it was (UK7R9A0NMCXL F33 attempt 5 replayed attempt 1, which the record did not have;
 *   63WBEEF2JVM5 F33 T1: attempt 1's "打击, 剑柄打击, potion" then 欺凌 after the draw is attempt 2's one line). Rows from
 *   before it (no turns) are rebuilt from their summary where their history is the reference's (legacyTried).
 * - SL_RETRY_EXPLORE_TURN (2026-10-03, UK7R F33 attempt 4): the deviation holds for the rest of its turn: every later
 *   decision of that turn avoids a line that would end the turn with the plays a failed attempt's turn had through the
 *   deviation point's board (Shrug It Off drew, the re-plan's answer was Defend, Defend: attempt 2's turn in another order).
 * - SL_RETRY_EXPLORE_WHOLE (2026-10-03, PW7Y9EWUW8SB F48 attempts 3-4): the deviation's turn judged by its whole plays. A
 *   line that draws before its turn is over (`open`) is re-planned after the draw, so only its plays up to the draw are
 *   sure (`committed`): when those are within a failed attempt's turn there, the rest may end the turn as that one
 *   (mayRepeat; attempt 3's Blood Wall, Pommel Strike+, Stomp "not played there", then Rampage, Stomp after the draw:
 *   attempts 1-2's turn). Such a pick gives way to a line that cannot, not worse; a replacement prefers one; the avoid
 *   later in the turn reaches every line that survives, not only the ones shown (code's "only distinct line" after the
 *   draw); an avoid that cannot act says so; and a deviation whose turn still ended as a failed one is not a used point
 *   (exploreTarget: the next attempt goes back to it, its line there now tried).
 * - SL_RETRY_EXPLORE_WHERE (2026-10-03, GQ5H73A1VCL8 F48: attempts 3-6 all at T1, the HP lost after T4 and T5): the point
 *   goes where the failed attempts lost their HP (hpLostByTurn, whereWeights), a different turn each attempt (whereChoice);
 *   "every line loses" only breaks ties (it is the rollout's horizon).
 * - SL_RETRY_EXPLORE_POTION (2026-10-03, P68P7CDJRDH3 F48 attempts 3-4): a line is tried on a board by its cards (the
 *   multiset of card and target, as _CANON) when its potions add nothing the failed attempt lacked: a failed turn there
 *   with the same cards whose attempt drank, from that turn to its end, every potion the line drinks (cardsOf, potionsOf,
 *   SlTried.cards). Attempt 3 drank one potion fewer on T2 (attempt 2 drank it there, attempt 3 on T3), attempt 4 one more
 *   on T1 (attempts 2-3 drank it on T2-T3): both played attempt 2's cards and all three ended at 1 HP + 24 block against
 *   44. A potion none of them drank from there on (held to the death) still makes the line new.
 * - SL_RETRY_EXPLORE_REPLAY_PLAYS (2026-10-03, J4S28FRQKD7G F33 attempts 3, 4 and 6): a later attempt knows more draws, so on a
 *   board of the path the reference's line may read otherwise and not be among the options (attempt 2's 「防御, 剑柄打击 -> 火箭,
 *   怨恨 -> 火箭」 planned without knowing Pommel Strike's draw, 烙印+; with it known that line scored 1016th of 1290): its plays
 *   from the board up to its next decision (its turn record, replayPlays) are played as a line when legal there (combat-plan
 *   loggedLine), and the replay goes on.
 * - SL_RETRY_EXPLORE_REPLAY_DEVIATE (2026-10-03, J4S28 F33 attempt 6 played attempt 4's fight again after both stopped
 *   replaying on T2): where the replay cannot go on before the point (neither line nor plays), or once the attempt is off the
 *   path, it deviates on the first board a failed attempt decided on (boardTried: their lines and turns there), not into a
 *   failed attempt's fight; `explore.fallback`, not a use of the target's point.
 * - SL_RETRY_EXPLORE_KEY_COUNTERS (2026-10-04, 7TQFLQBKRE4S F33 attempt 3): in slBoardKey a relic counter that wraps to 0
 *   shown at its count reads 0 (开心小花 3 on the turn's first frame, 0 a frame later, its energy already given: the replay
 *   stopped "not on attempt 2's path" on the very board it aimed at).
 * - SL_RETRY_EXPLORE_SECOND (2026-10-04, 7TQF F39): attempt 2 replans with the known draws, but still on attempt 1's path from
 *   the turn attempt 1 lost the most HP (secondPlan) it deviates there (every logged attempt 2 on that path then had played
 *   attempt 1's whole fight again).
 * - Any error: the attempt plays as without the switch. Off: nothing here runs, and the decisions are as before.
 */
import { createHash } from "node:crypto";
import type { GameState } from "../mod/schema.js";
import { asArray, asRecord, num, numOrNull, str, stableStringify } from "../util/json.js";

/** One decision point of an attempt: the board and the line chosen on it. */
export interface SlPoint {
  /** slBoardKey of the board the line was chosen on. */
  board: string;
  turn: number | null;
  /** "question": a combat plan question Jev answered; "code": code's own line (only line, dominating, lethal, least-loss...). */
  kind: "question" | "code";
  label: string;
  /** The line played, its steps as the options write them ("痛击 -> 知识恶魔, 防御", "end turn"; a potion option: "drink X"). */
  line: string;
  /** A question: the shown lines that could replace it (exploreAlternatives), by their steps. Absent for code's lines. */
  alternatives?: string[];
  /**
   * A question: the rollout's share of samples dead within its horizon, by line (the one played and its alternatives), when it
   * ran. exploreTarget passes over a point whose untried lines all die more often than the one played while another does not.
   */
  dead?: Record<string, number>;
  /**
   * SL_RETRY_EXPLORE_B2, a question on a boss B2 is trusted on: B2's calibrated win rate by line (the one played and its
   * alternatives), the alternatives B2 rates no worse than the one played (the replacement's gate), and B2's raw share of
   * samples won (`won`). exploreTarget weighs "worse" by `dead` (B2 rates every untried line of every point on 63WBEEF2JVM5
   * F33's path worse, so by B2 no point would be passed over, the Blood Wall one included; notes/sl-explore.md), and with
   * SL_RETRY_EXPLORE_ORDER "every line loses" by `won` (else `dead`).
   */
  b2?: { win: Record<string, number>; notWorse: string[]; won?: Record<string, number> };
  /** The line is this attempt's deviation (it replaced a line a failed attempt played here). */
  explored?: true;
  /**
   * SL_RETRY_EXPLORE_CANON / _TURN: by line (the one played and its alternatives), the turn's plays if it is played to its
   * end (turnCanon: the cards already played this turn and the line's). Absent with both off and on rows from before them.
   */
  canon?: Record<string, string>;
}

/**
 * SL_RETRY_EXPLORE_CANON / _TURN: one turn of an attempt as its actions went out: the plays (playKey) in order and the
 * boards they were decided on, each with how many of the plays came before it (an end of turn: its board, no play).
 */
export interface SlTurnPlays {
  turn: number;
  plays: string[];
  boards: { board: string; at: number }[];
}

/** What failed attempts played on one board, as the turn's plays: exact (turnCanon) and from rows before the record (looseCanon). */
export interface SlTried {
  canon: string[];
  /** Rows without a turn record (from before SL_RETRY_EXPLORE_CANON), rebuilt from their summary (looseCanon). */
  loose: string[];
  /** Attempts whose plays on the board could not be read (a play logged without its card): not known to be untried. */
  unknown?: number[];
  /**
   * SL_RETRY_EXPLORE_POTION: the same turns by their cards (SlTriedCards): a line with a turn's cards and no potion its
   * attempt did not drink from that turn on is tried too (triedHas, mayRepeat). Absent with the switch off.
   */
  cards?: SlTriedCards[];
}

/**
 * SL_RETRY_EXPLORE_POTION: one failed turn through a board by its cards: the turn's plays without its potions (cardsOf),
 * and the potions its attempt drank from that turn to its end (that turn's, the board's earlier ones too, and every later
 * turn's: what it did not lack). By id; `loose`: a row rebuilt from its summary (looseCanon), by name.
 */
export interface SlTriedCards {
  cards: string;
  drunk: string[];
  loose?: true;
}

/** Where an attempt deviates (exploreTarget), as its row records it. */
export interface SlTarget {
  /** The point's board (slBoardKey) and turn, on the path of the attempt `reference`. */
  board: string;
  turn: number | null;
  reference: number;
  /** The point's place counted back from the death (1: the latest decision point of the reference attempt with a line untried). */
  back: number;
  /** How many earlier attempts deviated there (0: the first time). */
  round: number;
  /** The lines failed attempts played on this board (never played again there), and those attempts. */
  excluded: string[];
  attempts: number[];
  /** The point as the console and the decision row say it. */
  point: string;
  /**
   * SL_RETRY_EXPLORE_CANON / _TURN: the turns' plays failed attempts had through this board (SlTried): never again the
   * deviation's turn (the replacement there, and with _TURN every later decision of that turn). Absent with both off.
   */
  tried?: SlTried;
  /**
   * SL_RETRY_EXPLORE_WHERE: why this turn: its weight (whereWeights), how many earlier attempts deviated on this turn (at
   * any of its questions), the HP the failed attempts lost on each turn (hpLostByTurn's mean, "T4": 20) and the weight of
   * each turn with a question left to change ("T4": 31.3), rounded to a tenth. Absent with the switch off.
   */
  where?: { weight: number; turnRound: number; lost: Record<string, number>; weights: Record<string, number> };
}

/** What came of an attempt's deviation point. */
export interface SlDeviation {
  /** The board came up in this attempt (the attempt's own play may leave the path before it). */
  reached: boolean;
  /** The line about to be played there, and what was played instead (null: nothing replaced). */
  original: string | null;
  replacement: string | null;
  reason: string;
  /**
   * SL_RETRY_EXPLORE_CANON / _TURN: the deviation's turn, its plays when the turn was over (turnCanon), and whether they
   * differ from every failed attempt's turn through the point's board (target.tried). Written with the attempt's row.
   */
  turn?: number | null;
  plays?: string;
  differs?: boolean;
  /**
   * SL_RETRY_EXPLORE_WHOLE: the decisions later in the deviation's turn whose line ended the turn as a failed attempt's and
   * the avoid could not change (no line that survives this turn ends it otherwise...), in order. Absent: none.
   */
  avoidFailed?: { turn: number | null; label: string; line: string; reason: string }[];
}

/** The attempt row's `explore` (SL_RETRY_EXPLORE on, attempts from the 2nd). */
export interface SlExploreRecord {
  points: SlPoint[];
  /** Attempts 3+: the deviation point aimed at (null: none, `why`). */
  target: SlTarget | null;
  why?: string;
  deviation?: SlDeviation;
  /**
   * SL_RETRY_EXPLORE_REPLAY: the reference attempt's path played before the deviation point: the boards where its line was
   * played (`replayed`; `overridden`: of them, where it replaced the answer), and why the replay stopped (a board not on the
   * path, its line not played there; null: it did not).
   */
  replay?: {
    replayed: number;
    overridden: number;
    stopped: string | null;
    /**
     * SL_RETRY_EXPLORE_REPLAY_PLAYS: of the boards replayed, where the reference's line was not among the options and its
     * logged plays from there were played instead (absent: none, and always with the switch off).
     */
    logged?: number;
  };
  /**
   * SL_RETRY_EXPLORE_REPLAY_DEVIATE: the replay stopped before the deviation point (its board did not come up): the attempt
   * deviated where it was, on a board a failed attempt had decided on (the board, its turn and point, what was played there
   * and instead), so that it does not play a failed attempt's fight again. Not a use of the target's point (exploreTarget
   * counts `deviation` only). Absent: the replay did not stop, or no such board came up.
   */
  fallback?: SlDeviation & { board: string; point: string; attempts: number[]; tried?: SlTried };
  /**
   * SL_RETRY_EXPLORE_SECOND, attempt 2: from turn `turn` (where attempt 1 lost the most HP, whereWeights) to `until` (attempt 1's
   * last turn), the first question on a board of attempt 1's path (attempt 2 still on it: the same board, so far the same
   * fight) deviates there; then `target` and `deviation` say where and what, as an attempt 3's do. `weights`: the turns'.
   */
  second?: { turn: number; until: number; weights: Record<string, number> };
  /** SL_RETRY_EXPLORE_CANON (attempts from the 1st) / _TURN (from the 2nd): each turn's plays and boards. */
  turns?: SlTurnPlays[];
}

/** The planner's part (env.sl.explore): record the lines; on the deviation point's board, `deviate`. */
export interface SlExploreEnv {
  /**
   * On the deviation point's board: the lines failed attempts played there, and (SL_RETRY_EXPLORE_REPLAY) the boards
   * replayed before it; SL_RETRY_EXPLORE_CANON / _TURN: the turns' plays they had through it (`tried`, by turnCanon).
   */
  deviate?: { point: string; excluded: string[]; attempts: number[]; replayed?: number; tried?: SlTried };
  /**
   * SL_RETRY_EXPLORE_CANON / _TURN: the plays already made this turn (playKey; `text`: as the attempt's summary writes
   * them, for rows rebuilt from it), which every line's turn (turnCanon) counts in. Present: the points record `canon`.
   */
  played?: { canon: string[]; text: string[] };
  /**
   * SL_RETRY_EXPLORE_TURN (2026-10-03, UK7R9A0NMCXL F33 attempt 4): later in the deviation's turn (a re-plan after a draw,
   * code's next line), the turns failed attempts had through the point's board: a line ending the turn with one of them
   * gives way to the best one that does not (exploreReplacement's guards: never over a winning line, never one dying this
   * turn while one survives).
   */
  avoid?: { point: string; tried: SlTried; attempts: number[] };
  /**
   * SL_RETRY_EXPLORE_REPLAY (2026-10-03): before the deviation point, on a board of the reference attempt's path, the line it
   * played there: played instead of the answer (never instead of a winning line, nor where it dies this turn and the
   * answer does not), so that the attempt reaches the point (R1QJUBVBSSB2 F33 attempt 3: Jev answered T5 otherwise, 0.52
   * against 0.44, and the fight died on T7 before its T8 point).
   */
  replay?: {
    line: string;
    reference: number;
    point: string;
    canon?: string;
    /**
     * SL_RETRY_EXPLORE_REPLAY_PLAYS (J4S28FRQKD7G F33 attempts 3, 4 and 6): the reference attempt's plays from this board up to
     * its next decision (its turn record, playKey), played as a line when its line is not among the options (the later
     * attempts know more draws, so the lines read otherwise: attempt 2's 「防御, 剑柄打击 -> 火箭, 怨恨 -> 火箭」 came back as
     * 「防御, 剑柄打击 -> 火箭, 烙印+, 怨恨 -> 火箭」 with the drawn 烙印+ in it).
     */
    plays?: string[];
    /**
     * SL_RETRY_EXPLORE_REPLAY_DEVIATE: where the replay cannot be played on this board (its line not among the options and
     * its plays not legal here, or that line dies this turn where the answer does not), the deviation to make here instead:
     * as `deviate` (the lines failed attempts played on this board and their turns through it).
     */
    fallback?: { point: string; excluded: string[]; attempts: number[]; tried?: SlTried };
  };
  /**
   * SL_RETRY_EXPLORE_B2 (Dai 2026-10-02): on a boss B2 is trusted on, B2's win rate is the gate ("not worse than the line
   * replaced": ExploreB2.notWorse) instead of the rollout's share of samples dead, in the replacement and the record (the
   * deviation point is still chosen by the rollout's: exploreTarget).
   */
  b2Gate?: boolean;
  /**
   * SL_RETRY_EXPLORE_BOSS_POTIONS (Dai 2026-10-02): in a boss fight a line drinking a potion the line replaced does not is an
   * alternative too (potions cost 0 there, and the line replaced is known to lose): the shown potion lines and the random
   * potions' Monte Carlo lines. Out of a boss fight never (a listed elite's potion costs HP-equivalents).
   */
  bossPotions?: boolean;
  /**
   * SL_RETRY_EXPLORE_WHOLE (2026-10-03, PW7Y9EWUW8SB F48): the deviation's turn by its whole plays: with `deviate` or `avoid`,
   * a line drawing before its turn is over whose plays up to the draw are within a failed turn (mayRepeat) gives way to a
   * not-worse line that cannot end so, replacements prefer such lines, and the avoid reaches every surviving line (code's
   * own line too, not only the shown ones); an avoid that cannot act is logged (`avoid_failed`). Absent: as before.
   */
  whole?: boolean;
}

/** The steps of a line, as the options and the decision rows write them ("A -> X, B"; "end turn"). */
export function lineText(steps: readonly { name: string; targetName?: string | null | undefined }[]): string {
  return steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", ") || "end turn";
}

/**
 * SL_RETRY_EXPLORE_CANON: one play as the turn's canonical form writes it: a card by its id, "+" when upgraded; a potion as
 * "potion:<id>"; then ">" and the enemy it aims at, by the options' distinctNames name (the same enemies read the same on
 * the same board in every attempt: 「残杀千足虫 (MIDDLE)」, 「寄生信徒 #2」; a line is re-planned when an enemy dies, so a
 * play's name is its decision board's). The same cards on another enemy are another play.
 */
export function playKey(play: { card: string; upgraded: boolean } | { potion: string }, target: string | null | undefined): string {
  const what = "potion" in play ? `potion:${play.potion}` : `${play.card}${play.upgraded ? "+" : ""}`;
  return target ? `${what}>${target}` : what;
}

/**
 * A turn's plays as one key whatever their order (SL_RETRY_EXPLORE_CANON): sorted, joined with ", "; "nothing" for none.
 * The same over playKey (the record) and over the summary's play texts (looseCanon's rows from before the record).
 */
export function turnCanon(plays: readonly string[]): string {
  return plays.length === 0 ? "nothing" : [...plays].sort().join(", ");
}

/**
 * A play as the attempt's summary writes it (controller noteAction: "name -> target", a potion "potion name" without its
 * target): what rows from before SL_RETRY_EXPLORE_CANON have of their turns. A line's step: its name (a potion step's is
 * "potion <name>") and target, a potion's left out.
 */
export function summaryPlay(step: { name: string; targetName?: string | null | undefined; potion?: boolean }): string {
  return step.targetName && !step.potion ? `${step.name} -> ${step.targetName}` : step.name;
}

/** A line or a pick as the tried check reads it: its text, its turn's plays (turnCanon), and those as the summary has them. */
export interface TriedKey {
  text: string;
  canon?: string | undefined;
  loose?: string | undefined;
}

/**
 * `line`'s turn is one a failed attempt had on the board (`tried`): its plays exactly, or as a rebuilt row has them; with
 * SL_RETRY_EXPLORE_POTION (`tried.cards`) also its cards, with no potion that attempt did not drink from there on.
 */
export function triedHas(tried: SlTried | null | undefined, line: TriedKey): boolean {
  return triedHow(tried, line) !== null;
}

/**
 * How `line` is tried on the board (triedHas): "exact" (a failed turn's plays, or a rebuilt row's), "cards"
 * (SL_RETRY_EXPLORE_POTION only: a failed turn's cards, its potions drunk by that attempt too), null (not tried).
 */
export function triedHow(tried: SlTried | null | undefined, line: TriedKey): "exact" | "cards" | null {
  if (!tried) return null;
  if ((line.canon !== undefined && tried.canon.includes(line.canon)) || (line.loose !== undefined && tried.loose.includes(line.loose))) return "exact";
  const byCards = (tried.cards ?? []).some((entry) => {
    const key = entry.loose === true ? line.loose : line.canon;
    return key !== undefined && cardsRepeat(entry, key);
  });
  return byCards ? "cards" : null;
}

/** The plays of a turn's key (turnCanon), one by one ("nothing": none). */
function canonPlays(canon: string): string[] {
  return canon === "nothing" || canon === "" ? [] : canon.split(", ");
}

/**
 * SL_RETRY_EXPLORE_POTION: the potion a play of a turn's key drinks: playKey's "potion:<id>" (its target after ">" left
 * out) or a summary's "potion <name>" (looseCanon); null for a card.
 */
export function potionOfPlay(play: string): string | null {
  if (play.startsWith("potion:")) return play.slice("potion:".length).split(">")[0] ?? "";
  if (play.startsWith("potion ")) return play.slice("potion ".length);
  return null;
}

/** SL_RETRY_EXPLORE_POTION: a turn's key (turnCanon) without its potions: the cards it plays, with their targets. */
export function cardsOf(canon: string): string {
  return turnCanon(canonPlays(canon).filter((play) => potionOfPlay(play) === null));
}

/** SL_RETRY_EXPLORE_POTION: the potions a turn's key (turnCanon) drinks, by id (a summary's: by name), sorted. */
export function potionsOf(canon: string): string[] {
  return canonPlays(canon)
    .map(potionOfPlay)
    .filter((potion): potion is string => potion !== null)
    .sort();
}

/**
 * SL_RETRY_EXPLORE_POTION: `key` (a line's turn, turnCanon) repeats the failed turn `entry`: the same cards (and targets),
 * and every potion it drinks (as many of each) drunk by that attempt from that turn on. A potion drunk a turn earlier or
 * later, or not drunk this turn, is the same line; one that attempt never drank from there (held to its end) is not.
 */
export function cardsRepeat(entry: SlTriedCards, key: string): boolean {
  return cardsOf(key) === entry.cards && multisetWithin(potionsOf(key), entry.drunk);
}

/** `part` is within `whole` as multisets (two of a thing are not one). */
function multisetWithin(part: readonly string[], whole: readonly string[]): boolean {
  const left = new Map<string, number>();
  for (const item of whole) left.set(item, (left.get(item) ?? 0) + 1);
  for (const item of part) {
    const n = left.get(item) ?? 0;
    if (n === 0) return false;
    left.set(item, n - 1);
  }
  return true;
}

/** The plays of `part` (turnCanon) are among those of `whole` (turnCanon), as multisets: `part` can grow into `whole`. */
export function canonWithin(part: string, whole: string): boolean {
  return multisetWithin(canonPlays(part), canonPlays(whole));
}

/**
 * SL_RETRY_EXPLORE_WHOLE: a line that draws before its turn is over (`open`: a card that draws, a potion option drunk then
 * re-planned) is re-planned after the draw, so only its plays up to the draw (`committed`, the turn's so far counted in)
 * are sure; when those are within a failed attempt's turn on the board (exact records: `tried.canon`), the re-planned rest
 * may end the turn as that one did. PW7Y9EWUW8SB F48 attempt 3 T1: Blood Wall, Pommel Strike+, Stomp was "not played
 * there" (attempts 1-2: Blood Wall, Rampage, Pommel Strike+, Stomp); Pommel Strike+ drew and code's re-plan played
 * Rampage, Stomp: their turn to the card. A line known to end the turn otherwise (closed, or its sure plays in no failed
 * turn) cannot. SL_RETRY_EXPLORE_POTION (`tried.cards`): nor may one whose sure cards are within a failed turn's cards and
 * whose sure potions that attempt drank from there on (the rest may end the turn with its cards).
 */
export function mayRepeat(tried: SlTried | null | undefined, line: { open?: boolean | undefined; committed?: string | undefined }): boolean {
  if (!tried || line.open !== true || line.committed === undefined) return false;
  const committed = line.committed;
  if (tried.canon.some((turn) => canonWithin(committed, turn))) return true;
  const cards = cardsOf(committed);
  const potions = potionsOf(committed);
  return (tried.cards ?? []).some((entry) => entry.loose !== true && canonWithin(cards, entry.cards) && multisetWithin(potions, entry.drunk));
}

/** SL_RETRY_EXPLORE_POTION: exploreReplacement's note on a pick tried by its cards only (cardsRepeat). */
export const POTION_ONLY = "the pick plays a failed attempt's cards here and drinks no potion that attempt did not drink from here on";

/** SL_RETRY_EXPLORE_WHOLE: how exploreReplacement's reason begins for a pick that may repeat a failed turn after its draw. */
export const MAY_REPEAT = "the pick's turn may end as a failed attempt's after its draw (its plays up to the draw are within one)";

/** A play the summary logged without its card ("card 3 -> X", "potion potion 1": not found in the hand or the belt). */
const UNREAD_PLAY = /^(?:card (?:\d+|\?)(?: -> .*)?|potion potion (?:\d+|\?))$/;

/** "id:amount" of each power, sorted (the board's powers, whatever order the mod lists them in). */
function powersOf(holder: Record<string, unknown>): string[] {
  return asArray(holder["powers"])
    .map(asRecord)
    .map((power) => `${str(power["power_id"])}:${numOrNull(power["amount"]) ?? ""}`)
    .sort();
}

/** A pile's cards: each listing line's card ids and its "name*N" (upgrades are in the name), sorted. */
function pileOf(view: Record<string, unknown>, which: string): string[] {
  return asArray(view[which])
    .map((entry) => {
      const line = asRecord(entry);
      const name = str(line["line"], typeof entry === "string" ? entry : "").split(" [")[0] ?? "";
      return `${asArray(line["card_ids"]).map((id) => str(id)).join("/")}:${name}`;
    })
    .sort();
}

/**
 * SL_RETRY_EXPLORE_KEY_COUNTERS: relics whose counter goes back to 0 when it reaches its count, by that count. The state can
 * show the count itself for a moment, the relic's effect already in the rest of the board (7TQFLQBKRE4S F33 attempt 3 T4:
 * 开心小花 at 3 on the turn's first frame, energy 4; attempt 2's same board at 0, energy 4): read as 0. From the logged frames
 * (the count is seen only that way: 55 of 2030 Happy Flower frames, all a turn's first; the next frame 0, or 1 after the next
 * card): 开心小花 3, 苦无 / 手里剑 / 精致折扇 / 开信刀 / 锁镰 3, 双截棍 / 钢笔尖 / 音叉 10.
 */
export const RELIC_COUNTER_WRAPS: ReadonlyMap<string, number> = new Map([
  ["HAPPY_FLOWER", 3],
  ["KUNAI", 3],
  ["SHURIKEN", 3],
  ["ORNAMENTAL_FAN", 3],
  ["LETTER_OPENER", 3],
  ["KUSARIGAMA", 3],
  ["NUNCHAKU", 10],
  ["PEN_NIB", 10],
  ["TUNING_FORK", 10],
]);

/**
 * The board a decision is made on, stable across the attempts at a fight (the same board in attempt 2 and attempt 5 is
 * the same key): the turn, the hand (id, upgrade, cost, playable; sorted), the draw, discard and exhaust piles, our HP,
 * block, energy, powers and the turn's plays so far, the potions by slot, the relics' counters, and each enemy's id, HP,
 * block, powers, move and intents. Nothing that changes from one attempt to the next on the same board (times, ids of
 * decisions, the run's gold or the map). A sha1, 16 hex digits.
 * `counters` (SL_RETRY_EXPLORE_KEY_COUNTERS): a counter of RELIC_COUNTER_WRAPS shown at its count reads 0 (only such a
 * board's key changes: two boards get one key only when everything else is the same, the effect included).
 */
export function slBoardKey(state: GameState, options: { counters?: boolean } = {}): string {
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  const run = asRecord(state.raw["run"]);
  const board = {
    turn: state.turn,
    hand: asArray(combat["hand"])
      .map(asRecord)
      .map((card) => `${str(card["card_id"])}${card["upgraded"] === true ? "+" : ""}:${num(card["energy_cost"], -1)}:${card["playable"] === true}`)
      .sort(),
    draw: pileOf(view, "draw"),
    discard: pileOf(view, "discard"),
    exhaust: pileOf(view, "exhaust"),
    player: {
      hp: numOrNull(player["current_hp"]),
      maxHp: numOrNull(player["max_hp"]),
      block: num(player["block"]),
      energy: num(player["energy"]),
      stars: num(player["stars"]),
      powers: powersOf(player),
      played: [num(player["cards_played_this_turn"]), num(player["attacks_played_this_turn"]), num(player["skills_played_this_turn"])],
    },
    potions: asArray(run["potions"]).map(asRecord).map((slot) => `${str(slot["potion_id"])}:${slot["can_use"] === true}`),
    relics: asArray(run["relics"])
      .map(asRecord)
      .filter((relic) => relic["stack"] !== null && relic["stack"] !== undefined)
      .map((relic) => {
        const id = str(relic["relic_id"]);
        const wrap = options.counters === true ? RELIC_COUNTER_WRAPS.get(id) : undefined;
        return `${id}:${wrap !== undefined && num(relic["stack"], -1) === wrap ? "0" : String(relic["stack"])}`;
      })
      .sort(),
    enemies: asArray(combat["enemies"])
      .map(asRecord)
      .map((enemy) => ({
        index: num(enemy["index"]),
        id: str(enemy["enemy_id"]),
        alive: enemy["is_alive"] !== false,
        hp: numOrNull(enemy["current_hp"]),
        maxHp: numOrNull(enemy["max_hp"]),
        block: num(enemy["block"]),
        powers: powersOf(enemy),
        move: str(enemy["move_id"]),
        intents: asArray(enemy["intents"])
          .map(asRecord)
          .map((intent) => `${str(intent["intent_type"])}:${numOrNull(intent["damage"]) ?? ""}x${numOrNull(intent["hits"]) ?? ""}:${numOrNull(intent["status_card_count"]) ?? ""}`),
      })),
  };
  return createHash("sha1").update(stableStringify(board)).digest("hex").slice(0, 16);
}

/** An attempt row as exploreTarget reads it (attempts.ts SlAttemptRow). */
export interface ExploreRow {
  attempt: number;
  turns: number;
  result: string;
  explore?: SlExploreRecord | null;
  /** The attempt's turns as its summary has them (attempts.ts SlTurn): rows without a turn record are rebuilt from it. */
  summary?: { turns: readonly { turn: number; hp: number | null; block: number | null; enemies: string; plays: readonly string[] }[] };
}

/** What failed attempts played on each board, gathered (triedByBoard). */
interface TriedEntry {
  canon: Set<string>;
  loose: Set<string>;
  unknown: Set<number>;
  attempts: Set<number>;
  /** SL_RETRY_EXPLORE_POTION: the same turns by their cards, by stableStringify (null: the switch off). */
  cards: Map<string, SlTriedCards> | null;
}

/**
 * The boards of the reference's turns with how many plays came before each: its turn record's; a row from before it, its
 * points', each turn's first at 0 and each next one after the steps of the line before it that its summary shows played
 * next (at least one: a board changes only with an action; a potion's target is not in the summary). A line cut short by a
 * draw whose re-plan played its next step after all reads one play long: the board then reads later than it was.
 */
function boardsByTurn(reference: ExploreRow): Map<number, { board: string; at: number }[]> {
  const out = new Map<number, { board: string; at: number }[]>();
  const turns = reference.explore?.turns;
  if (turns) {
    for (const turn of turns) out.set(turn.turn, [...turn.boards]);
    return out;
  }
  const plays = new Map((reference.summary?.turns ?? []).map((turn) => [turn.turn, turn.plays]));
  /** A line's step as the summary writes it: "name -> target", a potion's without its target. */
  const asPlayed = (step: string) => (step.startsWith("potion ") ? step.split(" -> ")[0]! : step);
  let last: { turn: number; at: number; line: string } | null = null;
  for (const point of reference.explore?.points ?? []) {
    if (point.turn === null) continue;
    const list = out.get(point.turn) ?? [];
    let at = 0;
    if (last && last.turn === point.turn) {
      const done = plays.get(point.turn) ?? [];
      const steps = last.line === "end turn" ? [] : last.line.split(", ").map(asPlayed);
      let n = 0;
      while (n < steps.length && last.at + n < done.length && done[last.at + n] === steps[n]) n += 1;
      at = Math.min(done.length, last.at + Math.max(1, n));
    }
    if (list.at(-1)?.board !== point.board) list.push({ board: point.board, at });
    out.set(point.turn, list);
    last = { turn: point.turn, at, line: point.line };
  }
  return out;
}

/**
 * SL_RETRY_EXPLORE_CANON, a row without a turn record (written before it: attempt 1 was not recorded, nor an attempt's
 * turns): its turns from its summary, on the reference's boards where its history is the reference's (each turn before
 * began at the same HP, block and enemies and played the same cards, the same draws then; within the turn, the same
 * plays before the board). The plays as the summary writes them (looseCanon: a potion's target is not there); a turn with
 * a play logged without its card is unknown there. A turn played otherwise ends the match: the next starts elsewhere.
 * Each with its turn.
 */
export function legacyTried(row: ExploreRow, reference: ExploreRow): { board: string; loose: string | null; turn: number }[] {
  const mine = row.summary?.turns ?? [];
  const theirs = reference.summary?.turns ?? [];
  const boards = boardsByTurn(reference);
  const out: { board: string; loose: string | null; turn: number }[] = [];
  for (let i = 0; i < mine.length && i < theirs.length; i += 1) {
    const a = mine[i]!;
    const b = theirs[i]!;
    if (a.turn !== b.turn || a.hp !== b.hp || a.block !== b.block || a.enemies !== b.enemies) break;
    const readable = a.plays.every((play) => !UNREAD_PLAY.test(play));
    for (const { board, at } of boards.get(a.turn) ?? []) {
      if (at > a.plays.length || at > b.plays.length || turnCanon(a.plays.slice(0, at)) !== turnCanon(b.plays.slice(0, at))) continue;
      out.push({ board, loose: readable ? turnCanon(a.plays) : null, turn: a.turn });
    }
    if (turnCanon(a.plays) !== turnCanon(b.plays)) break;
  }
  return out;
}

/**
 * The turns failed attempts had through each board: the turn record's (every board an action of the turn was decided
 * on gets the whole turn's plays), each point's line as planned there (point.canon), and with `legacy` (SL_RETRY_EXPLORE_CANON)
 * the rows without a turn record rebuilt from their summary (legacyTried). With `potion` (SL_RETRY_EXPLORE_POTION) each of
 * them by its cards too, with the potions its attempt drank from that turn on (SlTriedCards): the turn record's, a point's
 * planned line's and the record's later turns', a rebuilt row's summary's (by name).
 */
function triedByBoard(rows: readonly ExploreRow[], reference: ExploreRow, legacy: boolean, potion = false): Map<string, TriedEntry> {
  const out = new Map<string, TriedEntry>();
  const at = (board: string): TriedEntry => {
    let entry = out.get(board);
    if (!entry) out.set(board, (entry = { canon: new Set(), loose: new Set(), unknown: new Set(), attempts: new Set(), cards: potion ? new Map() : null }));
    return entry;
  };
  const addCards = (entry: TriedEntry, cards: SlTriedCards) => {
    if (entry.cards) entry.cards.set(stableStringify({ ...cards, drunk: [...cards.drunk].sort() }), { ...cards, drunk: [...cards.drunk].sort() });
  };
  for (const row of rows) {
    const turns = row.explore?.turns;
    /** The potions the row's turn record drank after `turn` (none without a record). */
    const later = (turn: number | null): string[] => (turn === null ? [] : (turns ?? []).filter((t) => t.turn > turn).flatMap((t) => potionsOf(turnCanon(t.plays))));
    for (const point of row.explore?.points ?? []) {
      const canon = point.canon?.[point.line];
      if (canon === undefined) continue;
      const entry = at(point.board);
      entry.canon.add(canon);
      entry.attempts.add(row.attempt);
      if (potion) addCards(entry, { cards: cardsOf(canon), drunk: [...potionsOf(canon), ...later(point.turn)] });
    }
    if (turns) {
      for (const turn of turns) {
        const canon = turnCanon(turn.plays);
        const drunk = potion ? [...potionsOf(canon), ...later(turn.turn)] : [];
        for (const { board } of turn.boards) {
          const entry = at(board);
          entry.canon.add(canon);
          entry.attempts.add(row.attempt);
          if (potion) addCards(entry, { cards: cardsOf(canon), drunk });
        }
      }
    } else if (legacy) {
      const summary = row.summary?.turns ?? [];
      for (const { board, loose, turn } of legacyTried(row, reference)) {
        const entry = at(board);
        if (loose === null) entry.unknown.add(row.attempt);
        else {
          entry.loose.add(loose);
          if (potion) addCards(entry, { cards: cardsOf(loose), drunk: summary.filter((t) => t.turn >= turn).flatMap((t) => potionsOf(turnCanon(t.plays))), loose: true });
        }
        entry.attempts.add(row.attempt);
      }
    }
  }
  return out;
}

/**
 * The turns failed attempts had through `board` (SlTried) and the attempts they came from, as exploreTarget gathers them
 * for its target (`canon`, SL_RETRY_EXPLORE_CANON: attempt 1 and the rows from before the record too; else the rows from
 * the 2nd with a record). The reference for rebuilt rows: the first failed attempt from the 2nd with points. `potion`
 * (SL_RETRY_EXPLORE_POTION): with the turns by their cards (`tried.cards`).
 */
export function exploreTried(rows: readonly ExploreRow[], attempt: number, board: string, options: { canon?: boolean; potion?: boolean } = {}): { tried: SlTried; attempts: number[] } {
  const failed = failedRows(rows, attempt, 2);
  // SL_RETRY_EXPLORE_SECOND (attempt 2: no failed row from the 2nd): attempt 1's own row, its turn record (no row to rebuild).
  const reference = failed.find((row) => row.explore && Array.isArray(row.explore.points)) ?? (options.canon === true && failed.length === 0 ? failedRows(rows, attempt, 1).find((row) => row.explore?.turns) : undefined);
  const potion = options.potion === true;
  if (!reference) return { tried: { canon: [], loose: [], ...(potion ? { cards: [] } : {}) }, attempts: [] };
  const entry = triedByBoard(options.canon === true ? failedRows(rows, attempt, 1) : failed.filter((row) => row.explore), reference, options.canon === true, potion).get(board);
  return { tried: triedOf(entry, potion), attempts: [...(entry?.attempts ?? [])].sort((a, b) => a - b) };
}

/** The failed attempts before `attempt` from `from` on, by attempt (an unfinished row after its attempt's finished one). */
function failedRows(rows: readonly ExploreRow[], attempt: number, from: number): ExploreRow[] {
  return rows
    .filter((row) => row.attempt >= from && row.attempt < attempt && row.result !== "won")
    .sort((a, b) => a.attempt - b.attempt || Number(a.result === "unfinished") - Number(b.result === "unfinished"));
}

/** An entry as the target carries it; `potion` (SL_RETRY_EXPLORE_POTION): its turns by their cards too (none: an empty list). */
function triedOf(entry: TriedEntry | undefined, potion = false): SlTried {
  const unknown = entry ? [...entry.unknown].sort((a, b) => a - b) : [];
  const cards = potion ? { cards: [...(entry?.cards?.values() ?? [])] } : {};
  return { canon: entry ? [...entry.canon] : [], loose: entry ? [...entry.loose] : [], ...(unknown.length > 0 ? { unknown } : {}), ...cards };
}

/** A line's turn (turnCanon) is one of `entry`'s: exactly, or (SL_RETRY_EXPLORE_POTION) by its cards (cardsRepeat). */
function entryHas(entry: TriedEntry, canon: string): boolean {
  if (entry.canon.has(canon)) return true;
  for (const cards of entry.cards?.values() ?? []) if (cards.loose !== true && cardsRepeat(cards, canon)) return true;
  return false;
}

const ordinal = (n: number): string => (n === 1 ? "latest" : `${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"} latest`);

/**
 * The deviation point of `attempt` (3 or later) from the earlier attempts' rows at the fight (all failed: the fight is being
 * retried). The path is the first attempt from the 2nd that recorded its points (attempt 2 is the first that knows the draws:
 * it plays as usual; every later attempt plays its path until its own deviation). A point qualifies when it is a question
 * and some line shown there was never played on that board by a failed attempt (by text, attempt 1 does not count: it did
 * not know the draws, so the same board's lines read differently, 63WBEEF2JVM5 F33 T1 "打击, 剑柄打击, potion" against
 * attempt 2's "..., 欺凌" for the same plays; SL_RETRY_EXPLORE_CANON compares the turn's plays instead, and attempt 1's
 * count). The point deviated at the fewest times so far comes first, the latest of those: attempt 3
 * the question closest to the death, attempt 4 the one before it, and so on back, then round again (docs/sl.md §11.2).
 * Among those, a point with an untried line the rollout does not see dying more often than the one played comes before one
 * whose untried lines all do (`dead`; the offline evaluation, 63WBEEF2JVM5 F33 T5: the only other line, Blood Wall, dead in
 * 24 of 24 samples against 20, B2 0% won against 11%: a retry spent on it), by the rollout's numbers also where B2 gates the
 * replacement (`b2` is not read here: B2 rates every untried line of every point on that path worse, Blood Wall's included).
 * A deviation counts when its board came up (`deviation.reached`). Null (with why) when there is no such point.
 */
export interface ExploreTargetOptions {
  /**
   * SL_RETRY_EXPLORE_ORDER (2026-10-03, R1QJUBVBSSB2 F33): points where every line of the record loses in every sample (the
   * rollout's share dead 1; B2's share won 0 where it weighed the point) come after every other point: changing one there
   * is a coin flip in a fight already lost. Among the rest, as before.
   */
  aliveFirst?: boolean;
  /**
   * SL_RETRY_EXPLORE_CANON (2026-10-03): a line is tried on a board by its turn's plays (point.canon against the turns the
   * failed attempts had through the board: triedByBoard), attempt 1 among them (its turn record; a row from before it,
   * rebuilt from its summary). The target carries them (`tried`). Off: by text, from the 2nd, as before.
   */
  canon?: boolean;
  /**
   * SL_RETRY_EXPLORE_TURN without _CANON: the target carries the turns the failed attempts from the 2nd had through its
   * board (`tried`, from their records); the point is chosen as before.
   */
  tried?: boolean;
  /**
   * SL_RETRY_EXPLORE_WHOLE (2026-10-03, PW7Y9EWUW8SB F48 attempts 3 and 4): a deviation whose turn still ended with a failed
   * attempt's plays (`deviation.differs` false: a draw's re-plan went back to them) explored nothing there, so it is not a
   * use of its point: the next attempt goes back to the point (while it is still the first by the order), where the line
   * that attempt played is now tried too. Off: every reached deviation counts, as before.
   */
  whole?: boolean;
  /**
   * SL_RETRY_EXPLORE_WHERE (2026-10-03, GQ5H73A1VCL8 F48): the turn deviated at is where the failed attempts lost their HP,
   * a different turn each attempt. Among the turns deviated at the fewest times (at any of their questions; a wasted
   * deviation with `whole` is none), the one whose weight is the largest (whereWeights: the HP the failed attempts lost on
   * the enemy turn after it, plus the later turns' losses at WHERE_DECAY per turn, so the turn before a big hit counts
   * too), a point with an untried line not worse than the one played first as before; ties: (SL_RETRY_EXPLORE_ORDER) a point
   * not lost first, then the latest turn. Within the turn: its question deviated at the fewest times, the turn's first of
   * them (the whole turn open). "Every line loses" no longer orders the turns: it is the rollout's 5-turn horizon (GQ5H's T1:
   * dead in no sample with the death on T7; its T4-T6 dead in every sample, so attempts 3-6 all went to T1) and
   * 9175DLPM2EFR F33 attempt 6 won at a point where every line died in every sample. Off: as before.
   */
  where?: boolean;
  /** SL_RETRY_EXPLORE_WHERE's decay (default WHERE_DECAY): only tools/sl-explore-where-replay.ts sets it, to compare. */
  whereDecay?: number;
  /**
   * SL_RETRY_EXPLORE_POTION (2026-10-03, P68P7CDJRDH3 F48 attempts 3-4; with `canon` or `tried`): a line is tried on a board
   * also by its cards, when it drinks no potion the failed attempt with those cards did not drink from that turn on
   * (cardsRepeat): a point whose other lines only move a potion is not open, and the target's `tried` carries the turns
   * by their cards (`cards`) for the replacement, the avoid and the row's `differs`. Off: by the whole plays, as before.
   */
  potion?: boolean;
}

/**
 * SL_RETRY_EXPLORE_WHERE: how much of a later turn's loss a turn carries, per turn between them (the next turn's at half,
 * the one after at a quarter, ...): a turn's plays decide its block against the hit that follows, and set up the turns
 * after it (9175DLPM2EFR F33: attempts 2-5 lost 33-36 HP after T3; attempts 4-5 changed T3 and still lost them; attempt 6
 * changed T2 and won).
 */
export const WHERE_DECAY = 0.5;

/** SL_RETRY_EXPLORE_WHERE: the HP the failed attempts lost on one turn (hpLostByTurn). */
export interface TurnLoss {
  turn: number;
  /** The mean over the failed attempts that played the turn. */
  mean: number;
  attempts: number;
}

/**
 * SL_RETRY_EXPLORE_WHERE: the HP the failed attempts before `attempt` lost on each turn, from their summaries: a turn's
 * loss is its start HP less the next turn's (what its plays and the enemy turn after them cost; a heal counts 0), and the
 * last turn of an attempt that died there (predicted_death, died) loses all the HP it began with; an unfinished attempt's
 * last turn is left out. The mean over the failed attempts that played the turn (attempt 1 too: its HP is the fight's as
 * much as the others'), one row an attempt (a finished row over an unfinished one). By turn, in order.
 */
export function hpLostByTurn(rows: readonly ExploreRow[], attempt: number): TurnLoss[] {
  const byAttempt = new Map<number, ExploreRow>();
  for (const row of rows) {
    if (row.attempt >= attempt || row.result === "won") continue;
    const had = byAttempt.get(row.attempt);
    if (!had || (had.result === "unfinished" && row.result !== "unfinished")) byAttempt.set(row.attempt, row);
  }
  const sums = new Map<number, { sum: number; n: number }>();
  for (const row of byAttempt.values()) {
    const turns = row.summary?.turns ?? [];
    const died = row.result === "predicted_death" || row.result === "died";
    for (let i = 0; i < turns.length; i += 1) {
      const turn = turns[i]!;
      if (turn.hp === null) continue;
      const next = turns[i + 1];
      let loss: number;
      if (next) {
        if (next.hp === null) continue;
        loss = Math.max(0, turn.hp - next.hp);
      } else if (died) loss = Math.max(0, turn.hp);
      else continue;
      const entry = sums.get(turn.turn) ?? { sum: 0, n: 0 };
      entry.sum += loss;
      entry.n += 1;
      sums.set(turn.turn, entry);
    }
  }
  return [...sums.entries()].sort((a, b) => a[0] - b[0]).map(([turn, { sum, n }]) => ({ turn, mean: sum / n, attempts: n }));
}

/**
 * SL_RETRY_EXPLORE_WHERE: each turn's weight: the HP lost on it (hpLostByTurn's mean) and on every later turn, that one's
 * at `decay` per turn between them (WHERE_DECAY). A turn before a big hit weighs about half of it; T1 weighs much only
 * when the first turns lost much (UK7R9A0NMCXL F33: 16-18 HP after T1, 15 after T2).
 */
export function whereWeights(losses: readonly TurnLoss[], decay = WHERE_DECAY): Map<number, number> {
  const out = new Map<number, number>();
  for (const { turn } of losses) {
    let weight = 0;
    for (const later of losses) if (later.turn >= turn) weight += later.mean * decay ** (later.turn - turn);
    out.set(turn, weight);
  }
  return out;
}

const tenth = (x: number): number => Math.round(x * 10) / 10;

/**
 * Every line of a question's record (the one played and its alternatives) with numbers loses in every sample: B2's share won
 * 0 where B2 weighed the point, else the rollout's share dead 1. A line without numbers (a potion option played: no line of
 * its own) is left out; none with numbers: not known to be lost.
 */
export function pointLost(point: SlPoint): boolean {
  const lines = [point.line, ...(point.alternatives ?? [])];
  const won = point.b2?.won;
  const share = (line: string): number | undefined => (won ? won[line] : point.dead?.[line]);
  const known = lines.filter((line) => share(line) !== undefined);
  if (known.length === 0) return false;
  return won ? known.every((line) => share(line)! <= 0) : known.every((line) => share(line)! >= 1 - 1e-9);
}

export function exploreTarget(rows: readonly ExploreRow[], attempt: number, options: ExploreTargetOptions = {}): { target: SlTarget | null; why: string } {
  if (attempt < 3) return { target: null, why: "attempt 2 plays as usual: it is the first attempt that knows the draws" };
  // A row left unfinished (the session ended in the attempt, a restart went on with it) after the attempt's finished one.
  const failed = rows
    .filter((row) => row.attempt >= 2 && row.attempt < attempt && row.result !== "won" && row.explore && Array.isArray(row.explore.points))
    .sort((a, b) => a.attempt - b.attempt || Number(a.result === "unfinished") - Number(b.result === "unfinished"));
  const reference = failed[0];
  if (!reference || reference.explore!.points.length === 0) return { target: null, why: "no earlier attempt from the 2nd recorded its decision points" };
  // SL_RETRY_EXPLORE_CANON / _TURN: the turns the failed attempts had through each board (with _CANON attempt 1 too, and
  // the rows from before the record rebuilt from their summary).
  const canonOn = options.canon === true;
  const allFailed = canonOn ? failedRows(rows, attempt, 1) : failed;
  const potionOn = options.potion === true;
  const tried = canonOn || options.tried === true ? triedByBoard(allFailed, reference, canonOn, potionOn) : null;
  // The lines played on each board by the failed attempts, and in which attempts.
  const played = new Map<string, { lines: Set<string>; attempts: Set<number> }>();
  for (const row of failed) {
    for (const point of row.explore!.points) {
      const entry = played.get(point.board) ?? { lines: new Set<string>(), attempts: new Set<number>() };
      entry.lines.add(point.line);
      entry.attempts.add(row.attempt);
      played.set(point.board, entry);
    }
  }
  const uses = new Map<string, number>();
  // SL_RETRY_EXPLORE_WHERE: the same by turn (any of its questions).
  const turnUses = new Map<string, number>();
  // SL_RETRY_EXPLORE_WHOLE: the attempts whose deviation there ended its turn as a failed attempt's (not a use), by board.
  const wasted = new Map<string, number[]>();
  for (const row of failed) {
    const target = row.explore!.target;
    if (!target || !row.explore!.deviation?.reached) continue;
    if (options.whole === true && row.explore!.deviation.differs === false) wasted.set(target.board, [...(wasted.get(target.board) ?? []), row.attempt]);
    else {
      uses.set(target.board, (uses.get(target.board) ?? 0) + 1);
      turnUses.set(String(target.turn), (turnUses.get(String(target.turn)) ?? 0) + 1);
    }
  }
  const points = reference.explore!.points;
  // Each question of the path with a line untried on its board, counted back from the death (1: the latest).
  const open: OpenPoint[] = [];
  const seen = new Set<string>();
  let back = 0;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const point = points[i]!;
    if (point.kind !== "question" || !point.alternatives) continue;
    // A board seen twice on the path (a re-plan): its latest record only.
    if (seen.has(point.board)) continue;
    seen.add(point.board);
    back += 1;
    const texts = played.get(point.board)?.lines ?? new Set<string>();
    // SL_RETRY_EXPLORE_CANON: nor a line whose turn a failed attempt had through this board (another order, attempt 1's).
    const turnsThere = canonOn ? tried?.get(point.board) : undefined;
    // SL_RETRY_EXPLORE_POTION: nor one with such a turn's cards, its potions drunk by that attempt from there on.
    const untried = point.alternatives.filter((line) => !texts.has(line) && !(turnsThere && point.canon?.[line] !== undefined && entryHas(turnsThere, point.canon[line])));
    // Every untried line dies more often in the rollout than the one played (no numbers: not known to be worse).
    const own = point.dead?.[point.line];
    const worse = own !== undefined && untried.every((line) => (point.dead?.[line] ?? -1) > own + 1e-9);
    if (untried.length > 0) open.push({ point, back, untried, worse, lost: options.aliveFirst === true && pointLost(point) });
  }
  if (open.length === 0) return { target: null, why: `no question on attempt ${reference.attempt}'s path has a line no failed attempt played` };
  let chosen: OpenPoint;
  let why: string;
  let where: SlTarget["where"] | undefined;
  if (options.where === true) {
    // SL_RETRY_EXPLORE_WHERE: the turn where the failed attempts lost their HP, another turn each attempt.
    ({ chosen, why, where } = whereChoice(open, hpLostByTurn(rows, attempt), turnUses, uses, options.aliveFirst === true, options.whereDecay ?? WHERE_DECAY));
  } else {
    // SL_RETRY_EXPLORE_ORDER: the points where some line does not lose in every sample first (without it, none is lost).
    const alive = open.some((entry) => !entry.lost) ? open.filter((entry) => !entry.lost) : open;
    const fewest = Math.min(...alive.map((entry) => uses.get(entry.point.board) ?? 0));
    const least = alive.filter((entry) => (uses.get(entry.point.board) ?? 0) === fewest);
    const pick = least.find((entry) => !entry.worse) ?? least[0]!;
    chosen = pick;
    const lostPassed = alive === open ? [] : open.filter((entry) => entry.lost && entry.back < pick.back);
    const lostWhy =
      lostPassed.length > 0
        ? `; passed over ${lostPassed.map((entry) => `T${entry.point.turn ?? "?"}`).join(", ")}, where every line loses in every sample`
        : pick.lost
          ? "; every line loses in every sample here, as on every point left"
          : "";
    why = `${pick.untried.length} line${pick.untried.length === 1 ? "" : "s"} shown there never played on that board${pick.worse ? "; all dying more often in the rollout than the one played, as on every other point left" : ""}${least.some((entry) => entry.worse && entry.back < pick.back) ? `; passed over ${least.filter((entry) => entry.worse && entry.back < pick.back).map((entry) => `T${entry.point.turn ?? "?"}`).join(", ")}, whose untried lines all die more often in the rollout` : ""}${lostWhy}`;
  }
  const entry = played.get(chosen.point.board)!;
  const round = uses.get(chosen.point.board) ?? 0;
  const again = wasted.get(chosen.point.board) ?? [];
  const againText = again.length > 0 ? ` (attempt${again.length === 1 ? "" : "s"} ${again.join(", ")} deviated there but ended the turn as a failed attempt's: again, another line)` : "";
  // SL_RETRY_EXPLORE_WHERE: the turn's deviations at its other questions.
  const elsewhere = where ? where.turnRound - round : 0;
  const elsewhereText = elsewhere > 0 ? ` (T${chosen.point.turn ?? "?"} deviated at ${elsewhere} other question${elsewhere === 1 ? "" : "s"} before)` : "";
  const point = `T${chosen.point.turn ?? "?"}, the ${ordinal(chosen.back)} question before attempt ${reference.attempt}'s death on T${reference.turns}${round > 0 ? ` (deviated at ${round} time${round === 1 ? "" : "s"} before: another untried line)` : ""}${elsewhereText}${againText}`;
  const turnsThere = tried?.get(chosen.point.board);
  // SL_RETRY_EXPLORE_CANON: the attempts whose turns came through the board count among those that played there.
  const attempts = new Set([...entry.attempts, ...(canonOn && turnsThere ? turnsThere.attempts : [])]);
  return {
    target: {
      board: chosen.point.board,
      turn: chosen.point.turn,
      reference: reference.attempt,
      back: chosen.back,
      round,
      excluded: [...entry.lines],
      attempts: [...attempts].sort((a, b) => a - b),
      point,
      ...(tried ? { tried: triedOf(turnsThere, potionOn) } : {}),
      ...(where ? { where } : {}),
    },
    why,
  };
}

/** A question of the reference path with a line untried on its board (exploreTarget's candidates). */
interface OpenPoint {
  point: SlPoint;
  /** Counted back from the death (1: the latest question of the path). */
  back: number;
  untried: string[];
  /** Every untried line dies more often in the rollout than the one played. */
  worse: boolean;
  /** SL_RETRY_EXPLORE_ORDER: every line of the record loses in every sample (pointLost). */
  lost: boolean;
}

/**
 * SL_RETRY_EXPLORE_WHERE: exploreTarget's choice among `open` by where the failed attempts lost their HP (`losses`,
 * hpLostByTurn). The turns deviated at the fewest times (`turnUses`, at any of their questions) first; of them the points
 * with an untried line not worse than the one played, when there are some (as before); of those the turn with the largest
 * weight (whereWeights); ties: with `aliveFirst` (SL_RETRY_EXPLORE_ORDER) a point not lost first, then the latest turn.
 * Within the turn: the question deviated at the fewest times (`uses`), the turn's first of them (the whole turn open).
 */
function whereChoice(open: readonly OpenPoint[], losses: readonly TurnLoss[], turnUses: ReadonlyMap<string, number>, uses: ReadonlyMap<string, number>, aliveFirst: boolean, decay: number): { chosen: OpenPoint; why: string; where: NonNullable<SlTarget["where"]> } {
  const weights = whereWeights(losses, decay);
  const weightOf = (entry: OpenPoint): number => (entry.point.turn === null ? 0 : (weights.get(entry.point.turn) ?? 0));
  const turnUse = (entry: OpenPoint): number => turnUses.get(String(entry.point.turn)) ?? 0;
  const turnOf = (entry: OpenPoint): number => entry.point.turn ?? -Infinity;
  const fewest = Math.min(...open.map(turnUse));
  const least = open.filter((entry) => turnUse(entry) === fewest);
  const better = least.filter((entry) => !entry.worse);
  let pool = better.length > 0 ? better : least;
  const top = Math.max(...pool.map(weightOf));
  pool = pool.filter((entry) => weightOf(entry) >= top - 1e-9);
  if (aliveFirst && pool.some((entry) => !entry.lost)) pool = pool.filter((entry) => !entry.lost);
  const latest = Math.max(...pool.map(turnOf));
  pool = pool.filter((entry) => turnOf(entry) === latest);
  const fewestHere = Math.min(...pool.map((entry) => uses.get(entry.point.board) ?? 0));
  pool = pool.filter((entry) => (uses.get(entry.point.board) ?? 0) === fewestHere);
  const chosen = pool.reduce((first, entry) => (entry.back > first.back ? entry : first));
  const weight = weightOf(chosen);
  const turn = (entry: OpenPoint): string => `T${entry.point.turn ?? "?"}`;
  // The open turns, one each (its weight, and how many times it was deviated at).
  const turns = new Map<string, OpenPoint>();
  for (const entry of open) if (!turns.has(turn(entry))) turns.set(turn(entry), entry);
  const others = [...turns.values()]
    .filter((entry) => entry.point.turn !== chosen.point.turn)
    .sort((a, b) => weightOf(b) - weightOf(a) || turnOf(b) - turnOf(a))
    .map((entry) => `${turn(entry)} ${tenth(weightOf(entry))}${turnUse(entry) > 0 ? ` (deviated at ${turnUse(entry)})` : ""}`);
  const passed = [...new Set(least.filter((entry) => entry.worse && !chosen.worse && weightOf(entry) > weight + 1e-9).map(turn))];
  const own = losses.find((loss) => loss.turn === chosen.point.turn)?.mean ?? 0;
  const why =
    `${chosen.untried.length} line${chosen.untried.length === 1 ? "" : "s"} shown there never played on that board` +
    `; where the failed attempts lost their HP: ${turn(chosen)} weighs ${tenth(weight)} (${tenth(own)} lost on it on average, the later turns' losses at ${decay} a turn)` +
    `, the most of the turns deviated at the fewest times (${fewest === 0 ? "none" : `${fewest} each`})` +
    `${chosen.worse ? "; all dying more often in the rollout than the one played, as on every other point left" : ""}` +
    `${passed.length > 0 ? `; passed over ${passed.join(", ")}, whose untried lines all die more often in the rollout` : ""}` +
    `${chosen.lost ? "; every line loses in every sample here (the rollout's horizon: it does not order the turns)" : ""}` +
    `${others.length > 0 ? `; the other turns: ${others.join(", ")}` : ""}`;
  const where = {
    weight: tenth(weight),
    turnRound: turnUse(chosen),
    lost: Object.fromEntries(losses.map((loss) => [`T${loss.turn}`, tenth(loss.mean)])),
    weights: Object.fromEntries([...turns.values()].sort((a, b) => turnOf(a) - turnOf(b)).map((entry) => [turn(entry), tenth(weightOf(entry))])),
  };
  return { chosen, why, where };
}

/**
 * SL_RETRY_EXPLORE_REPLAY: the reference attempt's lines on the boards before the deviation point (its path up to the
 * target's board, the latest line where a board came twice), by board.
 */
export function replayPath(rows: readonly ExploreRow[], target: SlTarget): Map<string, string> {
  return new Map([...replayPoints(rows, target)].map(([board, point]) => [board, point.line]));
}

/** The reference attempt's points before the deviation point (replayPath's boards), by board: their lines and canon. */
export function replayPoints(rows: readonly ExploreRow[], target: SlTarget): Map<string, SlPoint> {
  const reference = rows.find((row) => row.attempt === target.reference && row.explore && Array.isArray(row.explore.points));
  const points = reference?.explore?.points ?? [];
  let end = -1;
  for (let i = points.length - 1; i >= 0; i -= 1) if (points[i]!.board === target.board) { end = i; break; }
  const out = new Map<string, SlPoint>();
  for (const point of points.slice(0, Math.max(0, end))) if (point.board !== target.board) out.set(point.board, point);
  return out;
}

/**
 * SL_RETRY_EXPLORE_REPLAY_PLAYS: what the reference attempt played from `board` (a board of replayPoints) on: its turn
 * record's plays from the board's place up to the place of its next decision point's board that turn, or to the turn's end
 * (playKey, in order). Null without a turn record of it (a row from before SL_RETRY_EXPLORE_CANON), or when its next decision
 * point's board is not in the record.
 */
export function replayPlays(rows: readonly ExploreRow[], target: SlTarget, board: string): string[] | null {
  const reference = rows.find((row) => row.attempt === target.reference && row.explore && Array.isArray(row.explore.points));
  const points = reference?.explore?.points ?? [];
  const turns = reference?.explore?.turns;
  if (!turns) return null;
  let end = -1;
  for (let i = points.length - 1; i >= 0; i -= 1) if (points[i]!.board === target.board) { end = i; break; }
  let at = -1;
  for (let i = end - 1; i >= 0; i -= 1) if (points[i]!.board === board) { at = i; break; }
  if (at < 0) return null;
  const point = points[at]!;
  const record = turns.find((turn) => turn.turn === point.turn && turn.boards.some((entry) => entry.board === board));
  if (!record) return null;
  const start = record.boards.filter((entry) => entry.board === board).at(-1)!.at;
  const next = points[at + 1];
  let stop = record.plays.length;
  if (next && next.turn === point.turn) {
    const entry = record.boards.find((other) => other.board === next.board && other.at >= start);
    if (!entry) return null;
    stop = entry.at;
  }
  return record.plays.slice(start, stop);
}

/**
 * SL_RETRY_EXPLORE_REPLAY_DEVIATE: on `board`, what the failed attempts before `attempt` played there, as exploreTarget's
 * target carries it for its point: the lines of their decision points on the board, the attempts, and (`canon` / `potion`,
 * SL_RETRY_EXPLORE_CANON / _POTION) the turns through it (exploreTried). Null when no failed attempt decided on the board.
 */
export function boardTried(rows: readonly ExploreRow[], attempt: number, board: string, options: { canon?: boolean; potion?: boolean } = {}): { excluded: string[]; attempts: number[]; tried?: SlTried } | null {
  const failed = rows.filter((row) => row.attempt < attempt && row.result !== "won" && row.explore && Array.isArray(row.explore.points));
  const lines = new Set<string>();
  const attempts = new Set<number>();
  for (const row of failed) {
    for (const point of row.explore!.points) {
      if (point.board !== board) continue;
      lines.add(point.line);
      attempts.add(row.attempt);
    }
  }
  const turns = options.canon === true || options.potion === true ? exploreTried(rows, attempt, board, options) : null;
  for (const a of turns?.attempts ?? []) attempts.add(a);
  if (attempts.size === 0) return null;
  return { excluded: [...lines], attempts: [...attempts].sort((a, b) => a - b), ...(turns ? { tried: turns.tried } : {}) };
}

/**
 * SL_RETRY_EXPLORE_SECOND: attempt 2's plan from attempt 1's row (failed, its turn record there: SL_RETRY_EXPLORE_CANON):
 * the turn where attempt 1 lost the most HP (whereWeights over its losses, the latest of the heaviest), up to attempt 1's
 * last turn. Null without such a row or losses.
 */
export function secondPlan(rows: readonly ExploreRow[], decay = WHERE_DECAY): NonNullable<SlExploreRecord["second"]> | null {
  const one = rows.find((row) => row.attempt === 1 && row.result !== "won" && row.result !== "unfinished");
  if (!one || !one.explore?.turns || one.explore.turns.length === 0) return null;
  const weights = whereWeights(hpLostByTurn([one], 2), decay);
  if (weights.size === 0) return null;
  const top = Math.max(...weights.values());
  const turn = Math.max(...[...weights].filter(([, weight]) => weight >= top - 1e-9).map(([turnNo]) => turnNo));
  return { turn, until: Math.max(turn, one.turns), weights: Object.fromEntries([...weights].sort((a, b) => a[0] - b[0]).map(([turnNo, weight]) => [`T${turnNo}`, tenth(weight)])) };
}

/**
 * SL_RETRY_EXPLORE_REPLAY: on a board of the reference attempt's path before the deviation point, the line to play instead
 * of the answer (`pick`): the reference attempt's line there (`replay.line`, among `shown`: the shown lines and every random
 * potion's), unless the answer is that line already, wins the fight this turn (never changed), or survives this turn where
 * that line dies (`pickDies`); null when it is not shown (the attempt then plays the answer, and the replay stops).
 * SL_RETRY_EXPLORE_CANON (`replay.canon`, the lines' canon): the same text first; else the same turn's plays are the
 * reference's line (the answer kept when it has them, else the first shown line that has them).
 */
export function replayChoice<P>(pick: ExplorePick<P>, pickDies: boolean, shown: readonly ExploreLine<P>[], replay: { line: string; reference: number; point: string; canon?: string }): { line: ExploreLine<P> | null; reason: string } {
  const at = replay.point.split(",")[0];
  if (pick.text === replay.line) return { line: null, reason: `the answer is attempt ${replay.reference}'s line` };
  if (pick.wins) return { line: null, reason: "the answer wins the fight this turn: never changed" };
  const sameText = shown.find((line) => line.text === replay.line);
  const canon = replay.canon;
  if (!sameText && canon !== undefined && pick.canon === canon) return { line: null, reason: `the answer plays attempt ${replay.reference}'s turn here (its cards and targets, in another order or text)` };
  const ref = sameText ?? (canon !== undefined ? shown.find((line) => line.canon === canon) : undefined);
  if (!ref) return { line: null, reason: `attempt ${replay.reference}'s line is not among the options` };
  if (ref.dies && !pickDies) return { line: null, reason: `attempt ${replay.reference}'s line dies this turn, the answer does not` };
  return { line: ref, reason: `attempt ${replay.reference}'s line on this board, replayed to reach ${at}` };
}

/** A shown line, as exploreReplacement weighs it. */
export interface ExploreLine<P> {
  plan: P;
  /** The line as the options write it; a random potion's Monte Carlo line: its option ("drink X, then re-plan"). */
  text: string;
  /** The solver: it dies this turn / wins the fight this turn. */
  dies: boolean;
  wins: boolean;
  /** The potion ids it drinks. */
  potions: string[];
  /** SL_RETRY_EXPLORE_CANON / _TURN: the turn's plays if it is played (turnCanon), and as the summary writes them (looseCanon). */
  canon?: string;
  loose?: string;
  /**
   * SL_RETRY_EXPLORE_WHOLE: it draws before the turn is over (re-planned after the draw), and the plays sure to be made, the
   * turn's so far and its own up to the draw (turnCanon; the whole line's when it does not draw). See mayRepeat.
   */
  open?: boolean;
  committed?: string;
}

/** The pick about to be played: its line (null: a potion option, drink then re-plan), text and potions. */
export interface ExplorePick<P> {
  plan: P | null;
  text: string;
  potions: string[];
  wins: boolean;
  /** A random potion's option (plan null): its Monte Carlo line, the line B2 rated for it (SL_RETRY_EXPLORE_B2). */
  rated?: P | null;
  /** As ExploreLine's. */
  canon?: string;
  loose?: string;
  open?: boolean;
  committed?: string;
}

/**
 * SL_RETRY_EXPLORE_B2 on a boss B2 is trusted on: B2's numbers for the gate. `notWorse`: B2 rates `plan` no worse than
 * `than` (B2's own tie rule: its win rate at most `rule`, "2 paired standard errors", below; null: no numbers for one of
 * them); `win`: a line's calibrated win rate (null: no numbers).
 */
export interface ExploreB2<P> {
  notWorse: (plan: P, than: P) => boolean | null;
  win: (plan: P) => number | null;
  rule: string;
  /** A line's raw share of samples won (null: no numbers); recorded for SL_RETRY_EXPLORE_ORDER. */
  won?: (plan: P) => number | null;
}

/**
 * The shown lines that could replace `pick` (whatever was played before): another line, drinking no potion the pick does not
 * (code never adds a drink of its own: the HP guard's rule; `drinks`, SL_RETRY_EXPLORE_BOSS_POTIONS in a boss fight: any
 * line, potions cost nothing there), surviving this turn when one does. In the question's order, one per text.
 */
export function exploreAlternatives<P>(pick: ExplorePick<P>, shown: readonly ExploreLine<P>[], drinks = false): ExploreLine<P>[] {
  const seen = new Set<string>([pick.text]);
  const out: ExploreLine<P>[] = [];
  for (const line of shown) {
    if (seen.has(line.text) || (!drinks && !line.potions.every((id) => pick.potions.includes(id)))) continue;
    seen.add(line.text);
    out.push(line);
  }
  return out.some((line) => !line.dies) ? out.filter((line) => !line.dies) : out;
}

/**
 * The record of a question's point (SlPoint's line, alternatives, dead and b2) for `line`, the line played there: the
 * shown lines that could replace it (exploreAlternatives), the rollout's share of samples dead for it and each of them
 * (`deathShare`, rounded; null: no estimate), and with `b2` where B2 has numbers for the line, B2's calibrated win rates
 * and the alternatives it rates no worse. The planner's record and tools/sl-explore-replay.ts's.
 */
export function explorePoint<P>(line: ExplorePick<P>, shown: readonly ExploreLine<P>[], opts: { drinks?: boolean; deathShare: (plan: P) => number | null; b2?: ExploreB2<P> | null }): Pick<SlPoint, "line" | "alternatives" | "dead" | "b2" | "canon"> {
  const alternatives = exploreAlternatives(line, shown, opts.drinks === true);
  const round = (x: number) => Math.round(x * 1000) / 1000;
  const dead = Object.fromEntries(
    [...(line.plan ? [{ text: line.text, plan: line.plan }] : []), ...alternatives].flatMap((entry) => {
      const share = opts.deathShare(entry.plan);
      return share !== null ? [[entry.text, round(share)]] : [];
    }),
  );
  const rated = line.plan ?? line.rated ?? null;
  const b2 = opts.b2 && rated !== null && opts.b2.win(rated) !== null ? opts.b2 : null;
  const b2Record = b2
    ? {
        win: Object.fromEntries(
          [{ text: line.text, plan: rated! }, ...alternatives].flatMap((entry) => {
            const win = b2.win(entry.plan);
            return win !== null ? [[entry.text, round(win)]] : [];
          }),
        ),
        notWorse: alternatives.filter((entry) => b2.notWorse(entry.plan, rated!) === true).map((entry) => entry.text),
        ...(b2.won
          ? {
              won: Object.fromEntries(
                [{ text: line.text, plan: rated! }, ...alternatives].flatMap((entry) => {
                  const won = b2.won!(entry.plan);
                  return won !== null ? [[entry.text, round(won)]] : [];
                }),
              ),
            }
          : {}),
      }
    : null;
  // SL_RETRY_EXPLORE_CANON / _TURN: each line's turn (the pick has one when they are on).
  const canon = line.canon !== undefined ? Object.fromEntries([line, ...alternatives].flatMap((entry) => (entry.canon !== undefined ? [[entry.text, entry.canon]] : []))) : null;
  return { line: line.text, alternatives: alternatives.map((entry) => entry.text), ...(Object.keys(dead).length > 0 ? { dead } : {}), ...(b2Record ? { b2: b2Record } : {}), ...(canon ? { canon } : {}) };
}

export interface ExploreChoice<P> {
  replacement: ExploreLine<P> | null;
  reason: string;
  /** What weighed "not worse" (null: nothing was weighed, no replacement looked for). */
  gate: "b2" | "rollout" | null;
}

/**
 * The line played instead of `pick` on the deviation point's board (docs/sl.md §11.3): none when the pick wins the fight
 * this turn or was not played there before; else, among the alternatives no failed attempt played there, those not worse
 * than the pick (all of them when none is), the first by the question's ranking (`rank`: B2's where it ranks, else the
 * rollout's; null: the question's order). Not worse: with `b2` (SL_RETRY_EXPLORE_B2 on a boss B2 is trusted on) and B2's
 * numbers for the pick, B2 rates it no worse (63WBEEF2JVM5 F33: B2 rated several of the rollout's replacements far below
 * the pick, T2 21.9% against 6.3%); else the rollout does not see it dying more often (deathShare). `drinks`
 * (SL_RETRY_EXPLORE_BOSS_POTIONS in a boss fight): the lines drinking a potion the pick does not are alternatives too.
 * Every alternative dying in every sample still gives one: the pick is known to fail.
 * `whole` (SL_RETRY_EXPLORE_WHOLE): a pick not tried here whose turn may still end as a failed one after its draw
 * (mayRepeat) gives way to the best line that cannot (its turn known to differ), surviving this turn and not worse than
 * the pick; without one it is played as answered (the avoid keeps the rest of the turn off the failed turns). Among the
 * untried lines replacing a tried pick, the ones that cannot come first (within the gate's pool).
 * SL_RETRY_EXPLORE_POTION (`tried.cards`): a line with a failed turn's cards whose potions that attempt drank from here on
 * is tried too (triedHas), the pick and the alternatives alike; a pick tried only so says it (POTION_ONLY).
 */
export function exploreReplacement<P>(args: {
  pick: ExplorePick<P>;
  shown: readonly ExploreLine<P>[];
  excluded: readonly string[];
  deathShare: (plan: P) => number | null;
  rank: (plans: P[]) => P | null;
  drinks?: boolean;
  b2?: ExploreB2<P> | null;
  /**
   * SL_RETRY_EXPLORE_CANON / _TURN: the turns failed attempts had through the board (by the lines' canon / loose): a line
   * ending the turn with one of them is tried too. With `avoid` (SL_RETRY_EXPLORE_TURN, later in the deviation's turn):
   * only these count (no text played on this board).
   */
  tried?: SlTried | null;
  avoid?: boolean;
  /** SL_RETRY_EXPLORE_WHOLE: judge the lines by the turn they may end with (mayRepeat: `open` and `committed`). */
  whole?: boolean;
}): ExploreChoice<P> {
  const { pick } = args;
  if (pick.wins) return { replacement: null, reason: "the line wins the fight this turn: never changed", gate: null };
  const excluded = new Set(args.excluded);
  const tried = args.tried ?? null;
  const isTried = (line: TriedKey): boolean => excluded.has(line.text) || triedHas(tried, line);
  // SL_RETRY_EXPLORE_WHOLE: not tried, but its turn may end as a failed one after its draw; `safe`: known to end otherwise.
  const repeats = (line: TriedKey & { open?: boolean | undefined; committed?: string | undefined }): boolean => args.whole === true && !isTried(line) && mayRepeat(tried, line);
  const safe = (line: ExploreLine<P>): boolean => !isTried(line) && !repeats(line);
  // An attempt whose plays on this board could not be read may have played the pick here: not known to be untried.
  const unknown = !isTried(pick) && (tried?.unknown?.length ?? 0) > 0 ? tried!.unknown! : null;
  if (!isTried(pick) && !unknown) {
    if (repeats(pick)) {
      const may = MAY_REPEAT;
      const candidates = exploreAlternatives(pick, args.shown, args.drinks === true).filter((line) => safe(line) && !line.dies);
      const choice = candidates.length > 0 ? replacementAmong(args, candidates, { notWorseOnly: true }) : null;
      if (choice?.replacement) return { ...choice, reason: `${may}; ${choice.reason}` };
      return {
        replacement: null,
        reason: `${may}, but ${candidates.length === 0 ? "no shown line that survives this turn is known to end it otherwise" : `none known to end it otherwise is not worse (${choice!.reason})`}: played as answered, the rest of the turn kept off the failed turns`,
        gate: choice?.gate ?? null,
      };
    }
    return { replacement: null, reason: args.avoid ? "the pick does not end the turn as a failed attempt's did through the deviation point: played as answered" : "the pick was not played on this board before: played as answered", gate: null };
  }
  // SL_RETRY_EXPLORE_POTION: the pick is tried by its cards only (its potions moved, not new): said so.
  const byCards = !excluded.has(pick.text) && triedHow(tried, pick) === "cards" ? `; ${POTION_ONLY}` : "";
  const untried = exploreAlternatives(pick, args.shown, args.drinks === true).filter((line) => !isTried(line));
  if (untried.length === 0) return { replacement: null, reason: `${args.avoid ? "no shown line left that ends the turn otherwise than a failed attempt's" : "no shown line left that no failed attempt played here"}${byCards}`, gate: null };
  const known = unknown ? `; attempt${unknown.length === 1 ? "" : "s"} ${unknown.join(", ")} may have played the pick here (plays logged without their card)` : "";
  const choice = replacementAmong(args, untried, args.whole === true ? { prefer: safe } : {});
  return { ...choice, reason: `${choice.reason}${known}${byCards}` };
}

/**
 * exploreReplacement's ranking among the untried lines, with its gate (B2's on a trusted boss, else the rollout's).
 * SL_RETRY_EXPLORE_WHOLE: `prefer`, the lines of the gate's pool first that it holds for (the ones whose turn cannot end as
 * a failed one after a draw), when there are both kinds; `notWorseOnly`, no replacement unless one is not worse.
 */
function replacementAmong<P>(
  args: { pick: ExplorePick<P>; deathShare: (plan: P) => number | null; rank: (plans: P[]) => P | null; b2?: ExploreB2<P> | null },
  untried: ExploreLine<P>[],
  opts: { prefer?: (line: ExploreLine<P>) => boolean; notWorseOnly?: boolean } = {},
): ExploreChoice<P> {
  const { pick } = args;
  const rated = pick.plan ?? pick.rated ?? null;
  const b2 = args.b2 && rated !== null && args.b2.win(rated) !== null ? args.b2 : null;
  /** The gate's pool narrowed to the preferred lines when some are and some are not, and the note saying so. */
  const narrow = (pool: ExploreLine<P>[]): { pool: ExploreLine<P>[]; note: string } => {
    const preferred = opts.prefer ? pool.filter(opts.prefer) : [];
    return preferred.length > 0 && preferred.length < pool.length ? { pool: preferred, note: "; of them, one whose turn cannot end as a failed attempt's after a draw" } : { pool, note: "" };
  };
  if (b2) {
    const notWorse = untried.filter((line) => b2.notWorse(line.plan, rated!) === true);
    if (opts.notWorseOnly && notWorse.length === 0) return { replacement: null, reason: `B2 rates every such line worse (win rate more than ${b2.rule} below the pick's)`, gate: "b2" };
    const { pool, note } = narrow(notWorse.length > 0 ? notWorse : untried);
    const ranked = args.rank(pool.map((line) => line.plan));
    const replacement = pool.find((line) => line.plan === ranked) ?? pool[0]!;
    const why =
      notWorse.length > 0
        ? `the best untried line by the question's ranking, among those B2 rates no worse (win rate at most ${b2.rule} below the pick's)`
        : `the best untried line by the question's ranking (B2 rates every untried line worse: win rate more than ${b2.rule} below the pick's; the pick is known to fail)`;
    return { replacement, reason: `${why}${note}`, gate: "b2" };
  }
  const own = pick.plan === null ? null : args.deathShare(pick.plan);
  const notWorse = own === null ? [] : untried.filter((line) => {
    const share = args.deathShare(line.plan);
    return share !== null && share <= own + 1e-9;
  });
  if (opts.notWorseOnly && notWorse.length === 0) return { replacement: null, reason: own === null ? "no rollout numbers for the pick" : "every such line dies more often in the rollout", gate: "rollout" };
  const { pool, note } = narrow(notWorse.length > 0 ? notWorse : untried);
  const ranked = args.rank(pool.map((line) => line.plan));
  const replacement = pool.find((line) => line.plan === ranked) ?? pool[0]!;
  const why =
    notWorse.length > 0
      ? "the best untried line by the question's ranking, among those the rollout does not see dying more often"
      : own === null
        ? "the best untried line by the question's ranking"
        : "the best untried line by the question's ranking (every untried line dies more often in the rollout; the pick is known to fail)";
  return { replacement, reason: `${why}${note}`, gate: "rollout" };
}

/**
 * The question's ranking among `plans` where B2 ranks the boss (combat-plan simRanks): B2's first of them by its `order`;
 * those B2 cannot tell from it (`keyOf`: the same win rate and HP lost when won, as the question shows them) go to `byRollout`.
 * 1YXMHF6FSPK4 F33: every line 0% won in B2, its order only the question's; the rollout still tells them apart.
 */
export function rankByOrder<P>(plans: readonly P[], order: readonly P[], keyOf: (plan: P) => string | null, byRollout: (plans: P[]) => P | null): P | null {
  const first = order.find((plan) => plans.includes(plan));
  if (first === undefined) return byRollout([...plans]);
  const key = keyOf(first);
  const tied = key === null ? [] : plans.filter((plan) => keyOf(plan) === key);
  return tied.length >= 2 ? (byRollout(tied) ?? first) : first;
}
