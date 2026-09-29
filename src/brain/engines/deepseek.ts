/**
 * DeepSeek as a brain engine: the v3 DeepSeekClient, wrapped.
 *
 * - Without tools and without a re-ask, a request goes through the client's own v3 methods, so what is sent is
 *   byte-for-byte what v3 sent (tests/brain-deepseek.test.ts) and v3's repair stays; the v3 result object is
 *   BrainAnswer.native.v3 (brain.ts hands it to the loop unchanged): choose() for a pick (its
 *   label->key mapping and consistency re-ask), choosePlan() for a shop list, askJson() for a task (its
 *   reasoning-draft recovery, with the spec as its format check). Their answer failures (DeepSeekAnswerError,
 *   DeepSeekInconsistentError) are thrown as they are: the caller's v3 recovery (recoverFrom) needs them.
 * - With tools: DeepSeek's native function calling; the tools run in this process (ToolHost), each call is
 *   recorded, and the loop ends on a reply without tool calls.
 * - The router's re-ask: the same conversation with the previous answer and the problems as a new user turn.
 */
import { DeepSeekClient, type DeepSeekAnswer } from "../../llm/deepseek.js";
import type { JsonValue } from "../../util/json.js";
import { ToolHost } from "../../tools/mcp-server.js";
import { normalisePick, parseAnswerText, reaskMessage, TOOLS_NOTE, userMessage } from "../message.js";
import type { BrainAnswer, BrainEngine, BrainRequest, BrainUsage } from "../types.js";

type Meta = Omit<DeepSeekAnswer, "choice" | "reason">;

/** deepseek-flash, USD per million tokens (ops/paper_dataset.py, peak): cache miss, cache hit, output. */
export const DEEPSEEK_PRICE = { miss: 0.3, hit: 0.006, out: 1.2 } as const;

/** Tool-calling rounds before the last round is asked to answer without tools. */
const MAX_TOOL_ROUNDS = 8;

export function deepseekCost(inputTokens: number, cacheHitTokens: number, outputTokens: number): number {
  return ((inputTokens - cacheHitTokens) * DEEPSEEK_PRICE.miss + cacheHitTokens * DEEPSEEK_PRICE.hit + outputTokens * DEEPSEEK_PRICE.out) / 1e6;
}

function usageOf(meta: Pick<Meta, "inputTokens" | "outputTokens" | "cacheHitTokens" | "reasoningTokens">): BrainUsage {
  const hit = meta.cacheHitTokens ?? 0;
  return {
    inputTokens: meta.inputTokens,
    cacheHitTokens: hit,
    outputTokens: meta.outputTokens,
    reasoningTokens: meta.reasoningTokens ?? 0,
    costUsd: deepseekCost(meta.inputTokens, hit, meta.outputTokens),
  };
}

function addUsage(a: BrainUsage, b: BrainUsage): BrainUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    cacheHitTokens: (a.cacheHitTokens ?? 0) + (b.cacheHitTokens ?? 0),
    outputTokens: a.outputTokens + b.outputTokens,
    reasoningTokens: (a.reasoningTokens ?? 0) + (b.reasoningTokens ?? 0),
    costUsd: (a.costUsd ?? 0) + (b.costUsd ?? 0),
  };
}

const ZERO: BrainUsage = { inputTokens: 0, cacheHitTokens: 0, outputTokens: 0, reasoningTokens: 0, costUsd: 0 };

/** A v3 pick answer as the brain's answer object (the fields the question's schema names). */
export function pickAnswerOf(answer: DeepSeekAnswer): Record<string, unknown> {
  return {
    choice: answer.choice,
    reason: answer.reason,
    ...(answer.cards ? { cards: answer.cards } : {}),
    ...(answer.route ? { route: answer.route } : {}),
    ...(answer.routeReason ? { route_reason: answer.routeReason } : {}),
    ...(answer.discard ? { discard: answer.discard } : {}),
  };
}

export class DeepSeekEngine implements BrainEngine {
  readonly name = "deepseek" as const;

  /** The client for the last other system prompt (KNOWLEDGE_PREFIX=full: the same on every question of a run). */
  private derived: DeepSeekClient | null = null;

  constructor(private readonly client: DeepSeekClient) {}

  get model(): string {
    return this.client.modelName;
  }

  /** The client that sends this request's system prompt (the wrapped one unless the request carries another). */
  private clientFor(req: BrainRequest): DeepSeekClient {
    if (req.system === this.client.systemPrompt) return this.client;
    if (!this.derived || this.derived.systemPrompt !== req.system) this.derived = this.client.withSystem(req.system);
    return this.derived;
  }

