import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { maxGap } from "../src/brain/engines/codex.js";
import { expectCodexAbortGap } from "./codex-stall-fixture.js";

it("the router timeout assertion accepts a 346 ms gap and still rejects incorrect trace evidence", () => {
  // Exercise the subprocess suite's actual assertion without a CLI or a wall-clock deadline.
  const source = readFileSync(new URL("./brain-codex.test.ts", import.meta.url), "utf8");
  const test = source.slice(source.indexOf('it("the router\'s timeout leaves the evidence:'));
  const assertion = test.split("\n").find((line) => line.trimStart().startsWith("expect")
    && (line.includes('row!["max_gap_ms"]') || line.includes("expectCodexAbortGap(")));
  expect(assertion).toBeDefined();
  const check = new Function("expect", "expectCodexAbortGap", "row", assertion!.replaceAll("row!", "row"));
  const events = [{ type: "thread.started", t: 346 }, { type: "turn.started", t: 670 }];
  const row = { ms: 1_000, events, max_gap_ms: maxGap(events, 1_000) };
  expect(row.max_gap_ms).toBe(346);
  check(expect, expectCodexAbortGap, row);
  // The original exact interval, event ordering and run-end boundaries remain required.
  for (const broken of [
    { ...row, max_gap_ms: 500 },
    { ...row, max_gap_ms: 0 },
    { ...row, events: [...events].reverse() },
    { ...row, ms: 669 },
    { ...row, ms: Number.NaN },
  ]) expect(() => check(expect, expectCodexAbortGap, broken)).toThrow();
  check(expect, expectCodexAbortGap, { ms: 1_500, events: [], max_gap_ms: 1_500 });
  check(expect, expectCodexAbortGap, { ms: 2_000, events: [{ type: "turn.started", t: 1_200 }], max_gap_ms: 1_200 });
});
