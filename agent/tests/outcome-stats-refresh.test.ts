import { mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { afterAll, afterEach, expect, it, vi } from "vitest";

vi.hoisted(() => vi.resetModules());
// All transitive knowledge loaders see an isolated directory, never the refreshed live data.
vi.mock("../src/knowledge/files.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/knowledge/files.js")>();
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  return { ...actual, KNOWLEDGE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "sts2-outcome-refresh-")) };
});

import { loadOutcomeStats, setExperienceForTests, type OutcomeStats } from "../src/knowledge/experience.js";
import { KNOWLEDGE_DIR, knowledgeCharacter, knowledgeFile, setKnowledgeCharacter } from "../src/knowledge/files.js";
import { cardOutcome } from "../src/knowledge/outcome-facts.js";

const originalCharacter = knowledgeCharacter();
afterEach(() => {
  setExperienceForTests(null);
  setKnowledgeCharacter(originalCharacter);
  rmSync(join(KNOWLEDGE_DIR, "characters"), { recursive: true, force: true });
});
afterAll(() => rmSync(KNOWLEDGE_DIR, { recursive: true, force: true }));

function writeStats(stats: OutcomeStats, mtime = 100) {
  const path = knowledgeFile(KNOWLEDGE_DIR, "outcome-stats.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(stats));
  utimesSync(path, mtime, mtime);
  return path;
}

it("reloads outcome facts after a same-size refresh while retaining unchanged cache hits", () => {
  setKnowledgeCharacter("silent");
  const table = (n: number): OutcomeStats => ({ ascension: 0, cards: { FIXED_CARD: { by_act: { "1": { picked: { n, mean_floor: 17 } } } } } });
  writeStats(table(1));
  const first = loadOutcomeStats();
  expect(loadOutcomeStats()).toBe(first);
  expect(cardOutcome("FIXED_CARD", 0)).toContain("n=1");
  // The old process-long cache ignored the writer's updated timestamp and kept the first table.
  writeStats(table(2), 200);
  expect(cardOutcome("FIXED_CARD", 0)).toContain("n=2");
  const refreshed = loadOutcomeStats();
  expect(refreshed).not.toBe(first);
  expect(loadOutcomeStats()).toBe(refreshed);
  // File size also invalidates the cache even if the filesystem timestamp stays the same.
  writeStats(table(22), 200);
  expect(cardOutcome("FIXED_CARD", 0)).toContain("n=22");
});

it("recovers from missing or invalid files and never reuses another character's table", () => {
  setKnowledgeCharacter("silent");
  expect(loadOutcomeStats()).toEqual({});
  const path = writeStats({ ascension: 0, baseline: { runs: 1 } });
  expect(loadOutcomeStats().baseline?.runs).toBe(1);
  writeFileSync(path, "invalid");
  expect(loadOutcomeStats()).toEqual({});
  writeStats({ ascension: 0, baseline: { runs: 2 } }, 200);
  expect(loadOutcomeStats().baseline?.runs).toBe(2);
  setKnowledgeCharacter("fixture_character");
  expect(loadOutcomeStats()).toEqual({});
  writeStats({ ascension: 0, baseline: { runs: 3 } });
  expect(loadOutcomeStats().baseline?.runs).toBe(3);
  setKnowledgeCharacter("silent");
  expect(loadOutcomeStats().baseline?.runs).toBe(2);
});

it("keeps explicit test tables pinned until the test setter resets them", () => {
  setKnowledgeCharacter("silent");
  const fixture = { ascension: 0, baseline: { runs: 7 } };
  setExperienceForTests([], fixture);
  writeStats({ ascension: 0, baseline: { runs: 9 } });
  expect(loadOutcomeStats()).toBe(fixture);
  setExperienceForTests(null);
  expect(loadOutcomeStats().baseline?.runs).toBe(9);
});
