/**
 * Monster and encounter knowledge text (docs/v4-architecture.md §3), rendered from monster-db.json at the run's
 * ascension. The numbers come from monster-db.ts's lookups (monsterHpAt, moveDamageAt, shownDamageAt, countsAt,
 * amountAt, regularEffect, appliedPowerIds), so the brain reads the same facts the rollout and the boss clock use; a
 * number not logged at this ascension is scaled from the nearest one along the measured ratio chain and marked 「估」
 * (buffs, debuffs and block: the nearest one's counts, labelled, and the estimate the rollout uses).
 * Every number carries its n. Encounters list our record at every logged ascension.
 */

import { stripMarkup } from "../../util/json.js";
import {
  ON_DEATH_SPAWNS,
  amountEstimateNote,
  appliedPowerIds,
  countsAtAscension,
  monsterHpAt,
  moveAmountAt,
  moveDamageAt,
  regularEffect,
  shownDamageAt,
  startAmountAt,
  type AmountAt,
  type EncounterEntry,
  type MonsterEntry,
  type MoveEntry,
  type Threat,
} from "../monster-db.js";
import { STUN_MOVE, isStripStun, moveRules, type MoveRule, type ObservedMonster } from "../mechanics.js";
import { KnowledgeLookupError, loadKnowledgeData, type KnowledgeData, type RenderContext } from "./data.js";
import { cmp, countsText, numericKeys, pct, round1, signedValue, sortedCounts, statText, total } from "./format.js";

export const KIND_ZH: Record<string, string> = { boss: "boss", elite: "精英", hallway: "走廊", minion: "随从", unknown_room: "问号房" };
const KIND_ORDER = ["boss", "elite", "hallway", "unknown_room", "minion"];

const INTENT_ZH: Record<string, string> = {
  Attack: "攻击",
  Buff: "增益",
  Debuff: "减益",
  DebuffStrong: "强减益",
  CardDebuff: "卡牌减益",
  StatusCard: "塞牌",
  Defend: "格挡",
  Summon: "召唤",
  Stun: "眩晕",
  Sleep: "睡眠",
  DeathBlow: "致命一击",
  Heal: "回血",
  Escape: "逃跑",
  None: "无意图",
};

/** An intent shows when it was at least this share of the move's logged intents. */
const INTENT_MIN_SHARE = 0.2;
/** A Debuff on at least this many kinds of enemies is one we put on them (Vulnerable, Weak, Shrink…), not theirs. */
export const OUR_DEBUFF_MIN_MONSTERS = 5;
/** An enemy's own power: on at least this share of its fights (and on 2 at least). */
export const OWN_POWER_MIN_SHARE = 0.3;
/** Strength is shown as a power only when it is there from turn 1 (innate); gained Strength shows on the moves. */
const INNATE_STRENGTH = "STRENGTH_POWER";
/** Turns listed for a move before "…". */
const MAX_TURNS_SHOWN = 8;
/** Successors listed for a move before "…". */
const MAX_NEXT_SHOWN = 4;
/** A status card id shows when it was at least this share of the cards the move added. */
const STATUS_CARD_MIN_SHARE = 0.1;
/** Phase HP sequences shown for a multi-phase enemy. */
const MAX_PHASES_SHOWN = 3;

/* ---- names and lookups ------------------------------------------------------------------------ */

export function monsterNameOf(data: KnowledgeData, id: string): string {
  return data.monsterDb.monsters[id]?.name?.zh || id;
}

function powerNames(data: KnowledgeData): Map<string, string> {
  const cached = powerNameCache.get(data);
  if (cached) return cached;
  const names = new Map<string, string>();
  for (const id of Object.keys(data.monsterDb.monsters).sort(cmp)) {
    for (const [powerId, power] of Object.entries(data.monsterDb.monsters[id]!.powers ?? {})) {
      if (power.name && !names.has(powerId)) names.set(powerId, power.name);
    }
  }
  powerNameCache.set(data, names);
  return names;
}
const powerNameCache = new WeakMap<KnowledgeData, Map<string, string>>();

/** A power's Chinese name when some enemy carried it, else its id without the _POWER suffix. */
function powerName(data: KnowledgeData, id: string): string {
  return powerNames(data).get(id) ?? id.replace(/_POWER$/, "");
}

