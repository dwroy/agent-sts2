/**
 * Enemy move model learned from past runs (tools/build-move-model.py -> move-model.json): which move
 * tends to follow which, and each move's average attack damage. Used to estimate next turn's hit.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface EnemyModel {
  next: Record<string, Record<string, number>>;
  damage: Record<string, number>;
  /** Moves seen with a Buff intent (Sludge Spinner's RAGE_MOVE: +3 Strength each time). */
  buffs?: string[];
}

let model: Record<string, EnemyModel> | null = null;

function load(): Record<string, EnemyModel> {
  if (model) return model;
  try {
    const path = join(dirname(fileURLToPath(import.meta.url)), "move-model.json");
    model = JSON.parse(readFileSync(path, "utf8")) as Record<string, EnemyModel>;
  } catch {
    model = {};
  }
  return model;
}

/** Expected attack damage of this enemy's move next turn, or null when unknown. */
export function expectedNextDamage(enemyId: string, currentMove: string): number | null {
  const entry = load()[enemyId];
  if (!entry) return null;
  const successors = entry.next[currentMove];
  if (!successors) return null;
  let total = 0;
  let count = 0;
  for (const [move, n] of Object.entries(successors)) {
    const damage = entry.damage[move];
    if (damage === undefined) continue;
    total += damage * n;
    count += n;
  }
  return count > 0 ? total / count : null;
}

/** The enemy's move cycle has a Buff move: it ramps while it lives (6A36: Sludge Spinner, +3 Strength per Rage). */
export function hasBuffMove(enemyId: string): boolean {
  return (load()[enemyId]?.buffs ?? []).length > 0;
}
