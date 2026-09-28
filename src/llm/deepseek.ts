/**
 * DeepSeek as the escalation path (phase 2): only for decisions a planner marks as escalatable, and
 * only when Jev's answer was a near-guess. It receives the *same* state and options Jev saw and must
 * answer with one option key, so its output goes through the same resolver and legality gate.
 *
 * OpenAI-compatible chat completions; key from DEEPSEEK_API_KEY. The key is never logged.
 */

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

import type { JsonValue } from "../util/json.js";
import { checkConsistency, reaskMessage, type ConsistencyCheck } from "./consistency.js";
import type { Escalator } from "./file-escalation.js";

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  /** Optional strategy guide (markdown) appended to the system prompt; a static prefix, so DeepSeek caches it. */
  guideFile?: string;
  /** Optional handbook of lessons from past runs (markdown), appended after the guide; also static and cached. */
  handbookFile?: string;
  /** Thinking mode: "max" | "high" | "low" enables it at that effort; "" or "off" disables it. */
  reasoningEffort?: string;
  /** Effort for combat questions (label "combat/..."), whose numbers code has already computed; defaults to reasoningEffort. */
  combatReasoningEffort?: string;
  /** JSONL file receiving each call's full chain of thought (for later review); "" disables. */
  reasoningLog?: string;
}

export interface DeepSeekAnswer {
  choice: string;
  reason: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens?: number;
  /**
   * Short hash of the guide in the prompt ("" when none), so logs show which guide version answered;
   * "<guide>+<handbook>" when a handbook is loaded too.
   */
  guideId?: string;
  /** Short hash of the handbook in the prompt ("" when none). */
  handbookId?: string;
  reasoningTokens?: number;
  /** Thinking effort actually used for this call ("off" when thinking was disabled). */
  effort?: string;
  /** Present when the first answer failed the consistency guard (see consistency.ts): both answers and the resolution. */
  consistency?: ConsistencyRecord;
}

/** One answer as seen by the consistency guard (JSON-safe, for decisions.jsonl). */
export interface ConsistencyAnswer {
  choice: string;
  reason: string;
  issues: string[];
  /** The option the reasoning concluded on, and its concluding line ("" when none could be mapped). */
  conclusion: string;
  conclusion_line: string;
}

export interface ConsistencyRecord {
  first: ConsistencyAnswer;
  /** The re-asked answer; `error` when the re-ask itself failed. */
  second: ConsistencyAnswer | { error: string };
  /**
   * "reasked": the second answer is consistent and is played; "conclusion": the option named in a
   * reasoning conclusion is played; "fallback": neither maps, the caller's fallback decides.
   */
  resolution: "reasked" | "conclusion" | "fallback";
  choice: string;
}

/** Thrown when DeepSeek's answer stays inconsistent and no conclusion maps to one option: the caller falls back. */
export class DeepSeekInconsistentError extends Error {
  constructor(readonly record: ConsistencyRecord, readonly meta: { calls: number; tokens: number }) {
    super(`DeepSeek answer inconsistent after re-ask (${record.first.issues.join("; ")})`);
    this.name = "DeepSeekInconsistentError";
  }
}

function consistencyAnswer(choice: string, reason: string, check: ConsistencyCheck): ConsistencyAnswer {
  return { choice, reason, issues: check.issues, conclusion: check.conclusion?.option ?? "", conclusion_line: check.conclusion?.line ?? "" };
}

const SYSTEM = [
  "You are an expert Slay the Spire 2 player advising a bot (Ironclad, climbing ascension levels).",
  "You get the game state and one question with a fixed set of option keys. Code has already computed",
  "every number shown (damage, block, HP after the enemy turn); trust those numbers.",
  "Think about winning the whole run, not just this screen. Be decisive.",
  "Do NOT recompute damage, block or HP arithmetic: the numbers in the options are exact (they already include",
  "strength, vulnerable, weak, block and enemy intents). Compare the options on their differences, weigh the few",
  "things code cannot see (future turns, deck plan, potion value), decide, and stop. Do not second-guess a decision once made.",
  "memory.knowledge, when present, is the slice of our experience base that matches this question: lessons distilled from past",
  "runs' post-mortems (scope, 置信 高/中/低 = confidence, n = supporting runs, 反例 = contradicting runs) and outcome statistics from our logs",
  "(observational: n runs, mean final floor, act-boss pass rate; low-n rows are hints only). Use it as evidence-based guidance, not",
  "orders: weigh it with the exact facts in the state and code's numbers. High-confidence, well-supported lessons deserve real weight;",
  "when the current situation differs from what a lesson assumes, the facts win.",
  'Reply with JSON only: {"choice": "<one option key exactly as given>", "reason": "<max 25 words>"}',
].join(" ");

export class DeepSeekClient implements Escalator {
  readonly name = "deepseek" as const;

  private readonly system: string;
  readonly guideId: string;
  readonly handbookId: string;

