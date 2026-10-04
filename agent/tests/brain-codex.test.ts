/**
 * V4 brain, codex engine (src/brain/engines/codex.ts) against a fake `codex` script: the arguments that keep the
 * context ours (no user config, no hooks / memories / plugins / tools, our system prompt as the base instructions,
 * the catalog entry without the exec and multi-agent tools), a clean environment with CODEX_HOME, the strict
 * output schema, the answer and usage read back from the --json stream, failure kinds (a used-up plan rests codex
 * for the process), the AGENTS.md guard, the start-up check, and the router around it (re-ask, timeout and
 * fallback to DeepSeek, brain.jsonl's effort). No model is called.
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createBrain, createRouter } from "../src/brain/brain.js";
import { brainCatalogEntry, checkCodex, closeCutAnswer, CODEX_DISABLED_FEATURES, CODEX_RUST_LOG, codexFailure, CodexEngine, codexKindSchema, codexSchema, dropNulls, parseCodexStream, redact, ROUTE_PATTERN, strictSchema } from "../src/brain/engines/codex.js";
import { isContextOverflow } from "../src/brain/knowledge.js";
import { answeredBy, deciderLabel, engineLabel } from "../src/hand/loop.js";
import { BrainRouter, EngineFailure, type BrainLogRow } from "../src/brain/router.js";
import { fightPlanSpec, pickSpec, routePlanSpec, runPlanSpec, shopPlanSpec, stableSchema } from "../src/brain/specs.js";
import type { BrainRequest } from "../src/brain/types.js";
import { loadConfig } from "../src/core/config.js";
import { buildRouteMap, routeView } from "../src/sim/route-map.js";
import { input as routeInput } from "./route-fixture.js";
import { DeepSeekClient, type DeepSeekAnswer } from "../src/brain/llm/deepseek.js";
import type { JsonValue } from "../src/core/util/json.js";

const dir = mkdtempSync(join(tmpdir(), "fake-codex-"));

/** codex-cli 0.160's catalog entry for gpt-6.1-sol, trimmed to the fields the engine reads or changes. */
const SOL = {
  slug: "gpt-6.1-sol",
  supported_reasoning_levels: ["low", "medium", "high", "xhigh", "max", "ultra"].map((effort) => ({ effort, description: effort })),
  context_window: 272000,
  tool_mode: "code_mode_only",
  multi_agent_version: "v2",
  experimental_supported_tools: ["send_user_message_async", "clock"],
  apply_patch_tool_type: "freeform",
  supports_search_tool: true,
  base_instructions: "You are Codex, an agent based on GPT-6.",
};

interface Seen {
  argv: string[];
  env: Record<string, string>;
  cwd: string;
  cwdFiles: string[];
  stdin: string;
  system: string;
  schema: unknown;
  catalog: unknown;
}

/**
 * A fake codex: `--version`, `debug models` (the catalog) and `exec`, which records what it was given next to itself
 * (argv, environment, cwd, stdin, the instruction / schema / catalog files) and prints the call's JSONL events (one
 * list per call, the last repeated), or sleeps.
 */
function fakeCodex(name: string, calls: Array<Array<Record<string, unknown>>>, opts: { exitCode?: number; stderr?: string; sleepMs?: number; catalog?: unknown } = {}): { bin: string; seen: () => Seen[]; calls: () => number } {
  const bin = join(dir, `${name}.mjs`);
  const seenFile = join(dir, `${name}.seen.jsonl`);
  rmSync(seenFile, { force: true });
  writeFileSync(bin, `#!${process.execPath}
import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
const argv = process.argv.slice(2);
if (argv[0] === "--version") { console.log("codex-cli 0.160.0"); process.exit(0); }
if (argv[0] === "debug" && argv[1] === "models") { console.log(JSON.stringify(${JSON.stringify(opts.catalog ?? { models: [{ slug: "gpt-6-astra" }, SOL] })})); process.exit(0); }
if (argv[0] === "app-server") {
  // The usage guard's read (engines/codex-usage.ts): 1% of a 7-day window, 500 credits (tests/brain-codex-usage.test.ts covers it).
  const { createInterface } = await import("node:readline");
  for await (const line of createInterface({ input: process.stdin })) {
    const msg = JSON.parse(line);
    if (msg.method === "initialize") console.log(JSON.stringify({ id: msg.id, result: { userAgent: "fake" } }));
    else if (msg.method === "account/rateLimits/read") console.log(JSON.stringify({ id: msg.id, result: { ordinaryUsageAllowed: true, rateLimits: { limitId: "codex", primary: { usedPercent: 1, windowDurationMins: 10080, resetsAt: 1791623197 }, secondary: null, credits: { hasCredits: true, unlimited: false, balance: "500" }, planType: "prolite", rateLimitReachedType: null, spendControlReached: false } } }));
  }
  process.exit(0);
}
let stdin = "";
for await (const chunk of process.stdin) stdin += chunk;
const settings = [];
for (let i = 0; i < argv.length; i += 1) if (argv[i] === "-c") settings.push(argv[i + 1]);
const setting = (key) => { const s = settings.find((x) => x.startsWith(key + "=")); return s === undefined ? undefined : JSON.parse(s.slice(key.length + 1)); };
const flag = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const schemaFile = flag("--output-schema");
const seen = { argv, env: process.env, cwd: process.cwd(), cwdFiles: readdirSync(process.cwd()), stdin,
  system: readFileSync(setting("model_instructions_file"), "utf8"),
  schema: schemaFile ? JSON.parse(readFileSync(schemaFile, "utf8")) : null,
  catalog: JSON.parse(readFileSync(setting("model_catalog_json"), "utf8")) };
appendFileSync(${JSON.stringify(seenFile)}, JSON.stringify(seen) + "\\n");
const n = readFileSync(${JSON.stringify(seenFile)}, "utf8").split("\\n").filter(Boolean).length;
const calls = ${JSON.stringify(calls)};
${opts.sleepMs ? `await new Promise((ok) => setTimeout(ok, ${opts.sleepMs}));` : ""}
for (const event of calls[Math.min(n, calls.length) - 1] ?? []) {
  if (event.__sleep) { await new Promise((ok) => setTimeout(ok, event.__sleep)); continue; }
  if (event.__stderr) { process.stderr.write(event.__stderr); continue; }
  process.stdout.write(JSON.stringify(event) + "\\n");
}
${opts.stderr ? `process.stderr.write(${JSON.stringify(opts.stderr)});` : ""}
process.exit(${opts.exitCode ?? 0});
`);
  chmodSync(bin, 0o755);
  const seen = (): Seen[] => (existsSync(seenFile) ? readFileSync(seenFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Seen) : []);
  return { bin, seen, calls: () => seen().length };
}

/** The events of a call that answers `answer` (codex 0.160's exec --json stream). */
function answered(answer: unknown, usage: Record<string, number> = { input_tokens: 150000, cached_input_tokens: 140000, cache_write_input_tokens: 0, output_tokens: 3000, reasoning_output_tokens: 2500 }): Array<Record<string, unknown>> {
  return [
    { type: "thread.started", thread_id: "01a10105-46ea-7550-a32e-a2f6f87014d4" },
    { type: "turn.started" },
    { type: "item.completed", item: { id: "item_0", type: "reasoning", text: "**Weighing the rest**\n\nHP is low, the boss is next." } },
    { type: "item.completed", item: { id: "item_1", type: "agent_message", text: typeof answer === "string" ? answer : JSON.stringify(answer) } },
    { type: "turn.completed", usage },
  ];
}

