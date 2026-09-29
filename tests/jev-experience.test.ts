/**
 * V4 M3 (notes/v4-dev-brief.md item 4): the potion and mechanics experience on Jev's combat question. Fixed data
 * only (the experience base and monster DB are passed in or set for the test). Evidence, never a gate: the tests
 * check what is selected and in which order, that the code's own words set no threshold, and that nothing about the
 * options changes.
 */

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { setExperienceForTests, type ExperienceEntry } from "../src/knowledge/experience.js";
import type { MonsterEntry } from "../src/knowledge/monster-db.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import {
  JEV_EXPERIENCE_TEXTS,
  jevExperience,
  MAX_MECHANIC_LESSONS,
  MAX_PLAN_POTION_CHARS,
  MAX_POTION_LESSON_CHARS,
  MAX_POTION_LESSONS,
  planPotionClauses,
  POTION_BOSS_DATA,
  type JevExperienceInput,
} from "../src/screens/jev-experience.js";
import type { RunPlan } from "../src/strategy/run-plan.js";
import { combatPayload, runPayload, testKnowledge } from "./scenarios.js";

afterEach(() => setExperienceForTests(null));

type Raw = Record<string, unknown>;

const lesson = (id: string, scope: string, text: string, overrides: Partial<ExperienceEntry> = {}): ExperienceEntry => ({
  id,
  scope,
  asc: [0, 20],
  lesson: text,
  evidence: ["RUN000000001"],
  n_support: 5,
  n_contradict: 0,
  confidence: "high",
  last_seen: "2026-09-29",
  status: "active",
  ...overrides,
});

/** A fixed experience base (no gate words in it, so the whole block can be checked for them). */
const ENTRIES: ExperienceEntry[] = [
  lesson("save-for-boss", "general:potion", "点名留给 boss 的药在走廊喝掉的局，boss 关键回合常差那一瓶。", { n_support: 70, n_contradict: 1 }),
  lesson("no-hoarding", "general:potion", "boss 战里节奏药在 T1 喝；带着没喝的药死过。", { n_support: 26 }),
  lesson("slime-potions", "boss:SLIME", "史莱姆 boss：格挡药水、虚弱药水留给分裂回合，力量药水 T1 喝。", { n_support: 9 }),
  lesson("slime-dps", "boss:SLIME", "史莱姆 boss 需要约 30/回合；赢局 T1 喝过药水。长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长长。", { n_support: 20 }),
  lesson("slime-route", "boss:SLIME", "史莱姆 boss 前一层休息。", { n_support: 30 }),
  lesson("crab-potions", "boss:KAISER_CRAB", "螃蟹的药水留给激光回合。", { n_support: 17 }),
  lesson("fire-potion", "potion:FIRE_POTION", "火焰药水 20 伤，走廊里多半只多打几点。", { n_support: 4, name: "Fire Potion" }),
  lesson("block-potion", "potion:BLOCK_POTION", "格挡药水留给大来袭回合。", { n_support: 6 }),
  lesson("old-potion", "general:potion", "旧的药水经验。", { status: "retired", retired_reason: "superseded" }),
  lesson("low-asc-potion", "general:potion", "低进阶的药水经验。", { asc: [0, 3] }),
  lesson("jaw-worm", "hallway:JAW_WORM", "颚虫走廊：留给 boss 的药在这里多半省不了几血。", { n_support: 12 }),
  lesson("inflame", "card:INFLAME", "燃烧从下回合起每回合都算，第一张力量来源。", { n_support: 4, confidence: "med" }),
  lesson("strike", "card:STRIKE_R", "打击删掉。", { n_support: 40 }),
  lesson("slippery-boss", "boss:VANTOM", "墨影幻灵开场 9 层滑溜：多段攻击磨掉滑溜。", { n_support: 9 }),
  lesson("slippery-other", "hallway:INKLET", "墨宝有滑溜。", { n_support: 3 }),
  lesson("boomerang", "card:SWORD_BOOMERANG", "飞剑回旋镖是磨滑溜的好牌。", { n_support: 7 }),
  lesson("beast-name", "general:elite", "仪式兽那一幕别整幕不打精英。", { n_support: 12 }),
  lesson("ritual", "hallway:DEVOTED_SCULPTOR", "雕刻师仪式 9，按竞速打。", { n_support: 6 }),
  lesson("strength-power", "power:STRENGTH_POWER", "力量只加攻击牌伤害，每段都加。", { n_support: 8 }),
  // 力量 in many lessons: too common to match on.
  ...Array.from({ length: 30 }, (_, i) => lesson(`deck-${i}`, "general:deck", `构筑要有永久力量 ${i}。`, { n_support: 1, confidence: "low" })),
  // The rest of a base of ~100 lessons (the real one has 221): a word in 3 of them is distinctive.
  ...Array.from({ length: 60 }, (_, i) => lesson(`route-${i}`, "general:route", `路线经验 ${i}。`, { n_support: 1, confidence: "low" })),
];

