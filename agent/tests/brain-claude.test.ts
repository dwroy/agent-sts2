/**
 * V4 brain, claude engine (src/brain/engines/claude.ts) against a fake `claude` script: the arguments that keep
 * the context ours (no settings, no built-in tools, only our MCP server), a clean environment, the structured
 * answer and usage read back, failure kinds (quota, rate limit, login) and the stdio MCP round trip with a fake
 * tool. No model is called.
 */
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createBrain } from "./legacy-brain.js";
import { checkClaudeBin, CLAUDE_REST_MS, claudeFailure, ClaudeEngine, claudeModelId } from "../src/brain/engines/claude.js";
import { agentEnv, EXIT_CLOSE_GRACE_MS, runAgent } from "../src/brain/engines/process.js";
import { EngineFailure } from "../src/brain/router.js";
import { pickSpec, runPlanSpec, stableSchema } from "../src/brain/specs.js";
import type { BrainRequest } from "../src/brain/types.js";
import { loadConfig } from "../src/core/config.js";
import { DeepSeekClient, type DeepSeekAnswer } from "../src/brain/llm/deepseek.js";
import type { JsonValue } from "../src/core/util/json.js";

const dir = mkdtempSync(join(tmpdir(), "fake-claude-"));

/**
 * A fake claude: records argv, env names, cwd, stdin and the system prompt file next to itself; with tools,
 * starts the --mcp-config stdio server and calls its first tool; then prints `result` (or exits with `exitCode`).
 */
function fakeClaude(name: string, result: Record<string, unknown> | null, opts: { exitCode?: number; stderr?: string } = {}): { bin: string; seen: () => { argv: string[]; env: string[]; cwd: string; stdin: string; system: string; tool?: unknown } } {
  const bin = join(dir, `${name}.mjs`);
  const seenFile = join(dir, `${name}.seen.json`);
  writeFileSync(bin, `#!${process.execPath}
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
const argv = process.argv.slice(2);
const flag = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
let stdin = "";
for await (const chunk of process.stdin) stdin += chunk;
const seen = { argv, env: Object.keys(process.env).sort(), cwd: process.cwd(), stdin, system: readFileSync(flag("--system-prompt-file"), "utf8") };
const config = flag("--mcp-config");
if (config) {
  const server = JSON.parse(config).mcpServers.gkb;
  const child = spawn(server.command, server.args, { env: { ...process.env, ...server.env }, stdio: ["pipe", "pipe", "inherit"] });
  let buffer = "";
  const replies = [];
  child.stdout.on("data", (c) => { buffer += c; let i; while ((i = buffer.indexOf("\\n")) >= 0) { replies.push(JSON.parse(buffer.slice(0, i))); buffer = buffer.slice(i + 1); } });
  const send = (m) => child.stdin.write(JSON.stringify(m) + "\\n");
  const wait = async (id) => { for (;;) { const r = replies.find((x) => x.id === id); if (r) return r; await new Promise((ok) => setTimeout(ok, 20)); } };
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "fake", version: "0" } } });
  await wait(1);
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const list = await wait(2);
  send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: list.result.tools[0].name, arguments: { name: "骇鳗" } } });
  seen.tool = { list: list.result.tools.map((t) => t.name), call: (await wait(3)).result };
  child.stdin.end();
}
writeFileSync(${JSON.stringify(seenFile)}, JSON.stringify(seen));
${opts.stderr ? `process.stderr.write(${JSON.stringify(opts.stderr)});` : ""}
${result ? `process.stdout.write(JSON.stringify(${JSON.stringify(result)}) + "\\n");` : ""}
process.exit(${opts.exitCode ?? 0});
`);
  chmodSync(bin, 0o755);
  return { bin, seen: () => JSON.parse(readFileSync(seenFile, "utf8")) as ReturnType<ReturnType<typeof fakeClaude>["seen"]> };
}

