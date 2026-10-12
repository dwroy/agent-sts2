/** CMS8QL9E3C5U A10 F19 T1, silent-0425: fixed original observations only. */
import { expect, it, vi } from "vitest";
import evidence from "./silent-snakebite-discard-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { asRecord } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { noteCardSource, planSelection } from "../src/hand/screens/selection.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard, thisTurnScore } from "../src/reflex/card-model.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_snakebite_discard__/${name}`,
}));
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));

type Raw = Record<string, any>;
const raw = (line = 367872): Raw => structuredClone((evidence.states as Raw)[line]);
const knowledge = makeKnowledge({ cards: raw(367871).selection.cards.map((c: Raw) => ({
  id: c.card_id, name: c.name, type: c.card_type, cost: c.energy_cost,
  description: c.resolved_rules_text, description_raw: c.rules_text, vars: c.dynamic_values,
})) }, "cache");
function env(input = raw()): DecisionEnv {
  const state = parseGameState(input);
  const memory = createScreenMemory(state.screen);
  noteCardSource(memory, parseGameState(raw(367870)), evidence.decisions[357514].chosen);
  return { state, knowledge, screenMemory: memory, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, shopDiscardPotions: [] };
}
function ask(input = raw()): AskDecision {
  const d = planSelection(env(input));
  expect(d?.kind).toBe("ask");
  return d as AskDecision;
}
function choices(d: AskDecision): Record<string, string | null> {
  const q = d.questions["pick"];
  if (q?.type !== "choice") throw new Error("expected Jev discard choice");
  return q.criteria;
}
const answer = (key: string) => ({ pick: { type: "choice" as const, choice: key,
  probabilities: { [key]: 1 }, confidence: 1, raw: {} } });

it("replaces both historical zero-value auto-discards with all legal choices and confirmation", () => {
  for (const [line, snakes] of [[367872, 2], [367873, 1]]) {
    const input = raw(line); const d = ask(input);
    const options = choices(d);
    expect(Object.keys(options)).toEqual([...input.selection.cards.map((c: Raw) => `card${c.index}`), "confirm"]);
    expect(asRecord(d.state["situation"])).toMatchObject({ energy_now: 7, remaining_offered_snakebites: snakes });
    for (const c of input.selection.cards) {
      const option = JSON.parse(options[`card${c.index}`]!);
      if (c.card_id === "SNAKEBITE") {
        expect(option.snakebite_effect).toMatchObject({ poison_if_played: 7, immediate_hp_damage: 0,
          remaining_offered_snakebites_after_pick: snakes! - 1, turn_hp_value: null, fight_hp_value: null });
      }
      expect(d.resolve(answer(`card${c.index}`)).intent).toEqual({ action: "select_deck_card", option_index: c.index });
    }
    expect(d.resolve(answer("confirm")).intent).toEqual({ action: "confirm_selection" });
    expect(d.resolve({}).intent).toBeNull();
  }
});

it("does not turn seven poison into a score or a forced keep rule", () => {
  const e = env(); const card = raw().combat.hand[3];
  const model = modelHandCard(card, 3, knowledge, "silent", 10);
  expect(model.poison).toBe(7);
  expect(thisTurnScore(model, 15, 1)).toBe(-4);
  const d = planSelection(e) as AskDecision;
  expect(d.resolve(answer("card3")).intent).toEqual({ action: "select_deck_card", option_index: 3 });
  expect(d.questions.pick).toMatchObject({ type: "choice" });
});

it("uses compacted selection slots without treating a stale hand slot as the remaining copy", () => {
  const input = raw();
  expect(input.selection.cards[4].card_id).toBe("SNAKEBITE");
  expect(input.combat.hand[4].card_id).toBe("ASCENDERS_BANE");
  const d = ask(input);
  expect(JSON.parse(choices(d).card4!).snakebite_effect.poison_if_played).toBe(7);
  expect(d.resolve(answer("card4")).intent).toEqual({ action: "select_deck_card", option_index: 4 });
});

it("retains curse removal, existing planned subsets, and confirmation after the two poisons are gone", () => {
  expect(planSelection(env(raw(367871)))).toMatchObject({ kind: "act", intent: evidence.decisions[357515].chosen });
  const e = env(); e.screenMemory.gambleDiscards = { turn: 1, cardIds: ["SNAKEBITE"] };
  expect(planSelection(e)).toMatchObject({ kind: "act", intent: { action: "select_deck_card", option_index: 3 },
    rationale: expect.stringContaining("combat plan") });
  expect(planSelection(env(raw(367874)))).toMatchObject({ kind: "act", intent: { action: "confirm_selection" } });
  expect(raw(367875).combat.hand.filter((c: Raw) => c.card_id === "SNAKEBITE")).toHaveLength(0);
});

it.each(["IRONCLAD", "A9", "upgrade", "unpayable", "unplayable", "target_dead", "target_blocked", "player_power",
  "no_target", "different_source", "old_turn", "other_fight", "unknown_copy", "duplicate_slot", "nonmatching_effect"])(
  "keeps the prior production decision outside the observed scope: %s", (scope) => {
    const input = raw();
    if (scope === "IRONCLAD") input.run.character_id = "IRONCLAD";
    if (scope === "A9") input.run.ascension = 9;
    if (scope === "upgrade") for (const c of [...input.combat.hand, ...input.selection.cards]) if (c.card_id === "SNAKEBITE") c.upgraded = true;
    if (scope === "unpayable") input.combat.player.energy = 1;
    if (scope === "unplayable") for (const c of input.combat.hand) if (c.card_id === "SNAKEBITE") c.playable = false;
    if (scope === "target_dead") input.combat.enemies[0].is_alive = false;
    if (scope === "target_blocked") input.combat.enemies[0].powers = [{ power_id: "UNOBSERVED_POWER", amount: 1 }];
    if (scope === "player_power") input.combat.player.powers = [{ power_id: "UNOBSERVED_POWER", amount: 1 }];
    if (scope === "no_target") for (const c of input.combat.hand) if (c.card_id === "SNAKEBITE") c.valid_target_indices = [];
    if (scope === "unknown_copy") input.combat.hand[5].playable = false;
    if (scope === "duplicate_slot") input.selection.cards[4].index = 3;
    if (scope === "nonmatching_effect") input.selection.cards[3].dynamic_values[0].current_value = 8;
    const e = env(input);
    if (scope === "different_source") e.screenMemory.cardSource!.id = "OTHER_POTION";
    if (scope === "old_turn") e.screenMemory.cardSource!.turn = 0;
    if (scope === "other_fight") e.screenMemory.cardSource!.fight = "other";
    const d = JSON.stringify(planSelection(e));
    e.screenMemory.cardSource = undefined;
    expect(d).toBe(JSON.stringify(planSelection(e)));
    expect(d).not.toContain("poison_if_played");
  },
);

it("same-run earlier and later actual plays add seven poison without immediate enemy HP damage", () => {
  for (const [before, after] of [[367809, 367810], [367896, 367897]]) {
    const a = raw(before); const b = raw(after);
    const poison = (s: Raw) => s.combat.enemies[0].powers.find((p: Raw) => p.power_id === "POISON_POWER")?.amount ?? 0;
    expect(poison(b) - poison(a)).toBe(7);
    expect(b.combat.enemies[0].current_hp).toBe(a.combat.enemies[0].current_hp);
    expect(b.combat.player.energy).toBe(a.combat.player.energy - 2);
  }
});
