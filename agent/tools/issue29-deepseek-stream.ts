/** Issue #29 only: sequential streaming transport experiment; never changes live configuration. */
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { DeepSeekClient } from "../src/brain/llm/deepseek.js";
import { DeepSeekEngine } from "../src/brain/engines/deepseek.js";
import { freeSpec, pickSpec, shopPlanSpec, routePlanSpec, withDirectionRideField, withRunPlanField, carriesRunPlan } from "../src/brain/specs.js";
import type { BrainRequest } from "../src/brain/types.js";

const root = resolve(import.meta.dirname, "../..");
const original = join(root, "paper/materials/issue29-brain-speed");
const evidence = join(original, "deepseek-followup");
const local = join(root, "data/issue29-followup");
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const rows = (file: string): any[] => existsSync(file) ? readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map(s => JSON.parse(s)) : [];
const line = (file: string, row: unknown) => appendFileSync(file, JSON.stringify(row) + "\n");
const save = (name: string, row: unknown) => writeFileSync(join(evidence, name), JSON.stringify(row, null, 2) + "\n", { flag: "wx" });

export function specFor(r: any) {
  let spec = r.options
    ? r.label.startsWith("shop/") ? shopPlanSpec(r.label, r.options, r.payload)
      : r.label.startsWith("map/route-") ? routePlanSpec(r.label, r.payload)
        : r.label === "event/plan" ? freeSpec(r.label, { type: "object" }) : pickSpec(r.label, r.options, r.payload)
    : freeSpec(r.label, { type: "object" });
  if (carriesRunPlan(r.payload)) spec = withRunPlanField(spec, r.payload);
  return withDirectionRideField(spec, r.payload);
}

export function selectSamples(previous: any[]) {
  const b = previous.filter(r => r.group === "B");
  const failures = b.filter(r => !r.accepted);
  if (failures.length !== 15) throw Error("Expected all 15 frozen timeout occurrences");
  const failedIds = new Set(failures.map(r => r.id));
  const selected: any[] = [];
  const strata = ["reward", "event", "rest", "shop", "route", "act-plan", "selection", "reward", "rest", "selection"];
  for (const stratum of strata) {
    const row = b.find(r => r.accepted && r.stratum === stratum && !failedIds.has(r.id) && !selected.some(s => s.id === r.id));
    if (!row) throw Error("Insufficient disjoint successful controls");
    selected.push(row);
  }
  const mixed: any[] = [];
  for (let i = 0; i < failures.length; i++) {
    mixed.push({ ...failures[i], cohort: "previous-timeout" });
    if (i < selected.length) mixed.push({ ...selected[i], cohort: "previous-success" });
  }
  return mixed.map((r, i) => ({ sample: `s${String(i + 1).padStart(2, "0")}`, id: r.id, stratum: r.stratum,
    cohort: r.cohort, previous_key: `${r.id}/${r.round}/B`, previous_elapsed_ms: r.elapsed_ms,
    order: i % 2 === 0 ? ["nova", "official"] : ["official", "nova"] }));
}

