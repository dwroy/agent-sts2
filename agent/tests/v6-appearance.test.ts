import { fixtureOutput } from "./fixture-command.js";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { v6AppearanceSchema, type V6Appearance } from "../src/v6/appearance.js";
import { validate } from "../src/v6/schema.js";
import { assembleV6History, loadV6HistoryPack, sealV6History } from "../src/sim/v6-history-pack.js";

const fixture = () => JSON.parse(fixtureOutput("nice", ["-n", "19", "python3", "tests/appearance_stats_test.py", "--fixture"], { encoding: "utf8" })) as V6Appearance;
function input() {
  const appearance = fixture(), generated_at = "2020-01-01T00:56:00.000Z";
  return { character: "silent" as const, cutoff: appearance.cutoff, generated_at,
    sources: ["coverage", "frames", "fights", "opportunities"].map(name => ({ name, bytes: 1, sha256: "a".repeat(64) })),
    coverage: appearance.runs.map(r => ({ run_id: r.run_id, ended: r.ended, ascension: r.ascension, first_stop: null,
      first_trial_final_victory: false, final_including_sl_victory: false })), frames: [], fights: [], combo_metrics: [],
    opportunities: { schema: "construction-opportunities-v1" as const, character: "silent" as const,
      generated: appearance.cutoff, cutoff: appearance.cutoff, digest: "b".repeat(64), limitations: [], rows: [] }, appearance };
}
describe("frozen card appearance observations", () => {
  it("checks fixed raw observations with the production Python collector", () => {
    const result = fixtureOutput("nice", ["-n", "19", "python3", "tests/appearance_stats_test.py"], { encoding: "utf8", stdio: "pipe" });
    expect(result).toBe("");
    expect(validate(v6AppearanceSchema, fixture()).ok).toBe(true);
  });
  it("rejects invented zeros, double counts, missing rarity, unsupported scope and tampered distributions", () => {
    const mutate = (fn: (v: V6Appearance) => void) => { const v = fixture(); fn(v); expect(validate(v6AppearanceSchema, v).ok).toBe(false); };
    mutate(v => { v.cards[0]!.probability = 0; });
    mutate(v => { v.cards[0]!.rarity = ""; });
    mutate(v => { v.cards[0]!.upgraded_appearances = 9; });
    mutate(v => { v.cards.push(v.cards[0]!); });
    mutate(v => { v.strata[0]!.run_ids[0] = "foreign"; });
    mutate(v => { v.remaining[0]!.median = 9; });
    mutate(v => { v.remaining[0]!.samples[0]!.run_id = "foreign"; });
    const spec = input(); spec.appearance.character = "ironclad";
    expect(() => assembleV6History(spec)).toThrow("appearance scope");
  });
  it("adds a sealed optional table while legacy packets stay byte-identical and off stays disabled", () => {
    const spec = input(), { appearance, ...legacy } = spec;
    const before = assembleV6History(legacy), after = assembleV6History(spec);
    expect(after.data.appearance).toEqual(appearance);
    expect(before.data).not.toHaveProperty("appearance");
    expect(JSON.stringify(sealV6History(before.data, before.generated_at))).toBe(JSON.stringify(before));
    const digest = createHash("sha256").update(JSON.stringify(before.data)).digest("hex");
    expect(before.content_sha256).toBe(digest);
    expect(loadV6HistoryPack("/unreadable-history", "silent", { mode: "off" })).toEqual({ status: "disabled", path: "", reason: "V6 off" });
    const { appearance: _removed, ...data } = after.data;
    expect(sealV6History(data, after.generated_at)).toEqual(before);
  });
});