const MONSTERS: Record<string, MonsterEntry> = {
  VANTOM: { name: { zh: "墨影幻灵" }, powers: { SLIPPERY_POWER: { name: "滑溜" } } },
  INKLET: { name: { zh: "墨宝" }, powers: {} },
  DEVOTED_SCULPTOR: { name: { zh: "虔诚雕刻师" }, powers: { RITUAL_POWER: { name: "仪式" } } },
  CEREMONIAL_BEAST: { name: { zh: "仪式兽" }, powers: {} },
};

function board(options: { boss?: string; floor?: number; enemyPowers?: Raw[]; playerPowers?: Raw[]; potions?: Raw[]; asc?: number } = {}): GameState {
  const raw = combatPayload();
  raw["run"] = runPayload({ floor: options.floor ?? 9, boss_id: options.boss ?? "SLIME_BOSS", ascension: options.asc ?? 9, ...(options.potions ? { potions: options.potions } : {}) });
  const combat = raw["combat"] as Raw;
  if (options.enemyPowers) (combat["enemies"] as Raw[])[0]!["powers"] = options.enemyPowers;
  if (options.playerPowers) (combat["player"] as Raw)["powers"] = options.playerPowers;
  return parseGameState(raw);
}

const PLAN: RunPlan = {
  runId: "TESTRUN123",
  act: 1,
  floor: 6,
  hpPct: 0.8,
  trigger: "start",
  archetype: "strength",
  want: [],
  avoid: [],
  remove: [],
  blockTarget: 4,
  elites: "normal",
  rest: "auto",
  bossPrep: "Enter ≥75% HP; keep the Fire Potion for boss T1; block the split turn",
  summary: "Take Strength; 走廊不喝药，全留给 boss，删打击",
};

function input(state: GameState, overrides: Partial<JevExperienceInput> = {}): JevExperienceInput {
  return { state, kind: "monster", runPlan: PLAN, knowledge: testKnowledge, entries: ENTRIES, monsters: MONSTERS, ...overrides };
}

const GATE_WORDS = /必须|不许|只有当|只在|一律|must|never|only if|only when|do not|don't|forbid/i;

