/**
 * The codex brain's usage guard (src/brain/engines/codex-usage.ts) against a fake `codex app-server` (stdio JSON-RPC:
 * initialize, account/rateLimits/read) and fake readings: the read (arguments, environment, no process left behind,
 * errors, a hang, a server that lingers), the parse of codex-cli 0.160's GetAccountRateLimitsResponse, the stop rules
 * (a window at BRAIN_CODEX_USAGE_STOP_PCT; credits in use), the read cadence, a read that fails (said once, or a stop
 * under BRAIN_CODEX_USAGE_REQUIRED), and the loop's brain around it: refused at start, stopped mid-run through the
 * used-up-plan path (said once, DeepSeek answers), the reading in brain.jsonl and run-config.jsonl. No model is called.
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createBrain } from "../src/brain/brain.js";
import { CodexEngine } from "../src/brain/engines/codex.js";
import { AUTH_REFRESH_EVERY_MS, CODEX_USAGE_DISABLED_FEATURES, CodexUsageGuard, parseRateLimits, readCodexUsage, refreshCodexAuth, usageNote, USAGE_RETRY_MS, type CodexUsage } from "../src/brain/engines/codex-usage.js";
import { codexEnv } from "../src/brain/engines/codex.js";
import { BrainRouter, EngineFailure, errorNotes, type BrainLogRow } from "../src/brain/router.js";
import type { BrainAnswer, BrainEngine, BrainRequest } from "../src/brain/types.js";
import { pickSpec } from "../src/brain/specs.js";
import { loadConfig } from "../src/config.js";
import { DeepSeekClient, type DeepSeekAnswer } from "../src/llm/deepseek.js";
import { runConfigRow } from "../src/telemetry/run-config.js";
import type { JsonValue } from "../src/util/json.js";

const dir = mkdtempSync(join(tmpdir(), "fake-codex-usage-"));

/** codex-cli 0.160's account/rateLimits/read result as read on 2026-10-03 (account id replaced). */
function liveResult(usedPercent = 1, balance: string | null = "500", extra: Record<string, unknown> = {}): Record<string, unknown> {
  const snapshot = {
    limitId: "codex",
    limitName: null,
    normalModelSlug: null,
    primary: { usedPercent, windowDurationMins: 10080, resetsAt: 1791623197 },
    secondary: null,
    credits: { hasCredits: true, unlimited: false, balance },
    individualLimit: null,
    spendControlReached: false,
    planType: "prolite",
    rateLimitReachedType: null,
    ...extra,
  };
  return { ordinaryUsageAllowed: true, rateLimits: snapshot, rateLimitsByLimitId: { codex: snapshot }, rateLimitResetCredits: { availableCount: 2, credits: null }, accountId: "acct-should-not-be-kept", rateLimitUpsell: null };
}

const RESETS = new Date(1791623197 * 1000).toISOString();

interface ServerSeen {
  argv: string[];
  env: Record<string, string>;
  pid: number;
  cwd: string;
  requests: Array<{ method?: string; params?: unknown }>;
}

/**
 * A fake codex: `--version`, `debug models` and `exec` answer one fixed pick; `app-server` speaks the stdio JSON-RPC
 * and answers account/rateLimits/read from a mode file the test rewrites between reads: { result } | { error } |
 * { hang } | { exitEarly } | { linger, result }. Each app-server start is recorded (argv, env, pid, requests).
 */
