/** Offline descriptive replay. No ModClient, game launch, API client or formal knowledge writes. */
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { PROJECT_ROOT } from "../../src/core/paths.js";
import { asArray, asRecord, str } from "../../src/core/util/json.js";
import { parseGameState } from "../../src/hand/mod/schema.js";
import { setKnowledgeCharacter } from "../../src/knowledge/files.js";
import { loadDoubleBossModel } from "../../src/knowledge/double-boss.js";
import { makeKnowledge } from "../../src/knowledge/index.js";
import { loadConstructionData } from "../../src/construction/data.js";
import { loadConstructionSupport } from "../../src/construction/support.js";
import type { BuildState, Opportunity } from "../../src/construction/types.js";
import { applyBuildAction } from "../../src/construction/planner.js";
import { deckBudget, permanentCardGain } from "../../src/memory/run-constraints.js";
import { loadV6Knowledge } from "../../src/v6/knowledge.js";
import { v6Config } from "../../src/v6/config.js";
import { V6BuildLog } from "../../src/v6/log.js";
import { v6Directions, v6Digest } from "../../src/sim/v6-completion.js";
import { v6History, type V6RunCoverage, type V6HistoryFrame, type V6HistoryFight } from "../../src/sim/v6-history.js";
import { v6SupplySource } from "../../src/sim/v6-supply.js";
import { v6ProjectionTargets, v6TargetTrust, type V6TargetContext } from "../../src/sim/v6-targets.js";
import { v6ProjectionStart } from "../../src/sim/v6-start.js";
import { V6ProjectionEngine, type V6ProjectionRequest, type V6ProjectionTable } from "../../src/sim/v6-projection.js";
import { v6ProjectionLog } from "../../src/sim/v6-projection-log.js";
import { loadBossTrust } from "../../src/sim/boss-trust.js";
import { bossKey } from "../../src/sim/boss-start.js";
import { SerialDeckRunner, BuildSimPool } from "../../src/sim/build-sim-pool.js";
import { frozenRouteTable, type FrozenRouteIndex } from "./frozen-route.js";
import { frozenRecord, type FrozenRange } from "./frozen-input.js";