function failed(message: string): Array<Record<string, unknown>> {
  return [{ type: "thread.started", thread_id: "t" }, { type: "turn.started" }, { type: "error", message }, { type: "turn.failed", error: { message } }];
}

const options = { a: JSON.stringify({ option: "heal" }), b: JSON.stringify({ option: "smith" }) };
function request(extra: Partial<BrainRequest> = {}): BrainRequest {
  return { label: "rest/plan", system: "SYSTEM PROMPT (rules + knowledge)", memory: { act: "第1幕" }, question: "Heal or smith?", options, payload: { hp: 20 }, spec: pickSpec("rest/plan", options, {}), ...extra };
}

function codexHome(name: string, files: Record<string, string> = { "auth.json": "{}" }): string {
  const home = join(dir, `home-${name}`);
  mkdirSync(home, { recursive: true });
  for (const [file, text] of Object.entries(files)) writeFileSync(join(home, file), text);
  return home;
}

function config(bin: string, home: string, env: Record<string, string> = {}): ReturnType<typeof loadConfig> {
  return loadConfig({ BRAIN_CODEX_BIN: bin, BRAIN_CODEX_HOME: home, BRAIN_LOG: "off", ...env } as unknown as NodeJS.ProcessEnv);
}

function engine(bin: string, home: string, env: Record<string, string> = {}): CodexEngine {
  const cfg = config(bin, home, env);
  return new CodexEngine({ settings: cfg.brain.engines.codex, codex: cfg.brain.codex, stateDir: join(dir, "state") });
}

