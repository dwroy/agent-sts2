/**
 * The residual tool's enemy index mapping (tools/mechanics-residuals.ts): a decision's target is the game's index at that
 * moment, and an enemy's death compacts the list (H7W047ZCEBSA F29 T5: three Tough Eggs and the Ovicopter [3]; the Fight
 * Me kill of egg [1] made the Ovicopter [2], and "Strike > 2" read as a play into the third egg). The solver's lines use
 * the decision frame's indexes, so each play's target is mapped back frame by frame. Read-only, no game data.
 */

/** An enemy in a frame of the log DB (frames.enemies): the game's index at that moment. */
export interface FrameEnemy {
  idx: number;
  id: string;
  hp: number;
  max_hp: number;
}

/**
 * The enemies of one frame matched to the frame before it, in order: for each enemy now, its position in the frame
 * before (null: it was not there, a spawn). The game keeps the living enemies in order and drops the dead, so this is
 * an order-keeping alignment by enemy id: the same max HP and no HP gained count for a pair, and among enemies alike
 * (three Tough Eggs) the one the play between the frames targeted (`hit`, a position in `before`) is the one gone.
 */
export function alignEnemies(before: FrameEnemy[], after: FrameEnemy[], hit: number | null): (number | null)[] {
  const n = before.length;
  const m = after.length;
  if (n === m && before.every((enemy, i) => enemy.id === after[i]!.id && enemy.max_hp === after[i]!.max_hp)) return after.map((_, i) => i);
  const score: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(Number.NEGATIVE_INFINITY));
  const move: ("gone" | "new" | "pair")[][] = Array.from({ length: n + 1 }, () => new Array<"gone" | "new" | "pair">(m + 1).fill("gone"));
  score[0]![0] = 0;
  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= m; j += 1) {
      if (i === 0 && j === 0) continue;
      const options: [number, "gone" | "new" | "pair"][] = [];
      // Gone: the target of the play in between first, then the lowest HP (a tie-break among enemies alike).
      if (i > 0) options.push([score[i - 1]![j]! + (i - 1 === hit ? 1 : 0) - before[i - 1]!.hp / 100_000, "gone"]);
      if (j > 0) options.push([score[i]![j - 1]! - 100, "new"]);
      if (i > 0 && j > 0 && before[i - 1]!.id === after[j - 1]!.id) {
        options.push([score[i - 1]![j - 1]! + 10 + (before[i - 1]!.max_hp === after[j - 1]!.max_hp ? 3 : 0) + (after[j - 1]!.hp <= before[i - 1]!.hp ? 1 : 0), "pair"]);
      }
      for (const [value, kind] of options) {
        if (value > score[i]![j]!) {
          score[i]![j] = value;
          move[i]![j] = kind;
        }
      }
    }
  }
  const out: (number | null)[] = new Array<number | null>(m).fill(null);
  for (let i = n, j = m; i > 0 || j > 0; ) {
    const kind = move[i]![j]!;
    if (kind === "pair") {
      out[j - 1] = i - 1;
      i -= 1;
      j -= 1;
    } else if (kind === "new") j -= 1;
    else i -= 1;
  }
  return out;
}

/**
 * Each frame's enemy index (the game's, at that moment) mapped to the first frame's index, frame by frame: null for an
 * enemy the first frame did not have. `hits[k]`: the game index targeted by the play made on frame k (null: none).
 */
export function enemyIndexMaps(frames: FrameEnemy[][], hits: (number | null)[]): Map<number, number | null>[] {
  const maps: Map<number, number | null>[] = [];
  let origin: (number | null)[] = frames[0]?.map((enemy) => enemy.idx) ?? [];
  frames.forEach((enemies, k) => {
    if (k > 0) {
      const before = frames[k - 1]!;
      const hit = hits[k - 1] ?? null;
      const at = hit === null ? -1 : before.findIndex((enemy) => enemy.idx === hit);
      const prior = origin;
      origin = alignEnemies(before, enemies, at >= 0 ? at : null).map((position) => (position === null ? null : prior[position] ?? null));
    }
    maps.push(new Map(enemies.map((enemy, i) => [enemy.idx, origin[i] ?? null])));
  });
  return maps;
}
