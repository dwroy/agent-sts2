/** Fixed V1MF91VL7A2G F33 T4 replay for the queued rollout clock-isolation defect. */
import { basename, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (importOriginal) => {
  const { historicalKnowledgeFs } = await import("./historical-knowledge-fs.js");
  const fs = historicalKnowledgeFs(await importOriginal<typeof import("node:fs")>());
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const pinned = JSON.parse(fs.readFileSync(new URL("./potion-cost-knowledge.json", import.meta.url), "utf8")) as Record<string, unknown>;
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      const name = basename(path);
      if (Object.hasOwn(pinned, name)) return JSON.stringify(pinned[name]);
      throw Object.assign(new Error(`ENOENT: fixed held-potion references, ${name}`), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

import type { AskDecision } from "../src/memory/types.js";
import { ROLLOUT_BUDGET_MS, rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { heldPotionFixture } from "./rollout-held-potion-fixture.js";

afterEach(() => vi.restoreAllMocks());

describe("fixed held-potion rollout facts", () => {
  it.each([0, 10_000])("preserves later-use facts with %i ms host pauses", (pause) => {
    let wall = 0;
    vi.spyOn(performance, "now").mockImplementation(() => (wall += pause));
    const previousClock = rolloutLiveOptions.now;
    expect(rolloutLiveOptions.budgetMs).toBe(ROLLOUT_BUDGET_MS);
    const decision = heldPotionFixture() as AskDecision;
    expect(decision.kind).toBe("ask");
    const criteria = (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria!;
    const keys = Object.keys(criteria).filter((key) => /^plan\d+$/.test(key));
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const facts = JSON.parse(criteria[key]!) as Record<string, unknown>;
      expect(String(facts["rollout"]), key).toContain("(later turns may use the potions still held)");
    }
    expect(rolloutLiveOptions.budgetMs).toBe(ROLLOUT_BUDGET_MS);
    expect(rolloutLiveOptions.now).toBe(previousClock);
  }, 30_000);
});
