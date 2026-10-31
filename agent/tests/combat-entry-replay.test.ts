/** Synthetic format/evaluation cases only; no gameplay claims or model/network calls. */
import { afterEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { validateReflexEntry } from "../src/v6/formats.js";
import { validateV6Draft } from "../src/v6/draft.js";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { combatEntryAudit, loadCombatEntries } from "../src/reflex/jev/combat-entries.js";
import { prepareCombatEntryReplay, parseReplayOutcomes, replayHash, summarizeCombatEntryReplay,
  type ReplayOutcomes, type ReplayObservation } from "../src/reflex/jev/combat-entry-replay.js";
import { annotatedFrozen, fixedPlan, fixedState, installFixture } from "./v6-combat-fixtures.js";
import { reflex, vocab } from "./v6-fixtures.js";
import { main } from "../tools/v6/combat-entry-replay.js";
import { captureCombatEntryReplay } from "../tools/v6/capture-combat-entry-replay.js";
import { PROJECT_ROOT } from "../src/core/paths.js";

const directories: string[] = [];
const temp = (parent = tmpdir()) => { const p = mkdtempSync(join(parent, "combat-entry-")); directories.push(p); return p; };
afterEach(() => { for (const p of directories.splice(0)) rmSync(p, { recursive: true, force: true }); vi.restoreAllMocks(); });
const external = { source: "external:test-public", path: "data/test/frozen.json", sha256: "a".repeat(64),
  game_version: "TEST_VERSION", retrieved_at: "2026-10-22", sample: { runs: 0, players: null, selection: "synthetic mechanical reference, no player denominator" },
  url: "https://example.com/test", license: "test-only" };

it("keeps legacy entries valid; permits external-only evidence without inventing local runs or experience IDs", () => {
  expect(validateReflexEntry(reflex).ok).toBe(true);
  const sourced = { ...reflex, evidence: { ...reflex.evidence, observations: [] }, source_experience: [], sources: [external] };
  expect(validateReflexEntry(sourced).ok).toBe(true);
  for (const source of [{ ...external, url: "file:///tmp/test" }, { ...external, sha256: "bad" }, { ...external, sample: { ...external.sample, runs: -1 } },
    { ...external, retrieved_at: "2026-02-31" }, { ...external, path: "../outside.json" }, { ...external, source: "own" }, { ...external, unexpected: true }]) {
    expect(validateReflexEntry({ ...sourced, sources: [source] }).ok).toBe(false);
  }
  expect(validateReflexEntry({ ...sourced, sources: undefined }).ok).toBe(false);
});

it("reads attributed external-only entries through the real loader and preserves source metadata in Jev memory", () => {
  const dir = temp(), root = installFixture(dir);
  const data = JSON.parse(readFileSync(join(root, "reflex.json"), "utf8"));
  data.entries = [{ ...data.entries[0], evidence: { observations: [], n_support: 1, n_contradict: 0 }, source_experience: [], sources: [external] }];
  writeFileSync(join(root, "reflex.json"), JSON.stringify(data));
  expect(loadV6Knowledge(dir, "SILENT").reflex.status).toBe("loaded");
  const state = fixedState();
  const session = loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })!;
  const audit = combatEntryAudit(session, fixedPlan, null, null) as Record<string, any>;
  expect(audit.memory[0].evidence_sources).toEqual([external]);
  expect(loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "off" })).toBeNull();
});

it("validates external-only drafts while still rejecting invented local run IDs and missing local metric evidence", () => {
  const externalEntry = { ...reflex, applies_to: "combat_line", directions: [], source_experience: [], sources: [external],
    evidence: { ...reflex.evidence, observations: [] } };
  const draft = { schema: "v6-reflex-draft-v1", character: "silent", vocab,
    reflex: { schema: "reflex-file-v1", character: "silent", entries: [externalEntry] }, coverage: [],
    metrics: [{ reflex_id: reflex.id, n: 1, method: "Synthetic external source fixture", design: "observational",
      effect_size: 1, se: .2, frequency: { n: 1, total: 1 }, evidence: [] }], missing_fields: [], limitations: ["Test only"] };
  const context = { character: "silent" as const, experienceIds: [], directionIds: [], runIds: ["FIXTURE_RUN"] };
  expect(validateV6Draft("reflex", draft, context).ok).toBe(true);
  const externalOnly = { ...draft, vocab: { ...vocab, dimensions: { enemy_threat: [], card_role: [], line_tempo: [], resource_cost: [], potion_category: [] } } };
  expect(validateV6Draft("reflex", externalOnly, { ...context, runIds: [] }).ok).toBe(true);
  const invented = structuredClone(draft) as Record<string, any>;
  invented.reflex.entries[0].evidence.observations = [{ run_id: "EXTERNAL_RUN", floor: 1 }];
  expect(validateV6Draft("reflex", invented, context).ok).toBe(false);
  invented.reflex.entries[0].evidence.observations[0].run_id = "FIXTURE_RUN";
  expect(validateV6Draft("reflex", invented, context).ok).toBe(false);
});

