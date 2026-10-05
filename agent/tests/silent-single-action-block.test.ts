/**
 * silent-0130: VLV17NUSFS61 F48 attempt 6 T5 / Z6CFLDR3N4SB F48 attempt 1 T10.
 * The fixture projects raw logged frames onto combat and run fields; no generated data or model calls.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision } from "../src/memory/types.js";
import { planCombat } from "../src/reflex/combat.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed single-action test has no generated data"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

type Raw = Record<string, any>;
const frames = JSON.parse(readFileSync(new URL("./silent-single-action-block-state.json", import.meta.url), "utf8")) as { state: Raw }[];
const knowledge = makeKnowledge({}, "cache");

function options(raw: Raw): Record<string, Raw> {
  const state = parseGameState(raw);
  const decision = planCombat({ state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] });
  expect(decision?.kind).toBe("ask");
  const question = (decision as AskDecision).questions["play"];
  if (question?.type !== "choice") throw new Error("expected single-action options");
  return Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(String(value)) as Raw]));
}

describe("single-action options count existing Block once", () => {
  it("VLV F48 attempt 6 T5: non-defensive cards report the same 12 HP loss as ending the turn", () => {
    const choices = options(structuredClone(frames[1]!.state));
    expect(choices["end_turn"]).toMatchObject({ incoming_damage: 12, lethal: true });
    const cards = Object.values(choices).filter((entry) => entry["cost"] !== undefined);
    expect(cards.length).toBeGreaterThanOrEqual(4);
    for (const card of cards) expect(card["incoming_damage_after_this"]).toBe(12);
  });

  it("Z6 F48 attempt 1 T10: Poisoned Stab reports 40 HP loss, without subtracting the nine Block twice", () => {
    const choices = options(structuredClone(frames[0]!.state));
    expect(choices["end_turn"]?.["incoming_damage"]).toBe(40);
    const stab = Object.values(choices).find((entry) => String(entry["action"]).includes("带毒刺击"));
    expect(stab).toBeDefined();
    expect(stab?.["incoming_damage_after_this"]).toBe(40);
  });

  it("a fixed five-Block card subtracts only its new Block from the remaining 12 damage", () => {
    const raw = structuredClone(frames[1]!.state);
    // An arithmetic boundary fixture, not a new game mechanic or card valuation.
    raw["combat"]["hand"] = [{ index: 0, card_id: "TEST_BLOCK", name: "test block", card_type: "Skill",
      playable: true, energy_cost: 1, requires_target: false, target_type: "Self", valid_target_indices: [],
      resolved_rules_text: "获得5点格挡。", dynamic_values: [{ name: "Block", base_value: 5, current_value: 5 }] }];
    const choices = options(raw);
    expect(choices["end_turn"]?.["incoming_damage"]).toBe(12);
    const block = Object.values(choices).find((entry) => entry["block_gained"] === 5);
    expect(block?.["incoming_damage_after_this"]).toBe(7);
  });

  it("zero existing Block preserves the original 24-damage arithmetic", () => {
    const raw = structuredClone(frames[1]!.state);
    raw["combat"]["player"]["block"] = 0;
    const choices = options(raw);
    expect(choices["end_turn"]?.["incoming_damage"]).toBe(24);
    for (const card of Object.values(choices).filter((entry) => entry["cost"] !== undefined)) {
      expect(card["incoming_damage_after_this"]).toBe(24);
    }
  });
});
