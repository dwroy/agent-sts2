import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseGameState } from "../src/hand/mod/schema.js";
import { jevExperience, POTION_BOSS_DATA } from "../src/reflex/jev-experience.js";
import type { ExperienceEntry } from "../src/knowledge/experience.js";

const evidence = JSON.parse(readFileSync(new URL("./silent-potion-provenance-evidence.json", import.meta.url), "utf8"));
const state = parseGameState(evidence.state);
const input = { state, kind: "hallway" as const, runPlan: null, entries: [] as ExperienceEntry[], monsters: {} };
const localLesson: ExperienceEntry = {
  id: "silent-provenance-fixture", scope: "general:potion", name: "固定来源夹具",
  lesson: "本角色固定证据，仅核对来源过滤。", asc: [10, 10], evidence: ["MGA0CZDDKC0P"],
  n_support: 1, n_contradict: 0, confidence: "low", last_seen: "2026-10-06", status: "active",
};

describe("Silent potion prompt provenance, MGA0CZDDKC0P F2 T1", () => {
  it("removes legacy other-character statistics from the observed Silent hallway prompt", () => {
    expect(state.run?.raw["character_id"]).toBe("SILENT");
    const result = jevExperience(input);
    expect(result.potion).not.toHaveProperty("data");
    for (const row of POTION_BOSS_DATA) expect(JSON.stringify(result)).not.toContain(row.text);
  });

  it("retains the character-local lessons and the rest of the context", () => {
    const result = jevExperience({ ...input, entries: [localLesson] });
    expect(result.ids.potion).toEqual([localLesson.id]);
    expect(result.potion?.["lessons"]).toEqual([expect.stringContaining(localLesson.lesson)]);
    expect(result.potion?.["note"]).toBe(evidence.original_potion_experience.note);
    expect(result.mechanics).toBeNull();
  });

  it("keeps legacy Ironclad and unknown-character context byte equivalent", () => {
    const data = POTION_BOSS_DATA.map((row) => `[data: ${row.source}] ${row.text}`);
    for (const character of ["IRONCLAD", "", "OTHER_CHARACTER"]) {
      const control = parseGameState({ ...evidence.state, run: { ...evidence.state.run, character_id: character } });
      expect(jevExperience({ ...input, state: control }).potion).toEqual({
        note: evidence.original_potion_experience.note, data,
      });
    }
  });

  it("keeps the existing empty boss-context behavior", () => {
    expect(jevExperience({ ...input, kind: "boss" }).potion).toBeNull();
  });
});