describe("codex engine", () => {
  it("runs codex exec with only our context: no user config, hooks, memories, plugins or tools; model and effort explicit", async () => {
    const fake = fakeCodex("plain", [answered({ choice: "b", reason: "smith the bash", route: null, route_reason: null, cards: null, discard: null })]);
    const home = codexHome("plain");
    const secretEnv = { DEEPSEEK_API_KEY: "sk-secret", TYPESAFE_API_KEY: "ts-secret", OPENAI_API_KEY: "sk-openai", CODEX_API_KEY: "ck", JEV_MODEL: "x", CLAUDECODE: "1" };
    const saved = { ...process.env };
    Object.assign(process.env, secretEnv);
    let answer;
    try {
      answer = await engine(fake.bin, home).decide(request());
    } finally {
      for (const key of Object.keys(secretEnv)) delete process.env[key];
      Object.assign(process.env, saved);
    }
    const [seen] = fake.seen();
    expect(seen).toBeDefined();
    const argv = seen!.argv;
    const flag = (f: string): string | undefined => argv[argv.indexOf(f) + 1];
    const settings = argv.flatMap((arg, i) => (argv[i - 1] === "-c" ? [arg] : []));
    expect(argv.slice(0, 2)).toEqual(["exec", "--json"]);
    for (const f of ["--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules"]) expect(argv).toContain(f);
    expect(flag("--sandbox")).toBe("read-only");
    expect(flag("--model")).toBe("gpt-6.1-sol");
    expect(argv[argv.length - 1]).toBe("-");
    expect(settings).toEqual(expect.arrayContaining([
      'approval_policy="never"', 'web_search="disabled"', "project_doc_max_bytes=0", "include_permissions_instructions=false", "include_apps_instructions=false",
      "include_collaboration_mode_instructions=false", "include_environment_context=false", "skills.include_instructions=false", "skills.bundled.enabled=false",
      "tools.experimental_request_user_input={ enabled = false }", 'history.persistence="none"', "analytics.enabled=false",
      'model_reasoning_effort="xhigh"', 'model_reasoning_summary="auto"',
    ]));
    expect(settings.some((s) => s.startsWith("service_tier="))).toBe(false);
    const disabled = argv.flatMap((arg, i) => (argv[i - 1] === "--disable" ? [arg] : []));
    expect(disabled).toEqual([...CODEX_DISABLED_FEATURES]);
    for (const feature of ["hooks", "memories", "plugins", "apps", "multi_agent", "shell_tool", "unified_exec"]) expect(disabled).toContain(feature);
    // Codex's state outside its home; the working directory empty.
    expect(settings.find((s) => s.startsWith("sqlite_home="))).toBe(`sqlite_home=${JSON.stringify(join(dir, "state"))}`);
    expect(seen!.cwdFiles).toEqual([]);
    expect(seen!.cwd).toMatch(/jev-brain-codex-/);
    // Our system prompt is the base instructions; the v3 user message on stdin.
    expect(seen!.system).toBe("SYSTEM PROMPT (rules + knowledge)");
    expect(JSON.parse(seen!.stdin)).toEqual({ memory: { act: "第1幕" }, state: { hp: 20 }, question: "Heal or smith?", options });
    // The kind's stable schema, strict; the catalog entry without the exec / multi-agent / experimental tools.
    expect(seen!.schema).toEqual(codexSchema(codexKindSchema(pickSpec("rest/plan", options, {}), { fields: "used", reasonLast: false }), { routeReason: "drop", maxFieldChars: 600 }));
    expect(seen!.catalog).toEqual({ models: [brainCatalogEntry(SOL)] });
    expect(seen!.catalog).toMatchObject({ models: [{ slug: "gpt-6.1-sol", tool_mode: null, multi_agent_version: null, experimental_supported_tools: [], apply_patch_tool_type: null, supports_search_tool: false, context_window: 272000 }] });
    // No key reaches codex; its home does; its own directory leads PATH (the npm launcher's node).
    for (const key of Object.keys(secretEnv)) expect(Object.keys(seen!.env)).not.toContain(key);
    expect(seen!.env["CODEX_HOME"]).toBe(home);
    expect(seen!.env["PATH"]!.split(":")[0]).toBe(dir);
    expect(answer).toMatchObject({
      engine: "codex",
      model: "gpt-6.1-sol",
      effort: "xhigh",
      // The nulls of the strict schema's optional fields are dropped.
      answer: { choice: "b", reason: "smith the bash" },
      problems: [],
      attempts: 1,
      usage: { inputTokens: 150000, cacheHitTokens: 140000, outputTokens: 3000, reasoningTokens: 2500 },
      toolCalls: [],
      reasoning: "**Weighing the rest**\n\nHP is low, the boss is next.",
    });
    expect(answer!.answer).not.toHaveProperty("route");
    expect(answer!.usage).not.toHaveProperty("cacheWriteTokens");
  });

  it("takes the model and effort per kind and the service tier from the environment", async () => {
    const fake = fakeCodex("models", [answered({ choice: "a", reason: "heal" })]);
    const answer = await engine(fake.bin, codexHome("models"), { BRAIN_CODEX_MODEL: "gpt-6-astra", BRAIN_CODEX_MODEL_REST: "gpt-6.1-sol", BRAIN_CODEX_EFFORT: "max", BRAIN_CODEX_SERVICE_TIER: "priority", BRAIN_CODEX_SUMMARY: "detailed" }).decide(request());
    const argv = fake.seen()[0]!.argv;
    expect(argv[argv.indexOf("--model") + 1]).toBe("gpt-6.1-sol");
    expect(argv).toEqual(expect.arrayContaining(['model_reasoning_effort="max"', 'service_tier="priority"', 'model_reasoning_summary="detailed"']));
    expect(answer).toMatchObject({ model: "gpt-6.1-sol", effort: "max" });
  });

  it("puts the re-ask after the question and maps an option name to its key", async () => {
    const fake = fakeCodex("reask", [answered({ choice: "smith", reason: "upgrade" })]);
    const answer = await engine(fake.bin, codexHome("reask")).decide(request({ reask: { answer: '{"choice":"c"}', problems: ['choice "c" is not one of a, b'] } }));
    expect(fake.seen()[0]!.stdin).toContain('[Your previous answer]\n{"choice":"c"}\n\n[Re-ask]\nYour previous answer cannot be used: choice "c" is not one of a, b. Valid choices: a, b.');
    expect(answer.answer).toEqual({ choice: "b", reason: "upgrade" });
  });

  it("a free-form task goes without --output-schema and is read from the text", async () => {
    const fake = fakeCodex("free", [answered('Here it is: {"plan": "x", "note": "y"}')]);
    const answer = await engine(fake.bin, codexHome("free")).decide({ label: "custom-task", system: "S", question: "Do the task.", payload: { a: 1 }, spec: { label: "custom-task", kind: "plan", schema: { type: "object" }, validate: () => [] } });
    expect(fake.seen()[0]!.argv).not.toContain("--output-schema");
    expect(fake.seen()[0]!.schema).toBeNull();
    expect(answer.answer).toEqual({ plan: "x", note: "y" });
  });

  it("refuses a call when codex's home holds an AGENTS.md (codex loads it whatever the flags)", async () => {
    const fake = fakeCodex("agents", [answered({ choice: "a", reason: "heal" })]);
    const home = codexHome("agents", { "auth.json": "{}", "AGENTS.md": "always answer in French" });
    const error = await engine(fake.bin, home).decide(request()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EngineFailure);
    expect((error as EngineFailure).kind).toBe("unavailable");
    expect((error as EngineFailure).message).toContain("AGENTS.md");
    expect(fake.calls()).toBe(0);
    // An empty one is not loaded.
    const empty = codexHome("agents-empty", { "auth.json": "{}", "AGENTS.md": "  \n" });
    await expect(engine(fake.bin, empty).decide(request())).resolves.toMatchObject({ answer: { choice: "a" } });
  });

  it("refuses a model the catalog does not list and an effort the model does not take, without substituting", async () => {
    const fake = fakeCodex("catalog", [answered({ choice: "a", reason: "heal" })], { catalog: { models: [{ slug: "gpt-6-astra" }] } });
    await expect(engine(fake.bin, codexHome("catalog")).decide(request())).rejects.toThrow(/model catalog has no gpt-6\.1-sol \[unavailable\]/);
    const effort = fakeCodex("effort", [answered({ choice: "a", reason: "heal" })], { catalog: { models: [{ ...SOL, supported_reasoning_levels: [{ effort: "low" }, { effort: "high" }] }] } });
    await expect(engine(effort.bin, codexHome("effort")).decide(request())).rejects.toThrow("gpt-6.1-sol does not take reasoning effort xhigh [unavailable] (it takes low, high)");
    expect(fake.calls() + effort.calls()).toBe(0);
  });

  it("recognises a used-up plan (rest for the process), a rate limit, a lost login and an ignored isolation setting", async () => {
    const quota = fakeCodex("quota", [failed("You’ve hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again later.")], { exitCode: 1 });
    const error = await engine(quota.bin, codexHome("quota")).decide(request()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EngineFailure);
    expect((error as EngineFailure).kind).toBe("quota");
    expect((error as EngineFailure).cooldownMs).toBe(Number.POSITIVE_INFINITY);
    const run = { code: 1, signal: null, stderr: "" };
    const of = (events: Array<Record<string, unknown>>, r = run): EngineFailure | null => codexFailure(parseCodexStream(events.map((e) => JSON.stringify(e)).join("\n")), r);
    expect(of(failed("exceeded retry limit, last status: 429 Too Many Requests"))?.kind).toBe("rate_limit");
    expect(of(failed("unexpected status 401 Unauthorized: Unauthorized, url: https://chatgpt.com/backend-api/codex/responses"))?.kind).toBe("auth");
    expect(of(failed("unexpected status 503 Service Unavailable"))?.kind).toBe("overloaded");
    expect(of([], { ...run, stderr: "Error: Unknown feature flag: shell_tool\n" })?.kind).toBe("unavailable");
    const overflow = of(failed('{"error":{"type":"invalid_request_error","code":"context_length_exceeded","message":"Your input exceeds the context window of this model. Please adjust your input and try again."}}'));
    expect(overflow?.kind).toBe("error");
    expect(isContextOverflow(overflow)).toBe(true);
    // An answer is not taken when codex says it ignored one of our settings: the isolation may not hold.
    const ignored = [{ type: "item.completed", item: { id: "item_0", type: "error", message: "Codex is ignoring 1 unrecognized configuration setting. Check for typos or deprecated settings.\n  session-flags: `skills.include_instructions` is ignored." } }, ...answered({ choice: "a", reason: "heal" })];
    expect(of(ignored, { code: 0, signal: null, stderr: "" })?.kind).toBe("unavailable");
    expect(of(answered({ choice: "a", reason: "heal" }), { code: 0, signal: null, stderr: "" })).toBeNull();
    const crashed = fakeCodex("crash", [], { exitCode: 2, stderr: "WARNING: proceeding, even though we could not create PATH aliases: x\nthread 'main' panicked\n" });
    await expect(engine(crashed.bin, codexHome("crash")).decide(request())).rejects.toThrow(/codex exited 2 \[error\]: thread 'main' panicked/);
    const silent = fakeCodex("silent", [[{ type: "thread.started", thread_id: "t" }, { type: "turn.started" }, { type: "turn.completed", usage: {} }]]);
    await expect(engine(silent.bin, codexHome("silent")).decide(request())).rejects.toThrow(/codex gave no answer/);
  });

  it("records a tool item the model used (none is offered)", async () => {
    const fake = fakeCodex("tool", [[{ type: "item.completed", item: { id: "i", type: "command_execution", command: "ls" } }, ...answered({ choice: "a", reason: "heal" })]]);
    const answer = await engine(fake.bin, codexHome("tool")).decide(request());
    expect(answer.toolCalls.map((call) => call.name)).toEqual(["codex:command_execution"]);
  });
});