function success(structured: unknown, model = "claude-sonnet-5"): Record<string, unknown> {
  return {
    type: "result", subtype: "success", is_error: false, num_turns: 2, duration_api_ms: 900, result: JSON.stringify(structured), structured_output: structured, total_cost_usd: 0.0139,
    usage: { input_tokens: 4, cache_creation_input_tokens: 1429, cache_read_input_tokens: 1335, output_tokens: 792, output_tokens_details: { thinking_tokens: 120 } },
    modelUsage: { [model]: { inputTokens: 4 } }, permission_denials: [],
  };
}

const options = { a: JSON.stringify({ option: "heal" }), b: JSON.stringify({ option: "smith" }) };
function request(extra: Partial<BrainRequest> = {}): BrainRequest {
  return { label: "rest/plan", system: "SYSTEM PROMPT", memory: { act: "第1幕" }, question: "Heal or smith?", options, payload: { hp: 20 }, spec: pickSpec("rest/plan", options, {}), ...extra };
}

function engine(bin: string, env: Record<string, string> = {}, toolsModule?: string): ClaudeEngine {
  const config = loadConfig({ BRAIN_CLAUDE_BIN: bin, ...env } as unknown as NodeJS.ProcessEnv);
  return new ClaudeEngine({ settings: config.brain.engines.claude, claude: config.brain.claude, ...(toolsModule ? { toolsModule } : {}) });
}

