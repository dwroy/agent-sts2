/** H1T1F8ML9FUE A10 F33 T6, silent-0117; proposal 2ae7436286228166. */
import { expect, it, vi } from "vitest";
import evidence from "./silent-survivor-sandpit-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { asRecord } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planSelection } from "../src/hand/screens/selection.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { facingFightOf } from "../src/reflex/combat-plan.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_survivor_sandpit__/${name}`,
}));
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
type Raw = Record<string, any>;
const raw = (line = 298405): Raw => structuredClone(evidence.find((row) => row.line === line)!.row.state);
const knowledge = makeKnowledge({ cards: ["SURVIVOR", "FRANTIC_ESCAPE", "DEFEND_SILENT", "THRUMMING_HATCHET"]
  .map((id) => ({ id, type: id === "THRUMMING_HATCHET" ? "Attack" : "Skill" })) }, "cache");
function env(input = raw()): DecisionEnv {
  const state = parseGameState(input), memory = createScreenMemory(state.screen);
  memory.cardSource = { action: "play_card", id: "SURVIVOR", turn: state.turn, fight: facingFightOf(state) };
  return { state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: memory,
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, shopDiscardPotions: [] };
}
function ask(e = env()): AskDecision {
  const d = planSelection(e); expect(d?.kind).toBe("ask"); return d as AskDecision;
}
const context = (d: AskDecision): Raw => asRecord(asRecord(d.state["situation"])["sandpit_discard"]);
const options = (d: AskDecision): Raw => d.questions["pick"]!.type === "choice" ? d.questions["pick"]!.criteria : {};

it("the actual Survivor choice shows the current pit and losing the only payable Escape", () => {
  const d = ask();
  expect(context(d)).toMatchObject({ sandpit_now: 2, energy_now: 1, selected_count: 0,
    selections_still_required: 1, energy_payable_escapes_before_this_pick: 1 });
  expect(context(d).basis).toContain("不预报下轮抽牌");
  expect(Object.keys(options(d))).toHaveLength(3);
  for (let i = 0; i < 3; i++) {
    const option = JSON.parse(options(d)[`card${i}`]);
    expect(option.sandpit_after_this_discard).toMatchObject({
      remaining_escape_count_after_this_pick: i === 2 ? 0 : 1,
      energy_payable_escapes_after_this_pick: i === 2 ? 0 : 1,
      removes_last_energy_payable_escape: i === 2,
    });
    const answer = { pick: { type: "choice" as const, choice: `card${i}`, probabilities: { [`card${i}`]: 1 }, confidence: 1, raw: {} } };
    expect(d.resolve(answer).intent).toMatchObject({ action: "select_deck_card", option_index: i });
  }
  // This is the observed discard and later state, not an invented retained-Escape victory.
  expect(raw(298406).combat.hand.some((c: Raw) => c.card_id === "FRANTIC_ESCAPE")).toBe(false);
  expect(raw(298412).combat.enemies[0].powers.find((p: Raw) => p.power_id === "SANDPIT_POWER").amount).toBe(1);
  expect(raw(298412).combat.player.current_hp).toBe(28);
});

it("current energy affordability stays distinct from unknown future playability", () => {
  const input = raw(); input.combat.player.energy = 0;
  expect(context(ask(env(input))).energy_payable_escapes_before_this_pick).toBe(0);
  for (const card of [input.combat.hand[2], input.selection.cards[2]]) delete card.energy_cost;
  const d = ask(env(input));
  expect(context(d).energy_payable_escapes_before_this_pick).toBeNull();
  expect(JSON.parse(options(d).card2).sandpit_after_this_discard.removes_last_energy_payable_escape).toBeNull();
});

it.each(["IRONCLAD", "A9", "pit1", "otherSource", "oldTurn", "oldFight", "mismatch"])(
  "leaves the unobserved or ambiguous %s window unchanged", (scope) => {
    const e = env(), input = e.state.raw as Raw;
    if (scope === "IRONCLAD") input.run.character_id = "IRONCLAD";
    if (scope === "A9") e.state.run!.ascension = 9;
    if (scope === "pit1") input.combat.enemies[0].powers.find((p: Raw) => p.power_id === "SANDPIT_POWER").amount = 1;
    if (scope === "otherSource") e.screenMemory.cardSource!.id = "PREPARED";
    if (scope === "oldTurn") e.screenMemory.cardSource!.turn!--;
    if (scope === "oldFight") e.screenMemory.cardSource!.fight += " stale";
    if (scope === "mismatch") input.selection.cards[2].energy_cost = 2;
    expect(context(ask(e))).toEqual({});
  });