function fakeCodex(name: string): { bin: string; setMode: (mode: Record<string, unknown>) => void; servers: () => ServerSeen[]; execCalls: () => number } {
  const bin = join(dir, `${name}.mjs`);
  const modeFile = join(dir, `${name}.mode.json`);
  const serverFile = join(dir, `${name}.servers.jsonl`);
  const execFile = join(dir, `${name}.exec.jsonl`);
  // Written by the fake's account/read with refreshToken: codex's token refresh ran (the reads may work after it).
  const refreshedFile = join(dir, `${name}.refreshed`);
  for (const file of [serverFile, execFile, refreshedFile]) rmSync(file, { force: true });
  writeFileSync(modeFile, JSON.stringify({ result: liveResult() }));
  const sol = { slug: "gpt-6.1-sol", supported_reasoning_levels: [{ effort: "xhigh" }] };
  writeFileSync(bin, `#!${process.execPath}
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
const argv = process.argv.slice(2);
if (argv[0] === "--version") { console.log("codex-cli 0.160.0"); process.exit(0); }
if (argv[0] === "debug") { console.log(JSON.stringify({ models: [${JSON.stringify(sol)}] })); process.exit(0); }
if (argv[0] === "app-server") {
  const mode = JSON.parse(readFileSync(${JSON.stringify(modeFile)}, "utf8"));
  const seen = { argv, env: process.env, pid: process.pid, cwd: process.cwd(), requests: [] };
  const record = () => appendFileSync(${JSON.stringify(serverFile)}, JSON.stringify(seen) + "\\n");
  const write = (msg) => process.stdout.write(JSON.stringify(msg) + "\\n");
  for await (const line of createInterface({ input: process.stdin })) {
    const msg = JSON.parse(line);
    seen.requests.push({ method: msg.method, params: msg.params });
    if (msg.method === "initialize") {
      write({ id: msg.id, result: { userAgent: "fake/0.160.0", codexHome: process.env.CODEX_HOME, platformFamily: "unix", platformOs: "linux" } });
      write({ method: "remoteControl/status/changed", params: { status: "disabled" } });
    } else if (msg.method === "account/rateLimits/read") {
      record();
      if (mode.exitEarly) process.exit(3);
      if (mode.hang) { setInterval(() => {}, 1000); continue; }
      write({ method: "account/updated", params: { authMode: "chatgpt", planType: "prolite" } });
      // { error, refreshFixes }: the error until codex's token refresh (account/read refreshToken) has run once.
      const failing = mode.error && !(mode.refreshFixes && existsSync(${JSON.stringify(refreshedFile)}));
      write(failing ? { id: msg.id, error: { code: -32600, message: mode.error } } : { id: msg.id, result: mode.result ?? ${JSON.stringify(liveResult())} });
    } else if (msg.method === "account/read") {
      record();
      if (msg.params && msg.params.refreshToken === true) writeFileSync(${JSON.stringify(refreshedFile)}, "1");
      write(mode.refreshError ? { id: msg.id, error: { code: -32600, message: mode.refreshError } } : { id: msg.id, result: { account: { type: "chatgpt", email: "dai@example.invalid", planType: "promax" }, requiresOpenaiAuth: true } });
    }
  }
  if (mode.linger) setInterval(() => {}, 1000);
  else process.exit(0);
} else {
  let stdin = "";
  for await (const chunk of process.stdin) stdin += chunk;
  appendFileSync(${JSON.stringify(execFile)}, JSON.stringify({ argv }) + "\\n");
  const answer = JSON.stringify({ choice: "b", reason: "codex says smith", route: null, route_reason: null, cards: null, discard: null });
  for (const event of [{ type: "thread.started", thread_id: "t" }, { type: "item.completed", item: { id: "i", type: "agent_message", text: answer } }, { type: "turn.completed", usage: { input_tokens: 155000, cached_input_tokens: 0, output_tokens: 900, reasoning_output_tokens: 700 } }]) process.stdout.write(JSON.stringify(event) + "\\n");
  process.exit(0);
}
`);
  chmodSync(bin, 0o755);
  const lines = (file: string): string[] => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean) : []);
  return {
    bin,
    setMode: (mode) => writeFileSync(modeFile, JSON.stringify(mode)),
    servers: () => lines(serverFile).map((line) => JSON.parse(line) as ServerSeen),
    execCalls: () => lines(execFile).length,
  };
}

function home(name: string): string {
  const path = join(dir, `home-${name}`);
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, "auth.json"), "{}");
  return path;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function reading(overrides: Partial<CodexUsage> = {}, usedPct = 1, balance: number | null = 500): CodexUsage {
  return {
    readAt: "2026-10-03T10:00:00.000Z",
    ms: 900,
    plan: "prolite",
    windows: [{ name: "codex/primary", usedPct, windowMins: 10080, resetsAt: RESETS }],
    credits: { hasCredits: true, unlimited: false, balance },
    ordinaryUsageAllowed: true,
    reachedType: null,
    spendControlReached: false,
    ...overrides,
  };
}

const SETTINGS = { stopPct: 80, everyCalls: 3, everyMin: 10, required: false };

