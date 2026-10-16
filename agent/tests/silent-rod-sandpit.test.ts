/** Z91JN3S3PQX2 A10 F33 T13, silent-0313: the observed Rod/Sandpit death, not an attack-order claim. */
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import evidence from "./silent-rod-sandpit-evidence.json";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { judgeCurrentEndTurn, judgeEndTurn } from "../src/sl/judge.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Silent Rod/Sandpit evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

type Raw = Record<string, any>;
const knowledge = makeKnowledge({}, "cache");
const frame = (): Raw => structuredClone(evidence.frames[0]!.row.state);
const context = () => ({ label: "combat/end_turn", revives: [] as string[], knowledge });
const judge = (raw: Raw) => judgeEndTurn(parseGameState(raw), context());

describe("Silent's observed Tungsten Rod and Sandpit terminal combination", () => {
  it("the raw end-turn frame is certain even though the per-hit attack budget leaves one HP", () => {
    const raw = frame();
    const before = structuredClone(raw);
    expect(raw.run.character_id).toBe("SILENT");
    expect(raw.run.ascension).toBe(10);
    expect(raw.combat.player).toMatchObject({ current_hp: 17, block: 8 });
    expect(raw.combat.enemies[0]).toMatchObject({ current_hp: 50, move_id: "THRASH_MOVE_2" });
    expect(evidence.frames[1]!.row.state.combat.player).toMatchObject({ current_hp: 0, block: 8 });
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules", sandpit: 1, ownCountDies: true });
    expect(raw).toEqual(before);
  });

  it("the current-end-turn consumer uses the same evidence without requiring the mod's lethal flag", () => {
    const raw = frame();
    raw.combat.end_turn_will_kill_player = false;
    expect(judgeCurrentEndTurn(parseGameState(raw), context())).toMatchObject({ certain: true, sandpit: 1 });
    expect(judge(raw).certain).toBe(true);
  });

  it.each(["BUFFER_POWER", "INTANGIBLE_POWER", "UNOBSERVED_PROTECTION"])("synthetic unverified %s keeps the result uncertain", (id) => {
    const raw = frame();
    raw.combat.player.powers.push({ power_id: id, amount: 1 });
    expect(judge(raw).certain).toBe(false);
  });

  it.each(["BEATING_REMNANT", "LIZARD_TAIL", "UNOBSERVED_PROTECTION", "TUNGSTEN_ROD"])("synthetic additional %s protection stays unverified", (id) => {
    const raw = frame();
    raw.run.relics.push({ relic_id: id });
    const ctx = context();
    if (id === "LIZARD_TAIL") ctx.revives.push(id);
    expect(judgeEndTurn(parseGameState(raw), ctx).certain).toBe(false);
  });

  it.each(["IRONCLAD", "unobserved-ascension"])("synthetic %s scope preserves the existing Rod refusal", (scope) => {
    const raw = frame();
    if (scope === "IRONCLAD") raw.run.character_id = scope;
    else raw.run.ascension = 11;
    expect(judge(raw).certain).toBe(false);
    expect(judge(raw).reason).toContain("never logged with the Sandpit");
  });

  it.each(["different-move", "hidden-intent", "additional-enemy", "unknown-enemy-power", "possible-poison-kill", "pit-two"])("synthetic %s does not inherit this observed death", (change) => {
    const raw = frame();
    const enemy = raw.combat.enemies[0];
    if (change === "different-move") enemy.move_id = "UNOBSERVED_MOVE";
    if (change === "hidden-intent") enemy.intents = [];
    if (change === "additional-enemy") raw.combat.enemies.push({ ...structuredClone(enemy), index: 1,
      enemy_id: "SYNTHETIC_ADD", name: "Synthetic add", powers: [], intents: [] });
    if (change === "unknown-enemy-power") enemy.powers.push({ power_id: "UNOBSERVED_POWER", amount: 1 });
    if (change === "possible-poison-kill") enemy.current_hp = 5;
    if (change === "pit-two") enemy.powers.find((power: Raw) => power.power_id === "SANDPIT_POWER").amount = 2;
    expect(judge(raw).certain).toBe(false);
  });

  it("a nonempty hand stays outside the observed Rod combination", () => {
    const raw = frame();
    raw.combat.hand.push({ card_id: "FRANTIC_ESCAPE", name: "狂乱逃离", index: 0, playable: true, energy_cost: 0 });
    expect(judge(raw).certain).toBe(false);
    expect(judge(raw).reason).toContain("never logged with the Sandpit");
  });
});
