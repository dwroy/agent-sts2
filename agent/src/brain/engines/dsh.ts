import { observeBrain, type BrainObserver } from "../live-view.js";
/** DeepSeek Harness through the installed Nova launcher, with an allowlisted per-call composition. */
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrainAnswer, BrainEngine, BrainRequest, BrainUsage } from "../types.js";
import { normalisePick, parseAnswerText, promptWithReask } from "../message.js";
import { EngineFailure, withNotes } from "../router.js";
import type { BrainConfig } from "../../core/config.js";
import { PROJECT_ROOT } from "../../core/paths.js";

export const DSH_MODEL = "deepseek/deepseek-flash";
type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => !!v && typeof v === "object" && !Array.isArray(v);

/** Parse only structural IDs. Configuration values, potentially private, are never logged or persisted. */
export function dshEntryIds(composed: string): string[] {
  const heads = composed.split(/\r?\n/).filter(l => l.startsWith("- "));
  if (!heads.length || heads.some(l => !/^- id: [a-zA-Z0-9_-]+$/.test(l))) throw new Error("unsupported dsh composition; admission held");
  const ids = heads.map(l => l.slice(6));
  if (new Set(ids).size !== ids.length) throw new Error("duplicate dsh entry identity");
  return ids;
}

/** Disable every inherited row, then insert only the kernel, Nova provider and our knowledge MCP. */
export function dshPatch(ids: string[], system: string, model: string, effort: string, sessions: string, mcpUrl?: string): Row[] {
  const row = (id: string, name: string, config?: unknown): Row => ({ id: `sts2-${id}`, name: `@deepseek-ai/${name}`, ...(config === undefined ? {} : { config }) });
  return [...ids.map(id => ({ id, disabled: true })), { insert: [
    row("timer", "cordis-plugin-timer"), row("llm", "dsh-llm"), row("session", "dsh-session"), row("agent", "dsh-agent"),
    row("projections", "dsh-session-projection"), row("retry", "dsh-llm-retry"),
    row("system", "dsh-system-prompt", { includeHarnessIdentity: false, includeRuntimeContext: false, personaPrefix: system }),
    row("tools", "dsh-tools", { mode: "native", maxParallelSubCalls: 1 }),
    row("loop", "dsh-agent-loop", { agents: [], maxParallelToolCalls: 1 }),
    row("provider", "dsh-llm-deepseek-api-key", { apiKeyEnv: "NOVA_DSH_API_KEY", thinking: "enabled", reasoningEffort: effort,
      streamIdleTimeoutMs: 180_000, maxTokens: 384_000, defaultContextWindow: 1_000_000,
      models: [{ id: model, name: "Nova DeepSeek", contextWindow: 1_000_000, maxTokens: 384_000, inputModalities: ["text"] }] }),
    row("default", "dsh-agent-default-model", { provider: "deepseek-official", model, reasoningEffort: effort }),
    row("sessions", "dsh-session-persistence-jsonl", { root: sessions, compression: "none", listConcurrency: 1 }),
    ...(mcpUrl ? [row("knowledge", "dsh-mcp-client", { transport: "streamable-http", serverName: "gkb", url: mcpUrl, headers: {}, toolCallTimeoutMs: 10_000, failOnStartupError: true })] : []),
    { id: "sts2-stream", name: fileURLToPath(new URL("./dsh-stream.mjs", import.meta.url)) },
    row("startup", "dsh-headless/startup"),
    // The ordinary CLI startup service owns parsing; this expression is supplied in the JSON/YAML overlay below.
    { ...row("runner", "dsh-headless"), inject: ["headlessStartup"], config: { task: "-", json: true } },
  ] }];
}

/** Only launch environment. The launcher itself reads the Nova key; no API client or key crosses this adapter. */
export function dshEnv(): Record<string, string> {
  const env: Record<string, string> = { DSH_TELEMETRY_DISABLED: "1", DSH_TOOLS_MODE: "native" };
  for (const key of ["HOME", "PATH", "LANG", "LC_ALL", "TMPDIR", "SYSTEMROOT", "WSL_INTEROP", "WSL_DISTRO_NAME"]) if (process.env[key]) env[key] = process.env[key]!;
  return env;
}

export class DshEngine implements BrainEngine {
  readonly preparesRequests = true;
  readonly name = "deepseek" as const;
  readonly model: string;
  constructor(private readonly config: BrainConfig, private readonly mcpUrl?: string) { this.model = config.engines.deepseek.model ?? DSH_MODEL; }

