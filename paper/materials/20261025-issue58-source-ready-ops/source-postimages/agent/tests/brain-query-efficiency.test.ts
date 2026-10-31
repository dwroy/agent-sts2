/** Fixed query contracts; no model, gameplay or external service calls. */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { attachQueryGuidance } from "../src/brain/tools/query-guidance.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { agentSystemPrompt } from "../src/brain/brain.js";
import { knowledgeFile, setKnowledgeCharacter, KNOWLEDGE_DIR } from "../src/knowledge/files.js";
import { EXTERNAL_STATS_FILE } from "../src/brain/tools/external-stats-tools.js";
import { pickSpec } from "../src/brain/specs.js";
import { reflex } from "./v6-fixtures.js";
import type { BrainRequest } from "../src/brain/types.js";

const dirs: string[] = [];
afterEach(() => { dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); setKnowledgeCharacter(null); });
function fixture(label = "reward/card") {
  setKnowledgeCharacter("silent");
  const dir = mkdtempSync(join(tmpdir(), "query-efficiency-")); dirs.push(dir);
  const write = (name: string, value: unknown) => { const path = knowledgeFile(dir, name); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(value)); };
  const { directions: _unused, ...base } = reflex;
  const combat = { ...base, id: "combat-only", applies_to: "combat_line", scope: { character: "silent", ascensions: [10] } };
  const construction = { ...combat, id: "construction-only", applies_to: "card_pick", label_en: "Synthetic construction summary" };
  write("reflex.json", { schema: "reflex-file-v1", character: "silent", entries: [] });
  write("strategy-entries.json", { schema: "brain-strategies-v1", character: "silent", entries: [] });
  const ctx = { label, ascension: 10, act: 1, knowledgeDir: dir, logsDir: "/unused", payload: { facts: { act: 1 } },
    state: { reward: { card_options: [{ card_id: "SNAKEBITE" }, { card_id: "FIXTURE_UNSEEN" }] }, shop: { cards: [{ card_id: "SNAKEBITE", is_stocked: true }, { card_id: "FIXTURE_UNSEEN", is_stocked: true }] } } };
  const req: BrainRequest = { label, system: agentSystemPrompt(), question: "fixed", payload: ctx.payload, toolContext: ctx, tools: buildKnowledgeTools(ctx), knowledge: { mode: "tools" }, spec: pickSpec(label, { a: null }) };
  const library = (...entries: unknown[]) => write("reflex.json", { schema: "reflex-file-v1", character: "silent", entries });
  const cues = async (request = req) => JSON.parse((await attachQueryGuidance(request)).question.split("\n").at(-1)!);
  const host = new ToolHost(buildKnowledgeTools(ctx), ctx, undefined, true);
  const copyStats = () => { const path = join(dir, EXTERNAL_STATS_FILE); mkdirSync(dirname(path), { recursive: true }); copyFileSync(join(KNOWLEDGE_DIR, EXTERNAL_STATS_FILE), path); };
  return { dir, write, ctx, req, combat, construction, library, cues, host, copyStats };
}

it("keeps query cues optional while the system describes registered strategy and rk tools", async () => {
  const { req, cues } = fixture();
  const result = await attachQueryGuidance(req), body = await cues();
  expect(body).not.toHaveProperty("strategies"); expect(body).not.toHaveProperty("rk");
  expect(result.question).not.toMatch(/kb_strategies|kb_reflex|策略\/rk|构筑rk|备战rk/);
  expect(result.system).toContain("kb_strategies"); expect(result.system).toContain("kb_reflex");
  expect(result.system).not.toContain("查相关策略与 rk 后");
  expect(result.question).not.toContain("先调用"); expect(result.system).not.toContain("先查");
});

it("construction lookup excludes combat lines even if requested and returns summaries without predicate JSON", async () => {
  const { host, combat, construction, library, cues } = fixture(); library(combat, construction);
  const body = await cues(); expect(body).not.toHaveProperty("rk"); expect(body).not.toHaveProperty("strategies");
  const result = JSON.parse((await host.call("kb_reflex", { query: "*" })).text);
  expect(result.entries).toHaveLength(1); expect(result.entries[0]).toMatchObject({ id: construction.id, summary: construction.label_en, confidence: construction.confidence, source_experience: construction.source_experience });
  expect(result.entries[0]).not.toHaveProperty("predicate"); expect(result.entries[0]).not.toHaveProperty("signal");
  expect(JSON.parse((await host.call("kb_reflex", { query: "*", applies_to: "combat_line" })).text).entries).toEqual([]);
});

it.each(["event/plan", "rest/plan", "shop/plan", "event/act-plan"])("%s filters combat knowledge while fight-plan preserves its existing full result", async label => {
  const { combat, construction, library, cues, ctx, host: constructionHost } = fixture(label); library(combat, construction);
  expect(await cues()).not.toHaveProperty("rk");
  expect(JSON.parse((await constructionHost.call("kb_reflex", { query: "*" })).text).entries.map((e: any) => e.id)).not.toContain(combat.id);
  const fightCtx = { ...ctx, label: "fight-plan", payload: { ...ctx.payload, run_plan_task: { trigger: "act" } } };
  const host = new ToolHost(buildKnowledgeTools(fightCtx), fightCtx);
  const result = JSON.parse((await host.call("kb_reflex", { query: combat.id })).text);
  expect(result.entries).toEqual([combat]);
});

it.each(["reward/card", "shop/plan"])("%s gives truthful optional external lookup counts and executable inputs without statistics", async label => {
  const { cues, host, copyStats, dir } = fixture(label); copyStats();
  const before = readFileSync(join(dir, EXTERNAL_STATS_FILE));
  const body = await cues(), hint = body.external_stats;
  expect(hint).toMatchObject({ status: "ok", source: "external:sts2fun", version: "v0.111", matched_cards: 1 });
  expect(hint.tools.map((t: any) => t.tool)).toEqual(["external_stats_card", "external_stats_skip", "external_stats_deck_size", "external_stats_encounter", "external_stats_clusters", "external_stats_cooccurrence"]);
  expect(hint.note).toContain("自行决定"); if (label.startsWith("shop/")) expect(hint.note).toContain("不是商店购买率");
  for (const h of hint.tools) if (h.input) {
    const result = JSON.parse((await host.call(h.tool, h.input)).text);
    expect(result.status).toBe("ok"); expect(result.total_rows).toBe(h.count);
  }
  expect(JSON.stringify(hint)).not.toMatch(/pick_rate|win_difference|cluster_ci|"rows":/);
  expect(readFileSync(join(dir, EXTERNAL_STATS_FILE))).toEqual(before);
});

it("external hints stay absent outside supported questions, role/ascension or a valid pinned aggregate", async () => {
  const { cues, copyStats, req, ctx, dir } = fixture();
  expect((await cues()).external_stats).toBeUndefined(); copyStats();
  expect((await cues({ ...req, toolContext: { ...ctx, ascension: 9 } })).external_stats).toBeUndefined();
  expect((await cues({ ...req, label: "rest/plan", toolContext: { ...ctx, label: "rest/plan" } })).external_stats).toBeUndefined();
  writeFileSync(join(dir, EXTERNAL_STATS_FILE), "{}"); expect((await cues()).external_stats).toBeUndefined();
});
