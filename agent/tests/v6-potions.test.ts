import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { potionEntries, rankPotions, rankPotionDiscards, v6PotionActive, withPotionJevBudget, potionAnswersComplete, notePotionFallback, validPotionAnswers } from "../src/v6/potion-entries.js";
import { planRest } from "../src/hand/screens/rest.js";
import { planEvent } from "../src/hand/screens/event.js";
import { planMap } from "../src/hand/screens/map.js";
import { reachableNext, routeMapFromView } from "../src/sim/route-map.js";
import type { AskDecision, DecisionEnv } from "../src/memory/types.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import type { JevClient } from "../src/reflex/jev/client.js";
import { direction, reflex, vocab, projection } from "./v6-fixtures.js";
import { v6Config } from "../src/v6/config.js";
import { currentDecisionBudget, DecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import { logged, loggedEnv } from "./logged.js";
import { board, env, FakeDeepSeek, play, setupOneshotTests, type Raw } from "./oneshot-support.js";
setupOneshotTests();
const dirs: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function active() { vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_POTION_DECIDER", "jev"); }
function temp() { const dir = mkdtempSync(join(tmpdir(), "v6-potions-")); dirs.push(dir); return dir; }
function fixture() {
  const dir = temp(), own = join(dir, "characters", "silent"); mkdirSync(own, { recursive: true });
  writeFileSync(join(own, "direction-cards.json"), JSON.stringify({ schema: "direction-cards-v1", character: "silent", entries: [direction] }));
  writeFileSync(join(own, "reflex-vocab.json"), JSON.stringify(vocab));
  writeFileSync(join(own, "reflex.json"), JSON.stringify({ schema: "reflex-file-v1", character: "silent", entries: [
    { ...reflex, id: "potion_memory", applies_to: "potion" }, reflex,
    { ...reflex, id: "wrong_asc", applies_to: "potion", scope: { ...reflex.scope, ascensions: [9] } },
    { ...reflex, id: "missing_input", applies_to: "potion", predicate: { op: "gte", field: "player.energy", value: 1 } },
  ] }));
  const value = (hold_hp: number) => ({ name: "Fixture", category: "other", log: {}, by_asc: { "0": { "1": { hp: hold_hp, damage: 0, block: 0, hold_hp, n: 3, source: "估", formula: "fixture" } } } });
  writeFileSync(join(own, "potion-equivalents.json"), JSON.stringify({ meta: { generated: "fixture", min_n: 1, ascensions: [0] }, rates: { "0": { "1": { fights: 5, T: 2, D: 3, L: 4, r: 1, h: 1, b: 1, v_card: 1, v_energy: 1, from_asc: 0 } } }, potions: { TEST_A: value(4), TEST_B: value(9) } }));
  const raw = board("xljq-f5-reward", "reward");
  Object.assign(raw["run"] as Raw, { character_id: "SILENT", ascension: 0, current_hp: 30, gold: 30, potions: [{ index: 0, occupied: true, potion_id: "TEST_A" }, { index: 1, occupied: true, potion_id: "TEST_B" }, { index: 2, occupied: false }] });
  const e = env(raw);
  Object.assign(e.screenMemory, { runPlan: { v6: { direction_weights: { TEST_A: 1 }, potion_directions: [{ potion: "TEST_A", tier: "must", for: "joint", reason: "fixture" }] } } });
  return { dir, raw, e };
}
function brain(key: string, discard?: number[]): AnswerSet { return { pick: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: { escalated: "deepseek", ...(discard ? { discard } : {}) } } }; }
function slots(values: Record<string, number>): AnswerSet { return Object.fromEntries(Object.entries(values).map(([key, noul]) => [key, { type: "noul", noul, raw: {} }])) as AnswerSet; }
function potionPick(key: string, values: Record<string, number> = {}): AnswerSet { return { ...slots(values), potion_o0: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } }; }
function rest() { return loggedEnv(logged("batch-g/zgz0-f11-rest-mailbox"), { buildDecider: "deepseek", oneshot: "off" }); }
it("allows five seconds for construction Jev independently of computation and preserves off defaults", async () => {
  const off = v6Config({});
  expect(off.budgets.jev_ms).toBe(1000);
  for (const mode of ["on", "shadow"]) {
    const config = v6Config({ V6_BUILD: mode });
    expect(config.budgets.jev_ms).toBe(5000);
    expect(config.budgets.pick_ms).toBe(5000);
    expect(v6Config({ V6_BUILD: mode, V6_JEV_MS: "6000" }).budgets.jev_ms).toBe(5000);
  }
  active();
  await withPotionJevBudget(async () => { expect(currentDecisionBudget()?.remaining()).toBeGreaterThan(4900); });
  let now = 0;
  const parent = new DecisionBudget("computation", "routine", () => now, 5000, 0);
  now = 5000;
  await withDecisionBudget(parent, () => withPotionJevBudget(async () => {
    expect(currentDecisionBudget()?.remaining()).toBe(5000);
    now += 1200;
  }));
  expect(parent.remaining()).toBe(0);
  expect(parent.record()).toMatchObject({ shared_actual_ms: 5000, independent_actual_ms: 1200 });
  expect(v6Config({ V6_BUILD: "off" })).toEqual(off);
});
it("scopes consecutive fallbacks to the run and clears them after a successful potion answer", () => {
  const e = rest(); notePotionFallback(e, true); notePotionFallback(e, true); expect(e.screenMemory.v6JevFallbacks).toBe(2);
  e.state.raw["run_id"] = "OTHER_RUN"; notePotionFallback(e, true); expect(e.screenMemory.v6JevFallbacks).toBe(1);
  notePotionFallback(e, false); expect(e.screenMemory.v6JevFallbacks).toBe(0);
});
it("bounds the whole Jev attempt, including a stuck SDK, and rejects incomplete slot answers", async () => {
  vi.stubEnv("V6_JEV_MS", "10");
  await expect(withPotionJevBudget(() => new Promise<never>(() => {}))).rejects.toThrow("budget exhausted");
  expect(potionAnswersComplete({ discard_p0: { type: "noul", instructions: "fixture" } }, slots({ discard_p0: NaN }))).toBe(false);
  const answers = potionPick("o0:discard", { discard_p1: .2 });
  (answers["potion_o0"] as { confidence: number }).confidence = 2;
  expect(validPotionAnswers({ potion_o0: { type: "choice", instructions: "fixture", criteria: { "o0:discard": "fixture" } }, discard_p1: { type: "noul", instructions: "fixture" } }, answers)).toEqual(slots({ discard_p1: .2 }));
});
it("builds character-owned potion values, tiers, belt comparisons and only applicable potion memories", () => {
  active(); vi.stubEnv("V6_REFLEX", "on"); const { dir, e } = fixture();
  const [a, unknown] = potionEntries(e, ["TEST_A", "UNKNOWN"], { dir, prices: { TEST_A: 10 }, trust: { current_boss: "trusted", joint: "low_pessimistic" } });
  expect(a).toMatchObject({ hold_hp: 4, tier: "must", slots: { occupied: 2, max: 3 }, price: 10, gold_after: 20, value_source: { table_ascension: 0, inputs_ascension: 0 }, trust: { current_boss: "trusted", joint: "low_pessimistic" } });
  expect(a?.comparisons.map(p => p.hold_hp_delta)).toEqual([0, -5]);
  expect(a?.reflex.map(r => r.id)).toEqual(["potion_memory"]);
  expect(unknown?.hold_hp).toBeNull();
  vi.stubEnv("V6_REFLEX", "off"); expect(potionEntries(e, ["TEST_A"], { dir })[0]?.reflex).toEqual([]);
});
it("does not borrow another character's values, including a symlink", () => {
  active(); const { dir, raw } = fixture();
  (raw["run"] as Raw)["character_id"] = "REGENT";
  expect(potionEntries(env(raw), ["TEST_A"], { dir })[0]?.hold_hp).toBeNull();
  symlinkSync(join(dir, "characters", "silent"), join(dir, "characters", "regent"));
  expect(potionEntries(env(raw), ["TEST_A"], { dir })[0]?.hold_hp).toBeNull();
});
it("consumes target-specific projection trust and keeps missing or conflicting directions unknown", () => {
  active(); const { dir, e } = fixture();
  e.v6DirectionEvaluation = { id: "fixture", entries: [
    { ...projection, target_id: String(e.state.run!.raw["boss_id"] || "current_boss"), trust: "trusted" }, { ...projection, target_id: "joint", trust: "low_optimistic" },
  ] as NonNullable<DecisionEnv["v6DirectionEvaluation"]>["entries"] };
  expect(potionEntries(e, ["TEST_A"], { dir })[0]?.trust).toEqual({ current_boss: "trusted", joint: "low_optimistic" });
  e.screenMemory.runPlan!.v6!.direction_weights["TEST_B"] = .2;
  expect(potionEntries(e, ["TEST_A"], { dir })[0]?.trust).toEqual({ current_boss: "unknown", joint: "unknown" });
});
it("fallback ranking uses tier before holding value, excludes avoid and preserves unknown", () => {
  const { dir, e } = fixture(), base = potionEntries(e, ["TEST_A"], { dir })[0]!;
  const entries = [{ ...base, id: "avoid", tier: "avoid" as const, hold_hp: 100 }, { ...base, id: "normal", tier: "normal" as const, hold_hp: 90 }, { ...base, id: "must", tier: "must" as const, hold_hp: 1 }, { ...base, id: "unknown", tier: "normal" as const, hold_hp: null }];
  expect(rankPotions(entries).map(p => p.id)).toEqual(["must", "normal", "unknown"]);
  expect(rankPotionDiscards(entries).map(p => p.id)).toEqual(["avoid", "normal", "unknown", "must"]);
});
it("rest slots come from Jev, ignore brain slot lists, and continue the chosen option after discard", () => {
  active(); const fx = logged("batch-g/zgz0-f11-rest-mailbox"), e = loggedEnv(fx, { buildDecider: "deepseek", oneshot: "off" });
  const d = planRest(e) as AskDecision;
  expect(Object.keys(d.potionJev!.questions)).toEqual(["potion_o0", "discard_p1", "discard_p2"]);
  expect(d.potionJev!.state.opening_note).toContain("opening unknown");
  expect(Object.keys((d.questions["pick"] as { criteria: object }).criteria)).not.toContain("o0:discard");
  d.potionJev!.supply(potionPick("o0:discard", { discard_p1: .1, discard_p2: .9 }));
  const result = d.resolve(brain("o0", [1]));
  expect(result.intent).toEqual({ action: "discard_potion", option_index: 2 }); result.apply?.();
  expect(planRest(loggedEnv(fx, { ...e, state: e.state }))).toBeNull();
  ((fx.state["run"] as Raw)["potions"] as Raw[])[2] = { index: 2, occupied: false, can_discard: false };
  expect(planRest(loggedEnv(fx, { buildDecider: "deepseek", oneshot: "off", screenMemory: e.screenMemory }))).toMatchObject({ intent: { action: "choose_rest_option", option_index: 0 } });
  const plain = planRest(rest()) as AskDecision;
  expect(plain.resolve(brain("o0", [1])).intent).toEqual({ action: "choose_rest_option", option_index: 0 });
});
it.each(["missing", "wrong_type", "nan"])("invalid Jev slot answer %s uses deterministic tier/value fallback", kind => {
  active(); const e = rest(); Object.assign(e.screenMemory, { runPlan: { v6: { potion_directions: [{ potion: "EXPLOSIVE_AMPOULE", tier: "must" }, { potion: "BLOCK_POTION", tier: "avoid" }] } } });
  const d = planRest(e) as AskDecision;
  d.potionJev!.supply({ ...(kind === "missing" ? {} : kind === "nan" ? slots({ discard_p1: NaN, discard_p2: .9 }) : brain("o0")), ...potionPick("o0:discard") });
  expect(d.resolve(brain("o0", [1])).intent).toEqual({ action: "discard_potion", option_index: 2 });
});
it("event keeps the sequential multi-discard gate and Jev ordering", () => {
  active(); const fx = logged("yql8-f28-potion-courier"), run = fx.state["run"] as Raw, held = run["potions"] as Raw[];
  run["potions"] = [0, 1, 2, 3, 4].map(index => ({ ...held[index % 2]!, index }));
  const e = loggedEnv(fx, { buildDecider: "deepseek", oneshot: "off" }), d = planEvent(e) as AskDecision;
  d.potionJev!.supply(potionPick("o0:discard", { discard_p0: .1, discard_p1: .7, discard_p2: .2, discard_p3: .95, discard_p4: .6 }));
  const result = d.resolve(brain("o0", [0])); result.apply?.();
  expect(result.intent).toEqual({ action: "discard_potion", option_index: 3 }); expect(e.screenMemory.afterDiscard).toMatchObject({ slot: 3, more: [1, 4] });
});
it.each(["IRONCLAD", "SILENT", "DEFECT", "NECROBINDER", "REGENT"])("off prompts and actions remain byte-identical for %s", character => {
  for (const [name, planner] of [["batch-g/zgz0-f11-rest-mailbox", planRest], ["yql8-f28-potion-courier", planEvent], ["batch-g/zgz0-f10-map-mailbox", planMap]] as const) {
    const raw = logged(name); (raw.state["run"] as Raw)["character_id"] = character;
    const build = () => { const d = planner(loggedEnv(raw, { buildDecider: "deepseek", oneshot: "off" })); return JSON.stringify(d && { ...d, action: d.kind === "ask" ? d.resolve(brain("o0")) : d }); };
    vi.stubEnv("V6_BUILD", "off"); vi.stubEnv("V6_POTION_DECIDER", "brain"); const before = build();
    vi.stubEnv("V6_POTION_DECIDER", "jev"); expect(build()).toBe(before);
  }
});
it("shop, combat, shadow and the default potion decider keep their existing routing", () => {
  active(); const e = rest(); expect(v6PotionActive(e)).toBe(true);
  expect(v6PotionActive({ ...e, state: { ...e.state, screen: "SHOP" } })).toBe(false);
  expect(v6PotionActive({ ...e, state: { ...e.state, in_combat: true } })).toBe(false);
  vi.stubEnv("V6_BUILD", "shadow"); expect(v6PotionActive(e)).toBe(false);
  vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_POTION_DECIDER", "brain"); expect(v6PotionActive(e)).toBe(false);
});
it("the route stays with the brain while Jev chooses drink/discard independently", () => {
  active(); const e = loggedEnv(logged("batch-l/5lrz-f37-statue"), { buildDecider: "deepseek" });
  const d = planMap(e) as AskDecision, map = routeMapFromView(d.state["route_map"])!;
  const route: string[] = []; let at: string | undefined = map.next[0];
  while (at) { route.push(at); if (map.bosses.includes(at)) break; at = reachableNext(map, at).find(id => map.nodes.has(id)); }
  expect(d.potionJev).toBeDefined(); expect((d.state["route_map"] as Raw)["discardable_potions"]).toBeUndefined();
  const key = Object.keys(d.potionJev!.questions).find(k => k.startsWith("potion_n"))!;
  const q = d.potionJev!.questions[key]!; if (q.type !== "choice") throw Error("choice expected");
  const drink = Object.keys(q.criteria).find(k => k.includes(":drink0"))!;
  d.potionJev!.supply({ [key]: { type: "choice", choice: drink, probabilities: { [drink]: 1 }, confidence: 1, raw: {} } });
  const resolved = d.deepseek!.plan!.resolve({ route: route.join(" "), reason: "fixture", discard: [1] });
  if ("invalid" in resolved) throw Error(resolved.invalid);
  expect(resolved.intent).toEqual({ action: "use_potion", option_index: 0 }); resolved.apply?.();
  expect(e.screenMemory.afterDiscard).toMatchObject({ via: "drink", slot: 0 });
});
it.each(["success", "error", "invalid"])("loop asks Jev separately with its timeout and records the result (%s)", async mode => {
  active(); const dir = temp(), fake = new FakeDeepSeek(() => "o0");
  const ask = vi.fn(async (_state: unknown, _questions: unknown, timeout: number) => {
    expect(timeout).toBeGreaterThan(0); expect(timeout).toBeLessThanOrEqual(5000);
    if (mode === "error") throw new Error("fixture timeout");
    const answers = potionPick("o0:discard", { discard_p1: .1, discard_p2: .9 });
    if (mode === "invalid") (answers["potion_o0"] as { confidence: number }).confidence = 2;
    return { model: "fixture", answers, inputTokens: 3, outputTokens: 2, latencyMs: 1, requestId: "fixture" };
  });
  const result = await play([logged("batch-g/zgz0-f11-rest-mailbox").state], fake, { runPlanLog: join(dir, "plans.jsonl"), buildOneshot: "off" }, { jev: { model: "fixture", ask } as unknown as JevClient, maxDecisions: 1 });
  expect(ask).toHaveBeenCalledTimes(1); expect(result.actions[0]?.["action"]).toBe(mode === "success" ? "discard_potion" : "choose_rest_option");
  if (mode === "success") expect(result.actions[0]?.["option_index"]).toBe(2);
  const row = result.records.find(r => r["potion_jev"]); expect(row).toBeDefined();
  expect((row!["potion_jev"] as Raw)["fallback"]).toBe(mode === "error" ? "Jev potion request failed; brain tier then holding HP" : mode === "invalid" ? "Jev potion answer incomplete; brain tier then holding HP" : null);
  expect(readFileSync(join(dir, "v6-build.jsonl"), "utf8")).toContain('"kind":"potion"');
});