  private async dump(cwd: string, signal?: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.config.dsh.bin, ["headless", "--dump-config"], { cwd, env: dshEnv(), stdio: ["ignore", "pipe", "ignore"] });
      let text = "";
      const stop = () => { if (child.pid) child.kill("SIGTERM"); };
      const timer = setTimeout(stop, 15_000);
      const hard = setTimeout(() => { if (child.pid) child.kill("SIGKILL"); }, 16_000);
      signal?.addEventListener("abort", stop, { once: true });
      child.stdout.on("data", (b: Buffer) => { text += b.toString(); if (text.length > 1_000_000) stop(); });
      child.on("error", () => reject(new EngineFailure("dsh Nova launcher unavailable", "unavailable")));
      child.on("close", code => { clearTimeout(timer); clearTimeout(hard); signal?.removeEventListener("abort", stop); code === 0 ? resolve(text) : reject(new EngineFailure("dsh composition preflight failed", "unavailable")); });
    });
  }

  async decide(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer> {
    const root = join(PROJECT_ROOT, "data/brain-agent/dsh"); mkdirSync(root, { recursive: true });
    const dir = mkdtempSync(join(root, "question-"));
    const cwd = join(dir, "cwd"); mkdirSync(cwd);
    const effort = req.effort ?? this.config.engines.deepseek.effort ?? "max";
    if (!["low", "high", "max"].includes(effort)) throw new Error("dsh effort must be low, high or max");
    const started = Date.now();
    try {
      const ids = dshEntryIds(await this.dump(cwd, signal));
      const patch = join(dir, "knowledge.patch.json");
      const sessions = join(root, "sessions");
      writeFileSync(patch, JSON.stringify(dshPatch(ids, req.system, this.model, effort, sessions, req.tools?.length ? this.mcpUrl : undefined)));
      req.prepareForSend?.(req);
      const result = await this.run(["headless", "--patch", patch, "--json", "-"], cwd,
        `${promptWithReask(req)}\n\nAnswer schema: ${JSON.stringify(req.spec.schema)}`, signal, req.observe);
      const parsed = parseAnswerText(result.text);
      return { engine: this.name, model: this.model, effort, answer: parsed ? normalisePick(req, parsed) : null,
        problems: parsed ? [] : ["dsh returned no JSON answer"], attempts: 1, latencyMs: Date.now() - started,
        usage: result.usage, toolCalls: [], raw: result.text, reasoning: result.reasoning,
        notes: [`dsh Nova session ${result.sessionId}; stream_events=${result.events}`],
        native: { transport: "dsh", profile: "Nova", session_id: result.sessionId, stream_events: result.events } };
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }

  private run(args: string[], cwd: string, input: string, signal?: AbortSignal, observe?: BrainObserver): Promise<{ text: string; reasoning: string; usage: BrainUsage; sessionId: string; events: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.config.dsh.bin, args, { cwd, env: dshEnv(), stdio: ["pipe", "pipe", "pipe"] });
      let buffer = "", text = "", reasoning = "", sessionId = "", events = 0, stalled = false;
      const usage: BrainUsage = { inputTokens: 0, outputTokens: 0 };
      let timer: NodeJS.Timeout;
      let killTimer: NodeJS.Timeout | undefined;
      const stop = () => { if (child.pid) child.kill("SIGTERM"); killTimer = setTimeout(() => { if (child.pid) child.kill("SIGKILL"); }, 1_000); };
      const watch = () => { clearTimeout(timer); timer = setTimeout(() => { stalled = true; stop(); }, this.config.dsh.stallMs); };
      watch();
      signal?.addEventListener("abort", stop, { once: true });
      if (signal?.aborted) stop();
      child.stdout.on("data", (b: Buffer) => {
        watch(); buffer += b.toString();
        if (buffer.length > 2_000_000) { stop(); return; }
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
          let e: unknown; try { e = JSON.parse(line); } catch { continue; }
          if (!object(e)) continue;
          events += 1;
          if (e["type"] === "sts2_stream" && typeof e["text"] === "string") {
            observeBrain(observe, { kind: e["kind"] === "reasoning-delta" ? "reasoning" : "text", text: e["text"] });
          }
          if (e["type"] === "session") sessionId = String(e["sessionId"] ?? "");
          if (e["type"] === "final") text = String(e["text"] ?? "");
          if (e["type"] === "thinking") reasoning = (reasoning + String(e["text"] ?? "")).slice(-64_000);
          if (e["type"] === "status" && e["phase"] === "step_end" && object(e["usage"])) {
            const u = e["usage"]; usage.inputTokens += Number(u["inputTokens"] ?? 0); usage.outputTokens += Number(u["outputTokens"] ?? 0);
            usage.cacheHitTokens = (usage.cacheHitTokens ?? 0) + Number(u["cacheReadTokens"] ?? 0); usage.reasoningTokens = (usage.reasoningTokens ?? 0) + Number(u["reasoningTokens"] ?? 0);
          }
        }
      });
      // Raw diagnostics are deliberately not logged: a provider error may contain its endpoint or launch environment.
      child.stderr.on("data", () => watch());
      child.stdin.on("error", () => undefined);
      child.stdin.end(input);
      child.on("error", () => reject(new EngineFailure("dsh Nova launcher failed", "unavailable")));
      child.on("close", code => {
        const fail = (error: Error) => reject(withNotes(error, sessionId ? [`dsh Nova session ${sessionId}; stream_events=${events}`] : []));
        clearTimeout(timer); clearTimeout(killTimer); signal?.removeEventListener("abort", stop);
        if (signal?.aborted) fail(new Error("dsh knowledge phase aborted"));
        else if (stalled) fail(new EngineFailure("dsh stream stalled", "timeout"));
        else if (code !== 0) fail(new EngineFailure("dsh Nova turn failed (diagnostics retained in native session)", "error"));
        else resolve({ text, reasoning, usage, sessionId, events });
      });
    });
  }
}
