/**
 * Offline replay of the SL judge on every logged Waterfall Giant husk board (docs/sl.md §2.4; ops 2026-10-03, QLL4VM0WZKW3
 * F17: died on the blast turn with 6 retries unused, the judge refusing "a special phase"). No model is called and nothing
 * is written outside --out. Every logged fight whose Giant reached the husk (max HP 999,999,999) is walked frame by frame
 * (logs/states.jsonl through the log DB's state_index offsets, read-only), as tools/sl-any-draw-replay.ts does: a draw
 * tracker and the Lizard Tail / facing memory per attempt. On each logged decision on a husk turn (the kill turn after the
 * kill, ABOUT_TO_BLOW_MOVE, and the blast turn, EXPLODE_MOVE) the current code plans the board again (the 5-turn rollout
 * and B2 off; the random potions' Monte Carlo on a frozen clock) and judges it:
 * - end_turn (logged end_turn): judgeEndTurn with the logged label and with the planner's label, SL_JUDGE_KNOWN_DRAWS and
 *   SL_JUDGE_ANY_DRAW as live;
 * - early (the planner's least-loss card or potion): judgeLeastLossNow, as live.
 * Per row: the board (HP, block, the shown blast, the mod's flag), the verdicts, and the outcome: died (GAME_OVER after
 * the blast turn), won (REWARD after it), survived (the turn was not the last).
 *
 * Run it on the code before and after a change (--tag) and compare: tools/sl-giant-summary.py.
 *
 * Usage: npx tsx tools/sl-giant-replay.ts [--out experiments/sl-giant] [--tag after] [--fights RUN:FLOOR,...]
 * Output: <out>/giant[-<tag>].jsonl, one row per decision on a husk turn.
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv } from "../src/project/types.js";
import { drawBoundOf, leastLossFactsOf, noteFacing, planCombatTurn, revivesOf, trackLizardTail } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { DrawTracker } from "../src/sl/draws.js";
import { drawsKnownAt, judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL, type DeathVerdict } from "../src/sl/judge.js";
import { heldCardEthereal } from "../src/strategy/card-model.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { asArray, asRecord, num, str } from "../src/util/json.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const outDir = arg("out", "experiments/sl-giant");
const tag = arg("tag", "");
const fightsOnly = arg("fights", "");
const STATES = "logs/states.jsonl";
const PY = ".cache/logdb-venv/bin/python";
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(PY, ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "500000", "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 1 << 29 });
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

const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

function envOf(state: GameState): DecisionEnv {
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
}

/** The Giant husk on this board (its move and the blast it shows), or null. */
function huskOf(state: GameState): { move: string; blast: number | null } | null {
  for (const enemy of asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord)) {
    if (str(enemy["enemy_id"]) !== "WATERFALL_GIANT" || num(enemy["max_hp"]) < 1_000_000 || enemy["is_alive"] === false) continue;
    const blast = asArray(enemy["intents"]).map(asRecord).find((intent) => str(intent["intent_type"]) === "DeathBlow");
    return { move: str(enemy["move_id"]), blast: blast ? num(blast["damage"]) : null };
  }
  return null;
}

const verdictRow = (v: DeathVerdict | null) => (v ? { certain: v.certain, tier: v.tier, reason: v.reason.slice(0, 400), end_block: v.endBlock, incoming: v.incoming } : null);

