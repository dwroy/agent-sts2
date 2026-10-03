/**
 * Offline evaluation of SL_RETRY_EXPLORE_REPLAY_PLAYS and SL_RETRY_EXPLORE_REPLAY_DEVIATE (docs/sl.md §11.2): on the logged SL
 * retries whose attempts 3+ replayed the reference attempt's path (SL_RETRY_EXPLORE_REPLAY live), for each such attempt and
 * its live deviation point, the reference attempt's decision boards before the point planned again as that attempt would
 * see them (its known draws: the earlier attempts' order checked against the reference's draws up to the board;
 * RETRY_COMPUTE with the frozen clock, B2 off) and resolved under three rules:
 * - "old": the replay as live (the reference's line among the options, by text or by the turn's plays);
 * - "new": with SL_RETRY_EXPLORE_REPLAY_PLAYS (its logged plays from the board when its line is not shown) and
 *   SL_RETRY_EXPLORE_REPLAY_DEVIATE (where neither can be played: the deviation made there);
 * - "new+draws": "new" with the known draws of SL_RETRY_KNOWN_OFF_TOP and SL_RETRY_KNOWN_HAND_ORDER (the earlier attempts'
 *   frames tracked again).
 * Jev answers as the live attempt did on that board when it was there, else as the reference did (its line's text), else
 * the rollout's best. A board is passed when the line played is the reference's (or, "new", its logged plays); the first
 * board that is not stops the replay (with "new", the deviation made there when one is). Each attempt is taken to follow the
 * reference's boards while it passes them (the game's draws and moves are the same for the same plays). No model is called,
 * nothing is written outside --out; logs are read only.
 *
 * Usage: npx tsx tools/sl-replay-reach.ts [--attempts logs/sl-attempts.jsonl] [--states logs/states.jsonl]
 *          [--decisions logs/decisions.jsonl] [--fights RUN:FLOOR,...] [--out experiments/sl-replay]
 * Output: <out>/reach.jsonl (one row per fight and attempt), a line per attempt and rule on stdout.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { makeKnowledge, type Knowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv, type SlEnv } from "../src/project/types.js";
import { livingEnemySignature, planCombatTurn, slPointOf } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { previousAttemptsJson, type SlAttemptRow } from "../src/sl/attempts.js";
import { RETRY_COMPUTE } from "../src/sl/controller.js";
import { checkKnown, DrawTracker, knownOrderOf, type DrawTrackerOptions, type KnownOrder, type SlDraws } from "../src/sl/draws.js";
import { boardTried, replayPlays, replayPoints, slBoardKey, type ExploreRow, type SlExploreEnv, type SlTarget } from "../src/sl/explore.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const ATTEMPTS = arg("attempts", "logs/sl-attempts.jsonl");
const STATES = arg("states", "logs/states.jsonl");
const DECISIONS = arg("decisions", "logs/decisions.jsonl");
const outDir = arg("out", "experiments/sl-replay");
const only = arg("fights", "");
const PY = process.env["LOGDB_PYTHON"] ?? ".cache/logdb-venv/bin/python";
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
type Row = Record<string, unknown>;

const knowledge: Knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

function query(sql: string): Row[] {
  const out = execFileSync(PY, ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "500000", "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 1 << 29 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}
const statesFd = openSync(STATES, "r");
const decisionsFd = openSync(DECISIONS, "r");
function rawAt(fd: number, off: number, len: number): Row {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return JSON.parse(buffer.toString("utf8")) as Row;
}
function asRow(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}

function envOf(state: GameState, sl: SlEnv): DecisionEnv {
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    sl, thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
}

interface Frame {
  ts: string;
  state: GameState;
  decision: Row | null;
}

/** A fight's frames (with the dispatched decision made on each) split into attempts where the turn goes back. */
function attemptsOf(run: string, floor: number): Frame[][] {
  const frames = query(`SELECT off, len, ts, turn FROM state_index WHERE run_id = '${run}' AND floor = ${floor} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL AND NOT coalesce(observed, false) ORDER BY off`);
  const decisions = query(`SELECT off, len, ts FROM decisions WHERE run_id = '${run}' AND floor = ${floor} AND screen = 'COMBAT' AND turn IS NOT NULL ORDER BY off`);
  const byTs = new Map(decisions.map((row) => [String(row["ts"]), row]));
  const out: Frame[][] = [];
  let prev: number | null = null;
  for (const row of frames) {
    const turn = Number(row["turn"]);
    if (prev === null || turn < prev) out.push([]);
    prev = turn;
    const raw = rawAt(statesFd, Number(row["off"]), Number(row["len"]));
    const meta = byTs.get(String(row["ts"]));
    const decision = meta ? rawAt(decisionsFd, Number(meta["off"]), Number(meta["len"])) : null;
    out[out.length - 1]!.push({ ts: String(row["ts"]), state: parseGameState(raw["state"] as Record<string, unknown>), decision: decision && /^(?:completed|pending)/.test(String(decision["result"] ?? "")) ? decision : null });
  }
  return out;
}

