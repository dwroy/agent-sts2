/**
 * Knowledge check 2026-09-30 (the A8 window's runs 1-11: RRMY 5LRZ 5PHF UNRL YVYZ Q8XR 3RME NH8A 2WRU 79YR 86C3; Dai's
 * rule: the guide, the handbook, Jev's hints, the card tiers, the boss notes and the experience base are one
 * knowledge base; where our data says otherwise, the data's version with its n; counts filled from the data).
 * See paper/materials/experience-changelog.md「第九次增量」.
 *
 * Experience 2026-09-30.1: counts the data holds are placeholders (filled at render, lessonText), and the claims the A8
 * data contradicts (Phrog "45–50%", Effigy "40–70%", deck-strength-aoe's "AOE 81% vs 47%", "一幕最多主动打 1 只精英")
 * are the data's version.
 */

import { describe, expect, it } from "vitest";

import { lessonText, loadExperience } from "../src/knowledge/experience.js";

describe("the experience base: data counts as placeholders, filled when shown", () => {
  it("every active lesson renders with no placeholder left, and the counts the data holds are placeholders", () => {
    const entries = loadExperience().filter((entry) => entry.status === "active");
    expect(entries.length).toBeLessThanOrEqual(200);
    for (const entry of entries) expect(lessonText(entry), entry.id).not.toMatch(/\{(?:[A-Z][A-Z0-9_]*(?::[A-Z0-9_]+)*|@\d+:[A-Z0-9_:]+)\}/);
    const byId = (id: string) => entries.find((entry) => entry.id === id)!.lesson;
    expect(byId("giant-explode")).toContain("{GIANT_KILLS_A8}；{GIANT_KILLS_A9}");
    expect(byId("giant-explode")).toContain("{GIANT_BLOCK_RECORD}");
    expect(byId("giant-explode")).not.toMatch(/A8 27 场|13\/15/);
    expect(byId("crab-kill-order")).toContain("{CRAB_KILL_ORDER}");
    expect(byId("queen-plan")).toContain("{QUEEN_AMALGAM}");
    expect(byId("queen-plan")).not.toContain("A8 5 场全输");
    expect(byId("insatiable-escape")).toContain("{SANDPIT_DEATHS}");
    expect(byId("lag-sleep")).toContain("{LAG_SLEEP}");
    expect(byId("a9-damage")).toContain("{BOSS_LOSS:KAISER_CRAB:9}");
    expect(byId("phrog")).not.toContain("A8 实测掉约 45–50%");
    expect(byId("effigy-cost")).not.toContain("A8 实测掉 40–70% 最大生命");
    expect(byId("deck-strength-aoe")).toContain("A8 一幕 boss 152 场");
    expect(byId("elite-no-double")).not.toMatch(/^一幕最多主动打 1 只精英/);
  });
});
