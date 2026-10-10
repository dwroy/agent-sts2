/**
 * SL's certain-death check (docs/sl.md §2): asked only when the loop is about to send `end_turn` in a fight that may
 * be retried. It says "certain" only when every condition below holds; anything it cannot rule out is a veto
 * (Roy 2026-10-02: when unsure, no SL).
 *
 * Common conditions:
 * - the mod's own flag, combat.end_turn_will_kill_player, is true (the intents against the block up now);
 * - the revives held (Fairy in a Bottle, an unspent Lizard Tail: `revives`, from combat-plan's revivesOf) cannot stop it: the
 *   end of the turn played out loss by loss with them, in every order the game's could be (throughRevives, reviveOutcome;
 *   docs/sl.md §2.7), still ends at 0 (ops 2026-10-03, ET3V5177HXSY F48 T13: "a revive is left" was the answer whatever
 *   the turn did after it). Tungsten Rod and Beating Remnant are played out with them at the most they can save (each
 *   loss 1 less; the cap at its lowest, the whole loss counted against it). Refused with a revive: the Sandpit, Buffer or
 *   Intangible, a death only at the next turn's start after it; the least-loss tier only where the planner's one order of
 *   the revive is the only one. SL_RELOAD_ON_REVIVE (default off): the revives not counted;
 * - no enemy in a special phase (max HP at or above a million, a DeathBlow intent: specialPhase), except the Waterfall
 *   Giant's husk on its blast turn, alone, its one DeathBlow intent giving the number (docs/sl.md §2.4; ops 2026-10-03,
 *   QLL4VM0WZKW3 F17 T13: 33 HP, no block, nothing to play or drink against the shown 50, refused, died with 6 retries
 *   left). The blast is judged as an attack by the rules below: the shown number is what hits, after the end-of-turn
 *   block (all 76 logged blast turns), and the fight ends with it; so our own loss at the next turn's start never makes
 *   it certain there (that turn does not come when we live through the blast).
 * - our own count agrees: the attack intents (damage x hits) minus the block up now, the block that comes at the end
 *   of the turn (Plating / Plated Armor / Metallicize, Cloak Clasp for each card held, Feel No Pain for each Ethereal
 *   card held, Orichalcum when the cards left no block, whatever the other end-of-turn block, Ripple Basin's 4 when no
 *   Attack was played) and Regen reach our HP; with Tungsten Rod, Beating Remnant, Buffer and Intangible the count is
 *   theirs (ownLoss: Buffer's N largest losses and Intangible's 1 a loss at the most they save).
 *
 * Every refusal below stands for something whose effect cannot be bounded from what the board shows (Roy 2026-10-04:
 * "bound it, or say why it cannot be"); what can be is counted at the most it can save (the most block, the most it may
 * hit the enemies for, the least damage it lets through), and the death judged at that bound
 * (tools/sl-judge-bounds-replay.ts: every logged end_turn board, before and after).
 * - Held cards' end-of-turn damage (Burn, Wither; through block) and HP loss (Beckon; past it) count too (2026-10-02,
 *   TMNFVW6DRQ20 F48 T8), and so does Disintegration's (the Knowledge Demon's curse, through block like Burn:
 *   withEndOfTurnPowers; 2026-10-04, 79YRPJ8TCCZ5 F33 T6). When only they make the turn lethal, the death rests on them: certain even without the mod's
 *   flag (it does not count them), but only with every amount given (Regret's, the cards in hand, at its least) and
 *   nothing acting by chance before that death (heldGuard).
 * - So does our own HP loss at the next turn's start (Inferno's 1 for each copy up, Crimson Mantle's cost; 2026-10-02,
 *   610BBERH4SPP F33 T3; 2026-10-03, C4F14F3XPN0N F33 attempt 5 T6: two Infernos took 2, the count had been 1 whatever the
 *   copies; strategy/start-loss.ts infernoCopies): when the enemy turn leaves us at that or under, the next turn opens with
 *   our death. Certain without the mod's flag too (Tungsten Rod: each part 1 less; Beating Remnant: this turn's loss
 *   capped, the start's under the next turn's cap), but not with Buffer or Intangible, a relic or power acting at the turn's
 *   start that may heal or shield us, Inferno's sweep at that loss able to kill every enemy (startGuard), or every enemy
 *   able to die before that loss comes: to what hits them at the end of our turn, their poison, our retaliation, and the
 *   next turn's opening before the loss (Hellraiser's drawn Strikes, Inferno's sweep, Mr Struggles, Juggernaut on the
 *   opening's block: startHitsBefore).
 * - So does the Insatiable's Sandpit at 1 (docs/sl.md §2.5; 2026-10-03, BVJT7HFW6X2S F33 T5): the enemy turn takes it to 0
 *   and eats us whatever the HP. Certain without the mod's flag, our count living, but only with the Insatiable alone, its
 *   move shown, and nothing that may kill it before its turn; Frantic Escape (the one thing that puts the count back) is a
 *   playable card like any other for the tiers below, and so is a draw that may bring one.
 * Then one of two tiers:
 * - "rules": no playable card in hand and no potion that can be drunk;
 * - "least-loss": the turn planner's own verdict on this board, combat/least-loss ending the turn: every simulated
 *   line dies (modelled potions included), no unmodelled potion and no random potion that may live, and the
 *   least-loss line is ending the turn. Vetoed when a playable card draws (the draws are not known), unless
 *   (SL_JUDGE_KNOWN_DRAWS, Roy 2026-10-02) every draw the simulated lines could make is exactly known (`drawsKnown`: the
 *   verdict already used the real cards; never the order resting on the added-cards model, draws.ts) and nothing
 *   changes the pile or draws mid-turn unseen.
 *
 * SL_JUDGE_ANY_DRAW (Roy 2026-10-03; docs/sl.md §2.3): the draw veto is also lifted when the death holds for every draw the
 * turn could make (anyDrawJudged on the planner's DrawBound): nothing can be drawn, the drawing card's own HP cost kills us
 * before it draws (R764HJWMJQ3V F33 T10, Offering at 5 HP), or every line dies with the whole draw pile in the hand.
 *
 * SL_RELOAD_EARLY (Roy 2026-10-02: "知道必死了就sl", and "我说的是必死 不是推演": a certain death, never a prediction):
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
import type { GameState } from "../hand/mod/schema.js";
import { BEATING_REMNANT_CAP, distinctNames, FAIRY_REVIVE_SHARE, LIZARD_TAIL_REVIVE_SHARE, MERCURY_HOURGLASS_DAMAGE } from "../reflex/combat-plan.js";
import { afterPlayFirst, heldCardEthereal, heldPenaltyOf, unconditionalText } from "../reflex/card-model.js";
import { CAPTAINS_WHEEL_TURN, HORN_CLEAT_TURN, PARRYING_SHIELD, RIPPLE_BASIN_BLOCK } from "../reflex/passive-pieces.js";
import { infernoCopies } from "../reflex/start-loss.js";
import { mantleHpCost } from "../reflex/turn-solver.js";
import { asArray, asRecord, num, numOrNull, str } from "../core/util/json.js";
import { randomTargetOnly, randomTargets } from "./random-target.js";

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
  /** Our own HP loss at the next turn's start (Inferno, 1 for each copy; Crimson Mantle) when the death rests on it. */
  startLoss?: number;
  /** The Insatiable's Sandpit count when the death rests on it (1: the enemy turn takes it to 0; docs/sl.md §2.5). */
  sandpit?: number;
  ownCountDies?: true;
  /**
   * The revives held, played out through the end of the turn (throughRevives; docs/sl.md §2.7): the ones it used, the HP
   * each brought us back to, and the HP left at the end (the most any order leaves); `saved`: above 0.
   */
  revive?: { held: string[]; used: string[]; backAt: number[]; hpLeft: number; saved: boolean };
  /** "name (intent)" for each living enemy that attacks. */
  killers: string[];
}

export interface JudgeContext {
  /** The label of the decision that chose end_turn (combat/least-loss is the planner's all-lines-die verdict). */
  label: string;
  /**
   * What can still revive us ("FAIRY_IN_A_BOTTLE", "LIZARD_TAIL"), in the order they fire (combat-plan revivesOf). A revive
   * keeps the death uncertain only when it may save us: the end of the turn is played out loss by loss with them
   * (throughRevives), and a death the revives cannot stop is judged like any other (docs/sl.md §2.7).
   */
  revives: readonly string[];
  /**
   * SL_RELOAD_ON_REVIVE (default off; Roy deciding): a board where only a revive would save us is judged as without it (the
   * revive not counted), so a death with nothing else that saves us reloads instead of burning the revive. Absent or false:
   * the revives are played out as above.
   */
  reloadOnRevive?: boolean;
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
  /**
   * SL_JUDGE_ANY_DRAW: the planner's bound over every draw (combat-plan drawBoundOf), asked only when a playable card that
   * draws would veto the least-loss tier. Absent (the switch off): the veto as before.
   */
  drawBound?: () => DrawBound | null;
  /**
   * Game data for the powers' text (the held cards' guards: a power acting by chance or at the end of the turn), and the
   * cards' types when given (Stampede's Attacks in hand; absent: Stampede refused as before).
   */
  knowledge?: Pick<Knowledge, "power" | "relic"> & Partial<Pick<Knowledge, "card">>;
  /**
   * The HP lost so far this turn, exactly (the controller: HP at the turn's first state less now, when it never rose and
   * nothing costs HP as the turn starts). Beating Remnant's cap needs it; absent: not known.
   */
  lostSoFar?: number;
  /**
   * When `lostSoFar` is not exact because the turn's start took HP of a known most (Crimson Mantle's cost, Inferno's 1 for each
   * copy): what the states showed lost this turn plus that most. Beating Remnant's cap is then taken at its lowest (ownLoss).
   */
  lostSoFarAtMost?: number;
}

/** A held card's end-of-turn clause about our HP whose amount the text does not give. */
const HELD_CLAUSE = /回合结束时[^。]*手牌中[^。]*(?:受到|失去)[^。]*(?:伤害|生命)|at the end of your turn[^.]*in your hand[^.]*(?:take|lose)[^.]*(?:damage|hp)/i;
/** Regret (「在你的回合结束时，如果这张牌在你的手牌中，失去相当于手牌数量的生命」): HP loss of the cards in hand. */
const HAND_SIZE_LOSS = /失去相当于手牌数量的生命|lose hp equal to the number of cards in your hand/i;

/**
 * Held cards' end-of-turn damage and HP loss (card-model heldPenaltyOf: 「受到N点伤害」 meets block, 「失去N点生命」 does not),
 * and the held cards whose clause gives no exact amount. Regret's loss is the cards in hand as it acts, at least the hand
 * less what may leave it first at the end of the turn (`leaveFirst`: the Ethereal cards exhausted, a held card exhausting
 * itself after its own clause, as Toxic's 「消耗」): its only game-data card without a number (VQKX9AD1YHKS F48 T7, A8: 2 HP +
 * 16 block, no attack shown, Regret with four cards in hand, left out of the count as "not given", died).
 */
function heldEndOfTurn(hand: Record<string, unknown>[], leaveFirst = 0): { damage: number; loss: number; from: string[]; inexact: string[]; damages: number[]; losses: number[]; items: OwnLoss[] } {
  let damage = 0;
  let loss = 0;
  const from: string[] = [];
  const inexact: string[] = [];
  const damages: number[] = [];
  const losses: number[] = [];
  const items: OwnLoss[] = [];
  const selfExhausting = hand.filter((card) => {
    const text = str(card["resolved_rules_text"]) || str(card["rules_text"]);
    return heldPenaltyOf(text).heldPenalty > 0 && /消耗|exhaust/i.test(text);
  }).length;
  const handLoss = Math.max(0, hand.length - leaveFirst - selfExhausting);
  for (const card of hand) {
    const text = str(card["resolved_rules_text"]) || str(card["rules_text"]);
    const { heldPenalty, heldHpLoss } = heldPenaltyOf(text);
    const name = str(card["name"], str(card["card_id"]));
    if (heldPenalty <= 0 && HAND_SIZE_LOSS.test(text)) {
      if (handLoss > 0) {
        loss += handLoss;
        losses.push(handLoss);
        items.push({ amount: handLoss, blocked: false });
        from.push(`${name} (${handLoss}: the cards in hand)`);
      }
    } else if (heldPenalty > 0) {
      damage += heldPenalty - heldHpLoss;
      loss += heldHpLoss;
      if (heldPenalty - heldHpLoss > 0) damages.push(heldPenalty - heldHpLoss);
      if (heldHpLoss > 0) losses.push(heldHpLoss);
      items.push(heldHpLoss > 0 ? { amount: heldHpLoss, blocked: false } : { amount: heldPenalty, blocked: true });
      from.push(name);
    } else if (HELD_CLAUSE.test(text)) inexact.push(name);
  }
  return { damage, loss, from, inexact, damages, losses, items };
}

/**
 * Disintegration (DISINTEGRATION_POWER, the Knowledge Demon's curse: 「在你的回合结束时，受到N点伤害」): its amount as damage at the
 * end of our turn, meeting block like a held Burn, after the end-of-turn block. Logged 2026-10-04: every end_turn holding it
 * that reached the next turn (37: amounts 6, 7, 8; Plating up on 4, Feel No Pain's block on others) lost exactly the intents
 * plus its amount past the block and the end-of-turn block, less nothing else (377JPY9LPG1L F33 T3: 24 + 6 against 27, 3
 * lost); a second pick adds to the amount (94FPBTS15SQT F33: 7, then 15). The curse card itself only applies it (never in a
 * deck or hand in the logs), so no held card counts it twice. The mod's flag leaves it out: 377JPY9LPG1L F33 T7 (28 HP + 6
 * block against 30), JRSF34UJJND4 F33 T5 (4 HP, no attack), 79YRPJ8TCCZ5 F33 T6 (A8, 17 + 5 against 19) died unflagged.
 */
function withEndOfTurnPowers(held: ReturnType<typeof heldEndOfTurn>, state: GameState): ReturnType<typeof heldEndOfTurn> {
  const player = asRecord(asRecord(state.raw["combat"])["player"]);
  const amount = powerAmount(player, "DISINTEGRATION_POWER");
  if (amount <= 0) return held;
  const name = str(asArray(player["powers"]).map(asRecord).find((power) => str(power["power_id"]) === "DISINTEGRATION_POWER")?.["name"], "DISINTEGRATION_POWER");
  return {
    ...held, damage: held.damage + amount, damages: [...held.damages, amount], items: [...held.items, { amount, blocked: true }], from: [...held.from, `${name} (power, ${amount} at the end of the turn)`],
  };
}