describe("the read", () => {
  it("parses codex 0.160's rate limits: every window, credits, plan; the account id is not kept", () => {
    const usage = parseRateLimits(liveResult(12, "499.5"));
    expect(usage).toEqual({
      plan: "prolite",
      windows: [{ name: "codex/primary", usedPct: 12, windowMins: 10080, resetsAt: "2026-10-10T09:06:37.000Z" }],
      credits: { hasCredits: true, unlimited: false, balance: 499.5 },
      ordinaryUsageAllowed: true,
      reachedType: null,
      spendControlReached: false,
    });
    expect(JSON.stringify(usage)).not.toContain("acct");
    // Another bucket, a secondary window and a spend-control limit are windows too; the same bucket is read once.
    const many = parseRateLimits({
      ...liveResult(5),
      rateLimitsByLimitId: {
        codex: liveResult(5)["rateLimits"],
        codex_sol: { limitId: "codex_sol", primary: { usedPercent: 40, windowDurationMins: 300, resetsAt: null }, secondary: { usedPercent: 61, windowDurationMins: 10080, resetsAt: 1791623197 }, individualLimit: { limit: "100", used: "70", remainingPercent: 30, resetsAt: 1791623197 }, rateLimitReachedType: "rate_limit_reached" },
      },
    });
    expect(many.windows.map((w) => [w.name, w.usedPct])).toEqual([["codex/primary", 5], ["codex_sol/primary", 40], ["codex_sol/secondary", 61], ["codex_sol/individual", 70]]);
    expect(many.reachedType).toBe("rate_limit_reached");
    expect(parseRateLimits({ ...liveResult(), ordinaryUsageAllowed: null, rateLimits: { ...(liveResult()["rateLimits"] as object), credits: { hasCredits: false, unlimited: false, balance: null } } }))
      .toMatchObject({ ordinaryUsageAllowed: null, credits: { hasCredits: false, balance: null } });
    expect(() => parseRateLimits({ rateLimits: null, rateLimitsByLimitId: null })).toThrow(/no rate-limit snapshot/);
    expect(() => parseRateLimits("nope")).toThrow(/no object/);
  });

  it("asks a short-lived app-server on stdio, with codex's home and no key, no daemon, and leaves no process behind", async () => {
    const fake = fakeCodex("read");
    const codexHome = home("read");
    const secretEnv = { DEEPSEEK_API_KEY: "sk-secret", OPENAI_API_KEY: "sk-openai", CODEX_API_KEY: "ck" };
    const saved = { ...process.env };
    Object.assign(process.env, secretEnv);
    let usage: CodexUsage;
    try {
      usage = await readCodexUsage({ bin: fake.bin, home: codexHome, env: codexEnv(fake.bin, codexHome), stateDir: join(dir, "state-read") });
    } finally {
      for (const key of Object.keys(secretEnv)) delete process.env[key];
      Object.assign(process.env, saved);
    }
    expect(usage).toMatchObject({ plan: "prolite", windows: [{ name: "codex/primary", usedPct: 1, windowMins: 10080, resetsAt: RESETS }], credits: { balance: 500 } });
    expect(usage.ms).toBeGreaterThanOrEqual(0);
    const [server] = fake.servers();
    expect(server!.argv.slice(0, 3)).toEqual(["app-server", "--listen", "stdio://"]);
    const disabled = server!.argv.flatMap((arg, i) => (server!.argv[i - 1] === "--disable" ? [arg] : []));
    expect(disabled).toEqual([...CODEX_USAGE_DISABLED_FEATURES]);
    expect(disabled).toContain("daemon_auto_start");
    const settings = server!.argv.flatMap((arg, i) => (server!.argv[i - 1] === "-c" ? [arg] : []));
    expect(settings).toEqual(expect.arrayContaining([`sqlite_home=${JSON.stringify(join(dir, "state-read"))}`, "analytics.enabled=false", "check_for_update_on_startup=false"]));
    expect(server!.cwd).toBe(join(dir, "state-read"));
    expect(server!.requests.map((r) => r.method)).toEqual(["initialize", "initialized", "account/rateLimits/read"]);
    expect(server!.requests[2]!.params).toEqual({ excludeResetCreditDetails: true });
    // Never the reset-credit consume, never Luna Reserve.
    expect(JSON.stringify(server!.requests)).not.toMatch(/consume|supportsLunaReserve/);
    expect(server!.env["CODEX_HOME"]).toBe(codexHome);
    for (const key of Object.keys(secretEnv)) expect(Object.keys(server!.env)).not.toContain(key);
    expect(alive(server!.pid)).toBe(false);
  });

  it("fails on codex's error, a server that ends without answering, a hang (killed at the timeout) and a missing program", async () => {
    const fake = fakeCodex("read-fail");
    const opts = { bin: fake.bin, home: home("read-fail"), env: codexEnv(fake.bin, home("read-fail")), stateDir: join(dir, "state-fail") };
    fake.setMode({ error: "chatgpt authentication required to read rate limits" });
    await expect(readCodexUsage(opts)).rejects.toThrow("account/rateLimits/read failed: chatgpt authentication required to read rate limits");
    fake.setMode({ exitEarly: true });
    await expect(readCodexUsage(opts)).rejects.toThrow(/ended before answering/);
    fake.setMode({ hang: true });
    const began = Date.now();
    await expect(readCodexUsage({ ...opts, timeoutMs: 1_000 })).rejects.toThrow("no answer within 1000 ms");
    expect(Date.now() - began).toBeLessThan(5_000);
    const hung = fake.servers().at(-1)!;
    expect(alive(hung.pid)).toBe(false);
    fake.setMode({ result: { rateLimits: null } });
    await expect(readCodexUsage(opts)).rejects.toThrow(/no rate-limit snapshot/);
    await expect(readCodexUsage({ ...opts, bin: join(dir, "no-such-codex") })).rejects.toThrow(/could not start/);
  });

  it("a server that stays up after its answer is killed after the grace; the answer stands", async () => {
    const fake = fakeCodex("read-linger");
    fake.setMode({ linger: true, result: liveResult(7) });
    const usage = await readCodexUsage({ bin: fake.bin, home: home("linger"), env: codexEnv(fake.bin, home("linger")), stateDir: join(dir, "state-linger"), exitGraceMs: 300 });
    expect(usage.windows[0]!.usedPct).toBe(7);
    expect(alive(fake.servers()[0]!.pid)).toBe(false);
  });
});

