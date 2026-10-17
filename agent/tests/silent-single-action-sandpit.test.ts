/** silent-0308: 0YQJ9D1MC4NK A10 F33 T7; fixed raw frames, no generated knowledge or model calls. */
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import evidence from "./silent-single-action-sandpit-state.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision } from "../src/memory/types.js";
import { planCombat } from "../src/reflex/combat.js";
import { judgeEndTurn } from "../src/sl/judge.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Silent Sandpit evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

type Raw = Record<string, any>;
const knowledge = makeKnowledge({}, "cache");
function frame(line: number): Raw {
  const found = evidence.frames.find((entry) => entry.line === line);
  if (!found) throw new Error(`missing fixed raw line ${line}`);
  return structuredClone(found.state);
}
function ask(raw: Raw, strictJev = true) {
  const state = parseGameState(raw);
  const decision = planCombat({ state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] });
  if (decision?.kind !== "ask" || decision.questions.play?.type !== "choice") throw new Error("expected single-action choice");
  const choices = Object.fromEntries(Object.entries(decision.questions.play.criteria)
    .map(([key, value]) => [key, JSON.parse(String(value)) as Raw]));
  return { decision: decision as AskDecision, choices };
}
function choose(decision: AskDecision, key: string) {
  return decision.resolve({ play: { type: "choice", choice: key, confidence: 1, probabilities: { [key]: 1 }, raw: {} } });
}

describe("Silent A10 single-action Sandpit deadline", () => {
  it.each([426127, 426128, 426129, 426130, 426131])("raw line %i: independent death is visible while every original choice stays legal", (line) => {
    const raw = frame(line);
    const before = structuredClone(raw);
    const { decision, choices } = ask(raw);
    expect(raw.combat.end_turn_will_kill_player).toBe(false);
    expect(choices.end_turn).toMatchObject({ lethal: true, hp_after_enemy_turn: 0,
      sandpit_deadline: { count_now: 1, scope: "current_end_turn_only", certain: true } });
    expect(choices.end_turn!.hp_after_counted_damage).toBeGreaterThan(0);
    expect((decision.state.situation as Raw).ending_turn_would_kill_me).toBe(true);
    const noPit = structuredClone(raw);
    noPit.combat.enemies[0].powers = noPit.combat.enemies[0].powers.filter((p: Raw) => p.power_id !== "SANDPIT_POWER");
    const baseline = ask(noPit);
    expect(Object.keys(choices)).toEqual(Object.keys(baseline.choices));
    for (const key of Object.keys(choices)) expect(choose(decision, key).intent).toEqual(choose(baseline.decision, key).intent);
    expect(raw).toEqual(before);
    // The real SL judge still refuses to infer that all choices die while actions/potions remain.
    expect(judgeEndTurn(parseGameState(raw), { label: "combat/end_turn", revives: [], knowledge }).certain).toBe(false);
  });

  it("last real frame: 40 after counted damage differs from the observed zero HP", () => {
    const raw = frame(426131);
    const { choices } = ask(raw);
    expect(choices.end_turn).toMatchObject({ incoming_damage: 10, hp_after_counted_damage: 40, hp_after_enemy_turn: 0 });
    expect(frame(426132).run.current_hp).toBe(0);
    expect(frame(426132).combat.enemies[0].current_hp).toBe(147);
    expect(choices["p0->e0"]).toBeDefined();
  });

  it.each([426096, 426116, 426119])("real nondeadline line %i keeps its original damage estimate", (line) => {
    const raw = frame(line);
    const { choices } = ask(raw);
    expect(choices.end_turn!.sandpit_deadline).toBeUndefined();
    expect(choices.end_turn!.hp_after_enemy_turn).toBe(raw.combat.player.current_hp - choices.end_turn!.incoming_damage);
  });

  it.each(["INTANGIBLE_POWER", "BUFFER_POWER"])("synthetic unknown %s protection keeps the deadline uncertain", (id) => {
    const raw = frame(426131);
    raw.combat.player.powers.push({ power_id: id, amount: 1 });
    const { choices } = ask(raw);
    expect(choices.end_turn).toMatchObject({ lethal: null, hp_after_enemy_turn: null,
      sandpit_deadline: { certain: false, scope: "current_end_turn_only" } });
    expect(choices["p0->e0"]).toBeDefined();
  });

  it("synthetic possible poison termination is unknown, not a forced death or a verified survival", () => {
    const raw = frame(426131);
    raw.combat.enemies[0].current_hp = 45;
    expect(ask(raw).choices.end_turn).toMatchObject({ lethal: null, hp_after_enemy_turn: null,
      sandpit_deadline: { certain: false } });
  });

  it.each(["IRONCLAD", "silent-at-unobserved-ascension"])("%s keeps the old question fields", (scope) => {
    const raw = frame(426131);
    if (scope === "IRONCLAD") raw.run.character_id = scope;
    else raw.run.ascension = 11;
    const { choices } = ask(raw);
    expect(choices.end_turn).toMatchObject({ lethal: false, hp_after_enemy_turn: 40 });
    expect(choices.end_turn!.sandpit_deadline).toBeUndefined();
  });

  it("nonstrict mode also preserves end-turn and potion resolution instead of forcing a drink", () => {
    const { decision, choices } = ask(frame(426131), false);
    expect(Object.keys(choices)).toEqual(["p0->e0", "end_turn"]);
    expect(choose(decision, "end_turn").intent).toEqual({ action: "end_turn" });
    expect(choose(decision, "p0->e0").intent).toEqual({ action: "use_potion", option_index: 0, target_index: 0 });
  });
});
