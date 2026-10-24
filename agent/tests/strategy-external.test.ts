import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { externalTier } from "../../learner/lib/external-source.js";
import { quotaSnapshot } from "../../ops/subscription-usage.js";
import { main, parseArgs } from "../../learner/lib/launcher.js";
import { learnerTuiEnv } from "../../learner/lib/herdr.js";
import { childEnv } from "../../learner/lib/engines.js";
import { loadTask, renderTask } from "../../learner/lib/task.js";
import type { CodexUsage } from "../src/brain/engines/codex-usage.js";

const now = new Date("2026-01-01T00:00:00Z");
function usage(percent: number): CodexUsage {
  return { readAt: now.toISOString(), ms: 1, plan: null, credits: null, ordinaryUsageAllowed: true, reachedType: null, spendControlReached: false,
    windows: [{ name: "codex/secondary", usedPct: percent, windowMins: 10080, resetsAt: "2026-01-02T00:00:00Z" }] };
}
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

it("external admission, source proof, original writer gates and retirement use fixed aggregates", () => {
  expect(execFileSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_strategy_external.py"], { encoding: "utf8", timeout: 15_000 })).toBe("");
});

it.each([[0, "ultrafast"], [70, "ultrafast"], [70.01, "fast"], [85, "fast"], [85.01, "fast"], [100, "default"]])(
  "applies strict weekly boundary %s -> %s", (percent, expected) => {
    const decision = externalTier(usage(Number(percent)), now);
    expect(decision.effective).toBe(expected);
    expect(decision.observed_service_tier).toBeNull();
  });

it("unknown, stale and ambiguous quota cannot accelerate; all weekly buckets count", () => {
  for (const sample of [null, { ...usage(5), windows: [] }, { ...usage(5), readAt: "2025-12-31T23:49:59Z" },
    { ...usage(5), readAt: "2026-01-01T00:00:01Z" }, usage(NaN), { ...usage(5), windows: [{ ...usage(5).windows[0]!, resetsAt: now.toISOString() }] }]) {
    expect(externalTier(sample, now)).toMatchObject({ effective: "default", weekly_used_percent: null, reason: "weekly_unknown" });
  }
  expect(externalTier({ ...usage(2), windows: [...usage(2).windows, ...usage(90).windows] }, now).effective).toBe("default");
  expect(externalTier(usage(2), now, "fast").effective).toBe("fast");
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "external-launch-")); dirs.push(root);
  const batch = "20260101-000001-strategy-proposal", source = "issue51-dual-boss-001";
  const cwd = join(root, ".worktrees/codex-strategy-silent-20260101-000001");
  for (const dir of [cwd, join(root, "tasks"), join(root, "notes"), join(root, "ops/state/learner")]) mkdirSync(dir, { recursive: true });
  const task = join(root, "tasks/strategy-proposal.md");
  writeFileSync(task, readFileSync(resolve("../learner/tasks/strategy-external.md"), "utf8") + `\n${source} ${"b".repeat(64)}\n`);
  const stateFile = join(root, "ops/state/learn.json");
  const registration = { state: "running", pid: process.pid, worktree: cwd, task: "strategy-proposal", character: "silent", reason: "external", runs: [],
    external_source: source, external_binding: { plan_id: source, request_id: "github-issue-51-external-boss-learning-20261023", retry_generation: 0, dispatch_base: "a".repeat(40) },
    candidate_mode: { schema: "candidate-only-v1", merge: "no", dispatch_base: "a".repeat(40), worktree: cwd }, key: `strategy-external:${source}:0` };
  const save = (value = registration) => writeFileSync(stateFile, JSON.stringify({ batches: { [batch]: value } })); save();
  const native = join(root, "native");
  writeFileSync(native, '#!/usr/bin/python3\nimport json,os,sys\nfrom pathlib import Path\nPath(os.environ["CODEX_OPS_ROOT"],"observed.json").write_text(json.dumps({"args":sys.argv[1:],"tier":os.environ.get("LEARNER_EXTERNAL_SERVICE_TIER"),"source":os.environ.get("LEARNER_EXTERNAL_SOURCE"),"home":os.environ.get("CODEX_HOME")}))\nsys.stdin.read()\nprint(json.dumps({"type":"thread.started","thread_id":"11111111-2222-3333-4444-555555555555"}))\nprint(json.dumps({"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":2}}))\n', { mode: 0o755 });
  const env = { HOME: root, PATH: "/usr/bin:/bin", LEARNER_CODEX_BIN: native, LEARNER_CODEX_HOME: join(root, "selected-account"),
    LEARNER_STATE_FILE: stateFile, LEARNER_BATCH_ID: batch, LEARNER_EXTERNAL_SOURCE: source, CODEX_OPS_ROOT: root };
  const errors: string[] = [];
  const quota = (percent: number | null) => {
    const sample = quotaSnapshot(percent === null ? null : usage(percent), now);
    const digest = createHash("sha256").update(env.LEARNER_CODEX_HOME).digest("hex");
    writeFileSync(join(root, "ops/state/subscription-usage.json"), JSON.stringify({ ...sample, account_home_sha256: digest }));
    const selected = percent !== null && percent > 70 ? "fast" : "ultrafast";
    const external_policy = { schema: "external-learning-policy-v1", account_home_sha256: digest,
      weekly_used_percent: percent, sample_observed_at: sample.sample_observed_at,
      service_tier: selected, workers: percent === null || percent >= 90 ? 0 : percent > 70 ? 2 : 4,
      reason: percent === null ? "weekly_unknown" : percent >= 90 ? "switch_codex1" : percent > 70 ? "weekly_over_70" : "weekly_within_70" };
    writeFileSync(stateFile, JSON.stringify({ batches: { [batch]: { ...registration, external_policy } } }));
    return selected;
  };
  return { root, cwd, batch, env, errors, registration, save, quota,
    run: (tier = "ultrafast", extra: string[] = []) => main(
      ["--engine", "codex", "--character", "silent", "--task", task, "--cwd", cwd, "--set", `batch=${batch}`, "--service-tier", tier, ...extra], {
        projectRoot: root, env, tasksDir: join(root, "tasks"), runsDir: join(root, "runs"), secretFiles: [], now: () => now,
        checkCodex: undefined, checkKeys: undefined, refreshCodexAuth: undefined,
        readExternalUsage: async () => { throw new Error("must reuse the unified snapshot"); },
        out: () => undefined, err: (message) => errors.push(message),
      }),
  };
}