/** Debuffs we put on enemies (on OUR_DEBUFF_MIN_MONSTERS kinds of enemies or more): not their own mechanics. */
function ourDebuffs(data: KnowledgeData): Set<string> {
  const cached = ourDebuffCache.get(data);
  if (cached) return cached;
  const seen = new Map<string, number>();
  for (const monster of Object.values(data.monsterDb.monsters)) {
    for (const [id, power] of Object.entries(monster.powers ?? {})) if (power.type === "Debuff") seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  const out = new Set([...seen].filter(([, n]) => n >= OUR_DEBUFF_MIN_MONSTERS).map(([id]) => id));
  ourDebuffCache.set(data, out);
  return out;
}
const ourDebuffCache = new WeakMap<KnowledgeData, Set<string>>();

function primaryAct(acts: Record<string, number> | undefined): number {
  const top = sortedCounts(acts)[0];
  return top ? Number(top[0]) : 99;
}

function actsText(acts: Record<string, number> | undefined): string {
  const keys = numericKeys(acts);
  return keys.length > 0 ? `第${keys.join("/")}幕` : "幕未知";
}

function kindRank(kind: string | undefined): number {
  const index = KIND_ORDER.indexOf(kind ?? "");
  return index < 0 ? KIND_ORDER.length : index;
}

/** Monster ids for an id or a name: exact id (any case, a `_BOSS` suffix dropped), exact name, then substrings. */
export function resolveMonsterIds(data: KnowledgeData, query: string): string[] {
  const monsters = data.monsterDb.monsters;
  const raw = query.trim();
  if (!raw) return [];
  const upper = raw.toUpperCase();
  for (const id of [upper, upper.replace(/_BOSS$/, "")]) if (monsters[id]) return [id];
  const ids = Object.keys(monsters).sort(cmp);
  const byName = ids.filter((id) => monsters[id]!.name?.zh === raw);
  if (byName.length > 0) return byName;
  return ids.filter((id) => id.includes(upper) || (monsters[id]!.name?.zh ?? "").includes(raw));
}

/* ---- one monster ------------------------------------------------------------------------------ */

function hpLine(data: KnowledgeData, id: string, asc: number): string {
  const hp = monsterHpAt(data.monsterDb.monsters, id, asc);
  if (!hp) return "血量: 无记录";
  const range = hp.min !== undefined && hp.max !== undefined && hp.min !== hp.max ? `，范围 ${round1(hp.min)}–${round1(hp.max)}` : "";
  if (!hp.estimated) return `血量 A${asc}: ${hp.hp} (n=${hp.n}${range})`;
  const short = hp.ratioTo !== undefined && hp.ratioTo !== asc ? `，A${hp.ratioTo}→A${asc} 未测按×1` : "";
  const ratio = hp.ratioN !== undefined ? `×${hp.ratio.toFixed(2)}（比例基于 ${hp.ratioN} 种怪${short}）` : `×1（A${hp.from}→A${asc} 无实测比例，按×1）`;
  return `血量 A${asc}: 估 ${hp.hp}（A${hp.from} 中位 ${round1(hp.logged)} (n=${hp.n}${range}) ${ratio}）`;
}

function phasesLine(monster: MonsterEntry, asc: number): string | null {
  const at = countsAtAscension(monster.phases_by_asc, undefined, asc);
  const entries = Object.entries(at.counts ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || b[0].split(">").length - a[0].split(">").length || cmp(a[0], b[0]));
  if (entries.length === 0 || at.asc === null) return null;
  const shown = entries.slice(0, MAX_PHASES_SHOWN).map(([sequence, n]) => `${sequence} (n=${n})`);
  const more = entries.length > shown.length ? ` 等 ${entries.length} 种` : "";
  return `阶段血量 A${at.asc}${at.exact ? "" : `（非 A${asc}）`}: ${shown.join("；")}${more}`;
}

function intentText(move: MoveEntry): string {
  const n = total(move.intents);
  const kinds = sortedCounts(move.intents)
    .filter(([, count]) => count >= INTENT_MIN_SHARE * n)
    .map(([intent]) => intent.split("+").map((part) => INTENT_ZH[part] ?? part).join("+"));
  return kinds.length > 0 ? `〔${kinds.join("｜")}〕` : "";
}

function damageText(data: KnowledgeData, monsterId: string, moveId: string, move: MoveEntry, asc: number): string | null {
  const monsters = data.monsterDb.monsters;
  const base = moveDamageAt(monsters, monsterId, moveId, asc);
  const hit = base ?? shownDamageAt(monsters, monsterId, moveId, asc);
  if (!hit) return null;
  const entry = move.damage_by_asc?.[String(hit.from)];
  const n = base ? total(entry?.base_per_hit) : total(entry?.shown);
  const perHit = base ? (base.base ?? base.perHit) : hit.perHit;
  const value = hit.hits > 1 ? `${perHit}×${hit.hits}` : String(perHit);
  const shownOnly = base ? "" : "显示值（含当时的力量/易伤）";
  let text: string;
  if (!hit.estimated) text = `伤害 ${shownOnly}${value} (n=${n})`;
  else {
    const short = hit.ratioTo !== undefined && hit.ratioTo !== asc ? `，A${hit.ratioTo}→A${asc} 未测按×1` : "";
    const basis = hit.ratioN !== undefined ? `比例基于 ${hit.ratioN} 个招式${hit.ratioOwn ? "（本怪）" : "（全体）"}` : `A${hit.from}→A${asc} 无实测比例，按×1`;
    text = `伤害 估 ${shownOnly}${value}（A${hit.from} 记录 ${hit.logged ?? "?"} (n=${n}) ×${hit.ratio.toFixed(2)}，${basis}${short}）`;
  }
  // A move that grows with each use (the Waterfall Giant's Pressure Gun) shows every base it was logged with.
  const bases = sortedCounts(entry?.base_per_hit);
  if (base && bases.length > 1 && bases[1]![1] >= 0.2 * n) text += `，记录的基础值 ${bases.map(([value]) => value).sort((a, b) => Number(a) - Number(b)).join("/")}`;
  if (base?.backAttackShare !== undefined) text += `；从背后 ×1.5 = ${Math.floor(perHit * 1.5)}（记录中 ${pct(base.backAttackShare)} 的回合在背后）`;
  return text;
}

/**
 * Counts from another ascension say so; with `estimate` (monster-db amountAt), also the estimate at this ascension the
 * rollout and the boss sim use and how it was reached.
 */
function labelled(text: string | null, at: { asc: number | null; exact: boolean }, asc: number, estimate?: AmountAt | null, format: (value: string) => string = (value) => value): string | null {
  if (text === null) return null;
  if (at.asc === null) return `${text}（各进阶合并）`;
  if (at.exact) return text;
  const note = estimate?.estimated ? amountEstimateNote(estimate, asc) : "";
  return `${text}（A${at.asc}，非 A${asc}${note ? `；${note}，估 ${format(String(estimate!.value))}` : ""}）`;
}

function selfGainsText(data: KnowledgeData, monsterId: string, move: MoveEntry, asc: number): string | null {
  const parts = Object.keys(move.self_powers_gained ?? {})
    .sort(cmp)
    .filter((id) => regularEffect(move, move.self_powers_gained![id]))
    .map((id) => {
      const byAsc = Object.fromEntries(Object.entries(move.self_powers_gained_by_asc ?? {}).map(([key, powers]) => [key, powers[id]]));
      const at = countsAtAscension(byAsc, move.self_powers_gained![id], asc);
      const estimate = at.exact ? null : moveAmountAt(data.monsterDb.monsters, monsterId, move, "self", id, asc);
      const text = labelled(countsText(at.counts, signedValue), at, asc, estimate, signedValue);
      return text === null ? null : `${powerName(data, id)} ${text}`;
    })
    .filter((part): part is string => part !== null);
  return parts.length > 0 ? `给自己加 ${parts.join("，")}` : null;
}

function playerPowersText(data: KnowledgeData, monsterId: string, move: MoveEntry, asc: number): string | null {
  const candidates = Object.keys(move.player_powers_applied ?? {}).sort(cmp);
  if (candidates.length === 0) return null;
  const { ids, choice } = appliedPowerIds(move, candidates);
  const parts = ids
    .map((id) => {
      const byAsc = Object.fromEntries(Object.entries(move.player_powers_applied_by_asc ?? {}).map(([key, powers]) => [key, powers[id]]));
      const at = countsAtAscension(byAsc, move.player_powers_applied![id], asc);
      const estimate = at.exact ? null : moveAmountAt(data.monsterDb.monsters, monsterId, move, "applied", id, asc);
      const text = labelled(countsText(at.counts), at, asc, estimate);
      return text === null ? null : `${powerName(data, id)} ${text}`;
    })
    .filter((part): part is string => part !== null);
  if (parts.length === 0) return null;
  return choice ? `给我们上（每次其一）${parts.join(" 或 ")}` : `给我们上 ${parts.join("，")}`;
}

function blockText(data: KnowledgeData, monsterId: string, move: MoveEntry, asc: number): string | null {
  if (!move.block_gained || !regularEffect(move, move.block_gained)) return null;
  const at = countsAtAscension(move.block_gained_by_asc, move.block_gained, asc);
  const text = countsText(at.counts);
  const estimate = at.exact ? null : moveAmountAt(data.monsterDb.monsters, monsterId, move, "block", "BLOCK", asc);
  return text ? labelled(`格挡 ${text}`, at, asc, estimate) : null;
}

function healText(move: MoveEntry, asc: number): string | null {
  const at = countsAtAscension(move.heal_by_asc, undefined, asc);
  const text = countsText(at.counts);
  return text ? labelled(`回血 ${text}`, at, asc) : null;
}

function statusCardText(move: MoveEntry): string | null {
  const count = countsText(move.status_cards, (value) => `${value} 张`);
  if (!count) return null;
  const added = total(move.status_card_ids);
  const cards = sortedCounts(move.status_card_ids)
    .filter(([, n]) => n >= STATUS_CARD_MIN_SHARE * added)
    .map(([id]) => id);
  const piles = sortedCounts(move.status_card_pile).map(([pile, n]) => `${pile === "draw" ? "抽牌堆" : pile === "discard" ? "弃牌堆" : pile} ${n}`);
  return `塞牌${cards.length > 0 ? ` ${cards.join("/")}` : ""} 每次 ${count}${piles.length > 0 ? `，落点 ${piles.join("、")}` : ""}`;
}

function turnsText(move: MoveEntry): string | null {
  const turns = numericKeys(move.turns_seen).filter((turn) => (move.turns_seen![String(turn)] ?? 0) > 0);
  if (turns.length === 0) return null;
  const shown = turns.slice(0, MAX_TURNS_SHOWN).join("/");
  return `出现于第 ${shown}${turns.length > MAX_TURNS_SHOWN ? "/…" : ""} 回合（共 ${move.n_seen ?? total(move.turns_seen)} 次）`;
}

function nextText(monster: MonsterEntry, move: MoveEntry): string | null {
  const next = sortedCounts(move.next);
  if (next.length === 0) return null;
  const shown = next.slice(0, MAX_NEXT_SHOWN).map(([id, n]) => `${monster.moves?.[id]?.name || id} ${n}`);
  return `下一招 ${shown.join("/")}${next.length > shown.length ? "/…" : ""}`;
}

function firstTurn(move: MoveEntry): number {
  return numericKeys(move.turns_seen)[0] ?? 999;
}

function moveLine(data: KnowledgeData, monsterId: string, monster: MonsterEntry, moveId: string, move: MoveEntry, asc: number): string {
  const parts = [
    damageText(data, monsterId, moveId, move, asc),
    selfGainsText(data, monsterId, move, asc),
    playerPowersText(data, monsterId, move, asc),
    blockText(data, monsterId, move, asc),
    healText(move, asc),
    statusCardText(move),
    turnsText(move),
    nextText(monster, move),
  ].filter((part): part is string => part !== null);
  return `- ${move.name || moveId}${intentText(move)} ${parts.join("；")}`;
}

function openingLine(monster: MonsterEntry): string | null {
  const firsts = Object.entries(monster.moves ?? {})
    .map(([id, move]) => [move.name || id, move.turns_seen?.["1"] ?? 0] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]));
  return firsts.length > 0 ? `第 1 回合招式: ${firsts.map(([name, n]) => `${name} ${n}`).join("/")}` : null;
}

