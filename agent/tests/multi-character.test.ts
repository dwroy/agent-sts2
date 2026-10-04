/**
 * Multi-character plumbing (2026-10-04, decision-log 19:37): character select picks the configured character before the
 * ascension and embark, an unmatched CHARACTER or a run of another character stops the loop, a character with no
 * knowledge directory reads as empty knowledge (never the Ironclad's), the climb's target, the monster-records merge,
 * and the model-visible character name. Temp files only; no model, no game.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planDecision, type PlanOutcome } from "../src/hand/screens/index.js";
import { cardValue, deckProfile, hasCardValues, SKIP_BAR } from "../src/hand/screens/card-value.js";
import { characterKey, DEFAULT_CHARACTER, KNOWLEDGE_DIR, knowledgeCharacter, knowledgeFile, setKnowledgeCharacter } from "../src/knowledge/files.js";
import { mergeMonsterRecords } from "../src/knowledge/monster-db.js";
import { loadKnowledgeData, parsePostmortems } from "../src/knowledge/render/data.js";
import { renderKnowledgePrefix } from "../src/knowledge/render/knowledge-prefix.js";
import { fullSystemPrompt, FULL_KNOWLEDGE_NOTE } from "../src/brain/knowledge.js";
import { SYSTEM, systemRules } from "../src/brain/llm/deepseek.js";
import { loadSlElites } from "../src/sl/elites.js";
import { climbTarget, highestWon, resolveTargetAscension } from "../src/memory/ascension-target.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { bossNote } from "../src/memory/run-journal.js";
import { baseState, mapPayload, testKnowledge } from "./scenarios.js";

const config = loadConfig({} as NodeJS.ProcessEnv);

afterEach(() => {
  setKnowledgeCharacter(null);
  delete process.env["TARGET_ASCENSION"];
});

function selectState(selected: string | null, clicked: boolean, ascension = 0, max = 5): Record<string, unknown> {
  const actions = ["close_main_menu_submenu", "select_character", ...(clicked ? ["embark", "increase_ascension", "decrease_ascension"] : [])];
  return baseState("CHARACTER_SELECT", {
    session: { mode: "singleplayer", phase: "character_select", control_scope: "local_player" },
    run: null,
    available_actions: actions,
    character_select: {
      selected_character_id: selected,
      can_embark: clicked,
      ascension,
      max_ascension: max,
      characters: [
        { index: 0, character_id: "IRONCLAD", name: "铁甲战士", is_locked: false, is_selected: selected === "IRONCLAD" },
        { index: 1, character_id: "RANDOM_CHARACTER", name: "随机", is_locked: true, is_selected: false },
        { index: 2, character_id: "SILENT", name: "静默猎手", is_locked: false, is_selected: selected === "SILENT" },
        { index: 3, character_id: "DEFECT", name: "故障机器人", is_locked: true, is_selected: false },
      ],
    },
  });
}

function plan(raw: Record<string, unknown>, characterPreference: string | null): PlanOutcome {
  const state = parseGameState(raw);
  const env: DecisionEnv = {
    state,
    knowledge: testKnowledge,
    brief: buildRunBrief(state, testKnowledge),
    thresholds: config.thresholds,
    runStart: "new",
    characterPreference,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "card",
    screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: [],
  };
  return planDecision(env);
}

const intentOf = (outcome: PlanOutcome) => (outcome.kind === "decision" && outcome.decision.kind === "act" ? outcome.decision.intent : outcome);

describe("character select", () => {
  it("selects the configured character first, then the ascension, then embarks", () => {
    setKnowledgeCharacter("silent");
    process.env["TARGET_ASCENSION"] = "2";
    // The Ironclad is selected (the game's default) and could embark: the Silent is selected before anything else.
    expect(intentOf(plan(selectState("IRONCLAD", true, 0), "SILENT"))).toEqual({ action: "select_character", option_index: 2 });
    // The Silent selected: the ascension next, then embark at the target.
    expect(intentOf(plan(selectState("SILENT", true, 0), "SILENT"))).toEqual({ action: "increase_ascension" });
    expect(intentOf(plan(selectState("SILENT", true, 3), "SILENT"))).toEqual({ action: "decrease_ascension" });
    expect(intentOf(plan(selectState("SILENT", true, 2), "SILENT"))).toEqual({ action: "embark" });
    // Selected but not clicked this visit (no embark offered): clicked.
    expect(intentOf(plan(selectState("SILENT", false, 0), "SILENT"))).toEqual({ action: "select_character", option_index: 2 });
  });

  it("CHARACTER unset plays the Ironclad, as before", () => {
    expect(intentOf(plan(selectState("IRONCLAD", false, 0), null))).toEqual({ action: "select_character", option_index: 0 });
    expect(intentOf(plan(selectState("IRONCLAD", true, 0), null))).toEqual({ action: "embark" });
    expect(intentOf(plan(selectState("SILENT", true, 0), null))).toEqual({ action: "select_character", option_index: 0 });
  });

  it("stops on a CHARACTER that matches nothing, or a locked one: no fallback to the first unlocked", () => {
    const none = plan(selectState("IRONCLAD", true), "WATCHER");
    expect(none.kind).toBe("blocked");
    if (none.kind === "blocked") expect(none.reason).toMatch(/WATCHER.*matches no character.*IRONCLAD, RANDOM_CHARACTER \(locked\), SILENT/);
    const locked = plan(selectState("IRONCLAD", true), "DEFECT");
    expect(locked.kind).toBe("blocked");
    if (locked.kind === "blocked") expect(locked.reason).toMatch(/DEFECT is locked/);
  });

  it("stops on a run of another character (RUN_START=continue into another character's save)", () => {
    setKnowledgeCharacter("silent");
    const raw = mapPayload();
    (raw["run"] as Record<string, unknown>)["character_id"] = "IRONCLAD";
    const outcome = plan(raw, "SILENT");
    expect(outcome.kind).toBe("blocked");
    if (outcome.kind === "blocked") expect(outcome.reason).toMatch(/run on screen is Ironclad \(ironclad\) but this process plays Silent/);
    (raw["run"] as Record<string, unknown>)["character_id"] = "SILENT";
    expect(plan(raw, "SILENT").kind).not.toBe("blocked");
  });

  it("config: CHARACTER names the knowledge id; a non-id is a configuration error", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).run.characterId).toBe("ironclad");
    expect(loadConfig({ CHARACTER: "SILENT" } as NodeJS.ProcessEnv).run.characterId).toBe("silent");
    expect(() => loadConfig({ CHARACTER: "the silent one" } as NodeJS.ProcessEnv)).toThrow(/CHARACTER/);
    expect(characterKey("静默猎手")).toBe("silent");
    expect(characterKey("IRONCLAD")).toBe("ironclad");
  });
});

describe("TARGET_ASCENSION=climb", () => {
  const runs = (rows: object[]) => {
    const path = join(mkdtempSync(join(tmpdir(), "climb-")), "runs.jsonl");
    writeFileSync(path, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
    return path;
  };

  it("one above the character's highest win (first try or SL), A0 before any, capped at what the game offers", () => {
    const path = runs([
      { run_id: "A", character: "IRONCLAD", ascension: 9, victory: true },
      { run_id: "B", ascension: 8, victory: true },
      { run_id: "C", character: "SILENT", ascension: 0, victory: false },
    ]);
    expect(highestWon("silent", path)).toBeNull();
    expect(climbTarget("silent", null, path)).toBe(0);
    expect(climbTarget("ironclad", null, path)).toBe(10);
    expect(climbTarget("ironclad", 9, path)).toBe(9);
    const won = runs([
      { run_id: "C", character: "SILENT", ascension: 0, victory: true },
      { run_id: "D", character: "SILENT", ascension: 1, victory: true },
      { run_id: "E", character: "SILENT", ascension: 2, victory: false },
    ]);
    expect(climbTarget("silent", null, won)).toBe(2);
    expect(resolveTargetAscension("climb", "silent", 1, won)).toEqual({ level: 1, mode: "climb" });
    expect(resolveTargetAscension("9", "silent", null, won)).toEqual({ level: 9, mode: "fixed" });
    expect(resolveTargetAscension(undefined, "silent", null, won)).toEqual({ level: null, mode: null });
  });
});

describe("a character with no knowledge yet", () => {
  // A character id with no directory under knowledge/characters/ (the Silent has its own data since 2026-10-04).
  it("reads every file as empty, never the Ironclad's", () => {
    setKnowledgeCharacter("test_fresh");
    expect(knowledgeCharacter()).toBe("test_fresh");
    expect(knowledgeFile(KNOWLEDGE_DIR, "experience.json")).toContain(join("characters", "test_fresh"));
    const data = loadKnowledgeData(KNOWLEDGE_DIR);
    expect(data.experience.entries).toEqual([]);
    expect(data.jevHints.hints).toEqual([]);
    expect(data.guideTemplate).toBe("");
    expect(data.monsterDb.encounters).toEqual({});
    expect(data.monsterDb.bosses).toEqual({});
    expect(Object.keys(data.monsterDb.monsters).length).toBeGreaterThan(0); // the common monster facts
    expect(loadSlElites().elites).toEqual([]);
    expect(bossNote("VANTOM", 0)).toBeNull();
  });

  it("renders a prefix and a system prompt that say Silent and carry no Ironclad guide", () => {
    setKnowledgeCharacter("silent");
    const prefix = renderKnowledgePrefix({ ascension: 0, knowledgeDir: KNOWLEDGE_DIR }, { path: "none", sections: new Map() });
    expect(prefix).toContain("静默猎手攻略");
    expect(prefix).toContain("静默猎手还没有药水换算表");
    expect(prefix).not.toContain("铁甲战士攻略");
    const system = fullSystemPrompt(prefix);
    expect(system).toContain("advising a bot (Silent, climbing ascension levels)");
    expect(system).not.toContain("Ironclad");
  });

  it("card values are neutral: no tier, no skip-bar cut", () => {
    setKnowledgeCharacter("silent");
    expect(hasCardValues()).toBe(false);
    expect(cardValue("NEUTRALIZE", "Basic", "Attack", deckProfile([]), 1, 1).value).toBe(SKIP_BAR);
    expect(cardValue("SOME_COMMON", "Common", "Skill", deckProfile([]), 1, 3).value).toBe(SKIP_BAR);
    expect(cardValue("SOME_CURSE", "Curse", "Curse", deckProfile([]), 1, 3).value).toBe(0);
  });

  it("leaves the Ironclad's text byte for byte", () => {
    expect(knowledgeCharacter()).toBe(DEFAULT_CHARACTER);
    expect(systemRules()).toBe(SYSTEM);
    expect(fullSystemPrompt("P")).toBe(`${SYSTEM}\n\n${FULL_KNOWLEDGE_NOTE}\n\nP`);
    expect(hasCardValues()).toBe(true);
  });
});

describe("monster records", () => {
  it("merge back into the combined shape: key order as before", () => {
    const common = { meta: { m: 1 }, monsters: { A: { name: "a", powers: {}, provenance: {} }, B: { name: "b", powers: {} } }, observed: { o: 1 } };
    const records = { meta: {}, bosses: { X: {} }, encounters: { A: {} }, threat_by_asc: { A: { "0": { fights: 1 } } } };
    const merged = mergeMonsterRecords(common, records);
    expect(JSON.stringify(merged)).toBe(
      JSON.stringify({ meta: { m: 1 }, bosses: { X: {} }, encounters: { A: {} }, monsters: { A: { name: "a", powers: {}, threat_by_asc: { "0": { fights: 1 } }, provenance: {} }, B: { name: "b", powers: {}, threat_by_asc: {} } }, observed: { o: 1 } }),
    );
    expect(mergeMonsterRecords(common, null)).toBe(common);
  });

  it("the committed Ironclad files merge to the monster DB the Ironclad reads", () => {
    const common = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "monster-db.json"), "utf8")) as Record<string, unknown>;
    const data = loadKnowledgeData(KNOWLEDGE_DIR);
    expect(Object.keys(data.monsterDb.encounters).length).toBeGreaterThan(0);
    expect(Object.keys(data.monsterDb.bosses).length).toBeGreaterThan(0);
    expect(Object.keys(data.monsterDb.monsters)).toEqual(Object.keys(common["monsters"] as object));
  });
});

describe("post-mortem headings", () => {
  it("carry the character for every character but the Ironclad", () => {
    const parsed = parsePostmortems("## ABCDEF123456（A0，静默猎手，第17层，死于x）\nbody\n## ZYXWVU987654（A9，第33层）\nbody\n", "x");
    expect(parsed.sections!.get("ABCDEF123456")![0]!.character).toBe("silent");
    expect(parsed.sections!.get("ABCDEF123456")![0]!.asc).toBe(0);
    expect(parsed.sections!.get("ZYXWVU987654")![0]!.character).toBe("ironclad");
  });
});