describe("codex runs watched: retries, stalls, timeouts and their trace", () => {
  const started = [{ type: "thread.started", thread_id: "t-stall" }, { type: "turn.started" }];
  /** codex's telemetry line for the first output token (CODEX_RUST_LOG), on stderr. */
  const ttft = { __stderr: '2026-10-03T10:32:41.466877Z  INFO session_loop{…}: codex_otel.trace_safe: event.name="codex.turn_ttft" duration_ms=17779 model=gpt-6.1-sol\n' };
  const traceOf = (file: string): Array<Record<string, any>> => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : []);
  function tracedEngine(bin: string, name: string, env: Record<string, string> = {}): { engine: CodexEngine; trace: () => Array<Record<string, any>> } {
    const cfg = config(bin, codexHome(name), env);
    const file = join(dir, `${name}-codex-calls.jsonl`);
    rmSync(file, { force: true });
    return { engine: new CodexEngine({ settings: cfg.brain.engines.codex, codex: cfg.brain.codex, stateDir: join(dir, "state"), traceFile: file }), trace: () => traceOf(file) };
  }

  it("a retry notice is not a failure: the answer after it is taken, and the trace keeps the notice", async () => {
    const notice = "Reconnecting... 1/5 (stream disconnected before completion: idle timeout waiting for SSE)";
    const fake = fakeCodex("retry", [[...started, { type: "error", message: notice }, ...answered({ choice: "a", reason: "heal" }).slice(2)]]);
    const { engine: e, trace } = tracedEngine(fake.bin, "retry");
    const answer = await e.decide(request({ runId: "RUN1" }));
    expect(answer.answer).toEqual({ choice: "a", reason: "heal" });
    expect(answer.native).toMatchObject({ retries: [notice], runs: 1 });
    const [row] = trace();
    expect(row).toMatchObject({ run_id: "RUN1", label: "rest/plan", model: "gpt-6.1-sol", effort: "xhigh", attempt: 1, outcome: "answered", exit: 0, retries: [notice], errors: [], usage: { input_tokens: 150000 } });
    expect(row!["events"].map((event: any) => event.type)).toEqual(["thread.started", "turn.started", "error", "item.completed", "item.completed", "turn.completed"]);
    expect(row!["events"][2]).toMatchObject({ type: "error", message: notice });
    // The trace holds sizes, never the texts.
    expect(row!["events"][3]).toEqual({ t: expect.any(Number), type: "item.completed", item: "reasoning", chars: 51 });
    expect(JSON.stringify(row)).not.toContain("Weighing the rest");
    expect(JSON.stringify(row)).not.toContain("SYSTEM PROMPT");
    expect(parseCodexStream(JSON.stringify({ type: "error", message: notice })).errors).toEqual([]);
  });

  it("after the first token, a stream silent for BRAIN_CODEX_STALL_MS is killed and asked once more; the second run's answer is taken", async () => {
    const fake = fakeCodex("stall-once", [[...started, ttft, { __sleep: 30_000 }, ...answered({ choice: "b", reason: "late" }).slice(2)], answered({ choice: "a", reason: "heal" })]);
    const { engine: e, trace } = tracedEngine(fake.bin, "stall-once", { BRAIN_CODEX_STALL_MS: "1500" });
    const began = Date.now();
    const answer = await e.decide(request());
    expect(Date.now() - began).toBeLessThan(15_000);
    expect(fake.calls()).toBe(2);
    expect(answer).toMatchObject({ answer: { choice: "a", reason: "heal" }, native: { runs: 2 } });
    // The latency counts the stalled run too: exactly the two runs' own times, as their trace rows say.
    expect(answer.latencyMs).toBeGreaterThanOrEqual(1_500);
    const [stalledRun, answeredRun] = trace();
    expect(answer.latencyMs).toBe(stalledRun!["ms"] + answeredRun!["ms"]);
    expect([stalledRun!["call_ms"], answeredRun!["call_ms"]]).toEqual([stalledRun!["ms"], answer.latencyMs]);
    expect(trace().map((row) => [row["attempt"], row["outcome"], row["events"].map((event: any) => event.type).join(",")])).toEqual([
      [1, "stalled", "thread.started,turn.started"],
      [2, "answered", "thread.started,turn.started,item.completed,item.completed,turn.completed"],
    ]);
    expect(trace()[0]!["max_gap_ms"]).toBeGreaterThanOrEqual(1_500);
    expect(trace()[0]).toMatchObject({ ttft_ms: expect.any(Number), stall: expect.stringMatching(/^no stream event for 2 s after the first token at 0 s \(last: turn\.started at 0 s\)$/) });
    expect(fake.seen()[0]!.env["RUST_LOG"]).toBe(CODEX_RUST_LOG);
  }, 30_000);

  it("a question that stalled twice (and failed) is not billed to the next one: each latency is its own runs (J4S28FRQKD7G's act-plan, 41 s logged as 316 s)", async () => {
    const stall = [...started, ttft, { __sleep: 30_000 }];
    const fake = fakeCodex("stall-not-billed", [stall, stall, answered({ choice: "a", reason: "heal" })]);
    const { engine: e, trace } = tracedEngine(fake.bin, "stall-not-billed", { BRAIN_CODEX_STALL_MS: "1000" });
    await expect(e.decide(request({ runId: "RUN1", questionId: "Q1" }))).rejects.toThrow(/^codex stalled \[timeout\]: .* \(2 run\(s\)\)$/);
    const next = await e.decide(request({ runId: "RUN1", questionId: "Q2", label: "event/act-plan" }));
    const rows = trace();
    expect(rows.map((row) => [row["question_id"], row["label"], row["attempt"], row["outcome"]])).toEqual([
      ["Q1", "rest/plan", 1, "stalled"],
      ["Q1", "rest/plan", 2, "stalled"],
      ["Q2", "event/act-plan", 1, "answered"],
    ]);
    // Before the fix the answered run's latency carried both stalled runs (>= 2 s here): now it is its own run only.
    expect(rows[0]!["ms"] + rows[1]!["ms"]).toBeGreaterThanOrEqual(2_000);
    expect(next.latencyMs).toBe(rows[2]!["ms"]);
    expect(rows.map((row) => row["call_ms"])).toEqual([rows[0]!["ms"], rows[0]!["ms"] + rows[1]!["ms"], rows[2]!["ms"]]);
  }, 30_000);

  it("before the first token only BRAIN_CODEX_FIRST_TOKEN_MS (off by default) and the router's timeout apply: long thinking is not a stall", async () => {
    const thinking = fakeCodex("thinking", [[...started, { __sleep: 3_000 }, ttft, ...answered({ choice: "a", reason: "heal" }).slice(2)]]);
    const { engine: e } = tracedEngine(thinking.bin, "thinking", { BRAIN_CODEX_STALL_MS: "1000" });
    await expect(e.decide(request())).resolves.toMatchObject({ answer: { choice: "a" }, native: { runs: 1 } });
    const capped = fakeCodex("first-token", [[...started, { __sleep: 30_000 }], answered({ choice: "b", reason: "smith" })]);
    const { engine: f, trace } = tracedEngine(capped.bin, "first-token", { BRAIN_CODEX_FIRST_TOKEN_MS: "2000" });
    await expect(f.decide(request())).resolves.toMatchObject({ answer: { choice: "b" }, native: { runs: 2 } });
    expect(trace()[0]).toMatchObject({ outcome: "stalled", stall: "no first token within 2 s", first_token_ms: 2000 });
  }, 30_000);

  it("stalled twice: the question fails as a timeout and the fallback answers it", async () => {
    const fake = fakeCodex("stall-twice", [[...started, ttft, { __sleep: 30_000 }]]);
    const home = codexHome("stall-twice");
    const log = join(dir, "stall-twice-brain.jsonl");
    rmSync(log, { force: true });
    const cfg = config(fake.bin, home, { BRAIN_ENGINE: "codex", BRAIN_FALLBACK: "deepseek", BRAIN_LOG: log, BRAIN_CODEX_STALL_MS: "1000" });
    class Stub extends DeepSeekClient {
      constructor() {
        super({ apiKey: "k", baseUrl: "http://127.0.0.1:9", model: "fake", timeoutMs: 100 });
      }
      override async choose(): Promise<DeepSeekAnswer> {
        return { choice: "a", reason: "deepseek", latencyMs: 1, inputTokens: 1, outputTokens: 1 };
      }
    }
    const answer = await createBrain(cfg, new Stub()).choose({ hp: 20 }, "Heal or smith?", options, { label: "rest/plan" });
    expect(fake.calls()).toBe(2);
    expect(answer).toMatchObject({ choice: "a", brain: { engine: "deepseek", fell_back_from: { engine: "codex", error: expect.stringMatching(/^codex stalled \[timeout\]: no stream event for 1 s after the first token at 0 s \(last: turn\.started at 0 s\) \(2 run\(s\)\)/) } } });
    const row = JSON.parse(readFileSync(log, "utf8").trim().split("\n")[0]!) as BrainLogRow;
    expect(row.fell_back_from).toMatchObject({ engine: "codex", kind: "timeout" });
    const trace = traceOf(join(dir, "codex-calls.jsonl"));
    expect(trace.filter((t) => t["label"] === "rest/plan" && t["outcome"] === "stalled").length).toBeGreaterThanOrEqual(2);
    // The two stalled runs' time is on DeepSeek's row (primary_ms: the router's wall clock of codex's attempt), and the
    // runs are found by the row's question id.
    const runs = trace.filter((t) => t["question_id"] === row.question_id);
    expect(runs.map((t) => t["outcome"])).toEqual(["stalled", "stalled"]);
    expect(row.primary_ms).toBeGreaterThanOrEqual(runs[0]!["ms"] + runs[1]!["ms"]);
    expect(row.primary_ms).toBeLessThan(runs[0]!["ms"] + runs[1]!["ms"] + 5_000);
    expect(answer.brain?.fell_back_from?.ms).toBe(row.primary_ms);
  }, 30_000);

  it("the router's timeout leaves the evidence: what the stream had sent, and its stderr with credentials masked", async () => {
    const jwt = `eyJ${"a".repeat(20)}.${"b".repeat(20)}.${"c".repeat(10)}`;
    const fake = fakeCodex("abort", [[...started, { __stderr: `WARN codex_core::client: retrying, auth Bearer ${jwt} access_token=abc123secret\n` }, { __sleep: 30_000 }]]);
    const { engine: e, trace } = tracedEngine(fake.bin, "abort");
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1_500);
    await expect(e.decide(request(), controller.signal)).rejects.toThrow(/aborted after/);
    const [row] = trace();
    expect(row).toMatchObject({ outcome: "aborted", thread_id: "t-stall", stall_ms: 120_000, first_token_ms: null });
    expect(row!["events"].map((event: any) => event.type)).toEqual(["thread.started", "turn.started"]);
    // Aborted at 1.5 s; under load the fake process starts late, so the silence before the abort can fall under 1 s.
    expect(row!["max_gap_ms"]).toBeGreaterThanOrEqual(500);
    expect(row!["stderr_tail"]).toContain("retrying");
    expect(row!["stderr_tail"]).not.toContain(jwt);
    expect(row!["stderr_tail"]).not.toContain("abc123secret");
    expect(redact(`Bearer ${jwt} "refresh_token": "r1" cookie=c2 sk-${"x".repeat(20)}`)).toBe('Bearer <redacted> "refresh_token": "<redacted>" cookie=<redacted> <key>');
  }, 30_000);
});

