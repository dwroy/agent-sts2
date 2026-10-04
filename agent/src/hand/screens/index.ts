/** Screen router (PLAN.md §2.1 fact 6: `session` first, then `screen`). */

import type { Decision, DecisionEnv } from "../../memory/types.js";
import { planChest } from "./chest.js";
import { planCombat } from "../../reflex/combat.js";
import { fightKey } from "../../memory/fight-plan.js";
import { guardSandpit, planCombatTurn } from "../../reflex/combat-plan.js";
import { planEvent } from "./event.js";
import { planMap } from "./map.js";
import { planBundle, planCapstone, planCharacterSelect, planCloseCardsView, planCrystalSphere, planMenu, planTimeline } from "./misc.js";
import { planRest } from "./rest.js";
import { planReward } from "./reward.js";
import { planSelection } from "./selection.js";
import { planShop } from "./shop.js";

const PAUSE_PAGES = new Set([
  "PAUSE_MENU",
  "SETTINGS",
  "COMPENDIUM",
  "RELIC_COLLECTION",
  "POTION_LAB",
  "BESTIARY",
  "STATS",
  "RUN_HISTORY",
  "CARD_LIBRARY",
  "FEEDBACK",
]);

const CARD_VIEWS = new Set(["CARDS_VIEW", "CARD_PILE", "CARD_INSPECT", "RELIC_INSPECT"]);

export type PlanOutcome =
  | { kind: "decision"; decision: Decision }
  | { kind: "wait"; reason: string }
  /** The loop must stop and hand control back to a human (PLAN.md §9). */
  | { kind: "blocked"; reason: string }
  | { kind: "unsupported"; reason: string };

/**
 * Prompts that turn tutorials on or change settings. Confirming one is a lasting side effect the
 * player did not ask for, so the loop refuses and hands back to a human instead
 * (`ALLOW_FTUE_MODALS=true` opts in). Informational prompts such as `NCombatRulesFtue` are not
 * matched: they must be dismissed to keep playing and change nothing.
 */
export const SETTING_CHANGING_MODAL = /tutorial/i;

export function planDecision(env: DecisionEnv): PlanOutcome {
  const { screen, session } = env.state;

  // Single-player only (decision #1 in PLAN.md). Never guess at co-op semantics.
  if (screen === "COMBAT" || screen === "MAP" || screen === "REWARD") {
    if (session.mode !== "singleplayer") {
      return { kind: "wait", reason: `session.mode is "${session.mode}"; this project only drives single-player runs` };
    }
  }

  if (PAUSE_PAGES.has(screen)) {
    // `CARD_LIBRARY` is reachable from the pause menu and from a run; the mod offers one action there.
    if (env.state.available_actions.includes("close_main_menu_submenu")) {
      return {
        kind: "decision",
        decision: {
          kind: "act",
          label: "pause/close_submenu",
          intent: { action: "close_main_menu_submenu" },
          rationale: "stepping back out of a pause-menu page",
        },
      };
    }
    return { kind: "wait", reason: `human pause page ${screen}: a person resumes this` };
  }

  if (CARD_VIEWS.has(screen)) {
    const decision = planCloseCardsView(env);
    return decision ? { kind: "decision", decision } : { kind: "wait", reason: `no close action on ${screen}` };
  }

  let decision: Decision | null = null;
  switch (screen) {
    case "COMBAT":
      decision = env.combatPlanner === "card" ? guardSandpit(env, planCombat(env)) : turnStartUnsettled(env) ? null : planCombatTurn(env);
      break;
    case "MAP":
      decision = planMap(env);
      break;
    case "REWARD":
      decision = planReward(env);
      break;
    case "CARD_SELECTION":
      decision = planSelection(env);
      break;
    case "SHOP":
    case "FAKE_MERCHANT":
      decision = planShop(env);
      break;
    case "EVENT":
      decision = planEvent(env);
      break;
    case "REST":
      decision = planRest(env);
      break;
    case "CHEST":
      decision = planChest(env);
      break;
    case "CRYSTAL_SPHERE":
      decision = planCrystalSphere(env);
      break;
    case "BUNDLE_SELECTION":
      decision = planBundle(env);
      break;
    case "CAPSTONE_SELECTION":
      decision = planCapstone(env);
      break;
    case "CHARACTER_SELECT":
    case "MULTIPLAYER_LOBBY":
      decision = planCharacterSelect(env);
      break;
    case "TIMELINE":
      decision = planTimeline(env);
      break;
    case "MAIN_MENU":
    case "GAME_OVER":
    case "UNLOCK":
      decision = planMenu(env);
      break;
    case "MODAL": {
      const modal = env.state.raw["modal"];
      const typeName =
        typeof modal === "object" && modal !== null ? String((modal as Record<string, unknown>)["type_name"] ?? "") : "";
      if (!env.allowFtueModals && SETTING_CHANGING_MODAL.test(typeName)) {
        return {
          kind: "blocked",
          reason:
            `the game is showing the prompt "${typeName}", which turns tutorials or settings on. ` +
            "The loop will not answer it: dismiss it in-game, or set ALLOW_FTUE_MODALS=true to let it click.",
        };
      }
      decision = planMenu(env);
      break;
    }
    default:
      return { kind: "unsupported", reason: `no planner for screen "${screen}"` };
  }

  if (decision) return { kind: "decision", decision };
  return { kind: "wait", reason: `waiting on ${screen} (transition, animation, or nothing legal yet)` };
}

