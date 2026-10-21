/** Offline, sequential paired replay. Never starts a game or writes production configuration. */
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { CodexEngine, checkCodex, redact } from "../src/brain/engines/codex.js";
import { DeepSeekClient, systemRules, questionEffort } from "../src/brain/llm/deepseek.js";
import { DeepSeekEngine } from "../src/brain/engines/deepseek.js";
import { loadConfig } from "../src/core/config.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { freeSpec, pickSpec, shopPlanSpec, routePlanSpec, withDirectionRideField, withRunPlanField, carriesRunPlan } from "../src/brain/specs.js";
import { userMessage } from "../src/brain/message.js";
import type { BrainRequest } from "../src/brain/types.js";

const root = resolve(import.meta.dirname, "../..");
const local = join(root, "data/issue29");
const evidence = join(root, "paper/materials/issue29-brain-speed");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const line = (p: string, v: unknown) => appendFileSync(p, JSON.stringify(v) + "\n");
setKnowledgeCharacter("silent");
const system = systemRules("silent");

function specFor(r: any) {
  let spec = r.options
    ? r.label.startsWith("shop/") ? shopPlanSpec(r.label, r.options, r.payload)
      : r.label.startsWith("map/route-") ? routePlanSpec(r.label, r.payload)
        : r.label === "event/plan" ? freeSpec(r.label, { type: "object" })
          : pickSpec(r.label, r.options, r.payload)
    : freeSpec(r.label, { type: "object" });
  if (carriesRunPlan(r.payload)) spec = withRunPlanField(spec, r.payload);
  return withDirectionRideField(spec, r.payload);
}

function prepare() {
  mkdirSync(evidence, { recursive: true });
  if (existsSync(join(evidence, "fixtures.jsonl"))) throw Error("Frozen fixture already exists");
  const candidates = json(join(local, "candidates.json"));
  const strata: [string, number, (r: any) => boolean][] = [
    ["reward", 8, r => r.label === "reward/card"],
    ["event", 4, r => r.label === "event/choose" || r.label === "event/plan"],
    ["rest", 4, r => r.label === "rest/plan"],
    ["shop", 4, r => r.label === "shop/plan"],
    ["route", 4, r => r.label.startsWith("map/route-")],
    ["act-plan", 4, r => r.label === "event/act-plan"],
    ["selection", 4, r => r.label.startsWith("selection/")],
  ];
  const manifest: any[] = [];
  for (const [stratum, n, match] of strata) {
    const pool = candidates.rows.filter((r: any) => match(r) && r.system_sha === sha(system).slice(0, 12) && r.accepted);
    // Even quantiles of the most recent 4*n candidates avoid picking only one adjacent room.
    const recent = pool.slice(-4 * n);
    if (recent.length < n) throw Error(`Insufficient ${stratum}`);
    for (let i = 0; i < n; i++) {
      const r = recent[Math.floor((i + .5) * recent.length / n)];
      const id = `q${String(manifest.length + 1).padStart(2, "0")}`;
      const request = { label: r.label, system, question: r.question, options: r.options, memory: r.memory, payload: r.payload };
      const user = userMessage({ ...request, spec: specFor(request) });
      line(join(evidence, "fixtures.jsonl"), { id, stratum, request });
      manifest.push({ id, stratum, label: r.label, source_ts: r.ts, run_id: r.run_id, question_id: r.question_id,
        source_byte_offset: r._offset, system_sha256: sha(system), user_sha256: sha(user), user_chars: user.length,
        historic_engine: r.engine, historic_model: r.model, historic_effort: r.effort, historic_latency_ms: r.latency_ms,
        historic_answer: r.answer, historic_usage: r.usage });
    }
  }
  writeFileSync(join(evidence, "sample.json"), JSON.stringify({ source: "logs/brain.jsonl", source_frozen_bytes: candidates.source_bytes,
    method: "Latest 4*n accepted Silent A10 candidates per stratum, evenly spaced midpoint quantiles; fixed before dispatch", samples: manifest }, null, 2));
  console.log(JSON.stringify({ prepared: manifest.length, system_matches_history: true }));
}

