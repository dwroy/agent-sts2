/**
 * Per-target options and kill-order rollouts (Dai 2026-09-28: which enemy to kill is Jev's call). The logged
 * board is EZ2L F48 T2 (Queen 394 + Torch Head Amalgam 202, a minion): every option shown then hit the Queen,
 * the Amalgam-first line never reached Jev, nor did DeepSeek's plan ("先拆聚合体").
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import { setExperienceForTests, type ExperienceEntry } from "../src/knowledge/experience.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { focusLines, killGroups, MAX_OPTIONS, planCombatTurn, targetOptions } from "../src/screens/combat-plan.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { ROLLOUT_BUDGET_MS, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { killOrders, rolloutDecision, type EnemyTable, type KillGroup, type RolloutInput } from "../src/strategy/rollout.js";
import type { RunPlan } from "../src/strategy/run-plan.js";
import { solveTurn, type EnemySim, type Plan, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { logged, loggedEnv } from "./logged.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states");
const BOARDS = readdirSync(DIR)
  .filter((name) => name.endsWith(".json") && name !== "game-data.json" && name !== "boss-clock-boards.json")
  .map((name) => name.replace(/\.json$/, ""))
  .filter((name) => (logged(name).state["combat"] ?? null) !== null);

const AMALGAM = "火炬头聚合体";
const QUEEN = "女王";

afterEach(() => {
  targetOptions.enabled = true;
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = null;
  setExperienceForTests(null, null);
});

const LESSONS: ExperienceEntry[] = [
  { id: "q1", scope: "boss:QUEEN", asc: [2, 20], lesson: "先杀聚合体（它活着时伤害打女王等于白打）", evidence: [], n_support: 8, n_contradict: 0, confidence: "high", last_seen: "2026-09-28", status: "active" },
  { id: "q2", scope: "boss:QUEEN", asc: [0, 20], lesson: "进女王要 ≥70% 血", evidence: [], n_support: 3, n_contradict: 1, confidence: "med", last_seen: "2026-09-28", status: "active" },
  { id: "q3", scope: "boss:QUEEN", asc: [0, 20], lesson: "低置信的一条", evidence: [], n_support: 1, n_contradict: 0, confidence: "low", last_seen: "2026-09-28", status: "active" },
  { id: "q4", scope: "boss:QUEEN", asc: [0, 20], lesson: "第四条（超出前 3）", evidence: [], n_support: 1, n_contradict: 2, confidence: "low", last_seen: "2026-09-28", status: "active" },
  { id: "j1", scope: "hallway:JAW_WORM", asc: [0, 20], lesson: "别的敌人", evidence: [], n_support: 9, n_contradict: 0, confidence: "high", last_seen: "2026-09-28", status: "active" },
  { id: "c1", scope: "card:BASH", asc: [0, 20], lesson: "卡牌条目", evidence: [], n_support: 9, n_contradict: 0, confidence: "high", last_seen: "2026-09-28", status: "active" },
];

/** The EZ2L F48 T2 board, with the run plan DeepSeek had made (F44) in the memory (logged() leaves it out). */
function ez2l(opts: { budgetMs?: number; target?: boolean } = {}): Decision | null {
  targetOptions.enabled = opts.target ?? true;
  rolloutLiveOptions.budgetMs = opts.budgetMs ?? 1e9;
  potionMcOptions.now = () => 0;
  const env = loggedEnv(logged("ez2l-f48-t2"), { jevContext: "v1" });
  env.screenMemory.runPlan = (JSON.parse(readFileSync(join(DIR, "ez2l-f48-t2.json"), "utf8")) as { runPlan: RunPlan }).runPlan;
  return planCombatTurn(env);
}