function main(): void {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
  potionMcOptions.now = () => 0;
  const out = join(outDir, `giant${tag ? `-${tag}` : ""}.jsonl`);
  writeFileSync(out, "");
  const fights = query(
    `WITH h AS (SELECT DISTINCT run_id, floor FROM (SELECT run_id, floor, unnest(enemies) e FROM frames WHERE in_combat) WHERE e.id = 'WATERFALL_GIANT' AND e.max_hp >= 1000000)
     SELECT f.run_id, f.floor, f.ascension, f.outcome FROM h JOIN fights f USING (run_id, floor) ORDER BY f.first_ts`,
  );
  let total = 0;
  for (const fight of fights) {
    const run = String(fight["run_id"]);
    const floor = Number(fight["floor"]);
    if (fightsOnly && !fightsOnly.split(",").includes(`${run}:${floor}`)) continue;
    // The fight's frames (and the first frame after it: GAME_OVER or REWARD), split into attempts on the turn going back.
    const index = query(`SELECT off, len, ts, turn, screen, observed FROM state_index WHERE run_id = '${run}' AND floor = ${floor} ORDER BY off`);
    const decisions = query(`SELECT ts, turn, label, action, target_index FROM decisions WHERE run_id = '${run}' AND floor = ${floor} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY ts`);
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
    attempts.forEach((frames, k) => {
      const tracker = new DrawTracker({ inserts: true, tops: true });
      const memory = createScreenMemory("COMBAT");
      // (An observed COMBAT frame with no turn may follow the rewards: TMNFVW6DRQ20 F17.)
      const combatFrames = frames.filter((row) => (row["screen"] === "COMBAT" || row["screen"] === "CARD_SELECTION") && row["turn"] !== null);
      const lastTurn = Math.max(...combatFrames.map((row) => Number(row["turn"])));
      const after = frames.find((row) => row["screen"] !== "COMBAT" && row["screen"] !== "CARD_SELECTION" && Number(row["off"]) > Number(combatFrames[combatFrames.length - 1]!["off"]));
      const end = after ? String(after["screen"]) : k < attempts.length - 1 ? "RELOADED" : "?";
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
        const husk = huskOf(state);
        if (!husk) {
          noteTarget();
          continue;
        }
        const turn = Number(decision["turn"]);
        const env = envOf(state);
        env.screenMemory.facing = memory.facing;
        env.screenMemory.facingFight = memory.facingFight;
        env.screenMemory.lizardTail = memory.lizardTail === undefined ? undefined : structuredClone(memory.lizardTail);
        let planned: Decision | null = null;
        let error: string | undefined;
        try {
          planned = planCombatTurn(env);
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
        }
        const plannedLabel = planned?.label ?? "";
        const plannedAction = planned?.kind === "act" ? planned.intent.action : null;
        const facts = leastLossFactsOf(planned);
        const maxHp = num(asRecord(asRecord(state.raw["combat"])["player"])["max_hp"], state.run?.max_hp ?? 0);
        const revives = revivesOf(state, env.screenMemory, maxHp).map((revive) => revive.source);
        const ethereal = (card: Record<string, unknown>) => heldCardEthereal(card, knowledge);
        const judgeWith = (label: string): DeathVerdict => {
          const drawsKnown = label === LEAST_LOSS_LABEL && facts ? drawsKnownAt(state, facts, knowledge) : false;
          const bound = label === LEAST_LOSS_LABEL ? drawBoundOf(facts) : null;
          return judgeEndTurn(state, { label, revives, ethereal, knowledge, ...(drawsKnown ? { drawsKnown: true } : {}), ...(bound ? { drawBound: bound } : {}) });
        };
        const loggedAction = String(decision["action"]);
        const loggedLabel = String(decision["label"]);
        const endLogged = loggedAction === "end_turn" ? judgeWith(loggedLabel) : null;
        const endPlanned = plannedAction === "end_turn" ? judgeWith(plannedLabel) : null;
        const isStep = plannedLabel === LEAST_LOSS_LABEL && plannedAction !== null && plannedAction !== "end_turn";
        const bound = isStep ? drawBoundOf(facts) : null;
        const early = isStep
          ? judgeLeastLossNow(state, { revives, ethereal, facts, knownDrawsJudge: true, addedToPile: tracker.addedToPile, knowledge, ...(bound ? { drawBound: bound } : {}) })
          : null;
        const player = asRecord(asRecord(state.raw["combat"])["player"]);
        const outcome = turn < lastTurn ? "survived" : end === "GAME_OVER" || end === "RELOADED" ? "died" : end === "REWARD" ? "won" : end;
        const row = {
          run, floor, asc: Number(fight["ascension"]), attempt: k + 1, attempts: attempts.length, turn, ts: String(decision["ts"]),
          phase: husk.move === "EXPLODE_MOVE" ? "blast" : husk.move === "ABOUT_TO_BLOW_MOVE" ? "about" : husk.move,
          hp: num(player["current_hp"]), block: num(player["block"]), energy: num(player["energy"]), blast: husk.blast,
          flag: asRecord(state.raw["combat"])["end_turn_will_kill_player"] === true,
          logged: { label: loggedLabel, action: loggedAction },
          planned: { label: plannedLabel, action: plannedAction },
          facts: facts ?? null,
          end_logged: verdictRow(endLogged),
          end_planned: verdictRow(endPlanned),
          early: verdictRow(early),
          outcome,
          last_turn: lastTurn,
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
  console.log(`wrote ${out} (${total} rows)`);
}

main();
