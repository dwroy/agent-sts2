/**
 * What a shop potion is worth in the act boss fight, in HP, from the potion's measured numbers
 * (knowledge/potion-values.ts), this deck's damage a turn and hits (boss clock) and the HP lost a turn in
 * that fight (monster DB, n). A fact for DeepSeek's shop question, not a purchase rule (audit 2026-09-28:
 * every potion scored about -6.7, under the leave line, and DeepSeek bought none in 5 chances).
 *
 * The model (each potion drunk once, on the turn it helps most):
 *  - damage X (Fire, Explosive, Rock): X / (deck damage a turn) turns shorter, times HP lost a turn;
 *  - Strength S for the fight: the fight shortens by T·S·hits / (damage + S·hits) turns;
 *  - Flex (Strength for one turn): S·hits damage; Vulnerable V: +50% damage for min(V, T) turns;
 *  - Weak W: 25% of the HP lost a turn for min(W, T) turns;
 *  - Block B: up to B HP on a turn that hits for at least B; Blood: 20% of max HP; Regen R: R+(R-1)+..+1.
 * Card, draw, energy and other potions are not modelled (null).
 */

import { bossHpLoss } from "../knowledge/monster-db.js";
import type { Knowledge } from "../knowledge/index.js";
import { POTION_VALUES } from "../knowledge/potion-values.js";
import type { GameState } from "../hand/mod/schema.js";
import { asRecord, str } from "../core/util/json.js";
import { bossClock, bossProfile, deckProfileForBoss } from "../sim/boss-clock.js";

export interface PotionWorth {
  /** Expected HP saved in the act boss fight. */
  hp: number;
  /** How it was computed, with the inputs and their n. */
  why: string;
}

const r1 = (value: number): number => Math.round(value * 10) / 10;

export function potionHpSaved(potionId: string, state: GameState, knowledge: Knowledge): PotionWorth | null {
  const values = POTION_VALUES[potionId];
  if (!values) return null;
  const maxHp = state.run?.max_hp ?? 0;
  if (values["HealPercent"] !== undefined && maxHp > 0) {
    const hp = (values["HealPercent"] / 100) * maxHp;
    return { hp, why: `heals ${values["HealPercent"]}% of max HP = ${r1(hp)} HP` };
  }
  if (values["RegenPower"] !== undefined) {
    const regen = values["RegenPower"];
    const hp = (regen * (regen + 1)) / 2;
    return { hp, why: `Regen ${regen}: heals ${regen}+${regen - 1}+…+1 = ${hp} HP over the fight` };
  }
  if (values["Block"] !== undefined) {
    return { hp: values["Block"], why: `${values["Block"]} block: up to ${values["Block"]} HP on a turn that hits for at least that` };
  }

  const bossId = str(asRecord(state.run?.raw)["boss_id"]);
  let clock: ReturnType<typeof bossClock> = null;
  try {
    clock = bossClock(state, knowledge);
  } catch {
    clock = null;
  }
  const deck = deckProfileForBoss(state, knowledge);
  if (!clock || !deck || clock.deck <= 0) return null;
  const measured = bossHpLoss(bossId, state.run?.ascension ?? 0);
  const perTurn = measured?.perTurn?.median ?? bossProfile(bossId)?.lossPerTurn ?? null;
  if (perTurn === null) return null;
  const lossNote = measured?.perTurn
    ? `~${r1(perTurn)} HP lost a turn there (monster DB A${measured.perTurn.asc}, n=${measured.perTurn.n})`
    : `~${r1(perTurn)} HP lost a turn there (hand-set A8 boss profile: no logged fight)`;
  const damage = clock.deck;
  const turns = clock.fightTurns;
  const hits = deck.hits;
  const boss = clock.boss;
  const byDamage = (extra: number, what: string): PotionWorth => {
    const shorter = extra / damage;
    return { hp: shorter * perTurn, why: `${what} = ${r1(shorter)} turns of this deck's ~${r1(damage)} damage a turn vs ${boss}, × ${lossNote}` };
  };
  if (values["Damage"] !== undefined) return byDamage(values["Damage"], `${values["Damage"]} damage`);
  if (potionId === "FLEX_POTION" && values["StrengthPower"] !== undefined) return byDamage(values["StrengthPower"] * hits, `+${values["StrengthPower"]} Strength for one turn × ~${r1(hits)} hits`);
  if (values["StrengthPower"] !== undefined && potionId === "STRENGTH_POTION") {
    const strength = values["StrengthPower"];
    const shorter = (turns * strength * hits) / (damage + strength * hits);
    return { hp: shorter * perTurn, why: `+${strength} Strength × ~${r1(hits)} hits a turn over a ~${turns}-turn fight = ${r1(shorter)} turns shorter vs ${boss}, × ${lossNote}` };
  }
  if (values["VulnerablePower"] !== undefined && potionId === "VULNERABLE_POTION") {
    const vulnTurns = Math.min(values["VulnerablePower"], turns);
    return byDamage(0.5 * damage * vulnTurns, `Vulnerable ${values["VulnerablePower"]}: +50% damage for ${vulnTurns} turns`);
  }
  if (values["WeakPower"] !== undefined && potionId === "WEAK_POTION") {
    const weakTurns = Math.min(values["WeakPower"], turns);
    const hp = 0.25 * perTurn * weakTurns;
    return { hp, why: `Weak ${values["WeakPower"]}: 25% less attack damage for ${weakTurns} turns × ${lossNote}` };
  }
  return null;
}