const criteriaOf = (decision: AskDecision) => (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria as Record<string, string | null>;
const planKeys = (criteria: Record<string, string | null>) => Object.keys(criteria).filter((key) => /^plan\d+$/.test(key));
const facts = (criteria: Record<string, string | null>, key: string) => JSON.parse(criteria[key]!) as Record<string, unknown>;
const pick = (key: string, confidence = 0.9): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;

describe("per-target options (EZ2L F48 T2: Queen + Torch Head Amalgam)", () => {
  it("shows an Amalgam-focus line and a Queen-focus line, labelled, within the option cap", () => {
    setExperienceForTests(LESSONS);
    const decision = ez2l() as AskDecision;
    expect(decision.kind).toBe("ask");
    const criteria = criteriaOf(decision);
    const keys = planKeys(criteria);
    expect(Object.keys(criteria).length).toBeLessThanOrEqual(MAX_OPTIONS + 2);
    const focused = keys.map((key) => ({ key, f: facts(criteria, key) })).filter(({ f }) => f["focus"] !== undefined);
    const names = focused.flatMap(({ f }) => String(f["focus"]).split(", "));
    // Each kind of enemy keeps a slot.
    expect(names).toContain(AMALGAM);
    expect(names).toContain(QUEEN);
    // The Amalgam line aims at the Amalgam: every attack of it goes there, and it takes HP off it.
    const amalgam = focused.find(({ f }) => String(f["focus"]).includes(AMALGAM))!;
    expect(String(amalgam.f["plays"])).toContain(`-> ${AMALGAM}`);
    expect(String(amalgam.f["plays"])).not.toContain(`-> ${QUEEN}`);
    expect(String(amalgam.f["enemies_after"])).toMatch(new RegExp(`${AMALGAM} (\\d+) HP`));
    expect(Number(/火炬头聚合体 (\d+) HP/.exec(String(amalgam.f["enemies_after"]))![1])).toBeLessThan(202);
    // Without the per-target options (the question as it was) no shown line hit the Amalgam.
    const before = ez2l({ target: false }) as AskDecision;
    const beforeCriteria = criteriaOf(before);
    // (Breakthrough's 13 to every enemy was the most any of them put into it.)
    const amalgamHp = (f: Record<string, unknown>) => Number(/火炬头聚合体 (\d+) HP/.exec(String(f["enemies_after"]))![1]);
    const beforeLowest = Math.min(...planKeys(beforeCriteria).map((key) => amalgamHp(facts(beforeCriteria, key))));
    expect(beforeLowest).toBe(189);
    expect(amalgamHp(amalgam.f)).toBeLessThan(beforeLowest);
    expect(planKeys(beforeCriteria).some((key) => facts(beforeCriteria, key)["focus"] !== undefined)).toBe(false);
    // The decision log names the focus of each labelled option.
    const log = decision.resolve(pick(amalgam.key)).log as Record<string, unknown>;
    expect(Object.values(log["focus"] as Record<string, string>)).toContain(AMALGAM);
  });

  it("Jev's picking an Amalgam-focus line plays it (no swap to a Queen line with more damage)", () => {
    const decision = ez2l() as AskDecision;
    const criteria = criteriaOf(decision);
    const key = planKeys(criteria).find((k) => String(facts(criteria, k)["focus"] ?? "").includes(AMALGAM))!;
    for (const confidence of [0.9, 0.2]) {
      const resolved = decision.resolve(pick(key, confidence));
      expect(resolved.fallback).toBe(false);
      const target = (resolved.intent as { target_index?: number }).target_index;
      // The first step is a card aimed at the Amalgam (index 0 on this board) or an untargeted setup card.
      if (target !== undefined) expect(target).toBe(0);
      expect(resolved.rationale).not.toContain("is as good or better on every axis");
    }
  });

  it("gives Jev DeepSeek's whole plan (boss prep and kill order included) and the top 3 lessons about these enemies", () => {
    setExperienceForTests(LESSONS);
    const decision = ez2l() as AskDecision;
    const state = decision.jevView!.state;
    const plan = String(state["deepseek_plan"]);
    expect(plan).toMatch(/^DeepSeek's run plan \(F44; advice, not orders\): /);
    expect(plan).toContain("先拆 211 血聚合体");
    expect(plan).toContain("boss prep: 火堆回血");
    expect(plan).toContain("之后伤害全给聚合体");
    expect(decision.state["deepseek_plan"]).toBe(plan);
    expect(JSON.stringify(state["potion_context"])).not.toContain("run_plan");
    const experience = state["experience"] as { note: string; lessons: string[] };
    expect(experience.note).toMatch(/evidence, not orders/);
    expect(experience.lessons).toHaveLength(3);
    expect(experience.lessons[0]).toBe("[boss:QUEEN | confidence high, n=8] 先杀聚合体（它活着时伤害打女王等于白打）");
    expect(experience.lessons[1]).toContain("against 1");
    expect(experience.lessons.join("\n")).not.toMatch(/第四条|别的敌人|卡牌条目/);
  });

  it("rolls every shown line out under both kill orders, the Amalgam first among them, and reports and logs them", () => {
    const decision = ez2l() as AskDecision;
    const criteria = criteriaOf(decision);
    for (const key of planKeys(criteria)) {
      const f = facts(criteria, key);
      const order = String(f["rollout_kill_order"]);
      const others = String(f["rollout_other_orders"]);
      expect(order, key).toMatch(/best of 2 kill orders compared/);
      // Both orders are there, one as the best, the other beside it.
      const both = `${order} | ${others}`;
      expect(both, key).toContain(`${AMALGAM} > ${QUEEN}`);
      expect(both, key).toContain(`${QUEEN} > ${AMALGAM}`);
      expect(others, key).toMatch(/further HP loss [\d.]+, over \d\/8, dead \d\/8, \S+ dead \d\/8$/);
      expect(String(f["rollout"]), key).toMatch(/^5-turn rollout \(8 samples\)/);
    }
    const bestKey = planKeys(criteria).find((key) => facts(criteria, key)["rollout_best"] === true)!;
    const resolved = decision.resolve(pick(bestKey));
    const rollout = resolved.log!["rollout"] as Record<string, unknown>;
    expect(rollout).toMatchObject({ available: true, orders: 2, orders_dropped: 0 });
    expect(String(rollout["best_order"])).toMatch(new RegExp(`^(${AMALGAM} > ${QUEEN}|${QUEEN} > ${AMALGAM})$`));
    expect(resolved.log!["chosen_order"]).toBe(rollout["best_order"]);
  });

  it("is deterministic: the same board gives the same options and the same kill-order numbers", () => {
    const a = criteriaOf(ez2l() as AskDecision);
    const b = criteriaOf(ez2l() as AskDecision);
    expect(b).toEqual(a);
  });

  it("stays inside the time budget with the real clock, degrading the samples per order first", () => {
    const decision = ez2l({ budgetMs: ROLLOUT_BUDGET_MS }) as AskDecision;
    const log = decision.resolve(pick("plan1")).log!["rollout"] as Record<string, unknown>;
    expect(Number(log["ms"])).toBeLessThanOrEqual(ROLLOUT_BUDGET_MS);
    for (const step of log["degraded"] as string[]) expect(step).toMatch(/^(samples \d per kill order|horizon 3|1-turn|samples \d \(clock\))$/);
  });
});

describe("code's auto-acts with the per-target options", () => {
  it("every logged board: one kind of enemy unchanged; several kinds only move from code's act to Jev's question, never to another act", () => {
    let moved = 0;
    let multiActs = 0;
    for (const name of BOARDS) {
      rolloutLiveOptions.enabled = false;
      potionMcOptions.now = () => 0;
      targetOptions.enabled = false;
      const off = planCombatTurn(loggedEnv(logged(name), { jevContext: "v1" }));
      targetOptions.enabled = true;
      const on = planCombatTurn(loggedEnv(logged(name), { jevContext: "v1" }));
      const fx = logged(name);
      const combat = fx.state["combat"] as Record<string, unknown>;
      const kinds = new Set(
        (combat["enemies"] as Record<string, unknown>[]).filter((e) => e["is_alive"] !== false && Number(e["current_hp"]) > 0).map((e) => String(e["enemy_id"])),
      ).size;
      if (off?.kind === "act") {
        if (kinds >= 2) multiActs += 1;
        if (on?.kind === "ask" && kinds >= 2) {
          // Code's line did not beat some line on damage into some kind of enemy: Jev's question now.
          moved += 1;
          continue;
        }
        expect(on?.kind, name).toBe("act");
        expect(on?.label, name).toBe(off.label);
        expect((on as typeof off).intent, name).toEqual(off.intent);
        expect((on as typeof off).rationale, name).toBe(off.rationale);
        continue;
      }
      expect(on?.kind, name).toBe(off?.kind);
      expect(on?.label, name).toBe(off?.label);
      if (off?.kind !== "ask" || on?.kind !== "ask") continue;
      const before = criteriaOf(off);
      const after = criteriaOf(on);
      if (kinds < 2) {
        expect(after, name).toEqual(before);
        continue;
      }
      const plays = (criteria: Record<string, string | null>) => planKeys(criteria).map((key) => String(facts(criteria, key)["plays"]));
      const shown = plays(after);
      // Every line shown before is still shown, unless the cap gave its slot to a focus line.
      const focusCount = planKeys(after).filter((key) => facts(after, key)["focus"] !== undefined).length;
      const kept = plays(before).filter((line) => shown.includes(line)).length;
      expect(kept, name).toBeGreaterThanOrEqual(plays(before).length - focusCount);
      expect(Object.keys(after).length, name).toBeLessThanOrEqual(Math.max(MAX_OPTIONS + 2, Object.keys(before).length));
      // Code's own fallback (no usable answer) is the same line.
      expect(on.resolve({} as AnswerSet).intent, name).toEqual(off.resolve({} as AnswerSet).intent);
    }
    expect(moved).toBeLessThanOrEqual(multiActs);
  }, 120_000);

  it("a line that beats the rest on every axis but puts less into one kind of enemy is not code's to play: Jev is asked", () => {
    // EZ2L F48 T2 with one card: Strike. "Strike -> Queen" and "Strike -> Amalgam" deal the same; with a
    // Vulnerable Queen, the Queen line deals more on every axis, and code used to play it.
    targetOptions.enabled = false;
    rolloutLiveOptions.enabled = false;
    potionMcOptions.now = () => 0;
    const fx = logged("ez2l-f48-t2");
    const combat = fx.state["combat"] as Record<string, unknown>;
    const hand = combat["hand"] as Record<string, unknown>[];
    const strike = hand.find((card) => String(card["card_id"]).startsWith("STRIKE"))!;
    combat["hand"] = [{ ...strike, index: 0 }];
    // No potions: the question would be Jev's anyway.
    const run = fx.state["run"] as Record<string, unknown>;
    run["potions"] = (run["potions"] as Record<string, unknown>[]).map((slot) => ({ ...slot, occupied: false, potion_id: null }));
    const off = planCombatTurn(loggedEnv(fx, { jevContext: "v1" }));
    expect(off?.kind, off?.kind === "ask" ? off.label : "").toBe("act");
    expect(off?.label, off?.kind === "act" ? off.rationale : "").toBe("combat/plan");
    targetOptions.enabled = true;
    const on = planCombatTurn(loggedEnv(fx, { jevContext: "v1" })) as AskDecision;
    expect(on.kind).toBe("ask");
    const criteria = criteriaOf(on);
    const focus = planKeys(criteria).map((key) => String(facts(criteria, key)["focus"] ?? ""));
    expect(focus.join("|")).toContain(AMALGAM);
    expect(focus.join("|")).toContain(QUEEN);
  });
});

describe("kill groups and orders", () => {
  const enemy = (index: number, name: string, hp: number, o: Partial<EnemySim> = {}): EnemySim => ({
    index, name, hp, maxHp: hp, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 5, hits: 1 }], ...o,
  });
  const combatOf = (ids: string[]) => ({ enemies: ids.map((id, index) => ({ index, enemy_id: id, is_alive: true })) });

  it("groups identical enemies into one position: 3 lice + 1 other = 2 orders, targeting within a group left to the policy", () => {
    const enemies = [enemy(0, "Louse", 10), enemy(1, "Louse", 7), enemy(2, "Louse", 12), enemy(3, "Big", 40)];
    const groups = killGroups(combatOf(["LOUSE", "LOUSE", "LOUSE", "BIG"]), enemies);
    expect(groups.map((g) => [g.id, g.indices, g.hp])).toEqual([["LOUSE", [0, 1, 2], 29], ["BIG", [3], 40]]);
    const { orders, dropped } = killOrders(groups);
    expect(orders.map((o) => o.label)).toEqual(["Louse x3 > Big", "Big > Louse x3"]);
    expect(dropped).toBe(0);
    // One kind of enemy: no orders (the rollout as before).
    expect(killOrders(killGroups(combatOf(["LOUSE", "LOUSE"]), [enemy(0, "Louse", 10), enemy(1, "Louse", 7)])).orders).toEqual([]);
  });

  it("leaves out a non-attacking illusion and a Waterfall Giant husk; keeps an attacking illusion and a minion", () => {
    const enemies = [
      enemy(0, "Obscura", 90, { attacks: [] }),
      enemy(1, "Parafright", 21, { illusion: true, attacks: [] }),
      enemy(2, "Husk", 999_999_999, { maxHp: 999_999_999 }),
      enemy(3, "Larva", 12, { minion: true }),
    ];
    expect(killGroups(combatOf(["OBSCURA", "PARAFRIGHT", "GIANT", "LARVA"]), enemies).map((g) => g.id)).toEqual(["OBSCURA", "LARVA"]);
    const attacking = [enemy(0, "Obscura", 90, { attacks: [] }), enemy(1, "Parafright", 21, { illusion: true })];
    expect(killGroups(combatOf(["OBSCURA", "PARAFRIGHT"]), attacking).map((g) => g.id)).toEqual(["OBSCURA", "PARAFRIGHT"]);
  });

  it("caps the permutations: all 6 for 3 kinds of enemy; past 3, each kind first and the rest by HP, the dropped count kept", () => {
    const group = (id: string, hp: number, index: number): KillGroup => ({ id, name: id, indices: [index], hp });
    const three = killOrders([group("A", 30, 0), group("B", 10, 1), group("C", 20, 2)]);
    expect(three.orders).toHaveLength(6);
    expect(new Set(three.orders.map((o) => o.key)).size).toBe(6);
    expect(three.dropped).toBe(0);
    const four = killOrders([group("A", 30, 0), group("B", 10, 1), group("C", 20, 2), group("D", 40, 3)]);
    expect(four.orders.map((o) => o.key)).toEqual(["B>C>A>D", "C>B>A>D", "A>B>C>D", "D>B>C>A"]);
    expect(four.dropped).toBe(24 - 4);
    const five = killOrders(["A", "B", "C", "D", "E"].map((id, i) => group(id, 10 * (i + 1), i)));
    expect(five.orders).toHaveLength(5);
    expect(five.dropped).toBe(120 - 5);
  });

  it("focus lines: the most damage into each group, potion-free first, none for a group no line reaches", () => {
    const enemies = [enemy(0, "Queen", 400), enemy(1, "Amalgam", 200, { minion: true }), enemy(2, "Wall", 50)];
    const line = (hp: number[], score: number, potion = false): Plan =>
      ({
        steps: potion ? [{ cardId: "POTION:FIRE_POTION:0", name: "potion Fire", cardIndex: 0, target: 1, key: "p" }] : [],
        score,
        outcome: { enemyHpAfter: hp.map((h, index) => ({ index, name: "", hp: h, vulnerable: 0, weak: 0 })), hpLoss: 0 },
      }) as unknown as Plan;
    const queen = line([380, 200, 50], 10);
    const amalgam = line([400, 185, 50], 5);
    const amalgamPotion = line([400, 150, 50], 20, true);
    const groups: KillGroup[] = [
      { id: "QUEEN", name: "Queen", indices: [0], hp: 400 },
      { id: "AMALGAM", name: "Amalgam", indices: [1], hp: 200 },
      { id: "WALL", name: "Wall", indices: [2], hp: 50 },
    ];
    const picked = focusLines([queen, amalgamPotion, amalgam], groups, enemies);
    expect(picked.get(groups[0]!)).toBe(queen);
    expect(picked.get(groups[1]!)).toBe(amalgam);
    expect(picked.has(groups[2]!)).toBe(false);
  });
});