function mechanicsLines(data: KnowledgeData, id: string, monster: MonsterEntry, asc: number): string[] {
  const fights = total(monster.encounters);
  const ours = ourDebuffs(data);
  const lines: string[] = [];
  for (const powerId of Object.keys(monster.powers ?? {}).sort(cmp)) {
    const power = monster.powers![powerId]!;
    if (ours.has(powerId)) continue;
    if ((power.n_fights ?? 0) < Math.max(2, OWN_POWER_MIN_SHARE * fights)) continue;
    const turn = countsAtAscension(power.turn_at_first_sight_by_asc, undefined, asc);
    const firstTurn = sortedCounts(turn.counts)[0]?.[0];
    if (powerId === INNATE_STRENGTH && firstTurn !== "1") continue;
    const amount = countsAtAscension(power.amount_at_first_sight_by_asc, power.amount_at_first_sight, asc);
    const estimate = amount.exact ? null : startAmountAt(data.monsterDb.monsters, id, powerId, asc);
    const amountText = labelled(countsText(amount.counts), amount, asc, estimate);
    const when = firstTurn && firstTurn !== "1" ? `，多在第 ${firstTurn} 回合首次出现` : "";
    const description = stripMarkup(power.description ?? "");
    const said = description && description !== "TODO" ? `：${description}` : "";
    lines.push(`- ${power.name ?? powerId}${amountText ? ` ${amountText}` : ""}（${power.n_fights}/${fights} 场${when}）${said}`);
  }
  const spawns = ON_DEATH_SPAWNS[id];
  if (spawns) lines.push(`- 死亡时召唤 ${spawns.map((spawn) => `${monsterNameOf(data, spawn.id)} ${spawn.id}×${spawn.count}`).join("、")}（血量见其条目）`);
  return lines;
}

