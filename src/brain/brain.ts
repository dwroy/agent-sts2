/**
 * The brain as the game loop calls it: the v3 DeepSeek call signatures (choose, choosePlan, askJson), now
 * answered through the router by whichever engine the environment names (docs/v4-architecture.md §2).
 *
 * - Each call becomes a BrainRequest: the v3 system prompt (guide + handbook), the run memory, the question,
 *   the options or the task input, the question's AnswerSpec (specs.ts) and, when the engine gets them, the tools
 *   (tools/registry.ts buildTools on the current ToolContext).
 * - Default configuration (BRAIN_ENGINE unset = deepseek, no tools): the DeepSeek engine sends v3's exact request
 *   and its v3 result is returned unchanged (same object, same errors), so the loop behaves as v3 did.
 * - Another engine's answer is returned in the v3 shapes (DeepSeekAnswer, {json, meta}), with `brain` naming the
 *   engine, model, attempts and tool calls for the decision log. An answer that stays unusable after the
 *   router's re-ask is a DeepSeekAnswerError (the loop's "answered but unusable" path); an engine failure with no
 *   fallback left is thrown as it is (the loop's transport-failure path).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { brainLogPath, type AppConfig } from "../config.js";
import { DeepSeekAnswerError, type DeepSeekAnswer, type DeepSeekClient } from "../llm/deepseek.js";
import { buildTools } from "../tools/registry.js";
import type { ToolContext, ToolDef } from "../tools/types.js";
import type { JsonValue } from "../util/json.js";
import { ClaudeEngine } from "./engines/claude.js";
import { DeepSeekEngine } from "./engines/deepseek.js";
import { BrainRouter, type BrainLogRow } from "./router.js";
import { fightPlanFromSchema, fightPlanSpec, freeSpec, pickSpec, runPlanSpec, shopPlanSpec } from "./specs.js";
import type { AnswerSpec, BrainAnswer, BrainEngine, BrainRequest, EngineName } from "./types.js";

/** src/knowledge: the data files the knowledge tools read. */
export const KNOWLEDGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../knowledge");

/** Which engine answered a decision, for the decision log (absent when plain v3 DeepSeek did). */
export interface BrainMeta {
  engine: EngineName;
  model: string;
  attempts: number;
  tool_calls: string[];
  cost_usd?: number;
  problems?: string[];
  fell_back_from?: { engine: EngineName; error: string };
}

export type BrainChoice = DeepSeekAnswer & { brain?: BrainMeta };
export type BrainMetaUsage = Omit<DeepSeekAnswer, "choice" | "reason"> & { brain?: BrainMeta };

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/** The engine for a name; throws with the reason when it cannot run here. */
export function createEngine(name: EngineName, config: AppConfig, deepseek: DeepSeekClient | null, options: { claudeToolsModule?: string } = {}): BrainEngine {
  const settings = config.brain.engines[name];
  switch (name) {
    case "deepseek":
      if (!deepseek) throw new Error("brain engine deepseek needs a DeepSeek key (DEEPSEEK_API_KEY / DEEPSEEK_API_KEY_FILE)");
      return new DeepSeekEngine(deepseek);
    case "claude":
      return new ClaudeEngine({ settings, claude: config.brain.claude, ...(options.claudeToolsModule ? { toolsModule: options.claudeToolsModule } : {}) });
    case "codex":
    case "dsh":
      // Named in the contract, to come with the offline learner (Dai 2026-09-29).
      throw new Error(`brain engine ${name} is not implemented yet (implemented: deepseek, claude)`);
  }
}

/** A router over lazily created engines, logging to BRAIN_LOG (default: brain.jsonl next to the decision log). */
export function createRouter(config: AppConfig, deepseek: DeepSeekClient | null, options: { log?: (row: BrainLogRow) => void; claudeToolsModule?: string } = {}): BrainRouter {
  const engines = new Map<EngineName, BrainEngine>();
  return new BrainRouter({
    config: { ...config.brain, log: brainLogPath(config) },
    engine: (name) => {
      let engine = engines.get(name);
      if (!engine) {
        engine = createEngine(name, config, deepseek, options);
        engines.set(name, engine);
      }
      return engine;
    },
    ...(options.log ? { log: options.log } : {}),
  });
}

