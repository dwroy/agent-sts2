import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { askJevLogged, type JevPromptMeta, type JevPromptRecord } from "../src/eye/jev-prompt-log.js";
import { compactJevRequest, isJevContextLimitError, type CompactJevRequest } from "../src/reflex/jev/compact-request.js";
import { JevError, type JevAskResult } from "../src/reflex/jev/client.js";
import type { QuestionSet } from "../src/reflex/jev/questions.js";

const fixture = JSON.parse(readFileSync(new URL("./jev-context-limit-request.json", import.meta.url), "utf8")) as {
  model: string; state: Record<string, unknown>; questions: QuestionSet;
};
const meta: JevPromptMeta = { decisionId: "fixed-context-limit", runId: "16UDD0430SXT", floor: 48, turn: 1,
  fingerprint: "fixed", observedTs: "2026-10-12T09:21:39.904Z", label: "combat/plan-choice", jevContext: "v1", call: "ask" };
const failure = () => new JevError("unknown", '400 {"detail":{"error_type":"max_tokens_exceeded"}}', { status: 400 });
const answer: JevAskResult = { model: fixture.model, answers: {
  plan: { type: "choice", choice: "plan2", confidence: 0.75, probabilities: { plan2: 0.75 }, raw: {} },
}, inputTokens: 4_000, outputTokens: 42, latencyMs: 9, requestId: "fixed-request" };

function expanded(compact: CompactJevRequest): QuestionSet {
  const table = compact.state[compact.encoding.stateKey] as { values: Record<string, unknown>; shapes?: Record<string, string[]> };
  const expand = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(expand);
    if (value !== null && typeof value === "object") {
      const object = value as Record<string, unknown>;
      if (Object.keys(object).length === 1 && compact.encoding.refKey in object) {
        const key = object[compact.encoding.refKey] as string;
        expect(Object.hasOwn(table.values, key)).toBe(true);
        return expand(table.values[key]);
      }
      const { shapeKey, valueKey } = compact.encoding;
      if (shapeKey && valueKey && Object.keys(object).length === 2 && shapeKey in object && valueKey in object) {
        const keys = table.shapes![object[shapeKey] as string]!;
        const values = object[valueKey] as unknown[];
        expect(keys).toHaveLength(values.length);
        return Object.fromEntries(keys.map((key, i) => [key, expand(values[i])]));
      }
      return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, expand(item)]));
    }
    return value;
  };
  return Object.fromEntries(Object.entries(compact.questions).map(([id, question]) => {
    if (question.type !== "choice") return [id, question];
    return [id, { ...question, criteria: Object.fromEntries(Object.entries(question.criteria).map(([option, text]) => {
      if (text === null) return [option, text];
      try { return [option, JSON.stringify(expand(JSON.parse(text)))]; } catch { return [option, text]; }
    })) }];
  }));
}

describe("bounded Jev context-limit recovery", () => {
  it("preserves all 11 recorded options and every nested fact while reducing the rejected body", () => {
    const before = JSON.stringify(fixture);
    const compact = compactJevRequest(fixture.state, fixture.questions)!;
    expect(compact).not.toBeNull();
    expect(compact.encoding.encodedBytes).toBeLessThan(compact.encoding.originalBytes * 0.8);
    expect(expanded(compact)).toEqual(fixture.questions);
    expect(Object.keys((compact.questions["plan"] as { criteria: object }).criteria)).toEqual(
      Object.keys((fixture.questions["plan"] as { criteria: object }).criteria),
    );
    for (const [key, value] of Object.entries(fixture.state)) expect(compact.state[key]).toEqual(value);
    expect(JSON.stringify(fixture)).toBe(before);
  });

  it("does not collide with existing fields or lose null, false, zero, arrays or plain criteria", () => {
    const shared = { text: "固定资料。".repeat(100), missing: null, valid: false, amount: 0, list: [0, false, null] };
    const questions: QuestionSet = { pick: { type: "choice", instructions: "same", criteria: {
      a: JSON.stringify({ shared, score: 1 }), b: JSON.stringify({ shared, score: 2 }), plain: "plain text", nil: null,
    } }, confidence: { type: "noul", instructions: "unchanged" } };
    const state = { __jev_shared_0: "keep", __jev_ref_0: "keep" };
    const compact = compactJevRequest(state, questions)!;
    expect(compact.encoding.stateKey).not.toBe("__jev_shared_0");
    expect(compact.encoding.refKey).not.toBe("__jev_ref_0");
    expect(expanded(compact)).toEqual(questions);
    expect(compact.state).toMatchObject(state);
    expect(compactJevRequest({}, { pick: { type: "choice", instructions: "small", criteria: { a: "one" } } })).toBeNull();
  });

  it("recovers once, returns the model answer unchanged, and logs both actual wire bodies", async () => {
    const rows: JevPromptRecord[] = [];
    const sent: { state: unknown; questions: QuestionSet }[] = [];
    const client = { model: fixture.model, async ask(state: unknown, questions: QuestionSet) {
      sent.push({ state, questions });
      if (sent.length === 1) throw failure();
      return answer;
    } };
    const result = await askJevLogged(client, { path: "unused", write: (row) => { rows.push(row); } }, meta, fixture.state, fixture.questions);
    expect(sent).toHaveLength(2);
    expect(result.answers).toBe(answer.answers);
    expect(result.requestId).toBe(answer.requestId);
    expect(result.inputTokens).toBe(answer.inputTokens);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.error?.status).toBe(400);
    expect(rows[0]!.transport_encoding).toBeUndefined();
    expect(rows[1]!.transport_encoding?.kind).toBe("shared-json-values-v2");
    for (const [index, row] of rows.entries()) {
      expect(row.request).toEqual({ model: fixture.model, ...sent[index] });
      expect(row.decision_id).toBe(meta.decisionId);
    }
  });

  it("does not retry another rejection, or unrelated 400/auth/validation errors", async () => {
    for (const error of [failure(), new JevError("unknown", "400 bad request", { status: 400 }),
      new JevError("auth", '401 {"detail":{"error_type":"max_tokens_exceeded"}}', { status: 401 }),
      new JevError("validation", "422 invalid", { status: 422 })]) {
      let calls = 0;
      const client = { model: "same", async ask(): Promise<JevAskResult> { calls += 1; throw error; } };
      await expect(askJevLogged(client, null, meta, fixture.state, fixture.questions)).rejects.toBe(error);
      expect(calls).toBe(isJevContextLimitError(error) ? 2 : 1);
    }
  });

  it("sends other-character successful requests unchanged and leaves uncompressible failures fatal", async () => {
    const sent: unknown[] = [];
    const client = { model: "same", async ask(state: unknown, questions: QuestionSet) { sent.push({ state, questions }); return answer; } };
    const state = { ...fixture.state, run_brief: { ...(fixture.state.run_brief as object), character: "REGENT" } };
    await askJevLogged(client, null, meta, state, fixture.questions);
    expect(sent).toEqual([{ state, questions: fixture.questions }]);
    let calls = 0;
    await expect(askJevLogged({ model: "same", async ask(): Promise<JevAskResult> { calls += 1; throw failure(); } }, null, meta,
      {}, { pick: { type: "choice", instructions: "same", criteria: { a: "plain" } } })).rejects.toThrow("max_tokens_exceeded");
    expect(calls).toBe(1);
  });
});
