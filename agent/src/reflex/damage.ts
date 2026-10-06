/**
 * Damage resolution in code (PLAN.md §6.1): the mod gives the raw number, we apply the modifiers.
 *
 * Verified against a live run: `STRIKE_IRONCLAD` reports `Damage=6` while the target carries
 * `Vulnerable 2`, and the game resolves it as 9. So the mod's dynamic values are the *card's own*
 * number (base + Strength + card-specific scaling such as Perfected Strike's `CalculatedDamage`),
 * and resolution-time modifiers are ours to apply:
 *
 *   Vulnerable (target)  → each hit ×1.5, floored
 *   Weak (attacker)      → each hit ×0.75, floored
 *   Intangible (target)  → each hit capped at 1
 *
 * Why we do this at all instead of asking the mod: `GameStateService.BuildCardDynamicValuePayloads`
 * calls the game's own preview with `card.CurrentTarget`, so a target-aware preview *does* exist —
 * but the target is whatever the UI currently has hovered, and an agent never hovers. There is no API
 * parameter to ask "what would this card do to enemy X". Verified live: with `Vulnerable 2` on the
 * board, `STRIKE_IRONCLAD` still reported `Damage=6`.
 *
 * The same call feeds `resolved_rules_text`, so a card's *text* is equally untargeted.
 *
 * Current previews include the attacker's Weak: VLV17NUSFS61 F37 attempt 2 T5 and
 * 5X2GHKJ89PN1 F48 attempt 6 T6 (silent-0191) show 4-damage Poisoned Stab and 3-damage
 * Shivs dealing exactly those amounts. Callers using current previews omit Weak from
 * attackerPowers; raw/base inputs still apply it here.
 *
 * Multi-hit attacks are resolved hit by hit, because that is where rounding and block absorption
 * actually happen: 6 damage twice against 8 block removes the block and deals 4, not 0.
 */

export interface PowerLine {
  id: string;
  amount: number | null;
}

export interface DamageInput {
  /** Damage of one hit, already including strength and card-specific scaling. */
  perHit: number;
  hits: number;
  /** Who is being hit: their block and their powers. */
  targetBlock: number;
  targetPowers: readonly PowerLine[];
  /** Who is hitting: only Weak matters. */
  attackerPowers: readonly PowerLine[];
}

export interface DamageOutcome {
  /** HP the defender actually loses, after block and modifiers. */
  hpLoss: number;
  /** Block left on the defender after the whole attack. */
  blockAfter: number;
  /** Nominal damage before block, after modifiers — what the defender is being hit for. */
  total: number;
  /** Human-readable modifiers that were applied, for the option text and the log. */
  modifiers: string[];
}

const VULNERABLE = "VULNERABLE_POWER";
const WEAK = "WEAK_POWER";
const INTANGIBLE = "INTANGIBLE_POWER";

function has(powers: readonly PowerLine[], id: string): boolean {
  return powers.some((power) => power.id === id && (power.amount === null || power.amount > 0));
}

export function resolveDamage(input: DamageInput): DamageOutcome {
  const vulnerable = has(input.targetPowers, VULNERABLE);
  const weak = has(input.attackerPowers, WEAK);
  const intangible = has(input.targetPowers, INTANGIBLE);

  const modifiers: string[] = [];
  if (vulnerable) modifiers.push("target is Vulnerable: x1.5");
  if (weak) modifiers.push("attacker is Weak: x0.75");
  if (intangible) modifiers.push("target is Intangible: each hit reduced to 1");

  const hits = Math.max(1, Math.floor(input.hits));
  let block = Math.max(0, input.targetBlock);
  let hpLoss = 0;
  let total = 0;

  for (let index = 0; index < hits; index += 1) {
    let hit = input.perHit;
    if (vulnerable) hit = Math.floor(hit * 1.5);
    if (weak) hit = Math.floor(hit * 0.75);
    if (intangible) hit = Math.min(hit, 1);
    if (hit < 0) hit = 0;
    total += hit;
    const absorbed = Math.min(block, hit);
    block -= absorbed;
    hpLoss += hit - absorbed;
  }

  return { hpLoss, blockAfter: block, total, modifiers };
}

/** Convenience for the common "one number" case (used by the incoming-damage estimate). */
export function resolveFlatDamage(input: DamageInput): DamageOutcome {
  return resolveDamage(input);
}
