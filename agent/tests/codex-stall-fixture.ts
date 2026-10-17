import { expect } from "vitest";
import type { CodexTraceRow } from "../src/brain/engines/codex.js";

type StallTrace = Pick<CodexTraceRow, "stall_ms" | "ttft_ms" | "events" | "stall">;

/** Check exact diagnostics against the recorded clock, including delayed process startup. */
export function expectCodexStall(trace: StallTrace, stallMs: number): void {
  expect(trace.stall_ms).toBe(stallMs);
  expect(trace.ttft_ms).toEqual(expect.any(Number));
  const last = trace.events.at(-1)!;
  expect(last).toMatchObject({ type: "turn.started", t: expect.any(Number) });
  expect(trace.stall).toBe(`no stream event for ${Math.round(stallMs / 1000)} s after the first token at ${Math.round(trace.ttft_ms! / 1000)} s (last: turn.started at ${Math.round(last.t / 1000)} s)`);
}
