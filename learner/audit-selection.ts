/** Offline, frozen single-run JSON only; usage: tsx learner/audit-selection.ts input.json > audit.json. */
import { readFileSync } from "node:fs";
import { auditSelectionExecution } from "./lib/selection-execution.js";

const args = process.argv.slice(2);
if (args.length !== 1) throw new Error("用法：tsx learner/audit-selection.ts <冻结单局 JSON>");
process.stdout.write(JSON.stringify(auditSelectionExecution(JSON.parse(readFileSync(args[0]!, "utf8"))), null, 2) + "\n");
