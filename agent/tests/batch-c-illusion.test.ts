/** fix-queue-v4 batch-c-fixed-fixture-timeout: ZY3992X5VEVS F23 T3-T5, fixed inputs and work clock. */
import { basename, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const { historicalKnowledgeFs } = await import("./historical-knowledge-fs.js");
  const fs = historicalKnowledgeFs(await original<typeof import("node:fs")>());
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  // Reuse committed test references; never snapshot a refreshing character knowledge directory.
  const pinned = JSON.parse(fs.readFileSync(new URL("./potion-cost-knowledge.json", import.meta.url), "utf8"));
  const early = JSON.parse(fs.readFileSync(new URL("./sl-early-data/pinned-knowledge.json", import.meta.url), "utf8"));
  pinned["monster-db.json"] = {
    monsters: Object.fromEntries(["THE_OBSCURA", "PARAFRIGHT"].map((id) => [id, early["monster-db.json"].monsters[id]])),
  };
  pinned["move-model.json"] = early["move-model.json"];
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      const name = basename(path);
      if (Object.hasOwn(pinned, name)) return JSON.stringify(pinned[name]);
      throw Object.assign(new Error(`ENOENT: fixed illusion rollout references, ${name}`), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

import type { AskDecision } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { ROLLOUT_BUDGET_MS, rolloutTap } from "../src/reflex/rollout-live.js";
import type { RolloutResult } from "../src/reflex/rollout.js";
import { logged, loggedEnv } from "./logged.js";
import { withBatchCIllusionFixture } from "./batch-c-illusion-fixture.js";

afterEach(() => {
  vi.restoreAllMocks();
  rolloutTap.onRollout = null;
});

describe("a line aiming only at the illusion keeps that target on later turns (ZY3992X5VEVS F23 T3-T5)", () => {
  it.each([0, 10_000])("the logged T3 board: the rollout's best is no longer the Parafright line, with %i ms host pauses", (pause) => {
    let wall = 0;
    vi.spyOn(performance, "now").mockImplementation(() => (wall += pause));
    const results: RolloutResult[] = [];
    rolloutTap.onRollout = (_input, result) => results.push(result);
    const decision = withBatchCIllusionFixture(() => planCombatTurn(loggedEnv(logged("zy39-f23-t3b"))) as AskDecision);
    const criteria = (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria! as Record<string, string>;
    const facts = Object.values(criteria).map((text) => JSON.parse(text) as Record<string, unknown>);
    const parafright = facts.filter((f) => /寄生惧魔/.test(String(f["plays"])) && !/胧光怪/.test(String(f["plays"])));
    expect(parafright.length).toBeGreaterThan(0);
    for (const f of parafright) {
      expect(f["rollout_best"]).toBeUndefined();
      expect(String(f["rollout_kill_order"])).toMatch(/^寄生惧魔 > 胧光怪: .*keep aiming at it first/);
    }
    expect(facts.some((f) => f["rollout_best"] === true && /胧光怪/.test(String(f["plays"])))).toBe(true);
    // Keep the original later-turn contract: multiple samples reach both T4 and T5, never a one-turn fallback.
    expect(results).toHaveLength(1);
    expect(results[0]!.horizon).toBeGreaterThanOrEqual(3);
    expect(results[0]!.samples).toBeGreaterThanOrEqual(2);
    expect(results[0]!.degraded).not.toContain("1-turn");
    expect(results[0]!.elapsedMs).toBeLessThanOrEqual(ROLLOUT_BUDGET_MS);
    // Bound actual solver work as well as the clock: the old 1e9-ms fixture runs hundreds of policy turns.
    expect(results[0]!.policyTurns).toBeLessThanOrEqual(100);
  });
});
