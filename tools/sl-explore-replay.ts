/**
 * Offline evaluation of SL_RETRY_EXPLORE (docs/sl.md §11, notes/sl-explore.md): on the logged SL retries, which decision
 * point each attempt from the 3rd would change, the line it would play there instead, and the numbers of both, under two
 * rules side by side: "current" (every sub-switch off: bc8c9bc) and "new" (on: SL_RETRY_EXPLORE_B2, B2's win rate gating
 * the replacement on a boss B2 is trusted on; SL_RETRY_EXPLORE_BOSS_POTIONS, a boss fight's replacement may drink;
 * SL_RETRY_EXPLORE_ORDER, points where every line loses in every sample last; SL_RETRY_EXPLORE_REPLAY, the reference path
 * replayed up to the point, whether each of its questions shows attempt 2's line now; SL_RETRY_KNOWN_PICKS, the known
 * draws through a Seeker Strike pick). Where the live attempts recorded their explore (R1QJUBVBSSB2 F33), what they did:
 * the point, whether it was reached, where the attempt left attempt 2's path. No model is called, nothing is written
 * outside --out; logs are read only.
 *
 * Per fight: the logged frames (states.jsonl rows of that run and floor, in combat) and decisions, split into attempts where
 * the turn goes back. Attempt 2 is the path (as the live controller has it): its frames go through the draw tracker
 * (SL_RETRY_KNOWN_INSERTS and _TOP on), attempt 1's draws are the known order, and every planning decision of attempt 2 is
 * planned again, once, by the current code on its logged board as an SL retry (the known draws, RETRY_COMPUTE, the frozen
 * clock: the rollout's whole 24-sample schedule) with env.sl.explore on. B2 (--b2 on): only on a boss it is trusted on, in
 * this thread (serial), --b2-samples samples a line (live: 1200 on 20 workers), its clock frozen; off on every other fight.
 * Each rule then records the path's points as the planner does (explorePoint: the line attempt 2 played there, the logged
 * one; the shown lines that could replace it; the rollout's deaths; B2's numbers under the new rule), and for attempt
 * k = 3 .. the fight's last takes the live controller's choice (exploreTarget over its rows so far) and, on that board, the
 * planner's replacement: the planned question resolved again with env.sl.explore.deviate and the rule's sub-switches set
 * (the planner reads them when it resolves; the question is the same), Jev answering as it did in attempt 2 (the attempts
 * repeated themselves, 63WBEEF2JVM5 / 1YXMHF6FSPK4 / XSPH). Each attempt is taken to reach its point (it plays attempt 2's
 * path up to it) and to fail (the next one is evaluated); whether the changed line wins is not known offline.
 *
 * The logged question at that board is shown beside it: its rollout numbers and, where B2 ranked the boss live, the lines'
 * B2 win rates as Jev saw them.
 *
 * Usage: npx tsx tools/sl-explore-replay.ts [--states logs/states.jsonl] [--decisions logs/decisions.jsonl]
 *          [--attempts logs/sl-attempts.jsonl] [--fights RUN:FLOOR,...] [--out experiments/sl-explore] [--tag name]
 *          [--b2 on|off] [--b2-samples 1200]
 * Output: <out>/explore[-<tag>].jsonl (one row per fight, rule and attempt), and a line per attempt and rule on stdout.
 */
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv, type SlEnv } from "../src/project/types.js";
import { planCombatTurn, slPointOf, thiefTrace } from "../src/screens/combat-plan.js";
import { BOSS_LINES_TIE_SE, bossLinesOptions, lowTrustOfState, simWinsLess } from "../src/sim/boss-lines.js";
import { createSlLog, previousAttemptsJson, type SlAttemptRow } from "../src/sl/attempts.js";
import { RETRY_COMPUTE } from "../src/sl/controller.js";
import { checkKnown, DrawTracker, knownOrderOf } from "../src/sl/draws.js";
import { explorePoint, exploreTarget, lineText, pointLost, replayPath, slBoardKey, type ExploreB2, type ExploreLine, type ExplorePick, type ExploreRow, type SlExploreEnv, type SlPoint, type SlTarget } from "../src/sl/explore.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import type { Plan } from "../src/strategy/turn-solver.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const STATES = arg("states", "logs/states.jsonl");
const DECISIONS = arg("decisions", "logs/decisions.jsonl");
const ATTEMPTS = arg("attempts", "logs/sl-attempts.jsonl");
const outDir = arg("out", "experiments/sl-explore");
const tag = arg("tag", "");
/** B2 on a boss it is trusted on (the new rule's gate there, and the ranking of both rules), in this thread. */
const B2 = arg("b2", "off") === "on";
const B2_SAMPLES = Number(arg("b2-samples", String(RETRY_COMPUTE.bossSimSamples)));
type RuleName = "current" | "new";
type RuleFlags = Pick<SlExploreEnv, "b2Gate" | "bossPotions">;
/**
 * The two rules: the sub-switches off (bc8c9bc) and on (SL_RETRY_EXPLORE_B2, _BOSS_POTIONS, _ORDER, _REPLAY and
 * SL_RETRY_KNOWN_PICKS: the attempt 2 path's known draws with the selections' picks kept).
 */
