/** Run memory for the DeepSeek escalator: journal, fight log and map lookahead. */

import { describe, expect, it } from "vitest";

import { parseGameState, type GameState } from "../src/mod/schema.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { bossNote, describeChoice, isBrainDecider, journalTag, memoryChars, memorySections, pathSpans, renderLookahead, routeText, RunJournal, UNVERIFIED_REASON_PREFIX, upgradedName, type JournalEntry } from "../src/project/run-journal.js";
import { brainDecider } from "../src/loop.js";
import { runPlanLine } from "../src/strategy/run-plan.js";
import type { RoutePlan } from "../src/screens/map.js";
import type { AskDecision } from "../src/project/types.js";
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

function combat(turn: number, hp: number, enemyHp: number, runId = "TESTRUN123", run: Raw = {}): GameState {
  const raw = combatPayload({ enemyHp });
  raw["turn"] = turn;
  raw["run_id"] = runId;
  raw["run"] = runPayload(run);
  ((raw["combat"] as Raw)["player"] as Raw)["current_hp"] = hp;
  return parseGameState(raw);
}

const act0 = (floor: number): string => String(floor <= 17 ? 0 : floor <= 33 ? 1 : 2);
const at = (screen: string, floor: number, run: Raw = {}, extra: Raw = {}): GameState =>
  parseGameState(baseState(screen, { run: runPayload({ floor, act_id: act0(floor), ascension: 8, ...run }), ...extra }));