/** One HP loss of the end of the turn: damage that meets block first (`blocked`), or HP lost past it. */
interface OwnLoss {
  amount: number;
  blocked: boolean;
}

/** More orders than this (the held cards' losses times the enemies'): not all tried, the revive's outcome refused. */
const REVIVE_ORDERS_MAX = 5_040;

/**
 * A revive held (JudgeContext.revives, in the order they fire) and the HP it brings us back to: max HP x its share (combat-plan,
 * read inside: the two modules import each other), rounded down, at least 1. From the logs (docs/sl.md §2.7): Fairy in a
 * Bottle 30%, Lizard Tail 50%.
 */
function reviveHps(sources: readonly string[], maxHp: number): { source: string; hp: number | null }[] {
  const share = (source: string) => (source === "FAIRY_IN_A_BOTTLE" ? FAIRY_REVIVE_SHARE : source === "LIZARD_TAIL" ? LIZARD_TAIL_REVIVE_SHARE : null);
  return sources.map((source) => {
    const part = share(source);
    return { source, hp: part === null || maxHp <= 0 ? null : Math.max(1, Math.floor(maxHp * part)) };
  });
}

/** Every distinct order of `items` (equal items, by `key`, are one). */
function distinctOrders<T>(items: T[], key: (item: T) => string): T[][] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  const seen = new Set<string>();
  items.forEach((item, i) => {
    const k = key(item);
    if (seen.has(k)) return;
    seen.add(k);
    for (const rest of distinctOrders([...items.slice(0, i), ...items.slice(i + 1)], key)) out.push([item, ...rest]);
  });
  return out;
}

/** n! for the order counts (small n). */
function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

type ReviveStage = "held" | "hits" | "start";

/**
 * The end of the turn played out loss by loss with the revives held (docs/sl.md §2.7), in one order: the end-of-turn block
 * up first (`block`), then the held cards' damage (through what is left of it) and HP loss (past it) in `held`'s order,
 * Regen's heal (`regenAt`: before the held cards or after them; never past max HP), the enemies' hits (each enemy's in its
 * order, the enemies in `enemies`' order, each through what is left of the block), and our HP loss at the next turn's start.
 * Each loss that takes us to 0 or below is caught by the next revive: HP set to its HP, the overflow lost, the block left
 * kept (Y8E0KK4L7JBL F48: 14 HP against 12x3, 2 -> 0 -> 40 -> 28, the next turn opened at 28). Returns the HP left (<= 0:
 * dead with every revive spent, and `diedAt` the stage of that loss), the revives used and the HP each brought us back to.
 * With Tungsten Rod (`rod`) each loss past the block is 1 less, as ownLoss counts it; with Beating Remnant (`capLeft`: the
 * most this turn may still take, at its lowest) each loss of the turn is cut to what the cap leaves, the whole loss (its
 * overflow past 0 too) counted against it, the next turn's start under a fresh cap: the most either can save, so a death
 * that holds here holds however the game counts them with a revive (never logged together).
 */
function throughRevives(o: {
  hp: number; maxHp: number; block: number; held: OwnLoss[]; regen: number; regenAt: "before" | "after"; enemies: number[][]; start: number[]; revives: { source: string; hp: number }[];
  rod?: boolean; capLeft?: number | null;
}): { hp: number; used: string[]; backAt: number[]; diedAt: ReviveStage | null } {
  let hp = o.hp;
  let block = o.block;
  let diedAt: ReviveStage | null = null;
  let capLeft = o.capLeft ?? null;
  const used: string[] = [];
  const backAt: number[] = [];
  const lose = (loss: OwnLoss, stage: ReviveStage) => {
    if (loss.amount <= 0 || hp <= 0) return;
    let through = loss.blocked ? Math.max(0, loss.amount - block) : loss.amount;
    if (loss.blocked) block = Math.max(0, block - loss.amount);
    if (o.rod) through = Math.max(0, through - 1);
    if (capLeft !== null) {
      through = Math.min(through, stage === "start" ? BEATING_REMNANT_CAP : capLeft);
      if (stage !== "start") capLeft -= through;
    }
    if (through <= 0) return;
    hp -= through;
    if (hp > 0) return;
    if (used.length < o.revives.length) {
      const revive = o.revives[used.length]!;
      hp = revive.hp;
      used.push(revive.source);
      backAt.push(revive.hp);
    } else diedAt = stage;
  };
  const heal = () => {
    if (hp > 0 && o.regen > 0) hp = Math.max(hp, Math.min(o.maxHp, hp + o.regen));
  };
  if (o.regenAt === "before") heal();
  for (const loss of o.held) lose(loss, "held");
  if (o.regenAt === "after") heal();
  for (const hits of o.enemies) for (const hit of hits) lose({ amount: hit, blocked: true }, "hits");
  for (const loss of o.start) lose({ amount: loss, blocked: false }, "start");
  return { hp, used, backAt, diedAt };
}

/**
 * Whether the revives held save us on this board (throughRevives), over every order the game's could be (the held cards'
 * losses, the enemies' turns, Regen before or after the held cards: none of them checked in the logs with a revive in the
 * turn): `saved` when some order ends above 0 HP, with the most HP any order leaves; else dead in every order. `refuse`:
 * not worked out exactly (too many orders; a death only at the next turn's start after a revive, which an enemy dying in
 * its turn would stop: not judged here).
 */
function reviveOutcome(o: {
  hp: number; maxHp: number; block: number; held: OwnLoss[]; regen: number; enemies: number[][]; start: number[]; revives: { source: string; hp: number }[];
  rod?: boolean; capLeft?: number | null;
}): { saved: boolean; hp: number; used: string[]; backAt: number[] } | { refuse: string } {
  const attackers = o.enemies.filter((hits) => hits.length > 0);
  if (factorial(o.held.length) * factorial(attackers.length) > REVIVE_ORDERS_MAX) {
    return { refuse: `${o.held.length} held card(s) with an end-of-turn loss and ${attackers.length} attacker(s): their orders are not all tried` };
  }
  let best: { hp: number; used: string[]; backAt: number[]; diedAt: ReviveStage | null } | null = null;
  let startDeath = false;
  for (const held of distinctOrders(o.held, (loss) => `${loss.blocked ? "d" : "l"}${loss.amount}`)) {
    for (const enemies of distinctOrders(attackers, (hits) => hits.join("+"))) {
      for (const regenAt of o.regen > 0 ? (["before", "after"] as const) : (["before"] as const)) {
        const run = throughRevives({ ...o, held, enemies, regenAt });
        if (run.diedAt === "start" && run.used.length > 0) startDeath = true;
        if (!best || run.hp > best.hp) best = run;
      }
    }
  }
  if (best!.hp <= 0 && startDeath) return { refuse: "after the revive only our own loss at the next turn's start would kill us, and an enemy dying in its turn would stop it: not judged with a revive" };
  return { saved: best!.hp > 0, hp: best!.hp, used: best!.used, backAt: best!.backAt };
}

/**
 * The HP the enemy turn and the held cards take, on our own count (damage through the block and the end-of-turn block,
 * HP loss past them), with Tungsten Rod and Beating Remnant (2026-10-02, Roy: certain death only, so exactly or not at all):
 * - Tungsten Rod (「你每次失去生命时，减少失去的生命值1点」): every HP loss 1 less, in the order the damage comes: the end-of-turn
 *   block first, the held cards' damage in hand order, then each enemy's hits in board order, each one through what is left
 *   of the block; held HP loss each 1 less. On the logged Tungsten Rod turns this is the HP lost 60 times in 62 (the 2 others
 *   lost less: 7DFB21JE2DTK F33 T3, F35 T1).
 * - Beating Remnant: our turn and the enemy turn after it lose at most 20 together (the logs: Y3XT9EBS7U8B F48 T7, 2 lost
 *   earlier in the turn, 33 on our count, 18 lost; T8, 4 earlier, 16; CCPRXV86HPLH F43 T3, 2 earlier, 18; BFVATR4WANS6 F30
 *   T3, 11 earlier, 9; 20 whenever nothing was lost earlier). So it needs the HP lost so far this turn exactly (`lostSoFar`,
 *   the controller's); above 20 HP no turn can kill us.
 *   When the turn's start took HP (Crimson Mantle, Inferno) the HP lost so far is not exact: the controller then gives
 *   `lostSoFarAtMost` (what the states showed lost this turn plus the most the start can have taken), and the count takes
 *   the cap at its lowest: at least that much is lost whether the start counts in the cap or not (ops 2026-10-03,
 *   ET3V5177HXSY F48 T13: 7 HP + 7 block, three held Wither+4 and the Aeonglass's 36, Crimson Mantle up; "own count not
 *   exact" once the tail was known spent; at most 1 lost so far, so at least 19 of the 68 land on 7 HP).
 * Buffer and Intangible (never on a logged lethal board; their text only), at the most they could save, so a death that holds
 * with them holds however the game applies them:
 * - Intangible (「将本回合受到的所有伤害和生命减少效果降低为1」): every loss taken as 1, before the block (the block then
 *   takes the most of them);
 * - Buffer N (「阻止下一次你受到的生命值损伤」): N losses prevented, taken as the N largest; a prevented loss saves at most
 *   its own amount (what it took past the block, and the block it took that is left for the others), so the count less the
 *   N largest amounts is the least loss.
 * `unknown`: the count cannot be exact (Beating Remnant at 20 HP or less with the HP lost so far not known).
 */
function ownLoss(
  o: {
    hits: number[]; heldDamages: number[]; heldLosses: number[]; block: number; endBlock: number; hp: number; rod: boolean; remnant: boolean; lostSoFar: number | undefined; lostSoFarAtMost?: number | undefined;
    buffer?: number; intangible?: boolean;
  },
): { loss: number; unknown: boolean } {
  const cut = (amounts: number[]) => (o.intangible ? amounts.map((amount) => Math.min(amount, 1)) : amounts);
  const hits = cut(o.hits);
  const heldDamages = cut(o.heldDamages);
  const heldLosses = cut(o.heldLosses);
  const total = hits.reduce((sum, hit) => sum + hit, 0) + heldDamages.reduce((sum, hit) => sum + hit, 0);
  let loss: number;
  if (!o.rod) loss = Math.max(0, total - o.block - o.endBlock) + heldLosses.reduce((sum, hit) => sum + hit, 0);
  else {
    let left = o.block + o.endBlock;
    loss = heldLosses.reduce((sum, hit) => sum + Math.max(0, hit - 1), 0);
    for (const hit of [...heldDamages, ...hits]) {
      const absorbed = Math.min(left, hit);
      left -= absorbed;
      if (hit - absorbed > 0) loss += hit - absorbed - 1;
    }
  }
  if ((o.buffer ?? 0) > 0) {
    const largest = [...hits, ...heldDamages, ...heldLosses].sort((a, b) => b - a).slice(0, o.buffer);
    loss = Math.max(0, loss - largest.reduce((sum, amount) => sum + amount, 0));
  }
  if (!o.remnant) return { loss, unknown: false };
  if (o.hp > BEATING_REMNANT_CAP) return { loss: Math.min(loss, BEATING_REMNANT_CAP), unknown: false };
  // At most `lostSoFarAtMost` lost so far (the turn's start took a known amount that may or may not count in the cap): the
  // cap at its lowest, so the loss at its least; a death on it holds whichever way the start counts.
  const lost = o.lostSoFar ?? o.lostSoFarAtMost;
  if (lost === undefined) return { loss, unknown: true };
  return { loss: Math.min(loss, Math.max(0, BEATING_REMNANT_CAP - lost)), unknown: false };
}

/** Relics that hit the enemies at the end of our turn, known exactly from the logs: [all enemies, damage]. */
const STONE_CALENDAR = { turn: 7, damage: 52 };
/** The Bomb: 40 to every enemy as its countdown ends (the card's text; 50 taken as the upgraded one's, to be safe). */
const THE_BOMB_MAX = 50;
/**
 * Forgotten Soul (「每当你消耗一张牌，随机对一名敌人造成{Damage}点伤害」): 1 to one enemy for each card exhausted (21 of 21 logged
 * plays that exhausted cards and dealt no damage of their own, 1 to 3 cards: 7PWU4CD3QCP3, RTF3KZLZPV2L, 4JGPCH3WX6JV; the one
 * other, 7PWU F48 T4, was Letter Opener's 5 on top).
 */
const FORGOTTEN_SOUL_DAMAGE = 1;
/** An exhaust that hits the enemies (Forgotten Soul; Charon's Ashes, never held in the logs: its damage not known). */
const EXHAUST_HITS = /消耗[^。]*(?:伤害|失去)|exhaust[^.]*damage/i;
/** A relic's or power's text that acts when an Attack is played (Stampede plays one at the end of the turn). */
const ON_ATTACK_PLAY = /(?:打出|play)[^。.]*(?:攻击|attack)/i;
/**
 * Those that act on an Attack played but cannot save us at the end of the turn: energy or Strength / Dexterity for later
 * (Art of War, Nunchaku, Shuriken, Kunai, Rainbow Ring; Ripple Basin's block, counted at its most, only goes), an upgrade
 * (Razor Tooth), the next turn (History Course), the card back in hand (Feral), Pen Nib (its double counted).
 */
const ATTACK_PLAY_HARMLESS = new Set(["ART_OF_WAR", "NUNCHAKU", "RAZOR_TOOTH", "RIPPLE_BASIN", "SHURIKEN", "KUNAI", "RAINBOW_RING", "HISTORY_COURSE", "PEN_NIB", "FERAL_POWER", "STAMPEDE_POWER"]);
/** An Attack's sentence that only deals damage: its number (the hand's resolved one) and its hits. */
const DAMAGE_SENTENCE = /^(?:随机)?(?:对(?:所有|随机)?(?:一名)?敌人)?造成(\d+)点伤害(?:([两二三四五]|\d+)次)?$|^deal (\d+) damage(?: to (?:all|a random) enem(?:y|ies))?(?: (\d+) times)?$/i;
/** An Attack's sentence that cannot save us when it is played at the end of the turn (Vulnerable, Anger's copy, Headbutt). */
const HARMLESS_SENTENCE = /^给予\d+层易伤$|^将一张此牌的复制品加入你的弃牌堆$|^将你弃牌堆中的一张牌放到抽牌堆顶部$|^(?:虚无|保留|固有)$|^(?:ethereal|retain|innate)$/i;

