/**
 * The SL retry compute memo (2026-10-04, combat latency; docs/sl.md §10.6). An SL retry plays the same boards again: the
 * fight restarts from the room-entry save with the same draw order, and SL_RETRY_EXPLORE_REPLAY replays the reference
 * attempt's lines up to its deviation point, so the questions on the way ask the same rollout and the same B2 whole-fight
 * simulation on the same input. V4.6's two boss fights (AKK09TEEEXKD F17 Waterfall Giant and V8N5C1DCXYN8 F17 The Kin, six
 * attempts each) asked 65 of their 284 plan questions on a board an earlier attempt had planned, and 63 of those
 * rollouts and 56 of those B2 runs came out byte-identical: 155 s of rollout and 323 s of B2 (248 s of it runs that were
 * not cut by their deadline) spent recomputing a known answer, ~27% of the 1794 s the V4.6 plan questions took.
 *
 * The memo keeps those results for the fight and hands them back on the same input. A result is kept only when no clock
 * shaped it, and handed back only when the clock could not shape it now either:
 * - the rollout (rollout-live.ts liveRollout): a result with nothing cut (`degraded` empty), handed back when this
 *   question's budget is at least the least budget the stored run's clock checks needed (RolloutResult.budgetNeedMs:
 *   an identical rerun with that much is cut nowhere);
 * - B2 (boss-lines.ts bossLineSim): a run that finished every sample (not timed out), handed back when this question's
 *   deadline is at least the time it took.
 * The time a hit stands for is charged to the turn's budgets as if it had run (SL_RETRY_COMPUTE's turn, B2's turn), and
 * B2's note shows that time: the next question of the turn gets the budget it would have had, so every number, ranking
 * and question is the one the computation itself gives (frozen-clock replays: tools/combat-latency-replay.ts --cache,
 * tests/compute-memo.test.ts). Only the wall clock changes (the decision log's rollout.ms and boss_sim.ms are the real
 * time; their `memo` field the time charged).
 *
 * The key is the SHA-256 of the input (canonicalText: JSON with Maps, Sets, undefined, NaN, the infinities and -0 told
 * apart, keys in their order, and every object met again written as a reference to its first place: which objects are the
 * same one, as the code compares plans by identity), the planner's process-wide switches, and the shared data tables by
 * identity (the same loaded object). Not the structured-clone bytes (node:v8 serialize), which also carry how V8 stores
 * each string inside (one or two bytes a character): equal inputs gave unequal bytes (V8N5C1DCXYN8 F17 T1, attempts 2 and
 * 3: the same JSON, 263438 against 264974 bytes), so equal boards never matched. An input with a function in it is not
 * memoised.
 *
 * Scope: one fight (`run:act:floor`), the retried fights only (the planner passes the memo when env.sl is set); a new
 * fight drops it. At most COMPUTE_MEMO_MAX_BYTES of results (serialized, off the V8 heap), the oldest dropped first.
 * Switch: SL_RETRY_MEMO=off (computeMemoOptions.enabled) leaves every question to compute as before.
 */
import { createHash } from "node:crypto";
import { deserialize, serialize } from "node:v8";

import { ascAmountOptions } from "../knowledge/monster-db.js";
import { cardConditionOptions, pileCostOptions, playFirstOptions, potionCardCostOptions } from "../strategy/card-model.js";
import { passivePiecesOptions } from "../strategy/passive-pieces.js";
import { potionCostOptions } from "../strategy/potion-cost.js";
import { dataVersion } from "../util/data-version.js";

/** Results kept a fight (serialized bytes). */
export const COMPUTE_MEMO_MAX_BYTES = 512 * 1024 * 1024;

export const computeMemoOptions: { enabled: boolean; maxBytes: number } = {
  enabled: process.env["SL_RETRY_MEMO"] !== "off",
  maxBytes: COMPUTE_MEMO_MAX_BYTES,
};

interface Entry<M> {
  bytes: Buffer;
  meta: M;
}

/** One fight's memo: keyed results, oldest first. */
export class ComputeMemo {
  readonly scope: string;
  private readonly entries = new Map<string, Entry<unknown>>();
  private bytes = 0;
  /** Counters for the log and the tests. */
  hits = 0;
  misses = 0;
  stores = 0;

  constructor(scope: string) {
    this.scope = scope;
  }

  /** The stored value and its meta (a fresh copy each time: the caller may change it), or null. */
  get<T, M>(key: string): { value: T; meta: M } | null {
    const entry = this.entries.get(key) as Entry<M> | undefined;
    if (!entry) {
      this.misses += 1;
      return null;
    }
    return { value: deserialize(entry.bytes) as T, meta: entry.meta };
  }

  /** A hit taken (get() then the caller's own condition). */
  took(): void {
    this.hits += 1;
  }

