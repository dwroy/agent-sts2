/** One authorized repair pair. Fixed paths/settings; no game controller and no production state. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, openSync, fsyncSync, closeSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { CodexEngine, codexKindSchema, codexSchema, redact, instructionFiles, checkCodex } from "../agent/src/brain/engines/codex.js";
import { configProblems } from "../agent/src/brain/engines/codex-session.js";
import { segmentDigest } from "../agent/src/brain/engines/codex-cache.js";
import { pickSpec } from "../agent/src/brain/specs.js";
import { promptWithReask } from "../agent/src/brain/message.js";
import type { BrainRequest, BrainAnswer } from "../agent/src/brain/types.js";
import { loadConfig } from "../agent/src/core/config.js";
import { setKnowledgeCharacter } from "../agent/src/knowledge/files.js";

export const PROBE_DIRECTORY = "/home/dw/Projects/agent-sts2/.worktrees/codex-brain-cache/learner/runs/20261008-140043-codex-brain-cache";
export const PROBE_FIXTURE_SHA = "6c84bfef4438bc164d75901fcf88d6e08aadc2efd9ad64dfbab1f1634257bc98";
export const REPAIR_DIRECTORY = "/home/dw/Projects/agent-sts2/.worktrees/codex-brain-cache/learner/runs/20261008-153529-codex-brain-cache";
export const PROBE_HOME = "/home/dw/.codex-brain";
const BASELINE_RESERVATION_SHA = "7664ba062fdeff1cf1f6d664cb9c2c90604307aa727a039113cb8b4883524396";
const BASELINE_RESULT_SHA = "6193ec4fc8f31148b7444096db0263eea69bb3cddea8c0c320a0680c2275517f";

export function probeConfig() {
  return loadConfig({ CHARACTER: "silent", BRAIN_CODEX_BIN: "/home/dw/.local/node/bin/codex", BRAIN_CODEX_HOME: PROBE_HOME,
    BRAIN_CODEX_MODEL: "gpt-6.1-sol", BRAIN_CODEX_EFFORT: "high", BRAIN_CODEX_TOOLS: "off", BRAIN_CODEX_MODE: "session", BRAIN_CODEX_SCHEMA_FIELDS: "used",
    BRAIN_CODEX_SERVICE_TIER: "default", BRAIN_CODEX_STALL_RETRIES: "0", BRAIN_CODEX_USAGE_REQUIRED: "on", BRAIN_CODEX_USAGE_STOP_PCT: "80",
    BRAIN_CODEX_USAGE_EVERY_CALLS: "1", BRAIN_CODEX_USAGE_EVERY_MIN: "10" });
}

/** Only existence is checked for the login; credentials are neither read nor copied. */
export function checkProbeHome(home: string): void {
  const problems = [...instructionFiles(home), ...configProblems(home).map(p => `config.toml: ${p}`)];
  if (problems.length) throw new Error(`probe home isolation: ${problems.join(", ")}`);
  if (!existsSync(join(home, "auth.json"))) throw new Error("probe home has no existing login");
}

/** The failed baseline's two slots remain allocated forever. Changed/unknown history refuses a new pair. */
export function approvedHistory(directory: string) {
  const reservation = segmentDigest(readFileSync(join(directory, "probe-reserved.json"), "utf8")).sha256;
  const result = segmentDigest(readFileSync(join(directory, "probe-result.json"), "utf8")).sha256;
  if (reservation !== BASELINE_RESERVATION_SHA || result !== BASELINE_RESULT_SHA
      || existsSync(join(directory, "probe-codex-calls.jsonl"))) throw new Error("baseline history differs or has ambiguous physical calls; preserve it and stop");
  return { reservation_sha256: reservation, result_sha256: result, allocated_calls: 2, model_calls_observed: 0,
    evidence: "frozen isolation refusal before decide dispatch; no calls trace", fixture_sha256: PROBE_FIXTURE_SHA };
}

function writeExclusive(file: string, value: unknown): void {
  const fd = openSync(file, "wx");
  try { writeFileSync(fd, JSON.stringify(value, null, 2)); fsyncSync(fd); } finally { closeSync(fd); }
  const parent = openSync(join(file, ".."), "r");
  try { fsyncSync(parent); } finally { closeSync(parent); }
}

export function reserveRepairPair(directory: string, history: ReturnType<typeof approvedHistory>): void {
  if (history.reservation_sha256 !== BASELINE_RESERVATION_SHA || history.result_sha256 !== BASELINE_RESULT_SHA
      || history.allocated_calls !== 2 || history.model_calls_observed !== 0 || history.fixture_sha256 !== PROBE_FIXTURE_SHA) throw new Error("unapproved baseline history");
  if (readdirSync(directory).some(name => /^probe-(reserved|result|codex-calls|physical-claim)/.test(name))) throw new Error("repair pair already reserved or has ambiguous evidence; preserve it and stop");
  writeExclusive(join(directory, "probe-reserved.json"), { pair: "repair", fixture_sha256: PROBE_FIXTURE_SHA,
    home: PROBE_HOME, max_physical_calls: 2, total_allocated_calls: 4, baseline: history });
}

