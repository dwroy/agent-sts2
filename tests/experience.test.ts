/** The experience knowledge base: slice selection, rendering into the run context, and the curated data file. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { knowledgeSlice, offeredOn, selectLessons, setExperienceForTests, type ExperienceEntry, type OutcomeStats, type SliceInput } from "../src/knowledge/experience.js";
import { parseGameState } from "../src/mod/schema.js";
import { RunJournal } from "../src/project/run-journal.js";
import { fightLessons } from "../src/screens/combat-plan.js";
import { baseState, combatPayload, runPayload, testKnowledge } from "./scenarios.js";

/** The active lessons' total length in characters (Dai 2026-10-04: 60k; about 40k at 198 entries then). */
const EXPERIENCE_LESSON_CHAR_BUDGET = 60_000;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const lesson = (id: string, scope: string, overrides: Partial<ExperienceEntry> = {}): ExperienceEntry => ({
  id,
  scope,
  asc: [0, 20],
  lesson: `lesson ${id}`,
  evidence: ["RUN000000001"],
  n_support: 2,
  n_contradict: 0,
  confidence: "med",
  last_seen: "2026-09-28",
  status: "active",
  ...overrides,
});

const ENTRIES: ExperienceEntry[] = [
  lesson("vantom-multihit", "boss:VANTOM", { confidence: "high", n_support: 6 }),
  lesson("crab-hp", "boss:KAISER_CRAB", { confidence: "high", n_support: 9 }),
  lesson("inflame-take", "card:INFLAME"),
  lesson("anger-old", "card:ANGER", { status: "retired", retired_reason: "superseded" }),
  lesson("clash-trap", "card:CLASH"),
  lesson("deck-aoe", "general:deck", { confidence: "high", n_support: 12 }),
  lesson("rest-smith", "general:rest", { confidence: "high", n_support: 8 }),
  lesson("route-rests", "general:route"),
  lesson("effigy-hp", "elite:BYGONE_EFFIGY", { confidence: "high" }),
  lesson("low-asc-only", "general:deck", { asc: [0, 3] }),
];

const STATS: OutcomeStats = {
  ascension: 8,
  baseline: { runs: 120, mean_floor: 26.5, boss_pass_by_act: { "1": { n: 120, boss_pass: 0.68 } } },
  cards: { INFLAME: { name: "燃烧", by_act: { "1": { picked: { n: 35, mean_floor: 27.5, boss_pass: 0.74 }, offered_not_picked: { n: 2, mean_floor: 17, boss_pass: 0, low_n: true } } } } },
};

function input(overrides: Partial<SliceInput> = {}): SliceInput {
  return {
    label: "reward/card",
    act: 1,
    asc: 8,
    bossId: "VANTOM_BOSS",
    offered: { cards: ["INFLAME", "ANGER"], relics: [], potions: [], events: [], eventOptions: [], text: "" },
    threats: ["BYGONE_EFFIGY"],
    ...overrides,
  };
}

function rewardState() {
  return parseGameState(
    baseState("REWARD", {
      run: runPayload({ floor: 5, act_id: "0", boss_id: "VANTOM_BOSS", ascension: 8 }),
      reward: { pending_card_choice: true, rewards: [], card_options: [{ index: 0, card_id: "INFLAME", name: "燃烧" }, { index: 1, card_id: "ANGER", name: "愤怒" }] },
    }),
  );
}

afterEach(() => setExperienceForTests(null, null));

describe("experience slice selection", () => {
  it("picks the act boss and the offered cards, drops retired entries, other bosses and unoffered cards", () => {
    const ids = selectLessons(input(), ENTRIES).map((entry) => entry.id);
    expect(ids.slice(0, 2)).toEqual(["inflame-take", "vantom-multihit"]);
    expect(ids).toContain("deck-aoe");
    expect(ids).not.toContain("anger-old");
    expect(ids).not.toContain("crab-hp");
    expect(ids).not.toContain("clash-trap");
    expect(ids).not.toContain("rest-smith");
    expect(ids).not.toContain("low-asc-only");
  });

  it("matches the screen type's general topics and ranks threats higher on route decisions", () => {
    const rest = selectLessons(input({ label: "rest/choose", offered: { cards: [], relics: [], potions: [], events: [], eventOptions: [], text: "" } }), ENTRIES).map((entry) => entry.id);
    expect(rest).toContain("rest-smith");
    expect(rest).not.toContain("deck-aoe");
    const route = selectLessons(input({ label: "map/route-plan" }), ENTRIES).map((entry) => entry.id);
    expect(route.indexOf("effigy-hp")).toBeLessThan(route.indexOf("route-rests"));
  });

  it("bounds the slice by relevance: general advice is cut before the offered card or the boss", () => {
    const many = Array.from({ length: 40 }, (_, index) => lesson(`deck-${index}`, "general:deck", { confidence: "high", n_support: 50 }));
    const picked = selectLessons(input(), [...many, lesson("inflame-low", "card:INFLAME", { confidence: "low", n_support: 1 }), ...ENTRIES], 25);
    expect(picked).toHaveLength(25);
    expect(picked.map((entry) => entry.id)).toEqual(expect.arrayContaining(["inflame-low", "inflame-take", "vantom-multihit"]));
  });

  it("reads offered ids from the screen section, not from the deck", () => {
    const offered = offeredOn(rewardState());
    expect(offered.cards).toEqual(["INFLAME", "ANGER"]);
    expect(offered.cards).not.toContain("STRIKE_R");
  });
});

