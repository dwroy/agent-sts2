/**
 * Experience for Jev's combat plan choice beyond the lessons about the current enemies (V4 M3, notes/v4-dev-brief.md
 * item 4). Dai 2026-09-29: a potion is a 0-cost one-shot card and drinking it is Jev's call; code puts no cost on
 * it, filters nothing and vetoes nothing; experience is evidence, never a gate. So these blocks only add evidence
 * to the question (JEV_CONTEXT=v1, the Jev view); no option, score or rollout number changes.
 *
 *  - potion_experience: keeping potions for the act boss. The experience base's potion lessons (general:potion,
 *    which never reached Jev before: notes/potion-drinks-2026-09-29.md §4), the act boss's lessons about potions
 *    (in hallway and elite fights too, not only once the boss is on the board), the lessons about the potions in
 *    the belt, logged data on boss fights with and without potions (POTION_BOSS_DATA, sourced), and what DeepSeek's
 *    run plan says about potions, in its own words.
 *  - mechanics_experience: lessons about the mechanics in this fight: our power cards and buffs, the enemies' own
 *    powers (Slippery, revives, summons, Artifact, ...).
 *
 * Selection is by relevance tiers with a count and a character cap per block (the constants below); within a tier
 * the experience base's order (confidence, support, contradictions, id) decides, as for DeepSeek's slice.
 */

import { lessonText, loadExperience, type Confidence, type ExperienceEntry } from "../knowledge/experience.js";
import type { Knowledge } from "../knowledge/index.js";
import { monsterMoves, type MonsterEntry } from "../knowledge/monster-db.js";
import type { GameState } from "../hand/mod/schema.js";
import type { RunPlan } from "../memory/run-plan.js";
import type { SolverInput } from "./turn-solver.js";
import { asArray, asRecord, bool, str, type JsonValue } from "../core/util/json.js";

/* ---- caps ---------------------------------------------------------------------------------------------- */

/**
 * Size of the two blocks. A Jev plan-choice question is ~2,000 input tokens today (decisions.jsonl usage: state
 * ~1,000-2,400 characters plus options ~2,500-5,000) and the enemies' own `experience` block holds at most 4
 * lessons. Jev has no system prompt and its picks drift with unrelated context (run-brief.ts, jev-hints.ts), so the
 * new evidence stays below the size of the rest of the question: potions up to 6 lessons / 1,400 characters of
 * lesson text (the three general:potion lessons are 650 today; then the act boss's potion lessons and the belt's),
 * mechanics up to 3 / 600 (two or three card or monster lessons). With the notes, the logged data and the run
 * plan's words the two blocks add about 2,500-3,200 characters. A lesson is never cut: one that does not fit is
 * skipped for a shorter one further down; the most relevant one is always kept.
 */
export const MAX_POTION_LESSONS = 6;
export const MAX_POTION_LESSON_CHARS = 1400;
export const MAX_MECHANIC_LESSONS = 3;
export const MAX_MECHANIC_LESSON_CHARS = 600;
/** DeepSeek's words on potions, quoted whole clause by whole clause up to this many characters. */
export const MAX_PLAN_POTION_CHARS = 400;

/* ---- what code writes itself --------------------------------------------------------------------------- */

/**
 * Logged data on potions and boss fights, each checked against its source (the numbers are the documents', not
 * recomputed here). Shown in hallway, elite and event fights; a boss fight gets no "entering the boss with" data.
 * (The drink-by-drink gains of notes/potion-drinks §2 are left to potion-save-for-boss, whose text says the same.)
 */
export const POTION_BOSS_DATA: readonly { source: string; text: string }[] = [
  {
    // §5.2 (and conclusion 4): A8 all versions, 218 boss fights; 0 potions 9/27, 1+ 115/191; at 75%+ HP 8/21 and 103/149;
    // act 2 at 75%+ HP 0/6 and 19/37.
    source: "notes/potion-drinks-2026-09-29.md §5.2",
    text: "A8, 218 boss fights (all code versions): won 9/27 (33%) entering with no potion, 115/191 (60%) with 1+; at 75%+ HP 8/21 (38%) vs 103/149 (69%); act 2 boss at 75%+ HP 0/6 vs 19/37. Observational: no-potion runs often had weaker decks too.",
  },
  {
    // §2(c) and appendix A (差距): the 7 A9 deaths where keeping one potion would likely have been enough.
    source: "notes/a9-analysis-2026-09-29.md §2(c)",
    text: "A9, 40 runs: 7 deaths where one more potion would likely have been enough: TYZH (1 HP short), 0H1X (4), 9Q7V (6), XMK1 (6), 2ZCK (11), 7MDJ, PHMV.",
  },
];

