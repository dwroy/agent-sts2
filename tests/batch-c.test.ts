/**
 * Fix batch C (notes/fix-queue.md, from the 2026-09-29 post-mortems in notes/lessons.md): pure bugs in
 * combat, selection, shop, events, DeepSeek logging and the facts. One describe per fix; boards are
 * synthetic or logged fixtures (tests/logged-states), never the refreshing knowledge files.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import { annotateEnchants, enchantsNamed } from "../src/knowledge/enchant-text.js";
import { checkConsistency } from "../src/llm/consistency.js";
import type { AskDecision } from "../src/project/types.js";
import { bossNote } from "../src/project/run-journal.js";
import { revealsLater } from "../src/screens/act-start.js";
import { guardSandpit, planCombatTurn } from "../src/screens/combat-plan.js";
import { combatExhaustScore, planSelection } from "../src/screens/selection.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { illusionFocusOrders, type KillOrder } from "../src/strategy/rollout.js";
import { ROLLOUT_BUDGET_MS, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { dominates, type Plan } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv } from "./logged.js";
import { board, decide, env as oneshotEnv, optionsOf } from "./oneshot-support.js";

const choose = (key: string, confidence: number): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;

function planCriteria(decision: ReturnType<typeof planCombatTurn>): Record<string, string> {
  if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind} ${decision?.kind === "act" ? decision.label : ""}`);
  const question = decision.questions["plan"];
  if (question?.type !== "choice") throw new Error("expected a plan choice");
  return Object.fromEntries(Object.entries(question.criteria ?? {}).map(([key, text]) => [key, String(text)]));
}

describe("1. A cut-short line's drink is re-planned with the new hand, not drunk as a stale step (XMK1JFZ0VD2Q F33 T3)", () => {
  it("Battle Trance cuts Jev's line; the Blood Potion is offered again beside the drawn cards, not drunk by code", () => {
    // Logged: Jev chose "战斗专注, 上勾拳, 防御, potion 鲜血药水" at 76/87; Battle Trance drew Pyre, Fight Me+ and
    // Inferno, and code drank the Blood Potion "from the Jev-chosen line before re-planning" (11 of 17 healed).
    const ask = loggedEnv(logged("xmk1-f33-t3-ask"));
    const criteria = planCriteria(planCombatTurn(ask));
    const chosen = Object.entries(criteria).find(([key, text]) => key.startsWith("plan") && /"plays":"战斗专注, then 上勾拳 -> 无厌沙虫, then 防御, then potion 鲜血药水"/.test(text));
    if (!chosen) throw new Error("the logged line is not offered");
    (planCombatTurn(ask) as AskDecision).resolve(choose(chosen[0], 0.64)).apply?.();
    const cut = logged("xmk1-f33-t3-cut");
    expect(cut.decision.label).toBe("combat/plan-potion");
    const decision = planCombatTurn({ ...loggedEnv(cut), screenMemory: ask.screenMemory });
    expect(decision?.kind === "act" && decision.intent.action === "use_potion").toBe(false);
    const again = planCriteria(decision);
    // The drink is a choice again: lines with and without it, over the new hand.
    expect(Object.values(again).some((text) => text.includes("potion 鲜血药水"))).toBe(true);
    expect(Object.values(again).some((text) => !text.includes("potion ") && text.includes("与我一战！+"))).toBe(true);
  });
});

describe("2. A finished Jev line is \"stop here\"; One-Two Punch read; a Giant kill into its blast is not dominant (9Q7VBZ7TP29K F17 T14)", () => {
  /** Jev's "One-Two Punch" alone chosen on the logged ask board; the memory after it is applied. */
  function afterJevLine() {
    const ask = loggedEnv(logged("9q7v-f17-t14-ask"));
    const criteria = planCriteria(planCombatTurn(ask));
    const chosen = Object.entries(criteria).find(([, text]) => /"plays":"连环拳"/.test(text));
    if (!chosen) throw new Error("the logged line is not offered");
    (planCombatTurn(ask) as AskDecision).resolve(choose(chosen[0], 0.75)).apply?.();
    return { memory: ask.screenMemory, after: logged("9q7v-f17-t14-after") };
  }

  it("after Jev's one-step line, code does not play the Sword Boomerang it turned down: Jev's call, ending the turn offered", () => {
    const { memory, after } = afterJevLine();
    expect(after.decision.rationale).toMatch(/only distinct line\): 飞剑回旋镖/);
    // A plain enemy (no blast): Sword Boomerang doubled beats ending the turn on every axis, so without the
    // "stop here" code would play it on its own.
    const enemy = ((after.state["combat"] as Record<string, unknown>)["enemies"] as Record<string, unknown>[])[0]!;
    enemy["powers"] = [];
    enemy["current_hp"] = 120;
    const decision = planCombatTurn({ ...loggedEnv(after), screenMemory: memory });
    expect(decision?.kind === "act" && decision.intent.action === "play_card").toBe(false);
    const criteria = planCriteria(decision);
    expect(Object.values(criteria).some((text) => /"plays":"nothing \(end the turn now\)"/.test(text))).toBe(true);
    expect(Object.values(criteria).some((text) => /"plays":"飞剑回旋镖"/.test(text))).toBe(true);
    // No usable answer keeps the line's end.
    expect((decision as AskDecision).resolve({}).intent).toEqual({ action: "end_turn" });
    // A code-chosen line has no such stop: the same board re-planned without Jev's memo is code's to play.
    const fresh = planCombatTurn(loggedEnv(after));
    expect(fresh?.kind === "act" && fresh.intent.action).toBe("play_card");
  });

  it("a finished line still takes a potion-free lethal the solver now sees (the enemy took more than planned)", () => {
    const { memory, after } = afterJevLine();
    // A plain enemy at 10 HP (no blast): Sword Boomerang doubled is a win.
    const enemy = ((after.state["combat"] as Record<string, unknown>)["enemies"] as Record<string, unknown>[])[0]!;
    enemy["current_hp"] = 10;
    enemy["powers"] = [];
    const decision = planCombatTurn({ ...loggedEnv(after), screenMemory: memory });
    if (decision?.kind !== "act") throw new Error(`expected an act, got ${decision?.kind}`);
    expect(decision.label).toBe("combat/lethal");
  });

  it("a finished line whose board changed (a card drawn) is re-planned as before: code may play", () => {
    const { memory, after } = afterJevLine();
    const combat = after.state["combat"] as Record<string, unknown>;
    const enemy = (combat["enemies"] as Record<string, unknown>[])[0]!;
    enemy["powers"] = [];
    enemy["current_hp"] = 120;
    const hand = combat["hand"] as Record<string, unknown>[];
    combat["hand"] = [...hand, { ...hand[1], index: hand.length }];
    const decision = planCombatTurn({ ...loggedEnv(after), screenMemory: memory });
    expect(decision?.kind === "act" && decision.intent.action).toBe("play_card");
  });

  it("ONE_TWO_PUNCH_POWER doubles the next Attack: Sword Boomerang kills the 34-HP Giant; that kill into a 56 blast at 31 HP is Jev's call", () => {
    const decision = planCombatTurn(loggedEnv(logged("9q7v-f17-t14-after")));
    // Logged: "code plan (only distinct line): 飞剑回旋镖; hp -0, dmg 18"; it dealt 36.
    const criteria = planCriteria(decision);
    const kill = Object.values(criteria).find((text) => /"plays":"飞剑回旋镖"/.test(text));
    expect(kill).toMatch(/"damage_dealt":34/);
    expect(kill).toMatch(/explodes for 56/);
    expect(Object.values(criteria).some((text) => !/"kills"/.test(text))).toBe(true);
  });

  it("dominance: a Giant kill with a negative blast margin never dominates a non-kill line; a survivable one can", () => {
    const line = (damage: number, explodesNext?: number, eruptionMargin?: number): Plan =>
      ({
        steps: [],
        score: 0,
        outcome: {
          winsFight: false,
          hpLoss: 0,
          hpAfter: 31,
          dies: false,
          blockGained: 0,
          damageDealt: damage,
          kills: explodesNext ? ["Giant"] : [],
          restocked: [],
          enemyHpAfter: [{ index: 0, name: "Giant", hp: explodesNext ? 0 : 34 - damage, vulnerable: 0, weak: 0 }],
          incomingAfterBlock: 0,
          energyLeft: 0,
          vulnerableApplied: 0,
          weakApplied: 0,
          strengthGained: 0,
          cardsDrawn: 0,
          unknownCards: [],
          potionCost: 0,
          sandpitAfter: null,
          startTurnKills: [],
          withersAdded: 0,
          sleepCost: 0,
          lasting: 0,
          blockWasted: 0,
          ...(explodesNext ? { explodesNext, eruptionMargin } : {}),
        },
      }) as unknown as Plan;
    const idle = line(0);
    expect(dominates(line(34, 56, -25), idle)).toBe(false);
    expect(dominates(line(34, 20, 11), idle)).toBe(true);
    expect(dominates(line(34, 56, -25), line(34, 56, -30))).toBe(true);
  });
});

