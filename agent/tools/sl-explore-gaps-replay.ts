/**
 * Offline replay of the V4.6 SL explore fixes (docs/sl.md §11.14-11.16) on the logged SL retries, planning the boards again as
 * tools/sl-replay-reach.ts does (the attempt's known draws checked against the frames walked, RETRY_COMPUTE with the frozen
 * clock, B2 off; Jev answers as the live attempt did on the board, else as the reference did, else the rollout's best):
 * - live / anchor / anchor1 / rearm: walk the reference attempt's frames to a deviation point (live: the attempt's; anchor:
 *   the point exploreTarget gives with SL_RETRY_EXPLORE_ANCHOR where its reference differs, and the one without it, same
 *   switches; anchor1: the same with attempt 1's decision points rebuilt from its frames and decisions, as the switch records
 *   them from now on, where attempt 1 is then the reference; rearm: the later point SL_RETRY_EXPLORE_REARM aims at after a
 *   wasted deviation), each board replayed under the rules (--rules): "v4" (the replay as live: the reference's line by text
 *   or turn's plays, its logged plays when not shown, the deviation where neither can be played), "order" ("v4" with
 *   SL_RETRY_EXPLORE_REPLAY_ORDER: a line with the reference's plays in another order plays them in the reference's order),
 *   "code" ("order" with SL_RETRY_EXPLORE_REPLAY_CODE: code's own line that is not the reference's plays the reference's
 *   logged plays). A board passed by the turn's plays in another order is counted (`reordered`: the board after it may not be
 *   the reference's: ABCJ0TZ6MD06 F48 attempt 4 T4). On the point's board the deviation is planned too (the replacement, or
 *   why none).
 * - target-turn: the attempts whose replay left the path before the point: on their own frames, the first question of the
 *   point's turn planned with the point's deviation (SL_RETRY_EXPLORE_TARGET_TURN): the replacement, or why none.
 * No model is called, nothing is written outside --out; logs are read only.
 *
 * Usage: npx tsx tools/sl-explore-gaps-replay.ts [--mode live|anchor|anchor1|rearm|target-turn] [--rules v4,order,code]
 *          [--fights RUN:FLOOR,...] [--attempts logs/sl-attempts.jsonl] [--states logs/states.jsonl] [--decisions logs/decisions.jsonl]
 *          [--out experiments/sl-explore-gaps]
 * Output: <out>/<mode>.jsonl (one row per fight, attempt and target), a line per attempt and rule on stdout.
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
import { checkKnown, DrawTracker, knownOrderOf, type DrawTrackerOptions, type KnownOrder } from "../src/sl/draws.js";
import { boardTried, exploreTarget, replayPlays, replayPoints, slBoardKey, triedHas, turnCanon, type ExploreRow, type ExploreTargetOptions, type SlExploreEnv, type SlPoint, type SlTarget } from "../src/sl/explore.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const MODE = arg("mode", "live") as "live" | "anchor" | "anchor1" | "rearm" | "target-turn";
const ATTEMPTS = arg("attempts", fromRoot("logs/sl-attempts.jsonl"));
const STATES = arg("states", fromRoot("logs/states.jsonl"));
const DECISIONS = arg("decisions", fromRoot("logs/decisions.jsonl"));
const outDir = arg("out", fromRoot("experiments/sl-explore-gaps"));
const only = arg("fights", "");
const PY = process.env["LOGDB_PYTHON"] ?? fromRoot("data/logdb-venv/bin/python");
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
/** The rules walked: --rules v4,order[,code] (default v4,order; anchor1: v4,order,code). */
const RULES = arg("rules", MODE === "anchor1" ? "v4,order,code" : "v4,order").split(",") as ("v4" | "order" | "code")[];
const OPTIONS: ExploreTargetOptions = { aliveFirst: true, canon: true, tried: true, whole: true, where: true, potion: true };
type Row = Record<string, unknown>;