  /** Stores `value` (structured-clone copy) under `key`; false when it cannot be cloned or is larger than the cap. */
  set<M>(key: string, value: unknown, meta: M): boolean {
    let bytes: Buffer;
    try {
      bytes = serialize(value);
    } catch {
      return false;
    }
    if (bytes.length > computeMemoOptions.maxBytes) return false;
    const old = this.entries.get(key);
    if (old) {
      this.bytes -= old.bytes.length;
      this.entries.delete(key);
    }
    this.entries.set(key, { bytes, meta });
    this.bytes += bytes.length;
    this.stores += 1;
    for (const [k, entry] of this.entries) {
      if (this.bytes <= computeMemoOptions.maxBytes) break;
      this.entries.delete(k);
      this.bytes -= entry.bytes.length;
    }
    return true;
  }

  get size(): number {
    return this.entries.size;
  }

  get storedBytes(): number {
    return this.bytes;
  }
}

let current: ComputeMemo | null = null;

/** The memo of the fight `scope` (a new fight's drops the last one's); null with the switch off. */
export function computeMemoFor(scope: string): ComputeMemo | null {
  if (!computeMemoOptions.enabled) return null;
  if (current?.scope !== scope) current = new ComputeMemo(scope);
  return current;
}

/** The memo now (tools, tests): null when there is none. */
export function currentComputeMemo(): ComputeMemo | null {
  return current;
}

/** Out of the retried fights: the memo goes. */
export function dropComputeMemo(): void {
  current = null;
}

const tokens = new WeakMap<object, number>();
let nextToken = 1;

/** A shared object (a loaded data table, a function) by identity: the same object, the same number. */
export function identityToken(value: object | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  let token = tokens.get(value);
  if (token === undefined) {
    token = nextToken;
    nextToken += 1;
    tokens.set(value, token);
  }
  return token;
}

/**
 * The process-wide switches the solver, the rollout and the simulator read (tests flip them; play sets them at start), and
 * the version of the data tables (a test's setter swapped one: util/data-version.ts).
 */
function switches(): string {
  return `${[ascAmountOptions.enabled, playFirstOptions.enabled, pileCostOptions.relics, potionCardCostOptions.relics, passivePiecesOptions.enabled, potionCostOptions.enabled, cardConditionOptions.enabled].map((on) => (on ? 1 : 0)).join("")}:${dataVersion()}`;
}

/** A tagged stand-in for what JSON would drop or merge (it cannot be an input's own value: its key is a NUL). */
const TAG = "\u0000";

/**
 * The canonical text of a value: JSON, with what plain JSON would drop or confuse spelled out (undefined, NaN, the
 * infinities, -0, Maps, Sets, Dates, typed arrays), and an object met a second time written as {"\u0000": "ref", at: n}
 * (n: the order it was first met in), so the text says which objects are one (as structured clone keeps them). Equal
 * values with the same sharing give equal text, however V8 stores their strings; object keys in their own order (another
 * order: another key, a miss). Throws on a function, a symbol or a bigint (not memoisable).
 */
export function canonicalText(value: unknown): string {
  const seen = new Map<object, number>();
  return JSON.stringify(value, function (this: unknown, key: string, v: unknown) {
    const raw = (this as Record<string, unknown>)[key];
    if (raw !== null && typeof raw === "object") {
      const at = seen.get(raw);
      if (at !== undefined) return { [TAG]: "ref", at };
      seen.set(raw, seen.size);
    }
    if (raw instanceof Map) return { [TAG]: "map", entries: [...raw.entries()] };
    if (raw instanceof Set) return { [TAG]: "set", values: [...raw.values()] };
    if (raw instanceof Date) return { [TAG]: "date", time: raw.getTime() };
    if (ArrayBuffer.isView(raw)) return { [TAG]: raw.constructor.name, values: Array.from(raw as unknown as ArrayLike<number>) };
    if (v === undefined) return { [TAG]: "undefined" };
    if (typeof v === "number") {
      if (Number.isNaN(v)) return { [TAG]: "NaN" };
      if (v === Infinity) return { [TAG]: "+Infinity" };
      if (v === -Infinity) return { [TAG]: "-Infinity" };
      if (Object.is(v, -0)) return { [TAG]: "-0" };
    }
    if (typeof v === "function" || typeof v === "symbol" || typeof v === "bigint") throw new Error(`not memoisable: a ${typeof v} at ${key || "the top"}`);
    return v;
  });
}

/** The key of `value` for `kind`, or null when it cannot be keyed (a function in it). */
export function memoKey(kind: string, value: unknown): string | null {
  try {
    return `${kind}:${createHash("sha256").update(switches()).update(TAG).update(canonicalText(value)).digest("hex")}`;
  } catch {
    return null;
  }
}