describe("3. The Sandpit deadline: Frantic Escape kept from exhaust picks, least-loss plays it first, code's plays leave energy for it (KY3YZ0DMRY0G F33 T9)", () => {
  const step = (cardId: string, name: string) => ({ cardIndex: -1, cardId, upgraded: false, name, target: null, targetName: null });

  it("Burning Pact's exhaust keeps both Escapes over the planned Defend and Strike (logged: the 1-cost Escape at -50)", () => {
    const fx = logged("ky3y-f33-t9-pact");
    expect(fx.decision.rationale).toMatch(/狂乱逃离 scores -50/);
    const env = loggedEnv(fx);
    env.screenMemory.planBeforeSelection = [step("DEFEND_IRONCLAD", "防御"), step("STRIKE_IRONCLAD", "打击")];
    const decision = planSelection(env);
    if (decision?.kind !== "act") throw new Error(`expected an act, got ${decision?.kind}`);
    const cards = (fx.state["selection"] as Record<string, unknown>)["cards"] as Record<string, unknown>[];
    expect(cards.find((card) => card["index"] === decision.intent.option_index)?.["card_id"]).not.toBe("FRANTIC_ESCAPE");
  });

  it("of two Escapes, the dearer one goes; any other card goes before either, planned or not", () => {
    const context = { attacks: 8, incoming: 30, hp: 14, sandpit: true };
    const cheap = combatExhaustScore("FRANTIC_ESCAPE", "Status", context, false, { cost: 1 });
    const dear = combatExhaustScore("FRANTIC_ESCAPE", "Status", context, false, { cost: 2 });
    expect(dear).toBeGreaterThan(cheap);
    expect(dear).toBeLessThan(combatExhaustScore("DEFEND_IRONCLAD", "Skill", context, true, { block: 5 }) - 8 - 150);
  });

  it("every line dies at Sandpit 1: least-loss plays an affordable Escape first (logged: Burning Pact first)", () => {
    const fx = logged("ky3y-f33-t9");
    expect(fx.decision.rationale).toMatch(/drawing first .*燃烧契约/);
    const decision = planCombatTurn(loggedEnv(fx));
    if (decision?.kind !== "act") throw new Error(`expected an act, got ${decision?.kind}`);
    const hand = ((fx.state["combat"] as Record<string, unknown>)["hand"] as Record<string, unknown>[]);
    expect(hand.find((card) => card["index"] === decision.intent.card_index)?.["card_id"]).toBe("FRANTIC_ESCAPE");
  });

  it("a code play that would leave too little energy for the Escape gives way to it (logged: Defend at 2 energy, 2-cost Escape)", () => {
    const fx = logged("ky3y-f33-t9-drawn");
    const env = loggedEnv(fx);
    const defend = { kind: "act" as const, label: "combat/least-loss", intent: { action: "play_card" as const, card_index: 0 }, rationale: "every simulated line dies; playing the one that keeps the most HP (-8): 防御, 防御" };
    env.screenMemory.plannedAfter = { turn: env.state.turn ?? null, steps: [step("DEFEND_IRONCLAD", "防御")] };
    const guarded = guardSandpit(env, defend);
    if (guarded?.kind !== "act") throw new Error("expected an act");
    expect(guarded.label).toBe("combat/sandpit-guard");
    expect(guarded.intent).toEqual({ action: "play_card", card_index: 1 });
    // A line that plays the Escape next, or a lethal, is left alone.
    env.screenMemory.plannedAfter = { turn: env.state.turn ?? null, steps: [step("FRANTIC_ESCAPE", "狂乱逃离")] };
    expect(guardSandpit(env, defend)).toBe(defend);
    env.screenMemory.plannedAfter = undefined;
    const lethal = { ...defend, label: "combat/lethal" };
    expect(guardSandpit(env, lethal)).toBe(lethal);
  });
});

