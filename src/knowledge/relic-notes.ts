/**
 * What some relics (and event-given cards) actually do, for event/ancient option text that only names
 * them (EJXC F13: DeepSeek paid 14 HP for 「天选芝士」 guessing "maybe gain 1 Strength?"; it is +1 max HP
 * per fight. F22: it guessed Mr. Struggles "gains block"; it deals the turn number to all enemies each
 * turn). The game data's own descriptions carry unfilled templates ({MaxHp}); these carry measured
 * numbers. Matched by name in the option text.
 */
export interface RelicNote {
  id: string;
  names: string[];
  effect: string;
}

export const RELIC_NOTES: RelicNote[] = [
  { id: "CHOSEN_CHEESE", names: ["天选芝士", "Chosen Cheese"], effect: "relic: +1 max HP at the end of every combat (EJXC: 80 -> 88 by the act-2 boss); no Strength" },
  { id: "MR_STRUGGLES", names: ["抱抱先生", "Mr. Struggles"], effect: "relic: at the start of each of your turns, damage equal to the turn number to ALL enemies (EJXC: 28 over a 7-turn boss); no block" },
  { id: "STORYBOOK", names: ["故事书", "Storybook"], effect: "relic: adds 1 Brightest Flame to the deck (2 energy, draw 2, lose 2 max HP each play; RVL2: 80 -> 68 max HP in act 2)" },
  { id: "BRIGHTEST_FLAME", names: ["至亮之焰", "Brightest Flame"], effect: "card: gain 2 energy, draw 2, LOSE 2 MAX HP each time it is played (~5 plays an act)" },
  { id: "PANTOGRAPH", names: ["缩放仪", "Pantograph"], effect: "relic: heal 25 at the start of each boss fight" },
  { id: "MERCURY_HOURGLASS", names: ["水银沙漏", "Mercury Hourglass"], effect: "relic: 3 damage to all enemies at the start of each of your turns" },
  { id: "RED_SKULL", names: ["红头骨", "Red Skull"], effect: "relic: +3 Strength while HP is at or below 50%" },
  { id: "TOASTY_MITTENS", names: ["烘焙手套", "Toasty Mittens"], effect: "relic: each turn start exhausts 1 card from your hand and gives +1 Strength" },
  { id: "LANTERN_KEY", names: ["灯火钥匙", "Lantern Key"], effect: "quest card: unplayable, only unlocks an event in the next act; keeping it means fighting the Mysterious Knight (108 HP, Strength 6, Plating 6: an elite)" },
];

/** Notes for every relic/card named in the text (markup stripped). */
export function relicNotesFor(text: string): string[] {
  const plain = text.replace(/\[[^\]]*\]/g, "");
  return RELIC_NOTES.filter((note) => note.names.some((name) => plain.includes(name))).map((note) => `${note.names[0]} (${note.id}): ${note.effect}`);
}
