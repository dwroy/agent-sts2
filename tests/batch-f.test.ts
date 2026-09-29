/**
 * Fix batch F (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states), never the refreshing knowledge files.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { bossNote as journalBossNote } from "../src/project/run-journal.js";
import { bossMechanic, bossProfile, giantKillRecord } from "../src/strategy/boss-clock.js";
import type { LineEstimate } from "../src/strategy/rollout.js";
import { pickRolloutBest, rolloutTies } from "../src/strategy/rollout-live.js";
import type { Plan } from "../src/strategy/turn-solver.js";

describe("1. A saturated board ranks deaths first, then this turn's loss, before enemy HP left (CJ88575SQS6H F17 T2)", () => {
  // Every line "expected further HP loss 50" = our HP, no sample won: saturated.
  const line = (name: string, turnLoss: number, over: Partial<LineEstimate>): LineEstimate =>
    ({
      plan: { steps: [], name, outcome: { hpLoss: turnLoss } } as unknown as Plan,
      value: -50 - 40,
      hpLoss: 50,
      wins: 0,
      deaths: 0,
      samples: 8,
      enemyHpLeft: 100,
      turnsSurvived: 5,
      leaderHpLeft: null,
      ...over,
    }) as LineEstimate;

  it("the logged question: plan1 (-2, dead 1/8) over plan2 (-14, dead 5/8, less enemy HP left)", () => {
    const plan1 = line("plan1", 2, { deaths: 1, enemyHpLeft: 97, turnsSurvived: 4.9 });
    const plan2 = line("plan2", 14, { deaths: 5, enemyHpLeft: 80, turnsSurvived: 4.6 });
    const picked = pickRolloutBest([plan1, plan2], 50);
    expect(picked).toMatchObject({ best: plan1, saturated: true });
    expect(rolloutTies(picked, [plan1, plan2], [plan1.plan, plan2.plan])).toEqual({ best: plan1, tied: [] });
    // Asked again (4/8 dead, plan1 now -0): the same.
    const again1 = line("plan1", 0, { deaths: 1, enemyHpLeft: 97 });
    const again2 = line("plan2", 14, { deaths: 4, enemyHpLeft: 80 });
    expect(pickRolloutBest([again2, again1], 50).best).toBe(again1);
  });

  it("the same deaths: the least HP lost this turn, then enemy HP left", () => {
    const blocks = line("blocks", 3, { deaths: 2, enemyHpLeft: 120 });
    const hits = line("hits", 9, { deaths: 2, enemyHpLeft: 90 });
    expect(pickRolloutBest([hits, blocks], 50).best).toBe(blocks);
    const a = line("a", 5, { deaths: 2, enemyHpLeft: 120 });
    const b = line("b", 5, { deaths: 2, enemyHpLeft: 90 });
    expect(pickRolloutBest([a, b], 50).best).toBe(b);
  });

  it("lines equal on every key are tied, none is the best", () => {
    const a = line("a", 4, { deaths: 3, enemyHpLeft: 90 });
    const b = line("b", 4, { deaths: 3, enemyHpLeft: 90.4 });
    const worse = line("worse", 4, { deaths: 5, enemyHpLeft: 10 });
    const picked = pickRolloutBest([a, b, worse], 50);
    expect(picked).toEqual({ best: null, saturated: true, tied: [a, b] });
    expect(rolloutTies(picked, [a, b, worse], [a.plan, b.plan, worse.plan])).toEqual({ best: null, tied: [a, b] });
    // One of the tied lines shown: it is the best among what is shown.
    expect(rolloutTies(picked, [a, b, worse], [a.plan, worse.plan])).toEqual({ best: a, tied: [] });
  });
});

describe("2. Tests that plan logged boards have a timeout that holds under load (potion-mc, rollout-live)", () => {
  // Each such test runs code's full planner (and the rollout) over one or every board of tests/logged-states;
  // at vitest's default 5 s they timed out under load (potion-mc "the same twice" once; it takes 1.6 s alone).
  const TESTS = dirname(fileURLToPath(import.meta.url));
  const blocks = (file: string): { title: string; body: string; timeout: number | null }[] => {
    const lines = readFileSync(join(TESTS, file), "utf8").split("\n");
    const found: { title: string; body: string; timeout: number | null }[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const head = /^(\s*)it\("([^"]*)"/.exec(lines[i]!);
      if (!head) continue;
      const end = new RegExp(`^${head[1]}\\}(?:, ([\\d_]+))?\\);\\s*$`);
      let j = i + 1;
      while (j < lines.length && !end.test(lines[j]!)) j += 1;
      const timeout = end.exec(lines[j] ?? "")?.[1];
      found.push({ title: head[2]!, body: lines.slice(i, j + 1).join("\n"), timeout: timeout ? Number(timeout.replace(/_/g, "")) : null });
      i = j;
    }
    return found;
  };

  for (const file of ["potion-mc.test.ts", "rollout-live.test.ts"]) {
    it(`${file}: every test on logged boards has at least 30 s, a scan of every board at least 120 s`, () => {
      const onBoards = blocks(file).filter((block) => /\blogged\(|\bplan\(|BOARDS/.test(block.body));
      expect(onBoards.length).toBeGreaterThan(2);
      for (const block of onBoards) {
        expect(block.timeout, block.title).not.toBeNull();
        expect(block.timeout!, block.title).toBeGreaterThanOrEqual(/BOARDS/.test(block.body) ? 120_000 : 30_000);
      }
    });
  }
});

describe("3. Hand-written knowledge per ascension, as the data has it (experience update 2026-09-29.4)", () => {
  const KNOWLEDGE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "knowledge");
  const read = (name: string): string => readFileSync(join(KNOWLEDGE, name), "utf8");

  it("the Giant's early kill: A8's record at A8, A9's at A9 (killed by T10 1/3, both losses short of HP at the kill)", () => {
    expect(giantKillRecord(9, "zh")).toContain("T10 前击杀只赢 1/3");
    expect(giantKillRecord(9, "zh")).toContain("击杀时只剩 14、20 血对 41、44 层");
    expect(giantKillRecord(8, "zh")).toContain("A8 27 场：T10 前击杀 13/15 赢");
    const a9 = journalBossNote("WATERFALL_GIANT_BOSS", 9)!;
    expect(a9).toContain("T10 前击杀只赢 1/3");
    expect(a9).not.toContain("13/15");
    expect(a9).toContain("所需格挡（层数 − HP）≤13 的 18 场赢 17，≥20 的 15 场赢 3");
    expect(journalBossNote("WATERFALL_GIANT_BOSS", 8)).toContain("13/15");
    const giant = bossProfile("WATERFALL_GIANT_BOSS")!;
    expect(bossMechanic(giant, 9)).toContain("killed by T10 1/3 won");
    expect(bossMechanic(giant, 9)).not.toContain("13/15");
    expect(bossMechanic(giant, 8)).toContain("killed by T10 13/15 won");
  });

  it("the guides: every A8 early-kill figure comes with A9's; Prism A9 losses; Entomancer deaths; the Kin as kin-priest-focus", () => {
    const handbook = read("ds-handbook.md");
    const guide = read("ironclad-guide.md");
    for (const [name, text] of [["ds-handbook", handbook], ["ironclad-guide", guide]] as const) {
      const lines = text.split("\n").filter((line) => line.includes("13/15"));
      expect(lines.length, name).toBeGreaterThan(0);
      for (const line of lines) expect(line, name).toContain("T10 前击杀只赢 1/3");
    }
    expect(handbook).not.toContain("多次掉 22~40 血");
    expect(handbook).toMatch(/感染棱柱.*A9 4 场赢 3，赢的 3 场掉 42、52、56/);
    expect(handbook).not.toContain("蜂群术士已经 3 次致死");
    expect(handbook).toContain("蜂群术士 A7–A9 已 9 次致死");
    expect(guide).not.toContain("长战先杀信徒（先杀左边）");
    expect(guide).not.toContain("先杀信徒能减少受到的伤害");
    expect(guide).toMatch(/Kin Priest.*单体伤害压神官/);
  });
});
