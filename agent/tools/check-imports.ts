/**
 * Every relative module specifier in the project's TypeScript/JavaScript resolves to a file that exists (tsc checks
 * src/ and tests/ only; tools/, eval/ and learner/ run under tsx, which finds a broken path only when the line runs).
 * Covered: `from "…"`, `import "…"`, `import("…")`, `typeof import("…")`, `export … from "…"`,
 * `vi.mock/doMock/importActual("…")`, `require("…")`, `new URL("…", import.meta.url)`. A `.js` specifier may name the
 * `.ts` file (NodeNext style). Specifiers built at run time are not checked.
 *
 *   npx tsx tools/check-imports.ts        lists the unresolved ones; exit 1 when there are any
 *
 * The scanned trees: agent/src, agent/tests, agent/tools, learner/, eval/ (experiments/ holds one-off scripts as they
 * were run, not checked).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PROJECT_ROOT } from "../src/core/paths.js";

export const SCANNED = ["agent/src", "agent/tests", "agent/tools", "learner", "eval"];
const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\bvi\.(?:mock|doMock|importActual|unmock)\s*\(\s*|\brequire\s*\(\s*|\bnew\s+URL\s*\(\s*)(["'`])(\.{1,2}\/[^"'`$]*)\1/g;
const CODE = /\.(ts|mts|mjs|js|cjs)$/;

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : CODE.test(name) ? [path] : [];
  });
}

function resolves(from: string, spec: string): boolean {
  const target = resolve(dirname(from), spec);
  const candidates = spec.endsWith(".js") ? [target.slice(0, -3) + ".ts", target.slice(0, -3) + ".mts", target] : spec.endsWith(".mjs") ? [target, target.slice(0, -4) + ".mts"] : [target];
  return candidates.some((path) => existsSync(path));
}

/** The unresolved specifiers under `root`, as "file: specifier". */
export function unresolvedImports(root: string = PROJECT_ROOT): string[] {
  const out: string[] = [];
  for (const tree of SCANNED) {
    for (const file of files(join(root, tree))) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(SPEC)) {
        const spec = match[2]!;
        if (!resolves(file, spec)) out.push(`${relative(root, file)}: ${spec}`);
      }
    }
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bad = unresolvedImports();
  for (const line of bad) console.log(line);
  console.log(bad.length === 0 ? "every relative import resolves" : `${bad.length} unresolved`);
  process.exitCode = bad.length === 0 ? 0 : 1;
}
