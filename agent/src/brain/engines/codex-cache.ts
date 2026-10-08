/** Safe measurements of the exact client inputs, without logging prompt text. */
import { createHash } from "node:crypto";

export function segmentDigest(text: string): { sha256: string; bytes: number; chars: number } {
  return { sha256: createHash("sha256").update(text).digest("hex"), bytes: Buffer.byteLength(text), chars: text.length };
}

export function firstDifferentByte(before: string, after: string): number | null {
  const a = Buffer.from(before), b = Buffer.from(after);
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) return i;
  return a.length === b.length ? null : Math.min(a.length, b.length);
}

type Input = { scope: string; system: string; prompt: string; schema: unknown; serviceTier: string | null };

export class CodexCacheObserver {
  private previous: Input | null = null;

  capture(input: Input) {
    const previous = this.previous?.scope === input.scope ? this.previous : null;
    const schema = JSON.stringify(input.schema ?? null);
    const result = {
      instructions: segmentDigest(input.system), user: segmentDigest(input.prompt), schema: segmentDigest(schema),
      service_tier: input.serviceTier, roles: ["instructions", "user"], tools: "disabled",
      previous_in_scope: previous !== null,
      first_different_byte: previous ? {
        instructions: firstDifferentByte(previous.system, input.system),
        user: firstDifferentByte(previous.prompt, input.prompt),
        schema: firstDifferentByte(JSON.stringify(previous.schema ?? null), schema),
      } : null,
    };
    this.previous = input;
    return result;
  }
}

export type CodexCacheObservation = ReturnType<CodexCacheObserver["capture"]>;

/** Counts attempts, including failed ones; a reserved attempt is never refunded. */
export class PhysicalCallBudget {
  private used = 0;
  constructor(private readonly limit?: number) {
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 2)) throw new Error("probe limit must be 1 or 2");
  }
  claim(): boolean {
    if (this.limit !== undefined && this.used >= this.limit) return false;
    this.used += 1;
    return true;
  }
}
