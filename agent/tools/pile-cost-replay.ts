/**
 * Offline check of Spiked Gauntlets' +1 on the Powers modelled off the hand (2026-10-03, card-model pilePowerExtraCost). The
 * hand and the pile lines show a Power at its cost + 1 under the relic; the deck's entries do not, and the pile models
 * (pileEntries: the known draws, the rollout's later turns, the random potions' piles, the any-draw bound; deckModels: the
 * hand's base cards back in the piles) took the deck's.
 *
 * Every logged combat planning decision with Spiked Gauntlets held is planned again twice, pileCostOptions.relics off (the
 * deck's cost, as before) and on, the clocks frozen (the rollout's and the random potions' whole schedules), B2 off, no SL;
 * and a control sample without the relic (nothing may change there). Compared: code's own action, the question's options,
 * the rollout's pick, the random potions' Monte Carlo, and a least-loss verdict's any-draw bound (worked out here, as the SL
 * judge would). No model is called; logs are read only (the log DB for the rows, states.jsonl at their offsets).
 *
 * Usage: npx tsx tools/pile-cost-replay.ts [--out experiments/pile-cost] [--control 40] [--shard i/n] [--from <a.jsonl,b.jsonl>]
 * Output: <out>/results.jsonl (one row per decision, both plans where anything changed; a shard: results-<i>.jsonl) and a
 * summary on stdout (also <out>/summary.txt); --from: the summary of results already planned (no planning; shards merged).
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv } from "../src/memory/types.js";
import { drawBoundOf, leastLossFactsOf, planCombatTurn, thiefTrace } from "../src/reflex/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { pileCostOptions } from "../src/reflex/card-model.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const outDir = arg("out", fromRoot("experiments/pile-cost"));
const controlCount = Number(arg("control", "40"));
const [shard, shards] = arg("shard", "0/1").split("/").map(Number) as [number, number];
const from = arg("from", "");
type Row = Record<string, unknown>;
type TraceLast = (typeof thiefTrace)["last"];

const PLANNING = "combat/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)";

function query(sql: string): Row[] {
  const out = execFileSync(fromRoot("data/logdb-venv/bin/python"), [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);
function envOf(raw: Row): DecisionEnv {
  const state = parseGameState(raw);
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
}

/** A decision as data to compare: code's action, or the question's options (plays, rollout pick), the random potions' Monte Carlo, the any-draw bound. */
function viewOf(raw: Row): Row {
  thiefTrace.enabled = true;
  thiefTrace.last = null;
  const decision: Decision | null = planCombatTurn(envOf(raw));
  if (!decision) return { kind: null };
  // (Read through the object: the null set above would narrow a direct read to never.)
  const last = (thiefTrace as { last: TraceLast }).last;
  const mc = (last?.mcShown ?? []).map((entry) => ({
    potion: entry.source.potionId,
    beats: entry.beats,
    samples: entry.samples,
    median: entry.median ? { damage: entry.median.outcome.damageDealt, hpLoss: entry.median.outcome.hpLoss, steps: entry.median.steps.map((step) => step.name).join(", ") } : null,
  }));
  const boundOf = drawBoundOf(leastLossFactsOf(decision));
  const bound = boundOf ? boundOf() : null;
  const boundView = bound ? { refused: bound.refused, ...(bound.superset ? { cards: bound.superset.cards, allDie: bound.superset.allDie, aliveAfterDraw: bound.superset.aliveAfterDraw, inexact: bound.superset.inexact.length } : {}) } : null;
  if (decision.kind !== "ask") return { kind: "act", label: decision.label, intent: decision.intent, mc, ...(boundView ? { bound: boundView } : {}) };
  const ask = decision as AskDecision;
  const criteria = (ask.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  const options = Object.fromEntries(Object.entries(criteria).filter(([key]) => /^(plan|p)\d+$/.test(key)).map(([key, text]) => [key, text ? (JSON.parse(text) as Row) : {}]));
  const rolloutBest = Object.keys(options).filter((key) => options[key]!["rollout_best"] === true);
  // Jev's answer as logged is not re-asked: the resolution of the rollout's pick (what code would play on no answer).
  const pickKey = rolloutBest[0] ?? Object.keys(options)[0];
  const resolved = pickKey ? ask.resolve({ plan: { type: "choice", choice: pickKey, probabilities: { [pickKey]: 0.95 }, confidence: 0.95, raw: {} } } as unknown as AnswerSet) : null;
  return {
    kind: "ask",
    label: ask.label,
    options: Object.fromEntries(Object.entries(options).map(([key, option]) => [key, String(option["plays"] ?? option["label"] ?? "")])),
    // The rollout's numbers per line, as the question shows them.
    rollout: Object.fromEntries(Object.entries(options).map(([key, option]) => [key, option["rollout"] ?? null])),
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
  const base = `SELECT d.ts, d.run_id, d.floor, d.turn, d.label, d.decider, f.off, f.len, f.energy
    FROM decisions d JOIN frames f ON f.run_id = d.run_id AND f.ts = d.ts AND coalesce(f.observed, false) = false
    WHERE d.screen = 'COMBAT' AND regexp_matches(d.label, '^${PLANNING}') AND f.in_combat`;
  const cases = query(`${base} AND list_contains(f.relics, 'SPIKED_GAUNTLETS') ORDER BY d.ts`);
  const control = controlCount > 0 ? query(`${base} AND NOT list_contains(f.relics, 'SPIKED_GAUNTLETS') ORDER BY hash(d.ts) LIMIT ${controlCount}`) : [];
  const fd = openSync(fromRoot("logs/states.jsonl"), "r");
  const stateAt = (off: number, len: number): Row => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row;
  };
  const results: Row[] = [];
  const out = join(outDir, shards > 1 ? `results-${shard}.jsonl` : "results.jsonl");
  writeFileSync(out, "");
  let k = 0;
  for (const [set, rows] of [["gauntlets", cases], ["control", control]] as const) {
    for (const row of rows) {
      if (k++ % shards !== shard) continue;
      const raw = stateAt(Number(row["off"]), Number(row["len"]));
      pileCostOptions.relics = false;
      const before = viewOf(raw);
      pileCostOptions.relics = true;
      const after = viewOf(raw);
      const changed = changesOf(before, after);
      const result = { set, ts: row["ts"], run: row["run_id"], floor: row["floor"], turn: row["turn"], label: row["label"], decider: row["decider"], energy: row["energy"], powers: pilePowers(raw), bound: before["bound"] !== undefined, changed };
      results.push({ ...result, before, after });
      // Both plans only where something changed (the rest: the row).
      writeFileSync(out, `${JSON.stringify(Object.values(changed).some(Boolean) ? { ...result, before, after } : result)}\n`, { flag: "a" });
    }
  }
  closeSync(fd);
  summarize(results);
}

/** The Powers in the draw and discard piles, as their lines read ("残酷 [2费]"). */
function pilePowers(raw: Row): string[] {
  const view = ((raw["agent_view"] as Row | undefined)?.["combat"] ?? {}) as Row;
  return (["draw", "discard"] as const).flatMap((pile) =>
    ((view[pile] ?? []) as Row[])
      .filter((entry) => knowledge.card(String(((entry["card_ids"] ?? []) as string[])[0] ?? ""))?.type === "Power")
      .map((entry) => `${pile}: ${String(entry["line"]).split("：")[0]!}`),
  );
}

/** What changed: code's kind or label, code's action, the question's lines, the rollout's numbers and pick, the Monte Carlo, the bound. */
function changesOf(before: Row, after: Row): Record<string, boolean> {
  const same = (key: string) => JSON.stringify(before[key] ?? null) === JSON.stringify(after[key] ?? null);
  return {
    kind: !same("kind") || !same("label"),
    action: !same("intent"),
    options: !same("options"),
    rollout: !same("rollout"),
    rollout_best: !same("rollout_best"),
    rollout_pick: !same("rollout_pick_intent"),
    mc: !same("mc"),
    bound: !same("bound"),
  };
}

function summarize(results: Row[]): void {
  const lines: string[] = [];
  for (const set of ["gauntlets", "control"]) {
    const rows = results.filter((row) => row["set"] === set);
    const count = (key: string) => rows.filter((row) => (row["changed"] as Record<string, boolean>)[key]).length;
    const any = rows.filter((row) => Object.values(row["changed"] as Record<string, boolean>).some(Boolean)).length;
    const withPowers = rows.filter((row) => (row["powers"] as string[]).length > 0).length;
    lines.push(
      `${set}: ${rows.length} decisions (${new Set(rows.map((row) => row["run"])).size} runs; a Power in the draw or discard pile in ${withPowers}); changed: any ${any}, code's kind/label ${count("kind")}, code's action ${count("action")}, the question's lines ${count("options")}, the rollout's numbers ${count("rollout")}, rollout's pick ${count("rollout_best")} (its intent ${count("rollout_pick")}), the random potions' Monte Carlo ${count("mc")}, the any-draw bound ${count("bound")} (of ${rows.filter((row) => row["bound"] === true).length} least-loss verdicts with one)`,
    );
    for (const row of rows.filter((entry) => { const c = entry["changed"] as Record<string, boolean>; return c["kind"] || c["action"] || c["options"] || c["rollout_best"] || c["rollout_pick"] || c["bound"]; })) {
      const before = row["before"] as Row;
      const after = row["after"] as Row;
      const what = before["kind"] === "act" && after["kind"] === "act"
        ? `code ${String(before["label"])} ${JSON.stringify(before["intent"])} -> ${String(after["label"])} ${JSON.stringify(after["intent"])}`
        : before["kind"] !== after["kind"]
          ? `${String(before["label"])} -> ${String(after["label"])}`
          : `question; rollout pick ${JSON.stringify(before["rollout_best"])} -> ${JSON.stringify(after["rollout_best"])}${JSON.stringify(before["rollout_pick_intent"]) !== JSON.stringify(after["rollout_pick_intent"]) ? ` (${JSON.stringify(before["rollout_pick_intent"])} -> ${JSON.stringify(after["rollout_pick_intent"])})` : ""}${(row["changed"] as Record<string, boolean>)["options"] ? "; lines changed" : ""}`;
      const bound = (row["changed"] as Record<string, boolean>)["bound"] ? `; bound ${JSON.stringify(before["bound"])} -> ${JSON.stringify(after["bound"])}` : "";
      lines.push(`  ${String(row["run"])} F${String(row["floor"])} T${String(row["turn"])} ${String(row["ts"])} ${String(row["label"])} (energy ${String(row["energy"])}; ${(row["powers"] as string[]).join(", ") || "no pile Power"}): ${what}${bound}`);
    }
  }
  const summary = lines.join("\n");
  writeFileSync(join(outDir, "summary.txt"), `${summary}\n`);
  console.log(summary);
}

if (from) summarize(from.split(",").flatMap((file) => readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row)).map((row) => (row["before"] ? { ...row, changed: changesOf(row["before"] as Row, row["after"] as Row) } : row)));
else main();
