/** Boot the installed dsh kernel with a fixed MCP fixture and NO model request. No raw config/diagnostics escape. */
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/core/config.js";
import { dshEntryIds, dshPatch, dshEnv, DSH_MODEL } from "../src/brain/engines/dsh.js";
import { KnowledgeMcp } from "../src/brain/tools/knowledge-mcp.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { PROJECT_ROOT } from "../src/core/paths.js";

const config = loadConfig({ BRAIN_LOG: "off" });
const root = join(PROJECT_ROOT, "data/brain-agent/preflight"); mkdirSync(root, { recursive: true });
const dir = mkdtempSync(join(root, "offline-")), mcp = new KnowledgeMcp();
try {
  const ctx = { ascension: 0, knowledgeDir: join(dir, "empty"), logsDir: "" };
  const defs = buildKnowledgeTools(ctx);
  mcp.begin(defs, ctx, 1, Infinity, () => {});
  const url = await mcp.start();
  const ids = dshEntryIds(execFileSync(config.brain.dsh.bin, ["headless", "--dump-config"], { cwd: dir, env: dshEnv(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 15_000 }));
  const patch = dshPatch(ids, "Fixed offline system. No model request is authorized.", DSH_MODEL, "max", join(dir, "sessions"), url);
  const rows = patch.at(-1)!["insert"] as Record<string, unknown>[];
  // Replace the one-shot runner with an inspector, so no user message can enter the agent loop.
  rows.splice(rows.findIndex(r => r["id"] === "sts2-runner"), 1, { id: "sts2-inspector", name: fileURLToPath(new URL("./dsh-knowledge-inspect.mjs", import.meta.url)) });
  const path = join(dir, "offline.patch.json"); writeFileSync(path, JSON.stringify(patch));
  const result = await new Promise<{ code: number | null; stdout: string }>((resolve, reject) => {
    const child = spawn(config.brain.dsh.bin, ["headless", "--patch", path, "--json", "-"], { cwd: dir, env: dshEnv(), stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), 20_000);
    child.stdout.on("data", b => { stdout += b.toString(); });
    child.stderr.on("data", () => undefined);
    child.on("error", reject); child.on("close", code => { clearTimeout(timer); resolve({ code, stdout }); });
  });
  const row = result.stdout.split("\n").flatMap(line => { try { const r = JSON.parse(line); return r.offline ? [r] : []; } catch { return []; } }).at(-1);
  if (result.code !== 0 || !row?.kernel_ready || JSON.stringify([...row.tools].sort()) !== JSON.stringify(defs.map(t => `mcp__gkb__${t.name}`).sort()) || row.model.reasoningEffort !== "max") throw new Error("offline dsh kernel verification failed");
  process.stdout.write(`${JSON.stringify(row)}\n`);
} finally { await mcp.close(); rmSync(dir, { recursive: true, force: true }); }
