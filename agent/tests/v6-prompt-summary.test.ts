import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it, vi } from "vitest";
import { boundV6State, boundedV6Jev, compactBuildMetrics, promptBudgetLabels, V6_BRAIN_CHARS, V6_JEV_REQUEST_BYTES, V6_JEV_STATE_BYTES } from "../src/v6/prompt-summary.js";
import { directionSummaries, directionTask, directionPlanSpec } from "../src/v6/direction-plan.js";
import { buildV6CardPick } from "../src/v6/card-pick.js";
import { buildV6RoomDecision } from "../src/hand/screens/v6-room.js";
import { v6ShopOptions, v6RestOptions } from "../src/hand/screens/v6-room-options.js";
import { validateProjectionEntry } from "../src/v6/formats.js";
import { V6BuildLog } from "../src/v6/log.js";
import { v6Config } from "../src/v6/config.js";
import { asArray, asRecord, toJsonValue } from "../src/core/util/json.js";
import { choiceQ } from "../src/reflex/jev/questions.js";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { comboProjection } from "./v6-direction-core-fixtures.js";
import { FixedRunner, request, source } from "./v6-projection-fixture.js";
import { v6Directions } from "../src/sim/v6-completion.js";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { ensureDirectionPlan } from "../src/v6/direction-runtime.js";
import { logRow } from "./v6-fixtures.js";
import { board, env, setupOneshotTests, type Raw } from "./oneshot-support.js";

setupOneshotTests();
afterEach(() => vi.unstubAllEnvs());
const knowledge = fileURLToPath(new URL("../../knowledge", import.meta.url));
// Use the published R2 file, not a small synthetic replacement that hides the production size.
const loaded = loadV6Knowledge(knowledge, "silent").cores;
if (loaded.status !== "loaded") throw Error("Published Silent build cores required");
const cores = loaded.value;
const summaries = directionSummaries("silent", 10, cores, [], null);
const weights = { P: .1, D: .1, S: .1, R: .7 };
const entries = summaries.flatMap(d => d.combos.flatMap(c => ["f48:AEONGLASS", "chain:unknown"].map(target_id => ({ ...comboProjection(),
  direction_id: d.id, combo_id: c.id, combo_metrics: c.metrics, target_id, expected_win: d.id === "R" ? .7 : .56 }))));