  async decide(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer> {
    if (req.tools && req.tools.length > 0) return this.withTools(req, signal);
    if (req.reask) return this.reasked(req, signal);
    return this.v3(req);
  }

  /** The v3 call, exactly as the loop made it before V4. */
  private async v3(req: BrainRequest): Promise<BrainAnswer> {
    const client = this.clientFor(req);
    const started = Date.now();
    const memory = req.memory as JsonValue | undefined;
    const context: Record<string, JsonValue> = { label: req.label, ...(memory === undefined ? {} : { memory }) };
    if (req.options && req.spec.kind === "pick") {
      const answer = await client.choose((req.payload ?? {}) as Record<string, JsonValue>, req.question, req.options, context);
      return {
        engine: this.name,
        model: this.model,
        answer: pickAnswerOf(answer),
        problems: [],
        attempts: answer.consistency ? 2 : 1,
        latencyMs: Date.now() - started,
        usage: usageOf(answer),
        toolCalls: [],
        native: { v3: answer },
      };
    }
    let result: { json: Record<string, unknown>; meta: Meta; recovered?: true };
    if (req.options) {
      result = await client.choosePlan((req.payload ?? {}) as Record<string, JsonValue>, req.question, req.options, context);
    } else {
      const input = (req.payload && typeof req.payload === "object" && !Array.isArray(req.payload) ? req.payload : { input: req.payload ?? null }) as Record<string, JsonValue>;
      const payload: Record<string, JsonValue> = memory === undefined ? { task: req.question, ...input } : { task: req.question, ...input, memory };
      result = await client.askJson(payload, req.label, (json) => req.spec.validate(json).length === 0);
    }
    return {
      engine: this.name,
      model: this.model,
      answer: result.json,
      problems: [],
      attempts: 1,
      latencyMs: Date.now() - started,
      usage: usageOf(result.meta),
      toolCalls: [],
      native: { v3: result },
    };
  }

  /** The router's re-ask without tools: the question, the previous answer, the problems, in one conversation. */
  private async reasked(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer> {
    const client = this.clientFor(req);
    const started = Date.now();
    const messages = [
      { role: "user", content: userMessage(req) },
      { role: "assistant", content: req.reask!.answer },
      { role: "user", content: reaskMessage(req, req.reask!.problems) },
    ];
    const done = await client.chat(messages, req.label, signal ? { signal } : {});
    return this.finish(req, done.content, done.reasoning, usageOf(done.meta), 1, Date.now() - started, []);
  }

  /** DeepSeek's native function calling, the tools run here. */
  private async withTools(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer> {
    if (!req.toolContext) throw new Error("tools given without a toolContext");
    const client = this.clientFor(req).withSystem(req.system + TOOLS_NOTE);
    const host = new ToolHost(req.tools!, req.toolContext);
    const tools = req.tools!.map((tool) => ({ type: "function", function: { name: tool.name, description: tool.description, parameters: { type: "object", ...tool.inputSchema } } }));
    const started = Date.now();
    const messages: Record<string, unknown>[] = [{ role: "user", content: userMessage(req) }];
    if (req.reask) messages.push({ role: "assistant", content: req.reask.answer }, { role: "user", content: reaskMessage(req, req.reask.problems) });
    let usage = ZERO;
    let calls = 0;
    for (let round = 0; ; round += 1) {
      const last = round >= MAX_TOOL_ROUNDS;
      const done = await client.chat(messages, req.label, { tools, ...(last ? { toolChoice: "none" as const } : {}), ...(signal ? { signal } : {}) });
      calls += 1;
      usage = addUsage(usage, usageOf(done.meta));
      if (done.toolCalls.length === 0 || last) return this.finish(req, done.content, done.reasoning, usage, calls, Date.now() - started, host.take());
      // The assistant turn goes back as given (thinking mode wants its reasoning_content with tool calls).
      messages.push({
        role: "assistant",
        content: done.content,
        ...(done.reasoning ? { reasoning_content: done.reasoning } : {}),
        tool_calls: done.toolCalls.map((call) => ({ id: call.id, type: "function", function: { name: call.name, arguments: call.arguments } })),
      });
      for (const call of done.toolCalls) {
        let input: unknown;
        let text: string;
        try {
          input = call.arguments.trim() ? JSON.parse(call.arguments) : {};
          text = (await host.call(call.name, input)).text;
        } catch {
          text = `arguments are not valid JSON: ${call.arguments.slice(0, 200)}`;
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: text });
      }
    }
  }

  private finish(req: BrainRequest, content: string, reasoning: string, usage: BrainUsage, attempts: number, latencyMs: number, toolCalls: BrainAnswer["toolCalls"]): BrainAnswer {
    const parsed = parseAnswerText(content);
    return {
      engine: this.name,
      model: this.model,
      answer: parsed ? normalisePick(req, parsed) : null,
      problems: parsed ? [] : [`the reply is not a JSON object: ${content.slice(0, 120)}`],
      attempts,
      latencyMs,
      usage,
      toolCalls,
      ...(reasoning ? { reasoning } : {}),
      raw: content,
    };
  }
}
