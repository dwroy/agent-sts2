import type { Decision } from "../memory/types.js";
import { v6Config } from "./config.js";

/** W5 replaces the Jev card entries. This switch only removes per-card brain routing. */
export function routeV6CardDecision(decision: Decision, inCombat = false): Decision {
  const config = v6Config();
  if (inCombat || config.mode !== "on" || config.deciders.card !== "jev" || decision.kind !== "ask"
    || !["reward/card", "selection/add", "selection/choose"].includes(decision.label)) return decision;
  const { deepseek: _brain, escalate: _escalate, ...jev } = decision;
  return jev;
}