export function createBrain(config: AppConfig, deepseek: DeepSeekClient): Brain {
  return new Brain(createRouter(config, deepseek), deepseek);
}

/** The spec of a free-form task by its label (run plan, fight plan), with the caller's own format check. */
function taskSpec(label: string, accept?: (json: Json) => boolean): AnswerSpec {
  const base = label === "run-plan" ? runPlanSpec(label) : label === "fight-plan" ? fightPlanSpec(label) : freeSpec(label, { type: "object" });
  if (!accept) return base;
  return {
    ...base,
    validate(answer: unknown): string[] {
      if (isObject(answer) && accept(answer)) return [];
      const problems = base.validate(answer);
      return problems.length > 0 ? problems : ["the answer is not in the task's format"];
    },
  };
}

export class Brain {
  private context: ToolContext | null = null;

  constructor(
    readonly router: BrainRouter,
    readonly deepseek: DeepSeekClient,
    private readonly tools: (ctx: ToolContext) => ToolDef[] = buildTools,
  ) {}

  /** What the tools read for the coming questions (the loop sets it from each new state). */
  setToolContext(context: ToolContext | null): void {
    this.context = context;
  }

  engineFor(label: string): EngineName {
    return this.router.engineFor(label);
  }

  /** The tools for a question, when its engine (or the fallback) gets tools and there is a context. */
  private toolsFor(label: string): { tools?: ToolDef[]; toolContext?: ToolContext } {
    if (!this.context) return {};
    const fallback = this.router.config.fallback;
    if (!this.router.toolsFor(this.router.engineFor(label)) && !(fallback && this.router.toolsFor(fallback))) return {};
    const tools = this.tools(this.context);
    return tools.length > 0 ? { tools, toolContext: this.context } : {};
  }

  private request(label: string, question: string, memory: JsonValue | undefined, payload: unknown, spec: AnswerSpec, options?: Record<string, string | null>): BrainRequest {
    return {
      label,
      system: this.deepseek.systemPrompt,
      ...(memory === undefined ? {} : { memory: memory as string | Record<string, unknown> }),
      question,
      ...(options ? { options } : {}),
      payload,
      spec,
      ...this.toolsFor(label),
    };
  }

  /** The v3 answer object, when plain v3 DeepSeek answered (no tools, no router re-ask). */
  private static v3<T>(result: BrainAnswer): T | null {
    const native = result.native;
    return isObject(native) && "v3" in native ? (native["v3"] as T) : null;
  }

  /**
   * The decision-log note for an answer; undefined when plain v3 DeepSeek answered, so v3's decision rows stay as
   * they were (the router's findings on it are in brain.jsonl).
   */
  private static meta(result: BrainAnswer): BrainMeta | undefined {
    if (result.engine === "deepseek" && !result.fellBackFrom && Brain.v3(result) !== null) return undefined;
    return {
      engine: result.engine,
      model: result.model,
      attempts: result.attempts,
      tool_calls: result.toolCalls.map((call) => call.name),
      ...(result.usage.costUsd === undefined ? {} : { cost_usd: Number(result.usage.costUsd.toFixed(6)) }),
      ...(result.problems.length > 0 ? { problems: result.problems } : {}),
      ...(result.fellBackFrom ? { fell_back_from: result.fellBackFrom } : {}),
    };
  }

  private static usage(result: BrainAnswer, brain: BrainMeta | undefined): BrainMetaUsage {
    return {
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      cacheHitTokens: result.usage.cacheHitTokens ?? 0,
      reasoningTokens: result.usage.reasoningTokens ?? 0,
      effort: "",
      ...(brain ? { brain } : {}),
    };
  }

  /** An answer that stayed unusable: the loop's "answered but unusable" error, with what the model did say. */
  private static unusable(result: BrainAnswer, brain: BrainMeta | undefined): DeepSeekAnswerError {
    const first = isObject(result.answer) ? result.answer : {};
    return new DeepSeekAnswerError(
      `${result.engine} answer unusable: ${result.problems.join("; ").slice(0, 300)}`,
      { choice: typeof first["choice"] === "string" ? first["choice"] : "", reason: typeof first["reason"] === "string" ? first["reason"] : "", reasoning: result.reasoning ?? "", content: result.raw ?? "" },
      Brain.usage(result, brain),
    );
  }