const POTION_NOTE_HALLWAY =
  "Past runs on keeping potions for the act boss (experience base, logged data): evidence, not orders. The options' rollout numbers cover this fight only (a line that drinks nothing now may drink later in it); a potion still held when the fight ends counts for nothing in them.";
const POTION_NOTE_BOSS = "This is the act boss fight, the one potions are kept for. Past runs on potions (experience base): evidence, not orders.";
const MECHANICS_NOTE =
  "lessons from past runs about the mechanics in this fight: our power cards and buffs, the enemies' own powers (experience base): evidence, not orders";

/** The code-written texts of the blocks (the no-gate-words test reads these). */
export const JEV_EXPERIENCE_TEXTS: readonly string[] = [POTION_NOTE_HALLWAY, POTION_NOTE_BOSS, MECHANICS_NOTE, ...POTION_BOSS_DATA.map((data) => data.text)];

/* ---- relevance ------------------------------------------------------------------------------------------ */

/** Words the lessons use for an enemy power's mechanic besides the power's own name (the game's name is used too). */
export const MECHANIC_ALIASES: Readonly<Record<string, readonly string[]>> = {
  ILLUSION_POWER: ["复活"],
  ADAPTABLE_POWER: ["复活"],
  REATTACH_POWER: ["复活"],
  STOCK_POWER: ["复活", "召唤"],
  INFESTED_POWER: ["召唤"],
  SURPRISE_POWER: ["召唤"],
  SUMMON_NEXT_TURN_POWER: ["召唤"],
  STEAM_ERUPTION_POWER: ["喷发", "自爆"],
};

/**
 * A mechanic word found in more than this share of the active lessons says nothing about this fight (力量 is in a
 * quarter of them, mostly deck building; 易伤 in 6%): it is not used to match.
 */
export const MECHANIC_WORD_MAX_SHARE = 0.05;

/** A potion named in a lesson (药 covers 药水). */
const POTION_WORD = /药|potion/gi;

function potionMentions(text: string): number {
  return text.match(POTION_WORD)?.length ?? 0;
}

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 0, med: 1, low: 2 };

function scopeParts(scope: string): [string, string] {
  const at = scope.indexOf(":");
  return at < 0 ? [scope, ""] : [scope.slice(0, at), scope.slice(at + 1)];
}

function applies(entry: ExperienceEntry, asc: number): boolean {
  if (entry.status !== "active") return false;
  const [lo, hi] = entry.asc ?? [0, 20];
  return asc >= lo && asc <= hi;
}

/** The experience base's own order (experience.ts selectLessons): confidence, support, contradictions, id. */
function byStrength(a: ExperienceEntry, b: ExperienceEntry): number {
  return (
    CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence] ||
    b.n_support - a.n_support ||
    a.n_contradict - b.n_contradict ||
    a.id.localeCompare(b.id)
  );
}

/** Tier (lower first), then `within` for a tie, then strength; entries with no tier are dropped. */
function rank(entries: readonly ExperienceEntry[], tier: (entry: ExperienceEntry) => number | null, within: (a: ExperienceEntry, b: ExperienceEntry) => number = () => 0): ExperienceEntry[] {
  return entries
    .map((entry) => ({ entry, tier: tier(entry) }))
    .filter((item): item is { entry: ExperienceEntry; tier: number } => item.tier !== null)
    .sort((a, b) => a.tier - b.tier || within(a.entry, b.entry) || byStrength(a.entry, b.entry))
    .map((item) => item.entry);
}

/** In order, up to `maxCount` lessons and `maxChars` characters of lesson text; the first one always. */
function withinBudget(ranked: readonly ExperienceEntry[], maxCount: number, maxChars: number): ExperienceEntry[] {
  const out: ExperienceEntry[] = [];
  let chars = 0;
  for (const entry of ranked) {
    if (out.length >= maxCount) break;
    if (out.length > 0 && chars + entry.lesson.length > maxChars) continue;
    out.push(entry);
    chars += entry.lesson.length;
  }
  return out;
}

