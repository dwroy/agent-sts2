/** NEWRFAYKTQHR SILENT A10 F28 T7; ledger silent-0287/0288. */
import { expect, it } from "vitest";
import evidence from "./silent-sl-calendar-poison-evidence.json";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { judgeEndTurn } from "../src/sl/judge.js";

const knowledge = makeKnowledge({ cards: [], powers: [], relics: [] }, "cache");
type Key = keyof typeof evidence.frames;
const board = (key: Key = "first") => structuredClone(evidence.frames[key]);
const judge = (raw: ReturnType<typeof board>, label = "combat/end_turn") =>
  judgeEndTurn(parseGameState(raw), { label, revives: [], ethereal: () => false, knowledge });

it.each([["first", 57, 13, 65], ["second", 59, 22, 74]] as const)(
  "F28 %s: existing Calendar and poison bounds jointly veto certain death", (key, hp, poison, combined) => {
    const raw = board(key);
    expect(raw.combat.enemies[0]!.current_hp).toBe(hp);
    expect(raw.combat.enemies[0]!.powers.find((p) => p.power_id === "POISON_POWER")!.amount).toBe(poison);
    expect(raw.combat.end_turn_will_kill_player).toBe(true);
    const result = judge(raw, key === "second" ? "combat/least-loss" : "combat/end_turn");
    expect(result).toMatchObject({ certain: false, tier: null });
    expect(result.reason).toContain(`combined upper bound ${combined}`);
    expect(result.reason).toContain(`its poison (${poison})`);
    expect(result.reason).toContain("may die first");
  });

it("keeps the third attempt certain when 52 + 2 cannot reach 73 HP", () => {
  expect(judge(board("insufficient"))).toMatchObject({ certain: true, tier: "rules" });
});

it("keeps the final Calendar-only veto, F17 survival and the F31 lethal control", () => {
  expect(judge(board("final"))).toMatchObject({ certain: false, tier: null });
  expect(judge(board("boss-control"))).toMatchObject({ certain: false, tier: null });
  expect(judge(board("prism-control"), "combat/least-loss")).toMatchObject({ certain: true, tier: "least-loss" });
});

it("uses an inclusive bound without claiming an unexecuted victory", () => {
  const raw = board();
  raw.combat.enemies[0]!.current_hp = 65;
  expect(judge(raw).certain).toBe(false);
  raw.combat.enemies[0]!.current_hp = 66;
  expect(judge(raw).certain).toBe(true);
});

it.each(["IRONCLAD", "REGENT", ""])("preserves the old single-source verdict for %s", (character) => {
  const raw = board();
  raw.run.character_id = character;
  expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
});

it.each([0, 8, 9, 11])("preserves the old verdict outside observed A10: A%i", (ascension) => {
  const raw = board();
  raw.run.ascension = ascension;
  expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
});

it("does not introduce a Calendar hit without its relic or outside its existing turn window", () => {
  const dry = board();
  dry.run.relics = dry.run.relics.filter((r) => r.relic_id !== "STONE_CALENDAR");
  expect(judge(dry).certain).toBe(true);
  const otherTurn = board();
  otherTurn.turn = 6;
  expect(judge(otherTurn).certain).toBe(true);
  const noPoison = board();
  noPoison.combat.enemies[0]!.powers = noPoison.combat.enemies[0]!.powers.filter((p) => p.power_id !== "POISON_POWER");
  expect(judge(noPoison).certain).toBe(true);
});

it("still counts held damage that kills before the enemy turn", () => {
  const raw = board();
  const held = structuredClone(raw.combat.hand[0]!);
  Object.assign(held, { card_id: "INFECTION", name: "感染", rules_text: "回合结束时，如果这张牌在你的手牌中，受到10点伤害。",
    resolved_rules_text: "回合结束时，如果这张牌在你的手牌中，受到10点伤害。", playable: false });
  raw.combat.hand = [held];
  expect(judge(raw)).toMatchObject({ certain: true, held: { damage: 10 } });
});

it("preserves revive handling and does not mutate the observed state", () => {
  const raw = board();
  const before = JSON.stringify(raw);
  expect(judgeEndTurn(parseGameState(raw), { label: "combat/end_turn", revives: ["LIZARD_TAIL"],
    ethereal: () => false, knowledge }).certain).toBe(false);
  judge(raw);
  expect(JSON.stringify(raw)).toBe(before);
});
