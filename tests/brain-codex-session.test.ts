/**
 * V4 brain, codex session mode (src/brain/engines/codex-session.ts, BRAIN_CODEX_MODE=session) against a fake
 * `codex app-server`: one server and one saved thread holding the system prompt, each question a turn reverted after
 * it, a new thread when the prompt changes or a turn fails, the config.toml / instruction-source guards (exec mode
 * then), stalls (interrupt, revert, ask again), a dead server (restart once, then exec mode), the pushed rate limits,
 * the sweep of a dead process's threads, the exit cleanup, and the trace rows. No model is called.
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { ANSWER_TEXT_KEEP, BlankRun, configTomlProblems, sessionCwdRoot } from "../src/brain/engines/codex-session.js";
import { CodexEngine, codexSchema, sessionFailure } from "../src/brain/engines/codex.js";
import { pickSpec, stableSchema } from "../src/brain/specs.js";
import type { BrainRequest } from "../src/brain/types.js";
import { loadConfig } from "../src/config.js";

const dir = mkdtempSync(join(tmpdir(), "fake-codex-session-"));

const SOL = {
  slug: "gpt-6.1-sol",
  supported_reasoning_levels: ["low", "medium", "high", "xhigh"].map((effort) => ({ effort })),
  tool_mode: "code_mode_only",
  multi_agent_version: "v2",
  experimental_supported_tools: ["clock"],
};

type Event = Record<string, unknown>;

interface Script {
  /** Per turn (counted over every server this test starts): the notifications after turn/start's answer. */
  turns: Event[][];
  instructionSources?: string[];
  /** Threads thread/list returns (the sweep). */
  stale?: Event[];
  revertFails?: boolean;
}

interface Req {
  pid: number;
  method: string;
  params: Record<string, any>;
}

/**
 * A fake codex: `debug models`, `exec` (exec mode's fallback answer), and `app-server`, a JSON-RPC server that logs
 * every request, makes threads with a rollout file each, plays each turn's scripted notifications ({__sleep: ms},
 * {__die: true}, or a notification; "$TURN" and "$THREAD" are replaced), answers turn/interrupt with an interrupted
 * turn, and deletes a thread's file on thread/delete.
 */