/** Pessimistic, durable dispatch claims survive errors and crashes; never refunded or reopened. */
export function claimProbeCall(directory: string, call: { mode: "session" | "exec"; questionId?: string }): void {
  const reservation = JSON.parse(readFileSync(join(directory, "probe-reserved.json"), "utf8"));
  if (reservation.pair !== "repair" || reservation.max_physical_calls !== 2 || reservation.total_allocated_calls !== 4
      || reservation.fixture_sha256 !== PROBE_FIXTURE_SHA || reservation.home !== PROBE_HOME
      || reservation.baseline?.reservation_sha256 !== BASELINE_RESERVATION_SHA || reservation.baseline?.result_sha256 !== BASELINE_RESULT_SHA) throw new Error("invalid persistent probe reservation");
  const claims = readdirSync(directory).filter(name => name.startsWith("probe-physical-claim-"));
  if (claims.length >= 2) throw new Error("persistent probe physical-call budget exhausted");
  const index = claims.length + 1;
  for (let i = 1; i < index; i += 1) {
    const previous = JSON.parse(readFileSync(join(directory, `probe-physical-claim-${i}.json`), "utf8"));
    if (previous.index !== i || previous.fixture_sha256 !== PROBE_FIXTURE_SHA || previous.pair !== "repair") throw new Error("ambiguous persistent call ledger");
  }
  writeExclusive(join(directory, `probe-physical-claim-${index}.json`), { pair: "repair", index, ts: new Date().toISOString(),
    fixture_sha256: PROBE_FIXTURE_SHA, ...call, status: "reserved-before-dispatch; sent/completed status must be reconciled with the raw trace" });
}

export function approvedFixture(text: string) {
  if (segmentDigest(text).sha256 !== PROBE_FIXTURE_SHA) throw new Error("probe fixture differs from the approved frozen bytes");
  return JSON.parse(text) as { request: Omit<BrainRequest, "spec">; schema: unknown; segments: { system: { sha256: string }; user: { sha256: string } } };
}

/** Stops after a failure or cancellation; a real engine separately caps all retries/fallbacks at two physical calls. */
export async function doubleQuestion(request: BrainRequest, engine: { decide: (r: BrainRequest, s: AbortSignal) => Promise<BrainAnswer> }, signal: AbortSignal, pair: "baseline" | "repair" = "baseline") {
  const results: BrainAnswer[] = [];
  for (let i = 0; i < 2; i += 1) {
    if (signal.aborted) throw new Error("probe cancelled");
    const call = new AbortController();
    const cancel = () => call.abort();
    signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, 600_000);
    let result: BrainAnswer;
    try {
      result = await engine.decide({ ...request, questionId: `cache-probe-${pair}-${i + 1}` }, call.signal);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    }
    results.push(result);
    if (result.native?.["mode"] !== "session") throw new Error("probe did not use the approved session transport");
    if (result.native?.["reverted"] !== true) throw new Error("probe revert failed; a second question would have polluted context");
  }
  return results;
}

export function probeUsageKnown(rows: Array<{ usage?: Record<string, unknown> }>): boolean {
  return rows.length === 2 && rows.every(({ usage }) => {
    const input = usage?.["inputTokens"], cached = usage?.["cachedInputTokens"];
    return typeof input === "number" && Number.isFinite(input) && input > 0
      && typeof cached === "number" && Number.isFinite(cached) && cached >= 0 && cached <= input;
  });
}

export function preserveProbeResult(directory: string, output: Record<string, unknown>): string {
  const resultFile = join(directory, `probe-attempt-${Date.now()}-${process.pid}-${randomUUID()}.json`);
  const text = JSON.stringify(output, null, 2);
  writeFileSync(resultFile, text, { flag: "wx" });
  const canonical = join(directory, "probe-result.json");
  if (!existsSync(canonical)) writeFileSync(canonical, text, { flag: "wx" });
  return resultFile;
}

