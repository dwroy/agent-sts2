/** G33HU22H2543 A10 F48 T1 / silent-0266: actual old collision, isolated from generated knowledge. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { RunJournal } from "../src/memory/run-journal.js";
import { createScreenMemory } from "../src/memory/types.js";
import { SlController } from "../src/sl/controller.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { turnKeys, turnOpen } from "../src/reflex/combat-plan.js";
import { canonWithin, canonWithoutUpgrades, cardsOf, cardsRepeat, exploreTarget, exploreTried,
  firstCardReplayScope, mayRepeat, potionsOf, triedHow, turnCanon, turnRepeats, type ExploreRow } from "../src/sl/explore.js";
import type { Step } from "../src/reflex/turn-solver.js";
import { card } from "./boss-sim-fixture.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_axe_identity__/${name}`,
}));

const fixture = JSON.parse(readFileSync(new URL("./silent-axe-identity-state.json", import.meta.url), "utf8"));
const entrance = "DRAMATIC_ENTRANCE+", afterimage = "AFTERIMAGE+";
const actual = [entrance, afterimage, "DEFEND_SILENT", "STRIKE_SILENT>女王", "NEUTRALIZE+>女王", "STRIKE_SILENT>女王", "PRODUCTION"];
const alternative = [afterimage, entrance, ...actual.slice(2)];
const step = (id: string, name = id, targetName: string | null = null): Step => ({
  cardIndex: 0, cardId: id.replace(/\+$/, ""), upgraded: id.endsWith("+"), name, target: targetName ? 0 : null, targetName,
});
const steps = (line: string[]) => line.map((play) => { const [id, target] = play.split(">"); return step(id!, id, target ?? null); });
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function controller() {
  const dir = mkdtempSync(join(tmpdir(), "axe-identity-")); dirs.push(dir);
  const config = { ...loadConfig({}).sl, enabled: true, bossRetries: 3, retryExplore: true,
    retryExploreCanon: true, retryExploreTurn: true, retryExplorePotion: true, retryExploreAnchor: true, retryCompute: false,
    log: join(dir, "attempts.jsonl") };
  const knowledge = makeKnowledge({ monsters: fixture.state.combat.enemies.map((enemy: { enemy_id: string }) => ({ id: enemy.enemy_id, type: "Boss" })) }, "cache");
  const sl = new SlController({ config, knowledge, elites: { source: "fixed test", date: "", elites: [] },
    client: { act: async () => { throw new Error("fixed test must not dispatch"); } } as never, note: () => {} });
  const memory = { journal: new RunJournal(), screenMemory: createScreenMemory() };
  return { sl, memory, log: config.log };
}

it("distinguishes the two observed first cards while preserving all target and duplicate counts", () => {
  expect(turnCanon(actual)).toBe(turnCanon(alternative));
  expect(turnCanon(actual, true)).not.toBe(turnCanon(alternative, true));
  expect(turnCanon(actual, true)).toBe(turnCanon([entrance, ...actual.slice(1).reverse()], true));
  expect(turnCanon(actual, true)).not.toBe(turnCanon(actual.slice(0, -2).concat("PRODUCTION"), true));
  expect(turnCanon(["STRIKE_SILENT>女王"], true)).not.toBe(turnCanon(["STRIKE_SILENT>火炬头聚合体"], true));
});

it("a potion before the first card does not consume the identity, and cards-only matching retains it", () => {
  const potion = "potion:POWER_POTION";
  const key = turnCanon([potion, ...actual], true);
  expect(cardsOf(key)).toBe(turnCanon(actual, true));
  expect(potionsOf(key)).toEqual(["POWER_POTION"]);
  const tried = { canon: [], loose: [], cards: [{ cards: cardsOf(key), drunk: ["POWER_POTION"] }] };
  expect(triedHow(tried, { text: "", canon: key })).toBe("cards");
  expect(triedHow(tried, { text: "", canon: turnCanon([potion, ...alternative], true) })).toBeNull();
  expect(cardsRepeat(tried.cards[0]!, turnCanon(actual, true))).toBe(true);
});

it("both canonical and summary keys carry the already-consumed first card across continuation", () => {
  const pending = { canon: [], text: [], firstCardReplay: true as const };
  const a = turnKeys(pending, steps(actual)), b = turnKeys(pending, steps(alternative));
  expect(a.canon).not.toBe(b.canon); expect(a.loose).not.toBe(b.loose);
  const prefix = { canon: [entrance], text: [entrance], firstCardReplay: true as const };
  expect(turnKeys(prefix, steps(actual.slice(1)))).toEqual(a);
  expect(turnKeys(prefix, steps([...actual.slice(1)].reverse())).canon).toBe(a.canon);
});

it("whole-turn and draw-prefix matching cannot bypass the first-card distinction", () => {
  const key = turnCanon(actual, true);
  const tried = { canon: [key], loose: [], cards: [{ cards: cardsOf(key), drunk: [] }] };
  expect(canonWithin(turnCanon([entrance], true), key)).toBe(true);
  expect(canonWithin(turnCanon([afterimage], true), key)).toBe(false);
  expect(mayRepeat(tried, { open: true, committed: turnCanon([afterimage], true) })).toBe(false);
  expect(mayRepeat(tried, { open: true, committed: turnCanon(["potion:POWER_POTION"], true) })).toBe(false);
  const open = turnOpen({ canon: [], text: [], firstCardReplay: true }, [step(afterimage)], []);
  expect(open.committed).toBe(turnCanon([afterimage], true));
  const draw = card(1, "FIXED_DRAW", { type: "Skill", target: "self", draw: 1 });
  const prefix = turnOpen({ canon: [entrance], text: [entrance], firstCardReplay: true },
    [{ ...step("FIXED_DRAW"), cardIndex: 1 }, step(afterimage)], [draw]);
  expect(prefix).toEqual({ open: true, committed: turnCanon([entrance, "FIXED_DRAW"], true) });
});

it("legacy sorted keys and a missing consumed prefix remain insufficient for exact or cards matching", () => {
  const old = turnCanon(actual), key = turnCanon(alternative, true);
  const tried = { canon: [old], loose: [old], cards: [{ cards: old, drunk: [] }, { cards: old, drunk: [], loose: true }] };
  expect(triedHow(tried, { text: "", canon: key, loose: key })).toBeNull();
  expect(triedHow(tried, { text: "", canon: key, loose: old })).toBeNull();
  expect(canonWithin(key, old)).toBe(false);
  const unknown = turnCanon(actual, "unknown");
  expect(triedHow({ canon: [unknown], loose: [unknown], cards: [{ cards: cardsOf(unknown), drunk: [] }] }, { text: "", canon: unknown, loose: unknown })).toBeNull();
  expect(canonWithin(unknown, unknown)).toBe(false);
});

it("recovers a real historical decision point without claiming its colliding alternative was played", () => {
  const point = fixture.collision;
  const row: ExploreRow = { attempt: 2, result: "predicted_death", turns: 9,
    explore: { target: null, points: [point], turns: [{ turn: 1, plays: actual, boards: [{ board: point.board, at: 0 }] }] } };
  const target = exploreTarget([row], 3, { canon: true, firstCardReplay: true }).target;
  expect(target?.board).toBe(point.board);
  expect(target?.excluded).not.toContain(point.alternatives[0]);
  expect(triedHow(target?.tried, { text: point.alternatives[0], ...turnKeys({ canon: [], text: [], firstCardReplay: true }, steps(alternative)) })).toBeNull();
});

it("persisted actual turns use the same identity as candidates, including upgrade-loose audit", () => {
  const record = { turn: 1, plays: actual, firstCardReplay: true as const, boards: [{ board: "fixed", at: 0 }] };
  const row: ExploreRow = { attempt: 1, result: "predicted_death", turns: 9, explore: { target: null, points: [], turns: [record] } };
  const tried = exploreTried([row], 2, "fixed", { canon: true, potion: true }).tried;
  expect(triedHow(tried, { text: "", canon: turnCanon(actual, true) })).toBe("exact");
  expect(triedHow(tried, { text: "", canon: turnCanon(alternative, true) })).toBeNull();
  expect(turnRepeats([row], 2, { ...record, plays: alternative }, tried, null)).toBeNull();
  expect(canonWithoutUpgrades(turnCanon(actual, true))).not.toBe(canonWithoutUpgrades(turnCanon(alternative, true)));
  expect(canonWithoutUpgrades(turnCanon([afterimage], true))).not.toBe(canonWithoutUpgrades(turnCanon(["AFTERIMAGE"], true)));
});

it("gates the identity to the actual Silent A10 Throwing Axe scope", () => {
  const raw = fixture.state;
  expect(firstCardReplayScope(parseGameState(raw))).toBe(true);
  for (const [character, ascension, held] of [["IRONCLAD", 10, true], ["SILENT", 7, true], ["SILENT", 10, false]] as const) {
    const copy = structuredClone(raw); copy.run.character_id = character; copy.run.ascension = ascension;
    if (!held) copy.run.relics = copy.run.relics.filter((relic: { relic_id: string }) => relic.relic_id !== "THROWING_AXE");
    expect(firstCardReplayScope(parseGameState(copy))).toBe(false);
  }
  expect(turnCanon(["B", "A"])).toBe("A, B");
});

it("the live controller carries potion and card prefixes, and persists the same first-card marker", () => {
  const { sl, memory, log } = controller();
  const state = parseGameState(fixture.state); sl.observe(state, memory);
  expect(sl.recordFor(state)?.played?.firstCardReplay).toBe(true);
  sl.noteAction(state, { action: "use_potion", option_index: 0 });
  expect(sl.recordFor(state)?.played?.firstCardReplay).toBe(true);
  sl.noteAction(state, { action: "play_card", card_index: 0 });
  const spentRaw = structuredClone(fixture.state); spentRaw.combat.player.cards_played_this_turn = 1;
  const spent = parseGameState(spentRaw); sl.observe(spent, memory);
  const played = sl.recordFor(spent)?.played;
  expect(played?.firstCardReplay).toBe(true);
  expect(cardsOf(turnKeys(played, steps(actual.slice(1))).canon!)).toBe(turnCanon(actual, true));
  const wonRaw = structuredClone(spentRaw); wonRaw.screen = "MAP"; wonRaw.in_combat = false; wonRaw.combat = null;
  sl.observe(parseGameState(wonRaw), memory);
  const row = JSON.parse(readFileSync(log, "utf8").trim().split("\n").at(-1)!);
  expect(row.explore.turns[0].firstCardReplay).toBe(true);
});

it("a controller restarted after consumption cannot assign the next card a new first-card identity", () => {
  const { sl, memory } = controller();
  const raw = structuredClone(fixture.state); raw.combat.player.cards_played_this_turn = 1;
  const state = parseGameState(raw); sl.observe(state, memory);
  const played = sl.recordFor(state)?.played;
  expect(played?.firstCardReplay).toBe("unknown");
  const key = turnKeys(played, steps(alternative)).canon!;
  expect(triedHow({ canon: [key], loose: [] }, { text: "", canon: key })).toBeNull();
});