const args = process.argv.slice(2), options = new Map<string, string>();
for (let i = 0; i < args.length; i += 2) {
  if (!["--root", "--evidence", "--out", "--limit", "--checkpoints", "--workers", "--route-inputs"].includes(args[i]!) || !args[i + 1] || options.has(args[i]!)) throw new Error("usage: replay.ts --evidence DIR --out NEW_DIR [--root DIR --limit 6 --checkpoints 2 --workers 1]");
  options.set(args[i]!, args[i + 1]!);
}
function integer(key: string, fallback: number, min: number, max: number) { const n = Number(options.get(key) ?? fallback); if (!Number.isInteger(n) || n < min || n > max) throw new Error(`invalid ${key}`); return n; }
const root = resolve(options.get("--root") ?? PROJECT_ROOT), evidence = resolve(options.get("--evidence") ?? "");
const out = resolve(options.get("--out") ?? "");
if (!options.has("--evidence") || !options.has("--out") || existsSync(out) || !out.startsWith(resolve(PROJECT_ROOT, ".artifacts") + "/")) throw new Error("new output directory must be inside this worktree's .artifacts");
const limit = integer("--limit", 6, 0, 1000), checkpoints = integer("--checkpoints", 2, 0, 100), workers = integer("--workers", 1, 1, 3);
const hashes: Record<string, string> = {};
function json<T>(path: string): T { const bytes = readFileSync(path); hashes[path] = createHash("sha256").update(bytes).digest("hex"); return JSON.parse(bytes.toString("utf8")) as T; }
const routeIndex = options.has("--route-inputs") ? json<FrozenRouteIndex>(resolve(options.get("--route-inputs")!)) : null;
if (routeIndex && (routeIndex.schema !== "v6-frozen-route-index-v1" || !Array.isArray(routeIndex.rows))) throw new Error("invalid frozen route index");
const coverage = json<V6RunCoverage[]>(join(evidence, "run-coverage.json"));
const fights = json<V6HistoryFight[]>(join(evidence, "boss-fights.json"));
const frames: (V6HistoryFrame & { source: FrozenRange })[] = [];
const framesPath = join(evidence, "state-frames.jsonl"), frameHash = createHash("sha256");
const frameStream = createReadStream(framesPath); frameStream.on("data", chunk => { frameHash.update(chunk); });
for await (const line of createInterface({ input: frameStream, crlfDelay: Infinity })) {
  if (!line) continue;
  const frame = JSON.parse(line) as V6HistoryFrame & { source: FrozenRange };
  frames.push({ run_id: frame.run_id, ts: frame.ts, floor: frame.floor, act_id: frame.act_id, screen: frame.screen,
    hp: frame.hp, max_hp: frame.max_hp, gold: frame.gold, deck: frame.deck, source: frame.source, boss_id: frame.boss_id, in_combat: frame.in_combat, turn: frame.turn });
}
hashes[framesPath] = frameHash.digest("hex");
setKnowledgeCharacter("silent");
const knowledgeDir = join(PROJECT_ROOT, "knowledge"), charDir = join(knowledgeDir, "characters/silent");
const data = loadConstructionData("silent", knowledgeDir); if (!data) throw new Error("missing own construction data");
// Freeze every own/common top-level model file; never read another character or pending output.
for (const dir of [charDir, join(knowledgeDir, "common")]) for (const entry of readdirSync(dir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".json")) json(join(dir, entry.name));
}
const history = v6History("silent", coverage, frames, fights, data.model, [17, 33]);
const catalog = json<{ collections: Parameters<typeof makeKnowledge>[0]; mod_version: string; fetched_at: string }>(join(root, "data/game-data.json"));
const knowledge = makeKnowledge(catalog.collections, "cache", { modVersion: catalog.mod_version, fetchedAt: catalog.fetched_at });
const support = loadConstructionSupport("silent", data.templates, knowledgeDir), coreKnowledge = loadV6Knowledge(knowledgeDir, "silent");
const directions = v6Directions("silent", 10, data.templates, support, coreKnowledge.cores.status === "loaded" ? coreKnowledge.cores.value : []), doubleBoss = loadDoubleBossModel();
if (!directions.length) throw new Error("no own direction catalog");
const trust = loadBossTrust(join(charDir, "boss-trust.json"));
const config = v6Config({ V6_BUILD: "shadow" });
const runner = workers === 1 ? new SerialDeckRunner() : new BuildSimPool(workers);
mkdirSync(out, { recursive: false });
const logger = new V6BuildLog(config, join(out, "v6-build.jsonl"));
const records: { id: string; run_id: string; floor: number; phase: string; pass: string; telemetry: V6ProjectionTable["telemetry"]; actual?: unknown }[] = [];
const exclusions: { id: string; reason: string }[] = [], sourceRefs: FrozenRange[] = [];
const byRun = new Map(coverage.map(r => [r.run_id, r]));
const first = (r: { run: string; ts: string }) => { const c = byRun.get(r.run); return c && (!c.first_stop || r.ts <= c.first_stop.ts); };
// Latest historical questions, balanced by act. No selection on the question's future outcome.
const pools = [1, 2, 3].map(act => history.opportunities.rows.filter(r => r.act === act && r.ascension === 10 && r.kind === "reward" && first(r)
  && ![17, 33, 48, 49].includes(r.floor)).sort((a, b) => b.ts.localeCompare(a.ts)));
