/**
 * Offline evaluation of SL_RETRY_EXPLORE (docs/sl.md §11, notes/sl-explore.md): on the logged SL retries, which decision
 * point each attempt from the 3rd would change, the line it would play there instead, the numbers of both, and whether
 * the turn it plays there is one a failed attempt already had there, under two rules side by side:
 * - "08ec8f9": the sub-switches live then (SL_RETRY_EXPLORE_B2, _BOSS_POTIONS, _ORDER, _REPLAY, SL_RETRY_KNOWN_PICKS);
 * - "new": with SL_RETRY_EXPLORE_CANON (a line tried by its turn's plays, attempt 1 recorded and counted) and
 *   SL_RETRY_EXPLORE_TURN (the deviation holds for the rest of its turn);
 * - "whole": "new" with SL_RETRY_EXPLORE_WHOLE (a drawing line judged by its sure plays, the avoid over every surviving
 *   line, a deviation whose turn ended as a failed one not a use of its point; offline the simulated attempt's turn is
 *   the line as planned there, so its `differs` is the planned turn's).
 * Where the live attempts recorded their explore (from R1QJUBVBSSB2 F33 on), what they did: the point, whether it was
 * reached, where the attempt left attempt 2's path, the turn it played there (the realized plays, from its frames) and
 * whether a failed attempt's turn there had the same plays; and the decisions later in that turn (a re-plan after a draw)
 * planned again on their logged boards under "new" (SL_RETRY_EXPLORE_TURN's avoid) and "whole", Jev answering as logged;
 * and the deviation point's own board resolved again under "whole" (Jev's logged answer). No model is
 * called, nothing is written outside --out; logs are read only.
 *
 * Per fight: the logged frames (states.jsonl rows of that run and floor, in combat) and decisions, split into attempts where
 * the turn goes back. Every attempt's turns as the controller records them with SL_RETRY_EXPLORE_CANON (each dispatched
 * decision's board, and its play: controller actionPlay on its frame). Attempt 2 is the path: its frames go through the
 * draw tracker (SL_RETRY_KNOWN_INSERTS, _TOP and _PICKS on), attempt 1's draws are the known order, and every planning
 * decision of attempt 2 is planned again, once, by the current code on its logged board as an SL retry (the known draws,
 * RETRY_COMPUTE, the frozen clock: the rollout's whole 24-sample schedule) with env.sl.explore on (the plays already made
 * that turn in it: the points' canon). B2 (--b2 on): only on a boss it is trusted on, in this thread (serial), --b2-samples
 * samples a line (live: 1200 on 20 workers), its clock frozen; off on every other fight.
 * Each rule then records the path's points as the planner does (explorePoint: the line attempt 2 played there, the logged
 * one; the shown lines that could replace it; the rollout's deaths; B2's numbers), and for attempt k = 3 .. the fight's last
 * takes the live controller's choice (exploreTarget over its rows so far, as that rule has them: "new" with attempt 1's
 * record and the turns) and, on that board, the planner's replacement: the planned question resolved again with
 * env.sl.explore.deviate (and "new": the turns tried there), Jev answering as it did in attempt 2. Each attempt is taken to
 * reach its point (it plays attempt 2's path up to it) and to fail; its turn there is the plays before the point and the
 * line played there as planned (a line that draws before its end is re-planned after the draw: "new" keeps that re-plan
 * off the failed turns, which offline is seen only on the live attempts' logged boards).
 *
 * Usage: npx tsx tools/sl-explore-replay.ts [--states logs/states.jsonl] [--decisions logs/decisions.jsonl]
 *          [--attempts logs/sl-attempts.jsonl] [--fights RUN:FLOOR,...] [--out experiments/sl-explore] [--tag name]
 *          [--b2 on|off] [--b2-samples 1200]
 * Output: <out>/explore[-<tag>].jsonl (one row per fight, rule and attempt; "live" rows per live attempt), and a line per
 * attempt and rule on stdout.
 */
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge, type Knowledge } from "../src/knowledge/index.js";
import type { ActionRequest } from "../src/hand/mod/client.js";
import { parseGameState, type GameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv, type SlEnv } from "../src/memory/types.js";
import { planCombatTurn, slPointOf, stepPlay, thiefTrace, turnKeys } from "../src/reflex/combat-plan.js";
import { BOSS_LINES_TIE_SE, bossLinesOptions, lowTrustOfState, simWinsLess } from "../src/sim/boss-lines.js";
import { createSlLog, previousAttemptsJson, type SlAttemptRow } from "../src/sl/attempts.js";
import { actionPlay, RETRY_COMPUTE } from "../src/sl/controller.js";
import { checkKnown, DrawTracker, knownOrderOf, type KnownOrder } from "../src/sl/draws.js";
import { explorePoint, exploreTarget, exploreTried, lineText, playKey, pointLost, replayPath, slBoardKey, turnCanon, type ExploreB2, type ExploreLine, type ExplorePick, type ExploreRow, type SlExploreEnv, type SlPoint, type SlTarget, type SlTurnPlays } from "../src/sl/explore.js";
import { modelHandCard, offHandCardModel } from "../src/reflex/card-model.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { drawsCards, type Plan, type Step } from "../src/reflex/turn-solver.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const STATES = arg("states", fromRoot("logs/states.jsonl"));
const DECISIONS = arg("decisions", fromRoot("logs/decisions.jsonl"));
const ATTEMPTS = arg("attempts", fromRoot("logs/sl-attempts.jsonl"));
const outDir = arg("out", fromRoot("experiments/sl-explore"));
const tag = arg("tag", "");
/** B2 on a boss it is trusted on (the gate there, and the ranking of both rules), in this thread. */
const B2 = arg("b2", "off") === "on";
const B2_SAMPLES = Number(arg("b2-samples", String(RETRY_COMPUTE.bossSimSamples)));
type RuleName = "08ec8f9" | "new" | "whole";
type RuleFlags = Pick<SlExploreEnv, "b2Gate" | "bossPotions" | "whole">;
/** The rules: as live at 08ec8f9, with SL_RETRY_EXPLORE_CANON and _TURN on (e0fa69b), and with SL_RETRY_EXPLORE_WHOLE too. */
const RULES: { name: RuleName; flags: RuleFlags; aliveFirst: boolean; replay: boolean; canon: boolean; turn: boolean; whole: boolean }[] = [
  { name: "08ec8f9", flags: { b2Gate: true, bossPotions: true }, aliveFirst: true, replay: true, canon: false, turn: false, whole: false },
  { name: "new", flags: { b2Gate: true, bossPotions: true }, aliveFirst: true, replay: true, canon: true, turn: true, whole: false },
  { name: "whole", flags: { b2Gate: true, bossPotions: true, whole: true }, aliveFirst: true, replay: true, canon: true, turn: true, whole: true },
];
/** The fights of the A9 runs 10-12 postmortem (UK7R F33, 9V7K F45, JSA5 F33 and F48) and the earlier ones (R1QJ F33, 63WB F33). */
const FIGHTS = (arg("fights", "") || "UK7R9A0NMCXL:33,9V7K1P899R5N:45,JSA5K8YZ9RXV:33,JSA5K8YZ9RXV:48,R1QJUBVBSSB2:33,63WBEEF2JVM5:33")
  .split(",")
  .map((entry) => ({ run: entry.split(":")[0]!, floor: Number(entry.split(":")[1]) }));
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
type Row = Record<string, unknown>;

