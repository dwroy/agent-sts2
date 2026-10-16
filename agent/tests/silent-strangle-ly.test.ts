/** LY83ZMTFVKJH A10 F21 T7/T10, silent-0260/0261: later observed ordinary and upgraded follow-ups. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-strangle-ly-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims } from "../src/reflex/combat-plan.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed LY Strangle evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "STRANGLE", type: "Attack" },
  { id: "DEFLECT", type: "Skill" }, { id: "DAGGER_SPRAY", type: "Attack" }] }, "cache");
function inputAt(line: number, character = "silent", ascension = 10): SolverInput {
  const raw = evidence.frames.find((entry) => entry.line === line)!.row.state;
  const player = raw.combat.player;
  return { hand: raw.combat.hand.map((card, i) => modelHandCard(card, i, knowledge, character, ascension)),
    player: { hp: player.current_hp, maxHp: player.max_hp, block: player.block, energy: player.energy,
      weak: false, vulnerable: false, intangible: false, strengthNow: 0 },
    enemies: enemySims(raw.combat, ascension, character), fightKind: "elite", turn: raw.turn };
}
function play(input: SolverInput, ids: string[]) {
  const steps = ids.map((id) => {
    const card = input.hand.find((card) => card.cardId === id)!;
    return { cardIndex: card.index, cardId: card.cardId, name: card.name, upgraded: card.upgraded,
      ...(card.target === "single" ? { target: 0 } : {}) };
  });
  return replaySteps(input, steps)!.outcome;
}
it("T7's ordinary Strangle and Deflect already match the real 77 to 67 HP", () => {
  expect(play(inputAt(308030), ["STRANGLE", "DEFLECT"])).toMatchObject({ damageDealt: 10, unknownCards: [] });
});
it("T10's upgraded two-hit Dagger Spray triggers one two-HP loss, then Deflect triggers another", () => {
  const input = inputAt(308041);
  expect(input.hand.find((card) => card.cardId === "DAGGER_SPRAY")).toMatchObject({ upgraded: true, hits: 2 });
  expect(play(input, ["STRANGLE", "DAGGER_SPRAY", "DEFLECT"])).toMatchObject({ damageDealt: 24, unknownCards: [] });
});
it("the real two-stack intermediate frame also completes at the observed 16 HP", () => {
  const result = play(inputAt(308042), ["DAGGER_SPRAY", "DEFLECT"]);
  expect(result.damageDealt).toBe(16);
  expect(result.enemyHpAfter[0]!.hp).toBe(16);
});
it("synthetic replay and other upgraded cards remain unknown", () => {
  for (const change of [{ replay: 1 }, { cardId: "UNOBSERVED_UPGRADE" }]) {
    const input = inputAt(308042);
    Object.assign(input.hand.find((card) => card.cardId === "DAGGER_SPRAY")!, change);
    const result = play(input, [change.cardId ?? "DAGGER_SPRAY"]);
    expect(result.unknownCards.some((text) => text.includes("紧勒"))).toBe(true);
  }
});
it("other characters and unobserved ascensions keep the original twenty damage", () => {
  for (const [character, ascension] of [["ironclad", 10], ["silent", 11]] as const) {
    expect(play(inputAt(308041, character, ascension), ["STRANGLE", "DAGGER_SPRAY", "DEFLECT"]).damageDealt).toBe(20);
  }
});
it("A0 ordinary establishment does not borrow the A10 upgraded follow-up evidence", () => {
  const result = play(inputAt(308041, "silent", 0), ["STRANGLE", "DAGGER_SPRAY", "DEFLECT"]);
  expect(result.damageDealt).toBe(20);
  expect(result.unknownCards.some((text) => text.includes("紧勒"))).toBe(true);
});