const normal = (plays: unknown): string => String(plays ?? "").replace(/, then /g, ", ").replace(/^nothing \(end the turn now\)$/, "end turn");
function criteriaOf(row: Row): Record<string, Row> {
  return Object.fromEntries(Object.entries((asRow(asRow(asRow(row["questions"])["plan"]))["criteria"] ?? {}) as Record<string, string | null>).map(([key, text]) => [key, text ? (JSON.parse(text) as Row) : {}]));
}
/** A logged question's answer as the line text it chose. */
function loggedAnswer(row: Row | null): string | null {
  if (!row || !String(row["label"] ?? "").startsWith("combat/plan-choice")) return null;
  const choice = asRow(asRow(row["answers"])["plan"])["choice"];
  const option = typeof choice === "string" ? criteriaOf(row)[choice] : undefined;
  if (!option) return null;
  return /^p\d+$/.test(String(choice)) ? `potion:${String(choice)}` : normal(option["plays"]);
}

const LIVE: DrawTrackerOptions = { inserts: true, tops: true, picks: true };
const NEW: DrawTrackerOptions = { inserts: true, tops: true, picks: true, offTop: true, handOrder: true };

function knownOf(order: KnownOrder | null, tracker: DrawTracker): SlEnv["knownDraws"] | undefined {
  const check = order ? checkKnown(order, tracker) : null;
  return check?.ok && check.keys.length > 0 ? { cards: check.keys, names: check.names, attempts: [...order!.attempts], ...(check.inserted && check.inserted.keys.length > 0 ? { added: { cards: check.inserted.keys, names: check.inserted.names } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) } : undefined;
}

type RuleName = "old" | "new" | "new+draws";
interface Outcome {
  passed: number;
  logged: number;
  /** Each board passed: its turn, and how (the line's text, the turn's plays, the logged plays). */
  boards: Row[];
  reached: boolean;
  stop: Row | null;
  fallback: Row | null;
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  const rows = readFileSync(ATTEMPTS, "utf8").trim().split("\n").map((line) => JSON.parse(line) as SlAttemptRow);
  const fights = new Map<string, SlAttemptRow[]>();
  for (const row of rows) {
    const key = `${row.run_id}:${row.floor}`;
    if (only && !only.split(",").includes(key)) continue;
    fights.set(key, [...(fights.get(key) ?? []), row]);
  }
  const out = join(outDir, "reach.jsonl");
  writeFileSync(out, "");
  const totals: Record<RuleName, { attempts: number; reached: number; fallback: number; logged: number }> = { old: { attempts: 0, reached: 0, fallback: 0, logged: 0 }, new: { attempts: 0, reached: 0, fallback: 0, logged: 0 }, "new+draws": { attempts: 0, reached: 0, fallback: 0, logged: 0 } };
  let liveReached = 0;
  for (const [key, live] of fights) {
    const replayed = live.filter((row) => row.attempt >= 3 && row.explore?.target && row.explore.replay);
    if (replayed.length === 0) continue;
    const [run, floor] = [key.split(":")[0]!, Number(key.split(":")[1])];
    const attempts = attemptsOf(run, floor);
    if (attempts.length < live.length) {
      process.stdout.write(`${key}: ${attempts.length} logged attempts for ${live.length} rows, skipped\n`);
      continue;
    }
    const maxAttempts = live[0]?.max_attempts ?? 6;
    // The earlier attempts' draws as live (the rows) and tracked again with the new trackers (their frames).
    const reDrawn = attempts.map((frames) => {
      const tracker = new DrawTracker(NEW);
      for (const frame of frames) tracker.observe(frame.state);
      return tracker.record;
    });
    const planCache = new Map<string, { decision: Decision | null; explore: SlExploreEnv }>();
    for (const row of replayed) {
      const k = row.attempt;
      const target = row.explore!.target as SlTarget;
      const before = live.filter((other) => other.attempt < k);
      const exploreRows = before as unknown as ExploreRow[];
      const path = replayPoints(exploreRows, target);
      const reference = attempts[target.reference - 1]!;
      const referenceRow = live.find((other) => other.attempt === target.reference)!;
      const turnRecords = referenceRow.explore?.turns ?? [];
      const summaryTurns = referenceRow.summary?.turns ?? [];
      // The live attempt's own answers by board (where it was on the reference's boards).
      const ownAnswers = new Map<string, string>();
      for (const frame of attempts[k - 1] ?? []) {
        const answer = loggedAnswer(frame.decision);
        if (answer !== null) ownAnswers.set(slBoardKey(frame.state), answer);
      }
      const knownLive = knownOrderOf(before.map((other) => ({ attempt: other.attempt, draws: (other.draws ?? null) as SlDraws | null }))).known;
      const knownNew = knownOrderOf(before.map((other) => ({ attempt: other.attempt, draws: reDrawn[other.attempt - 1] ?? null }))).known;
      const results = new Map<RuleName, Outcome>();
      for (const rule of ["old", "new", "new+draws"] as RuleName[]) {
        const tracker = new DrawTracker(rule === "new+draws" ? NEW : LIVE);
        const known = rule === "new+draws" ? knownNew : knownLive;
        const outcome: Outcome = { passed: 0, logged: 0, boards: [], reached: false, stop: null, fallback: null };
        // The reference's last dispatched decision of the turn: a chosen line's step (plan-continue) before a question means the
        // line was played to its end there (lineDone: "stop here" among the options), which a board planned alone does not know.
        let lastLabel: { turn: number | null; label: string } | null = null;
        for (const frame of reference) {
          tracker.observe(frame.state);
          if (outcome.stop || outcome.reached) break;
          const previous = lastLabel;
          if (frame.decision) lastLabel = { turn: frame.state.turn, label: String(frame.decision["label"] ?? "") };
          if (!frame.decision || !PLANNING.test(String(frame.decision["label"] ?? ""))) continue;
          const board = slBoardKey(frame.state);
          if (board === target.board) {
            outcome.reached = true;
            break;
          }
          const ref = path.get(board);
          if (!ref) continue;
          const turn = frame.state.turn ?? 0;
          const record = turnRecords.find((entry) => entry.turn === turn);
          const at = record?.boards.filter((entry) => entry.board === board).at(-1)?.at ?? 0;
          const summary = summaryTurns.find((entry) => entry.turn === turn);
          const played = { canon: record ? record.plays.slice(0, at) : [], text: summary ? summary.plays.slice(0, at) : [] };
          const knownDraws = knownOf(known, tracker);
          const lineEnded = previous !== null && previous.turn === frame.state.turn && previous.label === "combat/plan-continue" && String(frame.decision["label"]).startsWith("combat/plan-choice");
          const cacheKey = `${board}|${JSON.stringify(knownDraws ?? null)}|${k}|${lineEnded}`;
          let cached = planCache.get(cacheKey);
          if (cached === undefined) {
            // The planner keeps this env.sl.explore object: each rule's replay is set on it for its resolution.
            const explore: SlExploreEnv = { played, b2Gate: true, bossPotions: true, whole: true };
            const sl: SlEnv = {
              attempt: k,
              maxAttempts,
              previousAttempts: previousAttemptsJson(before, k, maxAttempts, { knownDraws: true }),
              showSim: true,
              ...(knownDraws ? { knownDraws } : {}),
              compute: { ...RETRY_COMPUTE },
              explore,
            };
            let planned: Decision | null = null;
            try {
              const env = envOf(frame.state, sl);
              if (lineEnded) {
                // The chosen line's memo with nothing left on the board it expected (combat-plan lineDone).
                const hand = ((asRow(frame.state.raw["combat"])["hand"] ?? []) as Row[]).map((card) => `${String(card["card_id"])}${card["upgraded"] === true ? "+" : ""}`).sort().join(",");
                env.screenMemory.combatPlan = { turn: frame.state.turn, remaining: [], expectedHand: hand, handLen: ((asRow(frame.state.raw["combat"])["hand"] ?? []) as Row[]).length, via: "jev", enemies: livingEnemySignature(frame.state.raw) };
              }
              planned = planCombatTurn(env);
            } catch {
              planned = null;
            }
            cached = { decision: planned, explore };
            planCache.set(cacheKey, cached);
          }
          const { decision, explore } = cached;
          if (!decision) {
            outcome.stop = { turn, reason: "no decision planned" };
            break;
          }
          const canon = ref.canon?.[ref.line];
          const replayEnv: NonNullable<SlExploreEnv["replay"]> = { line: ref.line, reference: target.reference, point: target.point, ...(canon !== undefined ? { canon } : {}) };
          if (rule !== "old") {
            const plays = replayPlays(exploreRows, target, board);
            if (plays) replayEnv.plays = plays;
            const tried = boardTried(exploreRows, k, board, { canon: true, potion: true });
            if (tried) replayEnv.fallback = { point: `T${turn}, where the replay of attempt ${target.reference}'s path could not go on`, excluded: tried.excluded, attempts: tried.attempts, ...(tried.tried ? { tried: tried.tried } : {}) };
          }
          let info: ReturnType<typeof slPointOf>;
          let answer: string | null = null;
          if (decision.kind === "ask") {
            const ask = decision as AskDecision;
            const options = criteriaOf(ask as unknown as Row);
            const byText = (text: string | null) => (text === null ? undefined : Object.keys(options).find((option) => (text.startsWith("potion:") ? option === text.slice("potion:".length) : normal(options[option]!["plays"]) === text)));
            const choice = byText(ownAnswers.get(board) ?? null) ?? byText(ref.line) ?? Object.keys(options).find((option) => options[option]!["rollout_best"] === true) ?? Object.keys(options)[0];
            answer = choice ? normal(options[choice]!["plays"]) : null;
            Object.assign(explore, { replay: replayEnv });
            const resolved = choice ? ask.resolve({ plan: { type: "choice", choice, probabilities: { [choice]: 0.95 }, confidence: 0.95, raw: {} } } as unknown as AnswerSet) : null;
            delete (explore as Record<string, unknown>)["replay"];
            info = resolved ? slPointOf(decision, resolved) : undefined;
          } else info = slPointOf(decision, { intent: null, rationale: "", confidence: null, fallback: false });
          if (!info) {
            outcome.stop = { turn, label: decision.label, reason: "no line recorded" };
            break;
          }
          const same = info.line === ref.line || (canon !== undefined && info.canon?.[info.line] === canon) || (rule !== "old" && info.replay?.logged === true);
          if (same) {
            outcome.passed += 1;
            if (info.replay?.logged) outcome.logged += 1;
            outcome.boards.push({ turn, kind: decision.kind, how: info.line === ref.line ? "text" : info.replay?.logged ? "logged" : "plays", ...(info.line !== ref.line ? { reference: ref.line, played: info.line } : {}) });
            continue;
          }
          outcome.stop = { turn, label: decision.label, kind: decision.kind, answer, played: info.line, reference: ref.line, reason: info.replay?.reason ?? (decision.kind === "ask" ? "the answer kept" : "code's own line") };
          if (rule !== "old" && info.deviation) outcome.fallback = { turn, original: info.deviation.original, replacement: info.deviation.replacement, reason: info.deviation.reason };
        }
        results.set(rule, outcome);
        totals[rule].attempts += 1;
        if (outcome.reached) totals[rule].reached += 1;
        if (outcome.fallback && (outcome.fallback["replacement"] !== null || !/^no shown line left/.test(String(outcome.fallback["reason"])))) totals[rule].fallback += 1;
        totals[rule].logged += outcome.logged;
      }
      const liveReplay = row.explore!.replay!;
      const reachedLive = row.explore!.deviation?.reached === true;
      if (reachedLive) liveReached += 1;
      const result = {
        fight: key,
        attempt: k,
        target: { turn: target.turn, point: target.point, board: target.board },
        path: path.size,
        live: { reached: reachedLive, replayed: liveReplay.replayed, overridden: liveReplay.overridden, stopped: liveReplay.stopped },
        rules: Object.fromEntries([...results].map(([name, outcome]) => [name, outcome])),
      };
      writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
      const say = (outcome: Outcome) => (outcome.reached ? `reached (${outcome.passed} boards${outcome.logged > 0 ? `, ${outcome.logged} by logged plays` : ""})` : `stops T${String(outcome.stop?.["turn"] ?? "?")} after ${outcome.passed}: ${String(outcome.stop?.["reason"] ?? "the path ended")}${outcome.fallback ? `; deviates there: ${String(outcome.fallback["replacement"] ?? outcome.fallback["original"])} (${String(outcome.fallback["reason"]).slice(0, 80)})` : ""}`);
      process.stdout.write(`${key} attempt ${k} -> T${target.turn ?? "?"}: live ${reachedLive ? "reached" : `stopped (${liveReplay.stopped ?? "?"})`}\n`);
      for (const [name, outcome] of results) process.stdout.write(`    ${name.padEnd(10)} ${say(outcome)}\n`);
    }
  }
  process.stdout.write(`\nattempts ${totals.old.attempts}; deviation points reached: live ${liveReached}`);
  for (const name of ["old", "new", "new+draws"] as RuleName[]) process.stdout.write(`, ${name} ${totals[name].reached} (+${totals[name].fallback} deviating where the replay stopped; ${totals[name].logged} boards by logged plays)`);
  process.stdout.write("\n");
}

main();
