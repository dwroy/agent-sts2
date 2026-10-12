/** C7GNN3DDFUFY A10 F33, silent-0117. All game inputs are frozen original frames. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-sandpit-discard-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { asRecord } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { noteScreenChange } from "../src/hand/loop.js";
import { planSelection } from "../src/hand/screens/selection.js";
import { sandpitDiscardFacts } from "../src/hand/screens/silent-sandpit-discard.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { facingFightOf, planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_sandpit_discard__/${name}`,
}));
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: evidence.cards }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { rolloutLiveOptions.enabled = false; setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); });
afterEach(() => { rolloutLiveOptions.enabled = oldRollout; solveTap.onSolve = null; setMonsterDbForTests(null); });
const raw = (line = 367035): Raw => structuredClone((evidence.states as Raw)[line]);
function env(input = raw()): DecisionEnv {
  const state = parseGameState(input);
  const memory = createScreenMemory(state.screen);
  memory.cardSource = { action: "play_card", id: "PREPARED", turn: state.turn, fight: facingFightOf(state) };
  return { state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: memory,
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, shopDiscardPotions: [] };
}
function ask(input = raw()): AskDecision {
  const d = planSelection(env(input)); expect(d?.kind).toBe("ask"); return d as AskDecision;
}
const context = (d: AskDecision): Raw => asRecord(asRecord(d.state["situation"])["sandpit_discard"]);
const options = (d: AskDecision): Raw => d.questions["pick"]!.type === "choice" ? d.questions["pick"]!.criteria : {};
const answer = (key: string) => ({ pick: { type: "choice" as const, choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } });

it("shows all six choices and the last payable Escape even without a saved continuation", () => {
  const d = ask();
  expect(asRecord(asRecord(d.state["situation"])["discard_plan"])["status"]).toBe("unknown");
  expect(context(d)).toMatchObject({ sandpit_now: 1, energy_now: 3, selections_still_required: 2,
    already_selected_escape_count: 0, energy_payable_escapes_before_this_pick: 1 });
  expect(context(d).limitation).toContain("保留逃离不等于有可活线");
  expect(Object.keys(options(d))).toHaveLength(6);
  for (let i = 0; i < 6; i++) {
    const option = JSON.parse(options(d)[`card${i}`]);
    expect(option.sandpit_after_this_discard).toMatchObject({
      remaining_escape_count_after_this_pick: i === 5 ? 0 : 1,
      energy_payable_escapes_after_this_pick: i === 5 ? 0 : 1,
      removes_last_energy_payable_escape: i === 5,
    });
    expect(d.resolve(answer(`card${i}`)).intent).toMatchObject({ action: "select_deck_card", option_index: i });
  }
});

it("second pick excludes the selected Escape even though the unsettled combat hand still contains it", () => {
  expect(raw(367036).combat.hand.some((c: Raw) => c.card_id === "FRANTIC_ESCAPE")).toBe(true);
  const d = ask(raw(367036));
  expect(context(d)).toMatchObject({ selected_count: 1, selections_still_required: 1,
    already_selected_escape_count: 1, energy_payable_escapes_before_this_pick: 0 });
  expect(Object.keys(options(d))).toHaveLength(5);
  for (const item of Object.values(options(d))) {
    expect(JSON.parse(item as string).sandpit_after_this_discard).toMatchObject({
      remaining_escape_count_after_this_pick: 0, energy_payable_escapes_after_this_pick: 0,
      removes_last_energy_payable_escape: false,
    });
  }
  expect(raw(367037).combat.hand.some((c: Raw) => c.card_id === "FRANTIC_ESCAPE")).toBe(false);
});

it("retained copies use current energy independently; an unaffordable or unknown cost is not a playable promise", () => {
  const input = raw(); input.combat.player.energy = 0;
  const d = ask(input);
  expect(context(d).energy_payable_escapes_before_this_pick).toBe(0);
  expect(JSON.parse(options(d).card0).sandpit_after_this_discard.remaining_escapes[0]).toMatchObject({ energy_cost_now: 1, energy_sufficient_alone: false });
  for (const c of [input.combat.hand[5], input.selection.cards[5]]) delete c.energy_cost;
  expect(context(ask(input)).energy_payable_escapes_before_this_pick).toBeNull();
  expect(JSON.parse(options(ask(input)).card5).sandpit_after_this_discard.removes_last_energy_payable_escape).toBeNull();
});

it("a second equivalent Escape is counted by slot and does not create a false last-copy warning", () => {
  const input = raw();
  input.combat.hand.push({ ...input.combat.hand[5], index: 6 });
  input.selection.cards.push({ ...input.selection.cards[5], index: 6 });
  expect(JSON.parse(options(ask(input)).card5).sandpit_after_this_discard).toMatchObject({
    energy_payable_escapes_after_this_pick: 1, removes_last_energy_payable_escape: false,
  });
});

it.each(["IRONCLAD", "A9", "pit2", "otherSource", "mismatch"])("leaves unobserved/ambiguous scope unchanged: %s", (scope) => {
  const e = env(); const input = e.state.raw as Raw;
  if (scope === "IRONCLAD") input.run.character_id = "IRONCLAD";
  if (scope === "A9") e.state.run!.ascension = 9;
  if (scope === "pit2") input.combat.enemies[0].powers[0].amount = 2;
  if (scope === "otherSource") e.screenMemory.cardSource!.id = "SURVIVOR";
  if (scope === "mismatch") input.selection.cards[5].energy_cost = 2;
  const withMemory = JSON.stringify(planSelection(e));
  e.screenMemory.cardSource = undefined;
  expect(withMemory).toBe(JSON.stringify(planSelection(e)));
  expect(withMemory).not.toContain("sandpit_discard");
});

function solverAt(line: number): SolverInput {
  const e = env(raw(line));
  e.screenMemory.screen = "CARD_SELECTION";
  noteScreenChange(e.screenMemory, e.state);
  expect(e.screenMemory.combatPlan).toBeNull();
  let input: SolverInput | undefined;
  solveTap.onSolve = (i) => { input ??= i; };
  planCombatTurn(e);
  solveTap.onSolve = null;
  if (!input) throw new Error("actual post-selection hand did not reach the solver");
  return input;
}

it("the existing production replan sees the actual discarded hand and separates Sandpit death from attack HP", () => {
  const input = solverAt(367037);
  expect(input.hand.some((c) => c.cardId === "FRANTIC_ESCAPE")).toBe(false);
  expect(input.player).toMatchObject({ energy: 3, block: 6 });
  const end = replaySteps(solverAt(367040), [])!;
  expect(end.outcome).toMatchObject({ sandpitAfter: 0, dies: true });
  expect(end.outcome.hpAfter).toBeGreaterThan(0);
  expect(raw(367041).combat.player).toMatchObject({ current_hp: 0, block: 31 });
  expect(raw(367041).combat.enemies[0].current_hp).toBe(116);
});

it.each(evidence.escape_pairs)("actual Escape extends the count but does not establish a winning alternative: $before -> $after", (pair) => {
  const before = raw(pair.before); const after = raw(pair.after);
  const pit = (s: Raw) => s.combat.enemies[0].powers.find((p: Raw) => p.power_id === "SANDPIT_POWER").amount;
  expect(pit(after)).toBe(pit(before) + 1);
  expect(after.combat.player.energy).toBe(before.combat.player.energy - 1);
  expect(after.turn).toBe(before.turn);
  expect(sandpitDiscardFacts(parseGameState(before), true)).toBeNull();
});