/** The planner's last trace, read through a function (a read right after the reset would narrow to null). */
function traced(): typeof thiefTrace.last {
  return thiefTrace.last;
}

const knowledge: Knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

/** The rows of a JSONL file mentioning one of the runs (a plain substring filter first: the states file is gigabytes). */
async function rowsOf(path: string, runs: string[]): Promise<Row[]> {
  const out: Row[] = [];
  const lines = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!runs.some((run) => line.includes(run))) continue;
    try {
      out.push(JSON.parse(line) as Row);
    } catch {
      // a torn line
    }
  }
  return out;
}

function envOf(state: GameState, sl: SlEnv): DecisionEnv {
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    sl, thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
}

const normal = (plays: unknown): string => String(plays ?? "").replace(/, then /g, ", ").replace(/^nothing \(end the turn now\)$/, "end turn");
const criteriaOf = (row: Row): Record<string, Row> =>
  Object.fromEntries(Object.entries(((asRow(asRow(row["questions"])["plan"]))["criteria"] ?? {}) as Record<string, string | null>).map(([key, text]) => [key, text ? (JSON.parse(text) as Row) : {}]));
function asRow(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}
const dispatched = (row: Row) => /^(?:completed|pending)/.test(String(row["result"] ?? ""));

/** A logged question's chosen key and the key of the line it played (the HP guard's or the dominance swap's "playing plan N"). */
function loggedPick(row: Row): { chosen: string | null; played: string | null } {
  const answer = asRow(asRow(row["answers"])["plan"]);
  const chosen = typeof answer["choice"] === "string" ? answer["choice"] : null;
  const swap = [...String(row["rationale"] ?? "").matchAll(/playing (?:it|plan (\d+))/g)].at(-1);
  const played = swap?.[1] ? `plan${swap[1]}` : chosen;
  return { chosen, played };
}

/** A logged line's rollout numbers as the question showed them ("dead 19/24, further loss 15.8, win ~21%"). */
function loggedNumbers(option: Row | undefined): string | null {
  const text = String(option?.["rollout"] ?? "");
  if (!text) return null;
  const loss = /expected further HP loss ([\d.]+)/.exec(text)?.[1];
  const dead = /dead within \d+ turns? in (\d+\/\d+)/.exec(text)?.[1] ?? (/\((\d+) samples?\)/.exec(text) ? `0/${/\((\d+) samples?\)/.exec(text)![1]}` : "?");
  const win = /win chance ~(\d+)%/.exec(text)?.[1];
  return `rollout dead ${dead}, further loss ${loss ?? "?"}${win ? `, win ~${win}%` : ""}`;
}

/**
 * An attempt's turns as the controller records them (SL_RETRY_EXPLORE_CANON): each dispatched decision's board (its frame)
 * and play (actionPlay), and by decision the plays already made that turn (canon and the summary's text).
 */
function turnRecords(frames: Row[], decisions: Row[]): { turns: SlTurnPlays[]; before: Map<string, { canon: string[]; text: string[] }> } {
  const byTs = new Map(decisions.map((row) => [String(row["ts"]), row]));
  const turns: SlTurnPlays[] = [];
  const text = new Map<number, string[]>();
  const before = new Map<string, { canon: string[]; text: string[] }>();
  const seen = new Set<string>();
  for (const frame of frames) {
    const ts = String(frame["ts"]);
    const decision = byTs.get(ts);
    if (!decision || seen.has(ts)) continue;
    seen.add(ts);
    const state = parseGameState(asRow(frame["state"]));
    if (state.turn === null) continue;
    let record = turns.at(-1);
    if (!record || record.turn !== state.turn) turns.push((record = { turn: state.turn, plays: [], boards: [] }));
    const texts = text.get(state.turn) ?? [];
    text.set(state.turn, texts);
    before.set(ts, { canon: [...record.plays], text: [...texts] });
    if (!dispatched(decision)) continue;
    let intent: ActionRequest;
    try {
      intent = (typeof decision["chosen"] === "string" ? JSON.parse(decision["chosen"]) : decision["chosen"]) as ActionRequest;
    } catch {
      continue;
    }
    if (!intent || typeof intent !== "object") continue;
    const play = actionPlay(state, intent);
    if (!play && intent.action !== "end_turn") continue;
    const board = slBoardKey(state);
    if (record.boards.at(-1)?.board !== board) record.boards.push({ board, at: record.plays.length });
    if (play) {
      record.plays.push(play.canon);
      texts.push(play.text);
    }
  }
  return { turns, before };
}

/** A path board planned once (both rules share the plan: the same known draws), with the plays already made that turn. */
interface Planned {
  decision: Decision | null;
  /** Its env.sl.explore: a rule's sub-switches, deviation, replay or avoid are set on it before a resolution. */
  explore: SlExploreEnv;
  trace: NonNullable<typeof thiefTrace.last> | null;
  codeLine: string | null;
  known: string;
  state: GameState;
}

interface PathPoint {
  board: string;
  turn: number | null;
  plan: Planned;
  logged: Row;
  loggedByText: Map<string, { key: string; option: Row }>;
  chosenKey: string | null;
  loggedPlayedKey: string | null;
  chosenText: string | null;
  playedText: string | null;
  loggedLabel: string;
}

