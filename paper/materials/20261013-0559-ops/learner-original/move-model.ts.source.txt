/**
 * Enemy move model learned from past runs (knowledge/builders/build-move-model.py -> move-model.json): which move
 * tends to follow which, and each move's average attack damage. Used to estimate next turn's hit.
 *
 * The damage a forecast puts on each move is the monster DB's at the run's ascension (DamageContext; Dai:
 * monster damage at the current ascension): its measured base per hit there (moveDamageAt, the nearest
 * logged ascension scaled when unseen) plus the enemy's Strength, times its hits, x1.5 while our
 * Vulnerable lasts; a move with no measured base its shown hit (shownDamageAt). The move model's own
 * damage (the shown total averaged over every ascension, with the Strength and Vulnerable of the logged
 * turns in it) is only the fallback when the DB has neither, or when no context is given.
 */

import { readFileSync } from "node:fs";

import { asArray, asRecord, numOrNull, str } from "../core/util/json.js";
import { monsterMoves, moveDamageAt, shownDamageAt } from "./monster-db.js";
import { bumpDataVersion } from "../core/util/data-version.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "./files.js";

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
    const path = knowledgeFile(KNOWLEDGE_DIR, "move-model.json");
    model = JSON.parse(readFileSync(path, "utf8")) as Record<string, EnemyModel>;
  } catch {
    model = {};
  }
  return model;
}

/**
 * The board a forecast is for: the run's ascension, the enemy's Strength now (a temporary loss added back:
 * TEMP_STRENGTH_LOSS_POWERS) and our Vulnerable turns now (99: for the fight).
 */
export interface DamageContext {
  asc: number;
  strength?: number;
  vulnerable?: number;
}

/** Enemy Strength lost for this turn only (「在本回合结束前失去力量」): back by its next move. */
export const TEMP_STRENGTH_LOSS_POWERS = ["MANGLE_POWER", "SHACKLING_POTION_POWER", "DARK_SHACKLES_POWER", "PIERCING_WAIL_POWER"] as const;

function powerOf(holder: Record<string, unknown>, id: string): number {
  return asArray(holder["powers"])
    .map(asRecord)
    .filter((power) => str(power["power_id"]) === id)
    .reduce((sum, power) => sum + (numOrNull(power["amount"]) ?? 1), 0);
}

/** A board enemy's DamageContext (combat state enemy and player records). */
export function boardDamageContext(enemy: Record<string, unknown>, player: Record<string, unknown>, asc: number): DamageContext {
  const temporary = TEMP_STRENGTH_LOSS_POWERS.reduce((sum, id) => sum + Math.max(0, powerOf(enemy, id)), 0);
  return { asc, strength: powerOf(enemy, "STRENGTH_POWER") + temporary, vulnerable: powerOf(player, "VULNERABLE_POWER") };
}

/**
 * A move's expected attack damage on the enemy turn `ahead` turns after this one (1 = next): with a context,
 * the monster DB's at its ascension (see the header), else (or when the DB has nothing for it) the move
 * model's pooled average. null when neither knows the move.
 */
export function moveDamage(enemyId: string, move: string, ctx?: DamageContext, ahead = 1): number | null {
  const pooled = load()[enemyId]?.damage[move] ?? null;
  if (!ctx) return pooled;
  const db = monsterMoves();
  const base = moveDamageAt(db, enemyId, move, ctx.asc);
  if (base) {
    const vulnerable = (ctx.vulnerable ?? 0) > ahead ? 1.5 : 1;
    return Math.floor(Math.max(0, base.perHit + (ctx.strength ?? 0)) * vulnerable) * base.hits;
  }
  const shown = shownDamageAt(db, enemyId, move, ctx.asc);
  if (shown) return shown.perHit * shown.hits;
  return pooled;
}

/** For tests: use this model instead of the file (null reloads the file). */
export function setMoveModelForTests(data: Record<string, EnemyModel> | null): void {
  bumpDataVersion();
  model = data;
}

/** The whole learned model (the fight plan shows DeepSeek each enemy's move cycle). */
export function moveModel(): Record<string, EnemyModel> {
  return load();
}

