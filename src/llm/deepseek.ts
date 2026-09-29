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
import { checkConsistency, reaskMessage, recoverChoice, type Conclusion, type ConsistencyCheck } from "./consistency.js";
import { choiceMessage, taskMessage } from "./deepseek-message.js";
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
  /**
   * Per-label effort tiers, "label-prefix=effort,…" (DEEPSEEK_EFFORT_BY_LABEL; default
   * DEFAULT_EFFORT_BY_LABEL): the longest matching prefix wins; labels that match none use
   * reasoningEffort. Applies only while thinking is on (reasoningEffort not "off").
   */
  effortByLabel?: string;
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
  /**
   * The answer's `cards` list, when it gave one (a one-shot event option that takes N >= 2 deck cards names
   * them here; screens/oneshot.ts). Absent otherwise.
   */
  cards?: string[];
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

/**
 * DeepSeek answered but the answer is unusable (reply not JSON, or a choice that names no option key):
 * what it did say, so the caller can recover the choice from its reasoning (recoverFrom) before
 * falling back, and hand its reason on.
 */
export class DeepSeekAnswerError extends Error {
  constructor(
    message: string,
    readonly detail: { choice: string; reason: string; reasoning: string; content: string },
    readonly meta: Omit<DeepSeekAnswer, "choice" | "reason">,
  ) {
    super(message);
    this.name = "DeepSeekAnswerError";
  }

  /** The option its reasoning (then its reason, then the raw reply) concluded on, when exactly one; else null. */
  recoverFrom(criteria: Record<string, string | null>): Conclusion | null {
    return recoverChoice([this.detail.reasoning, this.detail.reason, this.detail.content], criteria);
  }
}

function consistencyAnswer(choice: string, reason: string, check: ConsistencyCheck): ConsistencyAnswer {
  return { choice, reason, issues: check.issues, conclusion: check.conclusion?.option ?? "", conclusion_line: check.conclusion?.line ?? "" };
}

/** Option fields that name the option (event/rest "option", reward/selection "card", shop "buy", ...). */
const OPTION_NAME_FIELDS = ["option", "card", "name", "label", "title", "buy", "relic", "potion", "bundle", "action"] as const;

const norm = (text: string): string => text.trim().toLowerCase();

/**
 * Map an answer that is not an option key to the key it names. DeepSeek sometimes answers with an
 * option's label ("沉溺") instead of its key ("o1"). The answer must equal (trimmed, case-insensitive)
 * a key, or a name field of exactly one option's criteria (or the whole criteria text when it is a plain
 * string); anything ambiguous or unmatched returns null so the caller keeps failing as before.
 */
export function resolveOptionKey(answer: string, criteria: Record<string, string | null>): string | null {
  if (answer in criteria) return answer;
  const wanted = norm(answer);
  if (!wanted) return null;
  const keys = Object.keys(criteria);
  const byKey = keys.filter((key) => norm(key) === wanted);
  if (byKey.length === 1) return byKey[0] ?? null;
  const matches = keys.filter((key) => {
    const text = criteria[key];
    if (typeof text !== "string") return false;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return norm(text) === wanted;
    }
    if (typeof parsed === "string") return norm(parsed) === wanted;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return false;
    const record = parsed as Record<string, unknown>;
    return OPTION_NAME_FIELDS.some((field) => typeof record[field] === "string" && norm(record[field] as string) === wanted);
  });
  return matches.length === 1 ? (matches[0] ?? null) : null;
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
  "memory.act is this act's threats and boss; memory.history is the run so far, floor by floor (floors already left);",
  "memory.this_floor is the current floor so far; state.facts, when present, is the exact current deck, relics, potions, HP and gold.",
  'Reply with JSON only: {"choice": "<one option key exactly as given>", "reason": "<max 25 words>"}',
].join(" ");

/** Thinking efforts the code sends (see DeepSeekConfig.reasoningEffort); anything else in a tier is ignored. */
const EFFORTS = new Set(["max", "high", "low", "off"]);

/**
 * Thinking output is the largest DeepSeek cost (Dai 2026-09-28): picks with a code value and few
 * options think at "high"; the run plan, route plan, shop, events, transform and enchant keep the
 * default (max). Re-asks share their question's label, so they get the same tier.
 */