/* ---- observed mechanics (monster-db.json `observed`; knowledge/mechanics.ts, docs/mechanics-learning.md) ------- */

/** An observed Escape move shows from this many settled turns (it left, or stayed into the next turn). */
const OBSERVED_ESCAPE_MIN = 5;
/** Mid-turn stuns show from this many, when a trigger came with this share of them and no stripped power line says it. */
const OBSERVED_STUNS_MIN = 5;
const OBSERVED_TRIGGER_SHARE = 0.8;
/** A strip paired with another power's on this share of its frames says so. */
const CO_REMOVED_SHARE = 0.8;

const TRIGGER_ZH: Record<string, string> = { ally_died: "有其他敌人死亡", block_broken: "格挡被打光" };

function triggerText(data: KnowledgeData, trigger: string): string {
  if (trigger.startsWith("power_removed:")) return `${powerName(data, trigger.slice("power_removed:".length))} 被去掉`;
  if (trigger.startsWith("power_down:")) return `${powerName(data, trigger.slice("power_down:".length))} 层数下降`;
  return TRIGGER_ZH[trigger] ?? trigger;
}

/** The text of a reward key ("SpecialCard:取回你被偷走的牌。" -> its text, numbers shown as N). */
function rewardText(key: string): string {
  const at = key.indexOf(":");
  return at >= 0 ? key.slice(at + 1) : key;
}

