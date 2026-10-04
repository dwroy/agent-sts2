/**
 * Offline check of CARD_CONDITIONS (2026-10-04, src/strategy/card-model.ts cardConditionOptions): Restlessness's draw and energy
 * only on an empty hand (Impatience's draw only with no Attack in it), Spite's second hit after HP lost earlier this turn, a
 * Rage played in the line, Ashen Strike / Expect a Fight / Tear Asunder with what the line exhausted / gained / lost first.
 *
 * Each logged combat frame given is planned again with the clocks frozen (the rollout's and the random potions' whole
 * schedules), B2 off, SL_RETRY_MEMO off, no SL, no model call; logs are read only (states.jsonl at the frames' offsets). The
 * turn's first logged combat frame is fed to the screen memory first (as the live loop saw it: the turn-start exhaust pile
 * and HP), in both modes.
 * --mode ab (default): twice, the switch off (the old model) and on; compared: code's kind/label, code's action, the
 * question's lines, the rollout's pick and its action, the solver's best line; and the forecast of the line the log then
 * played from this board (its plays up to end_turn, when every one was a card of this hand): energy left and HP lost by the
 * next turn's first frame, against the logged ones.
 * --mode plain: once with the code as it is (no switch: a tree without the fix too), for a byte-for-byte comparison of two
 * trees' rows (or of the switch's two sides: --switch off).
 *
 * Usage: npx tsx tools/card-conditions-replay.ts --frames <frames.json> --out <dir> [--mode ab|plain] [--switch on|off]
 *   [--from <results.jsonl>] [--part i/n]
 * frames.json (tools/card-conditions-frames.py; the sets replayed are experiments/card-conditions/frames-*.json):
 * [{ off, len, first_off, first_len, ts, run, asc, floor, turn, label, decider, chosen, cards, executed:
 * [{ cardIndex, cardId, target }], complete, end_energy, hp, hp_next }] (states.jsonl offsets of the decision frame and of
 * the turn's first frame; `cards`: the fixed cards in hand; the rest: the logged decision and what the turn then did).
 * Output: <out>/results.jsonl and, in ab mode, a summary on stdout (also <out>/summary.txt).
 */
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv, type ScreenMemory } from "../src/project/types.js";
import * as combatPlan from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { computeMemoOptions } from "../src/sim/compute-memo.js";
import * as cardModel from "../src/strategy/card-model.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { replaySteps, solveTap, type Plan, type SolverInput, type Step } from "../src/strategy/turn-solver.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const outDir = arg("out", fromRoot("experiments/card-conditions"));
const mode = arg("mode", "ab");
const from = arg("from", "");
const part = arg("part", "1/1").split("/").map(Number) as [number, number];
type Row = Record<string, unknown>;
const switches = cardModel as unknown as { cardConditionOptions?: { enabled: boolean } };
const notes = combatPlan as unknown as { noteTurnStartExhaust: (m: ScreenMemory, s: DecisionEnv["state"]) => boolean; noteTurnStartHp?: (m: ScreenMemory, s: DecisionEnv["state"]) => boolean };

const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);
function envOf(raw: Row, first: Row | null): DecisionEnv {
  const state = parseGameState(raw);
  const screenMemory = createScreenMemory("COMBAT");
  // The turn's first frame, as the live loop noted it (Evil Eye's exhaust baseline; CARD_CONDITIONS' HP baseline).
  const start = parseGameState(first ?? raw);
  notes.noteTurnStartExhaust(screenMemory, start);
  notes.noteTurnStartHp?.(screenMemory, start);
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory, thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    thiefFacts: config.thiefFacts, thiefCost: config.thiefCost && config.thiefFacts, mechRules: config.mechRules,
  };
}

const lineOf = (plan: Plan | null | undefined) =>
  plan ? { steps: plan.steps.map((step) => `${step.cardId}${step.target !== null ? `>${step.target}` : ""}`).join(","), hpLoss: plan.outcome.hpLoss, damage: plan.outcome.damageDealt, energyLeft: plan.outcome.energyLeft, drawn: plan.outcome.cardsDrawn } : null;

