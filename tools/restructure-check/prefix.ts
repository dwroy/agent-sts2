/**
 * Restructure check: what the brain is sent besides the question, for the same code before and after files move.
 *
 * - The full-knowledge system prompt (KNOWLEDGE_PREFIX=full) at A8 and A9 through the brain's own KnowledgePrompt and its
 *   knowledge directory (brain.ts KNOWLEDGE_DIR): prefix_sha and size as the brain logs them, the whole system's sha256,
 *   and each prefix block's (renderKnowledgeSections) so a difference can be located. The data facts are filled fresh
 *   (the brain freezes them for the day: the same text, cached), the post-mortems come from --lessons.
 * - v3's system prompt (KNOWLEDGE_PREFIX=off): a DeepSeekClient built from the config's defaults (the guide and handbook
 *   paths), its facts filled fresh (no snapshot is written).
 * - The brain's tools: every definition (name, description, input schema) and the kb_* tools' answers on fixed inputs.
 *
 *   npx tsx tools/restructure-check/prefix.ts --lessons <notes/lessons.md copy> --out P.json [--root <dir with logs/>]
 */
import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { KNOWLEDGE_DIR } from "../../src/brain/brain.js";
import { KnowledgePrompt } from "../../src/brain/knowledge.js";
import { loadConfig } from "../../src/config.js";
import { DEFAULT_KNOWLEDGE_DIR, loadPostmortems } from "../../src/knowledge/render/data.js";
import { renderKnowledgeSections } from "../../src/knowledge/render/knowledge-prefix.js";
import { DeepSeekClient, SYSTEM } from "../../src/llm/deepseek.js";
import { buildTools } from "../../src/tools/registry.js";
import type { JsonSchema, ToolContext } from "../../src/tools/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

function findRoot(): string {
  let dir = HERE;
  for (;;) {
    if (existsSync(join(dir, "logs", "states.jsonl"))) return dir;
    const up = dirname(dir);
    if (up === dir) throw new Error("no logs/ above this script: pass --root");
    dir = up;
  }
}

const sha = (text: string, n = 32): string => createHash("sha256").update(text).digest("hex").slice(0, n);
const lessons = resolve(arg("lessons", ""));
if (!existsSync(lessons)) throw new Error("--lessons <file> is required (a fixed copy of notes/lessons.md)");
process.env["KNOWLEDGE_LESSONS_FILE"] = lessons;
const root = resolve(arg("root", "") || findRoot());
const config = loadConfig({ DEEPSEEK_API_KEY: "placeholder-not-a-key" } as NodeJS.ProcessEnv);
const out: Record<string, unknown> = { same_knowledge_dir: resolve(KNOWLEDGE_DIR) === resolve(DEFAULT_KNOWLEDGE_DIR), system_rules_sha: sha(SYSTEM) };

for (const ascension of [8, 9]) {
  const prompt = new KnowledgePrompt({ mechanics: config.mechRules, moveRules: config.mechMoveRules });
  const { system, note } = prompt.system({ ascension, knowledgeDir: KNOWLEDGE_DIR });
  const sections = renderKnowledgeSections({ ascension, knowledgeDir: KNOWLEDGE_DIR, mechanics: config.mechRules, moveRules: config.mechMoveRules }, loadPostmortems(lessons));
  out[`A${ascension}`] = { note, system_sha: sha(system), system_bytes: Buffer.byteLength(system), sections: Object.fromEntries(sections.map((section) => [section.key, `${sha(section.text, 16)} ${section.text.length}`])) };
}

const deepseek = new DeepSeekClient({ ...config.deepseek!, factsSnapshotDir: "" });
out["v3_system"] = { sha: sha(deepseek.systemPrompt), bytes: Buffer.byteLength(deepseek.systemPrompt), guide_id: deepseek.guideId };

const ctx: ToolContext = { ascension: 9, act: 2, knowledgeDir: KNOWLEDGE_DIR, logsDir: join(root, "logs") };
const tools = buildTools(ctx);
const toolOut: Record<string, string> = {};
for (const tool of tools) {
  toolOut[`def ${tool.name}`] = sha(JSON.stringify({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema }));
  if (!tool.name.startsWith("kb_") || tool.name === "kb_runs") continue;
  const inputs: Record<string, unknown>[] = [{}];
  const props = (tool.inputSchema.properties ?? {}) as Record<string, JsonSchema>;
  for (const [key, schema] of Object.entries(props)) for (const value of schema.enum ?? []) inputs.push({ [key]: value });
  if ("id" in props) inputs.push({ id: "QUEEN" }, { id: "KIN_PRIEST" });
  if ("query" in props) inputs.push({ query: "QUEEN" }, { query: "KIN_PRIEST" });
  for (const input of inputs) {
    let text: string;
    try {
      const result = await tool.run(input, ctx);
      text = `${result.isError ? "E " : ""}${result.text}`;
    } catch (error) {
      text = `threw ${error instanceof Error ? error.message : String(error)}`;
    }
    toolOut[`${tool.name} ${JSON.stringify(input)}`] = `${sha(text, 16)} ${text.length}`;
  }
}
out["tools"] = toolOut;
const all = sha(JSON.stringify(out));
writeFileSync(arg("out", "prefix.json"), `${JSON.stringify({ all, ...out }, null, 1)}\n`);
const a8 = out["A8"] as { note: { prefix_sha: string; prefix_chars: number }; system_bytes: number };
const a9 = out["A9"] as { note: { prefix_sha: string; prefix_chars: number }; system_bytes: number };
console.log(`all ${all}\nA8 prefix_sha ${a8.note.prefix_sha} chars ${a8.note.prefix_chars} system bytes ${a8.system_bytes}\nA9 prefix_sha ${a9.note.prefix_sha} chars ${a9.note.prefix_chars} system bytes ${a9.system_bytes}\nv3 system ${JSON.stringify(out["v3_system"])}\n${Object.keys(toolOut).length} tool digests`);
