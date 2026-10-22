/** Fixed requests verify run effort through both routing paths; no model or game. */
import { expect, it } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/core/config.js";
import { createRouter } from "../src/brain/brain.js";
import { BrainRouter, type BrainLogRow } from "../src/brain/router.js";
import type { BrainAnswer, BrainRequest } from "../src/brain/types.js";
import { DecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import { receiptFromRollout } from "../src/brain/engines/native-receipt.js";
import { parseBrainRunProfile } from "../src/brain/run-profile.js";
import { RunConfigLog } from "../src/eye/run-config.js";
import type { Brain } from "../src/brain/brain.js";

const receipt = { engine: "codex" as const, model: "gpt-6.1-sol", effort: "high", source: "turn_context" as const,
  thread_id: "own", turn_id: "turn", sha256: "f".repeat(64) };
const request = (): BrainRequest => ({ label: "shop/plan", runId: "TRIAL-RUN", system: "fixed", question: "fixed", payload: {},
  effort: "xhigh", spec: { schema: { type: "object" }, validate: () => [] } });
const answer: BrainAnswer = { engine: "codex", model: "gpt-6.1-sol", effort: "high", answer: {}, problems: [],
  attempts: 1, latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [], nativeReceipt: receipt };

it.each(["high", "xhigh"] as const)("freezes %s across ordinary and human pace paths, overriding per-question effort", async (effort) => {
  const config = loadConfig({ BRAIN_LOG: "off", BRAIN_CODEX_EFFORT: "xhigh",
    BRAIN_RUN_CONFIG: JSON.stringify({ engine: "codex", effort, trial_id: "issue-31", sequence: 0 }) });
  const rows: BrainLogRow[] = [];
  const router = new BrainRouter({ config: config.brain, codexOnly: true, log: (r) => rows.push(r),
    engine: () => ({ name: "codex", model: "gpt-6.1-sol", decide: async (req) => {
      expect(req.effort).toBe(effort);
      return { ...answer, effort, nativeReceipt: { ...receipt, effort } };
    } }) });
  await router.decide(request());
  await withDecisionBudget(new DecisionBudget("test", "routine"), () => router.decide(request()));
  expect(rows).toHaveLength(2);
  expect(rows.every(r => r.requested_effort === effort && r.native_receipt?.effort === effort && r.run_brain?.effort === effort)).toBe(true);
});

it("honors the existing BRAIN_CODEX_EFFORT entrance in human pace without a trial profile", async () => {
  const config = loadConfig({ BRAIN_LOG: "off", BRAIN_CODEX_EFFORT: "high" });
  const router = new BrainRouter({ config: config.brain, codexOnly: true, log: () => {},
    engine: () => ({ name: "codex", model: "gpt-6.1-sol", decide: async req => {
      expect(req.effort).toBe("high"); return answer;
    } }) });
  await withDecisionBudget(new DecisionBudget("test", "routine"), () => router.decide(request()));
});

it("does not invent native evidence from an argument, another thread or another turn", () => {
  const text = [JSON.stringify({ type: "session_meta", payload: { id: "own" } }),
    JSON.stringify({ type: "turn_context", payload: { turn_id: "old", model: "gpt-6.1-sol", effort: "xhigh" } }),
    JSON.stringify({ type: "turn_context", payload: { turn_id: "turn", model: "gpt-6.1-sol", effort: "high" } })].join("\n");
  expect(receiptFromRollout(text, "own", "turn")).toMatchObject({ effort: "high", source: "turn_context" });
  expect(receiptFromRollout(text, "foreign", "turn")).toBeUndefined();
  expect(receiptFromRollout(text, "own", "missing")).toBeUndefined();
  expect(receiptFromRollout("{}", "own", "turn")).toBeUndefined();
});

it("rejects invalid profiles and selects DeepSeek without silently substituting Codex", () => {
  for (const raw of ['{}', '{"engine":"codex","effort":"bad"}', '{"engine":"codex","effort":"high","extra":"x"}']) {
    expect(() => parseBrainRunProfile(raw)).toThrow();
  }
  const config = loadConfig({ BRAIN_RUN_CONFIG: '{"engine":"deepseek","effort":"high"}' });
  expect(config.brain.runProfile?.engine).toBe("deepseek");
  expect(createRouter(config, null).engineFor("reward/card")).toBe("deepseek");
  expect(parseBrainRunProfile('{"engine":"deepseek","effort":"max"}')).toEqual({ engine: "deepseek", effort: "max" });
  expect(() => parseBrainRunProfile('{"engine":"codex","effort":"max"}')).toThrow();
});

it("appends native confirmation to run-config without changing configuration identity or restart status", () => {
  const dir = mkdtempSync(join(tmpdir(), "brain-profile-"));
  try {
    const config = loadConfig({ BRAIN_LOG: "off", CHARACTER: "SILENT", BRAIN_ENGINE: "codex",
      BRAIN_RUN_CONFIG: '{"engine":"codex","effort":"high","trial_id":"issue-31","sequence":0}' });
    const router = createRouter(config, null);
    const brain = { router, deepseek: { systemPrompt: "fixed" } } as Brain;
    const log = new RunConfigLog({ config, brain, jevEnabled: false, mode: "play", env: {}, knowledgeDir: join(dir, "empty"),
      code: () => ({ commit: "a".repeat(40), code: "aaaaaaa", dirty: false, dirty_files: [], branch: "test", worktree: "test" }) }, join(dir, "run-config.jsonl"));
    const state = { run: { ascension: 10, floor: 1, character_name: "Silent" }, raw: { run_id: "TRIAL-RUN", run: { character_id: "SILENT" } } };
    const first = log.observe(state)!;
    expect(first.brain.run_profile?.effort).toBe("high");
    expect(first.human_pace?.model_effort).toBe("high");
    router.nativeReceipts.set("TRIAL-RUN", { question_id: "q", receipt });
    const confirmed = log.observe(state)!;
    expect(confirmed.brain_native_receipt?.receipt).toEqual(receipt);
    expect(confirmed.config_sha).toBe(first.config_sha);
    expect(confirmed.restart).toBe(false);
    expect(log.observe(state)).toBeNull();
    expect(readFileSync(log.path, "utf8").trim().split("\n")).toHaveLength(2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

it("records the dsh model/max and budget rather than the unused direct API configuration", () => {
  const dir = mkdtempSync(join(tmpdir(), "brain-dsh-profile-"));
  try {
    const config = loadConfig({ BRAIN_LOG: "off", CHARACTER: "SILENT", DEEPSEEK_API_KEY: "fixture", DEEPSEEK_MODEL: "unused-api-model",
      BRAIN_DEEPSEEK_MODEL: "deepseek/deepseek-flash", DEEPSEEK_MAX_CALLS: "30", BRAIN_RUN_CONFIG: '{"engine":"deepseek","effort":"max"}' });
    const brain = { router: createRouter(config, null), deepseek: { systemPrompt: "fixed" } } as Brain;
    const log = new RunConfigLog({ config, brain, jevEnabled: false, mode: "play", env: {}, knowledgeDir: join(dir, "empty"),
      code: () => ({ commit: "a".repeat(40), code: "aaaaaaa", dirty: false, dirty_files: [], branch: "test", worktree: "test" }) }, join(dir, "run-config.jsonl"));
    const row = log.observe({ run: { ascension: 10, floor: 1, character_name: "Silent" }, raw: { run_id: "DSH-FIXED", run: { character_id: "SILENT" } } })!;
    expect(row.brain.engines.deepseek).toMatchObject({ model: "deepseek/deepseek-flash", effort: "max", tools: true, max_calls: null });
    expect(row.brain.agent).toMatchObject({ transport: "dsh-Nova", deepseekTotalMs: 900000 });
    expect(row.human_pace).toMatchObject({ model_effort: "max", budgets: { brain: 900000 } });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