describe("the guard", () => {
  it("stops at BRAIN_CODEX_USAGE_STOP_PCT on any window, and on any sign of credits in use", () => {
    const guard = new CodexUsageGuard(SETTINGS, async () => reading());
    expect(guard.verdict(reading({}, 79))).toBeNull();
    expect(guard.verdict(reading({}, 80))).toBe(`codex/primary 7-day window 80% used, resets ${RESETS} (BRAIN_CODEX_USAGE_STOP_PCT=80)`);
    const second = reading({ windows: [{ name: "codex/primary", usedPct: 3, windowMins: 10080, resetsAt: RESETS }, { name: "codex/secondary", usedPct: 85, windowMins: 300, resetsAt: null }] });
    expect(guard.verdict(second)).toBe("codex/secondary 300-minute window 85% used (BRAIN_CODEX_USAGE_STOP_PCT=80)");
    expect(guard.verdict(reading({ ordinaryUsageAllowed: false }))).toMatch(/ordinaryUsageAllowed false.*credits/);
    expect(guard.verdict(reading({ ordinaryUsageAllowed: null }))).toBeNull();
    expect(guard.verdict(reading({ reachedType: "rate_limit_reached" }))).toMatch(/rate_limit_reached.*credits/);
    expect(guard.verdict(reading({ spendControlReached: true }))).toMatch(/spend control/);
    const at100 = new CodexUsageGuard({ ...SETTINGS, stopPct: 100 }, async () => reading());
    expect(at100.verdict(reading({}, 99))).toBeNull();
    expect(at100.verdict(reading({}, 100))).toMatch(/100% used.*would draw on credits/);
  });

  it("reads at start, then before every EVERY_CALLS-th call or after EVERY_MIN minutes; a falling credit balance stops it", async () => {
    let clock = 0;
    const readings = [reading({}, 1, 500), reading({}, 2, 500), reading({}, 3, 600), reading({}, 4, 599.9)];
    let reads = 0;
    const guard = new CodexUsageGuard(SETTINGS, async () => readings[Math.min(reads++, readings.length - 1)]!, { now: () => clock });
    await expect(guard.start()).resolves.toBeNull();
    expect(reads).toBe(1);
    for (let i = 0; i < 3; i += 1) {
      await guard.beforeCall();
      guard.noteCall();
    }
    expect(reads).toBe(1);
    await guard.beforeCall(); // three calls since the read
    expect(reads).toBe(2);
    guard.noteCall();
    clock += 10 * 60_000; // ten minutes since the read
    await guard.beforeCall();
    expect(reads).toBe(3);
    expect(guard.note()).toMatchObject({ engine: "codex", used_pct: 3, window: "codex/primary", window_min: 10080, resets_at: RESETS, credits: 600 });
    clock += 10 * 60_000;
    // 600 (bought more) then 599.9: spent, below the highest balance seen.
    const error = await guard.beforeCall().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EngineFailure);
    expect((error as EngineFailure).kind).toBe("quota");
    expect((error as EngineFailure).cooldownMs).toBe(Number.POSITIVE_INFINITY);
    expect((error as EngineFailure).message).toBe("codex usage guard: credits are being spent: the balance fell from 600 to 599.9 in this process [quota]");
    // Stopped for good: no more reads.
    clock += 60 * 60_000;
    await expect(guard.beforeCall()).rejects.toThrow(/credits are being spent/);
    expect(reads).toBe(4);
    expect(guard.status()).toMatchObject({ stop_pct: 80, every_calls: 3, every_min: 10, required: false, start: { used_pct: 1, credits: 500 }, last: { used_pct: 4, credits: 599.9 }, stopped: expect.stringContaining("credits are being spent") });
  });

  it("a start reading at the stop refuses codex at start", async () => {
    const guard = new CodexUsageGuard(SETTINGS, async () => reading({}, 92));
    await expect(guard.start()).resolves.toMatch(/^codex usage guard: codex\/primary 7-day window 92% used/);
    await expect(guard.beforeCall()).rejects.toThrow(/92% used.*\[quota\]/);
  });

  it("a read that fails is said once and codex stays on; BRAIN_CODEX_USAGE_REQUIRED=on stops it instead", async () => {
    const notes: string[] = [];
    let clock = 0;
    let fail = true;
    const read = async (): Promise<CodexUsage> => {
      if (fail) throw new Error("no answer within 20000 ms");
      return reading({}, 85);
    };
    const guard = new CodexUsageGuard({ ...SETTINGS, everyCalls: 1 }, read, { now: () => clock, note: (m) => notes.push(m) });
    await expect(guard.start()).resolves.toBeNull();
    guard.noteCall();
    await expect(guard.beforeCall()).resolves.toBeUndefined();
    guard.noteCall();
    await expect(guard.beforeCall()).resolves.toBeUndefined();
    expect(notes).toEqual(["WARNING: codex usage could not be read (no answer within 20000 ms); codex stays on without the usage guard until a read works (BRAIN_CODEX_USAGE_REQUIRED=on keeps it off until then instead)"]);
    expect(guard.status()).toMatchObject({ start: null, last: null, unreadable: "no answer within 20000 ms" });
    expect(guard.note()).toBeNull();
    // A later read that works applies its verdict.
    fail = false;
    guard.noteCall();
    await expect(guard.beforeCall()).rejects.toThrow(/85% used/);
    // BRAIN_CODEX_USAGE_REQUIRED=on: off until a read works (no longer for the rest of the process).
    const required = new CodexUsageGuard({ ...SETTINGS, required: true }, async () => {
      throw new Error("chatgpt authentication required");
    }, { now: () => clock });
    await expect(required.start()).resolves.toBeNull();
    expect(required.blocked).toMatchObject({ failures: 1, nextReadAt: clock + USAGE_RETRY_MS[0] });
    const error = await required.beforeCall().catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: "unavailable", cooldownMs: USAGE_RETRY_MS[0], message: expect.stringMatching(/codex is off until a read works, the next in 30 s \[unavailable\]$/) });
  });

  it("BRAIN_CODEX_USAGE_REQUIRED=on, reads failing: off until one works (30 s, 2 min, 5 min, then every 10 min); each change said once and noted; a working read brings codex back", async () => {
    const notes: string[] = [];
    let clock = 1_000_000;
    let reads = 0;
    let result: CodexUsage | Error = new Error("no answer within 20000 ms");
    const read = async (): Promise<CodexUsage> => {
      reads += 1;
      if (result instanceof Error) throw result;
      return result;
    };
    const guard = new CodexUsageGuard({ ...SETTINGS, required: true }, read, { now: () => clock, note: (m) => notes.push(m) });
    await expect(guard.start()).resolves.toBeNull();
    const first = (await guard.beforeCall().catch((e: unknown) => e)) as EngineFailure;
    expect(first).toMatchObject({ kind: "unavailable", cooldownMs: 30_000 });
    // The change is said once on the console and rides on the question's row (the router reads errorNotes).
    expect(notes).toEqual([expect.stringMatching(/^WARNING: codex usage could not be read \(no answer within 20000 ms\); with BRAIN_CODEX_USAGE_REQUIRED=on codex is off until a read works: its questions go to the fallback, the next read in 30 s/)]);
    expect(errorNotes(first)).toEqual([notes[0]!.replace(/^WARNING: /, "")]);
    // Within the wait no read is made (the router rests codex meanwhile; a call that comes anyway is refused at once).
    clock += 10_000;
    await expect(guard.beforeCall()).rejects.toMatchObject({ cooldownMs: 20_000 });
    expect(reads).toBe(1);
    // Each later failed read waits longer, capped at 10 minutes; said once only, noted once only.
    const waits: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      clock = guard.blocked!.nextReadAt;
      const error = (await guard.beforeCall().catch((e: unknown) => e)) as EngineFailure;
      waits.push(error.cooldownMs);
      expect(errorNotes(error)).toEqual([]);
    }
    expect(waits).toEqual([120_000, 300_000, 600_000, 600_000, 600_000]);
    expect(reads).toBe(6);
    expect(notes).toHaveLength(1);
    expect(guard.status()).toMatchObject({ unreadable: "no answer within 20000 ms", blocked: { failures: 6 } });
    // A read that works and passes the stop rules: codex is back, said once, noted for the next codex row.
    result = reading({}, 3);
    clock = guard.blocked!.nextReadAt;
    await expect(guard.beforeCall()).resolves.toBeUndefined();
    expect(guard.blocked).toBeNull();
    expect(notes[1]).toBe(`codex usage can be read again after 6 failed read(s) (plan prolite, codex/primary 7-day window 3% used, resets ${RESETS}): codex answers again`);
    expect(guard.takeNotes()).toEqual([notes[1]]);
    expect(guard.status()).not.toHaveProperty("blocked");
    // The quota stop rules still stop codex for the process.
    result = reading({}, 82);
    guard.noteCall();
    guard.noteCall();
    guard.noteCall();
    await expect(guard.beforeCall()).rejects.toMatchObject({ kind: "quota", cooldownMs: Number.POSITIVE_INFINITY });
    expect(guard.blocked).toBeNull();
  });

  it("a read refused on the login (401, expired token): codex's token refresh first, then the read at once; at most one refresh per 10 minutes", async () => {
    const notes: string[] = [];
    let clock = 5_000_000;
    let refreshes = 0;
    let fixed = false;
    const expired = "account/rateLimits/read failed: failed to fetch codex rate limits: GET https://chatgpt.com/backend-api/wham/usage failed: 401 Unauthorized; Provided authentication token is expired";
    const read = async (): Promise<CodexUsage> => {
      if (!fixed) throw new Error(expired);
      return reading({ plan: "promax" }, 0);
    };
    const refreshAuth = async (): Promise<void> => {
      refreshes += 1;
    };
    // The refresh works: codex never goes off; the refresh is said once and noted.
    const guard = new CodexUsageGuard({ ...SETTINGS, required: true }, async () => {
      if (refreshes === 0) throw new Error(expired);
      return reading({ plan: "promax" }, 0);
    }, { now: () => clock, note: (m) => notes.push(m), refreshAuth });
    await expect(guard.start()).resolves.toBeNull();
    expect(refreshes).toBe(1);
    expect(guard.blocked).toBeNull();
    expect(notes).toEqual([expect.stringMatching(/^codex usage read was refused on the login \(.*401 Unauthorized.*\); codex refreshed its token \(account\/read\) and the read works$/)]);
    expect(guard.status()).toMatchObject({ auth_refreshes: 1, last: { plan: "promax", used_pct: 0 } });
    // The refresh does not help: off until a read works; no second refresh within 10 minutes, one after.
    refreshes = 0;
    const stuck = new CodexUsageGuard({ ...SETTINGS, required: true }, read, { now: () => clock, refreshAuth });
    await stuck.start();
    expect([refreshes, stuck.blocked?.failures]).toEqual([1, 1]);
    expect(stuck.unreadable).toMatch(/\(read again after codex refreshed its token\)$/);
    clock = stuck.blocked!.nextReadAt;
    await expect(stuck.beforeCall()).rejects.toMatchObject({ kind: "unavailable" });
    expect(refreshes).toBe(1);
    clock += AUTH_REFRESH_EVERY_MS;
    fixed = true;
    await expect(stuck.beforeCall()).resolves.toBeUndefined();
    expect(refreshes).toBe(1);
    // A refresh that fails says so in the reason; a read error that is not about the login asks for no refresh.
    const failing = new CodexUsageGuard({ ...SETTINGS, required: true }, async () => {
      throw new Error(expired);
    }, { now: () => clock, refreshAuth: async () => {
      throw new Error("account/read failed: refresh token was already used");
    } });
    await failing.start();
    expect(failing.unreadable).toMatch(/; codex's token refresh \(account\/read\) failed too: account\/read failed: refresh token was already used$/);
    let asked = 0;
    const other = new CodexUsageGuard({ ...SETTINGS, required: true }, async () => {
      throw new Error("no answer within 20000 ms");
    }, { now: () => clock, refreshAuth: async () => void (asked += 1) });
    await other.start();
    expect(asked).toBe(0);
  });

  it("calls that meet a due read at once share it", async () => {
    let reads = 0;
    const guard = new CodexUsageGuard(SETTINGS, async () => {
      reads += 1;
      await new Promise((ok) => setTimeout(ok, 50));
      return reading();
    });
    await Promise.all([guard.beforeCall(), guard.beforeCall(), guard.beforeCall()]);
    expect(reads).toBe(1);
  });

  it("the defaults and BRAIN_CODEX_USAGE_* settings", () => {
    const codex = (env: Record<string, string>) => loadConfig({ BRAIN_LOG: "off", ...env } as unknown as NodeJS.ProcessEnv).brain.codex.usage;
    expect(codex({})).toEqual({ stopPct: 80, everyCalls: 3, everyMin: 10, required: false });
    expect(codex({ BRAIN_CODEX_USAGE_STOP_PCT: "50", BRAIN_CODEX_USAGE_EVERY_CALLS: "1", BRAIN_CODEX_USAGE_EVERY_MIN: "5", BRAIN_CODEX_USAGE_REQUIRED: "on" })).toEqual({ stopPct: 50, everyCalls: 1, everyMin: 5, required: true });
    expect(() => codex({ BRAIN_CODEX_USAGE_STOP_PCT: "120" })).toThrow(/BRAIN_CODEX_USAGE_STOP_PCT/);
    expect(() => codex({ BRAIN_CODEX_USAGE_EVERY_CALLS: "0" })).toThrow(/BRAIN_CODEX_USAGE_EVERY_CALLS/);
    expect(() => codex({ BRAIN_CODEX_USAGE_REQUIRED: "maybe" })).toThrow(/BRAIN_CODEX_USAGE_REQUIRED/);
    expect(usageNote(reading({}, 12))).toEqual({ engine: "codex", read_at: "2026-10-03T10:00:00.000Z", read_ms: 900, plan: "prolite", used_pct: 12, window: "codex/primary", window_min: 10080, resets_at: RESETS, credits: 500, ordinary_usage_allowed: true, reached_type: null });
  });
});

