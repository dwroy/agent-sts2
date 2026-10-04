/**
 * Offline learner launcher entry point (the code is in learner/lib/launcher.ts; README in learner/README.md).
 *
 *   agent/node_modules/.bin/tsx learner/run.ts --engine claude --task postmortem --set runs=A,B,C --cwd <worktree>
 *     [--model opus] [--dry-run] [--max-turns N] [--timeout-min N] [--with-tools]
 */
import { main } from "./lib/launcher.js";

process.exitCode = await main(process.argv.slice(2));