/** SSE parser handles split UTF-8, CRLF, comments, multiple data lines, and usage-only final events. */
export class StreamCapture {
  private buffer = "";
  content = "";
  reasoning = "";
  usage: any = null;
  model: string | null = null;
  id: string | null = null;
  finish_reason: string | null = null;
  done = false;
  first_token_ms: number | null = null;
  first_reasoning_ms: number | null = null;
  first_content_ms: number | null = null;
  last_reasoning_ms: number | null = null;
  last_content_ms: number | null = null;
  events: any[] = [];
  feed(text: string, elapsed: number) {
    this.buffer += text;
    for (;;) {
      const match = /\r?\n\r?\n/.exec(this.buffer);
      if (!match) break;
      const event = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      const data = event.split(/\r?\n/).filter(s => s.startsWith("data:")).map(s => s.slice(5).trimStart()).join("\n");
      if (!data) continue;
      if (data.trim() === "[DONE]") { this.done = true; continue; }
      const obj = JSON.parse(data);
      if (obj.error) throw Error("ProviderStreamError");
      if (obj.model) this.model = obj.model;
      if (obj.id) this.id = obj.id;
      if (obj.usage) this.usage = obj.usage;
      const choice = obj.choices?.[0];
      if (choice?.finish_reason) this.finish_reason = choice.finish_reason;
      const delta = choice?.delta ?? {};
      const reasoning = typeof delta.reasoning_content === "string" ? delta.reasoning_content : "";
      const content = typeof delta.content === "string" ? delta.content : "";
      if (reasoning || content) this.first_token_ms ??= elapsed;
      if (reasoning) { this.first_reasoning_ms ??= elapsed; this.last_reasoning_ms = elapsed; }
      if (content) { this.first_content_ms ??= elapsed; this.last_content_ms = elapsed; }
      this.reasoning += reasoning; this.content += content;
      this.events.push({ t_ms: elapsed, reasoning_chars: reasoning.length, content_chars: content.length,
        ...(obj.usage ? { usage: obj.usage } : {}), ...(choice?.finish_reason ? { finish_reason: choice.finish_reason } : {}) });
    }
  }
  finish() {
    if (this.buffer.trim()) throw Error("IncompleteSSEEvent");
    if (!this.done || !this.finish_reason) throw Error("IncompleteStream");
  }
}

function credentials(provider: string) {
  if (provider === "official") return { base: "https://api.deepseek.com", key: readFileSync("/home/dw/.deepseek_api_key", "utf8").trim(), model: "deepseek-flash" };
  if (provider !== "nova") throw Error("Unknown provider");
  const env = readFileSync("/home/dw/.config/nova-game-agents/environment.sh", "utf8");
  const base = env.match(/^export DEEPSEEK_BASE_URL=["']?([^"'\s]+)["']?$/m)?.[1];
  if (!base?.startsWith("https://")) throw Error("Approved gateway configuration missing");
  return { base: base.replace(/\/+$/, ""), key: readFileSync("/home/dw/.config/nova-game-agents/api.key", "utf8").trim(), model: "deepseek/deepseek-flash" };
}

export function claimCall(dir: string, metadata: any, limit = 60) {
  const count = rows(join(dir, "claims.jsonl")).length;
  if (count >= limit) throw Error("Persistent 60-call budget exhausted");
  line(join(dir, "claims.jsonl"), { claim: count + 1, ts: new Date().toISOString(), ...metadata });
}

async function discovery(mode: string) {
  const fetcher = globalThis.fetch;
  if (mode === "models") {
    for (const provider of ["official", "nova"]) {
      const auth = credentials(provider);
      claimCall(local, { kind: "models", provider });
      const response = await fetcher(auth.base + "/models", { headers: { authorization: `Bearer ${auth.key}` }, redirect: "error", signal: AbortSignal.timeout(30000) });
      const row: any = { provider, ts: new Date().toISOString(), status: response.status };
      if (response.ok) {
        const raw = await response.json() as any;
        row.models = (raw.data ?? []).filter((m: any) => provider === "official" || m.id === auth.model).map((m: any) => Object.fromEntries(
          ["id", "object", "owned_by", "name", "context_window", "max_output_tokens", "effort"].filter(k => m[k] !== undefined).map(k => [k, m[k]])));
      }
      line(join(evidence, "models.jsonl"), row);
      console.log(JSON.stringify(row));
    }
    return;
  }
  // Raw balance is private local evidence; only the test's debit may be published.
  const auth = credentials("official");
  claimCall(local, { kind: mode, provider: "official" });
  const response = await fetcher(auth.base + "/user/balance", { headers: { authorization: `Bearer ${auth.key}` }, redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`BalanceHTTP${response.status}`);
  const raw = await response.json();
  writeFileSync(join(local, `${mode}.json`), JSON.stringify({ ts: new Date().toISOString(), raw }), { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ kind: mode, status: response.status, private_receipt_saved: true }));
}

