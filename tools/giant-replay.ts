/**
 * Offline replay of the Waterfall Giant's modelling in the 5-turn rollout (ops 2026-10-04, AKK09TEEEXKD F17: the Giant
 * kept at 1-6 HP for ~8 turns): every logged planning decision of every Giant fight (each SL attempt apart) is rebuilt
 * from its logged state and planned by the current code twice, as live (the rollout and the random potions' Monte Carlo
 * on a frozen clock: the full 5 turns x 8 samples, the board's seeds; the whole-fight boss simulation B2 off):
 *   - before: rollout.ts eruptionOptions off (the end-of-horizon clock without the blast, a living Giant drawing its
 *     Explode from the move model), the rollout as it was;
 *   - after: both on (giantTerminal, DEATH_MOVES kept out of a living enemy's moves).
 * No model is called.
 *
 * Per decision: code plays alone or asks Jev (before, after); the line code plays or the rollout's best (or the lines
 * tied for it); whether that line kills the Giant this turn (into its husk); the rollout's best killing line and best
 * other line (value, expected loss, deaths and wins per 8 samples, win chance) before and after; what the log played.
 *
 * Usage: npx tsx tools/giant-replay.ts run [--shards 4] [--work experiments/giant-replay] [--limit N] [--run RUN_ID]
 *        npx tsx tools/giant-replay.ts report [--work …] [--out experiments/giant-replay/summary.md]
 * Output: <work>/giant-replay-<I>.jsonl (a row a decision) and the report.
 */
