/**
 * The brain as the game loop calls it: the v3 DeepSeek call signatures (choose, choosePlan, askJson), now
 * answered through the router by whichever engine the environment names (docs/v4-architecture.md §2).
 *
 * - Each call becomes a BrainRequest: the v3 system prompt (guide + handbook), the run memory, the question,
 *   the options or the task input, the question's AnswerSpec (specs.ts) and, when the engine gets them, the tools
 *   (tools/registry.ts buildTools on the current ToolContext).
 * - KNOWLEDGE_PREFIX=full: the system is the rules + the whole knowledge base at the run's ascension (read from the
 *   current ToolContext), for every engine, and the memory drops the experience lessons the prefix already holds
 *   (knowledge.ts). A knowledge base that does not load sends v3's prompt for that question and says so (note).
 * - Default configuration (BRAIN_ENGINE unset = deepseek, no tools): the DeepSeek engine sends v3's exact request
 *   and its v3 result is returned unchanged (same object, same errors), so the loop behaves as v3 did.
 * - Another engine's answer is returned in the v3 shapes (DeepSeekAnswer, {json, meta}), with `brain` naming the
 *   engine, model, attempts and tool calls for the decision log. An answer that stays unusable after the
 *   router's re-ask is a DeepSeekAnswerError (the loop's "answered but unusable" path); an engine failure with no
 *   fallback left is thrown as it is (the loop's transport-failure path).
 */
import { dirname, join } from "node:path";

import { brainLogPath, DEFAULT_CODEX_EFFORT, DEFAULT_CODEX_MODEL, type AppConfig } from "../core/config.js";
import { DeepSeekAnswerError, type DeepSeekAnswer, type DeepSeekClient } from "./llm/deepseek.js";
import { buildTools } from "./tools/registry.js";
import type { ToolContext, ToolDef } from "./tools/types.js";
import type { JsonValue } from "../core/util/json.js";
import { checkClaudeBin, ClaudeEngine, type ClaudeCheck } from "./engines/claude.js";
import { checkCodex, CodexEngine, type CodexCheck } from "./engines/codex.js";
import type { CodexUsageGuard } from "./engines/codex-usage.js";
import { DeepSeekEngine } from "./engines/deepseek.js";
import { isContextOverflow, KnowledgePrompt, prefixSizeWarning } from "./knowledge.js";
import { frozenFacts } from "../knowledge/render/facts.js";
import { BrainRouter, type BrainLogRow, type FallbackBudget } from "./router.js";
import { carriesRunPlan, fightPlanFromSchema, fightPlanSpec, freeSpec, pickSpec, routePlanSpec, runPlanSpec, shopPlanSpec, withRunPlanField } from "./specs.js";
import { routeAnswerText } from "../sim/route-map.js";
import type { AnswerSpec, BrainAnswer, BrainEngine, BrainRequest, EngineName } from "./types.js";
import { KNOWLEDGE_DIR } from "../core/paths.js";

/** The project's knowledge directory (core/paths.ts): the data files the knowledge tools read (knowledge/files.ts). */
export { KNOWLEDGE_DIR };

/** Which engine answered a decision, for the decision log (absent when plain v3 DeepSeek did). */
export interface BrainMeta {
  engine: EngineName;
  model: string;
  attempts: number;
  tool_calls: string[];
  cost_usd?: number;
  problems?: string[];
  /** The engine that failed first, why, and how long its failed attempt took (ms; absent when it was resting, not tried). */
  fell_back_from?: { engine: EngineName; error: string; ms?: number };
  /** Model calls the router's re-ask added (a route checked by its AnswerSpec: M2). */
  reask_calls?: number;
  /** The engine's notes on how it got the answer (codex: taken from a cut answer, BRAIN_CODEX_ACCEPT_CUT). */
  notes?: string[];
}

export type BrainChoice = DeepSeekAnswer & { brain?: BrainMeta };
export type BrainMetaUsage = Omit<DeepSeekAnswer, "choice" | "reason"> & { brain?: BrainMeta };

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/** The engine for a name; throws with the reason when it cannot run here. */
export function createEngine(name: EngineName, config: AppConfig, deepseek: DeepSeekClient | null, options: { claudeToolsModule?: string; note?: (message: string) => void } = {}): BrainEngine {
  const settings = config.brain.engines[name];
  switch (name) {
    case "deepseek":
      if (!deepseek) throw new Error("brain engine deepseek needs a DeepSeek key (DEEPSEEK_API_KEY / DEEPSEEK_API_KEY_FILE)");
      return new DeepSeekEngine(deepseek);
    case "claude":
      return new ClaudeEngine({ settings, claude: config.brain.claude, ...(options.claudeToolsModule ? { toolsModule: options.claudeToolsModule } : {}) });
    case "codex":
      // Each codex run's trace (its event timeline, retries, stderr tail; no prompt or answer) next to brain.jsonl.
      return new CodexEngine({ settings, codex: config.brain.codex, traceFile: codexTracePath(config), ...(options.note ? { note: options.note } : {}) });
    case "dsh":
      // Named in the contract, to come with the offline learner (Dai 2026-09-29).
      throw new Error(`brain engine ${name} is not implemented yet (implemented: deepseek, claude, codex)`);
  }
}