/** A decision as data to compare: code's action, or the question's options (plays, rollout pick); the solver's best line; the logged line's forecast. */
function viewOf(raw: Row, first: Row | null, executed: Row[]): Row {
  let best: Plan | undefined;
  let input: SolverInput | undefined;
  solveTap.onSolve = (solved, result) => {
    if (input === undefined && solved.firstKey === undefined) {
      input = solved;
      best = result.plans[0];
    }
  };
  let decision: Decision | null;
  try {
    decision = combatPlan.planCombatTurn(envOf(raw, first));
  } finally {
    solveTap.onSolve = null;
  }
  const solver = lineOf(best);
  // The line the log played from here, replayed on this solver input (null: a play the input's hand cannot make).
  const steps: Step[] = executed.map((step) => ({ cardIndex: Number(step["cardIndex"]), cardId: String(step["cardId"]), upgraded: false, cost: 0, name: "", target: step["target"] === null || step["target"] === undefined ? null : Number(step["target"]), targetName: null }));
  const logged = input ? lineOf(replaySteps(input, steps)) : null;
  const base = { solver, logged };
  if (!decision) return { kind: null, ...base };
  if (decision.kind !== "ask") return { kind: "act", label: decision.label, intent: decision.intent, rationale: decision.rationale, ...base };
  const ask = decision as AskDecision;
  const criteria = (ask.questions["plan"] as { criteria: Record<string, string | null> } | undefined)?.criteria ?? {};
  const options = Object.fromEntries(Object.entries(criteria).filter(([key]) => /^(plan|p)\d+$/.test(key)).map(([key, text]) => [key, text ? (JSON.parse(text) as Row) : {}]));
  const rolloutBest = Object.keys(options).filter((key) => options[key]!["rollout_best"] === true);
  const pickKey = rolloutBest[0] ?? Object.keys(options)[0];
  const resolved = pickKey ? ask.resolve({ plan: { type: "choice", choice: pickKey, probabilities: { [pickKey]: 0.95 }, confidence: 0.95, raw: {} } } as unknown as AnswerSet) : null;
  return {
    kind: "ask",
    label: ask.label,
    options: Object.fromEntries(Object.entries(options).map(([key, option]) => [key, String(option["plays"] ?? option["label"] ?? "")])),
    optionNumbers: Object.fromEntries(Object.entries(options).map(([key, option]) => [key, { hp: option["hp_lost"] ?? null, dmg: option["damage_dealt"] ?? null }])),
    rollout_best: rolloutBest,
    rollout_pick_intent: resolved?.intent ?? null,
    ...base,
  };
}

function changesOf(before: Row, after: Row): Record<string, boolean> {
  const same = (key: string) => JSON.stringify(before[key] ?? null) === JSON.stringify(after[key] ?? null);
  return {
    kind: !same("kind") || !same("label"),
    action: !same("intent"),
    options: !same("options"),
    rollout_best: !same("rollout_best"),
    rollout_pick: !same("rollout_pick_intent"),
    solver: !same("solver"),
  };
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  // SL_RETRY_MEMO would hand one side's rollouts to the other on the same input.
  computeMemoOptions.enabled = false;
  if (mode === "ab" && !switches.cardConditionOptions) throw new Error("ab mode needs cardConditionOptions (the fixed card-model)");
  if (mode === "plain" && switches.cardConditionOptions) switches.cardConditionOptions.enabled = arg("switch", "on") !== "off";
  const all = JSON.parse(readFileSync(arg("frames", ""), "utf8")) as Row[];
  const frames = all.filter((_frame, i) => i % part[1] === part[0] - 1);
  const fd = openSync(fromRoot("logs/states.jsonl"), "r");
  const stateAt = (off: number, len: number): Row => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row;
  };
  const out = join(outDir, part[1] > 1 ? `results.${part[0]}.jsonl` : "results.jsonl");
  writeFileSync(out, "");
  const results: Row[] = [];
  for (const frame of frames) {
    const raw = () => stateAt(Number(frame["off"]), Number(frame["len"]));
    const first = () => (frame["first_off"] !== undefined ? stateAt(Number(frame["first_off"]), Number(frame["first_len"])) : null);
    const executed = (frame["executed"] as Row[] | undefined) ?? [];
    const { off: _o, len: _l, first_off: _fo, first_len: _fl, ...meta } = frame;
    let result: Row;
    if (mode === "plain") {
      result = { ...meta, view: viewOf(raw(), first(), executed) };
    } else {
      switches.cardConditionOptions!.enabled = false;
      const before = viewOf(raw(), first(), executed);
      switches.cardConditionOptions!.enabled = true;
      const after = viewOf(raw(), first(), executed);
      result = { ...meta, changed: changesOf(before, after), before, after };
    }
    results.push(result);
    writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
  }
  closeSync(fd);
  if (mode === "ab" && part[1] === 1) summarize(results);
}

const mean = (values: number[]) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : NaN);

