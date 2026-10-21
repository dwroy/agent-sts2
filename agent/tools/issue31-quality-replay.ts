/** Optional post-trial fixed replay: explicit home, sequential requests, durable <=96 physical calls. */
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join, relative, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { loadConfig } from "../src/core/config.js";
import { CodexEngine } from "../src/brain/engines/codex.js";
import { freeSpec, pickSpec, shopPlanSpec, routePlanSpec, carriesRunPlan, withRunPlanField, withDirectionRideField } from "../src/brain/specs.js";
import type { BrainRequest } from "../src/brain/types.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";

const { values: args } = parseArgs({ options: {
  fixtures: { type: "string" }, out: { type: "string" }, home: { type: "string" }, run: { type: "boolean" },
} });
if (!args.fixtures || !args.out) throw Error("--fixtures and --out required; --run --home explicitly enables model calls");
const raw = readFileSync(resolve(args.fixtures), "utf8");
const fixturesSha = createHash("sha256").update(raw).digest("hex");
if (fixturesSha !== "534de164f2b8c33c10fbc3ad222d3e5b2c4ed6009b734ace4be7fbbdb8396236") throw Error("Expected the preregistered #29 fixture bytes");
const fixtures = raw.trim().split("\n").map(line => JSON.parse(line));
if (fixtures.length !== 32 || new Set(fixtures.map(f => f.id)).size !== 32) throw Error("Expected #29 frozen 32 unique fixtures");
setKnowledgeCharacter("silent");
const out = resolve(args.out);
const repo = resolve(import.meta.dirname, "../..");
const outRel = relative(repo, out);
if (!outRel || outRel.startsWith("..") || isAbsolute(outRel)) throw Error("--out must be a dedicated directory inside this repository");
mkdirSync(out, { recursive: true });
const identity = JSON.stringify({ schema: "issue31-quality-v1", fixtures_sha256: fixturesSha,
  arms: ["high", "xhigh"], model: "gpt-6.1-sol", mode: "session", timeout_ms: 90000, physical_cap: 96 });
const manifest = join(out, "manifest.json");
if (existsSync(manifest) && readFileSync(manifest, "utf8") !== identity) throw Error("Frozen replay identity changed");
writeFileSync(manifest, identity);
if (!args.run) { console.log(identity); process.exit(0); }
if (!args.home) throw Error("Explicit isolated developer --home required");
const home = resolve(args.home);
if (home === process.env["BRAIN_CODEX_HOME"] || /\/brain\/?$/.test(home)) throw Error("Production brain home is forbidden for offline replay");
const engineConfig = loadConfig({ BRAIN_CODEX_HOME: home, BRAIN_CODEX_MODEL: "gpt-6.1-sol", BRAIN_CODEX_MODE: "session",
  BRAIN_CODEX_USAGE_REQUIRED: "on", BRAIN_CODEX_USAGE_STOP_PCT: "80", BRAIN_CODEX_STALL_RETRIES: "0", BRAIN_LOG: "off" });
const claims = join(out, "claims");
mkdirSync(claims, { recursive: true });
const resultsPath = join(out, "results.jsonl");
const completed = new Set(existsSync(resultsPath) ? readFileSync(resultsPath, "utf8").trim().split("\n").filter(Boolean)
  .map(line => { const r = JSON.parse(line); return `${r.id}/${r.effort}`; }) : []);
// A claim is written before dispatch, including crashes and engine-mode retries. No account/config copying.
const engine = new CodexEngine({ settings: engineConfig.brain.engines.codex, codex: engineConfig.brain.codex,
  physicalCallLimit: 96, stateDir: join(out, "state"), traceFile: join(out, "codex-calls.jsonl"), beforePhysicalCall: call => {
    const count = readdirSync(claims).length;
    if (count >= 96) throw Error("96 physical calls exhausted");
    writeFileSync(join(claims, `${count + 1}.json`), JSON.stringify(call), { flag: "wx", flush: true });
  } });
try {
  for (const [index, f] of fixtures.entries()) {
    // Counterbalance which arm sees the earlier server load for each paired question.
    for (const effort of index % 2 ? ["xhigh", "high"] as const : ["high", "xhigh"] as const) {
      if (completed.has(`${f.id}/${effort}`)) continue;
      const r = f.request;
      let spec = r.options ? r.label.startsWith("shop/") ? shopPlanSpec(r.label, r.options, r.payload)
        : r.label.startsWith("map/route-") ? routePlanSpec(r.label, r.payload)
        : r.label === "event/plan" ? freeSpec(r.label, { type: "object" }) : pickSpec(r.label, r.options, r.payload)
        : freeSpec(r.label, { type: "object" });
      if (carriesRunPlan(r.payload)) spec = withRunPlanField(spec, r.payload);
      spec = withDirectionRideField(spec, r.payload);
      const req: BrainRequest = { ...r, spec, effort, questionId: `issue31-${f.id}-${effort}` };
      const started = Date.now();
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 90000);
      let result: object;
      try {
        const a = await engine.decide(req, abort.signal);
        const problems = a.answer === null ? ["no_answer"] : spec.validate(a.answer);
        result = { answer: a.answer, accepted: problems.length === 0, problems, usage: a.usage,
          native_receipt: a.nativeReceipt ?? null, attempts: a.attempts };
      } catch { result = { accepted: false, answer: null, error: "call_failed_or_budget_expired", native_receipt: null }; }
      finally { clearTimeout(timer); }
      appendFileSync(resultsPath, JSON.stringify({ id: f.id, label: r.label, effort, ms: Date.now() - started, ...result }) + "\n");
    }
  }
} finally { await engine.close(); }
