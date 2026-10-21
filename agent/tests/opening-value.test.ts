import { expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadOpeningModel, openingFeatures, openingDescriptor, predictOpening, type OpeningInput } from "../src/v6/opening-value.js";
const path = new URL("../../knowledge/characters/silent/opening-value.json", import.meta.url).pathname;
const packet = JSON.parse(readFileSync(path, "utf8"));
it("matches held-out Python feature vectors and portable exported predictions", () => {
  const model = loadOpeningModel(path, "silent")!; expect(model).not.toBeNull();
  for (const row of packet.golden) {
    expect(openingFeatures(row.input, row.encounter, row.kind, model.features)).toEqual(row.features);
    const actual = predictOpening(model, row.input, row.encounter, row.kind);
    for (const key of ["hp_loss", "win", "turns"] as const) expect(actual[key]).toBeCloseTo(row.prediction[key], 10);
  }
  const sets = ["train", "calibration", "test"].map(k => new Set<string>(packet.support[k].runs));
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) expect([...sets[i]!].filter(r => sets[j]!.has(r))).toEqual([]);
});
it("derives generic poison/discard/shiv/power features from observed faces, not card-value constants", () => {
  const card = { card_id: "ARBITRARY", energy_cost: 1, upgraded: false, card_type: "Power", rules_text: "Poison. Discard. Shiv. Draw.", dynamic_values: [{ name: "Poison", current_value: 7 }] };
  expect(openingDescriptor(card)).toMatchObject({ "dynamic:Poison": 7, "text:poison": 1, "text:discard": 1, "text:shiv": 1, "type:Power": 1 });
  expect(openingDescriptor({rules_text:"抽两张。抽2张。抽牌。"})["text:draw"]).toBe(3);
  const row = packet.golden[0], input = row.input as OpeningInput;
  expect(openingFeatures({ ...input, deck: [...input.deck, card] }, row.encounter, row.kind, ["deck:count", "deck:dynamic:Poison", "card:ARBITRARY"]))
    .toEqual([input.deck.length + 1, input.deck.reduce((s, c) => s + (openingDescriptor(c)["dynamic:Poison"] ?? 0), 7), 1]);
});
it("keeps missing, cross-role, malformed and nonfinite packets unavailable", () => {
  const root = mkdtempSync(join(tmpdir(), "opening-model-"));
  try {
    expect(loadOpeningModel(join(root, "missing"), "silent")).toBeNull();
    expect(loadOpeningModel(path, "ironclad")).toBeNull();
    for (const bad of ["{}", "not json",
      JSON.stringify({ ...packet, models: { ...packet.models, hp_loss: { ...packet.models.hp_loss, trees: [[999999, 0, 1, 2]] } } }),
      JSON.stringify({ ...packet, remaining: { "1:2": { hallway: -1, elite: 0, boss: 1 } } }),
      JSON.stringify({ ...packet, errors: { ...packet.errors, boss: { ...packet.errors.boss, hp_rmse: -1 } } }),
      JSON.stringify({ ...packet, features: ["hp", 7] })]) {
      writeFileSync(join(root, "bad"), bad); expect(loadOpeningModel(join(root, "bad"), "silent")).toBeNull();
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
