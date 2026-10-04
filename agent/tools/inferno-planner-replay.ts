/**
 * Inferno's start-of-turn loss per copy on the live combat planner (strategy/start-loss.ts, turn-solver Sim.infernos,
 * rollout SimPlayer.infernoCopies; docs/sl.md §2.6 for the judge's half). No model is called and nothing is written
 * outside --work. Logged boards (logs/states.jsonl through the log DB's offsets, read-only), planned by this worktree's code
 * as live: the 5-turn rollout and the random potions' Monte Carlo on a frozen clock (the full 5 turns x 8 samples, the
 * board's seeds), the whole-fight boss simulation (B2) off.
 *
 * Fights (deterministic): every fight with two or more Infernos in the deck or INFERNO_POWER at 12 or more on some frame
 * ("multi": every planning decision of it), a sample of fights with one Inferno in the deck ("one": each turn's first
 * planning decision per SL attempt), and a control sample of fights without one ("none", the same).
 *
 * Per board: the decision's digest (question, Jev's view, every answer's resolution; or code's own act), the lines shown
 * (plays, hp_lost, the rollout's best), the rollout's lines (deaths of the samples, expected HP lost to the fight's end), and
 * the Inferno count on the board (INFERNO_POWER, the Infernos in the hand, draw and discard piles). Run it here and on a
 * worktree of the code before (the same file), then compare: the boards whose Infernos (up + in hand and piles) number one
 * or none must be byte for byte the same.
 *
 * Usage: npx tsx tools/inferno-planner-replay.ts run [--shard I --shards N] [--work DIR] [--one 150] [--none 50] [--limit N]
 *        npx tsx tools/inferno-planner-replay.ts compare --base DIR [--work DIR] [--out FILE]
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, closeSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv, type ScreenMemory } from "../src/memory/types.js";
import { facingFightOf, planCombatTurn, thiefTrace } from "../src/reflex/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import type { LineEstimate } from "../src/reflex/rollout.js";
import { effectiveFightLoss, rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import type { Plan } from "../src/reflex/turn-solver.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const stage = process.argv[2] ?? "run";
const work = arg("work", fromRoot("experiments/inferno-planner/raw/after"));
const STATES = fromRoot("logs/states.jsonl");
const PY = fromRoot("data/logdb-venv/bin/python");
/** Labels of a fresh plan of the turn (tools/passive-pieces-planner-replay.ts's). */
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;

type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

function playsOf(plan: Plan): string {
  return plan.steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", ") || "end turn";
}

interface Rolled {
  plays: string;
  /** This turn's hp_lost (the solver's, the next turn's start loss in it). */
  hpLost: number;
  deaths: number;
  samples: number;
  /** Expected HP lost from now to the fight's end with the potions' cost (effectiveFightLoss). */
  loss: number;
  value: number;
}

interface Side {
  kind: string;
  label: string;
  /** Code played alone: the intent and the rationale's head. */
  act: { intent: string; rationale: string } | null;
  shown: { key: string; plays: string; hpLost: number | null; best: boolean }[];
  /** The rollout's lines (every line it rolled), best by value first. */
  rollout: Rolled[];
  /** The solver's lines that die this turn (the next turn's start loss included) and all its lines. */
  dying: number;
  plans: number;
  digest: string;
}

function intentText(intent: unknown): string {
  const i = (intent ?? {}) as Row;
  return [i["action"], i["card_index"], i["potion_index"] ?? i["slot"], i["target_index"]].filter((x) => x !== undefined && x !== null).join(":");
}

/** The planner's last trace (a function: TypeScript would keep the `null` assigned before the call). */
function traced(): typeof thiefTrace.last {
  return thiefTrace.last;
}