async function run() {
  mkdirSync(local, { recursive: true });
  const home = join(local, "codex-home");
  mkdirSync(home, { recursive: true, mode: 0o700 });
  if (!existsSync(join(home, "auth.json"))) {
    if (!process.env.CODEX_HOME) throw Error("Explicit developer CODEX_HOME required");
    copyFileSync(join(process.env.CODEX_HOME, "auth.json"), join(home, "auth.json"));
    chmodSync(join(home, "auth.json"), 0o600);
  }
  const wrapper = join(local, "codex-budget");
  writeFileSync(wrapper, `#!/usr/bin/python3
import os,sys,json,datetime
from pathlib import Path
p=Path(__file__).resolve().parent
if len(sys.argv)>1 and sys.argv[1]=='exec':
 claims=list(p.glob('claim-*.json'))
 if len(claims)>=100: raise SystemExit('Persistent Codex 100-call budget exhausted')
 with (p/f'claim-{len(claims)+1}.json').open('x') as f:
  json.dump({'ts':datetime.datetime.now(datetime.timezone.utc).isoformat(),'argv':sys.argv[1:]},f);f.flush();os.fsync(f.fileno())
os.execv('/home/dw/.local/node/bin/codex',['codex',*sys.argv[1:]])
`, { mode: 0o700 });
  const config = loadConfig({ CHARACTER: "silent", BRAIN_CODEX_BIN: wrapper, BRAIN_CODEX_HOME: home,
    BRAIN_CODEX_MODEL: "gpt-6.1-sol", BRAIN_CODEX_EFFORT: "xhigh", BRAIN_CODEX_TOOLS: "off", BRAIN_CODEX_MODE: "exec",
    BRAIN_CODEX_SCHEMA_FIELDS: "used", BRAIN_CODEX_STALL_RETRIES: "1", BRAIN_CODEX_USAGE_REQUIRED: "on",
    BRAIN_CODEX_USAGE_STOP_PCT: "80", BRAIN_CODEX_TIMEOUT_MS: "600000" });
  const check = await checkCodex(config.brain.codex, "gpt-6.1-sol", "xhigh", { stateDir: join(local, "state") });
  if (!check.ok) throw Error(`Codex preflight refused: ${JSON.stringify(check)}`);
  const codex = new CodexEngine({ settings: config.brain.engines.codex, codex: config.brain.codex,
    stateDir: join(local, "state"), traceFile: join(evidence, "codex-calls.jsonl") });
  const integration = readFileSync("/home/dw/.config/nova-game-agents/environment.sh", "utf8");
  const gateway = integration.match(/^export DEEPSEEK_BASE_URL=["']?([^"'\s]+)["']?$/m)?.[1];
  if (!gateway || !gateway.startsWith("https://")) throw Error("Approved gateway configuration missing");
  const dsConfig = { apiKey: readFileSync("/home/dw/.config/nova-game-agents/api.key", "utf8").trim(),
    baseUrl: gateway, model: "deepseek/deepseek-flash", timeoutMs: 30000,
    reasoningEffort: "max", combatReasoningEffort: "high", systemPrompt: system };
  const ds = new DeepSeekEngine(new DeepSeekClient(dsConfig));
  const fixtures = readFileSync(join(evidence, "fixtures.jsonl"), "utf8").trim().split("\n").map(s => JSON.parse(s));
  const resultFile = join(evidence, "results.jsonl");
  const done = new Set(existsSync(resultFile) ? readFileSync(resultFile, "utf8").trim().split("\n").filter(Boolean).map(s => jsonKey(JSON.parse(s))) : []);
  const fetchOriginal = globalThis.fetch;
  let active = "";
  let physical: any[] = [];
  // Capture provider metadata, never request headers, credentials, or provider error bodies.
  globalThis.fetch = async (input, init) => {
    const start = Date.now();
    const record: any = { ts: new Date().toISOString(), key: active };
    physical.push(record);
    try {
      const body = JSON.parse(String(init?.body));
      record.model_requested = body.model; record.effort_requested = body.reasoning_effort;
      const response = await fetchOriginal(input, init);
      record.status = response.status;
      if (response.ok) {
        const raw = await response.clone().json() as any;
        record.model_returned = raw.model; record.id = raw.id; record.usage = raw.usage;
        record.content = raw.choices?.[0]?.message?.content;
        record.reasoning = raw.choices?.[0]?.message?.reasoning_content;
        record.finish_reason = raw.choices?.[0]?.finish_reason;
      }
      return response;
    } catch (error) { record.error_class = error instanceof Error ? error.name : "unknown"; throw error;
    } finally { record.elapsed_ms = Date.now() - start; line(join(evidence, "deepseek-calls.jsonl"), record); }
  };
  try {
    await codex.usage.start();
    for (let round = 1; round <= 2; round++) {
      for (let index = 0; index < fixtures.length; index++) {
        const fixture = fixtures[index];
        const groups = round === 1 ? ["A", "B", "C"] : ["B", "A"];
        // Rotate positions so one group is not always warm or always last.
        const rotation = index % groups.length;
        const order = [...groups.slice(rotation), ...groups.slice(0, rotation)];
        for (const group of order) {
          const key = `${fixture.id}/${round}/${group}`;
          if (done.has(key)) continue;
          active = key; physical = [];
          const req: BrainRequest = { ...fixture.request, spec: specFor(fixture.request), questionId: `issue29-${key}`,
            effort: group === "C" ? "high" : "xhigh" };
          const started = Date.now();
          const row: any = { id: fixture.id, stratum: fixture.stratum, round, group, label: req.label,
            ts: new Date().toISOString(), effort_requested: group === "B" ? questionEffort(req.label, req.payload as any, dsConfig) : req.effort };
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 600000);
          try {
            const answer = await (group === "B" ? ds : codex).decide(req, controller.signal);
            row.result = answer; row.validation_problems = req.spec.validate(answer.answer);
            row.accepted = row.validation_problems.length === 0;
          } catch (error) {
            row.accepted = false;
            // HTTP error bodies are intentionally omitted; status is captured separately.
            row.error = error instanceof Error ? redact(error.message).replace(/DeepSeek HTTP (\d+):[\s\S]*/, "DeepSeek HTTP $1") : "unknown";
          } finally { clearTimeout(timer); }
          row.elapsed_ms = Date.now() - started;
          row.provider_physical_calls = group === "B" ? physical.length : undefined;
          line(resultFile, row); done.add(key);
          console.log(JSON.stringify({ key, accepted: row.accepted, elapsed_ms: row.elapsed_ms, error: row.error }));
          if (row.error?.includes("budget exhausted") || row.error?.includes("usage")) throw Error("Stopped at call/usage boundary; preserve evidence");
          if (process.env.ISSUE29_ONE === "1") return;
        }
      }
    }
  } finally { globalThis.fetch = fetchOriginal; await codex.close(); }
}
function jsonKey(r: any) { return `${r.id}/${r.round}/${r.group}`; }
function validateRaw() {
  const fixtures = readFileSync(join(evidence, "fixtures.jsonl"), "utf8").trim().split("\n").map(s => JSON.parse(s));
  const results = readFileSync(join(evidence, "results.jsonl"), "utf8").trim().split("\n").map(s => JSON.parse(s));
  const calls = readFileSync(join(evidence, "deepseek-calls.jsonl"), "utf8").trim().split("\n").map(s => JSON.parse(s));
  const validation = results.map(r => {
    const key = jsonKey(r);
    const req = fixtures.find(f => f.id === r.id).request;
    const raw = r.group === "B" ? calls.find(c => c.key === key)?.content : r.result?.raw;
    let problems: string[];
    try { problems = specFor(req).validate(JSON.parse(raw)); }
    catch { problems = ["First reply missing or not a strict JSON object"]; }
    return { key, first_raw_valid: problems.length === 0, problems };
  });
  writeFileSync(join(evidence, "raw-validation.json"), JSON.stringify({ records: validation }, null, 2) + "\n");
  console.log(JSON.stringify({ raw_validations: validation.length }));
}
if (process.argv[2] === "prepare") prepare();
else if (process.argv[2] === "run") await run();
else if (process.argv[2] === "validate") validateRaw();
else throw Error("Use prepare, run or validate");
