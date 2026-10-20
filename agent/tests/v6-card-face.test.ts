import { afterEach, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { asArray, asRecord } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { setCardUpgradesForTests } from "../src/knowledge/card-upgrades.js";
import { v6ProjectionStart, type V6StartContext } from "../src/sim/v6-start.js";
import type { BuildState } from "../src/construction/types.js";
import { setupOneshotTests } from "./oneshot-support.js";

setupOneshotTests();
afterEach(() => setKnowledgeCharacter(null));
const frozen = JSON.parse(readFileSync(new URL("./v6-fixtures/v6-r405-card-options.json", import.meta.url), "utf8"));
const target = { id: "boss", boss: "WATERFALL_GIANT", act: 1, floor: 17, kind: "current" as const, probability: 1, labels: [] };
function fixture() {
  setKnowledgeCharacter("silent"); setCardUpgradesForTests({});
  const raw = structuredClone(frozen.states["T0TP8S9MMU9Q-f2-REWARD"]), run = asRecord(raw.run);
  const context: V6StartContext = { state: parseGameState(raw), knowledge: makeKnowledge(frozen.knowledge_fixture, "cache"),
    currentRouteHp: Number(run.current_hp), doubleBoss: null, models: frozen.models,
    targets: { character: "silent", ascension: 10, act: 1, floor: 2, visible: [], observations: [], doubleBoss: null } };
  const build: BuildState = { cards: asArray(run.deck).map(c => ({ id: String(asRecord(c).card_id), upgraded: asRecord(c).upgraded === true })),
    relics: asArray(run.relics).map(r => String(asRecord(r).relic_id)), hp: Number(run.current_hp), maxHp: Number(run.max_hp),
    gold: Number(run.gold), floor: 2, cap: null };
  const face = asRecord(asArray(asRecord(raw.reward).card_options)[0]);
  return { raw, run, context, build, face };
}
it("materializes a reward transition's identity placeholder from the observed face without changing held state", () => {
  const { raw, run, context, build, face } = fixture(), id = String(face.card_id);
  face.energy_cost = Number(face.energy_cost) + 1; // A fixture-only instance difference must beat catalogue defaults.
  asArray(run.deck).push({ card_id: id, upgraded: false, index: build.cards.length });
  build.cards.push({ id, upgraded: false }); context.state = parseGameState(raw);
  const before = JSON.stringify(raw), prepared = v6ProjectionStart(context, target, build)!;
  const model = prepared.input.piles.draw.find(card => card.cardId === id)!;
  expect(model).toMatchObject({ cost: face.energy_cost, known: true });
  expect(model.block).toBeGreaterThan(0); expect(JSON.stringify(raw)).toBe(before);
});
it("uses the existing catalogue face for an unheld base card and refuses an unobserved upgraded face", () => {
  const { raw, context, build, face } = fixture(), id = String(face.card_id);
  asRecord(raw.reward).card_options = []; context.state = parseGameState(raw); build.cards.push({ id, upgraded: false });
  const model = v6ProjectionStart(context, target, build)!.input.piles.draw.find(c => c.cardId === id)!;
  expect(model).toMatchObject({ cost: context.knowledge.card(id)!.cost, known: true }); expect(model.block).toBeGreaterThan(0);
  build.cards.at(-1)!.upgraded = true;
  expect(v6ProjectionStart(context, target, build)).toBeNull();
});
it("labels an unsupported playable card explicitly while excluding an unplayable curse from this guard", () => {
  const { raw, context, build } = fixture(), base = context.knowledge.card("DODGE_AND_ROLL")!, original = context.knowledge;
  const id = "UNMODELLED_FIXTURE";
  context.knowledge = { ...original, card(key) { return key === id ? { ...base, id, type: "Skill", cost: 1,
    description: "unsupported fixture", descriptionRaw: "unsupported fixture", vars: [], keywords: [] } : original.card(key); } };
  asRecord(raw.reward).card_options = []; context.state = parseGameState(raw); build.cards.push({ id, upgraded: false });
  const result = v6ProjectionStart(context, target, build)!;
  expect(result.labels).toContain(`unmodelled_card:${id}`);
  expect(result.input.piles.draw.find(c => c.cardId === id)).toMatchObject({ known: false, playable: true });
  const curse = result.input.piles.draw.find(c => c.cardId === "ASCENDERS_BANE")!;
  expect(curse.playable).toBe(false); expect(result.labels).not.toContain("unmodelled_card:ASCENDERS_BANE");
});
