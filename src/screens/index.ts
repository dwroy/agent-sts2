/** Screen router (PLAN.md §2.1 fact 6: `session` first, then `screen`). */

import type { Decision, DecisionEnv } from "../project/types.js";
import { planChest } from "./chest.js";
import { planCombat } from "./combat.js";
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
  | { kind: "unsupported"; reason: string };

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
      decision = planCombat(env);
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
    case "MODAL":
      decision = planMenu(env);
      break;
    default:
      return { kind: "unsupported", reason: `no planner for screen "${screen}"` };
  }

  if (decision) return { kind: "decision", decision };
  return { kind: "wait", reason: `waiting on ${screen} (transition, animation, or nothing legal yet)` };
}
