/**
 * The SL controller (docs/sl.md): retries of boss fights and of the listed hard elites (sl-elites.json), death only.
 *
 * - observe(): every state the loop reads. A boss or listed-elite fight is tracked from its first state as attempt
 *   1 (or, after a restart, as the attempt sl-attempts.jsonl says it is); each turn's start (HP, block, enemies) is
 *   noted, and noteAction() adds what was played. The fight ending writes the attempt's row (won / died).
 * - beforeEndTurn(): the loop is about to send end_turn. When judgeEndTurn says the enemy turn certainly kills us
 *   and a retry is left, the turn is not ended: the fight is reloaded (reload.ts: save_and_quit, continue_run, the
 *   same floor and fight checked), the attempt's row is written (predicted_death) and the next attempt begins. A
 *   reload that fails, or lands anywhere but this fight, stops SL for the rest of the run (logged) and the loop
 *   plays on normally. Retries used up: the turn ends as usual and the death is the run's. SL_JUDGE_KNOWN_DRAWS: the
 *   least-loss verdict's known draws (the planner's facts) lift the judge's draw veto.
 * - beforeLeastLoss() (SL_RELOAD_EARLY): the loop is about to play the first card of a least-loss line (every simulated
 *   line dies): the same reload, there and then, when judgeLeastLossNow is certain on that board.
 * - envFor(): on attempts after the first, the combat questions' "previous attempts" block and SL_RETRY_SHOW_SIM; with
 *   SL_RETRY_KNOWN_DRAWS the draw pile's next cards as the earlier attempts drew them (draws.ts: checked against this
 *   attempt's own draws on every state, dropped for the rest of the attempt once they differ, logged); with
 *   SL_RETRY_COMPUTE more rollout samples and time (RETRY_COMPUTE).
 * - decisionFields(): sl_attempt / sl_reloads on every decision row.
 * - SL_RETRY_EXPLORE (explore.ts, docs/sl.md §11): from attempt 2 notePoint() records each decision point's board and line
 *   (in the attempt's row); attempts 3+ pick a deviation point from the earlier rows (exploreTarget) and envFor() tells the
 *   planner, on that board only, which lines not to play again there (and the sub-switches SL_RETRY_EXPLORE_B2 and
 *   SL_RETRY_EXPLORE_BOSS_POTIONS on every board, which the record and the replacement follow).
 *
 * Nothing here touches a save file: the game restarts the fight from the save it wrote on entering the room.
 */
