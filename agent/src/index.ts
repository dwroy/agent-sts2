#!/usr/bin/env node
/**
 * The CLI entry (`npx tsx src/index.ts play`, the npm scripts): the wiring is in core/index.ts, which runs the command
 * named in process.argv when it loads.
 */
import "./core/index.js";