function sideOf(decision: Decision | null): Side {
  const trace = traced();
  const plans = trace?.plans ?? [];
  const lines: LineEstimate[] = trace?.rollout?.available ? trace.rollout.result.lines : [];
  const rollout = [...lines]
    .sort((a, b) => b.value - a.value)
    .map((line) => ({ plays: playsOf(line.plan), hpLost: line.plan.outcome.hpLoss, deaths: line.deaths, samples: line.samples, loss: Math.round(effectiveFightLoss(line) * 10) / 10, value: Math.round(line.value * 10) / 10 }));
  const common = { rollout, dying: plans.filter((plan) => plan.outcome.dies).length, plans: plans.length };
  if (!decision) return { kind: "none", label: "", act: null, shown: [], ...common, digest: digest(null) };
  if (decision.kind !== "ask") {
    const act = decision as unknown as { label: string; intent: unknown; rationale: string };
    return { kind: decision.kind, label: act.label, act: { intent: intentText(act.intent), rationale: String(act.rationale).slice(0, 240) }, shown: [], ...common, digest: digest({ label: act.label, intent: act.intent, rationale: act.rationale }) };
  }
  const ask = decision as AskDecision;
  const criteria = ((ask.questions["plan"] as { criteria?: Record<string, string | null> } | undefined)?.criteria ?? {}) as Record<string, string | null>;
  const shown = Object.entries(criteria)
    .filter(([key]) => /^plan\d+$/.test(key))
    .map(([key, text]) => {
      const c = (text ? JSON.parse(text) : {}) as Row;
      return { key, plays: String(c["plays"] ?? ""), hpLost: typeof c["hp_lost"] === "number" ? (c["hp_lost"] as number) : null, best: c["rollout_best"] === true };
    });
  const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;
  const full: Record<string, unknown> = {};
  for (const key of Object.keys(criteria)) {
    const { apply: _apply, ...rest } = ask.resolve(pick(key)) as unknown as Row & { apply?: unknown };
    full[key] = rest;
  }
  return { kind: "ask", label: ask.label, act: null, shown, ...common, digest: digest({ label: ask.label, state: ask.state, questions: ask.questions, jevView: ask.jevView ?? null, full }) };
}

/** INFERNO_POWER on us, and the Infernos in the hand and the draw and discard piles (grouped "name*N" lines). */
function infernoCount(raw: Row): { amount: number; hand: number; piles: number } {
  const combat = (raw["combat"] as Row | undefined) ?? {};
  const player = (combat["player"] as Row | undefined) ?? {};
  const amount = ((player["powers"] as Row[] | undefined) ?? []).filter((power) => power["power_id"] === "INFERNO_POWER").reduce((sum, power) => sum + Number(power["amount"] ?? 0), 0);
  const hand = ((combat["hand"] as Row[] | undefined) ?? []).filter((card) => card["card_id"] === "INFERNO").length;
  const view = (((raw["agent_view"] as Row | undefined) ?? {})["combat"] as Row | undefined) ?? {};
  let piles = 0;
  for (const pile of ["draw", "discard"]) {
    for (const entry of (view[pile] as Row[] | undefined) ?? []) {
      if (!((entry["card_ids"] as string[] | undefined) ?? []).includes("INFERNO")) continue;
      piles += Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(String(entry["line"] ?? ""))?.[1] ?? 1);
    }
  }
  return { amount, hand, piles };
}

/**
 * What can add an Inferno copy on this board beyond the cards counted: a potion offering or doubling one (Power Potion, Orobic
 * Acid: a random Power; Duplicator, or its DUPLICATION_POWER up: the next card twice) or a card that copies one (Dual Wield,
 * Abundance).
 */
const COPY_POTIONS = new Set(["POWER_POTION", "OROBIC_ACID", "DUPLICATOR"]);
const COPY_CARDS = new Set(["DUAL_WIELD", "ABUNDANCE"]);
function copySources(raw: Row): string[] {
  const potions = (((raw["run"] as Row | undefined)?.["potions"] as Row[] | undefined) ?? []).map((potion) => String(potion["potion_id"] ?? "")).filter((id) => COPY_POTIONS.has(id));
  const hand = ((((raw["combat"] as Row | undefined) ?? {})["hand"] as Row[] | undefined) ?? []).map((card) => String(card["card_id"]));
  const view = (((raw["agent_view"] as Row | undefined) ?? {})["combat"] as Row | undefined) ?? {};
  const piles = ["draw", "discard"].flatMap((pile) => ((view[pile] as Row[] | undefined) ?? []).flatMap((entry) => (entry["card_ids"] as string[] | undefined) ?? []));
  // A Duplicator drunk earlier this turn: its next card (an Inferno too) is played twice.
  const player = ((((raw["combat"] as Row | undefined) ?? {})["player"] as Row | undefined) ?? {});
  const duplication = ((player["powers"] as Row[] | undefined) ?? []).some((power) => power["power_id"] === "DUPLICATION_POWER" && Number(power["amount"] ?? 0) > 0) ? ["DUPLICATION_POWER"] : [];
  return [...new Set([...potions, ...duplication, ...[...hand, ...piles].filter((id) => COPY_CARDS.has(id))])].sort();
}

