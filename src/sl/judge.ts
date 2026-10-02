/**
 * SL's certain-death check (docs/sl.md §2): asked only when the loop is about to send `end_turn` in a fight that may
 * be retried. It says "certain" only when every condition below holds; anything it cannot rule out is a veto
 * (Dai 2026-10-02: when unsure, no SL).
 *
 * Common conditions:
 * - the mod's own flag, combat.end_turn_will_kill_player, is true (the intents against the block up now);
 * - nothing revives us: no Fairy in a Bottle held, no unspent Lizard Tail (`revives`, from combat-plan's revivesOf);
 * - no Buffer or Intangible on us, no Ripple Basin with no attack played (its block is not modelled here);
 * - no enemy in a special phase (max HP at or above a million: the Waterfall Giant's eruption; a DeathBlow intent);
 * - our own count agrees: the attack intents (damage x hits) minus the block up now, the block that comes at the end
 *   of the turn (Plating / Plated Armor / Metallicize, Cloak Clasp for each card held, Feel No Pain for each Ethereal
 *   card held, Orichalcum when no block is left) and Regen reach our HP.
 * - Held cards' end-of-turn damage (Burn, Wither; through block) and HP loss (Beckon; past it) count too (2026-10-02,
 *   TMNFVW6DRQ20 F48 T8). When only they make the turn lethal, the death rests on them: certain even without the mod's
 *   flag (it does not count them), but only with every amount given and nothing that could cut the loss or kill an
 *   attacker first (heldGuard).
 * Then one of two tiers:
 * - "rules": no playable card in hand and no potion that can be drunk;
 * - "least-loss": the turn planner's own verdict on this board, combat/least-loss ending the turn: every simulated
 *   line dies (modelled potions included), no unmodelled potion and no random potion that may live, and the
 *   least-loss line is ending the turn. Vetoed when a playable card draws (the draws are not known), unless
 *   (SL_JUDGE_KNOWN_DRAWS, Dai 2026-10-02) every draw the simulated lines could make is exactly known (`drawsKnown`: the
 *   verdict already used the real cards; never the order resting on the added-cards model, draws.ts) and nothing
 *   changes the pile or draws mid-turn unseen.
 *
 * SL_RELOAD_EARLY (Dai 2026-10-02: "知道必死了就sl", and "我说的是必死 不是推演": a certain death, never a prediction):
 * the same least-loss verdict taken at the decision that finds it, before its line is played card by card
 * (judgeLeastLossNow), only when nothing this turn is left to chance or to what the planner does not model. Otherwise
 * the end_turn judgment, unchanged.
 *
 * Calibration on the logged A8+ boss and listed-elite turn ends (states.jsonl up to 2026-10-02, 4557 turn ends,
 * 201 deaths): "rules" fired 121 times, all deaths; both tiers 140 times, 139 deaths; the one survivor (7KDMKN16GD6B
 * F27 T7) had Feel No Pain block from exhausted Ethereal cards. That block was then counted for every card held, which
 * let a certain death through: 7PWU F48 (Queen) attempt 2 T6, "35 incoming - 0 block - 32 end-of-turn block < 14 HP"
 * with Feel No Pain 8 and four held cards none Ethereal (重振精神+, 薪火之源+, 御血术+, 突破+): no block came, it died
 * with four retries left. Only Ethereal cards are exhausted at the end of the turn (context.ethereal, card-model).
 */
import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { BEATING_REMNANT_CAP, distinctNames } from "../screens/combat-plan.js";
import { heldCardEthereal, heldPenaltyOf } from "../strategy/card-model.js";
import { asArray, asRecord, num, numOrNull, str } from "../util/json.js";

export type JudgeTier = "rules" | "least-loss";

export interface DeathVerdict {
  certain: boolean;
  tier: JudgeTier | null;
  /** SL_RELOAD_EARLY: taken at the least-loss decision, before its line was played (judgeLeastLossNow). */
  early?: true;
  /** Why it is certain, or what vetoed it. */
  reason: string;
  hp: number;
  block: number;
  /** Block expected at the end of the turn on top of `block` (see the module comment). */
  endBlock: number;
  /** The attack intents, damage x hits, over the living enemies. */
  incoming: number;
  /**
   * Held cards' end-of-turn damage (Burn, Wither: through block) and HP loss (Beckon, Bad Luck: past it), when any; and
   * whether our own count with them says the turn kills us (`ownCountDies`; the controller says so when the mod does not).
   */
  held?: { damage: number; loss: number; from: string[] };
  ownCountDies?: true;
  /** "name (intent)" for each living enemy that attacks. */
  killers: string[];
}

export interface JudgeContext {
  /** The label of the decision that chose end_turn (combat/least-loss is the planner's all-lines-die verdict). */
  label: string;
  /** What can still revive us ("FAIRY_IN_A_BOTTLE", "LIZARD_TAIL"). */
  revives: readonly string[];
  /**
   * Whether a held card is Ethereal (exhausted at the end of the turn, so Feel No Pain blocks for it). Default: its
   * rendered text (card-model heldCardEthereal without game data; a card with no text counts as Ethereal).
   */
  ethereal?: (card: Record<string, unknown>) => boolean;
  /**
   * SL_JUDGE_KNOWN_DRAWS: the least-loss verdict drew only known cards (LeastLossFacts.drawsKnown, and no relic or power
   * draws or changes the pile mid-turn: midTurnRisks), so a playable card that draws does not veto it. Absent: it does.
   */
  drawsKnown?: boolean;
  /** Game data for the powers' text (the held cards' guards: a power acting by chance or at the end of the turn). */
  knowledge?: Pick<Knowledge, "power" | "relic">;
  /**
   * The HP lost so far this turn, exactly (the controller: HP at the turn's first state less now, when it never rose and
   * nothing costs HP as the turn starts). Beating Remnant's cap needs it; absent: not known.
   */
  lostSoFar?: number;
}

