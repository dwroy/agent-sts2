import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { boundV6State, boundedV6Jev, compactBuildMetrics, compactProjection, promptBudgetLabels, V6_OPENING_NOTE, V6_BRAIN_CHARS, V6_JEV_REQUEST_BYTES, V6_JEV_STATE_BYTES } from "../src/v6/prompt-summary.js";
import { directionTask, directionPlanSpec } from "../src/v6/direction-plan.js";
import { buildV6CardPick } from "../src/v6/card-pick.js";
import { buildV6RoomDecision } from "../src/hand/screens/v6-room.js";
import { v6ShopOptions, v6RestOptions } from "../src/hand/screens/v6-room-options.js";
import { validateProjectionEntry } from "../src/v6/formats.js";
import { V6BuildLog } from "../src/v6/log.js";
import { v6Config } from "../src/v6/config.js";
import { asArray, asRecord, toJsonValue } from "../src/core/util/json.js";
import { choiceQ } from "../src/reflex/jev/questions.js";
import { comboProjection } from "./v6-direction-core-fixtures.js";
import { FixedRunner, request, source } from "./v6-projection-fixture.js";
import { v6Directions } from "../src/sim/v6-completion.js";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { ensureDirectionPlan } from "../src/v6/direction-runtime.js";
import { logRow } from "./v6-fixtures.js";
import { setupOneshotTests } from "./oneshot-support.js";

import { knowledge, cores, summaries, weights, entries, size, on, situation, shopTable } from "./v6-prompt-summary-fixtures.js";

