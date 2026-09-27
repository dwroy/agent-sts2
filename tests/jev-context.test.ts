/**
 * M1 (JEV_CONTEXT=v1): option fact tags, fight-hint retrieval, the combat-trimmed brief, and that the
 * flag off leaves the plan-choice question exactly as it was.
 */

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { loadHints, MAX_HINT_WORDS, MAX_HINTS, selectHints, type HintQuery } from "../src/knowledge/jev-hints.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { briefJson, buildRunBrief, combatBriefJson, isCombatRelic } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn, planFacts, type FactContext } from "../src/screens/combat-plan.js";
import type { CardModel } from "../src/strategy/card-model.js";
import type { EnemySim, Outcome, Plan } from "../src/strategy/turn-solver.js";
import { combatPayload, testKnowledge } from "./scenarios.js";

const config = loadConfig({} as NodeJS.ProcessEnv);

function env(raw: Record<string, unknown>, overrides: Partial<DecisionEnv> = {}): DecisionEnv {
  const state: GameState = parseGameState(raw);
  return {
    state,
    knowledge: testKnowledge,
    brief: buildRunBrief(state, testKnowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: ["FOUL_POTION"],
    ...overrides,
  };
}

/** A dangerous turn with an unmodelled potion: the plan goes to Jev (as in screens.test.ts). */
function askCombat(): Record<string, unknown> {
  const raw = combatPayload();
  const combat = raw["combat"] as Record<string, unknown>;
  (combat["player"] as Record<string, unknown>)["current_hp"] = 30;
  const enemies = combat["enemies"] as Record<string, unknown>[];
  combat["enemies"] = [{ ...enemies[0], intents: [{ index: 0, intent_type: "Attack", label: "32", damage: 32, hits: 1, total_damage: 32 }] }];
  const hand = combat["hand"] as Record<string, unknown>[];
  const block10 = { dynamic_values: [{ name: "Block", base_value: 10, current_value: 10 }] };
  combat["hand"] = [hand[0], { ...hand[1], ...block10 }, { ...hand[1], index: 3, ...block10 }, { ...hand[2], index: 2 }];
  const run = raw["run"] as Record<string, unknown>;
  (run["potions"] as Record<string, unknown>[])[0]!["potion_id"] = "ENTROPIC_BREW";
  run["relics"] = [
    { index: 0, relic_id: "BURNING_BLOOD", name: "Burning Blood", description: "", stack: null, is_melted: false },
    { index: 1, relic_id: "MERCURY_HOURGLASS", name: "Mercury Hourglass", description: "", stack: null, is_melted: false },
    { index: 2, relic_id: "STRAWBERRY", name: "Strawberry", description: "", stack: null, is_melted: false },
  ];
  return raw;
}

const outcome = (over: Partial<Outcome> = {}): Outcome => ({
  winsFight: false, hpLoss: 5, hpAfter: 45, dies: false, blockGained: 0, damageDealt: 10, kills: [], restocked: [],
  enemyHpAfter: [{ index: 0, name: "Boss", hp: 90, vulnerable: 0, weak: 0 }], incomingAfterBlock: 5, energyLeft: 0,
  vulnerableApplied: 0, weakApplied: 0, strengthGained: 0, cardsDrawn: 0, unknownCards: [], potionCost: 0, sandpitAfter: null,
  startTurnKills: [], withersAdded: 0, sleepCost: 0, lasting: 0, ...over,
});

const enemy = (over: Partial<EnemySim> = {}): EnemySim =>
  ({ index: 0, name: "Boss", hp: 100, maxHp: 200, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over }) as EnemySim;

const card = (index: number, cardId: string, type: string): CardModel => ({ index, cardId, type }) as unknown as CardModel;

describe("JEV_CONTEXT config", () => {
  it("is off by default, v1 when set, and rejects other values", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).jevContext).toBe("off");
    expect(loadConfig({ JEV_CONTEXT: "v1" } as NodeJS.ProcessEnv).jevContext).toBe("v1");
    expect(() => loadConfig({ JEV_CONTEXT: "v2" } as NodeJS.ProcessEnv)).toThrow(/JEV_CONTEXT/);
  });
});