/**
 * A lesson as Jev reads it (the `experience` block's format), its data placeholders filled (v3 b5e1f44 lessonText), the
 * records by the run's ascension band when `ascension` is given (from A8 up A8 and A9 apart).
 */
export function jevLessonLine(entry: ExperienceEntry, ascension?: number): string {
  return `[${entry.scope} | confidence ${entry.confidence}, n=${entry.n_support}${entry.n_contradict > 0 ? `, against ${entry.n_contradict}` : ""}] ${lessonText(entry, ascension)}`;
}

/* ---- the board ------------------------------------------------------------------------------------------ */

export interface HeldPotion {
  id: string;
  name: string;
}

function heldPotions(state: GameState): HeldPotion[] {
  return asArray(asRecord(state.run?.raw)["potions"])
    .map(asRecord)
    .filter((slot) => bool(slot["occupied"]) && str(slot["potion_id"]))
    .map((slot) => ({ id: str(slot["potion_id"]), name: str(slot["name"]) }));
}

/** The act boss's id as experience scopes write it (WATERFALL_GIANT_BOSS -> WATERFALL_GIANT). */
function actBossScopeId(state: GameState): string {
  return (state.run?.boss_id ?? str(asRecord(state.run?.raw)["boss_id"])).toUpperCase().replace(/_BOSS$/, "");
}

interface BoardPower {
  id: string;
  name: string;
  debuff: boolean;
}

function powersOf(holder: Record<string, unknown>): BoardPower[] {
  return asArray(holder["powers"])
    .map(asRecord)
    .map((power) => ({ id: str(power["power_id"]), name: str(power["name"]), debuff: bool(power["is_debuff"]) }))
    .filter((power) => power.id);
}

interface Board {
  asc: number;
  act: number;
  potions: HeldPotion[];
  /** Card ids in this fight's deck (the run's deck and the hand). */
  cards: Set<string>;
  /** The Power cards among them. */
  powerCards: Set<string>;
  relics: Set<string>;
  ours: BoardPower[];
  theirs: BoardPower[];
}

function board(state: GameState, knowledge: Knowledge | null): Board {
  const run = asRecord(state.run?.raw);
  const combat = asRecord(state.combat?.raw ?? state.raw["combat"]);
  const cards = new Set<string>();
  const powerCards = new Set<string>();
  for (const card of [...asArray(run["deck"]), ...asArray(combat["hand"])].map(asRecord)) {
    const id = str(card["card_id"]);
    if (!id) continue;
    cards.add(id);
    const type = str(card["card_type"]) || (knowledge?.card(id)?.type ?? "");
    if (type === "Power") powerCards.add(id);
  }
  const actRaw = str(run["act_id"]);
  return {
    asc: state.run?.ascension ?? 0,
    act: /^\d+$/.test(actRaw) ? Number(actRaw) + 1 : 1,
    potions: heldPotions(state),
    cards,
    powerCards,
    relics: new Set(asArray(run["relics"]).map((relic) => str(asRecord(relic)["relic_id"])).filter(Boolean)),
    ours: powersOf(asRecord(combat["player"])),
    theirs: asArray(combat["enemies"])
      .map(asRecord)
      .filter((enemy) => enemy["is_alive"] !== false)
      .flatMap(powersOf),
  };
}

function holdsItem(kind: string, id: string, at: Board): boolean {
  if (kind === "card") return at.cards.has(id);
  if (kind === "relic") return at.relics.has(id);
  if (kind === "potion") return at.potions.some((potion) => potion.id === id);
  return false;
}

/* ---- DeepSeek's run plan on potions ---------------------------------------------------------------------- */

/**
 * Words naming a held potion: its game name, and its id in words when the id is a name of its own (LIQUID_BRONZE
 * -> "liquid bronze"). An X_POTION id is left to the word "potion": "strength", "block" or "fire" alone would
 * match clauses about cards.
 */
function potionWords(potions: readonly HeldPotion[]): string[] {
  const words = new Set<string>();
  for (const potion of potions) {
    if (potion.name.length >= 2) words.add(potion.name.toLowerCase());
    if (!/_POTION$/.test(potion.id) && potion.id.length >= 4) words.add(potion.id.replace(/_/g, " ").toLowerCase());
  }
  return [...words];
}

/**
 * The clauses of DeepSeek's run plan that talk about potions (a potion word, or a held potion's name), verbatim,
 * in the plan's order, up to MAX_PLAN_POTION_CHARS. A clause ends at ; ； 。 ， | " — " or a full stop before a space
 * (an English comma does not end one: "T1 Strength Potion + AoE burst, single-target Rocket" stays whole).
 */
