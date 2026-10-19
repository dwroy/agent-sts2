import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { validateBuildCore, validateBuildCoreFile } from "../src/v6/build-core.js";
import { validateBuildCoreDraft } from "../src/v6/build-core-draft.js";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { pooledMetrics } from "./v6-build-metric-fixtures.js";
const observation = { run_id: "FIXTURE_RUN", floor: 8, turn: 2 };
const stat = () => ({ n: 0, unit: "independent_run", method: "fixed missing observation", value: null, se: null,
  distribution: [], evidence: [], unknown_reason: "fixture has no observations", small_sample: true });
function core() {
  return { schema: "build-core-v1", direction: "TEST_A", name: "fixed fixture", status: "candidate",
    scope: { character: "silent", ascensions: [0] }, card_pool: { TEST_CARD: { roles: ["test_role"],
      contribution: "fixed parser fixture", upgraded_matters: false, combos: ["TEST_COMBO"], evidence: [observation] } },
    combos: [{ id: "TEST_COMBO", types: ["must_pick_minimal", "common", "max_cards", "max_dpr"], boss: null,
      cards: [{ id: "TEST_CARD", count: 1, upgraded: false }], prerequisites: null, metrics: pooledMetrics(),
      fits: { bosses_positive: [], bosses_negative: [], routes: [], situations: [] }, evidence: [observation], confidence: "low", linked_experience: ["EXP_1"] }],
    pivot_signals: [], failure_modes: [], linked_experience: ["EXP_1"], linked_reflex: ["REF_1"] };
}
const file = () => ({ schema: "build-cores-v1", character: "silent", entries: [core()] });
const draft = () => ({ schema: "v6-build-core-draft-v1", character: "silent", cores: file(),
  coverage: [{ experience_id: "EXP_1", status: "linked", links: [{ core: "TEST_A", combo: "TEST_COMBO" }], reason: "fixed fixture" }],
  missing: [], catalog_opinions: [], disagreements: [], limitations: [] });
const context = { character: "silent" as const, experienceIds: ["EXP_1"], directionIds: ["TEST_A"], runIds: ["FIXTURE_RUN"], reflexIds: ["REF_1"] };
const roots: string[] = [];
function root() {
  const base = fileURLToPath(new URL("../../.cache/", import.meta.url)); mkdirSync(base, { recursive: true });
  const r = mkdtempSync(join(base, "v6-cores-")); roots.push(r); return r;
}
function write(r: string, character = "silent", content: unknown = file()) {
  const dir = join(r, "characters", character); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "build-cores.json"), JSON.stringify(content)); return dir;
}
afterEach(() => roots.splice(0).forEach(r => rmSync(r, { recursive: true, force: true })));

