/**
 * Offline evaluation of SL_RETRY_EXPLORE (docs/sl.md §11, notes/sl-explore.md): on the logged SL retries, which decision
 * point each attempt from the 3rd would change, the line it would play there instead, and the rollout's numbers of both.
 * No model is called, nothing is written outside --out; logs are read only.
 *
 * Per fight: the logged frames (states.jsonl rows of that run and floor, in combat) and decisions, split into attempts where
 * the turn goes back. Attempt 2 is the path (as the live controller has it): its frames go through the draw tracker
 * (SL_RETRY_KNOWN_INSERTS and _TOP on), attempt 1's draws are the known order, and every planning decision of attempt 2 is
 * planned again by the current code on its logged board as an SL retry (the known draws, RETRY_COMPUTE, the frozen clock:
 * the rollout's whole 24-sample schedule; B2 off) with env.sl.explore on: the board's key, the line attempt 2 played there
 * (the logged one), and the shown lines that could replace it. Then, for attempt k = 3 .. the fight's last, the live
 * controller's choice (exploreTarget over the rows so far) and, on that board, the planner's replacement (env.sl.explore
 * .deviate, Jev answering as it did in attempt 2: the attempts repeated themselves, 63WBEEF2JVM5 / 1YXMHF6FSPK4 / XSPH).
 * Each attempt is taken to reach its point (it plays attempt 2's path up to it) and to fail (the next one is evaluated);
 * whether the changed line wins is not known offline.
 *
 * The logged question at that board is shown beside it: its rollout numbers and, where B2 ranked the boss live (the
 * Knowledge Demon), B2's order among the untried lines (offline B2 is off: the replacement is the rollout's choice).
 *
 * Usage: npx tsx tools/sl-explore-replay.ts [--states logs/states.jsonl] [--decisions logs/decisions.jsonl]
 *          [--attempts logs/sl-attempts.jsonl] [--fights RUN:FLOOR,...] [--out experiments/sl-explore] [--tag name]
 * Output: <out>/explore[-<tag>].jsonl (one row per fight and attempt), and a line per attempt on stdout.
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
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { createSlLog, previousAttemptsJson, type SlAttemptRow } from "../src/sl/attempts.js";
import { RETRY_COMPUTE } from "../src/sl/controller.js";
import { checkKnown, DrawTracker, knownOrderOf } from "../src/sl/draws.js";
import { exploreAlternatives, exploreTarget, lineText, slBoardKey, type ExploreLine, type ExploreRow, type SlPoint, type SlTarget } from "../src/sl/explore.js";
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
/** The logged fights played more than once from their room-entry save (docs/sl.md §10.1, the A9 batch of 2026-10-02). */
const FIGHTS = (arg("fights", "") || "63WBEEF2JVM5:33,1YXMHF6FSPK4:33,XSPHCB4GUSEU:48,VNKN9952ZNA0:25,VNKN9952ZNA0:33,JW925EDF9ZTQ:48")
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

