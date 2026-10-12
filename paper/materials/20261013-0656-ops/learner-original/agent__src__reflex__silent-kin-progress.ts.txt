import { asArray, asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { Plan } from "./turn-solver.js";

interface KinEnemy {
  index: number;
  id: string;
  hp: number;
  maxHp: number;
  strength: number;
  wail: number;
}

// ZTRGYYMLR8SC A10 F17 T1/T5/T7/T9: indices change when a follower leaves.
// These are snapshot facts, never persistent entity identities or inferred kill times.
function board(state: GameState): KinEnemy[] | null {
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent" ||
      state.run?.ascension !== 10 || state.run.floor !== 17 || !state.in_combat) return null;
  const raw = asRecord(state.raw["combat"])["enemies"];
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const enemies: KinEnemy[] = [];
  const indices = new Set<number>();
  for (const value of raw) {
    const e = asRecord(value);
    const id = str(e["enemy_id"]);
    if (id !== "KIN_FOLLOWER" && id !== "KIN_PRIEST") return null;
    const index = e["index"], hp = e["current_hp"], maxHp = e["max_hp"];
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || indices.has(index) ||
        typeof hp !== "number" || !Number.isFinite(hp) || hp < 0 ||
        typeof maxHp !== "number" || !Number.isFinite(maxHp) || maxHp <= 0 || hp > maxHp ||
        typeof e["is_alive"] !== "boolean" || !Array.isArray(e["powers"])) return null;
    indices.add(index);
    if (!e["is_alive"] || hp === 0) continue;
    const powers = asArray(e["powers"]).map(asRecord);
    const amount = (powerId: string): number | null => {
      const matches = powers.filter((p) => p["power_id"] === powerId);
      if (matches.length === 0) return 0;
      const n = matches[0]!["amount"];
      return matches.length === 1 && typeof n === "number" && Number.isFinite(n) ? n : null;
    };
    const strength = amount("STRENGTH_POWER"), wail = amount("PIERCING_WAIL_POWER");
    if (strength === null || wail === null) return null;
    enemies.push({ index, id, hp, maxHp, strength, wail });
  }
  return enemies.filter((e) => e.id === "KIN_PRIEST").length === 1 &&
    enemies.filter((e) => e.id === "KIN_FOLLOWER").length <= 2 ? enemies : null;
}

export function silentKinBoardFacts(state: GameState): Record<string, JsonValue> {
  const enemies = board(state);
  if (!enemies) return {};
  return { kin_current_board: {
    scope: "observed_current_snapshot",
    living_count: enemies.length,
    hp_sum: enemies.reduce((sum, e) => sum + e.hp, 0),
    priest_hp: enemies.find((e) => e.id === "KIN_PRIEST")!.hp,
    followers_hp_sum: enemies.filter((e) => e.id === "KIN_FOLLOWER").reduce((sum, e) => sum + e.hp, 0),
    enemies: enemies.map((e) => ({ index_now: e.index, enemy_id: e.id, hp: e.hp,
      max_hp: e.maxHp, strength_now: e.strength, piercing_wail_now: e.wail })),
    note: "本栏只汇总当前可见活敌；全部敌血包含信徒，神官血另列。总血量不代表获胜必需伤害或安全时钟，群伤扣血不等于目标已退场。序号只对应本帧，退场后会重排，不能据同序号推跨帧身份或精确击杀回合。",
    ...(enemies.some((e) => e.wail === 6) ? {
      temporary_strength_note: "本角色同族实盘已见尖啸6的暂减力在下一玩家回合恢复；当前低力量不能当永久削弱。这里只列现场层数，不预支未来攻击或击杀收益。",
    } : {}),
  } };
}

export function silentKinPlanFacts(state: GameState, plan: Plan): Record<string, JsonValue> {
  const enemies = board(state);
  if (!enemies) return {};
  const after = enemies.map((enemy) => {
    const matches = plan.outcome.enemyHpAfter.filter((e) => e.index === enemy.index);
    const hp = matches[0]?.hp;
    return matches.length === 1 && typeof hp === "number" && Number.isFinite(hp) ? Math.max(0, hp) : null;
  });
  const complete = after.every((hp) => hp !== null);
  return { kin_modelled_progress: {
    scope: "current_turn_model",
    complete_enemy_rows: complete,
    hp_sum_after: complete ? after.reduce<number>((sum, hp) => sum + hp!, 0) : null,
    living_count_after: complete ? after.filter((hp) => hp! > 0).length : null,
    removed_count: complete ? after.filter((hp) => hp === 0).length : null,
    unmodelled_cards: [...plan.outcome.unknownCards],
    draw_replan: plan.outcome.cardsDrawn > 0,
    note: "仅汇总本候选对当前这些目标的回合模型结果，按本帧序号对应；预测退场不是实际退场，抽牌后重算和未建模收益仍有限制。没有完整逐敌结果时总量未知，不按缺行补零，也不据此指定目标顺序。",
  } };
}