function fakeSession(name: string, script: Script): { bin: string; requests: () => Req[]; execs: () => number; state: string } {
  const state = join(dir, name);
  rmSync(state, { recursive: true, force: true });
  mkdirSync(state, { recursive: true });
  const bin = join(state, "codex.mjs");
  writeFileSync(bin, `#!${process.execPath}
import { appendFileSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
const S = ${JSON.stringify(state)};
const script = ${JSON.stringify(script)};
const argv = process.argv.slice(2);
const counter = (key) => { const f = S + "/" + key; const n = existsSync(f) ? Number(readFileSync(f, "utf8")) + 1 : 1; writeFileSync(f, String(n)); return n; };
if (argv[0] === "debug") { console.log(JSON.stringify({ models: [${JSON.stringify(SOL)}] })); process.exit(0); }
if (argv[0] === "exec") {
  for await (const _ of process.stdin) {}
  appendFileSync(S + "/execs", "x\\n");
  for (const e of [{ type: "thread.started", thread_id: "exec" }, { type: "turn.started" }, { type: "item.completed", item: { id: "i", type: "agent_message", text: JSON.stringify({ choice: "b", reason: "exec mode" }) } }, { type: "turn.completed", usage: { input_tokens: 9, cached_input_tokens: 0, output_tokens: 1, reasoning_output_tokens: 0 } }]) console.log(JSON.stringify(e));
  process.exit(0);
}
if (argv[0] !== "app-server") process.exit(2);
const { createInterface } = await import("node:readline");
const send = (m) => process.stdout.write(JSON.stringify(m) + "\\n");
let current = null;
const threads = {};
for await (const line of createInterface({ input: process.stdin })) {
  const msg = JSON.parse(line);
  if (msg.method && msg.id === undefined) continue;
  appendFileSync(S + "/requests.jsonl", JSON.stringify({ pid: process.pid, method: msg.method, params: msg.params ?? {} }) + "\\n");
  const p = msg.params ?? {};
  if (msg.method === "initialize") send({ id: msg.id, result: { userAgent: "fake" } });
  else if (msg.method === "account/rateLimits/read") send({ id: msg.id, result: { ordinaryUsageAllowed: true, rateLimits: { limitId: "codex", primary: { usedPercent: 1, windowDurationMins: 10080, resetsAt: 1791623197 }, credits: { hasCredits: true, unlimited: false, balance: "500" }, planType: "prolite" } } });
  else if (msg.method === "thread/list") send({ id: msg.id, result: { data: script.stale ?? [] } });
  else if (msg.method === "thread/start") {
    const id = "thr-" + counter("threads");
    const path = S + "/sessions/rollout-x-" + id + ".jsonl";
    (await import("node:fs")).mkdirSync(S + "/sessions", { recursive: true });
    writeFileSync(path, "{}\\n");
    threads[id] = path;
    send({ id: msg.id, result: { thread: { id, path, cwd: p.cwd }, instructionSources: script.instructionSources ?? [] } });
  } else if (msg.method === "thread/read") send({ id: msg.id, result: { thread: { id: p.threadId, path: threads[p.threadId] ?? null } } });
  else if (msg.method === "thread/delete") { if (threads[p.threadId]) rmSync(threads[p.threadId], { force: true }); send({ id: msg.id, result: {} }); }
  else if (msg.method === "thread/revert") send(script.revertFails ? { id: msg.id, error: { code: -32600, message: "revert failed" } } : { id: msg.id, result: { thread: { id: p.threadId } } });
  else if (msg.method === "turn/interrupt") { send({ id: msg.id, result: {} }); send({ method: "turn/completed", params: { threadId: p.threadId, turn: { id: p.turnId, status: "interrupted", error: null } } }); current = null; }
  else if (msg.method === "turn/start") {
    const n = counter("turns");
    const turnId = "turn-" + n;
    send({ id: msg.id, result: { turn: { id: turnId, status: "inProgress" } } });
    const events = script.turns[Math.min(n, script.turns.length) - 1] ?? [];
    current = turnId;
    (async () => {
      for (const e of events) {
        if (current !== turnId) return;
        if (e.__sleep) { await new Promise((ok) => setTimeout(ok, e.__sleep)); continue; }
        if (e.__die) process.exit(9);
        send(JSON.parse(JSON.stringify(e).replaceAll("$TURN", turnId).replaceAll("$THREAD", p.threadId)));
      }
    })();
  } else send({ id: msg.id, error: { code: -32601, message: "unknown " + msg.method } });
}
process.exit(0);
`);
  chmodSync(bin, 0o755);
  const requests = (): Req[] => (existsSync(join(state, "requests.jsonl")) ? readFileSync(join(state, "requests.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Req) : []);
  // The usage guard's reads run their own app-server: those processes are left out.
  const all = requests;
  const requestsOfSession = (): Req[] => {
    const rows = all();
    const usagePids = new Set(rows.filter((r) => r.method === "account/rateLimits/read").map((r) => r.pid));
    return rows.filter((r) => !usagePids.has(r.pid));
  };
  const execs = (): number => (existsSync(join(state, "execs")) ? readFileSync(join(state, "execs"), "utf8").split("\n").filter(Boolean).length : 0);
  return { bin, requests: requestsOfSession, execs, state };
}

/** A turn that answers `answer`: a delta, the agent message, the usage, the pushed rate limits, the end. */
function answering(answer: unknown, usedPct = 2, cached = 150_000): Event[] {
  return [
    { method: "turn/started", params: { threadId: "$THREAD", turn: { id: "$TURN" } } },
    { method: "item/agentMessage/delta", params: { threadId: "$THREAD", turnId: "$TURN", itemId: "m", delta: "{" } },
    { method: "item/completed", params: { threadId: "$THREAD", turnId: "$TURN", item: { type: "reasoning", id: "r", summary: ["**Weighing**"], content: [] } } },
    { method: "item/completed", params: { threadId: "$THREAD", turnId: "$TURN", item: { type: "agentMessage", id: "m", text: JSON.stringify(answer) } } },
    { method: "thread/tokenUsage/updated", params: { threadId: "$THREAD", turnId: "$TURN", tokenUsage: { last: { inputTokens: 160_000, cachedInputTokens: cached, cacheWriteInputTokens: 0, outputTokens: 300, reasoningOutputTokens: 100 }, total: {} } } },
    { method: "account/rateLimits/updated", params: { rateLimits: { limitId: "codex", primary: { usedPercent: usedPct, windowDurationMins: 10080, resetsAt: 1791623197 } } } },
    { method: "turn/completed", params: { threadId: "$THREAD", turn: { id: "$TURN", status: "completed", error: null } } },
  ];
}

const options = { a: JSON.stringify({ option: "heal" }), b: JSON.stringify({ option: "smith" }) };
function request(extra: Partial<BrainRequest> = {}): BrainRequest {
  return { label: "rest/plan", system: "SYSTEM PROMPT v1", memory: { act: "第1幕" }, question: "Heal or smith?", options, payload: { hp: 20 }, spec: pickSpec("rest/plan", options, {}), ...extra };
}

const engines: CodexEngine[] = [];
afterEach(async () => {
  for (const e of engines.splice(0)) await e.close();
});

function sessionEngine(fake: { bin: string; state: string }, opts: { env?: Record<string, string>; config?: string | null; agents?: string } = {}): { engine: CodexEngine; trace: () => Array<Record<string, any>>; notes: string[]; stateDir: string } {
  const home = join(fake.state, "home");
  mkdirSync(home, { recursive: true });
  writeFileSync(join(home, "auth.json"), "{}");
  if (opts.config !== null) writeFileSync(join(home, "config.toml"), opts.config ?? 'model = "gpt-6.1-sol"\nmodel_reasoning_effort = "xhigh"\n[tui]\nscreen_reader_detection_done = true\n');
  if (opts.agents) writeFileSync(join(home, "AGENTS.md"), opts.agents);
  const cfg = loadConfig({ BRAIN_CODEX_BIN: fake.bin, BRAIN_CODEX_HOME: home, BRAIN_LOG: "off", BRAIN_CODEX_MODE: "session", ...(opts.env ?? {}) } as unknown as NodeJS.ProcessEnv);
  const traceFile = join(fake.state, "codex-calls.jsonl");
  const notes: string[] = [];
  const stateDir = join(fake.state, "codex-state");
  const engine = new CodexEngine({ settings: cfg.brain.engines.codex, codex: cfg.brain.codex, stateDir, traceFile, note: (m) => notes.push(m), sessionTimeouts: { control: 3_000, turn: 5_000, thread: 5_000, start: 10_000 } });
  engines.push(engine);
  const trace = (): Array<Record<string, any>> => (existsSync(traceFile) ? readFileSync(traceFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : []);
  return { engine, trace, notes, stateDir };
}

describe("codex session mode", () => {
  it("one server, one thread with our system prompt; each question a turn with the strict schema, reverted after it", async () => {
    const fake = fakeSession("basic", { turns: [answering({ choice: "b", reason: "smith", route: null, cards: null }), answering({ choice: "a", reason: "heal" }, 3)] });
    const { engine, trace } = sessionEngine(fake);
    const first = await engine.decide(request({ runId: "RUN1" }));
    const second = await engine.decide(request({ question: "Heal or smith, again?" }));
    expect(first).toMatchObject({ engine: "codex", model: "gpt-6.1-sol", effort: "xhigh", answer: { choice: "b", reason: "smith" }, usage: { inputTokens: 160_000, cacheHitTokens: 150_000, outputTokens: 300, reasoningTokens: 100 }, reasoning: "**Weighing**", native: { mode: "session", turn_id: "turn-1", reverted: true } });
    expect(first.answer).not.toHaveProperty("route");
    expect(second.answer).toEqual({ choice: "a", reason: "heal" });
    const reqs = fake.requests();
    const servers = new Set(reqs.map((r) => r.pid));
    expect(servers.size).toBe(1);
    expect(reqs.map((r) => r.method)).toEqual(["initialize", "thread/list", "thread/start", "turn/start", "thread/revert", "turn/start", "thread/revert"]);
    const start = reqs.find((r) => r.method === "thread/start")!.params;
    expect(start).toMatchObject({ model: "gpt-6.1-sol", approvalPolicy: "never", sandbox: "read-only", baseInstructions: "SYSTEM PROMPT v1", ephemeral: false, threadSource: "jev-brain" });
    expect(start["cwd"].startsWith(sessionCwdRoot(join(fake.state, "codex-state")))).toBe(true);
    const turns = reqs.filter((r) => r.method === "turn/start").map((r) => r.params);
    expect(turns[0]).toMatchObject({ threadId: "thr-1", effort: "xhigh", summary: "auto", model: "gpt-6.1-sol", outputSchema: codexSchema(stableSchema(pickSpec("rest/plan", options, {})), { routeReason: "drop", maxFieldChars: 600 }) });
    expect(JSON.parse(turns[0]!["input"][0].text)).toEqual({ memory: { act: "第1幕" }, state: { hp: 20 }, question: "Heal or smith?", options });
    expect(turns[1]!["threadId"]).toBe("thr-1");
    expect(reqs.filter((r) => r.method === "thread/revert").map((r) => r.params)).toEqual([{ threadId: "thr-1", beforeTurnId: "turn-1" }, { threadId: "thr-1", beforeTurnId: "turn-2" }]);
    // The trace: one row per turn, no prompt or answer text.
    expect(trace().map((row) => [row["mode"], row["outcome"], row["turn_id"], row["reverted"], row["deltas"]])).toEqual([["session", "answered", "turn-1", true, 1], ["session", "answered", "turn-2", true, 1]]);
    expect(trace()[0]).toMatchObject({ run_id: "RUN1", thread_id: "thr-1", usage: { cachedInputTokens: 150_000 }, ttft_ms: expect.any(Number) });
    expect(JSON.stringify(trace())).not.toContain("SYSTEM PROMPT");
    expect(JSON.stringify(trace())).not.toContain("Heal or smith");
    // The pushed rate limits reach the usage guard (their verdict applies); its own reads are unchanged.
    expect(engine.usage.pushes).toBe(2);
    expect(engine.usage.last?.windows[0]).toMatchObject({ usedPct: 3 });
    expect(engine.usage.status().calls_since_read).toBe(2);
  }, 30_000);

  it("a new thread (the old one deleted) when the system prompt changes or a turn fails", async () => {
    const failed = [{ method: "turn/completed", params: { threadId: "$THREAD", turn: { id: "$TURN", status: "failed", error: { message: "something broke", codexErrorInfo: "badRequest" } } } }];
    const fake = fakeSession("renew", { turns: [answering({ choice: "a", reason: "x" }), answering({ choice: "a", reason: "y" }), failed, answering({ choice: "b", reason: "z" })] });
    const { engine } = sessionEngine(fake);
    await engine.decide(request());
    await engine.decide(request({ system: "SYSTEM PROMPT v2" }));
    await expect(engine.decide(request({ system: "SYSTEM PROMPT v2" }))).rejects.toThrow(/codex session turn failed \[error\]: something broke/);
    await engine.decide(request({ system: "SYSTEM PROMPT v2" }));
    const reqs = fake.requests().filter((r) => ["thread/start", "thread/delete", "turn/start"].includes(r.method)).map((r) => `${r.method} ${r.params["threadId"] ?? r.params["baseInstructions"]}`);
    expect(reqs).toEqual(["thread/start SYSTEM PROMPT v1", "turn/start thr-1", "thread/delete thr-1", "thread/start SYSTEM PROMPT v2", "turn/start thr-2", "turn/start thr-2", "thread/delete thr-2", "thread/start SYSTEM PROMPT v2", "turn/start thr-3"]);
    expect(existsSync(join(fake.state, "sessions", "rollout-x-thr-1.jsonl"))).toBe(false);
  }, 30_000);

  it("config.toml with anything but model / effort / [tui] (or an instruction source) turns session mode off: exec mode answers", async () => {
    const bad = fakeSession("badconfig", { turns: [answering({ choice: "a", reason: "session" })] });
    const { engine, notes } = sessionEngine(bad, { config: 'model = "gpt-6.1-sol"\n[mcp_servers.repl]\ncommand = "/bin/repl"\n' });
    const answer = await engine.decide(request());
    expect(answer).toMatchObject({ answer: { choice: "b", reason: "exec mode" }, native: { mode: "exec" } });
    expect(bad.execs()).toBe(1);
    expect(bad.requests().some((r) => r.method === "thread/start" || r.method === "turn/start")).toBe(false);
    expect(notes).toEqual([expect.stringMatching(/codex session mode is off for the rest of this process \(session mode isolation: config\.toml: \[mcp_servers\.repl\]/)]);
    expect(engine.mode).toBe("exec");
    await engine.decide(request());
    expect(bad.execs()).toBe(2);
    const sources = fakeSession("sources", { turns: [answering({ choice: "a", reason: "session" })], instructionSources: ["/home/x/.codex/AGENTS.md"] });
    const { engine: e2, notes: n2 } = sessionEngine(sources);
    await expect(e2.decide(request())).resolves.toMatchObject({ native: { mode: "exec" } });
    expect(n2[0]).toMatch(/the thread loaded instruction sources \(\/home\/x\/\.codex\/AGENTS\.md\)/);
    expect(sources.requests().filter((r) => r.method === "thread/delete")).toHaveLength(1);
  }, 30_000);

  it("a stalled turn (silent after its first token) is interrupted, reverted and asked once more", async () => {
    const stalled = [{ method: "item/agentMessage/delta", params: { threadId: "$THREAD", turnId: "$TURN", itemId: "m", delta: "{" } }, { __sleep: 20_000 }];
    const fake = fakeSession("stall", { turns: [stalled, answering({ choice: "a", reason: "second" })] });
    const { engine, trace } = sessionEngine(fake, { env: { BRAIN_CODEX_STALL_MS: "1000" } });
    const answer = await engine.decide(request());
    expect(answer).toMatchObject({ answer: { choice: "a", reason: "second" }, native: { runs: 2 } });
    const methods = fake.requests().filter((r) => r.method !== "thread/read").map((r) => r.method);
    expect(methods).toEqual(["initialize", "thread/list", "thread/start", "turn/start", "turn/interrupt", "thread/revert", "thread/delete", "thread/start", "turn/start", "thread/revert"]);
    expect(trace().map((row) => row["outcome"])).toEqual(["stalled", "answered"]);
    expect(trace()[0]!["stall"]).toMatch(/^no notification for 1 s after the first token at 0 s$/);
  }, 30_000);

  it("a runaway answer (past BRAIN_CODEX_MAX_ANSWER_CHARS) is interrupted, reverted and asked once more", async () => {
    const delta = { method: "item/agentMessage/delta", params: { threadId: "$THREAD", turnId: "$TURN", itemId: "m", delta: "保留。稳。好。佳。" } };
    const runaway: Event[] = [{ method: "item/agentMessage/delta", params: { threadId: "$THREAD", turnId: "$TURN", itemId: "m", delta: '{"choice":"a","reason":"' } }];
    for (let i = 0; i < 40; i += 1) runaway.push(delta, { __sleep: 5 });
    runaway.push({ __sleep: 20_000 });
    const fake = fakeSession("runaway", { turns: [runaway, answering({ choice: "a", reason: "short" })] });
    const { engine, trace } = sessionEngine(fake, { env: { BRAIN_CODEX_MAX_ANSWER_CHARS: "200" } });
    const answer = await engine.decide(request({ questionId: "Q7" }));
    expect(answer).toMatchObject({ answer: { reason: "short" }, native: { runs: 2 } });
    expect(trace()[0]).toMatchObject({ outcome: "stalled", stall: "the answer ran past 200 characters (runaway)" });
    expect(trace()[0]!["answer_chars"]).toBeGreaterThan(200);
    expect(fake.requests().map((r) => r.method)).toContain("turn/interrupt");
    // The cut answer is kept whole on its trace row (the evidence of which field ran away); the answered run's is not.
    const cut = trace()[0]!["answer_text"] as string;
    expect(cut.startsWith('{"choice":"a","reason":"保留。稳。好。佳。保留。')).toBe(true);
    expect(cut.length).toBe(trace()[0]!["answer_chars"]);
    expect(trace()[1]).not.toHaveProperty("answer_text");
    // Both turns name the question; the answer's latency is exactly the two turns.
    expect(trace().map((row) => row["question_id"])).toEqual(["Q7", "Q7"]);
    expect(answer.latencyMs).toBe(trace()[0]!["ms"] + trace()[1]!["ms"]);
    expect(trace().map((row) => row["call_ms"])).toEqual([trace()[0]!["ms"], answer.latencyMs]);
    // The prompt never reaches the trace.
    expect(JSON.stringify(trace())).not.toContain("SYSTEM PROMPT");
    expect(JSON.stringify(trace())).not.toContain("Heal or smith?");
  }, 30_000);

  it("a whitespace runaway (BRAIN_CODEX_MAX_ANSWER_BLANKS in a row between JSON tokens) is cut at once, long before the length cap; a padded answer is not", async () => {
    // The runaway of 2026-10-03 (L3G50U6KX5ST F31 reward/card, replayed): a complete reason, then spaces and newlines without end.
    const blank = { method: "item/agentMessage/delta", params: { threadId: "$THREAD", turnId: "$TURN", itemId: "m", delta: "            \n" } };
    const runaway: Event[] = [{ method: "item/agentMessage/delta", params: { threadId: "$THREAD", turnId: "$TURN", itemId: "m", delta: '{"choice":"card2","reason":"Rage supplies free defense \\"while\\" attacking."' } }];
    for (let i = 0; i < 200; i += 1) runaway.push(blank, { __sleep: 2 });
    runaway.push({ __sleep: 20_000 });
    // An answer with a little padding (the answered turns padded at most 9), spaces inside its strings, an escaped quote.
    const padded: Event[] = [
      { method: "item/agentMessage/delta", params: { threadId: "$THREAD", turnId: "$TURN", itemId: "m", delta: '{"choice":"a",  "reason":"       heal \\"   now\\"        "  \t ,"route":null' } },
      ...answering({ choice: "a", reason: "heal" }).slice(2),
    ];
    const fake = fakeSession("blanks", { turns: [runaway, padded] });
    const { engine, trace } = sessionEngine(fake);
    const answer = await engine.decide(request());
    expect(answer).toMatchObject({ answer: { choice: "a", reason: "heal" }, native: { runs: 2 } });
    const [cut, ok] = trace();
    expect(cut).toMatchObject({ outcome: "stalled", stall: expect.stringMatching(/^the answer ran 1\d\d whitespace characters between its JSON tokens \(runaway\)$/) });
    // Cut within the first ~10 blank deltas (13 characters each), not at the 2000-character cap.
    expect(cut!["answer_chars"]).toBeLessThan(500);
    expect(cut!["max_blank_run"]).toBeGreaterThanOrEqual(100);
    expect((cut!["answer_text"] as string).startsWith('{"choice":"card2","reason":"Rage supplies free defense')).toBe(true);
    expect(ok).toMatchObject({ outcome: "answered", max_blank_run: 4 });
  }, 30_000);

  it("BlankRun counts whitespace between JSON tokens only: not inside strings (escaped quotes included), across deltas", () => {
    const run = new BlankRun();
    expect(run.feed('{"reason":"a    b')).toBe(0);
    expect(run.feed('  \\"   c"')).toBe(0);
    expect(run.feed("   ")).toBe(3);
    expect(run.feed("\n\t ,")).toBe(6);
    expect(run.feed('"x":"\\\\"  ')).toBe(6);
    expect(run.feed("\n".repeat(7))).toBe(9);
    expect(new BlankRun().feed('{"a":"     ","b":null}')).toBe(0);
  });

  it("BRAIN_CODEX_MAX_ANSWER_BLANKS: 100 by default, off, or a number of at least 20", () => {
    const codex = (env: Record<string, string>) => loadConfig(env as unknown as NodeJS.ProcessEnv).brain.codex;
    expect(codex({}).maxAnswerBlanks).toBe(100);
    expect(codex({ BRAIN_CODEX_MAX_ANSWER_BLANKS: "off" }).maxAnswerBlanks).toBeNull();
    expect(codex({ BRAIN_CODEX_MAX_ANSWER_BLANKS: "250" }).maxAnswerBlanks).toBe(250);
    expect(() => codex({ BRAIN_CODEX_MAX_ANSWER_BLANKS: "5" })).toThrow(/BRAIN_CODEX_MAX_ANSWER_BLANKS/);
  });

  it("the answer text a turn keeps is capped (ANSWER_TEXT_KEEP), however long the runaway streamed before the interrupt landed", async () => {
    const long = { method: "item/agentMessage/delta", params: { threadId: "$THREAD", turnId: "$TURN", itemId: "m", delta: "x".repeat(5_000) } };
    const fake = fakeSession("runaway-cap", { turns: [[long, long, long, { __sleep: 20_000 }], answering({ choice: "a", reason: "short" })] });
    const { engine, trace } = sessionEngine(fake, { env: { BRAIN_CODEX_MAX_ANSWER_CHARS: "200" } });
    await engine.decide(request());
    expect((trace()[0]!["answer_text"] as string).length).toBe(ANSWER_TEXT_KEEP);
  }, 30_000);

  it("a server that dies is restarted once; when it dies again, exec mode answers for the rest of the process", async () => {
    const fake = fakeSession("die", { turns: [[{ __die: true }], [{ __die: true }]] });
    const { engine, notes, trace } = sessionEngine(fake);
    const answer = await engine.decide(request());
    expect(answer).toMatchObject({ answer: { choice: "b", reason: "exec mode" }, native: { mode: "exec" } });
    const servers = new Set(fake.requests().filter((r) => r.method === "initialize").map((r) => r.pid));
    expect(servers.size).toBe(2);
    expect(notes).toEqual([expect.stringMatching(/session mode is off .*after a restart: codex app-server it exited 9/)]);
    expect(trace().map((row) => [row["mode"], row["outcome"]])).toEqual([["session", "error"], ["session", "error"], ["exec", "answered"]]);
    expect(engine.mode).toBe("exec");
  }, 30_000);

  it("a broken backend stream restarts the session once (and the question is asked again there)", async () => {
    const broken = [{ method: "turn/completed", params: { threadId: "$THREAD", turn: { id: "$TURN", status: "failed", error: { message: "stream disconnected before completion", codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: null } } } } } }];
    const fake = fakeSession("broken", { turns: [broken, answering({ choice: "a", reason: "after restart" })] });
    const { engine } = sessionEngine(fake);
    await expect(engine.decide(request())).resolves.toMatchObject({ answer: { reason: "after restart" }, native: { mode: "session" } });
    expect(new Set(fake.requests().filter((r) => r.method === "initialize").map((r) => r.pid)).size).toBe(2);
    expect(fake.execs()).toBe(0);
  }, 30_000);

  it("a used-up plan in a turn rests codex for the process (as exec mode)", () => {
    const quota = sessionFailure({ status: "failed", turnId: "t", threadId: "x", text: "", reasoning: [], usage: null, error: { message: "You've hit your usage limit.", info: "usageLimitExceeded" }, retries: [], errors: [], firstDeltaMs: null, deltas: 0, maxGapMs: 0, ms: 1, events: [], reverted: true });
    expect(quota).toMatchObject({ transport: false, error: { kind: "quota", cooldownMs: Number.POSITIVE_INFINITY } });
    const overflow = sessionFailure({ status: "failed", turnId: "t", threadId: "x", text: "", reasoning: [], usage: null, error: { message: "input too long", info: "contextWindowExceeded" }, retries: [], errors: [], firstDeltaMs: null, deltas: 0, maxGapMs: 0, ms: 1, events: [], reverted: true });
    expect(overflow.error.message).toMatch(/context window exceeded/);
  });

  it("sweeps a dead process's threads (ours only), and deletes its own thread's files at exit", async () => {
    const root = (state: string): string => sessionCwdRoot(join(state, "codex-state"));
    const state = join(dir, "sweep");
    const fake = fakeSession("sweep", {
      turns: [answering({ choice: "a", reason: "x" })],
      stale: [
        { id: "dead-thread", cwd: join(root(state), "999999999-1") },
        { id: "live-thread", cwd: join(root(state), "1-1") },
        { id: "someone-else", cwd: "/home/dw/Projects/notes" },
      ],
    });
    const { engine } = sessionEngine(fake);
    await engine.decide(request());
    const deleted = fake.requests().filter((r) => r.method === "thread/delete").map((r) => r.params["threadId"]);
    expect(deleted).toEqual(["dead-thread"]);
    await new Promise((ok) => setTimeout(ok, 300));
    const file = join(fake.state, "sessions", "rollout-x-thr-1.jsonl");
    expect(existsSync(file)).toBe(true);
    (engine as unknown as { session: { closeSync(): void } }).session.closeSync();
    expect(existsSync(file)).toBe(false);
  }, 30_000);
});

describe("the play process's end", () => {
  it("the server does not keep the process alive; at exit the process removes its thread's files", async () => {
    const fake = fakeSession("exit", { turns: [answering({ choice: "a", reason: "x" })] });
    const home = join(fake.state, "home");
    mkdirSync(home, { recursive: true });
    writeFileSync(join(home, "auth.json"), "{}");
    const script = join(fake.state, "run.mts");
    const src = (rel: string): string => JSON.stringify(join(process.cwd(), rel));
    writeFileSync(script, `
import { CodexEngine } from ${src("src/brain/engines/codex.ts")};
import { pickSpec } from ${src("src/brain/specs.ts")};
import { loadConfig } from ${src("src/config.ts")};
const cfg = loadConfig({ BRAIN_CODEX_BIN: ${JSON.stringify(fake.bin)}, BRAIN_CODEX_HOME: ${JSON.stringify(home)}, BRAIN_LOG: "off", BRAIN_CODEX_MODE: "session", BRAIN_CODEX_USAGE_EVERY_MIN: "1440", BRAIN_CODEX_USAGE_EVERY_CALLS: "1000" });
const engine = new CodexEngine({ settings: cfg.brain.engines.codex, codex: cfg.brain.codex, stateDir: ${JSON.stringify(join(fake.state, "codex-state"))}, traceFile: null });
const options = { a: "{}", b: "{}" };
const answer = await engine.decide({ label: "rest/plan", system: "S", question: "Q", options, payload: {}, spec: pickSpec("rest/plan", options, {}) });
console.log(JSON.stringify(answer.answer));
`);
    const { spawnSync } = await import("node:child_process");
    const began = Date.now();
    const run = spawnSync(process.execPath, ["--import", "tsx", script], { cwd: process.cwd(), encoding: "utf8", timeout: 25_000 });
    expect(run.status).toBe(0);
    expect(Date.now() - began).toBeLessThan(25_000);
    expect(run.stdout).toContain('{"choice":"a","reason":"x"}');
    expect(existsSync(join(fake.state, "sessions", "rollout-x-thr-1.jsonl"))).toBe(false);
  }, 40_000);
});

describe("pushed rate limits", () => {
  it("a pushed window at the stop stops codex before the next due read", async () => {
    const fake = fakeSession("push-stop", { turns: [answering({ choice: "a", reason: "x" }, 85), answering({ choice: "a", reason: "y" })] });
    const { engine } = sessionEngine(fake);
    await engine.decide(request());
    await expect(engine.decide(request())).rejects.toMatchObject({ kind: "quota", cooldownMs: Number.POSITIVE_INFINITY });
    expect(engine.usage.stopped).toMatch(/85% used.*BRAIN_CODEX_USAGE_STOP_PCT=80/);
  }, 30_000);
});

describe("the config.toml guard", () => {
  it("takes model, model_reasoning_effort and [tui]; names anything else by key only", () => {
    expect(configTomlProblems('model = "gpt-6.1-sol"\nmodel_reasoning_effort = "xhigh"\n# a comment\n\n[tui]\nscreen_reader_detection_done = true\n')).toEqual([]);
    expect(configTomlProblems("")).toEqual([]);
    expect(configTomlProblems('instructions = "be French"\n[hooks.state."x"]\ntrusted_hash = "sha256:abc"\n[mcp_servers.repl]\ncommand = "/bin/x"\n[features]\nmemories = true\nfeatures.hooks = true\n')).toEqual(["instructions", 'line 2: a table header session mode does not read', "[mcp_servers.repl]", "[features]", "line 8: not a plain key = value"]);
    expect(configTomlProblems('notify = ["a", "b"]\nprofile = "x"\n')).toEqual(["notify", "profile"]);
    expect(configTomlProblems('model = """\nlong\n"""\n')).toEqual(['model: a value session mode does not read (several lines or not plain)', "line 2: not a plain key = value", "line 3: not a plain key = value"]);
    expect(configTomlProblems("[[profiles]]\nname = 1\n")[0]).toMatch(/table header/);
    expect(configTomlProblems('[tui.theme]\nname = "dark"\n')).toEqual([]);
    expect(JSON.stringify(configTomlProblems('instructions = "SECRET VALUE"\n'))).not.toContain("SECRET");
  });
});
