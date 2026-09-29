// Probe: the same toy question straight to DeepSeek's Anthropic-format endpoint (what dsh uses), to split
// harness overhead from endpoint latency. stream=true like dsh; prints time to first byte / first event / end.
import { readFileSync } from "node:fs";
const key = readFileSync(`${process.env.HOME}/.deepseek_api_key`, "utf8").trim();
const body = {
  model: "deepseek-flash", max_tokens: Number(process.env.MAXTOK ?? 4096), stream: true, output_config: { effort: "high" }, ...(process.env.THINK ? { thinking: { type: "enabled" } } : {}),
  system: 'You advise a card-game bot. Reply with JSON only: {"choice": "<option key>", "reason": "<max 10 words>"}',
  messages: [{ role: "user", content: JSON.stringify({ question: "HP 20/80, boss next. Heal or upgrade?", options: { o0: "休息 (heal 24)", o1: "锻造 (upgrade a card)" } }) + "\n\nAnswer by calling the tool submit_choice." }],
  tools: [{ name: "submit_choice", description: "Submit your decision.", input_schema: { type: "object", properties: { choice: { type: "string", enum: ["o0", "o1"] }, reason: { type: "string" } }, required: ["choice", "reason"], additionalProperties: false } }],
};
const t0 = Date.now();
const r = await fetch("https://api.deepseek.com/anthropic/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", ...(process.env.SSE ? { accept: "text/event-stream" } : {}), ...(process.env.DSHHDR ? { "x-deepseek-harness-user-id": "00000000-0000-4000-8000-000000000000", "user-agent": "deepseek-harness/0.1.7-rc.2", "x-deepseek-harness-session-id": "session-00000000000000000000000000000001" } : {}) }, body: JSON.stringify(body) });
console.log("status", r.status, "headers at", Date.now() - t0, "ms");
const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = ""; const marks = [];
for (;;) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true });
  for (const m of buf.matchAll(/event: (\w+)/g)) { if (!marks.find((x) => x[0] === m[1])) marks.push([m[1], Date.now() - t0]); } }
console.log("first-seen events:", JSON.stringify(marks));
console.log("end", Date.now() - t0, "ms; usage:", (buf.match(/"usage":\{[^}]*\}/g) ?? []).slice(-1)[0]);
if (r.status !== 200) console.log(buf.slice(0, 400));
