import { asArray, asRecord, bool, num, str } from "../core/util/json.js";

/** VLZ6CCT8AQ0A A10 F35/F43/F45: only these observed plain-to-upgraded pairs. */
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
  // F43 T4's later draw establishes two extra triggers; F45's plain copy establishes one.
  ACCELERANT: { vars: { Accelerant: [1, 2] } },
  // F35 T1's visible pile pair, confirmed by F43 T2's five-damage, two-Weak play at one Strength.
  NEUTRALIZE: { cost: [0, 0], vars: { Damage: [3, 4], WeakPower: [1, 2] } },
  // F35/F43 T3's later draw grants three Dexterity; F45's plain copy grants two.
  FOOTWORK: { vars: { DexterityPower: [2, 3] } },
  // F43 T4: printed Block changes while the two draws remain unchanged.
  BACKFLIP: { vars: { Block: [5, 8], Cards: [2, 2] } },
  // F35 T4 and F43 T5's upgraded draw, paired with F45 T1's ordinary card.
  SURVIVOR: { vars: { Block: [8, 11] } },
  // F43 T5: the plain deck stays 6/3; the upgraded draw applies seven damage under Weak and four Poison.
  POISONED_STAB: { vars: { Damage: [6, 8], PoisonPower: [3, 4] } },
  // F43 T1's plain deck card and T5's upgraded draw; the card was not played that turn.
  SNAKEBITE: { cost: [2, 2], vars: { PoisonPower: [7, 10] } },
};

/** No inferred upgrade for modified values, costs, text effects, or cards absent from the paired evidence. */
export function observedApotheosisUpgrade(card: Record<string, unknown>): Record<string, unknown> | null {
  if (bool(card["upgraded"]) || bool(card["costs_x"])) return null;
  const pair = PAIRS[str(card["card_id"])];
  if (!pair || num(card["energy_cost"], NaN) !== (pair.cost?.[0] ?? 1) ||
    /重放|replay/i.test(str(card["resolved_rules_text"])) || card["enchantment"] != null) return null;
  if (str(card["card_id"]) === "SNAKEBITE" &&
    (str(card["rules_text"]) !== "给予{PoisonPower:diff()}层中毒。" ||
      str(card["resolved_rules_text"]).replace(/\s+/g, "") !== "保留。给予7层中毒。")) return null;
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
    ...(str(card["card_id"]) === "SNAKEBITE" ? { resolved_rules_text: "保留。 给予10层中毒。" } : {}),
    dynamic_values: values.map((value) => {
      const [plain, upgraded] = pair.vars[str(value["name"])]!;
      return { ...value, base_value: upgraded, enchanted_value: upgraded,
        current_value: num(value["current_value"]) + upgraded - plain };
    }),
  };
}