export const DEFAULT_EFFORT_BY_LABEL = "reward/card=high,rest/choose=high,rest/plan=high,selection/upgrade=high,selection/remove=high,selection/add=high,bundle/choose=high";

/** "prefix=effort,…" as [prefix, effort] pairs, longest prefix first; unknown efforts are dropped. */
/**
 * The top-level JSON values in a reply, in order, when it is nothing but JSON values separated by
 * whitespace (DeepSeek sometimes sends two objects back to back); null when anything else is in it.
 */
export function jsonValues(content: string): unknown[] | null {
  const values: unknown[] = [];
  let i = 0;
  const n = content.length;
  while (i < n) {
    while (i < n && /\s/.test(content[i]!)) i += 1;
    if (i >= n) break;
    // One value: a balanced {...} / [...] (strings skipped), parsed on its own.
    const open = content[i];
    if (open !== "{" && open !== "[") return null;
    let depth = 0;
    let inString = false;
    let end = -1;
    for (let j = i; j < n; j += 1) {
      const c = content[j]!;
      if (inString) {
        if (c === "\\") j += 1;
        else if (c === '"') inString = false;
      } else if (c === '"') inString = true;
      else if (c === "{" || c === "[") depth += 1;
      else if (c === "}" || c === "]") {
        depth -= 1;
        if (depth === 0) {
          end = j + 1;
          break;
        }
      }
    }
    if (end < 0) return null;
    try {
      values.push(JSON.parse(content.slice(i, end)));
    } catch {
      return null;
    }
    i = end;
  }
  return values.length > 0 ? values : null;
}

/**
 * askJson's answer out of a reply. One object: that object. Several back to back (0B5Y F30 run-plan
 * review: `{"choice": "review", "reason": "run plan"}` then the plan): the free-form tasks (run plan,
 * fight plan) each ask for ONE object in their own format, never the per-decision {choice, reason}
 * reply the cached system prompt describes, so an object with only those keys is an echo of that format
 * and skipped; of the rest the LAST is taken (a model that restates its answer ends on the final one).
 * Anything that is not purely JSON objects still fails.
 */
export function pickJsonObject(content: string): Record<string, unknown> {
  const values = jsonValues(content);
  if (values === null) throw new Error(`DeepSeek returned non-JSON: ${content.slice(0, 120)}`);
  const objects = values.filter((value): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value));
  if (objects.length === 0) throw new Error("DeepSeek returned a non-object");
  if (objects.length === 1) return objects[0]!;
  const echo = (o: Record<string, unknown>) => Object.keys(o).length > 0 && Object.keys(o).every((key) => key === "choice" || key === "reason");
  const answers = objects.filter((o) => !echo(o));
  return answers[answers.length - 1] ?? objects[objects.length - 1]!;
}

export function parseEffortTiers(spec: string): [string, string][] {
  return spec
    .split(",")
    .map((entry) => entry.split("=").map((part) => part.trim()) as [string, string?])
    .filter((pair): pair is [string, string] => Boolean(pair[0]) && pair[1] !== undefined && EFFORTS.has(pair[1]))
    .sort((a, b) => b[0].length - a[0].length);
}

