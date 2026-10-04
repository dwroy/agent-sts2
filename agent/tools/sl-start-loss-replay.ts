/**
 * Offline replay of the SL judge on every logged board with our own HP loss at the next turn's start up (docs/sl.md §2:
 * Inferno, Crimson Mantle; ops 2026-10-03, C4F14F3XPN0N F33 attempt 5: two Infernos took 2 HP at T7's start, the judge
 * had counted 1 at T6's end_turn and said "the mod does not flag", the last retry unused). No model is called and nothing
 * is written outside --out. Every logged fight with INFERNO_POWER or CRIMSON_MANTLE_POWER on us is walked frame by frame
 * (logs/states.jsonl through the log DB's state_index offsets, read-only), as tools/sl-giant-replay.ts does: a draw
 * tracker and the Lizard Tail / facing memory per attempt. On each logged decision with one of those powers up:
 * - end_logged (a logged end_turn): judgeEndTurn with the logged label (SL_JUDGE_KNOWN_DRAWS and SL_JUDGE_ANY_DRAW as live
 *   when that label is the least-loss one);
 * - when the mod flags the end of the turn or our own count dies (judgeEndTurn with the least-loss label says so), the board
 *   is planned again by the current code (the 5-turn rollout and B2 off; the random potions' Monte Carlo on a frozen clock):
 *   end_planned (the planner's end_turn, its label) and early (the planner's least-loss card or potion: judgeLeastLossNow).
 * Outcome of a board at turn T: survived (a later turn of the attempt had an action that completed), won (the fight ended
 * won with no later action), died (GAME_OVER with no later action), reloaded (the next attempt followed with no later
 * action: an SL reload, the death not seen).
 *
 * Run it on the code before and after a change (--tag) and compare: tools/sl-start-loss-summary.py.
 *
 * Usage: npx tsx tools/sl-start-loss-replay.ts [--out experiments/sl-start-loss] [--tag after] [--fights RUN:FLOOR,...]
 * Output: <out>/start-loss[-<tag>].jsonl, one row per decision board with the power up.
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv } from "../src/memory/types.js";
import { drawBoundOf, leastLossFactsOf, noteFacing, planCombatTurn, revivesOf, trackLizardTail } from "../src/reflex/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { DrawTracker } from "../src/sl/draws.js";
import { drawsKnownAt, judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL, type DeathVerdict } from "../src/sl/judge.js";
import { heldCardEthereal } from "../src/reflex/card-model.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { asArray, asRecord, num, str } from "../src/core/util/json.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const outDir = arg("out", fromRoot("experiments/sl-start-loss"));
const tag = arg("tag", "");
const fightsOnly = arg("fights", "");
const STATES = fromRoot("logs/states.jsonl");
const PY = fromRoot("data/logdb-venv/bin/python");
const SOURCES = ["INFERNO_POWER", "CRIMSON_MANTLE_POWER"];
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

function envOf(state: GameState): DecisionEnv {
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
}

const powerOf = (player: Record<string, unknown>, id: string): number =>
  asArray(player["powers"]).map(asRecord).filter((power) => str(power["power_id"]) === id).reduce((sum, power) => sum + num(power["amount"]), 0);

const verdictRow = (v: DeathVerdict | null) =>
  v ? { certain: v.certain, tier: v.tier, reason: v.reason.slice(0, 500), end_block: v.endBlock, incoming: v.incoming, start_loss: v.startLoss ?? null, own: v.ownCountDies === true, ...(v.early ? { early: true } : {}) } : null;

function main(): void {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
  potionMcOptions.now = () => 0;
  const out = join(outDir, `start-loss${tag ? `-${tag}` : ""}.jsonl`);
  writeFileSync(out, "");
  const fights = query(
    `WITH s AS (SELECT DISTINCT run_id, floor FROM (SELECT run_id, floor, unnest(player_powers) p FROM frames WHERE in_combat) WHERE p.id IN ('${SOURCES.join("', '")}') AND p.amount > 0)
     SELECT f.run_id, f.floor, f.ascension, f.outcome FROM s JOIN fights f USING (run_id, floor) ORDER BY f.first_ts`,
  );
  let total = 0;
  let planned = 0;
  for (const fight of fights) {
    const run = String(fight["run_id"]);
    const floor = Number(fight["floor"]);
    if (fightsOnly && !fightsOnly.split(",").includes(`${run}:${floor}`)) continue;
    const index = query(`SELECT off, len, ts, turn, screen, observed FROM state_index WHERE run_id = '${run}' AND floor = ${floor} ORDER BY off`);
    const decisions = query(
      `SELECT ts, turn, label, action, target_index, result FROM decisions WHERE run_id = '${run}' AND floor = ${floor} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY ts`,
    );
    // The fight's frames (and the first frame after it: GAME_OVER or REWARD), split into attempts on the turn going back.
    const attempts: Row[][] = [];
    let prev: number | null = null;
    for (const row of index) {
      const combat = row["screen"] === "COMBAT" || row["screen"] === "CARD_SELECTION";
      if (combat && row["turn"] !== null) {
        const turn = Number(row["turn"]);
        if (prev === null || turn < prev) attempts.push([]);
        prev = turn;
      }
      if (attempts.length > 0) attempts[attempts.length - 1]!.push(row);
    }
    const byTs = new Map(decisions.filter((row) => row["action"] !== null).map((row) => [String(row["ts"]), row]));
    const completed = (row: Row) => String(row["result"] ?? "").startsWith("completed") && ["play_card", "use_potion", "end_turn"].includes(String(row["action"]));
    attempts.forEach((frames, k) => {
      const tracker = new DrawTracker({ inserts: true, tops: true });
      const memory = createScreenMemory("COMBAT");
      const combatFrames = frames.filter((row) => (row["screen"] === "COMBAT" || row["screen"] === "CARD_SELECTION") && row["turn"] !== null);
      if (combatFrames.length === 0) return;
      const first = String(combatFrames[0]!["ts"]);
      const lastFrame = combatFrames[combatFrames.length - 1]!;
      const after = frames.find((row) => row["screen"] !== "COMBAT" && row["screen"] !== "CARD_SELECTION" && Number(row["off"]) > Number(lastFrame["off"]));
      const end = after ? String(after["screen"]) : k < attempts.length - 1 ? "RELOADED" : "?";
      const endTs = after ? String(after["ts"]) : k < attempts.length - 1 ? String(attempts[k + 1]!.find((row) => row["turn"] !== null)?.["ts"] ?? "9") : "9";
      // This attempt's completed actions, by turn (the outcome of a board: a later turn acted, so we lived through its start).
      const acted = decisions.filter((row) => String(row["ts"]) >= first && String(row["ts"]) < endTs && completed(row)).map((row) => Number(row["turn"]));
      for (const frame of combatFrames) {
        const state = stateAt(Number(frame["off"]), Number(frame["len"]));
        tracker.observe(state);
        trackLizardTail(memory, state);
        const decision = frame["observed"] === true ? undefined : byTs.get(String(frame["ts"]));
        if (!decision || state.screen !== "COMBAT") continue;
        byTs.delete(String(frame["ts"]));
        const target = decision["target_index"];
        const noteTarget = () => {
          if (typeof target === "number") noteFacing(memory, state, { action: "play_card", target_index: target });
        };
        const combat = asRecord(state.raw["combat"]);
        const player = asRecord(combat["player"]);
        const inferno = powerOf(player, "INFERNO_POWER");
        const mantle = powerOf(player, "CRIMSON_MANTLE_POWER");
        const living = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
        if ((inferno <= 0 && mantle <= 0) || living.length === 0) {
          noteTarget();
          continue;
        }
        const turn = Number(decision["turn"]);
        const maxHp = num(player["max_hp"], state.run?.max_hp ?? 0);
        const revives = revivesOf(state, memory, maxHp).map((revive) => revive.source);
        const ethereal = (card: Record<string, unknown>) => heldCardEthereal(card, knowledge);
        const probe = judgeEndTurn(state, { label: LEAST_LOSS_LABEL, revives, ethereal, knowledge });
        const flag = combat["end_turn_will_kill_player"] === true;
        // Planned again only where the end_turn judgment can get past its first condition (the mod's flag or our own count).
        let plan: Decision | null = null;
        let error: string | undefined;
        const toPlan = flag || probe.ownCountDies === true;
        if (toPlan) {
          const env = envOf(state);
          env.screenMemory.facing = memory.facing;
          env.screenMemory.facingFight = memory.facingFight;
          env.screenMemory.lizardTail = memory.lizardTail === undefined ? undefined : structuredClone(memory.lizardTail);
          try {
            plan = planCombatTurn(env);
          } catch (e) {
            error = e instanceof Error ? e.message : String(e);
          }
          planned += 1;
        }
        const plannedLabel = plan?.label ?? "";
        const plannedAction = plan?.kind === "act" ? plan.intent.action : null;
        const facts = leastLossFactsOf(plan);
        const judgeWith = (label: string): DeathVerdict => {
          const drawsKnown = label === LEAST_LOSS_LABEL && facts ? drawsKnownAt(state, facts, knowledge) : false;
          const bound = label === LEAST_LOSS_LABEL ? drawBoundOf(facts) : null;
          return judgeEndTurn(state, { label, revives, ethereal, knowledge, ...(drawsKnown ? { drawsKnown: true } : {}), ...(bound ? { drawBound: bound } : {}) });
        };
        const loggedAction = String(decision["action"]);
        const loggedLabel = String(decision["label"]);
        const endLogged = loggedAction === "end_turn" ? judgeWith(loggedLabel) : null;
        const endPlanned = toPlan && plannedAction === "end_turn" ? judgeWith(plannedLabel) : null;
        const isStep = plannedLabel === LEAST_LOSS_LABEL && plannedAction !== null && plannedAction !== "end_turn";
        const bound = isStep ? drawBoundOf(facts) : null;
        const early = isStep
          ? judgeLeastLossNow(state, { revives, ethereal, facts, knownDrawsJudge: true, addedToPile: tracker.addedToPile, knowledge, ...(bound ? { drawBound: bound } : {}) })
          : null;
        const later = acted.some((t) => t > turn);
        const outcome = later ? "survived" : end === "REWARD" ? "won" : end === "GAME_OVER" ? "died" : end === "RELOADED" ? "reloaded" : end;
        const row = {
          run, floor, asc: Number(fight["ascension"]), attempt: k + 1, attempts: attempts.length, turn, ts: String(decision["ts"]),
          hp: num(player["current_hp"]), block: num(player["block"]), energy: num(player["energy"]), inferno, mantle,
          hellraiser: powerOf(player, "HELLRAISER_POWER") > 0,
          enemies_hp: living.map((enemy) => num(enemy["current_hp"])),
          flag,
          logged: { label: loggedLabel, action: loggedAction, result: String(decision["result"] ?? "").slice(0, 80) },
          planned: toPlan ? { label: plannedLabel, action: plannedAction } : null,
          facts: facts ?? null,
          probe: verdictRow(probe),
          end_logged: verdictRow(endLogged),
          end_planned: verdictRow(endPlanned),
          early: verdictRow(early),
          outcome,
          next_screen: end,
          ...(error ? { error } : {}),
        };
        writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
        total += 1;
        noteTarget();
      }
    });
    console.log(`${run} F${floor}: ${attempts.length} attempt(s)`);
  }
  closeSync(fd);
  console.log(`wrote ${out} (${total} rows, ${planned} planned)`);
}

main();
