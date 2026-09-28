/**
 * Fight plan (FIGHT_PLAN=v1): DeepSeek is asked once at the start of a fight for its strategy and
 * tempo, as guidance: the objective (kill_fast / preserve_hp / scale_then_kill / race), the order
 * enemies die in (kill_priority), potion timing in words (potion_plan, and a word per potion), the
 * threat. It names no card play per turn. Jev plays every turn seeing it next to code's exact facts of
 * each line (intent.ts combatFit / reserveFact); nothing in the plan is enforced.
 *
 * History: the old plan's potion timings were code orders (early/big_hit auto-drinks, EJXC F28, WB02
 * F29), then the vocabulary-only plan dropped potion timing altogether while the run plan's reserve
 * hard-filtered potions (A8: 15/44 deaths holding potions). Potion timing is back as words Jev weighs.
 * Old logged plans are still read (normalizeFightPlan).
 */

import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readSync, statSync } from "node:fs";
import { dirname } from "node:path";

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { deckEntries, describeRunRelicEffects } from "../project/deck.js";
import { dossierFor, dossierJson } from "../knowledge/dossiers.js";
import { fillPotionText } from "../knowledge/potion-values.js";
import { awakeDamagePerTurn, moveModel } from "../knowledge/move-model.js";
import { bossNote } from "../project/run-journal.js";
import { bossClockJson, deckBlockPerTurn, deckDamagePerTurn } from "./boss-clock.js";
import { FIGHT_OBJECTIVES, INTENT_REASONS, isOneOf, MEANING, parseReasons, REASON_MEANING, type FightObjective, type IntentReason } from "./intent.js";
import { DISAGREE, objectiveOfApproach, validateFightPlan } from "./plan-validator.js";
import type { RunPlan } from "./run-plan.js";
import { asArray, asRecord, bool, num, numOrNull, str, stripMarkup, truncate, type JsonValue } from "../util/json.js";

/** Potions that add damage or energy (the combat veto treats drinking them as offence). */
export const OFFENSIVE_POTIONS = new Set([
  "FIRE_POTION", "EXPLOSIVE_AMPOULE", "STRENGTH_POTION", "FLEX_POTION", "VULNERABLE_POTION", "FEAR_POTION",
  "ATTACK_POTION", "POWDERED_DEMISE", "GIGANTIFICATION_POTION", "DUPLICATOR", "ENERGY_POTION", "POTION_SHAPED_ROCK",
]);

export interface FightPlan {
  runId: string;
  /** act:floor, the same key the HP guard uses. */
  fight: string;
  kind: string;
  enemyIds: string[];
  objective: FightObjective;
  /** Why DeepSeek chose the objective (intent.ts INTENT_REASONS): picks the translation (damageFirst). */
  reasons?: IntentReason[];
  /** enemy_id order to kill in; the first living one is the solver's focus. */
  killPriority: string[];
  /** DeepSeek's words on the danger (context for Jev only). */
  threat: string;
  /** DeepSeek's potion timing for this fight in words (guidance for Jev). */
  potionPlan?: string;
  /** DeepSeek's word per potion id ("hold for the burst turn", "drink if HP < 50%"), guidance for Jev. */
  potions?: Record<string, string>;
  summary: string;
  /** How many times this fight was re-planned (a new boss/elite enemy appeared). */
  replans: number;
  /** Validator repairs of this plan, one reason each. */
  validator: string[];
  /** Judgment calls where code's estimate differs from DeepSeek's intent: kept, logged (not repaired). */
  disagreements?: string[];
  /** The run plan version in force when it was made. */
  runPlanVersion?: number;
}