const selected: Opportunity[] = [];
for (let at = 0; selected.length < limit && pools.some(p => p[at]); at++) for (const p of pools) if (p[at] && selected.length < limit) selected.push(p[at]!);
const checkpointFrames = [17, 33].flatMap(floor => {
  const rows = frames.filter(f => f.floor === floor && f.in_combat && f.screen === "COMBAT" && f.turn === 1
    && byRun.get(f.run_id)?.ascension === 10 && first({ run: f.run_id, ts: f.ts }));
  const unique = [...new Map(rows.sort((a, b) => b.ts.localeCompare(a.ts)).map(f => [f.run_id, f])).values()];
  return unique.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, Math.ceil(checkpoints / 2));
}).slice(0, checkpoints);
function actual(run: string) {
  const c = byRun.get(run), fs = fights.filter(f => f.run_id === run && f.attempt === 1 && f.floor >= 48 && first({ run, ts: f.started_at }));
  return { first_stop: c?.first_stop, first_attempt_f48: fs.filter(f => f.floor === 48).map(f => ({ boss: f.boss, result: f.result })),
    first_attempt_f49: fs.filter(f => f.floor === 49).map(f => ({ boss: f.boss, result: f.result })),
    first_trial_final_victory: c?.first_trial_final_victory, final_including_sl_victory: c?.final_including_sl_victory };
}
async function evaluate(id: string, ts: string, runId: string, source: FrozenRange | undefined, phase: "pick" | "act", opportunity?: Opportunity) {
  if (!source) { exclusions.push({ id, reason: "no_frozen_state_range" }); return; }
  let raw: Record<string, unknown>;
  try { raw = asRecord(asRecord(frozenRecord(join(root, "logs"), source))["state"]); }
  catch (e) { exclusions.push({ id, reason: String(e) }); return; }
  const run = asRecord(raw["run"]), floor = Number(run["floor"]), act = Number(run["act_id"]) + 1;
  if (str(run["character_id"]).toLowerCase() !== "silent" || Number(run["ascension"]) !== 10 || str(raw["run_id"]) !== runId
    || opportunity && floor !== opportunity.floor) { exclusions.push({ id, reason: "state_scope_mismatch" }); return; }
  sourceRefs.push(source);
  const state = parseGameState(raw), baseline: BuildState = { cards: asArray(run["deck"]).map(c => ({ id: str(asRecord(c)["card_id"]), upgraded: asRecord(c)["upgraded"] === true })),
    relics: asArray(run["relics"]).map(r => str(asRecord(r)["relic_id"])), hp: Number(run["current_hp"]), maxHp: Number(run["max_hp"]), gold: Number(run["gold"]), floor, cap: deckBudget(state)?.maximum ?? null };
  const prior = new Set(coverage.filter(c => c.ended < ts && c.run_id !== runId).map(c => c.run_id));
  const visible = bossKey(str(run["boss_id"]));
  const targets: V6TargetContext = { character: "silent", ascension: 10, act, floor,
    visible: visible ? [{ act, floor: act === 1 ? 17 : act === 2 ? 33 : 48, boss: visible }] : [],
    observations: history.observations.filter(o => prior.has(o.run_id)), excludeRun: runId, doubleBoss };
  const recoveredRoute = routeIndex ? frozenRouteTable(join(root, "logs"), routeIndex.rows, state, ts) : null;
  if (recoveredRoute?.table) targets.routeEntries = recoveredRoute.table;
  sourceRefs.push(...(recoveredRoute?.sources ?? []));
  const options = (opportunity?.offers ?? []).flatMap((card, index) => {
    const copies = permanentCardGain(state, { action: "choose_reward_card", option_index: index });
    if (copies === null || copies < 1) return [];
    const next = applyBuildAction(baseline, { kind: "add", card, price: 0, copies });
    return next ? [{ id: `card${index}`, card, state: next }] : [];
  });
  if (phase === "pick" && !options.length) { exclusions.push({ id, reason: "no_verified_reward_transition" }); return; }
  const request: V6ProjectionRequest = { config, phase, character: "silent", ascension: 10, act, baseline: { id: "skip", state: baseline }, options,
    directions, weights: Object.fromEntries(directions.map(d => [d.id, 1 / directions.length])), targets: v6ProjectionTargets(targets),
    completionSources: [v6SupplySource({ character: "silent", ascension: 10, opportunities: history.opportunities, histories: history.histories,
      excludeRun: runId, asOf: ts, signature: v6Digest(hashes) })], seed: 61019, modelVersion: v6Digest(hashes), contextDigest: v6Digest([raw, ts, hashes]),
    prepare: (target, completed) => {
      const observedEntry = phase === "act" && raw["in_combat"] === true && raw["turn"] === 1 && target.floor === floor;
      const p = v6ProjectionStart({ state, knowledge, targets, currentRouteHp: observedEntry ? baseline.hp : null, doubleBoss }, target, completed);
      if (p && observedEntry) p.labels = [...p.labels.filter(l => !l.startsWith("entry_hp_source:")), "entry_hp_source:observed_checkpoint_conditional_not_route_forecast"];
      return p;
    },
    trust: target => v6TargetTrust("silent", 10, target, trust) };
  const engine = new V6ProjectionEngine(runner);
  for (const pass of ["cold", "repeat"] as const) {
    const table = await engine.evaluate(request);
    const checkpointActual = phase === "act" ? actual(runId) : undefined;
    appendFileSync(join(out, "tables.jsonl"), JSON.stringify({ id, run_id: runId, floor, ts, phase, pass,
      labels: ["synthetic_uniform_direction_weights_for_profiling_not_historical_brain", "retrospective_frozen_models_not_prospective_validation",
        recoveredRoute?.reason ?? "historical_route_plan_missing_current_entry_hp_unknown", ...history.labels], actual: checkpointActual, table }) + "\n");
    const logged = v6ProjectionLog(config, table, { ts, run_id: runId, character: "silent", question_id: id }, logger);
    if (!logged.written) throw new Error(`projection log rejected: ${logged.reason}`);
    records.push({ id, run_id: runId, floor, phase, pass, telemetry: table.telemetry, ...(checkpointActual ? { actual: checkpointActual } : {}) });
    process.stdout.write(JSON.stringify({ id, phase, pass, ...table.telemetry }) + "\n");
  }
}
try {
  for (const r of selected) await evaluate(r.id, r.ts, r.run, (r as Opportunity & { state_source?: FrozenRange }).state_source, "pick", r);
  for (const f of checkpointFrames) await evaluate(`checkpoint:${f.run_id}:${f.floor}`, f.ts, f.run_id, f.source, "act");
} finally { if (runner instanceof BuildSimPool) await runner.close(); }
function distribution(values: number[]) { const s = [...values].sort((a, b) => a - b), q = (p: number) => s.length ? s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)] : null;
  return { n: s.length, p50: q(.5), p90: q(.9), p95: q(.95), max: s.at(-1) ?? null }; }
