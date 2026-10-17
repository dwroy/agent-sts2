import type { EnemyTable } from "./rollout.js";

/**
 * ZZMYZ5UBCG72, Silent A2 F48 T2-T7: the held Paper Krane says 40%, and the already-Weak Amalgam
 * shows 10x1 / 7x3 / 13x1 / 14x1 / 4x3 / 16x1 in these six contexts. Only these measured later-turn
 * contexts are covered. New Weak applied during a solver line, other Strength, ascensions and monsters
 * retain their existing paths; this is not a general Paper Krane or rounding model.
 */
export function withObservedSilentBossWeak(
  table: EnemyTable,
  id: string,
  context: { character: string; asc: number; relics: readonly unknown[] },
): EnemyTable {
  if (context.character.toLowerCase() !== "silent" || context.asc !== 2 || id !== "TORCH_HEAD_AMALGAM") return table;
  if (!context.relics.some((value) => {
    const relic = value as { relic_id?: string; is_melted?: boolean } | null;
    return relic?.relic_id === "PAPER_KRANE" && relic.is_melted === false;
  })) return table;
  const observed = [
    { move: "TACKLE_2_MOVE", damage: 18, hits: 1, contexts: [[0, false]] },
    { move: "BEAM_MOVE", damage: 8, hits: 3, contexts: [[0, true], [-3, true]] },
    { move: "TACKLE_3_MOVE", damage: 14, hits: 1, contexts: [[1, true], [4, true]] },
    { move: "TACKLE_4_MOVE", damage: 14, hits: 1, contexts: [[2, true]] },
  ] as const;
  const moves = { ...table.moves };
  for (const row of observed) {
    const move = moves[row.move];
    // A refreshed table with different base values is a new, unvalidated object.
    if (!move || move.shown || move.damage !== row.damage || move.hits !== row.hits || move.growth) continue;
    moves[row.move] = { ...move, observedWeak: row.contexts.map(([strength, playerVulnerable]) => ({ strength, playerVulnerable, scale: 0.6 })) };
  }
  return { ...table, moves };
}