  constructor(private readonly config: DeepSeekConfig) {
    const guide = readOptional(config.guideFile);
    const handbook = readOptional(config.handbookFile);
    this.handbookId = shortHash(handbook);
    this.guideId = [shortHash(guide), this.handbookId].filter(Boolean).join("+");
    let system = SYSTEM;
    if (guide) system += `\n\n# Ironclad strategy guide (background knowledge; the state and computed numbers take precedence)\n\n${guide}`;
    // Static text only: the system prompt must stay byte-identical across calls so DeepSeek caches it.
    if (handbook) system += `\n\n# 经验手册（来自过往对局复盘）\n\n${handbook}`;
    this.system = system;
  }

  /** The system prompt as sent (for tools and tests). */
  get systemPrompt(): string {
    return this.system;
  }

  async choose(
    state: Record<string, JsonValue>,
    instructions: string,
    criteria: Record<string, string | null>,
    context: Record<string, JsonValue> = {},
  ): Promise<DeepSeekAnswer> {
    const label = typeof context["label"] === "string" ? context["label"] : "";
    // Run memory (journal, fight log, lookahead) rides in the user message, never the system prompt.
    const memory = context["memory"];
    const user = JSON.stringify({ state, ...(memory === undefined ? {} : { memory }), question: instructions, options: criteria });
    const messages: ChatMessage[] = [{ role: "user", content: user }];
    const done = await this.complete(messages, label);
    const first = this.parseChoice(done.content);
    this.logReasoning(label, done.effort, instructions, criteria, first.choice, first.rawReason, done.reasoning, done.latencyMs, memory);
    if (!(first.choice in criteria)) throw new Error(`DeepSeek chose unknown option "${first.choice}"`);
    const firstCheck = checkConsistency(first.choice, first.reason, done.reasoning, criteria);
    if (firstCheck.ok) return { ...done.meta, choice: first.choice, reason: first.reason };

    // Suspect answer: ask once more, quoting the contradiction, in the same conversation.
    const firstRecord = consistencyAnswer(first.choice, first.reason, firstCheck);
    let second: ConsistencyRecord["second"];
    let secondCheck: ConsistencyCheck | null = null;
    let secondChoice = "";
    let secondReason = "";
    let meta = done.meta;
    let calls = 1;
    try {
      calls += 1;
      const again = await this.complete(
        [...messages, { role: "assistant", content: done.content }, { role: "user", content: reaskMessage(first.choice, firstCheck) }],
        label,
      );
      meta = sumMeta(done.meta, again.meta);
      const parsed = this.parseChoice(again.content);
      this.logReasoning(`${label} (re-ask)`, again.effort, reaskMessage(first.choice, firstCheck), criteria, parsed.choice, parsed.rawReason, again.reasoning, again.latencyMs, undefined);
      secondChoice = parsed.choice;
      secondReason = parsed.reason;
      secondCheck = checkConsistency(parsed.choice, parsed.reason, again.reasoning, criteria);
      if (!(parsed.choice in criteria)) secondCheck = { ...secondCheck, ok: false, issues: [...secondCheck.issues, `unknown option "${parsed.choice}"`] };
      second = consistencyAnswer(secondChoice, secondReason, secondCheck);
    } catch (error) {
      second = { error: error instanceof Error ? error.message.slice(0, 200) : String(error) };
    }

    if (secondCheck?.ok) {
      return { ...meta, choice: secondChoice, reason: secondReason, consistency: { first: firstRecord, second, resolution: "reasked", choice: secondChoice } };
    }
    // Still inconsistent: act on a reasoning conclusion that names exactly one option (the re-ask's first).
    const conclusions = [secondCheck?.conclusion ?? null, firstCheck.conclusion].filter((c): c is NonNullable<typeof c> => c !== null);
    const target = conclusions.find((c) => c.unambiguous && c.option in criteria) ?? null;
    const conflicting = conclusions.some((c) => c.unambiguous && target !== null && c.option !== target.option);
    if (target && !conflicting) {
      const reason = `reasoning concluded ${target.option}: ${target.line}`.slice(0, 200);
      return { ...meta, choice: target.option, reason, consistency: { first: firstRecord, second, resolution: "conclusion", choice: target.option } };
    }
    throw new DeepSeekInconsistentError(
      { first: firstRecord, second, resolution: "fallback", choice: "" },
      { calls, tokens: meta.inputTokens + meta.outputTokens },
    );
  }

  private parseChoice(content: string): { choice: string; reason: string; rawReason: unknown } {
    let parsed: { choice?: unknown; reason?: unknown };
    try {
      parsed = JSON.parse(content) as { choice?: unknown; reason?: unknown };
    } catch {
      throw new Error(`DeepSeek returned non-JSON: ${content.slice(0, 120)}`);
    }
    return {
      choice: typeof parsed.choice === "string" ? parsed.choice.trim() : "",
      reason: typeof parsed.reason === "string" ? parsed.reason.trim() : "",
      rawReason: parsed.reason,
    };
  }