/** codex-calls.jsonl next to brain.jsonl (none when the brain log is off). */
export function codexTracePath(config: AppConfig): string | null {
  const log = brainLogPath(config);
  return log ? join(dirname(log), "codex-calls.jsonl") : null;
}

/** A router over lazily created engines, logging to BRAIN_LOG (default: brain.jsonl next to the decision log). */
export function createRouter(config: AppConfig, deepseek: DeepSeekClient | null, options: { log?: (row: BrainLogRow) => void; claudeToolsModule?: string; fallbackBudget?: FallbackBudget } = {}): BrainRouter {
  const engines = new Map<EngineName, BrainEngine>();
  // An engine's own notes (codex: a usage read that failed) go where the router's go (Brain.onNote).
  const note = (message: string): void => router.say(message);
  const router: BrainRouter = new BrainRouter({
    config: { ...config.brain, log: brainLogPath(config) },
    engine: (name) => {
      let engine = engines.get(name);
      if (!engine) {
        engine = createEngine(name, config, deepseek, { ...(options.claudeToolsModule ? { claudeToolsModule: options.claudeToolsModule } : {}), note });
        engines.set(name, engine);
      }
      return engine;
    },
    ...(options.log ? { log: options.log } : {}),
    ...(options.fallbackBudget ? { fallbackBudget: options.fallbackBudget } : {}),
  });
  return router;
}

/** Whether a brain configuration can ask this engine: by default, for a question kind, or as the fallback. */
export function brainUses(brain: AppConfig["brain"], engine: EngineName): boolean {
  return brain.engine === engine || Object.values(brain.byPrefix).includes(engine) || brain.fallback === engine;
}

/** The loop's brain; `fallbackBudget` is the loop's DEEPSEEK_MAX_CALLS for DeepSeek asked as the fallback. */
export function createBrain(config: AppConfig, deepseek: DeepSeekClient, options: { fallbackBudget?: FallbackBudget } = {}): Brain {
  // KNOWLEDGE_PREFIX=full: the prefix's data facts frozen for the day in the directory v3 keeps its guide snapshots in.
  // MECH_RULES=off: the prefix's monster blocks without the observed mechanics (as before them); MECH_MOVE_RULES=off: without
  // the learned move changes (as with MECH_RULES alone).
  return new Brain(createRouter(config, deepseek, options), deepseek, buildTools, new KnowledgePrompt({ facts: frozenFacts(config.deepseek?.factsSnapshotDir), mechanics: config.mechRules, moveRules: config.mechMoveRules }));
}

/** The spec of a free-form task by its label (run plan, fight plan), with the caller's own format check. */
function taskSpec(label: string, accept?: (json: Json) => boolean): AnswerSpec {
  const base = label === "run-plan" ? runPlanSpec(label) : label === "fight-plan" ? fightPlanSpec(label) : freeSpec(label, { type: "object" });
  return withAccept(base, accept, "the answer is not in the task's format");
}

/**
 * A spec whose check is the caller's own (a task's format, the shop screen's resolve): an answer it accepts is valid;
 * one it rejects gets the base spec's problems, or `rejected` when the base finds none. v3's DeepSeek path hands this
 * check to the client, which also uses it to take an empty reply's answer from the end of its reasoning
 * (llm/deepseek.ts emptyReplyRetry).
 */
function withAccept(base: AnswerSpec, accept: ((json: Json) => boolean) | undefined, rejected: string): AnswerSpec {
  if (!accept) return base;
  return {
    ...base,
    validate(answer: unknown): string[] {
      if (isObject(answer) && accept(answer)) return [];
      const problems = base.validate(answer);
      return problems.length > 0 ? problems : [rejected];
    },
  };
}