describe("build-core-v1 and frozen draft", () => {
  it("accepts fixed data without mutation, allows multiple combinations and alternative requirements", () => {
    const v = core(), before = JSON.stringify(v); expect(validateBuildCore(v).ok).toBe(true); expect(JSON.stringify(v)).toBe(before);
    const alternative = { ...v.combos[0], id: "OTHER_COMBO", cards: [{ any_of: ["TEST_CARD"], count: 1, upgraded: true }] };
    expect(validateBuildCore({ ...v, card_pool: { TEST_CARD: { ...v.card_pool.TEST_CARD, combos: ["TEST_COMBO", "OTHER_COMBO"] } }, combos: [...v.combos, alternative] }).ok).toBe(true);
    expect(validateBuildCoreDraft(draft(), context).ok).toBe(true);
  });
  it.each([null, [], { ...core(), extra: true }, { ...core(), schema: "direction-card-v1" },
    { ...core(), combos: [] }, { ...core(), card_pool: {} }, { ...core(), scope: { character: "other", ascensions: [0] } },
    { ...core(), combos: [...core().combos, ...core().combos] }])("rejects malformed or structurally inconsistent cards", v => {
    expect(validateBuildCore(v).ok).toBe(false);
  });
  it("requires contributions, reciprocal pool links and literal upgrade requirements", () => {
    for (const patch of [{ contribution: "" }, { evidence: [] }, { combos: [] }, { combos: ["WRONG"] }]) {
      const v = core(); expect(validateBuildCore({ ...v, card_pool: { TEST_CARD: { ...v.card_pool.TEST_CARD, ...patch } } }).ok).toBe(false);
    }
    for (const cards of [[{ any_of: ["MISSING"], count: 1, upgraded: false }], [{ id: "TEST_CARD", count: 0, upgraded: false }],
      [{ id: "TEST_CARD", count: 1 }], [{ id: "TEST_CARD", any_of: ["TEST_CARD"], count: 1, upgraded: false }]]) {
      const v = core(); expect(validateBuildCore({ ...v, combos: [{ ...v.combos[0], cards }] }).ok).toBe(false);
    }
  });
  it("retains missing measurements as unknown and rejects fabricated zero or missing metric slots", () => {
    for (const s of [{ ...stat(), value: 0 }, { ...stat(), unknown_reason: null }, { ...stat(), n: 1, value: 1 }, { ...stat(), n: Infinity }]) {
      const v = core(); v.combos[0]!.metrics[0]!.observed.dpr_boss = s; expect(validateBuildCore(v).ok).toBe(false);
    }
    const v = core(); delete v.combos[0]!.metrics[0]!.observed.dpr_boss; expect(validateBuildCore(v).ok).toBe(false);
  });
  it("rejects cross-character files and duplicate directions", () => {
    expect(validateBuildCoreFile({ ...file(), character: "regent" }).ok).toBe(false);
    expect(validateBuildCoreFile({ ...file(), entries: [core(), core()] }).ok).toBe(false);
  });
  it("locks exact experience coverage, catalog, frozen evidence and both directions of links", () => {
    for (const c of [{ ...context, experienceIds: ["EXP_1", "EXP_2"] }, { ...context, runIds: ["OTHER"] },
      { ...context, directionIds: ["OTHER"] }, { ...context, reflexIds: [] }]) expect(validateBuildCoreDraft(draft(), c).ok).toBe(false);
    const v = draft(); v.cores.entries[0]!.combos[0]!.linked_experience = [];
    expect(validateBuildCoreDraft(v, context).ok).toBe(false);
    expect(validateBuildCoreDraft({ ...draft(), coverage: [] }, context).ok).toBe(false);
    expect(validateBuildCoreDraft({ ...draft(), coverage: [...draft().coverage, ...draft().coverage] }, context).ok).toBe(false);
  });
  it("accepts honest lack of evidence with explicit missing categories and unrelated mapping", () => {
    const v = draft(); v.cores.entries = []; v.coverage = [{ experience_id: "EXP_1", status: "unrelated", links: [], reason: "fixed absence" }];
    expect(validateBuildCoreDraft(v, context).ok).toBe(false);
    expect(validateBuildCoreDraft({ ...v, missing: ["must_pick_minimal", "common", "max_cards", "max_dpr"].map(category => ({ direction: "TEST_A", category, reason: "unobserved" })) }, context).ok).toBe(true);
  });
  it("rejects provenance run IDs outside the frozen inventory even without metric evidence", () => {
    const v = draft(), m = v.cores.entries[0]!.combos[0]!.metrics[0]!;
    m.sources = [{ version: null, ascension: null, run_ids: ["UNFROZEN"], counts: { ...m.raw_counts, runs: 1 } }];
    m.raw_counts = { ...m.raw_counts, runs: 1 };
    expect(validateBuildCoreFile(v.cores).ok).toBe(true);
    expect(validateBuildCoreDraft(v, context)).toMatchObject({ ok: false, issues: ["source outside frozen runs: UNFROZEN"] });
  });
});
describe("per-character build core loader", () => {
  it("reads its own file and never synthesizes from old cards or other characters", () => {
    const r = root(), dir = write(r);
    expect(loadV6Knowledge(r, "SILENT").cores).toMatchObject({ status: "loaded", value: [core()] });
    for (const role of ["ironclad", "regent", "defect", "necrobinder"]) expect(loadV6Knowledge(r, role).cores.status).toBe("missing");
    rmSync(join(dir, "build-cores.json")); writeFileSync(join(dir, "direction-cards.json"), JSON.stringify({ schema: "direction-cards-v1", character: "silent", entries: [] }));
    expect(loadV6Knowledge(r, "silent").cores.status).toBe("missing");
    expect(loadV6Knowledge(r, "../../silent").cores.status).toBe("invalid");
    expect(loadV6Knowledge(r, null).cores.status).toBe("invalid");
  });
  it("rejects cross-role scope, unreadable JSON and symlinks escaping the role", () => {
    const r = root(), dir = write(r); write(r, "regent"); expect(loadV6Knowledge(r, "regent").cores.status).toBe("invalid");
    writeFileSync(join(dir, "build-cores.json"), "bad json"); expect(loadV6Knowledge(r, "silent").cores.status).toBe("invalid");
    rmSync(join(dir, "build-cores.json")); symlinkSync(join(r, "characters/regent/build-cores.json"), join(dir, "build-cores.json"));
    expect(loadV6Knowledge(r, "silent").cores.status).toBe("invalid");
  });
});