/** The thinking effort of a call with this label (" (re-ask)" suffix ignored). */
export function effortFor(label: string, config: Pick<DeepSeekConfig, "reasoningEffort" | "combatReasoningEffort" | "effortByLabel">): string {
  const base = config.reasoningEffort || "off";
  const name = label.replace(/ \(re-ask\)$/, "");
  if (name.startsWith("combat/") && config.combatReasoningEffort) return config.combatReasoningEffort;
  if (base === "off") return base;
  const tier = parseEffortTiers(config.effortByLabel ?? DEFAULT_EFFORT_BY_LABEL).find(([prefix]) => name.startsWith(prefix));
  return tier?.[1] ?? base;
}

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
    // Memory first (act block, append-only history, then the volatile parts), then this question: see deepseek-message.ts.
    const user = choiceMessage(state, instructions, criteria, memory);
    const messages: ChatMessage[] = [{ role: "user", content: user }];
    const done = await this.complete(messages, label);
    let first: ReturnType<DeepSeekClient["parseChoice"]>;
    try {
      first = this.parseChoice(done.content);
    } catch (error) {
      const detail = { choice: "", reason: "", reasoning: done.reasoning, content: done.content };
      throw new DeepSeekAnswerError(error instanceof Error ? error.message : String(error), detail, done.meta);
    }
    this.logReasoning(label, done, instructions, criteria, first.choice, first.rawReason, memory);
    // A one-shot option key is "option:card" (o1:c5); an answer that gives them apart ({"choice": "o1",
    // "cards": ["c5"]}) names the same option.
    const joined = first.cards?.length === 1 ? `${first.choice}:${first.cards[0]}` : "";
    const firstKey = resolveOptionKey(first.choice, criteria) ?? (joined in criteria ? joined : null);
    if (firstKey === null) {
      const detail = { choice: first.choice, reason: first.reason, reasoning: done.reasoning, content: done.content };
      throw new DeepSeekAnswerError(`DeepSeek chose unknown option "${first.choice}"`, detail, done.meta);
    }
    first.choice = firstKey;
    const firstCheck = checkConsistency(first.choice, first.reason, done.reasoning, criteria);
    if (firstCheck.ok) return { ...done.meta, choice: first.choice, reason: first.reason, ...cardsOf(first.cards) };

    // Suspect answer: ask once more, quoting the contradiction, in the same conversation.
    const firstRecord = consistencyAnswer(first.choice, first.reason, firstCheck);
    let second: ConsistencyRecord["second"];
    let secondCheck: ConsistencyCheck | null = null;
    let secondChoice = "";
    let secondReason = "";
    let secondCards: string[] | undefined;
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
      this.logReasoning(`${label} (re-ask)`, again, reaskMessage(first.choice, firstCheck), criteria, parsed.choice, parsed.rawReason, undefined);
      parsed.choice = resolveOptionKey(parsed.choice, criteria) ?? parsed.choice;
      secondChoice = parsed.choice;
      secondReason = parsed.reason;
      secondCards = parsed.cards;
      secondCheck = checkConsistency(parsed.choice, parsed.reason, again.reasoning, criteria);
      if (!(parsed.choice in criteria)) secondCheck = { ...secondCheck, ok: false, issues: [...secondCheck.issues, `unknown option "${parsed.choice}"`] };
      second = consistencyAnswer(secondChoice, secondReason, secondCheck);
    } catch (error) {
      second = { error: error instanceof Error ? error.message.slice(0, 200) : String(error) };
    }

    if (secondCheck?.ok) {
      return { ...meta, choice: secondChoice, reason: secondReason, ...cardsOf(secondCards), consistency: { first: firstRecord, second, resolution: "reasked", choice: secondChoice } };
    }
    // Still inconsistent: act on a reasoning conclusion that names exactly one option (the re-ask's first).
    const conclusions = [secondCheck?.conclusion ?? null, firstCheck.conclusion].filter((c): c is NonNullable<typeof c> => c !== null);
    const target = conclusions.find((c) => c.unambiguous && c.option in criteria) ?? null;
    const conflicting = conclusions.some((c) => c.unambiguous && target !== null && c.option !== target.option);
    if (target && !conflicting) {
      const reason = `reasoning concluded ${target.option}: ${target.line}`.slice(0, 200);
      const cards = target.option === secondChoice ? secondCards : target.option === first.choice ? first.cards : undefined;
      return { ...meta, choice: target.option, reason, ...cardsOf(cards), consistency: { first: firstRecord, second, resolution: "conclusion", choice: target.option } };
    }
    throw new DeepSeekInconsistentError(
      { first: firstRecord, second, resolution: "fallback", choice: "" },
      { calls, tokens: meta.inputTokens + meta.outputTokens },
    );
  }

  private parseChoice(content: string): { choice: string; reason: string; rawReason: unknown; cards?: string[] } {
    let parsed: { choice?: unknown; reason?: unknown; cards?: unknown };
    try {
      parsed = JSON.parse(content) as { choice?: unknown; reason?: unknown; cards?: unknown };
    } catch {
      throw new Error(`DeepSeek returned non-JSON: ${content.slice(0, 120)}`);
    }
    return {
      choice: typeof parsed.choice === "string" ? parsed.choice.trim() : "",
      reason: typeof parsed.reason === "string" ? parsed.reason.trim() : "",
      rawReason: parsed.reason,
      ...(Array.isArray(parsed.cards) ? { cards: parsed.cards.filter((card): card is string => typeof card === "string").map((card) => card.trim()) } : {}),
    };
  }

  /**
   * A one-shot plan (a shop's shopping list; BUILD_ONESHOT): the same message layout as `choose` (memory,
   * state, question, options), answered with one JSON object in the format the question describes. Returns
   * the parsed object; the caller validates it. An unparseable reply throws DeepSeekAnswerError.
   */
  async choosePlan(
    state: Record<string, JsonValue>,
    instructions: string,
    criteria: Record<string, string | null>,
    context: Record<string, JsonValue> = {},
  ): Promise<{ json: Record<string, unknown>; meta: Omit<DeepSeekAnswer, "choice" | "reason"> }> {
    const label = typeof context["label"] === "string" ? context["label"] : "";
    const memory = context["memory"];
    const done = await this.complete([{ role: "user", content: choiceMessage(state, instructions, criteria, memory) }], label);
    let json: Record<string, unknown>;
    try {
      json = pickJsonObject(done.content);
    } catch (error) {
      throw new DeepSeekAnswerError(error instanceof Error ? error.message : String(error), { choice: "", reason: "", reasoning: done.reasoning, content: done.content }, done.meta);
    }
    this.logReasoning(label, done, instructions, criteria, JSON.stringify(json["plan"] ?? null), json["reason"] ?? "", memory, json);
    return { json, meta: done.meta };
  }

  /**
   * One free-form JSON answer (the fight plan, FIGHT_PLAN=v1): same cached system prompt, the task and
   * its reply format in the user message. Returns the parsed object; the caller validates it.
   */
  async askJson(
    payload: Record<string, JsonValue>,
    label: string,
  ): Promise<{ json: Record<string, unknown>; meta: Omit<DeepSeekAnswer, "choice" | "reason"> }> {
    const done = await this.complete([{ role: "user", content: taskMessage(payload) }], label);
    const json = pickJsonObject(done.content);
    const memory = payload["memory"];
    this.logReasoning(label, done, typeof payload["task"] === "string" ? payload["task"] : label, {}, "", json["summary"] ?? "", memory, json);
    return { json, meta: done.meta };
  }

  private async complete(
    messages: ChatMessage[],
    label: string,
  ): Promise<CompletedCall> {
    const started = Date.now();
    const effort = effortFor(label, this.config);
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

  private logReasoning(label: string, call: CompletedCall, question: string, criteria: Record<string, string | null>, choice: string, reason: unknown, memory: JsonValue | undefined, answer?: unknown): void {
    if (!this.config.reasoningLog) return;
    try {
      mkdirSync(dirname(this.config.reasoningLog), { recursive: true });
      const { effort, reasoning, latencyMs, meta } = call;
      // Token usage of this one call (cache hit = the prefix DeepSeek had cached; billed much cheaper).
      const usage = { input_tokens: meta.inputTokens, cache_hit_tokens: meta.cacheHitTokens ?? 0, output_tokens: meta.outputTokens, reasoning_tokens: meta.reasoningTokens ?? 0 };
      const entry = { ts: new Date().toISOString(), model: this.config.model, label, effort, guide: this.guideId, latency_ms: latencyMs, usage, question, options: Object.keys(criteria), choice, reason, reasoning, ...(memory === undefined ? {} : { memory, memory_chars: contextChars(memory) }), ...(answer === undefined ? {} : { answer }) };
      appendFileSync(this.config.reasoningLog, `${JSON.stringify(entry)}\n`, "utf8");
    } catch {
      // logging must never break play
    }
  }
}

/** One finished chat completion: the answer text, the chain of thought and the call's usage. */
interface CompletedCall {
  content: string;
  reasoning: string;
  effort: string;
  latencyMs: number;
  meta: Omit<DeepSeekAnswer, "choice" | "reason">;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** `{cards}` when the answer named cards, else nothing (the answer object stays as before). */
function cardsOf(cards: string[] | undefined): { cards?: string[] } {
  return cards && cards.length > 0 ? { cards } : {};
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