const RULES: { name: RuleName; flags: RuleFlags; aliveFirst: boolean; replay: boolean; picks: boolean }[] = [
  { name: "current", flags: {}, aliveFirst: false, replay: false, picks: false },
  { name: "new", flags: { b2Gate: true, bossPotions: true }, aliveFirst: true, replay: true, picks: true },
];
/**
 * The logged fights played more than once from their room-entry save (docs/sl.md §10.1, the A9 batch of 2026-10-02), and
 * R1QJUBVBSSB2 F33 (2026-10-03: the first live SL_RETRY_EXPLORE fight, its attempts 3-6 deviating).
 */
const FIGHTS = (arg("fights", "") || "R1QJUBVBSSB2:33,63WBEEF2JVM5:33,1YXMHF6FSPK4:33,XSPHCB4GUSEU:48,VNKN9952ZNA0:25,VNKN9952ZNA0:33,JW925EDF9ZTQ:48")
  .split(",")
  .map((entry) => ({ run: entry.split(":")[0]!, floor: Number(entry.split(":")[1]) }));
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
type Row = Record<string, unknown>;

/** The planner's last trace, read through a function (a read right after the reset would narrow to null). */
function traced(): typeof thiefTrace.last {
  return thiefTrace.last;
}

const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
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

/** A path board planned under a rule's known draws (one plan shared by both rules when their known draws are the same). */
interface Planned {
  /** The decision planned on the logged board (a question is resolved again for each deviation and replay). */
  decision: Decision | null;
  /** Its env.sl.explore: a rule's sub-switches, deviation or replay are set on it before a resolution. */
  explore: SlExploreEnv;
  /** The planner's lines (shown, the random potions' Monte Carlo lines, the rollout, B2 where it ranks). */
  trace: NonNullable<typeof thiefTrace.last> | null;
  /** Code's own point: its line. */
  codeLine: string | null;
  /** The known draws there: how many cards (and exact), or why none. */
  known: string;
}

interface PathPoint {
  board: string;
  turn: number | null;
  plans: Record<RuleName, Planned>;
  /** The logged row, its options by text, Jev's choice (key, text) and the line played (text). */
  logged: Row;
  loggedByText: Map<string, { key: string; option: Row }>;
  chosenKey: string | null;
  loggedPlayedKey: string | null;
  chosenText: string | null;
  playedText: string | null;
  loggedLabel: string;
}

