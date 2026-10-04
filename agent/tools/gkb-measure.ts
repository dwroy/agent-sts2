/**
 * Measures the V4 knowledge prefix on DeepSeek (docs/v4-architecture.md §3): renders it, sends it as the system
 * prompt with a one-line user message and a tiny max_tokens, and reports the exact prompt tokens, the cache hit
 * and miss tokens and the latency of each call (the second identical call shows the prefix cache). An API error
 * (e.g. over the context limit) is reported with its message, the key scrubbed. The key is read the way
 * src/core/config.ts reads it (DEEPSEEK_API_KEY or DEEPSEEK_API_KEY_FILE) from the given .env, and is never printed
 * or written.
 *
 *   npx tsx tools/gkb-measure.ts --env ../jev-sts2-v3/.env [--ascension 9] [--calls 2]
 */

import { readFileSync } from "node:fs";

import { loadConfig } from "../src/core/config.js";
import { DEFAULT_KNOWLEDGE_DIR } from "../src/knowledge/render/data.js";
import { renderKnowledgeSections } from "../src/knowledge/render/knowledge-prefix.js";

const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const envFile = option("env") ?? ".env";
const ascension = Number(option("ascension") ?? 9);
const calls = Math.max(1, Number(option("calls") ?? 2));

const env: NodeJS.ProcessEnv = { ...process.env };
for (const line of readFileSync(envFile, "utf8").split("\n")) {
  const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (match && !(match[1]! in env)) env[match[1]!] = match[2]!.replace(/^(['"])(.*)\1$/, "$2");
}
const config = loadConfig(env);
if (!config.deepseek) {
  process.stderr.write(`no DeepSeek key configured in ${envFile}\n`);
  process.exit(1);
}
const { apiKey, baseUrl, model } = config.deepseek;
const scrub = (text: string): string => text.split(apiKey).join("***").replace(/sk-[A-Za-z0-9]{8,}/g, "sk-***");

const sections = renderKnowledgeSections({ ascension, knowledgeDir: DEFAULT_KNOWLEDGE_DIR });
const prefix = sections.map((section) => section.text).join("\n\n");
const report: Record<string, unknown> = {
  ascension,
  model,
  prefix_chars: prefix.length,
  blocks: Object.fromEntries(sections.map((section) => [section.key, section.text.length])),
  calls: [] as unknown[],
};

for (let i = 0; i < calls; i += 1) {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        thinking: { type: "disabled" },
        temperature: 0,
        max_tokens: 5,
        messages: [
          { role: "system", content: prefix },
          { role: "user", content: "只回答 OK。" },
        ],
      }),
    });
    const latencyMs = Date.now() - started;
    const body = await response.text();
    if (!response.ok) {
      (report["calls"] as unknown[]).push({ call: i + 1, status: response.status, latencyMs, error: scrub(body.slice(0, 1000)) });
      continue;
    }
    const payload = JSON.parse(body) as { usage?: Record<string, unknown>; choices?: { message?: { content?: string } }[] };
    (report["calls"] as unknown[]).push({ call: i + 1, status: response.status, latencyMs, usage: payload.usage ?? null, answer: payload.choices?.[0]?.message?.content ?? "" });
  } catch (error) {
    (report["calls"] as unknown[]).push({ call: i + 1, latencyMs: Date.now() - started, error: scrub((error as Error).message) });
  }
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
