/** Read only this engine-owned thread, before revert removes the turn context. */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import type { BrainNativeReceipt } from "../run-profile.js";

export function nativeReceipt(path: string | null, threadId: string, turnId: string | null): BrainNativeReceipt | undefined {
  if (!path || !turnId) return undefined;
  try {
    if (statSync(path).size > 16 * 1024 * 1024) return undefined;
    return receiptFromRollout(readFileSync(path, "utf8"), threadId, turnId);
  } catch { return undefined; }
}

export function receiptFromRollout(text: string, threadId: string, turnId: string): BrainNativeReceipt | undefined {
  let owned = false;
  let receipt: BrainNativeReceipt | undefined;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      const p = row.payload;
      if (row.type === "session_meta") owned = p?.id === threadId;
      if (row.type !== "turn_context" || p?.turn_id !== turnId) continue;
      const effort = p.effort ?? p.reasoning_effort;
      if (typeof p.model !== "string" || typeof effort !== "string") continue;
      receipt = { engine: "codex", model: p.model, effort, source: "turn_context", thread_id: threadId,
        turn_id: turnId, sha256: createHash("sha256").update(line).digest("hex") };
    } catch { /* A partial final line is not a receipt. */ }
  }
  return owned ? receipt : undefined;
}
