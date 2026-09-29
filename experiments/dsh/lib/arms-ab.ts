/**
 * Arms A and B.
 *
 * A: the live client (src/llm/deepseek.ts, JSON mode) called exactly as the loop calls it: choose() for option
 *    questions (with its label->key mapping, consistency re-ask and reasoning conclusion), then the loop's
 *    recoverFrom() on an unusable answer; choosePlan() for the shop list; askJson() for the run plan. Every HTTP
 *    call it makes is recorded by a fetch wrapper (content, finish_reason, usage).
 * B: strict tool calling on https://api.deepseek.com/beta: one tool per question kind (`strict: true`, the
 *    question's JSON Schema), thinking at the label's effort. tool_choice stays default (auto): thinking mode
 *    rejects "required" and a named tool (probe 2026-09-29). An invalid or missing call gets ONE repair turn in
 *    the same conversation (tool result with the exact error and the valid values).
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { DeepSeekAnswerError, DeepSeekClient, DeepSeekInconsistentError, pickJsonObject } from "../../../src/llm/deepseek.js";
import { choiceMessage, taskMessage } from "../../../src/llm/deepseek-message.js";
import type { JsonValue } from "../../../src/util/json.js";
import type { AnswerSpec } from "./spec.js";
import { repairText, validate, type Verdict } from "./validate.js";

export interface CallRecord {
  latency_ms: number;
  status: number;
  finish_reason: string | null;
  content: string;
  reasoning_chars: number;
  reasoning_tail: string;
  tool_calls: { name: string; arguments: string }[];
  prompt_tokens: number;
  completion_tokens: number;
  cache_hit_tokens: number;
  reasoning_tokens: number;
  error?: string;
}

export interface Question {
  id: string;
  label: string;
  kind: "pick" | "shop-plan" | "run-plan";
  effort: string;
  user_message: string;
  criteria: Record<string, string | null>;
  spec: AnswerSpec;
}

export const TAIL = (tool: string): string =>
  `\n\nAnswer by calling the tool ${tool} with your answer as its arguments (the same fields the question asks for); do not write the answer as text.`;

/* ---------------- fetch recording (arm A goes through the live client's own fetch) ---------------- */