import { execFileSync, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv, type ScreenMemory } from "../src/project/types.js";
import { facingFightOf, planCombatTurn, thiefTrace } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { eruptionOptions, type LineEstimate } from "../src/strategy/rollout.js";
import { effectiveFightLoss, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import type { Plan } from "../src/strategy/turn-solver.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const stage = process.argv[2] ?? "run";
const work = arg("work", "experiments/giant-replay");
const STATES = "logs/states.jsonl";
const PY = ".cache/logdb-venv/bin/python";
/** Labels of a fresh plan of the turn (tools/mech-move-replay.ts's). */
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
const HUSK = 999_999_999;

type Row = Record<string, unknown>;

function traced(): typeof thiefTrace.last {
  return thiefTrace.last;
}

function query(sql: string): Row[] {
  const out = execFileSync(PY, ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

function playsOf(plan: Plan): string {
  return plan.steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", ") || "end turn";
}

function criteriaOf(decision: Decision | null): Record<string, Row> {
  if (!decision || decision.kind !== "ask") return {};
  const criteria = (decision.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  // plan<N>: the lines; p<N>: a random potion's "drink now, then re-plan" (its plays text names the potion).
  return Object.fromEntries(Object.entries(criteria).filter(([key]) => /^p(lan)?\d+$/.test(key)).map(([key, text]) => [key, (text ? JSON.parse(text) : {}) as Row]));
}

const normal = (plays: unknown): string => String(plays ?? "").replace(/, then /g, ", ").replace(/^nothing \(end the turn now\)$/, "end turn");

/** The line a logged decision played: the rationale's plan text (tools/mech-move-replay.ts playedOf). */
function playedOf(rationale: string): string | null {
  const jev = /chose plan \d+\/\d+ \((.*?)\)(?: with confidence|; plan)/.exec(rationale);
  if (jev) return jev[1]!;
  const code = /^(?:code plan \([^)]*\)|lethal|every simulated line dies; [^:]*|mod says ending the turn is lethal, solver disagrees; not ending it|code plan [^;]*is over the HP guard bound; playing) ?:? ?(.*?)(?:; hp [-+]| \(| \[|$)/.exec(rationale);
  return code ? code[1]!.trim() : null;
}

/** One rollout line as the report reads it. */
interface Rolled {
  plays: string;
  value: number;
  /** Expected HP lost to the fight's end with the potions' cost (effectiveFightLoss). */
  loss: number;
  deaths: number;
  wins: number;
  samples: number;
  win: number;
}

function rolledOf(line: LineEstimate | undefined): Rolled | null {
  if (!line) return null;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return { plays: playsOf(line.plan), value: r1(line.value), loss: r1(effectiveFightLoss(line)), deaths: line.deaths, wins: line.wins, samples: line.samples, win: Math.round((line.winProb ?? 0) * 100) };
}

/** A line that kills the Giant this turn: its husk explodes at the end of the next turn. */
const kills = (plan: Plan | undefined): boolean => (plan?.outcome.explodesNext ?? 0) > 0;

interface Side {
  kind: string;
  label: string;
  /** The line code plays (act), else the rollout's best shown line; null with ties (tied lists them). */
  line: string | null;
  lineKills: boolean | null;
  lineDiesNow: boolean | null;
  tied: string[];
  saturated: boolean;
  shown: string[];
  killShown: string[];
  killBest: Rolled | null;
  keepBest: Rolled | null;
  /** The rollout's numbers of the side's line, and of the logged line. */
  lineRolled: Rolled | null;
  loggedRolled: Rolled | null;
  /** After only: this rollout's numbers of the line the before side played or flagged (the same samples as lineRolled). */
  prevRolled?: Rolled | null;
}

export interface GiantReplayRow {
  run: string;
  floor: number;
  turn: number;
  attempt: number;
  attempts: number;
  asc: number;
  outcome: string;
  hp: number;
  block: number;
  giantHp: number;
  eruption: number;
  move: string;
  killable: boolean;
  logged: { label: string; decider: string; played: string | null; killed: boolean | null };
  before: Side;
  after: Side;
  /** The death-move filter alone (the blast terminal off): which fix moves what. */
  filterOnly: Side;
}

function shard(): void {
  const index = Number(arg("shard", "0"));
  const shards = Number(arg("shards", "1"));
  const limit = Number(arg("limit", "1000000"));
  const only = arg("run", "");
  mkdirSync(work, { recursive: true });
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  thiefTrace.enabled = true;
  const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
  const config = loadConfig({} as NodeJS.ProcessEnv);
  const fights = query(`SELECT run_id, fight_no, floor, ascension, encounter, outcome, first_off, last_off, first_ts FROM fights WHERE list_contains(monsters, 'WATERFALL_GIANT')${only ? ` AND run_id = '${only}'` : ""} ORDER BY first_ts`);
  const fd = openSync(STATES, "r");
  const stateAt = (off: number, len: number): Record<string, unknown> => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>;
  };
  const out = join(work, `giant-replay-${index}.jsonl`);
  writeFileSync(out, "");
  let done = 0;
  fights.forEach((fight, fightIndex) => {
    if (fightIndex % shards !== index || done >= limit) return;
    const run = String(fight["run_id"]);
    const frames = query(`SELECT off, len, ts, turn, observed, player_hp, enemies, screen FROM frames WHERE run_id = '${run}' AND off BETWEEN ${Number(fight["first_off"])} AND ${Number(fight["last_off"]) + 1} ORDER BY off`);
    const decisions = query(`SELECT ts, turn, label, decider, rationale, action, target_index FROM decisions WHERE run_id = '${run}' AND floor = ${Number(fight["floor"])} AND screen = 'COMBAT' AND ts >= '${String(fight["first_ts"])}' ORDER BY ts`);
    // Decision frames of the fight, split into SL attempts (an attempt starts again at turn 1: the room-entry save).
    const own = frames.filter((frame) => frame["observed"] !== true && frame["screen"] === "COMBAT" && frame["turn"] !== null);
    const attemptOf = new Map<Row, number>();
    let attempt = 0;
    let lastTurn = 0;
    for (const frame of own) {
      if (Number(frame["turn"]) < lastTurn) attempt += 1;
      lastTurn = Number(frame["turn"]);
      attemptOf.set(frame, attempt);
    }
    const attempts = attempt + 1;
    const seen = new Set<string>();
    for (const decision of decisions) {
      if (done >= limit) break;
      const turn = Number(decision["turn"]);
      if (!PLANNING.test(String(decision["label"]))) continue;
      const frame = own.find((entry) => entry["ts"] === decision["ts"]);
      if (!frame) continue;
      const at = attemptOf.get(frame)!;
      const raw = stateAt(Number(frame["off"]), Number(frame["len"]));
      const combat = (raw["combat"] as Row | undefined) ?? {};
      const enemies = ((combat["enemies"] as Row[] | undefined) ?? []).filter((enemy) => enemy["is_alive"] !== false);
      const giant = enemies.find((enemy) => String(enemy["enemy_id"]) === "WATERFALL_GIANT");
      if (!giant) continue;
      const player = (((combat["players"] as Row[] | undefined) ?? [])[0] ?? {}) as Row;
      const hand = ((combat["hand"] as Row[] | undefined) ?? []).map((card) => String(card["card_id"])).join(",");
      const key = `${at}:${turn}:${player["current_hp"]}:${player["block"]}:${player["energy"]}:${giant["current_hp"]}:${hand}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const outcome = at < attempts - 1 ? "died" : String(fight["outcome"] ?? "?");
      const state = parseGameState(raw);
      const earlier = decisions.filter((entry) => String(entry["ts"]) < String(decision["ts"]) && entry["target_index"] !== null && entry["target_index"] !== undefined && entry["action"] !== "end_turn");
      const facing = earlier.length > 0 ? Number(earlier[earlier.length - 1]!["target_index"]) : null;
      const played = playedOf(String(decision["rationale"] ?? ""));
      const plan = (on: boolean, prev: string | null = null, filter = on): { side: Side; plans: Plan[] } => {
        eruptionOptions.blastTerminal = on;
        eruptionOptions.deathMoveFilter = filter;
        const env: DecisionEnv = {
          state, knowledge, brief: buildRunBrief(state, knowledge),
          screenMemory: { ...createScreenMemory("COMBAT"), ...(facing !== null ? { facing, facingFight: facingFightOf(state) } : {}) } as ScreenMemory,
          thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [],
          jevContext: "v1", buildDecider: "deepseek", mechRules: true, mechMoveRules: true, mechDeathMove: true, thiefFacts: true,
        };
        thiefTrace.last = null;
        const decision = planCombatTurn(env);
        const trace = traced();
        const plans = trace?.plans ?? [];
        const criteria = criteriaOf(decision);
        const shownPlans = Object.values(criteria);
        const best = shownPlans.find((option) => option["rollout_best"] === true);
        const rollout = trace?.rollout?.available ? trace.rollout : null;
        const lines = rollout ? rollout.result.lines : [];
        const byValue = (list: LineEstimate[]) => [...list].sort((a, b) => b.value - a.value)[0];
        const find = (plays: string | null) => (plays === null ? undefined : plans.find((candidate) => playsOf(candidate) === plays) ?? lines.find((entry) => playsOf(entry.plan) === plays)?.plan);
        const actLine = decision?.kind === "act" ? playedOf(decision.rationale) : null;
        const line = decision?.kind === "act" ? actLine : best ? normal(best["plays"]) : null;
        const linePlan = find(line);
        const rolledFor = (plays: string | null) => (plays === null ? null : rolledOf(lines.find((entry) => playsOf(entry.plan) === plays)));
        const side: Side = {
          kind: decision?.kind ?? "none",
          label: decision?.label ?? "",
          line,
          lineKills: linePlan ? kills(linePlan) : null,
          lineDiesNow: linePlan ? linePlan.outcome.dies : null,
          tied: decision?.kind === "ask" && !best ? (rollout?.tied ?? []).map(playsOf) : [],
          saturated: rollout?.saturated ?? false,
          shown: shownPlans.map((option) => normal(option["plays"])),
          killShown: shownPlans.filter((option) => kills(find(normal(option["plays"])))).map((option) => normal(option["plays"])),
          killBest: rolledOf(byValue(lines.filter((entry) => kills(entry.plan)))),
          keepBest: rolledOf(byValue(lines.filter((entry) => !kills(entry.plan) && !entry.plan.outcome.winsFight))),
          lineRolled: rolledFor(line),
          loggedRolled: rolledFor(played),
          ...(on ? { prevRolled: rolledFor(prev) } : {}),
        };
        return { side, plans };
      };
      const before = plan(false);
      const filterOnly = plan(false, null, true);
      const after = plan(true, before.side.line);
      const loggedPlan = before.plans.find((candidate) => playsOf(candidate) === played) ?? after.plans.find((candidate) => playsOf(candidate) === played);
      const row: GiantReplayRow = {
        run, floor: Number(fight["floor"]), turn, attempt: at, attempts, asc: Number(fight["ascension"]), outcome,
        hp: Number(player["current_hp"] ?? frame["player_hp"]), block: Number(player["block"] ?? 0),
        giantHp: Number(giant["current_hp"]), eruption: Number(((giant["powers"] as Row[] | undefined) ?? []).find((power) => power["power_id"] === "STEAM_ERUPTION_POWER")?.["amount"] ?? 0),
        move: String(giant["move_id"] ?? ""),
        killable: Number(giant["max_hp"]) < HUSK && (before.plans.some(kills) || after.plans.some(kills)),
        logged: { label: String(decision["label"]), decider: String(decision["decider"]), played, killed: loggedPlan ? kills(loggedPlan) : null },
        before: before.side,
        after: after.side,
        filterOnly: filterOnly.side,
      };
      writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
      done += 1;
      const changed = row.before.line !== row.after.line || row.before.kind !== row.after.kind;
      console.error(`${run} F${row.floor} #${at + 1} T${turn} ${row.hp}hp G${row.giantHp}: ${row.before.kind}/${row.after.kind}${changed ? ` CHANGE ${row.before.line ?? `tied(${row.before.tied.length})`} -> ${row.after.line ?? `tied(${row.after.tied.length})`}` : ""}`);
    }
  });
  closeSync(fd);
  console.error(`shard ${index}: ${done} decisions -> ${out}`);
}

function report(): void {
  const outPath = arg("out", join(work, "summary.md"));
  const rows: GiantReplayRow[] = [];
  for (const file of readdirSync(work).filter((name) => /^giant-replay-\d+\.jsonl$/.test(name)).sort()) {
    for (const line of readFileSync(join(work, file), "utf8").split("\n")) if (line) rows.push(JSON.parse(line) as GiantReplayRow);
  }
  rows.sort((a, b) => (a.run < b.run ? -1 : a.run > b.run ? 1 : a.floor - b.floor || a.attempt - b.attempt || a.turn - b.turn));
  const where = (row: GiantReplayRow) => `${row.run} F${row.floor}${row.attempts > 1 ? ` #${row.attempt + 1}` : ""} T${row.turn}`;
  const r = (x: Rolled | null) => (x ? `${x.value} (loss ${x.loss}, dead ${x.deaths}/${x.samples}, won ${x.wins}, win ${x.win}%)` : "—");
  const lineText = (side: Side) => (side.line ?? (side.tied.length > 0 ? `tied: ${side.tied.join(" | ")}` : "-")) + (side.lineKills ? " [kills]" : "");
  const changed = rows.filter((row) => row.before.line !== row.after.line || row.before.kind !== row.after.kind);
  const toKill = changed.filter((row) => row.before.lineKills !== true && row.after.lineKills === true);
  const toKeep = changed.filter((row) => row.before.lineKills === true && row.after.lineKills !== true);
  const killable = rows.filter((row) => row.killable);
  const fights = new Set(rows.map((row) => `${row.run}:${row.floor}`)).size;
  const attempts = new Set(rows.map((row) => `${row.run}:${row.floor}:${row.attempt}`)).size;
  // A line that now dies this turn where the old one did not, or that the after-rollout itself rates as dying more often.
  const diesNow = changed.filter((row) => row.after.lineDiesNow === true && row.before.lineDiesNow !== true);
  const moreDeaths = changed.filter((row) => {
    const a = row.after.lineRolled;
    const b = row.before.line !== null ? row.after.loggedRolled && row.before.line === row.logged.played ? row.after.loggedRolled : null : null;
    return a !== null && b !== null && a.deaths > b.deaths;
  });
  const mean = (xs: (number | null | undefined)[]) => {
    const known = xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
    return known.length > 0 ? Math.round((known.reduce((s, x) => s + x, 0) / known.length) * 10) / 10 : null;
  };
  // The rollout's win chance for the line the log played, against the attempt's outcome (Brier: lower is better).
  const scored = rows.filter((row) => (row.outcome === "won" || row.outcome === "died") && row.before.loggedRolled && row.after.loggedRolled);
  const brier = (list: GiantReplayRow[], side: (row: GiantReplayRow) => Side | undefined) => {
    const known = list.filter((row) => side(row)?.loggedRolled);
    const value = known.reduce((sum, row) => sum + (side(row)!.loggedRolled!.win / 100 - (row.outcome === "won" ? 1 : 0)) ** 2, 0) / Math.max(1, known.length);
    return `${Math.round(value * 10000) / 10000} (n=${known.length})`;
  };
  const bands: [string, (row: GiantReplayRow) => boolean][] = [
    ["Giant at 30 HP or less", (row) => row.giantHp <= 30],
    ["31-120 HP", (row) => row.giantHp > 30 && row.giantHp <= 120],
    ["over 120 HP", (row) => row.giantHp > 120 && row.giantHp < HUSK],
    ["husk", (row) => row.giantHp >= HUSK],
    ["A8", (row) => row.asc === 8],
    ["A9", (row) => row.asc === 9],
  ];
  const calibration = [
    "| decisions | won | before | death-move filter only | after |",
    "|---|---|---|---|---|",
    `| all ${scored.length} | ${scored.filter((row) => row.outcome === "won").length} | ${brier(scored, (row) => row.before)} | ${brier(scored, (row) => row.filterOnly)} | ${brier(scored, (row) => row.after)} |`,
    ...bands.map(([name, test]) => {
      const list = scored.filter(test);
      return `| ${name}: ${list.length} | ${list.filter((row) => row.outcome === "won").length} | ${brier(list, (row) => row.before)} | ${brier(list, (row) => row.filterOnly)} | ${brier(list, (row) => row.after)} |`;
    }),
  ];
  // Changed decisions: the new line's deaths within the horizon against the old line's, both in the after rollout.
  const compared = changed.filter((row) => row.after.prevRolled && row.after.lineRolled);
  const diesMore = compared.filter((row) => row.after.lineRolled!.deaths > row.after.prevRolled!.deaths);
  const diesLess = compared.filter((row) => row.after.lineRolled!.deaths < row.after.prevRolled!.deaths);
  const filterChanged = rows.filter((row) => row.before.line !== row.filterOnly.line || row.before.kind !== row.filterOnly.kind).length;
  // Per attempt: the first decision whose line kills the Giant (code's own or the rollout's best), logged vs after.
  const attemptKeys = [...new Set(rows.map((row) => `${row.run}:${row.floor}:${row.attempt}`))];
  const earlier = attemptKeys.flatMap((key) => {
    const list = rows.filter((row) => `${row.run}:${row.floor}:${row.attempt}` === key);
    const loggedKill = list.find((row) => row.logged.killed === true);
    const afterKill = list.find((row) => row.after.lineKills === true);
    const beforeKill = list.find((row) => row.before.lineKills === true);
    return afterKill && (!loggedKill || afterKill.turn < loggedKill.turn) && (!beforeKill || afterKill.turn < beforeKill.turn) ? [{ key, loggedKill, afterKill, beforeKill }] : [];
  });
  const md = [
    "# Waterfall Giant: rollout replay (blast at the horizon, no Explode while alive)",
    "",
    "`npx tsx tools/giant-replay.ts run`: every logged planning decision of every Waterfall Giant fight (each SL attempt apart), rebuilt from its state and planned by the current code twice on a frozen clock (5 turns x 8 samples, the board's seeds; B2 off): before = rollout.ts eruptionOptions off, after = on. No model called.",
    "",
    `${rows.length} decisions in ${fights} fights (${attempts} attempts); ${killable.length} with a line that kills the Giant this turn.`,
    `Code plays alone: before ${rows.filter((row) => row.before.kind === "act").length}, after ${rows.filter((row) => row.after.kind === "act").length}; asks Jev: before ${rows.filter((row) => row.before.kind === "ask").length}, after ${rows.filter((row) => row.after.kind === "ask").length}.`,
    `Changed (code's line, or the rollout's best / ties): ${changed.length}; to a killing line ${toKill.length}, away from one ${toKeep.length}; the new line dies this turn where the old did not: ${diesNow.length}.`,
    `Saturated boards (every line loses all our HP): before ${rows.filter((row) => row.before.saturated).length}, after ${rows.filter((row) => row.after.saturated).length}.`,
    `The death-move filter alone changes ${filterChanged} decisions.`,
    `Changed decisions with both lines in the after rollout: ${compared.length}; the new line dies within the horizon more often in ${diesMore.length}${diesMore.length > 0 ? ` (${diesMore.map((row) => `${where(row)}: ${row.after.prevRolled!.deaths} -> ${row.after.lineRolled!.deaths}/${row.after.lineRolled!.samples}`).join(", ")})` : ""}, less often in ${diesLess.length}.`,
    `Attempts where a killing line now comes earlier than both the log and the old rollout: ${earlier.length}${earlier.length > 0 ? ` (${earlier.map((entry) => `${where(entry.afterKill)} (logged ${entry.loggedKill ? `T${entry.loggedKill.turn}` : "no kill"})`).join(", ")})` : ""}.`,
    "",
    "## The win chance of the line the log played, against the attempt's outcome (Brier, lower is better)",
    "",
    ...calibration,
    "",
    "On the turns with a killing line, the rollout's best killing line and best other line (value, mean):",
    `kill: before ${mean(killable.map((row) => row.before.killBest?.value))} -> after ${mean(killable.map((row) => row.after.killBest?.value))}; keep it alive: before ${mean(killable.map((row) => row.before.keepBest?.value))} -> after ${mean(killable.map((row) => row.after.keepBest?.value))}.`,
    `win chance kill: before ${mean(killable.map((row) => row.before.killBest?.win))}% -> after ${mean(killable.map((row) => row.after.killBest?.win))}%; keep: before ${mean(killable.map((row) => row.before.keepBest?.win))}% -> after ${mean(killable.map((row) => row.after.keepBest?.win))}%.`,
    "",
    "## Turns with a killing line",
    "",
    "| decision | HP / block | Giant HP, stacks | logged (kills?) | before | after | kill best before -> after | keep best before -> after |",
    "|---|---|---|---|---|---|---|---|",
    ...killable.map((row) => `| ${where(row)} ${row.outcome === "won" ? "(won)" : ""} | ${row.hp} / ${row.block} | ${row.giantHp}, ${row.eruption} | ${row.logged.played ?? "?"} (${row.logged.killed === null ? "?" : row.logged.killed ? "kills" : "no"}) | ${row.before.kind}: ${lineText(row.before)} | ${row.after.kind}: ${lineText(row.after)} | ${r(row.before.killBest)} -> ${r(row.after.killBest)} | ${r(row.before.keepBest)} -> ${r(row.after.keepBest)} |`),
    "",
    "## Every changed decision",
    "",
    "| decision | HP | Giant HP | before | after | after's rollout: new line | after's rollout: logged line |",
    "|---|---|---|---|---|---|---|",
    ...changed.map((row) => `| ${where(row)} | ${row.hp} | ${row.giantHp} | ${row.before.kind}: ${lineText(row.before)} | ${row.after.kind}: ${lineText(row.after)} | ${r(row.after.lineRolled)} | ${r(row.after.loggedRolled)} |`),
    "",
    `More deaths in the after-rollout for the new line than for the line logged (code's own changes): ${moreDeaths.length}${moreDeaths.length > 0 ? ` (${moreDeaths.map(where).join(", ")})` : ""}.`,
  ].join("\n");
  writeFileSync(outPath, md);
  console.log(`report: ${rows.length} decisions -> ${outPath}`);
}

async function runAll(): Promise<void> {
  const shards = Number(arg("shards", "4"));
  mkdirSync(work, { recursive: true });
  const pass = ["work", "limit", "run"].flatMap((name) => (process.argv.includes(`--${name}`) ? [`--${name}`, arg(name, "")] : []));
  await Promise.all(
    Array.from({ length: shards }, (_, i) =>
      new Promise<void>((resolve, reject) => {
        const child = spawn("nice", ["-n", "10", "npx", "tsx", "tools/giant-replay.ts", "shard", "--shard", String(i), "--shards", String(shards), ...pass], { stdio: ["ignore", "inherit", "inherit"] });
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`shard ${i} exited ${code}`))));
      }),
    ),
  );
  report();
}

if (stage === "shard") shard();
else if (stage === "report") report();
else await runAll();
