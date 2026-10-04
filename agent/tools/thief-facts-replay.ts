/**
 * Offline replay of THIEF_FACTS (docs/thief.md, src/reflex/thief.ts) on the logged A8+ Thieving Hopper and Gremlin
 * Merc fights. No model is called: each turn's first planning decision with a carrying thief alive is rebuilt from
 * its logged state (the log DB's state_index offset into logs/states.jsonl; read-only) and planned by the current code
 * twice, THIEF_FACTS off (the question as before) and on, with the fight's first frame noted in screen memory as the
 * live loop notes it, the rollout and the random potions' Monte Carlo given all the time they want (a frozen clock:
 * the full 5 turns x 8 samples, the seeds the board's).
 *
 * Per turn: the thieves (what they carry, turns left), whether some line the solver kept (surviving) kills one this
 * turn, whether the shown options (off, on) hold such a line, the rollout's best chance of the loot coming back before
 * the thief leaves among its lines and among the shown ones (off, on: rates from the on rollout, which plays the
 * escape), the rollout's best line off and on, and the line played that turn (the logged rationale). The off question's
 * digest (the test's: question, Jev's view, every answer's resolution) goes to <out>/digests.json for the identity
 * check against the pre-change planner (scratch script, notes/thief-facts-report.md).
 *
 * THIEF_COST (--cost, docs/thief.md §7, notes/thief-cost-report.md): the two questions are THIEF_FACTS on with
 * THIEF_COST off and on instead, the stolen card's value from tools/thief-card-values.ts (<cards>, its numbers read again
 * by the current cardHpOf) in screen memory as the loop leaves it, the gold at the potion table's rate. Per turn: the
 * rollout's best line off and on, its chance of the loot back, its HP this turn and later, its loot cost, auto-play vs
 * ask; the off question's digest (THIEF_FACTS on) for the identity check against ffed0d4. Output <out>/cost-results.jsonl,
 * <out>/cost-digests.json, <out>/cost-frames.json.
 *
 * Usage: npx tsx tools/thief-facts-replay.ts [--out experiments/thief-facts] [--limit N]   (limit: fights)
 *        npx tsx tools/thief-facts-replay.ts --cost [--out experiments/thief-cost] [--cards experiments/thief-cost/card-values.jsonl]
 *          [--potion-dir DIR]   (a potion table with the gold rate, when knowledge's has none yet)
 * Output: <out>/results.jsonl (one row a turn), <out>/digests.json (the off questions' digests), <out>/frames.json (the
 * frames replayed and their first-frame memory: the identity check runs the pre-change planner on them, e.g. a git
 * archive of 894f245 with this tree's knowledge data, and compares digests), and a line a turn on stdout;
 * notes/thief-facts-report.md is written from results.jsonl.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/core/config.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv, type ScreenMemory } from "../src/memory/types.js";
import { planCombatTurn, thiefTrace } from "../src/reflex/combat-plan.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { potionWorthSource } from "../src/knowledge/potion-equivalents.js";
import { rolloutLiveOptions, thiefSamples } from "../src/reflex/rollout-live.js";
import { backShare, killsThief, noteFightStart, thiefTag, thievesOf, type Thief } from "../src/reflex/thief.js";
import { cardHpOf, type ThiefCardValue } from "../src/sim/thief-card-hp.js";
import type { Plan } from "../src/reflex/turn-solver.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const costMode = process.argv.includes("--cost");
const outDir = arg("out", costMode ? fromRoot("experiments/thief-cost") : fromRoot("experiments/thief-facts"));
const cardsPath = arg("cards", fromRoot("experiments/thief-cost/card-values.jsonl"));
/** --cost: the directory of the potion table the questions read (the gold rate; default knowledge). */
const potionDir = arg("potion-dir", "");
const limit = Number(arg("limit", "100000"));
const STATES = fromRoot("logs/states.jsonl");
const PY = fromRoot("data/logdb-venv/bin/python");
/** Labels of a fresh plan of the turn (not a committed line's next step). */
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;

type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const fd = openSync(STATES, "r");
function stateAt(off: number, len: number): Row {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return JSON.parse(buffer.toString("utf8")) as Row;
}

const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

/** The hook's last record, read through a function (planCombatTurn sets it; a read after the reset would narrow to null). */
function traced(): typeof thiefTrace.last {
  return thiefTrace.last;
}