describe("kill-order rollout (offline)", () => {
  const card = (index: number, cardId: string, o: Partial<CardModel>): CardModel => ({
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0, 1, 2],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
    draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...o,
  });
  const strike = (i: number) => card(i, "STRIKE", { damage: 9 });
  const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 6 });
  const hit: EnemyTable = { moves: { HIT: { damage: 6, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const input = (three: boolean): RolloutInput => {
    const hand = [strike(0), strike(1), defend(2), strike(3), defend(4)];
    const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
    const enemies: EnemySim[] = [
      { index: 0, name: "Leader", hp: 150, maxHp: 150, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 6, hits: 1 }] },
      { index: 1, name: "Minion", hp: 30, maxHp: 30, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, minion: true, attacks: [{ damage: 6, hits: 1 }] },
      ...(three ? [{ index: 2, name: "Other", hp: 200, maxHp: 200, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 6, hits: 1 }] }] : []),
    ];
    const solver: SolverInput = { hand, player, enemies, fightKind: "elite", turn: 1 };
    const plans = solveTurn(solver).plans;
    const draw = [strike(10), strike(11), defend(12), strike(13), defend(14), strike(15), strike(16), defend(17), strike(18), defend(19)];
    let t = 0;
    return {
      solver,
      plans,
      enemies: enemies.map((e) => ({ index: e.index, id: e.name.toUpperCase(), move: "HIT", strength: 0, powers: {} })),
      tables: { LEADER: hit, MINION: hit, OTHER: hit },
      piles: { draw, discard: [], handBase: hand },
      meta: { act: 2, t: 1, asc: 8, kind: "elite", enc: "LEADER+MINION", deck: { n: 10, atk: 6, skl: 4, pow: 0, junk: 0, dmg: 54, blk: 24, up: 0 }, relics: 1, max_en: 3 },
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 7, now: () => (t += 0.01), include: plans.slice(0, 3) },
    };
  };
  const groupsOf = (three: boolean): KillGroup[] => [
    { id: "LEADER", name: "Leader", indices: [0], hp: 150 },
    { id: "MINION", name: "Minion", indices: [1], hp: 30 },
    ...(three ? [{ id: "OTHER", name: "Other", indices: [2], hp: 200 }] : []),
  ];

  it("the minion-first order kills the minion; its numbers differ from leader-first; deterministic; one kind of enemy is unchanged", () => {
    const base = input(false);
    const { orders } = killOrders(groupsOf(false));
    const run = () => rolloutDecision({ ...base, options: { ...base.options!, now: (() => { let t = 0; return () => (t += 0.01); })(), orders } });
    const a = run();
    const b = run();
    expect(a.orders.map((o) => o.label)).toEqual(["Leader > Minion", "Minion > Leader"]);
    const shown = a.lines.filter((line) => line.tags.includes("offered"));
    expect(shown.length).toBeGreaterThan(0);
    for (const line of shown) {
      expect(line.orders).toHaveLength(2);
      expect(line.order).toBe(line.orders[0]!.order);
      const minionFirst = line.orders.find((o) => o.order.label === "Minion > Leader")!;
      const leaderFirst = line.orders.find((o) => o.order.label === "Leader > Minion")!;
      // 30 HP against 2-3 Strikes a turn: dead within the horizon in most samples when aimed at first.
      expect(minionFirst.firstDown).toBeGreaterThanOrEqual(6);
      expect(leaderFirst.firstDown).toBe(0);
      expect(minionFirst.hpLoss).not.toBe(leaderFirst.hpLoss);
    }
    // The candidates not shown keep the solver's own later turns.
    for (const line of a.lines.filter((l) => !l.tags.includes("offered"))) expect(line.orders).toEqual([]);
    const numbers = (r: typeof a) => r.lines.map((l) => [l.hpLoss, l.value, l.order?.key ?? null, l.orders.map((o) => [o.order.key, o.hpLoss, o.firstDown])]);
    expect(numbers(b)).toEqual(numbers(a));
    // No orders: exactly the rollout as before (the lines' numbers do not depend on the new code path).
    const plain = rolloutDecision({ ...base, options: { ...base.options!, now: (() => { let t = 0; return () => (t += 0.01); })() } });
    expect(plain.orders).toEqual([]);
    for (const line of plain.lines) expect(line.order).toBeNull();
  });

  it("orders that agree as far as a sample went share it: Leader > Minion > Other and Leader > Other > Minion while the leader lives", () => {
    const base = input(true);
    const { orders } = killOrders(groupsOf(true));
    expect(orders).toHaveLength(6);
    const r = rolloutDecision({ ...base, options: { ...base.options!, orders } });
    for (const line of r.lines.filter((l) => l.tags.includes("offered"))) {
      const of = (label: string) => line.orders.find((o) => o.order.label === label)!;
      // 150 HP is not killed in 5 turns here: the two leader-first orders are the same trajectories.
      expect(of("Leader > Minion > Other").firstDown).toBe(0);
      expect(of("Leader > Minion > Other").hpLoss).toBe(of("Leader > Other > Minion").hpLoss);
      expect(of("Leader > Minion > Other").perTurn).toEqual(of("Leader > Other > Minion").perTurn);
    }
  });

  it("under a tight clock the samples per order go first, and it says so", () => {
    const base = input(true);
    const { orders } = killOrders(groupsOf(true));
    let t = 0;
    const r = rolloutDecision({ ...base, options: { ...base.options!, orders, budgetMs: 400, now: () => (t += 1) } });
    expect(r.degraded.length).toBeGreaterThan(0);
    expect(r.degraded.join(",")).toMatch(/per kill order|1-turn|horizon 3/);
    expect(r.elapsedMs).toBeLessThanOrEqual(400 + 50);
  });
});
