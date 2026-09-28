/**
 * What an enchantment does. Neither the game data (`/data/*`: no enchantment collection) nor the state
 * carries enchantment rules: an event option only says 「选择一张能力牌附魔：迅速2」 and an enchanted card
 * only lists the name in `mods`. FSPK F36: DeepSeek read "迅速2" as "cost 3 -> 1"; it is "the first time it
 * is played, draw 2 cards".
 *
 * Effects below are MEASURED in states.jsonl (to 09-28): the sentence an enchant adds to the card's
 * rendered text (agent_view deck lines with mods ["Enchantment", name] against the card's own text), and
 * the enchanted_value - base_value of the enchanted deck card's vars. N is the amount the game shows after
 * the name (迅速2, 锋利2). Anything not measured reads "effect text unavailable", never a guess.
 */

import { stripMarkup } from "../util/json.js";

/** Effects by the game's (Chinese) enchantment name; `n` is the shown amount (null when none is shown). */
export const ENCHANT_TEXT: Record<string, (n: number | null) => string> = {
  // 「第一次打出时抽2张牌」 on every 迅速 card (Demon Form, Feel No Pain, Inflame, Pyre, Stone Armor …).
  迅速: (n) => `the first time the card is played, draw ${n ?? "N"} cards (「第一次打出时抽${n ?? "N"}张牌」)`,
  // Damage var +2 for 锋利2 (Bash, Twin Strike, Whirlwind, Setup Strike, Perfected Strike, Howl from Beyond).
  锋利: (n) => `the card deals ${n ?? "N"} more damage (per hit)`,
  // Block var +2 for 灵巧2 (Flame Barrier, Shrug It Off).
  灵巧: (n) => `the card gives ${n ?? "N"} more Block`,
  // 「失去2点生命」 added; damage x1.5 (Bludgeon 32 -> 48, Twin Strike 5 -> 7, Sword Boomerang 3 -> 4).
  腐化: () => "the card deals 50% more damage, and playing it costs 2 HP (「失去2点生命」)",
  // 「这张牌的格挡值永久增加1点」「消耗」 added (Defend).
  黏糊: () => "each time the card is played its Block rises by 1 for the rest of the run, and it Exhausts (「这张牌的格挡值永久增加1点。消耗」)",
  // 「保留」 added.
  稳定: () => "Retain: the card stays in hand at the end of the turn (「保留」)",
  // 「重放1」 added.
  涡旋: () => "Replay 1: the card is played one extra time (「重放1」)",
  华彩: () => "Replay 1: the card is played one extra time (「重放1」)",
  // Strike: cost 1 -> 0, Damage +3, 「永恒」 added.
  特兹卡塔拉的余烬: () => "the card costs 0, deals 3 more damage, and is Eternal (「永恒」: cannot be removed from the deck)",
  // Damage var +8 (Whirlwind, Pommel Strike, Bash, Dismantle).
  活力: () => "the card deals 8 more damage",
};

/** The effect of one enchantment, or the honest "effect text unavailable". */
export function enchantEffect(name: string, amount: number | null): string {
  const effect = ENCHANT_TEXT[name];
  return effect ? effect(amount) : "effect text unavailable";
}

/**
 * 附魔：<name>[N] in game text (markup or not), with every named enchantment's effect added after it:
 * 「选择一张能力牌附魔：迅速2。」 -> 「选择一张能力牌附魔：迅速2（迅速2: the first time …）。」. A template left
 * unfilled by the game ({EnchantmentName}) is said to be unnamed.
 */
export function annotateEnchants(text: string): string {
  if (!text.includes("附魔")) return text;
  const pattern = /附魔((?:\[\/?[a-z]+\])*)[：:]\s*((?:\[[a-z]+\])*)([^\[\]\s。，,：:0-9{}（）()]+)((?:\[\/[a-z]+\])*)((?:\[[a-z]+\])*)(\d+)?((?:\[\/[a-z]+\])*)/g;
  let out = text.replace(pattern, (match, _a, _b, name: string, _c, _d, digits: string | undefined, _e, offset: number, whole: string) => {
    const after = whole.slice(offset + match.length);
    if (after.startsWith("（")) return match;
    const amount = digits === undefined ? null : Number(digits);
    return `${match}（${name}${digits ?? ""}: ${enchantEffect(name, amount)}）`;
  });
  if (out.includes("{EnchantmentName}") && !out.includes("enchantment not named")) out = `${out}（enchantment not named by the game: effect text unavailable）`;
  return out;
}

/** The enchantments an option text names, as "name N: effect" lines (markup stripped). */
export function enchantsNamed(text: string): string[] {
  const plain = stripMarkup(text);
  const out: string[] = [];
  for (const match of plain.matchAll(/附魔[：:]\s*([^\s。，,：:0-9{}（）()]+)(\d+)?/g)) {
    const name = match[1]!;
    const amount = match[2] === undefined ? null : Number(match[2]);
    out.push(`${name}${match[2] ?? ""}: ${enchantEffect(name, amount)}`);
  }
  return out;
}