/**
 * Stampede (STAMPEDE_POWER: 「在你的回合结束时，随机打出你手牌中的1张攻击牌攻击随机敌人」, its amount the Attacks played): the most
 * it can deal to one enemy, every Attack in hand (the card types from the game data) taken as played at it: the largest
 * `amount` of them summed, each its damage sentences' numbers (the hand's resolved ones) times their hits, Vigor on top,
 * doubled with Pen Nib or Double Damage (the target's Vulnerable is the caller's, as for every attack). Refused: no card
 * types known, a card of unknown type, an Attack with any other sentence (block, Weak, a heal, an exhaust, a draw, a
 * number that scales ...: what it would do is not bounded here), a relic or power that acts on an Attack played (block,
 * damage, cards: ATTACK_PLAY_HARMLESS aside), an enemy's Slow. 0: no Attack in hand.
 */
function stampedeBound(
  state: GameState,
  hand: Record<string, unknown>[],
  plays: number,
  knowledge: (Pick<Knowledge, "power" | "relic"> & Partial<Pick<Knowledge, "card">>) | undefined,
): { damage: number; from: string[] } | { refuse: string } {
  const player = asRecord(asRecord(state.raw["combat"])["player"]);
  const each: { name: string; damage: number }[] = [];
  for (const card of hand) {
    const name = str(card["name"], str(card["card_id"]));
    const text = (str(card["resolved_rules_text"]) || str(card["rules_text"])).replace(/\[[^\]]*\]/g, "");
    if (!knowledge?.card) {
      if (!text || /伤害|damage/i.test(text)) return { refuse: `${name}: the card types are not known` };
      continue;
    }
    const info = knowledge.card(str(card["card_id"]));
    if (!info) return { refuse: `${name}: its type is not known` };
    if (info.type !== "Attack") continue;
    if (!text) return { refuse: `${name} (an Attack in hand): its text is not known` };
    let damage = 0;
    for (const sentence of text.split(/[。.]/).map((part) => part.trim()).filter(Boolean)) {
      const hit = DAMAGE_SENTENCE.exec(sentence);
      if (hit) {
        const times = hit[2] ?? hit[4];
        damage += Number(hit[1] ?? hit[3]) * (times ? (HITS_WORD[times] ?? Number(times)) : 1);
      } else if (!HARMLESS_SENTENCE.test(sentence)) return { refuse: `${name} (an Attack in hand) does more than damage (「${sentence.slice(0, 30)}」)` };
    }
    each.push({ name, damage });
  }
  if (each.length === 0 || !knowledge) return { damage: 0, from: [] };
  const run = asRecord(state.raw["run"]);
  const relics = asArray(run["relics"]).map(asRecord);
  for (const owner of [...relics.map((relic) => ({ id: str(relic["relic_id"]), name: `${str(relic["name"], str(relic["relic_id"]))} (relic)`, text: str(relic["description"]) || (knowledge.relic(str(relic["relic_id"]))?.description ?? "") })),
    ...asArray(player["powers"]).map(asRecord).map((power) => ({ id: str(power["power_id"]), name: `${str(power["name"], str(power["power_id"]))} (power)`, text: knowledge.power(str(power["power_id"]))?.description ?? "" }))]) {
    if (!ATTACK_PLAY_HARMLESS.has(owner.id) && ON_ATTACK_PLAY.test(owner.text)) return { refuse: `${owner.name} acts on the Attack Stampede plays` };
  }
  const slowed = asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).find((enemy) => enemy["is_alive"] !== false && powerAmount(enemy, "SLOW_POWER") > 0);
  if (slowed) return { refuse: `${str(slowed["name"], str(slowed["enemy_id"]))}'s Slow raises the Attack Stampede plays` };
  const double = relics.some((relic) => str(relic["relic_id"]) === "PEN_NIB") || powerAmount(player, "DOUBLE_DAMAGE_POWER") > 0 || powerAmount(player, "PEN_NIB_POWER") > 0 ? 2 : 1;
  const vigor = Math.max(0, powerAmount(player, "VIGOR_POWER"));
  const top = [...each].sort((a, b) => b.damage - a.damage).slice(0, Math.max(1, plays));
  return { damage: (top.reduce((sum, card) => sum + card.damage, 0) + vigor) * double, from: top.map((card) => `${card.name} ${card.damage}`) };
}

/**
 * Block gained at the end of our turn, each one a Juggernaut hit: Plating, Plated Armor, Metallicize, Cloak Clasp (cards
 * held), Feel No Pain for each Ethereal card exhausted, Orichalcum, Ripple Basin (no Attack played): at most this many.
 */
