/** R3AJCGQGGMR4 A10 F33 T5, silent-0018 / silent-0117: original discard and exit frames. */
import { expect, it, vi } from "vitest";
import evidence from "./silent-dagger-sandpit-evidence.json";
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
  knowledgeFile: (_dir: string, name: string) => `/__fixed_dagger_sandpit__/${name}`,
}));
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: [] }, "cache");
function env(): DecisionEnv {
  const state = parseGameState(structuredClone(evidence.states["306209"]));
  const memory = createScreenMemory(state.screen);
  memory.cardSource = { action: "play_card", id: "DAGGER_THROW", turn: state.turn, fight: facingFightOf(state) };
  return { state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: memory,
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, shopDiscardPotions: [] };
}
function ask(e = env()): AskDecision {
  const decision = planSelection(e); expect(decision?.kind).toBe("ask"); return decision as AskDecision;
}
const context = (d: AskDecision): Raw => asRecord(asRecord(d.state["situation"])["sandpit_discard"]);
const options = (d: AskDecision): Raw => d.questions["pick"]!.type === "choice" ? d.questions["pick"]!.criteria : {};

it("shows the observed current cost and last Escape while retaining all five legal choices", () => {
  const d = ask();
  expect(context(d)).toMatchObject({ sandpit_now: 2, energy_now: 2, selected_count: 0,
    selections_still_required: 1, energy_payable_escapes_before_this_pick: 1 });
  expect(Object.keys(options(d))).toHaveLength(5);
  for (let i = 0; i < 5; i++) {
    expect(JSON.parse(options(d)[`card${i}`]).sandpit_after_this_discard).toMatchObject({
      energy_payable_escapes_after_this_pick: i === 3 ? 0 : 1,
      removes_last_energy_payable_escape: i === 3,
    });
    const key = `card${i}`;
    expect(d.resolve({ pick: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } }).intent)
      .toMatchObject({ action: "select_deck_card", option_index: i });
  }
  expect(context(d).limitation).toContain("保留逃离不等于有可活线");
  expect(context(d).basis).toContain("不预报下轮抽牌");
});

it("keeps the original observed discard distinct from an unplayed winning alternative", () => {
  const before = evidence.states["306208"] as Raw;
  const selecting = evidence.states["306209"] as Raw;
  const after = evidence.states["306210"] as Raw;
  expect(before.combat.hand.some((c: Raw) => c.card_id === "DAGGER_THROW")).toBe(true);
  expect(selecting.combat.hand.some((c: Raw) => c.card_id === "FRANTIC_ESCAPE")).toBe(true);
  expect(after.combat.hand.some((c: Raw) => c.card_id === "FRANTIC_ESCAPE")).toBe(false);
  expect(after.combat.player).toMatchObject({ current_hp: 27, energy: 2 });
  expect(after.turn).toBe(5);
});

it.each(["character", "ascension", "pit", "source", "turn", "fight", "costMismatch"])(
  "keeps the existing output when the observed window cannot be established: %s", (scope) => {
    const e = env(); const input = e.state.raw as Raw;
    if (scope === "character") input.run.character_id = "IRONCLAD";
    if (scope === "ascension") e.state.run!.ascension = 9;
    if (scope === "pit") input.combat.enemies[0].powers[0].amount = 1;
    if (scope === "source") e.screenMemory.cardSource!.id = "UNKNOWN";
    if (scope === "turn") e.screenMemory.cardSource!.turn = 4;
    if (scope === "fight") e.screenMemory.cardSource!.fight = "unrelated";
    if (scope === "costMismatch") input.selection.cards[3].energy_cost = 2;
    const withSource = JSON.stringify(planSelection(e));
    e.screenMemory.cardSource = undefined;
    expect(withSource).toBe(JSON.stringify(planSelection(e)));
    expect(withSource).not.toContain("sandpit_discard");
  },
);