/** Plan a logged board as an SL retry (attempt `attempt`), with the known draws and the plays already made that turn. */
function planBoard(state: GameState, opts: { attempt: number; maxAttempts: number; previous: SlAttemptRow[]; knownDraws: SlEnv["knownDraws"] | undefined; played: { canon: string[]; text: string[] } }): Planned {
  const explore: SlExploreEnv = { played: opts.played };
  const sl: SlEnv = {
    attempt: opts.attempt,
    maxAttempts: opts.maxAttempts,
    previousAttempts: previousAttemptsJson(opts.previous, opts.attempt, opts.maxAttempts, { knownDraws: true }),
    showSim: true,
    ...(opts.knownDraws ? { knownDraws: opts.knownDraws } : {}),
    compute: { ...RETRY_COMPUTE, bossSimSamples: B2_SAMPLES },
    explore,
  };
  thiefTrace.last = null;
  const decision = planCombatTurn(envOf(state, sl));
  const trace = traced();
  const codeLine = decision && decision.kind !== "ask" ? (slPointOf(decision, { intent: null, rationale: "", confidence: null, fallback: false })?.line ?? null) : null;
  const known = opts.knownDraws ? `${opts.knownDraws.cards.length}${opts.knownDraws.exact !== undefined ? ` (${opts.knownDraws.exact} exact)` : ""}${opts.knownDraws.added ? ` +${opts.knownDraws.added.cards.length} at random` : ""}` : "none";
  return { decision, explore, trace: decision?.kind === "ask" ? trace : null, codeLine, known, state };
}

/** The known draws of a tracker against an order, as env.sl.knownDraws. */
function knownOf(order: KnownOrder | null, tracker: DrawTracker): SlEnv["knownDraws"] | undefined {
  const check = order ? checkKnown(order, tracker) : null;
  return check?.ok && check.keys.length > 0 ? { cards: check.keys, names: check.names, attempts: [...order!.attempts], ...(check.inserted && check.inserted.keys.length > 0 ? { added: { cards: check.inserted.keys, names: check.inserted.names } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) } : undefined;
}

/** The planner's lines for the explore code (combat-plan explored: the shown lines, then the random potions' with `drinks`), each with its turn. */
function linesOf(trace: NonNullable<typeof thiefTrace.last>, drinks: boolean, played: SlExploreEnv["played"]): ExploreLine<Plan>[] {
  const potionsOf = (plan: Plan) => plan.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.cardId.split(":")[1] ?? "");
  return [
    ...trace.shown.map((plan) => ({ plan, text: lineText(plan.steps), dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: potionsOf(plan), ...turnKeys(played, plan.steps) })),
    ...(drinks
      ? (trace.mcShown ?? []).flatMap((mc) => (mc.median ? [{ plan: mc.median, text: `drink ${mc.source.name}, then re-plan`, dies: mc.median.outcome.dies, wins: mc.median.outcome.winsFight, potions: [...new Set([mc.source.potionId, ...potionsOf(mc.median)])], ...turnKeys(played, [], { canon: playKey({ potion: mc.source.potionId }, null), text: `potion ${mc.source.name}` }) }] : []))
      : []),
  ];
}
function deathShareOf(trace: NonNullable<typeof thiefTrace.last>): (plan: Plan) => number | null {
  return (plan) => {
    const line = trace.rollout?.available ? trace.rollout.byPlan.get(plan) : undefined;
    return line && line.samples > 0 ? line.deaths / line.samples : null;
  };
}
function b2Of(trace: NonNullable<typeof thiefTrace.last>): ExploreB2<Plan> | null {
  const sim = trace.simRanks;
  if (!sim || !sim.available) return null;
  return {
    notWorse: (plan, than) => (sim.byPlan.get(plan) && sim.byPlan.get(than) ? !simWinsLess(sim, plan, than) : null),
    win: (plan) => sim.byPlan.get(plan)?.calibrated ?? null,
    rule: `${BOSS_LINES_TIE_SE} paired standard errors`,
    won: (plan) => sim.byPlan.get(plan)?.result.winProb ?? null,
  };
}

/** A point's record under a rule, as the planner's explorePoint makes it (the logged line as the one played). */
function pointUnder(entry: PathPoint, rule: (typeof RULES)[number]): { point: SlPoint; mapped: boolean | null } {
  const planned = entry.plan;
  const played = rule.canon || rule.turn ? planned.explore.played : undefined;
  const isQuestion = planned.decision?.kind === "ask" && entry.playedText !== null;
  if (!isQuestion) {
    const codeCanon = played && planned.decision ? slPointOf(planned.decision, { intent: null, rationale: "", confidence: null, fallback: false })?.canon : undefined;
    return { point: { board: entry.board, turn: entry.turn, kind: "code", label: planned.decision?.label ?? "none", line: planned.codeLine ?? entry.playedText ?? "?", ...(codeCanon ? { canon: codeCanon } : {}) }, mapped: null };
  }
  const trace = planned.trace!;
  const drinks = rule.flags.bossPotions === true && trace.kind === "boss";
  const lines = linesOf(trace, drinks, played);
  const own = lines.find((line) => line.text === entry.playedText);
  const mc = /^p(\d+)$/.exec(entry.chosenKey ?? "") && entry.chosenKey === entry.loggedPlayedKey ? (trace.mcShown ?? []).find((m) => `p${m.source.slot}` === entry.chosenKey) : undefined;
  const pick: ExplorePick<Plan> = own
    ? { plan: own.plan, text: own.text, potions: own.potions, wins: own.wins, ...(own.canon !== undefined ? { canon: own.canon, loose: own.loose! } : {}) }
    : mc
      ? { plan: null, text: `drink ${mc.source.name}, then re-plan`, potions: [mc.source.potionId], wins: false, rated: mc.median, ...turnKeys(played, [], { canon: playKey({ potion: mc.source.potionId }, null), text: `potion ${mc.source.name}` }) }
      : { plan: null, text: entry.playedText!, potions: [], wins: false };
  const record = explorePoint(pick, lines, { drinks, deathShare: deathShareOf(trace), b2: rule.flags.b2Gate === true ? b2Of(trace) : null });
  return { point: { board: entry.board, turn: entry.turn, kind: "question", label: planned.decision!.label, ...record }, mapped: own !== undefined || mc !== undefined };
}