interface PathPoint {
  point: SlPoint;
  state: GameState;
  sl: SlEnv;
  /** The logged row, its options by text, and Jev's choice and the played line as text. */
  logged: Row;
  loggedByText: Map<string, { key: string; option: Row }>;
  chosenText: string | null;
  replanKind: "ask" | "act" | "none";
  loggedLabel: string;
  /** The logged line is among the replanned options (null: a code point). */
  mapped: boolean | null;
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
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
    // Attempt 1's draws: the known order of attempt 2 (as the controller has it from attempt 1's row).
    const tracker1 = new DrawTracker({ inserts: true, tops: true });
    for (const row of frameAttempts[0]!) tracker1.observe(parseGameState(asRow(row["state"])));
    const { known } = knownOrderOf([{ attempt: 1, draws: tracker1.record }]);
    const tracker = new DrawTracker({ inserts: true, tops: true });
    const byTs = new Map(decisionAttempts[1]!.map((row) => [String(row["ts"]), row]));
    const previous = slRows.filter((row) => row.attempt < 3);
    const path: PathPoint[] = [];
    const t0 = Date.now();
    for (const frame of frameAttempts[1]!) {
      const state = parseGameState(asRow(frame["state"]));
      tracker.observe(state);
      const logged = byTs.get(String(frame["ts"]));
      if (!logged || !PLANNING.test(String(logged["label"]))) continue;
      const check = known ? checkKnown(known, tracker) : null;
      const knownDraws = check?.ok && check.keys.length > 0 ? { cards: check.keys, names: check.names, attempts: [...known!.attempts], ...(check.inserted && check.inserted.keys.length > 0 ? { added: { cards: check.inserted.keys, names: check.inserted.names } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) } : undefined;
      const sl: SlEnv = {
        attempt: 3,
        maxAttempts,
        previousAttempts: previousAttemptsJson(previous, 3, maxAttempts, { knownDraws: true }),
        showSim: true,
        ...(knownDraws ? { knownDraws } : {}),
        compute: { ...RETRY_COMPUTE },
        explore: {},
      };
      thiefTrace.last = null;
      const decision = planCombatTurn(envOf(state, sl));
      const board = slBoardKey(state);
      const loggedLabel = String(logged["label"]);
      const isQuestion = loggedLabel.startsWith("combat/plan-choice");
      const criteria = isQuestion ? criteriaOf(logged) : {};
      const loggedByText = new Map(Object.entries(criteria).filter(([key]) => /^plan\d+$/.test(key)).map(([key, option]) => [normal(option["plays"]), { key, option }]));
      const pick = isQuestion ? loggedPick(logged) : { chosen: null, played: null };
      const playedText = pick.played && criteria[pick.played] ? normal(criteria[pick.played]!["plays"]) : null;
      const chosenText = pick.chosen && criteria[pick.chosen] ? normal(criteria[pick.chosen]!["plays"]) : null;
      let point: SlPoint;
      let mapped: boolean | null = null;
      if (decision?.kind === "ask" && playedText !== null) {
        const shown = traced()?.shown ?? [];
        const lines: ExploreLine<Plan>[] = shown.map((plan) => ({ plan, text: lineText(plan.steps), dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: plan.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.cardId.split(":")[1] ?? "") }));
        const own = lines.find((line) => line.text === playedText);
        mapped = own !== undefined;
        const alternatives = exploreAlternatives(own ? { plan: own.plan, text: own.text, potions: own.potions, wins: own.wins } : { plan: null, text: playedText, potions: [], wins: false }, lines);
        // The rollout's share of samples dead by line, as the planner records it (combat-plan explored: pointOf).
        const rollout = traced()?.rollout;
        const dead = Object.fromEntries(
          [...(own ? [own] : []), ...alternatives].flatMap((line) => {
            const estimated = rollout?.available ? rollout.byPlan.get(line.plan) : undefined;
            return estimated && estimated.samples > 0 ? [[line.text, Math.round((estimated.deaths / estimated.samples) * 1000) / 1000]] : [];
          }),
        );
        point = { board, turn: state.turn, kind: "question", label: decision.label, line: playedText, alternatives: alternatives.map((line) => line.text), ...(Object.keys(dead).length > 0 ? { dead } : {}) };
      } else {
        const info = decision ? slPointOf(decision, { intent: null, rationale: "", confidence: null, fallback: false }) : undefined;
        point = { board, turn: state.turn, kind: "code", label: decision?.label ?? "none", line: info?.line ?? playedText ?? "?" };
      }
      path.push({ point, state, sl, logged, loggedByText, chosenText, replanKind: decision?.kind ?? "none", loggedLabel, mapped });
    }
    const deathTurn = Number(decisionAttempts[1]!.at(-1)?.["turn"] ?? 0);
    const rowsSoFar: ExploreRow[] = [{ attempt: 2, turns: deathTurn, result: "predicted_death", explore: { points: path.map((entry) => entry.point), target: null } }];
    const summary = path.map((entry) => `T${entry.point.turn} ${entry.point.kind === "question" ? `Q(${entry.point.alternatives?.length ?? 0} alt${entry.mapped === false ? ", logged line not shown now" : ""})` : entry.point.label.replace("combat/", "")}${entry.replanKind === "act" && entry.loggedLabel.startsWith("combat/plan-choice") ? " [logged: question]" : ""}`).join(" · ");
    console.log(`${fight.run} F${fight.floor}: attempt 2's path, ${path.length} decision points (${Math.round((Date.now() - t0) / 1000)} s): ${summary}`);

