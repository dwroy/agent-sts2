/** Fixed planner fault injection; this is not a historical nonpositive-HP reproduction. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it, vi } from "vitest";

// Keep all refreshed knowledge out of the planner fixture, including the worker memo signature.
vi.mock("node:fs", async (original) => {
  const { historicalKnowledgeFs } = await import("./historical-knowledge-fs.js");
  const fs = historicalKnowledgeFs(await original<typeof import("node:fs")>());
  const { basename, dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const pinned = JSON.parse(fs.readFileSync(join(dirname(fileURLToPath(import.meta.url)), "boss-lines-data/pinned-knowledge.json"), "utf8"));
  return { ...fs, readFileSync: (path: any, ...rest: any[]) => {
    const name = basename(String(path));
    if (String(path).includes("/knowledge/") && name.endsWith(".json")) {
      if (name in pinned) return JSON.stringify(pinned[name]);
      throw Object.assign(new Error("ENOENT: fixed B2 diagnostic fixture"), { code: "ENOENT" });
    }
    return (fs.readFileSync as any)(path, ...rest);
  } };
});
vi.resetModules();
const { logged, loggedEnv } = await import("./logged.js");
const { planCombatTurn } = await import("../src/reflex/combat-plan.js");
const { rolloutLiveOptions } = await import("../src/reflex/rollout-live.js");
const { potionMcOptions } = await import("../src/reflex/potion-mc.js");
const { bossLinesOptions, BossLinesPool, releaseBossLinesPool } = await import("../src/sim/boss-lines.js");
const { potionCostOptions } = await import("../src/reflex/potion-cost.js");
const { captureContinuationFailure, ContinuationSampleError } = await import("../src/sim/continuation-failure.js");
type AskDecision = import("../src/memory/types.js").AskDecision;
const original = { ...bossLinesOptions };
const originalRollout = { ...rolloutLiveOptions };
afterEach(() => {
  releaseBossLinesPool(); Object.assign(bossLinesOptions, original); Object.assign(rolloutLiveOptions, originalRollout); potionMcOptions.now = null;
  vi.restoreAllMocks(); vi.unstubAllEnvs();
});

it("actual B2 combat planner logs the separate reference but sends neither payload nor whole-fight numbers after zero-sample degradation", () => {
  vi.stubEnv("SIM_ADAPTIVE", "off");
  potionCostOptions.enabled = false;
  rolloutLiveOptions.enabled = false; rolloutLiveOptions.now = () => 0; potionMcOptions.now = () => 0;
  Object.assign(bossLinesOptions, { enabled: true, serial: false, now: () => 0, samples: 600 });
  const directory = mkdtempSync(join(tmpdir(), "continuation-b2-planner-"));
  try {
    const e = loggedEnv(logged("k8tc-f17-t5"), { requiredBossEvaluation: true, simFailureDirectory: directory });
    e.state.run!.raw["character_id"] = "SILENT";
    const failure = captureContinuationFailure("nonpositive-hp", 17, { synthetic: true, first: { won: true, died: false, resources: { hp: -2 } }, full: "private replay".repeat(500) });
    vi.spyOn(BossLinesPool.prototype, "run").mockImplementation(() => {
      throw new ContinuationSampleError("missing successful first-fight resources: nonpositive-hp; " + "x".repeat(3000), failure);
    });
    let decision: AskDecision | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      decision = planCombatTurn(e) as AskDecision | null;
      expect(e.screenMemory.bossEvaluationRecord).toMatchObject({ available: false, completion: {
        status: attempt < 3 ? "pending" : "degraded", attempts: attempt, samples: 0, requested: 600,
      } });
      if (attempt < 3) expect(decision).toBeNull();
    }
    expect(decision?.kind).toBe("ask");
    const record = e.screenMemory.bossEvaluationRecord!;
    const ref = record["resource_failure"] as Record<string, unknown>;
    expect(ref).toMatchObject({ complete: true, status: "deduplicated" });
    const saved = JSON.parse(readFileSync(String(ref.path), "utf8"));
    expect(saved.sample.payload).toBe(failure.payload);
    const normalQuestion = JSON.stringify({ state: decision!.state, questions: decision!.questions, jevView: decision!.jevView });
    for (const hidden of [failure.payload!, String(ref.path), "resource_failure", "private replay", "node-v8-base64"]) expect(normalQuestion).not.toContain(hidden);
    const planQuestion = decision!.questions["plan"] as { criteria: Record<string, string | null> };
    for (const text of Object.values(planQuestion.criteria)) {
      const criterion = JSON.parse(text ?? "{}");
      expect(criterion.whole_fight_sim).toBeUndefined();
      expect(criterion.boss_relative_margin).toBeUndefined();
    }
    expect(record["lines"]).toBeUndefined(); expect(record["samples"]).toBeUndefined();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
