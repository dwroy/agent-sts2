/** Fixed construction trajectory, including SL/restart and bounded prompt projection. */
import { describe, expect, it } from "vitest";
import { parseGameState, type GameState } from "../src/hand/mod/schema.js";
import { RunJournal, type JournalEntry } from "../src/memory/run-journal.js";
import { replayRun } from "../src/memory/journal-replay.js";
import { CONSTRUCTION_LOG_MAX_CHARS, CONSTRUCTION_LOG_NOTE, constructionLogView, isConstructionQuestion } from "../src/memory/construction-log.js";
import { toJsonValue } from "../src/core/util/json.js";
import { baseState, runPayload, testKnowledge } from "./scenarios.js";

const card = (id: string, upgraded = false) => ({ card_id: id, name: id, upgraded });
type Card = ReturnType<typeof card>;
function state(floor: number, deck: Card[], screen = "REWARD", extra = {}): GameState {
  return parseGameState(baseState(screen, { run: runPayload({ floor, deck }), ...extra }));
}
function entry(action: string, by = "codex", reason = "固定构筑理由", extra: Partial<JournalEntry> = {}): JournalEntry {
  return { label: "reward/card", by, choice: "fixed", reason, intent: { action, option_index: 0 }, asked: true, ...extra };
}
const view = (j: RunJournal) => constructionLogView(j.constructionSnapshot());

