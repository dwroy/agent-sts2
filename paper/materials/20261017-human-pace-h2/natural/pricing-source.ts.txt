/**
 * TypeSafe's published price for Jev (docs `models.md`): **$42 per billion input tokens**, which is
 * the same as **$0.042 per million**, and **output tokens are free**.
 *
 * The number is written in the per-million unit the docs quote, so the code reads like the pricing
 * page and cannot drift from it. Output tokens are deliberately absent: they cost nothing, and
 * counting them would invent a charge that does not exist.
 */
export const JEV_INPUT_USD_PER_MTOK = 0.042;

export function estimateCostUsd(inputTokens: number): number {
  if (!Number.isFinite(inputTokens) || inputTokens <= 0) return 0;
  return (inputTokens / 1_000_000) * JEV_INPUT_USD_PER_MTOK;
}

/** `≈ $0.0001` — one formatter so every line that shows a cost shows it identically. */
export function formatCostUsd(inputTokens: number): string {
  return `≈ $${estimateCostUsd(inputTokens).toFixed(4)}`;
}