/** Enemy ids of the living enemies. */
export function livingEnemyIds(state: GameState): string[] {
  return asArray(asRecord(state.raw["combat"])["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .map((enemy) => str(enemy["enemy_id"]))
    .filter(Boolean);
}

export function fightKey(state: GameState): string {
  return `${str(asRecord(state.run?.raw)["act_id"])}:${state.run?.floor ?? "?"}`;
}

/** Move-model summary of one enemy: each move's average hit and what usually follows it. */
function moveSummary(model: Record<string, { next: Record<string, Record<string, number>>; damage: Record<string, number>; buffs?: string[] }>, enemyId: string): string | null {
  const entry = model[enemyId];
  if (!entry) return null;
  const parts = Object.entries(entry.damage).map(([move, damage]) => {
    const next = Object.entries(entry.next[move] ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    const buff = entry.buffs?.includes(move) ? " buff" : "";
    return `${move.replace(/_MOVE$/, "")} ${Math.round(damage)}${buff}${next ? ` -> ${next.replace(/_MOVE$/, "")}` : ""}`;
  });
  return parts.length > 0 ? truncate(parts.join("; "), 240) : null;
}

/**
 * What DeepSeek is shown for the plan: the whole deck (what it can scale with or race with), the
 * relics' own text, the potions by id, and each enemy with its current intent, powers and move cycle.
 */
export function fightPlanInput(
  state: GameState,
  knowledge: Knowledge,
  kind: string,
  moveModel: Record<string, { next: Record<string, Record<string, number>>; damage: Record<string, number>; buffs?: string[] }>,
): Record<string, JsonValue> {
  const deck = new Map<string, { line: string; count: number }>();
  for (const card of deckEntries(state, knowledge)) {
    const key = `${card.card_id}${card.upgraded ? "+" : ""}`;
    const seen = deck.get(key);
    if (seen) seen.count += 1;
    else deck.set(key, { line: `${card.card_id}${card.upgraded ? "+" : ""} ${card.name} (${card.type}, ${card.cost ?? "?"} energy): ${card.description}`, count: 1 });
  }
  const raw = asRecord(state.run?.raw);
  const hp = state.run?.current_hp ?? null;
  const maxHp = state.run?.max_hp ?? null;
  const actRaw = str(raw["act_id"]);
  const enemies = asArray(asRecord(state.raw["combat"])["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .map((enemy) => {
      const id = str(enemy["enemy_id"]);
      const info = knowledge.monster(id);
      const intents = asArray(enemy["intents"])
        .map(asRecord)
        .map((intent) => `${str(intent["intent_type"])} ${str(intent["label"])}`.trim())
        .join(", ");
      // With the game's own text (HCBJ F14: SUCK_POWER 3 went as an id only and the plan read "effect is
      // unknown"; it is +1 Strength per unblocked hit).
      const powers = asArray(enemy["powers"])
        .map(asRecord)
        .map((power) => {
          const id = str(power["power_id"]);
          const text = stripMarkup(str(power["description"]) || knowledge.power(id)?.description || "");
          return `${id}${numOrNull(power["amount"]) === null ? "" : ` ${numOrNull(power["amount"])}`}${text ? `: ${truncate(text, 140)}` : ""}`;
        });
      const out: Record<string, JsonValue> = {
        enemy_id: id,
        name: str(enemy["name"], info?.name ?? id),
        type: info?.type ?? "",
        hp: `${num(enemy["current_hp"])}/${num(enemy["max_hp"])}`,
        intent_now: intents || "unknown",
        powers,
      };
      const moves = moveSummary(moveModel, id);
      if (moves) out["moves_seen"] = moves;
      const note = info?.type === "Boss" ? bossNote(id) : null;
      if (note) out["boss_note"] = note;
      // The enemy's dossier from past runs (danger turns, how wins went, what to keep for it).
      const dossier = dossierFor(id);
      if (dossier) out["dossier"] = dossierJson(dossier, state.run?.ascension ?? 0);
      return out;
    });
  const potions = asArray(raw["potions"])
    .map(asRecord)
    .filter((potion) => bool(potion["occupied"]))
    .map((potion) => {
      const id = str(potion["potion_id"]);
      return `${id} ${str(potion["name"], knowledge.potion(id)?.name ?? id)}: ${truncate(fillPotionText(id, str(potion["description"]) || knowledge.potion(id)?.description || ""), 100)}`;
    });
  return {
    fight: kind,
    act: /^\d+$/.test(actRaw) ? Number(actRaw) + 1 : actRaw,
    floor: state.run?.floor ?? null,
    ascension: state.run?.ascension ?? 0,
    hp: `${hp ?? "?"}/${maxHp ?? "?"}`,
    deck: [...deck.values()].map((entry) => (entry.count > 1 ? `${entry.count}x ${entry.line}` : entry.line)),
    relics: describeRunRelicEffects(state, knowledge, 20),
    potions,
    enemies,
    // The act boss's clock at the HP we have now: the turns it lasts and the damage a turn that needs
    // (the run plan sees the same clock at the entry HP).
    ...(kind === "boss" && hp !== null ? { boss_clock: bossClockJson(state, knowledge, hp) } : {}),
  };
}

export const FIGHT_PLAN_TASK = [
  "TASK: fight plan (not an option choice; ignore the {choice, reason} reply format for this one).",
  "A fight is starting. Every turn code simulates each line exactly and a small model (Jev) chooses the line, the target and",
  "any potion, seeing your plan next to those facts. Give the STRATEGY and TEMPO for the whole fight as guidance: the",
  "objective, the kill order, and potion timing in words (which potion to hold for which turn or threat, when to spend it,",
  "e.g. 'hold Flex for the turn after the Cultist buffs; drink the Block Potion if a hit would take 40% HP'). Do not name exact",
  "card plays per turn. Nothing is enforced: Jev follows your tempo unless the facts of a turn clearly say otherwise.",
  "Only the card, relic and potion text you are shown is true: do not assume an effect that is not written there.",
  "run_plan holds the run's strategy, including the potions it wants held for the act boss: say if this fight is worth one.",
  "In a boss fight, boss_clock is code's clock at the HP we have now: survivable_turns (how long that HP lasts against the",
  "boss's average hits less the deck's block) and the damage a turn that needs against the deck's estimate.",
  'Reply with JSON only: {"objective": "kill_fast" | "preserve_hp" | "scale_then_kill" | "race",',
  '"kill_priority": [enemy ids in the order to kill them; [] when it does not matter],',
  `"reason": [1-2 of ${INTENT_REASONS.join("|")}: why this objective],`,
  '"potion_plan": "<max 40 words: potion timing for this fight>",',
  '"potions": {"<potion id from potions>": "<max 15 words: hold / when to drink it, in words code can check: \'drink turn 1\', \'hold for T3/T7\', \'drink if HP <35%\', \'drink now\'>"},',
  '"threat": "<max 30 words: what is dangerous in this fight>",',
  '"summary": "<max 40 words: the strategy in plain words; actions code can check on every line are shown to Jev as matched or not: \'fully block the Rock\'s Headbutt to stun it\', \'block the Beam turn\', the kill priority>"}',
  "What each objective means to Jev:",
  `kill_fast = ${MEANING.objective.kill_fast}; preserve_hp = ${MEANING.objective.preserve_hp};`,
  `scale_then_kill = ${MEANING.objective.scale_then_kill}; race = ${MEANING.objective.race}.`,
  "What each reason means: " + INTENT_REASONS.map((reason) => `${reason} = ${REASON_MEANING[reason]}`).join("; ") + ".",
  "Code checks ids and format only; where its estimate differs (e.g. a preserve_hp grind longer than our HP lasts) it logs the",
  "disagreement and shows it to Jev as a fact. In kill_priority, minions (MINION_POWER: they leave when the last non-minion",
  "dies) are moved behind the last non-minion.",
].join(" ");

/**
 * The first living kill-priority enemy; a minion only once no non-minion lives (a plan logged before
 * the validator moved minions last, G8F1 F17).
 */
export function fightFocus(plan: FightPlan | null, state: GameState): string | null {
  if (!plan) return null;
  const enemies = asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const living = enemies.map((enemy) => str(enemy["enemy_id"]));
  const minionIds = new Set(enemies.filter(isMinion).map((enemy) => str(enemy["enemy_id"])));
  const leaderAlive = enemies.some((enemy) => !isMinion(enemy));
  return plan.killPriority.find((id) => living.includes(id) && !(leaderAlive && minionIds.has(id))) ?? null;
}

/**
 * DeepSeek's answer as a validated plan: enemy ids and names checked against the board, the objective
 * against the vocabulary, the board and the run plan (plan-validator.ts). Old-format replies
 * (approach, focus_enemy) are read as objective and kill priority; their card and potion orders are
 * dropped with a reason.
 */
export function parseFightPlan(
  json: Record<string, unknown>,
  state: GameState,
  knowledge: Knowledge,
  base: { runId: string; fight: string; kind: string; replans: number },
  run: RunPlan | null = null,
): FightPlan {
  const notes: string[] = [];
  const enemies = asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const toEnemyId = (value: unknown): string | null => {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return null;
    const enemy = enemies.find((entry) => str(entry["enemy_id"]) === text || str(entry["name"]) === text || str(entry["enemy_id"]) === text.toUpperCase());
    return enemy ? str(enemy["enemy_id"]) : text;
  };
  const priorityRaw = Array.isArray(json["kill_priority"]) ? json["kill_priority"] : typeof json["focus_enemy"] === "string" && json["focus_enemy"] ? [json["focus_enemy"]] : [];
  const killPriority = [...new Set(priorityRaw.map(toEnemyId).filter((id): id is string => id !== null))];
  const { reasons, dropped } = parseReasons(json["reason"] ?? json["reasons"]);
  if (dropped.length > 0) notes.push(`reason: dropped unknown ${dropped.map((entry) => JSON.stringify(entry)).join(", ")}`);
  const objectiveRaw = typeof json["objective"] === "string" ? json["objective"].trim().toLowerCase() : null;
  const hp = state.run?.current_hp ?? num(asRecord(asRecord(state.raw["combat"])["player"])["current_hp"]);
  const maxHp = state.run?.max_hp ?? num(asRecord(asRecord(state.raw["combat"])["player"])["max_hp"]);
  const hpPct = maxHp > 0 ? hp / maxHp : 1;
  let objective: FightObjective;
  if (isOneOf(FIGHT_OBJECTIVES, objectiveRaw)) objective = objectiveRaw;
  else {
    const legacy = objectiveOfApproach(typeof json["approach"] === "string" ? json["approach"].trim().toLowerCase() : null);
    objective = legacy ?? (hpPct < 0.5 ? "preserve_hp" : "kill_fast");
    notes.push(objectiveRaw ? `objective ${JSON.stringify(objectiveRaw)} unknown → ${objective}` : legacy ? `old-format approach ${String(json["approach"])} read as ${objective}` : `no objective → ${objective}`);
  }
  const plan: FightPlan = {
    ...base,
    enemyIds: livingEnemyIds(state),
    objective,
    reasons,
    killPriority,
    threat: typeof json["threat"] === "string" ? truncate(json["threat"], 200) : typeof json["key_turns"] === "string" ? truncate(json["key_turns"], 200) : "",
    summary: typeof json["summary"] === "string" ? truncate(json["summary"], 240) : "",
    ...(typeof json["potion_plan"] === "string" && json["potion_plan"].trim() ? { potionPlan: truncate(json["potion_plan"].trim(), 240) } : {}),
    ...(potionNotes(json["potions"], state) ? { potions: potionNotes(json["potions"], state)! } : {}),
    validator: [],
    disagreements: [],
    ...(run ? { runPlanVersion: run.version } : {}),
  };
  const combat = asRecord(state.raw["combat"]);
  const block = num(asRecord(combat["player"])["block"]);
  const incoming = Math.max(0, enemies.reduce((sum, enemy) => sum + asArray(enemy["intents"]).map(asRecord).reduce((total, intent) => total + num(intent["damage"]) * Math.max(1, num(intent["hits"])), 0), 0) - block);
  const enemyHp = enemies.filter((enemy) => !asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "MINION_POWER")).reduce((sum, enemy) => sum + num(enemy["current_hp"]), 0);
  const perTurn = deckDamagePerTurn(state, knowledge);
  const belt = asArray(asRecord(state.run?.raw)["potions"]).map(asRecord).filter((potion) => bool(potion["occupied"]));
  const checked = validateFightPlan(plan, json, run, {
      hpPct,
      hp,
      incoming,
      turnsToKill: perTurn > 0 ? Math.ceil(enemyHp / perTurn) : null,
      enemyIds: enemies.map((enemy) => str(enemy["enemy_id"])),
      // No kill-first target among enemies that must die together (Decimillipede segments reattach,
      // Kaiser Crab claws enrage): 4VC5 F24, GGF8 F33.
      together: enemies.filter(mustDieTogether).map((enemy) => str(enemy["enemy_id"])),
      minions: enemies.filter(isMinion).map((enemy) => str(enemy["enemy_id"])),
      potions: belt.map((potion) => ({ id: str(potion["potion_id"]), text: fillPotionText(str(potion["potion_id"]), str(potion["description"]) || knowledge.potion(str(potion["potion_id"]))?.description || "") })),
      kind: base.kind,
      scaling: enemies.map((enemy) => enemyScales(enemy)).filter((why): why is string => why !== null),
      cycleScaling: enemies.map((enemy) => cycleGrowth(str(enemy["enemy_id"]))).filter((why): why is string => why !== null),
      lossPerTurn: expectedLossPerTurn(state, knowledge),
    });
  notes.push(...checked.filter((note) => !note.startsWith(DISAGREE)));
  plan.validator = notes;
  plan.disagreements = checked.filter((note) => note.startsWith(DISAGREE));
  return plan;
}

/**
 * DeepSeek's word per potion, for the potions in the belt (ids or names); unknown ones dropped. The old
 * timing vocabulary (early / big_hit / save / emergency) is kept as words.
 */
function potionNotes(raw: unknown, state: GameState): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const belt = asArray(asRecord(state.run?.raw)["potions"]).map(asRecord).filter((potion) => bool(potion["occupied"]));
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "string" || !value.trim()) continue;
    const text = key.trim();
    const potion = belt.find((entry) => str(entry["potion_id"]) === text || str(entry["potion_id"]) === text.toUpperCase() || str(entry["name"]) === text);
    if (potion) out[str(potion["potion_id"])] = truncate(value.trim(), 100);
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * HP expected lost a turn in this fight: each living enemy's average hit once awake (move model, else
 * its hit now) less the deck's block a turn (boss-clock deckBlockPerTurn), at least 0.
 */
