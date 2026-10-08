import { describe, expect, it } from "vitest";
import { CodexCacheObserver, PhysicalCallBudget, firstDifferentByte } from "../src/brain/engines/codex-cache.js";

const input = { scope: "silent|run-a", system: "知识\n稳定前缀", prompt: "完整题面\n本局记忆", schema: { type: "object", properties: { choice: { type: "string" } } }, serviceTier: null };

describe("Codex cache client measurements (no real engine)", () => {
  it("caps every physical attempt even after errors, and leaves production uncapped", () => {
    const probe = new PhysicalCallBudget(2);
    expect(probe.claim()).toBe(true);
    expect(probe.claim()).toBe(true);
    expect(probe.claim()).toBe(false);
    expect(probe.claim()).toBe(false);
    const production = new PhysicalCallBudget();
    for (let i = 0; i < 10; i += 1) expect(production.claim()).toBe(true);
    expect(() => new PhysicalCallBudget(4)).toThrow(/1 or 2/);
  });
  it("measures repeated questions and changing tails without retaining text in logs", () => {
    const observer = new CodexCacheObserver();
    const first = observer.capture(input);
    const repeated = observer.capture(input);
    expect(repeated.instructions).toEqual(first.instructions);
    expect(repeated.first_different_byte).toEqual({ instructions: null, user: null, schema: null });
    expect(first.instructions.bytes).toBe(Buffer.byteLength(input.system));
    const dynamic = observer.capture({ ...input, prompt: `${input.prompt}\n新状态` });
    expect(dynamic.instructions).toEqual(first.instructions);
    expect(dynamic.first_different_byte?.user).toBe(Buffer.byteLength(input.prompt));
    expect(JSON.stringify(dynamic)).not.toContain("知识");
    expect(JSON.stringify(dynamic)).not.toContain("题面");
  });

  it("detects real knowledge refresh and schema changes, including UTF-8 offsets", () => {
    const observer = new CodexCacheObserver();
    observer.capture(input);
    const changed = observer.capture({ ...input, system: `${input.system}\n新证据` });
    expect(changed.first_different_byte?.instructions).toBe(Buffer.byteLength(input.system));
    const schema = observer.capture({ ...input, schema: null });
    expect(schema.first_different_byte?.schema).toBe(0);
    expect(firstDifferentByte("中a", "中b")).toBe(3);
  });

  it("resets comparisons at character and run boundaries", () => {
    const observer = new CodexCacheObserver();
    observer.capture(input);
    for (const scope of ["silent|run-b", "ironclad|run-b"]) {
      expect(observer.capture({ ...input, scope }).first_different_byte).toBeNull();
    }
  });
});