/** A point's record under a rule, as the planner's explorePoint makes it (the logged line as the one played). */
function pointUnder(entry: PathPoint, rule: (typeof RULES)[number]): { point: SlPoint; mapped: boolean | null } {
  const planned = entry.plans[rule.name];
  const isQuestion = planned.decision?.kind === "ask" && entry.playedText !== null;
  if (!isQuestion) return { point: { board: entry.board, turn: entry.turn, kind: "code", label: planned.decision?.label ?? "none", line: planned.codeLine ?? entry.playedText ?? "?" }, mapped: null };
  const trace = planned.trace!;
  const drinks = rule.flags.bossPotions === true && trace.kind === "boss";
  const lines = linesOf(trace, drinks);
  const own = lines.find((line) => line.text === entry.playedText);
  // Jev's pick of a random potion: its option ("drink X, then re-plan"), its Monte Carlo line the one B2 rated.
  const mc = /^p(\d+)$/.exec(entry.chosenKey ?? "") && entry.chosenKey === entry.loggedPlayedKey ? (trace.mcShown ?? []).find((m) => `p${m.source.slot}` === entry.chosenKey) : undefined;
  const pick: ExplorePick<Plan> = own
    ? { plan: own.plan, text: own.text, potions: own.potions, wins: own.wins }
    : mc
      ? { plan: null, text: `drink ${mc.source.name}, then re-plan`, potions: [mc.source.potionId], wins: false, rated: mc.median }
      : { plan: null, text: entry.playedText!, potions: [], wins: false };
  const record = explorePoint(pick, lines, { drinks, deathShare: deathShareOf(trace), b2: rule.flags.b2Gate === true ? b2Of(trace) : null });
  return { point: { board: entry.board, turn: entry.turn, kind: "question", label: planned.decision!.label, ...record }, mapped: own !== undefined || mc !== undefined };
}