function run(): void {
  const index = Number(arg("shard", "0"));
  const shards = Number(arg("shards", "1"));
  const limit = Number(arg("limit", "1000000"));
  const one = Number(arg("one", "150"));
  const none = Number(arg("none", "50"));
  mkdirSync(work, { recursive: true });
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  thiefTrace.enabled = true;
  const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
  const config = loadConfig(process.env);
  // Infernos in the deck (the most on any frame of the fight) and the most INFERNO_POWER shown.
  const fights = query(`
    WITH x AS (
      SELECT f.run_id, f.fight_no, f.floor, f.ascension, f.encounter, f.room, f.outcome, f.first_off, f.last_off, f.first_ts,
        max(len(list_filter(x.deck, c -> c IN ('INFERNO', 'INFERNO+')))) AS n,
        max(coalesce(list_sum([p.amount FOR p IN x.player_powers IF p.id = 'INFERNO_POWER']), 0)) AS amt,
        hash(f.run_id || ':' || f.fight_no) AS h
      FROM fights f JOIN frames x ON x.run_id = f.run_id AND x.off BETWEEN f.first_off AND f.last_off
      GROUP BY ALL
    )
    SELECT * FROM (
      SELECT *, 'multi' AS grp FROM x WHERE n >= 2 OR amt >= 12
      UNION ALL (SELECT *, 'one' AS grp FROM x WHERE n = 1 AND amt < 12 ORDER BY h LIMIT ${one})
      UNION ALL (SELECT *, 'none' AS grp FROM x WHERE n = 0 AND ascension >= 8 ORDER BY h LIMIT ${none})
    ) ORDER BY first_ts`);
  const fd = openSync(STATES, "r");
  const stateAt = (off: number, len: number): Row => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row;
  };
  const out = join(work, `planner-${index}.jsonl`);
  writeFileSync(out, "");
  let done = 0;
  fights.forEach((fight, fightIndex) => {
    if (fightIndex % shards !== index || done >= limit) return;
    const runId = String(fight["run_id"]);
    const grp = String(fight["grp"]);
    const frames = query(`SELECT off, len, ts, turn, observed, screen FROM frames WHERE run_id = '${runId}' AND off BETWEEN ${Number(fight["first_off"])} AND ${Number(fight["last_off"]) + 1} ORDER BY off`);
    const decisions = query(`SELECT ts, turn, label, target_index, action, result FROM decisions WHERE run_id = '${runId}' AND floor = ${Number(fight["floor"])} AND screen = 'COMBAT' AND ts >= '${String(fight["first_ts"])}' ORDER BY ts`);
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
    // An attempt's outcome: the fight's for the last one (won / died / ...), an SL reload ("reloaded") before it.
    const lastTurnOf = new Map<number, number>();
    for (const frame of own) lastTurnOf.set(attemptOf.get(frame)!, Math.max(lastTurnOf.get(attemptOf.get(frame)!) ?? 0, Number(frame["turn"])));
    const seen = new Set<string>();
    for (const decision of decisions) {
      if (done >= limit) break;
      if (!PLANNING.test(String(decision["label"]))) continue;
      const frame = own.find((entry) => entry["ts"] === decision["ts"]);
      if (!frame) continue;
      const turn = Number(decision["turn"]);
      const at = attemptOf.get(frame)!;
      if (grp !== "multi" && seen.has(`${at}:${turn}`)) continue;
      seen.add(`${at}:${turn}`);
      const raw = stateAt(Number(frame["off"]), Number(frame["len"]));
      const state = parseGameState(raw);
      const earlier = decisions.filter((entry) => String(entry["ts"]) < String(decision["ts"]) && entry["target_index"] !== null && entry["target_index"] !== undefined && entry["action"] !== "end_turn");
      const facing = earlier.length > 0 ? Number(earlier[earlier.length - 1]!["target_index"]) : null;
      const env: DecisionEnv = {
        state, knowledge, brief: buildRunBrief(state, knowledge),
        screenMemory: { ...createScreenMemory("COMBAT"), ...(facing !== null ? { facing, facingFight: facingFightOf(state) } : {}) } as ScreenMemory,
        thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [],
        jevContext: "v1", buildDecider: "deepseek", mechRules: config.mechRules, mechMoveRules: config.mechRules && config.mechMoveRules, mechDeathMove: config.mechRules && config.mechDeathMove, thiefFacts: true,
      };
      let side: Side;
      thiefTrace.last = null;
      try {
        side = sideOf(planCombatTurn(env));
      } catch (error) {
        side = { kind: "error", label: String(error).slice(0, 200), act: null, shown: [], rollout: [], dying: 0, plans: 0, digest: "error" };
      }
      const player = ((raw["combat"] as Row | undefined)?.["player"] as Row | undefined) ?? {};
      const outcome = at < attempts - 1 ? "reloaded" : String(fight["outcome"] ?? "?");
      appendFileSync(
        out,
        JSON.stringify({
          run: runId, fight: Number(fight["fight_no"]), floor: Number(fight["floor"]), asc: Number(fight["ascension"]), room: fight["room"], enc: fight["encounter"], grp,
          turn, attempt: at, ts: String(decision["ts"]), logged: { label: String(decision["label"]), action: String(decision["action"]) },
          hp: Number(player["current_hp"] ?? 0), block: Number(player["block"] ?? 0), inferno: infernoCount(raw), copySources: copySources(raw),
          outcome, lastTurn: lastTurnOf.get(at) ?? turn, side,
        }) + "\n",
      );
      done += 1;
    }
  });
  closeSync(fd);
  console.error(`inferno planner replay shard ${index}/${shards}: ${done} boards -> ${out}`);
}

