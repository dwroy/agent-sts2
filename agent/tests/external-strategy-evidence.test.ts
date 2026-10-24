/** #42 aggregate contract and actual ledger → retrieval → prompt/tool path. No API/game calls. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { parseStrategyLibrary, applyStrategyEntries, retrieveStrategies, strategyEvidenceSummary, STRATEGY_LIMITS, type StrategyEntry } from "../src/knowledge/strategy-entries.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { userMessage } from "../src/brain/message.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainRequest } from "../src/brain/types.js";
import fixture from "./external-strategy-data/external-strategy.json";
import cases from "./external-strategy-data/contract-cases.json";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); setKnowledgeCharacter(null); });
function mutate(c: typeof cases[number]) {
  const entry: any = structuredClone(fixture.entries[0]);
  for (const [path, value] of Object.entries(c.set)) {
    const parts = path.split("."), key = parts.pop()!;
    parts.reduce((v, k) => v[k], entry)[key] = structuredClone(value);
  }
  for (const path of c.delete) {
    const parts = path.split("."), key = parts.pop()!;
    delete parts.reduce((v, k) => v[k], entry)[key];
  }
  return entry;
}
it.each(cases)("validates aggregate contract: $name", c => {
  const call = () => parseStrategyLibrary({ ...fixture, entries: [mutate(c)] });
  if (c.valid) expect(call).not.toThrow(); else expect(call).toThrow();
});
it("keeps absent intervals unknown and counts repeated local frames once", () => {
  const external = structuredClone(fixture);
  delete (external.entries[0]!.evidence[0] as any).interval;
  expect(() => parseStrategyLibrary(external)).not.toThrow();
  const e = mutate(cases.find(c => c.name === "mixed separate denominators")!);
  e.evidence.push({ run: "SILENT000001", floor: 5 });
  const lib = parseStrategyLibrary({ ...fixture, entries: [e] });
  expect(strategyEvidenceSummary(lib.entries[0]!)).toMatchObject({ own_runs: 1, own_support_runs: 1, external: [{ denominator: { n: 13307, unit: "rewards" } }] });
  const conflict = mutate(cases.find(c => c.name === "conflict preserved")!);
  const result = retrieveStrategies(parseStrategyLibrary({ ...fixture, entries: [conflict] }), "reward/card", { act: 1 })[0]!;
  expect(result.evidence_status).toBe("conflict");
  expect(result.evidence).toHaveLength(2);
});
it("registers a precise #24 aggregate then retrieves it in the actual prompt and knowledge tool", async () => {
  const dir = mkdtempSync(join(tmpdir(), "issue42-")); dirs.push(dir);
  const original = parseStrategyLibrary(fixture).entries[0]!;
  const ev = original.evidence[0]!;
  if (ev.type !== "external_aggregate") throw new Error("invalid fixed fixture");
  // Check the copied statistic/denominator against the existing #24 frozen aggregate.
  const dataPath = "./tests/external-strategy-data/frozen-skip-aggregate.json";
  const raw = readFileSync(dataPath, "utf8"), data = JSON.parse(raw);
  const table = data.tables.skip, row = table.rows.find((r: unknown[]) => r[0] === "v0.111" && r[1] === 1);
  expect(ev.dataset_sha256).toBe(data.provenance.database_sha256);
  expect(ev.denominator.n).toBe(row[table.columns.indexOf("screens")]);
  expect(ev.statistic.value).toBe(row[table.columns.indexOf("rate")]);
  expect([ev.interval!.low, ev.interval!.high]).toEqual(row[table.columns.indexOf("cluster_ci")]);
  const env = { ...process.env, LEDGER_FILE: join(dir, "ledger.jsonl"), LEDGER_RUNS: "none" };
  const runLedger = (args: string[], input?: unknown) => {
    const out = spawnSync("python3", ["../learner/ledger.py", ...args], { env, encoding: "utf8", input: input ? JSON.stringify(input) : undefined });
    expect(out.status, out.stderr).toBe(0); return out.stdout;
  };
  const key = runLedger(["add"], { character: "silent", kind: "other", claim: original.strategy, evidence: original.evidence, confidence: original.confidence, prior: "unknown", status: "observed", by: "fixture:issue42" }).trim();
  const shown = JSON.parse(runLedger(["show", key]));
  const entry: StrategyEntry = { ...original, evidence: shown.evidence.map(({ added: _added, ...e }: any) => e) };
  const lib = parseStrategyLibrary({ ...fixture, entries: [entry] });
  mkdirSync(join(dir, "characters/silent"), { recursive: true });
  writeFileSync(join(dir, "characters/silent/strategy-entries.json"), JSON.stringify(lib));
  const request: BrainRequest = { label: "reward/card", system: "fixed", question: "格式验收", payload: { act: 1, run_brief: { character: "静默猎手" } }, options: { yes: null }, spec: pickSpec("reward/card", { yes: null }) };
  const applied = applyStrategyEntries(request, lib), message = userMessage(applied);
  expect(message).toContain("external:sts2fun");
  expect(JSON.parse(message).state.strategy_entries.entries[0].evidence_summary.own_runs).toBe(0);
  expect(message).toContain("13307");
  expect(message).toContain("非因果");
  const block = (applied.payload as any).strategy_entries;
  expect(Buffer.byteLength(JSON.stringify(block))).toBeLessThanOrEqual(STRATEGY_LIMITS.bytes);
  setKnowledgeCharacter("silent");
  const ctx = { ascension: 10, knowledgeDir: dir, logsDir: "/unused", label: request.label, payload: request.payload };
  const host = new ToolHost(buildKnowledgeTools(ctx), ctx);
  const result = await host.call("kb_strategies", { query: "*" });
  expect(result.isError).not.toBe(true);
  const tool = JSON.parse(result.text);
  expect(tool.entries[0].evidence_summary).toMatchObject({ own_runs: 0, external: [{ denominator: { n: 13307, unit: "rewards" } }] });
  expect(tool.sources).toEqual(expect.arrayContaining([expect.objectContaining({ source: "external:sts2fun", dataset_sha256: ev.dataset_sha256, denominator: ev.denominator })]));
  expect(tool.entries[0].limitation_notice).toContain("非因果");
  expect(retrieveStrategies(lib, "reward/card", { act: 2 })).toEqual([]);
  setKnowledgeCharacter("ironclad");
  expect(JSON.parse((await host.call("kb_strategies", { query: "*" })).text).entries).toEqual([]);
  runLedger(["check"]);
  // Optional explicit local artifact sink used once for the review receipt.
  if (process.env["ISSUE42_RECEIPT_DIR"]) {
    const out = process.env["ISSUE42_RECEIPT_DIR"]!;
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "e2e.json"), JSON.stringify({ fixture_only: true, input: dataPath, input_sha256: createHash("sha256").update(raw).digest("hex"), ledger: shown, retrieved: block, tool, payload_bytes: Buffer.byteLength(JSON.stringify(block)) }, null, 2));
    writeFileSync(join(out, "prompt.txt"), message);
  }
});

function fixedOwnEntry(): StrategyEntry {
  return { id: "fixture-own-byte-contract", version: "fixture-1", trigger: { question_types: ["card_reward"], acts: [1] },
    strategy: "仅格式验收：自有记录原样返回，不提供游戏策略。", source: "own", confidence: 0.4,
    evidence: [{ run: "SILENT000001", floor: 4 }, { run: "SILENT000001", floor: 5 },
      { run: "SILENT000002", floor: 4, role: "contradict" }] };
}

it("keeps fixed own retrieved bytes unchanged alongside an external entry", () => {
  const raw = { ...fixture, entries: [fixedOwnEntry(), fixture.entries[0]!] };
  const before = JSON.stringify(raw);
  const lib = parseStrategyLibrary(raw);
  expect(lib).toEqual(raw);
  const result = retrieveStrategies(lib, "reward/card", { act: 1 });
  expect(result).toHaveLength(2);
  const own = result.find(e => e.source === "own")!;
  expect(JSON.stringify(own)).toBe(JSON.stringify(raw.entries[0]));
  expect(own).not.toHaveProperty("evidence_summary");
  expect(own).not.toHaveProperty("limitation_notice");
  expect(JSON.stringify(raw)).toBe(before);
});

it.each(["external", "mixed"] as const)("keeps fixed %s original fields and independent evidence denominators with limitation notices", source => {
  const external = parseStrategyLibrary(structuredClone(fixture)).entries[0]!;
  const ev = external.evidence[0]!;
  if (ev.type !== "external_aggregate") throw new Error("invalid fixed external fixture");
  const entry: StrategyEntry = source === "external" ? external : { ...external, source: "mixed", evidence_status: "conflict",
    evidence: [...fixedOwnEntry().evidence, ...external.evidence] };
  const raw = { ...fixture, entries: [entry] };
  const before = JSON.stringify(raw);
  const result = retrieveStrategies(parseStrategyLibrary(raw), "reward/card", { act: 1 });
  expect(result).toHaveLength(1);
  const { evidence_summary, limitation_notice, ...original } = result[0]!;
  expect(JSON.stringify(original)).toBe(JSON.stringify(entry));
  expect(evidence_summary).toEqual({ own_runs: source === "external" ? 0 : 2, own_support_runs: source === "external" ? 0 : 1,
    external: [{ source: "external:sts2fun", version: "v0.111", dataset_sha256: ev.dataset_sha256,
      statistic: "skip.rate", denominator: { n: 13307, unit: "rewards" } }] });
  expect(limitation_notice).toContain("非因果");
  expect(limitation_notice).toContain("外部分母不计本系统验证");
  expect(result[0]!.evidence_status).toBe(entry.evidence_status);
  expect(JSON.stringify(raw)).toBe(before);
});
