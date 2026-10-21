/** Synthetic fixed requests through the production Brain assembler; no model/mod/network calls. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { Brain } from "../src/brain/brain.js";
import { BrainRouter } from "../src/brain/router.js";
import { userMessage } from "../src/brain/message.js";
import type { BrainRequest } from "../src/brain/types.js";
import type { JsonValue } from "../src/core/util/json.js";
import { loadConfig } from "../src/core/config.js";
import { KNOWLEDGE_DIR, PROJECT_ROOT } from "../src/core/paths.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { OPEN_BOOK_MAX_BYTES } from "../src/knowledge/open-book.js";

type Row = Record<string, unknown>;
interface Fixture { kind: string; label: string; question: string; options?: Record<string, string | null>; payload: Record<string, JsonValue>; expected: string[] }
const fixturePath = join(PROJECT_ROOT, "agent/tests/open-book-data/questions.json");
const fixtures = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture[];
const output = process.argv[2] ?? join(PROJECT_ROOT, "paper/materials/20261021-issue-25-open-book/replay.json");
const hash = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const rounds = 30;
const quantile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * q) - 1]!;
const rows: Row[] = [];
let captured: BrainRequest | undefined;
let started = 0, assembledMs = 0;
const brain = new Brain(new BrainRouter({
  config: loadConfig({ BRAIN_ENGINE: "deepseek", BRAIN_LOG: "off", KNOWLEDGE_PREFIX: "off" } as NodeJS.ProcessEnv).brain,
  engine: () => ({ name: "deepseek", model: "offline-fixed", decide: async (req: BrainRequest) => {
    assembledMs = performance.now() - started;
    captured = req;
    return { engine: "deepseek", model: "offline-fixed", answer: req.options ? { choice: Object.keys(req.options)[0]!, reason: "fixed" } : {},
      problems: [], attempts: 1, latencyMs: 0, usage: { inputTokens: 0, outputTokens: 0 }, toolCalls: [], raw: "{}" };
  } }),
}), { systemPrompt: "fixed-offline-replay" });
brain.setToolContext({ ascension: 10, knowledgeDir: KNOWLEDGE_DIR, logsDir: join(PROJECT_ROOT, "data/external/open-book-replay") });
async function assemble(f: Fixture, enabled: boolean) {
  // The disabled character only gates this adapter; the fixture still says SILENT in both requests.
  setKnowledgeCharacter(enabled ? "silent" : "ironclad");
  started = performance.now();
  if (f.options) await brain.choose(f.payload, f.question, f.options, { label: f.label });
  else await brain.askJson({ ...f.payload, task: f.question }, f.label);
  const request = captured!;
  const wire = userMessage(request);
  const book = (request.payload as Row | undefined)?.open_book as Row | undefined;
  const ids = ((book?.entries ?? []) as Row[]).map((e) => `${e.kind}:${e.id}`);
  if (enabled && !f.expected.every((id) => ids.includes(id))) throw new Error(`missing references: ${f.kind}`);
  return { ms: assembledMs, bytes: Buffer.byteLength(wire), sha256: hash(wire), ids, omitted: book?.omitted ?? 0 };
}
try {
  for (const f of fixtures) {
    const baseline = await assemble(f, false);
    const first = await assemble(f, true);
    const disabled: number[] = [], enabled: number[] = [], paired: number[] = [];
    for (let i = 0; i < rounds; i++) {
      // Alternate ordering to limit warm-up/order bias.
      const a = i % 2 ? await assemble(f, true) : await assemble(f, false);
      const b = i % 2 ? await assemble(f, false) : await assemble(f, true);
      const off = i % 2 ? b.ms : a.ms, on = i % 2 ? a.ms : b.ms;
      disabled.push(off); enabled.push(on); paired.push(on - off);
    }
    if (first.bytes - baseline.bytes > OPEN_BOOK_MAX_BYTES) throw new Error(`unbounded prompt: ${f.kind}`);
    rows.push({ kind: f.kind, label: f.label, baseline_bytes: baseline.bytes, enriched_bytes: first.bytes,
      added_bytes: first.bytes - baseline.bytes, baseline_sha256: baseline.sha256, enriched_sha256: first.sha256,
      selected: first.ids, omitted: first.omitted, first_enabled_ms: first.ms,
      warm_baseline_median_ms: quantile(disabled, .5), warm_enriched_median_ms: quantile(enabled, .5),
      warm_added_median_ms: quantile(paired, .5), warm_added_p95_ms: quantile(paired, .95) });
  }
} finally { setKnowledgeCharacter(null); }
const report = { schema: "open-book-replay-v1", generated_at: new Date().toISOString(), fixture_sha256: hash(readFileSync(fixturePath)),
  node: process.version, rounds_per_mode: rounds, max_added_bytes: OPEN_BOOK_MAX_BYTES,
  scope: "五种合成固定题经生产 Brain.choose/askJson -> userMessage；字段来自已署名外部机械资料，价格为结构占位。非实盘、非自然采用、无模型/网络/对局。耗时截至假引擎入口，含路由；第一题首次加载，随后共享缓存。负差值是测量噪声，不代表提速。",
  results: rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
