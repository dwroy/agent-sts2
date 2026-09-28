/**
 * Plan-side fixes from the first two runs of the redesign (notes/lessons.md, 99X7VX66AU71 and
 * G8YYU94P2SBB): relic text placeholders, run-plan card names through the game data, and DeepSeek's
 * rest lean weighing upgrades.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { fillRelicText, UNKNOWN_VALUE } from "../src/knowledge/potion-values.js";
import { parseGameState } from "../src/mod/schema.js";
import { FIGHT_PLAN_TASK } from "../src/strategy/fight-plan.js";
import { parseRunPlan, RUN_PLAN_TASK } from "../src/strategy/run-plan.js";
import { logged, loggedKnowledge } from "./logged.js";

describe("6. Relic text placeholders are filled like potions' (G8YY F20 shop: 拳刃 {Momentum})", () => {
  it("no relic text keeps a raw {Name}: known numbers filled, unknown ones marked", () => {
    expect(fillRelicText("PUNCH_DAGGER", "拾起时，选择一张攻击牌为它[gold]附魔[/gold]：[purple]动量[/purple][blue]{Momentum}[/blue]。")).toBe(`拾起时，选择一张攻击牌为它附魔：动量${UNKNOWN_VALUE}。`);
    expect(fillRelicText("MERCURY_HOURGLASS", "在你的回合开始时，对所有敌人造成[blue]{Damage}[/blue]点伤害。")).toBe("在你的回合开始时，对所有敌人造成3点伤害。");
    const relics = (JSON.parse(readFileSync(new URL("./logged-states/game-data.json", import.meta.url), "utf8")) as { relics: { id: string }[] }).relics;
    for (const relic of relics) expect(loggedKnowledge.relic(relic.id)?.description ?? "").not.toMatch(/[{}]/);
  });
});

describe("7. Run-plan want/avoid names go through the game data (99X7 v1 Chinese names, G8YY v1 'ID name')", () => {
  const state = () => parseGameState(logged("99x7-f17-t1").state);
  it("Chinese names and 'ID name' entries are kept as ids", () => {
    const zh = parseRunPlan({ hp_policy: "balanced", want: ["恶魔形态", "燃烧", "旋风斩", "狱火", "祭品", "耸肩无视"], avoid: ["契约终结", "破灭", "铁斩波", "暴走"], remove: ["打击"] }, state(), loggedKnowledge, "start");
    expect(zh.want).toEqual(["DEMON_FORM", "INFLAME", "WHIRLWIND", "INFERNO", "OFFERING", "SHRUG_IT_OFF"]);
    expect(zh.avoid).toEqual(["PACTS_END", "HAVOC", "IRON_WAVE", "RAMPAGE"]);
    expect(zh.remove).toEqual(["STRIKE_IRONCLAD"]);
    const mixed = parseRunPlan({ hp_policy: "balanced", want: ["DEMON_FORM 恶魔形态", "WHIRLWIND 旋风斩", "UPPERCUT 上勾拳"], avoid: ["PACT'S_END 契约终结(消耗堆0)", "HAVOC 破灭"], remove: ["STRIKE_IRONCLAD ×2"] }, state(), loggedKnowledge, "start");
    expect(mixed.want).toEqual(["DEMON_FORM", "WHIRLWIND", "UPPERCUT"]);
    expect(mixed.avoid).toEqual(["PACTS_END", "HAVOC"]);
    expect(mixed.remove).toEqual(["STRIKE_IRONCLAD"]);
    expect(mixed.validator.join(" ")).not.toMatch(/dropped unknown/);
  });
});

describe("11. DeepSeek is asked to weigh upgrades when it sets the rest lean (both runs: 9 rests, 9 heals, 0 upgrades)", () => {
  it("the run-plan task and the handbook say so; the fight-plan task asks for checkable words", () => {
    expect(RUN_PLAN_TASK).toMatch(/heal HP line/);
    expect(RUN_PLAN_TASK).toMatch(/0 upgrades/);
    expect(readFileSync(new URL("../src/knowledge/ds-handbook.md", import.meta.url), "utf8")).toMatch(/9 次休息全部回血，到死 0 张升级/);
    expect(FIGHT_PLAN_TASK).toMatch(/drink turn 1/);
    expect(FIGHT_PLAN_TASK).toMatch(/fully block the Rock/);
  });
});