describe("4. An enchantment named after the card it goes on gets its effect (PHMVUY73R0D7 F21: 「附魔一张攻击牌：活力8」)", () => {
  const logged = "失去[red]6[/red]点生命。[gold]附魔[/gold]一张攻击牌：[purple]活力[/purple][blue]8[/blue]。";

  it("annotateEnchants and enchantsNamed read 附魔<card>：<name>N, markup or not", () => {
    expect(annotateEnchants(logged)).toBe("失去[red]6[/red]点生命。[gold]附魔[/gold]一张攻击牌：[purple]活力[/purple][blue]8[/blue]（活力8: the card deals 8 more damage）。");
    expect(enchantsNamed(logged)).toEqual(["活力8: the card deals 8 more damage"]);
    expect(annotateEnchants("附魔一张攻击牌：活力8。")).toContain("（活力8: the card deals 8 more damage）");
    // The colon right after 附魔 still reads as before; a sentence break is not crossed.
    expect(enchantsNamed("选择一张能力牌附魔：迅速2。")).toEqual(["迅速2: the first time the card is played, draw 2 cards (「第一次打出时抽2张牌」)"]);
    expect(enchantsNamed("附魔。获得：10点格挡")).toEqual([]);
  });
});

describe("Extra: a line aiming only at the illusion is rolled out aiming at it on the later turns too (ZY3992X5VEVS F23 T3-T5)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("the logged T3 board: the rollout's best is no longer the Parafright line (logged: Dominate -> Parafright, True Grit)", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const fx = logged("zy39-f23-t3b");
    const decision = planCombatTurn(loggedEnv(fx)) as AskDecision;
    const criteria = (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria! as Record<string, string>;
    const facts = Object.values(criteria).map((text) => JSON.parse(text) as Record<string, unknown>);
    const parafright = facts.filter((f) => /寄生惧魔/.test(String(f["plays"])) && !/胧光怪/.test(String(f["plays"])));
    expect(parafright.length).toBeGreaterThan(0);
    for (const f of parafright) {
      expect(f["rollout_best"]).toBeUndefined();
      expect(String(f["rollout_kill_order"])).toMatch(/^寄生惧魔 > 胧光怪: .*keep aiming at it first/);
    }
    expect(facts.some((f) => f["rollout_best"] === true && /胧光怪/.test(String(f["plays"])))).toBe(true);
  });

  it("illusionFocusOrders: only lines that put nothing into another enemy are held to the illusion-first order", () => {
    const orders: KillOrder[] = [
      { key: "OBSCURA>PARAFRIGHT", label: "Obscura > Parafright", groups: [[0], [1]], leader: { indices: [0], name: "Obscura" } },
      { key: "PARAFRIGHT>OBSCURA", label: "Parafright > Obscura", groups: [[1], [0]], firstRevives: true, leader: { indices: [0], name: "Obscura" } },
    ];
    const enemies = [
      { index: 0, name: "Obscura", hp: 91, maxHp: 129, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] },
      { index: 1, name: "Parafright", hp: 21, maxHp: 21, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, illusion: true, attacks: [] },
    ];
    const line = (targets: number[], obscuraAfter: number): Plan =>
      ({
        steps: targets.map((target, i) => ({ cardIndex: i, cardId: "STRIKE_IRONCLAD", upgraded: false, name: "Strike", target, targetName: null })),
        outcome: { enemyHpAfter: [{ index: 0, name: "Obscura", hp: obscuraAfter, vulnerable: 0, weak: 0 }, { index: 1, name: "Parafright", hp: 0, vulnerable: 0, weak: 0 }] },
      }) as unknown as Plan;
    expect(illusionFocusOrders(line([1, 1], 91), orders, enemies).map((order) => order?.key)).toEqual(["PARAFRIGHT>OBSCURA"]);
    // Damage into The Obscura too (an AoE, a split line): every order.
    expect(illusionFocusOrders(line([1], 85), orders, enemies)).toHaveLength(2);
    expect(illusionFocusOrders(line([0, 1], 85), orders, enemies)).toHaveLength(2);
    expect(illusionFocusOrders(line([], 91), orders, enemies)).toHaveLength(2);
  });
});