function envOf(state: GameState, memory: ScreenMemory, thiefFacts: boolean, thiefCost?: boolean): DecisionEnv {
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: memory, thresholds: config.thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek", thiefFacts,
    ...(thiefCost !== undefined ? { thiefCost } : {}),
  };
}

/** The stolen cards' values of tools/thief-card-values.ts by "<run>:<floor>", their HP read again by the current rules. */
function cardValues(): Map<string, ThiefCardValue> {
  const out = new Map<string, ThiefCardValue>();
  let text = "";
  try {
    text = readFileSync(cardsPath, "utf8");
  } catch {
    return out;
  }
  for (const line of text.split("\n").filter(Boolean)) {
    const row = JSON.parse(line) as ThiefCardValue & { run: string; floor: number };
    const value: ThiefCardValue = row.measures ? { ...row, ...cardHpOf(row.measures) } : row;
    out.set(`${row.run}:${row.floor}`, value);
  }
  return out;
}

/** The test's digest of a whole decision (tests/thief.test.ts viewOf). */
export function digestOf(decision: Decision | null): string {
  let view: unknown = decision ?? null;
  if (decision && decision.kind === "ask") {
    const ask = decision as AskDecision;
    const keys = Object.keys((ask.questions["plan"] as { criteria: Record<string, unknown> }).criteria);
    const pick = (key: string, confidence: number): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;
    const res = (answers: AnswerSet) => {
      const { apply: _apply, ...rest } = ask.resolve(answers);
      return rest;
    };
    view = {
      label: ask.label, state: ask.state, questions: ask.questions, jevView: ask.jevView ?? null,
      resolved: Object.fromEntries([...keys.map((key) => [key, res(pick(key, 0.9))]), ...keys.map((key) => [`${key}@0.3`, res(pick(key, 0.3))]), ["none", res({} as AnswerSet)], ["bad", res(pick("nope", 0.9))]]),
    };
  }
  return createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
}

/** A line's plays as the rationale writes them ("A -> X, B"). */
function playsOf(plan: Plan): string {
  return plan.steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", ") || "end turn";
}

