import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { workerData } from "node:worker_threads";

import { fixedKnowledgeFs } from "./compute-memo-files.js";

// Install the same file view before importing the production worker and its loaders.
const { knowledgeRoot, fixture, fixtureReads, entry } = workerData;
const fixed = fixedKnowledgeFs({ ...fs }, knowledgeRoot, fixture, new Int32Array(fixtureReads));
fs.readFileSync = fixed.readFileSync;
fs.existsSync = fixed.existsSync;
fs.readdirSync = fixed.readdirSync;
syncBuiltinESMExports();
await import(entry);
