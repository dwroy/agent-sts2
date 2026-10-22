/** Fixed offline verification of the actual content and both real consumer paths. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const [contentRootArg, consumerRootArg, outArg] = process.argv.slice(2);
assert(contentRootArg && consumerRootArg && outArg);
const contentRoot = resolve(contentRootArg), consumerRoot = resolve(consumerRootArg), out = resolve(outArg);
mkdirSync(out, { recursive: true });
const load = (p: string) => import(pathToFileURL(join(consumerRoot, p)).href);
const { parseStrategyLibrary, retrieveStrategies, applyStrategyEntries, StrategyEntries, STRATEGY_LIMITS } = await load("agent/src/knowledge/strategy-entries.ts");
const { buildKnowledgeTools } = await load("agent/src/brain/tools/agent-knowledge.ts");
const { setKnowledgeCharacter } = await load("agent/src/knowledge/files.ts");
const { userMessage } = await load("agent/src/brain/message.ts");
const { freeSpec } = await load("agent/src/brain/specs.ts");
const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const serializedBytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v));
const raw = readFileSync(join(contentRoot, "knowledge/characters/silent/strategy-entries.json"));
const library = parseStrategyLibrary(JSON.parse(raw.toString()));
const consumerCommit = process.env["ISSUE27_CONSUMER_COMMIT"];
assert(consumerCommit && /^[a-f0-9]{40}$/.test(consumerCommit));
const sourceFiles = ["agent/src/knowledge/strategy-entries.ts", "agent/src/brain/tools/agent-knowledge.ts", "agent/src/brain/message.ts", "agent/src/brain/specs.ts", "agent/src/knowledge/files.ts"];
const sourceHashes = Object.fromEntries(sourceFiles.map(p => [p, sha(readFileSync(join(consumerRoot, p)))]));
const request = (label: string, payload: unknown) => ({ label, payload, system: "offline fixed content verification", question: "固定回放；不执行动作", spec: freeSpec(label, { type: "object" }) });
const loader = new StrategyEntries();
const ctx = (label: string, payload: unknown) => ({ ascension: 10, label, payload, knowledgeDir: join(contentRoot, "knowledge"), logsDir: "/tmp/issue27-no-log-access" });
setKnowledgeCharacter("silent");
const tool = buildKnowledgeTools(ctx("event/act-plan", {})).find((t: any) => t.name === "kb_strategies");
assert(tool);
const checks: unknown[] = [];
for (const e of library.entries) {
  const payload = { facts: { act: e.trigger.acts[0], floor: e.trigger.acts[0] === 1 ? 1 : 18, act_boss: e.trigger.bosses[0] }, run_brief: { character: "静默猎手" } };
  const req = request("event/act-plan", payload);
  const matched = retrieveStrategies(library, req.label, payload);
  assert.deepEqual(matched.map((r: any) => r.id), [e.id]);
  const applied = loader.apply(req, join(contentRoot, "knowledge"), "silent");
  assert.deepEqual(applied.payload.strategy_entries.entries, [e]);
  const result = await tool.run({ query: "*" }, ctx(req.label, payload));
  assert(!result.isError);
  const parsed = JSON.parse(result.text);
  assert.deepEqual(parsed.entries, [e]);
  assert.equal(parsed.library_sha256, sha(raw));
  assert.equal(parsed.sources[0].source, e.source);
  assert.equal(parsed.sources[0].version, e.version);
  assert.deepEqual(parsed.sources[0].evidence, e.evidence);
  writeFileSync(join(out, e.id + ".tool.json"), result.text + "\n");
  writeFileSync(join(out, e.id + ".prompt.txt"), userMessage(applied) + "\n");
  const misses = [
    { ...payload, facts: { ...payload.facts, act_boss: "UNMATCHED_BOSS" } },
    { ...payload, facts: { act: payload.facts.act, floor: payload.facts.floor } },
    { ...payload, facts: { act_boss: payload.facts.act_boss, floor: payload.facts.floor } },
    { ...payload, facts: { act: payload.facts.act, act_boss: payload.facts.act_boss } },
    { ...payload, facts: { ...payload.facts, floor: payload.facts.act === 1 ? 17 : 33 } },
  ];
  for (const p of misses) {
    assert.equal(retrieveStrategies(library, req.label, p).length, 0);
    const r = request(req.label, p);
    assert.equal(loader.apply(r, join(contentRoot, "knowledge"), "silent"), r);
    assert.equal(JSON.parse((await tool.run({ query: "*" }, ctx(r.label, p))).text).entries.length, 0);
  }
  for (const label of ["reward/card", "combat/plan"]) assert.equal(retrieveStrategies(library, label, payload).length, 0);
  for (const role of ["ironclad", "regent", "necrobinder", "defect"]) {
    setKnowledgeCharacter(role);
    const r = request(req.label, { ...payload, run_brief: { character: role } });
    assert.equal(loader.apply(r, join(contentRoot, "knowledge"), role), r);
    assert.equal(JSON.parse((await tool.run({ query: "*" }, ctx(r.label, r.payload))).text).entries.length, 0);
  }
  setKnowledgeCharacter("silent");
  checks.push({ id: e.id, version: e.version, source: e.source, evidence: e.evidence,
    positive: true, nonmatch_and_unknown_cases: misses.length, other_roles: 4,
    block_bytes: serializedBytes(applied.payload.strategy_entries), tool_bytes: Buffer.byteLength(result.text),
    prompt_bytes: Buffer.byteLength(userMessage(applied)), tool_sha256: sha(result.text),
    prompt_sha256: sha(userMessage(applied)) });
}
// Actual production content in synthetic overlap fixtures checks the unchanged count/byte policy.
const overlap = { ...library, entries: Array.from({ length: 5 }, (_, i) => ({ ...library.entries[0], id: `budget-fixture-${i}`, trigger: { question_types: ["act_plan"] } })) };
parseStrategyLibrary(overlap);
const budgetReq = request("event/act-plan", {});
const block = applyStrategyEntries(budgetReq, overlap).payload.strategy_entries;
assert(block.entries.length <= 3 && serializedBytes(block) <= 4096);
assert(block.entries.length < 3); // Real metadata makes bytes tighter than count.
const compact = { ...library, entries: overlap.entries.map((e: any) => ({ id: e.id, version: e.version, trigger: e.trigger,
  strategy: e.strategy, evidence: [e.evidence[0]], source: e.source, confidence: e.confidence })) };
parseStrategyLibrary(compact);
const compactBlock = applyStrategyEntries(budgetReq, compact).payload.strategy_entries;
assert.equal(compactBlock.entries.length, 3);
assert(serializedBytes(compactBlock) <= STRATEGY_LIMITS.bytes);
const huge = { ...library, entries: [{ ...library.entries[0], trigger: { question_types: ["act_plan"] }, audit_padding: "x".repeat(5000) }] };
parseStrategyLibrary(huge);
assert.equal(applyStrategyEntries(budgetReq, huge), budgetReq);

const questions = JSON.parse(readFileSync(join(outArg, "../fixed-questions.json"), "utf8"));
const replay = [];
for (const q of questions) {
  const facts = Object.fromEntries(Object.entries(q.question).filter(([k]) => ["act", "floor", "hp", "deck_size", "deck", "boss"].includes(k)));
  if (facts.boss) { facts.act_boss = facts.boss; delete facts.boss; }
  const req = request(q.label, { facts, run_brief: { character: "静默猎手" },
    ...(["start", "act"].includes(q.question.plan_trigger) ? { run_plan_task: { trigger: q.question.plan_trigger } } : {}) });
  const applied = loader.apply(req, join(contentRoot, "knowledge"), "silent");
  const result = await tool.run({ query: "*" }, ctx(q.label, req.payload));
  const injected = applied.payload.strategy_entries?.entries ?? [];
  const queried = JSON.parse(result.text).entries;
  assert.deepEqual(injected, queried);
  if (!injected.length) assert.equal(userMessage(applied), userMessage(req));
  writeFileSync(join(out, q.type + ".question.json"), JSON.stringify(req) + "\n");
  writeFileSync(join(out, q.type + ".prompt.txt"), userMessage(applied) + "\n");
  writeFileSync(join(out, q.type + ".tool.json"), result.text + "\n");
  replay.push({ type: q.type, dataset_id: q.dataset_id, label: q.label,
    entries: injected.map((e: any) => ({ id: e.id, version: e.version, source: e.source, evidence: e.evidence })),
    block_bytes: applied.payload.strategy_entries ? serializedBytes(applied.payload.strategy_entries) : 0,
    prompt_bytes: Buffer.byteLength(userMessage(applied)), tool_bytes: Buffer.byteLength(result.text),
    no_hit_prompt_identical: !injected.length ? userMessage(applied) === userMessage(req) : null });
}
for (const p of sourceFiles) assert.equal(sha(readFileSync(join(consumerRoot, p))), sourceHashes[p]);
const report = { fixture_only: true, model_calls: 0, actions_executed: 0, consumer_root: consumerRoot,
  consumer_commit: consumerCommit, source_hashes: sourceHashes, library_sha256: sha(raw),
  parseStrategyLibrary: "passed", per_entry: checks,
  budget: { original_limits: STRATEGY_LIMITS, actual_content_overlap_count: block.entries.length,
    actual_content_overlap_bytes: serializedBytes(block), compact_count: compactBlock.entries.length,
    compact_bytes: serializedBytes(compactBlock), oversized_unchanged: true }, replay,
  scope: "Actual parser, file loader, compatibility serializer and #33 kb_strategies run(); translated frozen question facts; not a model decision or natural live readback." };
writeFileSync(join(out, "consumer-readback.json"), JSON.stringify(report, null, 2) + "\n");
process.stdout.write(JSON.stringify(report) + "\n");