/** A move rule's group shows its revive when at least this share of its changes came on a frame showing one. */
const MOVE_REVIVED_SHARE = 0.8;

/**
 * MECH_MOVE_RULES: one short line per move a power's removal (or lowering) changes this monster's move to (the class-B
 * rules, knowledge/mechanics.ts moveRules): the powers, the counts, the move after it, and a revive when the frames show one.
 */
function moveRuleLines(data: KnowledgeData, id: string, monster: MonsterEntry): string[] {
  const rules = moveRules({ [id]: monster }).get(id) ?? [];
  const byMove = new Map<string, MoveRule[]>();
  for (const rule of rules) byMove.set(rule.move, [...(byMove.get(rule.move) ?? []), rule]);
  const lines: string[] = [];
  for (const move of [...byMove.keys()].sort(cmp)) {
    const group = byMove.get(move)!;
    const moveName = (target: string) => monster.moves?.[target]?.name || target;
    const attacks = Object.keys(monster.moves?.[move]?.damage_by_asc ?? {}).length > 0 ? "有攻击" : "无攻击";
    const counts = group.map((rule) => `${powerName(data, rule.power)}${rule.how === "lowered" ? "少一层" : "去掉"} ${rule.changed}/${rule.n}`).join("、");
    const next = sortedCounts(group.reduce<Record<string, number>>((all, rule) => {
      for (const [target, n] of Object.entries(rule.next)) all[target] = (all[target] ?? 0) + n;
      return all;
    }, {}))[0];
    const changed = group.reduce((sum, rule) => sum + rule.changed, 0);
    const revived = group.reduce((sum, rule) => sum + rule.revived, 0) >= MOVE_REVIVED_SHARE * changed ? "；那一帧它的最大生命值变了（被打到 0 后复活或变形）" : "";
    const ids = [...new Set(group.map((rule) => rule.power))];
    const powers = ids.map((power) => `${powerName(data, power)}${group.some((rule) => rule.power === power && rule.how === "lowered") ? "（或少一层）" : ""}`).join("、");
    lines.push(`- ${powers} 在我方回合被去掉时：它的招式立即变成 ${moveName(move)}（${attacks}；${counts} 次）${next ? `，下回合 ${moveName(next[0])}` : ""}${revived}`);
  }
  return lines;
}

/**
 * One short line per notable observation about this monster, from the logs (what the game's text does not say): a power
 * whose strip to 0 stunned it (notable when the power's pooled counts make it a stun rule, knowledge/mechanics.ts), an
 * Escape move's outcome, the rewards that come only with killing it, and mid-turn stuns no such line explains; with
 * MECH_MOVE_RULES (`moves`), a power whose removal changes its move.
 */