describe("run journal: the complete run context", () => {
  it("a 48-floor run keeps every decision and every fight, grouped by act, and resets on a new run", () => {
    const journal = new RunJournal();
    let decisions = 0;
    let fights = 0;
    for (let floor = 1; floor <= 48; floor += 1) {
      const hp = 80 - (floor % 30);
      if (floor % 2 === 0) {
        // a fight: first combat state, a later turn, then the reward screen
        fights += 1;
        journal.observe(combat(1, hp, 40, "TESTRUN123", { floor, act_id: act0(floor), current_hp: hp }), { knowledge: testKnowledge });
        journal.observe(combat(3, hp - 4, 10, "TESTRUN123", { floor, act_id: act0(floor), current_hp: hp - 4 }), { knowledge: testKnowledge });
        journal.observe(at("REWARD", floor, { current_hp: hp - 5 }));
      }
      const state = at("EVENT", floor, { current_hp: hp - 5 });
      journal.observe(state);
      journal.record(state, entry({ label: "event/choose", by: "deepseek", choice: `pick-${floor}-a`, reason: `why-${floor}` }));
      decisions += 1;
      if (floor % 4 === 1) {
        journal.record(state, entry({ label: "rest/choose", by: "code", choice: `rest-${floor}` }));
        decisions += 1;
      }
      // Jev's route steps and code's proceed clicks are not key decisions.
      journal.record(state, entry({ label: "reward/proceed", by: "code", choice: "proceed" }));
    }
    expect(fights).toBe(24);
    expect(decisions).toBe(60);
    const final = at("MAP", 48, { current_hp: 40 });
    const memory = journal.render(final, testKnowledge, {});
    // Floors 1–47 are history; floor 48 (the one the run is on) is this_floor.
    const all = `${memory.history}\n${memory.this_floor}`;
    const floorBlock = (floor: number): string => {
      const lines = all.split("\n");
      const start = lines.findIndex((line) => line.startsWith(`F${floor} `) || line === `F${floor}` || line.startsWith(`本层至今（F${floor}`));
      const end = lines.findIndex((line, index) => index > start && /^(F\d+|本层至今)/.test(line));
      return lines.slice(start, end < 0 ? undefined : end).join("\n");
    };
    for (let floor = 1; floor <= 48; floor += 1) {
      const block = floorBlock(floor);
      expect(block).toContain(` event/choose [DS]: pick-${floor}-a — 未核实理由: why-${floor}`);
      if (floor % 4 === 1) expect(block).toContain(` rest/choose [code]: rest-${floor}`);
      const hp = 80 - (floor % 30);
      if (floor % 2 === 0) expect(block).toContain(` 战斗 JAW_WORM+CULTIST: ${hp}→${hp - 5}/80`);
      if (floor < 48) expect(memory.history).toMatch(new RegExp(`^F${floor} · HP${hp - 5}(/80)? ¥`, "m"));
    }
    expect(memory.this_floor).toContain("本层至今（F48");
    expect(all).not.toContain("reward/proceed");
    expect(all.split("\n").filter((line) => / (event|rest)\/choose \[/.test(line))).toHaveLength(60);
    expect(all.split("\n").filter((line) => line.startsWith(" 战斗 "))).toHaveLength(24);
    for (const act of [1, 2, 3]) expect(memory.history).toContain(`第${act}幕:`);
    // No per-turn detail in the fights: one line each, nothing about turns.
    expect(all.split("\n").filter((line) => line.startsWith(" 战斗 ")).join("\n")).not.toMatch(/回合|T3/);
    expect(memoryChars(memory)).toBeGreaterThan(3000);

    const next = at("MAP", 1, {}, { run_id: "OTHERRUN" });
    journal.observe(next);
    expect(journal.choices).toEqual([]);
    expect(journal.fights).toEqual([]);
    const fresh = journal.render(next, testKnowledge, {});
    expect(fresh.history).toBe("");
    expect(fresh.this_floor).toBe("");
  });

  it("tracks the deck, relics, potions and max HP from the states it sees", () => {
    const journal = new RunJournal();
    const base = runPayload() as Raw;
    const deck = base["deck"] as Raw[];
    journal.observe(at("MAP", 3));
    // F4: a card reward adds Anger; a relic and a potion come from the chest; max HP goes up.
    const anger = { ...deck[0]!, index: 5, card_id: "ANGER", name: "Anger" };
    journal.observe(at("REWARD", 4, { deck: [...deck, anger] }));
    const relics = [...(base["relics"] as Raw[]), { index: 1, relic_id: "ANCHOR", name: "Anchor" }];
    const potions = base["potions"] as Raw[];
    const twoPotions = [potions[0]!, { ...potions[0]!, index: 1, potion_id: "BLOCK_POTION", name: "Block Potion" }];
    journal.observe(at("CHEST", 5, { deck: [...deck, anger], relics, potions: twoPotions, max_hp: 86 }));
    // F6 fight: the Fire Potion is drunk.
    const fight = combatPayload();
    fight["run"] = runPayload({ floor: 6, act_id: "0", deck: [...deck, anger], relics, potions: [potions[1]!, twoPotions[1]!], max_hp: 86 });
    journal.observe(parseGameState(fight), { knowledge: testKnowledge });
    // F7 rest: Strike upgraded; F8 shop: Defend removed.
    const upgraded = deck.map((card, index) => (index === 0 ? { ...card, upgraded: true, name: "STRIKE_R+" } : card));
    journal.observe(at("REST", 7, { deck: [...upgraded, anger], relics, potions: [potions[1]!, twoPotions[1]!], max_hp: 86 }));
    const removed = upgraded.filter((card) => card["card_id"] !== "DEFEND_R");
    journal.observe(at("SHOP", 8, { deck: [...removed, anger], relics, potions: [potions[1]!, twoPotions[1]!], max_hp: 86 }));
    const memory = journal.render(at("SHOP", 8, { deck: [...removed, anger], relics, max_hp: 86 }), testKnowledge, {});
    expect(memory.history).toMatch(/^F4 · HP55 ¥214\n \+卡 Anger\(奖励\)$/m);
    expect(memory.history).toMatch(/^F5 · HP55\/86 ¥214\n \+遗物 Anchor\(宝箱\); \+药 Block Potion\(宝箱\); 上限 80→86\(宝箱\)$/m);
    expect(memory.history).toContain(" 用药 Fire Potion(战斗)");
    expect(memory.history).toContain(" 战斗 JAW_WORM+CULTIST: 55→55/80 药:Fire Potion");
    expect(memory.history).toMatch(/^F7 · HP55 ¥214\n 升级 STRIKE_R\(休息\)$/m);
    // F8 is the floor the run is on.
    expect(memory.this_floor).toContain(" -卡 DEFEND_R(商店)");
  });

  it("shows every route plan, re-plans with their reason, and the current act's progress", () => {
    const journal = new RunJournal();
    const plan: RoutePlan = {
      runId: "TESTRUN123",
      act: 1,
      floor: 1,
      hpPct: 1,
      summary: "",
      path: [
        { row: 1, col: 0, type: "Monster", hpOnArrival: 1 },
        { row: 2, col: 0, type: "Elite", hpOnArrival: 0.8 },
        { row: 3, col: 1, type: "RestSite", hpOnArrival: 0.6 },
        { row: 4, col: 1, type: "Shop", hpOnArrival: 0.7 },
      ],
    };
    const mapAt = (floor: number, nodes: { index: number; row: number; col: number; node_type: string }[]): GameState =>
      at("MAP", floor, {}, { map: { available_nodes: nodes, nodes: [] } });
    const f1 = mapAt(1, [{ index: 0, row: 1, col: 0, node_type: "Monster" }]);
    journal.observe(f1, { screenMemory: { routePlan: plan } });
    journal.record(f1, entry({ label: "map/route-plan", by: "deepseek", choice: "route Monster -> Elite -> RestSite -> Shop", intent: { action: "choose_map_node", option_index: 0 } }));
    const f2 = mapAt(2, [{ index: 0, row: 2, col: 0, node_type: "Elite" }]);
    journal.observe(f2, { screenMemory: { routePlan: plan } });
    journal.record(f2, entry({ label: "map/route-follow", by: "code", choice: "follow", intent: { action: "choose_map_node", option_index: 0 } }));
    let memory = journal.render(f2, testKnowledge, { routePlan: plan });
    expect(memory.history).toContain(" 路线规划（第1幕 F1 定，当时 HP 100%）: 怪→精→休→店→王");
    expect(memory.route).toBe("本幕进度（按 F1 的路线）: 已走 2/4 [怪精] | 下一步 休（预计 HP 60%） | 剩余 2: 休→店→王");
    const replan: RoutePlan = { ...plan, floor: 3, hpPct: 0.3, why: "card-reward review", path: [{ row: 3, col: 2, type: "RestSite", hpOnArrival: 0.3 }, { row: 4, col: 2, type: "Treasure", hpOnArrival: 0.6 }] };
    const f3 = mapAt(3, [{ index: 0, row: 3, col: 2, node_type: "RestSite" }]);
    journal.observe(f3, { screenMemory: { routePlan: replan } });
    memory = journal.render(f3, testKnowledge, { routePlan: replan });
    expect(memory.history).toContain(" 路线规划（第1幕 F1 定");
    expect(memory.this_floor).toContain(" 路线重规划（card-reward review）（第1幕 F3 定，当时 HP 30%）: 休→宝→王");
    expect(`${memory.history}${memory.this_floor}`).not.toContain("王→王");
    expect(memory.route).toContain("本幕进度（按 F3 的路线）: 已走 0/2");
    // The route plan decision itself is in the history.
    expect(memory.history).toContain("\nF1 · HP55/80 ¥214\n 路线规划（第1幕 F1 定，当时 HP 100%）: 怪→精→休→店→王\n map/route-plan [DS]: route Monster -> Elite -> RestSite -> Shop\nF2 ");
  });

  it("every question gets the same sections, including the boss's monster-DB entry and the act's threats", () => {
    const journal = new RunJournal();
    const state = at("MAP", 10, { boss_id: "VANTOM_BOSS", act_id: "0" });
    const memory = journal.render(state, testKnowledge, {});
    // Most stable first: the act block, the append-only history, then what changes between questions.
    expect(Object.keys(memory)).toEqual(["act", "history", "now", "this_floor", "route", "lookahead", "knowledge"]);
    expect(memory.now).toContain("现状: 第1幕 F10 | HP 55/80 | 金币 214");
    expect(memory.now).toContain("牌组 5 张: STRIKE_R×2, DEFEND_R, BASH+, INFLAME");
    expect(memory.now).toContain("构筑: 5 张 (攻击 3/技能 1/能力 1) | 升级 1 |");
    expect(memory.act).toMatch(/VANTOM\) A8: HP .* \(n=\d+\)/);
    expect(memory.act).toContain("我方战绩");
    expect(memory.act).toContain("第1幕 boss: ");
    expect(memory.act).toContain("精英");
    expect(memory.act.indexOf("精英")).toBeLessThan(memory.act.indexOf("第1幕 boss"));
    // A question that carries its own facts gets no second copy of them.
    expect(journal.render(state, testKnowledge, {}, { factsCovered: true }).now).toBe("");
  });
});

