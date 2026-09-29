/**
 * The rollout as facts for Jev's combat question (src/strategy/rollout-live.ts, combat-plan.ts): the facts are
 * on every option, the rollout's best line is shown (added when code did not show it), the time budget holds
 * under a mock clock, and code's options, their order and its auto-acts are the same with and without it.
 */

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { enemyTable, liveRollout, pickRolloutBest, ROLLOUT_BUDGET_MS, rolloutFacts, rolloutLiveOptions, segmentName } from "../src/strategy/rollout-live.js";
import { readFileSync } from "node:fs";
import { loadFightValueGates, type FightValueGates, type LineEstimate } from "../src/strategy/rollout.js";
import { solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { logged, loggedEnv } from "./logged.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states");
const BOARDS = readdirSync(DIR)
  .filter((name) => name.endsWith(".json") && name !== "game-data.json" && name !== "boss-clock-boards.json")
  .map((name) => name.replace(/\.json$/, ""))
  .filter((name) => (logged(name).state["combat"] ?? null) !== null);

afterEach(() => {
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = null;
});

function plan(name: string, enabled: boolean, jevContext: "v1" | "off" = "v1"): Decision | null {
  rolloutLiveOptions.enabled = enabled;
  // The random-potion samples are cut by wall-clock time; a frozen clock keeps them identical across calls.
  potionMcOptions.now = () => 0;
  return planCombatTurn(loggedEnv(logged(name), { jevContext }));
}