function endBlockGains(state: GameState, hand: Record<string, unknown>[], etherealHeld: number): number {
  const player = asRecord(asRecord(state.raw["combat"])["player"]);
  const relicIds = asArray(asRecord(state.raw["run"])["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  return END_BLOCK_POWERS.filter((id) => powerAmount(player, id) > 0).length
    + (relicIds.includes("CLOAK_CLASP") && hand.length > 0 ? 1 : 0)
    + (powerAmount(player, "FEEL_NO_PAIN_POWER") > 0 ? etherealHeld : 0)
    + (relicIds.includes("ORICHALCUM") ? 1 : 0)
    + (num(player["attacks_played_this_turn"]) === 0 ? relicIds.filter((id) => id === "RIPPLE_BASIN").length : 0);
}

/** One thing hitting the enemies at the end of our turn: `all` of them or one at random; `attack` (Vulnerable raises it); `debuff` (it may carry one: Stampede's Attack). */
interface EndHit {
  name: string;
  all: boolean;
  damage: number;
  attack?: true;
  debuff?: true;
}

/**
 * What hits the enemies after we end the turn and before they act (Roy 2026-10-02: an attacker it kills does not attack, so
 * the death is not certain): `sources` with their damage (`all` enemies, or one at random), each enemy's poison, or
 * `refuse` when an effect's amount or target is not known. From the logs:
 * - Stone Calendar: 52 to every enemy at the end of turn 7 (its stack counts 1-6 on turns 1-6): W5PTC48C3B1H F33 163 -> 111,
 *   K7G9M8K4DWFW F17 134 -> 82 (Vulnerable 3: not more), VHLZ531VC9RE F17 146 -> 94; 7DXAW0ZBDFHP F23 T7 killed both enemies.
 * - Parrying Shield: 6 to one random enemy when we end the turn with at least 10 block, the end-of-turn block counted
 *   (passive-pieces: 93 of 108 such turns, the rest 6 into the enemy's block; 162 of 175 under 10 dealt none, the rest
 *   other damage): so not with `endTotal` (the block now and the most the end of the turn adds) under 10; without it, as
 *   possible whatever our block.
 * - The Bomb: its countdown is the power's amount (3, 2, 1), it goes off as a turn ends at 1.
 * - Stampede: the most damage an Attack in hand can deal (stampedeBound) to a random enemy; refused where that is not bounded.
 * - Forgotten Soul: 1 to a random enemy for each held Ethereal card exhausted.
 * - Juggernaut (「每当你获得格挡时，对随机敌人造成N点伤害」, its amount): a random enemy hit for each end-of-turn block gained
 *   (endBlockGains, at most).
 * - Inferno's sweep (its amount to every enemy) for each held card that takes HP on our turn (`heldLossEvents`; without it,
 *   every held card with an end-of-turn loss), and Rupture's Strength from those losses on Howl from Beyond below; another
 *   power hitting the enemies on our HP loss: refused.
 * - Screaming Flagon (no cards in hand at the end of the turn), a card in the exhaust pile playing itself at the end of the
 *   turn with no damage given (Howl from Beyond's is counted), Charon's Ashes or any other relic hitting the enemies when an
 *   Ethereal card is exhausted, a held card whose own end-of-turn clause acts on the enemies, anything else
 *   midTurnRisks.endOfTurn names: refused.
 * - Poison: an enemy loses its poison as its turn starts, before it attacks.
 */
function endOfTurnHits(
  state: GameState,
  hand: Record<string, unknown>[],
  etherealHeld: number,
  knowledge: (Pick<Knowledge, "power" | "relic"> & Partial<Pick<Knowledge, "card">>) | undefined,
  board: { endTotal?: number; heldLossEvents?: number } = {},
): { sources: EndHit[]; refuse: string | null } {
  const sources: EndHit[] = [];
  const run = asRecord(state.raw["run"]);
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
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
      if (board.endTotal === undefined || board.endTotal >= PARRYING_SHIELD.block) sources.push({ name: `${name} (${PARRYING_SHIELD.damage} to a random enemy)`, all: false, damage: PARRYING_SHIELD.damage });
    } else if (id === "SCREAMING_FLAGON") {
      handled.add(`${name} (relic)`);
      if (hand.length === 0) return { sources, refuse: `${name} hits every enemy when the turn ends with no cards in hand (its damage not known)` };
    } else if (etherealHeld > 0 && EXHAUST_HITS.test(str(relic["description"]) || (knowledge?.relic(id)?.description ?? ""))) {
      if (id !== "FORGOTTEN_SOUL") return { sources, refuse: `${name} hits the enemies when the held Ethereal cards are exhausted at the end of the turn (its damage not logged)` };
      sources.push({ name: `${name} (${FORGOTTEN_SOUL_DAMAGE} to a random enemy for each of the ${etherealHeld} Ethereal card(s) exhausted)`, all: false, damage: FORGOTTEN_SOUL_DAMAGE * etherealHeld });
    }
  }
  const held = withEndOfTurnPowers(heldEndOfTurn(hand, etherealHeld), state);
  const heldLossEvents = board.heldLossEvents ?? held.items.length;
  for (const power of asArray(player["powers"]).map(asRecord)) {
    const id = str(power["power_id"]);
    const name = str(power["name"], id);
    if (id === "THE_BOMB_POWER") {
      handled.add(`${name} (power)`);
      if (num(power["amount"]) <= 1) sources.push({ name: `${name} (at most ${THE_BOMB_MAX} to every enemy as it goes off)`, all: true, damage: THE_BOMB_MAX });
    } else if (id === "STAMPEDE_POWER") {
      handled.add(`${name} (power)`);
      const bound = stampedeBound(state, hand, num(power["amount"], 1), knowledge);
      if ("refuse" in bound) return { sources, refuse: `${name} plays an Attack in hand at a random enemy at the end of the turn, and ${bound.refuse}` };
      if (bound.damage > 0) sources.push({ name: `${name} (an Attack in hand at a random enemy, at most ${bound.damage}: ${bound.from.join(", ")})`, all: false, damage: bound.damage, attack: true, debuff: true });
    } else if (id === "JUGGERNAUT_POWER") {
      const gains = endBlockGains(state, hand, etherealHeld);
      if (gains > 0) sources.push({ name: `${name} (${num(power["amount"])} to a random enemy for each of at most ${gains} end-of-turn block gain(s))`, all: false, damage: num(power["amount"]) * gains });
    } else if (heldLossEvents > 0 && (id === "INFERNO_POWER" || ON_OWN_HP_LOSS.test(knowledge?.power(id)?.description ?? ""))) {
      if (id !== "INFERNO_POWER") return { sources, refuse: `${name} hits the enemies when the held cards take HP on our turn` };
      sources.push({ name: `${name}'s sweep (${num(power["amount"])} to every enemy for each of the ${heldLossEvents} held card loss(es) on our turn)`, all: true, damage: num(power["amount"]) * heldLossEvents });
    }
  }
  // A card in the exhaust pile that plays itself at the end of the turn (Howl from Beyond: 「对所有敌人造成18点伤害。 在你的回合结束时，
  // 如果这张牌在你的消耗牌堆中，则将其打出」): an attack on every enemy, its number plus our Strength each copy (Rupture's from the
  // held cards' losses on top); anything else refused.
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  const strength = Math.max(0, powerAmount(player, "STRENGTH_POWER")) + Math.max(0, powerAmount(player, "RUPTURE_POWER")) * heldLossEvents;
  for (const entry of asArray(view["exhaust"]).map(asRecord)) {
    const line = str(entry["line"]);
    if (!/回合结束时[^。]*消耗牌堆中|end of your turn[^.]*exhaust pile/i.test(line)) continue;
    const name = line.split(/[：:\[*]/)[0]!.trim();
    const hit = /对所有敌人造成(\d+)点伤害|deal (\d+) damage to all enemies/i.exec(line);
    if (!hit) return { sources, refuse: `${name} plays itself from the exhaust pile at the end of the turn` };
    const copies = Math.max(1, Number(/\*(\d+)\s*\[/.exec(line)?.[1] ?? 1));
    sources.push({ name: `${name}${copies > 1 ? ` x${copies}` : ""} (plays itself from the exhaust pile)`, all: true, damage: (Number(hit[1] ?? hit[2]) + strength) * copies, attack: true });
  }
  // A held card whose own clause acts on the enemies at the end of the turn (「如果这张牌在你的手牌中」, as Burn's and Wither's on
  // us). Not a card that only says what it does once played: a Stampede card held is a Power not played, it does nothing
  // (LMTA6JC86RCC F17 T7, 0NZBAVFAT3JG F25 T4: refused for it, both died; no card in the game data has such a clause).
  const heldHit = hand.find((card) => /回合结束时[^。]*这张牌在你的手牌中[^。]*敌人|end of your turn[^.]*this card is in your hand[^.]*enem/i.test(str(card["resolved_rules_text"]) || str(card["rules_text"])));
  if (heldHit) return { sources, refuse: `${str(heldHit["name"], str(heldHit["card_id"]))} in hand acts on the enemies at the end of the turn` };
  const other = midTurnRisks(state, knowledge).endOfTurn.filter((name) => !handled.has(name));
  if (other.length > 0) return { sources, refuse: `hitting the enemies at the end of the turn: ${other.join(", ")}` };
  return { sources, refuse: null };
}
/** Powers that hit the enemies when we lose HP on our turn (a held card's damage past our block). */
const ON_OWN_HP_LOSS = /失去生命时[^。]*敌人|lose hp[^.]*enem/i;

/**
 * When a relic's or power's random effect fires, from its text: `play` (on a card we play: Mummified Hand, Serpent Form,
 * Calamity; `cardType` when it names one: 「能力牌」 Power, 「攻击牌」 Attack, 「技能牌」 Skill), `start` (only at a turn's start:
 * Aggression, Crossbow, Countdown), or `other` (the end of the turn, an exhaust, an HP loss, a draw, a discard, ...).
 */
export function chanceTrigger(text: string): { when: "play" | "start" | "other"; cardType?: "Power" | "Attack" | "Skill" } {
  const clean = text.replace(/\[[^\]]*\]/g, "");
  const first = clean.split(/[，,。]/)[0] ?? "";
  if (/回合结束|end of/i.test(clean)) return { when: "other" };
  if (/^(?:在)?(?:你的|每)?(?:一个)?回合开始时|^at the start of (?:your|each) turn/i.test(first)) return { when: "start" };
  if (/打出|play/i.test(first) && !/消耗|失去|受到|格挡|抽|丢弃|exhaust|lose|damage|block|draw|discard/i.test(first)) {
    const cardType = /能力牌|\bpower\b/i.test(first) ? "Power" : /攻击牌|\battack\b/i.test(first) ? "Attack" : /技能牌|\bskill\b/i.test(first) ? "Skill" : undefined;
    return cardType ? { when: "play", cardType } : { when: "play" };
  }
  return { when: "other" };
}

/**
 * Why the held cards' end-of-turn damage cannot make the death certain on this board (null: it can): an amount the text
 * does not give; a relic or power acting by chance between the end of the turn and that death (midTurnRisks.chance, less
 * what endOfTurnHits bounds: Parrying Shield, Forgotten Soul, Stampede; less what fires only at a turn's start, after that
 * death, and what fires only on a card we play when no card that sets it off can be played and no potion drunk (the
 * cards' types from the game data; one not known sets it off): BG4W9DSX99DA F17 T6, Aggression with two Beckons;
 * G1Z0X3WBH4XQ F48 T9, Mummified Hand with nothing playable; L34T7HND7EL8 F48 T7, Mummified Hand (a Power played) with
 * only Attacks to play: each refused, each died). Tungsten Rod and
 * Beating Remnant (ownLoss), retaliation, poison and what hits the enemies at the end of the turn (endOfTurnHits: Inferno's
 * sweep on the held cards' losses with it) are counted for every verdict.
 */
function heldGuard(
  state: GameState,
  held: { damage: number; loss: number; inexact: string[] },
  knowledge: (Pick<Knowledge, "power" | "relic"> & Partial<Pick<Knowledge, "card">>) | undefined,
  act: { cards: Record<string, unknown>[]; potions: number },
): string | null {
  if (held.inexact.length > 0) return `${held.inexact.join(", ")}: the end-of-turn amount is not given`;
  const risks = midTurnRisks(state, knowledge);
  const bounded = new Set(["PARRYING_SHIELD", "FORGOTTEN_SOUL", "STAMPEDE_POWER"]);
  const setsOff = (cardType: string | undefined) =>
    act.potions > 0 || act.cards.some((card) => {
      if (!cardType || !knowledge?.card) return true;
      const info = knowledge.card(str(card["card_id"]));
      return !info || info.type === cardType;
    });
  const chance = risks.chance.filter((name) => {
    const entry = risks.chanceOf[name];
    if (entry && bounded.has(entry.id)) return false;
    const trigger = chanceTrigger(entry?.text ?? "");
    return !(trigger.when === "start" || (trigger.when === "play" && !setsOff(trigger.cardType)));
  });
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

/**
 * SL_JUDGE_ANY_DRAW (docs/sl.md §2.3; combat-plan anyDrawBound): what the turn planner found about this turn's draws for
 * every draw it could make, on the board of a least-loss verdict. The order of the draw pile is not known, its cards are
 * (the state lists them), so:
 * - `fatal`: every drawing card's own HP cost (card-model hpLoss, the card's resolved amount) reaches our HP, coming
 *   before its draw, and no simulated line has HP left right after playing one (the solver's loseHp: Buffer, Demon
 *   Tongue; lines with nothing else that heals or shields first): its play is our death before a card is drawn.
 * - `superset`: the board re-solved with the drawing cards putting every card of the draw pile into the hand at once (each
 *   at its cost, the hand limit lifted; their other effects and every other limit as they were). Any real draw is a
 *   part of that hand, so if every line dies there, every line dies with any draw.
 */
export interface DrawBound {
  /** The playable cards and modelled potions that draw (or whose text speaks of drawing), by name. */
  drawing: string[];
  /** Why no bound could be made (null: one was worked out). */
  refused: string | null;
  /** Fiddle or No Draw: nothing can be drawn this turn, the planner's verdict drew nothing. */
  noDraw?: string;
  /** Every drawing card's play is our death before it draws (see above): name, own HP cost, our HP. */
  fatal?: { name: string; hpLoss: number }[];
  superset?: {
    /** Cards put into the hand by the first draw: the draw pile's, less `excluded`. */
    cards: number;
    /** Cards in the draw pile (the state's listing). */
    drawPile: number;
    /** Cards of the pile left out: statuses and curses that only hurt when drawn (Burn, Beckon, ...), by name. */
    excluded: string[];
    /**
     * What the superset board cannot simulate exactly after a draw (an unmodelled or random card, a card reading the
     * hand or the draw pile, an enchantment, a draw that may reach the reshuffle): the bound then holds only when no
     * line has HP left after a draw (`aliveAfterDraw` empty).
     */
    inexact: string[];
    /** Every line on the superset board dies. */
    allDie: boolean;
    /** The drawing cards after whose play some line still has HP left (by name). */
    aliveAfterDraw: string[];
    /** The search was cut short (node limit or `timedOut`): no bound. */
    truncated: boolean;
    timedOut: boolean;
    nodes: number;
  };
  /** What else leaves the verdict to chance (LeastLossFacts.chance without the draws; SL_RELOAD_EARLY), null: nothing. */
  chance: string | null;
  /** Time spent on the bound (both solves). */
  ms: number;
}

/** The planner label whose end_turn means "every simulated line dies; ending the turn keeps the most HP". */
export const LEAST_LOSS_LABEL = "combat/least-loss";
const SPECIAL_ENEMY_HP = 1_000_000;
const GIANT_ID = "WATERFALL_GIANT";
/** The husk's moves: the Stun turn right after the kill, then the blast at the end of our next turn. */
const GIANT_ABOUT_MOVE = "ABOUT_TO_BLOW_MOVE";
const GIANT_BLAST_MOVE = "EXPLODE_MOVE";

/**
 * The Waterfall Giant's husk on its blast turn, in the one shape every logged one had (76 fights, states.jsonl to
 * 2026-10-03): enemy WATERFALL_GIANT at max HP 999,999,999, move EXPLODE_MOVE, one intent, DeathBlow, its damage given
 * (hits 1), the Steam Eruption power gone. Its damage is the eruption stacks at the kill (3T+9 for a kill on T, A0-A8;
 * 3T+14 at A9) as the game shows them: with the husk's Strength (+1: 7Q5GTQNH1SZT 27 -> 28), Weak (x0.75: H7W047ZCEBSA
 * 48 -> 36; LSWUK6D2EV89 51 -> 38 after an Uppercut this turn) and our Colossus on a Vulnerable husk (x0.5: FH3MZ3G0HECD
 * 24 -> 12). Null: not that shape.
 */
function giantBlast(enemy: Record<string, unknown>): { damage: number } | null {
  if (str(enemy["enemy_id"]) !== GIANT_ID || num(enemy["max_hp"]) < SPECIAL_ENEMY_HP || str(enemy["move_id"]) !== GIANT_BLAST_MOVE) return null;
  const intents = asArray(enemy["intents"]).map(asRecord);
  if (intents.length !== 1 || str(intents[0]!["intent_type"]) !== "DeathBlow") return null;
  const damage = numOrNull(intents[0]!["damage"]);
  if (damage === null || damage <= 0 || (numOrNull(intents[0]!["hits"]) ?? 1) !== 1) return null;
  if (asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "STEAM_ERUPTION_POWER")) return null;
  return { damage };
}

/**
 * The special phase on this board (an enemy at max HP a million or more, or with a DeathBlow intent): null when none;
 * `blast` when it is the Waterfall Giant's husk on its blast turn (giantBlast) and the only living enemy, judged by the
 * common rules (docs/sl.md §2.4); otherwise `refuse`, saying what is not judged.
 */
function specialPhase(living: Record<string, unknown>[], names: string[]): { blast: { name: string; damage: number } } | { refuse: string } | null {
  const at = living.findIndex((enemy) => num(enemy["max_hp"]) >= SPECIAL_ENEMY_HP || asArray(enemy["intents"]).some((intent) => str(asRecord(intent)["intent_type"]) === "DeathBlow"));
  if (at < 0) return null;
  const enemy = living[at]!;
  const name = names[at] ?? str(enemy["name"], str(enemy["enemy_id"]));
  const id = str(enemy["enemy_id"]);
  const move = str(enemy["move_id"], "?");
  const intents = asArray(enemy["intents"]).map(asRecord).map((intent) => `${str(intent["intent_type"], "?")}${numOrNull(intent["damage"]) !== null ? ` ${num(intent["damage"])}${(numOrNull(intent["hits"]) ?? 1) > 1 ? `x${num(intent["hits"])}` : ""}` : ""}`).join(", ") || "none";
  if (id !== GIANT_ID) return { refuse: `${name} is in a special phase (${num(enemy["max_hp"]) >= SPECIAL_ENEMY_HP ? "a million HP" : "a DeathBlow intent"}; move ${move}, intent ${intents}): only the Waterfall Giant's blast is judged` };
  if (num(enemy["max_hp"]) < SPECIAL_ENEMY_HP) return { refuse: `${name} shows a DeathBlow intent before it was killed (move ${move}, intent ${intents}): not a logged shape` };
  if (move === GIANT_ABOUT_MOVE) return { refuse: `${name} is a husk on its Stun turn (${GIANT_ABOUT_MOVE}): it explodes at the end of our next turn, only that turn is judged` };
  const blast = giantBlast(enemy);
  if (!blast) return { refuse: `${name} is a husk, but not on a plain blast turn (move ${move}, intent ${intents}): not a logged shape` };
  const others = names.filter((_, i) => i !== at);
  if (others.length > 0) return { refuse: `${name}'s blast with other enemies alive (${others.join(", ")}): not a logged board` };
  return { blast: { name, damage: blast.damage } };
}
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

/** A start-of-turn clause that heals us or adds block-free HP, or that we cannot read (the next turn's opening). */
const START_OF_TURN = /回合开始时|at the start of (your|each) turn/i;
const START_SAVES = /回复|恢复|治疗|heal|缓冲|buffer|无实体|intangible|最大生命/i;

/** A card Hellraiser plays when it is drawn (「每当你抽到名字中有“打击”的牌时，对一名随机敌人打出这张牌」). */
const STRIKE_NAME = /打击|strike/i;
/** A drawn Strike's text we cannot bound: damage scaling with something, X, or a heal. */
const STRIKE_UNBOUNDED = /每|等同|等量|equal|for each|\bX\b|回复|恢复|治疗|heal|最大生命|max hp/i;
/** Keywords a pile entry may carry that do not change a card's damage. */
const PLAIN_MODS = new Set(["Exhaust", "Ethereal", "Retain", "Innate", "Eternal", "Unplayable"]);
const HITS_WORD: Record<string, number> = { 两: 2, 二: 2, 三: 3, 四: 4, 五: 5 };
/** Toasty Mittens' Strength each turn's start (logged +1 every time: C4F14F3XPN0N F33, 5 -> 6, 7 -> 8, 9 -> 10). */
const TOASTY_MITTENS_STRENGTH = 1;
/** Paper Phrog's Vulnerable (the most it can be); Cruelty adds its percent on top. */
const VULNERABLE_MOST = 1.75;

/**
 * What may hit the enemies at the next turn's start before our own HP loss there (byStart): an enemy left alive is needed
 * for that loss to come (the fight ends when every enemy dies first).
 * - Hellraiser: the turn's draw comes before the loss, each Strike drawn played at a random enemy (C4F14F3XPN0N F33 attempt 1
 *   T7: a Strike and Setup Strike played from the draw, 4 HP at that state, Inferno's 2 at the next). Bounded over every
 *   Strike in the draw and discard piles (a reshuffle may bring the discard): its damage numbers plus the most Strength
 *   (ours, the Strikes' own gains, a start-of-turn gain), times its hits; with Vigor; times 1.75 (with Cruelty's percent)
 *   when an enemy is Vulnerable, 2 with Pen Nib or Double Damage. `single`: shared out over the enemies.
 * - Every enemy: Inferno's sweep at each loss (Crimson Mantle's too), and at the end of our turn when held cards cost HP;
 *   Mr Struggles (the turn's number); Mercury Hourglass (3); Rolling Boulder (its amount); a relic's 「回合开始时…造成N点伤害」
 *   (one random enemy: `single`). Taken whatever their order (Mr Struggles came after Inferno's loss in C4F14F3XPN0N F33's
 *   logs).
 * `refuse`: what cannot be bounded: a Strike that heals or scales, a modifier of Strikes not counted, an amount not given, a
 * relic playing a card at the turn's start (History Course), orbs, a power hitting the enemies whenever something the
 * opening may do happens (a draw, block, a star, an HP loss: Fire Breathing, Juggernaut, Black Hole).
 */
function startHitsBefore(
  state: GameState,
  knowledge: Pick<Knowledge, "power" | "relic"> | undefined,
  o: { inferno: number; lossEvents: number; heldLoss: boolean },
): { all: number; single: number; from: string[]; refuse: string | null } {
  const run = asRecord(state.raw["run"]);
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  const from: string[] = [];
  let all = 0;
  let single = 0;
  if (o.inferno > 0) {
    const sweeps = o.lossEvents + (o.heldLoss ? 1 : 0);
    all += o.inferno * sweeps;
    from.push(`Inferno's sweep ${o.inferno}${sweeps > 1 ? `x${sweeps}` : ""}`);
  }
  if (asArray(player["orbs"]).length > 0) return { all, single, from, refuse: "our orbs act at the turn's end and start (their hits not counted here)" };
  const nextTurn = state.turn === null || state.turn === undefined ? null : state.turn + 1;
  let startStrength = 0;
  // Start-of-turn Strength whose amount the text does not give (Brimstone's {SelfStrength}): only Hellraiser's Strikes need it.
  const strengthUnknown: string[] = [];
  const relics = asArray(run["relics"]).map(asRecord);
  for (const relic of relics) {
    const id = str(relic["relic_id"]);
    const name = str(relic["name"], id);
    const text = str(relic["description"]) || (knowledge?.relic(id)?.description ?? "");
    if (id === "TOASTY_MITTENS") {
      startStrength += TOASTY_MITTENS_STRENGTH;
      continue;
    }
    if (id === "MR_STRUGGLES") {
      if (nextTurn === null) return { all, single, from, refuse: `${name} (relic) hits every enemy for the turn's number at its start, the turn not known` };
      all += nextTurn;
      from.push(`${name} ${nextTurn}`);
      continue;
    }
    if (id === "MERCURY_HOURGLASS") {
      all += MERCURY_HOURGLASS_DAMAGE;
      from.push(`${name} ${MERCURY_HOURGLASS_DAMAGE}`);
      continue;
    }
    if (!START_OF_TURN.test(text)) continue;
    // A card played at the turn's start (History Course: the last Attack played, again): its damage not bounded here.
    if (/打出一张|plays? (?:a|an|the) (?:copy|card)/i.test(text)) return { all, single, from, refuse: `${name} (relic) plays a card at the turn's start` };
    if (/充能球|orb/i.test(text)) return { all, single, from, refuse: `${name} (relic) acts with orbs at the turn's start` };
    if (HITS_ENEMIES.test(text)) {
      const hit = /造成(?:\[[^\]]*\])?(\d+)(?:\[[^\]]*\])?点伤害|deal (\d+) damage/i.exec(text);
      if (!hit) return { all, single, from, refuse: `${name} (relic) hits the enemies at the turn's start, its damage not given` };
      const damage = Number(hit[1] ?? hit[2]);
      if (CHANCE.test(text)) single += damage;
      else all += damage;
      from.push(`${name} ${damage}`);
    } else if (/力量|strength/i.test(text)) {
      const gain = /(\d+)(?:\[[^\]]*\])?点(?:\[[^\]]*\])?力量|gain (\d+) strength/i.exec(text);
      if (gain) startStrength += Number(gain[1] ?? gain[2]);
      else strengthUnknown.push(`${name} (relic)`);
    }
  }
  const powers = asArray(player["powers"]).map(asRecord);
  for (const power of powers) {
    const id = str(power["power_id"]);
    if (id === "INFERNO_POWER") continue;
    const text = knowledge?.power(id)?.description ?? "";
    // Juggernaut (「每当你获得格挡时，对随机敌人造成N点伤害」, its amount): a random enemy hit for each block the opening may give
    // before the loss (startBlockGains: Crimson Mantle's, Sai's, ...; Z3DFG85QDRCD F48 T8, Juggernaut 8 and the Mantle's 1 at
    // 1 HP against the 311-HP Test Subject: refused, died). Its hits at the end of our turn are endOfTurnHits'.
    if (id === "JUGGERNAUT_POWER") {
      const gains = startBlockGains(state, knowledge, nextTurn);
      if (gains > 0) {
        single += num(power["amount"]) * gains;
        from.push(`${str(power["name"], id)} ${num(power["amount"])}${gains > 1 ? `x${gains}` : ""} (block at the turn's start)`);
      }
      continue;
    }
    // Hitting the enemies whenever something happens that the turn's opening may do before the loss: a draw (Fire
    // Breathing-like; Hellraiser below), block gained (Juggernaut: Crimson Mantle's block), a star gained (Black Hole), an HP
    // loss. A play triggers it only through Hellraiser's Strikes (checked with them below); retaliation is counted above.
    if (id !== "HELLRAISER_POWER" && /每当|whenever/i.test(text) && HITS_ENEMIES.test(text) && !/受到|attacked/i.test(text) && !/打出|play/i.test(text)) {
      return { all, single, from, refuse: `${str(power["name"], id)} (power) hits the enemies on what the turn's opening may do before the loss` };
    }
    if (id === "ROLLING_BOULDER_POWER") {
      all += num(power["amount"]);
      from.push(`Rolling Boulder ${num(power["amount"])}`);
    } else if (START_OF_TURN.test(text) && HITS_ENEMIES.test(text)) {
      return { all, single, from, refuse: `${str(power["name"], id)} (power) hits the enemies at the turn's start` };
    } else if (START_OF_TURN.test(text) && /力量|strength/i.test(text) && power["is_debuff"] !== true) {
      startStrength += Math.max(0, num(power["amount"]));
    } else if (/失去生命[^。]*力量|lose hp[^.]*strength/i.test(text) && power["is_debuff"] !== true) {
      // Rupture-like: Strength for each HP loss on our turn, a loss coming before the draw (Crimson Mantle's) included.
      startStrength += Math.max(0, num(power["amount"])) * o.lossEvents;
    }
  }
  if (powerAmount(player, "HELLRAISER_POWER") <= 0) return { all, single, from, refuse: null };
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  const strikes: { name: string; count: number; text: string; mods: string[] }[] = [];
  for (const entry of ["draw", "discard"].flatMap((pile) => asArray(view[pile]).map(asRecord))) {
    const line = str(entry["line"]);
    const head = /^(.*?)(?:\*(\d+))?\s*\[/.exec(line);
    const name = (head?.[1] ?? line.split(/[：:]/)[0] ?? "").trim();
    if (!STRIKE_NAME.test(name)) continue;
    strikes.push({ name, count: Math.max(1, Number(head?.[2] ?? 1)), text: line.slice(line.search(/[：:]/) + 1), mods: asArray(entry["mods"]).map((mod) => str(mod)) });
  }
  if (strikes.length === 0) return { all, single, from, refuse: null };
  if (strengthUnknown.length > 0) return { all, single, from, refuse: `Hellraiser plays the Strikes drawn at the turn's start, and ${strengthUnknown.join(", ")} gives Strength then, its amount not given` };
  // Anything of ours that adds to the Strikes Hellraiser plays and is not counted below.
  for (const relic of relics) {
    const id = str(relic["relic_id"]);
    const text = str(relic["description"]) || (knowledge?.relic(id)?.description ?? "");
    if (id === "PEN_NIB" || id === "TOASTY_MITTENS" || id === "MR_STRUGGLES") continue;
    if (/打击|strike|(打出|play)[^。.]*(攻击|attack)|(攻击|attack)[^。.]*(伤害|damage)/i.test(text)) {
      return { all, single, from, refuse: `Hellraiser plays the Strikes drawn at the turn's start, and ${str(relic["name"], id)} (relic) may add to them` };
    }
  }
  const counted = new Set(["STRENGTH_POWER", "VIGOR_POWER", "DOUBLE_DAMAGE_POWER", "PEN_NIB_POWER", "HELLRAISER_POWER", "INFERNO_POWER", "ROLLING_BOULDER_POWER"]);
  for (const power of powers) {
    const id = str(power["power_id"]);
    if (counted.has(id) || power["is_debuff"] === true) continue;
    const text = knowledge?.power(id)?.description ?? "";
    if (!text) return { all, single, from, refuse: `Hellraiser plays the Strikes drawn at the turn's start, and ${str(power["name"], id)} (power) has no text known` };
    if (/受到|when (?:you are )?attacked|whenever you are attacked/i.test(text)) continue;
    if (/(攻击|打击|attack|strike)[^。.]*(伤害|damage)|(伤害|damage)[^。.]*(攻击|打击|attack|strike)|(打出|play)[^。.]*(攻击|attack)/i.test(text) || (/打出|play/i.test(text) && HITS_ENEMIES.test(text))) {
      return { all, single, from, refuse: `Hellraiser plays the Strikes drawn at the turn's start, and ${str(power["name"], id)} (power) may add to them` };
    }
  }
  let strength = Math.max(0, powerAmount(player, "STRENGTH_POWER")) + startStrength;
  for (const strike of strikes) {
    const gain = /获得(\d+)点力量|gain (\d+) strength/i.exec(strike.text);
    if (gain) strength += Number(gain[1] ?? gain[2]) * strike.count;
  }
  let raw = Math.max(0, powerAmount(player, "VIGOR_POWER"));
  for (const strike of strikes) {
    const odd = strike.mods.filter((mod) => !PLAIN_MODS.has(mod));
    if (STRIKE_UNBOUNDED.test(strike.text) || odd.length > 0) {
      return { all, single, from, refuse: `Hellraiser plays ${strike.name} when it is drawn at the turn's start, and its damage cannot be bounded (${odd.length > 0 ? odd.join(", ") : strike.text.slice(0, 40)})` };
    }
    const damages = [...strike.text.matchAll(/造成(\d+)点伤害|deal (\d+) damage/gi)].map((hit) => Number(hit[1] ?? hit[2]));
    if (damages.length === 0) return { all, single, from, refuse: `Hellraiser plays ${strike.name} when it is drawn at the turn's start, its damage not given` };
    const times = /([两二三四五]|\d+)次|(\d+) times/.exec(strike.text);
    const hits = times ? (HITS_WORD[times[1] ?? ""] ?? Number(times[1] ?? times[2])) : 1;
    raw += (damages.reduce((sum, damage) => sum + damage, 0) + strength * damages.length) * hits * strike.count;
  }
  const vulnerable = asArray(combat["enemies"]).map(asRecord).some((enemy) => enemy["is_alive"] !== false && powerAmount(enemy, "VULNERABLE_POWER") > 0)
    || strikes.some((strike) => /易伤|vulnerable/i.test(strike.text));
  const relicIds = new Set(relics.map((relic) => str(relic["relic_id"])));
  const amp = (vulnerable ? VULNERABLE_MOST * (1 + Math.max(0, powerAmount(player, "CRUELTY_POWER")) / 100) : 1)
    * (relicIds.has("PEN_NIB") || powerAmount(player, "DOUBLE_DAMAGE_POWER") > 0 || powerAmount(player, "PEN_NIB_POWER") > 0 ? 2 : 1);
  const bound = Math.ceil(raw * amp);
  single += bound;
  from.push(`Hellraiser's drawn Strikes up to ${bound} (${strikes.reduce((sum, strike) => sum + strike.count, 0)} in the draw and discard piles)`);
  return { all, single, from, refuse: null };
}

