/**
 * silent-0191: VLV17NUSFS61 F37 attempt 2 T5 / 5X2GHKJ89PN1 F48 attempt 6 T6.
 * Fixed projections of logged states; attack-body damage is separate from Serpent Form damage.
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
      throw Object.assign(new Error("ENOENT: fixed Weak test has no generated data"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

type Raw = Record<string, any>;
const frames = JSON.parse(readFileSync(new URL("./silent-single-action-weak-state.json", import.meta.url), "utf8")) as { ts: string; state: Raw }[];
const knowledge = makeKnowledge({}, "cache");

function frame(ts: string): Raw {
  const found = frames.find((entry) => entry.ts === ts);
  if (!found) throw new Error(`missing fixed frame ${ts}`);
  return structuredClone(found.state);
}

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

describe("single-action options count Weak once", () => {
  it("VLV F37 attempt 2 T5: Poisoned Stab reports the observed four damage, not three", () => {
    const before = frame("2026-10-05T15:17:50.653Z");
    const after = frame("2026-10-05T15:17:51.922Z");
    const stab = Object.values(options(before)).find((entry) => String(entry.action).includes("带毒刺击"));
    const observedLoss = before.combat.enemies[0].current_hp - after.combat.enemies[0].current_hp;
    expect(observedLoss).toBe(4);
    expect(stab).toMatchObject({ damage: observedLoss, damage_after_block: observedLoss, target_hp: "37 -> 33" });
    expect(stab?.modifiers ?? "").not.toContain("Weak");
  });

  it("5X2 F48 attempt 6 T6: Stab and two Shivs report ten body damage, keeping Serpent Form separate", () => {
    const before = frame("2026-10-06T11:09:38.912Z");
    const afterStab = frame("2026-10-06T11:09:40.672Z");
    const choices = options(before);
    const stab = choices["c2->e0"]!;
    const shiv1 = choices["c3->e0"]!;
    const shiv2 = choices["c4->e0"]!;
    expect(before.combat.enemies[0].current_hp - afterStab.combat.enemies[0].current_hp).toBe(8);
    expect(stab).toMatchObject({ damage: 4, damage_after_block: 4, target_hp: "73 -> 69" });
    expect(shiv1).toMatchObject({ damage: 3, damage_after_block: 3 });
    expect(shiv2).toMatchObject({ damage: 3, damage_after_block: 3 });
    expect(stab.damage + shiv1.damage + shiv2.damage).toBe(10);
  });

  it("the next 5X2 Shiv matches the observed three HP loss", () => {
    const before = frame("2026-10-06T11:09:40.672Z");
    const after = frame("2026-10-06T11:09:42.187Z");
    const observedLoss = before.combat.enemies[0].current_hp - after.combat.enemies[0].current_hp;
    expect(observedLoss).toBe(3);
    expect(options(before)["c2->e0"]).toMatchObject({ damage: observedLoss, damage_after_block: observedLoss, target_hp: "65 -> 62" });
  });

  it.each(["Damage", "CalculatedDamage", "DamagePerHit"])("%s previews still resolve target Vulnerable and block", (name) => {
    // Fixed arithmetic boundary: preview four, Vulnerable raises it to six, two block absorbs two.
    const raw = frame("2026-10-06T11:09:38.912Z");
    raw.combat.hand = [raw.combat.hand[2]];
    raw.combat.hand[0].index = 0;
    raw.combat.hand[0].dynamic_values = [{ name, base_value: 6, current_value: 4 }];
    raw.combat.enemies[0].block = 2;
    raw.combat.enemies[0].powers.push({ power_id: "VULNERABLE_POWER", amount: 1 });
    const stab = options(raw)["c0->e0"]!;
    expect(stab).toMatchObject({ damage: 6, damage_after_block: 4, target_hp: "73 -> 69" });
    expect(stab.modifiers).toContain("Vulnerable");
    expect(stab.modifiers).not.toContain("Weak");
  });

  it("a missing current value keeps the existing Weak resolution for a base-value fallback", () => {
    const raw = frame("2026-10-06T11:09:38.912Z");
    raw.combat.hand[2].dynamic_values[0].current_value = null;
    const stab = options(raw)["c2->e0"]!;
    expect(stab).toMatchObject({ damage: 4, damage_after_block: 4 });
    expect(stab.modifiers).toContain("Weak");
  });

  it("an unweakened current preview keeps the existing six-damage result", () => {
    const raw = frame("2026-10-06T11:09:38.912Z");
    raw.combat.player.powers = raw.combat.player.powers.filter((power: Raw) => power.power_id !== "WEAK_POWER");
    raw.combat.hand[2].dynamic_values[0].current_value = 6;
    expect(options(raw)["c2->e0"]).toMatchObject({ damage: 6, damage_after_block: 6 });
  });
});
