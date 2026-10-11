/** 8S9RNHFU5XF1, Silent A10 F22 T1; silent-0400/0401. No refreshed knowledge inputs. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { describePlan, planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions, turnsText } from "../src/reflex/rollout-live.js";
import type { LineEstimate } from "../src/reflex/rollout.js";
import { dominates, replaySteps, solveTap, solveTurn, type SolverInput, type Step } from "../src/reflex/turn-solver.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const read = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Kusarigama evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync: read, default: { ...fs, readFileSync: read } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-kusarigama-evidence.json", import.meta.url), "utf8")) as Raw[];
const frame = (line: number): Raw => structuredClone(rows.find((r) => r.line === line)!.row.state);
const knowledge = makeKnowledge({ cards: [
  { id: "STRANGLE", type: "Attack" }, { id: "STRIKE_SILENT", type: "Attack" },
  { id: "SERPENT_FORM", type: "Power" },
] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function inputFor(raw = frame(355242)): SolverInput {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("observed board was not solved");
  return input;
}

function steps(input: SolverInput): Step[] {
  return ["STRANGLE", "STRIKE_SILENT", "POTION:POTION_SHAPED_ROCK"].map((id) => {
    const c = input.hand.find((c) => c.cardId.startsWith(id));
    if (!c) throw new Error(`missing ${id}: ${input.hand.map((c) => c.cardId)}`);
    return { cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded, target: 1 };
  });
}

it("does not pre-credit a random kill that the recorded complete line failed to deliver", () => {
  const input = inputFor();
  expect(input.player.kusarigama).toMatchObject({ every: 3, damage: 6, count: 1, deferRandomTarget: true });
  const plan = replaySteps(input, steps(input))!;
  // Existing silent-0260 still omits the following Strike's Strangle loss of two.
  // Preserve that independent gap: modeled 5 HP is not the observed 3 HP, but neither is a kill.
  expect(plan.outcome).toMatchObject({ hpLoss: 14, hpAfter: 25, kills: [], damageDealt: 23, kusarigamaUnresolved: true });
  expect(plan.outcome.enemyHpAfter.find((e) => e.index === 1)?.hp).toBe(5);
  expect(plan.outcome.unknownCards.join(" ")).toContain("锁镰");
  expect(frame(355246).combat.player.current_hp).toBe(25);
  // The observed random six hit index 2, not index 1. They are not silently counted as zero actual damage.
  expect(frame(355243).combat.enemies[2].current_hp - frame(355244).combat.enemies[2].current_hp).toBe(6);
  expect(frame(355245).combat.enemies[1].current_hp).toBe(3);
  const legacy = structuredClone(input);
  delete legacy.player.kusarigama!.deferRandomTarget;
  expect(replaySteps(legacy, steps(legacy))!.outcome).toMatchObject({ hpLoss: 5 });
});

it("retains the playable suffix and labels the reference result instead of presenting an exact rollout", () => {
  const input = inputFor();
  const plan = replaySteps(input, steps(input))!;
  expect(plan.steps).toHaveLength(3);
  expect(describePlan(plan, 77).result).toContain("非保证");
  expect(describePlan(plan, 77).unmodelled_cards).toContain("未计额外伤害");
  expect(turnsText(plan, { perTurn: [] } as unknown as LineEstimate, 1)).not.toContain("T1 exact");
  expect(dominates(plan, replaySteps(input, [])!)).toBe(false);
  const result = solveTurn(input);
  const uncertain = result.plans.filter((p) => p.outcome.kusarigamaUnresolved);
  expect(uncertain.length).toBeGreaterThan(0);
  expect(uncertain.every((p) => replaySteps(input, p.steps)!.outcome.kusarigamaUnresolved)).toBe(true);
});

it.each(["untriggered", "absent"])("%s relic leaves the original modeled outcome intact", (mode) => {
  const input = inputFor();
  if (mode === "absent") delete input.player.kusarigama;
  else input.player.kusarigama!.count = 0;
  const control = structuredClone(input);
  if (control.player.kusarigama) delete control.player.kusarigama.deferRandomTarget;
  expect(replaySteps(input, steps(input))).toEqual(replaySteps(control, steps(control)));
  expect(replaySteps(input, steps(input))!.outcome.kusarigamaUnresolved).toBeUndefined();
});

it("a sole remaining target keeps the old raw-damage and per-hit-cap path", () => {
  const input = inputFor();
  input.enemies = input.enemies.filter((e) => e.index === 1);
  const control = structuredClone(input);
  delete control.player.kusarigama!.deferRandomTarget;
  expect(replaySteps(input, steps(input))).toEqual(replaySteps(control, steps(control)));
  expect(replaySteps(input, steps(input))!.outcome.kusarigamaUnresolved).toBeUndefined();
});

it.each([["IRONCLAD", 10], ["SILENT", 9], ["SILENT", 11]])("%s A%i does not opt into the observed A10 change", (character, ascension) => {
  // Same Silent fixture with only routing metadata changed, not evidence from another character.
  const raw = frame(355242);
  raw.run.character_id = character; raw.run.ascension = ascension;
  const input = inputFor(raw);
  expect(input.player.kusarigama!.deferRandomTarget).toBeUndefined();
  const control = structuredClone(input);
  delete control.player.kusarigama!.deferRandomTarget;
  expect(replaySteps(input, steps(input))).toEqual(replaySteps(control, steps(control)));
});