describe("the console names the engine", () => {
  it("says which engine decides and which answered (and for whom, after a fallback)", () => {
    expect(engineLabel("codex")).toBe("Codex");
    expect(engineLabel(undefined)).toBe("DeepSeek");
    expect(answeredBy(undefined)).toBe("DeepSeek");
    expect(answeredBy({ engine: "codex", model: "gpt-6.1-sol", attempts: 1, tool_calls: [] })).toBe("Codex");
    expect(answeredBy({ engine: "deepseek", model: "deepseek-flash", attempts: 1, tool_calls: [], fell_back_from: { engine: "codex", error: "codex timed out after 600000 ms" } })).toBe("DeepSeek (for Codex)");
  });

  it("deciderLabel: a decision log decider as the rationale names it (RJZGFGNYK56W: codex's answers read \"DeepSeek decided\")", () => {
    expect(deciderLabel("codex")).toBe("Codex");
    expect(deciderLabel("deepseek")).toBe("DeepSeek");
    expect(deciderLabel("claude")).toBe("Claude");
    expect(deciderLabel("deepseek (for codex)")).toBe("DeepSeek (for Codex)");
    expect(deciderLabel("claude (for codex)")).toBe("Claude (for Codex)");
    // None (plain v3 DeepSeek, a resolver called outside the loop): DeepSeek, as before.
    expect(deciderLabel(undefined)).toBe("DeepSeek");
    expect(deciderLabel("")).toBe("DeepSeek");
  });
});

describe("codex's answer schema against runaway answers", () => {
  const pick = stableSchema(pickSpec("reward/card", options, { route_review: {} }));
  it("drops route_reason by default (only logged) and caps every free-text field; enums and numbers stay as they are", () => {
    const schema = codexSchema(pick, { routeReason: "drop", maxFieldChars: 600 })!;
    const properties = schema["properties"] as Record<string, Record<string, unknown>>;
    expect(Object.keys(properties)).toEqual(["choice", "reason", "route", "cards", "discard"]);
    expect(schema["required"]).toEqual(["choice", "reason", "route", "cards", "discard"]);
    expect(properties["reason"]).toMatchObject({ type: "string", maxLength: 600 });
    expect(properties["route"]).toMatchObject({ type: ["string", "null"], maxLength: 600 });
    expect((properties["cards"]!["items"] as Record<string, unknown>)["maxLength"]).toBe(600);
    expect((properties["discard"]!["items"] as Record<string, unknown>)["maxLength"]).toBeUndefined();
    // The run plan riding on a question: its texts capped, its enums not.
    const plan = codexSchema(stableSchema(pickSpec("reward/card", options, { run_plan_task: {} })), { routeReason: "drop", maxFieldChars: 600 })!;
    const runPlan = (plan["properties"] as Record<string, Record<string, any>>)["run_plan"]!;
    expect(runPlan["properties"]["summary"]["maxLength"]).toBe(600);
    expect(runPlan["properties"]["elites"]).toEqual({ type: "string", enum: ["seek", "normal", "avoid"] });
    expect(runPlan["properties"]["block_target"]["maxLength"]).toBeUndefined();
    // The question's own validation does not need it: an answer without route_reason is valid.
    expect(pickSpec("reward/card", options, {}).validate({ choice: "a", reason: "r" })).toEqual([]);
  });

  it("keep: route_reason stays, capped at 60 characters; off: no caps (the strict schema as before)", () => {
    const kept = codexSchema(pick, { routeReason: "keep", maxFieldChars: 600 })!;
    expect((kept["properties"] as Record<string, Record<string, unknown>>)["route_reason"]).toMatchObject({ type: ["string", "null"], maxLength: 60 });
    expect(codexSchema(pick, { routeReason: "keep", maxFieldChars: null })).toEqual(strictSchema(pick));
    expect(codexSchema({ type: "object" }, { routeReason: "drop", maxFieldChars: 600 })).toBeNull();
    const cfg = (env: Record<string, string>) => loadConfig(env as unknown as NodeJS.ProcessEnv).brain.codex;
    expect(cfg({})).toMatchObject({ routeReason: "drop", maxFieldChars: 600 });
    expect(cfg({ BRAIN_CODEX_ROUTE_REASON: "keep", BRAIN_CODEX_MAX_FIELD_CHARS: "off" })).toMatchObject({ routeReason: "keep", maxFieldChars: null });
    expect(() => loadConfig({ BRAIN_CODEX_ROUTE_REASON: "english" } as unknown as NodeJS.ProcessEnv)).toThrow(/BRAIN_CODEX_ROUTE_REASON/);
  });
});