describe("plan fact tags", () => {
  const ctx = (over: Partial<FactContext> = {}): FactContext => ({
    maxHp: 80,
    hand: [card(0, "INFLAME", "Power"), card(1, "DEFEND_R", "Skill"), card(2, "STRIKE_R", "Attack")],
    enemies: [enemy()],
    nextThreat: new Map([[0, 20]]),
    noAttack: true,
    ...over,
  });
  const step = (cardIndex: number, cardId: string, name = cardId) => ({ cardIndex, cardId, upgraded: false, name, target: null, targetName: null });

  it("marks a power played on a no-attack turn as a setup turn, with the scaling it gains", () => {
    const plan: Plan = { steps: [step(0, "INFLAME", "Inflame")], outcome: outcome({ strengthGained: 2, lasting: 12, hpAfter: 40 }), score: 0 };
    const facts = planFacts(plan, ctx());
    expect(facts).toMatchObject({ hp_after: 40, hp_after_pct: 50, dmg: 10, setup_turn: true, lethal_now: "no", enemy_threat_next: 20, potions_used: "none", block_wasted: 0 });
    expect(facts["scaling_gained"]).toBe("+2 permanent Strength; plays power Inflame; lasting value 12");
    expect(planFacts(plan, ctx({ noAttack: false }))["setup_turn"]).toBe(false);
    const noPower: Plan = { steps: [step(1, "DEFEND_R")], outcome: outcome(), score: 0 };
    expect(planFacts(noPower, ctx())).toMatchObject({ setup_turn: false, scaling_gained: "none" });
  });

  it("reports lethal on a fight win or a key kill, not on a minion kill", () => {
    const enemies = [enemy(), enemy({ index: 1, name: "Egg", minion: true } as Partial<EnemySim>)];
    const win: Plan = { steps: [], outcome: outcome({ winsFight: true, kills: ["Boss"] }), score: 0 };
    expect(planFacts(win, ctx({ enemies }))).toMatchObject({ lethal_now: "wins the fight", enemy_threat_next: 0 });
    const minion: Plan = { steps: [], outcome: outcome({ kills: ["Egg"] }), score: 0 };
    expect(planFacts(minion, ctx({ enemies }))["lethal_now"]).toBe("no");
    const key: Plan = { steps: [], outcome: outcome({ kills: ["Boss"], enemyHpAfter: [{ index: 0, name: "Boss", hp: 0, vulnerable: 0, weak: 0 }] }), score: 0 };
    const facts = planFacts(key, ctx({ enemies, nextThreat: new Map([[0, 20], [1, 4]]) }));
    expect(facts["lethal_now"]).toBe("kills Boss");
    // The dead boss no longer threatens; the egg's 4 still does.
    expect(facts["enemy_threat_next"]).toBe(4);
  });

  it("cuts next turn's threat by Weak the line leaves, and says unknown without a move model", () => {
    const weak: Plan = { steps: [], outcome: outcome({ enemyHpAfter: [{ index: 0, name: "Boss", hp: 90, vulnerable: 0, weak: 2 }] }), score: 0 };
    expect(planFacts(weak, ctx())["enemy_threat_next"]).toBe(15);
    expect(planFacts(weak, ctx({ nextThreat: new Map([[0, null]]) }))["enemy_threat_next"]).toBe("unknown");
  });

  it("lists potions drunk and block wasted", () => {
    const plan: Plan = { steps: [step(5, "POTION:BLOCK_POTION:0", "Block Potion")], outcome: outcome({ blockWasted: 7 }), score: 0 };
    expect(planFacts(plan, ctx())).toMatchObject({ potions_used: "Block Potion", block_wasted: 7 });
  });
});

