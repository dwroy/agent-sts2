/** H2 is an observer; an on request cannot activate a decision path. */
export function humanPaceH2Policy(character: string | null, env = process.env) {
  const requested = env["HUMAN_PACE_H2"] ?? "shadow";
  return { mode: character?.toLowerCase() === "silent" && requested !== "off" ? "shadow" as const : "off" as const,
    requested, delivered: false as const, execution: "shadow_jev_card" as const };
}