/** A start-of-turn clause that gives block (Sai's 「在你的回合开始时，获得{Block}点格挡」; not Plating's 「覆甲会在你的回合开始时减少1层」). */
const START_BLOCK = /(?:回合开始时)[^。]*(?:获得)[^。]*格挡|at the start of (?:your|each) turn[^.]*gain[^.]*block/i;

/**
 * The most block gains the next turn's opening may give before our loss there (each a Juggernaut hit): Crimson Mantle,
 * Sai (a copy each), Horn Cleat on turn 2, Captain's Wheel on turn 3, and any other relic or power whose start-of-turn text
 * gives block, taken as giving it.
 */
function startBlockGains(state: GameState, knowledge: Pick<Knowledge, "power" | "relic"> | undefined, nextTurn: number | null): number {
  const player = asRecord(asRecord(state.raw["combat"])["player"]);
  let gains = 0;
  for (const relic of asArray(asRecord(state.raw["run"])["relics"]).map(asRecord)) {
    const id = str(relic["relic_id"]);
    const text = str(relic["description"]) || (knowledge?.relic(id)?.description ?? "");
    if (id === "HORN_CLEAT") gains += nextTurn === null || nextTurn === HORN_CLEAT_TURN ? 1 : 0;
    else if (id === "CAPTAINS_WHEEL") gains += nextTurn === null || nextTurn === CAPTAINS_WHEEL_TURN ? 1 : 0;
    else if (START_BLOCK.test(text)) gains += 1;
  }
  for (const power of asArray(player["powers"]).map(asRecord)) {
    const id = str(power["power_id"]);
    const text = knowledge?.power(id)?.description ?? "";
    if (id === "CRIMSON_MANTLE_POWER" || (power["is_debuff"] !== true && START_BLOCK.test(text))) gains += 1;
  }
  return gains;
}

/**
 * Why our own HP loss at the next turn's start cannot make the death certain on this board (null: it can): anything of
 * ours that acts at the turn's start and heals or shields us first (a relic's or power's text), and Inferno's own sweep
 * at that loss killing every enemy (the fight could end with it).
 */
function startGuard(state: GameState, living: Record<string, unknown>[], inferno: number, knowledge?: Pick<Knowledge, "power" | "relic">): string | null {
  const run = asRecord(state.raw["run"]);
  for (const relic of asArray(run["relics"]).map(asRecord)) {
    const id = str(relic["relic_id"]);
    const text = str(relic["description"]) || (knowledge?.relic(id)?.description ?? "");
    if (START_OF_TURN.test(text) && START_SAVES.test(text)) return `${str(relic["name"], id)} (relic) acts at the turn's start`;
  }
  for (const power of asArray(asRecord(asRecord(state.raw["combat"])["player"])["powers"]).map(asRecord)) {
    const id = str(power["power_id"]);
    if (id === "INFERNO_POWER" || id === "CRIMSON_MANTLE_POWER") continue;
    const text = knowledge?.power(id)?.description ?? "";
    if (!text) return `${str(power["name"], id)} (power): its text unknown`;
    if (START_OF_TURN.test(text) && START_SAVES.test(text)) return `${str(power["name"], id)} (power) acts at the turn's start`;
  }
  if (inferno > 0 && living.every((enemy) => num(enemy["current_hp"]) + num(enemy["block"]) <= inferno)) return `Inferno's ${inferno} at that loss may kill every enemy`;
  return null;
}

/** Time the any-draw bound may take (both solves); over it, no bound (SL_JUDGE_ANY_DRAW). */
export const ANY_DRAW_BUDGET_MS = 2_000;

/**
 * SL_JUDGE_ANY_DRAW (docs/sl.md §2.3): whether the least-loss verdict's death holds for every draw this turn could make,
 * from the planner's bound (DrawBound) and what this judge knows of the board. Certain when:
 * - nothing can be drawn (Fiddle, No Draw); or
 * - `fatal`: every drawing card's own HP cost kills us before it draws, on every simulated line; or
 * - `superset`: every line dies with the whole draw pile in hand, the search not cut short, no relic or power drawing or
 *   changing the pile mid-turn (midTurnRisks.draws); and when anything there is not simulated exactly (the bound's
 *   `inexact`, a relic or power acting mid-turn without the planner or by chance, something hitting the enemies at the end
 *   of the turn, an enemy's poison), no line has HP left after a draw (the pile never comes into play).
 * Any error, or no bound: not certain.
 */
