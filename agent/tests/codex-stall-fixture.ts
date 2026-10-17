import { expect } from "vitest";
import type { CodexTraceRow } from "../src/brain/engines/codex.js";

type StallTrace = Pick<CodexTraceRow, "stall_ms" | "ttft_ms" | "events" | "stall">;

/** Check every silence against the run's own timeline, excluding engine preparation. */
export function expectCodexAbortGap(trace: Pick<CodexTraceRow, "ms" | "events" | "max_gap_ms">): void {
  const times = [0, ...trace.events.map((event) => event.t), trace.ms];
  const gaps = times.slice(1).map((time, index) => time - times[index]!);
  for (const gap of gaps) {
    expect(Number.isFinite(gap)).toBe(true);
    expect(gap).toBeGreaterThanOrEqual(0);
  }
  expect(trace.max_gap_ms).toBe(Math.max(...gaps));
}

/** Check exact diagnostics against the recorded clock, including delayed process startup. */
export function expectCodexStall(trace: StallTrace, stallMs: number): void {
  expect(trace.stall_ms).toBe(stallMs);
  expect(trace.ttft_ms).toEqual(expect.any(Number));
  const last = trace.events.at(-1)!;
  expect(last).toMatchObject({ type: "turn.started", t: expect.any(Number) });
  expect(trace.stall).toBe(`no stream event for ${Math.round(stallMs / 1000)} s after the first token at ${Math.round(trace.ttft_ms! / 1000)} s (last: turn.started at ${Math.round(last.t / 1000)} s)`);
}