describe("claude engine", () => {
  it("runs claude -p with only our context: no settings, no built-in tools, no MCP but ours, a clean environment", async () => {
    const fake = fakeClaude("plain", success({ choice: "b", reason: "smith the bash" }));
    const secretEnv = { DEEPSEEK_API_KEY: "sk-secret", TYPESAFE_API_KEY: "ts-secret", JEV_MODEL: "x", ANTHROPIC_API_KEY: "sk-ant", CLAUDECODE: "1", CLAUDE_CODE_SESSION_ID: "s" };
    const saved = { ...process.env };
    Object.assign(process.env, secretEnv);
    let answer;
    try {
      answer = await engine(fake.bin).decide(request());
    } finally {
      for (const key of Object.keys(secretEnv)) delete process.env[key];
      Object.assign(process.env, saved);
    }
    const seen = fake.seen();
    const flag = (f: string): string | undefined => seen.argv[seen.argv.indexOf(f) + 1];
    expect(seen.argv[0]).toBe("-p");
    expect(flag("--output-format")).toBe("json");
    expect(flag("--tools")).toBe("");
    expect(flag("--setting-sources")).toBe("");
    expect(flag("--permission-mode")).toBe("dontAsk");
    expect(flag("--model")).toBe("claude-sonnet-5");
    expect(seen.argv).toContain("--strict-mcp-config");
    expect(seen.argv).toContain("--no-session-persistence");
    // No tools: no MCP server at all, no --bare (the login is used).
    expect(seen.argv).not.toContain("--mcp-config");
    expect(seen.argv).not.toContain("--bare");
    // One schema per question kind by default (the prompt cache holds across questions); the router checks the keys.
    expect(JSON.parse(flag("--json-schema")!)).toEqual(stableSchema(pickSpec("rest/plan", options, {})));
    expect(seen.system).toBe("SYSTEM PROMPT");
    // The v3 user message layout.
    expect(JSON.parse(seen.stdin)).toEqual({ memory: { act: "第1幕" }, state: { hp: 20 }, question: "Heal or smith?", options });
    expect(seen.cwd).toMatch(/jev-brain-claude-/);
    for (const key of Object.keys(secretEnv)) expect(seen.env).not.toContain(key);
    expect(seen.env).toContain("HOME");
    expect(answer).toMatchObject({
      engine: "claude",
      model: "claude-sonnet-5",
      answer: { choice: "b", reason: "smith the bash" },
      problems: [],
      usage: { inputTokens: 4 + 1429 + 1335, cacheHitTokens: 1335, cacheWriteTokens: 1429, outputTokens: 792, reasoningTokens: 120, costUsd: 0.0139 },
      toolCalls: [],
    });
  });

  it("picks the model per question kind, pins the opus alias to its full id and reports the model that answered", async () => {
    const fake = fakeClaude("opus", success({ choice: "a", reason: "heal" }, "claude-opus-5-5"));
    const answer = await engine(fake.bin, { BRAIN_CLAUDE_MODEL: "sonnet", BRAIN_CLAUDE_MODEL_REST: "opus", BRAIN_CLAUDE_EFFORT: "high", BRAIN_CLAUDE_SCHEMA: "question" }).decide(request());
    const seen = fake.seen();
    // BRAIN_CLAUDE_SCHEMA=question: the question's own schema, its keys as an enum.
    expect(JSON.parse(seen.argv[seen.argv.indexOf("--json-schema") + 1]!)).toEqual(pickSpec("rest/plan", options, {}).schema);
    // "opus" goes out as the pinned full id (config.ts CLAUDE_OPUS_MODEL); other names as given.
    expect(seen.argv[seen.argv.indexOf("--model") + 1]).toBe("claude-opus-5-5");
    expect(seen.argv[seen.argv.indexOf("--effort") + 1]).toBe("high");
    expect(answer.model).toBe("claude-opus-5-5");
    const sonnet = fakeClaude("sonnet-alias", success({ choice: "a", reason: "heal" }));
    await engine(sonnet.bin, { BRAIN_CLAUDE_MODEL: "sonnet" }).decide(request());
    expect(sonnet.seen().argv[sonnet.seen().argv.indexOf("--model") + 1]).toBe("sonnet");
    expect(claudeModelId("Opus")).toBe("claude-opus-5-5");
    expect(claudeModelId("claude-opus-5")).toBe("claude-opus-5");
  });

  it("puts the re-ask after the question and maps an option name to its key", async () => {
    const fake = fakeClaude("reask", success({ choice: "smith", reason: "upgrade" }));
    const answer = await engine(fake.bin).decide(request({ reask: { answer: '{"choice":"c"}', problems: ['choice "c" is not one of a, b'] } }));
    expect(fake.seen().stdin).toContain('[Your previous answer]\n{"choice":"c"}\n\n[Re-ask]\nYour previous answer cannot be used: choice "c" is not one of a, b. Valid choices: a, b.');
    expect(answer.answer).toEqual({ choice: "b", reason: "upgrade" });
  });

  it("with tools: our stdio MCP server is the only one, pre-approved, and its calls come back recorded", async () => {
    const toolsModule = join(dir, "fake-tools.mjs");
    writeFileSync(toolsModule, 'export function buildTools() { return [{ name: "kb_monster", description: "Monster facts.", inputSchema: { type: "object", properties: { name: { type: "string" } } }, run: (input, ctx) => ({ text: `${input.name}: A${ctx.ascension} act ${ctx.act} floor ${ctx.state.floor}` }) }]; }\n');
    const fake = fakeClaude("tools", success({ choice: "a", reason: "heal" }));
    const tools = [{ name: "kb_monster", description: "Monster facts.", inputSchema: { type: "object" as const }, run: () => ({ text: "unused in process" }) }];
    const answer = await engine(fake.bin, {}, toolsModule).decide(request({ tools, toolContext: { ascension: 8, act: 2, knowledgeDir: "/k", logsDir: "/l", state: { floor: 17 } } }));
    const seen = fake.seen();
    expect(seen.argv[seen.argv.indexOf("--allowedTools") + 1]).toBe("mcp__gkb");
    expect(seen.system).toContain("# Tools");
    expect(seen.tool).toEqual({ list: ["kb_monster"], call: { content: [{ type: "text", text: "骇鳗: A8 act 2 floor 17" }], isError: false } });
    expect(answer.toolCalls).toEqual([{ name: "kb_monster", input: { name: "骇鳗" }, output: "骇鳗: A8 act 2 floor 17", ms: expect.any(Number) }]);
  }, 30_000);

  it("recognises a used-up quota, a rate limit and a lost login as engine failures with a rest", async () => {
    const quota = fakeClaude("quota", { type: "result", subtype: "success", is_error: true, result: "You've hit your limit · resets 3pm", total_cost_usd: 0, usage: {} }, { exitCode: 1 });
    const error = await engine(quota.bin).decide(request()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EngineFailure);
    expect((error as EngineFailure).kind).toBe("quota");
    expect((error as EngineFailure).cooldownMs).toBe(30 * 60_000);
    const run = { code: 1, signal: null, stderr: "", stdout: "" };
    expect(claudeFailure({ type: "result", is_error: true, api_error_status: 429, result: "API Error: 429 rate_limit_error" }, run)?.kind).toBe("rate_limit");
    expect(claudeFailure({ type: "result", is_error: true, api_error_status: 529, result: "Overloaded" }, run)?.kind).toBe("overloaded");
    expect(claudeFailure({ type: "result", is_error: true, subtype: "success", result: "Not logged in · Please run /login", terminal_reason: "api_error" }, run)?.kind).toBe("auth");
    expect(claudeFailure(null, { ...run, stderr: "segfault" })?.message).toMatch(/without a result \[error\]: segfault/);
    expect(claudeFailure({ type: "result", subtype: "error_max_turns", is_error: false, result: "" }, run)?.kind).toBe("error");
    expect(claudeFailure(success({}), run)).toBeNull();
    const crashed = fakeClaude("crash", null, { exitCode: 2, stderr: "boom" });
    await expect(engine(crashed.bin).decide(request())).rejects.toThrow(/claude exited 2 without a result \[error\]: boom/);
  });

  it("the environment a CLI agent inherits holds no keys", () => {
    const env = agentEnv({ EXTRA: "1" }, { PATH: "/bin", HOME: "/h", LC_ALL: "C", DEEPSEEK_API_KEY: "x", TYPESAFE_API_KEY: "y", OPENAI_API_KEY: "z", GITHUB_TOKEN: "t", CLAUDE_CODE_MESSAGING_TOKEN: "m", BRAIN_ENGINE: "claude" });
    expect(env).toEqual({ PATH: "/bin", HOME: "/h", LC_ALL: "C", EXTRA: "1" });
  });
});