/** The planner's lines for the explore code (combat-plan explored: the shown lines, then the random potions' with `drinks`). */
function linesOf(trace: NonNullable<typeof thiefTrace.last>, drinks: boolean): ExploreLine<Plan>[] {
  const potionsOf = (plan: Plan) => plan.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.cardId.split(":")[1] ?? "");
  return [
    ...trace.shown.map((plan) => ({ plan, text: lineText(plan.steps), dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: potionsOf(plan) })),
    ...(drinks ? (trace.mcShown ?? []).flatMap((mc) => (mc.median ? [{ plan: mc.median, text: `drink ${mc.source.name}, then re-plan`, dies: mc.median.outcome.dies, wins: mc.median.outcome.winsFight, potions: [...new Set([mc.source.potionId, ...potionsOf(mc.median)])] }] : [])) : []),
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

/** The live attempts' rows (an explore record): where each aimed, whether it reached the point, where it left attempt 2's path. */
function liveOf(rows: readonly SlAttemptRow[]): Map<number, Row> {
  const out = new Map<number, Row>();
  const reference = rows.find((row) => row.attempt === 2 && row.explore);
  const path = reference?.explore?.points ?? [];
  for (const row of rows) {
    const explore = row.explore;
    if (!explore || row.attempt < 3) continue;
    const target = explore.target;
    const end = target ? path.map((point) => point.board).lastIndexOf(target.board) : -1;
    const left = explore.points.findIndex((point, i) => i < (end >= 0 ? end : path.length) && path[i]?.board !== point.board);
    out.set(row.attempt, {
      target: target?.point ?? null,
      reached: explore.deviation?.reached === true,
      left_path_at: left >= 0 ? `T${explore.points[left]!.turn ?? "?"} (board ${left + 1})` : null,
      deviation: explore.deviation ? `${explore.deviation.original ?? "?"} -> ${explore.deviation.replacement ?? "(none)"}` : null,
      result: row.result,
      turns: row.turns,
    });
  }
  return out;
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
    if (frameAttempts.length < 2 || decisionAttempts.length < 2) {
      console.log(`${fight.run} F${fight.floor}: fewer than two logged attempts (${frameAttempts.length} / ${decisionAttempts.length}), skipped`);
      continue;
    }
    // B2 only on a boss it is trusted on (a low-trust boss's numbers rank nothing: the rollout's gate either way).
    const first = parseGameState(asRow(frameAttempts[1]![0]!["state"]));
    const lowTrust = lowTrustOfState(first);
    bossLinesOptions.enabled = B2 && lowTrust === null;
    // Attempt 1's draws: the known order of attempt 2 (as the controller has it from attempt 1's row), with the selections'
    // picks ending it (current) or kept (new: SL_RETRY_KNOWN_PICKS).
    const trackers = (picks: boolean) => ({ one: new DrawTracker({ inserts: true, tops: true, picks }), two: new DrawTracker({ inserts: true, tops: true, picks }) });
    const draws = { current: trackers(false), new: trackers(true) };
    for (const row of frameAttempts[0]!) for (const t of Object.values(draws)) t.one.observe(parseGameState(asRow(row["state"])));
    const known = { current: knownOrderOf([{ attempt: 1, draws: draws.current.one.record }]).known, new: knownOrderOf([{ attempt: 1, draws: draws.new.one.record }]).known };
    const byTs = new Map(decisionAttempts[1]!.map((row) => [String(row["ts"]), row]));
    const previous = slRows.filter((row) => row.attempt < 3);
    const path: PathPoint[] = [];
    const t0 = Date.now();
    for (const frame of frameAttempts[1]!) {
      const state = parseGameState(asRow(frame["state"]));
      for (const t of Object.values(draws)) t.two.observe(state);
      const logged = byTs.get(String(frame["ts"]));
      if (!logged || !PLANNING.test(String(logged["label"]))) continue;
      const knownOf = (name: RuleName) => {
        const order = known[name];
        const check = order ? checkKnown(order, draws[name].two) : null;
        return check?.ok && check.keys.length > 0 ? { cards: check.keys, names: check.names, attempts: [...order!.attempts], ...(check.inserted && check.inserted.keys.length > 0 ? { added: { cards: check.inserted.keys, names: check.inserted.names } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) } : undefined;
      };
      const plan = (knownDraws: ReturnType<typeof knownOf>): Planned => {
        const explore: SlExploreEnv = {};
        const sl: SlEnv = {
          attempt: 3,
          maxAttempts,
          previousAttempts: previousAttemptsJson(previous, 3, maxAttempts, { knownDraws: true }),
          showSim: true,
          ...(knownDraws ? { knownDraws } : {}),
          compute: { ...RETRY_COMPUTE, bossSimSamples: B2_SAMPLES },
          explore,
        };
        thiefTrace.last = null;
        const decision = planCombatTurn(envOf(state, sl));
        const trace = traced();
        const codeLine = decision && decision.kind !== "ask" ? (slPointOf(decision, { intent: null, rationale: "", confidence: null, fallback: false })?.line ?? null) : null;
        const knownText = knownDraws ? `${knownDraws.cards.length}${knownDraws.exact !== undefined ? ` (${knownDraws.exact} exact)` : ""}${knownDraws.added ? ` +${knownDraws.added.cards.length} at random` : ""}` : "none";
        return { decision, explore, trace: decision?.kind === "ask" ? trace : null, codeLine, known: knownText };
      };
      // One plan for both rules when their known draws are the same (B2's samples are the cost).
      const kc = knownOf("current");
      const kn = knownOf("new");
      const planCurrent = plan(kc);
      const planNew = JSON.stringify(kc ?? null) === JSON.stringify(kn ?? null) ? planCurrent : plan(kn);
      const loggedLabel = String(logged["label"]);
      const isQuestion = loggedLabel.startsWith("combat/plan-choice");
      const criteria = isQuestion ? criteriaOf(logged) : {};
      const loggedByText = new Map(Object.entries(criteria).filter(([key]) => /^plan\d+$/.test(key)).map(([key, option]) => [normal(option["plays"]), { key, option }]));
      const pick = isQuestion ? loggedPick(logged) : { chosen: null, played: null };
      const playedText = pick.played && criteria[pick.played] ? normal(criteria[pick.played]!["plays"]) : null;
      const chosenText = pick.chosen && criteria[pick.chosen] ? normal(criteria[pick.chosen]!["plays"]) : null;
      path.push({ board: slBoardKey(state), turn: state.turn, plans: { current: planCurrent, new: planNew }, logged, loggedByText, chosenKey: pick.chosen, loggedPlayedKey: pick.played, chosenText, playedText, loggedLabel });
    }
    const deathTurn = Number(decisionAttempts[1]!.at(-1)?.["turn"] ?? 0);
    const b2Ranked = path.some((entry) => entry.plans.current.trace?.simRanks);
    console.log(`${fight.run} F${fight.floor}${lowTrust ? ` (low-trust boss: ${lowTrust.split(":")[0]})` : ""}: attempt 2's path, ${path.length} decision points planned in ${Math.round((Date.now() - t0) / 1000)} s (B2 ${b2Ranked ? `ranked it, ${B2_SAMPLES} samples a line` : "off"}); the known draws along it: current ${path.map((entry) => entry.plans.current.known).join(" ")} | new ${path.map((entry) => entry.plans.new.known).join(" ")}`);
    const live = liveOf(slRows);

    const results = new Map<string, Row[]>();
    for (const rule of RULES) {
      const records = path.map((entry) => pointUnder(entry, rule));
      const points = records.map((record) => record.point);
      // The path as this rule records it: each question's alternatives, how many are not worse than the line played (B2's
      // where it weighed the point, else the rollout's; "?": no numbers), and "lost" where every line loses in every sample.
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
      const summary = path.map((entry, i) => `T${entry.turn} ${points[i]!.kind === "question" ? `Q(${points[i]!.alternatives?.length ?? 0} alt, ${notWorse(points[i]!)} not worse, ${deadOf(points[i]!)}${rule.aliveFirst && pointLost(points[i]!) ? ", lost" : ""}${records[i]!.mapped === false ? ", logged line not shown now" : ""})` : points[i]!.label.replace("combat/", "")}${entry.plans[rule.name].decision?.kind !== "ask" && entry.loggedLabel.startsWith("combat/plan-choice") ? " [logged: question]" : ""}`).join(" · ");
      console.log(`  path (${rule.name}): ${summary}`);
      const rowsSoFar: ExploreRow[] = [{ attempt: 2, turns: deathTurn, result: "predicted_death", explore: { points, target: null } }];
      const list: Row[] = [];
      for (let attempt = 3; attempt <= maxAttempts; attempt += 1) {
        const { target, why } = exploreTarget(rowsSoFar, attempt, { aliveFirst: rule.aliveFirst });
        if (!target) {
          const result = { run: fight.run, floor: fight.floor, rule: rule.name, attempt, target: null, why, live: live.get(attempt) ?? null };
          writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
          list.push(result);
          rowsSoFar.push({ attempt, turns: deathTurn, result: "predicted_death", explore: { points, target: null } });
          continue;
        }
        const index = path.findIndex((entry) => entry.board === target.board);
        const at = path[index]!;
        const planned = at.plans[rule.name];
        const atPoint = points[index]!;
        // SL_RETRY_EXPLORE_REPLAY: the reference path before the point (attempt 2's lines, replayPath) and whether each of its
        // questions shows its line now (else the live replay would stop there).
        const replayLines = replayPath(rowsSoFar, target);
        const before = path.slice(0, index).map((entry, i) => ({ entry, point: points[i]!, mapped: records[i]!.mapped }));
        const replayBreak = before.find(({ point, mapped }) => point.kind === "question" && mapped === false);
        const replay = rule.replay ? { boards: replayLines.size, questions: before.filter(({ point }) => point.kind === "question").length, breaks: replayBreak ? `T${replayBreak.entry.turn}: attempt 2's line is not among the options now` : null } : null;
        let explored: Row | null = null;
        let jevPick: string | null = null;
        let assumed = false;
        if (planned.decision?.kind === "ask") {
          const ask = planned.decision as AskDecision;
          const options = Object.fromEntries(Object.entries(((ask.questions["plan"] as { criteria: Record<string, string | null> }).criteria)).map(([key, text]) => [key, text ? (JSON.parse(text) as Row) : {}]));
          // Jev answers as in attempt 2 (its pick among these options by its line); not shown now: the rollout's best (Jev's usual pick).
          jevPick = Object.keys(options).find((key) => at.chosenText !== null && normal(options[key]!["plays"]) === at.chosenText) ?? null;
          if (jevPick === null) {
            assumed = true;
            jevPick = Object.keys(options).find((key) => options[key]!["rollout_best"] === true) ?? Object.keys(options)[0] ?? null;
          }
          if (jevPick !== null) {
            // The same question, resolved with this rule's sub-switches and the deviation (the planner reads env.sl.explore then).
            Object.assign(planned.explore, rule.flags, { deviate: { point: target.point, excluded: target.excluded, attempts: target.attempts, ...(rule.replay ? { replayed: replayBreak ? before.indexOf(replayBreak) : before.length } : {}) } });
            const resolved = ask.resolve({ plan: { type: "choice", choice: jevPick, probabilities: { [jevPick]: 0.95 }, confidence: 0.95, raw: {} } } as unknown as AnswerSet);
            explored = asRow(asRow(resolved.log)["sl_explore"]);
            for (const key of Object.keys(planned.explore)) delete (planned.explore as Record<string, unknown>)[key];
          }
        }
        const replacement = explored && typeof explored["replacement"] === "string" ? explored["replacement"] : null;
        const original = explored && typeof explored["original"] === "string" ? explored["original"] : null;
        // The logged question on that board (attempt 2, live): the lines' rollout numbers and B2's (calibrated) as Jev saw them.
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
          target: { turn: target.turn, back: target.back, round: target.round, point: target.point, excluded: target.excluded, label: atPoint.label, logged_label: at.loggedLabel, dead: atPoint.dead ?? null, b2: atPoint.b2 ?? null, lost: pointLost(atPoint) },
          why,
          replay,
          jev_pick: { key: jevPick, assumed },
          original,
          replacement,
          reason: explored?.["reason"] ?? (planned.decision?.kind === "act" ? `the board is code's own now (${planned.decision.label})` : "no question"),
          gate: explored?.["gate"] ?? null,
          numbers: explored?.["numbers"] ?? null,
          b2: explored?.["b2"] ?? null,
          logged: {
            original: original ? loggedNumbers(at.loggedByText.get(original)?.option) : null,
            replacement: replacement ? loggedNumbers(at.loggedByText.get(replacement)?.option) : null,
            replacement_shown_then: replacement ? at.loggedByText.has(replacement) : null,
            b2: { original: b2Live(original), replacement: b2Live(replacement) },
          },
          live: live.get(attempt) ?? null,
        };
        writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
        list.push(result);
        // The next attempts see this one: attempt 2's path with the replacement played on the target's board, reached.
        const next = points.map((point) => (point.board === target.board ? { ...point, line: replacement ?? point.line, ...(replacement ? { explored: true as const } : {}) } : point));
        rowsSoFar.push({ attempt, turns: deathTurn, result: "predicted_death", explore: { points: next, target: target as SlTarget, deviation: { reached: true, original, replacement, reason: String(result.reason) } } });
      }
      results.set(rule.name, list);
    }
    // Side by side: each attempt under both rules, and the live attempt where there was one.
    for (let attempt = 3; attempt <= maxAttempts; attempt += 1) {
      const lines = RULES.map((rule) => {
        const r = (results.get(rule.name) ?? []).find((row) => row["attempt"] === attempt);
        if (!r) return `    ${rule.name}: -`;
        if (!r["target"]) return `    ${rule.name}: no deviation point (${String(r["why"])})`;
        const t = asRow(r["target"]);
        const n = asRow(r["numbers"]);
        const b2 = asRow(r["b2"]);
        const replay = asRow(r["replay"]);
        return `    ${rule.name}: T${String(t["turn"])} (back ${String(t["back"])}${Number(t["round"]) > 0 ? `, round ${String(t["round"])}` : ""}${t["lost"] ? ", every line lost" : ""}) ${String(r["original"] ?? "?")}  ->  ${String(r["replacement"] ?? "(none)")}${asRow(r["jev_pick"])["assumed"] ? " [Jev's pick assumed]" : ""}${Object.keys(replay).length > 0 ? `\n        replay: ${String(replay["boards"])} boards before it (${String(replay["questions"])} questions)${replay["breaks"] ? `, breaks at ${String(replay["breaks"])}` : ", every question shows attempt 2's line"}` : ""}\n        ${String(r["reason"])}${r["gate"] ? ` [gate ${String(r["gate"])}]` : ""}\n        original: ${String(n["original"] ?? "-")}\n        replacement: ${String(n["replacement"] ?? "-")}${Object.keys(b2).length > 0 ? `\n        B2 calibrated ${String(b2["original"])} -> ${String(b2["replacement"])} (paired ${String(b2["diff"])} ± ${String(b2["se"])})` : ""}\n        why: ${String(r["why"])}`;
      });
      const l = live.get(attempt);
      const liveText = l ? `\n    live: aimed at ${String(l["target"] ?? "-")}; ${l["reached"] ? "reached" : "not reached"}${l["left_path_at"] ? `, left attempt 2's path at ${String(l["left_path_at"])}` : ""}; ${String(l["deviation"] ?? "no deviation")}; ${String(l["result"])} on T${String(l["turns"])}` : "";
      console.log(`  a${attempt}:\n${lines.join("\n")}${liveText}`);
    }
  }
  console.log(`wrote ${out}`);
}

void main();
