/** Fixed external facts and synthetic request structures; no game/model/network calls. */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "./temp-fixtures.js";
import { attachOpenBook, externalReference, fillExternalUnknown, loadOpenBook, OPEN_BOOK_MAX_BYTES } from "../src/knowledge/open-book.js";
import { KNOWLEDGE_DIR, PROJECT_ROOT } from "../src/core/paths.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims } from "../src/reflex/combat-plan.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { Brain } from "../src/brain/brain.js";
import { BrainRouter } from "../src/brain/router.js";
import { loadConfig } from "../src/core/config.js";
import type { BrainRequest } from "../src/brain/types.js";
import { userMessage } from "../src/brain/message.js";
import { JevClient, JevError } from "../src/reflex/jev/client.js";
import { askJevLogged, type JevPromptRecord } from "../src/eye/jev-prompt-log.js";

type Row = Record<string, any>;
const settings = { character: "silent", queueDir: null };
const enrich = (v: unknown, extra = {}) => attachOpenBook(v, { ...settings, ...extra }) as Row;
const keys = (v: Row) => v.open_book.entries.map((e: Row) => `${e.kind}:${e.id}`);
const reference = (kind: "cards" | "relics" | "monsters" | "events", id: string) => externalReference(kind, id, "silent")!;
const fixtures = JSON.parse(readFileSync(join(PROJECT_ROOT, "agent/tests/open-book-data/questions.json"), "utf8")) as Row[];
afterEach(() => { setKnowledgeCharacter(null); vi.unstubAllEnvs(); });

