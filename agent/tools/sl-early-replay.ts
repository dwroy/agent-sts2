/**
 * Offline evaluation of SL_RELOAD_EARLY and SL_JUDGE_KNOWN_DRAWS (docs/sl.md §2, notes/sl-retry-report.md §9). No model is
 * called and nothing is written outside --out. Every logged fight with a decision on a board the mod flags as lethal
 * (end_turn_will_kill_player: the judge's first condition) is walked frame by frame (logs/states.jsonl through the log DB's
 * state_index offsets, read-only): a draw tracker per attempt as the live controller keeps it (SL_RETRY_KNOWN_INSERTS and
 * SL_RETRY_KNOWN_TOP on),
 * and every logged decision on a flagged board planned again by the current code (the 5-turn rollout and B2 off: the
 * least-loss verdict comes before them; the random potions' Monte Carlo on a frozen clock, its whole schedule). On each:
 * the planner's label and its least-loss facts (combat-plan leastLossFactsOf), judgeLeastLossNow (the early reload) and
 * judgeEndTurn with the current label (the end_turn judgment, SL_JUDGE_KNOWN_DRAWS as live).
 *
 * --known logged (default): attempts after the first know the earlier attempts' draws (the logged SL retries);
 * --known self: every fight is taken as its own retry, its own draws known (as tools/sl-retry-replay.ts --mode deaths):
 *   what SL_JUDGE_KNOWN_DRAWS would change on a retry of it.
 * Per decision: run, floor, room, ascension, attempt, turn, ts, the logged label and action, the planner's, the facts, the
 * two verdicts, and the turn's outcome in the logs (died: the attempt ended in that turn with a death or an SL reload;
 * survived: the next turn came; won: the fight ended in that turn won).
 *
 * --scope sl: only the fights SL retries (A8+ boss fights and the listed ones); default all.
 *
 * Usage: npx tsx tools/sl-early-replay.ts [--out experiments/sl-early] [--known logged|self] [--scope all|sl] [--shard i/n]
 *          [--limit N] [--fights RUN:FLOOR,...] [--tag name]
 * Output: <out>/early[-<tag>][-<shard>].jsonl, one row per decision on a flagged board.
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv, type SlEnv } from "../src/project/types.js";
import { leastLossFactsOf, noteFacing, planCombatTurn, revivesOf, trackLizardTail } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { checkKnown, DrawTracker, knownOrderOf, type KnownOrder } from "../src/sl/draws.js";
import { loadSlElites } from "../src/sl/elites.js";
import { drawsKnownAt, judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL } from "../src/sl/judge.js";
import { heldCardEthereal } from "../src/strategy/card-model.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { asRecord, num } from "../src/util/json.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const outDir = arg("out", fromRoot("experiments/sl-early"));
const knownMode = arg("known", "logged") as "logged" | "self";
const [shardAt, shardOf] = arg("shard", "0/1").split("/").map(Number) as [number, number];
const limit = Number(arg("limit", "100000"));
const fightsOnly = arg("fights", "");
const tag = arg("tag", "");
const scope = arg("scope", "all") as "all" | "sl";
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

function main(): void {
  mkdirSync(outDir, { recursive: true });
  // The least-loss verdict comes before the rollout and B2; without them the rest of a question is cheap.
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
  potionMcOptions.now = () => 0;
  const out = join(outDir, `early${tag ? `-${tag}` : ""}${shardOf > 1 ? `-${shardAt}` : ""}.jsonl`);
  writeFileSync(out, "");
  const elites = loadSlElites();
  const listedIds = new Set(elites.elites.flatMap((elite) => elite.enemy_ids));
  const fights = query(
    `WITH c AS (SELECT DISTINCT d.run_id, d.floor FROM decisions d JOIN frames f ON f.run_id = d.run_id AND f.ts = d.ts AND NOT coalesce(f.observed, false) WHERE d.screen = 'COMBAT' AND f.incoming - f.block >= f.player_hp AND f.player_hp > 0)
     SELECT f.run_id, f.floor, f.room, f.ascension, f.outcome, f.monsters FROM c JOIN fights f USING (run_id, floor) ORDER BY f.first_ts`,
  );
  let n = 0;
  fights.forEach((fight, index) => {
    if (index % shardOf !== shardAt || n >= limit) return;
    const run = String(fight["run_id"]);
    const floor = Number(fight["floor"]);
    if (fightsOnly && !fightsOnly.split(",").includes(`${run}:${floor}`)) return;
    n += 1;
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
    attempts.forEach((attempt, k) => {
      // The known order: the earlier attempts' (the logged retries), or the fight's own (a retry of it).
      let known: KnownOrder | null = null;
      if (knownMode === "self") {
        const own = records[k]!;
        known = own.clean > 0 ? knownOrderOf([{ attempt: 1, draws: own }]).known : null;
      } else if (k > 0) known = knownOrderOf(records.slice(0, k).map((draws, i) => ({ attempt: i + 1, draws }))).known;
      const tracker = new DrawTracker({ inserts: true, tops: true });
      // What the live loop remembers across the fight's decisions and the planner reads: the facing (Surrounded: the enemy
      // last targeted; without it the planner starts from startFacing, PLC/TXLH F33's Rocket 49 vs 33) and Lizard Tail.
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
        let knownInfo: Row | null = null;
        if (known) {
          const check = checkKnown(known, tracker);
          knownInfo = check.ok ? { next: check.keys.length, exact: check.exact ?? check.keys.length, added: check.inserted?.keys.length ?? 0 } : { off: check.reason };
          if (check.ok && check.keys.length > 0) {
            sl = {
              attempt: Math.max(2, k + 1),
              maxAttempts: 6,
              previousAttempts: { note: "offline evaluation (tools/sl-early-replay.ts)" },
              showSim: false,
              knownDraws: { cards: check.keys, names: check.names, attempts: [1], ...(check.inserted ? { added: { cards: check.inserted.keys, names: check.inserted.names } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) },
            };
          }
        }
        let planned: Decision | null = null;
        let error: string | undefined;
        const t0 = performance.now();
        const env = envOf(state, sl);
        env.screenMemory.facing = fightMemory.facing;
        env.screenMemory.facingFight = fightMemory.facingFight;
        env.screenMemory.lizardTail = fightMemory.lizardTail === undefined ? undefined : structuredClone(fightMemory.lizardTail);
        try {
          planned = planCombatTurn(env);
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
        }
        const ms = Math.round(performance.now() - t0);
        const facts = leastLossFactsOf(planned);
        const maxHp = num(asRecord(asRecord(state.raw["combat"])["player"])["max_hp"], state.run?.max_hp ?? 0);
        const revives = revivesOf(state, env.screenMemory, maxHp).map((revive) => revive.source);
        const ethereal = (card: Record<string, unknown>) => heldCardEthereal(card, knowledge);
        const label = planned?.label ?? "";
        const early = label === LEAST_LOSS_LABEL && planned?.kind === "act" && planned.intent.action !== "end_turn"
          ? judgeLeastLossNow(state, { revives, ethereal, facts, knownDrawsJudge: true, addedToPile: tracker.addedToPile, knowledge })
          : null;
        const drawsKnown = label === LEAST_LOSS_LABEL && facts ? drawsKnownAt(state, facts, knowledge) : false;
        const endTurn = judgeEndTurn(state, { label, revives, ethereal, knowledge, ...(drawsKnown ? { drawsKnown: true } : {}) });
        const endTurnOld = judgeEndTurn(state, { label, revives, ethereal, knowledge });
        const outcome = turn < lastTurn ? "survived" : !lastAttempt || reloaded ? "died" : String(fight["outcome"]) === "won" ? "won" : "died";
        const row = {
          run, floor, room, asc: Number(fight["ascension"]), listed, attempt: k + 1, attempts: attempts.length, turn, ts: String(decision["ts"]),
          logged: { label: String(decision["label"]), action: String(decision["action"]), result: String(decision["result"] ?? "").slice(0, 80) },
          planned: planned ? { kind: planned.kind, label, action: planned.kind === "act" ? planned.intent.action : null } : null,
          facts: facts ?? null,
          known: knownInfo,
          added_to_pile: tracker.addedToPile,
          early: early ? { certain: early.certain, reason: early.reason.slice(0, 240) } : null,
          end_turn: { certain: endTurn.certain, tier: endTurn.tier, reason: endTurn.reason.slice(0, 200) },
          end_turn_old: { certain: endTurnOld.certain, tier: endTurnOld.tier },
          outcome,
          last_turn: lastTurn,
          ms,
          ...(error ? { error } : {}),
        };
        writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
        noteTarget();
      }
    });
    console.log(`${run} F${floor} ${room}${listed ? " (SL)" : ""}: ${attempts.length} attempt(s)`);
  });
  closeSync(fd);
  console.log(`wrote ${out}`);
}

main();