describe("potion_experience in hallway and elite fights", () => {
  it("gives the potion lessons, the act boss's potion lessons and the belt's, the logged data and the run plan's own words", () => {
    for (const kind of ["monster", "elite", "unknown"] as const) {
      const out = jevExperience(input(board(), { kind }));
      // General potion lessons (strength order), the act boss's (the potion lesson before a damage lesson naming one in
      // passing; the route lesson names none), then the belt's (the Fire Potion held; not the Block Potion).
      expect(out.ids.potion).toEqual(["save-for-boss", "no-hoarding", "slime-potions", "slime-dps", "fire-potion"]);
      const block = out.potion as { note: string; data: string[]; run_plan_on_potions: string; lessons: string[] };
      expect(block.note).toMatch(/evidence, not orders/);
      expect(block.note).toMatch(/rollout numbers cover this fight only/);
      expect(block.data).toEqual(POTION_BOSS_DATA.map((data) => `[data: ${data.source}] ${data.text}`));
      expect(block.data.join("\n")).toContain("9/27 (33%)");
      expect(block.data.join("\n")).toContain("115/191 (60%)");
      expect(block.data.join("\n")).toMatch(/TYZH \(1 HP short\), 0H1X \(4\), 9Q7V \(6\), XMK1 \(6\), 2ZCK \(11\), 7MDJ, PHMV/);
      expect(block.run_plan_on_potions).toBe("DeepSeek's run plan (F6), its words on potions: keep the Fire Potion for boss T1 | 走廊不喝药");
      expect(block.lessons[0]).toBe("[general:potion | confidence high, n=70, against 1] 点名留给 boss 的药在走廊喝掉的局，boss 关键回合常差那一瓶。");
    }
  });

  it("leaves out retired lessons, other ascensions, other bosses, and lessons already on the question", () => {
    const out = jevExperience(input(board(), { shown: ["no-hoarding"] }));
    expect(out.ids.potion).not.toContain("old-potion");
    expect(out.ids.potion).not.toContain("low-asc-potion");
    expect(out.ids.potion).not.toContain("crab-potions");
    expect(out.ids.potion).not.toContain("no-hoarding");
    // At A2 the low-ascension lesson applies.
    expect(jevExperience(input(board({ asc: 2 }))).ids.potion).toContain("low-asc-potion");
  });

  it("with no run plan there is no run-plan line; the brief's one-line plan is read when there is no plan in memory", () => {
    const none = jevExperience(input(board(), { runPlan: null })).potion!;
    expect(none["run_plan_on_potions"]).toBeUndefined();
    const brief = jevExperience(input(board(), { runPlan: null, briefPlan: "strength — save potions for the boss | want INFLAME" })).potion!;
    expect(brief["run_plan_on_potions"]).toBe("DeepSeek's run plan, its words on potions: save potions for the boss");
  });

  it("holds to the count and character caps, never cutting a lesson; the most relevant is kept even when long", () => {
    const many = Array.from({ length: 12 }, (_, i) => lesson(`g${i}`, "general:potion", `药水经验 ${i} ${"长".repeat(200)}`, { n_support: 50 - i }));
    const out = jevExperience(input(board(), { entries: many }));
    expect(out.ids.potion.length).toBeLessThanOrEqual(MAX_POTION_LESSONS);
    const lessons = many.filter((entry) => out.ids.potion.includes(entry.id));
    expect(lessons.reduce((sum, entry) => sum + entry.lesson.length, 0)).toBeLessThanOrEqual(MAX_POTION_LESSON_CHARS);
    expect(out.ids.potion[0]).toBe("g0");
    const huge = [lesson("huge", "general:potion", `药 ${"长".repeat(MAX_POTION_LESSON_CHARS + 50)}`, { n_support: 99 }), lesson("short", "general:potion", "短的药水经验。", { n_support: 1 })];
    expect(jevExperience(input(board(), { entries: huge })).ids.potion).toEqual(["huge"]);
    const skip = [lesson("a", "general:potion", `药 ${"长".repeat(900)}`, { n_support: 9 }), lesson("b", "general:potion", `药 ${"长".repeat(900)}`, { n_support: 8 }), lesson("c", "general:potion", "短药。", { n_support: 7 })];
    expect(jevExperience(input(board(), { entries: skip })).ids.potion).toEqual(["a", "c"]);
  });
});

describe("potion_experience in the boss fight", () => {
  it("reads as the fight the potions were kept for: no entering-the-boss data; the boss's lessons, the belt's, then the general ones", () => {
    const out = jevExperience(input(board(), { kind: "boss" }));
    const block = out.potion!;
    expect(String(block["note"])).toMatch(/^This is the act boss fight, the one potions are kept for/);
    expect(block["data"]).toBeUndefined();
    expect(out.ids.potion).toEqual(["slime-potions", "slime-dps", "fire-potion", "save-for-boss", "no-hoarding"]);
    expect(block["run_plan_on_potions"]).toContain("keep the Fire Potion for boss T1");
  });

  it("gets no block when there is nothing about potions", () => {
    const out = jevExperience(input(board({ potions: [] }), { kind: "boss", runPlan: null, entries: [] }));
    expect(out.potion).toBeNull();
    // Outside the boss fight the note and the data stay.
    expect(jevExperience(input(board({ potions: [] }), { runPlan: null, entries: [] })).potion).not.toBeNull();
  });
});

