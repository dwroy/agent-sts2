import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { asArray, asRecord } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { setCardUpgradesForTests, type CardUpgrade } from "../src/knowledge/card-upgrades.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import * as bossStart from "../src/sim/boss-start.js";
import { v6ProjectionStart, type V6StartContext } from "../src/sim/v6-start.js";
import type { BuildState } from "../src/construction/types.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { loggedKnowledge } from "./logged.js";
import { board } from "./oneshot-support.js";

const observed = JSON.parse(readFileSync(new URL("./card-upgrade-data/upgrades.json", import.meta.url), "utf8")) as Record<string, CardUpgrade>;
const catalog = JSON.parse(readFileSync(new URL("./card-upgrade-data/catalog.json", import.meta.url), "utf8"));
const silentCards = makeKnowledge(catalog.collections, "cache");
const knowledge = { ...loggedKnowledge, card: (id: string | null | undefined) => silentCards.card(id) ?? loggedKnowledge.card(id) };
afterEach(() => { setCardUpgradesForTests(null); vi.restoreAllMocks(); });

function fixture() {
  const raw = board("xljq-f5-reward", "reward"), run = asRecord(raw["run"]);
  run["character_id"] = "SILENT";
  const state = parseGameState(raw);
  const build: BuildState = {
    cards: asArray(run["deck"]).map(c => ({ id: String(asRecord(c)["card_id"]), upgraded: asRecord(c)["upgraded"] === true })),
    relics: asArray(run["relics"]).map(c => String(asRecord(c)["relic_id"])), hp: 40,
    maxHp: Number(run["max_hp"]), gold: 0, floor: 5, cap: null,
  };
  const context: V6StartContext = { state, knowledge, currentRouteHp: 27, doubleBoss: null,
    models: { db: FIXTURE_DB, mm: FIXTURE_MM },
    targets: { character: "silent", ascension: state.run!.ascension!, act: 1, floor: 5, visible: [], observations: [], doubleBoss: null } };
  return { raw, run, build, context };
}
const target = { id: "boss", boss: "SOUL_FYSH", act: 1, floor: 17, kind: "current" as const, probability: 1, labels: [] };

it("passes actual logged text-only upgraded faces into the synthetic opening without mutating the source", () => {
  setCardUpgradesForTests(observed);
  const { raw, build, context } = fixture(), before = JSON.stringify(raw);
  const spy = vi.spyOn(bossStart, "syntheticBossStart");
  for (const [id, entry] of Object.entries(observed)) {
    const result = v6ProjectionStart(context, target, { ...build, cards: [...build.cards, { id, upgraded: true }] });
    expect(result, id).not.toBeNull();
    const actual = asArray(spy.mock.calls.at(-1)![0].run!.raw["deck"]).map(asRecord).at(-1)!;
    expect(actual, id).toMatchObject(entry.faces![1].card);
    expect(entry.faces![1].evidence.run_id).toBeTruthy();
  }
  expect(JSON.stringify(raw)).toBe(before);
});

it("keeps held instance metadata while replacing base rules, and preserves an already-held upgraded face", () => {
  setCardUpgradesForTests(observed);
  const { raw, run, build, context } = fixture(), entry = observed["MALAISE"]!;
  const card = { ...structuredClone(entry.faces![0].card), fixture_counter: 7 };
  asArray(run["deck"]).push(card);
  const spy = vi.spyOn(bossStart, "syntheticBossStart");
  expect(v6ProjectionStart({ ...context, state: parseGameState(raw) }, target,
    { ...build, cards: [...build.cards, { id: "MALAISE", upgraded: true }] })).not.toBeNull();
  let actual = asArray(spy.mock.calls.at(-1)![0].run!.raw["deck"]).map(asRecord).at(-1)!;
  expect(actual).toMatchObject({ ...entry.faces![1].card, fixture_counter: 7 });
  Object.assign(card, entry.faces![1].card, { resolved_rules_text: "fixture held instance text" });
  expect(v6ProjectionStart({ ...context, state: parseGameState(raw) }, target,
    { ...build, cards: [...build.cards, { id: "MALAISE", upgraded: true }] })).not.toBeNull();
  actual = asArray(spy.mock.calls.at(-1)![0].run!.raw["deck"]).map(asRecord).at(-1)!;
  expect(actual["resolved_rules_text"]).toBe("fixture held instance text");
});

it("still refuses an upgraded completion when paired upgrade evidence is absent", () => {
  setCardUpgradesForTests({});
  const { build, context } = fixture();
  expect(v6ProjectionStart(context, target, { ...build, cards: [...build.cards, { id: "MALAISE", upgraded: true }] })).toBeNull();
});

it("does not overwrite an enchanted held card with an unmodified observed upgrade face", () => {
  setCardUpgradesForTests(observed);
  const { raw, run, build, context } = fixture();
  asArray(run["deck"]).push({ ...structuredClone(observed["MALAISE"]!.faces![0].card), enchantment: { fixture: true } });
  expect(v6ProjectionStart({ ...context, state: parseGameState(raw) }, target,
    { ...build, cards: [...build.cards, { id: "MALAISE", upgraded: true }] })).toBeNull();
});
