import { observeBrain } from "../live-view.js";
/** Knowledge-agent lifecycle shared by Codex app-server and dsh. No alternate engine makes the final decision. */
import type { BrainAnswer, BrainEngine, BrainRequest, ToolCallRecord } from "../types.js";
import type { BrainConfig } from "../../core/config.js";
import { KnowledgeMcp } from "../tools/knowledge-mcp.js";
import { withoutToolCapabilities } from "../tools/capabilities.js";

export class KnowledgeAgent implements BrainEngine {
  readonly preparesRequests = true;
  private readonly mcp = new KnowledgeMcp();
  private querying: BrainEngine | null = null;
  private answering: BrainEngine | null = null;
  private questionKey: string | null = null;
  private acquired: ToolCallRecord[] = [];
  private settled: Promise<void> = Promise.resolve();
  private lastLimits: object | null = null;
  constructor(readonly name: "codex" | "deepseek", readonly model: string, private readonly config: BrainConfig,
    private readonly factory: (url?: string) => BrainEngine) {}

  limits(): object | null { return this.querying?.limits?.() ?? this.answering?.limits?.() ?? this.lastLimits; }

  private send(engine: BrainEngine, req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer> {
    if (!engine.preparesRequests) req.prepareForSend?.(req);
    return engine.decide(req, signal);
  }

  async initialise(): Promise<BrainEngine> {
    this.querying ??= this.factory(await this.mcp.start());
    return this.querying;
  }

  async decide(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer> {
    const previous = this.settled;
    let finish!: () => void;
    this.settled = new Promise<void>(resolve => { finish = resolve; });
    try {
      await previous;
      if (signal?.aborted) throw new Error("knowledge agent cancelled before dispatch");
      return await this.decideSerial(req, signal);
    } finally { finish(); }
  }

  private async decideSerial(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer> {
    if (req.reask) {
      if (this.querying && "close" in this.querying) await (this.querying as BrainEngine & { close(): Promise<void> }).close();
      this.querying = null;
      this.answering ??= this.factory();
      try { return await this.send(this.answering, { ...req, evidencePhase: "reask", tools: [], system: withoutToolCapabilities(req.system, req.tools ?? []) }, signal); }
      finally { if ("close" in this.answering) await (this.answering as BrainEngine & { close(): Promise<void> }).close(); this.answering = null; }
    }
    const key = req.questionId ?? "standalone";
    if (key !== this.questionKey) { this.questionKey = key; this.acquired = []; }
    const previousCalls = [...this.acquired];
    const started = Date.now();
    const total = Math.min(req.timeoutMs ?? Infinity, this.config.agent[`${this.name}TotalMs`]);
    const reserve = Math.min(this.config.agent[`${this.name}AnswerMs`], Math.max(0, total - 1));
    const toolMs = Math.max(1, total - reserve);
    const phase = new AbortController();
    let fallback: "calls" | "time" | "stall" | null = null;
    const limit = (reason: "calls" | "time") => { fallback ??= reason; phase.abort(); };
    const abort = () => phase.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) phase.abort();
    const host = this.mcp.begin(req.tools ?? [], req.toolContext ?? { ascension: 0, knowledgeDir: "", logsDir: "" }, Math.max(0, this.config.agent.maxToolCalls - previousCalls.length), started + toolMs, limit, req.observe);
    const timer = setTimeout(() => limit("time"), toolMs);
    let calls: ToolCallRecord[] = [];
    let first: BrainAnswer | null = null;
    let queryAttempted = false;
    try {
      await this.initialise();
      if (previousCalls.length >= this.config.agent.maxToolCalls) limit("calls");
      try { if (!fallback && !phase.signal.aborted) { queryAttempted = true; first = await this.send(this.querying!, { ...req, evidencePhase: "query" }, phase.signal); } }
      catch (error) {
        if (signal?.aborted) throw error;
        if (!fallback && error instanceof Error && /stalled|no first token|no notification/.test(error.message)) fallback = "stall";
        if (!fallback) throw error;
      }
      clearTimeout(timer);
      calls = [...previousCalls, ...host.calls];
      this.acquired = calls;
      const phaseMs = Date.now() - started;
      if (signal?.aborted) throw new Error("knowledge agent cancelled");
      if (first?.answer && first.problems.length === 0) fallback = null;
      let answer = first;
      if (fallback) {
        observeBrain(req.observe, { kind: "status", text: `!!! 查询阶段兜底 ${fallback}，用已有资料作答` });
        this.mcp.end();
        // Release the querying harness before starting the final one; only one child harness is alive.
        if (this.querying && "close" in this.querying) await (this.querying as BrainEngine & { close(): Promise<void> }).close();
        this.querying = null;
        this.answering ??= this.factory();
        const remaining = Math.max(1, total - (Date.now() - started));
        // Rebuild the same question with the exact recorded tool returns; no new lookup can happen in this phase.
        if (signal?.aborted) throw new Error("knowledge agent cancelled before answer phase");
        const finalReq: BrainRequest = { ...req, evidencePhase: "answer", tools: [], system: withoutToolCapabilities(req.system, req.tools ?? []), timeoutMs: remaining,
          question: `${req.question}\n\n知识查询阶段已结束（${fallback}）。使用原题状态和以下已取得的工具资料直接作答；缺失资料保持未知，不再查工具。\n${JSON.stringify(calls.map(c => ({ name: c.name, input: c.input, output: c.output, isError: c.isError ?? false })))}` };
        observeBrain(req.observe, { kind: "prompt", request: finalReq, phase: "查询阶段结束，使用已取得资料作答" });
        answer = await this.send(this.answering, finalReq, signal);
      }
      if (!answer) throw new Error("knowledge agent produced no result");
      return { ...answer, toolCalls: calls, latencyMs: Date.now() - started,
        attempts: (first?.attempts ?? (queryAttempted ? 1 : 0)) + (fallback ? answer.attempts : 0),
        agent: { fallback, toolPhaseMs: phaseMs, totalMs: Date.now() - started, noToolCalls: calls.length === 0,
          thinkingWithoutTools: calls.length === 0 && !!answer.reasoning,
          jsonTextWithoutTools: this.name === "deepseek" && calls.length === 0 && !!answer.raw && /"(?:tool|name)"\s*:\s*"(?:kb_|external_stats_|mcp__)|"tool_calls"\s*:/.test(answer.raw) },
        ...(fallback ? { notes: [...(answer.notes ?? []), `knowledge agent final answer after ${fallback} budget`] } : {}) };
    } catch (error) {
      if (error && typeof error === "object") Object.assign(error, { brainToolCalls: [...previousCalls, ...host.calls],
        brainAgent: { fallback, toolPhaseMs: Date.now() - started, totalMs: Date.now() - started, noToolCalls: previousCalls.length + host.calls.length === 0, jsonTextWithoutTools: false } });
      throw error;
    } finally {
      this.acquired = [...previousCalls, ...host.calls];
      this.lastLimits = this.limits();
      clearTimeout(timer); signal?.removeEventListener("abort", abort); this.mcp.end();
      if (signal?.aborted && this.querying && "close" in this.querying) {
        await (this.querying as BrainEngine & { close(): Promise<void> }).close();
        this.querying = null;
      }
      if (this.answering && "close" in this.answering) await (this.answering as BrainEngine & { close(): Promise<void> }).close();
      this.answering = null;
    }
  }

  async close(): Promise<void> {
    await this.settled;
    for (const engine of [this.querying, this.answering]) if (engine && "close" in engine) await (engine as BrainEngine & { close(): Promise<void> }).close();
    await this.mcp.close();
  }
}
