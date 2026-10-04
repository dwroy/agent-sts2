/**
 * Offline replay of DEATH_MOVES for the living enemies other than the Waterfall Giant (rollout.ts deathMoveOptions;
 * ops 2026-10-04 follow-up): the Test Subject's Respawn, a Decimillipede segment's Dead and Reattach, the Eye With
 * Teeth's Revive (Fogmog's summon), moves the logs only ever show on a dead enemy that the move model offered to living
 * ones. Every logged planning decision of every such fight (each SL attempt apart) with one of them on the board is
 * rebuilt from its logged state and planned by the current code twice, as live (the rollout and the random potions' Monte
 * Carlo on a frozen clock: 5 turns x 8 samples, the board's seeds; the whole-fight boss simulation B2 off): before =
 * deathMoveOptions.others off (the Giant's own fixes on both times), after = on. No model is called.
 *
 * Per decision: code plays alone or asks Jev; the line code plays or the rollout's best (or the lines tied for it); the
 * rollout's numbers of that line, of the line the log played and (after) of the line before played; the attempt's outcome.
 *
 * Usage: npx tsx tools/living-death-moves-replay.ts run [--shards 4] [--work experiments/living-death-moves] [--group test-subject|decimillipede|fogmog] [--limit N]
 *        npx tsx tools/living-death-moves-replay.ts report [--work …]
 * Output: <work>/death-moves-<I>.jsonl (a row a decision, not committed) and <work>/summary.md.
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
import { deathMoveOptions, type LineEstimate } from "../src/strategy/rollout.js";
import { effectiveFightLoss, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import type { Plan } from "../src/strategy/turn-solver.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const stage = process.argv[2] ?? "run";
const work = arg("work", "experiments/living-death-moves");
const STATES = "logs/states.jsonl";
const PY = ".cache/logdb-venv/bin/python";
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;

/** The fights of each group (a monster in the fight's list) and the enemies whose presence on a board makes it a row. */
const GROUPS: Record<string, { monster: string; board: string[] }> = {
  "test-subject": { monster: "TEST_SUBJECT", board: ["TEST_SUBJECT"] },
  decimillipede: { monster: "DECIMILLIPEDE_SEGMENT_FRONT", board: ["DECIMILLIPEDE_SEGMENT_FRONT", "DECIMILLIPEDE_SEGMENT_MIDDLE", "DECIMILLIPEDE_SEGMENT_BACK"] },
  fogmog: { monster: "FOGMOG", board: ["EYE_WITH_TEETH"] },
};

type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(PY, ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

function playsOf(plan: Plan): string {
  return plan.steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", ") || "end turn";
}

