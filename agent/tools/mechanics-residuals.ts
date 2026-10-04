/**
 * Mechanics audit, step 1 (docs/mechanics-learning.md): on every logged combat turn, the turn solver's predicted HP loss
 * for the line actually played against the HP actually lost, grouped by the enemy powers on the board, the enemy powers
 * stripped that turn and the enemy ids. A mechanic the solver does not model shows up as a bias in its groups: the
 * Thieving Hopper's Flutter, whose last stack stripped stuns it and cancels its attack (MCK9SMSK40ZY F19 T4: Nab 14
 * predicted, 0 lost), is an over-prediction on the turns it was stripped. The learner's mechanics-audit task reads the
 * report (learner/tasks/mechanics-audit.md). No model is called; logs/ and the log DB are only read.
 *
 * Each turn: the first planning decision's state (as tools/thief-facts-replay.ts picks it), planned by the current code
 * three times, MECH_RULES off, on, and on with MECH_MOVE_RULES (the rollout and the boss simulation off: only the solver's
 * lines are needed), with the Surrounded facing the live loop had then (the last enemy targeted earlier in the fight,
 * combat-plan noteFacing; a fresh process's startFacing misread the Kaiser Crab: -4.4 HP a turn on the 242 turns where it
 * differed, 2026-10-02); the line
 * played is the turn's plays and drinks from that decision to its end-turn, matched to a solver line by card ids (with
 * the upgrade mark of the card in hand when it was played) and targets (a turn that played a card drawn after the
 * decision has no such line: unmatched). A target is the game's index at that moment: an enemy's death compacts the list
 * (H7W047ZCEBSA F29 T5: the Fight Me kill made the Ovicopter [2], not [3]), so it is mapped back through the frames to
 * the decision's index, which the solver's lines use. Actual = our HP at the decision's frame less our HP at the next
 * turn's first frame (the fight's last frame when it was won on our turn, all of it when we died). A turn a revive
 * caught (a Fairy in a Bottle gone, or Lizard Tail's heal over the enemy turn) is a death: its HP back is not a
 * negative loss (2WUMK6PK5QHD F48 T7: 10 -> 30, -35 against the solver). A line the Sandpit ends (sandpitAfter <= 0)
 * predicts all our HP: the solver's hp_lost leaves that death out. A turn whose fight ended in the enemy turn without
 * our death is left out (no frame after it). A turn won on our turn is a group of its own, out of the bias: its
 * last frame is before the killing card, so that card's Thorns or HP cost is not in the actual (UNRLW0W3XWLD F31 T2:
 * 16 vs 26, the killing Whirlwind's 10 Thorns came after the last frame).
 *
 * Usage (from the repo root):
 *   npx tsx tools/mechanics-residuals.ts run [--shards 8] [--work experiments/mechanics] [--limit N] [--min-asc 0] [--monster-db PATH] [--only CRUSHER,AXEBOT]
 *   npx tsx tools/mechanics-residuals.ts report [--work experiments/mechanics] [--out notes/mechanics-residuals.md] [--min-n 20] [--monster-db PATH]
 * --monster-db: the monster DB the planner and the report read (default knowledge/common/monster-db.json; a freshly built one
 * with `observed` for MECH_RULES on: python3 knowledge/builders/build-monster-db.py --out PATH).
 * `run` starts the shards (`shard --shard I --shards N`, one process each, nice 10) and then the report. Output:
 * <work>/rows-<I>.jsonl (a row a turn), <work>/summary.json (the groups), and the markdown report.
 */
import { execFileSync, spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests, type MonsterDb } from "../src/knowledge/monster-db.js";
import { isStripStun, STUN_MOVE, type StrippedPower } from "../src/knowledge/mechanics.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { facingFightOf, planCombatTurn } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { solveTap, type Plan } from "../src/strategy/turn-solver.js";
import { enemyIndexMaps, type FrameEnemy } from "./mechanics-align.js";
import { fromRoot } from "../src/core/paths.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "../src/knowledge/files.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const stage = process.argv[2] ?? "run";
const work = arg("work", fromRoot("experiments/mechanics"));
const STATES = fromRoot("logs/states.jsonl");
const MONSTER_DB = arg("monster-db", knowledgeFile(KNOWLEDGE_DIR, "monster-db.json"));
const PY = fromRoot("data/logdb-venv/bin/python");
/** Labels of a fresh plan of the turn (not a committed line's next step): tools/thief-facts-replay.ts's. */
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
/** Thrown at the planner's main solve to cut the rest of it short (only the solver's lines are compared). */
const CUT = new Error("mechanics-residuals: solve taken");
/** Planning decisions of a turn tried before giving up on finding its line. */
const MAX_STARTS = 3;

type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "120", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