export function planPotionClauses(texts: readonly string[], potions: readonly HeldPotion[] = []): string[] {
  const names = potionWords(potions);
  const out: string[] = [];
  let chars = 0;
  for (const text of texts) {
    for (const raw of text.split(/[;；。，|]|\.(?=\s)|\s—\s/)) {
      const clause = raw.trim().replace(/^boss prep:\s*/i, "");
      if (!clause || out.includes(clause)) continue;
      const lower = clause.toLowerCase();
      if (potionMentions(clause) === 0 && !names.some((name) => lower.includes(name))) continue;
      if (out.length > 0 && chars + clause.length > MAX_PLAN_POTION_CHARS) continue;
      out.push(clause);
      chars += clause.length;
    }
  }
  return out;
}

/** The run plan in force (screen memory, this run's), else the brief's one-line plan. */
function planTexts(runPlan: RunPlan | null, briefPlan: string | undefined): { floor: number | null; texts: string[] } | null {
  if (runPlan) return { floor: runPlan.floor, texts: [runPlan.bossPrep, runPlan.summary].filter(Boolean) };
  return briefPlan ? { floor: null, texts: [briefPlan] } : null;
}

/* ---- the blocks ------------------------------------------------------------------------------------------ */

export interface JevExperienceInput {
  state: GameState;
  kind: SolverInput["fightKind"];
  /** DeepSeek's run plan in force for this run (null: none). */
  runPlan: RunPlan | null;
  /** The brief's one-line plan, used when there is no run plan in memory. */
  briefPlan?: string;
  knowledge?: Knowledge | null;
  /** Lesson ids already on the question (the enemies' `experience` block): not repeated. */
  shown?: readonly string[];
  /** For tests: the experience base (default: experience.json). */
  entries?: readonly ExperienceEntry[];
  /** For tests: the monster DB's monsters (default: monster-db.json). */
  monsters?: Record<string, MonsterEntry>;
}

export interface JevExperience {
  potion: Record<string, JsonValue> | null;
  mechanics: Record<string, JsonValue> | null;
  /** The lesson ids of each block, in order. */
  ids: { potion: string[]; mechanics: string[] };
}

/**
 * Potion lessons, most relevant first. Outside a boss fight: the general potion lessons (keeping potions for the
 * boss), then the act boss's lessons that name a potion (the ones naming more potions per character first: the
 * boss's potion lesson before a damage lesson that names one in passing), then the lessons about the potions in the
 * belt. In the boss fight: the boss's, the belt's, then the general ones.
 */
export function potionLessons(input: JevExperienceInput, at: Board = board(input.state, input.knowledge ?? null)): ExperienceEntry[] {
  const entries = (input.entries ?? loadExperience()).filter((entry) => applies(entry, at.asc) && !(input.shown ?? []).includes(entry.id));
  const boss = actBossScopeId(input.state);
  const inBoss = input.kind === "boss";
  const isBoss = (entry: ExperienceEntry): boolean => {
    const [kind, id] = scopeParts(entry.scope);
    return kind === "boss" && !!boss && id === boss && potionMentions(entry.lesson) > 0;
  };
  const tier = (entry: ExperienceEntry): number | null => {
    const [kind, id] = scopeParts(entry.scope);
    if (entry.scope === "general:potion") return inBoss ? 2 : 0;
    if (isBoss(entry)) return inBoss ? 0 : 1;
    if (kind === "potion" && (at.potions.some((potion) => potion.id === id) || (!!entry.name && at.potions.some((potion) => potion.name === entry.name)))) return inBoss ? 1 : 2;
    return null;
  };
  const density = (entry: ExperienceEntry): number => (isBoss(entry) ? potionMentions(entry.lesson) / Math.max(1, entry.lesson.length) : 0);
  return withinBudget(rank(entries, tier, (a, b) => density(b) - density(a)), MAX_POTION_LESSONS, MAX_POTION_LESSON_CHARS);
}