/** A line's turn on its board (its steps after the plays already made), and whether it draws before its last step. */
function lineTurn(planned: Planned, text: string | null): { canon: string | null; plays: string[] | null; drawsMidLine: boolean } {
  const played = planned.explore.played ?? { canon: [], text: [] };
  if (text === null) return { canon: null, plays: null, drawsMidLine: false };
  const trace = planned.trace;
  const line = trace ? linesOf(trace, true, played).find((entry) => entry.text === text) : undefined;
  if (!line) {
    // Code's own line (no question): its recorded canon.
    const point = planned.decision ? slPointOf(planned.decision, { intent: null, rationale: "", confidence: null, fallback: false }) : undefined;
    return { canon: point?.canon?.[point.line] ?? null, plays: null, drawsMidLine: false };
  }
  const mc = text.startsWith("drink ");
  const steps: Step[] = mc ? [] : line.plan.steps;
  const hand = (asRow(planned.state.raw["combat"])["hand"] as unknown[] | undefined) ?? [];
  const drawsMidLine = steps.slice(0, -1).some((step, i) => {
    if (step.cardId.startsWith("POTION:")) return false;
    const entry = hand.find((card) => Number(asRow(card)["index"]) === step.cardIndex && String(asRow(card)["card_id"]) === step.cardId);
    const model = entry ? modelHandCard(entry, i, knowledge) : offHandCardModel(null, step.cardId, step.upgraded, i, knowledge);
    return drawsCards(model);
  });
  const plays = mc ? [...played.canon, playKey({ potion: line.potions[0] ?? "?" }, null)] : [...played.canon, ...steps.map(stepPlay)];
  return { canon: line.canon ?? turnCanon(plays), plays, drawsMidLine: drawsMidLine || mc };
}

/** The turn (turnCanon) attempt `a` had through `board`, from its record. */
function turnOfAttempt(rows: readonly ExploreRow[], a: number, board: string): string | null {
  const row = rows.find((entry) => entry.attempt === a);
  const turn = row?.explore?.turns?.find((entry) => entry.boards.some((b) => b.board === board));
  return turn ? turnCanon(turn.plays) : null;
}

