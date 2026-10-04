/**
 * For the replay tools that load another checkout's code to compare it with this one (template-target-replay,
 * route-chain-replay): a module named by its path in src/ before the module split (screens/combat-plan.ts) is found in
 * either layout. A src/ with core/paths.ts is the split layout (docs/layout.md): the name goes through
 * docs/path-map.tsv; any other src/ is the old one, where the name is the path.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { fromRoot } from "../src/core/paths.js";

let moved: Map<string, string> | null = null;

/** Old src-relative path -> new src-relative path, from docs/path-map.tsv (src/x -> agent/src/y). */
function movedModules(): Map<string, string> {
  if (moved) return moved;
  moved = new Map();
  for (const line of readFileSync(fromRoot("docs/path-map.tsv"), "utf8").split("\n")) {
    if (line.startsWith("#")) continue;
    const [old, now] = line.split("\t");
    if (old?.startsWith("src/") && now?.startsWith("agent/src/")) moved.set(old.slice("src/".length), now.slice("agent/src/".length));
  }
  return moved;
}

/** The file of `oldRel` (a path in src/ before the split) inside the checkout's `srcDir`. */
export function srcModule(srcDir: string, oldRel: string): string {
  if (!existsSync(join(srcDir, "core", "paths.ts"))) return join(srcDir, oldRel);
  return join(srcDir, movedModules().get(oldRel) ?? oldRel);
}
