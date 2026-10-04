/**
 * Offline evaluation of SL_JUDGE_ANY_DRAW (docs/sl.md §2.3): the least-loss verdicts the draw veto kept from SL. No model is
 * called and nothing is written outside --out. Every logged fight with a decision on a board the mod flags as lethal is
 * walked frame by frame (logs/states.jsonl through the log DB's state_index offsets, read-only), as tools/sl-early-replay.ts
 * does: each logged decision on a flagged board planned again by the current code (the 5-turn rollout and B2 off: the
 * least-loss verdict comes before them; the random potions' Monte Carlo on a frozen clock). On each least-loss decision:
 * judgeEndTurn (the end_turn judgment) and, on a least-loss card or potion, judgeLeastLossNow (the early reload), each with
 * the switch off (as 124fef7) and on (the planner's any-draw bound), SL_JUDGE_KNOWN_DRAWS as live (attempts after the first
 * know the earlier attempts' draws). Per decision: run, floor, room, ascension, attempt, turn, ts, the logged label and
 * action, the planner's, both verdicts off and on, the bound (what it found, its solve time), and the turn's outcome in the
 * logs (died: the attempt ended in that turn with a death or an SL reload; survived: the next turn came; won: the fight
 * ended in that turn won).
 *
 * --scope sl (default): only the fights SL retries (A8+ boss fights and the listed ones); all: every flagged fight.
 *
 * Usage: npx tsx tools/sl-any-draw-replay.ts [--out experiments/sl-any-draw] [--scope sl|all] [--shard i/n] [--fights RUN:FLOOR,...]
 * Output: <out>/any-draw[-<shard>].jsonl, one row per least-loss decision on a flagged board.
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv, type SlEnv } from "../src/memory/types.js";
import { drawBoundOf, leastLossFactsOf, noteFacing, planCombatTurn, revivesOf, trackLizardTail } from "../src/reflex/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { checkKnown, DrawTracker, knownOrderOf, type KnownOrder } from "../src/sl/draws.js";
import { loadSlElites } from "../src/sl/elites.js";
import { drawsKnownAt, judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL, type DrawBound } from "../src/sl/judge.js";
import { heldCardEthereal } from "../src/reflex/card-model.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { asRecord, num } from "../src/core/util/json.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const outDir = arg("out", fromRoot("experiments/sl-any-draw"));
const [shardAt, shardOf] = arg("shard", "0/1").split("/").map(Number) as [number, number];
const fightsOnly = arg("fights", "");
const scope = arg("scope", "sl") as "all" | "sl";
const STATES = fromRoot("logs/states.jsonl");
const PY = fromRoot("data/logdb-venv/bin/python");
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "500000", "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 1 << 29 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const fd = openSync(STATES, "r");
function stateAt(off: number, len: number): GameState {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return parseGameState((JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>);
}

const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

function envOf(state: GameState, sl: SlEnv | undefined): DecisionEnv {
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    ...(sl ? { sl } : {}), thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
}

/** A fight's frames and decisions split into attempts (the turn going back: an SL reload or a restart). */
function attemptsOf(run: string, floor: number): { frames: Row[]; decisions: Row[] }[] {
  const frames = query(`SELECT off, len, ts, turn, screen, observed FROM state_index WHERE run_id = '${run}' AND floor = ${floor} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY off`);
  const decisions = query(`SELECT ts, turn, label, action, decider, result, target_index FROM decisions WHERE run_id = '${run}' AND floor = ${floor} AND turn IS NOT NULL AND screen IN ('COMBAT', 'CARD_SELECTION') ORDER BY ts`);
  const split = <T extends Row>(rows: T[]): T[][] => {
    const out: T[][] = [];
    let prev: number | null = null;
    for (const row of rows) {
      const turn = Number(row["turn"]);
      if (prev === null || turn < prev) out.push([]);
      out[out.length - 1]!.push(row);
      prev = turn;
    }
    return out;
  };
  const f = split(frames);
  const d = split(decisions);
  return f.map((frames, i) => ({ frames, decisions: d[i] ?? [] }));
}