function anyDrawJudged(
  state: GameState,
  context: Pick<JudgeContext, "drawBound" | "knowledge">,
  board: { hp: number; hand: Record<string, unknown>[]; etherealHeld: number; endTotal?: number; heldLossEvents?: number },
): { certain: boolean; why: string; chance: string | null } {
  let bound: DrawBound | null;
  try {
    bound = context.drawBound?.() ?? null;
  } catch (error) {
    return { certain: false, why: `the bound failed (${error instanceof Error ? error.message : String(error)})`, chance: null };
  }
  if (!bound) return { certain: false, why: "no bound (the planner's facts are missing)", chance: null };
  const names = bound.drawing.join(", ") || "a card";
  const no = (why: string) => ({ certain: false, why, chance: bound!.chance });
  const yes = (why: string) => ({ certain: true, why: `${names} ${bound!.drawing.length > 1 ? "draw" : "draws"}, but dies with any draw: ${why}`, chance: bound!.chance });
  if (bound.refused) return no(bound.refused);
  if (bound.noDraw) return yes(`nothing can be drawn this turn (${bound.noDraw})`);
  if (bound.fatal && bound.fatal.length > 0) {
    return yes(`${bound.fatal.map((card) => `${card.name}'s own cost (lose ${card.hpLoss} HP)`).join(", ")} kills us at ${board.hp} HP before a card is drawn; every line that plays it dies there (${bound.ms} ms)`);
  }
  const superset = bound.superset;
  if (!superset) return no("no superset board");
  const risks = midTurnRisks(state, context.knowledge);
  if (risks.draws.length > 0) return no(`drawing or changing the draw pile mid-turn: ${risks.draws.join(", ")}`);
  const size = `the hand + ${superset.cards} card(s) of the draw pile${superset.excluded.length > 0 ? ` (left out, only hurting when drawn: ${superset.excluded.join(", ")})` : ""}`;
  if (superset.truncated) return no(`the superset board's search was cut short (${superset.timedOut ? `over ${ANY_DRAW_BUDGET_MS} ms` : `${superset.nodes} positions`}; ${size})`);
  if (!superset.allDie) return no(`a line lives on the superset board (${size}): some draw may save us`);
  // What the superset board does not simulate exactly beyond the cards: unmodelled relics and powers acting mid-turn or by
  // chance, what hits the enemies at the end of the turn (an attacker it kills does not attack), an enemy's poison.
  const ends = endOfTurnHits(state, board.hand, board.etherealHeld, context.knowledge, {
    ...(board.endTotal !== undefined ? { endTotal: board.endTotal } : {}), ...(board.heldLossEvents !== undefined ? { heldLossEvents: board.heldLossEvents } : {}),
  });
  const poisoned = asArray(asRecord(state.raw["combat"])["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false && powerAmount(enemy, "POISON_POWER") > 0)
    .map((enemy) => `${str(enemy["name"], str(enemy["enemy_id"]))}'s poison`);
  const inexact = [
    ...superset.inexact,
    ...new Set([...risks.any, ...risks.chance, ...risks.endOfTurn, ...ends.sources.map((source) => source.name), ...(ends.refuse ? [ends.refuse] : []), ...poisoned]),
  ];
  if (inexact.length > 0 && superset.aliveAfterDraw.length > 0) {
    return no(`${inexact.slice(0, 3).join("; ")}${inexact.length > 3 ? ` (+${inexact.length - 3})` : ""} not simulated exactly, and a line has HP left after ${superset.aliveAfterDraw.join(", ")}`);
  }
  const exactness = inexact.length > 0 ? `; no line has HP left after the draw (not exact: ${inexact.slice(0, 2).join("; ")}${inexact.length > 2 ? ` (+${inexact.length - 2})` : ""})` : "";
  return yes(`every line dies on the superset board, ${size}${exactness} (${superset.nodes} positions, ${bound.ms} ms)`);
}

/**
 * The Insatiable's Sandpit on this board (docs/sl.md §2.5): SANDPIT_POWER on a living THE_INSATIABLE, its count, or null. From
 * the logs (all 81 Insatiable fights to 2026-10-03): Liquify Ground (T1) starts it at 4 (91 of 91 attempts); every enemy turn
 * takes 1 off whatever the move (402 of 402); each Frantic Escape played puts 1 back at once (the state's count is after the
 * turn's plays: 237 of 237); nothing else moves it (no other card, relic or potion text names it). A turn ended at 1 was
 * our death on the enemy turn whatever the HP and block, 15 of 15 (LXB3B2WT9E0W F33 T5 at 81 HP + 18 block against 18,
 * BVJT7HFW6X2S F33 T5 at 21 + 12 against 24); a turn at 1 that the logs show won ended with the Insatiable killed in it.
 */
function sandpitOf(living: Record<string, unknown>[], names: string[]): { name: string; count: number; at: number } | null {
  const at = living.findIndex((enemy) => str(enemy["enemy_id"]) === "THE_INSATIABLE" && asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "SANDPIT_POWER"));
  if (at < 0) return null;
  return { name: names[at] ?? str(living[at]!["name"], "THE_INSATIABLE"), count: powerAmount(living[at]!, "SANDPIT_POWER"), at };
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
  // Held cards (Burn, Wither, Beckon): their end-of-turn damage meets block, the end-of-turn block included (it comes first:
  // 11 of 11 logged turns where the order showed, e.g. ZANMLV9UU31K F42 T3, Burn 8 against Plating 5 took 3), and their HP
  // loss does not. Neither the mod's flag nor the plain count sees them (TMNFVW6DRQ20 F48 T8: 15 HP + 28 block against the
  // Aeonglass's 19x2 and a held Wither+'s 9, the mod did not flag it, it died with 5 retries left).
  // Disintegration's end-of-turn damage with them (withEndOfTurnPowers).
  const held = withEndOfTurnPowers(heldEndOfTurn(hand, etherealHeld), state);
  // Orichalcum (「如果你在回合结束时没有格挡，获得6点格挡」): counted whenever the turn ends with no block from the cards. Plating up
  // does not stop it (A8ENYFR4ZWKG F48 T7: 0 block, Plating 9, 36 in three hits took 21, 15 came; 842N6N604DVX F31 T3:
  // Plating 3, 19 took 10, 9 came; Y3XT9EBS7U8B F45 T4: Plating 4, 18 took 8, 10 came; each less Inferno's 1 at the next
  // turn's start). The other end-of-turn block (Plated Armor, Metallicize, Cloak Clasp, Feel No Pain) never showed the order
  // with Orichalcum in the logs: taken not to stop it either, and so the held cards' damage that may take our block first.
  // Block counted that does not come only makes fewer deaths certain (Roy: certain only); the rule was "no block at all
  // with the end-of-turn block", which could call a death certain that Orichalcum's 6 would have saved.
  if (relics.has("ORICHALCUM") && (block <= 0 || held.damage >= block)) endBlock += ORICHALCUM_BLOCK;
  // Ripple Basin (「如果你在本回合中没有打出过攻击牌，则获得{Block}点格挡」): 4 for each copy at the end of a turn with no Attack
  // played (the mod's attacks_played_this_turn; absent, taken as none: the more block). The logged end_turn transitions
  // holding it with no Attack played and nothing else in the loss (2026-10-04): 19 took exactly 4, with Dexterity 1, 3 and 5
  // (3) and under Frail (2) as well; 3 took none; none more (passive-pieces RIPPLE_BASIN_BLOCK, the planner's number). Before,
  // refused (ops 2026-10-04, X80AD9MHAKZW F42 T6, the Soul Nexus, A9: 1 HP + 25 block + Plating 4 + its 4 against 46, died
  // with 3 retries left; its T4 and T5, 37 + Plating 6 against 46 and 1 + 12 + Plating 5 against 19, lived on its 4).
  const basins = asArray(run["relics"]).filter((relic) => str(asRecord(relic)["relic_id"]) === "RIPPLE_BASIN").length;
  if (basins > 0 && num(player["attacks_played_this_turn"]) === 0) endBlock += RIPPLE_BASIN_BLOCK * basins;
  const regen = powerAmount(player, "REGEN_POWER");
  // Tungsten Rod, Beating Remnant, Buffer and Intangible in our count (ownLoss, the last two at the most they may save);
  // without them the count as before.
  const rod = relics.has("TUNGSTEN_ROD");
  const remnant = relics.has("BEATING_REMNANT");
  const buffer = Math.max(0, powerAmount(player, "BUFFER_POWER"));
  const intangible = powerAmount(player, "INTANGIBLE_POWER") > 0;
  const exactly = rod || remnant || buffer > 0 || intangible;
  const lossWith = (hits: number[], withHeld: boolean) =>
    ownLoss({
      hits, heldDamages: withHeld ? held.damages : [], heldLosses: withHeld ? held.losses : [], block, endBlock, hp, rod, remnant, lostSoFar: context.lostSoFar, lostSoFarAtMost: context.lostSoFarAtMost,
      ...(buffer > 0 ? { buffer } : {}), ...(intangible ? { intangible } : {}),
    });
  const allHits = hitsOf.flat();
  const plainOwn = exactly ? lossWith(allHits, false) : null;
  const heldOwn = exactly ? lossWith(allHits, true) : null;
  const countUnknown = (plainOwn?.unknown ?? false) || (heldOwn?.unknown ?? false);
  const plainDies = plainOwn ? !plainOwn.unknown && plainOwn.loss - regen >= hp : incoming - block - endBlock - regen >= hp;
  const heldDies = heldOwn ? !heldOwn.unknown && heldOwn.loss - regen >= hp : Math.max(0, incoming + held.damage - block - endBlock) + held.loss - regen >= hp;
  // The held cards make the difference: the death rests on them (and on heldGuard).
  const byHeld = !plainDies && heldDies && held.damage + held.loss > 0;
  // The Insatiable's Sandpit at 1 (sandpitOf): the enemy turn takes it to 0 and eats us whatever the HP, which neither the
  // mod's flag nor our count sees (BVJT7HFW6X2S F33 T5: 21 HP + 12 block against 24, the planner saw every line die at 9 HP
  // left, the judge said "the mod does not flag", eaten with 6 retries unused). The death rests on it when our count lives.
  const pit = sandpitOf(living, names);
  const bySandpit = pit !== null && pit.count === 1 && !plainDies && !heldDies;
  // Our own HP loss at the start of the next turn (Inferno's 1, Crimson Mantle's cost: the planner's startTurnHpLoss): the
  // enemy turn leaves us at it or under, and the next turn opens with our death (610BBERH4SPP F33 T3: 1 HP + 12 block
  // against the Crusher's 5x2, Inferno up; the planner saw every line die, the mod's flag and our count did not, and the
  // run ended at T4's start with 6 attempts unused). Inferno loses 1 for each copy up (infernoCopies; C4F14F3XPN0N F33
  // attempt 5: two copies, 2 HP left, both taken). With Tungsten Rod each part 1 less, as every loss; with Beating Remnant
  // the end of this turn on its capped count (ownLoss) and the start's loss in full (the next turn's own cap of 20 is more
  // than any of it; VC4LRL945UEF F23 T2: 17 HP against 8x2, Inferno up, 1 left, its 1 at T3's start took it, refused for the
  // relic before). Not with Buffer or Intangible (either may stop it), nor with the HP lost so far not known.
  const infernoLoss = infernoCopies(state, powerAmount(player, "INFERNO_POWER"));
  const startParts = [infernoLoss, mantleHpCost(powerAmount(player, "CRIMSON_MANTLE_POWER"))].filter((loss) => loss > 0);
  const startLoss = startParts.reduce((sum, loss) => sum + (rod ? Math.max(0, loss - 1) : loss), 0);
  const lossAfterHeld = heldOwn ? heldOwn.loss - regen : Math.max(0, incoming + held.damage - block - endBlock) + held.loss - regen;
  const byStart = !bySandpit && !plainDies && !heldDies && buffer <= 0 && !intangible && !countUnknown && startLoss > 0 && hp - lossAfterHeld <= startLoss;
  const heldNote = held.damage + held.loss > 0 ? { held: { damage: held.damage, loss: held.loss, from: held.from } } : {};
  // The held cards' losses that may take HP on our turn (Inferno's sweep on each: endOfTurnHits): every HP loss, and every
  // damage when their damage may get past the block.
  const heldLossEvents = held.items.filter((item) => !item.blocked).length + (held.damage > block + endBlock ? held.items.filter((item) => item.blocked).length : 0);
  const playable = hand.filter((card) => card["playable"] === true);
  // The cards Enthralled locks (card-model afterPlayFirst) are played once it is: their draws veto as a playable card's.
  const reachable = [...playable, ...hand.filter((card) => card["playable"] !== true && afterPlayFirst(card))];
  const drinkable = asArray(run["potions"]).map(asRecord).filter((slot) => slot["occupied"] !== false && str(slot["potion_id"]) && slot["can_use"] === true);
  // The revives played out (docs/sl.md §2.7), once worked out: on the verdict.
  let reviveRecord: DeathVerdict["revive"] | undefined;
  const verdict = (certain: boolean, tier: JudgeTier | null, reason: string): DeathVerdict => ({
    certain, tier, reason, hp, block, endBlock, incoming, killers, ...heldNote, ...(byStart ? { startLoss } : {}), ...(bySandpit ? { sandpit: pit!.count } : {}),
    ...(plainDies || heldDies || byStart || bySandpit ? { ownCountDies: true as const } : {}),
    ...(reviveRecord ? { revive: reviveRecord } : {}),
  });

  if (state.screen !== "COMBAT" || !state.in_combat) return verdict(false, null, "not in combat");
  if (combat["end_turn_will_kill_player"] !== true && !byHeld && !byStart && !bySandpit) return verdict(false, null, "the mod does not flag ending the turn as lethal");
  // A special phase is refused below, but for the Waterfall Giant's husk on its blast turn: the blast is an attack here like
  // any other (docs/sl.md §2.4), the shown number what hits after the end-of-turn block, and the fight ends with it.
  const special = specialPhase(living, names);
  const blast = special && "blast" in special ? special.blast : null;
  // The revives held (Fairy in a Bottle, Lizard Tail; docs/sl.md §2.7): the end of the turn played out loss by loss with them
  // (throughRevives). One that may save us keeps the death uncertain; a death they cannot stop is judged like any other (ops
  // 2026-10-03, ET3V5177HXSY F48 T13: had the tail been left, 7 HP + 7 block, three held Wither+4: 15 takes us to 0, back at
  // 37, 15 + 15 leave 7, the Aeonglass's 36 kills; "a revive is left" was the answer whatever the turn did after it).
  // First with every hit shown (the most that can land), again below with what may be killed or cut first taken out.
  // SL_RELOAD_ON_REVIVE: the board judged as without them (only played out for the record).
  const reviveNames = context.revives.join(", ");
  const reviveList = reviveHps(context.revives, num(player["max_hp"], state.run?.max_hp ?? 0));
  const startLosses = blast ? [] : [infernoLoss, mantleHpCost(powerAmount(player, "CRIMSON_MANTLE_POWER"))].filter((loss) => loss > 0);
  let reviveNote = context.reloadOnRevive === true && context.revives.length > 0 ? ` (SL_RELOAD_ON_REVIVE: ${reviveNames} not counted)` : "";
  const reviveVeto = (hits: number[][], after: string): DeathVerdict | null => {
    if (context.revives.length === 0) return null;
    // Tungsten Rod's, Beating Remnant's, Buffer's or Intangible's own count lives without any revive: that count's veto says
    // so below.
    if (exactly && !plainDies && !heldDies && !bySandpit) return null;
    const unknownHp = reviveList.filter((revive) => revive.hp === null).map((revive) => revive.source);
    // Beating Remnant: the cap this turn may still take, at its lowest (ownLoss's HP lost so far, exactly or at most).
    const lost = context.lostSoFar ?? context.lostSoFarAtMost;
    const refuse =
      bySandpit ? "the Sandpit eats us whatever the HP, and a revive against it is not logged"
      : buffer > 0 || intangible ? `${[buffer > 0 ? "Buffer" : "", intangible ? "Intangible" : ""].filter(Boolean).join(" and ")} with a revive in the turn is not judged (never logged; which of them the game spends first is not known)`
      : remnant && lost === undefined ? `Beating Remnant's cap (${BEATING_REMNANT_CAP} a turn) with the HP lost so far this turn not known exactly`
      : unknownHp.length > 0 ? `${unknownHp.join(", ")}: the HP it brings us back to is not known`
      : null;
    const outcome = refuse ? null : reviveOutcome({
      hp, maxHp: num(player["max_hp"], state.run?.max_hp ?? 0), block: block + endBlock, held: held.items, regen, enemies: hits, start: startLosses, revives: reviveList.map((revive) => ({ source: revive.source, hp: revive.hp! })),
      ...(rod ? { rod } : {}), ...(remnant ? { capLeft: Math.max(0, BEATING_REMNANT_CAP - lost!) } : {}),
    });
    if (outcome && !("refuse" in outcome)) reviveRecord = { held: [...context.revives], used: outcome.used, backAt: outcome.backAt, hpLeft: outcome.hp, saved: outcome.saved };
    if (context.reloadOnRevive === true) return null;
    if (refuse) return verdict(false, null, `a revive is left (${reviveNames}): ${refuse}`);
    if (!outcome) return verdict(false, null, `a revive is left (${reviveNames})`);
    if ("refuse" in outcome) return verdict(false, null, `a revive is left (${reviveNames}): ${outcome.refuse}`);
    // One revive held: "back at N"; more: each by name.
    const back = outcome.used.map((source, i) => `${context.revives.length > 1 ? `${source} ` : ""}back at ${outcome.backAt[i]}`).join(", then ");
    if (outcome.saved) {
      return verdict(false, null, outcome.used.length > 0
        ? `a revive is left (${reviveNames}): ${back} HP, the rest of the turn leaves ${outcome.hp}${after}`
        : `a revive is left (${reviveNames}), and the end of the turn leaves ${outcome.hp} HP before any is used${after}`);
    }
    reviveNote = `; ${back} HP, the rest of the turn still kills (${outcome.hp} left)`;
    return null;
  };
  const allSaved = reviveVeto(hitsOf, "");
  if (allSaved) return allSaved;
  if (special && "refuse" in special) return verdict(false, null, special.refuse);
  const heldText = `held ${held.from.join(", ")}: ${held.damage} damage${held.loss > 0 ? ` + ${held.loss} HP loss` : ""}`;
  const lostText = context.lostSoFar !== undefined ? `, ${context.lostSoFar} lost so far` : context.lostSoFarAtMost !== undefined ? `, at most ${context.lostSoFarAtMost} lost so far (the turn's start took HP)` : "";
  const relicText = [
    rod ? "Tungsten Rod: each HP loss 1 less" : "", remnant ? `Beating Remnant: at most ${BEATING_REMNANT_CAP} lost this turn${lostText}` : "",
    buffer > 0 ? `Buffer ${buffer}: the ${buffer > 1 ? `${buffer} largest losses` : "largest loss"} taken as prevented` : "", intangible ? "Intangible: every loss taken as 1" : "",
  ].filter(Boolean).join("; ");
  // (The Sandpit eats us whatever the HP: our count need not be exact for it; Tungsten Rod and Beating Remnant are refused there.)
  if (countUnknown && !bySandpit) return verdict(false, null, `own count not exact: Beating Remnant caps the HP lost this turn at ${BEATING_REMNANT_CAP} and the HP lost so far this turn is not known exactly`);
  if (!plainDies && !byHeld && !byStart && !bySandpit) {
    if (exactly) return verdict(false, null, `own count survives: ${heldOwn!.loss} HP lost (${relicText}) - ${regen} Regen < ${hp} HP${held.damage + held.loss > 0 ? ` (with ${heldText})` : ""}`);
    return verdict(false, null, `own count survives: ${incoming} incoming - ${block} block - ${endBlock} end-of-turn block - ${regen} Regen < ${hp} HP${held.damage + held.loss > 0 ? ` (with ${heldText})` : ""}`);
  }
  if (byHeld) {
    const guard = heldGuard(state, held, context.knowledge, { cards: reachable, potions: drinkable.length });
    if (guard) return verdict(false, null, `only the held cards make it lethal (${heldText}), and ${guard}`);
  }
  const startText = `then ${startLoss} HP lost at the next turn's start (${[infernoLoss > 1 ? `Inferno x${infernoLoss}` : infernoLoss > 0 ? "Inferno" : "", powerAmount(player, "CRIMSON_MANTLE_POWER") > 0 ? "Crimson Mantle" : ""].filter(Boolean).join(" + ")}${rod ? ", each 1 less for Tungsten Rod" : ""})`;
  if (byStart) {
    // Lived through, the Giant's blast ends the fight (53 of 53 logged: the rewards came right after it): no next turn.
    if (blast) return verdict(false, null, `only our own loss at the next turn's start makes it lethal (${startText}), but the fight ends when we live through ${blast.name}'s blast (${blast.damage}): no next turn`);
    const guard = startGuard(state, living, powerAmount(player, "INFERNO_POWER"), context.knowledge);
    if (guard) return verdict(false, null, `only our own loss at the next turn's start makes it lethal (${startText}), and ${guard}`);
  }
  // What hits the enemies after we end the turn and before they act (Stone Calendar, The Bomb, Parrying Shield, poison):
  // an attacker it may kill does not attack. Certain only if we die even without every enemy it may kill (and, when one
  // of them is not a minion, without the minions too: they may leave with it).
  const ends = endOfTurnHits(state, hand, etherealHeld, context.knowledge, { endTotal: block + endBlock, heldLossEvents });
  const sandpitText = pit ? `${pit.name}'s Sandpit at ${pit.count}: the enemy turn takes it to 0 and eats us whatever the HP` : "";
  if (ends.refuse) return verdict(false, null, `the enemies may be hit before they act: ${ends.refuse}`);
  const powersOf = (enemy: Record<string, unknown>) => asArray(enemy["powers"]).map(asRecord);
  const cruelty = powerAmount(player, "CRUELTY_POWER");
  // Poison-trigger and threshold evidence is Silent's; preserve other characters' existing verdicts.
  const silentPoison = str(run["character_id"]).toLowerCase() === "silent";
  // Each enemy's most damage before it acts (an upper bound: Vulnerable did not add to Stone Calendar's 52, K7G9M8K4DWFW
  // F17, Cruelty might; an attack's Vulnerable taken at Paper Phrog's 75%) and its poison.
  const before = living.map((enemy) => {
    const vulnerable = powersOf(enemy).some((power) => str(power["power_id"]) === "VULNERABLE_POWER" && num(power["amount"]) > 0);
    const amp = vulnerable && cruelty > 0 ? 1.5 * (1 + cruelty / 100) : 1;
    const attackAmp = vulnerable ? 1.75 * (1 + cruelty / 100) : 1;
    const hit = ends.sources.reduce((sum, source) => sum + source.damage * (source.attack ? attackAmp : amp), 0);
    const poison = Math.max(0, powerAmount(enemy, "POISON_POWER"));
    // silent-0195: KUZVERN40NGK F17 final T6 loses 9 + 8 HP before attacking.
    // As in the solver, each Accelerant trigger consumes one stack; caps ignored here keep an upper bound.
    const triggers = Math.min(poison, 1 + (silentPoison ? Math.max(0, powerAmount(player, "ACCELERANT_POWER")) : 0));
    return { hit, poison: triggers * (2 * poison - triggers + 1) / 2, hp: num(enemy["current_hp"]) };
  });
  // A hit before they act may stun an enemy without killing it: Shriek / Plow at their threshold (the Terror Eel at half HP;
  // turn-solver `shriek`), a counter the learned stun-on-strip rules see go (Flutter, Slippery, Curl Up on any hit; Artifact
  // on a debuff, which only Stampede's Attack may bring: turn-solver STRIP_COUNTERS). Its move is then lost: its hits taken
  // out as a death's, without changing the others' (an ally's death does that, below).
  const stunned = living
    .map((enemy, i) => {
      const { hit, poison, hp: hpLeft } = before[i]!;
      const threshold = Math.max(powerAmount(enemy, "SHRIEK_POWER"), powerAmount(enemy, "PLOW_POWER"));
      if (threshold > 0 && hpLeft > threshold && hpLeft - hit - (silentPoison ? poison : 0) <= threshold) return { i, why: `its stun at ${threshold} HP` };
      // Poison crossing an HP threshold is observed; stripping these counters still needs a hit.
      if (hit <= 0) return null;
      const counter = ["FLUTTER_POWER", "SLIPPERY_POWER", "CURL_UP_POWER", ...(ends.sources.some((source) => source.debuff) ? ["ARTIFACT_POWER"] : [])].find((id) => powerAmount(enemy, id) > 0);
      return counter ? { i, why: `its ${counter} going may stun it` } : null;
    })
    .filter((entry): entry is { i: number; why: string } => entry !== null);
  const mayDie = living
    .map((enemy, i) => {
      const { hit, poison, hp: hpLeft } = before[i]!;
      return { i, enemy, dies: (hit > 0 && hit >= hpLeft) || (poison > 0 && poison >= hpLeft), why: poison > 0 && poison >= hpLeft ? `its poison (${poison})` : ends.sources.map((source) => source.name).join(" + ") };
    })
    .filter((entry) => entry.dies);
  // Our loss at the next turn's start comes only if an enemy lives to see that turn's start: not if every enemy (every one
  // but the minions, which may leave with them) may die first, to what hits them at the end of our turn, their poison, our
  // retaliation on each of their hits, and the next turn's opening before the loss (startHitsBefore: Hellraiser's drawn
  // Strikes, Inferno's sweep, Mr Struggles, ...); one escaping (its intent Escape) is gone. Their HP at the lowest it may be,
  // block ignored.
  if (byStart) {
    const first = startHitsBefore(state, context.knowledge, {
      inferno: powerAmount(player, "INFERNO_POWER"),
      lossEvents: (infernoLoss > 0 ? 1 : 0) + (powerAmount(player, "CRIMSON_MANTLE_POWER") > 0 ? 1 : 0),
      heldLoss: held.loss > 0 || held.damage > block + endBlock,
    });
    if (first.refuse) return verdict(false, null, `only our own loss at the next turn's start makes it lethal (${startText}), and ${first.refuse}`);
    const retaliationEach = powerAmount(player, "THORNS_POWER") + powerAmount(player, "FLAME_BARRIER_POWER");
    const isMinion = (enemy: Record<string, unknown>) => asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "MINION_POWER");
    const leaders = living.map((enemy, i) => ({ enemy, i })).filter((entry) => !isMinion(entry.enemy));
    const needed = leaders.length > 0 ? leaders : living.map((enemy, i) => ({ enemy, i }));
    // An enemy whose intent is to escape leaves on its turn (the fight ends when every enemy is gone).
    const escapes = (enemy: Record<string, unknown>) => asArray(enemy["intents"]).some((intent) => str(asRecord(intent)["intent_type"]) === "Escape");
    const left = needed.reduce((sum, { enemy, i }) => {
      if (escapes(enemy)) return sum;
      const lowest = before[i]!.hp - before[i]!.hit - before[i]!.poison - retaliationEach * hitsOf[i]!.length;
      return sum + Math.max(0, Math.ceil(lowest) - first.all);
    }, 0);
    if (left <= first.single) {
      const what = [
        ...ends.sources.map((source) => source.name),
        ...(before.some((entry) => entry.poison > 0) ? ["their poison"] : []),
        ...(retaliationEach > 0 ? [`our retaliation ${retaliationEach} a hit`] : []),
        ...first.from,
      ].join(", ") || "nothing: their HP at 0";
      return verdict(false, null, `only our own loss at the next turn's start makes it lethal (${startText}), but every enemy may die before it (${what})`);
    }
  }
  let endNote = "";
  // The Sandpit: the Insatiable alone (all 81 logged fights), no Tungsten Rod or Beating Remnant (none of the 15 logged
  // deaths to it had one), its move shown, and nothing that may kill it before its turn (what hits it at the end of ours, its
  // poison, our retaliation on each of its hits, a power hitting the enemies when our held cards cost us HP): killed first,
  // the fight is won and the Sandpit eats nobody.
  if (bySandpit) {
    const insatiable = living[pit!.at]!;
    const others = names.filter((_, i) => i !== pit!.at);
    const hidden = intentNotShown(state);
    const retaliationNow = powerAmount(player, "THORNS_POWER") + powerAmount(player, "FLAME_BARRIER_POWER");
    const worst = before[pit!.at]!.hit + before[pit!.at]!.poison + retaliationNow * hitsOf[pit!.at]!.length;
    const guard =
      others.length > 0 ? `other enemies are alive (${others.join(", ")}): not a logged board`
      // How the Sandpit kills (no HP left to see) is not in the logs: an HP loss cut or capped might live through it.
      : exactly ? `${[rod ? "Tungsten Rod" : "", remnant ? "Beating Remnant" : "", buffer > 0 ? "Buffer" : "", intangible ? "Intangible" : ""].filter(Boolean).join(" and ")} may cut what it takes (never logged with the Sandpit)`
      : hidden ? hidden
      : worst >= num(insatiable["current_hp"]) ? `${pit!.name} (${num(insatiable["current_hp"])} HP) may die before its turn: up to ${worst} from the end of the turn, its poison and our retaliation`
      : null;
    if (guard) return verdict(false, null, `only the Sandpit makes it lethal (${sandpitText}), but ${guard}`);
  }
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
  const stunnedOnly = stunned.filter((entry) => !mayDie.some((dead) => dead.i === entry.i));
  if (mayDie.length > 0 || cut.length > 0 || stunnedOnly.length > 0) {
    const minion = (enemy: Record<string, unknown>) => asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "MINION_POWER");
    const leaderMayDie = mayDie.some((entry) => !minion(entry.enemy));
    const gone = new Set([...mayDie.map((entry) => entry.i), ...stunnedOnly.map((entry) => entry.i)]);
    if (leaderMayDie) living.forEach((enemy, i) => minion(enemy) && gone.add(i));
    if (cut.some((i) => !minion(living[i]!))) living.forEach((enemy, i) => minion(enemy) && gone.add(i));
    // An ally's death may change a survivor's move before it attacks (its learned death move, MECH_DEATH_MOVE: the Queen's
    // Enrage once the Amalgam is dead; Ravenous; Surrounded's back attack gone with its partner: D4JGCNEL40VL F33 T5, the
    // Rocket killed by Howl from Beyond at the end of the turn, the Crusher's shown 21 landed as 20, Crab Rage's +6 in it,
    // and we lived at 1 where this judge said certain). So with any enemy that may die before the enemy turn ends, an
    // enemy's hits count only when no other one may: its own, up to its own death.
    const dying = new Set([...mayDie.map((entry) => entry.i), ...cut]);
    const changed = living.map((_, i) => i).filter((i) => !gone.has(i) && hitsOf[i]!.length > 0 && [...dying].some((j) => j !== i));
    const keptByEnemy = living.map((_, i) => i).filter((i) => !gone.has(i)).map((i) => (changed.includes(i) ? [] : landing(i)));
    const keptHits = keptByEnemy.flat();
    const kept = keptHits.reduce((sum, hit) => sum + hit, 0);
    const keptOwn = exactly ? lossWith(keptHits, true) : null;
    const keptLoss = keptOwn ? (keptOwn.unknown ? null : keptOwn.loss - regen) : Math.max(0, kept + held.damage - block - endBlock) + held.loss - regen;
    const stillDies = keptLoss !== null && (keptLoss >= hp || (byStart && hp - keptLoss <= startLoss));
    const who = [
      ...mayDie.map((entry) => `${names[entry.i]} (${entry.why}) may die first`),
      ...stunnedOnly.map((entry) => `${names[entry.i]} may be stunned first (${entry.why})`),
      ...cut.filter((i) => !gone.has(i)).map((i) => `${names[i]} may die to our retaliation (${retaliation} a hit) after ${landing(i).length} of its ${hitsOf[i]!.length} hits`),
      ...(changed.length > 0 ? [`an ally's death may change the move of ${changed.map((i) => names[i]).join(", ")} (its hits not counted)`] : []),
    ].join(", ");
    if (!stillDies) return verdict(false, null, `the enemies may be hit before they act: ${who}, and the rest's ${kept} does not kill`);
    // The revives again, on what still lands for certain.
    const keptSaved = reviveVeto(keptByEnemy, `, if ${who}`);
    if (keptSaved) return keptSaved;
    endNote = `; even if ${who}`;
  }
  const blastNote = blast ? ` (${blast.name}'s blast: the husk explodes for ${blast.damage} as the turn ends, after the end-of-turn block)` : "";
  const lethal = `${bySandpit ? `${sandpitText} (our count lives: ` : ""}${incoming} incoming${blastNote}${byHeld ? ` + ${heldText}${combat["end_turn_will_kill_player"] !== true ? " (the mod does not count them)" : ""}` : ""} vs ${hp} HP + ${block} block + ${endBlock} end-of-turn block${regen > 0 ? ` + ${regen} Regen` : ""}${exactly ? ` (${relicText})` : ""}${byStart ? `, ${startText}` : ""}${bySandpit ? ")" : ""}${endNote}${reviveNote}`;
  if (playable.length === 0 && drinkable.length === 0) return verdict(true, "rules", `nothing left to play or drink; ${lethal}`);
  if (context.label === LEAST_LOSS_LABEL) {
    // A revive held: the planner's lines spend it in its one order of the losses (turn-solver reviveThrough: the held cards'
    // HP loss, then their damage summed, then the hits). Its "every line dies" is taken only where that order is the only one
    // the game can have (or sums what may come apart, which only leaves more HP): one attacker, the held cards' losses of
    // one kind, no Regen. This judge's own count above tries every order, but only for ending the turn now.
    if (context.revives.length > 0 && context.reloadOnRevive !== true) {
      const attackers = living.filter((_, i) => hitsOf[i]!.length > 0).length;
      const kinds = new Set(held.items.map((item) => item.blocked)).size;
      const why = attackers > 1 ? `${attackers} enemies attack (the order of their turns with the revive)` : kinds > 1 ? "the held cards both damage us and take HP (their order with the revive)" : regen > 0 ? "Regen heals before or after the held cards" : null;
      if (why) return verdict(false, null, `the planner sees every line die, but a revive is left (${reviveNames}) and its lines play it out in one order: ${why}`);
    }
    // The template without its conditionals (card-model unconditionalText): Mad Science's 「{Wisdom: 抽{WisdomCards}张牌|}」
    // is in its template whatever rider it was given.
    const drawing = reachable.find((card) => DRAWS.test(`${str(card["resolved_rules_text"])} ${unconditionalText(str(card["rules_text"]))}`));
    if (drawing && context.drawsKnown !== true) {
      const vetoed = `the planner sees every line die, but ${str(drawing["name"], str(drawing["card_id"]))} draws (unknown cards)`;
      // SL_JUDGE_ANY_DRAW: certain only when the death holds for every draw (anyDrawJudged); absent, the veto as before.
      if (!context.drawBound) return verdict(false, null, vetoed);
      const any = anyDrawJudged(state, context, { hp, hand, etherealHeld, endTotal: block + endBlock, heldLossEvents });
      if (!any.certain) return verdict(false, null, `${vetoed}; not with any draw: ${any.why}`);
      return verdict(true, "least-loss", `the turn planner: every simulated line dies and ending the turn keeps the most HP; ${lethal}; ${any.why}`);
    }
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
export const MODELLED_POWERS = new Set([
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
  /** For each `chance` name, its id and text (heldGuard reads when it fires: chanceTrigger). */
  chanceOf: Record<string, { id: string; text: string }>;
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
 * and any relic or power whose text says random (CHANCE) about this turn, its end included, unless its only chance is the
 * enemy it hits and one enemy can be hit (random-target.ts).
 */
export function midTurnRisks(state: GameState, knowledge?: Pick<Knowledge, "power" | "relic">): MidTurnRisks {
  const draws: string[] = [];
  const any: string[] = [];
  const chance: string[] = [];
  const chanceOf: Record<string, { id: string; text: string }> = {};
  const endOfTurn: string[] = [];
  const run = asRecord(state.raw["run"]);
  // A random enemy is no chance with one enemy to hit (randomTargetOnly).
  const lone = randomTargets(state) <= 1;
  const byChance = (text: string): boolean => CHANCE.test(text) && !(lone && randomTargetOnly(text));
  for (const relic of asArray(run["relics"]).map(asRecord)) {
    const id = str(relic["relic_id"]);
    if (!id) continue;
    const text = str(relic["description"]) || (knowledge?.relic(id)?.description ?? "");
    const name = `${str(relic["name"], id)} (relic)`;
    if (byChance(text) && !NOT_THIS_TURN.test(text) && id !== "KUSARIGAMA") {
      chance.push(name);
      chanceOf[name] = { id, text };
    }
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
    if (byChance(text) && id !== "JUGGERNAUT_POWER" && id !== "HELLRAISER_POWER") {
      chance.push(name);
      chanceOf[name] = { id, text };
    }
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
      if (CHANCE.test(text)) {
        chance.push(name);
        chanceOf[name] = { id, text };
      }
    }
  }
  return { draws, any, chance, chanceOf, endOfTurn };
}

/** The enemy intents the game shows (and the solver and the mod count): a living enemy with none, or an unknown kind, is not shown. */
const SHOWN_INTENTS = new Set(["Attack", "Buff", "Debuff", "DebuffStrong", "Defend", "StatusCard", "CardDebuff", "Summon", "Stun", "Sleep", "Heal", "Escape"]);

/**
 * A living enemy whose intent is not shown (no intent, or a kind not in SHOWN_INTENTS), or null. The Waterfall Giant's husk
 * on its blast turn shows its DeathBlow with the number that hits (giantBlast; docs/sl.md §2.4).
 */
export function intentNotShown(state: GameState): string | null {
  for (const enemy of asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((entry) => entry["is_alive"] !== false)) {
    const intents = asArray(enemy["intents"]).map(asRecord);
    const name = str(enemy["name"], str(enemy["enemy_id"], "?"));
    if (intents.length === 0) return `${name} shows no intent`;
    if (giantBlast(enemy)) continue;
    const odd = intents.find((intent) => !SHOWN_INTENTS.has(str(intent["intent_type"])));
    if (odd) return `${name}'s intent ${str(odd["intent_type"], "?")} is not a plain one`;
  }
  return null;
}

export interface LeastLossNowContext extends Omit<JudgeContext, "label" | "drawsKnown" | "knowledge" | "drawBound"> {
  /** The planner's facts about its least-loss verdict (combat-plan leastLossFactsOf); absent: no early reload. */
  facts: LeastLossFacts | undefined;
  /** SL_JUDGE_KNOWN_DRAWS is on (exactly known draws lift the draw veto). */
  knownDrawsJudge: boolean;
  /** A card was added to the draw pile at a random place in this attempt (the draw tracker): chance in the pile. */
  addedToPile: boolean;
  knowledge?: Pick<Knowledge, "power" | "relic">;
  /** SL_JUDGE_ANY_DRAW: the planner's bound over every draw (JudgeContext.drawBound); absent, the draws veto as before. */
  drawBound?: () => DrawBound | null;
}

/**
 * SL_RELOAD_EARLY (Roy 2026-10-02: certain death only, never a prediction): the least-loss verdict at the decision that
 * finds it, before its line is played. Certain only when every one of these holds; otherwise end_turn judges, unchanged:
 * 1. judgeEndTurn is certain on this board with the least-loss label: the mod's end_turn_will_kill_player, our own count
 *    (Ripple Basin's 4 when no Attack has been played yet, Buffer and Intangible at the most they save: a line that plays
 *    an Attack only loses that block), no revive that may save us, no special phase, and the least-loss tier (every
 *    simulated line dies; no unmodelled potion) with its draw veto (lifted only by exactly known draws).
 * 2. Nothing in the verdict left to chance (LeastLossFacts.chance): no random potion; no line drawing a card that is not
 *    exactly known; no playable card (hand, modelled potion, known draw) with a random target, a random exhaust, a random
 *    card made or a top card played, nor an unmodelled one; no Juggernaut, Kusarigama or Hellraiser random hit. A random
 *    enemy with one enemy to hit is no chance (random-target.ts; ops 2026-10-02, X7BX5DYHFZ3N F48: the lone Aeonglass).
 * 3. No card added to the draw pile at a random place in this attempt (`addedToPile`).
 * 4. The enemies' intents as shown (intentNotShown), and no relic or power acting by chance this turn (midTurnRisks.chance;
 *    a random enemy hit with one enemy to hit is none).
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
    ...(context.reloadOnRevive === true ? { reloadOnRevive: true } : {}),
    ...(context.ethereal ? { ethereal: context.ethereal } : {}),
    ...(context.knowledge ? { knowledge: context.knowledge } : {}),
    ...(context.lostSoFar !== undefined ? { lostSoFar: context.lostSoFar } : {}),
    ...(context.lostSoFarAtMost !== undefined ? { lostSoFarAtMost: context.lostSoFarAtMost } : {}),
    ...(drawsKnown ? { drawsKnown: true } : {}),
    ...(context.drawBound ? { drawBound: context.drawBound } : {}),
  });
  if (!verdict.certain) return verdict;
  const notYet = (why: string): DeathVerdict => ({ ...verdict, certain: false, tier: null, reason: `not before the line is played: ${why}` });
  if (!facts) return notYet("the planner's facts about its verdict are missing");
  // SL_JUDGE_ANY_DRAW: draws the lines made that are not exactly known are no chance when the death holds for every draw;
  // then only what else the verdict leaves to chance counts (DrawBound.chance).
  const unknownDraws = facts.draws && !drawsKnown;
  let anyDraw: { certain: boolean; why: string; chance: string | null } | null = null;
  if (unknownDraws && context.drawBound) {
    const hand = asArray(asRecord(state.raw["combat"])["hand"]).map(asRecord);
    const etherealHeld = hand.filter((card) => (context.ethereal ?? ((held) => heldCardEthereal(held)))(card)).length;
    anyDraw = anyDrawJudged(state, { drawBound: context.drawBound, ...(context.knowledge ? { knowledge: context.knowledge } : {}) }, { hp: verdict.hp, hand, etherealHeld, endTotal: verdict.block + verdict.endBlock });
  }
  const chance = anyDraw?.certain ? anyDraw.chance : facts.chance;
  if (chance !== null) return notYet(`chance in the verdict (${chance})`);
  if (unknownDraws && !anyDraw?.certain) return notYet(`a line draws cards not exactly known${anyDraw ? ` (not with any draw: ${anyDraw.why})` : ""}`);
  if (context.addedToPile) return notYet("cards were added to the draw pile at random places this attempt");
  const hidden = intentNotShown(state);
  if (hidden) return notYet(hidden);
  if (risks.chance.length > 0) return notYet(`acting by chance: ${risks.chance.join(", ")}`);
  if (risks.any.length > 0) return notYet(`acting mid-turn without the planner: ${risks.any.join(", ")}`);
  if (risks.endOfTurn.length > 0) return notYet(`hitting the enemies at the end of the turn: ${risks.endOfTurn.join(", ")}`);
  const anyText = anyDraw?.certain && !verdict.reason.includes("dies with any draw") ? `; ${anyDraw.why}` : "";
  return { ...verdict, early: true, reason: `at the least-loss verdict, before its line (${facts.line.join(", ") || "end turn"}): ${verdict.reason}${anyText}` };
}

/** SL_JUDGE_KNOWN_DRAWS at end_turn: every draw the lines could make is exactly known, and nothing draws or changes the pile unseen. */
export function drawsKnownAt(state: GameState, facts: LeastLossFacts | undefined, knowledge?: Pick<Knowledge, "power" | "relic">): boolean {
  return facts?.drawsKnown === true && midTurnRisks(state, knowledge).draws.length === 0;
}