describe("mechanics_experience", () => {
  it("our Power cards' lessons first; not the other cards'", () => {
    const out = jevExperience(input(board()));
    expect(out.ids.mechanics).toEqual(["inflame"]);
    expect(out.mechanics!["note"]).toMatch(/evidence, not orders/);
  });

  it("an enemy's own power: lessons about monsters the DB has seen with it, and about cards we hold that name it", () => {
    const slippery = [{ index: 0, power_id: "SLIPPERY_POWER", name: "滑溜", amount: 9, is_debuff: false }];
    const raw = board({ enemyPowers: slippery });
    const out = jevExperience(input(raw));
    expect(out.ids.mechanics).toContain("slippery-boss");
    // INKLET's DB entry has no Slippery; the boomerang is not in our deck.
    expect(out.ids.mechanics).not.toContain("slippery-other");
    expect(out.ids.mechanics).not.toContain("boomerang");
    const deck = (raw.run!.raw as Raw)["deck"] as Raw[];
    deck.push({ index: 5, card_id: "SWORD_BOOMERANG", name: "Sword Boomerang", card_type: "Attack", upgraded: false });
    expect(jevExperience(input(raw)).ids.mechanics).toContain("boomerang");
  });

  it("a word inside a monster's name, a debuff, or a word in many lessons does not count", () => {
    const ritual = jevExperience(input(board({ enemyPowers: [{ index: 0, power_id: "RITUAL_POWER", name: "仪式", amount: 3, is_debuff: false }] })));
    expect(ritual.ids.mechanics).toContain("ritual");
    expect(ritual.ids.mechanics).not.toContain("beast-name");
    const debuff = jevExperience(input(board({ enemyPowers: [{ index: 0, power_id: "SLIPPERY_POWER", name: "滑溜", amount: 1, is_debuff: true }] })));
    expect(debuff.ids.mechanics).not.toContain("slippery-boss");
    // 力量 is in 30+ of the lessons: our Strength does not pull in the deck lessons.
    const strength = jevExperience(input(board({ playerPowers: [{ index: 0, power_id: "STRENGTH_POWER", name: "力量", amount: 2, is_debuff: false }] })));
    expect(strength.ids.mechanics.some((id) => id.startsWith("deck-"))).toBe(false);
    // A power:<ID> lesson for a power on the board comes first.
    expect(strength.ids.mechanics[0]).toBe("strength-power");
    expect(strength.ids.mechanics.length).toBeLessThanOrEqual(MAX_MECHANIC_LESSONS);
  });

  it("never repeats a lesson of the potion block or of the enemies' block", () => {
    const out = jevExperience(input(board(), { shown: ["inflame"] }));
    expect(out.ids.mechanics).not.toContain("inflame");
    expect(out.ids.mechanics.filter((id) => out.ids.potion.includes(id))).toEqual([]);
  });
});

describe("the code's own words set no threshold", () => {
  it("notes and data carry no gate words (必须 / 不许 / 只有当 / must / only if ...)", () => {
    for (const text of JEV_EXPERIENCE_TEXTS) expect(text).not.toMatch(GATE_WORDS);
  });

  it("with gate-free lessons the whole blocks are gate-free, in every kind of fight", () => {
    for (const kind of ["monster", "elite", "boss"] as const) {
      const out = jevExperience(input(board({ enemyPowers: [{ index: 0, power_id: "SLIPPERY_POWER", name: "滑溜", amount: 9, is_debuff: false }] }), { kind, runPlan: { ...PLAN, summary: "Take Strength", bossPrep: "keep the Fire Potion for boss T1" } }));
      expect(JSON.stringify(out)).not.toMatch(GATE_WORDS);
    }
  });
});

