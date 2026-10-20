/** W1 parses and records intent only. Consumers are introduced by W3–W8. */
export function v6Config(env: NodeJS.ProcessEnv = process.env) {
  const invalid: string[] = [];
  function choice<const T extends readonly string[]>(name: string, values: T, fallback: T[number]): T[number] {
    const raw = env[name];
    if (raw === undefined || raw === "") return fallback;
    if (values.includes(raw)) return raw;
    invalid.push(name); return fallback;
  }
  function numeric(name: string, fallback: number, min: number, max: number, integer = false): number {
    const raw = env[name];
    if (raw === undefined || raw === "") return fallback;
    const n = Number(raw);
    if (raw.trim() && Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n))) return n;
    invalid.push(name); return fallback;
  }
  const mode = choice("V6_BUILD", ["off", "shadow", "on"], "off");
  const deciders = Object.fromEntries(["CARD", "POTION", "SHOP", "REST"].map(kind =>
    [kind.toLowerCase(), choice(`V6_${kind}_DECIDER`, ["brain", "jev"], "brain")])) as Record<"card" | "potion" | "shop" | "rest", "brain" | "jev">;
  const reflex = choice("V6_REFLEX", ["off", "shadow", "on"], "off");
  const direction_replan = choice("V6_DIRECTION_REPLAN", ["off", "on"], "off");
  const win = {
    certain_win: numeric("V6_WIN_CERTAIN_WIN", .95, 0, 1), favored: numeric("V6_WIN_FAVORED", .70, 0, 1),
    even: numeric("V6_WIN_EVEN", .30, 0, 1), unfavored: numeric("V6_WIN_UNFAVORED", .05, 0, 1),
  };
  if (!(win.certain_win > win.favored && win.favored > win.even && win.even > win.unfavored)) {
    invalid.push("V6_WIN_* ordering"); Object.assign(win, { certain_win: .95, favored: .70, even: .30, unfavored: .05 });
  }
  const delta = { much_se: numeric("V6_DELTA_MUCH_SE", 2, 0, 100), better_se: numeric("V6_DELTA_BETTER_SE", 1, 0, 100),
    much_min: numeric("V6_DELTA_MUCH_MIN", .05, 0, 1) };
  if (delta.much_se < delta.better_se) { invalid.push("V6_DELTA_* ordering"); delta.much_se = 2; delta.better_se = 1; }
  return {
    schema: "v6-config-v1" as const, mode, deciders, reflex, direction_replan,
    admission: "interfaces_only" as const, delivered: false as const,
    samples_pick: numeric("V6_SAMPLES_PICK", 20, 1, 10000, true), samples_act: numeric("V6_SAMPLES_ACT", 100, 1, 10000, true),
    min_known_option_ratio: numeric("V6_MIN_KNOWN_OPTION_RATIO", .50, 0, 1),
    direction_min_weight: numeric("V6_DIRECTION_MIN_WEIGHT", .10, 0, 1), win, delta,
    triggers: {
      t1_core_min: numeric("V6_T1_CORE_MIN", .30, 0, 1), t2_se: numeric("V6_T2_SE", 2, 0, 100),
      t2_min_delta: numeric("V6_T2_MIN_DELTA", .05, 0, 1), t2_consecutive: numeric("V6_T2_CONSECUTIVE", 2, 1, 100, true),
      t3_weight_max: numeric("V6_T3_WEIGHT_MAX", .20, 0, 1), t5_hazard: "existing_route_projection" as const,
      t6_unknown_max: numeric("V6_T6_UNKNOWN_MAX", .50, 0, 1), t6_fallbacks: numeric("V6_T6_FALLBACKS", 2, 1, 100, true),
      t7_checkpoint: "validated_brain_answer" as const,
    },
    budgets: {
      brain_soft_cap: numeric("V6_BRAIN_SOFT_CAP", 15, 1, 1000, true), brain_ms: numeric("V6_BRAIN_MS", 90000, 1, 600000, true),
      act_ms: numeric("V6_ACT_MS", 60000, 1, 600000, true), pick_ms: numeric("V6_PICK_MS", 5000, 1, 600000, true),
      // Construction requests have their own allowance; combat keeps its existing budget.
      jev_ms: numeric("V6_JEV_MS", mode === "off" ? 1000 : 5000, 1, mode === "off" ? 600000 : 5000, true),
    },
    invalid,
  };
}
export type V6Config = ReturnType<typeof v6Config>;
