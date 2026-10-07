/** KAY522KT5NXR F44/F47; P5HT1272P5SB F24/F25 T2; ledger silent-0217. */
import { afterEach, expect, it } from "vitest";
import { setCardUpgradesForTests } from "../src/knowledge/card-upgrades.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { upgradePreview } from "../src/hand/screens/oneshot.js";

const knowledge = makeKnowledge({ cards: [] }, "cache");
const template = "去除敌人身上的所有格挡值和人工制品。 并给予{Power:diff()}层易伤。";
const before = "去除敌人身上的所有格挡值和人工制品。 并给予2层易伤。 消耗。";
const card = { card_id: "EXPOSE", energy_cost: 0, rules_text: template, resolved_rules_text: before,
  dynamic_values: [{ name: "Power", base_value: 2, current_value: 2 }] };
afterEach(() => setCardUpgradesForTests(null));

it("P5HT F24: the upgraded Expose preview retains the observed Exhaust keyword", () => {
  setCardUpgradesForTests({ EXPOSE: { n: [1, 1], vars: { Power: [2, 3] } } });
  expect(upgradePreview(card, knowledge)).toBe(`${before} -> ${before.replace("2层", "3层")}`);
});

it("preserves displayed decorations before and after an exactly matching template", () => {
  setCardUpgradesForTests({ EXPOSE: { n: [1, 1], vars: { Power: [2, 3] } } });
  expect(upgradePreview({ ...card, resolved_rules_text: `测试前缀。 ${before}` }, knowledge))
    .toBe(`测试前缀。 ${before} -> 测试前缀。 ${before.replace("2层", "3层")}`);
});

it("an unmatched rendered text keeps its facts and reports the numeric change", () => {
  setCardUpgradesForTests({ EXPOSE: { n: [1, 1], vars: { Power: [2, 3] } } });
  expect(upgradePreview({ ...card, resolved_rules_text: "不同的现场文本。 消耗。" }, knowledge))
    .toBe("不同的现场文本。 消耗。 -> Power 2->3");
});

it("a template without omitted decorations keeps its numeric upgrade preview", () => {
  setCardUpgradesForTests({ TEST_CARD: { n: [1, 1], vars: { Block: [5, 8] } } });
  expect(upgradePreview({ card_id: "TEST_CARD", rules_text: "获得{Block:diff()}点格挡。",
    resolved_rules_text: "获得5点格挡。", dynamic_values: [{ name: "Block", current_value: 5 }] }, knowledge))
    .toBe("获得5点格挡。 -> 获得8点格挡。");
});