import type { SlConfig } from "../config.js";
import type { ActionRequest } from "../mod/client.js";
import type { GameState } from "../mod/schema.js";
import type { Knowledge } from "../knowledge/index.js";
import type { RunJournal } from "../project/run-journal.js";
import type { Decision, ResolvedAction, ScreenMemory, SlCompute, SlEnv } from "../project/types.js";
import { isMenuRunId } from "../project/journal-replay.js";
import { distinctNames, revivesOf, slPointOf } from "../screens/combat-plan.js";
import { heldCardEthereal } from "../strategy/card-model.js";
import { asArray, asRecord, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { attemptFrom, createSlLog, previousAttemptsJson, type SlAttemptRow, type SlLog, type SlReloadRecord, type SlResult, type SlTurn } from "./attempts.js";
import { checkKnown, DrawTracker, knownOrderOf, type KnownOrder } from "./draws.js";
import { listedElite, loadSlElites, type SlEliteList } from "./elites.js";
import { exploreTarget, slBoardKey, type SlExploreRecord, type SlPoint } from "./explore.js";
import { drawsKnownAt, judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL, type DeathVerdict, type LeastLossFacts } from "./judge.js";
import { encounterOf, reloadFight, type ReloadDeps, type ReloadOutcome } from "./reload.js";

export type { SlConfig };

export type { SlEnv };

/**
 * SL_RETRY_COMPUTE (docs/sl.md §10.3, Dai 2026-10-02: "compute more on retries"; +20-30 s a boss turn accepted earlier): the
 * rollout x3 samples with up to 20 s a question and 30 s a turn (notes/sl-retry-report.md §7, the real clock on 607 logged
 * A8+ boss and listed-fight death questions with a live game running: median 1.1 s, p90 9.9 s, 93% reach 24 samples x 5
 * turns against 70% reaching 8 x 5 on the usual 1.5 s; VNKN9952ZNA0 F25's Decimillipede 16-24 samples in 9-20 s against 1-4
 * samples at 3 turns), the random potions' Monte Carlo x3 samples and time, B2 x2 samples (600 take 0.02-3 s on 20 workers,
 * XSPHCB4GUSEU F48 T1 11 s; its own 25 s a question and 30 s a turn still bound it).
 */
export const RETRY_COMPUTE: SlCompute = { rolloutSamples: 24, rolloutBudgetMs: 20_000, turnBudgetMs: 30_000, mcSamples: 36, mcBudgetMs: 1_200, bossSimSamples: 1_200 };

interface FightTrack {
  runId: string;
  act: string | null;
  floor: number | null;
  encounter: string;
  enemies: string[];
  kind: "boss" | "elite";
  elite: string | null;
  attempt: number;
  maxAttempts: number;
  startedAt: string;
  turns: SlTurn[];
  potions: string[];
  /** The journal and the Lizard Tail record as they were when the fight was first seen, restored with each reload. */
  journal: unknown;
  lizardTail: ScreenMemory["lizardTail"];
  /** The certain-death verdict of the last end_turn (kept for the row when no retry was left). */
  verdict: DeathVerdict | null;
  /** The order cards come off the draw pile in this attempt (draws.ts), kept in the attempt's row. */
  draws: DrawTracker;
  /** Attempts after the first: the draw order the earlier attempts saw (null: none known), and why it is off for this attempt. */
  known: KnownOrder | null;
  knownOff: string | null;
  /**
   * This turn's HP as the states showed it (Beating Remnant's cap in the judge needs the HP lost so far this turn): the
   * first state's, the last one's, whether it ever rose, and whether something costs HP as a turn starts.
   */
  hpTurn: { turn: number; start: number; last: number; rose: boolean; startLoss: boolean } | null;
  /** SL_RETRY_EXPLORE, attempts from the 2nd: this attempt's decision points, its deviation point and what came of it (null: off). */
  explore: SlExploreRecord | null;
}

/** HP lost as our turn starts, before its first state (Inferno, Crimson Mantle, poison on us; a power's or relic's text). */
const START_LOSS_POWERS = ["INFERNO_POWER", "CRIMSON_MANTLE_POWER", "POISON_POWER"];
const START_LOSS_TEXT = /回合开始时[^。]*(?:失去|受到)|start of your turn[^.]*(?:lose|take)/i;

export interface SlControllerOptions {
  config: SlConfig;
  knowledge: Knowledge;
  client: ReloadDeps["client"];
  note: (message: string) => void;
  elites?: SlEliteList;
  log?: SlLog;
  /** Test seams for the reload's polling. */
  pollMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export type EndTurnOutcome =
  | { handled: false }
  /** The fight was reloaded (ok) or the reload failed (SL stopped for the run): either way, re-read and re-plan. */
  | { handled: true; ok: boolean; outcome: ReloadOutcome };

function livingEnemies(state: GameState): Record<string, unknown>[] {
  return asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
}

/**
 * The living enemies' names as the combat options write them (combat-plan distinctNames: 「残杀千足虫 (MIDDLE)」), in
 * board order. VNKN F25: the earlier attempts read 「残杀千足虫」 for all three segments while the options named each,
 * and the fight turned on which segment was hit (attempt 3 won by not killing the middle one early).
 */
export function livingNames(living: Record<string, unknown>[]): string[] {
  return distinctNames(living.map((enemy) => ({ name: str(enemy["name"], str(enemy["enemy_id"], "?")), id: str(enemy["enemy_id"]) })));
}

function inCombat(state: GameState): boolean {
  return state.in_combat || state.screen === "COMBAT";
}

export class SlController {
  readonly config: SlConfig;
  private readonly knowledge: Knowledge;
  private readonly options: SlControllerOptions;
  private readonly elites: SlEliteList;
  private readonly log: SlLog;
  private runId = "";
  private rows: SlAttemptRow[] = [];
  private reloads = 0;
  /** Why SL is off for the rest of this run (null: on). */
  private stopped: string | null = null;
  private fight: FightTrack | null = null;
  /** SL_RELOAD_EARLY: the attempt and turn whose "not early" note was said (once a turn). */
  private earlyNoted: string | null = null;

  constructor(options: SlControllerOptions) {
    this.options = options;
    this.config = options.config;
    this.knowledge = options.knowledge;
    this.elites = options.elites ?? loadSlElites();
    this.log = options.log ?? createSlLog(options.config.log);
  }

  /** The configuration as run-config.jsonl records it. */
  describe(): Record<string, JsonValue> {
    return {
      enabled: this.config.enabled,
      boss_retries: this.config.bossRetries,
      elite_retries: this.config.eliteRetries,
      retry_show_sim: this.config.retryShowSim,
      retry_known_draws: this.config.retryKnownDraws,
      retry_compute: this.config.retryCompute ? { rollout_samples: RETRY_COMPUTE.rolloutSamples, rollout_budget_ms: RETRY_COMPUTE.rolloutBudgetMs, turn_budget_ms: RETRY_COMPUTE.turnBudgetMs, mc_samples: RETRY_COMPUTE.mcSamples, mc_budget_ms: RETRY_COMPUTE.mcBudgetMs, boss_sim_samples: RETRY_COMPUTE.bossSimSamples } : false,
      judge_known_draws: this.config.judgeKnownDraws === true,
      reload_early: this.config.reloadEarly === true,
      retry_known_inserts: this.config.retryKnownInserts === true,
      retry_known_top: this.config.retryKnownTop === true,
      retry_explore: this.config.retryExplore === true,
      retry_explore_b2: this.config.retryExplore === true && this.config.retryExploreB2 === true,
      retry_explore_boss_potions: this.config.retryExplore === true && this.config.retryExploreBossPotions === true,
      step_timeout_ms: this.config.stepTimeoutMs,
      log: this.config.log,
      elites: this.elites.elites.map((elite) => elite.name),
      elites_date: this.elites.date,
    };
  }

  /** Every state the loop reads (after the journal and the Lizard Tail record saw it). */
  observe(state: GameState, memory: { journal: RunJournal; screenMemory: ScreenMemory }): void {
    const runId = str(state.raw["run_id"]);
    if (this.fight && state.screen === "GAME_OVER") {
      this.close(asRecord(state.raw["game_over"])["is_victory"] === true ? "won" : "died", state);
      return;
    }
    if (isMenuRunId(runId)) {
      // Out of the run with the fight open (the run vanished, or the session ends on the menu): never finished.
      if (this.fight && state.run === null) this.close("unfinished", state);
      return;
    }
    if (runId !== this.runId) {
      if (this.fight) this.close("unfinished", state);
      this.startRun(runId);
    }
    const fight = this.fight;
    if (!inCombat(state)) {
      if (fight && state.run !== null) this.close("won", state);
      return;
    }
    const living = livingEnemies(state);
    if (!fight || fight.floor !== (state.run?.floor ?? null)) {
      if (fight) this.close("unfinished", state);
      if (living.length === 0 || this.stopped !== null) return;
      this.open(state, living, memory);
    }
    this.noteTurn(state);
    this.noteDraws(state);
    this.noteHp(state);
  }

  /** This turn's HP from state to state (FightTrack.hpTurn); an error only drops it. */
  private noteHp(state: GameState): void {
    const fight = this.fight;
    if (!fight || state.turn === null) return;
    try {
      const player = asRecord(asRecord(state.raw["combat"])["player"]);
      const hp = numOrNull(player["current_hp"]);
      if (hp === null) return;
      const track = fight.hpTurn;
      if (!track || track.turn !== state.turn) {
        const powers = asArray(player["powers"]).map(asRecord);
        const relics = asArray(asRecord(state.raw["run"])["relics"]).map(asRecord);
        const startLoss =
          powers.some((power) => START_LOSS_POWERS.includes(str(power["power_id"])) || START_LOSS_TEXT.test(this.knowledge.power(str(power["power_id"]))?.description ?? "")) ||
          relics.some((relic) => START_LOSS_TEXT.test(str(relic["description"])));
        fight.hpTurn = { turn: state.turn, start: hp, last: hp, rose: false, startLoss };
        return;
      }
      if (hp > track.last) track.rose = true;
      track.last = hp;
    } catch {
      fight.hpTurn = null;
    }
  }

  /** The HP lost so far this turn, exactly, or undefined (it rose, something costs HP as the turn starts, not tracked). */
  private lostSoFar(fight: FightTrack, state: GameState): number | undefined {
    const track = fight.hpTurn;
    const hp = numOrNull(asRecord(asRecord(state.raw["combat"])["player"])["current_hp"]);
    if (!track || track.turn !== state.turn || track.rose || track.startLoss || hp === null || hp > track.last) return undefined;
    return Math.max(0, track.start - hp);
  }

  /** decisions.jsonl: the attempt at the fight being played (null outside one) and the reloads so far this run. */
  decisionFields(): { sl_attempt: number | null; sl_reloads: number } {
    return { sl_attempt: this.fight?.attempt ?? null, sl_reloads: this.reloads };
  }

  /** The retried fight's prompt additions, for planners deciding on `state`. */
  envFor(state: GameState): SlEnv | undefined {
    const fight = this.fight;
    if (!fight || fight.attempt <= 1 || !inCombat(state) || (state.run?.floor ?? null) !== fight.floor) return undefined;
    const previous = this.rows.filter((row) => row.floor === fight.floor && row.encounter === fight.encounter && row.attempt < fight.attempt);
    if (previous.length === 0) return undefined;
    const knownOn = this.config.retryKnownDraws;
    const env: SlEnv = {
      attempt: fight.attempt,
      maxAttempts: fight.maxAttempts,
      previousAttempts: previousAttemptsJson(previous, fight.attempt, fight.maxAttempts, knownOn ? { knownDraws: true } : {}),
      showSim: this.config.retryShowSim,
    };
    if (knownOn) {
      const known = this.knownDraws(fight, state);
      if (known) env.knownDraws = known;
    }
    if (this.config.retryCompute) env.compute = { ...RETRY_COMPUTE };
    const explore = this.exploreEnv(fight, state);
    if (explore) env.explore = explore;
    return env;
  }

  /**
   * SL_RETRY_EXPLORE: the planner's part on `state` (recording; on the deviation point's board, the lines not to play again
   * there). Never throws: an error leaves it out (the attempt then plays as without the switch).
   */
  private exploreEnv(fight: FightTrack, state: GameState): SlEnv["explore"] | undefined {
    const explore = fight.explore;
    if (!explore) return undefined;
    try {
      // The sub-switches (SL_RETRY_EXPLORE_B2, SL_RETRY_EXPLORE_BOSS_POTIONS): absent when off, as before them.
      const flags = { ...(this.config.retryExploreB2 === true ? { b2Gate: true } : {}), ...(this.config.retryExploreBossPotions === true ? { bossPotions: true } : {}) };
      const target = explore.target;
      if (!target || explore.deviation?.reached || slBoardKey(state) !== target.board) return { ...flags };
      return { deviate: { point: target.point, excluded: [...target.excluded], attempts: [...target.attempts] }, ...flags };
    } catch (error) {
      fight.explore = null;
      this.options.note(`SL: explore off for this attempt (${error instanceof Error ? error.message : String(error)}); played as usual`);
      return undefined;
    }
  }

  /**
   * SL_RETRY_EXPLORE: a decision that went out (the loop calls it after a successful dispatch, with the state it was decided
   * on): its board and the line it chose (the planner's note, slPointOf; plan-continue steps have none) go into the attempt's
   * record. On the deviation point's board, what came of it. An error only loses the point.
   */
  notePoint(state: GameState, decision: Decision, resolved: ResolvedAction): void {
    const fight = this.fight;
    const explore = fight?.explore;
    if (!fight || !explore || !inCombat(state)) return;
    try {
      const info = slPointOf(decision, resolved);
      if (!info) return;
      const board = slBoardKey(state);
      const point: SlPoint = { board, turn: state.turn, kind: info.kind, label: info.label, line: info.line, ...(info.alternatives ? { alternatives: info.alternatives } : {}), ...(info.dead ? { dead: info.dead } : {}), ...(info.b2 ? { b2: info.b2 } : {}), ...(info.explored ? { explored: true as const } : {}) };
      // The same board again (a re-plan before anything changed): the line played is the last one.
      if (explore.points.at(-1)?.board === board) explore.points[explore.points.length - 1] = point;
      else explore.points.push(point);
      const target = explore.target;
      if (!target || board !== target.board || explore.deviation?.reached) return;
      explore.deviation = info.deviation ? { reached: true, ...info.deviation } : { reached: true, original: info.line, replacement: null, reason: "decided on the board without the deviation" };
      const where = `F${fight.floor ?? "?"} T${state.turn ?? "?"} attempt ${fight.attempt}/${fight.maxAttempts}`;
      this.options.note(
        explore.deviation.replacement !== null
          ? `SL: explored at ${where}: ${explore.deviation.replacement} instead of ${explore.deviation.original} (${explore.deviation.reason})`
          : `SL: the deviation point came up at ${where}: ${explore.deviation.original} played (${explore.deviation.reason})`,
      );
    } catch {
      // the record misses this point
    }
  }

  /**
   * SL_RETRY_EXPLORE: a new attempt's record, with its deviation point (attempts 3+, exploreTarget over this fight's earlier
   * rows). Null with the switch off, on the first attempt, or on an error (the attempt plays as without the switch).
   */
  private newExplore(fight: Pick<FightTrack, "floor" | "encounter">, attempt: number): SlExploreRecord | null {
    if (this.config.retryExplore !== true || attempt < 2) return null;
    try {
      if (attempt < 3) return { points: [], target: null };
      const earlier = this.rows.filter((row) => row.floor === fight.floor && row.encounter === fight.encounter && row.attempt < attempt);
      const { target, why } = exploreTarget(earlier, attempt);
      this.options.note(
        target
          ? `SL: attempt ${attempt} deviates at ${target.point}: not ${target.excluded.join(" / ")} again there (${why})`
          : `SL: attempt ${attempt} has no deviation point (${why}); it plays as usual`,
      );
      return target ? { points: [], target } : { points: [], target: null, why };
    } catch (error) {
      this.options.note(`SL: explore off for attempt ${attempt} (${error instanceof Error ? error.message : String(error)}); it plays as usual`);
      return null;
    }
  }

  /**
   * SL_RETRY_KNOWN_DRAWS: the draw pile's next cards as the earlier attempts drew them, while this attempt's draws match
   * them (draws.ts checkKnown). Once they do not (a reshuffle, a card put into the pile, another card drawn) the order is
   * off for the rest of the attempt, said once on the console. Never throws: an error is the same as no known order.
   */
  private knownDraws(fight: FightTrack, state: GameState): SlEnv["knownDraws"] | null {
    if (!fight.known || fight.knownOff !== null) return null;
    try {
      const check = checkKnown(fight.known, fight.draws);
      if (!check.ok) {
        fight.knownOff = check.reason;
        this.options.note(`SL: the draws left the order attempt ${fight.known.attempts.join(", ")} saw (F${fight.floor ?? "?"} T${state.turn ?? "?"} attempt ${fight.attempt}): ${check.reason}; random draws from here`);
        return null;
      }
      if (check.keys.length === 0) return null;
      // SL_RETRY_KNOWN_INSERTS: the cards added at random places, still in the pile (only the tracker in that mode has any).
      const added = check.inserted && check.inserted.keys.length > 0 ? { added: { cards: [...check.inserted.keys], names: [...check.inserted.names] } } : {};
      return { cards: check.keys, names: check.names, attempts: [...fight.known.attempts], ...added, ...(check.exact !== undefined ? { exact: check.exact } : {}) };
    } catch (error) {
      fight.knownOff = `error: ${error instanceof Error ? error.message : String(error)}`;
      this.options.note(`SL: known draws off for this attempt (${fight.knownOff})`);
      return null;
    }
  }

  /** The draws of this state (the attempt's DrawTracker); an error only stops the tracking of this attempt. */
  private noteDraws(state: GameState): void {
    const fight = this.fight;
    if (!fight) return;
    try {
      fight.draws.observe(state);
    } catch (error) {
      fight.knownOff ??= `error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * An attempt's draw tracker (SL_RETRY_KNOWN_INSERTS: cards added to the pile at random places keep the order;
   * SL_RETRY_KNOWN_TOP: so do cards moved on top).
   */
  private newTracker(): DrawTracker {
    if (this.config.retryKnownInserts !== true) return new DrawTracker();
    return this.config.retryKnownTop === true ? new DrawTracker({ inserts: true, tops: true }) : new DrawTracker({ inserts: true });
  }

  /** The known draw order of `attempt` at the fight: the earlier attempts' rows (null on the first attempt). */
  private knownFor(fight: Pick<FightTrack, "floor" | "encounter">, attempt: number): KnownOrder | null {
    if (attempt <= 1) return null;
    try {
      const earlier = this.rows.filter((row) => row.floor === fight.floor && row.encounter === fight.encounter && row.attempt < attempt);
      const { known, reason } = knownOrderOf(earlier);
      if (this.config.retryKnownDraws) {
        this.options.note(known ? `SL: attempt ${attempt} knows the first ${known.keys.length} draws of the fight (attempt ${known.attempts.join(", ")}${reason ? `; ${reason}` : ""})` : `SL: attempt ${attempt} has no known draws (${reason})`);
      }
      return known;
    } catch {
      return null;
    }
  }

  /** An action that went out (the loop calls it after a successful dispatch, with the state it was decided on). */
  noteAction(state: GameState, intent: ActionRequest): void {
    const fight = this.fight;
    if (!fight || !inCombat(state)) return;
    const turn = this.noteTurn(state);
    if (!turn) return;
    const combat = asRecord(state.raw["combat"]);
    if (intent.action === "play_card") {
      const hand = asArray(combat["hand"]).map(asRecord);
      const card = hand.find((entry) => num(entry["index"], -1) === intent.card_index) ?? hand[intent.card_index ?? -1];
      // The target as the options named it (livingNames), else as the game does.
      const living = livingEnemies(state);
      const at = intent.target_index === undefined ? -1 : living.findIndex((enemy) => num(enemy["index"], -1) === intent.target_index);
      const target = intent.target_index === undefined ? null : asArray(combat["enemies"]).map(asRecord).find((enemy) => num(enemy["index"], -1) === intent.target_index) ?? null;
      const targetName = at >= 0 ? livingNames(living)[at]! : target ? str(target["name"], str(target["enemy_id"], "?")) : null;
      const name = card ? str(card["name"], str(card["card_id"], "?")) : `card ${intent.card_index ?? "?"}`;
      turn.plays.push(targetName ? `${name} -> ${targetName}` : name);
    } else if (intent.action === "use_potion") {
      const slot = asArray(asRecord(state.raw["run"])["potions"]).map(asRecord).find((entry) => num(entry["index"], -1) === intent.option_index);
      const name = slot ? str(slot["name"], str(slot["potion_id"], "?")) : `potion ${intent.option_index ?? "?"}`;
      turn.plays.push(`potion ${name}`);
      fight.potions.push(`T${turn.turn} ${name}`);
    }
  }

  /**
   * The loop is about to send end_turn on `state` (re-read just before sending, the board the decision was made on).
   * Reloads the fight when the enemy turn certainly kills us and a retry is left.
   */
  async beforeEndTurn(state: GameState, context: { label: string; screenMemory: ScreenMemory; journal: RunJournal; facts?: LeastLossFacts | undefined }): Promise<EndTurnOutcome> {
    const fight = this.fight;
    if (!fight || this.stopped !== null || (state.run?.floor ?? null) !== fight.floor) return { handled: false };
    const maxHp = num(asRecord(asRecord(state.raw["combat"])["player"])["max_hp"], state.run?.max_hp ?? 0);
    const revives = revivesOf(state, context.screenMemory, maxHp).map((revive) => revive.source);
    // SL_JUDGE_KNOWN_DRAWS: the least-loss verdict drew only the retry's known cards (an error: as without the switch).
    let drawsKnown = false;
    if (this.config.judgeKnownDraws === true && context.label === LEAST_LOSS_LABEL && context.facts) {
      try {
        drawsKnown = drawsKnownAt(state, context.facts, this.knowledge);
      } catch {
        drawsKnown = false;
      }
    }
    const lostSoFar = this.lostSoFar(fight, state);
    const verdict = judgeEndTurn(state, {
      label: context.label,
      revives,
      ethereal: (card) => heldCardEthereal(card, this.knowledge),
      knowledge: this.knowledge,
      ...(lostSoFar !== undefined ? { lostSoFar } : {}),
      ...(drawsKnown ? { drawsKnown: true } : {}),
    });
    fight.verdict = verdict;
    const where = `F${fight.floor ?? "?"} T${state.turn ?? "?"} attempt ${fight.attempt}/${fight.maxAttempts}`;
    if (!verdict.certain) {
      // Said when the mod itself calls the end of turn lethal, or our own count (held cards included) does: the deaths SL
      // let through, and why (TMNFVW6DRQ20 F48 T8: the mod did not flag it, the held Wither+ did it, and nothing was said).
      if (asRecord(state.raw["combat"])["end_turn_will_kill_player"] === true || verdict.ownCountDies === true) this.options.note(`SL: ending the turn may be lethal (${where}), not certain: ${verdict.reason}`);
      return { handled: false };
    }
    return this.reloadOn(fight, state, verdict, where, context);
  }

  /**
   * SL_RELOAD_EARLY: the loop is about to play the first card (or potion) of the planner's least-loss line on `state` (re-read
   * just before sending). When judgeLeastLossNow is certain there, the fight is reloaded now instead of after the line;
   * otherwise nothing (end_turn decides, as before). Any error: nothing.
   */
  async beforeLeastLoss(state: GameState, context: { label: string; screenMemory: ScreenMemory; journal: RunJournal; facts: LeastLossFacts | undefined }): Promise<EndTurnOutcome> {
    const fight = this.fight;
    if (this.config.reloadEarly !== true || context.label !== LEAST_LOSS_LABEL || !fight || this.stopped !== null || (state.run?.floor ?? null) !== fight.floor) return { handled: false };
    // No retry left: the line is played and end_turn judges (and says so), as before.
    if (fight.attempt >= fight.maxAttempts) return { handled: false };
    let verdict: DeathVerdict;
    try {
      const maxHp = num(asRecord(asRecord(state.raw["combat"])["player"])["max_hp"], state.run?.max_hp ?? 0);
      const revives = revivesOf(state, context.screenMemory, maxHp).map((revive) => revive.source);
      verdict = judgeLeastLossNow(state, {
        revives,
        ethereal: (card) => heldCardEthereal(card, this.knowledge),
        facts: context.facts,
        knownDrawsJudge: this.config.judgeKnownDraws === true,
        addedToPile: fight.draws.addedToPile,
        knowledge: this.knowledge,
        ...(this.lostSoFar(fight, state) !== undefined ? { lostSoFar: this.lostSoFar(fight, state)! } : {}),
      });
    } catch (error) {
      this.options.note(`SL: early reload check failed (${error instanceof Error ? error.message : String(error)}); end_turn decides`);
      return { handled: false };
    }
    const where = `F${fight.floor ?? "?"} T${state.turn ?? "?"} attempt ${fight.attempt}/${fight.maxAttempts}`;
    if (!verdict.certain) {
      // Said once a turn, when only the early conditions kept it (the end of the turn is judged again as before).
      const key = `${fight.attempt}:${state.turn ?? "?"}`;
      if (verdict.reason.startsWith("not before the line is played") && this.earlyNoted !== key) {
        this.earlyNoted = key;
        this.options.note(`SL: every simulated line dies at ${where}, but ${verdict.reason}; end_turn decides`);
      }
      return { handled: false };
    }
    fight.verdict = verdict;
    return this.reloadOn(fight, state, verdict, where, context);
  }

  /** A certain death foreseen on `state`: reload the fight when a retry is left (the end_turn and the early path alike). */
  private async reloadOn(fight: FightTrack, state: GameState, verdict: DeathVerdict, where: string, context: { screenMemory: ScreenMemory; journal: RunJournal }): Promise<EndTurnOutcome> {
    if (fight.attempt >= fight.maxAttempts) {
      this.options.note(`SL: certain death foreseen at ${where} (${verdict.reason}); no retry left, the turn ends as usual`);
      return { handled: false };
    }
    this.options.note(`SL: certain death foreseen at ${where} (${verdict.tier}${verdict.early ? ", early" : ""}: ${verdict.reason}); reloading the fight: save_and_quit, then continue_run`);
    const outcome = await reloadFight({ runId: fight.runId, floor: fight.floor, encounter: fight.encounter }, state, {
      client: this.options.client,
      stepTimeoutMs: this.config.stepTimeoutMs,
      note: this.options.note,
      ...(this.options.pollMs === undefined ? {} : { pollMs: this.options.pollMs }),
      ...(this.options.sleep ? { sleep: this.options.sleep } : {}),
      ...(this.options.now ? { now: this.options.now } : {}),
    });
    const reload: SlReloadRecord = outcome.ok ? { ok: true, ms: outcome.ms, resumed_turn: outcome.resumedTurn } : { ok: false, ms: outcome.ms, step: outcome.step, reason: outcome.reason };
    if (!outcome.ok) {
      this.stopped = `reload failed at ${outcome.step}: ${outcome.reason}`;
      this.writeRow(fight, "predicted_death", state, { reload, giveUp: this.stopped });
      this.fight = null;
      this.options.note(`SL: ${this.stopped}; no more SL this run, playing on`);
      return { handled: true, ok: false, outcome };
    }
    this.writeRow(fight, "predicted_death", state, { reload, giveUp: null });
    this.reloads += 1;
    // The next attempt: the same fight from its first turn, with the run memory as it was then.
    fight.attempt += 1;
    fight.startedAt = new Date().toISOString();
    fight.turns = [];
    fight.potions = [];
    fight.verdict = null;
    fight.draws = this.newTracker();
    fight.known = this.knownFor(fight, fight.attempt);
    fight.knownOff = null;
    fight.hpTurn = null;
    fight.explore = this.newExplore(fight, fight.attempt);
    if (fight.journal !== undefined) context.journal.restore(fight.journal);
    context.screenMemory.lizardTail = fight.lizardTail === undefined ? undefined : structuredClone(fight.lizardTail);
    this.noteTurn(outcome.state);
    this.noteDraws(outcome.state);
    this.noteHp(outcome.state);
    this.options.note(
      `SL: back in the fight at F${outcome.state.run?.floor ?? "?"} T${outcome.resumedTurn ?? "?"} (${Math.round(outcome.ms / 1000)} s); attempt ${fight.attempt}/${fight.maxAttempts} begins, Jev is told how the earlier attempt(s) went`,
    );
    return { handled: true, ok: true, outcome };
  }

  private startRun(runId: string): void {
    this.runId = runId;
    this.rows = this.log.readRun(runId);
    this.reloads = this.rows.filter((row) => row.reload?.ok === true).length;
    const gaveUp = this.rows.find((row) => row.give_up_reason);
    this.stopped = gaveUp ? gaveUp.give_up_reason : null;
    this.fight = null;
    if (this.rows.length > 0) this.options.note(`SL: run ${runId} has ${this.rows.length} logged attempt(s), ${this.reloads} reload(s)${this.stopped ? `; SL stopped for this run: ${this.stopped}` : ""}`);
  }

  private open(state: GameState, living: Record<string, unknown>[], memory: { journal: RunJournal; screenMemory: ScreenMemory }): void {
    const ids = living.map((enemy) => str(enemy["enemy_id"]));
    const boss = ids.some((id) => this.knowledge.monster(id)?.type === "Boss");
    const elite = boss ? null : listedElite(ids, this.elites);
    if (!boss && !elite) return;
    const floor = state.run?.floor ?? null;
    const encounter = encounterOf(state);
    const retries = boss ? this.config.bossRetries : this.config.eliteRetries;
    const done = this.rows.filter((row) => row.floor === floor && row.encounter === encounter && row.result === "predicted_death" && row.reload?.ok === true).length;
    this.fight = {
      runId: this.runId,
      act: state.run?.act_id ?? null,
      floor,
      encounter,
      enemies: livingNames(living),
      kind: boss ? "boss" : "elite",
      elite: elite?.name ?? null,
      attempt: done + 1,
      maxAttempts: 1 + Math.max(0, retries),
      startedAt: new Date().toISOString(),
      turns: [],
      potions: [],
      journal: memory.journal.snapshot(),
      lizardTail: memory.screenMemory.lizardTail === undefined ? undefined : structuredClone(memory.screenMemory.lizardTail),
      verdict: null,
      draws: this.newTracker(),
      known: this.knownFor({ floor, encounter }, done + 1),
      knownOff: null,
      hpTurn: null,
      explore: this.newExplore({ floor, encounter }, done + 1),
    };
    if (retries > 0) this.options.note(`SL: tracking ${boss ? "boss" : `listed elite (${elite?.name})`} fight F${floor ?? "?"} ${encounter}: attempt ${done + 1} of at most ${1 + retries}`);
  }

  /** The current turn's record, made at the turn's first state where we can act. */
  private noteTurn(state: GameState): SlTurn | null {
    const fight = this.fight;
    const turnNo = state.turn;
    if (!fight || turnNo === null || !inCombat(state)) return null;
    const last = fight.turns.at(-1);
    if (last && last.turn === turnNo) return last;
    if (state.combat?.can_use_combat_actions === false) return last ?? null;
    const player = asRecord(asRecord(state.raw["combat"])["player"]);
    const living = livingEnemies(state);
    const names = livingNames(living);
    const turn: SlTurn = {
      turn: turnNo,
      hp: numOrNull(player["current_hp"]),
      block: numOrNull(player["block"]),
      enemies: living.map((enemy, i) => `${names[i]} ${num(enemy["current_hp"])}/${num(enemy["max_hp"])}`).join(", "),
      plays: [],
    };
    fight.turns.push(turn);
    return turn;
  }

  private close(result: SlResult, state: GameState): void {
    const fight = this.fight;
    if (!fight) return;
    this.writeRow(fight, result, state, { reload: null, giveUp: null });
    this.fight = null;
  }

  private writeRow(fight: FightTrack, result: SlResult, state: GameState, extra: { reload: SlReloadRecord | null; giveUp: string | null }): void {
    const verdict = fight.verdict;
    const predicted = result === "predicted_death";
    const last = fight.turns.at(-1);
    const player = asRecord(asRecord(state.raw["combat"])["player"]);
    const row: SlAttemptRow = {
      ts: new Date().toISOString(),
      run_id: fight.runId,
      act: fight.act,
      floor: fight.floor,
      encounter: fight.encounter,
      enemies: fight.enemies,
      fight_kind: fight.kind,
      elite: fight.elite,
      attempt: fight.attempt,
      max_attempts: fight.maxAttempts,
      from: attemptFrom(fight.attempt, fight.floor),
      started_at: fight.startedAt,
      ended_at: new Date().toISOString(),
      result,
      turns: last?.turn ?? state.turn ?? 0,
      end_hp: predicted ? numOrNull(player["current_hp"]) : result === "won" ? (state.run?.current_hp ?? null) : 0,
      end_block: predicted ? numOrNull(player["block"]) : null,
      incoming: verdict?.incoming ?? null,
      // A death keeps the last end_turn's verdict, certain or not (7PWU F48: a death the judge let through left no trace).
      judge: verdict && (predicted || result === "died") ? { tier: verdict.certain ? verdict.tier : null, reason: verdict.certain ? verdict.reason : `not certain: ${verdict.reason}`, ...(verdict.certain && verdict.early ? { early: true as const } : {}) } : null,
      reload: extra.reload,
      give_up_reason: extra.giveUp,
      summary: { turns: fight.turns, potions: fight.potions, killers: predicted || result === "died" ? (verdict?.killers ?? []) : [] },
      draws: { ...fight.draws.record, order: [...fight.draws.record.order], names: [...fight.draws.record.names], turns: [...fight.draws.record.turns] },
      ...(fight.explore ? { explore: structuredClone(fight.explore) } : {}),
    };
    this.rows.push(row);
    this.log.write(row);
  }
}