export function expectedLossPerTurn(state: GameState, knowledge: Knowledge): number {
  const enemies = asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const hits = enemies.reduce((sum, enemy) => {
    const model = awakeDamagePerTurn(str(enemy["enemy_id"]));
    const now = asArray(enemy["intents"]).map(asRecord).reduce((total, intent) => total + num(intent["damage"]) * Math.max(1, num(intent["hits"])), 0);
    return sum + (model ? model.perTurn : now);
  }, 0);
  return Math.max(0, Math.round((hits - deckBlockPerTurn(state, knowledge)) * 10) / 10);
}

/** A logged plan in the current shape (plans written before the intent vocabulary included). */
export function normalizeFightPlan(raw: FightPlan | Record<string, unknown>): FightPlan {
  const plan = raw as Partial<FightPlan> & Record<string, unknown>;
  const focus = typeof plan["focus"] === "string" && plan["focus"] ? [plan["focus"]] : [];
  return {
    runId: String(plan.runId ?? ""),
    fight: String(plan.fight ?? ""),
    kind: String(plan.kind ?? ""),
    enemyIds: asArray(plan.enemyIds as JsonValue).map(String),
    objective: isOneOf(FIGHT_OBJECTIVES, plan.objective) ? plan.objective : objectiveOfApproach(plan["approach"]) ?? "kill_fast",
    ...(Array.isArray(plan.reasons) && plan.reasons.length > 0 ? { reasons: plan.reasons.filter((reason): reason is IntentReason => isOneOf(INTENT_REASONS, reason)) } : {}),
    killPriority: Array.isArray(plan.killPriority) ? plan.killPriority.map(String) : focus,
    threat: String(plan.threat ?? plan["keyTurns"] ?? ""),
    summary: String(plan.summary ?? ""),
    ...(typeof plan.potionPlan === "string" && plan.potionPlan ? { potionPlan: plan.potionPlan } : {}),
    ...(plan.potions && typeof plan.potions === "object" && !Array.isArray(plan.potions) ? { potions: plan.potions } : {}),
    replans: Number(plan.replans ?? 0),
    validator: Array.isArray(plan.validator) ? plan.validator : [],
    ...(Array.isArray(plan.disagreements) && plan.disagreements.length > 0 ? { disagreements: plan.disagreements } : {}),
    ...(typeof plan.runPlanVersion === "number" ? { runPlanVersion: plan.runPlanVersion } : {}),
  };
}

