import { asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";

// YF0LXT1QSTGG A10 F48 T3-T5; silent-0021/0027/0028/0085.
// A deck component, an established power and poison on this phase are separate observations.
export function silentPhaseCurrentFacts(state: GameState): Record<string, JsonValue> {
  if (!state.in_combat || state.run?.ascension !== 10 || state.run.floor !== 48 ||
      str(asRecord(state.run.raw)["character_id"]).toLowerCase() !== "silent") return {};
  const combat = asRecord(state.raw["combat"]), player = asRecord(combat["player"]);
  if (!Array.isArray(combat["enemies"]) || combat["enemies"].length !== 1) return {};
  const enemy = asRecord(combat["enemies"][0]);
  const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
  if (enemy["enemy_id"] !== "TEST_SUBJECT" || enemy["is_alive"] !== true ||
      (enemy["max_hp"] !== 111 && enemy["max_hp"] !== 212) ||
      !finite(enemy["current_hp"]) || enemy["current_hp"] <= 0 || enemy["current_hp"] > enemy["max_hp"] ||
      !finite(player["block"]) || player["block"] < 0) return {};
  const amount = (raw: unknown, id: string): number | null => {
    if (!Array.isArray(raw)) return null;
    const entries = raw.map(asRecord);
    if (entries.some((entry) => typeof entry["power_id"] !== "string" || !finite(entry["amount"]))) return null;
    const found = entries.filter((entry) => entry["power_id"] === id);
    return found.length > 1 ? null : found.length === 0 ? 0 : found[0]!["amount"] as number;
  };
  const adaptable = amount(enemy["powers"], "ADAPTABLE_POWER");
  const poison = amount(enemy["powers"], "POISON_POWER");
  const accelerant = amount(player["powers"], "ACCELERANT_POWER");
  const fumes = amount(player["powers"], "NOXIOUS_FUMES_POWER");
  const dexterity = amount(player["powers"], "DEXTERITY_POWER");
  if (adaptable !== 1 || poison === null || poison < 0 || accelerant === null || accelerant < 0 ||
      fumes === null || fumes < 0 || dexterity === null) return {};
  // An absent or malformed pile is unknown, not proof that a component is absent.
  const count = (raw: unknown, id: string): number | null => {
    if (!Array.isArray(raw) || raw.some((card) => typeof asRecord(card)["card_id"] !== "string")) return null;
    return raw.filter((card) => asRecord(card)["card_id"] === id).length;
  };
  return { test_subject_current: {
    scope: "observed_current_snapshot",
    enemy_hp_now: enemy["current_hp"], enemy_max_hp_now: enemy["max_hp"], poison_now: poison,
    accelerant_established_now: accelerant, noxious_fumes_established_now: fumes,
    block_now: player["block"], dexterity_now: dexterity,
    components: ["ACCELERANT", "NOXIOUS_FUMES", "OUTBREAK"].map((id) => ({
      card_id: id, run_deck_count: count(state.run!.raw["deck"], id), hand_count: count(combat["hand"], id),
    })),
    poison_damage_already_dealt: null,
    note: "仅列本帧：牌组或手牌持有组件不等于能力已建立；当前毒层数也不等于已兑现毒伤。阶段变化后重新读取现场，不沿用上一阶段毒。现有格挡按现场值记录，不因后来取得敏捷倒补。后续施毒、抽弃牌与实际执行仍需另核。",
    ...(poison === 0 && accelerant > 0 ? {
      zero_poison_note: "触媒已建立，但当前敌人零毒，此刻没有现存毒可供追加结算；本栏没有预测候选后续施毒或整场收益。",
    } : {}),
  } };
}
