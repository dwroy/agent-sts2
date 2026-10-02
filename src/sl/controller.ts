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
 *   plays on normally. Retries used up: the turn ends as usual and the death is the run's.
 * - envFor(): on attempts after the first, the combat questions' "previous attempts" block and SL_RETRY_SHOW_SIM.
 * - decisionFields(): sl_attempt / sl_reloads on every decision row.
 *
 * Nothing here touches a save file: the game restarts the fight from the save it wrote on entering the room.
 */
import type { SlConfig } from "../config.js";
import type { ActionRequest } from "../mod/client.js";
import type { GameState } from "../mod/schema.js";
import type { Knowledge } from "../knowledge/index.js";
import type { RunJournal } from "../project/run-journal.js";
import type { ScreenMemory, SlEnv } from "../project/types.js";
import { isMenuRunId } from "../project/journal-replay.js";
import { distinctNames, revivesOf } from "../screens/combat-plan.js";
import { asArray, asRecord, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { attemptFrom, createSlLog, previousAttemptsJson, type SlAttemptRow, type SlLog, type SlReloadRecord, type SlResult, type SlTurn } from "./attempts.js";
import { listedElite, loadSlElites, type SlEliteList } from "./elites.js";
import { judgeEndTurn, type DeathVerdict } from "./judge.js";
import { encounterOf, reloadFight, type ReloadDeps, type ReloadOutcome } from "./reload.js";

export type { SlConfig };

export type { SlEnv };

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
}

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
    return { attempt: fight.attempt, maxAttempts: fight.maxAttempts, previousAttempts: previousAttemptsJson(previous, fight.attempt, fight.maxAttempts), showSim: this.config.retryShowSim };
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
  async beforeEndTurn(state: GameState, context: { label: string; screenMemory: ScreenMemory; journal: RunJournal }): Promise<EndTurnOutcome> {
    const fight = this.fight;
    if (!fight || this.stopped !== null || (state.run?.floor ?? null) !== fight.floor) return { handled: false };
    const maxHp = num(asRecord(asRecord(state.raw["combat"])["player"])["max_hp"], state.run?.max_hp ?? 0);
    const revives = revivesOf(state, context.screenMemory, maxHp).map((revive) => revive.source);
    const verdict = judgeEndTurn(state, { label: context.label, revives });
    fight.verdict = verdict;
    const where = `F${fight.floor ?? "?"} T${state.turn ?? "?"} attempt ${fight.attempt}/${fight.maxAttempts}`;
    if (!verdict.certain) {
      // Said only when the mod itself calls the end of turn lethal: the deaths SL let through, and why.
      if (asRecord(state.raw["combat"])["end_turn_will_kill_player"] === true) this.options.note(`SL: ending the turn may be lethal (${where}), not certain: ${verdict.reason}`);
      return { handled: false };
    }
    if (fight.attempt >= fight.maxAttempts) {
      this.options.note(`SL: certain death foreseen at ${where} (${verdict.reason}); no retry left, the turn ends as usual`);
      return { handled: false };
    }
    this.options.note(`SL: certain death foreseen at ${where} (${verdict.tier}: ${verdict.reason}); reloading the fight: save_and_quit, then continue_run`);
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
    if (fight.journal !== undefined) context.journal.restore(fight.journal);
    context.screenMemory.lizardTail = fight.lizardTail === undefined ? undefined : structuredClone(fight.lizardTail);
    this.noteTurn(outcome.state);
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
      judge: verdict && (predicted || (result === "died" && verdict.certain)) ? { tier: verdict.tier, reason: verdict.reason } : null,
      reload: extra.reload,
      give_up_reason: extra.giveUp,
      summary: { turns: fight.turns, potions: fight.potions, killers: predicted || result === "died" ? (verdict?.killers ?? []) : [] },
    };
    this.rows.push(row);
    this.log.write(row);
  }
}