/** One turn's result (rows-<I>.jsonl). */
export interface TurnRow {
  run: string;
  floor: number;
  turn: number;
  asc: number;
  encounter: string;
  label: string;
  decider: string;
  /** Which of the turn's planning decisions was compared (0: the first; a later one when the first's line was not found). */
  from: number;
  /** Living enemy ids at the decision, and each one's powers (id -> amount). */
  enemies: { id: string; powers: Record<string, number> }[];
  /** Powers up at the decision and gone (or <= 0) at the turn's end-turn frame on an enemy still alive there. */
  stripped: { id: string; power: string; stunned: boolean }[];
  played: string;
  matched: boolean;
  wonTurn: boolean;
  died: boolean;
  /** Our HP at the compared decision. */
  hp0?: number;
  /** A revive caught us in the enemy turn (counted as a death: actual = hp0). */
  revived?: "fairy" | "lizard" | null;
  /** A target was mapped to the decision's index (an enemy died earlier in the turn and the game compacted the list). */
  remapped?: boolean;
  /** The matched line (MECH_RULES on) ends in the Sandpit: its prediction is all our HP. */
  sandpitDeath?: boolean;
  actual: number | null;
  predOff: number | null;
  predOn: number | null;
  /** MECH_RULES and MECH_MOVE_RULES on. */
  predMove?: number | null;
  /** The matched line sets off a learned strip-stun (MECH_RULES on). */
  stunOn: boolean;
  /** The matched line sets off a learned move change (MECH_MOVE_RULES on): the enemy id, power and new move. */
  moveOn?: string[];
  /** The Surrounded facing given to the planner (the last target before the decision; null: none yet, startFacing). */
  facing?: number | null;
  /** Enemies the line kills this turn (MECH_MOVE_RULES on; names). */
  kills?: string[];
}

// ---------------------------------------------------------------- shard

/**
 * A play as "ID>target", "ID+>target" for an upgraded card: the decisions log the id without the mark, and a drawn
 * Strike+ played read as the hand's plain Strike, so the first decision's line matched a play it never had
 * (SK1USHSB1U7U F17 T7: 0 vs 34, Burning Pact drew the Strike+ that killed the Soul Fysh).
 */
function stepKey(cardId: string, target: number | string | null, upgraded = false): string {
  const id = cardId.startsWith("POTION:") ? cardId.split(":").slice(0, 2).join(":") : `${cardId.replace(/\+$/, "")}${upgraded ? "+" : ""}`;
  return `${id}>${target ?? "-"}`;
}

/** A plan's plays as the decisions log them: card id (potions POTION:<id>), upgrade mark and target, in order. */
function planKey(plan: Plan): string {
  return plan.steps.map((step) => stepKey(step.cardId, step.target, !step.cardId.startsWith("POTION:") && step.upgraded)).join(",");
}

/** Fairy in a Bottle gone, or Lizard Tail's heal: HP up by this much over the enemy turn (and to 40% of max HP or more). */
const REVIVE_RISE = 8;
const LIZARD_SHARE = 0.4;

/** The line ends in the Sandpit (its count at 0 after the enemy turn): the solver's hp_lost leaves that death out. */
function sandpitDeath(plan: Plan): boolean {
  return plan.outcome.sandpitAfter !== null && plan.outcome.sandpitAfter <= 0;
}

/**
 * A line's predicted HP loss this turn: its hp_lost, or all our HP when the Sandpit ends it (LXB3B2WT9E0W F33 T5: 81
 * lost, 0 predicted; 29 death turns against the Insatiable read +206 before).
 */
function predicted(plan: Plan | null, hp0: number): number | null {
  if (plan === null) return null;
  return sandpitDeath(plan) ? Math.max(plan.outcome.hpLoss, hp0) : plan.outcome.hpLoss;
}

/** A plan's card indexes at the moment each was played (a play takes its card out; the later ones shift down). */
function playIndexes(plan: Plan): number[] {
  const played: number[] = [];
  return plan.steps.map((step) => {
    if (step.cardId.startsWith("POTION:")) return -1;
    const at = step.cardIndex - played.filter((index) => index < step.cardIndex).length;
    played.push(step.cardIndex);
    return at;
  });
}

