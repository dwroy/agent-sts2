/** Evaluate learner-authored conditions on original frames with the W1 evaluator. */
import { createHash } from "node:crypto";
import { openSync, closeSync, readSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseGameState } from "../../agent/src/hand/mod/schema.js";
import { combatPredicateFacts } from "../../agent/src/reflex/jev/predicate-context.js";
import { evaluatePredicate, validatePredicate } from "../../agent/src/v6/predicate.js";

export function historicalPrerequisite(predicate: unknown, raw: unknown) {
  const validation = validatePredicate(predicate);
  if (!validation.ok) throw new Error(`invalid combo prerequisite: ${validation.issues.join("; ")}`);
  try {
    const facts = combatPredicateFacts(parseGameState(raw));
    return { value: evaluatePredicate(predicate, facts.context), sources: facts.sources, unavailable: facts.unavailable };
  } catch {
    return { value: null, sources: {}, unavailable: { state: "original_frame_does_not_satisfy_runtime_schema" } };
  }
}

function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("usage: combo-prerequisites.mts input.json output.json");
  const payload = JSON.parse(readFileSync(input, "utf8")) as {
    cacheDirectory?: string; predicates: Record<string, unknown>; frames: { source: { path: string; offset: number; bytes: number; sha256: string }; combos: string[] }[];
  };
  for (const predicate of Object.values(payload.predicates)) {
    if (!validatePredicate(predicate).ok) throw new Error("invalid combo prerequisite");
  }
  const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const algorithm = hash(["knowledge/builders/combo-prerequisites.mts", "agent/src/hand/mod/schema.ts",
    "agent/src/reflex/jev/predicate-context.ts", "agent/src/v6/predicate.ts", "agent/src/v6/schema.ts"]
    .map(p => hash(readFileSync(join(root, p)))).join(":"));
  let hits = 0, misses = 0;
  const rows = payload.frames.map(({ source, combos }) => {
    if (!Number.isSafeInteger(source.bytes) || source.bytes < 1 || source.bytes > 100_000_000 || !Number.isSafeInteger(source.offset) || source.offset < 0) throw new Error("invalid original frame range");
    const bytes = Buffer.alloc(source.bytes), fd = openSync(source.path, "r");
    try { if (readSync(fd, bytes, 0, bytes.length, source.offset) !== bytes.length) throw new Error("short original frame read"); }
    finally { closeSync(fd); }
    if (createHash("sha256").update(bytes).digest("hex") !== source.sha256) throw new Error("prerequisite source SHA mismatch");
    const identity = hash(JSON.stringify([algorithm, source.sha256, combos.map(id => [id, payload.predicates[id]])]));
    const cache = payload.cacheDirectory ? join(payload.cacheDirectory, "prerequisites", identity.slice(0, 2), identity + ".json") : undefined;
    if (cache) try {
      const entry = JSON.parse(readFileSync(cache, "utf8"));
      if (entry.identity === identity && hash(JSON.stringify(entry.conditions)) === entry.sha256) {
        hits++; return { source, conditions: entry.conditions };
      }
    } catch { /* A disposable cache never substitutes for missing evidence. */ }
    misses++;
    const raw = JSON.parse(bytes.toString("utf8")) as { state: unknown };
    let facts: ReturnType<typeof combatPredicateFacts> | undefined;
    try { facts = combatPredicateFacts(parseGameState(raw.state)); } catch { /* Preserve schema gaps. */ }
    const conditions = Object.fromEntries(combos.map(id => [id, facts
      ? { value: evaluatePredicate(payload.predicates[id], facts.context), sources: facts.sources, unavailable: facts.unavailable }
      : { value: null, sources: {}, unavailable: { state: "original_frame_does_not_satisfy_runtime_schema" } }]));
    if (cache) {
      mkdirSync(dirname(cache), { recursive: true });
      const temporary = cache + "." + process.pid + ".tmp";
      writeFileSync(temporary, JSON.stringify({ identity, conditions, sha256: hash(JSON.stringify(conditions)) }));
      renameSync(temporary, cache);
    }
    return { source, conditions };
  });
  writeFileSync(output, JSON.stringify({ rows }) + "\n");
  process.stdout.write(JSON.stringify({ prerequisite_cache: { hits, misses } }) + "\n");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