describe("codex's schema holds only the fields the question uses (BRAIN_CODEX_SCHEMA_FIELDS; the A/B of 2026-10-03)", () => {
  const view = (): Record<string, unknown> => JSON.parse(JSON.stringify(routeView(buildRouteMap(routeInput())))) as Record<string, unknown>;
  const keys = (schema: { properties?: object } | null): string[] => Object.keys(schema?.properties ?? {});
  const used = { fields: "used", reasonLast: false } as const;

  it("derived from the request: route with a route review or an act route, cards with eligible_cards, discard with a discard option, run_plan with a due run plan", () => {
    expect(keys(codexKindSchema(pickSpec("reward/card", options, {}), used))).toEqual(["choice", "reason"]);
    expect(keys(codexKindSchema(pickSpec("reward/card", options, { route_review: { ...view(), plan: "r1c2 …" } }), used))).toEqual(["choice", "reason", "route", "route_reason"]);
    expect(keys(codexKindSchema(pickSpec("event/act-plan", options, { act_route: view() }), used))).toEqual(["choice", "reason", "route"]);
    const removal = { o0: JSON.stringify({ option: "leave" }), o1: JSON.stringify({ option: "remove", eligible_cards: { c1: "Strike" }, cards_to_name: "[1 keys]" }) };
    expect(keys(codexKindSchema(pickSpec("event/choose", removal, {}), used))).toEqual(["choice", "reason", "cards"]);
    const discard = { o0: JSON.stringify({ option: "take" }), "o0:discard": JSON.stringify({ option: "discard, then take" }) };
    expect(keys(codexKindSchema(pickSpec("event/choose", discard, {}), used))).toEqual(["choice", "reason", "discard"]);
    expect(keys(codexKindSchema(pickSpec("reward/card", options, { run_plan_task: { task: "plan" } }), used))).toEqual(["choice", "reason", "run_plan"]);
    // A plan kind already has only its own fields (shop: plan and reason).
    const shop = shopPlanSpec("shop/plan", { card1: JSON.stringify({ price: 50 }) }, {});
    expect(codexKindSchema(shop, used)).toEqual(stableSchema(shop));
    // all: the kind's whole stable schema, as before.
    expect(codexKindSchema(pickSpec("reward/card", options, {}), { fields: "all", reasonLast: false })).toEqual(stableSchema(pickSpec("reward/card", options, {})));
  });

  it("the strict schema codex gets for a pick with no optional field: choice and reason, both required; reason last moves reason to the end", () => {
    const strict = codexSchema(codexKindSchema(pickSpec("rest/plan", options, {}), used), { routeReason: "drop", maxFieldChars: 600 })!;
    expect(strict).toMatchObject({ type: "object", required: ["choice", "reason"], additionalProperties: false });
    expect(keys(strict)).toEqual(["choice", "reason"]);
    const last = codexKindSchema(pickSpec("reward/card", options, { route_review: { ...view(), plan: "r1c2 …" } }), { fields: "used", reasonLast: true });
    expect(keys(last)).toEqual(["choice", "route", "route_reason", "reason"]);
    expect(keys(codexSchema(last, { routeReason: "drop", maxFieldChars: 600 }))).toEqual(["choice", "route", "reason"]);
  });

  it("BRAIN_CODEX_SCHEMA_FIELDS used and BRAIN_CODEX_ACCEPT_CUT on by default, BRAIN_CODEX_REASON_LAST off; each can be switched", () => {
    const codex = (env: Record<string, string>) => loadConfig(env as unknown as NodeJS.ProcessEnv).brain.codex;
    expect(codex({})).toMatchObject({ schemaFields: "used", reasonLast: false, acceptCut: true });
    expect(codex({ BRAIN_CODEX_SCHEMA_FIELDS: "all", BRAIN_CODEX_REASON_LAST: "on", BRAIN_CODEX_ACCEPT_CUT: "off" })).toMatchObject({ schemaFields: "all", reasonLast: true, acceptCut: false });
    expect(() => codex({ BRAIN_CODEX_SCHEMA_FIELDS: "some" })).toThrow(/BRAIN_CODEX_SCHEMA_FIELDS/);
    expect(() => codex({ BRAIN_CODEX_ACCEPT_CUT: "maybe" })).toThrow(/BRAIN_CODEX_ACCEPT_CUT/);
  });

  it("a route review's route garbled as at xhigh (\"keep fin? No must exact keep\") is read as keep: one call, no re-ask, brain.jsonl notes it", async () => {
    const review = { route_review: { ...view(), plan: "r1c2 …" } };
    const fake = fakeCodex("route-garbled", [answered({ choice: "a", reason: "heal", route: "keep fin? No must exact keep", cards: null, discard: null })]);
    const cfg = config(fake.bin, codexHome("route-garbled"), { BRAIN_ENGINE: "codex" });
    const rows: BrainLogRow[] = [];
    const router = new BrainRouter({ config: cfg.brain, engine: () => engine(fake.bin, codexHome("route-garbled")), log: (row) => rows.push(row) });
    const answer = await router.decide(request({ label: "reward/card", payload: review, spec: pickSpec("reward/card", options, review) }));
    expect(fake.calls()).toBe(1);
    expect(answer).toMatchObject({ answer: { choice: "a", reason: "heal", route: "keep" }, problems: [], notes: ['route "keep fin? No must exact keep" taken as keep: "keep", then no node id'] });
    expect(rows).toEqual([expect.objectContaining({ reasks: 0, notes: answer.notes })]);
    // The schema codex got: route as "keep" or node ids (BRAIN_CODEX_ROUTE_PATTERN, default on).
    expect(fake.seen()[0]!.schema).toMatchObject({ properties: { route: { type: ["string", "null"], pattern: ROUTE_PATTERN, maxLength: 600 } } });
  });

  it("BRAIN_CODEX_ROUTE_PATTERN: on by default, only on the route field; off leaves route free text", () => {
    const review = { route_review: { ...view(), plan: "r1c2 …" } };
    const kind = codexKindSchema(pickSpec("reward/card", options, review), used);
    const on = codexSchema(kind, { routeReason: "drop", maxFieldChars: 600, routePattern: true })!;
    expect(on["properties"]).toMatchObject({ route: { pattern: ROUTE_PATTERN }, reason: { maxLength: 600 }, choice: { maxLength: 600 } });
    expect((on["properties"] as Record<string, object>)["reason"]).not.toHaveProperty("pattern");
    expect((codexSchema(kind, { routeReason: "drop", maxFieldChars: 600, routePattern: false })!["properties"] as Record<string, object>)["route"]).not.toHaveProperty("pattern");
    expect(new RegExp(ROUTE_PATTERN).test("keep") && new RegExp(ROUTE_PATTERN).test("r4c1 r5c2 r16c3")).toBe(true);
    for (const bad of ["keep fin? No must exact keep", "keep 序? ", "r4c1  r5c2", "r4c1 → r5c2", "Keep", ""]) expect(new RegExp(ROUTE_PATTERN).test(bad), bad).toBe(false);
    expect(loadConfig({} as NodeJS.ProcessEnv).brain.codex.routePattern).toBe(true);
    expect(loadConfig({ BRAIN_CODEX_ROUTE_PATTERN: "off" } as unknown as NodeJS.ProcessEnv).brain.codex.routePattern).toBe(false);
  });

  it("closeCutAnswer: a cut answer's prefix closed after its last complete member", () => {
    // The replayed runaway (L3G50U6KX5ST F31): a whole answer, then whitespace.
    const runaway = '{"choice":"card2","reason":"Rage supplies free defense while attacking." \n                        \n\n     \n          ';
    expect(closeCutAnswer(runaway)).toEqual({ json: { choice: "card2", reason: "Rage supplies free defense while attacking." }, text: '{"choice":"card2","reason":"Rage supplies free defense while attacking."}' });
    expect(closeCutAnswer('{"choice":"a","reason":"x",   \n ')?.json).toEqual({ choice: "a", reason: "x" });
    expect(closeCutAnswer('{"choice":"a","reason":"x \\" , y"  \n')?.json).toEqual({ choice: "a", reason: 'x " , y' });
    // A member cut half-way is left out (then the answer lacks it: not taken).
    expect(closeCutAnswer('{"choice":"a","reason":"Rage sup')?.json).toEqual({ choice: "a" });
    expect(closeCutAnswer('{"choice":"a","cards":["c1","c')?.json).toEqual({ choice: "a" });
    expect(closeCutAnswer('{"choice":"a","run_plan":{"want":["x"]}  ')?.json).toEqual({ choice: "a", run_plan: { want: ["x"] } });
    expect(closeCutAnswer("  ")).toBeNull();
    expect(closeCutAnswer('note {"a":1}')).toBeNull();
  });
});

