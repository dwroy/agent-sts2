/**
 * How the console, the decision log's rationale and the screens' texts name the brain engine that made a decision (not the
 * prompts: what the models read keeps its words, and the run memory its "DS" tag, run-journal.ts journalTag). Before
 * 2026-10-04 those texts said "DeepSeek" whichever engine answered (RJZGFGNYK56W: "DeepSeek decided …" on codex's answers).
 */
import type { BrainDecider } from "./types.js";

const NAMES: Readonly<Record<string, string>> = { deepseek: "DeepSeek", codex: "Codex", claude: "Claude", dsh: "dsh" };

/** A brain engine as the console names it (deepseek when there is none: v3's client). */
export function engineLabel(engine: string | undefined): string {
  return NAMES[engine ?? "deepseek"] ?? String(engine);
}

/**
 * A decider as the texts name it: "codex" -> "Codex", "deepseek (for codex)" -> "DeepSeek (for Codex)" (the router's fallback
 * answered); none -> "DeepSeek" (plain v3 DeepSeek, as the decision log's "deepseek").
 */
export function deciderLabel(by: BrainDecider | string | undefined): string {
  const named = /^(\w+) \(for (\w+)\)$/.exec(by ?? "");
  return named ? `${engineLabel(named[1])} (for ${engineLabel(named[2])})` : engineLabel(by || undefined);
}