async function prepare() {
  const selected = selectSamples(rows(join(original, "results.jsonl")));
  const fixtures = rows(join(original, "fixtures.jsonl"));
  const fetched = globalThis.fetch;
  const requests: any[] = [];
  try {
    for (const sample of selected) {
      const fixture = fixtures.find(f => f.id === sample.id);
      let body: any;
      // Capture the exact production first request without sending anything or reading credentials.
      globalThis.fetch = async (_input, init) => { body = JSON.parse(String(init?.body)); throw Error("OfflineCapture"); };
      const engine = new DeepSeekEngine(new DeepSeekClient({ apiKey: "unused", baseUrl: "https://offline.invalid", model: "deepseek/deepseek-flash",
        timeoutMs: 300000, reasoningEffort: "max", combatReasoningEffort: "high", systemPrompt: fixture.request.system }));
      try { await engine.decide({ ...fixture.request, spec: specFor(fixture.request) }); } catch { /* Expected offline capture. */ }
      if (!body || body.messages[0].content !== fixture.request.system) throw Error("Request capture failed");
      requests.push({ ...sample, effort: body.reasoning_effort, body_sha256: hash(JSON.stringify(body)), body });
    }
  } finally { globalThis.fetch = fetched; }
  save("sample.json", { ts: new Date().toISOString(), previous_commit: "9fa73151e18c674a4351a0a7b101305eff5bbd87", method: "All 15 timeout occurrences (8 unique fixtures), plus 10 disjoint unique successful controls; interleaved cohorts, alternating provider order", timeout_ms: 300000, samples: requests.map(({ body, ...s }) => s) });
  save("requests.json", requests);
  console.log(JSON.stringify({ prepared: requests.length, unique_fixtures: new Set(requests.map(r => r.id)).size }));
}