const size = (v: unknown) => Buffer.byteLength(JSON.stringify(v));
function on() {
  vi.stubEnv("CHARACTER", "silent"); vi.stubEnv("V6_BUILD", "on");
  for (const name of ["CARD", "POTION", "SHOP", "REST"]) vi.stubEnv(`V6_${name}_DECIDER`, "jev");
}
function situation(kind: "card" | "shop" | "rest") {
  const raw = kind === "card" ? board("xljq-f5-reward", "reward") : kind === "shop" ? board("u6ru-f22-shop", "open") : board("w2tb-f7-rest", "rest");
  Object.assign(raw.run as Raw, { character_id: "SILENT", ascension: 10 });
  if (kind === "card") {
    raw.available_actions = ["choose_reward_card", "skip_reward_cards"];
    raw.reward = { pending_card_choice: true, card_options: [0, 1, 2].map(index => ({ index, card_id: "TEST_CARD", upgraded: false })) };
  }
  const e = env(raw);
  e.screenMemory.runPlan = { runId: String(raw.run_id), act: 1, v6: { direction_weights: weights, potion_directions: [], checkpoint: 40 } } as typeof e.screenMemory.runPlan;
  return e;
}
it("consumes known provider rows for all published R2 combos without replacing large snapshots with unknown", async () => {
  on();
  const e = situation("card"), r = request(), provider = source({ skip: 1, take: 1 });
  const resolve = provider.resolve;
  provider.resolve = context => {
    const set = resolve(context)!;
    set.combinations = context.direction.combos.map(combo => ({ ...set.combinations[0]!,
      id: combo.id, source: combo.source, requirements: combo.requirements, summary: combo.summary,
      availability: { skip: 1, card0: 1 }, supply: { skip: Array(200).fill(true), card0: Array(200).fill(true) } }));
    return set;
  };
  r.directions = v6Directions("silent", 10, [], null, cores); r.weights = weights;
  r.options[0]!.id = "card0"; r.completionSources = [provider];
  const table = await new V6ProjectionEngine(new FixedRunner()).evaluate(r);
  const pick = buildV6CardPick(e, table, knowledge)!;
  const known = pick.entries.filter(row => row.target_id === "boss" && ["card0", "skip"].includes(row.option_id));
  expect(new Set(known.map(row => row.combo_id)).size).toBe(17);
  expect(known.every(row => row.win !== null && validateProjectionEntry(row).ok)).toBe(true);
  e.v6DirectionEvaluation = { entries: known, targets: table.targets };
  const dir = mkdtempSync(join(tmpdir(), "v6-r2-consumer-"));
  try {
    const askJson = vi.fn(async () => ({ json: { schema: "direction-weights-v1", direction_weights: weights,
      potion_directions: [], route: "keep", rest: "auto", checkpoint: 40, reason: "Fixed contract" }, meta: {} }));
    await ensureDirectionPlan(e, { askJson }, join(dir, "plans.jsonl"), knowledge);
    expect(askJson).toHaveBeenCalledOnce();
    const audit = readFileSync(join(dir, "v6-build.jsonl"), "utf8").trim().split("\n").map(s => JSON.parse(s));
    const logged = audit.flatMap(row => row.entries).filter(row => row.target_id === "boss");
    expect(new Set(logged.filter(row => row.win !== null).map(row => row.combo_id)).size).toBe(17);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}, 20_000);
it("retains all 17 real metric snapshots for numeric validation and full content-addressed audit", () => {
  expect(summaries.flatMap(d => d.combos)).toHaveLength(17);
  expect(entries.every(e => validateProjectionEntry(e).ok)).toBe(true);
  const dir = mkdtempSync(join(tmpdir(), "v6-metric-audit-"));
  try {
    const logger = new V6BuildLog(v6Config({ V6_BUILD: "shadow" }), join(dir, "v6-build.jsonl"));
    const realRewardRows = Array.from({ length: 1224 }, (_, i) => entries[i % entries.length]!);
    expect(logger.append({ ...logRow, entries: realRewardRows, unknown: { count: 0, total: realRewardRows.length } })).toEqual({ written: true });
    const audit = JSON.parse(readFileSync(join(dir, "v6-build.jsonl"), "utf8"));
    expect(audit.entries).toHaveLength(1224); expect(audit.metric_audits).toHaveLength(17);
    expect(readdirSync(join(dir, "v6-metrics"))).toHaveLength(17);
    for (const ref of audit.metric_audits) {
      const snapshot = readFileSync(join(dir, ref.file), "utf8").trimEnd();
      expect(createHash("sha256").update(snapshot).digest("hex")).toBe(ref.sha256);
      expect(JSON.parse(snapshot)).toEqual(entries.find(e => e.combo_id === ref.combo_id)!.combo_metrics);
    }
    expect(size(audit)).toBeLessThan(2 * 1024 * 1024);
  } finally { rmSync(dir, { force: true, recursive: true }); }
});
it("summarizes pooled main metrics with separate denominators and the requested A10 target", () => {
  const metrics = compactBuildMetrics(cores[0]!.combos[0]!.metrics, ["f49:AEONGLASS"]) as Raw[];
  expect(metrics.map(m => m.attempt)).toEqual(["first", "including_sl"]);
  expect(metrics[0]).toMatchObject({ dpr_boss: { n: expect.any(Number) }, startup_turn: { n: expect.any(Number) },
    formed_runs: { n: expect.any(Number) }, cleared_runs: { n: expect.any(Number) },
    chain_f48_f49: { win_rate: { n: expect.any(Number) } }, target_ascension: 10,
    adjusted_win_rates: [expect.objectContaining({ target: "AEONGLASS-F49", n: expect.any(Number) })] });
  expect(JSON.stringify(metrics)).not.toMatch(/"(evidence|sources|regression|shrinkage|simulation|distribution)"/);
});
it("bounds real 17-combo act/replan prompts deterministically and preserves all direction answer keys", () => {
  const input = { summaries, entries, appearedCards: [], potionIds: [], floor: 8, current: {}, previous: { direction_weights: weights } };
  const payload = directionTask(input);
  expect(JSON.stringify(payload).length).toBeLessThanOrEqual(V6_BRAIN_CHARS);
  expect(directionTask(input)).toEqual(payload);
  const first = asRecord(asArray(payload.build_cores)[0]);
  expect(first.id).toBe("R"); expect(asArray(first.combos).length).toBeGreaterThan(0);
  expect(directionPlanSpec(payload)!.schema.properties!.direction_weights!.required).toEqual(["P", "D", "S", "R"]);
  expect(JSON.stringify(payload)).not.toContain('"combo_metrics"');
  expect(JSON.stringify(payload)).not.toMatch(/"(evidence|regression|shrinkage|simulation|sources)"/);
  const forced = boundV6State({ ...payload, oversized: "超长".repeat(100_000) }, V6_BRAIN_CHARS, "chars");
  expect(JSON.stringify(forced).length).toBeLessThanOrEqual(V6_BRAIN_CHARS);
  expect(promptBudgetLabels(forced)).toHaveLength(1);
  expect(asRecord(asArray(forced.build_cores)[0]).id).toBe("R");
});
it.each(["card", "shop", "rest"] as const)("bounds the real published %s prompt and preserves legal choices plus the leading combo", kind => {
  on(); const e = situation(kind);
  const d = kind === "card" ? buildV6CardPick(e, undefined, knowledge)!.decision
    : buildV6RoomDecision(e, (kind === "shop" ? v6ShopOptions(e) : v6RestOptions(e))!, undefined, undefined, knowledge);
  expect(size(d.state)).toBeLessThanOrEqual(V6_JEV_STATE_BYTES);
  expect(size({ model: "typesafe/jev-1.14", state: d.state, questions: d.questions })).toBeLessThanOrEqual(V6_JEV_REQUEST_BYTES);
  expect(asRecord(asArray(d.state.core_metrics)[0]).direction).toBe("R");
  expect(Object.keys(asRecord(d.state.options))).toEqual(Object.keys(asRecord(d.questions.pick).criteria));
  if (kind === "card") for (const fact of Object.values(asRecord(d.state.options))) {
    const kept = asArray(asRecord(fact).projections);
    expect(kept.length).toBeGreaterThan(0);
    expect(asRecord(kept[0]).direction_id).toBe("R");
  }
  expect(promptBudgetLabels(d.state)).toHaveLength(1);
  expect(JSON.stringify(d.state)).not.toContain('"combo_metrics"');
  const choice = Object.keys(asRecord(d.questions.pick).criteria)[0]!;
  const resolved = d.resolve({ pick: { type: "choice", choice, confidence: .8, probabilities: { [choice]: 1 }, raw: {} } });
  expect(resolved.intent).toBeTruthy(); expect(resolved.fallback).toBe(false);
  expect(d.resolve({}).fallback).toBe(true);
});
it("bounds UTF-8 potion state and question text, preserving all slot/candidate keys and logging omissions", () => {
  const options = Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`o${i}`, { holding_hp: i, text: "很长".repeat(2000) }]));
  const questions = { pick: choiceQ("很长".repeat(2000), Object.fromEntries(Object.keys(options).map(k => [k, JSON.stringify(options[k])]))), slot: { type: "noul" as const, instructions: "Keep slot 0?" } };
  const result = boundedV6Jev(toJsonValue({ options, direction_weights: weights }) as Record<string, import("../src/core/util/json.js").JsonValue>, questions);
  expect(size(result.state)).toBeLessThanOrEqual(V6_JEV_STATE_BYTES);
  expect(size({ model: "typesafe/jev-1.14", ...result })).toBeLessThanOrEqual(V6_JEV_REQUEST_BYTES);
  expect(Object.keys(asRecord(result.state.options))).toEqual(Object.keys(options));
  expect(Object.keys(asRecord(result.questions.pick).criteria)).toEqual(Object.keys(options));
  expect(result.questions.slot).toEqual(questions.slot);
  expect(asRecord(result.state.prompt_budget).after).toBe(size(result.state));
  expect(promptBudgetLabels(result.state)).toHaveLength(1);
});
