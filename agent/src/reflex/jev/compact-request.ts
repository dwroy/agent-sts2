import { classifyJevError } from "./client.js";
import type { QuestionSet } from "./questions.js";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface CompactJevRequest {
  state: Record<string, unknown>;
  questions: QuestionSet;
  encoding: {
    kind: "shared-json-values-v1";
    stateKey: string;
    refKey: string;
    originalBytes: number;
    encodedBytes: number;
    definitions: number;
  };
}

/** Only the observed context rejection permits a differently encoded retry. */
export function isJevContextLimitError(error: unknown): boolean {
  const failure = classifyJevError(error);
  if (failure.status !== 400) return false;
  try {
    const body = JSON.parse(failure.message.slice(failure.message.indexOf("{"))) as { detail?: { error_type?: unknown } };
    return body.detail?.error_type === "max_tokens_exceeded";
  } catch {
    return false;
  }
}

/** Factor exact repeated JSON values; never prune options, round numbers or summarize text. */
export function compactJevRequest(state: unknown, questions: QuestionSet): CompactJevRequest | null {
  if (state === null || typeof state !== "object" || Array.isArray(state)) return null;
  const original = JSON.stringify({ state, questions });
  const uniqueKey = (stem: string): string => {
    let index = 0;
    while (original.includes(`${stem}${index}`)) index += 1;
    return `${stem}${index}`;
  };
  const stateKey = uniqueKey("__jev_shared_");
  const refKey = uniqueKey("__jev_ref_");
  const parsed = new Map<string, Map<string, Json>>();
  const counts = new Map<string, number>();
  const visit = (value: Json): void => {
    const key = JSON.stringify(value);
    if (key.length >= 160) counts.set(key, (counts.get(key) ?? 0) + 1);
    if (Array.isArray(value)) value.forEach(visit);
    else if (value !== null && typeof value === "object") Object.values(value).forEach(visit);
  };
  for (const [id, question] of Object.entries(questions)) {
    if (question.type !== "choice") continue;
    const options = new Map<string, Json>();
    for (const [option, text] of Object.entries(question.criteria)) {
      if (text === null) continue;
      try {
        const value = JSON.parse(text) as Json;
        // Plain prose and JSON scalar criteria keep their original wire representation.
        if (value === null || typeof value !== "object") continue;
        options.set(option, value);
        visit(value);
      } catch { /* Non-JSON criteria remain byte-for-byte unchanged. */ }
    }
    parsed.set(id, options);
  }
  const names = new Map<string, string>();
  const definitions: Record<string, Json> = Object.create(null) as Record<string, Json>;
  const encode = (value: Json, definition = false): Json => {
    const key = JSON.stringify(value);
    if (!definition && (counts.get(key) ?? 0) > 1) {
      let name = names.get(key);
      if (name === undefined) {
        name = `v${names.size}`;
        names.set(key, name);
        definitions[name] = encode(value, true);
      }
      return { [refKey]: name };
    }
    if (Array.isArray(value)) return value.map((item) => encode(item));
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, item]) => [k, encode(item)]));
    }
    return value;
  };
  const encodedQuestions: QuestionSet = Object.fromEntries(Object.entries(questions).map(([id, question]) => {
    if (question.type !== "choice") return [id, question];
    const options = parsed.get(id)!;
    return [id, { ...question, criteria: Object.fromEntries(Object.entries(question.criteria).map(([option, text]) => [
      option, options.has(option) ? JSON.stringify(encode(options.get(option)!)) : text,
    ])) }];
  }));
  if (names.size === 0) return null;
  const encodedState = {
    ...state,
    [stateKey]: {
      instruction: `无损编码说明：选项JSON里仅含“${refKey}”的对象是本表values中同名值的引用；请先递归展开再理解。它与原值完全相同，不是缺失、预测或新事实。选项顺序、含义和全部数值不变。`,
      values: definitions,
    },
  };
  const originalBytes = Buffer.byteLength(original);
  const encodedBytes = Buffer.byteLength(JSON.stringify({ state: encodedState, questions: encodedQuestions }));
  // The retry must materially shrink the request; a marginal rewrite cannot address the rejection.
  if (encodedBytes >= originalBytes * 0.9) return null;
  return { state: encodedState, questions: encodedQuestions, encoding: {
    kind: "shared-json-values-v1", stateKey, refKey, originalBytes, encodedBytes, definitions: names.size,
  } };
}