const criteriaOf = (decision: AskDecision) => (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria!;
const planKeys = (criteria: Record<string, string | null>) => Object.keys(criteria).filter((key) => /^plan\d+$/.test(key));
const facts = (criteria: Record<string, string | null>, key: string) => JSON.parse(criteria[key]!) as Record<string, unknown>;
const pick = (key: string, confidence = 0.9): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;

/** A fake clock: every read advances it by `step` ms. */
function fakeClock(step: number): () => number {
  let t = 0;
  return () => (t += step);
}

describe("rollout facts on Jev's combat question", () => {
  it("every option of a logged board carries the rollout and history facts; the decision log gets the rollout", () => {
    // The format at full size (5 x 8): no time budget (the kill orders can make this board degrade under load).
    rolloutLiveOptions.budgetMs = 1e9;
    for (const context of ["v1", "off"] as const) {
      const decision = plan("g8yy-f30-t3", true, context) as AskDecision;
      expect(decision.kind).toBe("ask");
      const criteria = criteriaOf(decision);
      const keys = planKeys(criteria);
      expect(keys.length).toBeGreaterThanOrEqual(2);
      for (const key of keys) {
        const f = facts(criteria, key);
        // Turn by turn: turn 1 exact, then T2..T5 with the spread over the samples.
        expect(String(f["rollout_turns"])).toMatch(/^T1 exact: hp -\d+, dmg \d+(, won|, dead)?(; T[2-5]: (hp -[\d.]+ \[\d+-\d+\], dmg [\d.]+ \[\d+-\d+\], alive \d\/8, won \d\/8|over \(alive \d\/8, won \d\/8\)))*$/);
        expect(String(f["rollout_turns"]).split("; ")).toHaveLength(5);
        expect(String(f["rollout"])).toMatch(/^5-turn rollout \(8 samples\)( \(later turns may use the potions still held\))?: expected further HP loss [\d.]+, fight over within 5 turns in \d\/8(, expected turns to the end \(surviving samples\) ~[\d.]+)?(, dead within 5 turns in \d\/8 \(~turn [\d.]+\))?$/);
        expect(String(f["history_estimate"])).toMatch(/^further HP loss \d+, win \d+% \(this encounter n=\d+(; estimate from [\w -]+ n=\d+)?, typical error ±[\d.]+(; few similar states for this encounter)?\)$/);
        expect(JSON.stringify(f)).not.toMatch(/\bw\b|weight/);
      }
      expect(keys.filter((key) => facts(criteria, key)["rollout_best"] === true)).toHaveLength(1);
      const best = keys.find((key) => facts(criteria, key)["rollout_best"] === true)!;
      const other = keys.find((key) => key !== best)!;
      const resolved = decision.resolve(pick(best));
      expect(resolved.log?.rollout_best_chosen).toBe(true);
      expect(resolved.log?.rollout).toMatchObject({ available: true, horizon: 5, samples: 8, best });
      expect(decision.resolve(pick(other)).log?.rollout_best_chosen).toBe(false);
      expect(decision.resolve({} as AnswerSet).log?.rollout_best_chosen).toBeNull();
    }
  });

  it("with a modelled potion held, the rollout fact says later turns may use it", () => {
    const decision = plan("v1mf-f33-t4", true) as AskDecision;
    expect(decision.kind).toBe("ask");
    const criteria = criteriaOf(decision);
    for (const key of planKeys(criteria)) expect(String(facts(criteria, key)["rollout"]), key).toContain("(later turns may use the potions still held)");
  });

  it("a drink-first potion option says it is not rolled out", () => {
    const decision = plan("fn0h-f33-t2", true) as AskDecision;
    const criteria = criteriaOf(decision);
    const potionKeys = Object.keys(criteria).filter((key) => !/^plan\d+$/.test(key));
    expect(potionKeys.length).toBeGreaterThan(0);
    for (const key of potionKeys) expect(String(facts(criteria, key)["rollout"])).toMatch(/^not rolled out/);
  });

  it("the rollout's best line is added, last and marked, when code did not show it", () => {
    let addedSomewhere = false;
    for (const name of BOARDS) {
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
  }, 60_000);

  it("liveRollout picks its best among all code's lines, not only the shown ones (and adds no potion line)", () => {
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
  });

  it("up to 10 options: every shown line of every logged board carries the rollout and history facts, exactly one is rollout_best (at most one on a saturated board)", async () => {
    const { MAX_OPTIONS } = await import("../src/screens/combat-plan.js");
    expect(MAX_OPTIONS).toBe(10);
    let most = 0;
    for (const name of BOARDS) {
      const decision = plan(name, true);
      if (decision?.kind !== "ask") continue;
      const criteria = criteriaOf(decision);
      const keys = planKeys(criteria);
      most = Math.max(most, keys.length);
      expect(keys.length, name).toBeLessThanOrEqual(MAX_OPTIONS + 2); // + a planned setup line, + the rollout's added line
      const log = decision.resolve(pick("plan1")).log?.rollout as Record<string, unknown> | undefined;
      if (!log?.["available"]) continue;
      for (const key of keys) {
        const f = facts(criteria, key);
        expect(String(f["rollout"]), `${name} ${key}`).toMatch(/rollout|estimate/);
        expect(String(f["rollout"]), `${name} ${key}`).not.toMatch(/unavailable/);
        expect(f["history_estimate"], `${name} ${key}`).toBeDefined();
      }
      // The rollout's best: one line, or a random potion's option (its median sample's line); none at
      // most when every line loses all the HP and they tie on enemy HP left and turns alive too. Not
      // saturated: one best, or two or more options tied for it (the same numbers as shown) and no best.
      const tagged = Object.keys(criteria).filter((key) => facts(criteria, key)["rollout_best"] === true).length;
      const tied = Object.keys(criteria).filter((key) => facts(criteria, key)["rollout_tied"] !== undefined);
      if (log["saturated"] === true) expect(tagged + tied.length, name).toBeLessThanOrEqual(1);
      else if (tied.length > 0) {
        expect(tagged, name).toBe(0);
        expect(tied.length, name).toBeGreaterThanOrEqual(2);
        expect(log["tied"], name).toEqual(tied);
        const shownLoss = (key: string) => /expected further HP loss ([\d.]+)/.exec(String(facts(criteria, key)["rollout"]))![1];
        expect(new Set(tied.map(shownLoss)).size, name).toBe(1);
      } else expect(tagged, name).toBe(1);
    }
    expect(most).toBeGreaterThan(4);
  }, 60_000);

  it("keeps to the time budget under a mock clock, degrading the horizon/samples, and says so", () => {
    // 3 ms per clock read: the policy looks slow, the full 5 x 8 does not fit.
    rolloutLiveOptions.now = fakeClock(3);
    const slow = plan("g8yy-f30-t3", true) as AskDecision;
    const log = slow.resolve(pick("plan1")).log!.rollout as Record<string, unknown>;
    expect(log["available"]).toBe(true);
    expect(Number(log["ms"])).toBeLessThanOrEqual(ROLLOUT_BUDGET_MS);
    expect((log["degraded"] as string[]).length).toBeGreaterThan(0);
    const text = String(facts(criteriaOf(slow), "plan1")["rollout"]);
    expect(text).toMatch(/cut to fit the time budget/);
    expect(text).toContain(`${log["horizon"]}-turn`.replace(/^1-turn$/, "1-turn estimate"));
    // A clock past the budget at once: the 1-turn estimate only, still within the budget.
    rolloutLiveOptions.now = fakeClock(400);
    const cut = plan("g8yy-f30-t3", true) as AskDecision;
    const cutLog = cut.resolve(pick("plan1")).log!.rollout as Record<string, unknown>;
    expect(cutLog["horizon"]).toBe(1);
    expect(String(facts(criteriaOf(cut), "plan1")["rollout"])).toMatch(/^1-turn estimate \(no rollout\)/);
  });

  it("the real clock: every logged board's rollout stays inside the budget", () => {
    for (const name of BOARDS) {
      const decision = plan(name, true);
      if (decision?.kind !== "ask") continue;
      const log = decision.resolve(pick("plan1")).log?.rollout as Record<string, unknown> | undefined;
      expect(log, name).toBeDefined();
      expect(Number(log!["ms"]), name).toBeLessThanOrEqual(ROLLOUT_BUDGET_MS);
    }
  }, 60_000);

  it("code's ranking, options and auto-acts are unchanged by the rollout", () => {
    for (const name of BOARDS) {
      for (const context of ["v1", "off"] as const) {
        const off = plan(name, false, context);
        const on = plan(name, true, context);
        // The one designed dependence (Dai 2026-09-28): an unsimulated potion is offered when the best
        // potion-free option dies in a rollout sample (T1), which only the rollout knows.
        const t1 = on?.kind === "ask" ? ((on.resolve(pick("plan1")).log?.potions as { t1?: { hp: boolean; rollout_death: boolean } } | undefined)?.t1 ?? null) : null;
        if (t1 && t1.rollout_death && !t1.hp) continue;
        expect(on?.kind, name).toBe(off?.kind);
        expect(on?.label, name).toBe(off?.label);
        if (off?.kind === "act" && on?.kind === "act") {
          expect(on.intent, name).toEqual(off.intent);
          expect(on.rationale, name).toBe(off.rationale);
          continue;
        }
        if (off?.kind !== "ask" || on?.kind !== "ask") continue;
        const before = criteriaOf(off);
        const after = criteriaOf(on);
        for (const key of Object.keys(before)) {
          // Same option under the same key, the rollout facts aside.
          // (An unsimulated potion's offered_because may add the rollout's dying sample as a reason.)
          const { rollout: _r, history_estimate: _h, rollout_best: _b, rollout_tied: _tie, rollout_turns: _t, rollout_kill_order: _k, rollout_other_orders: _ko, offered_because: _o, ...rest } = facts(after, key);
          const { offered_because: _o2, ...restBefore } = facts(before, key);
          expect(rest, `${name} ${key}`).toEqual(restBefore);
          // And resolving it plays the same (the HP guard and potion rules see code's options only).
          for (const confidence of [0.9, 0.3]) {
            const a = off.resolve(pick(key, confidence));
            const b = on.resolve(pick(key, confidence));
            expect(b.intent, `${name} ${key}`).toEqual(a.intent);
            // The option count in "plan k/N" is what Jev saw (N + 1 with an added line); the rest is the same.
            const count = (text: string) => text.replace(/plan (\d+)\/\d+/, "plan $1/N");
            expect(count(b.rationale), `${name} ${key}`).toBe(count(a.rationale));
            expect(b.guard, `${name} ${key}`).toEqual(a.guard);
          }
        }
      }
    }
  }, 120_000);
});

describe("enemy tables", () => {
  it("the Tunneler's Burrow is marked as gaining Burrowed (RWWG F20)", () => {
    const knowledge = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "knowledge");
    const db = JSON.parse(readFileSync(join(knowledge, "monster-db.json"), "utf8")).monsters;
    const mm = JSON.parse(readFileSync(join(knowledge, "move-model.json"), "utf8"));
    const table = enemyTable("TUNNELER", 8, db, mm)!;
    expect(table.moves["BURROW_MOVE"]).toMatchObject({ burrows: true });
    expect(table.moves["BURROW_MOVE"]!.block).toBeGreaterThan(0);
    expect(table.moves["BELOW_MOVE"]!.burrows).toBeUndefined();
  });
});

describe("the rollout's best line when every line loses all the HP (HEACJRY5LEVD F17, 8V0HD9Y207WY F17)", () => {
  const line = (name: string, over: Partial<LineEstimate>): LineEstimate =>
    ({ plan: { steps: [], name } as unknown as LineEstimate["plan"], value: -62 - 40, hpLoss: 62, wins: 0, deaths: 8, enemyHpLeft: 100, turnsSurvived: 4, ...over }) as LineEstimate;

  it("saturated: the value says nothing; the least enemy HP left, then the most turns alive, else no best", () => {
    // 8V0H T2: all ten lines "further loss 62" = our HP; the first (code rank 1) was tagged best.
    const a = line("a", { value: -101.9, enemyHpLeft: 150 });
    const b = line("b", { value: -102, enemyHpLeft: 120 });
    const c = line("c", { value: -102, enemyHpLeft: 121.5 });
    expect(pickRolloutBest([a, b, c], 62)).toMatchObject({ best: b, saturated: true });
    // HEAC T6: 49 vs 48.9 (one sample lost one HP less) is still saturated; equal enemy HP: turns alive decide.
    const d = line("d", { hpLoss: 48.9, value: -88.9, enemyHpLeft: 80, turnsSurvived: 3.5 });
    const e = line("e", { hpLoss: 49, value: -89, enemyHpLeft: 80.4, turnsSurvived: 4 });
    expect(pickRolloutBest([d, e], 49)).toMatchObject({ best: e, saturated: true });
    // Nothing tells them apart: no best line.
    expect(pickRolloutBest([line("f", { enemyHpLeft: 80 }), line("g", { enemyHpLeft: 80.5 })], 62)).toEqual({ best: null, saturated: true });
  });

  it("not saturated: the highest value; exact ties by enemy HP left, then code's order", () => {
    const safe = line("safe", { hpLoss: 20, value: -20, wins: 8, deaths: 0, enemyHpLeft: 0, turnsSurvived: 5 });
    const dies = line("dies", {});
    expect(pickRolloutBest([dies, safe], 62)).toMatchObject({ best: safe, saturated: false });
    const tieA = line("tieA", { hpLoss: 10, value: -30, wins: 0, deaths: 0, enemyHpLeft: 40, turnsSurvived: 5 });
    const tieB = line("tieB", { hpLoss: 10, value: -30, wins: 0, deaths: 0, enemyHpLeft: 30, turnsSurvived: 5 });
    expect(pickRolloutBest([tieA, tieB], 62).best).toBe(tieB);
    const same = line("same", { hpLoss: 10, value: -30, wins: 0, deaths: 0, enemyHpLeft: 40, turnsSurvived: 5 });
    expect(pickRolloutBest([tieA, same], 62).best).toBe(tieA);
  });

  it("logged saturated boards: every line reads the enemy HP left, and a tagged best has the least of it", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    for (const name of ["8v0h-f17-t2-saturated", "heac-f17-t2-saturated", "heac-f17-t6-saturated"]) {
      const decision = plan(name, true) as AskDecision;
      expect(decision.kind, name).toBe("ask");
      const log = decision.resolve(pick("plan1")).log?.rollout as Record<string, unknown>;
      expect(log["saturated"], name).toBe(true);
      const criteria = criteriaOf(decision);
      const left = new Map<string, number>();
      for (const key of Object.keys(criteria)) {
        const text = String(facts(criteria, key)["rollout"] ?? "");
        const m = /enemy HP left ~(\d+) \(at T\d or at our death\)/.exec(text);
        if (/^not rolled out/.test(text)) continue;
        expect(m, `${name} ${key}: ${text}`).not.toBeNull();
        left.set(key, Number(m![1]));
      }
      const tagged = [...left.keys()].filter((key) => facts(criteria, key)["rollout_best"] === true);
      expect(tagged.length, name).toBeLessThanOrEqual(1);
      if (tagged.length === 1) expect(left.get(tagged[0]!)! - Math.min(...left.values()), name).toBeLessThanOrEqual(1);
    }
  });
});