/** A held card's end-of-turn clause about our HP whose amount the text does not give (Regret: 「失去相当于手牌数量的生命」). */
const HELD_CLAUSE = /回合结束时[^。]*手牌中[^。]*(?:受到|失去)[^。]*(?:伤害|生命)|at the end of your turn[^.]*in your hand[^.]*(?:take|lose)[^.]*(?:damage|hp)/i;

/**
 * Held cards' end-of-turn damage and HP loss (card-model heldPenaltyOf: 「受到N点伤害」 meets block, 「失去N点生命」 does not),
 * and the held cards whose clause gives no exact amount.
 */
function heldEndOfTurn(hand: Record<string, unknown>[]): { damage: number; loss: number; from: string[]; inexact: string[]; damages: number[]; losses: number[] } {
  let damage = 0;
  let loss = 0;
  const from: string[] = [];
  const inexact: string[] = [];
  const damages: number[] = [];
  const losses: number[] = [];
  for (const card of hand) {
    const text = str(card["resolved_rules_text"]) || str(card["rules_text"]);
    const { heldPenalty, heldHpLoss } = heldPenaltyOf(text);
    const name = str(card["name"], str(card["card_id"]));
    if (heldPenalty > 0) {
      damage += heldPenalty - heldHpLoss;
      loss += heldHpLoss;
      if (heldPenalty - heldHpLoss > 0) damages.push(heldPenalty - heldHpLoss);
      if (heldHpLoss > 0) losses.push(heldHpLoss);
      from.push(name);
    } else if (HELD_CLAUSE.test(text)) inexact.push(name);
  }
  return { damage, loss, from, inexact, damages, losses };
}

/**
 * The HP the enemy turn and the held cards take, on our own count (damage through the block and the end-of-turn block,
 * HP loss past them), with Tungsten Rod and Beating Remnant (2026-10-02, Dai: certain death only, so exactly or not at all):
 * - Tungsten Rod (「你每次失去生命时，减少失去的生命值1点」): every HP loss 1 less, in the order the damage comes: the end-of-turn
 *   block first, the held cards' damage in hand order, then each enemy's hits in board order, each one through what is left
 *   of the block; held HP loss each 1 less. On the logged Tungsten Rod turns this is the HP lost 60 times in 62 (the 2 others
 *   lost less: 7DFB21JE2DTK F33 T3, F35 T1).
 * - Beating Remnant: our turn and the enemy turn after it lose at most 20 together (the logs: Y3XT9EBS7U8B F48 T7, 2 lost
 *   earlier in the turn, 33 on our count, 18 lost; T8, 4 earlier, 16; CCPRXV86HPLH F43 T3, 2 earlier, 18; BFVATR4WANS6 F30
 *   T3, 11 earlier, 9; 20 whenever nothing was lost earlier). So it needs the HP lost so far this turn exactly (`lostSoFar`,
 *   the controller's); above 20 HP no turn can kill us.
 * `unknown`: the count cannot be exact (Beating Remnant at 20 HP or less with the HP lost so far not known).
 */
function ownLoss(
  o: { hits: number[]; heldDamages: number[]; heldLosses: number[]; block: number; endBlock: number; hp: number; rod: boolean; remnant: boolean; lostSoFar: number | undefined },
): { loss: number; unknown: boolean } {
  const total = o.hits.reduce((sum, hit) => sum + hit, 0) + o.heldDamages.reduce((sum, hit) => sum + hit, 0);
  let loss: number;
  if (!o.rod) loss = Math.max(0, total - o.block - o.endBlock) + o.heldLosses.reduce((sum, hit) => sum + hit, 0);
  else {
    let left = o.block + o.endBlock;
    loss = o.heldLosses.reduce((sum, hit) => sum + Math.max(0, hit - 1), 0);
    for (const hit of [...o.heldDamages, ...o.hits]) {
      const absorbed = Math.min(left, hit);
      left -= absorbed;
      if (hit - absorbed > 0) loss += hit - absorbed - 1;
    }
  }
  if (!o.remnant) return { loss, unknown: false };
  if (o.hp > BEATING_REMNANT_CAP) return { loss: Math.min(loss, BEATING_REMNANT_CAP), unknown: false };
  if (o.lostSoFar === undefined) return { loss, unknown: true };
  return { loss: Math.min(loss, Math.max(0, BEATING_REMNANT_CAP - o.lostSoFar)), unknown: false };
}

/** Relics that hit the enemies at the end of our turn, known exactly from the logs: [all enemies, damage]. */
const STONE_CALENDAR = { turn: 7, damage: 52 };
const PARRYING_SHIELD_DAMAGE = 6;
/** The Bomb: 40 to every enemy as its countdown ends (the card's text; 50 taken as the upgraded one's, to be safe). */
const THE_BOMB_MAX = 50;

/**
 * What hits the enemies after we end the turn and before they act (Dai 2026-10-02: an attacker it kills does not attack, so
 * the death is not certain): `sources` with their damage (`all` enemies, or one at random), each enemy's poison, or
 * `refuse` when an effect's amount or target is not known. From the logs:
 * - Stone Calendar: 52 to every enemy at the end of turn 7 (its stack counts 1-6 on turns 1-6): W5PTC48C3B1H F33 163 -> 111,
 *   K7G9M8K4DWFW F17 134 -> 82 (Vulnerable 3: not more), VHLZ531VC9RE F17 146 -> 94; 7DXAW0ZBDFHP F23 T7 killed both enemies.
 * - Parrying Shield: 6 to one random enemy when we end the turn with at least 10 block (an enemy lost exactly 6 on 16 of 26
 *   turns ending at 10 block and 160 of 235 above, 0 of 14 at 9): taken as possible whatever our block, to be safe.
 * - The Bomb: its countdown is the power's amount (3, 2, 1), it goes off as a turn ends at 1.
 * - Screaming Flagon (no cards in hand at the end of the turn), a card in the exhaust pile playing itself at the end of the
 *   turn (Howl from Beyond), Stampede (an Attack in hand played at a random enemy), a relic hitting the enemies when an
 *   Ethereal card is exhausted (Charon's Ashes, Forgotten Soul), anything else midTurnRisks.endOfTurn names: refused.
 * - Poison: an enemy loses its poison as its turn starts, before it attacks.
 */
