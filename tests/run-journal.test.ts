/** Run memory for the DeepSeek escalator: journal, fight log and map lookahead. */

import { describe, expect, it } from "vitest";

import { parseGameState, type GameState } from "../src/mod/schema.js";
import { memoryChars, pathSpans, renderLookahead, RunJournal, type JournalEntry } from "../src/project/run-journal.js";
import { createScreenMemory, type RememberedMap } from "../src/project/types.js";
import { rememberMap } from "../src/screens/rest.js";
import { baseState, combatPayload, runPayload, testKnowledge } from "./scenarios.js";

type Raw = Record<string, unknown>;

const entry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
  label: "reward/card",
  by: "deepseek",
  choice: "took Inflame",
  reason: "",
  asked: true,
  intent: null,
  ...overrides,
});

function combat(turn: number, hp: number, enemyHp: number, runId = "TESTRUN123"): GameState {
  const raw = combatPayload({ enemyHp });
  raw["turn"] = turn;
  raw["run_id"] = runId;
  ((raw["combat"] as Raw)["player"] as Raw)["current_hp"] = hp;
  return parseGameState(raw);
}

describe("run journal", () => {
  it("stays bounded and resets on a new run id", () => {
    const journal = new RunJournal();
    const state = parseGameState(baseState("REWARD"));
    for (let index = 0; index < 20; index += 1) {
      journal.record(state, entry({ label: `event/choose-${index}`, choice: "x".repeat(200), reason: "because ".repeat(40) }));
    }
    // Jev's and code's own choices are not the escalator's: not journaled.
    journal.record(state, entry({ by: "jev", label: "reward/jev" }));
    expect(journal.choices).toHaveLength(8);
    expect(journal.choices[0]!.label).toBe("event/choose-12");
    const memory = journal.render(state, testKnowledge, undefined);
    expect(memory.run_journal.length).toBeLessThanOrEqual(800);
    expect(memory.run_journal).toContain("本幕 boss: SLIME_BOSS");
    expect(memory.run_journal).toContain("力量来源 INFLAME");
    expect(memory.run_journal).toContain("event/choose-19");
    expect(memory.run_journal).not.toContain("reward/jev");
    expect(memoryChars(memory)).toBeLessThanOrEqual(1500);

    const next = parseGameState(baseState("REWARD", { run_id: "OTHERRUN" }));
    journal.observe(next);
    expect(journal.choices).toEqual([]);
    expect(journal.render(next, testKnowledge, undefined).run_journal).not.toContain("本局兜底决策");
  });

  it("logs the completed turns of the current fight one line per turn: HP, the line chosen and by whom, HP lost, enemies after", () => {
    const journal = new RunJournal();
    journal.record(combat(1, 55, 42), entry({ label: "combat/plan-choice", by: "jev", choice: "Bash -> JAW_WORM" }));
    journal.record(combat(1, 55, 34), entry({ label: "combat/plan-continue", by: "code", choice: "continuing", asked: false }));
    journal.record(combat(2, 48, 30), entry({ label: "combat/lethal", by: "code", choice: "lethal", asked: false }));
    journal.record(combat(2, 48, 30), entry({ label: "combat/plan-choice", by: "deepseek", choice: "Defend, Strike" }));
    journal.record(combat(3, 45, 20), entry({ label: "combat/plan-choice", by: "jev", choice: "Strike" }));
    const log = journal.render(combat(3, 45, 20), testKnowledge, undefined).fight_log.split("\n");
    expect(log).toEqual([
      "T1 HP 55, 失血 7 | jev: Bash -> JAW_WORM | 之后敌人: JAW_WORM 30/30, CULTIST 48/48",
      "T2 HP 48, 失血 3 | deepseek: Defend, Strike | 之后敌人: JAW_WORM 20/20, CULTIST 48/48",
    ]);
    // The current (unfinished) turn is not in the log, even mid-turn after a code act.
    expect(journal.render(combat(3, 45, 12), testKnowledge, undefined).fight_log).not.toContain("T3");
    const first = new RunJournal();
    first.record(combat(1, 55, 42), entry({ label: "combat/plan-choice", by: "jev", choice: "Bash -> JAW_WORM" }));
    expect(first.render(combat(1, 55, 34), testKnowledge, undefined).fight_log).toBe("");
    // Combat choices are the fight log's, not the run journal's.
    expect(journal.choices).toEqual([]);

    for (let turn = 4; turn <= 9; turn += 1) journal.record(combat(turn, 40, 10), entry({ label: "combat/plan-choice", by: "jev", choice: `line ${turn}` }));
    expect(journal.fight!.turns.map((turn) => turn.turn)).toEqual([5, 6, 7, 8, 9]);

    // Out of combat the fight closes and is no longer shown.
    const after = parseGameState(baseState("REWARD", { run: runPayload({ current_hp: 38 }) }));
    journal.observe(after);
    expect(journal.fight!.turns.at(-1)!.hpLost).toBe(2);
    expect(journal.render(after, testKnowledge, undefined).fight_log).toBe("");
  });
});