export function observedLines(data: KnowledgeData, monster: MonsterEntry, moves = false, id = ""): string[] {
  const observed: ObservedMonster | undefined = monster.observed;
  if (!observed) return [];
  const pooled = data.monsterDb.observed?.powers_stripped ?? {};
  const lines: string[] = [];
  const explained = new Set<string>();
  for (const powerId of Object.keys(observed.powers_stripped ?? {}).sort(cmp)) {
    if (!isStripStun(pooled[powerId])) continue;
    const own = observed.powers_stripped![powerId]!;
    const stunned = own.move_after?.[STUN_MOVE] ?? 0;
    explained.add(`power_removed:${powerId}`);
    const cancelled = (own.attack_before ?? 0) > 0 ? `；当回合有攻击的 ${own.attack_cancelled ?? 0}/${own.attack_before} 次攻击取消` : "";
    const paired = sortedCounts(own.co_removed).filter(([, n]) => n >= CO_REMOVED_SHARE * own.n).map(([other, n]) => `${n} 次和 ${powerName(data, other)} 同时去掉`);
    const pairedText = paired.length > 0 ? `；${paired.join("，")}` : "";
    lines.push(`- ${powerName(data, powerId)}：观察到在我方回合被打到 0 层（去掉）时它立即眩晕、本回合行动取消（${own.fights} 场 ${stunned}/${own.n} 次${cancelled}${pairedText}）`);
  }
  if (moves) lines.push(...moveRuleLines(data, id, monster));
  for (const moveId of Object.keys(observed.escape_moves ?? {}).sort(cmp)) {
    const escape = observed.escape_moves![moveId]!;
    if (escape.gone + escape.stayed < OBSERVED_ESCAPE_MIN) continue;
    const name = monster.moves?.[moveId]?.name || moveId;
    const goneStunned = escape.gone_stunned ?? 0;
    const stayedStunned = escape.stayed_stunned ?? 0;
    const free = { gone: escape.gone - goneStunned, stayed: escape.stayed - stayedStunned };
    const parts = [`我方回合结束时它活着且未眩晕的 ${free.gone}/${free.gone + free.stayed} 次在敌方回合后离场（不算击杀）`];
    if (stayedStunned + goneStunned > 0) {
      const next = sortedCounts(escape.next_after_stay)[0];
      parts.push(`被眩晕的 ${stayedStunned}/${stayedStunned + goneStunned} 次留下${next ? `，下回合是 ${monster.moves?.[next[0]]?.name || next[0]} ${next[1]} 次` : ""}`);
    }
    lines.push(`- ${name}（意图逃跑）：${parts.join("；")}`);
  }
  const rewards = (observed.kill_rewards ?? []).map((reward) => {
    const left = reward.left[1] > 0 ? `，它离场的 ${reward.left[0]}/${reward.left[1]} 场` : "";
    const elsewhere = reward.exclusive ? `，没有它的战斗 ${reward.elsewhere[0]} 场` : "";
    return `${rewardText(reward.reward)}（击杀它的 ${reward.killed[0]}/${reward.killed[1]} 场${left}${elsewhere}）`;
  });
  if (rewards.length > 0) lines.push(`- 击杀才有的奖励：${rewards.join("；")}`);
  const stuns = observed.mid_turn_stuns;
  if (stuns && stuns.n >= OBSERVED_STUNS_MIN) {
    const triggers = sortedCounts(stuns.triggers).filter(([trigger, n]) => trigger !== "hp_lost" && n >= OBSERVED_TRIGGER_SHARE * stuns.n);
    if (!triggers.some(([trigger]) => explained.has(trigger))) {
      const why = triggers.length > 0 ? `，同时${triggers.map(([trigger, n]) => `${triggerText(data, trigger)} ${n} 次`).join("、")}` : "，没有共同的触发";
      lines.push(`- 我方回合中眩晕（本回合行动取消）：${stuns.fights} 场 ${stuns.n} 次${why}`);
    }
  }
  return lines;
}

/** The header of a monster block's observed lines. */
export const OBSERVED_HEADER = "观察到的机制（日志统计，能力描述里没写；n 为次数）:";

function monsterBlock(data: KnowledgeData, id: string, asc: number, mechanics = true, moveRulesOn = true): string {
  const monster = data.monsterDb.monsters[id]!;
  const fights = total(monster.encounters);
  const lines = [`### ${monsterNameOf(data, id)} ${id}〔${KIND_ZH[monster.kind ?? ""] ?? monster.kind ?? "?"}｜${actsText(monster.acts)}｜记录 ${fights} 场〕`, hpLine(data, id, asc)];
  const phases = phasesLine(monster, asc);
  if (phases) lines.push(phases);
  const opening = openingLine(monster);
  if (opening) lines.push(opening);
  const moves = Object.entries(monster.moves ?? {}).sort((a, b) => firstTurn(a[1]) - firstTurn(b[1]) || (b[1].n_seen ?? 0) - (a[1].n_seen ?? 0) || cmp(a[0], b[0]));
  if (moves.length > 0) {
    lines.push("招式:");
    for (const [moveId, move] of moves) lines.push(moveLine(data, id, monster, moveId, move, asc));
  }
  const powers = mechanicsLines(data, id, monster, asc);
  if (powers.length > 0) lines.push("能力/机制:", ...powers);
  // MECH_RULES: the observed mechanics (off: the block as before them).
  // MECH_MOVE_RULES: with them, the learned move changes (off: as with MECH_RULES alone).
  const observed = mechanics ? observedLines(data, monster, moveRulesOn, id) : [];
  if (observed.length > 0) lines.push(OBSERVED_HEADER, ...observed);
  return lines.join("\n");
}

function monsterOrder(data: KnowledgeData): string[] {
  const monsters = data.monsterDb.monsters;
  return Object.keys(monsters).sort(
    (a, b) => primaryAct(monsters[a]!.acts) - primaryAct(monsters[b]!.acts) || kindRank(monsters[a]!.kind) - kindRank(monsters[b]!.kind) || cmp(a, b),
  );
}

