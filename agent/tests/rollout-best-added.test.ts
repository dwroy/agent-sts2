/** S1.exp100: test the omitted-best-line contract with fixed models and a controlled clock. */
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
// Setup imports planner modules first; discard their generated-data caches before pinning the reader.
vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const pinned = JSON.parse(fs.readFileSync(new URL("./potion-cost-knowledge.json", import.meta.url), "utf8")) as Record<string, unknown>;
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      const name = basename(path);
      if (Object.hasOwn(pinned, name)) return JSON.stringify(pinned[name]);
      throw Object.assign(new Error(`ENOENT: fixed rollout references, ${name}`), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

import type { AnswerSet } from "../src/reflex/jev/answers.js";
import type { AskDecision } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { loadFightValueModel } from "../src/reflex/fight-value.js";
import { loadFightValueGates } from "../src/reflex/rollout.js";
import { readMonsterDbJson } from "../src/knowledge/monster-db.js";
import { logged, loggedEnv } from "./logged.js";

const criteriaOf = (decision: AskDecision) => (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria! as Record<string, string | null>;
const planKeys = (criteria: Record<string, string | null>) => Object.keys(criteria).filter((key) => /^plan\d+$/.test(key));
const facts = (criteria: Record<string, string | null>, key: string) => JSON.parse(criteria[key]!) as Record<string, unknown>;
const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;

function plan(name: string, enabled: boolean) {
  rolloutLiveOptions.enabled = enabled;
  potionMcOptions.now = () => 0;
  return planCombatTurn(loggedEnv(logged(name), { jevContext: "v1" }));
}

afterEach(() => {
  vi.restoreAllMocks();
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = null;
  potionMcOptions.now = null;
});

describe("fixed omitted rollout best", () => {
  it("pins the monster transitions and terminal model used by the best-added fixture", () => {
    const pinned = JSON.parse(readFileSync(new URL("./potion-cost-knowledge.json", import.meta.url), "utf8"));
    expect(readMonsterDbJson()).toEqual(pinned["monster-db.json"]);
    expect(loadFightValueModel()).toEqual(pinned["fight-value.json"]);
    expect(loadFightValueGates()).toEqual(pinned["fight-value-gates.json"]);
  });
  it("the rollout's best line is added, last and marked, when code did not show it", () => {
    rolloutLiveOptions.now = () => 0;
    // Exercise the addition contract on a fixed board, independent of host pauses and refreshed models.
    let wall = 0;
    vi.spyOn(performance, "now").mockImplementation(() => (wall += 10_000));
    let addedSomewhere = false;
    for (const name of ["0nzb-f25-t1-brand"]) {
      const off = plan(name, false);
      const on = plan(name, true);
      if (on?.kind !== "ask" || off?.kind !== "ask") continue;
      const before = planKeys(criteriaOf(off));
      const after = planKeys(criteriaOf(on));
      const best = after.filter((key) => facts(criteriaOf(on), key)["rollout_best"] === true);
      expect(best.length, name).toBeLessThanOrEqual(1);
      if (after.length > before.length) {
        addedSomewhere = true;
        expect(after.length, name).toBe(before.length + 1);
        expect(best, name).toEqual([after[after.length - 1]]);
        // A line code did not show (it may share the plays text: same cards, another target).
        const { rollout: _r, history_estimate: _h, rollout_best: _b, ...added } = facts(criteriaOf(on), best[0]!);
        expect(before.map((key) => facts(criteriaOf(off), key)), name).not.toContainEqual(added);
        const resolved = on.resolve(pick(best[0]!));
        expect(resolved.log?.rollout).toMatchObject({ best_added: true });
        expect(resolved.log?.rollout_best_chosen).toBe(true);
        expect(resolved.rationale).toContain("rollout's best line, added");
      }
    }
    expect(addedSomewhere).toBe(true);
  }, 120_000);

});
