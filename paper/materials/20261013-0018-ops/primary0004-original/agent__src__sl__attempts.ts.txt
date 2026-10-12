/**
 * SL attempts (docs/sl.md §4): what one attempt at a fight did, the log row it ends as (logs/sl-attempts.jsonl, one
 * row per attempt), reading a run's rows back (a restarted process keeps the attempt count), and the "previous
 * attempts" block a retried fight's combat questions carry.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { asArray, asRecord, numOrNull, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { SlDraws } from "./draws.js";
import type { SlExploreRecord } from "./explore.js";
import type { DeathVerdict, JudgeTier } from "./judge.js";

/** Observed Silent A10 blast state; the displayed HP belongs to the husk, not the defeated body. */
export interface SlGiantPhase {
  phase: "blast_pending";
  enemy_id: "WATERFALL_GIANT";
  move_id: "EXPLODE_MOVE";
  raw_hp: number;
  max_hp: 999999999;
  body_hp: 0;
  /** The displayed intent at the turn's first actionable state, not damage already dealt. */
  incoming_at_turn_start: number;
}

/** Pre-end-turn resources, kept separately from turn-start and post-death HP. */
export interface SlGiantFinalResources {
  hp: number;
  block: number;
  incoming: number;
  end_block: 0;
  minimum_extra_hp: number;
}

/** NYQW6JAD30K4 F17 T12/T13: only the observed modifier set has an exact plain-hit budget. */
export function giantFinalResources(state: GameState, verdict: DeathVerdict): SlGiantFinalResources | null {
  const phase = giantPhaseAtTurnStart(state);
  if (!phase || !verdict.certain || verdict.tier !== "rules" || verdict.early || verdict.endBlock !== 0 ||
      verdict.held || verdict.startLoss || verdict.sandpit || verdict.revive) return null;
  const run = asRecord(state.raw["run"]);
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  const enemy = asArray(combat["enemies"]).map(asRecord).find((e) => e["is_alive"] === true)!;
  // Unknown modifiers remain unknown; this is not a general survival formula or a new death verdict.
  const relics = ["RING_OF_THE_SNAKE", "WINGED_BOOTS", "TINGSHA", "BOOK_OF_FIVE_RINGS"];
  if (!Array.isArray(run["relics"]) || !Array.isArray(run["potions"]) || !Array.isArray(player["powers"]) ||
      !Array.isArray(player["orbs"]) || player["orbs"].length !== 0 ||
      !Array.isArray(player["pets"]) || player["pets"].length !== 0 ||
      !Array.isArray(enemy["powers"]) || asArray(enemy["powers"]).some((p) => {
        const power = asRecord(p);
        return !((power["power_id"] === "POISON_POWER" && power["amount"] === 3) ||
          (power["power_id"] === "WEAK_POWER" && power["amount"] === 1));
      }) ||
      asArray(run["relics"]).some((r) => !relics.includes(str(asRecord(r)["relic_id"]))) ||
      asArray(run["potions"]).some((p) => asRecord(p)["occupied"] !== false) ||
      asArray(player["powers"]).some((p) => {
        const power = asRecord(p);
        return !((power["power_id"] === "AFTERIMAGE_POWER" && power["amount"] === 1) ||
          (power["power_id"] === "NOXIOUS_FUMES_POWER" && power["amount"] === 3));
      })) return null;
  const hp = numOrNull(player["current_hp"]);
  const block = numOrNull(player["block"]);
  if (hp === null || block === null || !Number.isInteger(hp) || hp <= 0 || !Number.isInteger(block) || block < 0 ||
      verdict.hp !== hp || verdict.block !== block || verdict.incoming !== phase.incoming_at_turn_start) return null;
  return { hp, block, incoming: verdict.incoming, end_block: 0,
    minimum_extra_hp: Math.max(0, verdict.incoming - block - hp + 1) };
}

export function giantFinalResourcesText(resources: SlGiantFinalResources | undefined): string {
  return resources
    ? `结束回合前最终来袭${resources.incoming}，${resources.hp}血＋${resources.block}挡＋回合末${resources.end_block}挡；保持该末态要存活至少还差${resources.minimum_extra_hp}血（不是替线胜率）`
    : "结束回合前资源或结算依据不全，最终存活缺口未知";
}