  /** v3 DeepSeekClient.choose: one option key (with the question's extra fields). */
  async choose(state: Record<string, JsonValue>, instructions: string, criteria: Record<string, string | null>, context: Record<string, JsonValue> = {}): Promise<BrainChoice> {
    const label = typeof context["label"] === "string" ? context["label"] : "";
    const result = await this.router.decide(this.request(label, instructions, context["memory"], state, pickSpec(label, criteria, state), criteria));
    const brain = Brain.meta(result);
    const v3 = Brain.v3<DeepSeekAnswer>(result);
    if (v3) return brain ? { ...v3, brain } : v3;
    const answer = result.answer;
    if (!isObject(answer) || typeof answer["choice"] !== "string") throw Brain.unusable(result, brain);
    const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
    const cards = strings(answer["cards"]);
    const discard = Array.isArray(answer["discard"]) ? answer["discard"].filter((slot): slot is number => typeof slot === "number" && Number.isInteger(slot)) : [];
    const route = typeof answer["route"] === "string" && answer["route"].trim() ? answer["route"].trim() : "";
    const routeReason = typeof answer["route_reason"] === "string" && answer["route_reason"].trim() ? answer["route_reason"].trim() : "";
    return {
      ...Brain.usage(result, brain),
      choice: answer["choice"],
      reason: typeof answer["reason"] === "string" ? answer["reason"].trim() : "",
      ...(cards.length > 0 ? { cards } : {}),
      ...(route ? { route, ...(routeReason ? { routeReason } : {}) } : {}),
      ...(discard.length > 0 ? { discard } : {}),
    };
  }

  /** v3 DeepSeekClient.choosePlan: a shop's shopping list (the screen validates it). */
  async choosePlan(state: Record<string, JsonValue>, instructions: string, criteria: Record<string, string | null>, context: Record<string, JsonValue> = {}): Promise<{ json: Record<string, unknown>; meta: BrainMetaUsage }> {
    const label = typeof context["label"] === "string" ? context["label"] : "";
    const spec = label.startsWith("shop/") ? shopPlanSpec(label, criteria, state) : freeSpec(label, { type: "object" });
    const result = await this.router.decide(this.request(label, instructions, context["memory"], state, spec, criteria));
    const brain = Brain.meta(result);
    const v3 = Brain.v3<{ json: Record<string, unknown>; meta: BrainMetaUsage }>(result);
    if (v3) return brain ? { ...v3, meta: { ...v3.meta, brain } } : v3;
    if (!isObject(result.answer)) throw Brain.unusable(result, brain);
    return { json: result.answer, meta: Brain.usage(result, brain) };
  }

  /** v3 DeepSeekClient.askJson: a free-form task (run plan, fight plan); `accept` is the caller's format check. */
  async askJson(payload: Record<string, JsonValue>, label: string, accept?: (json: Record<string, unknown>) => boolean): Promise<{ json: Record<string, unknown>; meta: BrainMetaUsage; recovered?: true }> {
    const { task, memory, ...input } = payload;
    const question = typeof task === "string" ? task : label;
    const result = await this.router.decide(this.request(label, question, memory, input, taskSpec(label, accept)));
    const brain = Brain.meta(result);
    const v3 = Brain.v3<{ json: Record<string, unknown>; meta: BrainMetaUsage; recovered?: true }>(result);
    if (v3) return brain ? { ...v3, meta: { ...v3.meta, brain } } : v3;
    if (!isObject(result.answer)) throw Brain.unusable(result, brain);
    const json = label === "fight-plan" ? fightPlanFromSchema(result.answer) : result.answer;
    return { json, meta: Brain.usage(result, brain) };
  }
}

/** The tools' context for a live state: its ascension and act, the knowledge files, the logs. */
export function toolContextOf(state: { run: { ascension: number | null } | null; raw: Record<string, unknown> }, act: number | undefined, logsDir: string): ToolContext {
  return { ascension: state.run?.ascension ?? 0, ...(act === undefined ? {} : { act }), knowledgeDir: KNOWLEDGE_DIR, logsDir, state: state.raw };
}