function summarize(results: Row[]): void {
  const lines: string[] = [];
  const cards = [...new Set(results.flatMap((row) => row["cards"] as string[]))].sort();
  const sets: [string, (row: Row) => boolean][] = [["all", () => true], ["A8+", (row) => Number(row["asc"] ?? 0) >= 8], ...cards.map((card) => [card, (row: Row) => (row["cards"] as string[]).includes(card)] as [string, (row: Row) => boolean])];
  for (const [set, keep] of sets) {
    const rows = results.filter(keep);
    const count = (key: string) => rows.filter((row) => (row["changed"] as Record<string, boolean>)[key]).length;
    const any = rows.filter((row) => Object.values(row["changed"] as Record<string, boolean>).some(Boolean)).length;
    const code = (view: Row) => view["kind"] === "act";
    const codeRows = rows.filter((row) => code(row["before"] as Row) || code(row["after"] as Row));
    const codeChanged = codeRows.filter((row) => JSON.stringify((row["before"] as Row)["intent"] ?? null) !== JSON.stringify((row["after"] as Row)["intent"] ?? null) || (row["before"] as Row)["kind"] !== (row["after"] as Row)["kind"]).length;
    const asks = (key: "before" | "after") => rows.filter((row) => (row[key] as Row)["kind"] === "ask").length;
    const askRows = rows.filter((row) => (row["before"] as Row)["kind"] === "ask" && (row["after"] as Row)["kind"] === "ask");
    // Forecast of the logged line against the log (complete lines only: every play a card of this hand, ended by end_turn).
    const forecast = rows.filter((row) => row["complete"] === true && (row["before"] as Row)["logged"] && (row["after"] as Row)["logged"]);
    const err = (key: "before" | "after", field: "energyLeft" | "hpLoss") =>
      forecast
        .map((row) => {
          const logged = (row[key] as Row)["logged"] as Row;
          const actual = field === "energyLeft" ? row["end_energy"] : row["hp_next"] === null || row["hp_next"] === undefined ? null : Number(row["hp"]) - Number(row["hp_next"]);
          return actual === null || actual === undefined ? null : Number(logged[field]) - Number(actual);
        })
        .filter((value): value is number => value !== null && Number.isFinite(value));
    const fmt = (values: number[]) => `n ${values.length}, mean |err| ${mean(values.map(Math.abs)).toFixed(2)}, mean err ${mean(values).toFixed(2)}, exact ${values.filter((value) => value === 0).length}`;
    lines.push(`${set}: ${rows.length} decisions (${new Set(rows.map((row) => row["run"])).size} runs); changed: any ${any}; code's plays ${codeChanged} of ${codeRows.length} code decisions (kind/label ${count("kind")}, action ${count("action")}); Jev questions ${asks("before")} -> ${asks("after")}, lines changed in ${askRows.filter((row) => (row["changed"] as Record<string, boolean>)["options"]).length} of ${askRows.length} asked both times; rollout's pick ${count("rollout_best")} (its action ${count("rollout_pick")}); solver's best line ${count("solver")}`);
    lines.push(`  logged line's forecast vs the log: energy left off ${fmt(err("before", "energyLeft"))} | on ${fmt(err("after", "energyLeft"))}`);
    lines.push(`  logged line's forecast vs the log: HP lost      off ${fmt(err("before", "hpLoss"))} | on ${fmt(err("after", "hpLoss"))}`);
  }
  lines.push("");
  lines.push("Changed decisions:");
  for (const row of results.filter((entry) => Object.values(entry["changed"] as Record<string, boolean>).some(Boolean))) {
    const text = (view: Row) => {
      const solver = view["solver"] as Row | null;
      const best = solver ? `best ${String(solver["steps"]) || "end turn"} (hp -${String(solver["hpLoss"])}, dmg ${String(solver["damage"])}, en ${String(solver["energyLeft"])})` : "no solve";
      return view["kind"] === "act" ? `code ${String(view["label"])} ${JSON.stringify(view["intent"])}; ${best}` : `ask ${String(view["label"])} [${Object.values((view["options"] as Record<string, string>) ?? {}).join(" | ")}] rollout ${JSON.stringify(view["rollout_best"])} ${JSON.stringify(view["rollout_pick_intent"])}; ${best}`;
    };
    lines.push(`  ${String(row["run"])} A${String(row["asc"])} F${String(row["floor"])} T${String(row["turn"])} ${String(row["ts"])} [${(row["cards"] as string[]).join(",")}] logged ${String(row["label"])} ${JSON.stringify(row["chosen"])}`);
    lines.push(`    off: ${text(row["before"] as Row)}`);
    lines.push(`    on:  ${text(row["after"] as Row)}`);
  }
  const summary = lines.join("\n");
  writeFileSync(join(outDir, "summary.txt"), `${summary}\n`);
  console.log(lines.slice(0, lines.indexOf("")).join("\n"));
}

if (from) {
  mkdirSync(outDir, { recursive: true });
  summarize(from.split(",").flatMap((file) => readFileSync(file, "utf8").trim().split("\n").filter((line) => line.length > 0).map((line) => JSON.parse(line) as Row)));
} else await main();