export const MONSTER_LEGEND =
  "每个怪物：当前进阶的血量；招式的伤害（每段×段数，力量另计）、给自己加的、给我们上的、塞的牌、出现回合和下一招的转移次数；能力/机制来自能力描述。" +
  "(n=…) 是样本数；「估」= 当前进阶没有记录，按相邻进阶乘实测比例推算；「非 A…」= 取自最近的有记录进阶；稀疏或分散的记录列出全部取值，不取众数。";

/** Every monster in the DB at the context's ascension, by act, kind and id. */
export function renderMonsters(ctx: RenderContext): string {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  return [MONSTER_LEGEND, ...monsterOrder(data).map((id) => monsterBlock(data, id, ctx.ascension, ctx.mechanics !== false, ctx.moveRules !== false))].join("\n\n");
}

/** One monster (by id or Chinese name) with the encounters it is in; throws KnowledgeLookupError when not one. */
export function renderMonster(idOrName: string, ctx: RenderContext): string {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const ids = resolveMonsterIds(data, idOrName);
  if (ids.length === 0) throw new KnowledgeLookupError(`没有怪物「${idOrName}」。可用的 id: ${monsterOrder(data).join(", ")}`);
  if (ids.length > 1) throw new KnowledgeLookupError(`「${idOrName}」对应多个怪物，请用 id: ${ids.map((id) => `${id}（${monsterNameOf(data, id)}）`).join(", ")}`);
  const id = ids[0]!;
  const encounters = encountersWith(data, id).map((key) => encounterLine(data, key, data.monsterDb.encounters[key]!));
  const bosses = bossesWith(data, id).map((bossId) => bossLine(data, bossId));
  const records = [...bosses, ...encounters];
  return [monsterBlock(data, id, ctx.ascension, ctx.mechanics !== false, ctx.moveRules !== false), ...(records.length > 0 ? ["所在遭遇的战绩:", ...records] : [])].join("\n");
}

/* ---- encounters and bosses -------------------------------------------------------------------- */

/** A room kind's share of an encounter's fights: its dominant room. */
export function dominantRoom(encounter: EncounterEntry): string {
  return sortedCounts(encounter.rooms)[0]?.[0] ?? "?";
}

export function encounterName(data: KnowledgeData, key: string): string {
  const counts = new Map<string, number>();
  for (const id of key.split("+")) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].map(([id, n]) => `${monsterNameOf(data, id)}${n > 1 ? `×${n}` : ""}`).join("+");
}

/** Our record at one ascension: fights, win rate, deaths, HP lost in won fights (in the fight: before Burning Blood). */
export function recordRow(threat: Threat, asc: number, boss = false): string {
  const fights = threat.fights ?? 0;
  const known = threat.n_outcome_known ?? fights;
  const deaths = threat.deaths ?? threat.death_runs?.length ?? 0;
  const parts = [`A${asc} ${fights}场 胜${pct(threat.win_rate)}${known !== fights ? `(n=${known})` : ""} 死${deaths}`, `赢局战内掉血 ${statText(threat.hp_loss_won)}`];
  if (boss) parts.push(`赢局回合 ${statText(threat.turns_won)}`, `每回合掉血 ${statText(threat.hp_loss_per_turn)}`);
  return parts.join("，");
}

function recordsText(byAsc: Record<string, Threat> | undefined, boss = false): string {
  const ascs = numericKeys(byAsc).reverse();
  return ascs.length > 0 ? ascs.map((asc) => recordRow(byAsc![String(asc)]!, asc, boss)).join("；") : "无记录";
}

function roomsText(encounter: EncounterEntry): string {
  return sortedCounts(encounter.rooms).map(([room]) => KIND_ZH[room] ?? room).join("/") || "?";
}

export function encounterLine(data: KnowledgeData, key: string, encounter: EncounterEntry): string {
  return `- ${encounterName(data, key)} ${key}〔${roomsText(encounter)}｜${actsText(encounter.acts)}〕 ${recordsText(encounter.by_asc)}`;
}

/** The act of a boss: its parts' logged acts. */
export function bossAct(data: KnowledgeData, bossId: string): number {
  const acts: Record<string, number> = {};
  for (const threat of Object.values(data.monsterDb.bosses[bossId] ?? {})) {
    for (const part of Object.keys(threat.parts ?? {})) {
      for (const [act, n] of Object.entries(data.monsterDb.monsters[part]?.acts ?? {})) acts[act] = (acts[act] ?? 0) + n;
    }
  }
  return primaryAct(acts);
}

function bossParts(data: KnowledgeData, bossId: string): string[] {
  const parts = new Set<string>();
  for (const threat of Object.values(data.monsterDb.bosses[bossId] ?? {})) for (const part of Object.keys(threat.parts ?? {})) parts.add(part);
  return [...parts].sort(cmp);
}