/**
 * Mechanics lessons, most relevant first:
 *  0 a power:<ID> lesson for a power on the board, ours or an enemy's (the scope the learner can use for mechanism
 *    lessons; none yet);
 *  1 a card lesson for a Power card in our deck;
 *  2 a lesson naming an enemy's own power (its game name, or MECHANIC_ALIASES): a lesson about another monster the
 *    monster DB has seen with that power, a general or this act's lesson, or one about something we hold;
 *  3 a lesson naming one of our buffs, about something we hold, or a general one.
 * Debuffs are not mechanics here (Vulnerable we put on an enemy says nothing about it). A word inside a monster's
 * name does not count (仪式 in 仪式兽), nor a word in more than MECHANIC_WORD_MAX_SHARE of the lessons.
 */
export function mechanicLessons(input: JevExperienceInput, at: Board = board(input.state, input.knowledge ?? null), skip: readonly string[] = []): ExperienceEntry[] {
  const all = (input.entries ?? loadExperience()).filter((entry) => applies(entry, at.asc));
  const entries = all.filter((entry) => !(input.shown ?? []).includes(entry.id) && !skip.includes(entry.id));
  const monsters = input.monsters ?? monsterMoves();
  const monsterNames = Object.values(monsters)
    .map((monster) => monster.name?.zh ?? "")
    .filter((name) => name.length >= 2);
  /** The lesson with the monster names that contain `word` taken out. */
  const mentions = (lesson: string, word: string): boolean => monsterNames.filter((name) => name !== word && name.includes(word)).reduce((text, name) => text.split(name).join(""), lesson).includes(word);
  const distinctive = (word: string): boolean => word.length >= 2 && all.filter((entry) => entry.lesson.includes(word)).length <= all.length * MECHANIC_WORD_MAX_SHARE;
  const wordsOf = (power: BoardPower): string[] => [...new Set([power.name, ...(MECHANIC_ALIASES[power.id] ?? [])])].filter(distinctive);
  const theirs = at.theirs.filter((power) => !power.debuff);
  const ours = at.ours.filter((power) => !power.debuff);
  const onBoard = new Set([...at.ours, ...at.theirs].map((power) => power.id));
  const tier = (entry: ExperienceEntry): number | null => {
    const [kind, id] = scopeParts(entry.scope);
    if (kind === "power") return onBoard.has(id) ? 0 : null;
    if (kind === "card" && at.powerCards.has(id)) return 1;
    const held = holdsItem(kind, id, at);
    const general = kind === "general" || (kind === "act" && Number(id) === at.act);
    const monster = kind === "boss" || kind === "elite" || kind === "hallway";
    const named = (power: BoardPower) => wordsOf(power).some((word) => mentions(entry.lesson, word));
    if (theirs.some((power) => named(power) && (held || general || (monster && monsters[id]?.powers?.[power.id] !== undefined)))) return 2;
    if ((held || kind === "general") && ours.some(named)) return 3;
    return null;
  };
  return withinBudget(rank(entries, tier), MAX_MECHANIC_LESSONS, MAX_MECHANIC_LESSON_CHARS);
}

/** Both blocks for one plan-choice question (null blocks are left off the question). */
export function jevExperience(input: JevExperienceInput): JevExperience {
  const at = board(input.state, input.knowledge ?? null);
  const potion = potionLessons(input, at);
  const mechanics = mechanicLessons(input, at, potion.map((entry) => entry.id));
  const plan = planTexts(input.runPlan, input.briefPlan);
  const clauses = plan ? planPotionClauses(plan.texts, at.potions) : [];
  const inBoss = input.kind === "boss";
  const potionBlock: Record<string, JsonValue> = {
    note: inBoss ? POTION_NOTE_BOSS : POTION_NOTE_HALLWAY,
    ...(inBoss ? {} : { data: POTION_BOSS_DATA.map((data) => `[data: ${data.source}] ${data.text}`) }),
    ...(clauses.length > 0 ? { run_plan_on_potions: `DeepSeek's run plan${plan?.floor != null ? ` (F${plan.floor})` : ""}, its words on potions: ${clauses.join(" | ")}` } : {}),
    ...(potion.length > 0 ? { lessons: potion.map((entry) => jevLessonLine(entry, at.asc)) } : {}),
  };
  return {
    // A boss fight with nothing to say about potions gets no block (the note alone adds nothing).
    potion: inBoss && clauses.length === 0 && potion.length === 0 ? null : potionBlock,
    mechanics: mechanics.length > 0 ? { note: MECHANICS_NOTE, lessons: mechanics.map((entry) => jevLessonLine(entry, at.asc)) } : null,
    ids: { potion: potion.map((entry) => entry.id), mechanics: mechanics.map((entry) => entry.id) },
  };
}