describe("observed construction history", () => {
  it("replays a complete synthetic run: take, skip/options, shop, remove, smith, event add and transform", () => {
    const j = new RunJournal();
    const states: Record<string, ReturnType<typeof toJsonValue>>[] = [], decisions: typeof states = [];
    let clock = 0;
    function poll(s: GameState, e?: JournalEntry) {
      const ts = String(++clock).padStart(5, "0"), fp = `fp${clock}`;
      j.observe(s);
      states.push({ ts, observed_ts: ts, fingerprint: fp, state: toJsonValue(s.raw), ...(e ? {} : { observed: true }) });
      if (e) {
        j.record(s, e);
        decisions.push({ ts, observed_ts: ts, fingerprint: fp, label: e.label, decider: e.by, chosen: toJsonValue(e.intent), journal: toJsonValue(e), result: "completed" });
      }
    }
    let deck = [card("A"), card("A"), card("B")];
    poll(state(1, deck, "REWARD", { reward: { card_options: [{ index: 0, ...card("C") }] } }), entry("choose_reward_card", "codex", "方向一的第一张"));
    expect(view(j).entries).toHaveLength(0);
    deck = [...deck, card("C")];
    poll(state(1, deck));
    poll(state(2, deck, "REWARD", { reward: { card_options: [card("D"), card("E")] } }), entry("skip_reward_cards", "codex", "都不补当前缺口"));
    poll(state(3, deck, "SHOP", { shop: { cards: [{ index: 0, ...card("F") }] } }), entry("buy_card", "dsh", "补充本局方向", { label: "shop/plan", planRef: "shop-1" }));
    deck = [...deck, card("F")];
    poll(state(3, deck, "CARD_SELECTION", { selection: { kind: "deck_card_select", cards: [{ index: 0, ...card("A") }] } }), entry("select_deck_card", "dsh", "", { label: "selection/planned", planRef: "shop-1" }));
    deck = deck.slice(1);
    poll(state(3, deck, "MAP"));
    poll(state(4, deck, "CARD_SELECTION", { selection: { kind: "deck_upgrade_select", cards: [{ index: 0, ...card("B") }] } }), entry("select_deck_card", "jev", "ignored", { label: "selection/upgrade" }));
    deck = deck.map(c => c.card_id === "B" ? card("B", true) : c);
    poll(state(4, deck, "MAP"));
    poll(state(5, deck, "EVENT"), entry("choose_event_option", "code", "ignored", { label: "event/only" }));
    deck = [...deck, card("G")];
    poll(state(5, deck, "MAP"));
    poll(state(6, deck, "CARD_SELECTION", { selection: { kind: "deck_transform_select", cards: [{ index: 0, ...card("A") }] } }), entry("select_deck_card", "codex", "转换现有重复牌", { label: "selection/transform" }));
    deck = [...deck.filter(c => c.card_id !== "A"), card("H")];
    poll(state(6, deck, "MAP"));
    const entries = view(j).entries;
    expect(entries.map(e => [e.floor, e.action, e.cards, e.reason])).toEqual([
      [1, "拿", "C", "方向一的第一张"], [2, "跳过", "D/E", "都不补当前缺口"],
      [3, "商店买", "F", "补充本局方向"], [3, "删", "A", "补充本局方向"],
      [4, "升级", "B+", "jev"], [5, "事件加牌", "G", "code"], [6, "事件变牌", "A→H", "转换现有重复牌"],
    ]);
    expect(view(replayRun({ runId: "TESTRUN123", states, decisions, runPlans: [] }, testKnowledge).journal)).toEqual(view(j));
    expect(j.constructionSnapshot().deck?.map(c => c.id)).toEqual(deck.map(c => c.card_id));
  });

  it("restores a managed SL snapshot, then honors the logged rollback even across another restart", () => {
    const j = new RunJournal();
    const start = state(3, [card("A")], "COMBAT", { in_combat: true });
    j.observe(start);
    const checkpoint = j.snapshot(), construction = j.constructionSnapshot();
    const changed = state(3, [card("A"), card("TEMP")], "COMBAT", { in_combat: true });
    j.observe(changed);
    expect(view(j).entries[0]?.cards).toBe("TEMP");
    j.restore(checkpoint);
    j.observe(start);
    expect(view(j).entries).toEqual([]);
    expect(j.constructionSnapshot().deck).toEqual(construction.deck);
    const replay = replayRun({ runId: "TESTRUN123", states: [
      { ts: "1", fingerprint: "1", state: toJsonValue(start.raw), observed: true },
      { ts: "2", fingerprint: "2", state: toJsonValue(changed.raw) },
      { ts: "3", fingerprint: "3", state: toJsonValue(start.raw), observed: true },
    ], decisions: [{ ts: "2", fingerprint: "2", result: "not dispatched: SL reloaded the fight", construction_restore: toJsonValue(construction) }], runPlans: [] }, testKnowledge);
    expect(view(replay.journal)).toEqual(view(j));
    expect(replay.journal.constructionSnapshot().deck).toEqual(construction.deck);
  });

  it("drops an abandoned future on a floor rollback and keeps a legitimate later reversal", () => {
    const j = new RunJournal();
    const a = [card("A")];
    j.observe(state(1, a));
    j.record(state(1, a), entry("skip_reward_cards"));
    j.observe(state(2, a));
    j.record(state(2, a), entry("skip_reward_cards"));
    j.observe(state(3, [...a, card("FUTURE")]));
    j.observe(state(2, a));
    expect(view(j).entries.map(e => e.floor)).toEqual([1]);
    j.observe(state(2, [...a, card("REAL")]));
    j.observe(state(2, a));
    expect(view(j).entries.map(e => e.action)).toEqual(["跳过", "加牌", "删"]);
  });

  it("uses actual deltas, including duplicate copies and explicit empty decks; missing decks and combat picks add nothing", () => {
    const j = new RunJournal();
    const s = state(1, [card("A"), card("A")]);
    j.observe(s);
    j.record(s, entry("choose_reward_card"));
    j.observe(s); // An action still awaiting confirmation is not an acquisition.
    expect(view(j).entries).toHaveLength(0);
    j.observe(state(1, [card("A")]));
    expect(view(j).entries[0]?.cards).toBe("A");
    j.observe(parseGameState(baseState("MAP", { run: runPayload({ floor: 1, deck: null }) })));
    expect(view(j).entries).toHaveLength(1);
    j.observe(state(1, []));
    expect(view(j).entries).toHaveLength(2);
    const combat = state(2, [], "COMBAT", { in_combat: true });
    j.observe(combat);
    j.record(combat, entry("select_deck_card", "codex", "", { label: "selection/discard" }));
    j.observe(state(2, []));
    expect(view(j).entries).toHaveLength(2);
    const newRun = parseGameState({ ...s.raw, run_id: "ANOTHERRUN12" });
    j.observe(newRun);
    expect(view(j).entries).toEqual([]);
  });

  it("attributes an acquisition seen on the next floor to the action's original floor", () => {
    const j = new RunJournal();
    const s = state(3, [], "REWARD", { reward: { card_options: [card("A")] } });
    j.observe(s); j.record(s, entry("choose_reward_card"));
    j.observe(state(4, [card("A")], "MAP"));
    expect(view(j).entries[0]).toMatchObject({ floor: 3, action: "拿", cards: "A", source: "codex" });
  });

  it("keeps the opening four and latest 36, bounded names/reasons, and excludes shadow choices", () => {
    const j = new RunJournal();
    for (let f = 1; f <= 70; f++) {
      const s = state(f, [], "REWARD", { reward: { card_options: [card(String(f) + "卡".repeat(500))] } });
      j.observe(s); j.record(s, entry("skip_reward_cards", "codex", "构筑🙂".repeat(100)));
    }
    const data = view(j);
    expect(data.omitted).toBe(30);
    expect(data.entries.map(e => e.floor)).toEqual([1, 2, 3, 4, ...Array.from({ length: 36 }, (_, i) => i + 35)]);
    expect(data.entries.every(e => Array.from(e.reason).length <= 20)).toBe(true);
    const final = state(70, []);
    const text = j.render(final, testKnowledge, {}, { label: "reward/card" }).construction_log!;
    expect(text).toContain(CONSTRUCTION_LOG_NOTE);
    expect(text).toContain("省略30条");
    expect(text.length).toBeLessThanOrEqual(CONSTRUCTION_LOG_MAX_CHARS);
    j.record(final, entry("skip_reward_cards", "codex", "", { executed: false }));
    expect(view(j)).toEqual(data);
    expect(j.render(final, testKnowledge, {}, { label: "combat/plan" }).construction_log).toBeUndefined();
    expect(j.render(state(70, [], "CARD_SELECTION", { in_combat: true }), testKnowledge, {}, { label: "selection/exhaust" }).construction_log).toBeUndefined();
  });

  it("attaches to every construction question family", () => {
    for (const label of ["reward/card", "shop/plan", "rest/plan", "selection/remove", "event/choose", "bundle/choose", "capstone/choose", "run-plan", "map/route-plan"]) expect(isConstructionQuestion(label)).toBe(true);
    expect(isConstructionQuestion("combat/plan")).toBe(false);
  });
});
