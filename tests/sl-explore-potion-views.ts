/**
 * What exploreTarget, exploreTried and triedHas make of the logged rows, as data for a digest: tests/sl-explore-potion.test.ts
 * pins what v4 ff66eb2 made of them (SL_RETRY_EXPLORE_POTION did not exist there: off must be the same). Only APIs ff66eb2
 * has; the explore module is passed in (the digest was captured by passing ff66eb2's src/sl/explore.ts).
 */
import { createHash } from "node:crypto";

import type * as Explore from "../src/sl/explore.js";

type Api = Pick<typeof Explore, "exploreTarget" | "exploreTried" | "triedHas" | "turnCanon">;
type Row = Explore.ExploreRow & { run_id?: string; floor?: number | null };

/** The rule sets the view runs: the live ones before SL_RETRY_EXPLORE_WHERE (ebb3710, P68P's run) and with it (v4 now). */
export const OFF_RULES: Explore.ExploreTargetOptions[] = [
  { aliveFirst: true, canon: true, tried: true, whole: true },
  { aliveFirst: true, canon: true, tried: true, whole: true, where: true },
];

/**
 * For each fight and rule set, attempt 3 to the last: the target over the rows logged before it (and why); the turns tried
 * through its board (exploreTried, with attempt 1: `canon`); whether the attempt's own deviation turn (as played: the row's
 * plays, its summary's) is one of them.
 */
export function offView(api: Api, fights: readonly (readonly Row[])[]): unknown {
  return fights.map((rows) => {
    const last = Math.max(...rows.map((row) => row.attempt));
    return OFF_RULES.map((options) => {
      const out: unknown[] = [];
      for (let k = 3; k <= last; k += 1) {
        const before = rows.filter((row) => row.attempt < k);
        const { target, why } = api.exploreTarget(before, k, options);
        const tried = target ? api.exploreTried(before, k, target.board, { canon: true }) : null;
        const own = rows.find((row) => row.attempt === k && row.explore)?.explore;
        const turn = own?.deviation?.turn ?? own?.target?.turn ?? null;
        const loose = rows.find((row) => row.attempt === k)?.summary?.turns.find((entry) => entry.turn === turn)?.plays;
        const key = { text: "", ...(own?.deviation?.plays !== undefined ? { canon: own.deviation.plays } : {}), ...(loose ? { loose: api.turnCanon(loose) } : {}) };
        const ownTried = own?.target ? api.triedHas(api.exploreTried(before, k, own.target.board, { canon: true }).tried, key) : null;
        out.push({ k, target, why, tried, ownTried });
      }
      return out;
    });
  });
}

export const digest = (view: unknown): string => createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
