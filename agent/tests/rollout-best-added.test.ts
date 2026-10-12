/** S1.exp100 and fix-queue-v4 rollout-live-best-test-determinism: fixed models and clocks for best-line contracts. */
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
import { liveRollout, ROLLOUT_BUDGET_MS, rolloutFacts, rolloutLiveOptions, segmentName } from "../src/reflex/rollout-live.js";
import { loadFightValueModel } from "../src/reflex/fight-value.js";
import { loadFightValueGates, type FightValueGates } from "../src/reflex/rollout.js";
import { readMonsterDbJson } from "../src/knowledge/monster-db.js";
import type { CardModel } from "../src/reflex/card-model.js";
import { solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/reflex/turn-solver.js";
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
  it.each([0, 10_000])("liveRollout picks its best among all code's lines, not only the shown ones (and adds no potion line), with %i ms host pauses", (pause) => {
    // Best-line comparisons require a full rollout, independently of scheduler pauses.
    rolloutLiveOptions.now = () => 0;
    let wall = 0;
    vi.spyOn(performance, "now").mockImplementation(() => (wall += pause));
    expect(rolloutLiveOptions.budgetMs).toBe(ROLLOUT_BUDGET_MS);
    const card = (index: number, cardId: string, o: Partial<CardModel>): CardModel => ({
      index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0],
      damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
      draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...o,
    });
    const strike = (i: number) => card(i, "STRIKE", { damage: 6 });
    const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 5 });
    const hand = [strike(0), strike(1), defend(2), defend(3), strike(4)];
    const player: PlayerSim = { hp: 50, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
    const enemy: EnemySim = { index: 0, name: "Jaw Worm", hp: 30, maxHp: 44, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 11, hits: 1 }] };
    const solver: SolverInput = { hand, player, enemies: [enemy], fightKind: "monster", turn: 2 };
    const plans = solveTurn(solver).plans;
    const fx = logged("g8yy-f30-t3");
    const env = loggedEnv(fx);
    const worst = plans[plans.length - 1]!;
    const r = liveRollout({ state: env.state, knowledge: env.knowledge, memory: env.screenMemory, solver, plans, shown: [worst], piles: { draw: [strike(10), defend(11), strike(12), defend(13), strike(14)], discard: [] } });
    expect(r.available).toBe(true);
    if (!r.available) return;
    expect(r.result.degraded).not.toContain("1-turn");
    expect(r.best).not.toBeNull();
    const values = r.result.lines.map((line) => line.value);
    expect(r.byPlan.get(r.best!)!.value).toBe(Math.max(...values));
    expect(r.byPlan.has(worst)).toBe(true);
    expect(rolloutFacts(worst, r)["rollout"]).toMatch(/^5-turn rollout/);
    // The encounter's own n, and the backed-off segment named as the estimate's source.
    const gates = loadFightValueGates()!;
    const history = (g: FightValueGates) =>
      String(rolloutFacts(worst, liveRollout({ state: env.state, knowledge: env.knowledge, memory: env.screenMemory, solver, plans, shown: [worst], piles: { draw: [strike(10), defend(11)], discard: [] }, gates: g }))["history_estimate"]);
    const enc = env.screenMemory.rolloutEncounter!.enc;
    const act = r.meta.act;
    const few = { ...gates, segments: { ...gates.segments, [`enc:${enc}`]: { ...gates.segments[`ak:${act}|hallway`]!, level: "enc" as const, n_rows: 37, uses: `ak:${act}|hallway` } } };
    expect(history(few)).toMatch(new RegExp(`\\(this encounter n=37; estimate from act-${act} hallway fights n=${gates.segments[`ak:${act}|hallway`]!.n_rows}, typical error ±5\\.5; few similar states for this encounter\\)$`));
    const own = { ...gates, segments: { ...gates.segments, [`enc:${enc}`]: { ...gates.segments[`ak:${act}|hallway`]!, level: "enc" as const, n_rows: 300, uses: `enc:${enc}` } } };
    expect(history(own)).toMatch(/\(this encounter n=300, typical error ±5\.5\)$/);
    expect(segmentName("ak:1|hallway")).toBe("act-1 hallway fights");
    expect(segmentName("k:boss")).toBe("boss fights");
    // No piles: skipped.
    const none = liveRollout({ state: env.state, knowledge: env.knowledge, memory: env.screenMemory, solver, plans, shown: [worst], piles: null });
    expect(none.available).toBe(false);
    expect(rolloutFacts(worst, none)).toEqual({ rollout: "rollout unavailable (no draw/discard piles in the state)" });
  }, 30_000);

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