/**
 * A boss- or elite-type enemy not in the plan (a phase, a summoned elite): worth one re-plan. Minions
 * and normal monsters joining the fight are not.
 */
export function needsReplan(plan: FightPlan, state: GameState, knowledge: Knowledge): boolean {
  if (plan.replans >= 1) return false;
  return livingEnemyIds(state).some((id) => {
    if (plan.enemyIds.includes(id)) return false;
    const type = knowledge.monster(id)?.type ?? "";
    return type === "Boss" || type === "Elite";
  });
}

/** What Jev, the logs and a re-plan see of the plan. */
export function fightPlanJson(plan: FightPlan): Record<string, JsonValue> {
  return {
    objective: plan.objective,
    reason: plan.reasons ?? [],
    kill_priority: plan.killPriority,
    threat: plan.threat,
    summary: plan.summary,
    ...(plan.potionPlan ? { potion_plan: plan.potionPlan } : {}),
    ...(plan.potions ? { potions: plan.potions } : {}),
  };
}

/** Appends one plan (or a failed attempt) to the fight-plan log. Never throws. */
export function logFightPlan(file: string, entry: Record<string, JsonValue>): void {
  if (!file) return;
  try {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`, "utf8");
  } catch {
    // logging must never break play
  }
}

/** The last logged plan for this run and fight (a restart mid-fight keeps its plan), else null. */
export function loadFightPlan(file: string, runId: string, fight: string): FightPlan | null {
  if (!file || !existsSync(file)) return null;
  try {
    const size = statSync(file).size;
    const length = Math.min(size, 256 * 1024);
    const buffer = Buffer.alloc(length);
    const fd = openSync(file, "r");
    try {
      readSync(fd, buffer, 0, length, size - length);
    } finally {
      closeSync(fd);
    }
    const lines = buffer.toString("utf8").split("\n").reverse();
    for (const line of lines) {
      if (!line.includes(runId) || !line.includes(`"${fight}"`)) continue;
      try {
        const entry = JSON.parse(line) as { plan?: FightPlan };
        if (entry.plan && entry.plan.runId === runId && entry.plan.fight === fight) return normalizeFightPlan(entry.plan);
      } catch {
        // a torn first line
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** An enemy that must die in the same turn as its partners (a lone kill brings it back or enrages the rest). */
function isMinion(enemy: Record<string, unknown>): boolean {
  return asArray(enemy["powers"] as JsonValue).some((power) => str(asRecord(power)["power_id"]) === "MINION_POWER");
}

function mustDieTogether(enemy: Record<string, unknown>): boolean {
  return asArray(enemy["powers"] as JsonValue).some((power) => /REATTACH_POWER|CRAB_RAGE_POWER/.test(str(asRecord(power)["power_id"])));
}

/**
 * Why an enemy grows over its move cycle (the move model: a move seen with a Buff intent, THRASH's
 * Vigor, the Waterfall Giant's Steam Eruption stacking), or null. For the validator's "no growth"
 * check only: Z7D7 F8 Terror Eel (Vigor 6 every other turn) and F17 Waterfall Giant (+3 Steam a turn)
 * were logged as "code sees no growth" from their T1 boards.
 */
export function cycleGrowth(enemyId: string): string | null {
  const buffs = moveModel()[enemyId]?.buffs ?? [];
  return buffs.length > 0 ? `${enemyId} buff move${buffs.length > 1 ? "s" : ""} ${buffs.map((move) => move.replace(/_MOVE$/, "")).join("/")} in its cycle` : null;
}

/** Powers that make an enemy grow every turn it lives (Strength per turn or per hit, per death, per Skill). */
export const SCALING_POWERS = ["RITUAL_POWER", "SUCK_POWER", "RAVENOUS_POWER", "TERRITORIAL_POWER", "ENRAGE_POWER", "ANGER_POWER", "GROWTH_POWER", "VITAL_SPARK_POWER"];

/**
 * Why an enemy scales, from the board, or null: a growth power, Strength already gained, or a Buff
 * intent now (5JU3 F9: Fossil Stalker's SUCK_POWER, no buff move in the
 * model; NX48 F35 Devoted Sculptor RITUAL_POWER 9).
 */
export function enemyScales(enemy: Record<string, unknown>): string | null {
  const id = str(enemy["enemy_id"]);
  if (id === "WATERFALL_GIANT" || id === "QUEEN") return null;
  const powers = asArray(enemy["powers"] as JsonValue).map(asRecord);
  const growth = powers.find((power) => SCALING_POWERS.includes(str(power["power_id"])));
  if (growth) return `${id} ${str(growth["power_id"])}`;
  const strength = powers.find((power) => str(power["power_id"]) === "STRENGTH_POWER" && num(power["amount"]) > 0);
  if (strength) return `${id} Strength ${num(strength["amount"])}`;
  // This turn's Buff intent only: a Buff move anywhere in the cycle is 56 of 101 enemies, most not Strength.
  if (asArray(enemy["intents"] as JsonValue).some((intent) => str(asRecord(intent)["intent_type"]) === "Buff")) return `${id} buffs this turn`;
  return null;
}