describe("Extra: hand-written knowledge agrees with the experience base (d986a74)", () => {
  const knowledge = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "knowledge");
  const read = (name: string) => readFileSync(join(knowledge, name), "utf8");

  it("The Obscura: damage into it every turn, the Parafright only with spare damage or to save 15+ HP (hint and guide)", () => {
    const hint = (JSON.parse(read("jev-hints.json")) as { hints: { id: string; text: string }[] }).hints.find((entry) => entry.id === "obscura-summoner")!;
    expect(hint.text).toMatch(/Damage The Obscura every turn; Parafright only with spare damage or to save 15\+ HP/);
    expect(hint.text).not.toMatch(/Damage into it is wasted/);
    const guide = read("ironclad-guide.md");
    expect(guide).not.toContain("之后能在约 3 回合内打死胧光怪就集中打它");
    expect(guide).toMatch(/每回合都要有伤害进胧光怪；寄生惧魔只用多余的伤害打/);
  });

  it("Soul Fysh's Beckons go only to a card that exhausts another card from the hand (boss note and guide)", () => {
    expect(bossNote("SOUL_FYSH_BOSS", 9)).toMatch(/能从手牌消耗别的牌的牌清掉（燃烧契约、坚毅、重振精神、恶魔之焰/);
    expect(read("ironclad-guide.md")).not.toContain("→ 用消耗牌清掉");
  });

  it("the guide and handbook quote no experience n (it goes stale with every update); the Earring's first-turn cost is in the handbook", () => {
    for (const name of ["ds-handbook.md", "ironclad-guide.md"]) expect(read(name), name).not.toMatch(/\bn=\d/);
    expect(read("ds-handbook.md")).toMatch(/每场战斗（精英、boss 也一样）的第 1 回合由瓦库代打.*7 个第 1 回合我方只打出 1 张牌、喝了 5 瓶药/);
  });
});

