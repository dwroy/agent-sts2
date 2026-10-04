/**
 * A counter of the knowledge data swapped in or out by the tests' setters (setMonsterDbForTests, setMoveModelForTests, ...).
 * Play loads each data file once and never swaps it; a cache over computations that read the data (the SL retry compute
 * memo, src/sim/compute-memo.ts) keys on this, so a swap is never served a result computed on the data before it.
 */
let version = 0;

export function dataVersion(): number {
  return version;
}

/** A test setter swapped a data table. */
export function bumpDataVersion(): void {
  version += 1;
}