function pairFixture() {
  const dir = temp(); installFixture(dir);
  const request = annotatedFrozen(dir);
  // Keep two candidates only, with synthetic matching and missing-field predicates.
  const first = Object.values(request.questions).find(q => q.type === "choice")!;
  if (first.type !== "choice") throw Error("fixture choice");
  const keys = Object.keys(first.criteria).slice(0, 2);
  const q = { ...first, criteria: Object.fromEntries(keys.map(k => [k, first.criteria[k]!])) };
  request.questions = { plan: q };
  return { request, pair: prepareCombatEntryReplay(request), keys };
}
function outcomes(keys: string[], gain = 2): ReplayOutcomes {
  return { schema: "combat-entry-outcomes-v1", kind: "model", model_sha256: "b".repeat(64), scope: "whole_fight",
    rows: keys.flatMap((candidate, i) => ["seed1", "seed2"].map(seed => ({ candidate, seed, hp_loss: i ? 10 - gain : 10, win: i > 0 }))) };
}
it.each([1, 2, 3])("captures act %s original frozen plans without solving or simulating", act => {
  const { request, keys } = pairFixture(), state = fixedState();
  const observed = structuredClone(state.raw) as Record<string, any>;
  observed.run.act_id = String(act - 1);
  delete request.state.v6_combat_entries;
  (request.state.run_brief as Record<string, unknown>).floor = state.run!.floor;
  (request.state.situation as Record<string, unknown>).turn = state.turn;
  const q = request.questions.plan;
  if (q?.type !== "choice") throw Error("fixture");
  for (const key of keys) { const f = JSON.parse(q.criteria[key]!); delete f.v6_combat_entry; q.criteria[key] = JSON.stringify(f); }
  const dir = temp(); installFixture(dir);
  const input = { schema: "combat-entry-capture-input-v1", state: observed, request,
    plans: Object.fromEntries(keys.map(k => [k, fixedPlan])) };
  const capture = captureCombatEntryReplay(input, dir);
  expect(capture.capture_provenance.outcome_generated).toBe(false);
  expect(prepareCombatEntryReplay(capture).matched[keys[0]!]).toEqual(["TEST_HP", "TEST_TAG"]);
  expect(() => captureCombatEntryReplay({ ...input, plans: {} }, dir)).toThrow(/coverage/);
  const bad = structuredClone(input); (bad.request.state.situation as Record<string, unknown>).turn = 999;
  expect(() => captureCombatEntryReplay(bad, dir)).toThrow(/mismatch/);
  const badAct = structuredClone(input); badAct.state.run.act_id = "3";
  expect(() => captureCombatEntryReplay(badAct, dir)).toThrow(/act/);
  if (act === 3) {
    const elite = structuredClone(input); elite.request.state.fight = "elite";
    expect(() => captureCombatEntryReplay(elite, dir)).toThrow(/act 3 Boss/);
  }
});
it("changes only combat_memory, strips audit payloads, and re-evaluates unknown/scope via the production matcher", () => {
  const { pair, request, keys } = pairFixture();
  expect(pair.baseline.state).toEqual(pair.memory.state);
  expect(JSON.stringify(pair.baseline)).not.toMatch(/v6_combat_entry|TEST_HP|TEST_TAG|combat_memory/);
  const stripped = structuredClone(pair.memory);
  const q = stripped.questions.plan;
  if (q?.type !== "choice") throw Error("fixture");
  for (const key of keys) {
    const row = JSON.parse(q.criteria[key]!); delete row.combat_memory; q.criteria[key] = JSON.stringify(row);
    expect(pair.matched[key]).toEqual(["TEST_HP", "TEST_TAG"]);
    expect(pair.unknown[key]).toEqual(["TEST_MISSING"]);
  }
  expect(stripped).toEqual(pair.baseline);
  expect(prepareCombatEntryReplay(request)).toEqual(pair);
  const tampered = structuredClone(request) as Record<string, any>;
  tampered.state.v6_combat_entries.knowledge.reflex.entries[0].confidence = .99;
  expect(() => prepareCombatEntryReplay(tampered)).toThrow(/knowledge/);
  expect(() => prepareCombatEntryReplay({ ...request, state: { ...request.state, open_book: {} } })).toThrow(/open book/);
});

it("requires a complete common-seed outcome matrix and refuses horizon-as-victory, duplicates and invalid numbers", () => {
  const { keys } = pairFixture(), full = outcomes(keys);
  expect(parseReplayOutcomes(full, keys)).toEqual(full);
  for (const rows of [full.rows.slice(1), [...full.rows, full.rows[0]!], full.rows.map(r => ({ ...r, hp_loss: NaN })),
    full.rows.map(r => ({ ...r, candidate: "unknown" }))]) expect(() => parseReplayOutcomes({ ...full, rows }, keys)).toThrow();
  expect(() => parseReplayOutcomes({ ...full, scope: "horizon" }, keys)).toThrow();
});