function shard(): void {
  const index = Number(arg("shard", "0"));
  const shards = Number(arg("shards", "1"));
  const limit = Number(arg("limit", "1000000"));
  const minAsc = Number(arg("min-asc", "0"));
  mkdirSync(work, { recursive: true });
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
  potionMcOptions.budgetMs = 5;
  // The planner's monster DB (its `observed` block is what MECH_RULES on reads).
  setMonsterDbForTests(JSON.parse(readFileSync(MONSTER_DB, "utf8")) as MonsterDb);
  const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
  const config = loadConfig({} as NodeJS.ProcessEnv);
  // --only: the fights with any of these enemy ids (a quick look at one group).
  const only = arg("only", "").split(",").filter(Boolean);
  const onlySql = only.length > 0 ? ` AND (${only.map((id) => `list_contains(monsters, '${id.replace(/'/g, "")}')`).join(" OR ")})` : "";
  const fights = query(`SELECT run_id, floor, fight_no, ascension, encounter, outcome, first_off, last_off, first_ts FROM fights WHERE ascension >= ${minAsc}${onlySql} ORDER BY first_ts`);
  // Each frame's enemies (the game's indexes then: a death compacts them), Fairies in the belt and Lizard Tail (revives).
  const frames = query(
    "SELECT run_id, floor, turn, ts, off, len, observed, player_hp, max_hp, list_transform(enemies, e -> struct_pack(idx := e.idx, id := e.id, hp := e.hp, max_hp := e.max_hp)) AS enemies, " +
      "len(list_filter(potions, x -> x = 'FAIRY_IN_A_BOTTLE')) AS fairies, list_contains(relics, 'LIZARD_TAIL') AS lizard FROM frames WHERE screen = 'COMBAT' ORDER BY off",
  );
  const decisions = query(
    "SELECT run_id, floor, turn, ts, label, decider, action, card_index, card_id, target_index, potion_id FROM decisions WHERE screen = 'COMBAT' AND action IN ('play_card', 'use_potion', 'end_turn') ORDER BY ts",
  );
  const framesByRun = new Map<string, Row[]>();
  for (const frame of frames) {
    const list = framesByRun.get(String(frame["run_id"])) ?? [];
    list.push(frame);
    framesByRun.set(String(frame["run_id"]), list);
  }
  const decisionsAt = new Map<string, Row>();
  for (const decision of decisions) decisionsAt.set(`${decision["run_id"]}|${decision["ts"]}`, decision);
  // Targeted plays and drinks by run, in order: the Surrounded facing the live loop noted (combat-plan noteFacing).
  const targetedByRun = new Map<string, Row[]>();
  for (const decision of decisions) {
    if (decision["action"] === "end_turn" || decision["target_index"] === null || decision["target_index"] === undefined) continue;
    const list = targetedByRun.get(String(decision["run_id"])) ?? [];
    list.push(decision);
    targetedByRun.set(String(decision["run_id"]), list);
  }
  const fd = openSync(STATES, "r");
  const stateAt = (off: number, len: number): Record<string, unknown> => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>;
  };
  const out = join(work, `rows-${index}.jsonl`);
  writeFileSync(out, "");
  let done = 0;
  const started = Date.now();
  fights.forEach((fight, fightIndex) => {
    if (fightIndex % shards !== index || done >= limit) return;
    const run = String(fight["run_id"]);
    const inFight = (framesByRun.get(run) ?? []).filter((frame) => Number(frame["off"]) >= Number(fight["first_off"]) && Number(frame["off"]) <= Number(fight["last_off"]));
    const own = inFight.filter((frame) => frame["observed"] !== true);
    const turns = [...new Set(own.map((frame) => Number(frame["turn"])))].sort((a, b) => a - b);
    const died = fight["outcome"] === "died";
    for (const turn of turns) {
      if (done >= limit) break;
      const turnFrames = own.filter((frame) => Number(frame["turn"]) === turn);
      const withDecision = turnFrames.map((frame) => ({ frame, decision: decisionsAt.get(`${run}|${frame["ts"]}`) ?? null }));
      // The turn's planning decisions in order: the first one whose rest of the turn (its plays to the end-turn) is a line
      // of the solver's is the one compared (a card drawn after the first and played is in the next re-plan's lines).
      const starts = withDecision.flatMap((entry, i) => (entry.decision !== null && PLANNING.test(String(entry.decision["label"])) ? [i] : [])).slice(0, MAX_STARTS);
      if (starts.length === 0) continue;
      const next = own.find((frame) => Number(frame["turn"]) === turn + 1) ?? null;
      const powersOf = (enemy: Row): Record<string, number> =>
        Object.fromEntries(((enemy["powers"] as Row[] | undefined) ?? []).map((power) => [String(power["power_id"]), typeof power["amount"] === "number" ? (power["amount"] as number) : 0]));
      let row: TurnRow | null = null;
      for (const [attempt, at] of starts.entries()) {
        const first = withDecision[at]!.decision!;
        const startFrame = withDecision[at]!.frame;
        const tail = withDecision.slice(at);
        const actions = tail.flatMap((entry, k) => (entry.decision !== null ? [{ frame: entry.frame, decision: entry.decision, k }] : []));
        const endAt = actions.findIndex((entry) => entry.decision["action"] === "end_turn");
        const plays = (endAt >= 0 ? actions.slice(0, endAt) : actions).filter((entry) => entry.decision["action"] !== "end_turn");
        // Each play's target as the decision frame's index (the solver's): mapped back through the frames when an enemy
        // died earlier in the turn; a target with no such enemy is "?" (no line has it).
        const targetOf = (decision: Row): number | null => (decision["target_index"] === null || decision["target_index"] === undefined ? null : Number(decision["target_index"]));
        const indexMaps = enemyIndexMaps(
          tail.map((entry) => (entry.frame["enemies"] as FrameEnemy[] | null) ?? []),
          tail.map((entry) => (entry.decision !== null && entry.decision["action"] !== "end_turn" ? targetOf(entry.decision) : null)),
        );
        let remapped = false;
        const playedKey = plays
          .map((entry) => {
            const decision = entry.decision;
            const target = targetOf(decision);
            const mapped = target === null ? null : indexMaps[entry.k]?.get(target) ?? null;
            if (target !== null && mapped !== target) remapped = true;
            if (decision["action"] === "use_potion") return stepKey(`POTION:${String(decision["potion_id"])}`, target === null ? null : mapped ?? "?");
            // The card in hand when it was played: its upgrade mark (the decisions log the id alone).
            const hand = ((stateAt(Number(entry.frame["off"]), Number(entry.frame["len"]))["combat"] as Row | undefined)?.["hand"] as Row[] | undefined) ?? [];
            const card = hand.find((held) => Number(held["index"]) === Number(decision["card_index"]));
            return stepKey(String(decision["card_id"]), target === null ? null : mapped ?? "?", card?.["upgraded"] === true);
          })
          .join(",");
        const playedIndexes = plays.map((entry) => (entry.decision["action"] === "use_potion" ? -1 : Number(entry.decision["card_index"])));
        const endFrame = endAt >= 0 ? actions[endAt]!.frame : null;
        const hp0 = Number(startFrame["player_hp"]);
        const wonTurn = endAt < 0 && next === null && !died;
        // A revive in the enemy turn: a Fairy in a Bottle gone (never drunk by hand: 0 logged), or Lizard Tail held and our HP
        // up 8+ over the enemy turn to 40%+ of max (it heals to 50%; the relic shows no used state). Over the logs: 11 Fairy
        // turns, 4 Lizard Tail turns (0NG27W8QBNYX F24 T2 17 -> 35 of 71), no other enemy-turn rise of 8+ with Lizard Tail held.
        const endHp = Number((endFrame ?? turnFrames[turnFrames.length - 1]!)["player_hp"]);
        let revived: TurnRow["revived"] = null;
        if (next && Number(next["fairies"] ?? 0) < Number(startFrame["fairies"] ?? 0)) revived = "fairy";
        else if (next && startFrame["lizard"] === true && next["lizard"] === true && Number(next["player_hp"]) - endHp >= REVIVE_RISE && Number(next["player_hp"]) >= LIZARD_SHARE * Number(next["max_hp"])) revived = "lizard";
        let actual: number | null = null;
        if (revived) actual = hp0;
        else if (next) actual = hp0 - Number(next["player_hp"]);
        else if (died) actual = hp0;
        else if (wonTurn) actual = hp0 - Number(inFight[inFight.length - 1]!["player_hp"]);
        const raw = stateAt(Number(startFrame["off"]), Number(startFrame["len"]));
        const state = parseGameState(raw);
        const brief = buildRunBrief(state, knowledge);
        // The facing the live loop had: the last targeted play or drink of this fight before the decision.
        const startTs = String(first["ts"]);
        const earlier = (targetedByRun.get(run) ?? []).filter((decision) => Number(decision["floor"]) === Number(fight["floor"]) && String(decision["ts"]) >= String(fight["first_ts"]) && String(decision["ts"]) < startTs);
        const facing = earlier.length > 0 ? Number(earlier[earlier.length - 1]!["target_index"]) : null;
        const plan = (mech: boolean, move = false): Plan | null => {
          const env: DecisionEnv = {
            state, knowledge, brief, screenMemory: { ...createScreenMemory("COMBAT"), ...(facing !== null ? { facing, facingFight: facingFightOf(state) } : {}) }, thresholds: config.thresholds, runStart: "auto",
            characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek", mechRules: mech, mechMoveRules: move,
          };
          // Only the planner's main solve is needed (its every line): taken at the first solveTurn, the rest of the planner
          // cut short (a 12-card hand's 26,915 lines took minutes after it: JRN33CL7EB50 F28 T1). MECH_RULES on: the fail
          // safe plans again with the rules off on the cut; that second solve is not taken.
          let lines: Plan[] | null = null;
          solveTap.onSolve = (_input, result) => {
            lines ??= result.plans;
            throw CUT;
          };
          try {
            planCombatTurn(env);
          } catch (error) {
            if (error !== CUT) return null;
          } finally {
            solveTap.onSolve = null;
          }
          const matches = ((lines ?? []) as Plan[]).filter((candidate) => planKey(candidate) === playedKey);
          return matches.find((candidate) => playIndexes(candidate).every((value, i) => value < 0 || value === playedIndexes[i])) ?? matches[0] ?? null;
        };
        const off = plan(false);
        if (off === null && attempt < starts.length - 1) continue;
        const on = off === null ? null : plan(true);
        const moved = off === null ? null : plan(true, true);
        const living = ((raw["combat"] as Row | undefined)?.["enemies"] as Row[] | undefined ?? []).filter((enemy) => enemy["is_alive"] !== false);
        const stripped: TurnRow["stripped"] = [];
        if (endFrame) {
          const endRaw = stateAt(Number(endFrame["off"]), Number(endFrame["len"]));
          const endEnemies = ((endRaw["combat"] as Row | undefined)?.["enemies"] as Row[] | undefined) ?? [];
          for (const enemy of living) {
            const after = endEnemies.find((other) => other["index"] === enemy["index"] && other["enemy_id"] === enemy["enemy_id"]);
            if (!after || after["is_alive"] === false || Number(after["current_hp"]) <= 0) continue;
            const now = powersOf(after);
            for (const [power, amount] of Object.entries(powersOf(enemy))) {
              if (amount < 0) continue;
              if (now[power] === undefined || (amount > 0 && now[power]! <= 0)) stripped.push({ id: String(enemy["enemy_id"]), power, stunned: after["move_id"] === STUN_MOVE });
            }
          }
        }
        row = {
          run, floor: Number(fight["floor"]), turn, asc: Number(fight["ascension"]), encounter: String(fight["encounter"]), label: String(first["label"]),
          decider: String(first["decider"] ?? ""), from: attempt, enemies: living.map((enemy) => ({ id: String(enemy["enemy_id"]), powers: powersOf(enemy) })), stripped,
          played: playedKey, matched: off !== null && on !== null && moved !== null, wonTurn, died: (died && next === null) || revived !== null, hp0, revived, remapped,
          sandpitDeath: on !== null && sandpitDeath(on),
          actual: next === null && !died && !wonTurn ? null : actual,
          predOff: predicted(off, hp0), predOn: predicted(on, hp0), predMove: predicted(moved, hp0),
          stunOn: on?.outcome.enemyHpAfter.some((enemy) => enemy.strippedStun !== undefined && enemy.hp > 0) ?? false,
          moveOn: (moved?.outcome.enemyHpAfter ?? []).filter((enemy) => enemy.movedTo).map((enemy) => `${enemy.name}:${enemy.movedTo!.power}:${enemy.movedTo!.how}>${enemy.movedTo!.move}`),
          facing, kills: moved?.outcome.kills ?? [],
        };
        break;
      }
      if (row === null) continue;
      writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
      done += 1;
      if (done % 200 === 0) console.error(`shard ${index}: ${done} turns, ${Math.round((Date.now() - started) / 1000)}s`);
    }
  });
  closeSync(fd);
  console.error(`shard ${index}: ${done} turns in ${Math.round((Date.now() - started) / 1000)}s -> ${out}`);
}

