// Probe arm C on a toy question: boots the harness with the plugin, prints attempts, usage and event types.
import { readFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { runArmC } from "../lib/arm-c.js";
import { buildSpec } from "../lib/spec.js";
const apiKey = readFileSync(`${homedir()}/.deepseek_api_key`, "utf8").trim();
const spec = buildSpec("pick", { o0: JSON.stringify({ option: "休息", kind: "HEAL" }), o1: JSON.stringify({ option: "锻造", kind: "SMITH" }) }, {});
const keep = new URL("../data/probe-c", import.meta.url).pathname;
mkdirSync(keep, { recursive: true });
const r = await runArmC({ apiKey, systemPrompt: 'You advise a card-game bot. Reply with JSON only: {"choice": "<option key>", "reason": "<max 10 words>"}', userMessage: JSON.stringify({ question: "HP 20/80, boss next. Heal or upgrade?", options: { o0: "休息 (heal 24)", o1: "锻造 (upgrade a card)" } }) + "\n\nAnswer by calling the tool submit_choice.", spec, effort: process.argv[2] ?? "high", maxRetries: 2, timeoutMs: 120000, keepDir: keep });
console.log(JSON.stringify({ ...r, attempts: r.attempts }, null, 1).slice(0, 4000));
