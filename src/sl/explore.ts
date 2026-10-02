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
 *   (the only line, a dominating line, a lethal, every line dying) have no line it would play instead.
 * - On that board only, the line about to be played, when a failed attempt played it there, is replaced after Jev's answer
 *   (exploreReplacement): by the shown line the question's ranking (B2's where it ranks, its ties the rollout's; else the rollout's) puts first
 *   among those no failed attempt played there, preferring the ones the rollout does not see dying more often, never one
 *   dying this turn while one survives, never one drinking a potion the pick does not drink. Every other board plays as
 *   usual. The decision row says so (`sl_explore`).
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
  /** The line is this attempt's deviation (it replaced a line a failed attempt played here). */
  explored?: true;
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
}

/** What came of an attempt's deviation point. */
export interface SlDeviation {
  /** The board came up in this attempt (the attempt's own play may leave the path before it). */
  reached: boolean;
  /** The line about to be played there, and what was played instead (null: nothing replaced). */
  original: string | null;
  replacement: string | null;
  reason: string;
}

/** The attempt row's `explore` (SL_RETRY_EXPLORE on, attempts from the 2nd). */
export interface SlExploreRecord {
  points: SlPoint[];
  /** Attempts 3+: the deviation point aimed at (null: none, `why`). */
  target: SlTarget | null;
  why?: string;
  deviation?: SlDeviation;
}

/** The planner's part (env.sl.explore): record the lines; on the deviation point's board, `deviate`. */
export interface SlExploreEnv {
  deviate?: { point: string; excluded: string[]; attempts: number[] };
}

/** The steps of a line, as the options and the decision rows write them ("A -> X, B"; "end turn"). */
export function lineText(steps: readonly { name: string; targetName?: string | null | undefined }[]): string {
  return steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", ") || "end turn";
}

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
 * The board a decision is made on, stable across the attempts at a fight (the same board in attempt 2 and attempt 5 is
 * the same key): the turn, the hand (id, upgrade, cost, playable; sorted), the draw, discard and exhaust piles, our HP,
 * block, energy, powers and the turn's plays so far, the potions by slot, the relics' counters, and each enemy's id, HP,
 * block, powers, move and intents. Nothing that changes from one attempt to the next on the same board (times, ids of
 * decisions, the run's gold or the map). A sha1, 16 hex digits.
 */
export function slBoardKey(state: GameState): string {
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
      .map((relic) => `${str(relic["relic_id"])}:${String(relic["stack"])}`)
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
}

const ordinal = (n: number): string => (n === 1 ? "latest" : `${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"} latest`);

/**
 * The deviation point of `attempt` (3 or later) from the earlier attempts' rows at the fight (all failed: the fight is being
 * retried). The path is the first attempt from the 2nd that recorded its points (attempt 2 is the first that knows the draws:
 * it plays as usual; every later attempt plays its path until its own deviation). A point qualifies when it is a question
 * and some line shown there was never played on that board by a failed attempt (attempt 1 does not count: it did not know
 * the draws, so the same board's lines read differently, 63WBEEF2JVM5 F33 T1 "打击, 剑柄打击, potion" against attempt 2's
 * "..., 欺凌" for the same plays). The point deviated at the fewest times so far comes first, the latest of those: attempt 3
 * the question closest to the death, attempt 4 the one before it, and so on back, then round again (docs/sl.md §11.2).
 * Among those, a point with an untried line the rollout does not see dying more often than the one played comes before one
 * whose untried lines all do (`dead`; the offline evaluation, 63WBEEF2JVM5 F33 T5: the only other line, Blood Wall, dead in
 * 24 of 24 samples against 20, B2 0% won against 11%: a retry spent on it). A deviation counts when its board came up
 * (`deviation.reached`). Null (with why) when there is no such point.
 */
export function exploreTarget(rows: readonly ExploreRow[], attempt: number): { target: SlTarget | null; why: string } {
  if (attempt < 3) return { target: null, why: "attempt 2 plays as usual: it is the first attempt that knows the draws" };
  // A row left unfinished (the session ended in the attempt, a restart went on with it) after the attempt's finished one.
  const failed = rows
    .filter((row) => row.attempt >= 2 && row.attempt < attempt && row.result !== "won" && row.explore && Array.isArray(row.explore.points))
    .sort((a, b) => a.attempt - b.attempt || Number(a.result === "unfinished") - Number(b.result === "unfinished"));
  const reference = failed[0];
  if (!reference || reference.explore!.points.length === 0) return { target: null, why: "no earlier attempt from the 2nd recorded its decision points" };
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
  for (const row of failed) {
    const target = row.explore!.target;
    if (target && row.explore!.deviation?.reached) uses.set(target.board, (uses.get(target.board) ?? 0) + 1);
  }
  const points = reference.explore!.points;
  // Each question of the path with a line untried on its board, counted back from the death (1: the latest).
  const open: { point: SlPoint; back: number; untried: string[]; worse: boolean }[] = [];
  const seen = new Set<string>();
  let back = 0;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const point = points[i]!;
    if (point.kind !== "question" || !point.alternatives) continue;
    // A board seen twice on the path (a re-plan): its latest record only.
    if (seen.has(point.board)) continue;
    seen.add(point.board);
    back += 1;
    const tried = played.get(point.board)?.lines ?? new Set<string>();
    const untried = point.alternatives.filter((line) => !tried.has(line));
    // Every untried line dies more often in the rollout than the one played (no numbers: not known to be worse).
    const own = point.dead?.[point.line];
    const worse = own !== undefined && untried.every((line) => (point.dead?.[line] ?? -1) > own + 1e-9);
    if (untried.length > 0) open.push({ point, back, untried, worse });
  }
  if (open.length === 0) return { target: null, why: `no question on attempt ${reference.attempt}'s path has a line no failed attempt played` };
  const fewest = Math.min(...open.map((entry) => uses.get(entry.point.board) ?? 0));
  const least = open.filter((entry) => (uses.get(entry.point.board) ?? 0) === fewest);
  const chosen = least.find((entry) => !entry.worse) ?? least[0]!;
  const entry = played.get(chosen.point.board)!;
  const round = uses.get(chosen.point.board) ?? 0;
  const point = `T${chosen.point.turn ?? "?"}, the ${ordinal(chosen.back)} question before attempt ${reference.attempt}'s death on T${reference.turns}${round > 0 ? ` (deviated at ${round} time${round === 1 ? "" : "s"} before: another untried line)` : ""}`;
  return {
    target: {
      board: chosen.point.board,
      turn: chosen.point.turn,
      reference: reference.attempt,
      back: chosen.back,
      round,
      excluded: [...entry.lines],
      attempts: [...entry.attempts].sort((a, b) => a - b),
      point,
    },
    why: `${chosen.untried.length} line${chosen.untried.length === 1 ? "" : "s"} shown there never played on that board${chosen.worse ? "; all dying more often in the rollout than the one played, as on every other point left" : ""}${least.some((entry) => entry.worse && entry.back < chosen.back) ? `; passed over ${least.filter((entry) => entry.worse && entry.back < chosen.back).map((entry) => `T${entry.point.turn ?? "?"}`).join(", ")}, whose untried lines all die more often in the rollout` : ""}`,
  };
}

