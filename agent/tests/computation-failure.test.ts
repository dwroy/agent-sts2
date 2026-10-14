import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beginComputation } from "../src/sim/computation-failure.js";
import { fileSimWait } from "../src/sim/computation-wait.js";
import { simFailurePolicy } from "../src/core/config.js";
import { createScreenMemory } from "../src/memory/types.js";
import type { GameState } from "../src/hand/mod/schema.js";

const state = { raw: { run_id: "fixed-C1" }, turn: 1, run: { floor: 3, raw: { character_id: "SILENT" } } } as unknown as GameState;
afterEach(() => vi.unstubAllEnvs());

it("counts attempts rather than elapsed time, resets on success and on a different question/input", () => {
  const memory = createScreenMemory();
  const begin = (key = "fixed-input", s = state) => beginComputation(memory, s, "reward/card", key);
  const first = begin();
  expect(first.degraded).toBe(false);
  expect(memory.simFailure).toBeUndefined();
  expect(first.finish(0, 1000, "worker exited")).toMatchObject({ status: "pending", attempts: 1 });
  begin().finish(0, 1000, "worker stalled");
  expect(begin().degraded).toBe(true);
  expect(begin().finish(320, 1000)).toMatchObject({ status: "degraded", attempts: 3, reasons: ["worker exited", "worker stalled"] });
  expect(begin().degraded).toBe(false);
  begin().finish(0, 1000, "error");
  expect(begin("changed-input").finish(0, 1000, "error").attempts).toBe(1);
  expect(begin("changed-input", { ...state, turn: 2 }).finish(0, 1000, "error").attempts).toBe(1);
  expect(begin("changed-input", { ...state, raw: { run_id: "new-run" } }).finish(1000, 1000)).toMatchObject({ status: "complete", attempts: 1 });
  expect(memory.simFailure).toBeUndefined();
});

it("keeps the off switch and other roles out of fault degradation", () => {
  expect(simFailurePolicy("SILENT", {})).toEqual({ enabled: true, retries: 2 });
  expect(simFailurePolicy("SILENT", { SIM_FAILURE_RETRIES: "0" }).retries).toBe(2);
  expect(simFailurePolicy("SILENT", { SIM_FAILURE_RETRIES: "3" }).retries).toBe(3);
  for (const character of ["IRONCLAD", "REGENT"]) expect(simFailurePolicy(character, { SIM_FAILURE_EXIT: "on" }).enabled).toBe(false);
  vi.stubEnv("SIM_FAILURE_EXIT", "off");
  const memory = createScreenMemory();
  for (let i = 0; i < 4; i++) {
    const attempt = beginComputation(memory, state, "fixed", "input");
    expect(attempt.degraded).toBe(false);
    attempt.finish(0, 1000, "failure");
  }
});

it("writes real progressing samples every minute, records elapsed time, and closes its marker", () => {
  const dir = mkdtempSync(join(tmpdir(), "sim-wait-"));
  const path = join(dir, "sim-wait.json");
  let now = 1_000_000;
  const notes: string[] = [];
  try {
    const wait = fileSimWait(path, (s) => notes.push(s), () => now).start({ run: "fixture", floor: 3, label: "boss-lines" });
    const read = () => JSON.parse(readFileSync(path, "utf8"));
    expect(read().active).toBe(false);
    now += 59_000;
    wait.progress(50, 600);
    expect(notes).toHaveLength(0);
    now += 1000;
    wait.progress(80, 600);
    expect(read()).toMatchObject({ active: true, samples_done: 80, previous_samples: 0, elapsed_ms: 60_000 });
    now += 60_000;
    wait.progress(160, 600);
    expect(read()).toMatchObject({ samples_done: 160, previous_samples: 80 });
    expect(notes[1]).toContain("120 s");
    wait.finish();
    expect(read().active).toBe(false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
