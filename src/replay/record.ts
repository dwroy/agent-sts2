/**
 * `record` (PLAN.md §12, M1): dump distinct raw states to a fixtures file so the decision layer can
 * be exercised, and later regression-tested, without the game.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { fingerprint } from "../act/gate.js";
import { ModClient } from "../mod/client.js";
import { parseGameState, type GameState } from "../mod/schema.js";
import { stableStringify } from "../util/json.js";

export interface RecordOptions {
  client: ModClient;
  outPath: string;
  intervalMs?: number;
  durationMs?: number;
  maxStates?: number;
  onEvent?: (message: string) => void;
  /** Injectable for tests. */
  clock?: () => number;
}

export interface RecordStats {
  captured: number;
  skipped: number;
  path: string;
  byScreen: Record<string, number>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function recordStates(options: RecordOptions): Promise<RecordStats> {
  const intervalMs = options.intervalMs ?? 600;
  const maxStates = options.maxStates ?? 200;
  const clock = options.clock ?? ((): number => Date.now());
  const deadline = options.durationMs === undefined ? null : clock() + options.durationMs;
  const onEvent = options.onEvent ?? ((): void => {});

  mkdirSync(dirname(options.outPath), { recursive: true });
  const seen = new Set<string>();
  const stats: RecordStats = { captured: 0, skipped: 0, path: options.outPath, byScreen: {} };

  while (stats.captured < maxStates) {
    if (deadline !== null && clock() > deadline) break;
    let state: GameState;
    try {
      state = parseGameState(await options.client.state());
    } catch (error) {
      onEvent(`state read failed: ${error instanceof Error ? error.message : String(error)}`);
      await sleep(intervalMs);
      continue;
    }

    const key = fingerprint(state);
    if (seen.has(key)) {
      stats.skipped += 1;
      await sleep(intervalMs);
      continue;
    }
    seen.add(key);

    const entry = {
      ts: new Date().toISOString(),
      fingerprint: key,
      screen: state.screen,
      session: `${state.session.mode}/${state.session.phase}`,
      state: state.raw,
      hash: stableStringify(state.raw).length,
    };
    try {
      appendFileSync(options.outPath, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (error) {
      onEvent(`could not write to ${options.outPath}: ${error instanceof Error ? error.message : String(error)}`);
      break;
    }
    stats.captured += 1;
    stats.byScreen[state.screen] = (stats.byScreen[state.screen] ?? 0) + 1;
    onEvent(`captured ${stats.captured}: ${state.screen} (${key})`);
    await sleep(intervalMs);
  }

  return stats;
}