/** YQL8RZ8BWN1E F17 T10 (states 280160/280161); no inference from enemy names or HP alone. */
export function giantPhaseAtTurnStart(state: GameState): SlGiantPhase | null {
  const run = asRecord(state.raw["run"]);
  if (str(run["character_id"]).toUpperCase() !== "SILENT" || numOrNull(run["ascension"]) !== 10) return null;
  const living = asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] === true);
  if (living.length !== 1) return null;
  const enemy = living[0]!;
  const hp = numOrNull(enemy["current_hp"]);
  if (str(enemy["enemy_id"]) !== "WATERFALL_GIANT" || numOrNull(enemy["max_hp"]) !== 999999999 ||
      str(enemy["move_id"]) !== "EXPLODE_MOVE" || hp === null || !Number.isInteger(hp) || hp <= 0 || hp > 999999999) return null;
  const intents = asArray(enemy["intents"]).map(asRecord);
  if (intents.length !== 1 || str(intents[0]!["intent_type"]) !== "DeathBlow" || numOrNull(intents[0]!["hits"]) !== 1) return null;
  const damage = numOrNull(intents[0]!["damage"]);
  if (damage === null || !Number.isInteger(damage) || damage <= 0 ||
      asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "STEAM_ERUPTION_POWER")) return null;
  return { phase: "blast_pending", enemy_id: "WATERFALL_GIANT", move_id: "EXPLODE_MOVE", raw_hp: hp,
    max_hp: 999999999, body_hp: 0, incoming_at_turn_start: damage };
}

/** One turn of an attempt: our HP and block and the enemies' HP when the turn began, and what we played. */
export interface SlTurn {
  turn: number;
  hp: number | null;
  block: number | null;
  /** "name hp/max" per living enemy. */
  enemies: string;
  /** Present only for the directly observed Silent A10 blast shape; old rows remain uninterpreted. */
  giant_phase?: SlGiantPhase;
  /** Captured only at the actual end-turn check, never from an early least-loss projection. */
  giant_final_resources?: SlGiantFinalResources;
  /** Cards ("name -> target") and potions ("potion name") in the order they went out. */
  plays: string[];
}

export type SlResult = "won" | "died" | "predicted_death" | "unfinished";

export interface SlReloadRecord {
  ok: boolean;
  ms: number;
  /** The step that failed and why (a failed reload). */
  step?: string;
  reason?: string;
  /** The turn the game resumed the fight on (a successful reload; 1 expected). */
  resumed_turn?: number | null;
}

/** An SL fight's room, as the attempt rows write it (fight_kind). */
export type SlRoom = "boss" | "elite" | "hallway" | "event";

export interface SlAttemptRow {
  ts: string;
  run_id: string;
  act: string | null;
  floor: number | null;
  /** The enemies at the fight's start: sorted ids joined with "+". */
  encounter: string;
  enemies: string[];
  /**
   * The room (2026-10-04): boss; elite (an elite room); hallway (a monster room); event (a ? room's fight). By the map node
   * the run chose for the floor (RunJournal.roomOf), else by the enemies (an elite enemy: elite; else hallway). Rows written
   * before it say "elite" for every SL fight but a boss (a listed hard fight in any room, an SL_ACT3_LOW_HP fight): `gate`
   * says why the fight got SL, the log DB's fights view says the room of any row (`fights.room`).
   */
  fight_kind: SlRoom;
  /** The listed elite's name (sl-elites.json), null for a boss and an SL_ACT3_LOW_HP fight. */
  elite: string | null;
  /**
   * Why the fight gets SL (controller.ts slGate): "boss", "hard-fight" (sl-elites.json), or "act3-low-hp 31/88" (SL_ACT3_LOW_HP:
   * an act-3 fight with no boss entered below the line, its entry HP / max HP). Absent on rows written before 2026-10-03's
   * SL_ACT3_LOW_HP (those are boss or hard-fight, as fight_kind says).
   */
  gate?: string;
  /** 1 = the first play of the fight; k = the (k-1)th reload. */
  attempt: number;
  /** 1 + the retries this kind of fight gets (SL_BOSS_RETRIES / SL_ELITE_RETRIES, the latter for hard-fight and act3-low-hp). */
  max_attempts: number;
  /** Where the attempt started: the first play, or the game's room-entry save after a reload. */
  from: string;
  started_at: string;
  ended_at: string;
  /** won; died (no SL: retries used up, SL stopped, or a death the judge did not foresee); predicted_death (SL fired). */
  result: SlResult;
  /** The last turn played. */
  turns: number;
  end_hp: number | null;
  end_block: number | null;
  /** The attack intents at the end (predicted_death). */
  incoming: number | null;
  /**
   * The certain-death verdict that ended the attempt (or that came with no retries left); `early` (SL_RELOAD_EARLY): taken
   * at the least-loss decision, before its line was played.
   */
  judge: { tier: JudgeTier | null; reason: string; early?: true } | null;
  reload: SlReloadRecord | null;
  /** Set when SL stopped for the rest of this run, and why (a failed reload, the wrong fight after Continue). */
  give_up_reason: string | null;
  summary: { turns: SlTurn[]; potions: string[]; killers: string[] };
  /**
   * The order cards came off the draw pile in this attempt (draws.ts; docs/sl.md §10): what a later attempt's known draws
   * come from, kept here so a restarted process has it. Absent on rows written before 2026-10-02's SL_RETRY_KNOWN_DRAWS.
   */
  draws?: SlDraws | null;
  /**
   * SL_RETRY_EXPLORE (explore.ts; docs/sl.md §11), attempts from the 2nd: each decision point's board and the line chosen
   * there, the deviation point this attempt aimed at (3+) and what came of it. What later attempts pick their deviation
   * point from, kept here so a restarted process has it. Absent with the switch off and on rows written before it.
   */
  explore?: SlExploreRecord;
}