describe("display: one plus per upgrade, one boss per route, nothing cut (audit 2026-09-28)", () => {
  it("an upgraded card whose game name already ends in + is shown with one +", () => {
    expect(upgradedName("痛击+", true)).toBe("痛击+");
    expect(upgradedName("痛击", true)).toBe("痛击+");
    expect(upgradedName("痛击", false)).toBe("痛击");
    const base = runPayload() as Raw;
    const deck = (base["deck"] as Raw[]).map((card) => (card["card_id"] === "BASH" ? { ...card, name: "痛击+", upgraded: true } : card));
    const memory = new RunJournal().render(at("MAP", 5, { deck }), testKnowledge, {});
    expect(memory.now).toContain("痛击+");
    expect(memory.now).not.toContain("++");
  });

  it("an upgrade noticed between states is not rendered ++ either", () => {
    const journal = new RunJournal();
    const base = runPayload() as Raw;
    const deck = base["deck"] as Raw[];
    const plain = deck.map((card) => (card["card_id"] === "BASH" ? { ...card, name: "痛击", upgraded: false } : card));
    journal.observe(at("REST", 6, { deck: plain }));
    const up = deck.map((card) => (card["card_id"] === "BASH" ? { ...card, name: "痛击+", upgraded: true } : card));
    journal.observe(at("REST", 6, { deck: up }));
    journal.observe(at("SHOP", 7, { deck: up.filter((card) => card["card_id"] !== "BASH") }));
    const memory = journal.render(at("SHOP", 7), testKnowledge, {});
    const text = `${memory.history}\n${memory.this_floor}`;
    expect(text).toContain("升级 痛击(休息)");
    expect(text).toContain("-卡 痛击+(商店)");
    expect(text).not.toContain("++");
  });

  it("a planned path that ends at the Boss node shows the boss once, in the plan and in what is left", () => {
    expect(routeText([{ type: "Monster" }, { type: "RestSite" }, { type: "Boss" }])).toBe("怪→休→王");
    expect(routeText([{ type: "Monster" }, { type: "RestSite" }])).toBe("怪→休→王");
    expect(routeText([{ type: "Boss" }])).toBe("王");
    const journal = new RunJournal();
    const plan: RoutePlan = {
      runId: "TESTRUN123",
      act: 1,
      floor: 14,
      hpPct: 0.8,
      summary: "",
      path: [
        { row: 14, col: 0, type: "RestSite", hpOnArrival: 0.6 },
        { row: 15, col: 0, type: "Boss", hpOnArrival: 0.9 },
      ],
    };
    const state = at("MAP", 14, {}, { map: { available_nodes: [{ index: 0, row: 14, col: 0, node_type: "RestSite" }], nodes: [] } });
    journal.observe(state, { screenMemory: { routePlan: plan } });
    journal.record(state, entry({ label: "map/route-follow", by: "code", choice: "follow", intent: { action: "choose_map_node", option_index: 0 } }));
    const memory = journal.render(state, testKnowledge, { routePlan: plan });
    expect(memory.this_floor).toContain("当时 HP 80%）: 休→王");
    expect(memory.route).toContain("剩余 1: 王");
    expect(`${memory.this_floor}${memory.route}`).not.toContain("王→王");
  });

  it("the run plan, route re-plan reason and option text are kept whole", () => {
    const summary = "want DEMON_FORM for scaling; ".repeat(20);
    const line = runPlanLine({ runId: "R", act: 1, floor: 1, hpPct: 1, trigger: "start", archetype: "strength", want: ["DEMON_FORM"], avoid: [], remove: [], blockTarget: null, elites: "normal", rest: "auto", bossPrep: "", summary } as never)!;
    expect(line).toContain(summary.trim());
    expect(line).toContain("want DEMON_FORM");
    const journal = new RunJournal();
    const state = parseGameState(baseState("EVENT"));
    journal.noteRunPlan(state, "start", line);
    expect(journal.choices[0]!.choice.length).toBeGreaterThan(300);
    const long = "x".repeat(200);
    journal.record(state, entry({ label: "event/choose", choice: long }));
    expect(journal.choices[1]!.choice).toBe(long);
  });

  it("the size of every memory section is measurable for the log", () => {
    const memory = new RunJournal().render(at("MAP", 10, { boss_id: "VANTOM_BOSS", act_id: "0" }), testKnowledge, {});
    const sections = memorySections(memory);
    expect(Object.keys(sections)).toEqual(Object.keys(memory));
    expect(Object.values(sections).reduce((a, b) => a + b, 0)).toBe(memoryChars(memory));
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
    // The note's numbers are the monster DB's at this ascension, not hand-written ones stripped afterwards.
    expect(text).toMatch(/boss 要点: \d+ 血，开场 \d+ 层滑溜/);
    expect(text).not.toMatch(/\{[A-Z]+:/);
  });

  it("follows the chosen node until the next map, and says when the next node is forced", () => {
    const journal = new RunJournal();
    const map = remembered();
    journal.record(mapState, entry({ label: "map/route", by: "jev", intent: { action: "choose_map_node", option_index: 1 } }));
    expect(journal.position).toEqual({ row: 1, col: 1, fromFloor: 1, act: 1, type: "Shop" });
    const shop = parseGameState(baseState("SHOP", { run: runPayload({ floor: 2, act_id: "0", boss_id: "VANTOM_BOSS" }) }));
    const text = journal.render(shop, testKnowledge, { lastMap: map }).lookahead;
    expect(text).toContain("距 boss 2 层");
    expect(text).toContain("下一个节点强制: RestSite");
    expect(text).toContain("休息 1");
    // A map from another act says nothing about this one.
    const nextAct = parseGameState(baseState("SHOP", { run: runPayload({ floor: 18, act_id: "1", boss_id: "KNOWLEDGE_DEMON_BOSS" }) }));
    expect(journal.render(nextAct, testKnowledge, { lastMap: map }).lookahead).toMatch(/^boss 要点: /);
  });

  it("two next nodes of one type are a choice, not forced (batch E: \"下一个节点强制: Treasure\" with two Treasures)", () => {
    const twin = parseGameState(baseState("MAP", {
      run: runPayload({ floor: 1, act_id: "0", boss_id: "VANTOM_BOSS" }),
      map: {
        current_node: { row: 0, col: 0 },
        boss_node: { row: 2, col: 0 },
        nodes: [node(0, 0, "Ancient", [[1, 0], [1, 1]]), node(1, 0, "Treasure", [[2, 0]]), node(1, 1, "Treasure", [[2, 0]]), node(2, 0, "Boss", [])],
        available_nodes: [{ index: 0, row: 1, col: 0, node_type: "Treasure" }, { index: 1, row: 1, col: 1, node_type: "Treasure" }],
      },
    }));
    const memory = createScreenMemory("MAP");
    rememberMap(memory, twin);
    const text = renderLookahead(twin, memory.lastMap!, null);
    expect(text).toContain("下一个节点可选: Treasure x2");
    expect(text).not.toContain("强制");
  });
});

describe("run journal keeps the option's own text, not the escalator's guess (VC4L F22)", () => {
  const criterion = JSON.stringify({ option: "靠近", description: "一张攻击牌附魔[gold]腐化[/gold]。", lethal: false });
  const decision: AskDecision = {
    kind: "ask",
    label: "event/choose",
    state: {},
    questions: { pick: { type: "choice", instructions: "Which option?", criteria: { o0: criterion, o1: "{\"option\":\"用火烧杀\"}" } } } as never,
    resolve: () => ({ intent: null, rationale: "", confidence: null, fallback: false }),
    escalate: { question: "pick", below: 0.5, why: "" },
  };

  it("the choice is the chosen option's title and game text", () => {
    const choice = describeChoice(decision, { intent: null, rationale: "", confidence: 0.6, fallback: false }, undefined, { choice: "o0", reason: "腐化约等于费用归零" });
    expect(choice).toBe("靠近: 一张攻击牌附魔腐化。");
  });

  it("a kept reason is labelled unverified and kept whole (whitespace folded only)", () => {
    const journal = new RunJournal();
    const state = parseGameState(baseState("EVENT"));
    const long = "腐化附魔约等于费用归零，".repeat(10);
    journal.record(state, entry({ label: "event/choose", choice: "靠近: 一张攻击牌附魔腐化。", reason: `${long}\n\n  Ascender's Bane is eternal,   so take the curse removal later.` }));
    const reason = journal.choices[0]!.reason;
    expect(reason.startsWith(UNVERIFIED_REASON_PREFIX)).toBe(true);
    expect(reason).toBe(`${UNVERIFIED_REASON_PREFIX}${long} Ascender's Bane is eternal, so take the curse removal later.`);
    expect(reason).not.toContain("…");
    const later = parseGameState(baseState("MAP", { run: runPayload({ floor: 99 }) }));
    const rendered = journal.render(later, testKnowledge, {}).history;
    expect(rendered).toContain("靠近: 一张攻击牌附魔腐化。 — 未核实理由: 腐化附魔约等于费用归零");
    expect(rendered).toContain("未核实理由 = DeepSeek 当时所写，不是事实");
    journal.record(state, entry({ label: "reward/card", choice: "took Inflame", reason: "" }));
    expect(journal.choices[1]!.reason).toBe("");
  });
});

describe("boss notes carry the monster DB's numbers at this ascension, and every mechanic (review 2026-09-29 #9)", () => {
  const dmg = (bases: Record<string, number>, hits = 1) => ({
    damage_by_asc: Object.fromEntries(Object.entries(bases).map(([asc, base]) => [asc, { base_per_hit: { [String(base)]: 4 }, hits: { [String(hits)]: 4 } }])),
  });
  // A fixture DB (the real one refreshes after every run): A8 and A9 numbers as logged.
  const monsters = {
    CEREMONIAL_BEAST: {
      hp_by_asc: { "8": { median: 262, n: 22 } },
      moves: { PLOW_MOVE: { ...dmg({ "8": 18 }), self_powers_gained_by_asc: { "8": { STRENGTH_POWER: { "2": 54 } } } } },
      powers: { PLOW_POWER: { type: "Debuff", amount_at_first_sight: { "150": 33 }, amount_at_first_sight_by_asc: { "8": { "150": 22 } } } },
    },
    LAGAVULIN_MATRIARCH: {
      hp_by_asc: { "7": { median: 222, n: 4 }, "8": { median: 233, n: 24 }, "9": { median: 233, n: 1 } },
      moves: { SLASH_MOVE: dmg({ "8": 19, "9": 21 }), DISEMBOWEL_MOVE: dmg({ "8": 9, "9": 10 }, 2) },
      powers: { PLATING_POWER: { type: "Buff", amount_at_first_sight: { "12": 46 }, amount_at_first_sight_by_asc: { "8": { "12": 24 } } } },
    },
    ROCKET: {
      moves: { LASER_MOVE: { ...dmg({ "8": 31, "9": 35 }), back_attack_by_asc: { "8": { behind: 24, facing: 5 } } } },
    },
    QUEEN: { hp_by_asc: { "7": { median: 400, n: 2 }, "8": { median: 419, n: 5 } }, moves: {} },
    TORCH_HEAD_AMALGAM: { hp_by_asc: { "7": { median: 199, n: 2 }, "8": { median: 211, n: 5 } }, moves: {} },
    TEST_SUBJECT: { hp_by_asc: { "8": { median: 111, n: 3 } }, moves: { BIG_POUNCE: dmg({ "8": 45 }), MULTI_CLAW_MOVE: dmg({ "8": 10 }, 3) } },
  };
  const withDb = <T>(run: () => T): T => {
    setMonsterDbForTests({ bosses: {}, encounters: {}, monsters } as never);
    try {
      return run();
    } finally {
      setMonsterDbForTests(null);
    }
  };

  it("the Beast keeps its stun threshold and the Matriarch its wake-up rule: nothing is regex-stripped", () => {
    withDb(() => {
      const beast = bossNote("CEREMONIAL_BEAST_BOSS", 9)!;
      expect(beast).toContain("262 血");
      // Plow and Plating logged at A8 only (nothing here measures an A8 -> A9 change): A8's, marked estimated.
      expect(beast).toContain("首次跌破 ≈150 血被击晕一回合");
      expect(bossNote("CEREMONIAL_BEAST_BOSS", 8)).toContain("首次跌破 150 血被击晕一回合");
      const matriarch = bossNote("LAGAVULIN_MATRIARCH_BOSS", 9)!;
      expect(matriarch).toContain("掉 1 血就醒");
      expect(matriarch).toContain("233 血，开场沉睡 + ≈12 覆甲");
      // A9's hits, not the A0/A8 "19、9×2".
      expect(matriarch).toContain("醒后 21、10×2");
      expect(bossNote("LAGAVULIN_MATRIARCH_BOSS", 8)).toContain("醒后 19、9×2");
      // The lookahead DeepSeek reads carries the same note.
      const state = parseGameState(baseState("SHOP", { run: runPayload({ floor: 5, act_id: "0", ascension: 9, boss_id: "CEREMONIAL_BEAST_BOSS" }) }));
      expect(renderLookahead(state, undefined, null)).toContain("首次跌破 ≈150 血被击晕一回合");
    });
  });

  it("the crab's Laser, the Queen's HP and the Test Subject's Pounce at this ascension, marked when estimated", () => {
    withDb(() => {
      expect(bossNote("KAISER_CRAB_BOSS", 9)).toContain("激光 35，在背后 52");
      expect(bossNote("KAISER_CRAB_BOSS", 9)).not.toContain("47–49");
      expect(bossNote("QUEEN_BOSS", 9)).toContain("女王 419 + 聚合体 211");
      expect(bossNote("QUEEN_BOSS", 7)).toContain("女王 400 + 聚合体 199");
      // Pounce never logged at A9: A8's 45 x the A8 -> A9 ratio (Laser 31 -> 35, Slash 19 -> 21, Disembowel 9 -> 10), marked.
      const ratio = (35 + 21 + 10) / (31 + 19 + 9);
      expect(bossNote("TEST_SUBJECT_BOSS", 9)).toContain(`猛扑 ≈${Math.round(45 * ratio)}`);
      expect(bossNote("TEST_SUBJECT_BOSS", 8)).toContain("猛扑 45");
      expect(bossNote("TEST_SUBJECT_BOSS", 8)).toContain("多段爪 10×3 起");
      // Nothing the DB lacks is filled with an old number.
      for (const id of ["VANTOM", "THE_KIN", "AEONGLASS"]) expect(bossNote(id, 9)).not.toMatch(/\{[A-Z]+:/);
    });
  });
});

describe("the decider names the engine that answered (2026-10-03); the run memory reads as before", () => {
  it("brainDecider: the engine, with the one it stood in for after a fallback; plain v3 DeepSeek is deepseek", () => {
    expect(brainDecider(undefined)).toBe("deepseek");
    expect(brainDecider({ engine: "codex" })).toBe("codex");
    expect(brainDecider({ engine: "deepseek", fell_back_from: { engine: "codex", error: "codex timed out after 600000 ms" } })).toBe("deepseek (for codex)");
    expect(brainDecider({ engine: "claude", fell_back_from: { engine: "codex", error: "x" } })).toBe("claude (for codex)");
  });

  it("every brain decider counts as a model's decision; code, jev and code-fallback do not", () => {
    for (const by of ["deepseek", "codex", "claude", "dsh", "deepseek (for codex)", "claude (for codex)", "deepseek (for claude)"]) expect(isBrainDecider(by)).toBe(true);
    for (const by of ["code", "jev", "code-fallback", "jev-plan", "deepseek-plan", "", "codex (for jev)", "deepseek (for codex"]) expect(isBrainDecider(by)).toBe(false);
    expect(["deepseek", "codex", "deepseek (for codex)", "claude", "code", "jev"].map(journalTag)).toEqual(["DS", "DS", "DS", "claude", "code", "jev"]);
  });

  it("a codex or fallback decision is kept with its reason and tagged DS, exactly as a deepseek one was: the prompt does not change", () => {
    const render = (by: (floor: number) => string): string => {
      const journal = new RunJournal();
      for (let floor = 1; floor <= 6; floor += 1) {
        const state = at("EVENT", floor, { current_hp: 60 });
        journal.observe(state);
        // A non-key label too (map/route-change): only a model's decision keeps it.
        journal.record(state, entry({ label: floor % 2 ? "event/choose" : "map/route-change", by: by(floor), choice: `pick-${floor}`, reason: `why-${floor}` }));
      }
      const memory = journal.render(at("MAP", 7, { current_hp: 60 }), testKnowledge, {});
      return `${memory.history}\n${memory.this_floor}`;
    };
    const before = render(() => "deepseek");
    expect(before).toContain(" map/route-change [DS]: pick-2 — 未核实理由: why-2");
    expect(render((floor) => (floor % 3 === 0 ? "deepseek (for codex)" : "codex"))).toBe(before);
    // Code's own pick of a non-key label is not kept (as before).
    expect(render(() => "code")).not.toContain("map/route-change");
  });
});
