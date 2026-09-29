// Probe: strict tool calling on the beta endpoint, thinking on, forced named tool. Prints no secrets.
import { readFileSync } from "node:fs";
const key = readFileSync(`${process.env.HOME}/.deepseek_api_key`, "utf8").trim();
const toolChoice = process.argv[2] ?? "named";
const tools = [{ type: "function", function: { name: "submit_choice", strict: true, description: "Submit your decision.",
  parameters: { type: "object", properties: { choice: { type: "string", enum: ["o0", "o1"] }, reason: { type: "string" } }, required: ["choice", "reason"], additionalProperties: false } } }];
const body = { model: "deepseek-flash", thinking: { type: "enabled" }, reasoning_effort: "high",
  messages: [{ role: "system", content: 'You advise a card-game bot. Reply with JSON only: {"choice": "<option key>", "reason": "<max 10 words>"}' },
             { role: "user", content: JSON.stringify({ question: "HP 20/80, boss next. Heal or upgrade?", options: { o0: "休息 (heal 24)", o1: "锻造 (upgrade a card)" } }) + "\n\nAnswer by calling the tool submit_choice." }],
  tools, ...(toolChoice === "named" ? { tool_choice: { type: "function", function: { name: "submit_choice" } } } : toolChoice === "none" ? {} : { tool_choice: toolChoice }) };
const t0 = Date.now();
const r = await fetch("https://api.deepseek.com/beta/chat/completions", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
const text = await r.text();
console.log("status", r.status, "ms", Date.now() - t0);
try { const j = JSON.parse(text); const m = j.choices?.[0]?.message ?? {};
  console.log(JSON.stringify({ finish: j.choices?.[0]?.finish_reason, content: m.content, reasoning_len: (m.reasoning_content ?? "").length, tool_calls: m.tool_calls, usage: j.usage }, null, 1));
} catch { console.log(text.slice(0, 500)); }
if (r.status !== 200) console.log("body:", text.slice(0, 600));