describe("5. The enchant screen carries no removal-style ranking (PHMVUY73R0D7 F20: code_rank 1-13, upgraded -8, \"code's ranking for this pick\")", () => {
  it("DeepSeek's options have no code_value or code_rank, an honest why; the upgraded cards are not marked down", () => {
    const fx = logged("phmv-f20-enchant");
    const decision = planSelection({ ...loggedEnv(fx), buildDecider: "deepseek" }) as AskDecision;
    expect(decision.kind).toBe("ask");
    const criteria = decision.questions["pick"]!.type === "choice" ? decision.questions["pick"]!.criteria : {};
    const options = Object.values(criteria).map((text) => JSON.parse(String(text)) as Record<string, unknown>);
    expect(options.length).toBeGreaterThan(10);
    for (const option of options) {
      expect(option["code_value"]).toBeUndefined();
      expect(option["code_rank"]).toBeUndefined();
      expect(String(option["why"])).toMatch(/^no code ranking: code does not know which card an enchantment suits/);
    }
  });
});

describe("6. The Giant husk on its blast turn (Steam Eruption gone, DeathBlow shown) is a husk, not a 999,999,977-HP enemy (YQL8D59999AX F17 T8)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("every line that lives through the 35 blast ends the fight; the least-loss line is the rollout's best", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const fx = logged("yql8-f17-t8-blast");
    const giant = ((fx.state["combat"] as Record<string, unknown>)["enemies"] as Record<string, unknown>[])[0]!;
    expect(giant["powers"]).toEqual([]);
    const decision = planCombatTurn(loggedEnv(fx)) as AskDecision;
    const criteria = (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria! as Record<string, string>;
    const facts = Object.values(criteria).map((text) => JSON.parse(text) as Record<string, unknown>);
    for (const f of facts) expect(String(f["rollout"]), String(f["plays"])).toMatch(/fight over within 5 turns in 8\/8/);
    const best = facts.find((f) => f["rollout_best"] === true)!;
    expect(Number(best["hp_lost"])).toBe(Math.min(...facts.map((f) => Number(f["hp_lost"]))));
  });
});