  /**
   * One free-form JSON answer (the fight plan, FIGHT_PLAN=v1): same cached system prompt, the task and
   * its reply format in the user message. Returns the parsed object; the caller validates it.
   */
  async askJson(
    payload: Record<string, JsonValue>,
    label: string,
  ): Promise<{ json: Record<string, unknown>; meta: Omit<DeepSeekAnswer, "choice" | "reason"> }> {
    const done = await this.complete([{ role: "user", content: JSON.stringify(payload) }], label);
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(done.content) as Record<string, unknown>;
    } catch {
      throw new Error(`DeepSeek returned non-JSON: ${done.content.slice(0, 120)}`);
    }
    if (typeof json !== "object" || json === null || Array.isArray(json)) throw new Error("DeepSeek returned a non-object");
    const memory = payload["memory"];
    this.logReasoning(label, done.effort, typeof payload["task"] === "string" ? payload["task"] : label, {}, "", json["summary"] ?? "", done.reasoning, done.latencyMs, memory, json);
    return { json, meta: done.meta };
  }

  private async complete(
    messages: ChatMessage[],
    label: string,
  ): Promise<{ content: string; reasoning: string; effort: string; latencyMs: number; meta: Omit<DeepSeekAnswer, "choice" | "reason"> }> {
    const started = Date.now();
    const effort = (label.startsWith("combat/") ? this.config.combatReasoningEffort : undefined) || this.config.reasoningEffort || "off";
    const thinking = effort !== "off";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.config.apiKey}` },
        body: JSON.stringify({
          model: this.config.model,
          ...(thinking
            ? { thinking: { type: "enabled" }, reasoning_effort: effort }
            : { thinking: { type: "disabled" }, temperature: 0 }),
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: this.system },
            ...messages,
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = (await response.text()).slice(0, 200);
        throw new Error(`DeepSeek HTTP ${response.status}: ${body}`);
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string; reasoning_content?: string } }[];
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          prompt_cache_hit_tokens?: number;
          completion_tokens_details?: { reasoning_tokens?: number };
        };
      };
      const latencyMs = Date.now() - started;
      return {
        content: payload.choices?.[0]?.message?.content ?? "",
        reasoning: payload.choices?.[0]?.message?.reasoning_content ?? "",
        effort,
        latencyMs,
        meta: {
          latencyMs,
          inputTokens: payload.usage?.prompt_tokens ?? 0,
          outputTokens: payload.usage?.completion_tokens ?? 0,
          cacheHitTokens: payload.usage?.prompt_cache_hit_tokens ?? 0,
          guideId: this.guideId,
          handbookId: this.handbookId,
          reasoningTokens: payload.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
          effort,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private logReasoning(label: string, effort: string, question: string, criteria: Record<string, string | null>, choice: string, reason: unknown, reasoning: string, latencyMs: number, memory: JsonValue | undefined, answer?: unknown): void {
    if (!this.config.reasoningLog) return;
    try {
      mkdirSync(dirname(this.config.reasoningLog), { recursive: true });
      const entry = { ts: new Date().toISOString(), model: this.config.model, label, effort, guide: this.guideId, latency_ms: latencyMs, question, options: Object.keys(criteria), choice, reason, reasoning, ...(memory === undefined ? {} : { memory, memory_chars: contextChars(memory) }), ...(answer === undefined ? {} : { answer }) };
      appendFileSync(this.config.reasoningLog, `${JSON.stringify(entry)}\n`, "utf8");
    } catch {
      // logging must never break play
    }
  }
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Usage of two calls on one question, summed (latency too: both were waited for). */
function sumMeta(a: Omit<DeepSeekAnswer, "choice" | "reason">, b: Omit<DeepSeekAnswer, "choice" | "reason">): Omit<DeepSeekAnswer, "choice" | "reason"> {
  return {
    ...a,
    latencyMs: a.latencyMs + b.latencyMs,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheHitTokens: (a.cacheHitTokens ?? 0) + (b.cacheHitTokens ?? 0),
    reasoningTokens: (a.reasoningTokens ?? 0) + (b.reasoningTokens ?? 0),
  };
}

function readOptional(file: string | undefined): string {
  if (!file || !existsSync(file)) return "";
  try {
    return readFileSync(file, "utf8").trim();
  } catch {
    return "";
  }
}

function shortHash(text: string): string {
  return text ? createHash("sha256").update(text).digest("hex").slice(0, 8) : "";
}

/** Characters of run context in a memory block (the sum of its string sections). */
function contextChars(memory: JsonValue): number {
  if (typeof memory === "string") return memory.length;
  if (memory === null || typeof memory !== "object" || Array.isArray(memory)) return JSON.stringify(memory).length;
  return Object.values(memory).reduce<number>((sum, value) => sum + (typeof value === "string" ? value.length : JSON.stringify(value ?? null).length), 0);
}