describe("an illusion killed before the decision revives in the rollout (QUG1DSDARAXU F23 T3)", () => {
  it("the dead Parafright (ILLUSION_POWER, REVIVE_MOVE) is back next turn: the rollout loses more, next turn's hit counts it", async () => {
    const { laterIncomingOf, revivingIllusions } = await import("../src/screens/combat-plan.js");
    rolloutLiveOptions.budgetMs = 1e9;
    const fx = logged("qug1-f23-t3-illusion-dead");
    const combat = fx.state["combat"] as Record<string, unknown>;
    const enemies = combat["enemies"] as Record<string, unknown>[];
    expect(enemies.find((enemy) => enemy["enemy_id"] === "PARAFRIGHT")).toMatchObject({ is_alive: false, move_id: "REVIVE_MOVE" });
    expect(revivingIllusions(combat).map((enemy) => enemy["enemy_id"])).toEqual(["PARAFRIGHT"]);
    // Without it (the old board as the rollout saw it): only the Obscura.
    const gone = logged("qug1-f23-t3-illusion-dead");
    const goneCombat = gone.state["combat"] as Record<string, unknown>;
    goneCombat["enemies"] = (goneCombat["enemies"] as Record<string, unknown>[]).filter((enemy) => enemy["enemy_id"] !== "PARAFRIGHT");
    expect(laterIncomingOf(combat)![0]! - laterIncomingOf(goneCombat)![0]!).toBeGreaterThan(10);
    // The logged question read "expected further HP loss 4.9, ... win 97%" for Defend; the Parafright hit for 12 on T4.
    const lossOf = (board: typeof fx) => {
      const decision = planCombatTurn(loggedEnv(board)) as AskDecision;
      const criteria = criteriaOf(decision);
      const defend = planKeys(criteria).find((key) => String(facts(criteria, key)["plays"]) === "防御")!;
      return Number(/expected further HP loss ([\d.]+)/.exec(String(facts(criteria, defend)["rollout"]))![1]);
    };
    potionMcOptions.now = () => 0;
    const withIt = lossOf(fx);
    const without = lossOf(gone);
    expect(withIt).toBeGreaterThan(without + 5);
  });
});


