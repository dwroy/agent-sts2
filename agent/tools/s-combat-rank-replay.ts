/** Replay one SHA-bound historical Boss state with the current model; compare ranks on the same samples. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { loadConfig } from "../src/core/config.js";
import { fromRoot } from "../src/core/paths.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { bossLinesOptions, rankLines, releaseBossLinesPool, wonLoss, type BossLineSim } from "../src/sim/boss-lines.js";
import { summarizeBossMargin } from "../src/sim/boss-margin.js";
import { signAudit } from "./s-sign-audit.js";

const [inputPath, expectedSha, out] = process.argv.slice(2);
if (!inputPath || !expectedSha || !out) throw new Error("usage: s-combat-rank-replay.ts state.json[.gz] raw-sha256 output-dir");
const file = readFileSync(inputPath), raw = inputPath.endsWith(".gz") ? gunzipSync(file) : file;
const sha = createHash("sha256").update(raw).digest("hex");
if (sha !== expectedSha) throw new Error("frozen input changed");
const state = parseGameState(JSON.parse(raw.toString()).state);
if (state.run?.raw["character_id"] !== "SILENT") throw new Error("expected original Silent input");
const config = loadConfig({ CHARACTER: "SILENT" });
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
let captured: BossLineSim | null = null;
bossLinesOptions.serial = true;
bossLinesOptions.samples = 600;
bossLinesOptions.onSim = (sim) => { captured = sim; };
mkdirSync(out, { recursive: true });
try {
  const started = performance.now();
  planCombatTurn({ state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory(state.screen),
    thresholds: config.thresholds, runStart: "continue", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: config.shop.discardPotions,
    jevContext: config.jevContext, fightPlan: "off", requiredBossEvaluation: true });
  const sim = captured as BossLineSim | null;
  if (!sim?.available) throw new Error(`no complete B2 replay: ${sim && !sim.available ? sim.reason : "no capture"}`);
  if (sim.run.samples !== 600 || sim.run.timedOut) throw new Error("replay samples incomplete");
  const old = rankLines(sim.run.lines), next = rankLines(sim.run.lines, 2, () => true, wonLoss, { lowTrust: sim.lowTrust });
  const cases = sim.run.lines.map((line, i) => ({ id: `line:${i}`, boss: sim.boss ?? "unknown", ascension: state.run!.ascension!,
    lane: "b2" as const, source: sha, samples: line.outcomes }));
  const oldLine = sim.run.lines[old.best], newLine = sim.run.lines[next.best];
  writeFileSync(join(out, "full-lines.json.gz"), gzipSync(JSON.stringify(sim.run.lines)));
  writeFileSync(join(out, "sign-audit.json"), JSON.stringify(signAudit(cases), null, 2) + "\n");
  writeFileSync(join(out, "comparison.json"), JSON.stringify({ input: inputPath, input_sha256: sha,
    at: new Date().toISOString(), ms: performance.now() - started, boss: sim.boss, ascension: state.run?.ascension,
    samples: sim.run.samples, old, next, changed: old.best !== next.best || JSON.stringify(old.tied) !== JSON.stringify(next.tied),
    paired_new_minus_old: oldLine && newLine ? summarizeBossMargin(newLine.outcomes, oldLine.outcomes,
      newLine.outcomes.map((_, i) => i)).paired : null,
    scope: "Same frozen historical input under the current model, same samples for both rankings. No API, game action, model fit or historical/counterfactual outcome claim." }, null, 2) + "\n");
  console.log(JSON.stringify({ samples: sim.run.samples, lines: sim.run.lines.length, old: old.best, next: next.best,
    used: next.sRanking?.used, reason: next.sRanking?.reason, ms: performance.now() - started }));
} finally { releaseBossLinesPool(); }