export function bossLine(data: KnowledgeData, bossId: string): string {
  const parts = bossParts(data, bossId).map((part) => `${monsterNameOf(data, part)} ${part}`);
  return `- boss ${bossId}（${parts.join(" + ") || "部位未知"}）〔第${bossAct(data, bossId)}幕〕 ${recordsText(data.monsterDb.bosses[bossId], true)}`;
}

function encountersWith(data: KnowledgeData, monsterId: string): string[] {
  return Object.keys(data.monsterDb.encounters)
    .filter((key) => key.split("+").includes(monsterId))
    .sort(cmp);
}

function bossesWith(data: KnowledgeData, monsterId: string): string[] {
  return Object.keys(data.monsterDb.bosses)
    .filter((bossId) => bossId === monsterId || bossParts(data, bossId).includes(monsterId))
    .sort(cmp);
}

/** Encounter keys of the given dominant rooms, by act, room and key. */
export function encounterKeys(data: KnowledgeData, rooms?: readonly string[], act?: number): string[] {
  const encounters = data.monsterDb.encounters;
  return Object.keys(encounters)
    .filter((key) => !rooms || rooms.includes(dominantRoom(encounters[key]!)))
    .filter((key) => act === undefined || (encounters[key]!.acts?.[String(act)] ?? 0) > 0)
    .sort(
      (a, b) =>
        primaryAct(encounters[a]!.acts) - primaryAct(encounters[b]!.acts) ||
        kindRank(dominantRoom(encounters[a]!)) - kindRank(dominantRoom(encounters[b]!)) ||
        cmp(a, b),
    );
}

/** Boss ids by act and id. */
export function bossIds(data: KnowledgeData, act?: number): string[] {
  return Object.keys(data.monsterDb.bosses)
    .filter((id) => act === undefined || bossAct(data, id) === act)
    .sort((a, b) => bossAct(data, a) - bossAct(data, b) || cmp(a, b));
}

export const RECORD_LEGEND = "战绩按进阶从高到低：场数、胜率、死亡数、赢局战内掉血 中位/p75 (n=赢局数)。";

/** The hallway and question-mark encounters (elites and bosses are in the stats tables), with our record. */
export function renderEncounters(ctx: RenderContext): string {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const keys = encounterKeys(data, ["hallway", "unknown_room"]);
  return [`${RECORD_LEGEND}精英和 boss 的战绩见统计表。`, ...keys.map((key) => encounterLine(data, key, data.monsterDb.encounters[key]!))].join("\n");
}

/**
 * Encounters for a query: an encounter key ("CRUSHER+ROCKET"), a boss id (KAISER_CRAB), or a monster id or name
 * (every encounter and boss fight it is in); `act` and `room` narrow the list. Throws KnowledgeLookupError when
 * nothing matches.
 */
export function renderEncounter(query: string, ctx: RenderContext, filter: { act?: number; room?: string } = {}): string {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const encounters = data.monsterDb.encounters;
  const upper = query.trim().toUpperCase();
  const keep = (key: string) => (filter.act === undefined || (encounters[key]!.acts?.[String(filter.act)] ?? 0) > 0) && (!filter.room || dominantRoom(encounters[key]!) === filter.room);
  const keepBoss = (bossId: string) => (filter.act === undefined || bossAct(data, bossId) === filter.act) && (!filter.room || filter.room === "boss");
  const bossId = upper.replace(/_BOSS$/, "");
  // An encounter key and a boss id can be the same (WATERFALL_GIANT): both are shown.
  let keys: string[] = encounters[upper] ? [upper] : [];
  let bosses: string[] = data.monsterDb.bosses[bossId] ? [bossId] : [];
  if (keys.length === 0 && bosses.length === 0) {
    const ids = resolveMonsterIds(data, query);
    if (ids.length === 0) {
      const all = encounterKeys(data);
      throw new KnowledgeLookupError(`没有遭遇、boss 或怪物「${query}」。可用的 boss: ${bossIds(data).join(", ")}；遭遇: ${all.join(", ")}`);
    }
    keys = [...new Set(ids.flatMap((id) => encountersWith(data, id)))].sort(cmp);
    bosses = [...new Set(ids.flatMap((id) => bossesWith(data, id)))].sort(cmp);
  }
  const lines = [...bosses.filter(keepBoss).map((bossId) => bossLine(data, bossId)), ...keys.filter(keep).map((key) => encounterLine(data, key, encounters[key]!))];
  if (lines.length === 0) throw new KnowledgeLookupError(`「${query}」在筛选条件（幕 ${filter.act ?? "任意"}，房间 ${filter.room ?? "任意"}）下没有遭遇记录`);
  return [RECORD_LEGEND, ...lines].join("\n");
}