describe("7. A conclusion naming several options contradicts nothing (XMK1JFZ0VD2Q F7 rest: re-asked on 'options are \"o0\" and \"o1\"')", () => {
  const REST = {
    o0: JSON.stringify({ option: "休息", kind: "HEAL", description: "回复最大生命值的30%（24）。" }),
    o1: JSON.stringify({ option: "锻造", kind: "SMITH", description: "升级你牌组中的1张牌。" }),
  };
  // The logged reasoning's last lines (01:46:04.872Z), answered o1.
  const reasoning = [
    "We have 75/80 HP, healing would waste (only +5). Smith is clearly right. Inflame+ is standard. Choose smith.",
    "Actually code_value for smith is 6, rank 1. So smith.",
    'The choice key: options are "o0" and "o1". Choice should be one option key exactly as given — "o1".',
    "Reason: HP 94% heal wasted; smith Inflame for permanent strength, fixes Vantom clock gap.",
  ].join("\n\n");

  it("the logged answer passes; a one-option conclusion that differs is still caught", () => {
    expect(checkConsistency("o1", "HP 94%: heal wastes 5; smith Inflame+", reasoning, REST)).toMatchObject({ ok: true, issues: [] });
    expect(checkConsistency("o0", "heal", "HP 94%.\nDecisive: smith.", REST).issues).toEqual(["reasoning concluded o1 but answered o0"]);
  });
});

describe("8. Shop cards show their cost and type; the removal counts only removable cards (U6RUE7LBUFJF F22, VBHZ77A3N496 F23)", () => {
  it("the one-shot shop question: Production is 0-cost with its energy as text; the removal's why leaves out the Eternal cards", () => {
    const decision = decide(oneshotEnv(board("u6ru-f22-shop", "open")));
    const options = optionsOf(decision);
    expect(options["buy_card5"]).toMatchObject({ buy: "生产制造", type: "Skill", rarity: "Uncommon", cost: 0 });
    expect(String(options["buy_card5"]!["text"])).toMatch(/^获得2点能量。/);
    expect(options["buy_card3"]).toMatchObject({ buy: "火焰屏障", cost: 2 });
    // 5 Eternal Strikes (Nutritious Soup) and Ascender's Bane are not removable; 5 Defends are.
    expect(String(options["remove"]!["why"])).toMatch(/^5 removable basic Strikes\/Defends in the deck \(Eternal, never removable: 打击 x5, 进阶之灾\)$/);
    const facts = (decision as AskDecision).state["facts"] as Record<string, unknown>;
    const stock = facts["shop_stock"] as Record<string, unknown>[];
    expect(stock.find((item) => item["name"] === "生产制造")).toMatchObject({ kind: "card", type: "Skill", cost: 0 });
  });

  it("a deck whose only basics and curse are Eternal: the removal scores as nothing to thin", () => {
    const raw = board("u6ru-f22-shop", "open");
    const deck = (raw["run"] as Record<string, unknown>)["deck"] as Record<string, unknown>[];
    (raw["run"] as Record<string, unknown>)["deck"] = deck.filter((card) => !String(card["card_id"]).startsWith("DEFEND_"));
    const options = optionsOf(decide(oneshotEnv(raw)));
    expect(String(options["remove"]!["why"])).toMatch(/^0 removable basic Strikes\/Defends in the deck/);
    expect(Number(options["remove"]!["code_value"])).toBe(8);
  });
});

describe("10. A per-fight pick (Choices Paradox) is known now, not an outcome revealed later (7XK6DUJYMYY3 F34)", () => {
  it("revealsLater: the paradox's text is null; a one-time random or revealed pick still is not", () => {
    expect(revealsLater("在每场战斗开始时，从[blue]5[/blue]张随机牌中选择[blue]1[/blue]张放入你的[gold]手牌[/gold]。被选中的牌获得[gold]保留[/gold]。")).toBeNull();
    expect(revealsLater("At the start of each combat, choose 1 of 5 random cards to put into your hand.")).toBeNull();
    expect(revealsLater("从3张稀有牌中选择1张加入你的牌组。")).toMatch(/picked from/);
    expect(revealsLater("获得[blue]2[/blue]件随机[gold]遗物[/gold]。在每场战斗开始时，获得1点力量。")).toMatch(/random/);
  });
});
