/**
 * A card template's conditional placeholders no longer decide what the card does, and the mod's target fields come before the
 * text (card-model unconditionalText / targetMode; v4-shiv, 2026-10-03). RNTVAT76BPV0: Shiv's
 * 「{TargetType:choose(AllEnemies):对所有敌人|}造成{Damage:diff()}点伤害。」 (target_type AnyEnemy, requires_target true, rendered
 * 「造成4点伤害。 消耗。」) was read as an AoE card; the planner played it without a target and the gate refused it 18 times on
 * 6 boards, each turn then ended (F30 T1 lost the line's Bully, Defend and two potions with it).
 *
 * - unconditionalText on the logged templates of every conditional kind (choose, show, cond, plural, a bare conditional, a
 *   nested one); a template without one comes back as it is.
 * - Shiv as logged in the hand: single target, its valid targets; Shiv and Sovereign Blade off the hand and in a potion's
 *   pool: single; The Bomb and Corrosive Wave (Self, 「所有敌人」 in their plain text) still hit every enemy.
 * - The logged Shiv boards (tests/template-target-data): every line names Shiv's target, no option's first action is refused
 *   by the gate, the rollout's pick and code's action pass it.
 * - Control boards holding no changed card (the same run before the Shiv, True Grit's and Primal Force's conditional
 *   templates in the hand, four enemies): the question, Jev's view and every answer's resolution byte for byte v4's without it
 *   (6bd48a9; the True Grit board on b9473ed, after CARD_CONDITIONS; digests computed there on the same boards and pinned data, clocks frozen, B2 off: CAPTURE=1 with vitest
 *   --disableConsoleIntercept prints them, only meaningful on that commit).
 * - The SL judge's draw test (judge.ts): Mad Science's template rider 「{Wisdom: 抽…|}」 no longer makes a Mad Science without
 *   it a drawing card (7DFB21JE2DTK F48 T7: the veto names Pommel Strike; without it on the board, no draw veto).
 * - The deck profile's 「力量来源」: Mad Science only with the Expertise rider (JJ75S331VUKX), not with Sapping (7DFB21JE2DTK).
 * Nothing under logs/ or .cache is read, nothing is written; src/knowledge's JSON files are the pinned ones.
 */

import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
const DATA = join(HERE, "template-target-data");
/** Paths under logs/ or .cache touched in any way, and every path written: both must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, Record<string, unknown>>;
  const shared = [join(ROOT, "logs"), join(ROOT, ".cache")];
  const watch = (name: string, write: boolean) => {
    const original = (fs as unknown as Record<string, (...args: unknown[]) => unknown>)[name]!;
    return (path: unknown, ...rest: unknown[]) => {
      const at = typeof path === "string" ? resolve(path) : String(path);
      if (write || shared.some((dir) => at === dir || at.startsWith(dir + "/"))) touched.add(`${name} ${at}`);
      return original(path, ...rest);
    };
  };
  const wrapped: Record<string, unknown> = {};
  for (const name of ["existsSync", "statSync", "lstatSync", "readdirSync", "openSync"]) wrapped[name] = watch(name, false);
  for (const name of ["writeFileSync", "appendFileSync", "mkdirSync", "renameSync", "rmSync", "unlinkSync", "copyFileSync", "createWriteStream"]) wrapped[name] = watch(name, true);
  const read = watch("readFileSync", false);
  wrapped["readFileSync"] = (path: unknown, ...rest: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(KNOWLEDGE + "/") && path.endsWith(".json")) {
      const name = resolve(path).slice(KNOWLEDGE.length + 1);
      if (name in pinned) return JSON.stringify(pinned[name]);
      throw Object.assign(new Error(`ENOENT: pinned test, ${name}`), { code: "ENOENT" });
    }
    return read(path, ...rest);
  };
  return { ...fs, ...wrapped, default: { ...fs, ...wrapped } };
});

vi.resetModules();
const { readFileSync } = await import("node:fs");
const { potionCostOptions } = await import("../src/strategy/potion-cost.js");
potionCostOptions.enabled = true;
const { makeKnowledge } = await import("../src/knowledge/index.js");
const { loadConfig } = await import("../src/config.js");
const { parseGameState } = await import("../src/mod/schema.js");
const { buildRunBrief } = await import("../src/project/run-brief.js");
const { deckProfileLine } = await import("../src/project/deck-profile.js");
const { createScreenMemory } = await import("../src/project/types.js");
const { planCombatTurn, poolCardModel } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
const { bossLinesOptions } = await import("../src/sim/boss-lines.js");
const { gate } = await import("../src/act/gate.js");
const { judgeEndTurn, LEAST_LOSS_LABEL } = await import("../src/sl/judge.js");
const cardModel = await import("../src/strategy/card-model.js");
type AnswerSet = import("../src/jev/answers.js").AnswerSet;
type AskDecision = import("../src/project/types.js").AskDecision;
type DecisionEnv = import("../src/project/types.js").DecisionEnv;
type Raw = Record<string, unknown>;

// The whole-fight boss lines (B2) are a worker pool on a wall clock: off here, the rest of the question is pinned.
bossLinesOptions.enabled = false;
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

function board(name: string): { source: string; state: Raw } {
  return JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as { source: string; state: Raw };
}

function envOf(state: Raw, over: Record<string, unknown> = {}): DecisionEnv {
  const parsed = parseGameState(state);
  return {
    state: parsed, knowledge, brief: buildRunBrief(parsed, knowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], screenMemory: createScreenMemory(parsed.screen), jevContext: "v1",
    ...over,
  } as DecisionEnv;
}

function frozen(): void {
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
}

afterEach(() => {
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = null;
});

const pick = (key: string, confidence = 0.9): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;

/** The whole decision as data: the question, Jev's view, and each option's (and no answer's) resolution. */
function viewOf(env: DecisionEnv): unknown {
  frozen();
  const decision = planCombatTurn(env);
  if (!decision || decision.kind !== "ask") return decision ?? null;
  const ask = decision as AskDecision;
  const keys = Object.keys((ask.questions["plan"] as { criteria: Record<string, unknown> }).criteria);
  const res = (answers: AnswerSet) => {
    const { apply: _apply, ...rest } = ask.resolve(answers);
    return rest;
  };
  return {
    label: ask.label, state: ask.state, questions: ask.questions, jevView: ask.jevView ?? null,
    resolved: Object.fromEntries([...keys.map((key) => [key, res(pick(key))]), ...keys.map((key) => [`${key}@0.3`, res(pick(key, 0.3))]), ["none", res({} as AnswerSet)], ["bad", res(pick("nope"))]]),
  };
}

