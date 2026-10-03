/**
 * Offline check of the Enthralled fix (2026-10-03): Enthralled (执迷, the Blood-Soaked Rose's 2-cost Eternal curse) locks
 * every other hand card until it is played (blocked_by_hook, preventer ENTHRALLED); the planner gave the solver only the
 * mod's playable cards, so its lines were Enthralled alone or end turn (HYQW47E7CBSC F38 T4: end turn at 5 energy, -13).
 *
 * Each logged combat frame given is planned again with the clocks frozen (the rollout's and the random potions' whole
 * schedules), B2 off, no SL, no model call; logs are read only (states.jsonl at the frames' offsets).
 * --mode ab (default): twice, playFirstOptions off (the old model) and on; compared: code's kind/label, code's action, the
 * question's lines, the rollout's pick and its action, the solver's best line.
 * --mode plain: once with the code as it is (no switch: a tree without the fix too), for a byte-for-byte comparison of
 * two trees' rows.
 *
 * Usage: npx tsx tools/enthralled-replay.ts --frames <frames.json> --out <dir> [--mode ab|plain] [--from <results.jsonl>]
 * frames.json: [{ off, len, ts, run, floor, turn, hand, label, decider, chosen, rationale }] (states.jsonl byte offset and
 * length; `hand`: Enthralled in hand; the rest: the logged decision). Output: <out>/results.jsonl and, in ab mode, a summary
 * on stdout (also <out>/summary.txt).
 */
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { solveTap, type Plan } from "../src/strategy/turn-solver.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const outDir = arg("out", "experiments/enthralled");
const mode = arg("mode", "ab");
const from = arg("from", "");
type Row = Record<string, unknown>;

const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);
function envOf(raw: Row): DecisionEnv {
  const state = parseGameState(raw);
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
}

const lineOf = (plan: Plan | undefined) => (plan ? { steps: plan.steps.map((step) => `${step.cardId}${step.target !== null ? `>${step.target}` : ""}`).join(","), hpLoss: plan.outcome.hpLoss, damage: plan.outcome.damageDealt } : null);

/** A decision as data to compare: code's action, or the question's options (plays, rollout pick); the solver's best line. */
function viewOf(raw: Row): Row {
  let best: Plan | undefined;
  let solves = 0;
  solveTap.onSolve = (_input, result) => {
    solves += 1;
    if (solves === 1) best = result.plans[0];
  };
  let decision: Decision | null;
  try {
    decision = planCombatTurn(envOf(raw));
  } finally {
    solveTap.onSolve = null;
  }
  const solver = lineOf(best);
  if (!decision) return { kind: null, solver };
  if (decision.kind !== "ask") return { kind: "act", label: decision.label, intent: decision.intent, rationale: decision.rationale, solver };
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
    rollout_best: rolloutBest,
    rollout_pick_intent: resolved?.intent ?? null,
    solver,
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
  // The switch exists only with the fix: a tree without it plans as it is (plain mode).
  const switches = (await import("../src/strategy/card-model.js")) as { playFirstOptions?: { enabled: boolean } };
  if (mode === "ab" && !switches.playFirstOptions) throw new Error("ab mode needs playFirstOptions (the fixed card-model)");
  const frames = JSON.parse(readFileSync(arg("frames", ""), "utf8")) as Row[];
  const fd = openSync("logs/states.jsonl", "r");
  const stateAt = (off: number, len: number): Row => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row;
  };
  const out = join(outDir, "results.jsonl");
  writeFileSync(out, "");
  const results: Row[] = [];
  for (const frame of frames) {
    const raw = () => stateAt(Number(frame["off"]), Number(frame["len"]));
    const { off: _o, len: _l, ...meta } = frame;
    let result: Row;
    if (mode === "plain") {
      result = { ...meta, view: viewOf(raw()) };
    } else {
      switches.playFirstOptions!.enabled = false;
      const before = viewOf(raw());
      switches.playFirstOptions!.enabled = true;
      const after = viewOf(raw());
      result = { ...meta, changed: changesOf(before, after), before, after };
    }
    results.push(result);
    writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
  }
  closeSync(fd);
  if (mode === "ab") summarize(results);
}

function summarize(results: Row[]): void {
  const lines: string[] = [];
  for (const [set, keep] of [["Enthralled in hand", (row: Row) => row["hand"] === true], ["Enthralled in a pile", (row: Row) => row["hand"] !== true]] as const) {
    const rows = results.filter(keep);
    const count = (key: string) => rows.filter((row) => (row["changed"] as Record<string, boolean>)[key]).length;
    const any = rows.filter((row) => Object.values(row["changed"] as Record<string, boolean>).some(Boolean)).length;
    lines.push(`${set}: ${rows.length} decisions (${new Set(rows.map((row) => row["run"])).size} runs); changed: any ${any}, code's kind/label ${count("kind")}, code's action ${count("action")}, the question's lines ${count("options")}, rollout's pick ${count("rollout_best")} (its intent ${count("rollout_pick")}), the solver's best line ${count("solver")}`);
    for (const row of rows.filter((entry) => Object.values(entry["changed"] as Record<string, boolean>).some(Boolean))) {
      const text = (view: Row) => {
        const solver = view["solver"] as Row | null;
        const best = solver ? `best ${String(solver["steps"]) || "end turn"} (hp -${String(solver["hpLoss"])}, dmg ${String(solver["damage"])})` : "no solve";
        return view["kind"] === "act" ? `code ${String(view["label"])} ${JSON.stringify(view["intent"])}; ${best}` : `ask ${String(view["label"])} [${Object.values((view["options"] as Record<string, string>) ?? {}).join(" | ")}] rollout ${JSON.stringify(view["rollout_best"])}; ${best}`;
      };
      lines.push(`  ${String(row["run"])} F${String(row["floor"])} T${String(row["turn"])} ${String(row["ts"])} logged ${String(row["label"])} ${JSON.stringify(row["chosen"])}`);
      lines.push(`    before: ${text(row["before"] as Row)}`);
      lines.push(`    after:  ${text(row["after"] as Row)}`);
    }
  }
  const summary = lines.join("\n");
  writeFileSync(join(outDir, "summary.txt"), `${summary}\n`);
  console.log(summary);
}

if (from) {
  mkdirSync(outDir, { recursive: true });
  summarize(readFileSync(from, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Row));
} else await main();