describe("enemy_threat_next counts a reviving illusion (QUG1DSDARAXU F23 T3)", () => {
  it("the dead Parafright's hit next turn is in every line's enemy_threat_next", async () => {
    const { boardDamageContext, revivingForecast } = await import("../src/knowledge/move-model.js");
    potionMcOptions.now = () => 0;
    rolloutLiveOptions.budgetMs = 1e9;
    const threats = (board: ReturnType<typeof logged>) => {
      const env = loggedEnv(board, { jevContext: "v1" });
      const decision = planCombatTurn(env) as AskDecision;
      const criteria = (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria as Record<string, string | null>;
      return planKeys(criteria).map((key) => Number(facts(criteria, key)["enemy_threat_next"]));
    };
    const fx = logged("qug1-f23-t3-illusion-dead");
    const gone = logged("qug1-f23-t3-illusion-dead");
    const goneCombat = gone.state["combat"] as Record<string, unknown>;
    goneCombat["enemies"] = (goneCombat["enemies"] as Record<string, unknown>[]).filter((enemy) => enemy["enemy_id"] !== "PARAFRIGHT");
    // At the run's ascension, as the facts compute it (move-model DamageContext).
    const fxCombat = fx.state["combat"] as Record<string, unknown>;
    const parafright = (fxCombat["enemies"] as Record<string, unknown>[]).find((enemy) => enemy["enemy_id"] === "PARAFRIGHT")!;
    const asc = Number((fx.state["run"] as Record<string, unknown>)["ascension"] ?? 0);
    const slam = revivingForecast("PARAFRIGHT", 1, boardDamageContext(parafright, fxCombat["player"] as Record<string, unknown>, asc))![0]!;
    expect(slam).toBeGreaterThan(10);
    const withIt = threats(fx);
    const without = threats(gone);
    expect(withIt.length).toBeGreaterThan(0);
    // Lines that do not end the fight read the Obscura's hit plus the Parafright's.
    expect(Math.abs(Math.max(...withIt) - (Math.max(...without) + slam))).toBeLessThanOrEqual(1);
  });
});