describe("the loop's brain with BRAIN_ENGINE=claude", () => {
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
  const criteria: Record<string, string | null> = options;

  it("answers in the v3 shape with a brain note naming the engine", async () => {
    const fake = fakeClaude("loop", success({ choice: "b", reason: "smith" }));
    const log = join(dir, "loop-brain.jsonl");
    const brain = createBrain(loadConfig({ BRAIN_ENGINE: "claude", BRAIN_CLAUDE_BIN: fake.bin, BRAIN_LOG: log } as unknown as NodeJS.ProcessEnv), new StubDeepSeek());
    const answer = await brain.choose(state, "Heal or smith?", criteria, { label: "rest/plan", memory: { act: "第1幕" } });
    expect(answer).toMatchObject({ choice: "b", reason: "smith", inputTokens: 2768, outputTokens: 792, cacheHitTokens: 1335, brain: { engine: "claude", model: "claude-sonnet-5", attempts: 1, tool_calls: [], cost_usd: 0.0139 } });
    const row = JSON.parse(readFileSync(log, "utf8").trim()) as Record<string, unknown>;
    expect(row).toMatchObject({ engine: "claude", label: "rest/plan", usage: { cacheWriteTokens: 1429 } });
  });

  it("a used-up Claude quota falls back to DeepSeek at once and logs why", async () => {
    const quota = fakeClaude("loop-quota", { type: "result", subtype: "success", is_error: true, result: "Claude usage limit reached" }, { exitCode: 1 });
    const log = join(dir, "loop-quota.jsonl");
    const deepseek = new StubDeepSeek();
    const brain = createBrain(loadConfig({ BRAIN_ENGINE: "claude", BRAIN_FALLBACK: "deepseek", BRAIN_CLAUDE_BIN: quota.bin, BRAIN_LOG: log } as unknown as NodeJS.ProcessEnv), deepseek);
    const first = await brain.choose(state, "Heal or smith?", criteria, { label: "rest/plan" });
    const second = await brain.choose(state, "Heal or smith?", criteria, { label: "rest/plan" });
    expect(first).toMatchObject({ choice: "a", brain: { engine: "deepseek", fell_back_from: { engine: "claude" } } });
    expect(second.brain?.fell_back_from?.error).toMatch(/^resting until/);
    expect(deepseek.calls).toBe(2);
    const rows = readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line) as { fell_back_from: { kind: string } });
    expect(rows.map((row) => row.fell_back_from.kind)).toEqual(["quota", "quota"]);
  });

  it("an answer still invalid after the re-ask is the loop's answered-but-unusable error; a run plan keeps its format check", async () => {
    const bad = fakeClaude("loop-bad", success({ choice: "zzz", reason: "?" }));
    const brain = createBrain(loadConfig({ BRAIN_ENGINE: "claude", BRAIN_CLAUDE_BIN: bad.bin, BRAIN_LOG: "off" } as unknown as NodeJS.ProcessEnv), new StubDeepSeek());
    await expect(brain.choose(state, "Heal or smith?", criteria, { label: "rest/plan" })).rejects.toThrow(/claude answer unusable: choice "zzz" is not one of a, b/);
    expect(runPlanSpec().validate({ choice: "review", reason: "x" })).toHaveLength(1);
  });
});

