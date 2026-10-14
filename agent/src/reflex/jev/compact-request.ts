import { classifyJevError } from "./client.js";
import type { QuestionSet } from "./questions.js";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface CompactJevRequest {
  state: Record<string, unknown>;
  questions: QuestionSet;
  encoding: {
    kind: "shared-json-values-v1" | "shared-json-values-v2";
    stateKey: string;
    refKey: string;
    originalBytes: number;
    encodedBytes: number;
    definitions: number;
    shapeKey?: string;
    valueKey?: string;
    shapeDefinitions?: number;
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

/** Factor exact repeated values and object key sequences; never prune options, round numbers or summarize text. */
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
  const shapeKey = uniqueKey("__js_");
  const valueKey = uniqueKey("__jv_");
  const parsed = new Map<string, Map<string, Json>>();
  const counts = new Map<string, number>();
  const shapeCounts = new Map<string, number>();
  const visit = (value: Json): void => {
    const key = JSON.stringify(value);
    // The rejected request is limited in bytes/tokens, not UTF-16 character count.
    if (Buffer.byteLength(key) >= 64) counts.set(key, (counts.get(key) ?? 0) + 1);
    if (Array.isArray(value)) value.forEach(visit);
    else if (value !== null && typeof value === "object") {
      const keys = JSON.stringify(Object.keys(value));
      if (Buffer.byteLength(keys) >= 64) shapeCounts.set(keys, (shapeCounts.get(keys) ?? 0) + 1);
      Object.values(value).forEach(visit);
    }
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
  const shapeNames = new Map<string, string>();
  const shapes: Record<string, string[]> = Object.create(null) as Record<string, string[]>;
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
      const entries = Object.entries(value).map(([k, item]) => [k, encode(item)] as const);
      const plain = Object.fromEntries(entries);
      const keys = JSON.stringify(entries.map(([k]) => k));
      if ((shapeCounts.get(keys) ?? 0) > 1) {
        const name = shapeNames.get(keys) ?? `s${shapeNames.size}`;
        const packed = { [shapeKey]: name, [valueKey]: entries.map(([, item]) => item) };
        if (Buffer.byteLength(JSON.stringify(packed)) < Buffer.byteLength(JSON.stringify(plain))) {
          if (!shapeNames.has(keys)) {
            shapeNames.set(keys, name);
            shapes[name] = entries.map(([k]) => k);
          }
          return packed;
        }
      }
      return plain;
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
  if (names.size === 0 && shapeNames.size === 0) return null;
  const encodedState = {
    ...state,
    [stateKey]: {
      instruction: `无损编码说明：选项JSON里仅含“${refKey}”的对象引用本表values中的同名值。${shapeNames.size ? `仅含“${shapeKey}”和“${valueKey}”的对象，以shapes中同名键列表与值数组按位置一一组装；字段顺序保持。` : ""}请先递归展开再理解；它与原值完全相同，不是缺失、预测或新事实。选项顺序、含义和全部数值不变。`,
      values: definitions,
      ...(shapeNames.size ? { shapes } : {}),
    },
  };
  const originalBytes = Buffer.byteLength(original);
  const encodedBytes = Buffer.byteLength(JSON.stringify({ state: encodedState, questions: encodedQuestions }));
  // The retry must materially shrink the request; a marginal rewrite cannot address the rejection.
  if (encodedBytes >= originalBytes * 0.9) return null;
  return { state: encodedState, questions: encodedQuestions, encoding: {
    kind: shapeNames.size ? "shared-json-values-v2" : "shared-json-values-v1", stateKey, refKey, originalBytes, encodedBytes, definitions: names.size,
    ...(shapeNames.size ? { shapeKey, valueKey, shapeDefinitions: shapeNames.size } : {}),
  } };
}
