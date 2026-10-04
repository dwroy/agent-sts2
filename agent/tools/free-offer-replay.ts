/**
 * Offline check of the card choice for this turn scored at this turn's cost (2026-10-03, selection.ts freeOfferSource). A card
 * potion's offer (Attack / Skill / Power / Colorless Potion), Liquid Memories' and Discovery's are free this turn; the screen
 * scored them at their printed cost (「选择一张牌」 is all it says).
 *
 * Every logged combat card-selection decision is planned again twice, freeOfferOptions.enabled off (as before) and on, with
 * the loop's memory as it was (screenMemory.cardSource: the last use_potion / play_card decision of the same run, floor
 * and turn, its potion_id / card_id as the log DB resolved it). Compared: code's decision (kind, label, intent) and its
 * top-scored option (the deterministic fallback's pick, as with no usable answer). No model is called; logs are read only.
 *
 * Usage: npx tsx tools/free-offer-replay.ts [--out experiments/free-offer] [--from <results.jsonl>]
 * Output: <out>/results.jsonl (a row per free offer and per decision the switch changes, both plans where they differ;
 * the others are counted in the summary only) and a summary on stdout (also <out>/summary.txt; --from: the summary of
 * the rows written).
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { facingFightOf } from "../src/screens/combat-plan.js";
import { freeOfferOptions, freeOfferSource, planSelection } from "../src/screens/selection.js";
import { asRecord, str } from "../src/util/json.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const outDir = arg("out", fromRoot("experiments/free-offer"));
const from = arg("from", "");
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(fromRoot("data/logdb-venv/bin/python"), [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

/** The decision as data: kind, label, intent, and the top-scored option (the fallback's pick on an empty answer). */
function viewOf(env: DecisionEnv): Row {
  const decision = planSelection(env);
  if (!decision) return { kind: null };
  if (decision.kind === "act") return { kind: "act", label: decision.label, intent: decision.intent, rationale: decision.rationale };
  const resolved = decision.resolve({} as AnswerSet);
  // The candidates as the question shows them: name and cost (the text left out).
  const candidates = ((asRecord(decision.state)["candidates"] ?? []) as Row[]).map((card) => `${String(card["card"])} ${String(card["cost"])}`);
  return { kind: "ask", label: decision.label, options: Object.keys(asRecord(decision.questions["pick"] ? (decision.questions["pick"] as { criteria: Row }).criteria : {})), top: resolved.intent, candidates };
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  // The last potion drunk or card played before each selection (the loop's memory, noteCardSource), same run.
  const rows = query(`WITH src AS (SELECT run_id, ts, floor, turn, action, coalesce(potion_id, card_id) AS id FROM decisions WHERE action IN ('use_potion', 'play_card') AND screen = 'COMBAT'),
    sel AS (SELECT d.ts, d.run_id, d.floor, d.turn, d.label, d.decider, d.action, d.option_index, f.off, f.len, list_contains(f.relics, 'SPIKED_GAUNTLETS') AS gauntlets
      FROM decisions d JOIN frames f ON f.run_id = d.run_id AND f.ts = d.ts AND coalesce(f.observed, false) = false
      WHERE d.screen = 'CARD_SELECTION' AND f.in_combat)
    SELECT sel.*, src.action AS src_action, src.id AS src_id, src.floor AS src_floor, src.turn AS src_turn
    FROM sel ASOF LEFT JOIN src ON src.run_id = sel.run_id AND sel.ts > src.ts ORDER BY sel.ts`);
  const fd = openSync(fromRoot("logs/states.jsonl"), "r");
  const out = join(outDir, "results.jsonl");
  writeFileSync(out, "");
  const results: Row[] = [];
  for (const row of rows) {
    const buffer = Buffer.alloc(Number(row["len"]));
    readSync(fd, buffer, 0, Number(row["len"]), Number(row["off"]));
    const raw = (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row;
    const state = parseGameState(raw);
    const envOf = (): DecisionEnv => {
      const screenMemory = createScreenMemory(state.screen);
      if (row["src_id"] && row["src_floor"] === row["floor"] && row["src_turn"] === row["turn"]) {
        screenMemory.cardSource = { fight: facingFightOf(state), turn: state.turn ?? null, action: row["src_action"] as "use_potion" | "play_card", id: String(row["src_id"]) };
      }
      return {
        state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory, thresholds: config.thresholds, runStart: "auto",
        characterPreference: null, allowFtueModals: false, strictJev: false, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "jev",
      };
    };
    freeOfferOptions.enabled = false;
    const before = viewOf(envOf());
    freeOfferOptions.enabled = true;
    const env = envOf();
    const source = freeOfferSource(env, str(asRecord(raw["selection"])["kind"]));
    const after = viewOf(env);
    const result = {
      ts: row["ts"], run: row["run_id"], floor: row["floor"], turn: row["turn"], label: row["label"], decider: row["decider"], logged_pick: row["option_index"], gauntlets: row["gauntlets"],
      kind: str(asRecord(raw["selection"])["kind"]), src: row["src_floor"] === row["floor"] && row["src_turn"] === row["turn"] ? `${String(row["src_action"])}:${String(row["src_id"])}` : null,
      free: source, changed: changesOf(before, after),
    };
    results.push({ ...result, before, after });
    // Written: the free offers and any decision the switch changes, with both plans (the rest are only counted).
    if (source || result.changed.any) writeFileSync(out, `${JSON.stringify(result.changed.any ? { ...result, before, after } : result)}\n`, { flag: "a" });
  }
  closeSync(fd);
  summarize(results);
}

/** What changed: the whole decision, code's decision (kind/label/intent), the top-scored option. */
function changesOf(before: Row, after: Row): Record<string, boolean> {
  const same = (key: string) => JSON.stringify(before[key] ?? null) === JSON.stringify(after[key] ?? null);
  return {
    any: JSON.stringify(before) !== JSON.stringify(after),
    kind: !same("kind") || !same("label"),
    action: !same("intent"),
    top: JSON.stringify(before["top"] ?? before["intent"] ?? null) !== JSON.stringify(after["top"] ?? after["intent"] ?? null),
  };
}

function summarize(results: Row[]): void {
  const lines: string[] = [];
  const changed = (row: Row, key: string) => (row["changed"] as Record<string, boolean>)[key] === true;
  const group = (name: string, rows: Row[]) => {
    const count = (key: string) => rows.filter((row) => changed(row, key)).length;
    lines.push(`${name}: ${rows.length} decisions (${new Set(rows.map((row) => row["run"])).size} runs); changed: any ${count("any")}, top pick ${count("top")}, code's decision ${count("action")} (kind/label ${count("kind")})`);
  };
  const free = results.filter((row) => row["free"]);
  const firstPotionPicks = free.filter((row) => /^use_potion:(ATTACK|SKILL|POWER|COLORLESS)_POTION$/.test(String(row["src"])) && row["label"] === "selection/take into my hand");
  group("free offers (all)", free);
  for (const source of [...new Set(free.map((row) => String(row["src"] ?? row["free"])))].sort()) group(`  ${source}`, free.filter((row) => String(row["src"] ?? row["free"]) === source));
  group("  the card potions' 'take into my hand' picks", firstPotionPicks);
  // A pick re-sent on the same screen (the first did not land: 55 logged) counted once.
  const seen = new Set<string>();
  const first = firstPotionPicks.filter((row) => {
    const key = `${String(row["run"])}:${String(row["floor"])}:${String(row["turn"])}:${String(row["src"])}`;
    return seen.has(key) ? false : (seen.add(key), true);
  });
  group("  ... their first picks (a re-sent pick counted once)", first);
  const flips = (rows: Row[], a: string, b: string) => rows.filter((row) => (row["before"] as Row | undefined)?.["kind"] === a && (row["after"] as Row)["kind"] === b).length;
  lines.push(`    code decides now (ask -> act) ${flips(first, "ask", "act")}, asked now (act -> ask) ${flips(first, "act", "ask")}; top pick or decider changed ${first.filter((row) => changed(row, "top") || changed(row, "kind")).length}`);
  group("  under Spiked Gauntlets", free.filter((row) => row["gauntlets"]));
  const control = results.filter((row) => !row["free"]);
  group("not free (control)", control);
  for (const source of [...new Set(control.filter((row) => /take|choose/.test(String(row["label"]))).map((row) => String(row["src"])))].sort()) group(`  ${source} (${String(control.find((row) => String(row["src"]) === source)?.["label"])})`, control.filter((row) => String(row["src"]) === source && /take|choose/.test(String(row["label"]))));
  lines.push("free offers whose top pick changed:");
  for (const row of free.filter((entry) => changed(entry, "top"))) {
    const before = row["before"] as Row;
    const after = row["after"] as Row;
    const pick = (view: Row) => String((asRecord(view["top"] ?? view["intent"]) as Row)["option_index"]);
    lines.push(`  ${String(row["run"])} F${String(row["floor"])} T${String(row["turn"])} ${String(row["ts"])} ${String(row["src"] ?? row["free"])}${row["gauntlets"] ? " (Spiked Gauntlets)" : ""}: card${pick(before)} -> card${pick(after)} (${String(before["kind"])} -> ${String(after["kind"])}; logged pick card${String(row["logged_pick"])}, ${String(row["decider"])})${after["kind"] === "act" ? `; ${String(after["rationale"])}` : ""}`);
  }
  const summary = lines.join("\n");
  writeFileSync(join(outDir, "summary.txt"), `${summary}\n`);
  console.log(summary);
}

if (from) summarize(readFileSync(from, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Row).map((row) => (row["before"] ? { ...row, changed: changesOf(row["before"] as Row, row["after"] as Row) } : row)));
else main();
