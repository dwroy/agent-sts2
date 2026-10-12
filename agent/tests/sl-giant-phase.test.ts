import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { RunJournal } from "../src/memory/run-journal.js";
import { createScreenMemory } from "../src/memory/types.js";
import { giantPhaseAtTurnStart, previousAttemptsJson, type SlAttemptRow } from "../src/sl/attempts.js";
import { SlController } from "../src/sl/controller.js";
import { anchorRank, enemyHpLeft, exploreTarget, type ExploreRow } from "../src/sl/explore.js";
import { testKnowledge } from "./scenarios.js";
import { mapBoard } from "./sl-support.js";

type Raw = Record<string, any>;
// YQL8RZ8BWN1E A10 F17 T10, states.jsonl 280160/280161: poison 2 -> 8, HP/block/blast unchanged.
const OBSERVED = JSON.parse(readFileSync(new URL("./sl-giant-phase-data/yql-blast.json", import.meta.url), "utf8")) as Raw[];
const board = () => structuredClone(OBSERVED[0]!);
const phaseOf = (raw: Raw) => giantPhaseAtTurnStart(parseGameState(raw));

function recorded(raw: Raw): SlAttemptRow {
  const rows: SlAttemptRow[] = [];
  const game = parseGameState(raw);
  const sl = new SlController({
    config: { ...loadConfig({}).sl, enabled: true, bossRetries: 0 },
    knowledge: { ...testKnowledge, monster: (id) => id === "WATERFALL_GIANT" ? { ...testKnowledge.monster("TEST_SUBJECT")!, id } : testKnowledge.monster(id) },
    client: { state: async () => game, act: async () => { throw new Error("no actions expected"); } },
    log: { path: null, readRun: () => [], write: (row) => rows.push(row) },
    note: () => {},
  });
  const memory = { journal: new RunJournal(), screenMemory: createScreenMemory() };
  sl.observe(game, memory);
  sl.observe(parseGameState(mapBoard(17)), memory);
  expect(rows).toHaveLength(1);
  return rows[0]!;
}

describe("Silent A10 giant phase facts (silent-0250)", () => {
  it("poison on the husk does not become body damage or lower the observed blast", () => {
    const phases = OBSERVED.map(phaseOf);
    expect(phases[0]).toMatchObject({ phase: "blast_pending", body_hp: 0, raw_hp: 999999999, incoming_at_turn_start: 41 });
    expect(phases[1]).toEqual(phases[0]);
    expect(OBSERVED.map((raw) => raw.combat.player.current_hp + raw.combat.player.block - phases[0]!.incoming_at_turn_start)).toEqual([-2, -2]);
  });

  it("the controller preserves raw HP and captures the fact in the saved turn and retry prompt", () => {
    const raw = board();
    const before = JSON.stringify(raw);
    const row = recorded(raw);
    expect(JSON.stringify(raw)).toBe(before);
    expect(row.summary.turns[0]).toMatchObject({ hp: 26, block: 13, enemies: "瀑布巨兽 999999999/999999999", giant_phase: { body_hp: 0, incoming_at_turn_start: 41 } });
    const prompt = JSON.stringify(previousAttemptsJson([row], 2, 6));
    expect(prompt).toContain("本体剩血0，自爆仍待结算");
    expect(prompt).toContain("轮初显示41伤害");
    expect(prompt).toContain("不代表本体进度或获胜");
  });

  it.each(["IRONCLAD", "UNKNOWN"])("%s keeps its previous record and prompt", (character) => {
    const raw = board();
    raw.run.character_id = character;
    expect(phaseOf(raw)).toBeNull();
    const row = recorded(raw);
    expect(row.summary.turns[0]).not.toHaveProperty("giant_phase");
    expect(JSON.stringify(previousAttemptsJson([row], 2, 6))).not.toContain("本体剩血");
  });

  it.each([9, 11, null])("unobserved ascension %s receives no inferred phase", (asc) => {
    const raw = board();
    raw.run.ascension = asc;
    expect(phaseOf(raw)).toBeNull();
  });

  it.each(["body", "identity", "move", "intent", "hits", "missingDamage", "otherLiving", "steam"])("refuses the unverified shape: %s", (change) => {
    const raw = board();
    const enemy = raw.combat.enemies[0];
    if (change === "body") { enemy.max_hp = 250; enemy.current_hp = 42; }
    if (change === "identity") enemy.enemy_id = "UNKNOWN";
    if (change === "move") enemy.move_id = "ABOUT_TO_BLOW_MOVE";
    if (change === "intent") enemy.intents[0].intent_type = "Attack";
    if (change === "hits") enemy.intents[0].hits = 2;
    if (change === "missingDamage") enemy.intents[0].damage = null;
    if (change === "otherLiving") raw.combat.enemies.push({ ...enemy, index: 1, enemy_id: "UNKNOWN" });
    if (change === "steam") enemy.powers.push({ power_id: "STEAM_ERUPTION_POWER", amount: 1 });
    expect(phaseOf(raw)).toBeNull();
  });

  it("adds a separate body/blast fact while retaining the original reference ranking and raw metric", () => {
    const phase = phaseOf(board())!;
    const row = (attempt: number, hp: number, annotated: boolean): ExploreRow => ({
      attempt, turns: 13, result: "predicted_death",
      summary: { turns: [{ turn: 13, hp: 10, block: 0, enemies: `瀑布巨兽 ${hp}/999999999`, plays: [], ...(annotated ? { giant_phase: { ...phase, raw_hp: hp } } : {}) }] },
      explore: { target: null, points: [{ kind: "question", label: "combat/plan-choice", board: "same", turn: 13, line: "A", alternatives: ["A", "B"] }] },
    });
    const old = [row(1, 999999990, false), row(2, 999999999, false)];
    const annotated = [row(1, 999999990, true), row(2, 999999999, true)];
    expect(anchorRank(annotated, 3).map((r) => r.attempt)).toEqual(anchorRank(old, 3).map((r) => r.attempt));
    expect(annotated.map(enemyHpLeft)).toEqual([999999990, 999999999]);
    const target = exploreTarget(annotated, 3, { anchor: true }).target;
    expect(target?.reference).toBe(exploreTarget(old, 3, { anchor: true }).target?.reference);
    expect(target?.anchor?.ranked[0]).toMatchObject({ enemyHp: 999999990, giantPhase: { body_hp: 0, phase: "blast_pending" } });
    expect(target?.anchor?.why).toContain("本体结束不等于获胜");
    expect(exploreTarget(old, 3, { anchor: true }).target?.anchor?.ranked[0]).not.toHaveProperty("giantPhase");
  });
});
