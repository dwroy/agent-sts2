/**
 * Enemy move model learned from past runs (tools/build-move-model.py -> move-model.json): which move
 * tends to follow which, and each move's average attack damage. Used to estimate next turn's hit.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface EnemyModel {
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

/** The whole learned model (the fight plan shows DeepSeek each enemy's move cycle). */
export function moveModel(): Record<string, EnemyModel> {
  return load();
}

/** Mean attack damage per move over the enemy's learned moves (a turn's hit on average), or null. */
export function meanMoveDamage(enemyId: string): number | null {
  const entry = load()[enemyId];
  if (!entry) return null;
  const values = Object.values(entry.damage);
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
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

/**
 * Expected attack damage of this enemy on each of the next `turns` enemy turns after the current one
 * (index 0 = next turn), walking the learned move chain from its current move. A move with no learned
 * successor is repeated. `sleepTurns`: the enemy is asleep (ASLEEP_POWER N skips N enemy turns, this
 * one included), so the next N - 1 turns are 0 and it wakes into the current move's other successors.
 * null when the enemy has no learned moves.
 */
export function damageForecast(enemyId: string, currentMove: string, turns: number, sleepTurns = 0): number[] | null {
  const entry = load()[enemyId];
  if (!entry || turns <= 0) return null;
  const step = (dist: Map<string, number>, skipSelf = false): Map<string, number> => {
    const out = new Map<string, number>();
    for (const [move, p] of dist) {
      const successors = Object.entries(entry.next[move] ?? {}).filter(([next]) => !skipSelf || next !== move);
      const total = successors.reduce((sum, [, n]) => sum + n, 0);
      if (total <= 0) {
        out.set(move, (out.get(move) ?? 0) + p);
        continue;
      }
      for (const [next, n] of successors) out.set(next, (out.get(next) ?? 0) + (p * n) / total);
    }
    return out;
  };
  const expected = (dist: Map<string, number>) => [...dist].reduce((sum, [move, p]) => sum + p * (entry.damage[move] ?? 0), 0);
  const out: number[] = [];
  let dist = new Map([[currentMove, 1]]);
  for (let k = 1; k <= turns; k += 1) {
    if (k < sleepTurns) {
      out.push(0);
      continue;
    }
    dist = step(dist, sleepTurns > 0 && k === sleepTurns);
    out.push(expected(dist));
  }
  return out;
}

/** The enemy's move cycle has a Buff move: it ramps while it lives (6A36: Sludge Spinner, +3 Strength per Rage). */
export function hasBuffMove(enemyId: string): boolean {
  return (load()[enemyId]?.buffs ?? []).length > 0;
}