it.each([[20, "ultrafast"], [70, "ultrafast"], [75, "fast"], [89, "fast"]])(
  "launches only the selected account with quota %s and tier %s via CLI", async (percent, expected) => {
    const f = fixture();
    f.quota(Number(percent));
    const code = await f.run(String(expected));
    expect(code, f.errors.join("\n")).toBe(0);
    const observed = JSON.parse(readFileSync(join(f.root, "observed.json"), "utf8"));
    expect(observed).toMatchObject({ tier: expected, source: f.env.LEARNER_EXTERNAL_SOURCE, home: f.env.LEARNER_CODEX_HOME });
    expect(observed.args).toContain(`service_tier="${expected}"`);
    const receipt = JSON.parse(readFileSync(join(f.root, `ops/state/learner/${f.batch}.external-launch.json`), "utf8"));
    expect(receipt.external_tier).toMatchObject({ effective: expected, observed_service_tier: null });
    expect(receipt.source).toBe(f.env.LEARNER_EXTERNAL_SOURCE);
    expect(receipt.candidate_mode).toEqual(f.registration.candidate_mode);
    const log = readFileSync(receipt.log, "utf8");
    expect(log).not.toContain("private diagnostics");
    expect(log.trim().split("\n").map((line) => JSON.parse(line)).find((row) => row.type === "learner_summary").summary.tokens).toMatchObject({ input: 10, output: 2 });

  });

