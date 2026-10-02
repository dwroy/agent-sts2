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
 *   among those no failed attempt played there, preferring the ones not worse than it (the gate: on a boss B2 is trusted on,
 *   B2's win rate within 2 paired standard errors, SL_RETRY_EXPLORE_B2; else the rollout's share of samples dead), never
 *   one dying this turn while one survives, never one drinking a potion the pick does not drink (but in a boss fight,
 *   SL_RETRY_EXPLORE_BOSS_POTIONS: potions cost nothing there, so the shown potion lines and the random potions' Monte
 *   Carlo lines count like the dry ones). Every other board plays as usual. The decision row says so (`sl_explore`).
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
  /**
   * SL_RETRY_EXPLORE_REPLAY: the reference attempt's path played before the deviation point: the boards where its line was
   * played (`replayed`; `overridden`: of them, where it replaced the answer), and why the replay stopped (a board not on the
   * path, its line not played there; null: it did not).
   */
  replay?: { replayed: number; overridden: number; stopped: string | null };
}

/** The planner's part (env.sl.explore): record the lines; on the deviation point's board, `deviate`. */
export interface SlExploreEnv {
  /** On the deviation point's board: the lines failed attempts played there, and (SL_RETRY_EXPLORE_REPLAY) the boards replayed before it. */
  deviate?: { point: string; excluded: string[]; attempts: number[]; replayed?: number };
  /**
   * SL_RETRY_EXPLORE_REPLAY (2026-10-03): before the deviation point, on a board of the reference attempt's path, the line it
   * played there: played instead of the answer (never instead of a winning line, nor where it dies this turn and the
   * answer does not), so that the attempt reaches the point (R1QJUBVBSSB2 F33 attempt 3: Jev answered T5 otherwise, 0.52
   * against 0.44, and the fight died on T7 before its T8 point).
   */
  replay?: { line: string; reference: number; point: string };
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
}

/** Every line of a question's record (the one played and its alternatives) loses in every sample (unknown: false). */
export function pointLost(point: SlPoint): boolean {
  const lines = [point.line, ...(point.alternatives ?? [])];
  const won = point.b2?.won;
  if (won) return lines.every((line) => won[line] !== undefined && won[line]! <= 0);
  return lines.every((line) => point.dead?.[line] !== undefined && point.dead[line]! >= 1 - 1e-9);
}

export function exploreTarget(rows: readonly ExploreRow[], attempt: number, options: ExploreTargetOptions = {}): { target: SlTarget | null; why: string } {
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
  const open: { point: SlPoint; back: number; untried: string[]; worse: boolean; lost: boolean }[] = [];
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
    if (untried.length > 0) open.push({ point, back, untried, worse, lost: options.aliveFirst === true && pointLost(point) });
  }
  if (open.length === 0) return { target: null, why: `no question on attempt ${reference.attempt}'s path has a line no failed attempt played` };
  // SL_RETRY_EXPLORE_ORDER: the points where some line does not lose in every sample first (without it, none is lost).
  const alive = open.some((entry) => !entry.lost) ? open.filter((entry) => !entry.lost) : open;
  const fewest = Math.min(...alive.map((entry) => uses.get(entry.point.board) ?? 0));
  const least = alive.filter((entry) => (uses.get(entry.point.board) ?? 0) === fewest);
  const chosen = least.find((entry) => !entry.worse) ?? least[0]!;
  const lostPassed = alive === open ? [] : open.filter((entry) => entry.lost && entry.back < chosen.back);
  const lostWhy =
    lostPassed.length > 0
      ? `; passed over ${lostPassed.map((entry) => `T${entry.point.turn ?? "?"}`).join(", ")}, where every line loses in every sample`
      : chosen.lost
        ? "; every line loses in every sample here, as on every point left"
        : "";
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
    why: `${chosen.untried.length} line${chosen.untried.length === 1 ? "" : "s"} shown there never played on that board${chosen.worse ? "; all dying more often in the rollout than the one played, as on every other point left" : ""}${least.some((entry) => entry.worse && entry.back < chosen.back) ? `; passed over ${least.filter((entry) => entry.worse && entry.back < chosen.back).map((entry) => `T${entry.point.turn ?? "?"}`).join(", ")}, whose untried lines all die more often in the rollout` : ""}${lostWhy}`,
  };
}

