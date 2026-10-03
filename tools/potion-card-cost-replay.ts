/**
 * Offline check of what a card a potion adds costs this turn (2026-10-03). The game: free this turn, then a relic's change
 * on top (Spiked Gauntlets: Powers cost 1 more; A4PWRULKG2JT F46 T1, the Power Potion's Demon Form at 1 with 0 energy,
 * never played; 549 logged drinks of the card potions: every other card at 0). The planner had every such card at 0.
 *
 * Every logged combat planning decision with a card potion in the belt (Attack / Skill / Power / Colorless Potion, Orobic
 * Acid, Liquid Memories) and Spiked Gauntlets held is planned again twice, potionCardCostOptions.relics off (the card at
 * 0, as before) and on, the clocks frozen (the rollout's and the random potions' whole schedules), B2 off, no SL; and a
 * control sample of the same decisions without the relic (nothing may change there). Compared: code's own action, the
 * question's options, the rollout's pick, and each card potion's Monte Carlo (the samples beating the best potion-free
 * line, the median line's damage and HP). No model is called; logs are read only (the log DB for the rows, states.jsonl
 * at their offsets).
 *
 * Usage: npx tsx tools/potion-card-cost-replay.ts [--out experiments/potion-card-cost] [--control 40] [--from <results.jsonl>]
 * Output: <out>/results.jsonl (one row per decision) and a summary on stdout (also <out>/summary.txt); --from: the summary
 * of results already planned (no planning).
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn, thiefTrace } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionCardCostOptions } from "../src/strategy/card-model.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const outDir = arg("out", "experiments/potion-card-cost");
const controlCount = Number(arg("control", "40"));
const from = arg("from", "");
type Row = Record<string, unknown>;

const CARD_POTIONS = ["POWER_POTION", "ATTACK_POTION", "SKILL_POTION", "COLORLESS_POTION", "OROBIC_ACID", "LIQUID_MEMORIES"];
const PLANNING = "combat/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)";

function query(sql: string): Row[] {
  const out = execFileSync(".cache/logdb-venv/bin/python", ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const fd = openSync("logs/states.jsonl", "r");
function stateAt(off: number, len: number): Row {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row;
}

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

/** A decision as data to compare: code's action, or the question's options (plays, rollout pick) and the card potions' Monte Carlo. */
function viewOf(raw: Row): Row {
  thiefTrace.enabled = true;
  thiefTrace.last = null;
  const decision: Decision | null = planCombatTurn(envOf(raw));
  if (!decision) return { kind: null };
  if (decision.kind !== "ask") return { kind: "act", label: decision.label, intent: decision.intent };
  const ask = decision as AskDecision;
  const criteria = (ask.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  const options = Object.fromEntries(Object.entries(criteria).filter(([key]) => /^(plan|p)\d+$/.test(key)).map(([key, text]) => [key, text ? (JSON.parse(text) as Row) : {}]));
  const mc = (thiefTrace.last?.mcShown ?? []).map((entry) => ({
    potion: entry.source.potionId,
    beats: entry.beats,
    samples: entry.samples,
    median: entry.median ? { damage: entry.median.outcome.damageDealt, hpLoss: entry.median.outcome.hpLoss, steps: entry.median.steps.map((step) => step.name).join(", ") } : null,
  }));
  const rolloutBest = Object.keys(options).filter((key) => options[key]!["rollout_best"] === true);
  // Jev's answer as logged is not re-asked: the resolution of the rollout's pick (what code would play on no answer).
  const pickKey = rolloutBest[0] ?? Object.keys(options)[0];
  const resolved = pickKey ? ask.resolve({ plan: { type: "choice", choice: pickKey, probabilities: { [pickKey]: 0.95 }, confidence: 0.95, raw: {} } } as unknown as AnswerSet) : null;
  return {
    kind: "ask",
    label: ask.label,
    options: Object.fromEntries(Object.entries(options).map(([key, option]) => [key, String(option["plays"] ?? option["label"] ?? "")])),
    rollout_best: rolloutBest,
    mc,
    rollout_pick_intent: resolved?.intent ?? null,
  };
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  const potionList = CARD_POTIONS.map((id) => `list_contains(f.potions, '${id}')`).join(" OR ");
  const base = `SELECT d.ts, d.run_id, d.floor, d.turn, d.label, d.decider, d.potion_id, f.off, f.len, f.energy, f.potions, list_contains(f.relics, 'SPIKED_GAUNTLETS') AS gauntlets
    FROM decisions d JOIN frames f ON f.run_id = d.run_id AND f.ts = d.ts AND coalesce(f.observed, false) = false
    WHERE d.screen = 'COMBAT' AND regexp_matches(d.label, '^${PLANNING}') AND f.in_combat AND (${potionList})`;
  const cases = query(`${base} AND list_contains(f.relics, 'SPIKED_GAUNTLETS') ORDER BY d.ts`);
  const control = controlCount > 0 ? query(`${base} AND NOT list_contains(f.relics, 'SPIKED_GAUNTLETS') ORDER BY hash(d.ts) LIMIT ${controlCount}`) : [];
  const results: Row[] = [];
  const out = join(outDir, "results.jsonl");
  writeFileSync(out, "");
  for (const [set, rows] of [["gauntlets", cases], ["control", control]] as const) {
    for (const row of rows) {
      const raw = stateAt(Number(row["off"]), Number(row["len"]));
      potionCardCostOptions.relics = false;
      const before = viewOf(raw);
      potionCardCostOptions.relics = true;
      const after = viewOf(raw);
      const result = { set, ts: row["ts"], run: row["run_id"], floor: row["floor"], turn: row["turn"], label: row["label"], decider: row["decider"], drank: row["potion_id"] ?? null, energy: row["energy"], potions: row["potions"], changed: changesOf(before, after), before, after };
      results.push(result);
      writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
    }
  }
  closeSync(fd);
  summarize(results);
}

/**
 * What changed between the two plans: code's kind or label, code's action, the question's lines (the plan options; a card
 * potion's option text names the relic now, not counted), the rollout's pick and its action, the card potions' Monte Carlo
 * (samples beating the best potion-free line, the median line).
 */
function changesOf(before: Row, after: Row): Record<string, boolean> {
  const same = (key: string) => JSON.stringify(before[key] ?? null) === JSON.stringify(after[key] ?? null);
  const lines = (view: Row) => JSON.stringify(Object.entries((view["options"] as Record<string, string> | undefined) ?? {}).filter(([key]) => key.startsWith("plan")));
  return {
    kind: !same("kind") || !same("label"),
    action: !same("intent"),
    options: lines(before) !== lines(after),
    rollout_best: !same("rollout_best"),
    rollout_pick: !same("rollout_pick_intent"),
    mc: !same("mc"),
  };
}

function summarize(results: Row[]): void {
  const lines: string[] = [];
  for (const set of ["gauntlets", "control"]) {
    const rows = results.filter((row) => row["set"] === set);
    const count = (key: string) => rows.filter((row) => (row["changed"] as Record<string, boolean>)[key]).length;
    const any = rows.filter((row) => Object.values(row["changed"] as Record<string, boolean>).some(Boolean)).length;
    lines.push(`${set}: ${rows.length} decisions (${new Set(rows.map((row) => row["run"])).size} runs); changed: any ${any}, code's kind/label ${count("kind")}, code's action ${count("action")}, the question's lines ${count("options")}, rollout's pick ${count("rollout_best")} (its intent ${count("rollout_pick")}), the card potions' Monte Carlo ${count("mc")}`);
    for (const row of rows.filter((entry) => Object.values(entry["changed"] as Record<string, boolean>).some(Boolean))) {
      const before = row["before"] as Row;
      const after = row["after"] as Row;
      const mcText = (view: Row) => ((view["mc"] as Row[] | undefined) ?? []).map((entry) => `${String(entry["potion"])} beats ${String(entry["beats"])}/${String(entry["samples"])}${entry["median"] ? ` median dmg ${String((entry["median"] as Row)["damage"])} hp -${String((entry["median"] as Row)["hpLoss"])}` : ""}`).join("; ");
      lines.push(`  ${String(row["run"])} F${String(row["floor"])} T${String(row["turn"])} ${String(row["ts"])} ${String(row["label"])} (energy ${String(row["energy"])}${row["drank"] ? `, drank ${String(row["drank"])}` : ""}): ${before["kind"] === "act" ? `code ${String(before["label"])} -> ${String(after["label"])}` : `question; rollout pick ${JSON.stringify(before["rollout_best"])} -> ${JSON.stringify(after["rollout_best"])}`}; MC ${mcText(before)} -> ${mcText(after)}`);
    }
  }
  const summary = lines.join("\n");
  writeFileSync(join(outDir, "summary.txt"), `${summary}\n`);
  console.log(summary);
}

if (from) {
  closeSync(fd);
  summarize(readFileSync(from, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Row).map((row) => ({ ...row, changed: changesOf(row["before"] as Row, row["after"] as Row) })));
} else main();