describe("offline open book", () => {
  it("loads four versioned inventories with provenance, keeping Ironclad byte-identical", () => {
    expect(loadOpenBook().entries.length).toBe(1074);
    const p = { cards: [{ card_id: "ABRASIVE" }] };
    expect(attachOpenBook(p, { character: "IRONCLAD" })).toBe(p);
    expect(externalReference("cards", "ABRASIVE", "ironclad")).toBeNull();
    expect(reference("cards", "ABRASIVE")).toMatchObject({ source: "external:spire-codex", game_version: "v0.111.0", provenance: ["cards:eng", "cards:zhs"] });
  });
  for (const f of fixtures) it(`selects relevant entries for ${f.kind}, with exact source hashes and a total UTF-8 cap`, () => {
    const input = { options: f.options, question: f.question, payload: f.payload };
    const result = enrich(input);
    expect(keys(result)).toEqual(expect.arrayContaining(f.expected));
    expect(keys(result)).not.toContain("cards:BASH");
    expect(Buffer.byteLength(JSON.stringify(result)) - Buffer.byteLength(JSON.stringify(input))).toBeLessThanOrEqual(OPEN_BOOK_MAX_BYTES);
    expect(result.open_book.sources).toEqual(expect.arrayContaining([expect.objectContaining({ sha256: expect.stringMatching(/^[a-f0-9]{64}$/), url: expect.stringContaining("/v0.111.0/") })]));
    expect(result.payload).toEqual(f.payload);
  });
  it("fills static base/upgrade numeric templates, but never mismatched known values or combat text", () => {
    const e = reference("cards", "ABRASIVE");
    expect(fillExternalUnknown(e.description!.replace("4", "?(数值未知)"), e, false)).toContain("获得4点荆棘");
    expect(fillExternalUnknown(e.upgraded_description!.replace("6", "?(数值未知)"), e, true)).toContain("获得6点荆棘");
    const wrong = e.description!.replace("1", "99").replace("4", "?(数值未知)");
    expect(fillExternalUnknown(wrong, e, false)).toBe(wrong);
    const live = { card_id: e.id, description: e.description!.replace("4", "?(数值未知)"), resolved_rules_text: e.description!.replace("4", "?(数值未知)") };
    const output = enrich({ card: live });
    expect(output.card.description).toContain("基础资料补全");
    expect(output.card.resolved_rules_text).toBe(live.resolved_rules_text);
    expect(enrich({ combat: { card: live } }).combat.card).toEqual(live);
  });
  it("fills actual relic_effects strings and JSON-string options while preserving option keys", () => {
    const e = reference("relics", "AKABEKO");
    const text = `${e.name} (${e.id}): ${e.description!.replace("8", "?(数值未知)")}`;
    expect(enrich({ facts: { relic_effects: [text] } }).facts.relic_effects[0]).toContain("基础资料补全");
    const c = reference("cards", "ABRASIVE");
    const options = { card0: JSON.stringify({ card_id: c.id, description: c.description!.replace("4", "?(数值未知)") }), skip: null };
    const result = enrich({ options });
    expect(Object.keys(result.options)).toEqual(Object.keys(options));
    expect(JSON.parse(result.options.card0).description).toContain("external:spire-codex");
    expect(result.options.skip).toBeNull();
  });
  it("fills reward pick summaries by an unambiguous card name, retaining known numbers and dynamic text", () => {
    const e = reference("cards", "ABRASIVE");
    const summary = { card: e.name, type: "Power", cost: 3, text: e.description!.replace("1", "?(数值未知)") };
    const result = enrich({ options: { card0: JSON.stringify(summary) }, combat: { summary } });
    expect(keys(result)).toContain("cards:ABRASIVE");
    expect(JSON.parse(result.options.card0).text).toContain("获得1点敏捷");
    expect(JSON.parse(result.options.card0).text).toContain("基础资料补全");
    expect(result.combat.summary).toEqual(summary);
    const wrong = { ...summary, text: summary.text.replace("4", "99") };
    expect(JSON.parse(enrich({ options: { card0: JSON.stringify(wrong) } }).options.card0)).toEqual(wrong);
    const missingId = { ...summary, card_id: "MISSING_CARD" };
    expect(enrich({ card: missingId }).card).toEqual(missingId);
  });
  it("keeps live text and records a conflict without replacing a known value", () => {
    const p = { card_id: "ABRASIVE", description: "获得99点荆棘。" };
    const result = enrich({ card: p });
    expect(result.card).toEqual(p);
    expect(result.open_book.conflicts).toEqual([expect.objectContaining({ id: "ABRASIVE", actual: p.description, resolution: expect.stringContaining("mod 优先") })]);
  });
  it("deduplicates typed missing IDs, never queues arbitrary uppercase fields or unsafe paths", () => {
    const directory = mkdtempSync(join(tmpdir(), "open-book-queue-"));
    const input = { cards: [{ id: "MISSING_CARD", type: "POWER", target: "SELF" }, "../BAD"], relic: { relic_id: "MISSING_RELIC" }, card: { card_id: "../../BAD" } };
    enrich(input, { queueDir: directory }); enrich(input, { queueDir: directory });
    expect(readdirSync(directory).sort()).toEqual(["cards-MISSING_CARD.json", "relics-MISSING_RELIC.json"]);
    expect(enrich({ text: "ABRASIVE_SUFFIX" }).open_book.entries).toHaveLength(0);
  });
  it("prioritizes choices, bounds crowded prompts, and reports omitted entries", () => {
    const deck = loadOpenBook().entries.filter((e) => e.kind === "cards").map((e) => ({ card_id: e.id }));
    const input = { options: { c0: '{"card_id":"ABRASIVE"}' }, payload: { deck } };
    const result = enrich(input, { maxBytes: 8000 });
    expect(keys(result)[0]).toBe("cards:ABRASIVE");
    expect(result.open_book.omitted).toBeGreaterThan(0);
    expect(Buffer.byteLength(JSON.stringify(result)) - Buffer.byteLength(JSON.stringify(input))).toBeLessThanOrEqual(8000);
    expect(enrich(input, { maxBytes: 1 })).toBe(input);
  });
  it("rechecks missing/changed optional files and rejects non-v0.111 entries", () => {
    const directory = mkdtempSync(join(tmpdir(), "open-book-cache-"));
    expect(loadOpenBook(directory).entries).toHaveLength(0);
    mkdirSync(join(directory, "common"));
    const e = reference("cards", "ABRASIVE");
    writeFileSync(join(directory, "common/open-book.json"), JSON.stringify({ schema: "open-book-v1", entries: [e, { ...e, id: "WRONG_VERSION", game_version: "v0.110.0" }] }));
    expect(loadOpenBook(directory).entries.map((r) => r.id)).toEqual(["ABRASIVE"]);
  });
  it("reads an atomic refreshed overlay on the next lookup and rejects an unreviewed revision", () => {
    const entry = reference("cards", "ABRASIVE");
    const manifest = JSON.parse(readFileSync(join(KNOWLEDGE_DIR, "common/open-book.json"), "utf8")).sources;
    const workspace = mkdtempSync(join(tmpdir(), "open-book-overlay-"));
    vi.stubEnv("STS2_WORKSPACE", workspace);
    expect(reference("cards", "ABRASIVE").facts.cost).toBe(entry.facts.cost);
    const path = join(workspace, "data/external/open-book/catalog/knowledge/common");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "open-book.json"), JSON.stringify({ schema: "open-book-v1", sources: manifest, entries: [{ ...entry, facts: { ...entry.facts, fixed_test_only: true } }] }));
    expect(reference("cards", "ABRASIVE").facts.fixed_test_only).toBe(true);
    writeFileSync(join(path, "open-book.json"), JSON.stringify({ schema: "open-book-v1", sources: { ...manifest, revision: "unreviewed" }, entries: [{ ...entry, facts: { cost: 9999 } }] }));
    expect(reference("cards", "ABRASIVE").facts.cost).toBe(entry.facts.cost);
  });
  it("makes static card/monster numbers readable by simulation without changing live values or serialized state", () => {
    const k = makeKnowledge({ cards: [], monsters: [], relics: [], potions: [], powers: [], events: [], characters: [] }, "cache");
    const card = { card_id: "ABRASIVE", name: "磨蚀", cost: 3 };
    const a = modelHandCard(card, 0, k, "silent");
    expect(a.externalReference?.facts.cost).toBe(3);
    expect(a.known).toBe(false);
    expect(JSON.stringify(a)).not.toContain("externalReference");
    const board = { enemies: [{ enemy_id: "AEONGLASS", current_hp: 123, max_hp: 600, intents: [{ damage: 99, hits: 2 }] }] };
    const enemy = enemySims(board, 10, "silent")[0]!;
    expect(enemy.externalReference?.facts.min_hp).toBe(512);
    expect(enemy.hp).toBe(123); expect(enemy.attacks).toEqual([{ damage: 99, hits: 2 }]);
    expect(enemySims(board, 10, "ironclad")[0]!.externalReference).toBeUndefined();
    expect(JSON.stringify(enemy)).not.toContain("externalReference");
  });
  it("passes enriched options through the actual Brain request", async () => {
    setKnowledgeCharacter("silent");
    let sent: BrainRequest | undefined;
    const router = new BrainRouter({ config: loadConfig({ BRAIN_ENGINE: "deepseek", BRAIN_LOG: "off", KNOWLEDGE_PREFIX: "off" } as NodeJS.ProcessEnv).brain,
      engine: () => ({ name: "deepseek", model: "fixed", decide: async (req: BrainRequest) => { sent = req; return { engine: "deepseek", model: "fixed", answer: { choice: "card0", reason: "fixed" }, problems: [], attempts: 1, latencyMs: 0, usage: { inputTokens: 0, outputTokens: 0 }, toolCalls: [], raw: "{}" }; } }) });
    const brain = new Brain(router, { systemPrompt: "fixed" });
    brain.setToolContext({ ascension: 10, knowledgeDir: KNOWLEDGE_DIR, logsDir: tmpdir() });
    const e = reference("cards", "ABRASIVE");
    const options = { card0: JSON.stringify({ card_id: e.id, description: e.description!.replace("4", "?(数值未知)") }), skip: null };
    await brain.choose({}, "Pick", options, { label: "reward/card" });
    expect(userMessage(sent!)).toContain("基础资料补全");
    expect((sent!.payload as Row).open_book.entries[0].id).toBe(e.id);
  });
  it("sends the pre-open-book Jev state with matching log and projection evidence", async () => {
    const client = new JevClient({ apiKey: "fixed-offline-placeholder", model: "fixed" });
    let wire: Row = {}, logged: JevPromptRecord | undefined;
    const sdk = (client as unknown as { client: { systemOne: unknown } }).client;
    sdk.systemOne = (request: Row) => { wire = request; return { withResponse: async () => ({ data: { answers: {}, usage: {} } }) }; };
    const questions = { pick: { type: "choice" as const, instructions: "Pick", criteria: { p0: '{"card_id":"ABRASIVE","rollout_turns":2}' } } };
    const state = { fight: "monster", run_brief: { character: "SILENT" }, enemies: [{ enemy_id: "AEONGLASS" }] };
    await askJevLogged(client, { path: "unused", write: (row) => { logged = row; } }, {
      decisionId: "fixed", runId: null, floor: null, turn: null, fingerprint: "fixed", observedTs: "fixed",
      label: "combat/plan-choice", jevContext: null, call: "ask",
    }, state, questions);
    expect(logged!.request).toEqual(wire);
    expect(wire.state).not.toHaveProperty("open_book");
    const { jev_decision_contract, ...board } = wire.state;
    expect(board).toEqual(state);
    expect(jev_decision_contract.schema).toBe("silent-combat-decision-v1");
    expect(wire.questions.pick).toEqual({ ...questions.pick, criteria: { p0: '{"card_id":"ABRASIVE"}' } });
    expect(logged!.decision_projection!.projectedBytes).toBe(Buffer.byteLength(JSON.stringify({ state: wire.state, questions: wire.questions })));
    expect(logged!.decision_evidence).toEqual({ state, questions });
  });
  it.each(["SILENT", "IRONCLAD"])("direct Jev calls preserve %s request bytes without open-book enrichment", async (character) => {
    const client = new JevClient({ apiKey: "fixed-offline-placeholder", model: "fixed" });
    let wire: Row = {};
    const sdk = (client as unknown as { client: { systemOne: unknown } }).client;
    sdk.systemOne = (request: Row) => { wire = request; return { withResponse: async () => ({ data: { answers: {}, usage: {} } }) }; };
    const state = { run_brief: { character }, cards: [{ card_id: "ABRASIVE", description: "?(数值未知)" }], enemies: [{ enemy_id: "AEONGLASS" }] };
    const questions = { pick: { type: "choice" as const, instructions: "Pick", criteria: { p0: '{"card_id":"ABRASIVE"}' } } };
    const before = JSON.stringify({ model: "fixed", state, questions });
    await client.ask(state, questions);
    expect(JSON.stringify(wire)).toBe(before);
    expect(wire.state).not.toHaveProperty("open_book");
  });
  it("keeps both logged context-recovery attempts free of open-book fields", async () => {
    const client = new JevClient({ apiKey: "fixed-offline-placeholder", model: "fixed" });
    const calls: Row[] = [], rows: JevPromptRecord[] = [];
    const sdk = (client as unknown as { client: { systemOne: unknown } }).client;
    sdk.systemOne = (request: Row) => {
      calls.push(request);
      return { withResponse: async () => {
        if (calls.length === 1) throw new JevError("validation", '{"detail":{"error_type":"max_tokens_exceeded"}}', { status: 400 });
        return { data: { answers: {}, usage: {} } };
      } };
    };
    const criteria = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`p${i}`, JSON.stringify({ card_id: "ABRASIVE", repeated: "x".repeat(1000) })]));
    const questions = { pick: { type: "choice" as const, instructions: "fixed", criteria } };
    const state = { run_brief: { character: "SILENT" } };
    await askJevLogged(client, { path: "unused", write: row => rows.push(row) }, {
      decisionId: "fixed", runId: null, floor: null, turn: null, fingerprint: "fixed", observedTs: "fixed",
      label: "reward/card", jevContext: null, call: "ask",
    }, state, questions);
    expect(calls).toHaveLength(2);
    calls.forEach((wire, i) => { expect(wire).toEqual(rows[i]!.request); expect(wire.state.open_book).toBeUndefined(); });
    expect(Buffer.byteLength(JSON.stringify(calls[1]))).toBeLessThan(23_000);
  });
});