/**
 * Turn-start settle guard. The mod reports combat actions as ready while the game is still running
 * the start of the player's turn: on live runs the loop saw 0 energy and only the two Toxic cards an
 * enemy had just added, declared "no playable cards" and ended the turn before the real draw and
 * energy arrived — skipping whole turns (runs 4 and 5, floor 22/31, fatal).
 *
 * Timing from the turn-number change did not work: the number flips during the enemy turn, so by
 * the time the draw landed the wait had long expired and ~50 turns in 4 runs were planned from a
 * partial hand (G7EJ T9 ended a boss turn holding one Defend of five). So until a card has been
 * played this turn, the hand size and energy must hold still for a while before they are trusted:
 * 700 ms normally, 1.5 s for a hand under 5 cards, 3 s for no energy or a junk-only hand.
 */
/** The longest a new fight's first frames may show only the last fight's counters before we act anyway. */
export const STALE_FIGHT_WAIT_MS = 30_000;

export function turnStartUnsettled(env: DecisionEnv, now = Date.now()): boolean {
  const combat = (env.state.raw["combat"] ?? {}) as Record<string, unknown>;
  const player = (combat["player"] ?? {}) as Record<string, unknown>;
  const turn = env.state.turn;
  const played = Number(player["cards_played_this_turn"] ?? 0);
  const energy = Number(player["energy"] ?? 0);
  const hand = Array.isArray(combat["hand"]) ? (combat["hand"] as Record<string, unknown>[]) : [];
  // The board is keyed by fight: the last fight ended on the same "T1, no hand, no energy" frame a new
  // fight's first frame shows, so without the key that frame counted as long stable (YKFW F14 T1: the
  // turn was ended 0.5 s after the map click with F13's "3 cards played", no card played).
  const fight = `${String(env.state.raw["run_id"] ?? "")}:${fightKey(env.state)}`;
  const staleStart = hand.length === 0 && energy === 0;
  const seen = env.screenMemory.turnBoard;
  if (!seen || seen.fight !== fight || seen.turn !== turn || seen.handLen !== hand.length || seen.energy !== energy) {
    const live = seen?.fight === fight && seen.live === true;
    env.screenMemory.turnBoard = { fight, live, turn, handLen: hand.length, energy, changedAt: now };
  }
  const board = env.screenMemory.turnBoard!;
  if (!staleStart) board.live = true;
  // Cards played this turn means the draw has landed, except on a frame with no hand and no energy: at
  // a fight's start that is the previous fight's counters (M75J F37 T1, TXKE F38: "1 card played", 0
  // energy, empty hand; the turn was ended at once, 4 energy and a 5-card hand lost to a 16 hit).
  if (played > 0 && !staleStart) return false;
  if (staleStart && (turn ?? 1) <= 1) {
    // Until this fight has shown a hand or energy, its counters are the last fight's: wait for the real
    // draw (a long cap only so a restart onto an emptied T1 hand cannot hang).
    if (!board.live) return now - board.changedAt < STALE_FIGHT_WAIT_MS;
    return now - board.changedAt < 5_000;
  }
  // What the premature reads looked like: no energy yet, or a hand holding only the Status/Curse cards
  // an enemy just added (the real draw not in yet).
  const onlyJunk =
    hand.length > 0 &&
    hand.every((card) => {
      const type = env.knowledge.card(String(card["card_id"] ?? ""))?.type ?? "";
      return type === "Status" || type === "Curse";
    });
  const stableFor = now - env.screenMemory.turnBoard!.changedAt;
  if (energy === 0 || onlyJunk) return stableFor < 3_000;
  // A short hand is usually the draw still animating (run 8: planned the turn from a one-card hand
  // while four more cards were landing).
  if (hand.length < 5) return stableFor < 1_500;
  return stableFor < 700;
}