async function run() {
  const samples = JSON.parse(readFileSync(join(evidence, "requests.json"), "utf8"));
  const fixtures = rows(join(original, "fixtures.jsonl"));
  const fetched = globalThis.fetch;
  const finished = new Set(rows(join(evidence, "results.jsonl")).map(r => r.key));
  const discoveryRows = rows(join(evidence, "models.jsonl"));
  if (!discoveryRows.some(r => r.provider === "official" && r.models?.some((m: any) => m.id === "deepseek-flash"))) throw Error("Discover official model first");
  try {
    for (const sample of samples) for (const provider of sample.order) {
      const key = `${sample.sample}/${provider}`;
      if (finished.has(key)) continue;
      // An interrupted physical request is never silently reissued.
      if (rows(join(local, "claims.jsonl")).some(c => c.key === key)) throw Error(`Unresolved existing claim ${key}; reconcile before continuing`);
      const auth = credentials(provider);
      const fixture = fixtures.find(f => f.id === sample.id);
      const capture = new StreamCapture();
      let calls = 0;
      const start = performance.now();
      const elapsed = () => Math.round((performance.now() - start) * 1000) / 1000;
      const row: any = { key, sample: sample.sample, id: sample.id, stratum: sample.stratum, cohort: sample.cohort,
        previous_key: sample.previous_key, provider, model_requested: auth.model, effort_requested: sample.effort, timeout_ms: 300000,
        ts: new Date().toISOString(), accepted: false, headers_ms: null };
      globalThis.fetch = async (_input, init) => {
        if (++calls > 1) throw Error("RepairBlockedByExperiment");
        const actual = JSON.parse(String(init?.body));
        actual.model = sample.body.model;
        if (hash(JSON.stringify(actual)) !== sample.body_sha256) throw Error("Frozen request mismatch");
        const body = { ...actual, model: auth.model, stream: true, stream_options: { include_usage: true } };
        row.request_sha256 = hash(JSON.stringify(body));
        claimCall(local, { kind: "completion", key, provider, model: auth.model, request_sha256: row.request_sha256 });
        const response = await fetched(auth.base + "/chat/completions", { ...init, body: JSON.stringify(body), redirect: "error" });
        row.status = response.status; row.headers_ms = elapsed();
        if (!response.ok) { await response.body?.cancel(); throw Error(`ProviderHTTP${response.status}`); }
        if (!response.headers.get("content-type")?.includes("text/event-stream")) { await response.body?.cancel(); throw Error("ExpectedEventStream"); }
        if (!response.body) throw Error("EmptyStreamBody");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) { capture.feed(decoder.decode(), elapsed()); break; }
            capture.feed(decoder.decode(chunk.value, { stream: true }), elapsed());
          }
          capture.finish();
        } finally { await reader.cancel().catch(() => {}); }
        row.transport_elapsed_ms = elapsed();
        return new Response(JSON.stringify({ id: capture.id, model: capture.model, usage: capture.usage,
          choices: [{ message: { role: "assistant", content: capture.content, reasoning_content: capture.reasoning }, finish_reason: capture.finish_reason }] }), { status: 200, headers: { "content-type": "application/json" } });
      };
      try {
        const engine = new DeepSeekEngine(new DeepSeekClient({ apiKey: auth.key, baseUrl: auth.base, model: auth.model,
          timeoutMs: 300000, reasoningEffort: "max", combatReasoningEffort: "high", systemPrompt: fixture.request.system }));
        const request: BrainRequest = { ...fixture.request, spec: specFor(fixture.request) };
        const answer = await engine.decide(request);
        row.answer = answer.answer; row.validation_problems = request.spec.validate(answer.answer);
        row.accepted = row.validation_problems.length === 0 && capture.finish_reason === "stop" && capture.done;
        row.recovered = Boolean((answer.native as any)?.v3?.recovered);
      } catch (error) {
        // Never retain arbitrary error messages, URLs, headers, credentials, or error response bodies.
        row.error_class = error instanceof Error ? error.name : "unknown";
        const message = error instanceof Error ? error.message : "";
        row.error_code = /^(ProviderHTTP\d+|ProviderStreamError|IncompleteStream|IncompleteSSEEvent|RepairBlockedByExperiment|Frozen request mismatch|ExpectedEventStream|EmptyStreamBody)$/.test(message) ? message : row.error_class;
      } finally {
        row.elapsed_ms = elapsed(); row.physical_calls = Math.min(calls, 1); row.repair_requests_blocked = Math.max(0, calls - 1);
        row.stream_complete = capture.done && !!capture.finish_reason;
        row.first_token_ms = capture.first_token_ms; row.first_reasoning_ms = capture.first_reasoning_ms;
        row.first_content_ms = capture.first_content_ms; row.last_reasoning_ms = capture.last_reasoning_ms; row.last_content_ms = capture.last_content_ms;
        row.model_returned = capture.model; row.finish_reason = capture.finish_reason; row.usage = capture.usage;
        row.content_chars = capture.content.length; row.reasoning_chars = capture.reasoning.length;
        try { row.first_raw_problems = specFor(fixture.request).validate(JSON.parse(capture.content)); row.first_raw_valid = row.first_raw_problems.length === 0; }
        catch { row.first_raw_valid = false; row.first_raw_problems = ["No strict JSON object"]; }
        line(join(evidence, "streams.jsonl"), { key, id: capture.id, content: capture.content, reasoning: capture.reasoning, events: capture.events });
        line(join(evidence, "results.jsonl"), row); finished.add(key);
        console.log(JSON.stringify({ key, accepted: row.accepted, elapsed_ms: row.elapsed_ms, first_token_ms: row.first_token_ms,
          reasoning_tokens: row.usage?.completion_tokens_details?.reasoning_tokens, error: row.error_code }));
      }
      if (process.env.ISSUE29_ONE === "1") return;
    }
  } finally { globalThis.fetch = fetched; }
}

async function main() {
  mkdirSync(evidence, { recursive: true }); mkdirSync(local, { recursive: true });
  const lock = join(local, "runner.lock");
  const fd = openSync(lock, "wx");
  writeFileSync(fd, String(process.pid)); closeSync(fd);
  try {
    const mode = process.argv[2];
    if (mode === "prepare") await prepare();
    else if (mode === "models" || mode === "balance-before" || mode === "balance-after") await discovery(mode);
    else if (mode === "run") await run();
    else throw Error("Use prepare, models, balance-before, run, balance-after");
  } finally { unlinkSync(lock); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { console.error(JSON.stringify({ stopped: true, error_class: error instanceof Error ? error.name : "unknown" })); process.exitCode = 1; });
}
