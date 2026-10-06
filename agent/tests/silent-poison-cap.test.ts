/** D4LJ9QMGFB8Q A10 F20 T4/T5 and 4Y94N8RDPGPM A7 F30 T2; silent-0174/0175. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-poison-cap-evidence.json";
import { enemySims } from "../src/reflex/combat-plan.js";
import { replaySteps, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";

// Optional knowledge lookups cannot consult refreshing character files.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed poison cap references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

function inputAt(key: keyof typeof evidence): SolverInput {
  const frame = evidence[key];
  return {
    hand: [],
    player: { hp: frame.player.current_hp, maxHp: frame.player.max_hp, block: frame.player.block,
      energy: frame.player.energy, weak: false, vulnerable: false, intangible: false },
    // Omit asc: use only the frozen live intents, without any monster database lookup.
    enemies: enemySims(frame), fightKind: "hallway", turn: frame.turn,
  };
}

it("A10 F20 T4: poison leaves two HP and the surviving enemy still attacks for eleven", () => {
  const input = inputAt("a10-turn4");
  expect(input.enemies[0]).toMatchObject({ hp: 11, poison: 12, perHitCap: 9 });
  const result = replaySteps(input, [])!.outcome;
  expect(result).toMatchObject({ damageDealt: 14, winsFight: false, hpLoss: 11, hpAfter: 13, kills: ["外骨骼虫 #2"] });
  expect(result.enemyHpAfter[0]).toMatchObject({ hp: 2, poison: 11 });
  expect(solveTurn(input).plans.every((plan) => !plan.outcome.winsFight)).toBe(true);
});

it("A7 F30 T2: fourteen poison leaves three HP and preserves the six damage attack", () => {
  const input = inputAt("a7-turn2");
  expect(input.enemies[2]).toMatchObject({ hp: 12, poison: 14, perHitCap: 9 });
  const result = replaySteps(input, [])!.outcome;
  expect(result).toMatchObject({ damageDealt: 9, winsFight: false, hpLoss: 6, hpAfter: 76, kills: [] });
  expect(result.enemyHpAfter[2]).toMatchObject({ hp: 3, poison: 13 });
});

it("A10 F20 T5: remaining two HP still permits the observed poison kill", () => {
  expect(replaySteps(inputAt("a10-turn5"), [])!.outcome)
    .toMatchObject({ damageDealt: 2, winsFight: true, hpLoss: 0, hpAfter: 13, kills: ["外骨骼虫"] });
});

it("preserves uncapped poison, poison below nine and poison-free outcomes", () => {
  const input = inputAt("a10-turn4");
  for (const enemy of input.enemies) enemy.perHitCap = null;
  expect(replaySteps(input, [])!.outcome).toMatchObject({ damageDealt: 16, winsFight: true, hpLoss: 0 });
  input.enemies[0]!.perHitCap = 9;
  input.enemies[0]!.poison = 5;
  expect(replaySteps(input, [])!.outcome).toMatchObject({ damageDealt: 10, winsFight: false, hpLoss: 11 });
  for (const enemy of input.enemies) enemy.poison = 0;
  expect(replaySteps(input, [])!.outcome).toMatchObject({ damageDealt: 0, winsFight: false, hpLoss: 11, kills: [] });
});
