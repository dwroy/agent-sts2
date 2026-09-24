/**
 * Escalation to the supervising Claude session through files (phase 2).
 *
 * The loop writes `<dir>/pending-<id>.json` (the same state and option keys Jev saw, plus Jev's answer)
 * and polls for `<dir>/answer-<id>.json` = {"choice": "<key>", "reason": "..."}. A watcher in the Claude
 * session surfaces new pending files; Claude answers by writing the answer file. If nothing arrives
 * before the timeout the caller moves on to the next escalator (DeepSeek), so the loop never hangs on
 * an absent supervisor.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { JsonValue } from "../util/json.js";

export interface EscalationAnswer {
  choice: string;
  reason: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

export interface Escalator {
  readonly name: "claude" | "deepseek";
  choose(
    state: Record<string, JsonValue>,
    instructions: string,
    criteria: Record<string, string | null>,
    context: Record<string, JsonValue>,
  ): Promise<EscalationAnswer>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class FileEscalator implements Escalator {
  readonly name = "claude" as const;
  private counter = 0;

  constructor(
    private readonly dir: string,
    private readonly timeoutMs: number,
    private readonly pollMs = 500,
  ) {}

  async choose(
    state: Record<string, JsonValue>,
    instructions: string,
    criteria: Record<string, string | null>,
    context: Record<string, JsonValue>,
  ): Promise<EscalationAnswer> {
    mkdirSync(this.dir, { recursive: true });
    const started = Date.now();
    this.counter += 1;
    const id = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${process.pid}-${this.counter}`;
    const pending = join(this.dir, `pending-${id}.json`);
    const answerPath = join(this.dir, `answer-${id}.json`);
    const body = {
      id,
      created: new Date().toISOString(),
      deadline: new Date(started + this.timeoutMs).toISOString(),
      answer_file: answerPath,
      answer_format: { choice: "<one option key>", reason: "<short>" },
      context,
      question: instructions,
      options: Object.fromEntries(Object.entries(criteria).map(([key, value]) => [key, parseMaybe(value)])),
      state,
    };
    // Write then rename, so a watcher never reads half a file.
    writeFileSync(`${pending}.tmp`, JSON.stringify(body, null, 1), "utf8");
    renameSync(`${pending}.tmp`, pending);

    try {
      while (Date.now() - started < this.timeoutMs) {
        if (existsSync(answerPath)) {
          let parsed: { choice?: unknown; reason?: unknown };
          try {
            parsed = JSON.parse(readFileSync(answerPath, "utf8")) as { choice?: unknown; reason?: unknown };
          } catch {
            await sleep(this.pollMs); // being written
            continue;
          }
          const choice = typeof parsed.choice === "string" ? parsed.choice.trim() : "";
          if (!(choice in criteria)) throw new Error(`Claude answered unknown option "${choice}"`);
          return { choice, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 300) : "", latencyMs: Date.now() - started, inputTokens: 0, outputTokens: 0 };
        }
        await sleep(this.pollMs);
      }
      throw new Error(`no answer within ${Math.round(this.timeoutMs / 1000)} s`);
    } finally {
      // Mark it handled either way so the watcher does not surface it again.
      try {
        renameSync(pending, join(this.dir, `done-${id}.json`));
      } catch {
        // already moved
      }
    }
  }
}

function parseMaybe(value: string | null): JsonValue {
  if (value === null) return null;
  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    return value;
  }
}