const knowledge: Knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "500000", "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 1 << 29 });
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
function loggedAnswer(row: Row | null): string | null {
  if (!row || !String(row["label"] ?? "").startsWith("combat/plan-choice")) return null;
  const choice = asRow(asRow(row["answers"])["plan"])["choice"];
  const option = typeof choice === "string" ? criteriaOf(row)[choice] : undefined;
  if (!option) return null;
  return /^p\d+$/.test(String(choice)) ? `potion:${String(choice)}` : normal(option["plays"]);
}

const TRACKER: DrawTrackerOptions = { inserts: true, tops: true, picks: true, offTop: true, handOrder: true };
function knownOf(order: KnownOrder | null, tracker: DrawTracker): SlEnv["knownDraws"] | undefined {
  const check = order ? checkKnown(order, tracker) : null;
  return check?.ok && check.keys.length > 0 ? { cards: check.keys, names: check.names, attempts: [...order!.attempts], ...(check.inserted && check.inserted.keys.length > 0 ? { added: { cards: check.inserted.keys, names: check.inserted.names } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) } : undefined;
}

type RuleName = "v4" | "order" | "code";
interface Outcome {
  passed: number;
  logged: number;
  /** Boards passed by the turn's plays in another text (order): the board after may not be the reference's. */
  reordered: number;
  boards: Row[];
  reached: boolean;
  stop: Row | null;
  fallback: Row | null;
  /** On the point's board: the deviation planned there. */
  deviation: Row | null;
}

/** Planned boards, by board, known draws, attempt and line end: the planner keeps the explore object, set per resolution. */
const planCache = new Map<string, { decision: Decision | null; explore: SlExploreEnv }>();
/** One board planned as attempt `k` sees it, with the explore env `extra` set on it while the answer resolves. */
function planBoard(frame: Frame, sl: Omit<SlEnv, "explore" | "knownDraws">, knownDraws: SlEnv["knownDraws"] | undefined, played: { canon: string[]; text: string[] }, lineEnded: boolean, answerOf: (options: Record<string, Row>) => string | undefined, extra: Partial<SlExploreEnv>, planExtra?: Partial<SlExploreEnv>): { decision: Decision | null; info: ReturnType<typeof slPointOf>; answer: string | null } {
  // `planExtra` (SL_RETRY_EXPLORE_REPLAY_CODE: the replay code reads while it plans) is set while the board is planned.
  const cacheKey = `${frame.ts}|${JSON.stringify(knownDraws ?? null)}|${sl.attempt}|${lineEnded}|${JSON.stringify(played)}|${planExtra ? JSON.stringify(planExtra) : ""}`;
  let cached = planCache.get(cacheKey);
  if (!cached) {
    const explore: SlExploreEnv = { played, b2Gate: true, bossPotions: true, whole: true, ...(planExtra ? structuredClone(planExtra) : {}) };
    let decision: Decision | null = null;
    try {
      const env = envOf(frame.state, { ...sl, ...(knownDraws ? { knownDraws } : {}), explore });
      if (lineEnded) {
        const hand = ((asRow(frame.state.raw["combat"])["hand"] ?? []) as Row[]).map((card) => `${String(card["card_id"])}${card["upgraded"] === true ? "+" : ""}`).sort().join(",");
        env.screenMemory.combatPlan = { turn: frame.state.turn, remaining: [], expectedHand: hand, handLen: ((asRow(frame.state.raw["combat"])["hand"] ?? []) as Row[]).length, via: "jev", enemies: livingEnemySignature(frame.state.raw) };
      }
      decision = planCombatTurn(env);
    } catch {
      decision = null;
    }
    cached = { decision, explore };
    planCache.set(cacheKey, cached);
  }
  const { decision, explore } = cached;
  if (!decision) return { decision: null, info: undefined, answer: null };
  if (decision.kind !== "ask") return { decision, info: slPointOf(decision, { intent: null, rationale: "", confidence: null, fallback: false }), answer: null };
  const ask = decision as AskDecision;
  const options = criteriaOf(ask as unknown as Row);
  const choice = answerOf(options);
  Object.assign(explore, extra);
  try {
    const resolved = choice ? ask.resolve({ plan: { type: "choice", choice, probabilities: { [choice]: 0.95 }, confidence: 0.95, raw: {} } } as unknown as AnswerSet) : null;
    return { decision, info: resolved ? slPointOf(decision, resolved) : undefined, answer: choice ? normal(options[choice]!["plays"]) : null };
  } finally {
    for (const key of Object.keys(extra)) delete (explore as Record<string, unknown>)[key];
  }
}

/** The line a code decision played, from its rationale ("code plan (only line): X; hp ...", "lethal: X", "...(-27): X"). */
function codeLine(rationale: string): string | null {
  const plan = /^code plan \([^)]*\): (.*?); hp -?\d/.exec(rationale);
  if (plan) return plan[1]!;
  const lethal = /^lethal: (.*)$/.exec(rationale);
  if (lethal) return lethal[1]!;
  const least = /^every simulated line dies; .*?\): (.*)$/.exec(rationale);
  return least ? least[1]! : null;
}