describe("lookahead", () => {
  // row 0 start -> (1,0) Monster | (1,1) Shop; (1,0) -> (2,0) Elite | (2,1) RestSite; (1,1) -> (2,1); all -> boss at row 3.
  const node = (row: number, col: number, type: string, children: [number, number][]) => ({
    row, col, node_type: type, children: children.map(([r, c]) => ({ row: r, col: c })),
  });
  const mapState = parseGameState(baseState("MAP", {
    run: runPayload({ floor: 1, act_id: "0", boss_id: "VANTOM_BOSS" }),
    map: {
      current_node: { row: 0, col: 0 },
      boss_node: { row: 3, col: 0 },
      nodes: [
        node(0, 0, "Ancient", [[1, 0], [1, 1]]),
        node(1, 0, "Monster", [[2, 0], [2, 1]]),
        node(1, 1, "Shop", [[2, 1]]),
        node(2, 0, "Elite", [[3, 0]]),
        node(2, 1, "RestSite", [[3, 0]]),
        node(3, 0, "Boss", []),
      ],
      available_nodes: [{ index: 0, row: 1, col: 0, node_type: "Monster" }, { index: 1, row: 1, col: 1, node_type: "Shop" }],
    },
  }));
  const remembered = (): RememberedMap => {
    const memory = createScreenMemory("MAP");
    rememberMap(memory, mapState);
    return memory.lastMap!;
  };

  it("counts node types min–max over the paths to the boss", () => {
    const map = remembered();
    expect(map.current).toEqual({ row: 0, col: 0 });
    expect(map.boss).toEqual({ row: 3, col: 0 });
    const spans = pathSpans(map, { row: 0, col: 0 })!;
    expect(spans.next).toEqual(["Monster", "Shop"]);
    expect(spans.span["Shop"]).toEqual([0, 1]);
    expect(spans.span["Elite"]).toEqual([0, 1]);
    expect(spans.span["RestSite"]).toEqual([0, 1]);
    expect(spans.span["Monster"]).toEqual([0, 1]);
    expect(spans.span["Boss"]).toBeUndefined();

    const text = renderLookahead(mapState, map, null);
    expect(text).toContain("距 boss 3 层");
    expect(text).toContain("精英 0–1");
    expect(text).toContain("宝箱 0");
    expect(text).toContain("下一个节点可选: Monster/Shop");
    expect(text).toContain("boss 要点: 173 血");
  });

  it("follows the chosen node until the next map, and says when the next node is forced", () => {
    const journal = new RunJournal();
    const map = remembered();
    journal.record(mapState, entry({ label: "map/route", by: "jev", intent: { action: "choose_map_node", option_index: 1 } }));
    expect(journal.position).toEqual({ row: 1, col: 1, fromFloor: 1 });
    const shop = parseGameState(baseState("SHOP", { run: runPayload({ floor: 2, act_id: "0", boss_id: "VANTOM_BOSS" }) }));
    const text = journal.render(shop, testKnowledge, map).lookahead;
    expect(text).toContain("距 boss 2 层");
    expect(text).toContain("下一个节点强制: RestSite");
    expect(text).toContain("休息 1");
    // A map from another act says nothing about this one.
    const nextAct = parseGameState(baseState("SHOP", { run: runPayload({ floor: 18, act_id: "1", boss_id: "KNOWLEDGE_DEMON_BOSS" }) }));
    expect(journal.render(nextAct, testKnowledge, map).lookahead).toMatch(/^boss 要点: 379 血/);
  });
});
