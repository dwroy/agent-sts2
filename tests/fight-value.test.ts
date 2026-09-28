/**
 * Fight value stub (src/strategy/fight-value.ts): offline, not called by decision code. Checks the loader
 * reproduces the Python builder's golden examples, the pure function on a tiny hand-made model, and that
 * no decision code imports it yet.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadFightValueModel, supportKeys, valueOf, type FightValueFeatures, type FightValueModel } from "../src/strategy/fight-value.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

interface Example {
  input: FightValueFeatures;
  output: { hpLoss: number; winProb: number; turns: number; n: number; confidence: number };
}

function tinyModel(): FightValueModel {
  const enc = { prior: 10, k: 20, monster: { BIG: [30, 50] as [number, number] }, encounter: { "BIG+SMALL": [25, 40] as [number, number] } };
  return {
    features: ["enemy_hp_sum", "hp", "loss_mon_te_max"],
    gbm: {
      // hp_loss: 5 + 1 x (enemy_hp_sum < 50 ? -4 : (loss_mon_te_max < 20 ? 2 : 12))
      hp_loss: { loss: "l2", base: 5, lr: 1, trees: [[0, 50, -4, [2, 20, 2, 12]]] },
      win: { loss: "logloss", base: 0, lr: 1, trees: [[1, 20, -2, 2]] },
      turns: { loss: "l2", base: 3, lr: 0.5, trees: [[0, 50, -2, 2]] },
    },
    encoders: { loss: enc, win: { ...enc, prior: 0.9 } },
    support: { k: 15, hp_loss: { "k|elite|2|4|3": [12, 30], "e|BIG+SMALL|4|3": [20, 15] } },
  };
}

function input(features: Record<string, number>, enemyIds: string[] = ["BIG"]): FightValueFeatures {
  return { features: { enemy_hp_frac: 0.9, hp_frac: 0.9, n_living: enemyIds.length, ...features }, enemyIds, encounter: "BIG+SMALL", kind: "elite", act: 2 };
}

describe("fight value (offline stub)", () => {
  it("walks the trees and the encoders", () => {
    const model = tinyModel();
    const strong = valueOf(input({ enemy_hp_sum: 120, hp: 60 }), model)!;
    expect(strong.hpLoss).toBeCloseTo(17); // big enemy: its encoded loss 30 >= 20
    expect(strong.winProb).toBeCloseTo(1 / (1 + Math.exp(-2)));
    expect(strong.turns).toBeCloseTo(4);
    const small = valueOf(input({ enemy_hp_sum: 120, hp: 10 }, ["SMALL"]), model)!;
    expect(small.hpLoss).toBeCloseTo(7); // unknown monster -> prior 10 < 20
    expect(small.winProb).toBeCloseTo(1 / (1 + Math.exp(2)));
    const low = valueOf(input({ enemy_hp_sum: 20, hp: 60 }), model)!;
    expect(low.hpLoss).toBeCloseTo(1);
  });

  it("reports the most specific support cell and a confidence", () => {
    const model = tinyModel();
    expect(supportKeys(input({}))).toEqual(["k|elite|2|4|3", "e|BIG+SMALL|4|3"]);
    const v = valueOf(input({ enemy_hp_sum: 120, hp: 60 }), model)!;
    expect(v.n).toBe(15);
    expect(v.confidence).toBeCloseTo(0.5);
    const other = valueOf({ ...input({ enemy_hp_sum: 120, hp: 60 }), encounter: "NEW" }, model)!;
    expect(other.n).toBe(30);
  });

  it("a board with no living enemy is a won fight", () => {
    const v = valueOf(input({ enemy_hp_sum: 0, hp: 50, n_living: 0 }, []), tinyModel())!;
    expect(v).toMatchObject({ hpLoss: 0, winProb: 1, turns: 0 });
  });

  it("reproduces the builder's golden examples from the committed model", () => {
    const model = loadFightValueModel();
    expect(model).not.toBeNull();
    const examples = (JSON.parse(readFileSync(join(ROOT, "src/knowledge/fight-value.json"), "utf8")) as { examples: Example[] }).examples;
    expect(examples.length).toBeGreaterThan(0);
    for (const example of examples) {
      const v = valueOf(example.input, model)!;
      expect(v.hpLoss).toBeCloseTo(example.output.hpLoss, 4);
      expect(v.winProb).toBeCloseTo(example.output.winProb, 4);
      expect(v.turns).toBeCloseTo(example.output.turns, 4);
      expect(v.n).toBe(example.output.n);
      expect(v.winProb).toBeGreaterThanOrEqual(0);
      expect(v.winProb).toBeLessThanOrEqual(1);
    }
  });

  it("is read only by the rollout (rollout.ts, and rollout-live.ts for Jev's combat facts)", () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        // rollout.ts and rollout-live.ts (facts for Jev, never the ranking: tests/rollout.test.ts) are the allowed readers.
        else if (path.endsWith(".ts") && !path.endsWith("fight-value.ts") && !path.endsWith("rollout.ts") && !path.endsWith("rollout-live.ts") && readFileSync(path, "utf8").includes("fight-value")) offenders.push(path);
      }
    };
    walk(join(ROOT, "src"));
    expect(offenders).toEqual([]);
  });
});