// ---------------------------------------------------------------- report

interface Group {
  n: number;
  /** Mean (actual - predicted): negative = the solver expects more HP lost than happened. */
  biasOn: number;
  biasOff: number;
  maeOn: number;
  maeOff: number;
  /** MECH_MOVE_RULES on too. */
  biasMove: number;
  maeMove: number;
  /** Turns from at least this many fights (run:floor). */
  fights: number;
  /** The biggest |residual| turns (run F T: actual vs predicted on). */
  worst: string[];
}

function group(rows: TurnRow[]): Group {
  const on = rows.map((row) => row.actual! - row.predOn!);
  const off = rows.map((row) => row.actual! - row.predOff!);
  const move = rows.map((row) => row.actual! - (row.predMove ?? row.predOn!));
  const mean = (xs: number[]) => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const worst = rows
    .map((row, i) => ({ row, r: on[i]! }))
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    .slice(0, 3)
    .map(({ row }) => `${row.run} F${row.floor} T${row.turn} (${row.actual} vs ${row.predOn})`);
  return {
    n: rows.length, biasOn: mean(on), biasOff: mean(off), maeOn: mean(on.map(Math.abs)), maeOff: mean(off.map(Math.abs)), biasMove: mean(move), maeMove: mean(move.map(Math.abs)),
    fights: new Set(rows.map((row) => `${row.run}:${row.floor}`)).size, worst,
  };
}

