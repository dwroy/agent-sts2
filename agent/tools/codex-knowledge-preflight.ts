/** Installed Codex against a local rejecting Responses fixture: captures its tool surface, never runs inference. */
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { gunzipSync, brotliDecompressSync, zstdDecompressSync } from "node:zlib";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, DEFAULT_CODEX_MODEL } from "../src/core/config.js";
import { PROJECT_ROOT } from "../src/core/paths.js";
import { CODEX_DISABLED_FEATURES, catalogEntry, brainCatalogEntry, codexEnv, sessionArgs } from "../src/brain/engines/codex.js";
import { CodexSession } from "../src/brain/engines/codex-session.js";
import { KnowledgeMcp } from "../src/brain/tools/knowledge-mcp.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";

const root = join(PROJECT_ROOT, "data/brain-agent/preflight"); mkdirSync(root, { recursive: true });
const dir = mkdtempSync(join(root, "codex-offline-"));
const home = join(dir, "home"); mkdirSync(home);
const config = loadConfig({ BRAIN_CODEX_HOME: home, BRAIN_CODEX_EFFORT: "high", BRAIN_LOG: "off" });
const env = codexEnv(config.brain.codex.bin, home), mcp = new KnowledgeMcp();
let tools: string[] | null = null;
const requests: unknown[] = [];
const api = createServer(async (req, res) => {
  requests.push({ method: req.method, path: req.url, encoding: req.headers["content-encoding"] ?? null });
  if (req.method === "GET" && req.url?.includes("models")) { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ object: "list", data: [{ id: DEFAULT_CODEX_MODEL, object: "model", owned_by: "fixture" }] })); return; }
  const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
  let raw = Buffer.concat(chunks);
  const encoding = req.headers["content-encoding"];
  if (encoding === "gzip") raw = gunzipSync(raw);
  if (encoding === "br") raw = brotliDecompressSync(raw);
  if (encoding === "zstd") raw = zstdDecompressSync(raw);
  try {
    const body = JSON.parse(raw.toString("utf8"));
    const wire = body.tools ?? body.input?.flatMap((i: Record<string, any>) => i.type === "additional_tools" ? i.tools ?? [] : []) ?? [];
    const names = (rows: Record<string, any>[]): string[] => rows.flatMap(t => t.type === "namespace" ? names(t.tools) : [t.name ?? t.function?.name ?? t.type]);
    tools = names(wire);
  }
  catch (error) { requests.push({ parse_error: String(error) }); }
  // A terminal 400 deliberately stops the turn before any inference or tool selection.
  res.writeHead(400, { "content-type": "application/json" }); res.end('{"error":{"message":"fixed offline fixture: inference forbidden","type":"invalid_request_error"}}');
});
let session: CodexSession | null = null;
try {
  const ctx = { ascension: 0, knowledgeDir: join(dir, "empty"), logsDir: "" };
  const defs = buildKnowledgeTools(ctx); mcp.begin(defs, ctx, 8, Infinity, () => {});
  const url = await mcp.start();
  await new Promise<void>(resolve => api.listen(0, "127.0.0.1", resolve));
  const port = (api.address() as { port: number }).port;
  const catalog = catalogEntry(execFileSync(config.brain.codex.bin, ["debug", "models", "-c", `sqlite_home=${JSON.stringify(dir)}`, ...CODEX_DISABLED_FEATURES.flatMap(f => ["--disable", f])], { cwd: dir, env, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 15_000 }), DEFAULT_CODEX_MODEL);
  if (!catalog) throw new Error("offline model catalog lacks the requested model");
  const catalogFile = join(dir, "catalog.json"); writeFileSync(catalogFile, JSON.stringify({ models: [brainCatalogEntry(catalog)] }));
  const args = [...sessionArgs({ catalogFile, stateDir: dir, effort: "high", summary: "auto", serviceTier: null }),
    "-c", 'model_provider="sts2_offline"', "-c", `model_providers.sts2_offline={ name="Offline fixture", base_url="http://127.0.0.1:${port}/v1", wire_api="responses", requires_openai_auth=false, request_max_retries=0, stream_max_retries=0 }`];
  session = new CodexSession({ bin: config.brain.codex.bin, home, args, env, ...(process.argv.includes("--no-tools") ? {} : { knowledgeMcpUrl: url }), stateDir: dir, model: DEFAULT_CODEX_MODEL, serviceTier: null,
    timeouts: { start: 10_000, thread: 15_000, turn: 10_000, control: 2_000 } });
  await session.ensureThread("Fixed offline system; inference forbidden.", () => []);
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 15_000);
  try { const turn = await session.ask({ prompt: "fixed", schema: { type: "object", properties: {} }, effort: "high", summary: "auto", model: DEFAULT_CODEX_MODEL, signal: abort.signal, firstTokenMs: null, stallMs: null }); if (!tools) process.stdout.write(JSON.stringify({ status: turn.status, error: turn.error, errors: turn.errors, requests }) + "\n"); }
  finally { clearTimeout(timer); }
  const names = tools as string[] | null;
  const expected = process.argv.includes("--no-tools") ? [] : defs.map(t => t.name).sort();
  process.stdout.write(JSON.stringify({ offline: true, inference: false, tools: names, expected, only_knowledge: names !== null && JSON.stringify([...names].sort()) === JSON.stringify(expected) }) + "\n");
  if (!names || JSON.stringify([...names].sort()) !== JSON.stringify(expected)) process.exitCode = 1;
} finally {
  await session?.close(); await mcp.close(); api.closeAllConnections(); await new Promise<void>(resolve => api.close(() => resolve()));
  rmSync(dir, { recursive: true, force: true });
}