describe("the claude program: found, checked before play, and rested when it cannot start", () => {
  it("checkClaudeBin: a version line is ok; a failing exit, a missing program and a hang say why", async () => {
    const good = fakeClaude("version-ok", null);
    writeFileSync(good.bin, `#!/bin/sh\necho "2.1.99 (Claude Code)"\n`);
    expect(await checkClaudeBin(good.bin)).toEqual({ ok: true, version: "2.1.99 (Claude Code)" });
    const bad = join(dir, "version-bad.sh");
    writeFileSync(bad, `#!/bin/sh\necho "Invalid API key" >&2\nexit 3\n`);
    chmodSync(bad, 0o755);
    expect(await checkClaudeBin(bad)).toEqual({ ok: false, error: "exited 3: Invalid API key" });
    const missing = await checkClaudeBin(join(dir, "no-such-claude"));
    expect(missing.ok).toBe(false);
    expect(!missing.ok && missing.error).toMatch(/could not start: spawn .*ENOENT/);
    const slow = join(dir, "version-slow.sh");
    writeFileSync(slow, `#!/bin/sh\nexec sleep 5\n`);
    chmodSync(slow, 0o755);
    expect(await checkClaudeBin(slow, 200)).toEqual({ ok: false, error: "no answer within 200 ms" });
  });

  it("a program that does not start is an unavailable failure with a rest (not a silent per-question error)", async () => {
    const failure = await engine(join(dir, "no-such-claude")).decide(request()).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(EngineFailure);
    expect(failure).toMatchObject({ kind: "unavailable", cooldownMs: CLAUDE_REST_MS.unavailable });
    expect(CLAUDE_REST_MS.unavailable).toBeGreaterThan(0);
  });

  it("preflight: a failed check marks Claude unavailable; with no fallback its questions fail at once without starting it", async () => {
    const counter = join(dir, "preflight-runs.txt");
    const bin = join(dir, "preflight-bad.sh");
    writeFileSync(bin, `#!/bin/sh\necho run >> ${JSON.stringify(counter)}\nexit 1\n`);
    chmodSync(bin, 0o755);
    const log = join(dir, "preflight.jsonl");
    const brain = createBrain(loadConfig({ BRAIN_ENGINE: "claude", BRAIN_CLAUDE_BIN: bin, BRAIN_LOG: log } as unknown as NodeJS.ProcessEnv), new StubDeepSeekForPreflight());
    const problems = await brain.preflight();
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^claude is unavailable for this run: `.*preflight-bad\.sh --version` failed \(exited 1 with no version\); its questions go to Jev\/code/);
    expect(brain.warnings).toEqual(problems);
    expect(brain.claudeCheck).toEqual({ bin, ok: false, error: "exited 1 with no version" });
    await expect(brain.choose({ hp: 20 }, "Heal or smith?", options, { label: "rest/plan" })).rejects.toMatchObject({ kind: "unavailable" });
    // Only the check ran the program.
    expect(readFileSync(counter, "utf8").trim().split("\n")).toHaveLength(1);
  });

  it("preflight: nothing is checked when no configuration asks Claude", async () => {
    let checked = 0;
    const brain = createBrain(loadConfig({ BRAIN_LOG: "off" } as unknown as NodeJS.ProcessEnv), new StubDeepSeekForPreflight());
    expect(await brain.preflight(async () => ((checked += 1), { ok: true, version: "x" }))).toEqual([]);
    expect(checked).toBe(0);
    const fallbackOnly = createBrain(loadConfig({ BRAIN_FALLBACK: "claude", BRAIN_LOG: "off" } as unknown as NodeJS.ProcessEnv), new StubDeepSeekForPreflight());
    await fallbackOnly.preflight(async () => ((checked += 1), { ok: true, version: "x" }));
    expect(checked).toBe(1);
  });
});

