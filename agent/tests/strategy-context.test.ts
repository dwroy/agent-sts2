/** Fixed retrieval contracts; synthetic prose is never published as game knowledge. */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { ARCHETYPES_FILE, matchStrategyArchetype, nearestArchetype, strategyDeckIds } from "../src/knowledge/strategy-archetypes.js";
import { KNOWLEDGE_DIR, knowledgeFile, setKnowledgeCharacter } from "../src/knowledge/files.js";
import { parseStrategyLibrary, retrieveStrategies } from "../src/knowledge/strategy-entries.js";
import { strategyMatches, attachQueryGuidance, queryAudit } from "../src/brain/tools/query-guidance.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { pickSpec } from "../src/brain/specs.js";
import type { ToolContext } from "../src/brain/tools/types.js";

const dirs: string[] = [];
afterEach(() => { dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); setKnowledgeCharacter(null); });
const model = { sha256: "a".repeat(64), reference_version: "v-fixture", reference_n: 2,
  vocabulary: { FIXTURE_A: 2, FIXTURE_B: 1 }, centers: [{ FIXTURE_A: 1 }, { FIXTURE_B: 1 }] };
const publishedBinding = { model_sha256: "857cc1bfc55906cb69186c439cad36d86f260af340b0d0b24cb5af3284122342", version: "v0.111", clusters: [0] };
// Geometry fixture only: the published center 0's five largest coordinates; no semantic build label.
const deck = ["ABUNDANCE", "PANACHE", "LEADING_STRIKE", "ACCURACY", "CLOAK_AND_DAGGER"];
const entry = (id = "fixture-entry", trigger = {}) => ({ id, version: "fixture", trigger: { question_types: ["card_reward"], ...trigger },
  strategy: "FIXTURE_TEXT_ONLY", evidence: [{ run: "FIXTURE00001", floor: 1 }], source: "own", confidence: .4 });
function fixture() {
  setKnowledgeCharacter("silent");
  const dir = mkdtempSync(join(tmpdir(), "strategy-context-")); dirs.push(dir);
  const path = knowledgeFile(dir, "strategy-entries.json"); mkdirSync(dirname(path), { recursive: true });
  const ctx: ToolContext = { label: "reward/card", ascension: 10, act: 1, knowledgeDir: dir, logsDir: "/unused",
    payload: { facts: { act: 1, act_boss: "FIXTURE_BOSS", deck_size: 5, deck: deck.map(id => `${id}+ 格式名 (Skill): fixture`) } } };
  const library = (entries: unknown[]) => writeFileSync(path, JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries }));
  const host = new ToolHost(buildKnowledgeTools(ctx), ctx);
  const call = async (input = { query: "*" } as Record<string, unknown>) => JSON.parse((await host.call("kb_strategies", input)).text);
  const copyModel = () => { const target = join(dir, ARCHETYPES_FILE); mkdirSync(dirname(target), { recursive: true }); copyFileSync(join(KNOWLEDGE_DIR, ARCHETYPES_FILE), target); return target; };
  return { ctx, path, library, host, call, copyModel };
}

it("matches the published binary TF-IDF geometry, ignores copy count, and abstains on ties/unknown IDs", () => {
  expect(nearestArchetype(["FIXTURE_A", "FIXTURE_A", "UNKNOWN"], model)).toMatchObject({ cluster: 0, overlap: 1, similarity: 1, margin: 1 });
  expect(nearestArchetype(["FIXTURE_B"], model)?.cluster).toBe(1);
  expect(nearestArchetype(["UNKNOWN"], model)).toBeNull();
  expect(nearestArchetype(["FIXTURE_A", "FIXTURE_B"], { ...model, vocabulary: { FIXTURE_A: 1, FIXTURE_B: 1 } })).toBeNull();
});

it("returns only the nearest model-bound playbook sections and all ordinary context constraints still apply", async () => {
  const { ctx, path, library, copyModel, call, host } = fixture(); copyModel();
  library([entry("section-match", { archetype: publishedBinding, acts: [1], bosses: ["FIXTURE_BOSS"], deck_cards: [{ name: "ABUNDANCE", count: { min: 1 } }] }),
    entry("other-cluster", { archetype: { ...publishedBinding, clusters: [1] } }),
    entry("other-version", { archetype: { ...publishedBinding, version: "other" } }),
    entry("other-model", { archetype: { ...publishedBinding, model_sha256: "b".repeat(64) } }),
    entry("other-question", { question_types: ["shop"], archetype: publishedBinding }), entry("other-act", { acts: [2] }), entry("other-boss", { bosses: ["OTHER"] }), entry("generic")]);
  const before = readFileSync(path), result = await call();
  expect(result.entries.map((e: any) => e.id)).toEqual(["section-match", "generic"]);
  expect(result.archetype).toMatchObject({ status: "matched", source: "external:sts2fun", reference_n: 873,
    match: { model_sha256: publishedBinding.model_sha256, version: publishedBinding.version, cluster: 0 } });
  expect(result.entries[0].evidence).toEqual([{ run: "FIXTURE00001", floor: 1 }]);
  expect(queryAudit(host.calls).strategies.hit_ids).toEqual(["generic", "section-match"]);
  expect(readFileSync(path)).toEqual(before);
  const noDeck = { ...ctx, payload: { facts: { act: 1, act_boss: "FIXTURE_BOSS", deck: ["UNKNOWN"] } } };
  expect(strategyMatches(noDeck).entries.map(e => e.id)).toEqual(["generic"]);
  expect(matchStrategyArchetype({ ...ctx, ascension: 9 }).status).toBe("out_of_scope");
});