describe("the strict answer schema", () => {
  it("makes every property required, the optional ones nullable, and drops their nulls from the answer", () => {
    const pick = strictSchema(stableSchema(pickSpec("rest/plan", options, {})))!;
    const properties = pick["properties"] as Record<string, Record<string, unknown>>;
    expect(pick["required"]).toEqual(["choice", "reason", "route", "route_reason", "cards", "discard"]);
    expect(pick["additionalProperties"]).toBe(false);
    expect(properties["choice"]!["type"]).toBe("string");
    expect(properties["route"]!["type"]).toEqual(["string", "null"]);
    expect(properties["cards"]!["type"]).toEqual(["array", "null"]);
    // The run plan riding on a question: a nullable object whose own fields are all required.
    const withPlan = strictSchema(stableSchema(pickSpec("reward/card", options, { run_plan_task: { task: "plan" } })))!;
    const runPlan = (withPlan["properties"] as Record<string, Record<string, unknown>>)["run_plan"]!;
    expect(runPlan["type"]).toEqual(["object", "null"]);
    expect(runPlan["required"]).toEqual(["archetype", "want", "avoid", "remove", "block_target", "elites", "rest", "boss_prep", "summary"]);
    // Enums take null with the type.
    const route = strictSchema(routePlanSpec("map/route-plan", {}).schema)!;
    expect(route["required"]).toEqual(["route", "reason", "discard", "drink"]);
    expect(strictSchema(fightPlanSpec().schema)!["required"]).toEqual(["approach", "setup_cards", "focus_enemy", "potions", "key_turns", "summary"]);
    expect(strictSchema(runPlanSpec().schema)).toEqual({ ...runPlanSpec().schema });
    const shop = stableSchema(shopPlanSpec("shop/visit", { card1: JSON.stringify({ price: 50 }) }, {}));
    expect(strictSchema(shop)).toEqual(shop);
    expect(strictSchema({ type: "object" })).toBeNull();
    expect(strictSchema({ type: "object", properties: { a: { type: "string", enum: ["x"] } }, required: [] }))
      .toEqual({ type: "object", properties: { a: { type: ["string", "null"], enum: ["x", null] } }, required: ["a"], additionalProperties: false });
    expect(dropNulls({ choice: "a", reason: "r", route: null, cards: null, run_plan: { archetype: "x", want: [] } }, stableSchema(pickSpec("reward/card", options, { run_plan_task: {} }))))
      .toEqual({ choice: "a", reason: "r", run_plan: { archetype: "x", want: [] } });
    // A required field keeps its null (the router's validation says what is wrong with it).
    expect(dropNulls({ choice: null, reason: "r" }, stableSchema(pickSpec("rest/plan", options, {})))).toEqual({ choice: null, reason: "r" });
  });
});

describe("the codex start-up check", () => {
  it("checks the program, the login file (not read), AGENTS.md, and the model and effort in the catalog", async () => {
    const fake = fakeCodex("check", []);
    const cfg = (home: string, env: Record<string, string> = {}) => config(fake.bin, home, env).brain.codex;
    const state = { stateDir: join(dir, "state") };
    await expect(checkCodex(cfg(codexHome("check-ok")), "gpt-6.1-sol", "xhigh", state)).resolves.toEqual({ ok: true, version: "codex-cli 0.160.0" });
    await expect(checkCodex(cfg(codexHome("check-nologin", {})), "gpt-6.1-sol", "xhigh", state)).resolves.toMatchObject({ ok: false, error: expect.stringContaining("no codex login") });
    await expect(checkCodex(cfg(codexHome("check-agents", { "auth.json": "{}", "AGENTS.override.md": "x" })), "gpt-6.1-sol", "xhigh", state)).resolves.toMatchObject({ ok: false, error: expect.stringContaining("AGENTS.override.md") });
    await expect(checkCodex(cfg(codexHome("check-ok")), "gpt-7", "xhigh", state)).resolves.toMatchObject({ ok: false, error: expect.stringContaining("has no gpt-7") });
    await expect(checkCodex(cfg(codexHome("check-ok")), "gpt-6.1-sol", "minimal", state)).resolves.toMatchObject({ ok: false, error: expect.stringContaining("does not take reasoning effort minimal") });
    await expect(checkCodex({ ...cfg(codexHome("check-ok")), bin: join(dir, "no-such-codex") }, "gpt-6.1-sol", "xhigh", state)).resolves.toMatchObject({ ok: false });
  });

  it("finds codex on PATH, then in ~/.local/node/bin; the home from BRAIN_CODEX_HOME, CODEX_HOME, then ~/.codex", () => {
    const home = join(dir, "userhome");
    mkdirSync(join(home, ".local", "node", "bin"), { recursive: true });
    const installed = join(home, ".local", "node", "bin", "codex");
    writeFileSync(installed, "#!/bin/sh\n");
    chmodSync(installed, 0o755);
    const brain = (env: Record<string, string>) => loadConfig({ HOME: home, PATH: "/nonexistent", ...env } as unknown as NodeJS.ProcessEnv).brain;
    expect(brain({}).codex).toMatchObject({ bin: installed, home: join(home, ".codex"), summary: "auto", serviceTier: null, stallMs: 120_000, firstTokenMs: null, stallRetries: 1 });
    expect(brain({ BRAIN_CODEX_STALL_MS: "off", BRAIN_CODEX_FIRST_TOKEN_MS: "240000", BRAIN_CODEX_STALL_RETRIES: "0" }).codex).toMatchObject({ stallMs: null, firstTokenMs: 240_000, stallRetries: 0 });
    expect(brain({ PATH: join(home, ".local", "node", "bin") }).codex.bin).toBe(installed);
    expect(brain({ BRAIN_CODEX_BIN: "/opt/codex" }).codex.bin).toBe("/opt/codex");
    expect(brain({ CODEX_HOME: "/c" }).codex.home).toBe("/c");
    expect(brain({ CODEX_HOME: "/c", BRAIN_CODEX_HOME: "/b" }).codex.home).toBe("/b");
    expect(brain({ BRAIN_CODEX_SERVICE_TIER: "default" }).codex.serviceTier).toBeNull();
    // Defaults: gpt-6.1-sol at xhigh, 10 minutes, no call limit, no tools; BRAIN_ENGINE stays deepseek.
    expect(brain({}).engine).toBe("deepseek");
    expect(brain({}).engines.codex).toMatchObject({ model: "gpt-6.1-sol", effort: "xhigh", timeoutMs: 600_000, maxCalls: null });
    expect(brain({ BRAIN_CODEX_EFFORT: "high" }).engines.codex.effort).toBe("high");
    // xhigh is an effort for every engine now; the old values still parse.
    expect(brain({ BRAIN_CLAUDE_EFFORT: "xhigh" }).engines.claude.effort).toBe("xhigh");
    expect(brain({ BRAIN_CLAUDE_EFFORT: "max" }).engines.claude.effort).toBe("max");
    expect(() => loadConfig({ HOME: home, BRAIN_CODEX_EFFORT: "ultra" } as unknown as NodeJS.ProcessEnv)).toThrow(/BRAIN_CODEX_EFFORT/);
  });
});