/**
 * SL_RETRY_EXPLORE_REPLAY: the reference attempt's lines on the boards before the deviation point (its path up to the
 * target's board, the latest line where a board came twice), by board.
 */
export function replayPath(rows: readonly ExploreRow[], target: SlTarget): Map<string, string> {
  const reference = rows.find((row) => row.attempt === target.reference && row.explore && Array.isArray(row.explore.points));
  const points = reference?.explore?.points ?? [];
  let end = -1;
  for (let i = points.length - 1; i >= 0; i -= 1) if (points[i]!.board === target.board) { end = i; break; }
  const out = new Map<string, string>();
  for (const point of points.slice(0, Math.max(0, end))) if (point.board !== target.board) out.set(point.board, point.line);
  return out;
}

/**
 * SL_RETRY_EXPLORE_REPLAY: on a board of the reference attempt's path before the deviation point, the line to play instead
 * of the answer (`pick`): the reference attempt's line there (`replay.line`, among `shown`: the shown lines and every random
 * potion's), unless the answer is that line already, wins the fight this turn (never changed), or survives this turn where
 * that line dies (`pickDies`); null when it is not shown (the attempt then plays the answer, and the replay stops).
 */
export function replayChoice<P>(pick: ExplorePick<P>, pickDies: boolean, shown: readonly ExploreLine<P>[], replay: { line: string; reference: number; point: string }): { line: ExploreLine<P> | null; reason: string } {
  const at = replay.point.split(",")[0];
  if (pick.text === replay.line) return { line: null, reason: `the answer is attempt ${replay.reference}'s line` };
  if (pick.wins) return { line: null, reason: "the answer wins the fight this turn: never changed" };
  const ref = shown.find((line) => line.text === replay.line);
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
}

/** The pick about to be played: its line (null: a potion option, drink then re-plan), text and potions. */
export interface ExplorePick<P> {
  plan: P | null;
  text: string;
  potions: string[];
  wins: boolean;
  /** A random potion's option (plan null): its Monte Carlo line, the line B2 rated for it (SL_RETRY_EXPLORE_B2). */
  rated?: P | null;
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
export function explorePoint<P>(line: ExplorePick<P>, shown: readonly ExploreLine<P>[], opts: { drinks?: boolean; deathShare: (plan: P) => number | null; b2?: ExploreB2<P> | null }): Pick<SlPoint, "line" | "alternatives" | "dead" | "b2"> {
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
  return { line: line.text, alternatives: alternatives.map((entry) => entry.text), ...(Object.keys(dead).length > 0 ? { dead } : {}), ...(b2Record ? { b2: b2Record } : {}) };
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
 */
export function exploreReplacement<P>(args: {
  pick: ExplorePick<P>;
  shown: readonly ExploreLine<P>[];
  excluded: readonly string[];
  deathShare: (plan: P) => number | null;
  rank: (plans: P[]) => P | null;
  drinks?: boolean;
  b2?: ExploreB2<P> | null;
}): ExploreChoice<P> {
  const { pick } = args;
  if (pick.wins) return { replacement: null, reason: "the line wins the fight this turn: never changed", gate: null };
  const excluded = new Set(args.excluded);
  if (!excluded.has(pick.text)) return { replacement: null, reason: "the pick was not played on this board before: played as answered", gate: null };
  const untried = exploreAlternatives(pick, args.shown, args.drinks === true).filter((line) => !excluded.has(line.text));
  if (untried.length === 0) return { replacement: null, reason: "no shown line left that no failed attempt played here", gate: null };
  const rated = pick.plan ?? pick.rated ?? null;
  const b2 = args.b2 && rated !== null && args.b2.win(rated) !== null ? args.b2 : null;
  if (b2) {
    const notWorse = untried.filter((line) => b2.notWorse(line.plan, rated!) === true);
    const pool = notWorse.length > 0 ? notWorse : untried;
    const ranked = args.rank(pool.map((line) => line.plan));
    const replacement = pool.find((line) => line.plan === ranked) ?? pool[0]!;
    const why =
      notWorse.length > 0
        ? `the best untried line by the question's ranking, among those B2 rates no worse (win rate at most ${b2.rule} below the pick's)`
        : `the best untried line by the question's ranking (B2 rates every untried line worse: win rate more than ${b2.rule} below the pick's; the pick is known to fail)`;
    return { replacement, reason: why, gate: "b2" };
  }
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
  return { replacement, reason: why, gate: "rollout" };
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
