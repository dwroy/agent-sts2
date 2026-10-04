/**
 * The SL judge's refusals bounded (docs/sl.md §2; ops 2026-10-04, X80AD9MHAKZW F42, the Soul Nexus, A9: "not certain: Ripple
 * Basin (no attack played): its block is not counted here" at T4, T5 and T6, died on attempt 1 with 3 retries unused). Each
 * refusal that stood for a relic, power or card without bounding what it does is now counted at the most it can save (the
 * most block, the least damage it lets through, the most it can hit the enemies with) and the death judged at that bound;
 * the boards are the logged ones (tests/sl-judge-bounds-data, make-fixtures.ts; some edited), the knowledge the mod's
 * collections trimmed to them. No model call, nothing under logs/ or .cache read.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { turnStartLoss } from "../src/sl/controller.js";
import { chanceTrigger, judgeEndTurn, LEAST_LOSS_LABEL, type DeathVerdict, type JudgeContext } from "../src/sl/judge.js";
import { heldCardEthereal } from "../src/reflex/card-model.js";

type Raw = Record<string, unknown>;
const DATA = join(dirname(fileURLToPath(import.meta.url)), "sl-judge-bounds-data");
const FIXTURE = JSON.parse(readFileSync(join(DATA, "boards.json"), "utf8")) as { states: Record<string, Raw> };
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")) as Record<string, unknown[]>, "cache");

const board = (key: string): Raw => {
  const raw = FIXTURE.states[key];
  if (!raw) throw new Error(`boards.json has no state ${key}`);
  return structuredClone(raw);
};
const combat = (raw: Raw) => raw["combat"] as Raw;
const player = (raw: Raw) => combat(raw)["player"] as Raw;
const enemies = (raw: Raw) => (combat(raw)["enemies"] as Raw[]).filter((enemy) => enemy["is_alive"] !== false);
const hand = (raw: Raw) => combat(raw)["hand"] as Raw[];
const relics = (raw: Raw) => (raw["run"] as Raw)["relics"] as Raw[];
const addRelic = (raw: Raw, id: string) => relics(raw).push({ index: 99, relic_id: id, name: id, description: knowledge.relic(id)?.description ?? "", stack: null, is_melted: false });
const addPower = (raw: Raw, id: string, amount: number) => (player(raw)["powers"] as Raw[]).push({ index: 99, power_id: id, name: id, amount, is_debuff: false });
const ethereal = (card: Record<string, unknown>) => heldCardEthereal(card, knowledge);
const judge = (raw: Raw, label = LEAST_LOSS_LABEL, extra: Partial<JudgeContext> = {}): DeathVerdict =>
  judgeEndTurn(parseGameState(raw), { label, revives: [], ethereal, knowledge, ...extra });

describe("X80AD9MHAKZW F42 (the Soul Nexus): Ripple Basin's 4 block counted when no Attack was played", () => {
  it("T6, 1 HP + 25 block + Plating 4 + Ripple Basin's 4 against 46: certain at the planner's least-loss end_turn (it died)", () => {
    const raw = board("x80a_f42_t6_end");
    expect(player(raw)["attacks_played_this_turn"]).toBe(0);
    const verdict = judge(raw);
    expect(verdict).toMatchObject({ certain: true, tier: "least-loss", hp: 1, block: 25, endBlock: 8, incoming: 46 });
    expect(verdict.reason).toBe("the turn planner: every simulated line dies and ending the turn keeps the most HP; 46 incoming vs 1 HP + 25 block + 8 end-of-turn block");
    // Anger is playable: under another label the tier still refuses.
    expect(judge(raw, "combat/plan")).toMatchObject({ certain: false, reason: "1 playable card(s) and 0 potion(s) left" });
    // An Attack played this turn: no Ripple Basin block.
    player(raw)["attacks_played_this_turn"] = 1;
    expect(judge(raw)).toMatchObject({ certain: true, endBlock: 4 });
  });

  it("T4 and T5, where its 4 kept us alive: our count leaves exactly the 1 HP the next turn opened with", () => {
    // T4: 46 - 6 (Plating) - 4 = 36 of 37; T5: 19 - 12 - 5 (Plating) - 4 leaves all of the 1.
    expect(judge(board("x80a_f42_t4_end"), "combat/plan")).toMatchObject({ certain: false, reason: "own count survives: 46 incoming - 0 block - 10 end-of-turn block - 0 Regen < 37 HP" });
    expect(judge(board("x80a_f42_t5_end"), "combat/plan")).toMatchObject({ certain: false, reason: "own count survives: 19 incoming - 12 block - 9 end-of-turn block - 0 Regen < 1 HP" });
    // Under any label: the count lives.
    for (const key of ["x80a_f42_t4_end", "x80a_f42_t5_end"]) expect(judge(board(key), LEAST_LOSS_LABEL, { drawsKnown: true }).certain).toBe(false);
  });

  it("7048QYLLYJLS F17 T11: the Giant's 39 against 9 HP + 23 block + Ripple Basin's 4, Dexterity 1 (not in its block): certain", () => {
    expect(judge(board("7048_f17_t11_end"))).toMatchObject({ certain: true, tier: "rules", endBlock: 4 });
  });
});

describe("Stampede: its Attack at the end of the turn bounded", () => {
  it("Z2H318ZMMAD0 F17 T11: three Strikes of 3 against the 37-HP Matriarch: it cannot die to it, certain (it died)", () => {
    expect(judge(board("z2h3_f17_t11_end"), "combat/end_turn")).toMatchObject({ certain: true, tier: "rules" });
    // At 5 HP a Strike (3, x1.75 on the Vulnerable Matriarch) may kill it first: not certain.
    const low = board("z2h3_f17_t11_end");
    enemies(low)[0]!["current_hp"] = 5;
    expect(judge(low, "combat/end_turn").reason).toMatch(/^the enemies may be hit before they act: .*惊逃 \(an Attack in hand at a random enemy, at most 3: 打击 3\)\) may die first, and the rest's 0 does not kill$/);
  });

  it("refused where the Attack is not only damage, something acts on it, or the card types are not known", () => {
    const blocking = board("z2h3_f17_t11_end");
    hand(blocking)[0]!["card_id"] = "IRON_WAVE";
    hand(blocking)[0]!["resolved_rules_text"] = "获得5点格挡。 造成5点伤害。";
    expect(judge(blocking, "combat/end_turn").reason).toMatch(/惊逃 plays an Attack in hand at a random enemy at the end of the turn, and 打击 \(an Attack in hand\) does more than damage/);
    const fan = board("z2h3_f17_t11_end");
    addRelic(fan, "ORNAMENTAL_FAN");
    expect(judge(fan, "combat/end_turn").reason).toMatch(/ORNAMENTAL_FAN \(relic\) acts on the Attack Stampede plays$/);
    const blind = judgeEndTurn(parseGameState(board("z2h3_f17_t11_end")), { label: "combat/end_turn", revives: [], ethereal, knowledge: { power: knowledge.power, relic: knowledge.relic } });
    expect(blind.reason).toMatch(/: the card types are not known$/);
    // An Attack with no text shown: not bounded.
    const bare = board("z2h3_f17_t11_end");
    hand(bare)[0]!["resolved_rules_text"] = hand(bare)[0]!["rules_text"] = "";
    expect(judge(bare, "combat/end_turn").reason).toMatch(/打击 \(an Attack in hand\): its text is not known$/);
  });

  it("LMTA6JC86RCC F17 T7: a Stampede card held is a Power not played, it does nothing at the end of the turn: certain", () => {
    const raw = board("lmta_f17_t7_end");
    expect(hand(raw).some((card) => card["card_id"] === "STAMPEDE")).toBe(true);
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
  });
});

describe("what hits the enemies before they act, bounded", () => {
  it("FP35WY2JXL4W F42 T5: Forgotten Soul's 1 for the exhausted Ascender's Bane cannot kill the 47-HP Axebot: certain", () => {
    expect(judge(board("fp35_f42_t5_end"))).toMatchObject({ certain: true, tier: "rules" });
    const low = board("fp35_f42_t5_end");
    enemies(low)[0]!["current_hp"] = 1;
    expect(judge(low).reason).toMatch(/遗忘之魂 \(1 to a random enemy for each of the 1 Ethereal card\(s\) exhausted\)\) may die first/);
    // Charon's Ashes (never held in the logs: its damage not known): refused.
    const ashes = board("fp35_f42_t5_end");
    addRelic(ashes, "CHARONS_ASHES");
    expect(judge(ashes).reason).toBe("the enemies may be hit before they act: CHARONS_ASHES hits the enemies when the held Ethereal cards are exhausted at the end of the turn (its damage not logged)");
  });

  it("P4ZDR744B9JC F37 T9: Parrying Shield needs 10 block at the end of the turn; with none the 1-HP Axebot attacks: certain", () => {
    expect(judge(board("p4zd_f37_t9_end"))).toMatchObject({ certain: true, tier: "rules", block: 0 });
    // 10 block (5 HP: still a death on our count): it fires, and the Axebot may die first.
    const blocked = board("p4zd_f37_t9_end");
    player(blocked)["block"] = 10;
    player(blocked)["current_hp"] = 5;
    expect(judge(blocked).reason).toMatch(/招架盾 \(6 to a random enemy\)\) may die first, and the rest's 0 does not kill$/);
  });

  it("L34T7HND7EL8 F48 T7: the held Wither's HP loss sets off Inferno's 6 on the 179-HP Aeonglass: counted, certain", () => {
    expect(judge(board("l34t_f48_t7_end"))).toMatchObject({ certain: true, tier: "least-loss", held: { damage: 9, loss: 0 } });
    const low = board("l34t_f48_t7_end");
    enemies(low)[0]!["current_hp"] = 6;
    expect(judge(low).reason).toMatch(/狱火's sweep \(6 to every enemy for each of the 1 held card loss\(es\) on our turn\)\) may die first/);
  });

  it("Z3DFG85QDRCD F48 T8: Juggernaut 8 on Plating's end-of-turn block and the Mantle's at T9's start cannot kill the 311-HP Test Subject", () => {
    expect(judge(board("z3df_f48_t8_end"), LEAST_LOSS_LABEL, { drawsKnown: true })).toMatchObject({ certain: true, tier: "least-loss", startLoss: 1 });
    // 24 at most from Juggernaut (8 on Plating's block at the end of our turn; 8 on each of the Mantle's and Sai's at T9's
    // start, taken as before the Mantle's loss): at 24 HP it may die before that loss.
    const low = board("z3df_f48_t8_end");
    enemies(low)[0]!["current_hp"] = 24;
    expect(judge(low, LEAST_LOSS_LABEL, { drawsKnown: true }).reason).toMatch(/but every enemy may die before it \(势不可当 \(8 to a random enemy for each of at most 1 end-of-turn block gain\(s\)\), 势不可当 8x2 \(block at the turn's start\)\)$/);
    enemies(low)[0]!["current_hp"] = 25;
    expect(judge(low, LEAST_LOSS_LABEL, { drawsKnown: true }).certain).toBe(true);
  });

  it("a hit before they act may stun without killing: Shriek / Plow at the threshold, Curl Up and the like on any hit", () => {
    // FP35 F42 T5: Forgotten Soul's 1 on the 47-HP Axebot. With a stun at 46 HP, or Curl Up up, its 19x2 may not come.
    const shriek = board("fp35_f42_t5_end");
    (enemies(shriek)[0]!["powers"] as Raw[]).push({ index: 9, power_id: "SHRIEK_POWER", name: "尖啸", amount: 46, is_debuff: false });
    expect(judge(shriek).reason).toMatch(/may be stunned first \(its stun at 46 HP\), and the rest's 0 does not kill$/);
    (enemies(shriek)[0]!["powers"] as Raw[]).at(-1)!["amount"] = 45;
    expect(judge(shriek).certain).toBe(true);
    const curled = board("fp35_f42_t5_end");
    (enemies(curled)[0]!["powers"] as Raw[]).push({ index: 9, power_id: "CURL_UP_POWER", name: "蜷身", amount: 9, is_debuff: false });
    expect(judge(curled).reason).toMatch(/may be stunned first \(its CURL_UP_POWER going may stun it\)/);
    // Artifact goes on a debuff, which Forgotten Soul's hit does not bring: still certain.
    const artifact = board("fp35_f42_t5_end");
    (enemies(artifact)[0]!["powers"] as Raw[]).push({ index: 9, power_id: "ARTIFACT_POWER", name: "人工制品", amount: 1, is_debuff: false });
    expect(judge(artifact).certain).toBe(true);
    // Nothing hits it at the end of the turn (X80A F42 T6): a Curl Up on the Soul Nexus changes nothing.
    const quiet = board("x80a_f42_t6_end");
    (enemies(quiet)[0]!["powers"] as Raw[]).push({ index: 9, power_id: "CURL_UP_POWER", name: "蜷身", amount: 9, is_debuff: false });
    expect(judge(quiet).certain).toBe(true);
  });

  it("D4JGCNEL40VL F33 T5: the Rocket may die to Howl from Beyond, and the Crusher's move with it (its 21 from behind landed as 20): not certain", () => {
    const verdict = judge(board("d4jg_f33_t5_end"), "combat/end_turn");
    expect(verdict).toMatchObject({ certain: false, ownCountDies: true });
    expect(verdict.reason).toMatch(/^the enemies may be hit before they act: 火箭 .* may die first, an ally's death may change the move of 碾碎爪 \(its hits not counted\), and the rest's 0 does not kill$/);
  });
});

describe("the held cards' chance guard: only what may act between the end of the turn and the death", () => {
  it("BG4W9DSX99DA F17 T6: Aggression acts at the next turn's start, after the two Beckons' 12 at 8 HP: certain", () => {
    expect(judge(board("bg4w_f17_t6_end"), "combat/end_turn")).toMatchObject({ certain: true, tier: "rules", held: { damage: 0, loss: 12 } });
  });

  it("G1Z0X3WBH4XQ F48 T9: Mummified Hand fires on a Power played, and nothing can be played: certain", () => {
    expect(judge(board("g1z0_f48_t9_end"))).toMatchObject({ certain: true, tier: "rules" });
  });

  it("L34T7HND7EL8 F48 T7: only Attacks to play; with a Power to play Mummified Hand may act: refused", () => {
    const raw = board("l34t_f48_t7_end");
    hand(raw).push({ ...structuredClone(hand(raw)[0]!), index: 9, card_id: "INFLAME", name: "燃烧", playable: true, resolved_rules_text: "获得2点力量。", rules_text: "获得2点力量。" });
    expect(judge(raw).reason).toBe("only the held cards make it lethal (held 凋萎+2: 9 damage), and acting by chance: 干瘪之手 (relic)");
  });

  it("chanceTrigger reads when the random effect fires", () => {
    expect(chanceTrigger("你每打出一张能力牌，[gold]手牌[/gold]中就有一张随机牌在这个回合可以免费打出。")).toEqual({ when: "play", cardType: "Power" });
    expect(chanceTrigger("在你的回合开始时，将你[gold]弃牌堆[/gold]的一张随机攻击牌放入你的[gold]手牌[/gold]并将其在本场战斗中[gold]升级[/gold]。")).toEqual({ when: "start" });
    expect(chanceTrigger("你每打出一张牌，就对随机一名敌人造成[blue]4[/blue]点伤害。")).toEqual({ when: "play" });
    for (const text of ["每当你[gold]消耗[/gold]一张牌，随机对一名敌人造成[blue]{Damage}[/blue]点伤害。", "每回合结束时，随机一张被[gold]保留[/gold]的牌在被打出前的耗能减少[blue]1[/blue]。", "你每在你的回合丢弃一张牌，就对一名随机敌人造成[blue]{Damage}[/blue]点伤害。"]) {
      expect(chanceTrigger(text).when, text).toBe("other");
    }
  });
});

describe("held cards: Regret's HP loss is the cards in hand", () => {
  it("VQKX9AD1YHKS F48 T7: 2 HP + 16 block, no attack shown, Regret with four cards: 4 lost, certain at the least-loss tier", () => {
    const raw = board("vqkx_f48_t7_end");
    expect(hand(raw)).toHaveLength(4);
    expect(judge(raw)).toMatchObject({ certain: true, tier: "least-loss", held: { damage: 0, loss: 4 } });
    // As logged (combat/plan, Brand playable): the tier refuses.
    expect(judge(raw, "combat/plan").certain).toBe(false);
  });
});

describe("Tungsten Rod and Beating Remnant: the next turn's start and the revives", () => {
  it("VC4LRL945UEF F23 T2: Beating Remnant's cap leaves 1, Inferno's 1 at T3's start (the next turn's own cap) takes it: certain", () => {
    const raw = board("vc4l_f23_t2_end");
    expect(judge(raw, LEAST_LOSS_LABEL, { lostSoFar: 3 })).toMatchObject({ certain: true, tier: "least-loss", startLoss: 1 });
    // The HP lost so far not known: the cap's lowest is not either, and the mod does not flag 16 against 17.
    expect(judge(raw).reason).toBe("the mod does not flag ending the turn as lethal");
  });

  it("YNMB8X87UEH1 F17 T9: Bread's energy at the turn's start is no HP loss, so the HP lost so far is exact (0): certain", () => {
    expect(relics(board("ynmb_f17_t9_start")).some((relic) => relic["relic_id"] === "BREAD")).toBe(true);
    expect(turnStartLoss(parseGameState(board("ynmb_f17_t9_start")), knowledge)).toEqual({ startLoss: false, startLossMost: 0 });
    expect(judge(board("ynmb_f17_t9_end"), LEAST_LOSS_LABEL, { lostSoFar: 0 })).toMatchObject({ certain: true, tier: "rules" });
    // Inferno up at the start: a start loss, as before.
    const inferno = board("ynmb_f17_t9_start");
    addPower(inferno, "INFERNO_POWER", 6);
    expect(turnStartLoss(parseGameState(inferno), knowledge)).toEqual({ startLoss: true, startLossMost: 1 });
  });

  it("G1Z0X3WBH4XQ F48 T7: Tungsten Rod with the Fairy, played out: back at 29, the 29 the next turn opened with", () => {
    const verdict = judge(board("g1z0_f48_t7_end"), LEAST_LOSS_LABEL, { revives: ["FAIRY_IN_A_BOTTLE"] });
    expect(verdict).toMatchObject({ certain: false, reason: "a revive is left (FAIRY_IN_A_BOTTLE): back at 29 HP, the rest of the turn leaves 29", revive: { used: ["FAIRY_IN_A_BOTTLE"], backAt: [29], hpLeft: 29, saved: true } });
    // A death the Fairy cannot stop (two more hits of 29 after it): certain.
    const more = board("g1z0_f48_t7_end");
    const intent = (enemies(more)[0]!["intents"] as Raw[]).find((entry) => entry["intent_type"] === "Attack")!;
    intent["hits"] = 3;
    expect(judge(more, LEAST_LOSS_LABEL, { revives: ["FAIRY_IN_A_BOTTLE"] })).toMatchObject({ certain: true, revive: { used: ["FAIRY_IN_A_BOTTLE"], saved: false } });
  });
});

describe("Buffer and Intangible: at the most they can save", () => {
  it("Buffer 1 takes the largest loss, Intangible makes every loss 1: a death that holds with them is certain", () => {
    // X80A F42 T6: 46 against 1 HP + 33 block.
    const buffered = board("x80a_f42_t6_end");
    addPower(buffered, "BUFFER_POWER", 1);
    expect(judge(buffered)).toMatchObject({ certain: false, reason: "own count survives: 0 HP lost (Buffer 1: the largest loss taken as prevented) - 0 Regen < 1 HP" });
    // Two hits of 46: one prevented, the other still kills.
    const twice = board("x80a_f42_t6_end");
    addPower(twice, "BUFFER_POWER", 1);
    ((enemies(twice)[0]!["intents"] as Raw[])[0]!)["hits"] = 2;
    expect(judge(twice)).toMatchObject({ certain: true, tier: "least-loss" });
    const intangible = board("x80a_f42_t6_end");
    addPower(intangible, "INTANGIBLE_POWER", 1);
    expect(judge(intangible)).toMatchObject({ certain: false, reason: "own count survives: 0 HP lost (Intangible: every loss taken as 1) - 0 Regen < 1 HP" });
    // With a revive: not judged (never logged).
    expect(judge(twice, LEAST_LOSS_LABEL, { revives: ["FAIRY_IN_A_BOTTLE"] }).reason).toMatch(/^a revive is left \(FAIRY_IN_A_BOTTLE\): Buffer with a revive in the turn is not judged/);
  });
});

describe("Disintegration: its end-of-turn damage counted as a held Burn's (the Knowledge Demon's curse)", () => {
  it("79YRPJ8TCCZ5 F33 T6 (A8): 19 + Disintegration's 7 against 17 HP + 5 block, the mod not flagging it: certain (it died)", () => {
    const raw = board("79yr_f33_t6_end");
    expect(combat(raw)["end_turn_will_kill_player"]).toBe(false);
    const verdict = judge(raw);
    expect(verdict).toMatchObject({ certain: true, tier: "least-loss", held: { damage: 7, loss: 0 }, ownCountDies: true });
    expect(verdict.reason).toBe("the turn planner: every simulated line dies and ending the turn keeps the most HP; 19 incoming + held 瓦解 (power, 7 at the end of the turn): 7 damage (the mod does not count them) vs 17 HP + 5 block + 0 end-of-turn block");
  });

  it("JRSF34UJJND4 F33 T5: no attack shown, its 6 at 4 HP: certain; Tungsten Rod takes 1 off it", () => {
    expect(judge(board("jrsf_f33_t5_end"), "combat/end_turn")).toMatchObject({ certain: true, tier: "rules", held: { damage: 6 } });
    const rod = board("jrsf_f33_t5_end");
    addRelic(rod, "TUNGSTEN_ROD");
    // 6 less 1 lands as 5: a death at 5 HP, not at 6.
    player(rod)["current_hp"] = 5;
    expect(judge(rod, "combat/end_turn").certain).toBe(true);
    player(rod)["current_hp"] = 6;
    expect(judge(rod, "combat/end_turn")).toMatchObject({ certain: false, reason: "the mod does not flag ending the turn as lethal" });
  });

  it("it meets block, the end-of-turn block too: our count is the logged loss (377J T3: 3 lost; JSA5 T7, Plating 4: 25 lost)", () => {
    // 377JPY9LPG1L F33 T3: 24 + 6 against 27 block: 3, at 3 HP our death, at 4 not.
    const t3 = board("377j_f33_t3_end");
    player(t3)["current_hp"] = 3;
    expect(judge(t3, "combat/end_turn")).toMatchObject({ certain: true, held: { damage: 6 } });
    player(t3)["current_hp"] = 4;
    expect(judge(t3, "combat/end_turn").certain).toBe(false);
    // JSA5K8YZ9RXV F33 T7: 27 + 7 against 5 block + Plating 4: 25 of its 50.
    const t7 = board("jsa5_f33_t7_end");
    expect(judge(t7, LEAST_LOSS_LABEL, { drawsKnown: true })).toMatchObject({ certain: false, endBlock: 4, held: { damage: 7 } });
    player(t7)["current_hp"] = 25;
    expect(judge(t7, LEAST_LOSS_LABEL, { drawsKnown: true }).certain).toBe(true);
    player(t7)["current_hp"] = 26;
    expect(judge(t7, LEAST_LOSS_LABEL, { drawsKnown: true }).certain).toBe(false);
  });

  it("377JPY9LPG1L F33 T7: Howl from Beyond (18 + Strength) may leave the demon to Thorns after 2 of its 3 hits: not certain; without it, certain", () => {
    const raw = board("377j_f33_t7_end");
    expect(judge(raw, "combat/end_turn").reason).toBe("the enemies may be hit before they act: 知识恶魔 may die to our retaliation (3 a hit) after 2 of its 3 hits, and the rest's 20 does not kill");
    const view = (raw["agent_view"] as Raw)["combat"] as Raw;
    view["exhaust"] = (view["exhaust"] as Raw[]).filter((entry) => !String(entry["line"]).includes("消耗牌堆中"));
    expect(judge(raw, "combat/end_turn")).toMatchObject({ certain: true, tier: "rules", held: { damage: 6 } });
  });
});
