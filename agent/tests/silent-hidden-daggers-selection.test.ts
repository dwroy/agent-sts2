/** 2Q6ZYZ6JHM0M A10 F5 T1 / F8 T1,T5; silent-0499/0205. No generated knowledge or network. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-hidden-daggers-selection-evidence.json" with { type: "json" };
import { loadConfig } from "../src/core/config.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import { noteScreenChange, resetFightMemory, runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { noteCardSource, planSelection } from "../src/hand/screens/selection.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setMoveModelForTests } from "../src/knowledge/move-model.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv, type ResolvedAction } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import type { JevClient } from "../src/reflex/jev/client.js";
import type { QuestionSet } from "../src/reflex/jev/questions.js";
import { envelope } from "./support.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: frozen discard continuation"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

const observed = [...new Map(evidence.frames.flatMap((frame) => frame.state.combat.hand as unknown as Record<string, unknown>[])
  .map((entry) => [entry.card_id, entry])).values()];
const knowledge = makeKnowledge({ cards: observed.map((entry) => ({ id: entry.card_id, type: entry.card_type,
  name: entry.name, cost: entry.energy_cost, description: entry.resolved_rules_text, description_raw: entry.rules_text,
  vars: entry.dynamic_values, keywords: entry.card_id === "SHIV" ? ["Exhaust"] : [],
})) }, "cache");
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); setMoveModelForTests({});
  rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
});
afterEach(() => {
  setMonsterDbForTests(null); setMoveModelForTests(null);
  rolloutLiveOptions.enabled = oldRollout; bossLinesOptions.enabled = oldBoss;
  vi.unstubAllEnvs(); setKnowledgeCharacter(null);
});

const stateAt = (line: number) => parseGameState(structuredClone(evidence.frames.find((frame) => frame.line === line)!.state));
function env(line: number): DecisionEnv {
  const state = stateAt(line);
  return { state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, combatPlanner: "turn", buildDecider: "jev", shopDiscardPotions: [] };
}
function at(e: DecisionEnv, line: number) {
  e.state = stateAt(line); e.brief = buildRunBrief(e.state, knowledge); noteScreenChange(e.screenMemory, e.state);
}
const answer = (name: string, choice: string) => ({ [name]: { type: "choice" as const, choice,
  probabilities: { [choice]: 1 }, confidence: 1, raw: {} } });
function play(e: DecisionEnv, id: string, wanted?: string): Pick<ResolvedAction, "intent" | "rationale" | "apply"> {
  const decision = planCombatTurn(e)!;
  let result: Pick<ResolvedAction, "intent" | "rationale" | "apply">;
  if (decision.kind === "ask") {
    const key = Object.entries(decision.questions.plan!.criteria!).find(([, value]) =>
      String(JSON.parse(value!).plays).includes("隐秘匕首") && (!wanted || String(JSON.parse(value!).plays).includes(wanted)))?.[0];
    expect(key).toBeDefined();
    result = decision.resolve(answer("plan", key!));
    result.apply?.();
  } else {
    expect(decision.kind).toBe("act");
    result = decision; result.apply?.();
  }
  noteCardSource(e.screenMemory, e.state, result.intent, id);
  return result;
}
function ask(e: DecisionEnv) {
  const decision = planSelection(e);
  expect(decision?.kind).toBe("ask");
  const d = decision as AskDecision;
  return { decision: d, context: asRecord(asRecord(d.state.situation).discard_plan),
    options: Object.fromEntries(Object.entries(d.questions.pick!.criteria!).map(([key, value]) => [key, JSON.parse(value!)])) };
}
function boundary(start: number, middle: number | null, pick: number, wanted?: string) {
  const e = env(start);
  play(e, "original", wanted);
  if (middle) { at(e, middle); play(e, "boundary"); }
  expect(e.screenMemory.combatPlan).toBeNull();
  expect(e.screenMemory.plannedAfter?.steps.length).toBeGreaterThan(0);
  at(e, pick);
  expect(e.screenMemory.pausedCombatPlan).toBeUndefined();
  return e;
}

it.each([[432550, 432551, 432552, 21], [432593, 432594, 432595, 44],
  [432617, null, 432618, 9]] as const)("delivers conditional facts on frozen frame %i after clearing the executable memo", (start, middle, pick, damage) => {
  const e = boundary(start, middle, pick, start === 432617 ? "生存者" : undefined);
  const { context, options, decision } = ask(e);
  expect(context.status).toBe("conditional");
  expect(context.original_full_plan_prediction).toMatchObject({ damage_dealt: damage });
  expect(context.source_decision_id).toBe("original");
  expect(context.boundary_decision_id).toBe(middle ? "boundary" : "original");
  const remaining = asArray(context.remaining).map(asRecord);
  expect(remaining.filter((step) => step.card_id === "SHIV").every((step) =>
    step.present_in_current_choices === false && step.observed_before_boundary === false)).toBe(true);
  const required = start === 432617 ? "生存者" : "打击";
  const [key, card] = Object.entries(options).find(([, option]) => option.card === required)!;
  expect(card.removes_planned_continuation).toBe(true);
  const result = decision.resolve(answer("pick", key));
  expect(result.intent).toMatchObject({ action: "select_deck_card", option_index: Number(key.slice(4)) });
  expect(result.rationale).toContain("原整条预测失效");
  expect(Object.keys(options)).toHaveLength(asArray(asRecord(e.state.raw.selection).cards).length);
});

it("updates the second discard from selected copies while retaining the conditional generated steps", () => {
  const e = boundary(432593, 432594, 432595);
  at(e, 432596);
  const { context, options } = ask(e);
  expect(context.status).toBe("invalidated");
  expect(context.missing_observed_continuation).toContain("STRIKE_SILENT");
  expect(options.card1.removes_planned_continuation).toBe(true);
  expect(options.card2.removes_planned_continuation).toBe(false);
  expect(asArray(context.remaining).map(asRecord).filter((step) => step.card_id === "STRIKE_SILENT")
    .map((step) => step.present_in_current_choices).sort()).toEqual([false, true]);
  const spare = boundary(432617, null, 432618, "生存者");
  const selection = asRecord(spare.state.raw.selection);
  selection.cards = [...asArray(selection.cards), { ...asRecord(asArray(selection.cards)[3]), index: 4 }];
  expect(ask(spare).options.card3.removes_planned_continuation).toBe(false);
  asRecord(asArray(selection.cards)[4]).upgraded = true;
  expect(ask(spare).options.card3.removes_planned_continuation).toBe(true);
  asRecord(asArray(selection.cards)[4]).upgraded = false;
  asRecord(asArray(selection.cards)[4]).energy_cost = 9;
  expect(ask(spare).options.card3.removes_planned_continuation).toBe(true);
});

it("preserves the F8 T6 single-discard reference with no remaining steps", () => {
  const e = env(432627);
  e.screenMemory.combatPlan = { turn: 6, remaining: [], via: "jev", expectedHand: "", handLen: 2,
    selectionReference: { hp_lost: 8, damage_dealt: 12, block_gained: 10 } };
  at(e, 432628);
  const { context, options } = ask(e);
  expect(context).toMatchObject({ status: "available", remaining: [],
    original_full_plan_prediction: { hp_lost: 8, damage_dealt: 12 } });
  expect(Object.values(options).every((option) => option.removes_planned_continuation === false)).toBe(true);
});

it("transports the real loop's source decision to both legal Jev discard requests", async () => {
  const dir = mkdtempSync(join(tmpdir(), "hidden-daggers-readback-"));
  const frames = [432617, 432618, 432619, 432620];
  let position = 0;
  const current = () => stateAt(frames[position]!).raw;
  const requests: Record<string, unknown>[] = [];
  const actions: Record<string, unknown>[] = [];
  const events: unknown[] = [];
  const jev = { ask: async (state: unknown, questions: QuestionSet) => {
    requests.push(asRecord(state));
    const name = questions.plan ? "plan" : "pick";
    const criteria = questions[name]!.criteria!;
    const key = Object.entries(criteria).find(([, value]) => {
      const facts = JSON.parse(value!);
      return name === "plan" ? String(facts.plays).includes("隐秘匕首") && String(facts.plays).includes("生存者")
        : facts.card === (position === 1 ? "打击" : "生存者");
    })?.[0];
    expect(key).toBeDefined();
    return { model: "fixed", answers: answer(name, key!), inputTokens: 0, outputTokens: 0, latencyMs: 0, requestId: null };
  } } as unknown as JevClient;
  const config = loadConfig({ CHARACTER: "silent", STRICT_JEV: "on", BRAIN_LOG: "off", RUN_PLAN: "off",
    FIGHT_PLAN: "off", BUILD_ONESHOT: "off", SL_ENABLED: "off" });
  vi.stubEnv("CONSTRUCTION_MODE", "off"); setKnowledgeCharacter("silent");
  config.log.decisionLog = join(dir, "decisions.jsonl");
  config.runPlanLog = join(dir, "run-plans.jsonl"); config.fightPlanLog = join(dir, "fight-plans.jsonl");
  const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
    if (String(url).endsWith("/state")) return Response.json(envelope(current()));
    const intent = JSON.parse(String(options?.body)); actions.push(intent); position++;
    return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixed", state: current() }));
  }) as typeof fetch });
  const controller = new AbortController();
  try {
    const result = await runLoop({ config, mode: "play", client, jev, brain: null, buildSim: null, thiefSim: null,
      knowledge, maxDecisions: 3, maxMinutes: 1, pollIntervalMs: 50, restoreRun: false, jevRetryDelaysMs: [],
      signal: controller.signal, onEvent: (event) => { events.push(event); if (events.filter((entry) => asRecord(entry).type === "wait").length > 60) controller.abort(); } });
    expect(result.acts, JSON.stringify(events)).toBe(3);
    expect(actions.map((action) => action.action)).toEqual(["play_card", "select_deck_card", "select_deck_card"]);
    const rows = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    const source = rows[0].decision_id;
    const contexts = requests.slice(1).map((request) => asRecord(asRecord(request.situation).discard_plan));
    expect(contexts).toHaveLength(2);
    for (const context of contexts) expect(context).toMatchObject({ source_decision_id: source, boundary_decision_id: source });
    expect(contexts[0]!.status).toBe("conditional");
    // The existing warm solver may choose a line using Strike. The actual first discard removes it either way.
    const needsStrike = asArray(contexts[0]!.remaining).map(asRecord)
      .some((step) => step.card_id === "STRIKE_SILENT" && step.observed_before_boundary === true);
    expect(contexts[1]!.status).toBe(needsStrike ? "invalidated" : "conditional");
    if (needsStrike) expect(contexts[1]!.missing_observed_continuation).toContain("STRIKE_SILENT");
  } finally { controller.abort(); rmSync(dir, { recursive: true, force: true }); }
}, 15_000);

it("invalidates cross-turn, cross-fight, unknown provenance and cleared fight references", () => {
  for (const patch of ["turn", "fight", "source", "decision", "origin", "reset"] as const) {
    const e = boundary(432617, null, 432618, "生存者");
    if (patch === "turn") e.screenMemory.plannedAfter!.turn = 4;
    if (patch === "fight") e.screenMemory.plannedAfter!.discardReference!.fight = "another-run:0:8";
    if (patch === "source") e.screenMemory.cardSource!.id = "SURVIVOR";
    if (patch === "decision") delete e.screenMemory.plannedAfter!.discardReference!.actionDecisionId;
    if (patch === "origin") e.screenMemory.plannedAfter!.discardReference!.originDecisionId = null;
    if (patch === "reset") resetFightMemory(e.screenMemory);
    expect(ask(e).context.status).toBe("unknown");
  }
});

it("keeps missing predictions unknown and returns to real-hand replanning without restoring indices", () => {
  const e = boundary(432617, null, 432618, "生存者");
  e.screenMemory.plannedAfter!.discardReference!.prediction = null;
  expect(ask(e).context.status).toBe("unknown");
  at(e, 432620);
  expect(e.screenMemory.combatPlan).toBeNull();
  expect(e.screenMemory.pausedCombatPlan).toBeUndefined();
  const next = play(e, "replan");
  expect(next.intent?.action).toBe("play_card");
  expect(next.rationale).not.toContain("continuing");
  const index = next.intent!.card_index!;
  expect(asRecord(asArray(asRecord(e.state.raw.combat).hand)[index]).card_id).not.toBe("SURVIVOR");
});

it.each(["IRONCLAD", "SILENT_A9", "upgraded", "multi", "missing run", "missing turn", "missing floor"])("keeps the legacy fact boundary for %s", (scope) => {
  const e = env(432617);
  if (scope === "IRONCLAD") asRecord(e.state.run!.raw).character_id = "IRONCLAD";
  if (scope === "SILENT_A9") e.state.run!.ascension = 9;
  if (scope === "upgraded") asRecord(asArray(asRecord(e.state.raw.combat).hand)[0]).upgraded = true;
  if (scope === "multi") asArray(asRecord(e.state.raw.combat).enemies).push({ ...asRecord(asArray(asRecord(e.state.raw.combat).enemies)[0]), index: 1 });
  if (scope === "missing run") e.state.raw.run_id = "";
  if (scope === "missing turn") e.state.turn = null;
  if (scope === "missing floor") e.state.run!.floor = null;
  play(e, "outside-scope");
  expect(e.screenMemory.plannedAfter?.discardReference).toBeUndefined();
});
