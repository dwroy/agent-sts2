/**
 * Fix batch F (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states), never the refreshing knowledge files.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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
