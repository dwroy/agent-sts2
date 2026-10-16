/** G2 starts in shadow; an on request cannot bypass its natural-run/report admission. */
import { characterKey } from "../knowledge/files.js";

export function globalBuildPolicy(character: string | null | undefined, env: NodeJS.ProcessEnv = process.env): {
  mode: "off" | "shadow"; requested: "off" | "shadow" | "on"; admission: "pending_two_natural_shadow" | "not_applicable";
} {
  if (characterKey(character) !== "silent") return { mode: "off", requested: "off", admission: "not_applicable" };
  const raw = env["GLOBAL_BUILD_EVAL"]?.trim().toLowerCase() ?? "shadow";
  const requested = raw === "on" || raw === "shadow" ? raw : "off";
  return { mode: requested === "off" ? "off" : "shadow", requested, admission: "pending_two_natural_shadow" };
}
