/** Frozen original frames: 9J6 F8, MRJ F8, 9S9 F12. No current knowledge or model requests. */
import { expect, it, vi } from "vitest";
import evidence from "./combat-state-divergence-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { simulateFight, type RolloutInput } from "../src/reflex/rollout.js";
import { solveTap, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_combat_divergence__/${name}`,
}));

function replay(name: keyof typeof evidence, sample: number, turns = 2) {
  const input = structuredClone(evidence[name].input) as unknown as RolloutInput;
  let next: SolverInput | undefined;
  solveTap.onSolve = (si) => { next ??= structuredClone(si); };
  try {
    const trajectory = simulateFight(input, input.plans[0]!, turns,
      (input.options!.seed ?? 0) * 7919 + 1 + sample, false);
    return { next: next!, records: trajectory.records };
  } finally { solveTap.onSolve = null; }
}

it.each(["eel", "effigy"] as const)("%s: the actual fatal next hand is represented by a fixed sample", (name) => {
  const frame = evidence[name];
  const { next, records } = replay(name, frame.bad_sample);
  expect(next.player.hp).toBe(frame.after.combat.player.current_hp);
  expect(next.enemies[0]!.hp).toBe(frame.after.combat.enemies[0]!.current_hp);
  expect(next.enemies[0]!.attacks).toEqual(name === "eel" ? [{ damage: 36, hits: 1 }] : [{ damage: 25, hits: 1 }]);
  expect(next.hand.map((c) => c.cardId).sort()).toEqual(frame.after.combat.hand.map((c) => c.card_id).sort());
  expect(records[1]).toMatchObject({ died: true, loss: name === "eel" ? 18 : 8 });
  expect(next.player.hp - records[1]!.loss).toBe(name === "eel" ? -6 : 0);
});

it.each(["eel", "effigy"] as const)("%s: the original eight samples can all win while the next-hand death remains possible", (name) => {
  for (let j = 0; j < 8; j += 1) {
    expect(replay(name, j, 5).records.at(-1)).toMatchObject({ won: true, died: false });
  }
});

it("9S9 F12 T4→T5: the observed unplayed Snakebite stays above the normal five-card draw", () => {
  const frame = evidence.fog;
  const input = structuredClone(frame.input) as unknown as RolloutInput;
  const raw = frame.before.combat.hand[0]!;
  const knowledge = makeKnowledge({ cards: [{ id: "SNAKEBITE", type: "Skill" }] }, "cache");
  const snake = modelHandCard(raw, 0, knowledge, "silent", 10);
  expect(snake.retain).toBe(true);
  input.solver.hand[0] = snake;
  input.piles.handBase[0] = snake;
  let next: SolverInput | undefined;
  solveTap.onSolve = (si) => { next = structuredClone(si); };
  try { simulateFight(input, input.plans[0]!, 2, input.options!.seed! * 7919 + 1, false); }
  finally { solveTap.onSolve = null; }
  expect(next!.player.hp).toBe(frame.after.combat.player.current_hp);
  expect(next!.hand[0]).toMatchObject({ cardId: "SNAKEBITE", retain: true, poison: 7 });
  expect(next!.hand).toHaveLength(frame.after.combat.hand.length);
  expect(next!.hand).toHaveLength(6);
});
