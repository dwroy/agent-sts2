/** C48LLXBGKXQ9 A0 F6 T3 / FU8ZUQHBHNV9 A10 F8 T3-T4; silent-0324. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-plain-blade-dance-a0-evidence.json" with { type: "json" };
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps, traceSteps, type SolverInput, type Step } from "../src/reflex/turn-solver.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed plain Blade Dance evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: evidence.cards.map((entry) => ({
  id: entry.card_id, type: entry.card_type, name: entry.name, cost: entry.energy_cost,
  description: entry.resolved_rules_text, description_raw: entry.rules_text,
  vars: entry.dynamic_values, keywords: ["Exhaust"],
})) }, "cache");
const frame = (line: number) => evidence.frames.find((entry) => entry.ref.line === line)!;
const step = (cardIndex: number, cardId: string, target: number | null = null): Step => ({
  cardIndex, cardId, name: cardId, upgraded: false, target, targetName: null,
});

// Only immediate generation is compared; this target supplies no encounter forecast.
function inputAt(line: number): SolverInput {
  const raw = frame(line);
  return {
    hand: raw.hand.map((entry) => modelHandCard(entry, entry.index, knowledge, "silent", raw.run.ascension)),
    player: { hp: raw.player.current_hp, maxHp: raw.player.max_hp, block: 0,
      energy: raw.player.energy, weak: false, vulnerable: false, intangible: false },
    enemies: [{ index: 0, name: "Fixed target", hp: 100, maxHp: 100, block: 0,
      vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] }],
    fightKind: "monster", turn: raw.turn,
  };
}

it("reproduces the A0 cast's observed old hand, three new cards and one energy payment", () => {
  const input = inputAt(209322);
  const trace = traceSteps(input, [step(1, "BLADE_DANCE")]);
  expect(trace.complete).toBe(true);
  expect(trace.transitions[0]!.after.hand.slice().sort())
    .toEqual(frame(209323).hand.map((entry) => entry.card_id).sort());
  expect(trace.transitions[0]!.after).toMatchObject({
    energy: frame(209323).player.energy, drawn: 0, drawBudget: 0, unknownHand: 0, damage: 0,
  });
  expect(trace.transitions[0]!.leavesPool).toBe("exhaust");
});

it("keeps the A10 potion cost this turn and the later observed ordinary cast separate", () => {
  const free = inputAt(311492);
  const dance = free.hand.find((entry) => entry.cardId === "BLADE_DANCE")!;
  const prefix = [step(dance.index, "BLADE_DANCE")];
  const shivs = [0, 1, 2].map((i) => step(3_000_000 + i, "SHIV", 0));
  expect(replaySteps(free, [...prefix, ...shivs])!.outcome).toMatchObject({ damageDealt: 12, cardsDrawn: 0 });
  const trace = traceSteps(inputAt(311495), [step(1, "BLADE_DANCE")]);
  expect(trace.transitions[0]!.after.hand.slice().sort())
    .toEqual(frame(311496).hand.map((entry) => entry.card_id).sort());
  expect(trace.transitions[0]!.after).toMatchObject({ energy: 0, drawn: 0, unknownHand: 0 });
});

it("keeps the plain A0 branch out of other roles, levels and altered templates", () => {
  const raw = frame(209322).hand.find((entry) => entry.card_id === "BLADE_DANCE")!;
  for (const [character, ascension, entry] of [
    ["ironclad", 0, raw], ["silent", 1, raw], ["silent", null, raw],
    ["silent", 0, { ...raw, rules_text: "UNOBSERVED" }],
  ] as const) {
    const model = modelHandCard(entry, 1, knowledge, character, ascension);
    expect(model.adds).toBeUndefined();
    expect(model.draw).toBe(3);
  }
});
