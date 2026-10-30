/** #28 frozen offline ablation. Default is preparation/reporting, --ask enables sequential Jev calls. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { array, id, literal, nullable, number, object, refine, text, validate } from "../../src/v6/schema.js";
import { loadConfig, requireJevApiKey } from "../../src/core/config.js";
import { JevClient } from "../../src/reflex/jev/client.js";
import { parseReplayOutcomes, prepareCombatEntryReplay, replayHash, summarizeCombatEntryReplay,
  type ReplayArm, type ReplayObservation } from "../../src/reflex/jev/combat-entry-replay.js";

const sha = refine(text(64, 64), (v, e) => { if (!/^[a-f0-9]{64}$/.test(v)) e.push("SHA256 required"); });
const reference = object({ path: text(1000), sha256: sha });
const manifestSchema = object({ schema: literal("combat-entry-replay-manifest-v1"),
  character: literal("silent"), game_version: text(100), ascension: number(0, 100, true),
  // Freeze selection/exclusions before asking; never choose cases by the resulting improvement.
  selection: text(4000), exclusions: array(text(2000)),
  cases: array(object({ id, run_id: id, act: number(1, 3, true), encounter: id,
    attempt: text(100), request: reference, outcomes: nullable(reference) }), 1, 100),
});
const hashBytes = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
function local(path: string): string {
  const full = resolve(root, path), rel = relative(root, full);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw Error("artifact path must be inside this worktree");
  // Check existing ancestors too: an output under an external symlink is not local.
  let ancestor = full;
  while (!existsSync(ancestor)) ancestor = resolve(ancestor, "..");
  const actual = relative(realpathSync(root), realpathSync(ancestor));
  if (actual.startsWith("..") || isAbsolute(actual)) throw Error("artifact path redirects outside this worktree");
  if (/(^|\/)(?:\.env(?:\..*)?|[^/]*(?:api[_-]?key|credentials)[^/]*)$/i.test(rel)) throw Error("credential path is forbidden");
  return full;
}
function frozen(ref: { path: string; sha256: string }): unknown {
  const path = local(ref.path);
  if (!statSync(path).isFile() || statSync(path).size > 32 * 1024 * 1024) throw Error("frozen input must be a file <=32MiB");
  const bytes = readFileSync(path);
  if (hashBytes(bytes) !== ref.sha256) throw Error("frozen input SHA mismatch");
  return JSON.parse(bytes.toString());
}
export async function main(argv = process.argv.slice(2)) {
  const { values: args } = parseArgs({ args: argv, options: { manifest: { type: "string" }, out: { type: "string" },
    ask: { type: "boolean" }, "max-calls": { type: "string" } } });
  if (!args.manifest || !args.out) throw Error("--manifest and --out required; --ask --max-calls N explicitly enables Jev calls");
  const manifestPath = local(args.manifest), manifestBytes = readFileSync(manifestPath);
  const parsed = validate(manifestSchema, JSON.parse(manifestBytes.toString()));
  if (!parsed.ok) throw Error(parsed.issues.join("; "));
  const manifest = parsed.value;
  if (new Set(manifest.cases.map(c => c.id)).size !== manifest.cases.length) throw Error("duplicate case IDs");
  const observations: ReplayObservation[] = manifest.cases.map(c => {
    const raw = frozen(c.request) as { state: { v6_combat_entries?: { ascension?: number; context?: { act?: number } } } };
    if (raw.state?.v6_combat_entries?.ascension !== manifest.ascension || raw.state.v6_combat_entries.context?.act !== c.act) throw Error("case cohort differs from audit");
    const pair = prepareCombatEntryReplay(raw);
    const q = pair.baseline.questions[pair.question_id]!;
    if (q.type !== "choice") throw Error("choice required");
    // Every new evidence attachment must resolve to the exact frozen bytes before any call.
    const audit = raw.state.v6_combat_entries as unknown as { knowledge: { reflex: { entries: { sources?: { path: string; sha256: string }[] }[] } } };
    for (const entry of audit.knowledge.reflex.entries) for (const source of entry.sources ?? []) {
      const path = local(source.path);
      if (!statSync(path).isFile() || hashBytes(readFileSync(path)) !== source.sha256) throw Error("entry source SHA mismatch");
    }
    return { id: c.id, run_id: c.run_id, stratum: JSON.stringify([c.act, c.encounter, manifest.ascension, manifest.game_version, c.attempt]),
      pair, choices: { baseline: null, memory: null }, outcomes: c.outcomes ? parseReplayOutcomes(frozen(c.outcomes), Object.keys(q.criteria)) : null };
  });
  const out = local(args.out);
  mkdirSync(out, { recursive: true });
  // Preparation needs only the model label and must not read credentials or live play settings.
  const config = loadConfig({ MODE: "replay", JEV_MODEL: process.env["JEV_MODEL"], ...(args.ask ? {
    TYPESAFE_API_KEY: process.env["TYPESAFE_API_KEY"], TYPESAFE_API_KEY_FILE: process.env["TYPESAFE_API_KEY_FILE"],
    TYPESAFE_BASE_URL: process.env["TYPESAFE_BASE_URL"],
  } : {}) });
  const identity = JSON.stringify({ schema: "combat-entry-replay-session-v1", manifest_sha256: hashBytes(manifestBytes),
    model: config.jev.model, protocol: "V5_base_plus_memory_only", retries: 0,
    pairs: observations.map(o => ({ id: o.id, baseline: replayHash(o.pair.baseline), memory: replayHash(o.pair.memory) })) });
  const identityPath = join(out, "identity.json");
  if (existsSync(identityPath)) {
    if (readFileSync(identityPath, "utf8") !== identity) throw Error("replay identity changed; preserve prior results");
  } else writeFileSync(identityPath, identity, { flag: "wx", flush: true });
  const claims = join(out, "claims"), results = join(out, "results");
  mkdirSync(claims, { recursive: true }); mkdirSync(results, { recursive: true });
  const maxCalls = Number(args["max-calls"]);
  if (args.ask && (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 200)) throw Error("--max-calls 1..200 required with --ask");
  const uncertain = readdirSync(claims).filter(name => !existsSync(join(results, name)));
  if (args.ask && uncertain.length) throw Error("uncertain prior call; inspect original receipt, never redispatch automatically");
  if (args.ask && !observations.some(o => Object.values(o.pair.matched).some(ids => ids.length))) throw Error("no matching entries; do not spend calls");
  const client = args.ask ? new JevClient({ apiKey: requireJevApiKey(config), model: config.jev.model,
    baseUrl: config.jev.baseUrl, maxRetries: 0, timeoutMs: 20_000 }) : null;
  for (const [index, o] of observations.entries()) {
    // Alternate order across cases; each case keeps the same options and base request.
    for (const arm of (index % 2 ? ["memory", "baseline"] : ["baseline", "memory"]) as ReplayArm[]) {
      const request = o.pair[arm], key = `${o.id}-${arm}`, resultPath = join(results, `${key}.json`);
      const requestSha = replayHash(request);
      writeFileSync(join(out, `${key}-request.json`), JSON.stringify(request, null, 2) + "\n");
      if (!existsSync(resultPath) && client) {
        if (readdirSync(claims).length >= maxCalls) break;
        // A crash after claiming is uncertain. A rerun must never dispatch that call again.
        writeFileSync(join(claims, `${key}.json`), JSON.stringify({ id: o.id, arm, request_sha256: requestSha }), { flag: "wx", flush: true });
        let result: object;
        try {
          const answer = await client.ask(request.state, request.questions);
          const a = answer.answers[o.pair.question_id];
          const question = request.questions[o.pair.question_id];
          const valid = a?.type === "choice" && question?.type === "choice" && Object.hasOwn(question.criteria, a.choice);
          result = { status: valid ? "ok" : "invalid_answer", choice: valid ? a.choice : null,
            returned_choice: a?.type === "choice" ? a.choice : null,
            model: answer.model, request_id: answer.requestId, input_tokens: answer.inputTokens, output_tokens: answer.outputTokens, latency_ms: answer.latencyMs };
        } catch { result = { status: "call_failed", choice: null }; }
        writeFileSync(resultPath, JSON.stringify({ id: o.id, arm, request_sha256: requestSha, ...result }), { flag: "wx", flush: true });
      }
      if (existsSync(resultPath)) {
        const r = JSON.parse(readFileSync(resultPath, "utf8"));
        if (r.id !== o.id || r.arm !== arm || r.request_sha256 !== requestSha) throw Error("result identity mismatch");
        o.choices[arm] = r.status === "ok" && typeof r.choice === "string" ? r.choice : null;
        o.jev_models ??= { baseline: null, memory: null };
        o.jev_models[arm] = typeof r.model === "string" ? r.model : null;
      }
    }
  }
  const report = { ...summarizeCombatEntryReplay(observations), manifest_sha256: hashBytes(manifestBytes),
    physical_claims: readdirSync(claims).length, completed_results: readdirSync(results).length,
    uncertain_claims: uncertain,
    matched_cases: observations.filter(o => Object.values(o.pair.matched).some(ids => ids.length)).length };
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ cases: report.cases, matched_cases: report.matched_cases,
    physical_claims: report.physical_claims, completed_results: report.completed_results, recommendation: report.recommendation }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error("Replay failed; preserve artifacts and inspect frozen inputs/claims locally. No automatic retry."); process.exitCode = 1; });
}