describe("fight hints", () => {
  const query = (over: Partial<HintQuery> = {}): HintQuery => ({ enemyIds: [], fight: "monster", act: 1, hpPct: 80, enemyPowers: [], noAttack: false, ...over });

  it("every hint is short, conditional, unique and backed by 2+ runs", () => {
    const hints = loadHints();
    expect(hints.length).toBeGreaterThanOrEqual(15);
    expect(hints.length).toBeLessThanOrEqual(30);
    expect(new Set(hints.map((hint) => hint.id)).size).toBe(hints.length);
    for (const hint of hints) {
      expect(hint.text.split(/\s+/).length, hint.id).toBeLessThanOrEqual(MAX_HINT_WORDS);
      expect(new Set(hint.evidence).size, hint.id).toBeGreaterThanOrEqual(2);
      expect(Object.keys(hint.when).length, hint.id).toBeGreaterThan(0);
    }
  });

  it("retrieves by enemy id and enemy power: the Matriarch's sleep hints only while it sleeps", () => {
    const asleep = selectHints(query({ enemyIds: ["LAGAVULIN_MATRIARCH"], fight: "boss", enemyPowers: ["ASLEEP_POWER"], noAttack: true })).map((hint) => hint.id);
    expect(asleep.slice(0, 3)).toEqual(["matriarch-asleep", "matriarch-sleep-turns", "matriarch-siphon"]);
    expect(asleep.length).toBeLessThanOrEqual(MAX_HINTS);
    const awake = selectHints(query({ enemyIds: ["LAGAVULIN_MATRIARCH"], fight: "boss" })).map((hint) => hint.id);
    expect(awake).not.toContain("matriarch-asleep");
    expect(awake[0]).toBe("matriarch-siphon");
  });

  it("gives hallway fights with no keyed enemy nothing, and caps boss fights at 5", () => {
    expect(selectHints(query({ enemyIds: ["JAW_WORM"] }))).toEqual([]);
    const kd = selectHints(query({ enemyIds: ["KNOWLEDGE_DEMON"], fight: "boss", act: 2, noAttack: true }));
    expect(kd.length).toBe(MAX_HINTS);
    expect(kd.map((hint) => hint.id).slice(0, 3)).toEqual(["kd-curse-turn", "kd-long-fight", "kd-overwhelm"]);
    const kdAttacking = selectHints(query({ enemyIds: ["KNOWLEDGE_DEMON"], fight: "boss", act: 2 })).map((hint) => hint.id);
    expect(kdAttacking).not.toContain("kd-curse-turn");
    expect(kdAttacking).not.toContain("setup-free-turn");
  });

  it("honours act and HP-band conditions", () => {
    const hints = [
      { id: "a", when: { act: [2] }, text: "x", evidence: ["R1", "R2"] },
      { id: "b", when: { hp_below_pct: 40 }, text: "y", evidence: ["R1", "R2"] },
    ];
    expect(selectHints(query({ act: 1, hpPct: 50 }), hints)).toEqual([]);
    expect(selectHints(query({ act: 2, hpPct: 39 }), hints).map((hint) => hint.id)).toEqual(["a", "b"]);
  });
});

describe("combat-trimmed brief", () => {
  it("drops the deck, gold and non-combat relics; keeps combat relics and potions", () => {
    const state = parseGameState(askCombat());
    const brief = buildRunBrief(state, testKnowledge);
    const full = briefJson(brief);
    const trimmed = combatBriefJson(brief, state, testKnowledge);
    expect(full["deck"]).toBeDefined();
    expect(trimmed["deck"]).toBeUndefined();
    expect(trimmed["gold"]).toBeUndefined();
    expect(trimmed["relics"]).toBeUndefined();
    expect(trimmed["relic_effects"]).toBeUndefined();
    expect(trimmed["combat_relics"]).toEqual(["Mercury Hourglass"]);
    expect(trimmed["potions"]).toEqual(full["potions"]);
    expect(trimmed).toMatchObject({ act: full["act"], floor: full["floor"], hp: full["hp"] });
    expect(isCombatRelic("BURNING_BLOOD")).toBe(false);
    expect(isCombatRelic("INTIMIDATING_HELMET")).toBe(true);
  });
});