const recorder = new AsyncLocalStorage<CallRecord[]>();
const realFetch = globalThis.fetch;
globalThis.fetch = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> => {
  const sink = recorder.getStore();
  if (!sink) return realFetch(input, init);
  const started = Date.now();
  try {
    const response = await realFetch(input, init);
    const text = await response.text();
    sink.push(parseCall(text, response.status, Date.now() - started));
    return new Response(text, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch (error) {
    sink.push({ ...emptyCall(Date.now() - started, 0), error: error instanceof Error ? error.message.slice(0, 200) : String(error) });
    throw error;
  }
};

function emptyCall(latency: number, status: number): CallRecord {
  return { latency_ms: latency, status, finish_reason: null, content: "", reasoning_chars: 0, reasoning_tail: "", tool_calls: [], prompt_tokens: 0, completion_tokens: 0, cache_hit_tokens: 0, reasoning_tokens: 0 };
}

function parseCall(text: string, status: number, latency: number): CallRecord {
  const call = emptyCall(latency, status);
  try {
    const payload = JSON.parse(text) as {
      choices?: { finish_reason?: string; message?: { content?: string; reasoning_content?: string; tool_calls?: { function?: { name?: string; arguments?: string } }[] } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_cache_hit_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
      error?: { message?: string };
    };
    const choice = payload.choices?.[0];
    const reasoning = choice?.message?.reasoning_content ?? "";
    call.finish_reason = choice?.finish_reason ?? null;
    call.content = choice?.message?.content ?? "";
    call.reasoning_chars = reasoning.length;
    call.reasoning_tail = reasoning.slice(-600);
    call.tool_calls = (choice?.message?.tool_calls ?? []).map((tc) => ({ name: tc.function?.name ?? "", arguments: tc.function?.arguments ?? "" }));
    call.prompt_tokens = payload.usage?.prompt_tokens ?? 0;
    call.completion_tokens = payload.usage?.completion_tokens ?? 0;
    call.cache_hit_tokens = payload.usage?.prompt_cache_hit_tokens ?? 0;
    call.reasoning_tokens = payload.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
    if (payload.error?.message) call.error = payload.error.message.slice(0, 300);
  } catch {
    call.error = `unparseable HTTP body (${text.length} bytes)`;
    call.content = text.slice(0, 300);
  }
  return call;
}

/* ---------------- raw parsing ---------------- */

export interface Parsed {
  /** The answer object, when the reply held one. */
  answer: Record<string, unknown> | null;
  /** Why no object could be read: empty, truncated, not_json, multiple_objects, no_tool_call, malformed_arguments. */
  parse_error: string | null;
  verdict: Verdict | null;
}

/** Strict reading of a JSON-mode reply, before any recovery: exactly one JSON object. */
export function parseStrict(content: string, finish: string | null, spec: AnswerSpec): Parsed {
  if (!content.trim()) return { answer: null, parse_error: finish === "length" ? "empty_truncated" : "empty", verdict: null };
  try {
    const value = JSON.parse(content) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return { answer: null, parse_error: "not_object", verdict: null };
    return { answer: value as Record<string, unknown>, parse_error: null, verdict: validate(value, spec) };
  } catch {
    let multiple = false;
    try {
      pickJsonObject(content);
      multiple = true;
    } catch {
      // not several objects either
    }
    return { answer: null, parse_error: multiple ? "multiple_objects" : finish === "length" ? "truncated" : "not_json", verdict: null };
  }
}

/* ---------------- arm A ---------------- */

export interface ArmResult {
  calls: CallRecord[];
  raw: Parsed;
  /** The answer the arm ends with after its own recovery (null: it fails / falls back). */
  final: Record<string, unknown> | null;
  final_verdict: Verdict | null;
  /** How the final answer was reached: first, mapped (label->key), reasked, conclusion, recovered, repaired, retried, none. */
  path: string;
  error?: string;
  notes?: string[];
}

export async function runArmA(client: DeepSeekClient, q: Question): Promise<ArmResult> {
  const calls: CallRecord[] = [];
  const notes: string[] = [];
  const out = await recorder.run(calls, async (): Promise<Omit<ArmResult, "calls" | "raw">> => {
    const msg = JSON.parse(q.user_message) as Record<string, JsonValue>;
    try {
      if (q.kind === "run-plan") {
        if (taskMessage(msg) !== q.user_message) notes.push("rebuilt run-plan message differs from the dataset's");
        const { json } = await client.askJson(msg, q.label);
        return { final: json, final_verdict: validate(json, q.spec), path: "first" };
      }
      const state = msg["state"] as Record<string, JsonValue>;
      const question = String(msg["question"]);
      const options = msg["options"] as Record<string, string | null>;
      const memory = msg["memory"];
      if (choiceMessage(state, question, options, memory) !== q.user_message) notes.push("rebuilt choice message differs from the dataset's");
      const context = { label: q.label, ...(memory === undefined ? {} : { memory }) } as Record<string, JsonValue>;
      if (q.kind === "shop-plan") {
        const { json } = await client.choosePlan(state, question, options, context);
        return { final: json, final_verdict: validate(json, q.spec), path: "first" };
      }
      const answer = await client.choose(state, question, options, context);
      const final: Record<string, unknown> = { choice: answer.choice, reason: answer.reason };
      if (answer.route) final["route"] = answer.route;
      if (answer.routeReason) final["route_reason"] = answer.routeReason;
      if (answer.cards) final["cards"] = answer.cards;
      const path = answer.consistency ? (answer.consistency.resolution === "reasked" ? "reasked" : "conclusion") : "first";
      return { final, final_verdict: validate(final, q.spec), path };
    } catch (error) {
      if (error instanceof DeepSeekAnswerError && q.kind === "pick") {
        // The loop's next step (loop.ts): the option its reasoning concluded on, when exactly one.
        const recovered = error.recoverFrom(q.criteria);
        if (recovered) {
          const final: Record<string, unknown> = { choice: recovered.option, reason: `(recovered from reasoning) ${recovered.line}`.slice(0, 200) };
          return { final, final_verdict: validate(final, q.spec), path: "recovered", error: error.message.slice(0, 200) };
        }
        return { final: null, final_verdict: null, path: "none", error: error.message.slice(0, 200) };
      }
      if (error instanceof DeepSeekInconsistentError) return { final: null, final_verdict: null, path: "none", error: error.message.slice(0, 200) };
      return { final: null, final_verdict: null, path: "none", error: error instanceof Error ? error.message.slice(0, 200) : String(error) };
    }
  });
  const first = calls[0];
  const raw = first ? parseStrict(first.content, first.finish_reason, q.spec) : { answer: null, parse_error: "no_call", verdict: null };
  // A choice that only the label->key mapping (or the o1+cards join) made valid.
  let path = out.path;
  if (path === "first" && q.kind === "pick" && raw.answer && typeof raw.answer["choice"] === "string" && out.final && raw.answer["choice"] !== out.final["choice"]) path = "mapped";
  return { calls, raw, ...out, path, ...(notes.length ? { notes } : {}) };
}

/* ---------------- arm B ---------------- */

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  reasoning_content?: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export async function runArmB(opts: { apiKey: string; system: string; q: Question; timeoutMs: number; repairs: number; rawDir?: string }): Promise<ArmResult> {
  const { q } = opts;
  const tool = { type: "function", function: { name: q.spec.toolName, description: q.spec.toolDescription, strict: true, parameters: q.spec.schema } };
  const messages: ChatMessage[] = [
    { role: "system", content: opts.system },
    { role: "user", content: q.user_message + TAIL(q.spec.toolName) },
  ];
  const calls: CallRecord[] = [];
  let raw: Parsed | null = null;
  let current: Parsed | null = null;
  let path = "first";
  for (let attempt = 0; attempt <= opts.repairs; attempt += 1) {
    const { call, message, text } = await post(opts.apiKey, q, messages, [tool], opts.timeoutMs);
    if (opts.rawDir) writeFileSync(join(opts.rawDir, `B-${attempt}.json`), text);
    calls.push(call);
    if (call.error && call.status !== 200) {
      current = { answer: null, parse_error: `http_${call.status}`, verdict: null };
      raw ??= current;
      break;
    }
    const tc = (message?.tool_calls ?? []) as { id: string; function: { name: string; arguments: string } }[];
    const mine = tc.find((c) => c.function?.name === q.spec.toolName) ?? tc[0];
    if (!mine) {
      current = { answer: null, parse_error: call.finish_reason === "length" ? "truncated" : "no_tool_call", verdict: null };
    } else {
      try {
        const args = JSON.parse(mine.function.arguments) as unknown;
        const answer = args && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : null;
        current = answer ? { answer, parse_error: null, verdict: validate(answer, q.spec) } : { answer: null, parse_error: "not_object", verdict: null };
      } catch {
        current = { answer: null, parse_error: "malformed_arguments", verdict: null };
      }
    }
    raw ??= current;
    if (current.verdict?.ok) {
      if (attempt > 0) path = "repaired";
      break;
    }
    if (attempt === opts.repairs) break;
    // One repair turn: the assistant turn as given (reasoning_content must go back with tools), then the error.
    messages.push({ role: "assistant", content: message?.content ?? "", reasoning_content: message?.reasoning_content ?? "", ...(tc.length ? { tool_calls: tc } : {}) });
    if (tc.length > 0) {
      for (const c of tc) {
        const text =
          c !== mine
            ? "Ignored: submit exactly one call."
            : current.parse_error === "malformed_arguments"
              ? `Your arguments were not valid JSON. Call ${q.spec.toolName} again with valid JSON arguments.`
              : current.verdict
                ? repairText(current.verdict, q.spec)
                : `Invalid call. Call ${q.spec.toolName} again.`;
        messages.push({ role: "tool", tool_call_id: c.id, content: text });
      }
    } else {
      messages.push({ role: "user", content: `You did not call the tool. Call ${q.spec.toolName} now with your answer as its arguments; do not answer in text.` });
    }
  }
  const ok = current?.verdict?.ok ?? false;
  return { calls, raw: raw!, final: ok ? current!.answer : null, final_verdict: current?.verdict ?? null, path: ok ? path : "none" };
}

async function post(apiKey: string, q: Question, messages: ChatMessage[], tools: unknown[], timeoutMs: number): Promise<{ call: CallRecord; text: string; message: { content?: string; reasoning_content?: string; tool_calls?: unknown[] } | null }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const thinking = q.effort !== "off";
  try {
    const response = await realFetch("https://api.deepseek.com/beta/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-flash",
        ...(thinking ? { thinking: { type: "enabled" }, reasoning_effort: q.effort } : { thinking: { type: "disabled" }, temperature: 0 }),
        messages,
        tools,
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    const call = parseCall(text, response.status, Date.now() - started);
    let message = null;
    try {
      message = (JSON.parse(text) as { choices?: { message?: { content?: string; reasoning_content?: string; tool_calls?: unknown[] } }[] }).choices?.[0]?.message ?? null;
    } catch {
      message = null;
    }
    return { call, message, text };
  } catch (error) {
    return { call: { ...emptyCall(Date.now() - started, 0), error: error instanceof Error ? error.message.slice(0, 200) : String(error) }, message: null, text: "" };
  } finally {
    clearTimeout(timer);
  }
}