/** The shown options' plays of a question (the criteria's `plays`, normalised to the rationale's ", "). */
function shownPlays(decision: Decision | null): string[] {
  if (!decision || decision.kind !== "ask") return [];
  const criteria = (decision.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  return Object.entries(criteria)
    .filter(([key]) => /^plan\d+$/.test(key))
    .map(([, text]) => String((JSON.parse(String(text)) as Row)["plays"] ?? "").replace(/, then /g, ", ").replace(/^nothing \(end the turn now\)$/, "end turn"));
}

/** The rollout_best option's plays (null: none or tied). */
function bestPlays(decision: Decision | null): string | null {
  if (!decision || decision.kind !== "ask") return null;
  const criteria = (decision.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  const best = Object.entries(criteria).find(([, text]) => (JSON.parse(String(text)) as Row)["rollout_best"] === true);
  return best ? String((JSON.parse(String(best[1])) as Row)["plays"] ?? "").replace(/, then /g, ", ") : null;
}

/** The line a logged decision played: the rationale's plan text. */
function playedOf(rationale: string): string | null {
  const jev = /chose plan \d+\/\d+ \((.*?)\)(?: with confidence|; plan)/.exec(rationale);
  if (jev) return jev[1]!;
  const code = /^(?:code plan \([^)]*\)|lethal|every simulated line dies; [^:]*|mod says ending the turn is lethal, solver disagrees; not ending it|code plan [^;]*is over the HP guard bound; playing) ?:? ?(.*?)(?:; hp [-+]| \(| \[|$)/.exec(rationale);
  return code ? code[1]!.trim() : null;
}

interface Result {
  run: string;
  floor: number;
  turn: number;
  fight: string;
  escaped: boolean;
  thieves: { name: string; id: string; carries: string; turnsLeft: number | null; hp: number }[];
  logged: { label: string; decider: string; played: string | null };
  off: { kind: string; label: string; shown: string[]; best: string | null; killShown: boolean; digest: string };
  on: { kind: string; label: string; shown: string[]; best: string | null; killShown: boolean; added: string[] };
  /** Some surviving line kills a thief this turn: the least HP it loses, and the played line's. */
  killExists: boolean;
  killHpLoss: number | null;
  /** The lines killing one this turn (plays, up to 5), and whether the played line was one of them. */
  killPlays: string[];
  playedKills: boolean | null;
  /** The line with the best chance of the loot back: its plays, and whether it drinks a potion (a random potion's sample line included). */
  bestBackPlays: string | null;
  bestBackDrinks: boolean | null;
  /** The on rollout's chance (0-1) of the loot back before the thief leaves: best among its lines, among the off / on shown ones, the played line's. */
  backBest: number | null;
  backShownOff: number | null;
  backShownOn: number | null;
  backPlayed: number | null;
  /** The same for the rollout_best option of the off and the on question (their best: escape off / on). */
  backRolloutBestOff: number | null;
  backRolloutBestOn: number | null;
  playedHpLoss: number | null;
  playedFurther: number | null;
  bestBackHpLoss: number | null;
  bestBackFurther: number | null;
  ms: number;
}

/** One turn of the --cost replay. */
interface CostResult {
  run: string;
  floor: number;
  turn: number;
  fight: string;
  escaped: boolean;
  thieves: { name: string; id: string; carries: string; turnsLeft: number | null; hp: number; lootHp: number | null; loot: string | null }[];
  logged: { label: string; decider: string; played: string | null };
  /** Per arm: the decision kind, label, the rollout's best (plays, null: tied or none), its chance of the loot back, its HP this turn, further, loot cost; the act's line. */
  off: CostArm;
  on: CostArm;
  /** The played line's chance of the loot back and loot cost (on rollout). */
  playedBack: number | null;
  playedLoot: number | null;
  ms: number;
}

interface CostArm {
  kind: string;
  label: string;
  digest: string;
  rationale: string | null;
  best: string | null;
  bestBack: number | null;
  bestHpLoss: number | null;
  bestFurther: number | null;
  bestLoot: number | null;
  bestDeaths: number | null;
  tied: number;
}

function costMain(): void {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  thiefTrace.enabled = true;
  if (potionDir) potionWorthSource.dir = potionDir;
  const values = cardValues();
  const fights = query(
    "SELECT run_id, floor, fight_no, encounter, turns, outcome FROM fights WHERE ascension >= 8 AND (list_contains(monsters, 'THIEVING_HOPPER') OR list_contains(monsters, 'GREMLIN_MERC')) ORDER BY first_ts",
  );
  const escapes = new Set(
    query(
      "SELECT f.run_id, f.floor FROM fights f WHERE f.ascension >= 8 AND list_contains(f.monsters, 'THIEVING_HOPPER') AND f.turns >= 2 AND NOT EXISTS (SELECT 1 FROM decisions d WHERE d.run_id = f.run_id AND d.floor = f.floor AND d.rationale LIKE 'claiming SpecialCard (取回%')",
    ).map((row) => `${String(row["run_id"])}:${String(row["floor"])}`),
  );
  console.log(`${fights.length} fights, ${values.size} card values`);
  const out = join(outDir, "cost-results.jsonl");
  writeFileSync(out, "");
  const digests: Record<string, string> = {};
  const frames: { key: string; off: number; len: number; thiefStart: ScreenMemory["thiefStart"] }[] = [];
  let n = 0;
  for (const fight of fights) {
    if (n >= limit) break;
    n += 1;
    const run = String(fight["run_id"]);
    const floor = Number(fight["floor"]);
    const states = query(`SELECT off, len, ts, turn, screen, observed FROM state_index WHERE run_id = '${run}' AND floor = ${floor} ORDER BY off`);
    const decisions = query(`SELECT ts, turn, label, decider, rationale FROM decisions WHERE run_id = '${run}' AND floor = ${floor} ORDER BY ts`);
    const memory = createScreenMemory("COMBAT");
    const first = states.find((row) => row["screen"] === "COMBAT");
    if (!first) continue;
    noteFightStart(memory, parseGameState(stateAt(Number(first["off"]), Number(first["len"]))["state"] as Record<string, unknown>));
    const value = values.get(`${run}:${floor}`);
    const seenTurns = new Set<number>();
    for (const decision of decisions) {
      const label = String(decision["label"]);
      const turn = Number(decision["turn"]);
      if (!PLANNING.test(label) || seenTurns.has(turn)) continue;
      const row = states.find((entry) => entry["ts"] === decision["ts"] && entry["observed"] !== true);
      if (!row) continue;
      const state = parseGameState(stateAt(Number(row["off"]), Number(row["len"]))["state"] as Record<string, unknown>);
      const thieves = thievesOf(state, memory);
      if (thieves.length === 0) continue;
      seenTurns.add(turn);
      const t0 = Date.now();
      const key = `${run}:${floor}:${turn}`;
      frames.push({ key, off: Number(row["off"]), len: Number(row["len"]), thiefStart: memory.thiefStart });
      const memoryOf = () => ({ ...createScreenMemory("COMBAT"), thiefStart: memory.thiefStart!, ...(value ? { thiefCardValue: value } : {}) });
      const arm = (cost: boolean): { arm: CostArm; trace: typeof thiefTrace.last } => {
        thiefTrace.last = null;
        const decision = planCombatTurn(envOf(state, memoryOf(), true, cost));
        const trace = traced();
        const lines = trace?.rollout?.available ? trace.rollout.result.lines : [];
        const bestPlan = trace?.rollout?.available ? trace.rollout.best : null;
        const bestLine = bestPlan ? lines.find((line) => line.plan === bestPlan) ?? null : null;
        const back = bestLine ? Math.max(0, ...thieves.map((thief) => backShare(thiefSamples(bestLine, thief) ?? { back: 0, gone: 0, samples: 1 }))) : null;
        return {
          trace,
          arm: {
            kind: decision?.kind ?? "none",
            label: decision?.label ?? "",
            digest: digestOf(decision),
            rationale: decision?.kind === "act" ? decision.rationale : null,
            best: bestPlan ? playsOf(bestPlan) : null,
            bestBack: back,
            bestHpLoss: bestPlan?.outcome.hpLoss ?? null,
            bestFurther: bestLine ? Math.round(bestLine.hpLoss * 10) / 10 : null,
            bestLoot: bestLine?.thiefCost !== undefined ? Math.round(bestLine.thiefCost * 10) / 10 : null,
            bestDeaths: bestLine?.deaths ?? null,
            tied: trace?.rollout?.available ? trace.rollout.tied.length : 0,
          },
        };
      };
      const off = arm(false);
      const on = arm(true);
      digests[key] = off.arm.digest;
      const played = playedOf(String(decision["rationale"] ?? ""));
      const onLines = on.trace?.rollout?.available ? on.trace.rollout.result.lines : [];
      const playedLine = played ? onLines.find((line) => playsOf(line.plan) === played) ?? null : null;
      const withLoot = on.trace?.thieves ?? [];
      const result: CostResult = {
        run, floor, turn, fight: String(fight["encounter"]), escaped: escapes.has(`${run}:${floor}`),
        thieves: thieves.map((thief) => {
          const loot = withLoot.find((other) => thiefTag(other) === thiefTag(thief))?.loot;
          return { name: thief.name, id: thief.id, carries: thief.cards !== undefined ? (thief.cards ?? ["?"]).join("/") : `${thief.gold ?? "?"} gold`, turnsLeft: thief.turnsLeft, hp: thief.hp, lootHp: loot?.hp ?? null, loot: loot?.text ?? null };
        }),
        logged: { label, decider: String(decision["decider"]), played },
        off: off.arm,
        on: on.arm,
        playedBack: playedLine ? Math.max(0, ...thieves.map((thief) => backShare(thiefSamples(playedLine, thief) ?? { back: 0, gone: 0, samples: 1 }))) : null,
        playedLoot: playedLine?.thiefCost !== undefined ? Math.round(playedLine.thiefCost * 10) / 10 : null,
        ms: Date.now() - t0,
      };
      writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
      const changed = result.off.best !== result.on.best || result.off.kind !== result.on.kind;
      console.log(`${key} ${result.fight} ${result.thieves.map((t) => `${t.name}[${t.carries}, ${t.turnsLeft ?? "-"}, ${t.lootHp ?? "-"} HP]`).join(" ")} ${changed ? "CHANGED " : ""}off ${result.off.kind} best ${result.off.best} (back ${result.off.bestBack}) on ${result.on.kind} best ${result.on.best} (back ${result.on.bestBack}, loot ${result.on.bestLoot}) (${result.ms} ms)`);
    }
  }
  closeSync(fd);
  writeFileSync(join(outDir, "cost-digests.json"), `${JSON.stringify(digests, null, 1)}\n`);
  writeFileSync(join(outDir, "cost-frames.json"), `${JSON.stringify(frames)}\n`);
  console.log(`wrote ${out}`);
}

function main(): void {
  if (costMode) return costMain();
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  thiefTrace.enabled = true;
  const fights = query(
    "SELECT run_id, floor, fight_no, encounter, turns, outcome FROM fights WHERE ascension >= 8 AND (list_contains(monsters, 'THIEVING_HOPPER') OR list_contains(monsters, 'GREMLIN_MERC')) ORDER BY first_ts",
  );
  console.log(`${fights.length} fights`);
  const results: Result[] = [];
  const frames: { key: string; off: number; len: number; thiefStart: ScreenMemory["thiefStart"] }[] = [];
  const digests: Record<string, string> = {};
  const out = join(outDir, "results.jsonl");
  writeFileSync(out, "");
  // The 7 Hopper escapes: no SpecialCard on the reward screen after the fight (and not killed on T1 before the theft).
  const escapes = new Set(
    query(
      "SELECT f.run_id, f.floor FROM fights f WHERE f.ascension >= 8 AND list_contains(f.monsters, 'THIEVING_HOPPER') AND f.turns >= 2 AND NOT EXISTS (SELECT 1 FROM decisions d WHERE d.run_id = f.run_id AND d.floor = f.floor AND d.rationale LIKE 'claiming SpecialCard (取回%')",
    ).map((row) => `${String(row["run_id"])}:${String(row["floor"])}`),
  );
  for (const fight of fights) {
    if (results.length >= limit) break;
    const run = String(fight["run_id"]);
    const floor = Number(fight["floor"]);
    const states = query(`SELECT off, len, ts, turn, screen, observed FROM state_index WHERE run_id = '${run}' AND floor = ${floor} ORDER BY off`);
    const decisions = query(`SELECT ts, turn, label, decider, rationale FROM decisions WHERE run_id = '${run}' AND floor = ${floor} ORDER BY ts`);
    const memory = createScreenMemory("COMBAT");
    const first = states.find((row) => row["screen"] === "COMBAT");
    if (!first) continue;
    noteFightStart(memory, parseGameState(stateAt(Number(first["off"]), Number(first["len"]))["state"] as Record<string, unknown>));
    const seenTurns = new Set<number>();
    for (const decision of decisions) {
      const label = String(decision["label"]);
      const turn = Number(decision["turn"]);
      if (!PLANNING.test(label) || seenTurns.has(turn)) continue;
      const row = states.find((entry) => entry["ts"] === decision["ts"] && entry["observed"] !== true);
      if (!row) continue;
      const state = parseGameState(stateAt(Number(row["off"]), Number(row["len"]))["state"] as Record<string, unknown>);
      const thieves = thievesOf(state, memory);
      if (thieves.length === 0) continue;
      seenTurns.add(turn);
      const t0 = Date.now();
      const key = `${run}:${floor}:${turn}`;
      frames.push({ key, off: Number(row["off"]), len: Number(row["len"]), thiefStart: memory.thiefStart });
      const offMemory = { ...createScreenMemory("COMBAT"), thiefStart: memory.thiefStart! };
      thiefTrace.last = null;
      const off = planCombatTurn(envOf(state, offMemory, false));
      digests[key] = digestOf(off);
      const onMemory = { ...createScreenMemory("COMBAT"), thiefStart: memory.thiefStart! };
      thiefTrace.last = null;
      const on = planCombatTurn(envOf(state, onMemory, true));
      const trace = traced();
      const played = playedOf(String(decision["rationale"] ?? ""));
      const offShown = shownPlays(off);
      const onShown = shownPlays(on);
      const killing = (thief: Thief) => (plan: Plan) => killsThief(plan, thief);
      // The lines the solver kept (an ask), else every line it found that lives through the turn (code decided alone).
      const surviving = trace && trace.surviving.length > 0 ? trace.surviving : (trace?.plans ?? []).filter((plan) => !plan.outcome.dies);
      const kills = surviving.filter((plan) => thieves.some((thief) => killing(thief)(plan)));
      const lines = trace?.rollout?.available ? trace.rollout.result.lines : [];
      const rate = (plays: string): number | null => {
        const line = lines.find((entry) => playsOf(entry.plan) === plays);
        if (!line) return null;
        const counts = thieves.map((thief) => thiefSamples(line, thief)).filter((x): x is NonNullable<typeof x> => x !== null);
        return counts.length === 0 ? null : Math.max(...counts.map(backShare));
      };
      const rates = lines.map((line) => ({ line, r: rate(playsOf(line.plan)) })).filter((entry) => entry.r !== null);
      const bestBack = rates.length > 0 ? rates.reduce((a, b) => (b.r! > a.r! || (b.r === a.r && b.line.value > a.line.value) ? b : a)) : null;
      const maxOf = (plays: string[]) => {
        const xs = plays.map(rate).filter((x): x is number => x !== null);
        return xs.length > 0 ? Math.max(...xs) : null;
      };
      const playedLine = played ? lines.find((entry) => playsOf(entry.plan) === played) ?? null : null;
      const playedPlan = played ? surviving.find((plan) => playsOf(plan) === played) ?? null : null;
      const result: Result = {
        run, floor, turn, fight: String(fight["encounter"]), escaped: escapes.has(`${run}:${floor}`),
        thieves: thieves.map((thief) => ({ name: thief.name, id: thief.id, carries: thief.cards !== undefined ? (thief.cards ?? ["?"]).join("/") : `${thief.gold ?? "?"} gold`, turnsLeft: thief.turnsLeft, hp: thief.hp })),
        logged: { label, decider: String(decision["decider"]), played },
        off: { kind: off?.kind ?? "none", label: off?.label ?? "", shown: offShown, best: bestPlays(off), killShown: off?.kind === "act" ? kills.some((plan) => off.rationale.includes(playsOf(plan))) : offShown.some((plays) => kills.some((plan) => playsOf(plan) === plays)), digest: digests[key]! },
        on: {
          kind: on?.kind ?? "none", label: on?.label ?? "", shown: onShown, best: bestPlays(on), killShown: on?.kind === "act" ? kills.some((plan) => on.rationale.includes(playsOf(plan))) : onShown.some((plays) => kills.some((plan) => playsOf(plan) === plays)),
          added: [trace?.lastTurnLine, trace?.rolloutLine].filter((plan): plan is Plan => plan !== null && plan !== undefined && !offShown.includes(playsOf(plan))).map(playsOf),
        },
        killExists: kills.length > 0,
        killHpLoss: kills.length > 0 ? Math.min(...kills.map((plan) => plan.outcome.hpLoss)) : null,
        killPlays: kills.slice(0, 5).map(playsOf),
        playedKills: played === null ? null : kills.some((plan) => playsOf(plan) === played),
        bestBackPlays: bestBack ? playsOf(bestBack.line.plan) : null,
        bestBackDrinks: bestBack ? bestBack.line.plan.steps.some((step) => step.cardId.startsWith("POTION:")) : null,
        backBest: bestBack?.r ?? null,
        backShownOff: maxOf(offShown),
        backShownOn: maxOf(onShown),
        backPlayed: played ? rate(played) : null,
        backRolloutBestOff: bestPlays(off) ? rate(bestPlays(off)!) : null,
        backRolloutBestOn: bestPlays(on) ? rate(bestPlays(on)!) : null,
        playedHpLoss: playedPlan?.outcome.hpLoss ?? null,
        playedFurther: playedLine?.hpLoss ?? null,
        bestBackHpLoss: bestBack?.line.plan.outcome.hpLoss ?? null,
        bestBackFurther: bestBack?.line.hpLoss ?? null,
        ms: Date.now() - t0,
      };
      results.push(result);
      writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
      console.log(`${key} ${result.fight} ${result.thieves.map((t) => `${t.name}[${t.carries}, ${t.turnsLeft ?? "-"}]`).join(" ")} off ${result.off.kind} on ${result.on.kind} kill ${result.killExists ? "yes" : "no"} shown ${result.off.killShown ? 1 : 0}->${result.on.killShown ? 1 : 0} back best ${result.backBest} shown ${result.backShownOff}->${result.backShownOn} played ${result.backPlayed} (${result.ms} ms)`);
    }
  }
  closeSync(fd);
  writeFileSync(join(outDir, "digests.json"), `${JSON.stringify(digests, null, 1)}\n`);
  writeFileSync(join(outDir, "frames.json"), `${JSON.stringify(frames)}\n`);
  console.log(`${results.length} turns replayed; wrote ${out}`);
}

main();
