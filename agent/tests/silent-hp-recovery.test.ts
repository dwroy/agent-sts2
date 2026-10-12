/** Frozen Silent A10 observations; silent-0019/0020/0243. No live knowledge or model calls. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-hp-recovery-evidence.json";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { RunJournal } from "../src/memory/run-journal.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed recovery evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), knowledgeSlice: () => "",
}));

const knowledge = makeKnowledge({}, "cache");
const raw = (line: number): Record<string, any> => structuredClone(evidence.flatMap((x) => x.frames)
  .find((x) => x.source_line === line)!.state);
const frame = (line: number) => parseGameState(raw(line));
function observe(lines: number[]) {
  const journal = new RunJournal();
  for (const line of lines) journal.observe(frame(line), { knowledge });
  return journal;
}
const recoveries = (journal: RunJournal) => journal.events.filter((x) => x.text.startsWith("HP增加观测"));
const text = (journal: RunJournal, line: number, label = "rest/plan") => {
  const memory = journal.render(frame(line), knowledge, {}, { label, factsCovered: true });
  expect(memory.now).toBe("");
  return memory.history + "\n" + memory.this_floor;
};

it("the existing brain history carries reached rest and boundary HP, apart from opening recovery and won-fight costs", () => {
  const rows = evidence[0]!.frames;
  const journal = observe(rows.filter((x) => x.source_line <= 288793).map((x) => x.source_line));
  const output = text(journal, 288793, "map/route-plan");
  expect(output).toContain("HP增加观测 44/70→65/70（+21；休息点内");
  // The raw act id already changed on F17 MAP: retain the actual boundary, without inferring a formula.
  expect(output).toContain("19/70→59/70（+40；跨层边界，来源未隔离；F17/MAP→F18/EVENT");
  expect(output).toContain("59/70→61/70（+2；战斗开场");
  expect(output).toContain("46/70→48/70（+2；战斗开场");
  expect(output).toContain("8/70→10/70（+2；战斗开场");
  expect(journal.fights.find((x) => x.floor === 19)).toMatchObject({ hpBefore: 59, hpAfter: 46 });
  expect(journal.fights.find((x) => x.floor === 20)).toMatchObject({ hpBefore: 46, hpAfter: 8 });
  expect(output).not.toContain("F24");
});

it("the second run keeps its capped rest gain and the observed 28 to 61 transition distinct", () => {
  const journal = observe(evidence[1]!.frames.map((x) => x.source_line));
  const output = text(journal, 288367);
  expect(recoveries(journal)).toHaveLength(4);
  expect(output).toContain("42/70→63/70（+21；休息点内");
  expect(output).toContain("40/70→61/70（+21；休息点内");
  expect(output).toContain("28/70→61/70（+33；跨层边界");
  expect(output).toContain("51/70→70/70（+19；休息点内");
});

it("KFR rest and cross-floor gains are not the later same-floor rewind recovery", () => {
  const journal = observe(evidence[2]!.frames.map((x) => x.source_line));
  const output = text(journal, 289353);
  expect(recoveries(journal).filter((x) => x.text.includes("休息点内"))).toHaveLength(6);
  expect(output).toContain("22/70→60/70（+38；跨层边界");
  expect(output).toContain("15/70→36/70（+21；休息点内");
  expect(output).toContain("36/70→38/70（+2；战斗开场");
  expect(output).toContain("9/70→38/70（+29；回合回退时恢复，不计路线回血");
});

it("the journal's actual SL snapshot restore removes failed-attempt recovery instead of counting it again", () => {
  const journal = observe([288791]);
  const saved = journal.snapshot();
  journal.observe(frame(288792));
  journal.observe(frame(288822));
  journal.restore(saved);
  journal.observe(frame(288823));
  const recovery = recoveries(journal);
  expect(recovery).toHaveLength(1);
  expect(recovery[0]!.text).toContain("8/70→10/70（+2；战斗开场");
  expect(recovery[0]!.text).not.toContain("+9");
});

it("duplicates and stale floors add nothing; missing or inconsistent HP breaks the observation pair", () => {
  const journal = observe([288584, 288585, 288726, 288727]);
  const before = recoveries(journal).map((x) => x.text);
  journal.observe(frame(288727));
  journal.observe(frame(288584));
  journal.observe(frame(288727));
  expect(recoveries(journal).map((x) => x.text)).toEqual(before);
  for (const change of [
    (x: Record<string, any>) => { delete x.run.current_hp; },
    (x: Record<string, any>) => { x.combat.player.current_hp = 1; },
  ]) {
    const other = observe([288730]);
    const missing = raw(288731); change(missing);
    other.observe(parseGameState(missing));
    other.observe(frame(288732));
    expect(recoveries(other)).toEqual([]);
  }
});

it("another character, an unobserved ascension and a new run cannot inherit these recovery facts", () => {
  for (const change of [{ character_id: "IRONCLAD" }, { ascension: 9 }]) {
    const journal = new RunJournal();
    for (const line of [288584, 288585, 288726, 288727]) {
      const next = raw(line); Object.assign(next.run, change);
      journal.observe(parseGameState(next));
    }
    expect(recoveries(journal)).toEqual([]);
  }
  const journal = observe([288584, 288585]);
  journal.observe(frame(288094));
  expect(recoveries(journal)).toEqual([]);
  journal.observe(frame(288095));
  expect(recoveries(journal)).toHaveLength(1);
  expect(recoveries(journal)[0]!.text).toContain("42/70→63/70");
});
