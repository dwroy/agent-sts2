/**
 * Prints the V4 knowledge prefix (or one of its blocks), or one knowledge tool's result, and the size of every
 * block (docs/v4-architecture.md §3). Read-only.
 *
 *   npx tsx tools/gkb-dump.ts [--ascension 9] [--act 2] [--section monsters] [--sizes-only]
 *   npx tsx tools/gkb-dump.ts --tool kb_monster '{"id":"KIN_PRIEST"}'
 *
 * --section takes a block key or its prefix ("experience" = every experience.* block). The text goes to
 * stdout; the block sizes (characters) go to stderr. --knowledge-dir / --logs-dir default to this checkout's
 * knowledge and logs; the post-mortems come from KNOWLEDGE_LESSONS_FILE (default ../notes/lessons.md).
 */

import { DEFAULT_KNOWLEDGE_DIR, DEFAULT_LOGS_DIR } from "../src/knowledge/render/data.js";
import { renderKnowledgeSections } from "../src/knowledge/render/knowledge-prefix.js";
import { buildTools } from "../src/tools/registry.js";
import type { ToolContext } from "../src/tools/types.js";

function usage(message: string): never {
  process.stderr.write(`${message}\nusage: npx tsx tools/gkb-dump.ts [--ascension N] [--act N] [--knowledge-dir D] [--logs-dir D] [--section KEY] [--sizes-only] [--tool NAME 'JSON']\n`);
  process.exit(1);
}

const args = process.argv.slice(2);
const options: Record<string, string | true> = {};
const positional: string[] = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i]!;
  if (arg === "--sizes-only") options["sizes-only"] = true;
  else if (arg.startsWith("--")) {
    const value = args[i + 1];
    if (value === undefined) usage(`${arg} needs a value`);
    options[arg.slice(2)] = value;
    i += 1;
  } else positional.push(arg);
}

const intOption = (name: string): number | undefined => {
  const raw = options[name];
  if (raw === undefined) return undefined;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) usage(`--${name} expects a whole number`);
  return Number(raw);
};

const act = intOption("act");
const ctx: ToolContext = {
  ascension: intOption("ascension") ?? Number(process.env["TARGET_ASCENSION"] ?? 9),
  ...(act !== undefined ? { act } : {}),
  knowledgeDir: typeof options["knowledge-dir"] === "string" ? options["knowledge-dir"] : DEFAULT_KNOWLEDGE_DIR,
  logsDir: typeof options["logs-dir"] === "string" ? options["logs-dir"] : DEFAULT_LOGS_DIR,
};

if (typeof options["tool"] === "string") {
  const tools = buildTools(ctx);
  const found = tools.find((item) => item.name === options["tool"]);
  if (!found) usage(`unknown tool ${options["tool"]}; tools: ${tools.map((item) => item.name).join(", ")}`);
  let input: Record<string, unknown> = {};
  if (positional[0] !== undefined) {
    try {
      input = JSON.parse(positional[0]) as Record<string, unknown>;
    } catch (error) {
      usage(`tool input is not JSON: ${(error as Error).message}`);
    }
  }
  const result = await found.run(input, ctx);
  process.stdout.write(`${result.text}\n`);
  process.stderr.write(`\n${found.name}: ${result.text.length} chars${result.isError ? " [isError]" : ""}\n`);
  process.exit(result.isError ? 2 : 0);
}

const sections = renderKnowledgeSections(ctx);
const wanted = typeof options["section"] === "string" ? options["section"] : null;
const chosen = wanted ? sections.filter((section) => section.key === wanted || section.key.startsWith(`${wanted}.`)) : sections;
if (chosen.length === 0) usage(`unknown section ${wanted}; sections: ${sections.map((section) => section.key).join(", ")}`);
if (!options["sizes-only"]) process.stdout.write(`${chosen.map((section) => section.text).join("\n\n")}\n`);
const width = Math.max(...sections.map((section) => section.key.length));
const lines = chosen.map((section) => `${section.key.padEnd(width)}  ${String(section.text.length).padStart(7)}`);
const total = chosen.reduce((sum, section) => sum + section.text.length, 0) + 2 * (chosen.length - 1);
process.stderr.write(`\nA${ctx.ascension} knowledge prefix blocks (chars):\n${lines.join("\n")}\n${"total".padEnd(width)}  ${String(total).padStart(7)}\n`);
