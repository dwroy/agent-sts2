import { asArray, asRecord, bool, num, str } from "../core/util/json.js";

/** VLZ6CCT8AQ0A A10 F35/F43: only these observed plain-to-upgraded pairs. */
const PAIRS: Record<string, { cost?: [number, number]; vars: Record<string, [number, number]> }> = {
  DEFEND_SILENT: { vars: { Block: [5, 8] } },
  STRIKE_SILENT: { vars: { Damage: [6, 9] } },
  DAGGER_SPRAY: { vars: { Damage: [4, 6] } },
  TOOLS_OF_THE_TRADE: { cost: [1, 0], vars: {} },
  SUCKER_PUNCH: { vars: { Damage: [8, 10], WeakPower: [1, 2] } },
  FASTEN: { vars: { ExtraBlock: [4, 6] } },
  PIERCING_WAIL: { vars: { StrengthLoss: [6, 8] } },
  // F43 T2's upgraded draw, paired with this run's plain two-point F45 copies.
  NOXIOUS_FUMES: { vars: { PoisonPerTurn: [2, 3] } },
};

/** No inferred upgrade for modified values, costs, text effects, or cards absent from the paired evidence. */
export function observedApotheosisUpgrade(card: Record<string, unknown>): Record<string, unknown> | null {
  if (bool(card["upgraded"]) || num(card["energy_cost"]) !== 1 || bool(card["costs_x"])) return null;
  const pair = PAIRS[str(card["card_id"])];
  if (!pair || /重放|replay/i.test(str(card["resolved_rules_text"])) || card["enchantment"] != null) return null;
  const values = asArray(card["dynamic_values"]).map(asRecord);
  if (values.length !== Object.keys(pair.vars).length) return null;
  for (const [name, [plain]] of Object.entries(pair.vars)) {
    const value = values.find((entry) => entry["name"] === name);
    // The source hand has one Strength; pile cards carry their printed number instead.
    if (!value || value["base_value"] !== plain || value["enchanted_value"] !== plain ||
      ![plain, ...(name === "Damage" ? [plain + 1] : [])].includes(num(value["current_value"], NaN))) return null;
  }
  return {
    ...card, upgraded: true, energy_cost: pair.cost?.[1] ?? card["energy_cost"],
    dynamic_values: values.map((value) => {
      const [plain, upgraded] = pair.vars[str(value["name"])]!;
      return { ...value, base_value: upgraded, enchanted_value: upgraded,
        current_value: num(value["current_value"]) + upgraded - plain };
    }),
  };
}