/** anchor1: attempt `row`'s decision points rebuilt from its frames (board as its turn record keys it, line, alternatives). */
function pointsOf(row: SlAttemptRow, frames: Frame[]): SlPoint[] {
  const boards = new Set((row.explore?.turns ?? []).flatMap((turn) => turn.boards.map((entry) => entry.board)));
  const points: SlPoint[] = [];
  for (const frame of frames) {
    const decision = frame.decision;
    if (!decision || !PLANNING.test(String(decision["label"] ?? ""))) continue;
    const board = keyIn(frame.state, (key) => boards.has(key));
    const label = String(decision["label"]);
    let point: SlPoint | null = null;
    if (label.startsWith("combat/plan-choice")) {
      const line = loggedAnswer(decision);
      if (line === null || line.startsWith("potion:")) continue;
      const options = criteriaOf(decision);
      const alternatives = Object.values(options).map((option) => normal(option["plays"])).filter((text) => text !== "" && text !== line);
      point = { board, turn: frame.state.turn, kind: "question", label, line, alternatives };
    } else {
      const line = codeLine(String(decision["rationale"] ?? ""));
      if (line === null) continue;
      point = { board, turn: frame.state.turn, kind: "code", label, line };
    }
    if (points.at(-1)?.board === board) points[points.length - 1] = point;
    else points.push(point);
  }
  return points;
}

/** A frame's board key as the rows have it: with SL_RETRY_EXPLORE_KEY_COUNTERS (from 10-04) or without (before). */
function keyIn(state: GameState, known: (key: string) => boolean): string {
  const plain = slBoardKey(state);
  if (known(plain)) return plain;
  const counted = slBoardKey(state, { counters: true });
  return known(counted) ? counted : plain;
}

const byTextIn = (options: Record<string, Row>, text: string | null | undefined): string | undefined =>
  text === null || text === undefined ? undefined : Object.keys(options).find((option) => (text.startsWith("potion:") ? option === text.slice("potion:".length) : normal(options[option]!["plays"]) === text));
const bestOf = (options: Record<string, Row>): string | undefined => Object.keys(options).find((option) => options[option]!["rollout_best"] === true) ?? Object.keys(options)[0];

