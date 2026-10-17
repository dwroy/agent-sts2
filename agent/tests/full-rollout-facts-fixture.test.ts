import { expect, it, vi } from "vitest";

// Every knowledge read is frozen; unlisted JSON cannot fall through to refreshed tables.
vi.mock("node:fs", async original => {
  const fs = await original<typeof import("node:fs")>();
  const { basename } = await import("node:path");
  const pinned = JSON.parse(fs.readFileSync(new URL("./boss-lines-data/pinned-knowledge.json", import.meta.url), "utf8"));
  const knowledge = (path: unknown) => String(path).includes("/knowledge/") && String(path).endsWith(".json");
  const fixed = (path: unknown) => {
    const name = basename(String(path));
    if (name in pinned) return JSON.stringify(pinned[name]);
    throw Object.assign(new Error("ENOENT: no refreshed knowledge in full-facts fixture"), { code: "ENOENT" });
  };
  return { ...fs,
    existsSync: (path: any) => knowledge(path) ? basename(String(path)) in pinned : fs.existsSync(path),
    statSync: (path: any, ...rest: any[]) => knowledge(path)
      ? { size: fixed(path).length, mtimeMs: 1, isFile: () => true }
      : (fs.statSync as any)(path, ...rest),
    readFileSync: (path: any, ...rest: any[]) => knowledge(path) ? fixed(path) : (fs.readFileSync as any)(path, ...rest),
  };
});
vi.mock("../src/reflex/rollout.js", async original => ({
  ...await original<typeof import("../src/reflex/rollout.js")>(),
  rolloutDecision: vi.fn(() => { throw new Error("format fixtures must not simulate future turns"); }),
}));

import { rolloutDecision } from "../src/reflex/rollout.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import type { AskDecision } from "../src/memory/types.js";
import { logged, loggedEnv } from "./logged.js";
import { withFullRolloutFacts } from "./full-rollout-facts-fixture.js";

it("renders full 5x8 facts, choices and logs with the future-turn simulator unavailable", () => {
  for (const jevContext of ["v1", "off"] as const) {
    const decision = withFullRolloutFacts(() => planCombatTurn(loggedEnv(logged("g8yy-f30-t3"), { jevContext }))) as AskDecision;
    expect(decision.kind).toBe("ask");
    expect(rolloutDecision).not.toHaveBeenCalled();
    const criteria = (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria!;
    const keys = Object.keys(criteria).filter(key => /^plan\d+$/.test(key));
    expect(keys.length).toBeGreaterThanOrEqual(2);
    const facts = (key: string) => JSON.parse(criteria[key]!);
    for (const key of keys) {
      expect(facts(key).rollout_turns.split("; ")).toHaveLength(5);
      expect(facts(key).rollout).toContain("5-turn rollout (8 samples)");
      expect(facts(key).history_estimate).toBe("further HP loss 12, win 50% (this encounter n=30, typical error ±5.5)");
    }
    const best = keys.filter(key => facts(key).rollout_best === true);
    expect(best).toHaveLength(1);
    const result = decision.resolve({ plan: { type: "choice", choice: best[0]!, confidence: 0.9, probabilities: { [best[0]!]: 0.9 }, raw: {} } } as any);
    expect(result.log?.rollout_best_chosen).toBe(true);
    expect(result.log?.rollout).toMatchObject({ available: true, horizon: 5, samples: 8, best: best[0] });
  }
});
