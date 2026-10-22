/** #42 learning-side aggregate contract and actual ledger → retrieval → prompt path. No API/game calls. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { parseStrategyLibrary, applyStrategyEntries, retrieveStrategies, strategyEvidenceSummary, STRATEGY_LIMITS, type StrategyEntry } from "../src/knowledge/strategy-entries.js";
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
it("registers a precise #24 aggregate then retrieves it in the actual prompt", () => {
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
  expect(retrieveStrategies(lib, "reward/card", { act: 2 })).toEqual([]);
  runLedger(["check"]);
  // Optional explicit local artifact sink used once for the review receipt.
  if (process.env["ISSUE42_RECEIPT_DIR"]) {
    const out = process.env["ISSUE42_RECEIPT_DIR"]!;
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "e2e.json"), JSON.stringify({ fixture_only: true, input: dataPath, input_sha256: createHash("sha256").update(raw).digest("hex"), ledger: shown, retrieved: block, payload_bytes: Buffer.byteLength(JSON.stringify(block)) }, null, 2));
    writeFileSync(join(out, "prompt.txt"), message);
  }
});

it("keeps the existing published own library and its retrieved bytes unchanged", () => {
  const raw = JSON.parse(readFileSync("../knowledge/characters/silent/strategy-entries.json", "utf8"));
  const lib = parseStrategyLibrary(raw);
  expect(lib).toEqual(raw);
  const result = retrieveStrategies(lib, "rest/plan", { act: 1, floor: 4, act_boss: "THE_KIN_BOSS" });
  expect(result.length).toBeGreaterThan(0);
  for (const e of result) expect(JSON.stringify(e)).toBe(JSON.stringify(raw.entries.find((r: StrategyEntry) => r.id === e.id)));
});