/** Walk the reference's frames to `target` under `rule` (as tools/sl-replay-reach.ts), the deviation planned on its board. */
function walk(reference: Frame[], before: SlAttemptRow[], k: number, maxAttempts: number, target: SlTarget, rule: RuleName, ownAnswers: Map<string, string>, known: KnownOrder | null): Outcome {
  const exploreRows = before as unknown as ExploreRow[];
  const path = replayPoints(exploreRows, target);
  const referenceRow = before.find((other) => other.attempt === target.reference)!;
  const turnRecords = referenceRow.explore?.turns ?? [];
  const summaryTurns = referenceRow.summary?.turns ?? [];
  const tracker = new DrawTracker(TRACKER);
  const sl = { attempt: k, maxAttempts, previousAttempts: previousAttemptsJson(before, k, maxAttempts, { knownDraws: true }), showSim: true, compute: { ...RETRY_COMPUTE } };
  const outcome: Outcome = { passed: 0, logged: 0, reordered: 0, boards: [], reached: false, stop: null, fallback: null, deviation: null };
  let lastLabel: { turn: number | null; label: string } | null = null;
  for (const frame of reference) {
    tracker.observe(frame.state);
    const previous = lastLabel;
    if (frame.decision) lastLabel = { turn: frame.state.turn, label: String(frame.decision["label"] ?? "") };
    if (!frame.decision || !PLANNING.test(String(frame.decision["label"] ?? ""))) continue;
    const board = keyIn(frame.state, (key) => key === target.board || path.has(key));
    const turn = frame.state.turn ?? 0;
    const record = turnRecords.find((entry) => entry.turn === turn);
    const at = record?.boards.filter((entry) => entry.board === board).at(-1)?.at ?? 0;
    const summary = summaryTurns.find((entry) => entry.turn === turn);
    const played = { canon: record ? record.plays.slice(0, at) : [], text: summary ? summary.plays.slice(0, at) : [] };
    const lineEnded = previous !== null && previous.turn === frame.state.turn && previous.label === "combat/plan-continue" && String(frame.decision["label"]).startsWith("combat/plan-choice");
    if (board === target.board) {
      outcome.reached = true;
      const deviate = { point: target.point, excluded: [...target.excluded], attempts: [...target.attempts], ...(target.tried ? { tried: structuredClone(target.tried) } : {}) };
      const planned = planBoard(frame, sl, knownOf(known, tracker), played, lineEnded, (options) => byTextIn(options, ownAnswers.get(board)) ?? byTextIn(options, path.get(board)?.line ?? null) ?? bestOf(options), { deviate });
      outcome.deviation = planned.decision?.kind === "ask" ? { turn, answer: planned.answer, ...(planned.info?.deviation ?? { reason: "no deviation recorded" }), differs: planned.info?.deviation?.replacement ? !triedHas(target.tried, { text: planned.info.deviation.replacement, ...(planned.info.canon?.[planned.info.deviation.replacement] !== undefined ? { canon: planned.info.canon[planned.info.deviation.replacement] } : {}) }) : null } : { turn, reason: planned.decision ? `code decides there (${planned.decision.label})` : "no decision planned" };
      break;
    }
    const ref = path.get(board);
    if (!ref) continue;
    const canon = ref.canon?.[ref.line];
    const plays = replayPlays(exploreRows, target, board);
    const tried = boardTried(exploreRows, k, board, { canon: true, potion: true });
    const replay: NonNullable<SlExploreEnv["replay"]> = { line: ref.line, reference: target.reference, point: target.point, ...(canon !== undefined ? { canon } : {}), ...(plays ? { plays } : {}), ...(plays && rule !== "v4" ? { order: true } : {}), ...(plays && rule === "code" ? { code: true } : {}), ...(tried ? { fallback: { point: `T${turn}, where the replay of attempt ${target.reference}'s path could not go on`, excluded: tried.excluded, attempts: tried.attempts, ...(tried.tried ? { tried: tried.tried } : {}) } } : {}) };
    const planned = planBoard(frame, sl, knownOf(known, tracker), played, lineEnded, (options) => byTextIn(options, ownAnswers.get(board)) ?? byTextIn(options, ref.line) ?? bestOf(options), { replay }, rule === "code" ? { replay } : undefined);
    const { decision, info } = planned;
    if (!decision) {
      outcome.stop = { turn, reason: "no decision planned" };
      break;
    }
    if (!info) {
      outcome.stop = { turn, label: decision.label, reason: "no line recorded" };
      break;
    }
    const same = info.line === ref.line || (canon !== undefined && info.canon?.[info.line] === canon) || info.replay?.logged === true;
    if (same) {
      outcome.passed += 1;
      if (info.replay?.logged) outcome.logged += 1;
      const how = info.line === ref.line ? "text" : info.replay?.logged ? (/in another order/.test(info.replay.reason) ? "logged, in order" : "logged") : "plays";
      if (how === "plays") outcome.reordered += 1;
      outcome.boards.push({ turn, kind: decision.kind, how, ...(info.line !== ref.line ? { reference: ref.line, played: info.line } : {}) });
      continue;
    }
    outcome.stop = { turn, label: decision.label, kind: decision.kind, answer: planned.answer, played: info.line, reference: ref.line, reason: info.replay?.reason ?? (decision.kind === "ask" ? "the answer kept" : "code's own line") };
    if (info.deviation) outcome.fallback = { turn, original: info.deviation.original, replacement: info.deviation.replacement, reason: info.deviation.reason };
    break;
  }
  return outcome;
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
  const out = join(outDir, `${MODE}.jsonl`);
  writeFileSync(out, "");
  const totals = { attempts: 0, reached: { v4: 0, order: 0, code: 0 } as Record<RuleName, number>, reordered: { v4: 0, order: 0, code: 0 } as Record<RuleName, number>, deviated: { v4: 0, order: 0, code: 0 } as Record<RuleName, number>, cases: 0, replaced: 0 };
  for (const [key, all] of fights) {
    const live = [...all].sort((a, b) => a.attempt - b.attempt);
    const [run, floor] = [key.split(":")[0]!, Number(key.split(":")[1])];
    // The attempts this mode looks at, with their targets.
    const jobs: { row: SlAttemptRow; target: SlTarget; label: string; before?: SlAttemptRow[] }[] = [];
    const offPath: { row: SlAttemptRow; target: SlTarget }[] = [];
    const anchorOne: SlAttemptRow[] = [];
    for (const row of live) {
      const target = row.explore?.target as SlTarget | null | undefined;
      if (row.attempt < 3 || !target) continue;
      const before = live.filter((other) => other.attempt < row.attempt);
      if (MODE === "live" && row.explore?.replay) jobs.push({ row, target, label: "live" });
      if (MODE === "anchor") {
        const base = exploreTarget(before as unknown as ExploreRow[], row.attempt, OPTIONS).target;
        const anchored = exploreTarget(before as unknown as ExploreRow[], row.attempt, { ...OPTIONS, anchor: true }).target;
        if (base && anchored && anchored.reference !== base.reference) {
          jobs.push({ row, target: base, label: `base (attempt ${base.reference})` });
          jobs.push({ row, target: anchored, label: `anchor (attempt ${anchored.reference})` });
        }
      }
      const deviation = row.explore?.deviation;
      if (MODE === "rearm" && deviation?.reached && deviation.differs === false && deviation.turn !== undefined && deviation.turn !== null) {
        const next = (row.explore?.turns ?? []).find((turn) => turn.turn > deviation.turn!);
        const reference = before.find((other) => other.attempt === target.reference);
        const path = new Set((reference?.explore?.turns ?? []).flatMap((turn) => turn.boards.map((entry) => entry.board)));
        if (next && path.has(next.boards[0]?.board ?? "")) {
          const rearmed = exploreTarget(before as unknown as ExploreRow[], row.attempt, { ...OPTIONS, rearm: { reference: target.reference, fromTurn: next.turn, skip: [target.board] } }).target;
          if (rearmed) jobs.push({ row, target: rearmed, label: `rearm after T${deviation.turn}` });
        }
      }
      if (MODE === "target-turn" && row.explore?.replay && row.explore.replay.stopped !== null && !deviation?.reached) offPath.push({ row, target });
      if (MODE === "anchor1") anchorOne.push(row);
    }
    if (jobs.length === 0 && offPath.length === 0 && anchorOne.length === 0) continue;
    const attempts = attemptsOf(run, floor);
    if (attempts.length < live.length) {
      process.stdout.write(`${key}: ${attempts.length} logged attempts for ${live.length} rows, skipped\n`);
      continue;
    }
    const maxAttempts = live[0]?.max_attempts ?? 6;
    // anchor1: attempt 1's decision points as SL_RETRY_EXPLORE_ANCHOR records them from now on, rebuilt from its frames and
    // decisions (the line each decision played there, a question's other options as its alternatives), and the point the
    // switch then aims at where attempt 1 lived longest.
    const one = live.find((other) => other.attempt === 1);
    if (anchorOne.length > 0 && one && one.result !== "won" && one.explore?.turns) {
      const oneRow = { ...one, explore: { ...one.explore, points: pointsOf(one, attempts[0] ?? []) } } as SlAttemptRow;
      for (const row of anchorOne) {
        const before = live.filter((other) => other.attempt < row.attempt).map((other) => (other.attempt === 1 ? oneRow : other));
        const anchored = exploreTarget(before as unknown as ExploreRow[], row.attempt, { ...OPTIONS, anchor: true }).target;
        if (anchored?.reference === 1) jobs.push({ row, target: anchored, label: `anchor (attempt 1, ${oneRow.explore!.points.length} points rebuilt)`, before });
      }
    }
    if (jobs.length === 0 && offPath.length === 0) continue;
    const reDrawn = attempts.map((frames) => {
      const tracker = new DrawTracker(TRACKER);
      for (const frame of frames) tracker.observe(frame.state);
      return tracker.record;
    });
    for (const { row, target, label, before: rebuilt } of jobs) {
      const k = row.attempt;
      const before = rebuilt ?? live.filter((other) => other.attempt < k);
      const ownAnswers = new Map<string, string>();
      for (const frame of attempts[k - 1] ?? []) {
        const answer = loggedAnswer(frame.decision);
        if (answer !== null) {
          ownAnswers.set(slBoardKey(frame.state), answer);
          ownAnswers.set(slBoardKey(frame.state, { counters: true }), answer);
        }
      }
      const known = knownOrderOf(before.map((other) => ({ attempt: other.attempt, draws: reDrawn[other.attempt - 1] ?? null }))).known;
      const results = new Map<RuleName, Outcome>();
      for (const rule of RULES) {
        const outcome = walk(attempts[target.reference - 1]!, before, k, maxAttempts, target, rule, ownAnswers, known);
        results.set(rule, outcome);
        if (outcome.reached) totals.reached[rule] += 1;
        totals.reordered[rule] += outcome.reordered;
        if (outcome.deviation?.["replacement"]) totals.deviated[rule] += 1;
      }
      totals.attempts += 1;
      writeFileSync(out, `${JSON.stringify({ fight: key, attempt: k, label, target: { reference: target.reference, turn: target.turn, point: target.point, board: target.board }, live: { result: row.result, turns: row.turns, reached: row.explore?.deviation?.reached === true, stopped: row.explore?.replay?.stopped ?? null }, rules: Object.fromEntries(results) })}\n`, { flag: "a" });
      const say = (outcome: Outcome) =>
        `${outcome.reached ? `reached (${outcome.passed} boards${outcome.logged > 0 ? `, ${outcome.logged} by logged plays` : ""}${outcome.reordered > 0 ? `, ${outcome.reordered} by the plays in another order` : ""}); deviates: ${String(outcome.deviation?.["replacement"] ?? "none")} (${String(outcome.deviation?.["reason"] ?? "").slice(0, 90)})` : `stops T${String(outcome.stop?.["turn"] ?? "?")} after ${outcome.passed}: ${String(outcome.stop?.["reason"] ?? "the path ended")}`}`;
      process.stdout.write(`${key} attempt ${k} ${label} -> T${target.turn ?? "?"} (${target.point.slice(0, 60)})\n`);
      for (const [name, outcome] of results) process.stdout.write(`    ${name.padEnd(6)} ${say(outcome)}\n`);
    }
    for (const { row, target } of offPath) {
      // SL_RETRY_EXPLORE_TARGET_TURN: the attempt's own first question of the point's turn, the point's deviation there.
      const k = row.attempt;
      const before = live.filter((other) => other.attempt < k);
      const own = attempts[k - 1] ?? [];
      const known = knownOrderOf(before.map((other) => ({ attempt: other.attempt, draws: reDrawn[other.attempt - 1] ?? null }))).known;
      const tracker = new DrawTracker(TRACKER);
      const sl = { attempt: k, maxAttempts, previousAttempts: previousAttemptsJson(before, k, maxAttempts, { knownDraws: true }), showSim: true, compute: { ...RETRY_COMPUTE } };
      const turns = row.explore?.turns ?? [];
      const summaries = row.summary?.turns ?? [];
      let result: Row | null = null;
      let lastLabel: { turn: number | null; label: string } | null = null;
      for (const frame of own) {
        tracker.observe(frame.state);
        const previous = lastLabel;
        if (frame.decision) lastLabel = { turn: frame.state.turn, label: String(frame.decision["label"] ?? "") };
        if (frame.state.turn !== target.turn || !frame.decision || !String(frame.decision["label"] ?? "").startsWith("combat/plan-choice")) continue;
        const record = turns.find((entry) => entry.turn === frame.state.turn);
        const board = keyIn(frame.state, (key) => record?.boards.some((entry) => entry.board === key) === true);
        const at = record?.boards.filter((entry) => entry.board === board).at(-1)?.at ?? 0;
        const summary = summaries.find((entry) => entry.turn === frame.state.turn);
        const played = { canon: record ? record.plays.slice(0, at) : [], text: summary ? summary.plays.slice(0, at) : [] };
        const lineEnded = previous !== null && previous.turn === frame.state.turn && previous.label === "combat/plan-continue";
        const deviate = { point: target.point, excluded: [...target.excluded], attempts: [...target.attempts], ...(target.tried ? { tried: structuredClone(target.tried) } : {}) };
        const planned = planBoard(frame, sl, knownOf(known, tracker), played, lineEnded, (options) => byTextIn(options, loggedAnswer(frame.decision)) ?? bestOf(options), { deviate });
        const turnPlayed = record ? turnCanon(record.plays) : null;
        result = { turn: frame.state.turn, board, answer: planned.answer, ...(planned.info?.deviation ?? { reason: planned.decision ? `no deviation (${planned.decision.label})` : "no decision planned" }), liveTurn: turnPlayed, liveRepeated: turnPlayed !== null && target.tried ? triedHas(target.tried, { text: "", canon: turnPlayed }) : null };
        break;
      }
      totals.cases += 1;
      if (result?.["replacement"]) totals.replaced += 1;
      writeFileSync(out, `${JSON.stringify({ fight: key, attempt: k, target: { turn: target.turn, point: target.point }, stopped: row.explore?.replay?.stopped ?? null, result })}\n`, { flag: "a" });
      process.stdout.write(`${key} attempt ${k} off the path (${row.explore?.replay?.stopped ?? "?"}) -> T${target.turn ?? "?"}: ${result ? `${String(result["replacement"] ?? "none")} instead of ${String(result["original"] ?? result["answer"])} (${String(result["reason"]).slice(0, 100)}); live played ${String(result["liveTurn"])}, a failed turn ${String(result["liveRepeated"])}` : "no question on the point's turn"}\n`);
    }
  }
  if (MODE === "target-turn") process.stdout.write(`\noff-path attempts ${totals.cases}; a replacement on the point's turn in ${totals.replaced}\n`);
  else process.stdout.write(`\nwalks ${totals.attempts}; points reached: ${RULES.map((rule) => `${rule} ${totals.reached[rule]} (${totals.reordered[rule]} boards by the plays in another order; a replacement at the point in ${totals.deviated[rule]})`).join(", ")}\n`);
}

main();
