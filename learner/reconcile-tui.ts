/** Local read-only audit; never starts a learner or writes its original receipt. */
import { reconciliationMain, watchReconciliationMain } from "./lib/tui-reconciliation.js";

const args = process.argv.slice(2);
process.exitCode = args.includes("--watch-state") ? await watchReconciliationMain(args) : reconciliationMain(args);