function endOfTurnHits(
  state: GameState,
  hand: Record<string, unknown>[],
  etherealHeld: number,
  knowledge: Pick<Knowledge, "power" | "relic"> | undefined,
): { sources: { name: string; all: boolean; damage: number; attack?: true }[]; refuse: string | null } {
  const sources: { name: string; all: boolean; damage: number; attack?: true }[] = [];
  const run = asRecord(state.raw["run"]);
  const combat = asRecord(state.raw["combat"]);
  const handled = new Set<string>();
  for (const relic of asArray(run["relics"]).map(asRecord)) {
    const id = str(relic["relic_id"]);
    const name = str(relic["name"], id);
    if (id === "STONE_CALENDAR") {
      handled.add(`${name} (relic)`);
      const stack = numOrNull(relic["stack"]);
      if (stack !== null && stack !== state.turn) return { sources, refuse: `${name}'s count (${stack}) is not the turn (${state.turn ?? "?"})` };
      if (state.turn === STONE_CALENDAR.turn) sources.push({ name: `${name} (${STONE_CALENDAR.damage} to every enemy at the end of T${STONE_CALENDAR.turn})`, all: true, damage: STONE_CALENDAR.damage });
    } else if (id === "PARRYING_SHIELD") {
      handled.add(`${name} (relic)`);
      sources.push({ name: `${name} (${PARRYING_SHIELD_DAMAGE} to a random enemy)`, all: false, damage: PARRYING_SHIELD_DAMAGE });
    } else if (id === "SCREAMING_FLAGON") {
      handled.add(`${name} (relic)`);
      if (hand.length === 0) return { sources, refuse: `${name} hits every enemy when the turn ends with no cards in hand (its damage not known)` };
    } else if (etherealHeld > 0 && /消耗[^。]*(?:伤害|失去)|exhaust[^.]*damage/i.test(str(relic["description"]) || (knowledge?.relic(id)?.description ?? ""))) {
      return { sources, refuse: `${name} hits the enemies when the held Ethereal cards are exhausted at the end of the turn` };
    }
  }
  for (const power of asArray(asRecord(combat["player"])["powers"]).map(asRecord)) {
    const id = str(power["power_id"]);
    const name = str(power["name"], id);
    if (id === "THE_BOMB_POWER") {
      handled.add(`${name} (power)`);
      if (num(power["amount"]) <= 1) sources.push({ name: `${name} (at most ${THE_BOMB_MAX} to every enemy as it goes off)`, all: true, damage: THE_BOMB_MAX });
    } else if (id === "STAMPEDE_POWER") {
      handled.add(`${name} (power)`);
      if (hand.some((card) => /造成\d+点伤害|deal \d+ damage/i.test(str(card["resolved_rules_text"]) || str(card["rules_text"])))) {
        return { sources, refuse: `${name} plays an Attack in hand at a random enemy at the end of the turn` };
      }
    }
  }
  // A card in the exhaust pile that plays itself at the end of the turn (Howl from Beyond: 「对所有敌人造成18点伤害。 在你的回合结束时，
  // 如果这张牌在你的消耗牌堆中，则将其打出」): an attack on every enemy, its number plus our Strength each copy; anything else refused.
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  const strength = Math.max(0, powerAmount(asRecord(combat["player"]), "STRENGTH_POWER"));
  for (const entry of asArray(view["exhaust"]).map(asRecord)) {
    const line = str(entry["line"]);
    if (!/回合结束时[^。]*消耗牌堆中|end of your turn[^.]*exhaust pile/i.test(line)) continue;
    const name = line.split(/[：:\[*]/)[0]!.trim();
    const hit = /对所有敌人造成(\d+)点伤害|deal (\d+) damage to all enemies/i.exec(line);
    if (!hit) return { sources, refuse: `${name} plays itself from the exhaust pile at the end of the turn` };
    const copies = Math.max(1, Number(/\*(\d+)\s*\[/.exec(line)?.[1] ?? 1));
    sources.push({ name: `${name}${copies > 1 ? ` x${copies}` : ""} (plays itself from the exhaust pile)`, all: true, damage: (Number(hit[1] ?? hit[2]) + strength) * copies, attack: true });
  }
  const heldHit = hand.find((card) => /回合结束时[^。]*手牌中[^。]*敌人|end of your turn[^.]*in your hand[^.]*enem/i.test(str(card["resolved_rules_text"]) || str(card["rules_text"])));
  if (heldHit) return { sources, refuse: `${str(heldHit["name"], str(heldHit["card_id"]))} in hand acts on the enemies at the end of the turn` };
  const other = midTurnRisks(state, knowledge).endOfTurn.filter((name) => !handled.has(name));
  if (other.length > 0) return { sources, refuse: `hitting the enemies at the end of the turn: ${other.join(", ")}` };
  return { sources, refuse: null };
}
/** Powers that hit the enemies when we lose HP on our turn (a held card's damage past our block). */
const ON_OWN_HP_LOSS = /失去生命时[^。]*敌人|lose hp[^.]*enem/i;

/**
 * Why the held cards' end-of-turn damage cannot make the death certain on this board (null: it can): an amount the text
 * does not give; a power hitting the enemies when that damage gets past our block (Inferno); a relic or power acting by
 * chance (midTurnRisks). Tungsten Rod and Beating Remnant (ownLoss), retaliation, poison and what hits the enemies at the
 * end of the turn (endOfTurnHits) are counted for every verdict.
 */
function heldGuard(
  state: GameState,
  held: { damage: number; loss: number; inexact: string[] },
  block: number,
  endBlock: number,
  knowledge: Pick<Knowledge, "power" | "relic"> | undefined,
): string | null {
  if (held.inexact.length > 0) return `${held.inexact.join(", ")}: the end-of-turn amount is not given`;
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  const powers = asArray(player["powers"]).map(asRecord);
  if (held.loss > 0 || held.damage > block + endBlock) {
    const onLoss = powers.find((power) => str(power["power_id"]) === "INFERNO_POWER" || ON_OWN_HP_LOSS.test(knowledge?.power(str(power["power_id"]))?.description ?? ""));
    if (onLoss) return `${str(onLoss["power_id"])} hits the enemies when the held cards take HP on our turn`;
  }
  // What hits the enemies at the end of the turn (and poison) is judged for every verdict (endOfTurnHits); anything else
  // acting by chance this turn is not certain here.
  const parrying = asArray(asRecord(state.raw["run"])["relics"]).map(asRecord).filter((relic) => str(relic["relic_id"]) === "PARRYING_SHIELD").map((relic) => `${str(relic["name"], "PARRYING_SHIELD")} (relic)`);
  const chance = midTurnRisks(state, knowledge).chance.filter((name) => !parrying.includes(name));
  if (chance.length > 0) return `acting by chance: ${chance.join(", ")}`;
  return null;
}

/** What the turn planner knew when it found every line dying (combat-plan leastLossFactsOf). */
export interface LeastLossFacts {
  /** SL_RETRY_KNOWN_DRAWS: the exactly known draws the solver drew from (0: none). */
  knownDraws: number;
  /**
   * Every card any simulated line could draw is exactly known (known draws, none past their exact part, no card that
   * changes the pile, no drawing potion): the verdict used the real cards.
   */
  drawsKnown: boolean;
  /** Some simulated line draws a card. */
  draws: boolean;
  /** The least-loss line, its steps as the rationale names them (the first is the decision's own; empty: end the turn). */
  line: string[];
  /** What leaves the all-lines-die verdict to chance or to the unmodelled (a random potion, a random card, ...), null: nothing. */
  chance: string | null;
}

/** The planner label whose end_turn means "every simulated line dies; ending the turn keeps the most HP". */
export const LEAST_LOSS_LABEL = "combat/least-loss";
const SPECIAL_ENEMY_HP = 1_000_000;
const SAVING_POWERS = ["BUFFER_POWER", "INTANGIBLE_POWER"];
const END_BLOCK_POWERS = ["PLATING_POWER", "PLATED_ARMOR_POWER", "METALLICIZE_POWER"];
const ORICHALCUM_BLOCK = 6;
/** Card text that draws (the game's Chinese text, or English). */
const DRAWS = /抽|draw/i;

function powerAmount(entity: Record<string, unknown>, id: string): number {
  return asArray(entity["powers"])
    .map(asRecord)
    .filter((power) => str(power["power_id"]) === id)
    .reduce((sum, power) => sum + num(power["amount"]), 0);
}

export function judgeEndTurn(state: GameState, context: JudgeContext): DeathVerdict {
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  const run = asRecord(state.raw["run"]);
  const hp = num(player["current_hp"]);
  const block = num(player["block"]);
  const hand = asArray(combat["hand"]).map(asRecord);
  const relics = new Set(asArray(run["relics"]).map((relic) => str(asRecord(relic)["relic_id"])));
  const living = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  let incoming = 0;
  const killers: string[] = [];
  // Named as the combat options name them (「残杀千足虫 (MIDDLE)」, controller livingNames).
  const names = distinctNames(living.map((enemy) => ({ name: str(enemy["name"], str(enemy["enemy_id"], "?")), id: str(enemy["enemy_id"]) })));
  // Each living enemy's hits, in board order (Tungsten Rod counts hits; an enemy killed at the end of the turn drops its own).
  const hitsOf: number[][] = living.map(() => []);
  for (const [i, enemy] of living.entries()) {
    let own = 0;
    const labels: string[] = [];
    for (const intent of asArray(enemy["intents"]).map(asRecord)) {
      const damage = numOrNull(intent["damage"]);
      if (damage === null || damage <= 0) continue;
      const hits = Math.max(1, numOrNull(intent["hits"]) ?? 1);
      own += damage * hits;
      for (let h = 0; h < hits; h += 1) hitsOf[i]!.push(damage);
      labels.push(`${str(intent["intent_type"], "Attack")} ${hits > 1 ? `${damage}x${hits}` : damage}`);
    }
    incoming += own;
    if (own > 0) killers.push(`${names[i]} (${labels.join(", ")})`);
  }
  let endBlock = END_BLOCK_POWERS.reduce((sum, id) => sum + powerAmount(player, id), 0);
  if (relics.has("CLOAK_CLASP")) endBlock += hand.length;
  const etherealHeld = hand.filter((card) => (context.ethereal ?? ((held) => heldCardEthereal(held)))(card)).length;
  endBlock += powerAmount(player, "FEEL_NO_PAIN_POWER") * etherealHeld;
  if (relics.has("ORICHALCUM") && block + endBlock <= 0) endBlock += ORICHALCUM_BLOCK;
  const regen = powerAmount(player, "REGEN_POWER");
  // Held cards (Burn, Wither, Beckon): their end-of-turn damage meets block, the end-of-turn block included (it comes first:
  // 11 of 11 logged turns where the order showed, e.g. ZANMLV9UU31K F42 T3, Burn 8 against Plating 5 took 3), and their HP
  // loss does not. Neither the mod's flag nor the plain count sees them (TMNFVW6DRQ20 F48 T8: 15 HP + 28 block against the
  // Aeonglass's 19x2 and a held Wither+'s 9, the mod did not flag it, it died with 5 retries left).
  const held = heldEndOfTurn(hand);
  // Tungsten Rod and Beating Remnant in our count (ownLoss); without them the count as before.
  const rod = relics.has("TUNGSTEN_ROD");
  const remnant = relics.has("BEATING_REMNANT");
  const exactly = rod || remnant;
  const lossWith = (hits: number[], withHeld: boolean) =>
    ownLoss({ hits, heldDamages: withHeld ? held.damages : [], heldLosses: withHeld ? held.losses : [], block, endBlock, hp, rod, remnant, lostSoFar: context.lostSoFar });
  const allHits = hitsOf.flat();
  const plainOwn = exactly ? lossWith(allHits, false) : null;
  const heldOwn = exactly ? lossWith(allHits, true) : null;
  const countUnknown = (plainOwn?.unknown ?? false) || (heldOwn?.unknown ?? false);
  const plainDies = plainOwn ? !plainOwn.unknown && plainOwn.loss - regen >= hp : incoming - block - endBlock - regen >= hp;
  const heldDies = heldOwn ? !heldOwn.unknown && heldOwn.loss - regen >= hp : Math.max(0, incoming + held.damage - block - endBlock) + held.loss - regen >= hp;
  // The held cards make the difference: the death rests on them (and on heldGuard).
  const byHeld = !plainDies && heldDies && held.damage + held.loss > 0;
  const heldNote = held.damage + held.loss > 0 ? { held: { damage: held.damage, loss: held.loss, from: held.from } } : {};
  const verdict = (certain: boolean, tier: JudgeTier | null, reason: string): DeathVerdict => ({
    certain, tier, reason, hp, block, endBlock, incoming, killers, ...heldNote, ...(plainDies || heldDies ? { ownCountDies: true as const } : {}),
  });

  if (state.screen !== "COMBAT" || !state.in_combat) return verdict(false, null, "not in combat");
  if (combat["end_turn_will_kill_player"] !== true && !byHeld) return verdict(false, null, "the mod does not flag ending the turn as lethal");
  if (context.revives.length > 0) return verdict(false, null, `a revive is left (${context.revives.join(", ")})`);
  const saving = SAVING_POWERS.filter((id) => powerAmount(player, id) > 0);
  if (saving.length > 0) return verdict(false, null, `${saving.join(", ")} up`);
  if (relics.has("RIPPLE_BASIN") && num(player["attacks_played_this_turn"]) === 0) return verdict(false, null, "Ripple Basin (no attack played): its block is not counted here");
  const special = living.find(
    (enemy) => num(enemy["max_hp"]) >= SPECIAL_ENEMY_HP || asArray(enemy["intents"]).some((intent) => str(asRecord(intent)["intent_type"]) === "DeathBlow"),
  );
  if (special) return verdict(false, null, `${str(special["name"], str(special["enemy_id"]))} is in a special phase (DeathBlow or a million HP)`);
  const heldText = `held ${held.from.join(", ")}: ${held.damage} damage${held.loss > 0 ? ` + ${held.loss} HP loss` : ""}`;
  const relicText = [rod ? "Tungsten Rod: each HP loss 1 less" : "", remnant ? `Beating Remnant: at most ${BEATING_REMNANT_CAP} lost this turn${context.lostSoFar !== undefined ? `, ${context.lostSoFar} lost so far` : ""}` : ""].filter(Boolean).join("; ");
  if (countUnknown) return verdict(false, null, `own count not exact: Beating Remnant caps the HP lost this turn at ${BEATING_REMNANT_CAP} and the HP lost so far this turn is not known exactly`);
  if (!plainDies && !byHeld) {
    if (exactly) return verdict(false, null, `own count survives: ${heldOwn!.loss} HP lost (${relicText}) - ${regen} Regen < ${hp} HP${held.damage + held.loss > 0 ? ` (with ${heldText})` : ""}`);
    return verdict(false, null, `own count survives: ${incoming} incoming - ${block} block - ${endBlock} end-of-turn block - ${regen} Regen < ${hp} HP${held.damage + held.loss > 0 ? ` (with ${heldText})` : ""}`);
  }
  if (byHeld) {
    const guard = heldGuard(state, held, block, endBlock, context.knowledge);
    if (guard) return verdict(false, null, `only the held cards make it lethal (${heldText}), and ${guard}`);
  }
  // What hits the enemies after we end the turn and before they act (Stone Calendar, The Bomb, Parrying Shield, poison):
  // an attacker it may kill does not attack. Certain only if we die even without every enemy it may kill (and, when one
  // of them is not a minion, without the minions too: they may leave with it).
  const ends = endOfTurnHits(state, hand, etherealHeld, context.knowledge);
  if (ends.refuse) return verdict(false, null, `the enemies may be hit before they act: ${ends.refuse}`);
  const powersOf = (enemy: Record<string, unknown>) => asArray(enemy["powers"]).map(asRecord);
  const cruelty = powerAmount(player, "CRUELTY_POWER");
  // Each enemy's most damage before it acts (an upper bound: Vulnerable did not add to Stone Calendar's 52, K7G9M8K4DWFW
  // F17, Cruelty might; an attack's Vulnerable taken at Paper Phrog's 75%) and its poison.
  const before = living.map((enemy) => {
    const vulnerable = powersOf(enemy).some((power) => str(power["power_id"]) === "VULNERABLE_POWER" && num(power["amount"]) > 0);
    const amp = vulnerable && cruelty > 0 ? 1.5 * (1 + cruelty / 100) : 1;
    const attackAmp = vulnerable ? 1.75 * (1 + cruelty / 100) : 1;
    const hit = ends.sources.reduce((sum, source) => sum + source.damage * (source.attack ? attackAmp : amp), 0);
    const poison = powersOf(enemy).filter((power) => str(power["power_id"]) === "POISON_POWER").reduce((sum, power) => sum + num(power["amount"]), 0);
    return { hit, poison, hp: num(enemy["current_hp"]) };
  });
  const mayDie = living
    .map((enemy, i) => {
      const { hit, poison, hp: hpLeft } = before[i]!;
      return { i, enemy, dies: (hit > 0 && hit >= hpLeft) || (poison > 0 && poison >= hpLeft), why: poison > 0 && poison >= hpLeft ? `its poison (${poison})` : ends.sources.map((source) => source.name).join(" + ") };
    })
    .filter((entry) => entry.dies);
  let endNote = "";
  // Retaliation (Thorns, Flame Barrier: each hit an attacker lands, it takes this much back, before its next hit): an attacker
  // may die before its last hits (2WUMK6PK5QHD F48 T8: 30 HP + 30 block against 80 with Flame Barrier 6, flagged lethal and
  // certain, lived). Its HP taken at the lowest it may be (less what may hit it at the end of the turn, its block ignored).
  const retaliation = powerAmount(player, "THORNS_POWER") + powerAmount(player, "FLAME_BARRIER_POWER");
  const landing = (i: number): number[] => {
    if (retaliation <= 0) return hitsOf[i]!;
    const lowest = Math.max(1, before[i]!.hp - before[i]!.hit - before[i]!.poison);
    return hitsOf[i]!.slice(0, Math.ceil(lowest / retaliation));
  };
  const cut = living.map((_, i) => i).filter((i) => landing(i).length < hitsOf[i]!.length);
  if (mayDie.length > 0 || cut.length > 0) {
    const minion = (enemy: Record<string, unknown>) => asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "MINION_POWER");
    const leaderMayDie = mayDie.some((entry) => !minion(entry.enemy));
    const gone = new Set(mayDie.map((entry) => entry.i));
    if (leaderMayDie) living.forEach((enemy, i) => minion(enemy) && gone.add(i));
    if (cut.some((i) => !minion(living[i]!))) living.forEach((enemy, i) => minion(enemy) && gone.add(i));
    const keptHits = living.map((_, i) => i).filter((i) => !gone.has(i)).flatMap((i) => landing(i));
    const kept = keptHits.reduce((sum, hit) => sum + hit, 0);
    const keptOwn = exactly ? lossWith(keptHits, true) : null;
    const stillDies = keptOwn ? !keptOwn.unknown && keptOwn.loss - regen >= hp : Math.max(0, kept + held.damage - block - endBlock) + held.loss - regen >= hp;
    const who = [
      ...mayDie.map((entry) => `${names[entry.i]} (${entry.why}) may die first`),
      ...cut.filter((i) => !gone.has(i)).map((i) => `${names[i]} may die to our retaliation (${retaliation} a hit) after ${landing(i).length} of its ${hitsOf[i]!.length} hits`),
    ].join(", ");
    if (!stillDies) return verdict(false, null, `the enemies may be hit before they act: ${who}, and the rest's ${kept} does not kill`);
    endNote = `; even if ${who}`;
  }
  const playable = hand.filter((card) => card["playable"] === true);
  const drinkable = asArray(run["potions"]).map(asRecord).filter((slot) => slot["occupied"] !== false && str(slot["potion_id"]) && slot["can_use"] === true);
  const lethal = `${incoming} incoming${byHeld ? ` + ${heldText}${combat["end_turn_will_kill_player"] !== true ? " (the mod does not count them)" : ""}` : ""} vs ${hp} HP + ${block} block + ${endBlock} end-of-turn block${regen > 0 ? ` + ${regen} Regen` : ""}${exactly ? ` (${relicText})` : ""}${endNote}`;
  if (playable.length === 0 && drinkable.length === 0) return verdict(true, "rules", `nothing left to play or drink; ${lethal}`);
  if (context.label === LEAST_LOSS_LABEL) {
    const drawing = playable.find((card) => DRAWS.test(`${str(card["resolved_rules_text"])} ${str(card["rules_text"])}`));
    if (drawing && context.drawsKnown !== true) return verdict(false, null, `the planner sees every line die, but ${str(drawing["name"], str(drawing["card_id"]))} draws (unknown cards)`);
    const known = drawing ? `; ${str(drawing["name"], str(drawing["card_id"]))} draws, but every draw the lines made is a known card (SL retry)` : "";
    return verdict(true, "least-loss", `the turn planner: every simulated line dies and ending the turn keeps the most HP; ${lethal}${known}`);
  }
  return verdict(false, null, `${playable.length} playable card(s) and ${drinkable.length} potion(s) left`);
}

/**
 * Relics the turn planner models (combat-plan, turn-solver) or this judge counts: what they do mid-turn is in the
 * verdict (Kusarigama's random hit is the planner's own fact, LeastLossFacts.chance).
 */
const MODELLED_RELICS = new Set(["DEMON_TONGUE", "INTIMIDATING_HELMET", "KUSARIGAMA", "LOST_WISP", "MUSIC_BOX", "PAELS_EYE", "PEN_NIB", "RIPPLE_BASIN", "SELF_FORMING_CLAY", "SHURIKEN", "VAMBRACE"]);
/**
 * Player powers the turn planner reads (combat-plan's PlayerSim, turn-solver). Juggernaut's random hit and Dark Embrace's
 * draws are the planner's own facts; Hellraiser plays a drawn Strike at a random enemy: not here.
 */
const MODELLED_POWERS = new Set([
  "BARRICADE_POWER", "BLUR_POWER", "BUFFER_POWER", "COLOSSUS_POWER", "CONSTRICT_POWER", "CRIMSON_MANTLE_POWER", "DARK_EMBRACE_POWER", "DEXTERITY_POWER",
  "DISINTEGRATION_POWER", "DUPLICATION_POWER", "FEEL_NO_PAIN_POWER", "FLAME_BARRIER_POWER", "FREE_ATTACK_POWER", "INFERNO_POWER", "INTANGIBLE_POWER",
  "JUGGERNAUT_POWER", "METALLICIZE_POWER", "NO_BLOCK_POWER", "NO_DRAW_POWER", "ONE_TWO_PUNCH_POWER", "PLATING_POWER", "PLATED_ARMOR_POWER", "RAGE_POWER",
  "REGEN_POWER", "RINGING_POWER", "ROLLING_BOULDER_POWER", "RUPTURE_POWER", "SELF_FORMING_CLAY_POWER", "SHRINK_POWER", "SLOTH_POWER", "SMOGGY_POWER",
  "STRENGTH_POWER", "SURROUNDED_POWER", "TENDER_POWER", "THE_GAMBIT_POWER", "THORNS_POWER", "UNMOVABLE_POWER", "VIGOR_POWER", "VULNERABLE_POWER", "WEAK_POWER",
]);
/** A relic's or power's text that acts on something done during the turn (the game's Chinese text, or English). */
const MID_TURN = /每当|你每|第一次|当你没有|当你在本回合|如果你在本回合|whenever|every time|each time|the first time/i;
/** ...unless it is about something else: a pickup, the map, a shop or rest, the fight's or a turn's start or end, the deck. */
const NOT_MID_TURN = /拾起时|商店|休息|宝箱|进入|战斗结束|战斗开始时|回合开始时|回合结束时|卡牌奖励|牌组|金币|upon pickup|shop|rest site|start of|end of (?:your |the )?(?:turn|combat)|card reward|your deck/i;
/** Text that draws, or changes the draw pile (Headbutt-like "抽牌堆" too). */
const DRAWS_OR_PILE = /抽|draw/i;

/** Relics and powers that act during this turn without the turn planner, or by chance (SL_RELOAD_EARLY, SL_JUDGE_KNOWN_DRAWS). */
export interface MidTurnRisks {
  /** Those that draw or change our draw pile (an enemy's Personal Hive adds Dazed when hit): the known draws are not sure. */
  draws: string[];
  /** All that act mid-turn without the planner: block, HP, damage, energy, draws the verdict did not see. */
  any: string[];
  /** Those acting by chance this turn, its end included (Juggernaut-like powers, Stampede, Parrying Shield, Forgotten Soul). */
  chance: string[];
  /**
   * Those hitting the enemies at the end of our turn, before they act (Stone Calendar on its turn, Screaming Flagon, The
   * Bomb): an attacker they kill does not attack. Neither the mod's flag nor our count sees them (7DXAW0ZBDFHP F23 T7: 3 HP
   * + 13 block against 38, flagged lethal; Stone Calendar's T7 blast killed both enemies and the fight was won).
   */
  endOfTurn: string[];
}

/** Relic text about something outside this turn's play (a pickup, the map, a shop or rest, a fight's or turn's start, the deck). */
const NOT_THIS_TURN = /拾起时|商店|休息|宝箱|进入|战斗结束|战斗开始时|回合开始时|卡牌奖励|牌组|金币|upon pickup|shop|rest site|start of|card reward|your deck/i;
const CHANCE = /随机|random/i;
/** Text that hits the enemies at the end of our turn. */
const END_OF_TURN_HIT = /回合结束时|end of (?:your |the )?turn/i;
const HITS_ENEMIES = /(敌人|enem)[^。.]*(伤害|damage|失去)|(伤害|damage)[^。.]*(敌人|enem)/i;

/**
 * What on this board acts during the turn without the planner, or by chance: a relic or a player power whose text triggers
 * on something done mid-turn (MID_TURN, not NOT_MID_TURN) and that the planner does not model (MODELLED_RELICS,
 * MODELLED_POWERS); a player power with no text known (counted, to be safe); an enemy power that changes our draw pile;
 * and any relic or power whose text says random (CHANCE) about this turn, its end included.
 */
export function midTurnRisks(state: GameState, knowledge?: Pick<Knowledge, "power" | "relic">): MidTurnRisks {
  const draws: string[] = [];
  const any: string[] = [];
  const chance: string[] = [];
  const endOfTurn: string[] = [];
  const run = asRecord(state.raw["run"]);
  for (const relic of asArray(run["relics"]).map(asRecord)) {
    const id = str(relic["relic_id"]);
    if (!id) continue;
    const text = str(relic["description"]) || (knowledge?.relic(id)?.description ?? "");
    const name = `${str(relic["name"], id)} (relic)`;
    if (CHANCE.test(text) && !NOT_THIS_TURN.test(text) && id !== "KUSARIGAMA") chance.push(name);
    if (END_OF_TURN_HIT.test(text) && HITS_ENEMIES.test(text)) endOfTurn.push(name);
    if (MODELLED_RELICS.has(id) || !MID_TURN.test(text) || NOT_MID_TURN.test(text)) continue;
    any.push(name);
    if (DRAWS_OR_PILE.test(text)) draws.push(name);
  }
  const combat = asRecord(state.raw["combat"]);
  for (const power of asArray(asRecord(combat["player"])["powers"]).map(asRecord)) {
    const id = str(power["power_id"]);
    if (!id) continue;
    const text = knowledge?.power(id)?.description ?? "";
    const name = `${str(power["name"], id)} (power)`;
    if (CHANCE.test(text) && id !== "JUGGERNAUT_POWER" && id !== "HELLRAISER_POWER") chance.push(name);
    if (END_OF_TURN_HIT.test(text) && HITS_ENEMIES.test(text)) endOfTurn.push(name);
    if (MODELLED_POWERS.has(id)) continue;
    if (!text) {
      any.push(`${name}, its text unknown`);
      draws.push(`${name}, its text unknown`);
      continue;
    }
    if (!MID_TURN.test(text) || NOT_MID_TURN.test(text)) continue;
    any.push(name);
    if (DRAWS_OR_PILE.test(text)) draws.push(name);
  }
  for (const enemy of asArray(combat["enemies"]).map(asRecord).filter((entry) => entry["is_alive"] !== false)) {
    for (const power of asArray(enemy["powers"]).map(asRecord)) {
      const id = str(power["power_id"]);
      const text = knowledge?.power(id)?.description ?? "";
      const name = `${str(enemy["name"], str(enemy["enemy_id"]))}'s ${str(power["name"], id)}`;
      if (/抽牌堆|draw pile/i.test(text)) {
        draws.push(name);
        any.push(name);
      }
      if (CHANCE.test(text)) chance.push(name);
    }
  }
  return { draws, any, chance, endOfTurn };
}

/** The enemy intents the game shows (and the solver and the mod count): a living enemy with none, or an unknown kind, is not shown. */
const SHOWN_INTENTS = new Set(["Attack", "Buff", "Debuff", "DebuffStrong", "Defend", "StatusCard", "CardDebuff", "Summon", "Stun", "Sleep", "Heal", "Escape"]);

/** A living enemy whose intent is not shown (no intent, or a kind not in SHOWN_INTENTS), or null. */
export function intentNotShown(state: GameState): string | null {
  for (const enemy of asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((entry) => entry["is_alive"] !== false)) {
    const intents = asArray(enemy["intents"]).map(asRecord);
    const name = str(enemy["name"], str(enemy["enemy_id"], "?"));
    if (intents.length === 0) return `${name} shows no intent`;
    const odd = intents.find((intent) => !SHOWN_INTENTS.has(str(intent["intent_type"])));
    if (odd) return `${name}'s intent ${str(odd["intent_type"], "?")} is not a plain one`;
  }
  return null;
}

export interface LeastLossNowContext extends Omit<JudgeContext, "label" | "drawsKnown" | "knowledge"> {
  /** The planner's facts about its least-loss verdict (combat-plan leastLossFactsOf); absent: no early reload. */
  facts: LeastLossFacts | undefined;
  /** SL_JUDGE_KNOWN_DRAWS is on (exactly known draws lift the draw veto). */
  knownDrawsJudge: boolean;
  /** A card was added to the draw pile at a random place in this attempt (the draw tracker): chance in the pile. */
  addedToPile: boolean;
  knowledge?: Pick<Knowledge, "power" | "relic">;
}

/**
 * SL_RELOAD_EARLY (Dai 2026-10-02: certain death only, never a prediction): the least-loss verdict at the decision that
 * finds it, before its line is played. Certain only when every one of these holds; otherwise end_turn judges, unchanged:
 * 1. judgeEndTurn is certain on this board with the least-loss label: the mod's end_turn_will_kill_player, our own count,
 *    no revive, no Buffer or Intangible, no Ripple Basin without an attack played, no special phase, and the least-loss
 *    tier (every simulated line dies; no unmodelled potion) with its draw veto (lifted only by exactly known draws).
 * 2. Nothing in the verdict left to chance (LeastLossFacts.chance): no random potion; no line drawing a card that is not
 *    exactly known; no playable card (hand, modelled potion, known draw) with a random target, a random exhaust, a random
 *    card made or a top card played, nor an unmodelled one; no Juggernaut, Kusarigama or Hellraiser random hit.
 * 3. No card added to the draw pile at a random place in this attempt (`addedToPile`).
 * 4. The enemies' intents as shown (intentNotShown), and no relic or power acting by chance this turn (midTurnRisks.chance).
 * 5. No relic or power acting mid-turn that the planner does not model (midTurnRisks.any): its block, HP, damage, energy
 *    or draws would only show on the board at end_turn; and none hitting the enemies at the end of our turn
 *    (midTurnRisks.endOfTurn: Stone Calendar, Screaming Flagon, The Bomb), which neither the mod's flag nor our count sees.
 */
export function judgeLeastLossNow(state: GameState, context: LeastLossNowContext): DeathVerdict {
  const facts = context.facts;
  const risks = midTurnRisks(state, context.knowledge);
  const drawsKnown = context.knownDrawsJudge && facts?.drawsKnown === true && risks.draws.length === 0;
  const verdict = judgeEndTurn(state, {
    label: LEAST_LOSS_LABEL,
    revives: context.revives,
    ...(context.ethereal ? { ethereal: context.ethereal } : {}),
    ...(context.knowledge ? { knowledge: context.knowledge } : {}),
    ...(context.lostSoFar !== undefined ? { lostSoFar: context.lostSoFar } : {}),
    ...(drawsKnown ? { drawsKnown: true } : {}),
  });
  if (!verdict.certain) return verdict;
  const notYet = (why: string): DeathVerdict => ({ ...verdict, certain: false, tier: null, reason: `not before the line is played: ${why}` });
  if (!facts) return notYet("the planner's facts about its verdict are missing");
  if (facts.chance !== null) return notYet(`chance in the verdict (${facts.chance})`);
  if (facts.draws && !drawsKnown) return notYet("a line draws cards not exactly known");
  if (context.addedToPile) return notYet("cards were added to the draw pile at random places this attempt");
  const hidden = intentNotShown(state);
  if (hidden) return notYet(hidden);
  if (risks.chance.length > 0) return notYet(`acting by chance: ${risks.chance.join(", ")}`);
  if (risks.any.length > 0) return notYet(`acting mid-turn without the planner: ${risks.any.join(", ")}`);
  if (risks.endOfTurn.length > 0) return notYet(`hitting the enemies at the end of the turn: ${risks.endOfTurn.join(", ")}`);
  return { ...verdict, early: true, reason: `at the least-loss verdict, before its line (${facts.line.join(", ") || "end turn"}): ${verdict.reason}` };
}

/** SL_JUDGE_KNOWN_DRAWS at end_turn: every draw the lines could make is exactly known, and nothing draws or changes the pile unseen. */
export function drawsKnownAt(state: GameState, facts: LeastLossFacts | undefined, knowledge?: Pick<Knowledge, "power" | "relic">): boolean {
  return facts?.drawsKnown === true && midTurnRisks(state, knowledge).draws.length === 0;
}
