/** Format acceptance only: one frozen offline request, no action execution or knowledge writes. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { logged, loggedEnv } from "../../../agent/tests/logged.js";
import { planRest } from "../../../agent/src/hand/screens/rest.js";
import { JevClient, classifyJevError } from "../../../agent/src/reflex/jev/client.js";
import { potionAnswersComplete } from "../../../agent/src/v6/potion-entries.js";
import type { QuestionSet } from "../../../agent/src/reflex/jev/questions.js";

const dir = dirname(fileURLToPath(import.meta.url));
const save = (name: string, value: unknown) => writeFileSync(join(dir, name), JSON.stringify(value, null, 2) + "\n");
const load = (name: string) => JSON.parse(readFileSync(join(dir, name), "utf8"));
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const mode = process.argv[2];
if (mode === "freeze" || mode === "readback") {
  process.env.V6_BUILD = "on";
  process.env.V6_POTION_DECIDER = "jev";
  const decision = planRest(loggedEnv(logged("batch-g/zgz0-f11-rest-mailbox"), { buildDecider: "deepseek", oneshot: "off" }));
  assert(decision?.kind === "ask" && decision.potionJev);
  const wire = { state: decision.potionJev.state, questions: decision.potionJev.questions };
  if (mode === "readback") {
    assert.deepEqual(wire, load("frozen-wire.json"));
    save("frozen-final-readback.json", { checked_at: new Date().toISOString(), exact_match: true, wire_sha256: digest(wire), network_requests: 0 });
  } else {
    assert(!existsSync(join(dir, "request-started.json")), "Do not overwrite a sent request");
    save("frozen-wire.json", wire);
    save("frozen-summary.json", { created_at: new Date().toISOString(), purpose: "format_acceptance_only",
      source: "agent/tests/logged-states/batch-g/zgz0-f11-rest-mailbox.json", wire_sha256: digest(wire),
      wire_bytes: Buffer.byteLength(JSON.stringify(wire)), questions: Object.keys(wire.questions),
      action_execution: false, knowledge_writes: false, production_jev_budget_ms: 1000,
      acceptance_timeout_ms: 60000, restrictions: ["format transport acceptance, not a production latency pass", "no strategic quality or live adoption claim"] });
  }
  process.stdout.write(JSON.stringify({ mode, wire_sha256: digest(wire) }) + "\n");
} else if (mode === "request-once") {
  assert(!existsSync(join(dir, "request-started.json")), "Do not retry a started request");
  const wire = load("frozen-wire.json") as { state: unknown; questions: QuestionSet };
  assert.equal(digest(wire), load("frozen-summary.json").wire_sha256);
  assert.equal(new URL(process.env.TYPESAFE_BASE_URL!).origin, "https://llm-proxy.tapsvc.com");
  assert(process.env.TYPESAFE_API_KEY, "Source the credential without logging it");
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
    const client = new JevClient({ apiKey: process.env.TYPESAFE_API_KEY!, baseUrl: process.env.TYPESAFE_BASE_URL,
      model: "jev-1.14.0", timeoutMs: 60000, maxRetries: 0 });
    const result = await client.ask(wire.state, wire.questions);
    assert.equal(calls.length, 1); assert.equal(calls[0]!.selector, "typesafe/jev-1.14");
    save("request-receipt.json", { completed_at: new Date().toISOString(), accepted: true, calls, result,
      answers_complete: potionAnswersComplete(wire.questions, result.answers), production_budget_met: result.latencyMs <= 1000,
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