function groupBy(rows: TurnRow[], keys: (row: TurnRow) => string[]): Map<string, Group> {
  const buckets = new Map<string, TurnRow[]>();
  for (const row of rows) for (const key of new Set(keys(row))) buckets.set(key, [...(buckets.get(key) ?? []), row]);
  return new Map([...buckets].map(([key, list]) => [key, group(list)]));
}

const f1 = (x: number): string => (Math.round(x * 10) / 10).toFixed(1);

function report(): void {
  const minN = Number(arg("min-n", "20"));
  const outPath = arg("out", fromRoot("notes/mechanics-residuals.md"));
  const rows: TurnRow[] = [];
  for (const file of readdirSync(work).filter((name) => /^rows-\d+\.jsonl$/.test(name)).sort()) {
    for (const line of readFileSync(join(work, file), "utf8").split("\n")) if (line) rows.push(JSON.parse(line) as TurnRow);
  }
  const db = JSON.parse(readFileSync(MONSTER_DB, "utf8")) as {
    meta?: { generated_from?: { fights?: number; last_seen?: string } };
    monsters: Record<string, { name?: { zh?: string }; powers?: Record<string, { name?: string; description?: string }>; observed?: { powers_stripped?: Record<string, StrippedPower> } }>;
    observed?: { powers_stripped?: Record<string, StrippedPower> };
  };
  const pooled = db.observed?.powers_stripped ?? {};
  const powerInfo = (power: string): { name: string; description: string } => {
    for (const monster of Object.values(db.monsters)) {
      const entry = monster.powers?.[power];
      if (entry?.name) return { name: entry.name, description: (entry.description ?? "").replace(/\[\/?[a-z]+\]/g, "") };
    }
    return { name: power, description: "" };
  };
  const observedText = (power: string): string => {
    const stats = pooled[power];
    if (!stats) return "—";
    const moves = Object.entries(stats.move_after ?? {}).slice(0, 2).map(([move, n]) => `${move} ${n}`).join("/");
    return `strips ${stats.n}（${stats.fights} 场）→ ${moves}；有攻击的 ${stats.attack_cancelled ?? 0}/${stats.attack_before ?? 0} 取消；${isStripStun(stats) ? "**眩晕规则**" : "非规则"}`;
  };
  // A turn we died on lost all our HP (actual): a prediction above it is the same death (W80JV2YVC8UZ F48 T6: Off With Your
  // Head 80, 70 predicted after block, 17 HP), so it is capped there.
  const scored = rows
    .filter((row) => row.matched && row.actual !== null && row.predOn !== null && row.predOff !== null)
    .map((row) => (row.died ? { ...row, predOn: Math.min(row.predOn!, row.actual!), predOff: Math.min(row.predOff!, row.actual!), predMove: Math.min(row.predMove ?? row.predOn!, row.actual!) } : row));
  // Won on our turn: a group of its own, out of every other group and the bias (the last frame is before the killing
  // card, whose Thorns or HP cost the solver counts: Thorns n=383 read -1.07, -339 of it on its 113 won turns).
  const won = scored.filter((row) => row.wonTurn);
  const usable = scored.filter((row) => !row.wonTurn);
  const all = group(usable);
  const byPower = groupBy(usable, (row) => row.enemies.flatMap((enemy) => Object.keys(enemy.powers)));
  const byStripped = groupBy(usable, (row) => row.stripped.map((entry) => entry.power));
  const byEnemy = groupBy(usable, (row) => row.enemies.map((enemy) => enemy.id));
  const byEnemyStripped = groupBy(usable, (row) => row.stripped.map((entry) => `${entry.id} × ${entry.power}${entry.stunned ? "（眩晕）" : ""}`));
  const ranked = (groups: Map<string, Group>, by: (g: Group) => number, n = 15) =>
    [...groups].filter(([, g]) => g.n >= minN).sort((a, b) => by(b[1]) - by(a[1]) || (a[0] < b[0] ? -1 : 1)).slice(0, n);
  const table = (title: string, groups: [string, Group][], power: boolean) => {
    const lines = [`### ${title}`, "", `| ${power ? "能力 | 名称 | 描述 | 观察到的 |" : "组 |"} n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |`, `|${power ? "---|---|---|---|" : "---|"}---|---|---|---|---|---|---|---|---|`];
    for (const [key, g] of groups) {
      const info = power ? powerInfo(key.split(" × ").pop()!.replace(/（眩晕）$/, "")) : null;
      lines.push(`| ${power ? `${key} | ${info!.name} | ${info!.description.slice(0, 40)} | ${observedText(key)} |` : `${key} |`} ${g.n} | ${g.fights} | ${f1(g.biasOff)} | ${f1(g.biasOn)} | ${f1(g.biasMove)} | ${f1(g.maeOff)} | ${f1(g.maeOn)} | ${f1(g.maeMove)} | ${g.worst.slice(0, 2).join("; ")} |`);
    }
    return lines.join("\n");
  };
  const flutter = usable.filter((row) => row.stripped.some((entry) => entry.power === "FLUTTER_POWER"));
  const flutterStunned = flutter.filter((row) => row.stripped.some((entry) => entry.power === "FLUTTER_POWER" && entry.stunned));
  const flutterG = group(flutterStunned);
  // The rule's own check on the played lines: the solver said "stunned" and the game did not (false), or the game stunned
  // on a strip the solver did not see (missed).
  const gameStun = (row: TurnRow) => row.stripped.some((entry) => entry.stunned);
  // (A turn the fight was won on shows no stun: 3RWJX25LB2CD F20 T5, the line the solver read as a strip killed the Hopper.)
  const falseStun = usable.filter((row) => row.stunOn && !row.wonTurn && !gameStun(row));
  const missedStun = usable.filter((row) => !row.stunOn && row.stripped.some((entry) => entry.stunned && entry.power === "FLUTTER_POWER"));
  const where = (row: TurnRow) => `${row.run} F${row.floor} T${row.turn}`;
  // The largest single residuals (rule on): what the learner reads first.
  const largest = [...usable].sort((a, b) => Math.abs(b.actual! - (b.predMove ?? b.predOn!)) - Math.abs(a.actual! - (a.predMove ?? a.predOn!)) || (where(a) < where(b) ? -1 : 1)).slice(0, 25);
  // MECH_MOVE_RULES checks. The Kaiser Crab (class C): both claws alive at the decision and still at the turn's end, one
  // of them dying on the turn (in the game: stripped Crab Rage on the survivor), one claw left; the Axebot's revives.
  const crabIds = new Set(["CRUSHER", "ROCKET"]);
  const claws = (row: TurnRow) => row.enemies.filter((enemy) => crabIds.has(enemy.id)).length;
  const crabRows = usable.filter((row) => claws(row) > 0);
  const crabDeath = crabRows.filter((row) => claws(row) === 2 && row.stripped.some((entry) => entry.power === "CRAB_RAGE_POWER"));
  const crabBoth = crabRows.filter((row) => claws(row) === 2 && !crabDeath.includes(row));
  const crabOne = crabRows.filter((row) => claws(row) === 1);
  const moveRows = usable.filter((row) => (row.moveOn ?? []).length > 0);
  const axebot = usable.filter((row) => row.enemies.some((enemy) => enemy.id === "AXEBOT"));
  const axebotRevive = axebot.filter((row) => row.stripped.some((entry) => entry.id === "AXEBOT" && entry.power === "STOCK_POWER") || (row.moveOn ?? []).some((entry) => entry.includes("STOCK_POWER")));
  const changed = usable.filter((row) => (row.predMove ?? row.predOn) !== row.predOn);
  const checkLine = (title: string, rows: TurnRow[]) => {
    const g = group(rows);
    return `| ${title} | ${g.n} | ${g.fights} | ${f1(g.biasOff)} | ${f1(g.biasOn)} | ${f1(g.biasMove)} | ${f1(g.maeOff)} | ${f1(g.maeOn)} | ${f1(g.maeMove)} | ${g.worst.slice(0, 2).join("; ")} |`;
  };
  const fromCounts = [0, 1, 2].map((k) => usable.filter((row) => row.from === k).length);
  const deaths = usable.filter((row) => row.died);
  const revived = usable.filter((row) => row.revived);
  const sandpitDeaths = usable.filter((row) => row.sandpitDeath);
  const remapped = usable.filter((row) => row.remapped);
  const wonG = group(won);
  const unmatched = rows.filter((row) => !row.matched).length;
  const noActual = rows.filter((row) => row.matched && row.actual === null).length;
  const summary = {
    generated: new Date().toISOString(),
    db: db.meta?.generated_from ?? null,
    turns: rows.length,
    usable: usable.length,
    won: wonG,
    unmatched,
    no_actual: noActual,
    min_n: minN,
    all,
    flutter_stripped_stunned: flutterG,
    move_rules: {
      crab: group(crabRows), crab_both: group(crabBoth), crab_death: group(crabDeath), crab_one: group(crabOne),
      move_on: group(moveRows), axebot: group(axebot), axebot_revive: group(axebotRevive), changed: group(changed),
      changed_turns: changed.map((row) => ({ turn: where(row), actual: row.actual, predOn: row.predOn, predMove: row.predMove, moveOn: row.moveOn ?? [] })),
    },
    stun_false: falseStun.map(where),
    stun_missed: missedStun.map(where),
    from: fromCounts,
    deaths: deaths.length,
    revived: { n: revived.length, fairy: revived.filter((row) => row.revived === "fairy").map(where), lizard: revived.filter((row) => row.revived === "lizard").map(where) },
    sandpit_deaths: group(sandpitDeaths),
    remapped: group(remapped),
    largest: largest.map((row) => ({ turn: where(row), actual: row.actual, predOn: row.predOn, predOff: row.predOff, from: row.from, enemies: row.enemies.map((enemy) => enemy.id), stripped: row.stripped })),
    by_power: Object.fromEntries([...byPower].sort()),
    by_stripped: Object.fromEntries([...byStripped].sort()),
    by_enemy: Object.fromEntries([...byEnemy].sort()),
    by_enemy_stripped: Object.fromEntries([...byEnemyStripped].sort()),
  };
  writeFileSync(join(work, "summary.json"), `${JSON.stringify(summary, null, 1)}\n`);
  const md = [
    "# 机制残差：求解器预测的本回合掉血 vs 实际（mechanics audit 输入）",
    "",
    `\`npx tsx tools/mechanics-residuals.ts run\`（${new Date().toISOString().slice(0, 10)}；怪物数据库 ${db.meta?.generated_from?.fights ?? "?"} 场，最后 ${db.meta?.generated_from?.last_seen ?? "?"}）。不调用任何模型。`,
    "每个记录的战斗回合：取这回合第一个规划决策的状态，用现在的代码规划三次（见下，不跑推演），在求解器的线里找出这回合实际打出的线（出牌和喝药的卡 id + 目标，从这个决策到结束回合），",
    "它预测的本回合掉血 hp_lost 对比实际掉血（这一帧的血量 − 下回合第一帧的血量；当回合打赢取战斗最后一帧，死了是全部）。残差 = 实际 − 预测：**负数 = 求解器高估了掉血**。",
    "「被去掉」= 决策时敌人身上有、结束回合那一帧（敌人还活着）没有或降到 0 的能力。分组里一个回合可以同时在多个组。docs/mechanics-learning.md 有口径和学习者任务。",
    "",
    `回合 ${rows.length}：能对上实际打出的线且有实际掉血的 ${scored.length}，其中当回合打赢的 ${won.length} 个单列（不进下面任何分组和偏差：最后一帧在致死那张牌之前，那张牌的荆棘反伤、失去生命不在实际里；偏差 on ${f1(wonG.biasOn)} / move ${f1(wonG.biasMove)}，|误差| move ${f1(wonG.maeMove)}），下面的分组用其余 ${usable.length} 个；对不上的 ${unmatched}（打了决策之后抽到的牌、旧代码的线现在不再生成等），战斗在敌方回合结束（没有之后的帧）的 ${noActual}。`,
    `比较的是这回合第一个规划决策的 ${fromCounts[0]} 个，第二、第三个的 ${fromCounts[1]} / ${fromCounts[2]} 个（第一个之后抽到的牌打出了，就用之后重新规划的那个决策；它离回合结束更近，误差自然更小）。其中我们死了的 ${deaths.length} 个（实际 = 全部血量，预测高于它的按它算；早期日志里也有放弃的局记成死亡），含敌方回合被复活接住的 ${revived.length} 个（仙女瓶少了一瓶 ${revived.filter((row) => row.revived === "fairy").length}、蜥蜴尾巴回血 ${revived.filter((row) => row.revived === "lizard").length}：按死亡算，回的血不是负的掉血）。线的沙坑在敌方回合后到 0（求解器的 hp_lost 不算这种直接死亡）的，预测按全部血量算：${sandpitDeaths.length} 个。`,
    `出牌的目标按当时的敌人列表换算成决策时的序号（敌人死了游戏会把序号往前挪；求解器的线用决策时的序号）：换算过的回合 ${remapped.length} 个（偏差 move ${f1(group(remapped).biasMove)}）。卡牌按出牌时手里那张牌的升级标记比对（决策日志的卡 id 不带「+」）。`,
    "三种：off = MECH_RULES 关；on = MECH_RULES 开（v4 3488dc5 的实盘）；move = 再开 MECH_MOVE_RULES（学到的换招 + 凯撒蟹背后攻击要两只钳子都活着）。Surrounded 的朝向按实盘当时记的给（这场战斗里这个决策之前最后一次指定目标的出牌或喝药；之前一次都没有才按 startFacing）。",
    `全部：偏差 off ${f1(all.biasOff)} / on ${f1(all.biasOn)} / move ${f1(all.biasMove)}，|误差| off ${f1(all.maeOff)} / on ${f1(all.maeOn)} / move ${f1(all.maeMove)}（n=${all.n}）。`,
    "",
    "## MECH_MOVE_RULES 核对",
    "",
    "| 组 | n | 场 | 偏差 off | 偏差 on | 偏差 move | |误差| off | |误差| on | |误差| move | 最大的回合 |",
    "|---|---|---|---|---|---|---|---|---|---|",
    checkLine("凯撒蟹：全部回合", crabRows),
    checkLine("凯撒蟹：两只钳子都活着、本回合没死", crabBoth),
    checkLine("凯撒蟹：本回合一只钳子死了（另一只的蟹之怒被去掉）", crabDeath),
    checkLine("凯撒蟹：只剩一只钳子", crabOne),
    checkLine("巨斧机器人：全部回合", axebot),
    checkLine("巨斧机器人：本回合复活（库存被拿掉）", axebotRevive),
    checkLine("打出的线触发了学到的换招", moveRows),
    checkLine("move 和 on 的预测不同的回合", changed),
    "",
    `预测变了的回合（move ≠ on）${changed.length} 个：${changed.slice(0, 12).map((row) => `${where(row)}（实际 ${row.actual}，on ${row.predOn} → move ${row.predMove}）`).join("；") || "—"}${changed.length > 12 ? " …" : ""}`,
    "",
    "## 振翅核对",
    "",
    `振翅在回合内被打光、结束回合时偷窃草蜢眩晕的回合（能对上线的）：n=${flutterG.n}（${flutterG.fights} 场），偏差 off ${f1(flutterG.biasOff)} → on ${f1(flutterG.biasOn)}，|误差| off ${f1(flutterG.maeOff)} → on ${f1(flutterG.maeOn)}。`,
    `例：${flutterG.worst.join("；") || "—"}`,
    `规则自己的核对（打出的线）：求解器说眩晕而游戏里没有 ${falseStun.length} 次${falseStun.length > 0 ? `（${falseStun.slice(0, 5).map(where).join("、")}）` : ""}；游戏里振翅打光眩晕了而求解器的线没打光 ${missedStun.length} 次${missedStun.length > 0 ? `（${missedStun.slice(0, 5).map(where).join("、")}：求解器对这条线的命中数和游戏不同）` : ""}。`,
    "",
    "## 单个回合残差最大的 25 个（move）",
    "",
    "| 回合 | 实际 | 预测 move | 预测 on | 预测 off | 比较的决策 | 敌人 | 本回合被去掉 |",
    "|---|---|---|---|---|---|---|---|",
    ...largest.map((row) => `| ${where(row)} | ${row.actual} | ${row.predMove ?? "—"} | ${row.predOn} | ${row.predOff} | 第 ${row.from + 1} 个 | ${row.enemies.map((enemy) => enemy.id).join(", ")} | ${row.stripped.map((entry) => `${entry.id}:${entry.power}${entry.stunned ? "（眩晕）" : ""}`).join(", ") || "—"} |`),
    "",
    "## 按场上的敌人能力（决策时）",
    "",
    table("偏差最负（求解器高估掉血）", ranked(byPower, (g) => -g.biasMove), true),
    "",
    table("偏差最正（求解器低估掉血）", ranked(byPower, (g) => g.biasMove), true),
    "",
    table("|误差| 最大", ranked(byPower, (g) => g.maeMove), true),
    "",
    "## 按本回合被去掉的敌人能力",
    "",
    table(`n ≥ ${Math.min(minN, 5)}，按偏差`, [...byStripped].filter(([, g]) => g.n >= Math.min(minN, 5)).sort((a, b) => a[1].biasMove - b[1].biasMove), true),
    "",
    table("怪物 × 被去掉的能力", [...byEnemyStripped].filter(([, g]) => g.n >= Math.min(minN, 5)).sort((a, b) => a[1].biasMove - b[1].biasMove), true),
    "",
    "## 按敌人",
    "",
    table("偏差最负", ranked(byEnemy, (g) => -g.biasMove), false),
    "",
    table("偏差最正", ranked(byEnemy, (g) => g.biasMove), false),
    "",
    table("|误差| 最大", ranked(byEnemy, (g) => g.maeMove), false),
    "",
  ].join("\n");
  writeFileSync(outPath, md);
  console.log(`report: ${usable.length} usable of ${rows.length} turns -> ${outPath}, ${join(work, "summary.json")}`);
}

// ---------------------------------------------------------------- run

async function runAll(): Promise<void> {
  const shards = Number(arg("shards", "8"));
  mkdirSync(work, { recursive: true });
  if (!existsSync(join(work, ".gitignore"))) writeFileSync(join(work, ".gitignore"), "rows-*.jsonl\nreplay-*.jsonl\nmove-replay-*.jsonl\n");
  const pass = ["work", "limit", "min-asc", "monster-db", "only"].flatMap((name) => (process.argv.includes(`--${name}`) ? [`--${name}`, arg(name, "")] : []));
  await Promise.all(
    Array.from({ length: shards }, (_, i) =>
      new Promise<void>((resolve, reject) => {
        const child = spawn("nice", ["-n", "10", "npx", "tsx", fromRoot("agent/tools/mechanics-residuals.ts"), "shard", "--shard", String(i), "--shards", String(shards), ...pass], { stdio: ["ignore", "inherit", "inherit"] });
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`shard ${i} exited ${code}`))));
      }),
    ),
  );
  report();
}

if (stage === "shard") shard();
else if (stage === "report") report();
else await runAll();
