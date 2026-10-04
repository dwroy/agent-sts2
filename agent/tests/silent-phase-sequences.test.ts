/** R0HEV5E3QT6G F34/F36 and KAY522KT5NXR F34/F48; ledger silent-0041. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { bossDossier, bossHpAt, phaseCountsWithoutRetries, setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { renderMonster } from "../src/knowledge/render/monster-text.js";
import { testSubjectPhases } from "../src/sim/boss-clock.js";

vi.mock("../src/knowledge/render/data.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/render/data.js")>(),
  loadKnowledgeData: () => ({
    dir: "fixed", monsterDb: { bosses: {}, encounters: {}, monsters: { TEST_SUBJECT: {
      name: { zh: "实验体" }, kind: "boss", encounters: {},
      hp_by_asc: { "0": { min: 100, median: 100, max: 100, n: 1 } },
      phases_by_asc: { "0": { "100 > 200 > 100 > 200 > 300": 1 } },
    } } },
  }),
}));

const joined = "100 > 200 > 100 > 200 > 100 > 200 > 100 > 200 > 100 > 200 > 100 > 200 > 300 (TEST_SUBJECT)";
beforeEach(() => setMonsterDbForTests({
  monsters: { TEST_SUBJECT: { name: { zh: "实验体" } } }, encounters: {},
  bosses: { TEST_SUBJECT: { "0": { fights: 1, parts: { TEST_SUBJECT: { median: 100, n: 1 } }, phases: { [joined]: 1 } } } },
}));
afterEach(() => setMonsterDbForTests(null));

it("six SL attempts provide the real three phase HP values and a total of 600", () => {
  expect(bossHpAt("TEST_SUBJECT", 0)).toMatchObject({ asc: 0, exact: true, n: 1, phases: [100, 200, 300] });
  const phases = testSubjectPhases(0);
  expect(phases).toEqual([100, 200, 300]);
  expect(phases.reduce((sum, hp) => sum + hp, 0)).toBe(600);
});

it("the model's boss dossier reports the same phases and retains the original fight count", () => {
  const text = bossDossier("TEST_SUBJECT", 0)!;
  expect(text).toContain("100 > 200 > 300 (TEST_SUBJECT) (n=1)");
  expect(text).not.toContain("200 > 100");
});

it("combines identical corrected records without changing valid sequences or other monsters", () => {
  const raw = { [joined]: 1, "100 > 200 > 300 (TEST_SUBJECT)": 2 };
  expect(phaseCountsWithoutRetries("TEST_SUBJECT", raw)).toEqual({ "100 > 200 > 300 (TEST_SUBJECT)": 3 });
  expect(raw[joined]).toBe(1);
  expect(phaseCountsWithoutRetries("TEST_SUBJECT", { "111 > 212 > 313": 1 })).toEqual({ "111 > 212 > 313": 1 });
  expect(phaseCountsWithoutRetries("OTHER", raw)).toBe(raw);
});

it("the knowledge prefix presents a single observed phase sequence with its sample size", () => {
  const text = renderMonster("TEST_SUBJECT", { ascension: 0, knowledgeDir: "fixed" });
  expect(text).toContain("阶段血量 A0: 100 > 200 > 300 (n=1)");
  expect(text).not.toContain("200 > 100");
});
