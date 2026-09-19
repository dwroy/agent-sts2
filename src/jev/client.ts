/**
 * Thin wrapper around `@typesafe-ai/sdk` (PLAN.md §2.2).
 *
 * M0 only needs two things from it: a cheap authenticated call (`GET /v1/models`) and one live
 * `noul` question, so `doctor` proves the credential and the network path without touching the game.
 * The full state/question plumbing arrives with the decision layer (M2).
 */

import { TypeSafeClient, noul } from "@typesafe-ai/sdk";

import { readAnswers, type AnswerSet } from "./answers.js";
import type { QuestionSet } from "./questions.js";

export type JevFailureKind = "auth" | "permission" | "validation" | "rate_limit" | "server" | "connection" | "unknown";

export class JevError extends Error {
  readonly kind: JevFailureKind;
  readonly status: number | null;
  readonly hint: string;

  constructor(kind: JevFailureKind, message: string, options: { status?: number | null; hint?: string; cause?: unknown } = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "JevError";
    this.kind = kind;
    this.status = options.status ?? null;
    this.hint = options.hint ?? "";
  }
}

export interface JevClientOptions {
  apiKey: string;
  baseUrl?: string | null;
  model: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface JevSmokeResult {
  model: string;
  /** Should be close to 1: the state provably contains the word being asked about. */
  answer: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface JevAskResult {
  model: string;
  answers: AnswerSet;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** `x-typesafe-request-id`, for quoting to TypeSafe support when a call looks wrong. */
  requestId: string | null;
}

function statusOf(error: unknown): number | null {
  if (typeof error === "object" && error !== null) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}

export function classifyJevError(error: unknown): JevError {
  if (error instanceof JevError) return error;
  const status = statusOf(error);
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  const cause =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";

  const asJevError = (kind: JevFailureKind, hint: string): JevError =>
    new JevError(kind, message, { status, hint, cause: error });

  if (status === 401) {
    return asJevError("auth", "the API key was rejected — check TYPESAFE_API_KEY or create a key at https://console.typesafe.ai/settings/keys");
  }
  if (status === 403) {
    return asJevError("permission", "the key is valid but not allowed to call this endpoint");
  }
  if (status === 422) {
    return asJevError("validation", "TypeSafe rejected the request body — check the question definitions");
  }
  if (status === 429) {
    return asJevError("rate_limit", "rate limited (the SDK already retried with backoff) — lower the decision cadence");
  }
  if (status === 529 || (status !== null && status >= 500)) {
    return asJevError("server", "TypeSafe is overloaded or failing — retry shortly");
  }
  if (
    name.includes("Connection") ||
    name.includes("Timeout") ||
    /fetch failed|ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|socket hang up/i.test(`${message} ${cause}`)
  ) {
    return asJevError("connection", "check network access to TYPESAFE_BASE_URL and any proxy settings");
  }
  return asJevError("unknown", "unexpected TypeSafe SDK failure");
}

function readTokens(usage: unknown): { inputTokens: number; outputTokens: number } {
  const obj = typeof usage === "object" && usage !== null ? (usage as Record<string, unknown>) : {};
  const pick = (...keys: string[]): number => {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "number") return value;
    }
    return 0;
  };
  return { inputTokens: pick("input_tokens", "inputTokens"), outputTokens: pick("output_tokens", "outputTokens") };
}

export class JevClient {
  readonly model: string;
  private readonly client: TypeSafeClient;

  constructor(options: JevClientOptions) {
    this.model = options.model;
    this.client = new TypeSafeClient({
      apiKey: options.apiKey,
      ...(options.baseUrl ? { baseURL: options.baseUrl } : {}),
      defaultModel: options.model,
      timeout: options.timeoutMs ?? 20_000,
      retry: { maxRetries: options.maxRetries ?? 2 },
      logLevel: "warn",
    });
  }

  /** Authenticated call that proves the key works without spending a real request. */
  async listModels(): Promise<string[]> {
    const result = await this.call(async () => this.client.models.list());
    const list = Array.isArray(result)
      ? result
      : typeof result === "object" && result !== null && Array.isArray((result as { models?: unknown }).models)
        ? ((result as { models: unknown[] }).models as unknown[])
        : [];
    return list
      .map((entry) =>
        typeof entry === "string"
          ? entry
          : typeof entry === "object" && entry !== null && typeof (entry as { name?: unknown }).name === "string"
            ? (entry as { name: string }).name
            : null,
      )
      .filter((name): name is string => name !== null);
  }

  /**
   * One question whose answer is knowable from the state alone. A sane model returns ~1.0; a
   * near-zero answer means the request reached a different service or the wrong model.
   */
  async smoke(): Promise<JevSmokeResult> {
    const started = Date.now();
    const result = await this.call(async () =>
      this.client.systemOne({
        model: this.model,
        state: {
          check: "connectivity",
          note: "Health check for a Slay the Spire 2 agent. No game state is involved.",
        },
        questions: {
          reachable: noul("Does the state contain the word 'connectivity'?"),
        },
      }),
    );
    const usage = readTokens((result as { usage?: unknown }).usage);
    return {
      model: (result as { model?: string }).model ?? this.model,
      answer: result.answers.reachable.noul,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs: Date.now() - started,
    };
  }

  /**
   * Ask a set of typed questions about one state.
   *
   * The SDK's generic inference is bypassed here on purpose: the decision layer builds question
   * objects structurally and reads the answers defensively, so an SDK type change cannot silently
   * alter what we send (and the exact request body is what gets written to the decision log).
   */
  async ask(state: unknown, questions: QuestionSet, timeoutMs?: number): Promise<JevAskResult> {
    interface RawResult {
      answers?: unknown;
      model?: string;
      usage?: unknown;
    }
    // `.withResponse()` also hands back the request id; the docs are explicit that the caller must
    // not both await the parsed result and read the body, so everything comes from this one promise.
    const call = this.client.systemOne.bind(this.client) as unknown as (
      request: { model?: string; state: unknown; questions: QuestionSet },
      options?: { timeout?: number },
    ) => { withResponse(): Promise<{ data: RawResult; requestId?: string }> };

    const started = Date.now();
    const { data: result, requestId } = await this.call(() =>
      call({ model: this.model, state, questions }, timeoutMs === undefined ? {} : { timeout: timeoutMs }).withResponse(),
    );
    const usage = readTokens(result.usage);
    return {
      model: result.model ?? this.model,
      answers: readAnswers(result.answers),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs: Date.now() - started,
      requestId: requestId ?? null,
    };
  }

  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw classifyJevError(error);
    }
  }
}