describe("planPotionClauses", () => {
  it("quotes the clauses about potions verbatim, splitting on ; ； 。 ， | and full stops, not English commas", () => {
    expect(planPotionClauses(["Enter ≥75% HP; T1 Strength Potion + AoE burst, single-target Rocket; block T4 Laser"])).toEqual(["T1 Strength Potion + AoE burst, single-target Rocket"]);
    expect(planPotionClauses(["先回血，boss 前保持高血带药。删打击"])).toEqual(["boss 前保持高血带药"]);
    expect(planPotionClauses(["Heal. Buy potions at F10. Smith Bash."])).toEqual(["Buy potions at F10"]);
  });

  it("finds a held potion named without the word potion, but not an X_POTION's bare word", () => {
    const held = [{ id: "LIQUID_BRONZE", name: "流动铜液" }, { id: "STRENGTH_POTION", name: "力量药水" }];
    expect(planPotionClauses(["save Liquid Bronze for T4/T9 Laser; permanent Strength from Inflame"], held)).toEqual(["save Liquid Bronze for T4/T9 Laser"]);
  });

  it("stops at the character cap, keeping whole clauses", () => {
    const long = Array.from({ length: 20 }, (_, i) => `keep potion ${i} for the boss ${"x".repeat(30)}`).join("; ");
    const clauses = planPotionClauses([long]);
    expect(clauses.join("").length).toBeLessThanOrEqual(MAX_PLAN_POTION_CHARS);
    expect(clauses[0]).toBe(`keep potion 0 for the boss ${"x".repeat(30)}`);
  });
});

describe("on Jev's plan-choice question (JEV_CONTEXT=v1)", () => {
  const config = loadConfig({} as NodeJS.ProcessEnv);

  function env(raw: Raw, overrides: Partial<DecisionEnv> = {}): DecisionEnv {
    const state = parseGameState(raw);
    const memory = createScreenMemory(state.screen);
    memory.runPlan = PLAN;
    return {
      state, knowledge: testKnowledge, brief: buildRunBrief(state, testKnowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null,
      allowFtueModals: false, strictJev: true, combatPlanner: "turn", screenMemory: memory, shopDiscardPotions: [], ...overrides,
    };
  }

  /** A dangerous turn with an unmodelled potion: the plan goes to Jev (jev-context.test.ts). */
  function askCombat(): Raw {
    const raw = combatPayload();
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["current_hp"] = 30;
    const enemies = combat["enemies"] as Raw[];
    combat["enemies"] = [{ ...enemies[0], intents: [{ index: 0, intent_type: "Attack", label: "32", damage: 32, hits: 1, total_damage: 32 }] }];
    const hand = combat["hand"] as Raw[];
    const block10 = { dynamic_values: [{ name: "Block", base_value: 10, current_value: 10 }] };
    combat["hand"] = [hand[0], { ...hand[1], ...block10 }, { ...hand[1], index: 3, ...block10 }, { ...hand[2], index: 2 }];
    raw["run"] = runPayload({ ascension: 9 });
    ((raw["run"] as Raw)["potions"] as Raw[])[0]!["potion_id"] = "LIQUID_MEMORIES";
    return raw;
  }

  it("adds the blocks to Jev's view only; the options and the escalator's question are unchanged", () => {
    setExperienceForTests([...ENTRIES, lesson("memories", "potion:LIQUID_MEMORIES", "液态记忆留给 boss。")]);
    const decision = planCombatTurn(env(askCombat(), { jevContext: "v1" })) as AskDecision;
    expect(decision.kind).toBe("ask");
    const view = decision.jevView!.state;
    expect(view["potion_experience"]).toBeDefined();
    const block = view["potion_experience"] as { lessons: string[]; run_plan_on_potions: string };
    expect(block.lessons.some((line) => line.includes("液态记忆留给 boss"))).toBe(true);
    expect(block.run_plan_on_potions).toContain("走廊不喝药");
    expect(decision.state["potion_experience"]).toBeUndefined();
    expect(decision.state["mechanics_experience"]).toBeUndefined();
    // The options are untouched: JEV_CONTEXT=off asks the same plan question, with no V4 block.
    const off = planCombatTurn(env(askCombat(), { jevContext: "off" })) as AskDecision;
    expect(off.state["potion_experience"]).toBeUndefined();
    expect(JSON.stringify(off.questions)).toBe(JSON.stringify(decision.questions));
    // The V4 keys come after the question's own keys (the old question is the new one without them).
    expect(Object.keys(view).slice(-2)).toEqual(["potion_experience", "mechanics_experience"]);
    expect((view["mechanics_experience"] as { lessons: string[] }).lessons[0]).toContain("[card:INFLAME");
  }, 30_000);
});
