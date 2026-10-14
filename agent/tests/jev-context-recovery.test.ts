import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { compactJevRequest, type CompactJevRequest } from "../src/reflex/jev/compact-request.js";
import type { QuestionSet } from "../src/reflex/jev/questions.js";

// W1YY8PEWGUF9 F17 T1: both the original and v1 shared-value request were rejected.
const fixture = JSON.parse(readFileSync(new URL("./jev-context-recovery-request.json", import.meta.url), "utf8")) as {
  state: Record<string, unknown>; questions: QuestionSet;
};

function unpack(compact: CompactJevRequest) {
  const table = compact.state[compact.encoding.stateKey] as {
    values: Record<string, unknown>; shapes?: Record<string, string[]>;
  };
  const decode = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(decode);
    if (value !== null && typeof value === "object") {
      const row = value as Record<string, unknown>, keys = Object.keys(row);
      if (keys.length === 1 && compact.encoding.refKey in row) {
        const name = row[compact.encoding.refKey] as string;
        expect(Object.hasOwn(table.values, name)).toBe(true);
        return decode(table.values[name]);
      }
      const { shapeKey, valueKey } = compact.encoding;
      if (shapeKey && valueKey && keys.length === 2 && shapeKey in row && valueKey in row) {
        const fields = table.shapes![row[shapeKey] as string]!, values = row[valueKey] as unknown[];
        expect(fields).toHaveLength(values.length);
        return Object.fromEntries(fields.map((field, i) => [field, decode(values[i])]));
      }
      return Object.fromEntries(Object.entries(row).map(([key, item]) => [key, decode(item)]));
    }
    return value;
  };
  return Object.fromEntries(Object.entries(compact.questions).map(([id, question]) => {
    if (question.type !== "choice") return [id, question];
    return [id, { ...question, criteria: Object.fromEntries(Object.entries(question.criteria).map(([option, text]) => {
      if (text === null) return [option, text];
      try { return [option, JSON.stringify(decode(JSON.parse(text)))]; } catch { return [option, text]; }
    })) }];
  }));
}

// This bound is an encoding regression check, never an API/token acceptance criterion.
it("the intermediate codec shrinks the rejected W1 bytes and reconstructs every option and metric exactly", () => {
  const before = JSON.stringify(fixture), result = compactJevRequest(fixture.state, fixture.questions)!;
  expect(result).not.toBeNull();
  expect(result.encoding.kind).toBe("shared-json-values-v2");
  expect(result.encoding.shapeDefinitions).toBeGreaterThan(0);
  expect(result.encoding.encodedBytes).toBeLessThan(70_000);
  expect(unpack(result)).toEqual(fixture.questions);
  for (const [key, value] of Object.entries(fixture.state)) expect(result.state[key]).toEqual(value);
  expect(JSON.stringify(fixture)).toBe(before);
});

it("preserves nested object field order, Unicode, exact floating values and colliding-looking names", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    simulated_effective_damage_per_turn: 0.123456789012345 + i,
    actual_complete_paired_sample_count: 1000 + i,
    unknown_attribution_remains_null: null,
    original_ranking_eligibility_is_false: false,
    text: "__js_0 __jv_0 __jev_shared_0 __jev_ref_0 保留原文",
    nested: [i, -i, { zero: 0, negativeZeroAfterJSON: -0, unicode: "多字节资料不按UTF16估算传输大小" }],
  }));
  const questions: QuestionSet = { choose: { type: "choice", instructions: "same", criteria: {
    first: JSON.stringify({ rows, order: ["first", "second"] }),
    second: JSON.stringify({ rows: [...rows].reverse(), order: ["second", "first"] }),
    plain: "原始说明不改", missing: null,
  } }, fact: { type: "noul", instructions: "unchanged" } };
  const compact = compactJevRequest({ stable: true }, questions)!;
  expect(compact).not.toBeNull();
  expect(compact.encoding.shapeKey).not.toBe("__js_0");
  expect(compact.encoding.valueKey).not.toBe("__jv_0");
  expect(unpack(compact)).toEqual(questions);
  expect(compact.state.stable).toBe(true);
});