const measurements = ["pick", "act"].flatMap(phase => ["cold", "repeat"].map(pass => {
  const rows = records.filter(r => r.phase === phase && r.pass === pass), total = rows.reduce((n, r) => n + r.telemetry.total_entries, 0);
  const hits = rows.reduce((n, r) => n + r.telemetry.cache_hits, 0), misses = rows.reduce((n, r) => n + r.telemetry.cache_misses, 0);
  return { phase, pass, elapsed_ms: distribution(rows.map(r => r.telemetry.elapsed_ms)), hits, misses,
    cache_hit_fraction: hits + misses ? hits / (hits + misses) : null, act_cache_hits: rows.filter(r => r.telemetry.act_cache_hit).length,
    degradation_fraction: rows.length ? rows.filter(r => r.telemetry.degradation.length).length / rows.length : null,
    unknown_fraction: total ? rows.reduce((n, r) => n + r.telemetry.unknown_entries, 0) / total : null };
}));
writeFileSync(join(out, "summary.json"), JSON.stringify({ schema: "v6-offline-replay-v1", generated: new Date().toISOString(), workers,
  input_sha256: hashes, verified_state_ranges: sourceRefs, scope: { character: "silent", ascension: 10, coverage_runs: coverage.length,
    histories: history.histories.length, boss_observations: history.observations.length, opportunities: history.opportunities.rows.length,
    selected_questions: selected.length, selected_checkpoints: checkpointFrames.length, completed: records.length / 2 },
  measurements, exclusions, records, limitations: ["descriptive_only_no_causal_accuracy_or_gameplay_claim", "uniform_weights_benchmark_only",
    "missing_exact_route_plan_current_boss_unknown", "frozen_route_display_rounding_and_historical_model_retained", "post_boss_rewards_excluded_ambiguous_act_transition",
    "f17_f33_conditional_on_first_observed_combat_turn_one_not_preboss_route_forecast",
    "f17_f33_actual_results_not_used_for_question_selection", ...history.labels] }, null, 2) + "\n");
process.stdout.write(`report: ${relative(PROJECT_ROOT, out)}/summary.json\n`);