interface ReplayRow {
  run: string;
  fight: number;
  floor: number;
  asc: number;
  enc: string;
  grp: string;
  turn: number;
  attempt: number;
  ts: string;
  logged: { label: string; action: string };
  hp: number;
  block: number;
  inferno: { amount: number; hand: number; piles: number };
  /** Potions or cards that can add an Inferno copy (copySources); filled in by compare from the state when absent. */
  copySources?: string[];
  outcome: string;
  lastTurn: number;
  side: Side;
}

/** Infernos up at the fewest the power's sum can be (9 the most one copy adds; strategy/start-loss.ts). */
const copiesUp = (amount: number): number => (amount > 0 ? Math.max(1, Math.ceil(amount / 9)) : 0);

function load(dir: string): Map<string, ReplayRow> {
  return new Map(
    readdirSync(dir)
      .filter((name) => /^planner-\d+\.jsonl$/.test(name))
      .flatMap((name) => readFileSync(join(dir, name), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as ReplayRow))
      .map((r) => [`${r.run}:${r.fight}:${r.attempt}:${r.turn}:${r.ts}`, r] as const),
  );
}

/** Base vs this worktree, board by board (--base: the code before this change, run with the same file). */
function compare(): void {
  const base = arg("base", "");
  const outFile = arg("out", "");
  const lines: string[] = [];
  const say = (text: string) => {
    lines.push(text);
    console.log(text);
  };
  const before = load(base);
  const after = load(work);
  const keys = [...after.keys()].filter((key) => before.has(key));
  const pairs = keys.map((key) => [before.get(key)!, after.get(key)!] as const);
  // Rows written before copySources was recorded: read it off the board's state.
  const missing = pairs.filter(([, b]) => b.copySources === undefined).map(([, b]) => b);
  if (missing.length > 0) {
    const fd = openSync(STATES, "r");
    for (let at = 0; at < missing.length; at += 400) {
      const chunk = missing.slice(at, at + 400);
      const found = query(`SELECT run_id, ts, any_value(off) AS off, any_value(len) AS len FROM state_index WHERE NOT coalesce(observed, false) AND (run_id, ts) IN (${chunk.map((r) => `('${r.run}', TIMESTAMP '${r.ts}')`).join(", ")}) GROUP BY run_id, ts`);
      const byKey = new Map(found.map((row) => [`${String(row["run_id"])}|${String(row["ts"])}`, row]));
      for (const r of chunk) {
        const row = byKey.get(`${r.run}|${r.ts}`);
        if (!row) continue;
        const buffer = Buffer.alloc(Number(row["len"]));
        readSync(fd, buffer, 0, Number(row["len"]), Number(row["off"]));
        r.copySources = copySources((JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row);
      }
    }
    closeSync(fd);
  }
  const kindOf = (r: ReplayRow): string => {
    const up = copiesUp(r.inferno.amount);
    const total = up + r.inferno.hand + r.inferno.piles;
    if (up >= 2) return "2+ up";
    if (total <= 1 && (r.copySources ?? []).length > 0) return "one or none, a potion or card may add a copy";
    if (total <= 1) return up === 1 ? "1 up, none other" : total === 1 ? "0 up, 1 in hand/piles" : "no Inferno";
    return up === 1 ? "1 up + more in hand/piles" : "0 up, 2+ in hand/piles";
  };
  const shownText = (s: Side) => (s.kind === "act" ? `code ${s.label}: ${s.act?.intent} ${s.act?.rationale.slice(0, 140)}` : `ask [${s.shown.map((x) => `${x.plays}${x.hpLost !== null ? ` hp-${x.hpLost}` : ""}${x.best ? " *" : ""}`).join(" | ").slice(0, 400)}]`);
  const linesOf = (s: Side) => s.shown.map((x) => x.plays).join(" | ");
  const numsOf = (s: Side) => s.shown.map((x) => `${x.plays}:${x.hpLost}`).join(" | ");
  const playOf = (s: Side) => (s.kind === "act" ? `act ${s.act?.intent}` : `best ${s.shown.find((x) => x.best)?.plays ?? "-"}`);
  const deathsOf = (s: Side) => s.rollout.reduce((sum, line) => sum + line.deaths, 0);
  // The rollout's lines as a multiset (two lines can read the same: a kill order, a potion's target).
  const deathSet = (s: Side) => s.rollout.map((line) => `${line.plays}:${line.deaths}/${line.samples}`).sort().join(" | ");
  const samplesOf = (s: Side) => s.rollout.reduce((sum, line) => sum + line.samples, 0);
  say(`boards in both: ${pairs.length} (base ${before.size}, after ${after.size}); errors before ${[...before.values()].filter((r) => r.side.kind === "error").length}, after ${[...after.values()].filter((r) => r.side.kind === "error").length}`);
  say("");
  say("| board kind | boards | byte-identical | decision changed | code's own play changed | lines shown changed | same lines, hp_lost changed | rollout best changed | a line's rollout deaths changed |");
  say("|---|---|---|---|---|---|---|---|---|");
  const kinds = ["no Inferno", "0 up, 1 in hand/piles", "1 up, none other", "one or none, a potion or card may add a copy", "0 up, 2+ in hand/piles", "1 up + more in hand/piles", "2+ up"];
  for (const kind of kinds) {
    const g = pairs.filter(([, b]) => kindOf(b) === kind);
    if (g.length === 0) continue;
    const same = g.filter(([a, b]) => a.side.digest === b.side.digest).length;
    const act = g.filter(([a, b]) => (a.side.kind === "act" || b.side.kind === "act") && (a.side.kind !== b.side.kind || a.side.act?.intent !== b.side.act?.intent)).length;
    const shown = g.filter(([a, b]) => a.side.kind === "ask" && b.side.kind === "ask" && linesOf(a.side) !== linesOf(b.side)).length;
    const nums = g.filter(([a, b]) => a.side.kind === "ask" && b.side.kind === "ask" && linesOf(a.side) === linesOf(b.side) && numsOf(a.side) !== numsOf(b.side)).length;
    const best = g.filter(([a, b]) => (a.side.shown.find((x) => x.best)?.plays ?? null) !== (b.side.shown.find((x) => x.best)?.plays ?? null)).length;
    const deaths = g.filter(([a, b]) => deathSet(a.side) !== deathSet(b.side)).length;
    say(`| ${kind} | ${g.length} | ${same} | ${g.length - same} | ${act} | ${shown} | ${nums} | ${best} | ${deaths} |`);
  }
  // The boards that must not move: one Inferno or none in all (up + hand + piles).
  const fixed = pairs.filter(([, b]) => ["no Inferno", "0 up, 1 in hand/piles", "1 up, none other"].includes(kindOf(b)));
  const moved = fixed.filter(([a, b]) => a.side.digest !== b.side.digest);
  say("");
  say(`one Inferno or none on the board (up + hand + draw + discard), no potion or card that adds a copy: ${fixed.length - moved.length} / ${fixed.length} byte-identical`);
  for (const [a, b] of moved.slice(0, 10)) say(`  MOVED ${b.run} F${b.floor} T${b.turn} (${kindOf(b)}): ${shownText(a.side)} -> ${shownText(b.side)}`);
  const sourced = pairs.filter(([, b]) => kindOf(b) === "one or none, a potion or card may add a copy");
  const sourcedMoved = sourced.filter(([a, b]) => a.side.digest !== b.side.digest);
  say(`one Inferno or none, holding a copy source: ${sourced.length - sourcedMoved.length} / ${sourced.length} byte-identical; moved: ${sourcedMoved.map(([, b]) => `${b.run} F${b.floor} T${b.turn} (${(b.copySources ?? []).join(", ")})`).join("; ")}`);

  // 2+ up: the start loss per copy. Deaths the rollout sees, by the attempt's outcome.
  const multi = pairs.filter(([, b]) => kindOf(b) === "2+ up");
  say("");
  say("## Boards with two or more Infernos up");
  const byOutcome = new Map<string, (typeof multi)[number][]>();
  for (const pair of multi) {
    const died = pair[1].outcome === "died" && pair[1].lastTurn === pair[1].turn + 1 ? "died at the next turn (its start or later in it)" : pair[1].outcome === "died" ? "died later in the fight" : pair[1].outcome;
    byOutcome.set(died, [...(byOutcome.get(died) ?? []), pair]);
  }
  say("");
  say("| attempt outcome | boards | rollout deaths before (of samples) | after | dying solver lines before | after | decision changed |");
  say("|---|---|---|---|---|---|---|");
  for (const [outcome, g] of [...byOutcome.entries()].sort()) {
    say(`| ${outcome} | ${g.length} | ${g.reduce((s, [a]) => s + deathsOf(a.side), 0)} / ${g.reduce((s, [a]) => s + samplesOf(a.side), 0)} | ${g.reduce((s, [, b]) => s + deathsOf(b.side), 0)} / ${g.reduce((s, [, b]) => s + samplesOf(b.side), 0)} | ${g.reduce((s, [a]) => s + a.side.dying, 0)} / ${g.reduce((s, [a]) => s + a.side.plans, 0)} | ${g.reduce((s, [, b]) => s + b.side.dying, 0)} / ${g.reduce((s, [, b]) => s + b.side.plans, 0)} | ${g.filter(([a, b]) => a.side.digest !== b.side.digest).length} |`);
  }
  say("");
  say("Boards (2+ up, and the others that moved) whose played line or shown lines changed:");
  const changed = pairs.filter(([a, b]) => kindOf(b) !== "no Inferno" && (playOf(a.side) !== playOf(b.side) || linesOf(a.side) !== linesOf(b.side) || a.side.kind !== b.side.kind));
  say(`(${changed.length} boards; by kind: ${kinds.map((kind) => `${kind} ${changed.filter(([, b]) => kindOf(b) === kind).length}`).join(", ")})`);
  for (const [a, b] of changed) {
    say(`- ${b.run} F${b.floor} (${b.enc}, A${b.asc}) attempt ${b.attempt + 1} T${b.turn}, ${kindOf(b)} (INFERNO_POWER ${b.inferno.amount}, hand ${b.inferno.hand}, piles ${b.inferno.piles}), ${b.hp} HP + ${b.block} block, ${b.outcome}${b.outcome === "died" ? ` (last turn T${b.lastTurn})` : ""}; logged ${b.logged.label} -> ${b.logged.action}`);
    say(`    before ${playOf(a.side)}; ${shownText(a.side)}; rollout deaths ${deathsOf(a.side)}/${samplesOf(a.side)}, dying lines ${a.side.dying}/${a.side.plans}`);
    say(`    after  ${playOf(b.side)}; ${shownText(b.side)}; rollout deaths ${deathsOf(b.side)}/${samplesOf(b.side)}, dying lines ${b.side.dying}/${b.side.plans}`);
  }
  say("");
  say("2+ up, same decision, a line's hp_lost or rollout deaths changed (first 40):");
  const numbers = multi.filter(([a, b]) => playOf(a.side) === playOf(b.side) && linesOf(a.side) === linesOf(b.side) && (numsOf(a.side) !== numsOf(b.side) || deathsOf(a.side) !== deathsOf(b.side)));
  for (const [a, b] of numbers.slice(0, 40)) {
    const diff = b.side.rollout
      .map((line) => {
        const old = a.side.rollout.find((x) => x.plays === line.plays);
        return old && (old.deaths !== line.deaths || old.hpLost !== line.hpLost) ? `${line.plays}: hp-${old.hpLost} -> ${line.hpLost}, deaths ${old.deaths} -> ${line.deaths}/${line.samples}` : null;
      })
      .filter(Boolean)
      .slice(0, 3)
      .join("; ");
    say(`- ${b.run} F${b.floor} attempt ${b.attempt + 1} T${b.turn} (INFERNO_POWER ${b.inferno.amount}, ${b.hp} HP, ${b.outcome}): ${diff || `${numsOf(a.side).slice(0, 160)} -> ${numsOf(b.side).slice(0, 160)}`}`);
  }
  if (outFile) writeFileSync(outFile, lines.join("\n") + "\n");
}

if (stage === "compare") compare();
else run();