describe("the loop's brain with BRAIN_ENGINE=codex, BRAIN_FALLBACK=deepseek and the usage guard", () => {
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
  const options = { a: JSON.stringify({ option: "heal" }), b: JSON.stringify({ option: "smith" }) };
  const state: Record<string, JsonValue> = { hp: 20 };
  const ask = (brain: ReturnType<typeof createBrain>) => brain.choose(state, "Heal or smith?", options, { label: "rest/plan" });

  function brainWith(name: string, env: Record<string, string> = {}) {
    const fake = fakeCodex(name);
    const log = join(dir, `${name}-brain.jsonl`);
    rmSync(log, { force: true });
    const cfg = loadConfig({ BRAIN_CODEX_BIN: fake.bin, BRAIN_CODEX_HOME: home(name), BRAIN_ENGINE: "codex", BRAIN_FALLBACK: "deepseek", BRAIN_LOG: log, ...env } as unknown as NodeJS.ProcessEnv);
    const notes: string[] = [];
    const deepseek = new StubDeepSeek();
    const brain = createBrain(cfg, deepseek);
    brain.onNote((message) => notes.push(message));
    const rows = (): BrainLogRow[] => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as BrainLogRow) : []);
    return { fake, cfg, brain, rows, notes, deepseek };
  }

  it("reads at start and answers through codex; each codex row carries the reading, and the run-config row the guard", async () => {
    const { fake, cfg, brain, rows, notes } = brainWith("loop-ok", { BRAIN_CODEX_USAGE_EVERY_CALLS: "2" });
    await expect(brain.preflight()).resolves.toEqual([]);
    expect(fake.servers()).toHaveLength(1);
    for (let i = 0; i < 3; i += 1) await expect(ask(brain)).resolves.toMatchObject({ choice: "b", brain: { engine: "codex" } });
    // Start, then before the third call (two calls since the start read).
    expect(fake.servers()).toHaveLength(2);
    expect(fake.execCalls()).toBe(3);
    expect(notes).toEqual([]);
    expect(rows()).toHaveLength(3);
    for (const row of rows()) expect(row.limits).toMatchObject({ engine: "codex", used_pct: 1, window: "codex/primary", window_min: 10080, resets_at: RESETS, credits: 500, plan: "prolite" });
    expect(brain.codexUsage).not.toBeNull();
    const row = runConfigRow(
      { config: cfg, brain, jevEnabled: false, mode: "play", env: {}, code: { commit: "c", code: "c", dirty: false, dirty_files: [], branch: "v4", worktree: "w" }, processStarted: "2026-10-03T10:00:00.000Z" },
      { runId: "RUNCODEXUSE1", ascension: 9, character: "IRONCLAD", floor: 1 },
      new Date("2026-10-03T10:00:00.000Z"),
    );
    expect(row.codex_usage).toMatchObject({ stop_pct: 80, every_calls: 2, every_min: 10, required: false, start: { used_pct: 1, resets_at: RESETS, credits: 500 }, last: { used_pct: 1 }, calls_since_read: 1 });
    expect(row.codex_usage).not.toHaveProperty("stopped");
    expect(JSON.stringify(row)).not.toContain("acct");
  });

  it("refuses codex at start when a window is at the stop: DeepSeek answers, codex exec never runs", async () => {
    const { fake, brain, rows, deepseek } = brainWith("loop-start-stop");
    fake.setMode({ result: liveResult(85) });
    const problems = await brain.preflight();
    expect(problems).toEqual([`codex is off for this run: codex usage guard: codex/primary 7-day window 85% used, resets ${RESETS} (BRAIN_CODEX_USAGE_STOP_PCT=80); its questions go to deepseek`]);
    expect(brain.warnings).toEqual(problems);
    await expect(ask(brain)).resolves.toMatchObject({ choice: "a", brain: { engine: "deepseek", fell_back_from: { engine: "codex" } } });
    await ask(brain);
    expect(fake.execCalls()).toBe(0);
    expect(fake.servers()).toHaveLength(1);
    expect(deepseek.calls).toBe(2);
    expect(rows().map((row) => [row.engine, row.fell_back_from?.kind, (row.limits as { used_pct?: number } | undefined)?.used_pct])).toEqual([["deepseek", "quota", 85], ["deepseek", "quota", 85]]);
    expect(rows()[0]!.fell_back_from!.error).toMatch(/unavailable for this process: codex usage guard: .*85% used/);
  });

  it("stops codex mid-run when the window reaches the stop: said once, the rest to DeepSeek, no call goes out past it", async () => {
    const { fake, brain, rows, notes, deepseek } = brainWith("loop-mid-stop", { BRAIN_CODEX_USAGE_EVERY_CALLS: "1" });
    await brain.preflight();
    await expect(ask(brain)).resolves.toMatchObject({ choice: "b" });
    fake.setMode({ result: liveResult(80) });
    await expect(ask(brain)).resolves.toMatchObject({ choice: "a", brain: { engine: "deepseek", fell_back_from: { engine: "codex" } } });
    await expect(ask(brain)).resolves.toMatchObject({ choice: "a" });
    expect(fake.execCalls()).toBe(1);
    expect(fake.servers()).toHaveLength(2);
    expect(deepseek.calls).toBe(2);
    expect(notes).toEqual([`WARNING: brain engine codex is off for the rest of this process after quota: codex usage guard: codex/primary 7-day window 80% used, resets ${RESETS} (BRAIN_CODEX_USAGE_STOP_PCT=80) [quota]; its questions go to deepseek`]);
    expect(rows().map((row) => [row.engine, row.fell_back_from?.kind ?? null, (row.limits as { used_pct?: number }).used_pct])).toEqual([["codex", null, 1], ["deepseek", "quota", 80], ["deepseek", "quota", 80]]);
    expect(brain.codexUsage!.status().stopped).toMatch(/80% used/);
  });

  it("stops codex when the credit balance falls (credits spent, by us or by Dai's own use)", async () => {
    const { fake, brain, notes } = brainWith("loop-credits", { BRAIN_CODEX_USAGE_EVERY_CALLS: "1" });
    await brain.preflight();
    await ask(brain);
    fake.setMode({ result: liveResult(3, "487.25") });
    await expect(ask(brain)).resolves.toMatchObject({ choice: "a", brain: { engine: "deepseek" } });
    expect(fake.execCalls()).toBe(1);
    expect(notes).toEqual([expect.stringContaining("codex usage guard: credits are being spent: the balance fell from 500 to 487.25 in this process [quota]")]);
  });

  it("usage that cannot be read: said once, codex stays on; with BRAIN_CODEX_USAGE_REQUIRED=on codex is off for the run", async () => {
    const open = brainWith("loop-unreadable", { BRAIN_CODEX_USAGE_EVERY_CALLS: "1" });
    open.fake.setMode({ error: "chatgpt authentication required to read rate limits" });
    await expect(open.brain.preflight()).resolves.toEqual([]);
    await expect(ask(open.brain)).resolves.toMatchObject({ choice: "b", brain: { engine: "codex" } });
    await expect(ask(open.brain)).resolves.toMatchObject({ choice: "b" });
    expect(open.notes).toEqual([expect.stringMatching(/^WARNING: codex usage could not be read \(account\/rateLimits\/read failed: chatgpt authentication required to read rate limits\); codex stays on/)]);
    expect(open.brain.warnings).toEqual([expect.stringContaining("codex usage could not be read at the start")]);
    expect(open.rows()[0]).not.toHaveProperty("limits");
    // BRAIN_CODEX_USAGE_REQUIRED=on: off until a read works, not for the run (a warning, not a problem); DeepSeek answers.
    const closed = brainWith("loop-required", { BRAIN_CODEX_USAGE_REQUIRED: "on" });
    closed.fake.setMode({ exitEarly: true });
    await expect(closed.brain.preflight()).resolves.toEqual([]);
    expect(closed.brain.warnings).toEqual([expect.stringMatching(/^codex usage could not be read at the start \(codex app-server ended before answering.*\); with BRAIN_CODEX_USAGE_REQUIRED=on codex is off until a read works: its questions go to deepseek$/)]);
    await expect(ask(closed.brain)).resolves.toMatchObject({ choice: "a", brain: { engine: "deepseek" } });
    expect(closed.fake.execCalls()).toBe(0);
    expect(closed.rows()[0]!.fell_back_from).toMatchObject({ engine: "codex", kind: "unavailable" });
    expect(closed.rows()[0]!.notes).toEqual([expect.stringMatching(/^codex usage could not be read .* codex is off until a read works/)]);
    expect(closed.notes.filter((note) => /off for the rest of this process/.test(note))).toEqual([]);
  });

  it("the live case (2026-10-04 07:06Z): a 401 expired token on the read, codex's token refresh through the app-server, the read again: codex answers", async () => {
    const { fake, brain, rows, notes } = brainWith("loop-expired", { BRAIN_CODEX_USAGE_REQUIRED: "on" });
    fake.setMode({ error: "failed to fetch codex rate limits: GET https://chatgpt.com/backend-api/wham/usage failed: 401 Unauthorized; Provided authentication token is expired", refreshFixes: true, result: liveResult(0, "500", { planType: "promax" }) });
    await expect(brain.preflight()).resolves.toEqual([]);
    expect(fake.servers().map((server) => server.requests.map((r) => r.method).filter((m) => m !== "initialize" && m !== "initialized"))).toEqual([["account/rateLimits/read"], ["account/read"], ["account/rateLimits/read"]]);
    expect(fake.servers()[1]!.requests.find((r) => r.method === "account/read")!.params).toEqual({ refreshToken: true });
    await expect(ask(brain)).resolves.toMatchObject({ choice: "b", brain: { engine: "codex" } });
    expect(notes).toEqual([expect.stringMatching(/^codex usage read was refused on the login .*401 Unauthorized.*; codex refreshed its token \(account\/read\) and the read works$/)]);
    expect(rows()[0]).toMatchObject({ engine: "codex", notes: [notes[0]], limits: { plan: "promax", used_pct: 0 } });
    // The account the refresh returned is not kept anywhere.
    expect(JSON.stringify(rows())).not.toContain("example.invalid");
    expect(JSON.stringify(brain.codexUsage!.status())).not.toContain("example.invalid");
  });

  it("through the router: reads failing send codex's questions to the fallback until the wait is over, then a working read brings codex back", async () => {
    const fake = fakeCodex("router-recover");
    fake.setMode({ error: "no answer within 20000 ms (fake)" });
    let clock = 10_000_000;
    const cfg = loadConfig({ BRAIN_CODEX_BIN: fake.bin, BRAIN_CODEX_HOME: home("router-recover"), BRAIN_ENGINE: "codex", BRAIN_FALLBACK: "deepseek", BRAIN_CODEX_USAGE_REQUIRED: "on", BRAIN_LOG: "off" } as unknown as NodeJS.ProcessEnv);
    const notes: string[] = [];
    const codex = new CodexEngine({ settings: cfg.brain.engines.codex, codex: cfg.brain.codex, stateDir: join(dir, "state-router-recover"), now: () => clock, note: (m) => notes.push(m) });
    const deepseek: BrainEngine = { name: "deepseek", model: "fake", decide: async (): Promise<BrainAnswer> => ({ engine: "deepseek", model: "fake", answer: { choice: "a", reason: "deepseek" }, problems: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] }) };
    const rows: BrainLogRow[] = [];
    const router = new BrainRouter({ config: cfg.brain, engine: (name) => (name === "codex" ? codex : deepseek), log: (row) => rows.push(row), now: () => clock });
    const req: BrainRequest = { label: "rest/plan", system: "S", question: "Heal or smith?", options, payload: { hp: 20 }, spec: pickSpec("rest/plan", options, {}) };
    await expect(router.decide(req)).resolves.toMatchObject({ engine: "deepseek", fellBackFrom: { engine: "codex" } });
    clock += 15_000;
    await expect(router.decide(req)).resolves.toMatchObject({ engine: "deepseek" });
    // One read so far: the second question went straight to DeepSeek (codex resting until the next read is due).
    expect(fake.servers()).toHaveLength(1);
    fake.setMode({ result: liveResult(2) });
    clock += 16_000;
    await expect(router.decide(req)).resolves.toMatchObject({ engine: "codex", answer: { choice: "b" } });
    expect(fake.servers()).toHaveLength(2);
    expect(fake.execCalls()).toBe(1);
    expect(rows.map((row) => [row.engine, row.fell_back_from?.kind ?? null, row.notes?.length ?? 0])).toEqual([["deepseek", "unavailable", 1], ["deepseek", "unavailable", 0], ["codex", null, 1]]);
    expect(rows[1]!.fell_back_from!.error).toMatch(/^resting until .* after unavailable: codex usage guard: codex usage could not be read/);
    expect(rows[2]!.notes).toEqual([expect.stringMatching(/^codex usage can be read again after 1 failed read\(s\) \(plan prolite, codex\/primary 7-day window 2% used/)]);
    expect(notes.map((note) => note.slice(0, 40))).toEqual(["WARNING: codex usage could not be read (", "codex usage can be read again after 1 fa"]);
  });

  it("refreshCodexAuth asks the app-server account/read with refreshToken and keeps nothing of the account", async () => {
    const fake = fakeCodex("refresh-direct");
    await expect(refreshCodexAuth({ bin: fake.bin, home: home("refresh-direct"), env: codexEnv(fake.bin, home("refresh-direct")), stateDir: join(dir, "state-refresh") })).resolves.toBeUndefined();
    expect(fake.servers()[0]!.requests.map((r) => r.method)).toEqual(["initialize", "initialized", "account/read"]);
    fake.setMode({ refreshError: "refresh token was already used" });
    await expect(refreshCodexAuth({ bin: fake.bin, home: home("refresh-direct"), env: codexEnv(fake.bin, home("refresh-direct")), stateDir: join(dir, "state-refresh") })).rejects.toThrow(/account\/read failed: refresh token was already used/);
  });

  it("an engine used without preflight reads before its first call", async () => {
    const fake = fakeCodex("engine-direct");
    fake.setMode({ result: liveResult(90) });
    const cfg = loadConfig({ BRAIN_CODEX_BIN: fake.bin, BRAIN_CODEX_HOME: home("engine-direct"), BRAIN_LOG: "off" } as unknown as NodeJS.ProcessEnv);
    const engine = new CodexEngine({ settings: cfg.brain.engines.codex, codex: cfg.brain.codex, stateDir: join(dir, "state-direct") });
    const req = { label: "rest/plan", system: "S", question: "Heal or smith?", options, payload: { hp: 20 }, spec: pickSpec("rest/plan", options, {}) };
    await expect(engine.decide(req)).rejects.toMatchObject({ kind: "quota", message: expect.stringContaining("90% used") });
    expect(fake.execCalls()).toBe(0);
    expect(engine.limits()).toMatchObject({ used_pct: 90 });
  });
});