    for (let attempt = 3; attempt <= maxAttempts; attempt += 1) {
      const { target, why } = exploreTarget(rowsSoFar, attempt);
      if (!target) {
        const result = { run: fight.run, floor: fight.floor, attempt, target: null, why };
        writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
        console.log(`  a${attempt}: no deviation point (${why})`);
        rowsSoFar.push({ attempt, turns: deathTurn, result: "predicted_death", explore: { points: path.map((entry) => entry.point), target: null } });
        continue;
      }
      const at = path.find((entry) => entry.point.board === target.board)!;
      const deviate = { point: target.point, excluded: target.excluded, attempts: target.attempts };
      thiefTrace.last = null;
      const decision = planCombatTurn(envOf(at.state, { ...at.sl, attempt, explore: { deviate } })) as Decision | null;
      let explored: Row | null = null;
      let jevPick: string | null = null;
      let assumed = false;
      if (decision?.kind === "ask") {
        const ask = decision as AskDecision;
        const options = Object.fromEntries(Object.entries(((ask.questions["plan"] as { criteria: Record<string, string | null> }).criteria)).map(([key, text]) => [key, text ? (JSON.parse(text) as Row) : {}]));
        // Jev answers as in attempt 2 (its pick among these options by its line); not shown now: the rollout's best (Jev's usual pick).
        jevPick = Object.keys(options).find((key) => at.chosenText !== null && normal(options[key]!["plays"]) === at.chosenText) ?? null;
        if (jevPick === null) {
          assumed = true;
          jevPick = Object.keys(options).find((key) => options[key]!["rollout_best"] === true) ?? Object.keys(options)[0] ?? null;
        }
        if (jevPick !== null) {
          const resolved = ask.resolve({ plan: { type: "choice", choice: jevPick, probabilities: { [jevPick]: 0.95 }, confidence: 0.95, raw: {} } } as unknown as AnswerSet);
          explored = asRow(asRow(resolved.log)["sl_explore"]);
        }
      }
      const replacement = explored && typeof explored["replacement"] === "string" ? explored["replacement"] : null;
      const original = explored && typeof explored["original"] === "string" ? explored["original"] : null;
      // The logged question on that board (attempt 2, live): the lines' numbers as shown then, and B2's order where it ranked.
      const sim = asRow(at.logged["boss_sim"]);
      const ranked = Array.isArray(sim["ranked"]) && sim["low_trust"] === false ? (sim["ranked"] as string[]) : null;
      const textOfKey = new Map([...at.loggedByText.entries()].map(([text, entry]) => [entry.key, text]));
      const b2Untried = ranked ? ranked.map((key) => textOfKey.get(key) ?? key).filter((text) => !target.excluded.includes(text)) : null;
      // Live, B2 ranks a boss it is trusted on: the replacement is B2's first among the untried lines the rollout does not see
      // dying more often (all of them when none is), of those shown now. Offline B2 is off (the rollout ranks): B2's pick from
      // the logged question's order, for comparison.
      const own = original ? at.point.dead?.[original] : undefined;
      const untriedNow = (at.point.alternatives ?? []).filter((text) => !target.excluded.includes(text));
      const notWorse = own === undefined ? [] : untriedNow.filter((text) => (at.point.dead?.[text] ?? Infinity) <= own + 1e-9);
      const pool = notWorse.length > 0 ? notWorse : untriedNow;
      // B2's first among the pool; lines it reads the same as that one (win rate, HP lost when won) go to the rollout, whose
      // choice offline is the replacement (combat-plan rank: rankByOrder).
      const b2Key = (text: string | null) => {
        const key = text ? at.loggedByText.get(text)?.key : undefined;
        const line = key ? asRow(asRow(sim["lines"])[key]) : null;
        return line && typeof line["win"] === "number" ? `${Math.round((line["win"] as number) * 1000)}|${line["won_loss"] ?? "none"}` : null;
      };
      const b2First = b2Untried ? (b2Untried.find((text) => pool.includes(text)) ?? null) : null;
      const b2Tied = b2First && b2Key(b2First) !== null ? pool.filter((text) => b2Key(text) === b2Key(b2First)) : [];
      const b2Pick = b2Tied.length >= 2 && replacement && b2Tied.includes(replacement) ? replacement : b2First;
      const b2Win = (text: string | null) => {
        const key = text ? at.loggedByText.get(text)?.key : undefined;
        const line = key ? asRow(asRow(sim["lines"])[key]) : null;
        return line && typeof line["win"] === "number" ? `B2 win ${Math.round((line["win"] as number) * 1000) / 10}%` : null;
      };
      const result = {
        run: fight.run,
        floor: fight.floor,
        attempt,
        target: { turn: target.turn, back: target.back, round: target.round, point: target.point, excluded: target.excluded, label: at.point.label, logged_label: at.loggedLabel, dead: at.point.dead ?? null },
        why,
        jev_pick: { key: jevPick, assumed },
        original,
        replacement,
        reason: explored?.["reason"] ?? (decision?.kind === "act" ? `the board is code's own now (${decision.label})` : "no question"),
        numbers: explored?.["numbers"] ?? null,
        logged: {
          original: original ? loggedNumbers(at.loggedByText.get(original)?.option) : null,
          replacement: replacement ? loggedNumbers(at.loggedByText.get(replacement)?.option) : null,
          replacement_shown_then: replacement ? at.loggedByText.has(replacement) : null,
          b2: ranked ? { original: b2Win(original), replacement: b2Win(replacement), untried_order: b2Untried, live_pick: b2Pick, live_pick_win: b2Win(b2Pick) } : null,
        },
      };
      writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
      console.log(`  a${attempt}: ${target.point} (${why})\n      ${original ?? "?"}  ->  ${replacement ?? "(none)"} (${result.reason})${assumed ? " [Jev's pick assumed: the rollout's best]" : ""}\n      now: ${JSON.stringify(result.numbers)}\n      logged: ${JSON.stringify(result.logged)}`);
      // The next attempts see this one: attempt 2's path with the replacement played on the target's board, reached.
      const points = path.map((entry) => (entry.point.board === target.board ? { ...entry.point, line: replacement ?? entry.point.line, ...(replacement ? { explored: true as const } : {}) } : entry.point));
      rowsSoFar.push({ attempt, turns: deathTurn, result: "predicted_death", explore: { points, target: target as SlTarget, deviation: { reached: true, original, replacement, reason: String(result.reason) } } });
    }
  }
  console.log(`wrote ${out}`);
}

void main();