describe("boss lessons on a board of boss parts", () => {
  function crabBoard(bossId: string | null) {
    const payload = combatPayload();
    payload["run"] = runPayload({ floor: 33, act_id: "1", boss_id: bossId, ascension: 8 });
    const combat = payload["combat"] as Record<string, unknown>;
    const [first, second] = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = [
      { ...first, enemy_id: "CRUSHER", name: "碾碎爪" },
      { ...second, enemy_id: "ROCKET", name: "火箭" },
    ];
    return parseGameState(payload);
  }

  it("matches boss:KAISER_CRAB to CRUSHER + ROCKET in the DeepSeek slice, boss id known or not", () => {
    const enemies = ["CRUSHER", "ROCKET"];
    expect(selectLessons(input({ label: "combat/plan", bossId: null, enemies }), ENTRIES).map((entry) => entry.id)).toContain("crab-hp");
    expect(selectLessons(input({ label: "combat/plan", bossId: null, enemies: ["KIN_PRIEST", "KIN_FOLLOWER"] }), [lesson("kin", "boss:THE_KIN")]).map((entry) => entry.id)).toEqual(["kin"]);
    expect(selectLessons(input({ label: "combat/plan", bossId: null, enemies: ["TORCH_HEAD_AMALGAM"] }), [lesson("queen", "boss:QUEEN")]).map((entry) => entry.id)).toEqual(["queen"]);
    expect(selectLessons(input({ label: "combat/plan", bossId: null, enemies: ["JAW_WORM"] }), ENTRIES).map((entry) => entry.id)).not.toContain("crab-hp");
  });

  it("gives Jev crab-kill-order on a crab board", () => {
    for (const bossId of ["KAISER_CRAB_BOSS", null]) {
      const ids = fightLessons(crabBoard(bossId)).map((entry) => entry.id);
      expect(ids).toContain("crab-kill-order");
      expect(ids.every((id) => id.startsWith("crab"))).toBe(true);
    }
  });
});

describe("knowledge section in the run context", () => {
  it("renders lessons with confidence and n, and the outcome stats of the offered card", () => {
    setExperienceForTests(ENTRIES, STATS);
    const slice = knowledgeSlice(rewardState(), "reward/card");
    expect(slice.lessons).toContain("inflame-take");
    expect(slice.lessons).not.toContain("anger-old");
    expect(slice.text).toContain("[boss:VANTOM | 置信高 n=6] lesson vantom-multihit");
    expect(slice.text).toContain("卡 燃烧(INFLAME) 第1幕: 拿了 n=35 均终层27.5 过本幕boss 74% | 给了没拿 n=2(少) 均终层17 过本幕boss 0%");
    expect(slice.text).toContain("过本幕boss 68% (n=120)");
  });

  it("rides in the journal's memory as `knowledge`", () => {
    setExperienceForTests(ENTRIES, STATS);
    const memory = new RunJournal().render(rewardState(), testKnowledge, {}, { label: "reward/card" });
    expect(memory.knowledge).toContain("lesson inflame-take");
    const bare = new RunJournal().render(rewardState(), testKnowledge, {});
    expect(bare.knowledge).toContain("lesson vantom-multihit");
    expect(bare.knowledge).not.toContain("lesson deck-aoe");
  });
});

describe("experience.json", () => {
  const file = JSON.parse(readFileSync(join(ROOT, "src/knowledge/experience.json"), "utf8")) as { entries: ExperienceEntry[] };

  it("is well-formed: unique ids, known scopes, counts, confidence and status", () => {
    const ids = new Set<string>();
    for (const entry of file.entries) {
      expect(ids.has(entry.id), entry.id).toBe(false);
      ids.add(entry.id);
      expect(entry.scope, entry.id).toMatch(/^(boss|elite|hallway|card|relic|event|potion):[A-Z0-9_]+$|^act:[1-3]$|^general:[a-z]+$/);
      expect(["low", "med", "high"]).toContain(entry.confidence);
      expect(["active", "retired"]).toContain(entry.status);
      expect(entry.lesson.length, entry.id).toBeGreaterThan(8);
      expect(entry.n_support, entry.id).toBeGreaterThanOrEqual(entry.evidence.length > 0 ? 1 : 0);
      expect(entry.asc[0]).toBeLessThanOrEqual(entry.asc[1]);
      if (entry.status === "retired") expect(entry.retired_reason, entry.id).toBeTruthy();
    }
    const active = file.entries.filter((entry) => entry.status === "active");
    expect(active.length).toBeGreaterThanOrEqual(80);
    // Dai 2026-10-04: a size budget instead of the old 200-entry cap. The V4 brain's knowledge prefix carries every active
    // lesson for the run's ascension, so the cost is their length (every question pays it), not their count.
    const chars = active.reduce((sum, entry) => sum + entry.lesson.length, 0);
    expect(chars).toBeLessThanOrEqual(EXPERIENCE_LESSON_CHAR_BUDGET);
  });

  it("the real files: an act-1 card reward before Vantom gets the Vantom lessons and the offered card's lesson and stats", () => {
    const state = parseGameState(
      baseState("REWARD", {
        run: runPayload({ floor: 5, act_id: "0", boss_id: "VANTOM_BOSS", ascension: 8 }),
        reward: { pending_card_choice: true, rewards: [], card_options: [{ index: 0, card_id: "RUPTURE" }, { index: 1, card_id: "SHRUG_IT_OFF" }, { index: 2, card_id: "BLUDGEON" }] },
      }),
    );
    const slice = knowledgeSlice(state, "reward/card");
    expect(slice.lessons[0]).toBe("card-rupture");
    expect(slice.lessons).toEqual(expect.arrayContaining(["vantom-multihit", "vantom-dismember", "deck-strength-aoe"]));
    expect(slice.lessons.length).toBeLessThanOrEqual(25);
    for (const id of slice.lessons) expect(file.entries.find((entry) => entry.id === id)?.status).toBe("active");
    expect(slice.text).toContain("卡 撕裂(RUPTURE) 第1幕");
  });
});
