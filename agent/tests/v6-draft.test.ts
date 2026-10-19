import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it, expect } from "vitest";
import { validateV6Draft } from "../src/v6/draft.js";
import { reflex, vocab, direction, observation } from "./v6-fixtures.js";
const context = { character: "silent" as const, experienceIds: ["TEST_EXPERIENCE"], directionIds: ["TEST_A"], runIds: ["FIXTURE_RUN"] };
const coverage = [{ experience_id: "TEST_EXPERIENCE", status: "converted", reflex_ids: [reflex.id], directions: ["TEST_A"], reason: "格式测试" }];
const draft = { schema: "v6-reflex-draft-v1", character: "silent", vocab,
  reflex: { schema: "reflex-file-v1", character: "silent", entries: [reflex] }, coverage,
  metrics: [{ reflex_id: reflex.id, n: 1, method: "Synthetic fixture", design: "observational", effect_size: 1, se: .2, frequency: { n: 1, total: 2 }, evidence: [observation] }], missing_fields: [], limitations: ["Synthetic fixture only"] };
describe("offline V6 drafts", () => {
  it("accepts W1 shapes and complete frozen coverage", () => expect(validateV6Draft("reflex", draft, context).ok).toBe(true));
  it.each([
    (d: any) => { d.coverage = []; },
    (d: any) => { d.coverage.push(d.coverage[0]); },
    (d: any) => { d.reflex.entries[0].predicate.field = "secret.field"; },
    (d: any) => { d.reflex.entries[0].evidence.observations[0].run_id = "OTHER_RUN"; },
    (d: any) => { d.metrics[0].effect_size = 99; },
    (d: any) => { d.metrics[0].frequency.n = 3; },
    (d: any) => { d.reflex.entries[0].scope.character = "regent"; },
    (d: any) => { d.reflex.entries[0].source_experience = ["MISSING"]; },
    (d: any) => { d.coverage[0].reflex_ids = []; },
    (d: any) => { d.reflex.entries[0].signal = { kind: "tag", value: "UNKNOWN_TAG", unit: "label" }; },
    (d: any) => { d.reflex.entries[0].predicate = { op: "contains", field: "card.tags", value: "UNKNOWN_TAG" }; },
    (d: any) => { d.reflex.entries[0].predicate = { op: "any", field: "player.hand", arg: { op: "contains", field: "card.tags", value: "UNKNOWN_TAG" } }; },
    (d: any) => { d.reflex.entries[0].predicate = { op: "all", field: "potion.slots", arg: { op: "contains", field: "potion.tags", value: "UNKNOWN_TAG" } }; },
  ])("rejects broken evidence, references and computations %#", mutate => {
    const d = structuredClone(draft); mutate(d); expect(validateV6Draft("reflex", d, context).ok).toBe(false);
  });
  it("allows explicit insufficient evidence without manufacturing entries", () => {
    const d = structuredClone(draft); d.reflex.entries = []; d.metrics = []; d.coverage[0]!.status = "text_only"; d.coverage[0]!.reflex_ids = [];
    expect(validateV6Draft("reflex", d, context).ok).toBe(true);
  });
  it("keeps observed relic IDs distinct from learner vocabulary tags", () => {
    const d: any = structuredClone(draft);
    d.reflex.entries[0].predicate = { op: "contains", field: "player.relics", value: "TEST_OBSERVED_RELIC_ID" };
    expect(validateV6Draft("reflex", d, context).ok).toBe(true);
  });
  it("checks direction files with the same W1 schema", () => {
    const d = { schema: "v6-direction-draft-v1", character: "silent", cards: { schema: "direction-cards-v1", character: "silent", entries: [direction] }, coverage, limitations: [] };
    expect(validateV6Draft("directions", d, context).ok).toBe(true);
    d.cards.entries[0] = { ...direction, id: "UNKNOWN" };
    expect(validateV6Draft("directions", d, context).ok).toBe(false);
  });
});

it("CLI accepts a frozen-context draft and rejects missing coverage without writes", () => {
  const dir = mkdtempSync(join(tmpdir(), "v6-draft-"));
  try {
    writeFileSync(join(dir, "context.json"), JSON.stringify(context));
    writeFileSync(join(dir, "draft.json"), JSON.stringify(draft));
    const run = () => spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "../knowledge/builders/validate-v6.ts", "reflex", join(dir, "draft.json"), join(dir, "context.json")], { encoding: "utf8" });
    const good = run(); expect(good.status).toBe(0); expect(JSON.parse(good.stdout)).toMatchObject({ ok: true, publication: false });
    writeFileSync(join(dir, "draft.json"), JSON.stringify({ ...draft, coverage: [] }));
    const bad = run(); expect(bad.status).toBe(1); expect(JSON.parse(bad.stdout).ok).toBe(false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