/** The bound as a row field: what it found, compactly. */
function boundRow(bound: DrawBound | null | undefined): Row | null {
  if (!bound) return null;
  return {
    drawing: bound.drawing,
    refused: bound.refused,
    ...(bound.noDraw ? { no_draw: bound.noDraw } : {}),
    ...(bound.fatal ? { fatal: bound.fatal } : {}),
    ...(bound.superset ? { superset: bound.superset } : {}),
    chance: bound.chance,
    ms: bound.ms,
  };
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
  potionMcOptions.now = () => 0;
  const out = join(outDir, `any-draw${shardOf > 1 ? `-${shardAt}` : ""}.jsonl`);
  writeFileSync(out, "");
  const elites = loadSlElites();
  const listedIds = new Set(elites.elites.flatMap((elite) => elite.enemy_ids));
  const fights = query(
    `WITH c AS (SELECT DISTINCT d.run_id, d.floor FROM decisions d JOIN frames f ON f.run_id = d.run_id AND f.ts = d.ts AND NOT coalesce(f.observed, false) WHERE d.screen = 'COMBAT' AND f.incoming - f.block >= f.player_hp AND f.player_hp > 0)
     SELECT f.run_id, f.floor, f.room, f.ascension, f.outcome, f.monsters FROM c JOIN fights f USING (run_id, floor) ORDER BY f.first_ts`,
  );
  fights.forEach((fight, index) => {
    if (index % shardOf !== shardAt) return;
    const run = String(fight["run_id"]);
    const floor = Number(fight["floor"]);
    if (fightsOnly && !fightsOnly.split(",").includes(`${run}:${floor}`)) return;
    const monsters = (fight["monsters"] as string[] | null) ?? [];
    const room = String(fight["room"]);
    const listed = room === "boss" || monsters.some((id) => listedIds.has(id));
    if (scope === "sl" && !(listed && Number(fight["ascension"]) >= 8)) return;
    const attempts = attemptsOf(run, floor);
    const records = attempts.map((attempt) => {
      const tracker = new DrawTracker({ inserts: true, tops: true });
      for (const row of attempt.frames) tracker.observe(stateAt(Number(row["off"]), Number(row["len"])));
      return tracker.record;
    });
    let rows = 0;
    attempts.forEach((attempt, k) => {
      const known: KnownOrder | null = k > 0 ? knownOrderOf(records.slice(0, k).map((draws, i) => ({ attempt: i + 1, draws }))).known : null;
      const tracker = new DrawTracker({ inserts: true, tops: true });
      const fightMemory = createScreenMemory("COMBAT");
      const lastTurn = Math.max(...attempt.frames.map((row) => Number(row["turn"])));
      const reloaded = attempt.decisions.some((row) => String(row["result"] ?? "").startsWith("not dispatched: SL reloaded"));
      const lastAttempt = k === attempts.length - 1;
      const pending = new Map(attempt.decisions.filter((row) => row["action"] !== null).map((row) => [String(row["ts"]), row]));
      for (const frame of attempt.frames) {
        const state = stateAt(Number(frame["off"]), Number(frame["len"]));
        tracker.observe(state);
        trackLizardTail(fightMemory, state);
        const decision = frame["observed"] === true ? undefined : pending.get(String(frame["ts"]));
        if (!decision || state.screen !== "COMBAT") continue;
        pending.delete(String(frame["ts"]));
        const target = decision["target_index"];
        const noteTarget = () => {
          if (typeof target === "number") noteFacing(fightMemory, state, { action: "play_card", target_index: target });
        };
        if (asRecord(state.raw["combat"])["end_turn_will_kill_player"] !== true) {
          noteTarget();
          continue;
        }
        const turn = Number(decision["turn"]);
        let sl: SlEnv | undefined;
        if (known) {
          const check = checkKnown(known, tracker);
          if (check.ok && check.keys.length > 0) {
            sl = {
              attempt: Math.max(2, k + 1), maxAttempts: 6, previousAttempts: { note: "offline evaluation (tools/sl-any-draw-replay.ts)" }, showSim: false,
              knownDraws: { cards: check.keys, names: check.names, attempts: [1], ...(check.inserted ? { added: { cards: check.inserted.keys, names: check.inserted.names } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) },
            };
          }
        }
        let planned: Decision | null = null;
        let error: string | undefined;
        const env = envOf(state, sl);
        env.screenMemory.facing = fightMemory.facing;
        env.screenMemory.facingFight = fightMemory.facingFight;
        env.screenMemory.lizardTail = fightMemory.lizardTail === undefined ? undefined : structuredClone(fightMemory.lizardTail);
        try {
          planned = planCombatTurn(env);
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
        }
        const label = planned?.label ?? "";
        if (label !== LEAST_LOSS_LABEL) {
          noteTarget();
          continue;
        }
        const facts = leastLossFactsOf(planned);
        const maxHp = num(asRecord(asRecord(state.raw["combat"])["player"])["max_hp"], state.run?.max_hp ?? 0);
        const revives = revivesOf(state, env.screenMemory, maxHp).map((revive) => revive.source);
        const ethereal = (card: Record<string, unknown>) => heldCardEthereal(card, knowledge);
        const drawsKnown = facts ? drawsKnownAt(state, facts, knowledge) : false;
        const boundFn = drawBoundOf(facts);
        const t0 = performance.now();
        let bound: DrawBound | null = null;
        let boundError: string | undefined;
        const drawBound = boundFn
          ? () => {
              try {
                return (bound ??= boundFn());
              } catch (e) {
                boundError = e instanceof Error ? e.message : String(e);
                return null;
              }
            }
          : undefined;
        const base = { label, revives, ethereal, knowledge, ...(drawsKnown ? { drawsKnown: true } : {}) };
        const endOff = judgeEndTurn(state, base);
        const endOn = judgeEndTurn(state, { ...base, ...(drawBound ? { drawBound } : {}) });
        const isStep = planned?.kind === "act" && planned.intent.action !== "end_turn";
        const earlyBase = { revives, ethereal, facts, knownDrawsJudge: true, addedToPile: tracker.addedToPile, knowledge };
        const earlyOff = isStep ? judgeLeastLossNow(state, earlyBase) : null;
        const earlyOn = isStep ? judgeLeastLossNow(state, { ...earlyBase, ...(drawBound ? { drawBound } : {}) }) : null;
        const judgeMs = Math.round(performance.now() - t0);
        const outcome = turn < lastTurn ? "survived" : !lastAttempt || reloaded ? "died" : String(fight["outcome"]) === "won" ? "won" : "died";
        const row = {
          run, floor, room, asc: Number(fight["ascension"]), listed, attempt: k + 1, attempts: attempts.length, turn, ts: String(decision["ts"]),
          logged: { label: String(decision["label"]), action: String(decision["action"]), result: String(decision["result"] ?? "").slice(0, 80) },
          planned: { label, action: planned?.kind === "act" ? planned.intent.action : null },
          facts: facts ?? null,
          end_off: { certain: endOff.certain, reason: endOff.reason.slice(0, 160) },
          end_on: { certain: endOn.certain, reason: endOn.reason.slice(0, 600) },
          ...(earlyOff && earlyOn ? { early_off: { certain: earlyOff.certain, reason: earlyOff.reason.slice(0, 160) }, early_on: { certain: earlyOn.certain, reason: earlyOn.reason.slice(0, 600) } } : {}),
          bound: boundRow(bound),
          ...(boundError ? { bound_error: boundError } : {}),
          judge_ms: judgeMs,
          outcome,
          last_turn: lastTurn,
          ...(error ? { error } : {}),
        };
        writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
        rows += 1;
        noteTarget();
      }
    });
    console.log(`${run} F${floor} ${room}${listed ? " (SL)" : ""}: ${attempts.length} attempt(s), ${rows} least-loss row(s)`);
  });
  closeSync(fd);
  console.log(`wrote ${out}`);
}

main();