describe("plan-choice question with JEV_CONTEXT", () => {
  it("flag off (or unset) leaves the question unchanged and adds no Jev view", () => {
    const unset = planCombatTurn(env(askCombat()));
    const off = planCombatTurn(env(askCombat(), { jevContext: "off" }));
    if (unset?.kind !== "ask" || off?.kind !== "ask") throw new Error("expected an ask");
    expect(off.jevView).toBeUndefined();
    expect(unset.jevView).toBeUndefined();
    expect(JSON.stringify(off.state)).toBe(JSON.stringify(unset.state));
    expect(JSON.stringify(off.questions)).toBe(JSON.stringify(unset.questions));
    expect(off.state["run_brief"]).toEqual(briefJson(env(askCombat()).brief));
  });

  it("v1 gives Jev tagged options and a trimmed brief, keeps the escalator's question as it was", () => {
    const off = planCombatTurn(env(askCombat()));
    const v1 = planCombatTurn(env(askCombat(), { jevContext: "v1" }));
    if (off?.kind !== "ask" || v1?.kind !== "ask" || !v1.jevView) throw new Error("expected an ask with a Jev view");
    // The escalator's view is untouched.
    expect(JSON.stringify(v1.state)).toBe(JSON.stringify(off.state));
    expect(JSON.stringify(v1.questions)).toBe(JSON.stringify(off.questions));
    // Same option keys for Jev, every plan with the fact tags and its original fields.
    const offCriteria = off.questions["plan"]?.type === "choice" ? off.questions["plan"].criteria : {};
    const jevCriteria = v1.jevView.questions["plan"]?.type === "choice" ? v1.jevView.questions["plan"].criteria : {};
    expect(Object.keys(jevCriteria)).toEqual(Object.keys(offCriteria));
    for (const [key, text] of Object.entries(jevCriteria)) {
      if (!key.startsWith("plan")) {
        expect(text).toBe(offCriteria[key]);
        continue;
      }
      const facts = JSON.parse(String(text)) as Record<string, unknown>;
      expect(facts).toMatchObject(JSON.parse(String(offCriteria[key])) as Record<string, unknown>);
      for (const tag of ["hp_after", "hp_after_pct", "dmg", "lethal_now", "enemy_threat_next", "setup_turn", "scaling_gained", "block_wasted", "potions_used"]) {
        expect(facts, `${key}.${tag}`).toHaveProperty(tag);
      }
    }
    expect(v1.jevView.state["run_brief"]).toMatchObject({ combat_relics: ["Mercury Hourglass"] });
    expect((v1.jevView.state["run_brief"] as Record<string, unknown>)["deck"]).toBeUndefined();
    expect(v1.jevView.context).toBe("v1");
    // A hallway Jaw Worm: no hint applies.
    expect(v1.jevView.hints).toEqual([]);
    expect(v1.jevView.state["fight_hints"]).toBeUndefined();
    // Both views resolve through the same keys.
    const key = Object.keys(jevCriteria)[0]!;
    const answer = { plan: { type: "choice" as const, choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } };
    expect(v1.resolve(answer).intent).toEqual(off.resolve(answer).intent);
  });

  it("v1 sends the matching fight hints and logs their ids", () => {
    const raw = askCombat();
    const combat = raw["combat"] as Record<string, unknown>;
    const [first] = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = [{ ...first, enemy_id: "SOUL_FYSH", name: "Soul Fysh" }];
    const v1 = planCombatTurn(env(raw, { jevContext: "v1" }));
    if (v1?.kind !== "ask" || !v1.jevView) throw new Error("expected an ask with a Jev view");
    expect(v1.jevView.hints).toEqual(["fysh-beckon", "fysh-draw-energy"]);
    expect(v1.jevView.state["fight_hints"]).toEqual(loadHints().filter((hint) => hint.id.startsWith("fysh-")).map((hint) => hint.text));
  });
});
