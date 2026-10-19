/** Format acceptance only: one frozen offline request, no action execution or knowledge writes. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { logged, loggedEnv } from "../../../agent/tests/logged.js";
import { buildV6CardPick, cardAnswer } from "../../../agent/src/v6/card-pick.js";
import { coreFixture } from "../../../agent/tests/v6-direction-core-fixtures.js";
import type { V6ProjectionTable } from "../../../agent/src/sim/v6-projection.js";
import { JevClient, classifyJevError } from "../../../agent/src/reflex/jev/client.js";
import type { QuestionSet } from "../../../agent/src/reflex/jev/questions.js";

const dir = process.env.V6_ACCEPTANCE_DIR ?? dirname(fileURLToPath(import.meta.url));
const save = (name: string, value: unknown) => writeFileSync(join(dir, name), JSON.stringify(value, null, 2) + "\n");
const load = (name: string) => JSON.parse(readFileSync(join(dir, name), "utf8"));
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const mode = process.argv[2];
if (mode === "freeze" || mode === "readback") {
  process.env.V6_BUILD = "on";
  process.env.V6_CARD_DECIDER = "jev";
  const raw = logged("batch-g/zgz0-f11-rest-mailbox").state;
  raw.screen = "REWARD"; raw.in_combat = false;
  raw.available_actions = ["choose_reward_card", "skip_reward_cards"];
  Object.assign(raw.run as object, { character_id: "SILENT", ascension: 0 });
  raw.reward = { pending_card_choice: true, card_options: [{ index: 2, card_id: "TEST_CARD", upgraded: true }, { index: 7, card_id: "TEST_OTHER", upgraded: false }] };
  const e = loggedEnv({ source: "synthetic contract", decision: { label: "reward/card", decider: "fixture", chosen: null, rationale: "fixture" }, state: raw });
  e.screenMemory.runPlan = { runId: String(raw.run_id), act: 1, v6: { direction_weights: { TEST_A: 1 }, potion_directions: [], checkpoint: 40 } } as typeof e.screenMemory.runPlan;
  const fixtureDir = mkdtempSync(join(tmpdir(), "v6-card-accept-"));
  const characterDir = join(fixtureDir, "characters", "silent"); mkdirSync(characterDir, { recursive: true });
  writeFileSync(join(characterDir, "build-cores.json"), JSON.stringify({ schema: "build-cores-v1", character: "silent", entries: [coreFixture()] }));
  const table: V6ProjectionTable = { schema: "v6-projection-table-v1", enabled: true, phase: "pick", combinations: [], entries: [], act_evaluations: [], weighted: [], rankings: {}, target_mixtures: [],
    targets: [{ id: "f17:TEST_BOSS", boss: "TEST_BOSS", act: 1, floor: 17, kind: "current", probability: 1, labels: [] }],
    telemetry: { elapsed_ms: 0, cache_hits: 0, cache_misses: 0, simulations: 0, timed_out: 0, degradation: ["synthetic_format_fixture; estimates deliberately unknown"], unknown_entries: 0, total_entries: 0, unknown_fraction: 0, act_cache_hit: false } };
  let wire: { state: unknown; questions: QuestionSet };
  try { const pick = buildV6CardPick(e, table, fixtureDir); assert(pick); wire = { state: pick.decision.state, questions: pick.decision.questions }; }
  finally { rmSync(fixtureDir, { recursive: true, force: true }); }
  if (mode === "readback") {
    assert.deepEqual(wire, load("frozen-wire.json"));
    save("frozen-final-readback.json", { checked_at: new Date().toISOString(), exact_match: true, wire_sha256: digest(wire), network_requests: 0 });
  } else {
    assert(!existsSync(join(dir, "request-started.json")), "Do not overwrite a sent request");
    save("frozen-wire.json", wire);
    save("frozen-summary.json", { created_at: new Date().toISOString(), purpose: "format_acceptance_only",
      source: "synthetic card contract using logged board envelope; no learned values", wire_sha256: digest(wire),
      wire_bytes: Buffer.byteLength(JSON.stringify(wire)), questions: Object.keys(wire.questions),
      action_execution: false, knowledge_writes: false, production_jev_budget_ms: 5000,
      acceptance_timeout_ms: 5000, restrictions: ["single frozen format/latency acceptance; not a strategic quality test", "no strategic quality or live adoption claim"] });
  }
  process.stdout.write(JSON.stringify({ mode, wire_sha256: digest(wire) }) + "\n");
} else if (mode === "request-once") {
  assert(!existsSync(join(dir, "request-started.json")), "Do not retry a started request");
  const wire = load("frozen-wire.json") as { state: unknown; questions: QuestionSet };
  assert.equal(digest(wire), load("frozen-summary.json").wire_sha256);
  const apiKey = readFileSync("/home/dw/.config/nova-game-agents/api.key", "utf8").trim();
  assert(apiKey, "Company credential file is empty");
  const calls: Array<{ path: string; selector: unknown; status?: number }> = [];
  const transport = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    assert.equal(url.origin, "https://llm-proxy.tapsvc.com");
    assert.equal(url.pathname, "/api/alpha/decisions");
    assert.equal(calls.length, 0, "Only one request is authorized");
    const call = { path: url.pathname, selector: JSON.parse(String(init?.body)).model, status: undefined as number | undefined };
    calls.push(call);
    const response = await transport(input, init); call.status = response.status; return response;
  };
  save("request-started.json", { started_at: new Date().toISOString(), wire_sha256: digest(wire), sdk_max_retries: 0, action_execution: false });
  try {
    const client = new JevClient({ apiKey, baseUrl: "https://llm-proxy.tapsvc.com",
      model: "jev-1.14.0", timeoutMs: 5000, maxRetries: 0 });
    const result = await client.ask(wire.state, wire.questions);
    assert.equal(calls.length, 1); assert.equal(calls[0]!.selector, "typesafe/jev-1.14");
    save("request-receipt.json", { completed_at: new Date().toISOString(), accepted: true, calls, result,
      answers_complete: !!cardAnswer(result.answers, Object.keys((wire.questions.pick as { criteria: object }).criteria)), production_budget_met: result.latencyMs <= 5000,
      wire_sha256: digest(wire), action_execution: false });
    process.stdout.write(JSON.stringify({ accepted: true, input_tokens: result.inputTokens, output_tokens: result.outputTokens, latency_ms: result.latencyMs }) + "\n");
  } catch (error) {
    const failure = classifyJevError(error);
    save("request-receipt.json", { completed_at: new Date().toISOString(), accepted: false, calls,
      failure: { kind: failure.kind, status: failure.status }, wire_sha256: digest(wire), action_execution: false });
    process.stdout.write(JSON.stringify({ accepted: false, kind: failure.kind, status: failure.status }) + "\n");
    process.exitCode = 1;
  } finally { globalThis.fetch = transport; }
} else throw Error("Use freeze, readback or request-once");
