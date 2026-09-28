/**
 * Measured HP change per map room (tools/build-room-costs.py -> room-costs.json): entry HP minus the HP
 * on the next floor's map, by ascension, act and room type, with n. The route facts project HP with it.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface MeasuredRoom {
  n: number;
  median: number;
  p75: number;
  mean: number;
}

type RoomCosts = Record<string, Record<string, Record<string, MeasuredRoom>>>;

let cached: RoomCosts | null = null;

function load(): RoomCosts {
  if (cached) return cached;
  try {
    const path = join(dirname(fileURLToPath(import.meta.url)), "room-costs.json");
    cached = (JSON.parse(readFileSync(path, "utf8")) as { by_asc?: RoomCosts }).by_asc ?? {};
  } catch {
    cached = {};
  }
  return cached;
}

/** For tests: use these costs instead of the file (null reloads the file). */
export function setRoomCostsForTests(costs: RoomCosts | null): void {
  cached = costs;
}

/** Fewest measured rooms to use a number; below it the nearest logged ascension is tried. */
export const MEASURED_ROOM_MIN_N = 5;

/** The measured HP change of a room type in this act at `asc` (else the nearest ascension with enough rooms). */
export function measuredRoom(act: number, asc: number, room: string): (MeasuredRoom & { asc: number }) | null {
  const byAsc = load();
  const ascs = Object.keys(byAsc)
    .filter((key) => /^\d+$/.test(key))
    .map(Number)
    .sort((a, b) => Math.abs(a - asc) - Math.abs(b - asc) || b - a);
  for (const at of ascs) {
    const entry = byAsc[String(at)]?.[String(act)]?.[room];
    if (entry && entry.n >= MEASURED_ROOM_MIN_N) return { ...entry, asc: at };
  }
  return null;
}