/** The attempts whose turn through `board` had exactly `canon` (their records). */
function attemptsWith(rows: readonly ExploreRow[], board: string, canon: string | null): number[] {
  if (canon === null) return [];
  return rows.filter((row) => turnOfAttempt(rows, row.attempt, board) === canon).map((row) => row.attempt);
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  bossLinesOptions.serial = true;
  bossLinesOptions.now = () => 0;
  thiefTrace.enabled = true;
  const out = join(outDir, `explore${tag ? `-${tag}` : ""}.jsonl`);
  writeFileSync(out, "");
  const runs = [...new Set(FIGHTS.map((fight) => fight.run))];
  const states = await rowsOf(STATES, runs);
  const decisions = await rowsOf(DECISIONS, runs);
  const slLog = createSlLog(ATTEMPTS);

  for (const fight of FIGHTS) {
    const inFight = (state: Row) => asRow(state)["run_id"] === fight.run && asRow(asRow(state)["run"])["floor"] === fight.floor;
    const frames = states.filter((row) => inFight(asRow(row["state"])) && ["COMBAT", "CARD_SELECTION"].includes(String(asRow(row["state"])["screen"])) && asRow(row["state"])["turn"] !== null);
    const rows = decisions.filter((row) => row["run_id"] === fight.run && row["floor"] === fight.floor && row["screen"] === "COMBAT" && row["turn"] !== null);
    const split = <T extends Row>(list: T[], turnOf: (row: T) => number): T[][] => {
      const parts: T[][] = [];
      let prev: number | null = null;
      for (const row of list) {
        const turn = turnOf(row);
        if (prev === null || turn < prev) parts.push([]);
        parts[parts.length - 1]!.push(row);
        prev = turn;
      }
      return parts;
    };
    const frameAttempts = split(frames, (row) => Number(asRow(row["state"])["turn"]));
    const decisionAttempts = split(rows, (row) => Number(row["turn"]));
    const slRows = slLog.readRun(fight.run).filter((row) => row.floor === fight.floor);
    const maxAttempts = slRows[0]?.max_attempts ?? 6;
    if (frameAttempts.length < 2 || decisionAttempts.length < 2 || slRows.length < 2) {
      console.log(`${fight.run} F${fight.floor}: fewer than two logged attempts (${frameAttempts.length} frames / ${decisionAttempts.length} decisions / ${slRows.length} rows), skipped`);
      writeFileSync(out, `${JSON.stringify({ run: fight.run, floor: fight.floor, skipped: `fewer than two logged attempts (${slRows.length} row(s))` })}\n`, { flag: "a" });
      continue;
    }
    // Every attempt's turns as the controller records them with SL_RETRY_EXPLORE_CANON (from its frames).
    const records = frameAttempts.map((attemptFrames, i) => turnRecords(attemptFrames, decisionAttempts[i] ?? []));
    /** Attempt a's row as a rule has it: "new" with its turn record (attempt 1 too); "08ec8f9" as logged then (no turns, no attempt 1). */
    const exactRow = (a: number, explore: Partial<NonNullable<ExploreRow["explore"]>> = {}): ExploreRow => {
      const logged = slRows.find((row) => row.attempt === a);
      return { attempt: a, turns: logged?.turns ?? 0, result: logged?.result ?? "predicted_death", summary: logged?.summary ?? { turns: [] }, explore: { points: [], target: null, turns: records[a - 1]?.turns ?? [], ...explore } };
    };

    // B2 only on a boss it is trusted on.
    const first = parseGameState(asRow(frameAttempts[1]![0]!["state"]));
    const lowTrust = lowTrustOfState(first);
    bossLinesOptions.enabled = B2 && lowTrust === null;
    // Attempt 1's draws: the known order of attempt 2 (SL_RETRY_KNOWN_PICKS on: the selections' picks kept).
    const one = new DrawTracker({ inserts: true, tops: true, picks: true });
    for (const row of frameAttempts[0]!) one.observe(parseGameState(asRow(row["state"])));
    const known = knownOrderOf([{ attempt: 1, draws: one.record }]).known;
    const two = new DrawTracker({ inserts: true, tops: true, picks: true });
    const byTs = new Map(decisionAttempts[1]!.map((row) => [String(row["ts"]), row]));
    const previous = slRows.filter((row) => row.attempt < 3);
    const path: PathPoint[] = [];
    const t0 = Date.now();
    for (const frame of frameAttempts[1]!) {
      const state = parseGameState(asRow(frame["state"]));
      two.observe(state);
      const logged = byTs.get(String(frame["ts"]));
      if (!logged || !PLANNING.test(String(logged["label"]))) continue;
      const played = records[1]!.before.get(String(frame["ts"])) ?? { canon: [], text: [] };
      const plan = planBoard(state, { attempt: 3, maxAttempts, previous, knownDraws: knownOf(known, two), played });
      const loggedLabel = String(logged["label"]);
      const isQuestion = loggedLabel.startsWith("combat/plan-choice");
      const criteria = isQuestion ? criteriaOf(logged) : {};
      const loggedByText = new Map(Object.entries(criteria).filter(([key]) => /^plan\d+$/.test(key)).map(([key, option]) => [normal(option["plays"]), { key, option }]));
      const pick = isQuestion ? loggedPick(logged) : { chosen: null, played: null };
      const playedText = pick.played && criteria[pick.played] ? normal(criteria[pick.played]!["plays"]) : null;
      const chosenText = pick.chosen && criteria[pick.chosen] ? normal(criteria[pick.chosen]!["plays"]) : null;
      path.push({ board: slBoardKey(state), turn: state.turn, plan, logged, loggedByText, chosenKey: pick.chosen, loggedPlayedKey: pick.played, chosenText, playedText, loggedLabel });
    }
    const deathTurn = Number(decisionAttempts[1]!.at(-1)?.["turn"] ?? 0);
    const b2Ranked = path.some((entry) => entry.plan.trace?.simRanks);
    console.log(`${fight.run} F${fight.floor}${lowTrust ? ` (low-trust boss: ${lowTrust.split(":")[0]})` : ""}: attempt 2's path, ${path.length} decision points planned in ${Math.round((Date.now() - t0) / 1000)} s (B2 ${b2Ranked ? `ranked it, ${B2_SAMPLES} samples a line` : "off"}); the known draws along it: ${path.map((entry) => entry.plan.known).join(" ")}`);

    const results = new Map<string, Row[]>();
    for (const rule of RULES) {
      const pointRecords = path.map((entry) => pointUnder(entry, rule));
      const points = pointRecords.map((record) => record.point);
      const notWorse = (point: SlPoint): string => {
        if (point.b2) {
          const own = point.b2.win[point.line];
          const best = Math.max(...(point.alternatives ?? []).map((text) => point.b2!.win[text] ?? -Infinity));
          return `${point.b2.notWorse.length} B2 (B2 ${own !== undefined ? Math.round(own * 100) : "?"}%, best other ${Number.isFinite(best) ? Math.round(best * 100) : "?"}%)`;
        }
        const own = point.dead?.[point.line];
        return own === undefined ? "?" : `${(point.alternatives ?? []).filter((text) => (point.dead?.[text] ?? Infinity) <= own + 1e-9).length} rollout`;
      };
      const deadOf = (point: SlPoint) => (point.dead ? `dead ${Math.round(Math.min(...[point.line, ...(point.alternatives ?? [])].map((text) => point.dead![text] ?? 1)) * 100)}%+` : "");
      const summary = path.map((entry, i) => `T${entry.turn} ${points[i]!.kind === "question" ? `Q(${points[i]!.alternatives?.length ?? 0} alt, ${notWorse(points[i]!)} not worse, ${deadOf(points[i]!)}${rule.aliveFirst && pointLost(points[i]!) ? ", lost" : ""}${pointRecords[i]!.mapped === false ? ", logged line not shown now" : ""})` : points[i]!.label.replace("combat/", "")}${entry.plan.decision?.kind !== "ask" && entry.loggedLabel.startsWith("combat/plan-choice") ? " [logged: question]" : ""}`).join(" · ");
      console.log(`  path (${rule.name}): ${summary}`);
      // The rows as this rule's controller has them, and the exact ones (every attempt's turn record) the turn check reads.
      const rowsSoFar: ExploreRow[] = rule.canon ? [exactRow(1), exactRow(2, { points })] : [{ attempt: 2, turns: deathTurn, result: "predicted_death", explore: { points, target: null } }];
      const truth: ExploreRow[] = [exactRow(1), exactRow(2, { points })];
      const list: Row[] = [];
      for (let attempt = 3; attempt <= maxAttempts; attempt += 1) {
        const { target, why } = exploreTarget(rowsSoFar, attempt, { aliveFirst: rule.aliveFirst, ...(rule.canon ? { canon: true } : {}), ...(rule.turn ? { tried: true } : {}), ...(rule.whole ? { whole: true } : {}) });
        if (!target) {
          const result = { run: fight.run, floor: fight.floor, rule: rule.name, attempt, target: null, why };
          writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
          list.push(result);
          rowsSoFar.push({ attempt, turns: deathTurn, result: "predicted_death", explore: { points, target: null } });
          continue;
        }
        const index = path.findIndex((entry) => entry.board === target.board);
        const at = path[index]!;
        const planned = at.plan;
        const atPoint = points[index]!;
        const replayLines = replayPath(rowsSoFar, target);
        const before = path.slice(0, index).map((entry, i) => ({ entry, point: points[i]!, mapped: pointRecords[i]!.mapped }));
        const replayBreak = before.find(({ point, mapped }) => point.kind === "question" && mapped === false);
        const replay = rule.replay ? { boards: replayLines.size, questions: before.filter(({ point }) => point.kind === "question").length, breaks: replayBreak ? `T${replayBreak.entry.turn}: attempt 2's line is not among the options now` : null } : null;
        let explored: Row | null = null;
        let jevPick: string | null = null;
        let assumed = false;
        if (planned.decision?.kind === "ask") {
          const ask = planned.decision as AskDecision;
          const options = Object.fromEntries(Object.entries(((ask.questions["plan"] as { criteria: Record<string, string | null> }).criteria)).map(([key, text]) => [key, text ? (JSON.parse(text) as Row) : {}]));
          jevPick = Object.keys(options).find((key) => at.chosenText !== null && normal(options[key]!["plays"]) === at.chosenText) ?? null;
          if (jevPick === null) {
            assumed = true;
            jevPick = Object.keys(options).find((key) => options[key]!["rollout_best"] === true) ?? Object.keys(options)[0] ?? null;
          }
          if (jevPick !== null) {
            const played = planned.explore.played;
            Object.assign(planned.explore, rule.flags, { deviate: { point: target.point, excluded: target.excluded, attempts: target.attempts, ...(rule.replay ? { replayed: replayBreak ? before.indexOf(replayBreak) : before.length } : {}), ...((rule.canon || rule.turn) && target.tried ? { tried: target.tried } : {}) } });
            const resolved = ask.resolve({ plan: { type: "choice", choice: jevPick, probabilities: { [jevPick]: 0.95 }, confidence: 0.95, raw: {} } } as unknown as AnswerSet);
            explored = asRow(asRow(resolved.log)["sl_explore"]);
            for (const key of Object.keys(planned.explore)) delete (planned.explore as Record<string, unknown>)[key];
            planned.explore.played = played!;
          }
        }
        const replacement = explored && typeof explored["replacement"] === "string" ? explored["replacement"] : null;
        const original = explored && typeof explored["original"] === "string" ? explored["original"] : null;
        // The turn it plays there (the line played: the replacement, else the original) and the failed attempts' turns there.
        const playedLine = replacement ?? original ?? at.playedText;
        const turn = lineTurn(planned, playedLine);
        const check = exploreTried(truth, attempt, target.board, { canon: true });
        const same = attemptsWith(truth.filter((row) => row.attempt < attempt), target.board, turn.canon);
        const differs = turn.canon === null ? null : !check.tried.canon.includes(turn.canon);
        const sim = asRow(at.logged["boss_sim"]);
        const b2Live = (text: string | null) => {
          const key = text ? at.loggedByText.get(text)?.key : undefined;
          const line = key ? asRow(asRow(sim["lines"])[key]) : null;
          return line && typeof line["cal"] === "number" ? `B2 live ${Math.round((line["cal"] as number) * 1000) / 10}%${sim["low_trust"] === true ? " (low trust)" : ""}` : null;
        };
        const result = {
          run: fight.run,
          floor: fight.floor,
          rule: rule.name,
          attempt,
          target: { turn: target.turn, back: target.back, round: target.round, point: target.point, excluded: target.excluded, attempts: target.attempts, tried: target.tried ?? null, label: atPoint.label, logged_label: at.loggedLabel, dead: atPoint.dead ?? null, b2: atPoint.b2 ?? null, lost: pointLost(atPoint) },
          why,
          replay,
          jev_pick: { key: jevPick, assumed },
          original,
          replacement,
          reason: explored?.["reason"] ?? (planned.decision?.kind === "act" ? `the board is code's own now (${planned.decision.label})` : "no question"),
          gate: explored?.["gate"] ?? null,
          numbers: explored?.["numbers"] ?? null,
          b2: explored?.["b2"] ?? null,
          // The turn played there as planned (the plays before the point and the line's), against every failed attempt's
          // turn through the board (exact records, attempt 1's included): `same` lists those with these plays.
          turn: { plays: turn.canon, failed: check.tried.canon, differs, same_as: same, draws_mid_line: turn.drawsMidLine },
          logged: {
            original: original ? loggedNumbers(at.loggedByText.get(original)?.option) : null,
            replacement: replacement ? loggedNumbers(at.loggedByText.get(replacement)?.option) : null,
            replacement_shown_then: replacement ? at.loggedByText.has(replacement) : null,
            b2: { original: b2Live(original), replacement: b2Live(replacement) },
          },
        };
        writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
        list.push(result);
        // The next attempts see this one: attempt 2's path with the line played on the target's board, reached; its turns
        // (with "new") attempt 2's up to the point's turn, that turn the plays before the point and the line's.
        const next = points.map((point) => (point.board === target.board ? { ...point, line: playedLine ?? point.line, ...(replacement ? { explored: true as const } : {}) } : point));
        const turnsUpTo = (records[1]!.turns ?? []).filter((entry) => entry.turn !== null && target.turn !== null && entry.turn <= target.turn).map((entry) => {
          if (entry.turn !== target.turn) return entry;
          const boardAt = entry.boards.find((b) => b.board === target.board);
          if (!boardAt || !turn.plays) return entry;
          return { turn: entry.turn, plays: turn.plays, boards: entry.boards.filter((b) => b.at <= boardAt.at) };
        });
        // "whole": the deviation's turn as planned there, against the failed ones (a wasted point is not a use of it).
        const simulated: ExploreRow = { attempt, turns: deathTurn, result: "predicted_death", explore: { points: next, target: target as SlTarget, deviation: { reached: true, original, replacement, reason: String(result.reason), ...(rule.whole && differs !== null ? { differs } : {}) }, ...(rule.canon || rule.turn ? { turns: turnsUpTo } : {}) } };
        rowsSoFar.push(simulated);
        truth.push({ ...simulated, explore: { ...simulated.explore!, turns: turnsUpTo } });
      }
      results.set(rule.name, list);
    }

    // The live attempts: where each aimed, whether it reached the point, the turn it played there against the failed
    // attempts' (exact, from the frames), and the decisions later in that turn planned again with "new"'s avoid.
    const liveRows: ExploreRow[] = slRows.map((row) => ({ attempt: row.attempt, turns: row.turns, result: row.result, summary: row.summary, explore: { ...(row.explore ?? { points: [], target: null }), turns: records[row.attempt - 1]?.turns ?? [] } }));
    const live = new Map<number, Row>();
    for (const row of slRows) {
      const explore = row.explore;
      if (!explore || row.attempt < 3 || !explore.target) continue;
      const target = explore.target;
      const reference = slRows.find((r) => r.attempt === target.reference)?.explore?.points ?? [];
      const end = reference.map((point) => point.board).lastIndexOf(target.board);
      const left = explore.points.findIndex((point, i) => i < (end >= 0 ? end : reference.length) && reference[i]?.board !== point.board);
      const record = records[row.attempt - 1];
      const turnThere = record?.turns.find((entry) => entry.boards.some((b) => b.board === target.board));
      const check = exploreTried(liveRows, row.attempt, target.board, { canon: true });
      const canon = turnThere ? turnCanon(turnThere.plays) : null;
      const same = attemptsWith(liveRows.filter((r) => r.attempt < row.attempt && r.result !== "won"), target.board, canon);
      // The decisions after the point in its turn, planned again on their boards with "new"'s avoid (Jev as logged).
      const replans: Row[] = [];
      let pointWhole: Row | null = null;
      if (turnThere && explore.deviation?.reached) {
        const attemptFrames = frameAttempts[row.attempt - 1] ?? [];
        const attemptDecisions = decisionAttempts[row.attempt - 1] ?? [];
        const decisionsByTs = new Map(attemptDecisions.map((d) => [String(d["ts"]), d]));
        const known = knownOrderOf(slRows.filter((r) => r.attempt < row.attempt)).known;
        const tracker = new DrawTracker({ inserts: true, tops: true, picks: true });
        let passed = false;
        for (const frame of attemptFrames) {
          const state = parseGameState(asRow(frame["state"]));
          tracker.observe(state);
          const logged = decisionsByTs.get(String(frame["ts"]));
          if (!logged || state.turn !== turnThere.turn) continue;
          const board = slBoardKey(state);
          if (board === target.board) {
            passed = true;
            // "whole" on the point's board: the deviation resolved again with Jev's logged answer.
            if (String(logged["label"]).startsWith("combat/plan-choice")) {
              const played = record!.before.get(String(frame["ts"])) ?? { canon: [], text: [] };
              const plan = planBoard(state, { attempt: row.attempt, maxAttempts, previous: slRows.filter((r) => r.attempt < row.attempt), knownDraws: knownOf(known, tracker), played });
              const chosen = loggedPick(logged).chosen;
              const chosenText = chosen ? normal(criteriaOf(logged)[chosen]?.["plays"]) : null;
              if (plan.decision?.kind === "ask") {
                const ask = plan.decision as AskDecision;
                const options = Object.fromEntries(Object.entries(((ask.questions["plan"] as { criteria: Record<string, string | null> }).criteria)).map(([key, text]) => [key, text ? (JSON.parse(text) as Row) : {}]));
                const key = Object.keys(options).find((k) => chosenText !== null && normal(options[k]!["plays"]) === chosenText) ?? null;
                if (key) {
                  // "new" and "whole" on the same plan (the same rollout): which replacement each makes.
                  const resolveWith = (whole: boolean): Row => {
                    for (const k of Object.keys(plan.explore)) if (k !== "played") delete (plan.explore as Record<string, unknown>)[k];
                    Object.assign(plan.explore, { b2Gate: true, bossPotions: true, ...(whole ? { whole: true } : {}), deviate: { point: target.point, excluded: target.excluded, attempts: target.attempts, ...(target.tried ? { tried: target.tried } : {}) } });
                    const resolved = ask.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.95 }, confidence: 0.95, raw: {} } } as unknown as AnswerSet);
                    const log = asRow(asRow(resolved.log)["sl_explore"]);
                    return { replacement: log["replacement"] ?? null, reason: log["reason"] ?? null, turn: log["turn"] ?? null, turn_instead: log["turn_instead"] ?? null };
                  };
                  pointWhole = { answer: chosenText, ...resolveWith(true), new: resolveWith(false) };
                } else pointWhole = { answer: chosenText, missing: "Jev's logged answer is not among the options now" };
              } else pointWhole = { answer: chosenText, missing: `the board is code's own now (${plan.decision?.label ?? "none"})` };
            }
            continue;
          }
          if (!passed || !PLANNING.test(String(logged["label"]))) continue;
          const played = record!.before.get(String(frame["ts"])) ?? { canon: [], text: [] };
          const plan = planBoard(state, { attempt: row.attempt, maxAttempts, previous: slRows.filter((r) => r.attempt < row.attempt), knownDraws: knownOf(known, tracker), played });
          const avoid = { point: target.point, tried: check.tried, attempts: check.attempts };
          const loggedLine = String(logged["label"]).startsWith("combat/plan-choice") ? (() => {
            const pick = loggedPick(logged);
            const criteria = criteriaOf(logged);
            return pick.played && criteria[pick.played] ? normal(criteria[pick.played]!["plays"]) : null;
          })() : null;
          // The same board under avoid ("new"), and with SL_RETRY_EXPLORE_WHOLE ("whole"): code's own line may become a
          // question; Jev answers as logged (its line), else code's line, else the rollout's best.
          let outcome: Row = { label: String(logged["label"]), logged_line: loggedLine ?? (plan.codeLine ?? null) };
          for (const variant of ["new", "whole"] as const) {
            const asked = (() => {
              thiefTrace.last = null;
              const env = envOf(state, { attempt: row.attempt, maxAttempts, previousAttempts: previousAttemptsJson(slRows.filter((r) => r.attempt < row.attempt), row.attempt, maxAttempts, { knownDraws: true }), showSim: true, ...(knownOf(known, tracker) ? { knownDraws: knownOf(known, tracker)! } : {}), compute: { ...RETRY_COMPUTE, bossSimSamples: B2_SAMPLES }, explore: { b2Gate: true, bossPotions: true, played, avoid, ...(variant === "whole" ? { whole: true } : {}) } });
              return planCombatTurn(env);
            })();
            if (asked?.kind === "ask") {
              const ask = asked as AskDecision;
              const options = Object.fromEntries(Object.entries(((ask.questions["plan"] as { criteria: Record<string, string | null> }).criteria)).map(([key, text]) => [key, text ? (JSON.parse(text) as Row) : {}]));
              const key = Object.keys(options).find((k) => loggedLine !== null && normal(options[k]!["plays"]) === loggedLine) ?? Object.keys(options).find((k) => plan.codeLine !== null && normal(options[k]!["plays"]) === plan.codeLine) ?? Object.keys(options).find((k) => options[k]!["rollout_best"] === true) ?? null;
              if (key) {
                const resolved = ask.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.95 }, confidence: 0.95, raw: {} } } as unknown as AnswerSet);
                const explored = asRow(asRow(resolved.log)["sl_explore"]);
                const log = asRow(explored["avoid"]);
                outcome = { ...outcome, [variant]: { kind: "question", answer: normal(options[key]!["plays"]), replacement: log["replacement"] ?? null, reason: log["reason"] ?? null, turn: log["turn"] ?? null, turn_instead: log["turn_instead"] ?? null, ...(explored["avoid_failed"] ? { avoid_failed: explored["avoid_failed"] } : {}) } };
              }
            } else {
              const point = asked ? slPointOf(asked, { intent: null, rationale: "", confidence: null, fallback: false }) : undefined;
              outcome = { ...outcome, [variant]: { kind: asked?.kind ?? null, label: asked?.label ?? null, line: point?.line ?? null, turn: point?.canon?.[point.line] ?? null, ...(point?.avoidFailed ? { avoid_failed: point.avoidFailed } : {}) } };
            }
          }
          replans.push({ turn: state.turn, ...outcome });
        }
      }
      live.set(row.attempt, {
        target: target.point,
        reached: explore.deviation?.reached === true,
        left_path_at: left >= 0 ? `T${explore.points[left]!.turn ?? "?"} (board ${left + 1})` : null,
        deviation: explore.deviation ? `${explore.deviation.original ?? "?"} -> ${explore.deviation.replacement ?? "(none)"}` : null,
        turn: canon,
        turn_same_as: same,
        failed_turns_there: check.tried.canon,
        point_whole: pointWhole,
        replans,
        result: row.result,
        turns: row.turns,
      });
      writeFileSync(out, `${JSON.stringify({ run: fight.run, floor: fight.floor, rule: "live", attempt: row.attempt, ...live.get(row.attempt) })}\n`, { flag: "a" });
    }

    // Side by side: each attempt under both rules, and the live attempt where there was one.
    for (let attempt = 3; attempt <= maxAttempts; attempt += 1) {
      const lines = RULES.map((rule) => {
        const r = (results.get(rule.name) ?? []).find((entry) => entry["attempt"] === attempt);
        if (!r) return `    ${rule.name}: -`;
        if (!r["target"]) return `    ${rule.name}: no deviation point (${String(r["why"])})`;
        const t = asRow(r["target"]);
        const n = asRow(r["numbers"]);
        const b2 = asRow(r["b2"]);
        const replay = asRow(r["replay"]);
        const turn = asRow(r["turn"]);
        const same = (turn["same_as"] as number[] | undefined) ?? [];
        const turnText = turn["plays"] === null ? "turn: ?" : `turn ${turn["differs"] ? "differs from every failed attempt's there" : `= attempt ${same.join(", ") || "?"}'s there`}${turn["draws_mid_line"] ? " (draws before its end: re-planned after the draw)" : ""}`;
        return `    ${rule.name}: T${String(t["turn"])} (back ${String(t["back"])}${Number(t["round"]) > 0 ? `, round ${String(t["round"])}` : ""}${t["lost"] ? ", every line lost" : ""}; played there in ${((t["attempts"] as number[]) ?? []).join(", ")}) ${String(r["original"] ?? "?")}  ->  ${String(r["replacement"] ?? "(none)")}${asRow(r["jev_pick"])["assumed"] ? " [Jev's pick assumed]" : ""}\n        ${turnText}: ${String(turn["plays"] ?? "?")}${Object.keys(replay).length > 0 ? `\n        replay: ${String(replay["boards"])} boards before it (${String(replay["questions"])} questions)${replay["breaks"] ? `, breaks at ${String(replay["breaks"])}` : ", every question shows attempt 2's line"}` : ""}\n        ${String(r["reason"])}${r["gate"] ? ` [gate ${String(r["gate"])}]` : ""}\n        original: ${String(n["original"] ?? "-")}\n        replacement: ${String(n["replacement"] ?? "-")}${Object.keys(b2).length > 0 ? `\n        B2 calibrated ${String(b2["original"])} -> ${String(b2["replacement"])} (paired ${String(b2["diff"])} ± ${String(b2["se"])})` : ""}\n        why: ${String(r["why"])}`;
      });
      const l = live.get(attempt);
      /** A re-plan's outcome under a variant, as one line. */
      const variantText = (now: Row): string =>
        `${now["kind"] === "question" ? `Jev's ${String(now["answer"])} -> ${String(now["replacement"] ?? "(kept)")} (${String(now["reason"] ?? "")})` : `${String(now["label"] ?? now["kind"])} ${String(now["line"] ?? "")}`}${now["avoid_failed"] ? ` [avoid failed: ${String(asRow(now["avoid_failed"])["reason"])}]` : ""}`;
      const replans = ((l?.["replans"] as Row[] | undefined) ?? []).map((entry) => {
        return `\n      later in that turn (T${String(entry["turn"])}): logged ${String(entry["logged_line"] ?? "?")} [${String(entry["label"])}]\n        new: ${variantText(asRow(entry["new"]))}\n        whole: ${variantText(asRow(entry["whole"]))}`;
      }).join("");
      const pw = l ? asRow(l["point_whole"]) : {};
      const pwNew = asRow(pw["new"]);
      const pointText = Object.keys(pw).length > 0 ? `\n      the point planned again: Jev's ${String(pw["answer"] ?? "?")}${pw["missing"] ? ` (${String(pw["missing"])})` : `\n        new: -> ${String(pwNew["replacement"] ?? "(kept)")} (${String(pwNew["reason"] ?? "")})\n        whole: -> ${String(pw["replacement"] ?? "(kept)")} (${String(pw["reason"] ?? "")})`}` : "";
      const liveText = l ? `\n    live: aimed at ${String(l["target"] ?? "-")}; ${l["reached"] ? "reached" : "not reached"}${l["left_path_at"] ? `, left attempt 2's path at ${String(l["left_path_at"])}` : ""}; ${String(l["deviation"] ?? "no deviation")}; ${l["turn"] === null ? "no turn through the point" : `its turn there ${(l["turn_same_as"] as number[]).length > 0 ? `= attempt ${(l["turn_same_as"] as number[]).join(", ")}'s` : "differs from every failed attempt's"} (${String(l["turn"])})`}; ${String(l["result"])} on T${String(l["turns"])}${pointText}${replans}` : "";
      console.log(`  a${attempt}:\n${lines.join("\n")}${liveText}`);
    }
  }
  console.log(`wrote ${out}`);
}

void main();
