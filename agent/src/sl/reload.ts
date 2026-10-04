/**
 * SL's reload (docs/sl.md §3): leave the fight for the main menu with `save_and_quit`, press `continue_run`, and
 * check that the game is back in the same run, on the same floor, in the same fight. The game restarts a fight
 * from the save it wrote on entering the room (the genre's rule, Dai 2026-10-02), so nothing here reads or writes
 * a save file. Every step has a deadline; the first one that fails ends the reload with its reason.
 */
import { dispatch } from "../hand/act/dispatch.js";
import type { ModClient } from "../hand/mod/client.js";
import type { GameState } from "../hand/mod/schema.js";
import { asArray, asRecord, str } from "../core/util/json.js";

export interface ReloadTarget {
  runId: string;
  floor: number | null;
  /** The fight's enemies at its start (encounterOf). */
  encounter: string;
}

export interface ReloadDeps {
  client: Pick<ModClient, "state" | "act">;
  /** Per step: how long to wait for the main menu, and then for the fight. */
  stepTimeoutMs: number;
  pollMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  note?: (message: string) => void;
}

export type ReloadStep = "save_and_quit" | "main_menu" | "continue_run" | "back_in_fight" | "verify";

export type ReloadOutcome =
  | { ok: true; ms: number; resumedTurn: number | null; menu: GameState; state: GameState }
  | { ok: false; ms: number; step: ReloadStep; reason: string; last: GameState | null };

/** The fight's enemies, sorted ids joined with "+" (alive or not: a reloaded fight starts with the same set). */
export function encounterOf(state: GameState): string {
  const ids = asArray(asRecord(state.raw["combat"])["enemies"]).map((enemy) => str(asRecord(enemy)["enemy_id"])).filter((id) => id.length > 0);
  return [...ids].sort().join("+");
}

/** How long (at most half the step's wait) the run may sit out of combat after continue_run before it counts as resumed elsewhere. */
const ELSEWHERE_MS = 10_000;

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function inRun(state: GameState): boolean {
  return state.session.phase === "run" && state.run !== null;
}

/** Leaving the run or the belt: legal on every in-run screen, never a decision of the fight's own. */
const NOT_A_FIGHT_DECISION = new Set(["save_and_quit", "discard_potion"]);

function fightReady(state: GameState): boolean {
  if (!inRun(state) || !state.in_combat || state.turn === null) return false;
  if (state.screen === "COMBAT") return state.combat?.can_use_combat_actions === true;
  // A choice the fight's first turn opens is the fight too (JW925EDF9ZTQ F48: Continue landed on T1's turn-start discard,
  // CARD_SELECTION with select_deck_card / confirm_selection; waiting for COMBAT timed out at 60 s and stopped SL for the
  // run, though the reload had worked). The loop answers the choice as on any turn.
  return state.available_actions.some((action) => !NOT_A_FIGHT_DECISION.has(action));
}

export async function reloadFight(target: ReloadTarget, start: GameState, deps: ReloadDeps): Promise<ReloadOutcome> {
  const sleep = deps.sleep ?? defaultSleep;
  const now = deps.now ?? Date.now;
  const pollMs = deps.pollMs ?? 500;
  const began = now();
  let last: GameState | null = start;
  const fail = (step: ReloadStep, reason: string): ReloadOutcome => ({ ok: false, ms: now() - began, step, reason, last });
  const act = async (action: string): Promise<string | null> => {
    try {
      const result = await dispatch(deps.client as ModClient, { action });
      deps.note?.(`SL: ${action} -> ${result.status}${result.message ? ` (${result.message})` : ""}`);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };
  /** Polls until `done` says yes (a state) or no (a reason), or the step's deadline passes. */
  const waitFor = async (step: ReloadStep, done: (state: GameState) => true | string | null): Promise<GameState | ReloadOutcome> => {
    const deadline = now() + deps.stepTimeoutMs;
    let why = "no state read";
    while (now() < deadline) {
      await sleep(pollMs);
      let state: GameState;
      try {
        state = await deps.client.state();
      } catch (error) {
        why = `state read failed: ${error instanceof Error ? error.message : String(error)}`;
        continue;
      }
      last = state;
      const verdict = done(state);
      if (verdict === true) return state;
      if (typeof verdict === "string") return fail(step, verdict);
      why = `still on ${state.screen}${inRun(state) ? ` (F${state.run?.floor ?? "?"}${state.in_combat ? `, T${state.turn ?? "?"}` : ""})` : ""}; actions: ${state.available_actions.join(", ") || "none"}`;
    }
    return fail(step, `timed out after ${Math.round(deps.stepTimeoutMs / 1000)} s: ${why}`);
  };

  if (!start.available_actions.includes("save_and_quit")) return fail("save_and_quit", "save_and_quit is not among the legal actions");
  // A failed request may still have gone through (the scene change can outlast the request's timeout): the next
  // step's wait decides, and its reason carries the request's error.
  const withError = (outcome: ReloadOutcome, error: string | null, action: string): ReloadOutcome =>
    error && !outcome.ok ? { ...outcome, reason: `${outcome.reason}; ${action} failed: ${error}` } : outcome;
  const quitError = await act("save_and_quit");

  // The main menu, out of the run, with the run to continue.
  const menu = await waitFor("main_menu", (state) => (state.screen === "MAIN_MENU" && !inRun(state) && state.available_actions.includes("continue_run") ? true : null));
  if (!("raw" in menu)) return withError(menu, quitError, "save_and_quit");

  const continueError = await act("continue_run");

  // Back in the run: the fight's first player phase, or somewhere else (a room that is not this fight) for good.
  let elsewhereSince: number | null = null;
  const back = await waitFor("back_in_fight", (state) => {
    if (fightReady(state)) return true;
    if (inRun(state) && !state.in_combat && state.screen !== "COMBAT") {
      elsewhereSince ??= now();
      // In the run but out of combat for a while (a loading frame or a room's entry is shorter): the run resumed elsewhere.
      return now() - elsewhereSince >= Math.min(ELSEWHERE_MS, deps.stepTimeoutMs / 2) ? `the run resumed on ${state.screen} (F${state.run?.floor ?? "?"}), not in the fight` : null;
    }
    elsewhereSince = null;
    return null;
  });
  if (!("raw" in back)) return withError(back, continueError, "continue_run");

  const runId = str(back.raw["run_id"]);
  if (runId !== target.runId) return fail("verify", `another run: ${runId || "none"} (expected ${target.runId})`);
  if ((back.run?.floor ?? null) !== target.floor) return fail("verify", `floor ${back.run?.floor ?? "?"} (expected ${target.floor ?? "?"})`);
  const encounter = encounterOf(back);
  if (encounter !== target.encounter) return fail("verify", `another fight: ${encounter || "no enemies"} (expected ${target.encounter})`);
  return { ok: true, ms: now() - began, resumedTurn: back.turn, menu, state: back };
}