describe("the loop's brain with BRAIN_ENGINE=codex, BRAIN_FALLBACK=deepseek", () => {
  class StubDeepSeek extends DeepSeekClient {
    calls = 0;
    constructor() {
      super({ apiKey: "k", baseUrl: "http://127.0.0.1:9", model: "fake", timeoutMs: 100 });
    }
    override async choose(): Promise<DeepSeekAnswer> {
      this.calls += 1;
      return { choice: "a", reason: "deepseek says heal", latencyMs: 1, inputTokens: 10, outputTokens: 2 };
    }
  }
  const state: Record<string, JsonValue> = { hp: 20 };

  function brainWith(bin: string, home: string, env: Record<string, string> = {}): { brain: ReturnType<typeof createBrain>; rows: () => BrainLogRow[]; notes: string[]; deepseek: StubDeepSeek } {
    const log = join(dir, `${home.split("/").pop()}-brain.jsonl`);
    rmSync(log, { force: true });
    const cfg = config(bin, home, { BRAIN_ENGINE: "codex", BRAIN_FALLBACK: "deepseek", BRAIN_LOG: log, ...env });
    const notes: string[] = [];
    const deepseek = new StubDeepSeek();
    const brain = createBrain(cfg, deepseek);
    brain.onNote((message) => notes.push(message));
    const rows = (): BrainLogRow[] => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as BrainLogRow) : []);
    return { brain, rows, notes, deepseek };
  }

  it("answers through codex, logging engine, model, effort and tokens; an invalid answer is re-asked once", async () => {
    const fake = fakeCodex("loop", [answered({ choice: "c", reason: "no such option" }), answered({ choice: "b", reason: "smith" })]);
    const { brain, rows, deepseek } = brainWith(fake.bin, codexHome("loop"));
    const answer = await brain.choose(state, "Heal or smith?", options, { label: "rest/plan" });
    expect(answer).toMatchObject({ choice: "b", reason: "smith", brain: { engine: "codex", model: "gpt-6.1-sol", attempts: 2, reask_calls: 1 } });
    expect(fake.calls()).toBe(2);
    expect(fake.seen()[1]!.stdin).toContain("[Re-ask]");
    expect(deepseek.calls).toBe(0);
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatchObject({ engine: "codex", model: "gpt-6.1-sol", effort: "xhigh", reasks: 1, attempts: 2, tools: [], usage: { inputTokens: 300000, cacheHitTokens: 280000, outputTokens: 6000, reasoningTokens: 5000 } });
  });

  it("a used-up plan: DeepSeek answers, codex is not asked again in this process, and the console hears it once", async () => {
    const fake = fakeCodex("loop-quota", [failed("You’ve hit your usage limit. Visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again later.")], { exitCode: 1 });
    const { brain, rows, notes, deepseek } = brainWith(fake.bin, codexHome("loop-quota"));
    const first = await brain.choose(state, "Heal or smith?", options, { label: "rest/plan" });
    expect(first).toMatchObject({ choice: "a", brain: { engine: "deepseek", fell_back_from: { engine: "codex" } } });
    const second = await brain.choose(state, "Heal or smith?", options, { label: "rest/plan" });
    expect(second.choice).toBe("a");
    expect(fake.calls()).toBe(1);
    expect(deepseek.calls).toBe(2);
    expect(rows().map((row) => [row.engine, row.fell_back_from?.engine, row.fell_back_from?.kind])).toEqual([["deepseek", "codex", "quota"], ["deepseek", "codex", "quota"]]);
    expect(rows()[1]!.fell_back_from!.error).toMatch(/unavailable for this process/);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/brain engine codex is off for the rest of this process after quota: .*usage limit.*; its questions go to deepseek/);
  });

  it("a call past BRAIN_CODEX_TIMEOUT_MS is killed and DeepSeek answers it", async () => {
    const fake = fakeCodex("loop-slow", [answered({ choice: "b", reason: "late" })], { sleepMs: 20_000 });
    const { brain, rows } = brainWith(fake.bin, codexHome("loop-slow"), { BRAIN_CODEX_TIMEOUT_MS: "1500" });
    const began = Date.now();
    const answer = await brain.choose(state, "Heal or smith?", options, { label: "rest/plan" });
    expect(Date.now() - began).toBeLessThan(10_000);
    expect(answer).toMatchObject({ choice: "a", brain: { engine: "deepseek", fell_back_from: { engine: "codex", error: "codex timed out after 1500 ms" } } });
    expect(rows()[0]).toMatchObject({ engine: "deepseek", fell_back_from: { engine: "codex", kind: "timeout" } });
  }, 30_000);

  it("the start-up check marks codex unavailable for the run when it fails", async () => {
    const fake = fakeCodex("loop-check", [answered({ choice: "b", reason: "smith" })]);
    const { brain, deepseek } = brainWith(fake.bin, codexHome("loop-check", {}));
    const problems = await brain.preflight();
    expect(problems).toEqual([expect.stringMatching(/^codex is unavailable for this run: no codex login .*; its questions go to deepseek/)]);
    expect(brain.codexCheck).toMatchObject({ ok: false });
    const answer = await brain.choose(state, "Heal or smith?", options, { label: "rest/plan" });
    expect(answer.choice).toBe("a");
    expect(fake.calls()).toBe(0);
    expect(deepseek.calls).toBe(1);
  });

  it("is no longer refused by the router as not implemented", async () => {
    const fake = fakeCodex("router", [answered({ choice: "a", reason: "heal" })]);
    const cfg = config(fake.bin, codexHome("router"), { BRAIN_ENGINE: "codex" });
    await expect(createRouter(cfg, null).decide(request())).resolves.toMatchObject({ engine: "codex", answer: { choice: "a" } });
  });
});
