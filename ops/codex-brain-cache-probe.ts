/** One authorized baseline pair. Fixed paths/settings; no game controller and no production state. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CodexEngine, codexKindSchema, codexSchema, redact } from "../agent/src/brain/engines/codex.js";
import { segmentDigest } from "../agent/src/brain/engines/codex-cache.js";
import { pickSpec } from "../agent/src/brain/specs.js";
import { promptWithReask } from "../agent/src/brain/message.js";
import type { BrainRequest, BrainAnswer } from "../agent/src/brain/types.js";
import { loadConfig } from "../agent/src/core/config.js";
import { setKnowledgeCharacter } from "../agent/src/knowledge/files.js";

export const PROBE_DIRECTORY = "/home/dw/Projects/agent-sts2/.worktrees/codex-brain-cache/learner/runs/20261008-140043-codex-brain-cache";
export const PROBE_FIXTURE_SHA = "6c84bfef4438bc164d75901fcf88d6e08aadc2efd9ad64dfbab1f1634257bc98";

export function approvedFixture(text: string) {
  if (segmentDigest(text).sha256 !== PROBE_FIXTURE_SHA) throw new Error("probe fixture differs from the approved frozen bytes");
  return JSON.parse(text) as { request: Omit<BrainRequest, "spec">; schema: unknown; segments: { system: { sha256: string }; user: { sha256: string } } };
}

/** Stops after a failure or cancellation; a real engine separately caps all retries/fallbacks at two physical calls. */
export async function doubleQuestion(request: BrainRequest, engine: { decide: (r: BrainRequest, s: AbortSignal) => Promise<BrainAnswer> }, signal: AbortSignal) {
  const results: BrainAnswer[] = [];
  for (let i = 0; i < 2; i += 1) {
    if (signal.aborted) throw new Error("probe cancelled");
    const result = await engine.decide({ ...request, questionId: `cache-probe-baseline-${i + 1}` }, signal);
    results.push(result);
    if (result.native?.["mode"] !== "session") throw new Error("probe did not use the approved session transport");
  }
  return results;
}

async function main(): Promise<void> {
  if (process.argv.length !== 2) throw new Error("codex-brain-cache-probe takes no arguments");
  setKnowledgeCharacter("silent");
  const fixture = approvedFixture(readFileSync(join(PROBE_DIRECTORY, "probe-fixture.json"), "utf8"));
  const config = loadConfig({ CHARACTER: "silent", BRAIN_CODEX_BIN: "/home/dw/.local/node/bin/codex", BRAIN_CODEX_HOME: "/home/dw/.codex",
    BRAIN_CODEX_MODEL: "gpt-6.1-sol", BRAIN_CODEX_EFFORT: "high", BRAIN_CODEX_MODE: "session", BRAIN_CODEX_SCHEMA_FIELDS: "used",
    BRAIN_CODEX_SERVICE_TIER: "default", BRAIN_CODEX_STALL_RETRIES: "0", BRAIN_CODEX_USAGE_REQUIRED: "on", BRAIN_CODEX_USAGE_STOP_PCT: "80",
    BRAIN_CODEX_USAGE_EVERY_CALLS: "1", BRAIN_CODEX_USAGE_EVERY_MIN: "10" });
  const spec = pickSpec(fixture.request.label, fixture.request.options!, fixture.request.payload);
  const request = { ...fixture.request, runId: "isolated-cache-probe", spec };
  const schema = codexSchema(codexKindSchema(spec, { fields: config.brain.codex.schemaFields, reasonLast: config.brain.codex.reasonLast }), {
    routeReason: config.brain.codex.routeReason, maxFieldChars: config.brain.codex.maxFieldChars, routePattern: config.brain.codex.routePattern });
  if (JSON.stringify(schema) !== JSON.stringify(fixture.schema)
      || segmentDigest(promptWithReask(request)).sha256 !== fixture.segments.user.sha256
      || segmentDigest(request.system).sha256 !== fixture.segments.system.sha256) throw new Error("probe request/schema reconstruction changed");
  const state = join(PROBE_DIRECTORY, "probe-state");
  mkdirSync(state, { recursive: true });
  const engine = new CodexEngine({ settings: config.brain.engines.codex, codex: config.brain.codex, stateDir: state,
    traceFile: join(PROBE_DIRECTORY, "probe-codex-calls.jsonl"), physicalCallLimit: 2 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_200_000);
  const output: Record<string, unknown> = { status: "pending", fixture_sha256: PROBE_FIXTURE_SHA, max_physical_calls: 2,
    comparison: "baseline session+revert repeated question; production transport is unchanged", results: null };
  try {
    const stop = await engine.usage.start();
    output["limits_before"] = engine.limits();
    if (stop) throw new Error(`probe quota preflight: ${stop.message}`);
    // O_EXCL persists across wakes/crashes. A retry cannot spend the authorized pair again.
    writeFileSync(join(PROBE_DIRECTORY, "probe-reserved.json"), JSON.stringify({ fixture_sha256: PROBE_FIXTURE_SHA, max_physical_calls: 2 }), { flag: "wx" });
    output["results"] = await doubleQuestion(request, engine, controller.signal);
    output["limits_after"] = engine.limits();
    output["status"] = "completed";
  } catch (error) {
    output["error"] = redact(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    await engine.close();
    writeFileSync(join(PROBE_DIRECTORY, "probe-result.json"), JSON.stringify(output, null, 2));
    console.log(JSON.stringify({ status: output["status"], result: join(PROBE_DIRECTORY, "probe-result.json"), error: output["error"] }));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main().catch(error => {
  console.error(redact(error instanceof Error ? error.message : String(error))); process.exitCode = 1;
});
