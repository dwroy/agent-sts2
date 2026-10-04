import { loadConfig } from "../src/core/config.js";
import { DeepSeekClient } from "../src/brain/llm/deepseek.js";
const env = { ...process.env };
for (const line of (await import("node:fs")).readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !(m[1]! in env)) env[m[1]!] = m[2]!;
}
const config = loadConfig(env as NodeJS.ProcessEnv);
if (!config.deepseek) throw new Error("no deepseek config");
const ds = new DeepSeekClient(config.deepseek);
const r = await ds.choose({ hp: "10/80", enemy: "Byrdonis 10 HP, Vulnerable, attacks for 24" }, "Which plan should I play this turn?", {
  plan1: JSON.stringify({ plays: "Defend, Defend, Strike", result: "I DIE at the end of the turn" }),
  plan2: JSON.stringify({ plays: "Strike, Strike", result: "wins the fight this turn" }),
});
console.log(r.choice, "|", r.reason, "|", r.latencyMs, "ms |", r.inputTokens, "+", r.outputTokens, "tokens");
