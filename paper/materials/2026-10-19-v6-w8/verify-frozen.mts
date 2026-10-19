/** Fixed format acceptance only. No game actions, learner dispatch or formal knowledge writes. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { annotatedFrozen, installFixture } from "../../../agent/tests/v6-combat-fixtures.js";
import { projectCombatDecision } from "../../../agent/src/reflex/jev/combat-entry-projection.js";
import { JevClient, classifyJevError } from "../../../agent/src/reflex/jev/client.js";
import { isNovaJev } from "../../../agent/src/reflex/jev/nova.js";
import type { QuestionSet } from "../../../agent/src/reflex/jev/questions.js";

const directory = dirname(fileURLToPath(import.meta.url));
const root = join(directory, "../../..");
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const save = (name: string, value: unknown) => writeFileSync(join(directory, name), JSON.stringify(value, null, 2) + "\n");
const load = (name: string) => JSON.parse(readFileSync(join(directory, name), "utf8"));

if (["freeze", "readback"].includes(process.argv[2] ?? "")) {
  const readback = process.argv[2] === "readback";
  if (!readback) assert(!existsSync(join(directory, "request-started.json")), "Do not overwrite a sent frozen request");
  mkdirSync(join(root, ".cache"), { recursive: true });
  const temporary = mkdtempSync(join(root, ".cache/v6-w8-frozen-"));
  try {
    installFixture(temporary);
    const evidence = annotatedFrozen(temporary);
    const projected = projectCombatDecision(evidence.state, evidence.questions, { V6_COMBAT_ENTRIES: "on" })!;
    const wire = { state: projected.state, questions: projected.questions };
    if (readback) {
      assert.deepEqual(wire, load("frozen-wire.json"));
      assert.deepEqual(projected.evidence, load("frozen-decision-evidence.json"));
      assert.deepEqual(projected.contract, load("frozen-contract.json"));
      const verification = { checked_at: new Date().toISOString(), exact_match: true,
        evidence_sha256: digest(projected.evidence), wire_sha256: digest(wire), network_requests: 0 };
      save("frozen-final-readback.json", verification);
      process.stdout.write(JSON.stringify(verification) + "\n");
    } else {
    const original = JSON.parse(readFileSync(join(root, "agent/tests/jev-context-recovery-request.json"), "utf8"));
    save("frozen-original.json", { state: original.state, questions: original.questions });
    save("frozen-decision-evidence.json", projected.evidence);
    save("frozen-wire.json", wire);
    save("frozen-contract.json", projected.contract);
    save("frozen-summary.json", { created_at: new Date().toISOString(), purpose: "format_acceptance_only",
      source: "agent/tests/jev-context-recovery-request.json", synthetic_overlay: "agent/tests/v6-combat-fixtures.ts",
      restrictions: ["board character/act and boss label are synthetic", "plan outcome, rollout, boss simulation and W1 memory are synthetic",
        "not game evidence or learned knowledge", "no action execution", "no claim of strategic quality or live adoption"],
      evidence_sha256: digest(projected.evidence), wire_sha256: digest(wire),
      evidence_bytes: Buffer.byteLength(JSON.stringify(projected.evidence)), wire_bytes: Buffer.byteLength(JSON.stringify(wire)),
      contract_source_sha256: projected.contract.sourceSha256,
      candidate_counts: Object.fromEntries(Object.entries(wire.questions).filter(([, q]) => q.type === "choice")
        .map(([id, q]) => [id, q.type === "choice" ? Object.keys(q.criteria).length : 0])) });
    process.stdout.write(JSON.stringify(load("frozen-summary.json")) + "\n");
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
} else if (process.argv[2] === "request-once") {
  assert(!existsSync(join(directory, "request-started.json")), "Request already started; do not retry");
  const wire = load("frozen-wire.json") as { state: unknown; questions: QuestionSet };
  const summary = load("frozen-summary.json");
  assert.equal(digest(wire), summary.wire_sha256);
  assert(isNovaJev(process.env.TYPESAFE_BASE_URL), "Use the documented Nova Jev origin");
  assert(process.env.TYPESAFE_API_KEY, "Credential must be sourced without logging it");
  const calls: { path: string; selector: unknown; status?: number }[] = [];
  const transport = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    assert.equal(url.origin, "https://llm-proxy.tapsvc.com");
    assert.equal(url.pathname, "/api/alpha/decisions");
    assert.equal(calls.length, 0, "Only one transport request is authorized");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    const call = { path: url.pathname, selector: body.model, status: undefined as number | undefined };
    calls.push(call);
    const response = await transport(input, init);
    call.status = response.status;
    return response;
  };
  save("request-started.json", { started_at: new Date().toISOString(), wire_sha256: digest(wire),
    sdk_max_retries: 0, action_execution: false });
  try {
    const client = new JevClient({ apiKey: process.env.TYPESAFE_API_KEY, baseUrl: process.env.TYPESAFE_BASE_URL,
      model: "jev-1.14.0", timeoutMs: 60_000, maxRetries: 0 });
    const result = await client.ask(wire.state, wire.questions);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.selector, "typesafe/jev-1.14");
    save("request-receipt.json", { completed_at: new Date().toISOString(), accepted: true, calls,
      wire_sha256: digest(wire), result, action_execution: false });
    process.stdout.write(JSON.stringify(load("request-receipt.json")) + "\n");
  } catch (error) {
    const failure = classifyJevError(error);
    const receipt = { completed_at: new Date().toISOString(), accepted: false, calls, wire_sha256: digest(wire),
      failure: { kind: failure.kind, status: failure.status }, action_execution: false };
    save("request-receipt.json", receipt);
    process.stdout.write(JSON.stringify(receipt) + "\n");
    process.exitCode = 1;
  } finally { globalThis.fetch = transport; }
} else throw Error("Use freeze, readback or request-once");