const digest = (view: unknown): string => createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);

/** The question's lines ("plays"), by option key. */
function linesOf(ask: AskDecision): Record<string, string> {
  const criteria = (ask.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  return Object.fromEntries(Object.entries(criteria).filter(([key]) => /^(plan|p)\d+$/.test(key)).map(([key, text]) => [key, String((text ? (JSON.parse(text) as Raw) : {})["plays"] ?? "")]));
}

const SHIV_BOARDS = ["rntv-f30-t1-shiv", "rntv-f33-t1-shiv", "rntv-f38-t1-shiv-code", "rntv-f38-t1-defend-shiv"] as const;
const CONTROL_BOARDS = ["rntv-f30-t1-cloak", "pw7y-f44-t1-true-grit", "jw92-f30-t1-primal-force"] as const;

/**
 * Digests of v4's planner without this fix on the control boards (JEV_CONTEXT v1): 6bd48a9's, the True Grit board's
 * re-captured on v4 b9473ed (CARD_CONDITIONS changed that board's question; v4 b9473ed and the merge agree).
 */
const GOLDEN: Record<string, string> = {
  "rntv-f30-t1-cloak": "05d30f6afd4a87d6736014079b96015b",
  "pw7y-f44-t1-true-grit": "1b306012724d4c6e1d961009af0320ba",
  "jw92-f30-t1-primal-force": "b17e335fd5d7d74d5f14db7af64d01c5",
};

describe("unconditionalText: a template without its conditional placeholders", () => {
  it("the logged conditionals: choose, show, cond, plural, bare and nested ones go; plain placeholders stay", () => {
    const { unconditionalText } = cardModel;
    expect(unconditionalText("{TargetType:choose(AllEnemies):对所有敌人|}造成{Damage:diff()}点伤害。")).toBe("造成{Damage:diff()}点伤害。");
    expect(unconditionalText("{TargetType:choose(AllEnemies):对所有敌人|}造成{Damage:diff()}点伤害{Repeat:choose(1):|{}次}。{GainsBlock:cond: 获得{CalculatedBlock:diff()}点格挡.|}")).toBe("造成{Damage:diff()}点伤害。");
    expect(unconditionalText("获得{Block:diff()}点格挡。 {IfUpgraded:show:| 随机}消耗1张牌。")).toBe("获得{Block:diff()}点格挡。 消耗1张牌。");
    expect(unconditionalText("打出你抽牌堆顶部的X{IfUpgraded:show:+1}张牌。")).toBe("打出你抽牌堆顶部的X张牌。");
    expect(unconditionalText("如果你的消耗牌堆拥有大于等于{Cards:diff()}张{Cards:plural:牌|牌}， 则对所有敌人造成{Damage:diff()}点伤害。")).toBe("如果你的消耗牌堆拥有大于等于{Cards:diff()}张， 则对所有敌人造成{Damage:diff()}点伤害。");
    expect(unconditionalText("将你消耗牌堆中的所有小刀{IfUpgraded:show:升级然后|}对一名敌人打出。{InCombat: （打出{CalculatedShivs:diff()}张小刀）|}")).toBe("将你消耗牌堆中的所有小刀对一名敌人打出。");
    expect(unconditionalText("选择一张攻击牌或能力牌。将该牌的{IfUpgraded:show:{Cards}张复制品|一张复制品}加入你的手牌。")).toBe("选择一张攻击牌或能力牌。将该牌的加入你的手牌。");
    // Mad Science: every rider is a conditional, nothing of it is unconditional.
    const madScience = knowledge.card("MAD_SCIENCE")!.descriptionRaw;
    expect(madScience).toContain("{Wisdom: 抽{WisdomCards:diff()}张牌|}");
    expect(unconditionalText(madScience)).toBe("");
    // Plain templates as they are (the same string).
    for (const plain of ["造成{Damage:diff()}点伤害。", "失去{HpLoss:diff()}点生命。 获得{Energy:energyIcons()}。", "每当你花费或获得{singleStarIcon}时，对所有敌人造成{BlackHolePower:diff()}点伤害。", "", "不能被打出。"]) {
      expect(unconditionalText(plain)).toBe(plain);
    }
    // An unclosed brace keeps the rest.
    expect(unconditionalText("造成{Damage:diff()点伤害。")).toBe("造成{Damage:diff()点伤害。");
  });
});

describe("what a card hits: the mod's target fields first", () => {
  it("Shiv as logged in RNTVAT76BPV0's hand (AnyEnemy, requires_target): single, at its valid targets", () => {
    const hand = (board("rntv-f30-t1-shiv").state["combat"] as Raw)["hand"] as Raw[];
    const shiv = hand.find((card) => card["card_id"] === "SHIV")!;
    expect(shiv["rules_text"]).toBe("{TargetType:choose(AllEnemies):对所有敌人|}造成{Damage:diff()}点伤害。");
    expect(shiv["target_type"]).toBe("AnyEnemy");
    const model = cardModel.modelHandCard(shiv, 0, knowledge);
    expect(model.target).toBe("single");
    expect(model.validTargets).toEqual([0]);
    expect(model.damage).toBe(4);
  });

  it("Shiv and Sovereign Blade off the hand and in a potion's pool: single; The Bomb and Corrosive Wave (Self) still every enemy", () => {
    for (const id of ["SHIV", "SOVEREIGN_BLADE"]) {
      expect(cardModel.offHandCardModel(null, id, false, 900, knowledge).target).toBe("single");
      expect(cardModel.offHandCardModel(null, id, true, 900, knowledge).target).toBe("single");
      expect(poolCardModel(knowledge.card(id)!, knowledge, { enemyTargets: [0, 1], strength: 0, weak: false }).validTargets).toEqual([0, 1]);
    }
    expect(cardModel.offHandCardModel(null, "THE_BOMB", false, 900, knowledge).target).toBe("all");
    expect(cardModel.offHandCardModel(null, "CORROSIVE_WAVE", false, 900, knowledge).target).toBe("all");
    expect(cardModel.offHandCardModel(null, "SWORD_BOOMERANG", false, 900, knowledge).target).toBe("random");
    // The fields over the text: AllEnemies wins whatever the text says (Shiv under Fan of Knives).
    const shiv = (((board("rntv-f30-t1-shiv").state["combat"] as Raw)["hand"] as Raw[]).find((card) => card["card_id"] === "SHIV"))!;
    expect(cardModel.modelHandCard({ ...shiv, target_type: "AllEnemies", requires_target: false, valid_target_indices: [] }, 0, knowledge).target).toBe("all");
  });
});

describe("the logged Shiv boards (RNTVAT76BPV0): Shiv is played at its target", () => {
  for (const name of SHIV_BOARDS) {
    it(`${name}: every line names Shiv's target, no option's first action is refused, nor code's`, () => {
      const fx = board(name);
      const env = envOf(fx.state);
      frozen();
      const decision = planCombatTurn(env)!;
      expect(decision).not.toBeNull();
      if (decision.kind !== "ask") {
        expect(decision.intent).toMatchObject({ action: "play_card", target_index: 0 });
        expect(gate(env.state, decision.intent).ok).toBe(true);
        return;
      }
      const ask = decision as AskDecision;
      const lines = linesOf(ask);
      const withShiv = Object.values(lines).filter((plays) => plays.includes("小刀"));
      expect(withShiv.length).toBeGreaterThan(0);
      for (const plays of withShiv) for (const step of plays.split(", then ").filter((s) => s.startsWith("小刀"))) expect(step).toMatch(/^小刀 -> /);
      for (const key of Object.keys(lines)) {
        const intent = ask.resolve(pick(key)).intent;
        expect(gate(env.state, intent), `${key}: ${lines[key]}`).toMatchObject({ ok: true });
      }
    }, 300_000);
  }

  it("F30 T1: Jev's line (小刀, 欺凌, potion, 防御, potion) starts with Shiv at the Mother Louse, as the gate wants it", () => {
    const fx = board("rntv-f30-t1-shiv");
    const env = envOf(fx.state);
    frozen();
    const ask = planCombatTurn(env) as AskDecision;
    const lines = linesOf(ask);
    const key = Object.keys(lines).find((k) => lines[k]!.startsWith("小刀 -> 虱虫之祖, then 欺凌 -> 虱虫之祖, then potion 明耀酊剂, then 防御"))!;
    expect(key).toBeDefined();
    const intent = ask.resolve(pick(key)).intent;
    expect(intent).toEqual({ action: "play_card", card_index: 2, target_index: 0, ...(intent.expect ? { expect: intent.expect } : {}) });
    expect(gate(env.state, intent).ok).toBe(true);
  }, 300_000);
});

describe("control boards: no changed card, the question as on v4 without the fix (6bd48a9; b9473ed for True Grit)", () => {
  it("the same run before the Shiv, True Grit's and Primal Force's conditional templates in hand: byte for byte", () => {
    const got = Object.fromEntries(CONTROL_BOARDS.map((name) => [name, digest(viewOf(envOf(board(name).state)))]));
    if (process.env["CAPTURE"] === "1") {
      console.log(JSON.stringify(got, null, 2));
      return;
    }
    expect(got).toEqual(GOLDEN);
    expect([...touched]).toEqual([]);
  }, 900_000);
});

describe("the SL judge's draw test reads the template without its conditionals", () => {
  const fx = board("7dfb-f48-t7-mad-science");
  const hand = (fx.state["combat"] as Raw)["hand"] as Raw[];
  const ethereal = (card: Raw) => cardModel.heldCardEthereal(card, knowledge);
  it("7DFB21JE2DTK F48 T7: Mad Science (Sapping rider) is not the drawing card, Pommel Strike is", () => {
    const madScience = hand.find((card) => card["card_id"] === "MAD_SCIENCE")!;
    expect(madScience["resolved_rules_text"]).toBe("造成17点伤害。 给予2层虚弱。 给予2层易伤。");
    const verdict = judgeEndTurn(parseGameState(fx.state), { label: LEAST_LOSS_LABEL, revives: [], ethereal, knowledge });
    expect(verdict.certain).toBe(false);
    expect(verdict.reason).toContain("剑柄打击 draws");
    expect(verdict.reason).not.toContain("疯狂科学 draws");
  });

  it("the same board without Pommel Strike: no draw veto at all (it was Mad Science's before)", () => {
    const state = structuredClone(fx.state);
    const combat = state["combat"] as Raw;
    combat["hand"] = (combat["hand"] as Raw[]).filter((card) => card["card_id"] !== "POMMEL_STRIKE");
    const verdict = judgeEndTurn(parseGameState(state), { label: LEAST_LOSS_LABEL, revives: [], ethereal, knowledge });
    expect(verdict.reason).not.toContain("draws (unknown cards)");
  });
});

describe("the deck profile's Strength sources: Mad Science by the rider it was given", () => {
  it("Sapping (7DFB21JE2DTK): not a Strength source; Expertise (JJ75S331VUKX): one", () => {
    const sapping = deckProfileLine(parseGameState(board("7dfb-f48-t7-mad-science").state), knowledge);
    expect(sapping).toMatch(/力量来源 /);
    expect(sapping).not.toContain("疯狂科学");
    const expertise = deckProfileLine(parseGameState(board("jj75-f48-mad-science-expertise").state), knowledge);
    expect(expertise).toMatch(/力量来源 [^|]*疯狂科学/);
  });
});
