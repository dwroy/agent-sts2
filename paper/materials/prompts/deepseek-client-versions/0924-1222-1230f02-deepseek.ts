/**
 * DeepSeek as the escalation path (phase 2): only for decisions a planner marks as escalatable, and
 * only when Jev's answer was a near-guess. It receives the *same* state and options Jev saw and must
 * answer with one option key, so its output goes through the same resolver and legality gate.
 *
 * OpenAI-compatible chat completions; key from DEEPSEEK_API_KEY. The key is never logged.
 */

import type { JsonValue } from "../util/json.js";

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export interface DeepSeekAnswer {
  choice: string;
  reason: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

const SYSTEM = [
  "You are an expert Slay the Spire 2 player advising a bot (Ironclad, climbing ascension levels).",
  "You get the game state and one question with a fixed set of option keys. Code has already computed",
  "every number shown (damage, block, HP after the enemy turn); trust those numbers.",
  "Think about winning the whole run, not just this screen. Be decisive.",
  'Reply with JSON only: {"choice": "<one option key exactly as given>", "reason": "<max 25 words>"}',
].join(" ");

export class DeepSeekClient {
  constructor(private readonly config: DeepSeekConfig) {}

  async choose(state: Record<string, JsonValue>, instructions: string, criteria: Record<string, string | null>): Promise<DeepSeekAnswer> {
    const started = Date.now();
    const user = JSON.stringify({ state, question: instructions, options: criteria });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.config.apiKey}` },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: user },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = (await response.text()).slice(0, 200);
        throw new Error(`DeepSeek HTTP ${response.status}: ${body}`);
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = payload.choices?.[0]?.message?.content ?? "";
      let parsed: { choice?: unknown; reason?: unknown };
      try {
        parsed = JSON.parse(content) as { choice?: unknown; reason?: unknown };
      } catch {
        throw new Error(`DeepSeek returned non-JSON: ${content.slice(0, 120)}`);
      }
      const choice = typeof parsed.choice === "string" ? parsed.choice.trim() : "";
      if (!(choice in criteria)) throw new Error(`DeepSeek chose unknown option "${choice}"`);
      return {
        choice,
        reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : "",
        latencyMs: Date.now() - started,
        inputTokens: payload.usage?.prompt_tokens ?? 0,
        outputTokens: payload.usage?.completion_tokens ?? 0,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
