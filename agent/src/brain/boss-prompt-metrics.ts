/** Called at the native send boundary, after durable knowledge reservations. No prompt content is logged here. */
import { promptWithReask } from "./message.js";
import type { BrainRequest } from "./types.js";

export interface BossPromptMetrics {
  phase: string;
  transport: "codex" | "dsh";
  system_bytes: number;
  user_bytes: number;
  schema_bytes: number;
  tools_bytes: number;
  total_bytes: number;
}
export function recordBossPromptMetrics(req: BrainRequest, schema: unknown, transport: "codex" | "dsh"): void {
  if (!req.bossDossier) return;
  const system_bytes = Buffer.byteLength(req.system), schema_bytes = Buffer.byteLength(JSON.stringify(schema ?? null));
  const user_bytes = Buffer.byteLength(promptWithReask(req)) + (transport === "dsh" ? Buffer.byteLength("\n\nAnswer schema: ") + schema_bytes : 0);
  const tools_bytes = Buffer.byteLength(JSON.stringify((req.tools ?? []).map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))));
  (req.bossDossier.prompts ??= []).push({ phase: req.evidencePhase ?? (req.reask ? "reask" : "query"), transport,
    system_bytes, user_bytes, schema_bytes, tools_bytes, total_bytes: system_bytes + user_bytes + (transport === "codex" ? schema_bytes : 0) });
}
