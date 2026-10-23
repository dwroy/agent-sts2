/** Local read-only audit; never starts a learner or writes its original receipt. */
import { reconciliationMain } from "./lib/tui-reconciliation.js";

process.exitCode = reconciliationMain(process.argv.slice(2));
