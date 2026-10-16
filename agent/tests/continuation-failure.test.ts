/** Synthetic contract fixtures, not a reproduction of the missing historical silent-0332 sample. */
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { deserialize } from "node:v8";
import { afterEach, expect, it, vi } from "vitest";
import * as rollout from "../src/reflex/rollout.js";
import { fightSample } from "../src/sim/boss-sim.js";
import { captureContinuationFailure, continuationFailureOf, CONTINUATION_CAPTURE_BYTES, CONTINUATION_FILES_PER_RUN,
  ContinuationSampleError, preserveContinuationFailure } from "../src/sim/continuation-failure.js";
import { board } from "./boss-sim-fixture.js";

const directory = mkdtempSync(join(tmpdir(), "continuation-failure-"));
afterEach(() => vi.restoreAllMocks());
import { afterAll } from "vitest";
afterAll(() => rmSync(directory, { recursive: true, force: true }));
const context = (key: string) => ({ run: "FIXED_SYNTHETIC", character: "silent", question_key: key });
const failure = () => captureContinuationFailure("nonpositive-hp", 17, {
  input: { hp: 8, unknown: undefined, cap: Infinity }, first: { won: true, died: false, resources: { hp: -3, revives: [], drunkKeys: ["POTION:BLOCK_POTION:0"] } },
});

it("captures the same rejected first result, exact replay input and original trajectory before propagation", () => {
  const input = board({ bossHp: 12 });
  input.continuation = { variants: [{ boss: "TEST_SECOND", count: 1, input: board() }], potions: [], source: "synthetic", limitation: "not an original failing sample" };
  const trajectory = rollout.simulateFight(input, null, 5, 17);
  const last = trajectory.records.at(-1)!;
  vi.spyOn(rollout, "simulateFight").mockReturnValue({ ...trajectory, records: [...trajectory.records.slice(0, -1),
    { ...last, won: true, died: false, resources: { hp: -3, revives: [], drunkKeys: ["POTION:BLOCK_POTION:0"] } }] });
  let caught: unknown;
  try { fightSample(input, null, 17, 5, true, null); } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(ContinuationSampleError);
  expect((caught as Error).message.slice(0, 160)).toContain("nonpositive-hp; seed=17");
  const envelope = continuationFailureOf(caught)!;
  expect(envelope.capture).toBe("complete");
  const raw = Buffer.from(envelope.payload!, "base64");
  expect(createHash("sha256").update(raw).digest("hex")).toBe(envelope.sha256);
  const value = deserialize(raw);
  expect(value.input).toEqual(input);
  expect(value.sample).toEqual({ seed: 17, plan: null, maxTurns: 5, scripts: true, order: null });
  expect(value.first.resources).toEqual({ hp: -3, revives: [], drunkKeys: ["POTION:BLOCK_POTION:0"] });
  expect(value.first.failureTrajectory.at(-1)).toMatchObject({ won: true, died: false, resources: { hp: -3 } });
  expect(value.first.failureTrajectory[0].resourceAudit).toMatchObject({ startHp: 70 });
  expect(value.first.failureTrajectory[0].resourceAudit.steps).toBeDefined();
  expect(value.first.failureTrajectory[0].resourceAudit.outcome).toBeDefined();
});

it("preserves special values and a stable identity without modifying the captured object", () => {
  const a = failure(), b = failure();
  expect(a.fingerprint).toBe(b.fingerprint);
  expect(a.sha256).toBe(b.sha256);
  const value = deserialize(Buffer.from(a.payload!, "base64"));
  expect(value.input).toEqual({ hp: 8, unknown: undefined, cap: Infinity });
  expect(value.first.resources.hp).toBe(-3);
});

it("saves one complete independent envelope per question, keeping the original bytes on retries", () => {
  const first = preserveContinuationFailure(failure(), context("same"), directory);
  expect(first).toMatchObject({ status: "saved", complete: true, current_sample_saved: true });
  const raw = readFileSync(String(first.path));
  expect(createHash("sha256").update(raw).digest("hex")).toBe(first.sha256);
  const repeated = preserveContinuationFailure(failure(), context("same"), directory);
  expect(repeated).toMatchObject({ status: "deduplicated", current_sample_saved: true });
  const another = captureContinuationFailure("nonpositive-hp", 19, { first: { hp: -9 } });
  expect(preserveContinuationFailure(another, context("same"), directory)).toMatchObject({ status: "deduplicated", current_sample_saved: false });
  expect(readFileSync(String(first.path))).toEqual(raw);
  expect(readdirSync(dirname(String(first.path)))).toHaveLength(1);
});

it("reports oversize, invalid and unwritable captures without claiming a complete saved sample", () => {
  const oversized = captureContinuationFailure("nonpositive-hp", 17, { raw: "x".repeat(CONTINUATION_CAPTURE_BYTES) });
  expect(oversized).toMatchObject({ capture: "oversize", payload: null });
  expect(oversized.bytes).toBeGreaterThan(CONTINUATION_CAPTURE_BYTES);
  expect(oversized.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(preserveContinuationFailure(oversized, context("large"), directory)).toMatchObject({ status: "oversize", complete: false });
  expect(preserveContinuationFailure({ ...failure(), sha256: "0".repeat(64) }, context("bad"), directory)).toMatchObject({ status: "invalid_payload", complete: false });
  expect(preserveContinuationFailure(failure(), context("none"))).toMatchObject({ status: "unconfigured", complete: false });
  const file = join(directory, "not-a-directory"); writeFileSync(file, "fixed");
  expect(preserveContinuationFailure(failure(), context("write"), file)).toMatchObject({ status: "storage_failed", complete: false });
});

it("bounds captures per run and preserves an interrupted prior file", () => {
  const sub = join(directory, "limit");
  for (let i = 0; i < CONTINUATION_FILES_PER_RUN; i++) expect(preserveContinuationFailure(failure(), context(String(i)), sub).status).toBe("saved");
  expect(preserveContinuationFailure(failure(), context("overflow"), sub)).toMatchObject({ status: "run_limit", complete: false });
  const saved = preserveContinuationFailure(failure(), context("broken"), directory);
  writeFileSync(String(saved.path), "{interrupted");
  expect(preserveContinuationFailure(failure(), context("broken"), directory)).toMatchObject({ status: "invalid_existing_file", complete: false });
  expect(readFileSync(String(saved.path), "utf8")).toBe("{interrupted");
});