setupOneshotTests();
afterEach(() => vi.unstubAllEnvs());
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
  expect(payload.opening_note).toBe(V6_OPENING_NOTE);
  const first = asRecord(asArray(payload.build_cores)[0]);
  expect(first.id).toBe("R"); expect(asArray(first.combos).length).toBeGreaterThan(0);
  expect(directionPlanSpec(payload)!.schema.properties!.direction_weights!.required).toEqual(["P", "D", "S", "R"]);
  expect(JSON.stringify(payload)).not.toContain('"combo_metrics"');
  expect(JSON.stringify(payload)).not.toMatch(/"(evidence|regression|shrinkage|simulation|sources)"/);
  const forced = boundV6State({ ...payload, oversized: "超长".repeat(100_000) }, V6_BRAIN_CHARS, "chars");
  expect(JSON.stringify(forced).length).toBeLessThanOrEqual(V6_BRAIN_CHARS);
  expect(promptBudgetLabels(forced)).toHaveLength(1);
  expect(forced.opening_note).toBe(V6_OPENING_NOTE);
  expect(asRecord(asArray(forced.build_cores)[0]).id).toBe("R");
});
it.each(["card", "shop", "rest"] as const)("bounds the real published %s prompt and preserves legal choices plus the leading combo", kind => {
  on(); const e = situation(kind);
  const d = kind === "card" ? buildV6CardPick(e, undefined, knowledge)!.decision
    : buildV6RoomDecision(e, (kind === "shop" ? v6ShopOptions(e) : v6RestOptions(e))!, undefined, undefined, knowledge);
  expect(size(d.state)).toBeLessThanOrEqual(V6_JEV_STATE_BYTES);
  expect(d.state.opening_note).toBe(V6_OPENING_NOTE);
  expect(size({ model: "typesafe/jev-1.14", state: d.state, questions: d.questions })).toBeLessThanOrEqual(V6_JEV_REQUEST_BYTES);
  expect(asRecord(asArray(d.state.core_metrics)[0]).direction).toBe("R");
  expect(Object.keys(asRecord(d.state.options))).toEqual(Object.keys(asRecord(d.questions.pick).criteria));
  if (kind === "card") for (const fact of Object.values(asRecord(d.state.options))) {
    const kept = asArray(asRecord(fact).projections);
    expect(kept.length).toBeGreaterThan(0);
    expect(asRecord(kept[0]).direction_id).toBe("R");
    expect(asRecord(kept[0]).opening).toEqual({ Wk: "opening unknown", W0: "opening unknown" });
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
  expect(result.state.opening_note).toBe(V6_OPENING_NOTE);
  expect(asRecord(result.state.prompt_budget).after).toBe(size(result.state));
  expect(promptBudgetLabels(result.state)).toHaveLength(1);
});

it("keeps unknown W0 distinct from evaluated zero without replacing it with the known Wk", () => {
  const entry = { ...comboProjection(), win: null, expected_win: null, win_incomplete: null };
  const view = asRecord(compactProjection(entry, ["unknown_opening_entry_hp_or_empirical_sample"]));
  expect(view).toMatchObject({ win: null, expected_win: null, win_complete: entry.win_complete, win_incomplete: null,
    opening: { Wk: "evaluated", W0: "opening unknown" }, unknown_reasons: ["unknown_opening_entry_hp_or_empirical_sample"] });
  expect(entry.win_incomplete).toBeNull();
  const zero = { ...entry, win_complete: { value: 0, se: 0, n: 20 }, win_incomplete: { value: 0, se: 0, n: 20 } };
  expect(asRecord(compactProjection(zero)).opening).toEqual({ Wk: "evaluated", W0: "evaluated" });
  const budgetOnly = asRecord(compactProjection({ ...entry, win_complete: null }, ["budget_remaining_unknown"]));
  expect(budgetOnly.opening).toEqual({ Wk: "opening unknown", W0: "opening unknown" });
  expect(budgetOnly.unknown_reasons).toEqual(["budget_remaining_unknown"]);
  expect(JSON.stringify(budgetOnly)).not.toMatch(/cardUpgrade|AFTERIMAGE|missing_upgrade_model/);
});

it("keeps a meaningful minimum for every one of 28 real shop choices with the published 17-combo file", () => {
  on(); const e = situation("shop"), input = v6ShopOptions(e)!;
  expect(input.options).toHaveLength(28);
  const table = shopTable(input);
  const d = buildV6RoomDecision(e, input, table, "ready", knowledge), opts = asRecord(d.state.options);
  expect(size(d.state)).toBeLessThanOrEqual(V6_JEV_STATE_BYTES);
  expect(size({ model: "typesafe/jev-1.14", state: d.state, questions: d.questions })).toBeLessThanOrEqual(V6_JEV_REQUEST_BYTES);
  expect(Object.keys(opts)).toEqual(input.options.map(o => o.option.key));
  expect(asRecord(asArray(d.state.core_metrics)[0]).direction).toBe("R");
  for (const [i, o] of input.options.entries()) {
    expect(opts[o.option.key]).not.toBeNull();
    const view = asRecord(opts[o.option.key]), fact = asRecord(view.facts), cmp = asRecord(view.comparison), p = asRecord(asArray(view.projections)[0]);
    if (asRecord(o.option.summary).id) expect(fact.id).toBe(asRecord(o.option.summary).id);
    if (asRecord(o.option.summary).card) expect(fact.card).toBe(asRecord(o.option.summary).card);
    expect(cmp.weighted_chain).toMatchObject({ delta: i === 27 ? null : { mean: .02, se: .001, n: 20 }, tier: i === 27 ? "unknown" : "better", known_mass: i === 27 ? .25 : 1 });
    expect(cmp.current_boss).toMatchObject({ delta: i === 27 ? null : { mean: -.01, se: .001, n: 20 }, tier: i === 27 ? "unknown" : "worse" });
    expect(p.direction_id).toBe("R"); expect(p.availability).toEqual({ take: .6, skip: .5 });
    expect(Number(p.availability_change)).toBeCloseTo(.1);
    expect(view.unknown_reasons).toContain("fixture_opening_limitation");
    if (i === 27) expect(view.unknown_reasons).toContain("fixture_incomplete_target_mass");
    expect(p.opening).toEqual({ Wk: "evaluated", W0: "evaluated" });
  }
  expect(buildV6RoomDecision(e, input, table, "ready", knowledge).state).toEqual(d.state);
  expect(d.roomEntries).toHaveLength(28 * 17 * 2);
  expect(table.combinations).toHaveLength(28 * 17 * 2);
  expect(promptBudgetLabels(d.state)).toHaveLength(1);
});
