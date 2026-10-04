import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { FileEscalator } from "../src/brain/llm/file-escalation.js";

describe("FileEscalator", () => {
  it("returns the supervisor's answer written next to the pending file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "esc-"));
    const escalator = new FileEscalator(dir, 5_000, 20);
    const answered = escalator.choose({ hp: "10/80" }, "Which plan?", { plan1: "{}", plan2: "{}" }, { label: "t" });
    // Act as the supervisor: wait for the pending file, answer it.
    for (let i = 0; i < 100 && !readdirSync(dir).some((name) => name.startsWith("pending-") && name.endsWith(".json")); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const pendingName = readdirSync(dir).find((name) => name.startsWith("pending-") && name.endsWith(".json"))!;
    const pending = JSON.parse(readFileSync(join(dir, pendingName), "utf8")) as { answer_file: string };
    writeFileSync(pending.answer_file, JSON.stringify({ choice: "plan2", reason: "kill now" }));
    const answer = await answered;
    expect(answer.choice).toBe("plan2");
    expect(readdirSync(dir).some((name) => name.startsWith("done-"))).toBe(true);
  });

  it("gives up after the timeout so the next escalator can answer", async () => {
    const dir = mkdtempSync(join(tmpdir(), "esc-"));
    const escalator = new FileEscalator(dir, 100, 20);
    await expect(escalator.choose({}, "q", { a: "{}" }, {})).rejects.toThrow(/no answer/);
  });
});
