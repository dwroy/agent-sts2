/**
 * Arm C: one question through DeepSeek Harness (dsh 0.1.7-rc.2, sdk-minimal profile + sts2.patch.yml).
 * One runtime process per question (the decision tool's schema and the retry state are per question).
 * The key goes only into the child's environment; nothing is written with it.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { AnswerSpec } from "./spec.js";

const TOOLS = join(homedir(), "tools");
export const DSH_NODE_MODULES = join(TOOLS, "dsh/node_modules");
export const DSH_HOME = join(TOOLS, "dsh-home");
const HERE = new URL("..", import.meta.url).pathname; // experiments/dsh/

export interface ArmCResult {
  attempts: { event: string; attempt?: number; args?: unknown; errors?: string[]; classes?: string[]; warnings?: string[]; t: number }[];
  accepted: unknown | null;
  finalResponse: string;
  startMs: number;
  runMs: number;
  calls: { kind: string; input_tokens: number; output_tokens: number; cache_read: number; cache_write: number; thinking_chars: number; text_chars: number; tool_calls: number; text: string; reasoning_tail: string }[];
  error?: string;
  eventTypes: Record<string, number>;
  sessionId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sdk: any = null;
async function loadSdk() {
  sdk ??= await import(pathToFileURL(join(DSH_NODE_MODULES, "@deepseek-ai/dsh-sdk-client/lib/index.js")).href);
  return sdk;
}

export async function runArmC(opts: { apiKey: string; systemPrompt: string; userMessage: string; spec: AnswerSpec; effort: string; maxRetries: number; timeoutMs: number; keepDir?: string }): Promise<ArmCResult> {
  const { DeepSeekHarness } = await loadSdk();
  const work = mkdtempSync(join(tmpdir(), "sts2-dsh-"));
  const specFile = join(work, "spec.json");
  const outFile = join(work, "attempts.jsonl");
  writeFileSync(specFile, JSON.stringify(opts.spec));
  writeFileSync(outFile, "");
  const env: NodeJS.ProcessEnv = {
    PATH: process.env["PATH"],
    HOME: process.env["HOME"],
    LANG: "C.UTF-8",
    DSH_HOME,
    DEEPSEEK_API_KEY: opts.apiKey,
    DSH_SYSTEM_PROMPT: opts.systemPrompt,
    STS2_SPEC_FILE: specFile,
    STS2_OUT_FILE: outFile,
    STS2_VALIDATE_MODULE: join(HERE, "lib/validate.ts"),
    DSH_LLM_MODULE: join(DSH_NODE_MODULES, "@deepseek-ai/dsh-llm/lib/index.js"),
    STS2_MAX_RETRIES: String(opts.maxRetries),
    NODE_NO_WARNINGS: "1",
    ...(process.env["STS2_DSH_BASE_URL"] ? { DEEPSEEK_BASE_URL: process.env["STS2_DSH_BASE_URL"] } : {}),
  };
  const harness = new DeepSeekHarness({
    profile: "sdk-minimal",
    patches: [join(HERE, "harness/sts2.patch.yml")],
    dshHome: DSH_HOME,
    env,
    cwd: work,
    processCwd: work,
    provider: "deepseek-official",
    model: "deepseek-flash",
    reasoningEffort: opts.effort,
    initializeTimeoutMs: 60_000,
  });
  const result: ArmCResult = { attempts: [], accepted: null, finalResponse: "", startMs: 0, runMs: 0, calls: [], eventTypes: {} };
  const t0 = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    await harness.start();
    result.startMs = Date.now() - t0;
    const t1 = Date.now();
    const run = harness.run(opts.userMessage);
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timeout after ${opts.timeoutMs} ms`)), opts.timeoutMs);
    });
    const done = (await Promise.race([run, timeout])) as { finalResponse: string; events: { type: string; data: unknown }[]; sessionId: string };
    result.runMs = Date.now() - t1;
    result.finalResponse = done.finalResponse;
    result.sessionId = done.sessionId;
    for (const event of done.events) {
      result.eventTypes[event.type] = (result.eventTypes[event.type] ?? 0) + 1;
      if (event.type === "assistant/message" || event.type === "assistant/attempt") result.calls.push(usageOf(event));
    }
    if (opts.keepDir) {
      // The session log without the per-token stream timings (the committed message keeps the full text).
      const compact = done.events.map((event) => {
        const data = event.data as Record<string, unknown> | null;
        return data && typeof data === "object" && "stream" in data ? { ...event, data: { ...data, stream: undefined } } : event;
      });
      mkdirSync(opts.keepDir, { recursive: true });
      writeFileSync(join(opts.keepDir, "events.json"), JSON.stringify(compact));
    }
  } catch (error) {
    result.runMs = Date.now() - t0 - result.startMs;
    result.error = error instanceof Error ? error.message.slice(0, 500) : String(error);
  } finally {
    clearTimeout(timer);
    try {
      await harness.close();
    } catch {
      // reaped by the SDK's teardown ladder
    }
  }
  if (existsSync(outFile)) {
    result.attempts = readFileSync(outFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
    const ok = result.attempts.find((a) => a.event === "accepted");
    result.accepted = ok ? ok.args : null;
  }
  if (opts.keepDir) {
    mkdirSync(opts.keepDir, { recursive: true });
    writeFileSync(join(opts.keepDir, "attempts.jsonl"), readFileSync(outFile, "utf8"));
  }
  rmSync(work, { recursive: true, force: true });
  return result;
}

/** Usage and shape of one model call from its session event (assistant/message or a failed assistant/attempt). */
function usageOf(event: { type: string; data: unknown }): ArmCResult["calls"][number] {
  const data = (event.data ?? {}) as { usage?: Record<string, number>; message?: { content?: { type: string; text?: string; arguments?: string }[] } };
  const usage = data.usage ?? {};
  const content = data.message?.content ?? [];
  return {
    kind: event.type,
    input_tokens: usage["inputTokens"] ?? 0,
    output_tokens: usage["outputTokens"] ?? 0,
    cache_read: usage["cacheReadTokens"] ?? 0,
    cache_write: usage["cacheWriteTokens"] ?? 0,
    thinking_chars: content.filter((b) => b.type === "reasoning").reduce((n, b) => n + (b.text ?? "").length, 0),
    text_chars: content.filter((b) => b.type === "text").reduce((n, b) => n + (b.text ?? "").length, 0),
    tool_calls: content.filter((b) => b.type === "tool-call").length,
    text: content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").slice(0, 1500),
    reasoning_tail: content.filter((b) => b.type === "reasoning").map((b) => b.text ?? "").join("").slice(-600),
  };
}
