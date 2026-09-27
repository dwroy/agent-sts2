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
 * Expected attack damage of this enemy's next `steps` moves after `currentMove`: each step's expected
 * hit over its successors, then on to the most likely successor (FEY6 F17 T6: the Matriarch's Slash 2
 * is followed by Soul Siphon, 0, then Slash). Stops early (shorter array) where the model has no successors.
 */
export function expectedHitsAhead(enemyId: string, currentMove: string, steps: number): number[] | null {
  const entry = load()[enemyId];
  if (!entry?.next[currentMove]) return null;
  const hits: number[] = [];
  let move = currentMove;
  for (let step = 0; step < steps; step += 1) {
    const successors = entry.next[move];
    if (!successors || Object.keys(successors).length === 0) break;
    hits.push(expectedNextDamage(enemyId, move) ?? 0);
    move = Object.entries(successors).sort((a, b) => b[1] - a[1])[0]![0];
  }
  return hits;
}

/** The enemy's move cycle has a Buff move: it ramps while it lives (6A36: Sludge Spinner, +3 Strength per Rage). */
export function hasBuffMove(enemyId: string): boolean {
  return (load()[enemyId]?.buffs ?? []).length > 0;
}

/** The enemy's biggest average attack in the model (a woken sleeper's first hit), or null when unknown. */
export function maxMoveDamage(enemyId: string): number | null {
  const damage = Object.values(load()[enemyId]?.damage ?? {});
  return damage.length > 0 ? Math.max(...damage) : null;
}

/**
 * Next turn's expected hit with growth: Ritual N adds N Strength at the end of every enemy turn, so an
 * attack repeated next turn hits N more per hit than the one shown now (NX48 F35: SAVAGE 12 -> 21 -> 30
 * -> 39 on Ritual 9; every option showed the model's average 22).
 */
export function nextDamageWithGrowth(base: number | null, ritual: number, shown: { damage: number; hits: number }[]): number | null {
  if (ritual <= 0) return base;
  const now = shown.filter((attack) => attack.damage > 0);
  if (now.length === 0) return base === null ? null : base + ritual;
  const grown = now.reduce((sum, attack) => sum + (attack.damage + ritual) * Math.max(1, attack.hits), 0);
  return Math.max(base ?? 0, grown);
}

/**
 * An enemy's average hit a turn once awake: each move's average attack damage weighted by how often
 * the model sees it played (its incoming transitions), sleep moves left out; with the expected number of
 * sleep turns it opens with (a self-looping sleep move: 1 / (1 - P(stay asleep))). Null when unknown.
 */
export function awakeDamagePerTurn(enemyId: string): { perTurn: number; sleepTurns: number } | null {
  const entry = load()[enemyId];
  if (!entry) return null;
  const visits: Record<string, number> = {};
  for (const successors of Object.values(entry.next)) for (const [move, n] of Object.entries(successors)) visits[move] = (visits[move] ?? 0) + n;
  // The Slumbering Beetle sleeps as SNORE_MOVE.
  const isSleep = (move: string) => /SLEEP|SNORE/.test(move);
  let total = 0;
  let count = 0;
  for (const [move, n] of Object.entries(visits)) {
    if (isSleep(move)) continue;
    total += (entry.damage[move] ?? 0) * n;
    count += n;
  }
  if (count === 0) return null;
  let sleepTurns = 0;
  for (const [move, successors] of Object.entries(entry.next)) {
    if (!isSleep(move)) continue;
    const out = Object.values(successors).reduce((sum, n) => sum + n, 0);
    const stay = successors[move] ?? 0;
    if (out > stay) sleepTurns = Math.max(sleepTurns, 1 / (1 - stay / out));
  }
  return { perTurn: total / count, sleepTurns };
}
