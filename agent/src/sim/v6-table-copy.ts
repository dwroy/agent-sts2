/** Mutable numeric results are copied; immutable frozen audit metrics retain identity. */
import type { V6ProjectionTable } from "./v6-projection.js";
export function copyV6Table(table: V6ProjectionTable): V6ProjectionTable {
  const copy: V6ProjectionTable = structuredClone({ ...table, combinations: table.combinations.map(r => ({ ...r, summary: null })) });
  for (const [i, row] of copy.combinations.entries()) row.summary = table.combinations[i]!.summary;
  return copy;
}