it("extracts exact current-deck IDs, including raw state, without using offers or prose guesses", () => {
  const { ctx } = fixture();
  expect(strategyDeckIds(ctx)).toEqual(deck);
  expect(strategyDeckIds({ ...ctx, state: { run: { deck: [{ card_id: "CARD.FIXTURE_A", upgraded: true }] }, reward: { card_options: [{ card_id: "FIXTURE_B" }] } } })).toEqual(["FIXTURE_A"]);
  expect(strategyDeckIds({ ...ctx, payload: { facts: { deck: ["中文名字 (Skill): FIXTURE_A"] } } })).toEqual([]);
});

it("fails closed for missing/corrupt geometry but leaves ordinary entries available; missing libraries stay empty", async () => {
  const { ctx, library, copyModel, call } = fixture();
  expect(await call()).toMatchObject({ status: "missing", entries: [] });
  library([entry("script", { archetype: publishedBinding }), entry("ordinary")]);
  expect((await call()).entries.map((e: any) => e.id)).toEqual(["ordinary"]);
  const path = copyModel(); writeFileSync(path, JSON.stringify({ model }));
  expect(matchStrategyArchetype(ctx).status).toBe("unavailable");
  expect((await call()).entries.map((e: any) => e.id)).toEqual(["ordinary"]);
  setKnowledgeCharacter("ironclad"); expect(strategyMatches(ctx).entries).toEqual([]);
});

it("pages hundreds of candidates below 24KB and does not attach the omitted entries' metadata", async () => {
  const { library, call } = fixture();
  library(Array.from({ length: 120 }, (_, i) => ({ ...entry(`fixture-${String(i).padStart(3, "0")}`),
    evidence: [{ run: "FIXTURE00001", floor: 1, ref: "x".repeat(5000) }] })));
  expect((await call()).entries).toHaveLength(3);
  const ids: string[] = []; let offset: number | null = 0;
  while (offset !== null) {
    const result = await call({ query: "*", limit: 6, offset });
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(24_000);
    expect(result.total_matches).toBe(120); expect(result.entries.length).toBeGreaterThan(0);
    expect(result.sources.filter((s: any) => s.entry_id).length).toBe(result.entries.length);
    ids.push(...result.entries.map((e: any) => e.id)); offset = result.next_offset;
  }
  expect(new Set(ids).size).toBe(120); expect(ids).toHaveLength(120);
  expect((await call({ query: "fixture-119" })).entries[0].id).toBe("fixture-119");
});

it("skips a whole oversized entry so smaller matches remain queryable and validates pagination inputs", async () => {
  const { library, call, host } = fixture();
  library([{ ...entry("a-oversize"), evidence: [{ run: "FIXTURE00001", floor: 1, ref: "x".repeat(25_000) }] }, entry("z-small")]);
  expect(await call()).toMatchObject({ entries: [{ id: "z-small" }], oversized_skipped: 1, next_offset: null });
  for (const input of [{ query: "*", limit: 7 }, { query: "*", offset: -1 }, { query: "*", path: "/unused" }]) expect((await host.call("kb_strategies", input)).isError).toBe(true);
});

it("offers exactly one optional count sentence for nonempty matches and never injects script content or IDs", async () => {
  const { ctx, library } = fixture();
  const req = { label: ctx.label!, system: "fixed", question: "fixed", payload: ctx.payload, options: { a: null }, toolContext: ctx,
    knowledge: { mode: "tools" as const }, spec: pickSpec(ctx.label!, { a: null }) };
  expect((await attachQueryGuidance(req)).question).not.toContain("相关策略/剧本可查");
  library([entry()]); const guided = await attachQueryGuidance(req);
  expect(guided.question.match(/本题有 1 条相关策略\/剧本可查。/g)).toHaveLength(1);
  expect(guided.question).not.toMatch(/fixture-entry|FIXTURE_TEXT_ONLY|kb_strategies|先查|先调用/);
  expect((await attachQueryGuidance({ ...req, knowledge: { mode: "full" } })).question).toBe("fixed");
});

it("validates explicit model bindings and counts display IDs/names without double-counting deck size", () => {
  const lib = (trigger: unknown) => ({ schema: "brain-strategies-v1", character: "silent", entries: [entry("fixture", trigger as any)] });
  for (const a of [{ ...publishedBinding, clusters: [] }, { ...publishedBinding, model_sha256: "x" }, { ...publishedBinding, clusters: [-1] }, { ...publishedBinding, path: "/unused" }]) expect(() => parseStrategyLibrary(lib({ archetype: a }))).toThrow();
  const library = parseStrategyLibrary(lib({ deck_cards: [{ name: "FIXTURE_A", count: { min: 2, max: 2 } }, { name: "格式名", count: { min: 2, max: 2 } }], deck_size: { min: 2, max: 2 } }));
  expect(retrieveStrategies(library, "reward/card", { facts: { deck: ["2x FIXTURE_A+ 格式名 (Skill): fixture"] } })).toHaveLength(1);
});