/** Mean attack damage per move over the enemy's learned moves (a turn's hit on average), or null. */
export function meanMoveDamage(enemyId: string, ctx?: DamageContext): number | null {
  const entry = load()[enemyId];
  if (!entry) return null;
  const values = Object.keys(entry.damage).map((move) => moveDamage(enemyId, move, ctx) ?? 0);
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

/** Expected attack damage of this enemy's move next turn (moveDamage at `ctx`), or null when unknown. */
export function expectedNextDamage(enemyId: string, currentMove: string, ctx?: DamageContext, exclude?: ReadonlySet<string>): number | null {
  const entry = load()[enemyId];
  if (!entry) return null;
  const successors = entry.next[currentMove];
  if (!successors) return null;
  let total = 0;
  let count = 0;
  for (const [move, n] of keptSuccessors(Object.entries(successors), exclude)) {
    const damage = moveDamage(enemyId, move, ctx, 1);
    if (damage === null) continue;
    total += damage * n;
    count += n;
  }
  return count > 0 ? total / count : null;
}

/**
 * The successors left once `exclude` is taken out (MECH_DEATH_MOVE: the moves a learned death rule says this enemy never
 * makes while its ally lives, the Queen's Off With Your Head beside the Amalgam), all of them when that leaves none or
 * nothing is excluded.
 */
function keptSuccessors(successors: [string, number][], exclude?: ReadonlySet<string>): [string, number][] {
  if (!exclude || exclude.size === 0) return successors;
  const kept = successors.filter(([move]) => !exclude.has(move));
  return kept.length > 0 ? kept : successors;
}

/**
 * Expected attack damage of this enemy on each of the next `turns` enemy turns after the current one
 * (index 0 = next turn), walking the learned move chain from its current move. A move with no learned
 * successor is repeated. `sleepTurns`: the enemy is asleep (ASLEEP_POWER N skips N enemy turns, this
 * one included), so the next N - 1 turns are 0 and it wakes into the current move's other successors.
 * null when the enemy has no learned moves.
 */
export function damageForecast(enemyId: string, currentMove: string, turns: number, sleepTurns = 0, ctx?: DamageContext, exclude?: ReadonlySet<string>): number[] | null {
  const entry = load()[enemyId];
  if (!entry || turns <= 0) return null;
  const step = (dist: Map<string, number>, skipSelf = false): Map<string, number> => {
    const out = new Map<string, number>();
    for (const [move, p] of dist) {
      const successors = keptSuccessors(Object.entries(entry.next[move] ?? {}).filter(([next]) => !skipSelf || next !== move), exclude);
      const total = successors.reduce((sum, [, n]) => sum + n, 0);
      if (total <= 0) {
        out.set(move, (out.get(move) ?? 0) + p);
        continue;
      }
      for (const [next, n] of successors) out.set(next, (out.get(next) ?? 0) + (p * n) / total);
    }
    return out;
  };
  const expected = (dist: Map<string, number>, ahead: number) => [...dist].reduce((sum, [move, p]) => sum + p * (moveDamage(enemyId, move, ctx, ahead) ?? 0), 0);
  const out: number[] = [];
  let dist = new Map([[currentMove, 1]]);
  for (let k = 1; k <= turns; k += 1) {
    if (k < sleepTurns) {
      out.push(0);
      continue;
    }
    dist = step(dist, sleepTurns > 0 && k === sleepTurns);
    out.push(expected(dist, k));
  }
  return out;
}

/** The move this enemy uses most (successor counts summed), or null: what a revived illusion does next. */
export function usualMove(enemyId: string): string | null {
  const entry = load()[enemyId];
  if (!entry) return null;
  const counts = new Map<string, number>();
  for (const successors of Object.values(entry.next)) for (const [move, n] of Object.entries(successors)) counts.set(move, (counts.get(move) ?? 0) + n);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * An illusion dead now (Parafright on REVIVE_MOVE) is back at full HP next turn with its usual move: its
 * expected attack on each of the next `turns` enemy turns, or null when it has no learned moves.
 */
export function revivingForecast(enemyId: string, turns: number, ctx?: DamageContext): number[] | null {
  const entry = load()[enemyId];
  const move = usualMove(enemyId);
  if (!entry || !move || turns <= 0) return null;
  // It comes back fresh: no Strength of its own (our Vulnerable still counts).
  const fresh = ctx ? { ...ctx, strength: 0 } : undefined;
  return [moveDamage(enemyId, move, fresh, 1) ?? 0, ...(damageForecast(enemyId, move, turns - 1, 0, fresh) ?? [])];
}

/** The enemy's move cycle has a Buff move: it ramps while it lives (6A36: Sludge Spinner, +3 Strength per Rage). */
export function hasBuffMove(enemyId: string): boolean {
  return (load()[enemyId]?.buffs ?? []).length > 0;
}