async function main(): Promise<void> {
  if (process.argv.length !== 2) throw new Error("codex-brain-cache-probe takes no arguments");
  mkdirSync(REPAIR_DIRECTORY, { recursive: true });
  if (existsSync(join(REPAIR_DIRECTORY, "probe-reserved.json"))) throw new Error("repair pair already reserved; preserve all existing results and traces");
  setKnowledgeCharacter("silent");
  const fixture = approvedFixture(readFileSync(join(PROBE_DIRECTORY, "probe-fixture.json"), "utf8"));
  const config = probeConfig();
  const spec = pickSpec(fixture.request.label, fixture.request.options!, fixture.request.payload);
  const request = { ...fixture.request, runId: "isolated-cache-probe-repair", spec };
  const schema = codexSchema(codexKindSchema(spec, { fields: config.brain.codex.schemaFields, reasonLast: config.brain.codex.reasonLast }), {
    routeReason: config.brain.codex.routeReason, maxFieldChars: config.brain.codex.maxFieldChars, routePattern: config.brain.codex.routePattern });
  if (JSON.stringify(schema) !== JSON.stringify(fixture.schema)
      || segmentDigest(promptWithReask(request)).sha256 !== fixture.segments.user.sha256
      || segmentDigest(request.system).sha256 !== fixture.segments.system.sha256) throw new Error("probe request/schema reconstruction changed");
  const state = join(REPAIR_DIRECTORY, "probe-state");
  mkdirSync(state, { recursive: true });
  const engine = new CodexEngine({ settings: config.brain.engines.codex, codex: config.brain.codex, stateDir: state,
    traceFile: join(REPAIR_DIRECTORY, "probe-codex-calls.jsonl"), physicalCallLimit: 2,
    beforePhysicalCall: call => claimProbeCall(REPAIR_DIRECTORY, call) });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_200_000);
  const output: Record<string, unknown> = { status: "pending", fixture_sha256: PROBE_FIXTURE_SHA, max_physical_calls: 2,
    total_allocated_calls: 4, home: PROBE_HOME, comparison: "repair of probe home only; session+revert production transport unchanged; baseline refused before any model call", results: null };
  try {
    output["baseline"] = approvedHistory(PROBE_DIRECTORY);
    checkProbeHome(config.brain.codex.home);
    const check = await checkCodex(config.brain.codex, "gpt-6.1-sol", "high", { stateDir: join(state, "check") });
    output["cli_check"] = check;
    if (!check.ok) throw new Error(`probe CLI preflight: ${check.error}`);
    const stop = await engine.usage.start();
    output["limits_before"] = engine.limits();
    if (stop) throw new Error(`probe quota preflight: ${stop.message}`);
    // O_EXCL persists across wakes/crashes. A retry cannot spend the authorized pair again.
    reserveRepairPair(REPAIR_DIRECTORY, approvedHistory(PROBE_DIRECTORY));
    output["results"] = await doubleQuestion(request, engine, controller.signal, "repair");
    output["limits_after"] = engine.limits();
    const trace = readFileSync(join(REPAIR_DIRECTORY, "probe-codex-calls.jsonl"), "utf8").trim().split('\n').map(line => JSON.parse(line));
    const pair = trace.filter(row => row.mode === "session" && row.outcome === "answered"
      && ["cache-probe-repair-1", "cache-probe-repair-2"].includes(row.question_id));
    output["raw_usage"] = pair.map(row => row.usage ?? null);
    if (!probeUsageKnown(pair)) throw new Error("probe answered but input/cache usage is missing or invalid; cache result remains unknown");
    if (pair[0].thread_id !== pair[1].thread_id || pair.some(row => !row.turn_id || row.reverted !== true)
        || readdirSync(REPAIR_DIRECTORY).filter(name => name.startsWith("probe-physical-claim-")).length !== 2
        || pair.some(row => row.model !== "gpt-6.1-sol" || row.effort !== "high" || row.cache_request?.instructions?.sha256 !== fixture.segments.system.sha256
          || row.cache_request?.user?.sha256 !== fixture.segments.user.sha256 || row.cache_request?.schema?.sha256 !== segmentDigest(JSON.stringify(fixture.schema)).sha256)) {
      throw new Error("probe pair did not preserve the approved thread, full inputs, schema, model/effort or physical ledger");
    }
    output["measured"] = { input_tokens: pair.reduce((sum, row) => sum + row.usage.inputTokens, 0),
      cached_input_tokens: pair.reduce((sum, row) => sum + row.usage.cachedInputTokens, 0),
      cache_hit_ratio: pair.reduce((sum, row) => sum + row.usage.cachedInputTokens, 0) / pair.reduce((sum, row) => sum + row.usage.inputTokens, 0),
      wall_ms: pair.map(row => row.ms), observation: "two repeated questions validate capability only; no production-window improvement claimed" };
    output["status"] = "completed";
  } catch (error) {
    output["error"] = redact(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    await engine.close();
    output["physical_dispatch_claims"] = readdirSync(REPAIR_DIRECTORY).filter(name => name.startsWith("probe-physical-claim-")).length;
    const resultFile = preserveProbeResult(REPAIR_DIRECTORY, output);
    console.log(JSON.stringify({ status: output["status"], result: resultFile, error: output["error"] }));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main().catch(error => {
  console.error(redact(error instanceof Error ? error.message : String(error))); process.exitCode = 1;
});