/** A shown line, as exploreReplacement weighs it. */
export interface ExploreLine<P> {
  plan: P;
  text: string;
  /** The solver: it dies this turn / wins the fight this turn. */
  dies: boolean;
  wins: boolean;
  /** The potion ids it drinks. */
  potions: string[];
}

/** The pick about to be played: its line (null: a potion option, drink then re-plan), text and potions. */
export interface ExplorePick<P> {
  plan: P | null;
  text: string;
  potions: string[];
  wins: boolean;
}

/**
 * The shown lines that could replace `pick` (whatever was played before): another line, drinking no potion the pick does not
 * (code never adds a drink of its own: the HP guard's rule), surviving this turn when one does. In the question's order,
 * one per text.
 */
export function exploreAlternatives<P>(pick: ExplorePick<P>, shown: readonly ExploreLine<P>[]): ExploreLine<P>[] {
  const seen = new Set<string>([pick.text]);
  const out: ExploreLine<P>[] = [];
  for (const line of shown) {
    if (seen.has(line.text) || !line.potions.every((id) => pick.potions.includes(id))) continue;
    seen.add(line.text);
    out.push(line);
  }
  return out.some((line) => !line.dies) ? out.filter((line) => !line.dies) : out;
}

export interface ExploreChoice<P> {
  replacement: ExploreLine<P> | null;
  reason: string;
}

/**
 * The line played instead of `pick` on the deviation point's board (docs/sl.md §11.3): none when the pick wins the fight
 * this turn or was not played there before; else, among the alternatives no failed attempt played there, those the rollout
 * does not see dying more often than the pick (deathShare; all of them when none is), the first by the question's ranking
 * (`rank`: B2's where it ranks, else the rollout's; null: the question's order). Every alternative dying in every sample
 * still gives one: the pick is known to fail.
 */
export function exploreReplacement<P>(args: {
  pick: ExplorePick<P>;
  shown: readonly ExploreLine<P>[];
  excluded: readonly string[];
  deathShare: (plan: P) => number | null;
  rank: (plans: P[]) => P | null;
}): ExploreChoice<P> {
  const { pick } = args;
  if (pick.wins) return { replacement: null, reason: "the line wins the fight this turn: never changed" };
  const excluded = new Set(args.excluded);
  if (!excluded.has(pick.text)) return { replacement: null, reason: "the pick was not played on this board before: played as answered" };
  const untried = exploreAlternatives(pick, args.shown).filter((line) => !excluded.has(line.text));
  if (untried.length === 0) return { replacement: null, reason: "no shown line left that no failed attempt played here" };
  const own = pick.plan === null ? null : args.deathShare(pick.plan);
  const notWorse = own === null ? [] : untried.filter((line) => {
    const share = args.deathShare(line.plan);
    return share !== null && share <= own + 1e-9;
  });
  const pool = notWorse.length > 0 ? notWorse : untried;
  const ranked = args.rank(pool.map((line) => line.plan));
  const replacement = pool.find((line) => line.plan === ranked) ?? pool[0]!;
  const why =
    notWorse.length > 0
      ? "the best untried line by the question's ranking, among those the rollout does not see dying more often"
      : own === null
        ? "the best untried line by the question's ranking"
        : "the best untried line by the question's ranking (every untried line dies more often in the rollout; the pick is known to fail)";
  return { replacement, reason: why };
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
