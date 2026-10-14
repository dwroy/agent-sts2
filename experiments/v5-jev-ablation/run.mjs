/** Replay frozen requests through Jev only. Never import the controller or change game state. */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { gunzipSync } from "node:zlib";

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`missing --${name}`);
  return process.argv[i + 1];
};
const hash = (x) => createHash("sha256").update(x).digest("hex");
const root = resolve(arg("root"));
const packet = resolve(arg("packet"));
const input = existsSync(`${packet}/requests.jsonl`) ? readFileSync(`${packet}/requests.jsonl`) : gunzipSync(readFileSync(`${packet}/requests.jsonl.gz`));
const jobs = input.toString().trim().split("\n").map(JSON.parse);
const manifestRaw = readFileSync(`${packet}/manifest.json`);
const manifest = JSON.parse(manifestRaw);
const results = `${packet}/results.jsonl`;
const starts = `${packet}/starts.jsonl`;
if (jobs.length !== manifest.api_calls || jobs.length > 144) throw new Error("call budget mismatch");
for (const job of jobs) {
  if (job.request.model !== manifest.model || job.request.model !== "jev-1.13.0") throw new Error("model pin changed");
  if (hash(JSON.stringify(job.request)) !== job.request_sha256) throw new Error("request digest mismatch");
  if (Object.keys(job.request.questions).join() !== "plan") throw new Error("unexpected question");
}
if (new Set(jobs.map((j) => j.id)).size !== jobs.length) throw new Error("duplicate job");
const previous = existsSync(results) ? readFileSync(results, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];
const started = existsSync(starts) ? readFileSync(starts, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];
const done = new Map(previous.map((r) => [r.id, r]));
if (done.size !== previous.length) throw new Error("duplicate result; preserve evidence");
for (const r of previous) {
  const job = jobs.find((j) => j.id === r.id);
  if (!job || r.request_sha256 !== job.request_sha256 || r.status !== "ok") throw new Error("preserve failed/mismatched result; explicit new revision needed");
}
if (started.some((r) => !done.has(r.id))) throw new Error("unresolved in-flight call; inspect before any retry");
if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify({ valid: true, jobs: jobs.length, completed: done.size, requests_sha256: hash(input) }));
  process.exit(0);
}

// Parse only the already-used provider settings into process memory; never log env or exception messages.
const env = parseEnv(readFileSync(arg("env"), "utf8"));
const baseURL = env.TYPESAFE_BASE_URL || "https://api.typesafe.ai";
if (new URL(baseURL).hostname !== "api.typesafe.ai" || new URL(baseURL).protocol !== "https:") throw new Error("unexpected provider endpoint");
if (!env.TYPESAFE_API_KEY) throw new Error("configured Jev credential missing");
const require = createRequire(`${root}/agent/package.json`);
const { TypeSafeClient } = require("@typesafe-ai/sdk");
const client = new TypeSafeClient({ apiKey: env.TYPESAFE_API_KEY, baseURL, defaultModel: manifest.model,
  timeout: 20000, retry: { maxRetries: 0 }, logLevel: "off" });
const binding = { model: manifest.model, endpoint_host: new URL(baseURL).hostname,
  requests_sha256: hash(input), manifest_sha256: hash(manifestRaw), concurrency: 1,
  max_calls: 144, max_successful_input_tokens: 4000000, started_at: new Date().toISOString(),
  sdk: JSON.parse(readFileSync(`${root}/agent/node_modules/@typesafe-ai/sdk/package.json`, "utf8")).version };
const bindingPath = `${packet}/run-binding.json`;
if (!existsSync(bindingPath)) writeFileSync(bindingPath, JSON.stringify(binding, null, 2) + "\n", { flag: "wx" });
else {
  const old = JSON.parse(readFileSync(bindingPath));
  if (old.requests_sha256 !== binding.requests_sha256 || old.manifest_sha256 !== binding.manifest_sha256) throw new Error("run binding changed");
}
let tokens = previous.reduce((n, r) => n + r.input_tokens, 0);
let successful = done.size;
for (const job of jobs) {
  if (done.has(job.id)) continue;
  if (tokens >= 4000000) throw new Error("pilot token budget reached");
  const receipt = { id: job.id, case_id: job.case_id, arm: job.arm, order: job.order, repeat: job.repeat,
    request_sha256: job.request_sha256, started_at: new Date().toISOString() };
  appendFileSync(starts, JSON.stringify(receipt) + "\n");
  const start = performance.now();
  let result;
  try {
    const { data, requestId } = await client.systemOne(job.request).withResponse();
    result = { ...receipt, finished_at: new Date().toISOString(), status: "ok", resolved_model: data.model ?? null,
      request_id: requestId ?? null, latency_ms: performance.now() - start, answers: data.answers,
      input_tokens: data.usage?.input_tokens ?? data.usage?.inputTokens ?? null,
      output_tokens: data.usage?.output_tokens ?? data.usage?.outputTokens ?? null };
    const answer = result.answers?.plan;
    if (result.resolved_model !== manifest.model || typeof result.input_tokens !== "number" ||
        answer?.type !== "choice" || !Object.hasOwn(job.request.questions.plan.criteria, answer.choice)) result.status = "invalid_response";
  } catch (error) {
    result = { ...receipt, status: "error", finished_at: new Date().toISOString(), latency_ms: performance.now() - start,
      error_class: error?.constructor?.name ?? "unknown", http_status: typeof error?.status === "number" ? error.status : null,
      input_tokens: null, output_tokens: null };
  }
  appendFileSync(results, JSON.stringify(result) + "\n");
  if (result.status !== "ok") {
    console.log(JSON.stringify({ halted: true, id: job.id, status: result.status, http_status: result.http_status ?? null,
      resolved_model: result.resolved_model ?? null }));
    process.exitCode = 2;
    break;
  }
  tokens += result.input_tokens;
  successful += 1;
  if (successful % 12 === 0 || successful === jobs.length) console.log(JSON.stringify({ successful, total: jobs.length, input_tokens: tokens }));
}
