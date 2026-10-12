import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { RunJournal } from "../src/memory/run-journal.js";
import { createScreenMemory } from "../src/memory/types.js";
import { giantFinalResources, previousAttemptsJson, type SlAttemptRow } from "../src/sl/attempts.js";
import { SlController } from "../src/sl/controller.js";
import { anchorRank, exploreTarget } from "../src/sl/explore.js";
import { judgeEndTurn } from "../src/sl/judge.js";
import { testKnowledge } from "./scenarios.js";

type Raw = Record<string, any>;
// Exact logged payloads: NYQW6JAD30K4, Silent A10 F17; keys are states.jsonl line numbers.
const states: Record<string, Raw> = JSON.parse(readFileSync(new URL("./sl-giant-phase-data/nyqw-final-resources.json", import.meta.url), "utf8"));
const attempts: SlAttemptRow[] = JSON.parse(readFileSync(new URL("./sl-giant-phase-data/nyqw-attempts.json", import.meta.url), "utf8"));
const raw = (line: number) => structuredClone(states[String(line)]!);
const context = () => ({ label: "combat/end", screenMemory: createScreenMemory(), journal: new RunJournal() });
function facts(payload: Raw) {
  const state = parseGameState(payload);
  return giantFinalResources(state, judgeEndTurn(state, { label: "combat/end", revives: [] }));
}

describe("NYQW6JAD30K4 final blast resources (silent-0379 continuation)", () => {
  it.each([[363009, 9, 19, 35, 8], [363119, 9, 22, 50, 20], [363302, 6, 22, 50, 23]])(
    "uses the final actionable state %i, including the post-Neutralize intent", (line, hp, block, incoming, gap) => {
      expect(facts(raw(line!))).toEqual({ hp, block, incoming, end_block: 0, minimum_extra_hp: gap });
    },
  );

  it.each([[363005, 363009, 1, 8], [363115, 363119, 1, 20], [363298, 363302, 0, 23]])(
    "persists pre-end resources through reload/death and exposes them to retry questions (%i)", async (start, end, retries, gap) => {
      const rows: SlAttemptRow[] = [];
      let clock = 0;
      const first = parseGameState(raw(start!));
      const last = parseGameState(raw(end!));
      const sl = new SlController({
        config: { ...loadConfig({}).sl, enabled: true, bossRetries: retries! },
        knowledge: { ...testKnowledge, monster: (id) => id === "WATERFALL_GIANT" ? { ...testKnowledge.monster("TEST_SUBJECT")!, id } : testKnowledge.monster(id) },
        client: { state: async () => last, act: async () => { throw new Error("fixed reload failure"); } },
        log: { path: null, readRun: () => [], write: (row) => rows.push(row) },
        note: () => {},
        sleep: async (ms) => { clock += ms; },
        now: () => clock,
      });
      const memory = context();
      sl.observe(first, memory);
      sl.observe(last, memory);
      await sl.beforeEndTurn(last, memory);
      if (retries === 0) sl.observe(parseGameState(raw(363303)), memory);
      expect(rows).toHaveLength(1);
      const row = rows[0]!;
      expect(row.result).toBe(retries ? "predicted_death" : "died");
      expect(row.summary.turns.at(-1)?.giant_final_resources?.minimum_extra_hp).toBe(gap);
      expect(row.summary.turns.at(-1)?.giant_phase?.incoming_at_turn_start).toBe(start === 363005 ? 47 : 50);
      const prompt = JSON.stringify(previousAttemptsJson(rows, 2, 6));
      expect(prompt).toContain(`至少还差${gap}血`);
      if (retries === 0) {
        expect(row.end_hp).toBe(0);
        expect(prompt).toContain("6血＋22挡");
      }
    },
  );

  it("keeps the recorded reference ranking while adding final-state facts to its explanation", () => {
    const annotated = structuredClone(attempts);
    for (const [index, line] of [[0, 363009], [2, 363119], [5, 363302]]) {
      annotated[index!]!.summary.turns.at(-1)!.giant_final_resources = facts(raw(line!))!;
    }
    expect(anchorRank(annotated, 7).map((r) => r.attempt)).toEqual(anchorRank(attempts, 7).map((r) => r.attempt));
    const before = exploreTarget(attempts, 7, { anchor: true }).target!;
    const after = exploreTarget(annotated, 7, { anchor: true }).target!;
    expect(after.reference).toBe(before.reference);
    expect(after.anchor?.why).toContain("最终来袭35，9血＋19挡");
    expect(after.anchor?.why).toContain("至少还差23血");
    expect(before.anchor?.why).toContain("最终存活缺口未知");
  });

  it.each(["body", "dead", "missingHp", "missingBlock", "missingRelics", "missingPotions", "missingPowers", "unknownPower", "unknownRelic", "potion", "IRONCLAD", "A9", "A11", "enemyPower", "missingEnemyPowers", "orb", "pet", "missingOrbs", "missingPets"])(
    "does not fill unobserved or incomplete budgets: %s", (change) => {
      const payload = raw(change === "body" ? 363057 : change === "dead" ? 363303 : 363302);
      const player = payload.combat.player;
      if (change === "missingHp") delete player.current_hp;
      if (change === "missingBlock") delete player.block;
      if (change === "missingRelics") delete payload.run.relics;
      if (change === "missingPotions") delete payload.run.potions;
      if (change === "missingPowers") delete player.powers;
      if (change === "unknownPower") player.powers.push({ power_id: "UNKNOWN_POWER", amount: 1 });
      if (change === "unknownRelic") payload.run.relics.push({ relic_id: "UNKNOWN_RELIC" });
      if (change === "potion") payload.run.potions[0].occupied = true;
      if (change === "IRONCLAD") payload.run.character_id = "IRONCLAD";
      if (change === "A9") payload.run.ascension = 9;
      if (change === "A11") payload.run.ascension = 11;
      if (change === "enemyPower") payload.combat.enemies[0].powers.push({ power_id: "UNKNOWN_POWER", amount: 1 });
      if (change === "missingEnemyPowers") delete payload.combat.enemies[0].powers;
      if (change === "orb") player.orbs.push({ orb_id: "UNKNOWN_ORB" });
      if (change === "pet") player.pets.push({ pet_id: "UNKNOWN_PET" });
      if (change === "missingOrbs") delete player.orbs;
      if (change === "missingPets") delete player.pets;
      expect(facts(payload)).toBeNull();
    },
  );

  it.each(["early", "endBlock", "held", "revive", "mismatched", "uncertain"])("refuses an unsupported verdict: %s", (change) => {
    const state = parseGameState(raw(363302));
    const verdict = judgeEndTurn(state, { label: "combat/end", revives: [] });
    if (change === "early") verdict.early = true;
    if (change === "endBlock") verdict.endBlock = 6;
    if (change === "held") verdict.held = { damage: 0, loss: 1, from: ["unknown"] };
    if (change === "revive") verdict.revive = { held: ["unknown"], used: [], backAt: [], hpLeft: 0, saved: false };
    if (change === "mismatched") verdict.hp = 10;
    if (change === "uncertain") verdict.certain = false;
    expect(giantFinalResources(state, verdict)).toBeNull();
  });
});