class StubDeepSeekForPreflight extends DeepSeekClient {
  constructor() {
    super({ apiKey: "k", baseUrl: "http://127.0.0.1:9", model: "fake", timeoutMs: 100 });
  }
  override async choose(): Promise<DeepSeekAnswer> {
    return { choice: "a", reason: "deepseek", latencyMs: 1, inputTokens: 1, outputTokens: 1 };
  }
}

describe("runAgent: the agent's whole process group, and a call that always ends", () => {
  /** Whether a PID is gone (polled: the orphan is reaped by init after the kill). */
  async function gone(pid: number): Promise<boolean> {
    for (let i = 0; i < 50; i += 1) {
      try {
        process.kill(pid, 0);
      } catch {
        return true;
      }
      await new Promise((ok) => setTimeout(ok, 20));
    }
    return false;
  }

  it("an abort kills what the agent started too (a child holding its output), and the call ends at once", async () => {
    const pidFile = join(dir, "group-abort.pid");
    const bin = join(dir, "group-abort.sh");
    // The agent starts a child that keeps its stdout open, then waits.
    writeFileSync(bin, `#!/bin/sh\nsleep 30 &\necho $! > ${JSON.stringify(pidFile)}\nwait\n`);
    chmodSync(bin, 0o755);
    const controller = new AbortController();
    const run = runAgent(bin, [], { cwd: dir, env: agentEnv(), stdin: "", signal: controller.signal });
    for (let i = 0; i < 100 && !existsSync(pidFile); i += 1) await new Promise((ok) => setTimeout(ok, 20));
    const started = Date.now();
    controller.abort();
    await expect(run).rejects.toThrow(/aborted after/);
    expect(Date.now() - started).toBeLessThan(1_500);
    expect(await gone(Number(readFileSync(pidFile, "utf8").trim()))).toBe(true);
  });

  it("an agent that exits while something it started holds its output: the call ends after the grace, with the output, and the leftover is killed", async () => {
    const pidFile = join(dir, "group-exit.pid");
    const bin = join(dir, "group-exit.sh");
    writeFileSync(bin, `#!/bin/sh\nsleep 30 &\necho $! > ${JSON.stringify(pidFile)}\necho answered\nexit 0\n`);
    chmodSync(bin, 0o755);
    const started = Date.now();
    const result = await runAgent(bin, [], { cwd: dir, env: agentEnv(), stdin: "" });
    expect(result).toMatchObject({ code: 0, stdout: "answered\n" });
    expect(Date.now() - started).toBeLessThan(EXIT_CLOSE_GRACE_MS + 1_500);
    expect(await gone(Number(readFileSync(pidFile, "utf8").trim()))).toBe(true);
  });
});