it("averages seeds and repeated boards within run; keeps independent-run uncertainty, missingness and model strata", () => {
  const { pair, keys } = pairFixture();
  const a: ReplayObservation = { id: "case1", run_id: "run1", stratum: "test", pair,
    choices: { baseline: keys[0]!, memory: keys[1]! }, outcomes: outcomes(keys, 2) };
  const b = { ...a, id: "case2", run_id: "run2", outcomes: outcomes(keys, 4) };
  const repeated = { ...a, id: "case3" };
  const report = summarizeCombatEntryReplay([a, b, repeated]);
  const result = report.strata[0]!;
  expect(result.hp_saved.mean).toBe(3);
  expect(result.hp_saved.se).toBe(1);
  expect(result.hp_saved.independent_runs).toBe(2);
  expect(result.hp_saved.interval!.lower).toBeCloseTo(3 - 12.706204736, 5);
  expect(result.win_gain.mean).toBe(1);
  const missing = summarizeCombatEntryReplay([{ ...a, outcomes: null }]);
  expect(missing.strata[0]!.hp_saved.mean).toBeNull();
  expect(missing.strata[0]!.missing_hp).toEqual(["case1"]);
  expect(summarizeCombatEntryReplay([a]).strata[0]!.hp_saved.interval).toBeNull();
  const changedModel = { ...b, outcomes: { ...b.outcomes, model_sha256: "c".repeat(64) } };
  expect(summarizeCombatEntryReplay([a, changedModel]).strata).toHaveLength(2);
  expect(report.enable_authorized).toBe(false);
  const negative = summarizeCombatEntryReplay([{ ...a, outcomes: outcomes(keys, -3) }]);
  expect(negative.strata[0]!.hp_saved.mean).toBe(-3);
  const horizon = { ...a, outcomes: { ...outcomes(keys), scope: "horizon" as const,
    rows: outcomes(keys).rows.map(r => ({ ...r, win: null })) } };
  expect(summarizeCombatEntryReplay([horizon]).strata[0]!.win_gain.mean).toBeNull();
  expect(() => summarizeCombatEntryReplay([a, a])).toThrow(/duplicate/);
});

it.each([1, 2, 3])("act %s CLI prepares without calls and refuses invalid cohorts and uncertain call replay", async act => {
  const { request, pair } = pairFixture();
  mkdirSync(join(PROJECT_ROOT, ".cache"), { recursive: true });
  const dir = temp(join(PROJECT_ROOT, ".cache"));
  const local = (name: string) => join(dir, name);
  (request.state.v6_combat_entries as Record<string, any>).context.act = act;
  const bytes = JSON.stringify(request);
  writeFileSync(local("request.json"), bytes);
  const manifest = { schema: "combat-entry-replay-manifest-v1", character: "silent", game_version: "TEST", ascension: 0,
    selection: "synthetic format smoke only", exclusions: [], cases: [{ id: "testcase", run_id: "TEST_RUN", act,
      encounter: "TEST_ENEMY", attempt: "test", request: { path: relative(PROJECT_ROOT, local("request.json")), sha256: createHash("sha256").update(bytes).digest("hex") }, outcomes: null }] };
  writeFileSync(local("manifest.json"), JSON.stringify(manifest));
  const argv = ["--manifest", local("manifest.json"), "--out", local("output")];
  vi.spyOn(console, "log").mockImplementation(() => {});
  await main(argv);
  const report = JSON.parse(readFileSync(local("output/report.json"), "utf8"));
  expect(report.physical_claims).toBe(0); expect(report.completed_results).toBe(0);
  expect(report.strata[0].hp_saved.mean).toBeNull();
  const prepared = JSON.parse(readFileSync(local("output/testcase-baseline-request.json"), "utf8"));
  expect(replayHash(prepared)).toBe(replayHash(pair.baseline));
  for (const invalidAct of [0, 4, 1.5]) {
    writeFileSync(local("manifest.json"), JSON.stringify({ ...manifest, cases: [{ ...manifest.cases[0], act: invalidAct }] }));
    await expect(main(argv)).rejects.toThrow();
  }
  writeFileSync(local("manifest.json"), JSON.stringify({ ...manifest, cases: [{ ...manifest.cases[0], act: act === 3 ? 1 : 3 }] }));
  await expect(main(argv)).rejects.toThrow(/cohort/);
  writeFileSync(local("manifest.json"), JSON.stringify(manifest));
  writeFileSync(local("output/claims/testcase-baseline.json"), "{}");
  await expect(main([...argv, "--ask", "--max-calls", "2"])).rejects.toThrow(/uncertain/);
  writeFileSync(local("request.json"), bytes + " ");
  await expect(main(argv)).rejects.toThrow(/SHA/);
});