export class Brain {
  private context: ToolContext | null = null;
  private notify: ((message: string) => void) | null = null;
  private lastKnowledgeError = "";
  /** The prefix (its sha) whose size was last warned about: said once per prefix. */
  private lastPrefixWarned = "";
  /** KNOWLEDGE_PREFIX=full: each full request's v3 form (no prefix), asked when the full one does not fit the context. */
  private readonly v3Requests = new WeakMap<BrainRequest, BrainRequest>();
  /** The start-up check of the claude program (preflight), when the configuration uses Claude. */
  claudeCheck: ({ bin: string } & ClaudeCheck) | null = null;
  /** The start-up check of codex (preflight: program, login file, no AGENTS.md, model and effort), when it is used. */
  codexCheck: ({ bin: string } & CodexCheck) | null = null;
  /** Codex's usage guard (engines/codex-usage.ts), once preflight has read the plan's usage: run-config.jsonl's codex_usage. */
  codexUsage: CodexUsageGuard | null = null;
  /** What the run should be warned about (the console and run-config.jsonl's `warnings`). */
  readonly warnings: string[] = [];

  constructor(
    readonly router: BrainRouter,
    readonly deepseek: DeepSeekClient,
    private readonly tools: (ctx: ToolContext) => ToolDef[] = buildTools,
    /** KNOWLEDGE_PREFIX=full: the rendered prompt, kept while the ascension and the data hold. */
    readonly knowledge: KnowledgePrompt = new KnowledgePrompt(),
  ) {}

  /** What the tools read for the coming questions (the loop sets it from each new state); also the run's ascension. */
  setToolContext(context: ToolContext | null): void {
    this.context = context;
  }

  /** Where the brain reports what the caller should see (a knowledge base that failed to load). */
  onNote(notify: (message: string) => void): void {
    this.notify = notify;
    this.router.onNote(notify);
  }

  engineFor(label: string): EngineName {
    return this.router.engineFor(label);
  }

  /**
   * Before play: when the configuration asks Claude anywhere (BRAIN_ENGINE, BRAIN_ENGINE_<PREFIX>, BRAIN_FALLBACK),
   * `claude --version` once; when it asks codex, codex's check (engines/codex.ts checkCodex: the program, the login
   * file, no AGENTS.md in its home, the model and effort in its catalog) and then the plan's usage (the engine's usage
   * guard: a window at BRAIN_CODEX_USAGE_STOP_PCT or credits in use keep codex off). A failure is returned (and kept in
   * `warnings`) for the console and run-config.jsonl, and the engine is marked unavailable for the process: its
   * questions go to BRAIN_FALLBACK (or fail at once, then Jev/code), instead of each one failing on its own.
   */
  async preflight(check: (bin: string) => Promise<ClaudeCheck> = checkClaudeBin, codexCheck: typeof checkCodex = checkCodex): Promise<string[]> {
    const config = this.router.config;
    const problems: string[] = [];
    if (brainUses(config, "claude")) {
      const bin = config.claude.bin;
      const result = await check(bin);
      this.claudeCheck = { bin, ...result };
      if (!result.ok) {
        const then = config.fallback && config.fallback !== "claude" ? `its questions go to ${config.fallback}` : "its questions go to Jev/code";
        const message = `claude is unavailable for this run: \`${bin} --version\` failed (${result.error}); ${then} (set BRAIN_CLAUDE_BIN to the program's absolute path)`;
        this.router.markUnavailable("claude", `\`${bin} --version\` failed: ${result.error}`);
        this.warnings.push(message);
        problems.push(message);
      }
    }
    if (brainUses(config, "codex")) {
      const settings = config.engines.codex;
      const model = settings.model ?? DEFAULT_CODEX_MODEL;
      const effort = settings.effort ?? DEFAULT_CODEX_EFFORT;
      const result = await codexCheck(config.codex, model, effort);
      this.codexCheck = { bin: config.codex.bin, ...result };
      const then = config.fallback && config.fallback !== "codex" ? `its questions go to ${config.fallback}` : "its questions go to Jev/code";
      if (!result.ok) {
        const message = `codex is unavailable for this run: ${result.error}; ${then} (BRAIN_CODEX_BIN / BRAIN_CODEX_HOME)`;
        this.router.markUnavailable("codex", result.error);
        this.warnings.push(message);
        problems.push(message);
      } else {
        // The plan's usage before the first call (engines/codex-usage.ts): a window at the stop or credits in use keep
        // codex off for the process; a read that fails is said once by the guard (or stops codex when required).
        const engine = this.router.engineOf("codex");
        if (engine instanceof CodexEngine) {
          this.codexUsage = engine.usage;
          const stop = await engine.usage.start();
          if (stop) {
            const message = `codex is off for this run: ${stop}; ${then}`;
            this.router.markUnavailable("codex", stop, engine.usage.stopKind);
            this.warnings.push(message);
            problems.push(message);
          } else if (engine.usage.blocked) {
            // BRAIN_CODEX_USAGE_REQUIRED=on: off until a read works (the guard reads again after its wait), not for the run.
            this.warnings.push(`codex usage could not be read at the start (${engine.usage.unreadable}); with BRAIN_CODEX_USAGE_REQUIRED=on codex is off until a read works: ${then}`);
          } else if (engine.usage.unreadable) {
            this.warnings.push(`codex usage could not be read at the start (${engine.usage.unreadable}); codex stays on without the usage guard until a read works`);
          }
        }
      }
    }
    return problems;
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
    const liveRun = (this.context?.state as Record<string, unknown> | undefined)?.["run_id"];
    const runId = typeof liveRun === "string" ? liveRun : "";
    const req: BrainRequest = {
      ...(runId ? { runId } : {}),
      label,
      system: this.deepseek.systemPrompt,
      ...(memory === undefined ? {} : { memory: memory as string | Record<string, unknown> }),
      question,
      ...(options ? { options } : {}),
      payload,
      spec,
      ...this.toolsFor(label),
    };
    if (this.router.config.knowledgePrefix !== "full") return req;
    const full = this.knowledge.apply(req, this.context ? { ascension: this.context.ascension, knowledgeDir: this.context.knowledgeDir } : null);
    const error = full.knowledge?.error ?? "";
    // Said once per distinct failure, not on every question.
    if (error && error !== this.lastKnowledgeError) this.notify?.(`KNOWLEDGE_PREFIX=full: ${error}`);
    this.lastKnowledgeError = error;
    if (full.knowledge?.mode === "full") {
      this.v3Requests.set(full, req);
      const prefixSha = full.knowledge.prefix_sha ?? "";
      const warning = full.knowledge.prefix_chars === undefined ? null : prefixSizeWarning(full.knowledge.prefix_chars);
      if (warning && prefixSha !== this.lastPrefixWarned) this.notify?.(`WARNING: KNOWLEDGE_PREFIX=full: ${warning}`);
      if (warning) this.lastPrefixWarned = prefixSha;
    }
    return full;
  }

