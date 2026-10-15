/** Additional frozen historical Boss boards for C2; full sampling with production-rank prefix comparison only. */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { loadConfig } from "../src/core/config.js";
import { fromRoot } from "../src/core/paths.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { bossLinesOptions, releaseBossLinesPool, type BossLineSim } from "../src/sim/boss-lines.js";
import { asRecord } from "../src/core/util/json.js";

const [manifest, out] = process.argv.slice(2);
if (!manifest || !out || process.env["CHARACTER"] !== "SILENT" || process.env["SIM_ADAPTIVE"] !== "shadow") {
  throw new Error("usage: CHARACTER=SILENT SIM_ADAPTIVE=shadow node --import tsx adaptive-b2-state-replay.ts manifest.json output");
}
const bytes = readFileSync(manifest), cases = JSON.parse(bytes.toString()).cases as {
  id: string; run_id: string; floor: number; source: { path: string; sha256: string; raw_sha256: string };
}[];
const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const config = loadConfig({ CHARACTER: "SILENT" });
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
bossLinesOptions.serial = true;
bossLinesOptions.samples = 600;
mkdirSync(out, { recursive: true });
const results: Record<string, unknown>[] = [];
for (const entry of cases) {
  const file = readFileSync(entry.source.path), raw = gunzipSync(file);
  if (hash(file) !== entry.source.sha256 || hash(raw) !== entry.source.raw_sha256) throw new Error("frozen state changed");
  const state = parseGameState(JSON.parse(raw.toString()).state);
  if (state.run?.raw["character_id"] !== "SILENT" || state.raw["run_id"] !== entry.run_id || state.run?.floor !== entry.floor) {
    throw new Error("frozen board identity changed");
  }
  let captured: BossLineSim | null = null;
  bossLinesOptions.onSim = (sim) => { captured = sim; };
  const started = performance.now();
  try {
    planCombatTurn({ state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory(state.screen),
      thresholds: config.thresholds, runStart: "continue", characterPreference: null, allowFtueModals: false,
      strictJev: true, combatPlanner: "turn", shopDiscardPotions: config.shop.discardPotions, jevContext: config.jevContext,
      fightPlan: "off", requiredBossEvaluation: true });
    const sim = captured as BossLineSim | null;
    if (!sim?.available || sim.run.samples !== 600 || sim.run.timedOut) throw new Error("no complete full Boss question");
    const adaptive = asRecord(sim.run.adaptive), comparison = asRecord(adaptive["production_comparison"]);
    if (typeof comparison["agreement"] !== "boolean") throw new Error("production-rank prefix comparison unavailable");
    const row = { ...entry, boss: sim.boss, ascension: state.run?.ascension, low_trust: sim.lowTrust,
      samples: sim.run.samples, orders: sim.run.orders, lines: sim.run.lines.length, ms: performance.now() - started,
      adaptive, comparison, scope: "Frozen historical board under current model; full run and retained-prefix rank comparison. No game/API/fit or original learner batch rerun." };
    writeFileSync(join(out, `${entry.id}-full-lines.json.gz`), gzipSync(JSON.stringify(sim.run.lines)));
    writeFileSync(join(out, `${entry.id}.json`), JSON.stringify(row, null, 2) + "\n");
    results.push(row);
    console.log(JSON.stringify({ id: entry.id, lines: row.lines, orders: row.orders, comparison, ms: row.ms }));
  } catch (error) {
    const row = { ...entry, excluded: String(error), ms: performance.now() - started };
    results.push(row);
    writeFileSync(join(out, `${entry.id}.json`), JSON.stringify(row, null, 2) + "\n");
    console.log(JSON.stringify(row));
  } finally { releaseBossLinesPool(); }
}
writeFileSync(join(out, "report.json"), JSON.stringify({ at: new Date().toISOString(), manifest_sha256: hash(bytes), results,
  limits: "Excluded/incomplete cases stay visible; these observations alone do not activate sampling or replace two complete natural shadow runs." }, null, 2) + "\n");
