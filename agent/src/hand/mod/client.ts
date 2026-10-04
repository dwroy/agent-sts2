/**
 * HTTP transport for the STS2-Agent mod (PLAN.md §2.1).
 *
 * Responsibilities: build URLs, apply a timeout, unwrap the `{ ok, request_id, data | error }`
 * envelope, and turn every failure into one of three typed errors. It deliberately contains no game
 * semantics — callers decide what a payload means.
 */

import {
  parseActionResult,
  parseAvailableActions,
  parseEnvelope,
  parseGameState,
  parseHealth,
  type ActionResult,
  type AvailableActions,
  type GameState,
  type Health,
  type Sts2ErrorPayload,
} from "./schema.js";
import type { ActionExpect } from "../act/identity.js";

/** Body of `POST /action`. Only the fields a given action needs should be set. */
export interface ActionRequest {
  action: string;
  card_index?: number;
  target_index?: number;
  option_index?: number;
  x?: number;
  y?: number;
  tool?: string;
  command?: string;
  player_id?: string;
  /**
   * Not sent (act/dispatch.ts strips it): what the indices pointed at when the action was decided, checked by
   * the execution gate on the freshest state (act/identity.ts).
   */
  expect?: ActionExpect;
}

/** The mod is not listening, or the connection broke mid-flight. Usually retryable. */
export class ModUnreachableError extends Error {
  readonly url: string;
  readonly reason: string;

  constructor(url: string, reason: string, options?: { cause?: unknown }) {
    super(`cannot reach the STS2-Agent mod at ${url}: ${reason}`, options);
    this.name = "ModUnreachableError";
    this.url = url;
    this.reason = reason;
  }
}

/** The mod answered `ok: false` (or an HTTP error) with a structured error payload. */
export class ModResponseError extends Error {
  readonly url: string;
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number | null;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(
    url: string,
    payload: Sts2ErrorPayload,
    meta: { status: number | null; requestId: string | null },
  ) {
    super(`${payload.code}: ${payload.message}`);
    this.name = "ModResponseError";
    this.url = url;
    this.code = payload.code;
    this.retryable = payload.retryable;
    this.status = meta.status;
    this.details = payload.details;
    this.requestId = meta.requestId;
  }
}

/** The response was not the documented envelope/form at all (proxy, wrong port, HTML page, …). */
export class ModProtocolError extends Error {
  readonly url: string;
  readonly status: number | null;
  readonly bodySnippet: string;

  constructor(url: string, message: string, meta: { status?: number | null; bodySnippet?: string } = {}) {
    super(`${url}: ${message}`);
    this.name = "ModProtocolError";
    this.url = url;
    this.status = meta.status ?? null;
    this.bodySnippet = meta.bodySnippet ?? "";
  }
}

export interface ModClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
}

function describeFetchFailure(error: unknown): string {
  const name = typeof error === "object" && error !== null ? (error as { name?: unknown }).name : undefined;
  if (name === "TimeoutError") return "the request timed out";
  if (name === "AbortError") return "the request was aborted";
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : null;
  return cause && !message.includes(cause) ? `${message} (${cause})` : message;
}

export class ModClient {
  readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ModClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  withBaseUrl(baseUrl: string): ModClient {
    return new ModClient({ baseUrl, timeoutMs: this.timeoutMs, fetchImpl: this.fetchImpl });
  }

  health(options: { timeoutMs?: number } = {}): Promise<Health> {
    return this.request("/health", parseHealth, options);
  }

  state(): Promise<GameState> {
    return this.request("/state", parseGameState);
  }

  availableActions(): Promise<AvailableActions> {
    return this.request("/actions/available", parseAvailableActions);
  }

  /** `GET /data/{collection}` returns a bare array (verified against a live mod). */
  collection(name: string): Promise<unknown[]> {
    return this.request(`/data/${name}`, (data) => (Array.isArray(data) ? data : []));
  }

  act(intent: ActionRequest): Promise<ActionResult> {
    return this.request("/action", parseActionResult, { method: "POST", body: intent });
  }

  private async request<T>(
    path: string,
    parse: (data: unknown) => T,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const hasBody = options.body !== undefined;

    let status: number;
    let text: string;
    try {
      const response = await this.fetchImpl(url, {
        method: options.method ?? "GET",
        headers: hasBody
          ? { accept: "application/json", "content-type": "application/json" }
          : { accept: "application/json" },
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
      status = response.status;
      text = await response.text();
    } catch (error) {
      throw new ModUnreachableError(url, describeFetchFailure(error), { cause: error });
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new ModProtocolError(url, "response body was not JSON", { status, bodySnippet: text.slice(0, 200) });
    }

    const envelope = parseEnvelope(json);
    if (!envelope.ok) {
      const payload: Sts2ErrorPayload = envelope.error ?? {
        code: "unknown_error",
        message: `HTTP ${status} with no error payload`,
        details: null,
        retryable: status >= 500,
      };
      throw new ModResponseError(url, payload, { status, requestId: envelope.request_id });
    }
    return parse(envelope.data);
  }
}

/** Convenience for callers that only need one probe. */
export function isRetryableModError(error: unknown): boolean {
  if (error instanceof ModUnreachableError) return true;
  if (error instanceof ModResponseError) return error.retryable;
  return false;
}