  /**
   * The router's answer; a full-knowledge question the engine refused as longer than its context is asked once more
   * with v3's prompt (no prefix), the reason in that row's knowledge note (brain.jsonl).
   */
  private async decide(req: BrainRequest): Promise<BrainAnswer> {
    try {
      return await this.router.decide(req);
    } catch (error) {
      const v3 = this.v3Requests.get(req);
      if (!v3 || !isContextOverflow(error)) throw error;
      const detail = (error instanceof Error ? error.message : String(error)).slice(0, 200);
      const reason = `the full-knowledge prompt did not fit the context, v3 prompt sent: ${detail}`;
      this.notify?.(`KNOWLEDGE_PREFIX=full: ${req.label}: ${reason}`);
      return this.router.decide({ ...v3, knowledge: { mode: "off", ...(req.knowledge?.ascension === undefined ? {} : { ascension: req.knowledge.ascension }), error: reason } });
    }
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
    if (result.engine === "deepseek" && !result.fellBackFrom && !result.reaskCalls && Brain.v3(result) !== null) return undefined;
    return {
      engine: result.engine,
      model: result.model,
      attempts: result.attempts,
      tool_calls: result.toolCalls.map((call) => call.name),
      ...(result.usage.costUsd === undefined ? {} : { cost_usd: Number(result.usage.costUsd.toFixed(6)) }),
      ...(result.problems.length > 0 ? { problems: result.problems } : {}),
      ...(result.fellBackFrom ? { fell_back_from: result.fellBackFrom } : {}),
      ...(result.reaskCalls ? { reask_calls: result.reaskCalls } : {}),
      ...(result.notes?.length ? { notes: result.notes } : {}),
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
    const runPlan = Brain.runPlanOf(result);
    return new DeepSeekAnswerError(
      `${result.engine} answer unusable: ${result.problems.join("; ").slice(0, 300)}`,
      { choice: typeof first["choice"] === "string" ? first["choice"] : "", reason: typeof first["reason"] === "string" ? first["reason"] : "", reasoning: result.reasoning ?? "", content: result.raw ?? "", ...(runPlan ? { runPlan } : {}) },
      Brain.usage(result, brain),
    );
  }

  /**
   * The run plan riding on a question (RUN_PLAN_MERGE): the answer's run_plan, else the first answer's when the router
   * re-asked (a route problem) and the re-asked answer left it out; it does not depend on the rest of the answer.
   */
  private static runPlanOf(result: BrainAnswer): Record<string, unknown> | null {
    const answer = isObject(result.answer) ? result.answer : {};
    if (isObject(answer["run_plan"])) return answer["run_plan"];
    const first = (result as BrainAnswer & { first?: { answer: unknown } }).first?.answer;
    return isObject(first) && isObject(first["run_plan"]) ? first["run_plan"] : null;
  }

  /** v3 DeepSeekClient.choose: one option key (with the question's extra fields). */
  async choose(state: Record<string, JsonValue>, instructions: string, criteria: Record<string, string | null>, context: Record<string, JsonValue> = {}): Promise<BrainChoice> {
    const label = typeof context["label"] === "string" ? context["label"] : "";
    const result = await this.decide(this.request(label, instructions, context["memory"], state, pickSpec(label, criteria, state), criteria));
    const brain = Brain.meta(result);
    const v3 = Brain.v3<DeepSeekAnswer>(result);
    if (v3) return brain ? { ...v3, brain } : v3;
    const answer = result.answer;
    if (!isObject(answer) || typeof answer["choice"] !== "string") throw Brain.unusable(result, brain);
    const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
    const cards = strings(answer["cards"]);
    const discard = Array.isArray(answer["discard"]) ? answer["discard"].filter((slot): slot is number => typeof slot === "number" && Number.isInteger(slot)) : [];
    // A route is "keep" or node ids; a list of ids is read as the same ids in one string.
    const route = routeAnswerText(answer["route"]);
    const routeReason = typeof answer["route_reason"] === "string" && answer["route_reason"].trim() ? answer["route_reason"].trim() : "";
    const runPlan = Brain.runPlanOf(result);
    return {
      ...Brain.usage(result, brain),
      choice: answer["choice"],
      reason: typeof answer["reason"] === "string" ? answer["reason"].trim() : "",
      ...(cards.length > 0 ? { cards } : {}),
      ...(route ? { route, ...(routeReason ? { routeReason } : {}) } : {}),
      ...(discard.length > 0 ? { discard } : {}),
      ...(runPlan ? { runPlan } : {}),
    };
  }

  /**
   * v3 DeepSeekClient.choosePlan: a shop's shopping list (the screen validates it). `accept` is the screen's own
   * check (v3 7b54237): it joins the spec's, so an empty DeepSeek reply takes the plan its reasoning drafted that
   * the screen accepts, and another engine's plan the screen rejects is a problem the router can re-ask on.
   */
  async choosePlan(
    state: Record<string, JsonValue>,
    instructions: string,
    criteria: Record<string, string | null>,
    context: Record<string, JsonValue> = {},
    accept?: (json: Record<string, unknown>) => boolean,
  ): Promise<{ json: Record<string, unknown>; meta: BrainMetaUsage; recovered?: true; note?: string }> {
    const label = typeof context["label"] === "string" ? context["label"] : "";
    const kind = label.startsWith("shop/") ? shopPlanSpec(label, criteria, state) : label === "map/route-plan" || label === "map/route-review" ? routePlanSpec(label, state) : freeSpec(label, { type: "object" });
    // A due run plan riding on the question (RUN_PLAN_MERGE): its field joins the schema; the checks stay the question's.
    const base = carriesRunPlan(state) ? withRunPlanField(kind) : kind;
    const spec = withAccept(base, accept, "the screen does not accept this plan (a step it cannot take now)");
    const result = await this.decide(this.request(label, instructions, context["memory"], state, spec, criteria));
    const brain = Brain.meta(result);
    const v3 = Brain.v3<{ json: Record<string, unknown>; meta: BrainMetaUsage; recovered?: true; note?: string }>(result);
    if (v3) return brain ? { ...v3, meta: { ...v3.meta, brain } } : v3;
    if (!isObject(result.answer)) throw Brain.unusable(result, brain);
    const runPlan = Brain.runPlanOf(result);
    const json = runPlan && !isObject(result.answer["run_plan"]) ? { ...result.answer, run_plan: runPlan } : result.answer;
    return { json, meta: Brain.usage(result, brain) };
  }

  /** v3 DeepSeekClient.askJson: a free-form task (run plan, fight plan); `accept` is the caller's format check. */
  async askJson(payload: Record<string, JsonValue>, label: string, accept?: (json: Record<string, unknown>) => boolean): Promise<{ json: Record<string, unknown>; meta: BrainMetaUsage; recovered?: true; note?: string }> {
    const { task, memory, ...input } = payload;
    const question = typeof task === "string" ? task : label;
    const result = await this.decide(this.request(label, question, memory, input, taskSpec(label, accept)));
    const brain = Brain.meta(result);
    const v3 = Brain.v3<{ json: Record<string, unknown>; meta: BrainMetaUsage; recovered?: true; note?: string }>(result);
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
