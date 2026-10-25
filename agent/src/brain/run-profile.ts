/** A process freezes this per-run request; only the next run may select another arm. */
export interface BrainRunProfile {
  engine: "codex" | "deepseek";
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  trial_id?: string;
  sequence?: number;
}

export interface BrainNativeReceipt {
  engine: "codex";
  model: string;
  effort: string;
  source: "turn_context";
  thread_id: string;
  turn_id: string;
  sha256: string;
  /** Exact original turn_context line, captured before revert/delete; hash excludes its newline. */
  context_line?: string;
}

export function parseBrainRunProfile(raw: string | undefined): BrainRunProfile | undefined {
  if (!raw) return undefined;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("expected an object");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some((k) => !["engine", "effort", "trial_id", "sequence"].includes(k))
    || !["codex", "deepseek"].includes(String(v["engine"]))
    || !(v["engine"] === "deepseek" ? ["low", "high", "max"] : ["low", "medium", "high", "xhigh"]).includes(String(v["effort"]))
    || (v["trial_id"] !== undefined && (typeof v["trial_id"] !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(v["trial_id"])))
    || (v["sequence"] !== undefined && (!Number.isSafeInteger(v["sequence"]) || Number(v["sequence"]) < 0))) {
    throw new Error("invalid engine, effort or trial identity");
  }
  return Object.freeze({ ...v }) as unknown as BrainRunProfile;
}