it("unknown, exhausted, stale or replaced snapshots retain the lease without launching", async () => {
  for (const percent of [null, 90, 100]) {
    const f = fixture(); f.quota(percent);
    expect(await f.run(percent === null ? "ultrafast" : "fast")).toBe(3);
    expect(readdirSync(join(f.root, "ops/state/learner"))).toEqual([]);
  }
  for (const mutate of [
    (sample: Record<string, unknown>) => { sample.account_home_sha256 = "other-account"; },
    (sample: Record<string, unknown>) => { sample.sample_observed_at = "2025-12-31T23:00:00Z"; },
    (sample: Record<string, unknown>) => { sample.windows = []; },
  ]) {
    const f = fixture(); f.quota(20);
    const path = join(f.root, "ops/state/subscription-usage.json");
    const sample = JSON.parse(readFileSync(path, "utf8")); mutate(sample); writeFileSync(path, JSON.stringify(sample));
    expect(await f.run()).toBe(3);
  }
  const ordinary = fixture(); ordinary.save({ ...ordinary.registration, reason: "tick" });
  expect(await ordinary.run()).toBe(2);
  const replaced = fixture(); replaced.save({ ...replaced.registration, state: "done" });
  expect(await replaced.run()).toBe(2);
  expect(() => parseArgs(["--engine", "codex", "--task", "x", "--cwd", "/x", "--service-tier", "priority"])).toThrow();
});

it("refuses a candidate whose immutable launch binding permits live merging", async () => {
  const f = fixture(); f.quota(20);
  const path = f.env.LEARNER_STATE_FILE;
  const state = JSON.parse(readFileSync(path, "utf8"));
  state.batches[f.batch].candidate_mode.merge = "live";
  writeFileSync(path, JSON.stringify(state));
  expect(await f.run()).toBe(2);
  expect(readdirSync(join(f.root, "ops/state/learner"))).toEqual([]);
  const override = fixture(); override.quota(20);
  expect(await override.run("ultrafast", ["--set", "merge=live"])).toBe(2);
  expect(readdirSync(join(override.root, "ops/state/learner"))).toEqual([]);
});

it("a refreshed common snapshot within the same tier does not strand a registered checkout", async () => {
  const f = fixture(); f.quota(20);
  const path = join(f.root, "ops/state/subscription-usage.json");
  const sample = JSON.parse(readFileSync(path, "utf8"));
  sample.sample_observed_at = "2025-12-31T23:59:59Z";
  sample.windows[0].used_percent = 21;
  writeFileSync(path, JSON.stringify(sample));
  expect(await f.run()).toBe(0);
  const receipt = JSON.parse(readFileSync(join(f.root, `ops/state/learner/${f.batch}.external-launch.json`), "utf8"));
  expect(receipt.external_tier.weekly_used_percent).toBe(21);
});

it("TUI preserves only constrained source opt-in and ordinary child env drops inherited scope", () => {
  const env = { LEARNER_EXTERNAL_SOURCE: "issue51-dual-boss-001", LEARNER_EXTERNAL_SERVICE_TIER: "ultrafast" };
  expect(learnerTuiEnv(env)).toMatchObject(env);
  expect(learnerTuiEnv({ ...env, LEARNER_EXTERNAL_SERVICE_TIER: "arbitrary" }).LEARNER_EXTERNAL_SOURCE).toBeUndefined();
  expect(childEnv(env, "codex").LEARNER_EXTERNAL_SERVICE_TIER).toBeUndefined();
  expect(childEnv(env, "claude").LEARNER_EXTERNAL_SOURCE).toBeUndefined();
});

it("both first-batch task sections render without own-run or normal proposal parameters", () => {
  const dir = mkdtempSync(join(tmpdir(), "external-task-")); dirs.push(dir);
  for (const topic of ["dual-boss", "act-boss"]) {
    const file = join(dir, "strategy-proposal.md");
    writeFileSync(file, readFileSync(resolve("../learner/tasks/strategy-external.md"), "utf8") + readFileSync(resolve(`../learner/tasks/strategy-external-${topic}.md`), "utf8"));
    const rendered = renderTask(loadTask(file, dir), { batch: "actual-external" }, { project_root: "/fixture", worktree: "/fixture/work", scratch: "/fixture/scratch", character: "silent" });
    expect(rendered.prompt).toContain("runs=[]"); expect(rendered.prompt).not.toContain("evidence_summary.py");
    expect(rendered.prompt).toContain("actual-external");
  }
});
