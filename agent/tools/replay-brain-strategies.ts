/** Fixed offline prompt replay. Fixture text is deliberately not learned game advice. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { userMessage } from "../src/brain/message.js";
import { freeSpec } from "../src/brain/specs.js";
import type { BrainRequest } from "../src/brain/types.js";
import { applyStrategyEntries, parseStrategyLibrary, retrieveStrategies, STRATEGY_LIMITS } from "../src/knowledge/strategy-entries.js";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error("usage: replay-brain-strategies.ts fixed-input.json new-output-directory");
const raw = readFileSync(inputPath, "utf8");
const input = JSON.parse(raw) as { fixture_only: boolean; library: unknown; questions: { type: string; dataset_id: string; label: string; question: string; options?: Record<string, string | null>; payload: unknown }[] };
if (input.fixture_only !== true || input.questions.length !== 5) throw new Error("five explicitly marked fixture questions required");
const library = parseStrategyLibrary(input.library);
mkdirSync(outputPath, { recursive: false });
const results = [];
for (const q of input.questions) {
  const req: BrainRequest = { label: q.label, system: "fixed replay: production system prefix omitted", question: q.question, ...(q.options ? { options: q.options } : {}), payload: q.payload, spec: freeSpec(q.label, { type: "object" }) };
  const before = userMessage(req);
  const start = performance.now();
  const augmented = applyStrategyEntries(req, parseStrategyLibrary(JSON.parse(raw).library));
  const after = userMessage(augmented);
  const coldMs = performance.now() - start;
  const noHit = applyStrategyEntries(req, { ...library, entries: library.entries.map((e) => ({ ...e, trigger: { ...e.trigger, acts: [99] } })) });
  if (noHit !== req || userMessage(noHit) !== before) throw new Error("no-hit prompt changed");
  const matched = retrieveStrategies(library, req.label, req.payload).map((e) => e.id);
  if (!matched.includes(`fixture-${q.type}`)) throw new Error(`missing fixture for ${q.type}`);
  const times = [];
  for (let i = 0; i < 1000; i++) {
    const t = performance.now(); userMessage(applyStrategyEntries(req, library)); times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  writeFileSync(join(outputPath, `${q.type}.prompt.txt`), after + "\n");
  const block = (augmented.payload as Record<string, unknown>)["strategy_entries"];
  const blockBytes = Buffer.byteLength(JSON.stringify(block), "utf8");
  if (blockBytes > STRATEGY_LIMITS.bytes) throw new Error("entry byte limit exceeded");
  results.push({ type: q.type, label: q.label, dataset_id: q.dataset_id, matched,
    base_user_bytes: Buffer.byteLength(before), augmented_user_bytes: Buffer.byteLength(after),
    delta_bytes: Buffer.byteLength(after) - Buffer.byteLength(before), block_bytes: blockBytes,
    cold_parse_retrieve_serialize_ms: coldMs, warm_retrieve_serialize_median_ms: times[500], warm_retrieve_serialize_p95_ms: times[950],
    warm_iterations: times.length, no_hit_byte_identical: true });
}
writeFileSync(join(outputPath, "metrics.json"), JSON.stringify({ fixture_only: true, model_calls: 0,
  measurement: "one nice-19 Node process; user prompt only, no system prefix, file I/O or API latency; cold includes fixture JSON parsing and schema validation; warm includes retrieval plus user serialization", limits: STRATEGY_LIMITS, results }, null, 2) + "\n");
process.stdout.write(JSON.stringify(results) + "\n");
