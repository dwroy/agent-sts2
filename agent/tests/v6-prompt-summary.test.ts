import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { boundedV6Jev, compactBuildMetrics, compactProjection, promptBudgetLabels, V6_OPENING_NOTE, V6_JEV_REQUEST_BYTES, V6_JEV_STATE_BYTES } from "../src/v6/prompt-summary.js";
import { directionTask, directionPlanSpec } from "../src/v6/direction-plan.js";
import { DIRECTION_COMBAT_NOTE, DIRECTION_PROMPT_CHARS } from "../src/v6/direction-prompt.js";
import { buildV6CardPick } from "../src/v6/card-pick.js";
import { buildV6RoomDecision, isV6RoomDecision, prepareV6RoomDecision } from "../src/hand/screens/v6-room.js";
import { planShop } from "../src/hand/screens/shop.js";
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
import { planned, setupOneshotTests } from "./oneshot-support.js";

import { knowledge, cores, summaries, weights, entries, size, on, situation, shopTable } from "./v6-prompt-summary-fixtures.js";

setupOneshotTests();
afterEach(() => vi.unstubAllEnvs());
it("consumes known provider rows for all published R2 combos without replacing large snapshots with unknown", async () => {
  on();
  vi.stubEnv("V6_DIRECTION_REPLAN", "on");
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
  expect(JSON.stringify(payload).length).toBeLessThanOrEqual(DIRECTION_PROMPT_CHARS);
  expect(directionTask(input)).toEqual(payload);
  expect(payload.combat_note).toBe(DIRECTION_COMBAT_NOTE);
  expect(payload).not.toHaveProperty("opening_note");
  expect(payload).not.toHaveProperty("direction_evaluation");
  expect(payload).not.toHaveProperty("availability");
  expect(asArray(payload.build_cores).map(d => asRecord(d).id)).toEqual(["P", "D", "S", "R"]);
  expect(asArray(payload.build_cores).flatMap(d => asArray(asRecord(d).combos))).toHaveLength(17);
  const first = asRecord(asArray(payload.build_cores)[0]);
  expect(first.id).toBe("P"); expect(asArray(first.combos).length).toBeGreaterThan(0);
  expect(directionPlanSpec(payload)!.schema.properties!.direction_weights!.required).toEqual(["P", "D", "S", "R"]);
  expect(JSON.stringify(payload)).not.toContain('"combo_metrics"');
  expect(JSON.stringify(payload)).not.toMatch(/"(evidence|regression|shrinkage|simulation|sources)"/);
  expect(asArray(first.combos).every(c => asArray(asRecord(c).completed_results).length === 0
    && asArray(asRecord(c).unknown_reasons).includes("completed_core_cache_miss"))).toBe(true);
});
it.each(["card", "shop", "rest"] as const)("bounds the real published %s prompt and preserves legal choices plus the leading combo", kind => {
  on(); const e = situation(kind);
  const d = kind === "card" ? buildV6CardPick(e, undefined, knowledge)!.decision
    : buildV6RoomDecision(e, (kind === "shop" ? v6ShopOptions(e) : v6RestOptions(e))!, undefined, undefined, knowledge);
  expect(size(d.state)).toBeLessThanOrEqual(V6_JEV_STATE_BYTES);
  if (kind === "card") {
    expect(d.state.opening_note).toContain("actual current deck");
    expect(JSON.stringify(d.state)).not.toMatch(/"(?:expected_win|win_incomplete|availability|PW_bound)":/);
  }
  else expect(d.state.opening_note).toBe(V6_OPENING_NOTE);
  expect(size({ model: "typesafe/jev-1.14", state: d.state, questions: d.questions })).toBeLessThanOrEqual(V6_JEV_REQUEST_BYTES);
  expect(asRecord(asArray(d.state.core_metrics)[0]).direction).toBe("R");
  expect(Object.keys(asRecord(d.state.options))).toEqual(Object.keys(asRecord(d.questions.pick).criteria));
  if (kind === "card") for (const fact of Object.values(asRecord(d.state.options))) {
    expect(asRecord(fact).known_current_boss).toBe(false);
    const row = asRecord(asArray(asRecord(fact).immediate)[0]);
    expect(asArray(d.state.display_catalog)[Number(row.reason_ref)]).toEqual(["current_deck_results_unavailable"]);
    expect(asRecord(fact).projections).toBeUndefined();
  }
  if (kind !== "card") expect(promptBudgetLabels(d.state)).toHaveLength(1);
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

it("keeps 28 low-P shop choices in compatibility audit while production keeps the original brain plan", async () => {
  on(); const e = situation("shop"), input = v6ShopOptions(e)!, table = shopTable(input);
  expect(input.options).toHaveLength(28);
  for (const row of table.combinations) {
    Object.assign(row.entry, { formula: "formation_times_completed",
      availability: { take: .04, skip: .03 }, win: null, joint_win: null, win_complete: null, win_incomplete: null, expected_win: null,
      expected_win_bound: { lower: 0, upper: .04, reason: "low_probability_not_simulated" },
      trust_details: { n: 43, brier: .03, bias: .02, passed: false } });
    Object.assign(row, { completed_win: null, general_win: null, completed_joint_win: null, general_joint_win: null });
  }
  // Published metrics stay in the audit object; snapshot the contract without serializing their repeated full payloads.
  const auditView = () => table.combinations.map(row => {
    const { combo_metrics: _metrics, ...entry } = row.entry;
    return { entry, unknown_reasons: row.unknown_reasons };
  });
  const auditBefore = JSON.stringify(auditView());
  const d = buildV6RoomDecision(e, input, table, "ready", knowledge);
  expect(size(d.state)).toBeLessThanOrEqual(V6_JEV_STATE_BYTES);
  expect(size({ model: "typesafe/jev-1.14", state: d.state, questions: d.questions })).toBeLessThanOrEqual(V6_JEV_REQUEST_BYTES);
  expect(Object.keys(asRecord(d.state.options))).toHaveLength(28);
  for (const raw of Object.values(asRecord(d.state.options))) {
    const row = asRecord(raw);
    expect(row).not.toHaveProperty("best_by_target");
    expect(row.unknown_reasons).toContain("fixture_opening_limitation");
  }
  expect(d.roomEntries).toHaveLength(28 * 17 * 2);
  expect(d.roomEntries.every(row => row.win_complete === null && row.win_incomplete === null && row.expected_win === null)).toBe(true);
  expect(JSON.stringify(auditView())).toBe(auditBefore);

  // Roy's reward-only scope keeps even a pre-existing low-P table out of the shop's brain question.
  vi.stubEnv("BUILD_ONESHOT", "on"); vi.stubEnv("V6_DIRECTION_REPLAN", "off");
  for (const name of ["SHOP", "REST", "POTION"]) vi.stubEnv(`V6_${name}_DECIDER`, "brain");
  const provider = vi.fn(() => { throw Error("shop brain must not prepare V6 results"); }), bytes: string[] = [];
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-20T00:00:00.000Z"));
  try {
    for (const mode of ["off", "on"] as const) {
      vi.stubEnv("V6_BUILD", mode);
      const brainEnv = situation("shop"); brainEnv.v6ProjectionTable = table;
      // The compact-prompt fixture only supplies v6; the original shop also consumes the V5 plan fields.
      brainEnv.screenMemory.runPlan = { ...brainEnv.screenMemory.runPlan!, floor: 22, hpPct: 1, trigger: "start",
        archetype: "fixed_test_plan", want: [], avoid: [], remove: [], blockTarget: null,
        elites: "normal", rest: "auto", bossPrep: "", summary: "fixed test plan" };
      const decision = planShop(brainEnv)!;
      expect(decision).toMatchObject({ kind: "ask", label: "shop/plan" });
      expect(isV6RoomDecision(decision)).toBe(false);
      expect(await prepareV6RoomDecision(decision, brainEnv, provider)).toBe(decision);
      const resolved = planned(decision, []);
      expect(resolved).toMatchObject({ intent: { action: "close_shop_inventory" } });
      bytes.push(JSON.stringify({ decision, resolved }));
    }
  } finally { vi.useRealTimers(); }
  expect(provider).not.toHaveBeenCalled();
  expect(bytes[1]).toBe(bytes[0]);
  expect(bytes[1]).not.toMatch(/"(?:best_by_target|expected_win_bound|PW_bound)":/);
});

it("preserves every A elite and all 17 B core identities with a realistic 204-row cached target grid", () => {
  on(); const e = situation("card");
  const metrics = { hp_loss: { mean: 17.123456789123, se: .123456789123, n: 100 }, turns: { mean: 8.5123456789, se: .25123456789, n: 100 },
    damage_per_turn: { mean: 19.123456789123, se: .987654321987, n: 100 }, death_rate: { mean: .123456789, se: .02123456789, n: 100 },
    losing_enemy_hp_fraction: { mean: .35123456789123, se: .03123456789123, n: 12 } };
  const targets = Array.from({ length: 19 }, (_, i) => ({ id: `target${i}:FIXED_ENCOUNTER`, boss: `BOSS${i}`, act: i < 7 ? 1 : i < 10 ? 2 : 3,
    floor: i === 0 ? 17 : i < 7 ? 8 : i < 10 ? 33 : 48,
    kind: i === 0 ? "current" as const : i < 7 ? "elite" as const : i < 13 ? "future" as const : "chain" as const,
    probability: i === 0 ? 1 : null, labels: [i < 7 ? "fixed_actual_boss_or_observed_elite_pool" : "fixed_uncalibrated_future_target"] }));
  const row = { option_id: "skip", target_id: targets[0]!.id, metrics, paired_delta: metrics, samples: 100, requested_samples: 100,
    capped: 0, time_up: 0, missing: 0, trust: { value: "unknown" as const, labels: ["fixed_untrusted_model"], details: { n: 43, brier: .2, bias: .1, passed: false } },
    labels: [], unknown_reasons: [] };
  const combos = summaries.flatMap(d => d.combos.map(c => ({ direction: d.id, combo: c })));
  e.v6CardResults = { schema: "v6-card-combat-results-v1", targets,
    immediate: ["card0", "card1", "card2", "skip"].flatMap(option_id => targets.slice(0, 7).map(t => ({ ...row, option_id, target_id: t.id,
      ...(t.id === targets[6]!.id ? { unknown_reasons: ["fixed_partial_opening_limitation"] } : {}) }))),
    long_term: combos.flatMap(({ direction, combo }) => targets.slice(7).map(t => ({ ...row, target_id: t.id,
      direction_id: direction, combo_id: combo.id, added_cards: [] }))),
    progress: { card0: combos.map(({ direction, combo }) => ({ direction, combo: combo.id, advanced: 1, missing_before: 3, missing_after: 2 })) }, labels: [],
    telemetry: { elapsed_ms: 1, preparation_ms: 0, simulation_ms: 1, cache_hits: 0, simulations: 0,
      long_term_cache: "hit", long_term_computed: 204, long_term_total: 204, pending_work: false } };
  const before = JSON.stringify(e.v6CardResults), start = performance.now(), d = buildV6CardPick(e, undefined, knowledge)!.decision;
  expect(performance.now() - start).toBeLessThan(1500);
  expect(size(d.state)).toBeLessThanOrEqual(V6_JEV_STATE_BYTES);
  expect(size({ model: "typesafe/jev-1.14", state: d.state, questions: d.questions })).toBeLessThanOrEqual(V6_JEV_REQUEST_BYTES);
  const kept = asArray(d.state.core_metrics).map(asRecord), catalog = asArray(d.state.display_catalog);
  expect(kept.map(c => c.id).sort()).toEqual(combos.map(c => c.combo.id).sort());
  expect(new Set(kept.map(c => c.direction))).toEqual(new Set(summaries.map(d => d.id)));
  for (const combo of kept) {
    const original = combos.find(c => c.combo.id === combo.id)!.combo;
    expect(asArray(combo.cards).map(raw => asArray(asArray(raw)[1]).map(c => typeof c === "string" ? c : asArray(c)[0])))
      .toEqual(asArray(original.requirements).map(raw => asArray(asRecord(raw).any).map(c => asRecord(c).id)));
    // Checking only combo ids allowed the production bug to pass with every numeric B row removed.
    expect(asArray(combo.outcomes).length, JSON.stringify({ bytes: size(d.state), budget: d.state.prompt_budget, rows: kept.map(c => [c.id, asArray(c.outcomes).length]) })).toBeGreaterThan(0);
    expect(asArray(combo.outcomes).length + asArray(combo.outcomes_omitted).length).toBe(12);
    for (const outcome of asArray(combo.outcomes)) {
      const r = asArray(outcome);
      expect(asArray(r[1])).toHaveLength(5); expect(asArray(r[2])).toHaveLength(5);
      for (const cell of asArray(r[1])) expect(asArray(cell)).toHaveLength(3);
      expect(catalog[Number(r[4])]).toMatchObject({ value: "unknown", details: { n: 43, brier: .2, bias: .1, passed: false } });
    }
  }
  expect(asArray(d.state.targets).map(t => asRecord(t).id)).toEqual(targets.map(t => t.id));
  for (const fact of Object.values(asRecord(d.state.options))) {
    const option = asRecord(fact), immediate = asArray(option.immediate).map(asRecord);
    expect(option.known_current_boss).toBe(true);
    expect(immediate.map(r => asRecord(asArray(d.state.targets)[Number(r.target)]).id)).toEqual(targets.slice(0, 7).map(t => t.id));
    expect(catalog[Number(immediate[6]!.reason_ref)]).toEqual(["fixed_partial_opening_limitation"]);
    expect(immediate[0]!.result ?? catalog[Number(immediate[0]!.result_ref)]).toEqual([[17.123, .123, 100], [8.5123, .251, 100], [19.123, .988, 100], [.12346, .0212, 100], [.35123, .0312, 12]]);
  }
  expect(asArray(asRecord(asRecord(d.state.options).card0).advances)).toHaveLength(17);
  expect(buildV6CardPick(e, undefined, knowledge)!.decision.state).toEqual(d.state);
  expect(JSON.stringify(e.v6CardResults)).toBe(before);
  expect(asRecord(d.state.prompt_budget).after).toBe(size(d.state));
});

it("routes an impossible mandatory card catalog to the brain instead of exceeding the byte ceiling", () => {
  const result = boundedV6Jev({ card_result_schema: "v6-card-combat-results-v1", targets: [], options: {},
    core_metrics: [{ id: "fixed", direction: "P", cards: [], outcomes: [], audit_only_accident: "x".repeat(30_000) }] },
    { pick: { type: "choice", instructions: "Choose", criteria: { card0: "Take", skip: "Skip" } } });
  expect(result.state.card_prompt_unavailable).toBe("mandatory_A_and_core_catalog_exceed_budget");
  expect(size(result.state)).toBeLessThanOrEqual(V6_JEV_STATE_BYTES);
  expect(asRecord(result.state.prompt_budget).after).toBe(size(result.state));
  expect(promptBudgetLabels(result.state)).toContain("card_prompt_unavailable:mandatory_A_and_core_catalog_exceed_budget");
  expect(Object.keys(asRecord(result.questions.pick).criteria)).toEqual(["card0", "skip"]);
});

it("hands impossible numeric criteria to the brain without clipping cells or sending an oversized request", () => {
  const result = boundedV6Jev({ card_result_schema: "v6-card-combat-results-v1", card_criteria_schema: "paired-criteria-v1" },
    { pick: choiceQ("Measured comparisons", { card0: "x".repeat(24_000), skip: "Skip" }) });
  expect(result.state.card_prompt_unavailable).toBe("mandatory_card_criteria_exceed_budget");
  expect(Object.keys(asRecord(result.questions.pick).criteria)).toEqual(["card0", "skip"]);
  expect(size({ model: "typesafe/jev-1.14", ...result })).toBeLessThanOrEqual(V6_JEV_REQUEST_BYTES);
});
