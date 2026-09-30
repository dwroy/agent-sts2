/**
 * The simulators' worker pools never hold workers at the same time (V4.2, docs/boss-sim.md §11.2): B2's boss-line pool
 * (boss-lines.ts, BossLinesPool: a boss fight's questions) and B3's build pool (build-sim-pool.ts, BuildSimPool: the
 * deck-building questions) never run together, so a pool starting its workers first lets the other kind's go. Neither
 * keeps up to 20-24 idle workers (each with the solver loaded) while the other runs; the one released builds its
 * workers again on its next run.
 */

export type SimPoolKind = "boss-lines" | "build";

const holders = new Map<object, { kind: SimPoolKind; release: () => void }>();

/** `owner`, a pool of `kind`, is starting its workers: every pool of the other kind is released first. */
export function claimSimCores(owner: object, kind: SimPoolKind, release: () => void): void {
  for (const [other, entry] of [...holders]) {
    if (entry.kind === kind) continue;
    holders.delete(other);
    entry.release();
  }
  holders.set(owner, { kind, release });
}

/** `owner`'s workers are gone (closed or released). */
export function leaveSimCores(owner: object): void {
  holders.delete(owner);
}

/** The kinds of the pools holding workers now (tests). */
export function simPoolsHolding(): SimPoolKind[] {
  return [...holders.values()].map((entry) => entry.kind);
}
