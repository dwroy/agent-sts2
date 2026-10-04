/**
 * Post-mortems not yet folded into a character's experience base (learner/lib/runs.ts pendingRuns; per character,
 * otherwise as ops/experience-pending.py): the count, then the ids comma-separated, oldest first.
 *
 *   agent/node_modules/.bin/tsx learner/pending.ts [--character silent] [--max 10]
 *
 * The character: --character, else CHARACTER, else ironclad. Folded = cited in <live>/knowledge/characters/<id>/
 * experience.json (live = STS2_LIVE, else <workspace>/.worktrees/live) or named in the experience changelog.
 */
import { join } from "node:path";

import { PROJECT_ROOT, resolveCharacter } from "./lib/launcher.js";
import { pendingRuns } from "./lib/runs.js";
import { characterKey } from "../agent/src/knowledge/files.js";

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
};
const rawCharacter = flag("--character");
const character = resolveCharacter(rawCharacter !== undefined ? { character: characterKey(rawCharacter) ?? rawCharacter } : {}, process.env);
const max = flag("--max");
const pending = pendingRuns({
  lessonsFile: join(PROJECT_ROOT, "notes", "lessons.md"),
  runsFile: join(PROJECT_ROOT, "logs", "runs.jsonl"),
  liveDir: process.env["STS2_LIVE"] ?? join(PROJECT_ROOT, ".worktrees", "live"),
  changelogFile: join(PROJECT_ROOT, "paper", "materials", "experience-changelog.md"),
  character,
});
process.stdout.write(`${pending.length}\n${(Number(max) ? pending.slice(0, Number(max)) : pending).join(",")}\n`);