export interface SlLog {
  readonly path: string | null;
  write(row: SlAttemptRow): void;
  /** This run's rows already in the file (a restarted process continues its attempt counts). */
  readRun(runId: string): SlAttemptRow[];
}

export function createSlLog(path: string | null): SlLog {
  return {
    path,
    write(row) {
      if (!path) return;
      try {
        mkdirSync(dirname(path), { recursive: true });
        appendFileSync(path, `${JSON.stringify(row)}\n`, "utf8");
      } catch {
        // Losing a log line must never stop a run.
      }
    },
    readRun(runId) {
      if (!path || !existsSync(path)) return [];
      try {
        return readFileSync(path, "utf8")
          .split("\n")
          .filter((line) => line.includes(runId))
          .flatMap((line) => {
            try {
              const row = JSON.parse(line) as SlAttemptRow;
              return row.run_id === runId ? [row] : [];
            } catch {
              return [];
            }
          });
      } catch {
        return [];
      }
    },
  };
}

/** The attempt's start, as the log and the prompt say it. */
export function attemptFrom(attempt: number, floor: number | null): string {
  return attempt <= 1 ? "first play of the fight" : `reloaded from the game's room-entry save of F${floor ?? "?"} (save_and_quit, continue_run)`;
}

const MAX_TURN_LINES = 25;

function turnLine(turn: SlTurn): string {
  const hp = turn.hp === null ? "? HP" : `${turn.hp} HP${turn.block ? ` + ${turn.block} block` : ""}`;
  const phase = turn.giant_phase ? `；本体剩血0，自爆仍待结算（轮初显示${turn.giant_phase.incoming_at_turn_start}伤害）；近十亿血是占位血，不代表本体进度或获胜；${giantFinalResourcesText(turn.giant_final_resources)}` : "";
  return `T${turn.turn}: ${hp}; ${turn.enemies || "no enemies"}${phase}; played ${turn.plays.length > 0 ? turn.plays.join(", ") : "nothing"}`;
}

function endLine(row: SlAttemptRow): string {
  const at = `T${row.turns}`;
  const where = row.end_hp === null ? "" : ` with ${row.end_hp} HP + ${row.end_block ?? 0} block against ${row.incoming ?? "?"} incoming`;
  const who = row.summary.killers.length > 0 ? ` from ${row.summary.killers.join(", ")}` : "";
  switch (row.result) {
    case "predicted_death":
      // SL_RELOAD_EARLY: reloaded at the planner's least-loss verdict, before its line was played out.
      if (row.judge?.early) return `certain death on ${at}${where}${who}: every line the planner simulated dies (the fight was reloaded before playing it out)`;
      return `certain death at the end of ${at}${where}${who} (the fight was reloaded before the enemy turn)`;
    case "died":
      return `died after ${at}${who}`;
    case "won":
      return `won on ${at}`;
    default:
      return `unfinished at ${at}`;
  }
}

/**
 * The combat questions' `previous_attempts` on a retried fight: information, not an order (the ranking and the
 * options are unchanged; Jev still chooses).
 */
export function previousAttemptsJson(rows: readonly SlAttemptRow[], attempt: number, maxAttempts: number, options: { knownDraws?: boolean } = {}): JsonValue {
  return {
    note:
      "SL retry: this fight was reloaded from its start (the game's save from entering the room) because the earlier attempt(s) below " +
      "reached a certain death. The deck, the draws and the enemy moves are the same as long as the plays are the same, so playing " +
      "the same way loses the same way: look for a different line (when to block, which enemy to kill first, when to drink which potion, " +
      "which cards to set up). Information, not an order: the options and their numbers are unchanged and you still choose." +
      // SL_RETRY_KNOWN_DRAWS (docs/sl.md §10): the logs show the draw pile's order holding whatever is played, until a reshuffle.
      (options.knownDraws
        ? " The draw pile comes in the same order whatever you play (a card drawn earlier just arrives earlier), until the discard pile is reshuffled: known_draws lists the next cards when they are known."
        : ""),
    this_attempt: `attempt ${attempt} of at most ${maxAttempts}`,
    attempts: rows.map((row) => {
      const turns = row.summary.turns.slice(0, MAX_TURN_LINES).map(turnLine);
      if (row.summary.turns.length > MAX_TURN_LINES) turns.push(`(${row.summary.turns.length - MAX_TURN_LINES} more turns)`);
      return {
        attempt: row.attempt,
        ended: endLine(row),
        potions_drunk: row.summary.potions.length > 0 ? row.summary.potions.join(", ") : "none",
        turns,
      };
    }),
  };
}
