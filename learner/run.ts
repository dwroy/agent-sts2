/**
 * Offline learner launcher entry point (the code is in src/learner/launcher.ts; README in learner/README.md).
 *
 *   npx tsx learner/run.ts --engine claude --task postmortem --set runs=A,B,C --cwd <worktree>
 *     [--model opus] [--dry-run] [--max-turns N] [--timeout-min N] [--with-tools]
 */
import { main } from "../agent/src/learner/launcher.js";

process.exitCode = await main(process.argv.slice(2));