/** plan<N>: the lines; p<N>: a random potion's "drink now, then re-plan". */
function criteriaOf(decision: Decision | null): Record<string, Row> {
  if (!decision || decision.kind !== "ask") return {};
  const criteria = (decision.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
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

interface Rolled {
  plays: string;
  value: number;
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

interface Side {
  kind: string;
  label: string;
  /** The line code plays (act), else the rollout's best shown option; null with ties. */
  line: string | null;
  lineDiesNow: boolean | null;
  tied: string[];
  saturated: boolean;
  lineRolled: Rolled | null;
  loggedRolled: Rolled | null;
  /** After only: this rollout's numbers of the before side's line. */
  prevRolled?: Rolled | null;
}

interface ReplayRow {
  group: string;
  run: string;
  floor: number;
  turn: number;
  attempt: number;
  attempts: number;
  asc: number;
  outcome: string;
  hp: number;
  logged: { label: string; decider: string; played: string | null };
  before: Side;
  after: Side;
}

function shard(): void {
  const index = Number(arg("shard", "0"));
  const shards = Number(arg("shards", "1"));
  const limit = Number(arg("limit", "1000000"));
  const only = arg("group", "");
  mkdirSync(work, { recursive: true });
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  thiefTrace.enabled = true;
  const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
  const config = loadConfig({} as NodeJS.ProcessEnv);
  const groups = Object.entries(GROUPS).filter(([name]) => !only || name === only);
  const fights = groups.flatMap(([name, group]) =>
    query(`SELECT run_id, floor, ascension, outcome, first_off, last_off, first_ts FROM fights WHERE list_contains(monsters, '${group.monster}') ORDER BY first_ts`).map((fight) => ({ ...fight, group: name })),
  );
  const fd = openSync(STATES, "r");
  const stateAt = (off: number, len: number): Record<string, unknown> => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>;
  };
  const out = join(work, `death-moves-${index}.jsonl`);
  writeFileSync(out, "");
  let done = 0;
  fights.forEach((fight, fightIndex) => {
    if (fightIndex % shards !== index || done >= limit) return;
    const group = GROUPS[String(fight["group"])]!;
    const run = String(fight["run_id"]);
    const frames = query(`SELECT off, len, ts, turn, observed, player_hp, screen FROM frames WHERE run_id = '${run}' AND off BETWEEN ${Number(fight["first_off"])} AND ${Number(fight["last_off"]) + 1} ORDER BY off`);
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
      const enemies = (combat["enemies"] as Row[] | undefined) ?? [];
      if (!enemies.some((enemy) => group.board.includes(String(enemy["enemy_id"])))) continue;
      const player = (((combat["players"] as Row[] | undefined) ?? [])[0] ?? {}) as Row;
      const hand = ((combat["hand"] as Row[] | undefined) ?? []).map((card) => String(card["card_id"])).join(",");
      const key = `${at}:${turn}:${player["current_hp"]}:${player["block"]}:${player["energy"]}:${enemies.map((enemy) => `${enemy["current_hp"]}`).join("/")}:${hand}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const state = parseGameState(raw);
      const earlier = decisions.filter((entry) => String(entry["ts"]) < String(decision["ts"]) && entry["target_index"] !== null && entry["target_index"] !== undefined && entry["action"] !== "end_turn");
      const facing = earlier.length > 0 ? Number(earlier[earlier.length - 1]!["target_index"]) : null;
      const played = playedOf(String(decision["rationale"] ?? ""));
      const plan = (on: boolean, prev: string | null = null): Side => {
        deathMoveOptions.others = on;
        const env: DecisionEnv = {
          state, knowledge, brief: buildRunBrief(state, knowledge),
          screenMemory: { ...createScreenMemory("COMBAT"), ...(facing !== null ? { facing, facingFight: facingFightOf(state) } : {}) } as ScreenMemory,
          thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [],
          jevContext: "v1", buildDecider: "deepseek", mechRules: true, mechMoveRules: true, mechDeathMove: true, thiefFacts: true,
        };
        thiefTrace.last = null;
        const decided = planCombatTurn(env);
        const trace = thiefTrace.last as typeof thiefTrace.last;
        const plans = trace?.plans ?? [];
        const shownPlans = Object.values(criteriaOf(decided));
        const best = shownPlans.find((option) => option["rollout_best"] === true);
        const rollout = trace?.rollout?.available ? trace.rollout : null;
        const lines = rollout ? rollout.result.lines : [];
        const line = decided?.kind === "act" ? playedOf(decided.rationale) : best ? normal(best["plays"]) : null;
        const linePlan = line === null ? undefined : plans.find((candidate) => playsOf(candidate) === line) ?? lines.find((entry) => playsOf(entry.plan) === line)?.plan;
        const rolledFor = (plays: string | null) => (plays === null ? null : rolledOf(lines.find((entry) => playsOf(entry.plan) === plays)));
        return {
          kind: decided?.kind ?? "none",
          label: decided?.label ?? "",
          line,
          lineDiesNow: linePlan ? linePlan.outcome.dies : null,
          tied: decided?.kind === "ask" && !best ? (rollout?.tied ?? []).map(playsOf) : [],
          saturated: rollout?.saturated ?? false,
          lineRolled: rolledFor(line),
          loggedRolled: rolledFor(played),
          ...(on ? { prevRolled: rolledFor(prev) } : {}),
        };
      };
      const before = plan(false);
      const after = plan(true, before.line);
      const row: ReplayRow = {
        group: String(fight["group"]), run, floor: Number(fight["floor"]), turn, attempt: at, attempts, asc: Number(fight["ascension"]),
        outcome: at < attempts - 1 ? "died" : String(fight["outcome"] ?? "?"), hp: Number(player["current_hp"] ?? frame["player_hp"]),
        logged: { label: String(decision["label"]), decider: String(decision["decider"]), played },
        before, after,
      };
      writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
      done += 1;
      const changed = before.line !== after.line || before.kind !== after.kind;
      console.error(`${row.group} ${run} F${row.floor} #${at + 1} T${turn} ${row.hp}hp: ${before.kind}/${after.kind}${changed ? ` CHANGE ${before.line ?? `tied(${before.tied.length})`} -> ${after.line ?? `tied(${after.tied.length})`}` : ""}`);
    }
  });
  closeSync(fd);
  deathMoveOptions.others = true;
  console.error(`shard ${index}: ${done} decisions -> ${out}`);
}

function report(): void {
  const rows: ReplayRow[] = [];
  for (const file of readdirSync(work).filter((name) => /^death-moves-\d+\.jsonl$/.test(name)).sort()) {
    for (const line of readFileSync(join(work, file), "utf8").split("\n")) if (line) rows.push(JSON.parse(line) as ReplayRow);
  }
  rows.sort((a, b) => (a.group < b.group ? -1 : a.group > b.group ? 1 : a.run < b.run ? -1 : a.run > b.run ? 1 : a.floor - b.floor || a.attempt - b.attempt || a.turn - b.turn));
  const where = (row: ReplayRow) => `${row.run} F${row.floor}${row.attempts > 1 ? ` #${row.attempt + 1}` : ""} T${row.turn}`;
  const r = (x: Rolled | null | undefined) => (x ? `${x.value} (loss ${x.loss}, dead ${x.deaths}/${x.samples}, won ${x.wins}, win ${x.win}%)` : "—");
  const text = (side: Side) => side.line ?? (side.tied.length > 0 ? `tied: ${side.tied.join(" | ")}` : "-");
  const brier = (list: ReplayRow[], pick: (row: ReplayRow) => Side) => {
    const known = list.filter((row) => (row.outcome === "won" || row.outcome === "died") && row.before.loggedRolled && row.after.loggedRolled);
    const value = known.reduce((sum, row) => sum + (pick(row).loggedRolled!.win / 100 - (row.outcome === "won" ? 1 : 0)) ** 2, 0) / Math.max(1, known.length);
    return { n: known.length, won: known.filter((row) => row.outcome === "won").length, value: Math.round(value * 10000) / 10000 };
  };
  const lines: string[] = [
    "# DEATH_MOVES for the living enemies besides the Giant: rollout replay (tools/living-death-moves-replay.ts)",
    "",
    "Every logged planning decision with a Test Subject, a Decimillipede segment or an Eye With Teeth (Fogmog's summon) on the board, each SL attempt apart, planned by the current code twice on a frozen clock (5 turns x 8 samples, the board's seeds; B2 off): before = deathMoveOptions.others off, after = on (the Giant's own fixes on both times). No model called.",
    "",
    "| group | fights / attempts | decisions | code plays alone (before / after) | code's own play changed | Jev questions changed | new line dies this turn | new line dies more often (after rollout) / less often | Brier of the played line (before -> after, n, won) |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  const changedRows: ReplayRow[] = [];
  for (const group of [...new Set(rows.map((row) => row.group))]) {
    const list = rows.filter((row) => row.group === group);
    const changed = list.filter((row) => row.before.line !== row.after.line || row.before.kind !== row.after.kind);
    changedRows.push(...changed);
    const codeChanged = changed.filter((row) => row.before.kind === "act" || row.after.kind === "act");
    const askChanged = changed.filter((row) => row.before.kind === "ask" && row.after.kind === "ask");
    const diesNow = changed.filter((row) => row.after.lineDiesNow === true && row.before.lineDiesNow !== true);
    const compared = changed.filter((row) => row.after.prevRolled && row.after.lineRolled);
    const more = compared.filter((row) => row.after.lineRolled!.deaths > row.after.prevRolled!.deaths);
    const less = compared.filter((row) => row.after.lineRolled!.deaths < row.after.prevRolled!.deaths);
    const b = brier(list, (row) => row.before);
    const a = brier(list, (row) => row.after);
    lines.push(
      `| ${group} | ${new Set(list.map((row) => `${row.run}:${row.floor}`)).size} / ${new Set(list.map((row) => `${row.run}:${row.floor}:${row.attempt}`)).size} | ${list.length} | ${list.filter((row) => row.before.kind === "act").length} / ${list.filter((row) => row.after.kind === "act").length} | ${codeChanged.length} | ${askChanged.length} of ${list.filter((row) => row.before.kind === "ask").length} | ${diesNow.length} | ${more.length} / ${less.length} | ${b.value} -> ${a.value} (${a.n}, ${a.won}) |`,
    );
  }
  lines.push("", "## Every changed decision", "", "| decision | HP | before | after | after's rollout: new line | after's rollout: old line |", "|---|---|---|---|---|---|");
  for (const row of changedRows) lines.push(`| ${row.group}: ${where(row)} ${row.outcome} | ${row.hp} | ${row.before.kind}: ${text(row.before)} | ${row.after.kind}: ${text(row.after)} | ${r(row.after.lineRolled)} | ${r(row.after.prevRolled)} |`);
  writeFileSync(join(work, "summary.md"), `${lines.join("\n")}\n`);
  console.log(`report: ${rows.length} decisions -> ${join(work, "summary.md")}`);
}

async function runAll(): Promise<void> {
  const shards = Number(arg("shards", "4"));
  mkdirSync(work, { recursive: true });
  const pass = ["work", "limit", "group"].flatMap((name) => (process.argv.includes(`--${name}`) ? [`--${name}`, arg(name, "")] : []));
  await Promise.all(
    Array.from({ length: shards }, (_, i) =>
      new Promise<void>((resolve, reject) => {
        const child = spawn("nice", ["-n", "10", "npx", "tsx", "tools/living-death-moves-replay.ts", "shard", "--shard", String(i), "--shards", String(shards), ...pass], { stdio: ["ignore", "inherit", "inherit"] });
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`shard ${i} exited ${code}`))));
      }),
    ),
  );
  report();
}

if (stage === "shard") shard();
else if (stage === "report") report();
else await runAll();
