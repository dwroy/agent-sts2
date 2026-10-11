import { accessSync, constants as fsConstants, readFileSync, statSync } from "node:fs";
import { delimiter, dirname, isAbsolute, join } from "node:path";

import type { Effort, EngineName } from "../brain/types.js";
import { fromRoot } from "./paths.js";
import { characterKey, DEFAULT_CHARACTER, KNOWLEDGE_DIR, knowledgeFile } from "../knowledge/files.js";
/**
 * Configuration: environment variables overridden by CLI flags (PLAN.md §9).
 *
 * Nothing here throws for a missing API key: the key is only required by the commands that
 * actually talk to Jev, so `doctor --no-jev` works on a game-only checkout.
 */

export type Mode = "shadow" | "play" | "record" | "replay";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type RunStart = "auto" | "continue" | "new";
export type JevContextVersion = "off" | "v1";

export interface Sts2Config {
  baseUrl: string;
  portScan: { from: number; to: number };
  timeoutMs: number;
}

export interface JevConfig {
  apiKey: string | null;
  baseUrl: string | null;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface EnricherConfig {
  enabled: boolean;
  baseUrl: string | null;
  apiKey: string | null;
  model: string | null;
  tasks: string[];
}

/** SL (docs/sl.md, src/sl/controller.ts). */
export interface SlConfig {
  /** SL_ENABLED (default on: Dai 2026-10-02, "SL is a switch, on by default"; off: no SL at all). */
  enabled: boolean;
  /** SL_BOSS_RETRIES (default 5, Dai 2026-10-02): a boss fight gets at most 1 + this many attempts. */
  bossRetries: number;
  /** SL_ELITE_RETRIES (default 3, Dai 2026-10-02): the same for the hard fights listed in knowledge/characters/ironclad/sl-elites.json (any room, not only elites), and for SL_ACT3_LOW_HP's fights. */
  eliteRetries: number;
  /**
   * SL_ACT3_LOW_HP (default on, Dai 2026-10-03, option B after the V4.4 A9 window: 7 of the 11 runs that reached act 3 died
   * in its hallways, ? rooms and elites, entering at 13-49 HP): an act-3 fight with no boss, entered with HP strictly below
   * SL_ACT3_LOW_HP_PCT percent of max HP, gets SL like a listed hard fight (SL_ELITE_RETRIES, certain death only, every
   * other SL switch as there). The entry HP is the fight's first state's (docs/sl.md §3). Off: as before.
   */
  act3LowHp: boolean;
  /** SL_ACT3_LOW_HP_PCT (default 50, Dai 2026-10-03: 40 first, then 50): SL_ACT3_LOW_HP's line, percent of max HP at the fight's entry (strictly below; 0..100). */
  act3LowHpPct: number;
  /**
   * SL_ACT2_LOW_HP (default on, Dai 2026-10-04 after the V4.5 A9 window: PEGLM9PFY97U entered an act-2 hallway at 12/80
   * and died untracked): the same rule as SL_ACT3_LOW_HP for an act-2 fight with no boss. Absent (older configs, tests): off.
   */
  act2LowHp?: boolean;
  /** SL_ACT2_LOW_HP_PCT (default 50, as act 3): SL_ACT2_LOW_HP's line, percent of max HP at the fight's entry (strictly below). */
  act2LowHpPct?: number;
  /** SL_RETRY_SHOW_SIM (default on): a retried boss fight's questions show the whole-fight simulation even for a low-trust boss, labelled. */
  retryShowSim: boolean;
  /**
   * SL_RETRY_MEMO (default on, 2026-10-04): a retried fight's rollouts and B2 runs on an input an earlier attempt computed
   * come back from the fight's memo (src/sim/compute-memo.ts, docs/sl.md §10.6): the same numbers, no time. false: every
   * question computes as before. Absent: on.
   */
  retryMemo?: boolean;
  /**
   * SL_RETRY_KNOWN_DRAWS (default on, Dai 2026-10-02): on a retry the draw pile's next cards are the order an earlier
   * attempt saw (the solver, the rollout, the random potions and B2 take them first; Jev is told), until this attempt's
   * draws leave that order (a reshuffle, a card put into the pile, a different card drawn). docs/sl.md §10.
   */
  retryKnownDraws: boolean;
  /** SL_RETRY_COMPUTE (default on, Dai 2026-10-02): attempts after the first get more rollout samples and time (docs/sl.md §10). */
  retryCompute: boolean;
  /**
   * SL_JUDGE_KNOWN_DRAWS (default on, Dai 2026-10-02): the certain-death judge's least-loss tier is not vetoed by a playable
   * card that draws when every draw the planner's lines could make is exactly known from an earlier attempt (docs/sl.md §2.1).
   */
  judgeKnownDraws: boolean;
  /**
   * SL_JUDGE_ANY_DRAW (default on, Dai 2026-10-03): the least-loss tier's draw veto is lifted when the death holds for every
   * draw the turn could make: a drawing card whose own HP cost kills before it draws, or every line dying with the whole
   * draw pile in the hand (the superset board, docs/sl.md §2.3). Off: the veto as before.
   */
  judgeAnyDraw: boolean;
  /**
   * SL_RELOAD_EARLY (default on, Dai 2026-10-02: "知道必死了就sl", a certain death and never a prediction): the fight is
   * reloaded at the planner's least-loss verdict, before its line is played card by card, when the judge is certain on that
   * board and nothing this turn is left to chance or to what the planner does not model (docs/sl.md §2.2); otherwise at
   * end_turn as before.
   */
  reloadEarly: boolean;
  /**
   * SL_RELOAD_ON_REVIVE (default off; Dai 2026-10-03, still deciding): a turn end where only a revive held (Fairy in a Bottle,
   * Lizard Tail) would save us is judged as without it, so the fight reloads instead of burning the revive. Off: the judge
   * plays the revives out (docs/sl.md §2.7) and reloads only when they cannot stop the death.
   */
  reloadOnRevive?: boolean;
  /**
   * SL_RETRY_KNOWN_INSERTS (default on, Dai 2026-10-02): cards added to the draw pile at random places (a status,
   * Metamorphosis) keep the known draw order; the samples put them at random places among the known cards (docs/sl.md §10).
   * Planning only: the certain-death judge never uses an order resting on it.
   */
  retryKnownInserts: boolean;
  /**
   * SL_RETRY_KNOWN_TOP (default on, 2026-10-02; with SL_RETRY_KNOWN_INSERTS): a card moved onto the draw pile (Headbutt,
   * Thinking Ahead) goes on top and is the next one drawn: the known order goes on through it, exactly (docs/sl.md §10).
   */
  retryKnownTop: boolean;
  /**
   * SL_RETRY_EXPLORE (default on, Dai 2026-10-02: "retries must try different play"): attempts 3 and later change the line
   * at one decision point a failed attempt played (the latest first, then one further back each attempt) to the best line
   * no failed attempt played there; every other board plays as usual (src/sl/explore.ts, docs/sl.md §11). Off: as before.
   */
  retryExplore: boolean;
  /**
   * SL_RETRY_EXPLORE_B2 (default on, Dai 2026-10-02; with SL_RETRY_EXPLORE): on a boss B2 is trusted on, B2's win rate gates
   * the replacement ("not worse": within 2 paired standard errors of the line replaced, B2's tie rule) instead of the
   * rollout's share of samples dead; low-trust bosses and the listed elites keep the rollout's (docs/sl.md §11.3). Off: as before.
   */
  retryExploreB2: boolean;
  /**
   * SL_RETRY_EXPLORE_BOSS_POTIONS (default on, Dai 2026-10-02; with SL_RETRY_EXPLORE): in a boss fight (potions cost 0
   * there, and the line replaced is known to lose) the replacement may drink a potion the line it replaces does not: the
   * shown potion lines and the random potions' Monte Carlo lines are untried lines like the dry ones. A listed elite keeps
   * "no added drink" (docs/sl.md §11.3). Off: as before.
   */
  retryExploreBossPotions: boolean;
  /**
   * SL_RETRY_EXPLORE_ORDER (default on, 2026-10-03, R1QJUBVBSSB2 F33; with SL_RETRY_EXPLORE): the deviation points where
   * every line loses in every sample (the rollout's share dead 1; B2's share won 0 on a boss it is trusted on) come after
   * every other point; among the rest, the latest first, the least deviated first, as before (docs/sl.md §11.2). Off: as before.
   */
  retryExploreOrder: boolean;
  /**
   * SL_RETRY_EXPLORE_REPLAY (default on, 2026-10-03, R1QJUBVBSSB2 F33; with SL_RETRY_EXPLORE): before the deviation point
   * the attempt plays the reference attempt's line on each of its boards, instead of the answer (never instead of a winning
   * line, nor where that line dies this turn and the answer does not), so that it reaches the point; a board off the path
   * stops it (docs/sl.md §11.2). Off: as before.
   */
  retryExploreReplay: boolean;
  /**
   * SL_RETRY_EXPLORE_REPLAY_PLAYS (default on, 2026-10-03, J4S28FRQKD7G F33 attempts 3, 4 and 6; with SL_RETRY_EXPLORE_REPLAY):
   * on a board of the reference path whose line is not among the options (a later attempt knows more draws, so the lines read
   * otherwise), the reference attempt's logged plays from that board are played as a line when they are legal there, so that
   * the replay goes on to the deviation point (docs/sl.md §11.2). Off: the replay stops there, as before.
   */
  retryExploreReplayPlays: boolean;
  /**
   * SL_RETRY_EXPLORE_REPLAY_DEVIATE (default on, 2026-10-03, J4S28FRQKD7G F33 attempt 6 played attempt 4's fight again; with
   * SL_RETRY_EXPLORE_REPLAY): when the replay cannot go on before the deviation point, the attempt deviates where it is, on the
   * first board a failed attempt decided on (a question with a line none of them played there), instead of playing on as
   * usual into a failed attempt's fight; not a use of the target's point (docs/sl.md §11.2). Off: played as usual, as before.
   */
  retryExploreReplayDeviate: boolean;
  /**
   * SL_RETRY_EXPLORE_KEY_COUNTERS (default on, 2026-10-04, 7TQFLQBKRE4S F33 attempt 3; with SL_RETRY_EXPLORE): in the board
   * key (slBoardKey), a relic counter that goes back to 0 at its count (Happy Flower's 3, Kunai's 3, Nunchaku's 10, ...) and
   * shows the count reads 0: the frame came before the counter's reset was shown, the relic's effect already in the board
   * (the replay stopped at T4, "not on attempt 2's path", on Happy Flower 3 against 0). Off: the key as before.
   */
  retryExploreKeyCounters: boolean;
  /**
   * SL_RETRY_EXPLORE_SECOND (default on, 2026-10-04, 7TQFLQBKRE4S F39; with SL_RETRY_EXPLORE_CANON): attempt 2 plays as a
   * known-draws replan, but where it is still on attempt 1's path (the same board) from the turn attempt 1 lost the most HP
   * (whereWeights) to its last turn, the first question there deviates: a line attempt 1's turn there did not have. The logs:
   * every attempt 2 still on attempt 1's path at that turn (past T1) repeated attempt 1's whole fight (4 of 4), and the 4
   * attempt-2 wins had left the path before it (docs/sl.md §11.12). Off: attempt 2 as before.
   */
  retryExploreSecond: boolean;
  /**
   * SL_RETRY_EXPLORE_REPLAY_ORDER (default on, 2026-10-04, ABCJ0TZ6MD06 F48 attempt 4 T4; with SL_RETRY_EXPLORE_REPLAY_PLAYS):
   * on a board of the reference path where a line is the reference's only by its turn's plays (another text) and plays them
   * in another order than the reference did, the reference's logged plays are played in their order instead (when legal
   * there): the order changes the board (Iron Wave before Defend+ and Strike left the boss at 376, after them at 372 with Pen
   * Nib at 0 not 9; T5's board then was not attempt 2's and the replay stopped). Off: such a line is the reference's, as before.
   */
  retryExploreReplayOrder: boolean;
  /**
   * SL_RETRY_EXPLORE_REPLAY_CODE (default on, 2026-10-04, with SL_RETRY_EXPLORE_REPLAY_PLAYS): on a board of the reference path
   * where code plays its own line (only line, only distinct line, a dominating line, the HP guard's) and that line is not the
   * reference's line there, the reference's logged plays from there are played instead (when legal there; never instead of a
   * winning line, nor dying this turn where code's line does not): a first attempt's code turns were planned without the known
   * draws (offline, attempt 1's path as the anchor stopped on code's own line in 5 of 27 walks). Off: code's line, as before.
   */
  retryExploreReplayCode: boolean;
  /**
   * SL_RETRY_EXPLORE_TARGET_TURN (default on, 2026-10-04, ABCJ0TZ6MD06 F48 attempt 4; with SL_RETRY_EXPLORE_REPLAY_DEVIATE): an
   * attempt off the reference path before its deviation point that reaches the point's turn without having deviated still
   * deviates there: on that turn's first question, the target's lines and the failed turns through its board are not played
   * again (attempt 4 left the path at T4 and played T5's excluded 「绯红披风, 血墙+」 again, on a board no failed attempt had
   * decided on, so the replay's fallback could not fire). Off: as before.
   */
  retryExploreTargetTurn: boolean;
  /**
   * SL_RETRY_EXPLORE_REARM (default on, 2026-10-04, AKK09TEEEXKD F17 attempts 3 and 5; with SL_RETRY_EXPLORE_REPLAY and
   * _CANON or _TURN): a deviation whose turn still ended with a failed attempt's plays (differs false: a draw's re-plan, or a
   * card that did not do what its line counted on, went back to them) explored nothing; when the next turn's board is still on
   * the reference path, the attempt deviates again at a later point of that path (exploreTarget over the points after it),
   * in the same attempt. Off: the rest of the attempt replays nothing and deviates nowhere, as before.
   */
  retryExploreRearm: boolean;
  /**
   * SL_RETRY_EXPLORE_WASTED (default on, 2026-10-04, 3B4K4UDQ56B9 F48 attempt 4; with SL_RETRY_EXPLORE_CANON or _TURN): a
   * deviation's turn counts as a failed one's (`differs` false, `repeats` says how; SL_RETRY_EXPLORE_REARM acts on it) also
   * when its plays are a failed turn's but for which copy of a card was upgraded (3B4K T4: Twin Strike for Twin Strike+, the
   * fight on as attempt 2's), or a failed attempt's turn from the same turn start that did not pass the point's board
   * (P68P7CDJRDH3 F48 attempt 5 T1: attempt 1's turn), or the next turn begins on a failed attempt's board; REARM re-arms off
   * the reference path too (the deviation then made on a failed attempt's board or on the point's turn). Off: by the exact
   * plays through the point's board, and on the path only, as before.
   */
  retryExploreWasted: boolean;
  /**
   * SL_RETRY_EXPLORE_ANCHOR (2026-10-04, ABCJ0TZ6MD06 F48; with SL_RETRY_EXPLORE_REPLAY): the reference path (the anchor) of
   * attempts 3+ is the failed attempt that lived longest (the latest turn reached; ties: the least enemy HP left, then the
   * earliest attempt from the 2nd), attempt 1 among them once its decision points are recorded (with this switch attempt 1
   * records them too, without changing a decision). Off: attempt 2's path, as before.
   */
  retryExploreAnchor: boolean;
  /**
   * SL_RETRY_EXPLORE_CANON (default on, 2026-10-03, A9 runs 10-12; with SL_RETRY_EXPLORE): a line counts as tried on a
   * board by the turn's plays (the multiset of card id with "+" and target, potions included, the cards already played that
   * turn counted in), not by its text: the same plays in another order or line text are the same line, the same cards on
   * another enemy another. Attempt 1 is recorded too and counts; rows from before it are rebuilt from their summary
   * (docs/sl.md §11.7). Off: as before.
   */
  retryExploreCanon: boolean;
  /**
   * SL_RETRY_EXPLORE_TURN (default on, 2026-10-03, UK7R9A0NMCXL F33 attempt 4; with SL_RETRY_EXPLORE): the deviation holds
   * for the rest of its turn: the deviation point's replacement and every later decision of that turn (a re-plan after a
   * draw, code's own next line) never end the turn with the plays a failed attempt's turn had through that board, while a
   * line that does not survives this turn; a winning line is never changed (docs/sl.md §11.7). Off: as before.
   */
  retryExploreTurn: boolean;
  /**
   * SL_RETRY_EXPLORE_WHOLE (default on, 2026-10-03, PW7Y9EWUW8SB F48 attempts 3-4; with SL_RETRY_EXPLORE_TURN): the
   * deviation's turn judged by its whole plays, the ones after a draw's re-plan too. A line drawing before its turn is over
   * whose plays up to the draw are within a failed attempt's turn there gives way to a not-worse line that cannot end as
   * one (replacements prefer those); later in that turn the avoid reaches every line that survives (code's "only distinct
   * line" no longer slips through), and says so where it cannot (sl_explore.avoid_failed, the row's deviation); a deviation
   * whose turn still ended as a failed one does not use its point: the next attempt goes back to it with another line
   * (docs/sl.md §11.8). Off: as before.
   */
  retryExploreWhole: boolean;
  /**
   * SL_RETRY_EXPLORE_WHERE (default on, 2026-10-03, GQ5H73A1VCL8 F48, Dai: 「确实应该换」; with SL_RETRY_EXPLORE): the deviation
   * point goes where the failed attempts lost their HP, a different turn each attempt: the turns deviated at the fewest times
   * first, of them the one whose weight is the largest (the HP lost on the enemy turn after it, mean over the failed
   * attempts, an attempt's last turn all its HP, plus the later turns' at half a turn each); within the turn its first
   * question. "Every line loses in every sample" (SL_RETRY_EXPLORE_ORDER) only breaks ties: it is the rollout's 5-turn
   * horizon (GQ5H's four deviations all went to T1, the HP lost on T4-T5) (docs/sl.md §11.9). Off: as before.
   */
  retryExploreWhere: boolean;
  /**
   * SL_RETRY_EXPLORE_POTION (default on, 2026-10-03, P68P7CDJRDH3 F48 attempts 3-4; with SL_RETRY_EXPLORE_CANON or _TURN):
   * a line counts as tried on a board by its cards (card and target, as _CANON), unless it drinks a potion the failed attempt
   * with those cards never drank from that turn to its end (held to the death): a potion drunk a turn earlier or later, or
   * left out this turn, is the same line. P68P F48: attempt 3 left one potion out on T2, attempt 4 drank it on T1, both
   * played attempt 2's cards and all three ended at 1 HP + 24 block against 44 (docs/sl.md §11.10). Off: as before.
   */
  retryExplorePotion: boolean;
  /**
   * SL_RETRY_KNOWN_PICKS (default on, 2026-10-03, R1QJUBVBSSB2 F33; with SL_RETRY_KNOWN_INSERTS): a card taken out of the
   * draw pile by a selection (Seeker Strike) leaves the rest of the pile in its order: it is taken out of the known order,
   * which goes on (docs/sl.md §10.2). Off: the order ends there, as before.
   */
  retryKnownPicks: boolean;
  /**
   * SL_RETRY_KNOWN_OFF_TOP (default on, 2026-10-03, RNTVAT76BPV0 F38; with SL_RETRY_KNOWN_INSERTS): cards played off the top
   * of the draw pile (the potion Distilled Chaos, Havoc, Cascade) were its next cards: they are places of the known order and
   * the rest of it goes on (several at once: their order among themselves is not known until an attempt draws them); with
   * Hellraiser on, the Strikes it plays as they are drawn make the step's draws such a span (C4F14F3XPN0N F33)
   * (docs/sl.md §10.2). Off: the order ends there, as before.
   */
  retryKnownOffTop: boolean;
  /**
   * SL_RETRY_KNOWN_HAND_ORDER (default on, 2026-10-03; with SL_RETRY_KNOWN_INSERTS): a card drawn while a copy of it was
   * played from the hand in the same step (Shrug It Off drawing Shrug It Off) is read by the hand's order, not taken for a
   * card that left the pile without coming into the hand (docs/sl.md §10.2). Off: the order ends there, as before.
   */
  retryKnownHandOrder: boolean;
  /** SL_LOG: sl-attempts.jsonl (default next to the decision log; off: not written). */
  log: string | null;
  /** SL_STEP_TIMEOUT_MS (default 60000): each reload step's wait (the main menu, then the fight). */
  stepTimeoutMs: number;
}

export interface AppConfig {
  sts2: Sts2Config;
  jev: JevConfig;
  enricher: EnricherConfig;
  /** Escalation model for Jev's near-guesses on high-stakes calls (phase 2). null when no key. */
  deepseek: { apiKey: string; baseUrl: string; model: string; maxCalls: number; timeoutMs: number; guideFile: string; handbookFile: string; reasoningEffort: string; combatReasoningEffort: string; effortByLabel?: string; reasoningLog: string; factsSnapshotDir?: string } | null;
  /** Escalation order, e.g. ["claude", "deepseek"]: the first one that answers wins. */
  escalation: { chain: ("claude" | "deepseek")[]; claudeDir: string; claudeTimeoutMs: number; claudeMaxCalls: number };
  thresholds: { act: number; strong: number };
  budgets: { maxRequests: number; maxTokens: number };
  /**
   * character: CHARACTER as given (character select matches it on the game's character_id or name); characterId: the
   * knowledge id it names (knowledge/files.ts characterKey; "ironclad" when CHARACTER is unset), whose
   * knowledge/characters/<id>/ the run reads.
   */
  run: { start: RunStart; character: string | null; characterId: string };
  shop: { discardPotions: string[] };
  /** Allow the loop to answer tutorial/FTUE prompts that change game settings. Default: false. */
  allowFtueModals: boolean;
  /**
   * When Jev is available, act on its answer even if its confidence is low, instead of substituting a
   * code-chosen action. Default true: with Jev enabled the model decides.
   */
  strictJev: boolean;
  /** `turn`: whole-turn solver + Jev on close calls (phase 2). `card`: the original per-card question. */
  combatPlanner: "turn" | "card";
  /**
   * What Jev sees on combat plan choices (M1). `off`: the original question. `v1`: code-computed fact
   * tags on every option, retrieved fight hints (knowledge/characters/ironclad/jev-hints.json) and a combat-trimmed
   * run brief. Jev only: the escalator keeps the original question. Default off.
   */
  jevContext: JevContextVersion;
  /**
   * `v1`: DeepSeek plans each elite/boss fight once at its start (src/memory/fight-plan.ts) and no
   * longer answers per-turn combat plan choices. `off`: per-turn escalation as before. Default off.
   */
  fightPlan: "off" | "v1";
  /** JSONL log of the fight plans (FIGHT_PLAN=v1). */
  fightPlanLog: string;
  /** `v1`: DeepSeek sets a run plan (strategy only) at run/act start, heavy HP loss and every few floors. */
  runPlan: "off" | "v1";
  runPlanLog: string;
  /**
   * RUN_PLAN_MERGE (default on; Dai 2026-10-02, strategy/run-plan-merge.ts): with RUN_PLAN=v1 and BUILD_DECIDER=deepseek,
   * a due run plan rides on the next DeepSeek question (the act-start Ancient, a card reward, a rest site, a shop, an
   * event) instead of its own call at the map; its own call only when no question carried it within
   * RUN_PLAN_MERGE_FLOORS floors, or the act boss is next. off: the run plan's own call at the map, exactly as before.
   */
  runPlanMerge: boolean;
  /**
   * Who decides deck building (card rewards, shop, removals/upgrades/transforms, events, relics, bundles),
   * the route and rest sites. `deepseek` (default): DeepSeek directly, code's values given as facts; the
   * route is planned once per act and followed by code. Jev, then code, when DeepSeek fails or is out of
   * budget. `jev`: the baseline (Jev, DeepSeek only on Jev's near-guesses).
   */
  buildDecider: "deepseek" | "jev";
  /**
   * With BUILD_DECIDER=deepseek, whether a shop visit, a rest site, an event option and the act-start
   * Ancient are decided in one DeepSeek question each, together with the deck card(s) the follow-up screen
   * takes and the act's route (Dai 2026-09-29; screens/oneshot.ts). `on` (default); `off`: the step-by-step
   * questions (one purchase, then the card, per question).
   */
  buildOneshot: "on" | "off";
  /**
   * B3 (docs/boss-sim.md §11): whether each option of a deck-building question DeepSeek decides (card reward, shop,
   * rest site, deck selection, event) carries the act boss fought in simulation with that option's deck, and
   * facts.act_boss_sim replaces the act boss clock. `on` (default); `off`: the questions exactly as before.
   */
  bossSimBuild: "on" | "off";
  /**
   * With BUILD_DECIDER=deepseek, whether in-combat card picks (the only in-combat questions that still
   * carry an escalation; turn plans no longer do) may escalate to DeepSeek on Jev's near-guesses. `off`
   * (default): combat, potions and in-combat card picks stay with code and Jev.
   */
  combatDeepseek: "off" | "on";
  /**
   * THIEF_FACTS (default on; docs/thief.md, src/reflex/thief.ts): while a Thieving Hopper or a Gremlin Merc / Fat
   * Gremlin carries a stolen card or gold, the combat question gets thief_context and a `thief` fact on each option,
   * the rollout lets an enemy whose Escape resolves leave the fight, and a line that kills it before it leaves is kept
   * among the options. off: the combat question exactly as before.
   */
  thiefFacts: boolean;
  /**
   * THIEF_COST (default on: Dai 2026-10-02, after the offline numbers; docs/thief.md §7): with THIEF_FACTS on, the loot
   * a thief may take away is HP in the rollout's ranking, like a potion's cost: the Hopper's stolen card at its act-boss
   * simulated worth (src/sim/thief-card-value.ts, once per fight), the Merc's / Fat Gremlin's gold at the potion table's
   * gold rate (potion-equivalents.json meta.gold_hp). off: questions, options and choices exactly as with THIEF_FACTS alone.
   */
  thiefCost: boolean;
  /**
   * MECH_RULES (default on; docs/mechanics-learning.md, src/knowledge/mechanics.ts): the mechanics learned from the logs
   * (monster-db.json `observed`, refreshed with the DB) in use. A line stripping an enemy power whose strip to 0 stunned
   * that enemy in the logs (the Thieving Hopper's Flutter) cancels its move this turn in the turn solver and the rollout,
   * and the option says so; the combat question's enemy powers carry the observation; the knowledge prefix renders the
   * notable observations. off: the combat question and the knowledge prefix exactly as before. Without the data (a DB
   * built before it), as off.
   */
  mechRules: boolean;
  /**
   * MECH_MOVE_RULES (default on; docs/mechanics-learning.md §8, Dai 2026-10-02), with MECH_RULES on: the second learned
   * class, "a power removed or lowered -> the enemy's move changes" (an Axebot's Stock taken on its revive: Boot Up, no
   * attack), in the solver, the rollout, the option's fact, the enemy powers' note and the knowledge prefix; and the Kaiser
   * Crab's back attack needing both claws alive (Surrounded's x1.5 is gone once one claw dies: 152 of 152 logged one-claw
   * attack intents unmultiplied). off (or MECH_RULES off): the combat question and the prefix exactly as before them.
   */
  mechMoveRules: boolean;
  /**
   * MECH_DEATH_MOVE (default on; docs/mechanics-learning.md §9, Dai 2026-10-03), with MECH_RULES on: the class learned from
   * the logged multi-enemy fights, "an ally's death changes a survivor's move" (the Torch Head Amalgam dying turns the
   * Queen's Burn Bright For Me into Enrage at once, 21 of 21, and her next move into Off With Your Head, 22 of 22), in the
   * solver (this turn's move), the rollout and the whole-fight boss sim (that enemy turn's move and the next one, the
   * death's own moves kept out while the ally lives) and the option's fact. off (or MECH_RULES off), or a DB without the
   * data: the combat question as before it.
   */
  mechDeathMove: boolean;
  /**
   * PASSIVE_PIECES (default on; src/reflex/passive-pieces.ts, Dai 2026-10-03): the passive damage and block pieces (Thorns,
   * Flame Barrier, Mercury Hourglass, Inferno, Sai, Crimson Mantle, Plating, Orichalcum, Ripple Basin, Horn Cleat, Letter
   * Opener, Ornamental Fan, Parrying Shield) in the rollout's later turns, the whole-fight boss sim and the boss clock, the
   * clock's passive damage not cut by the Queen's Weak; the last five relics in the live solver's current turn too, and
   * Plating no longer stopping Orichalcum. off: all of them exactly as before.
   */
  passivePieces: boolean;
  /**
   * SANDPIT_START (default on; rollout.ts RolloutOptions.sandpitStart, tests/insatiable-sandpit.test.ts): the Insatiable's turn-1
   * Liquify Ground starts its Sandpit (4) in the 5-turn rollout's later turns too, its Frantic Escapes 3 into the draw pile, as
   * the whole fights (B4) do. off: whole fights only, as before (a turn-1 rollout played the boss without its Sandpit).
   */
  sandpitStart: boolean;
  /**
   * CARD_CONDITIONS (default on; src/reflex/card-model.ts cardConditionOptions, tests/card-conditions.test.ts): conditional
   * card effects evaluated on the solver's simulated state when the card is played, in the live solver, the rollout and B2:
   * Restlessness's draw and energy only on an empty hand (Impatience's draw only with no Attack in it), Spite's second hit
   * after HP lost earlier this turn too, a Rage played in the line, Ashen Strike / Expect a Fight / Tear Asunder with what the
   * line exhausted / gained / lost before them. off: the card models and the solver exactly as before.
   */
  cardConditions: boolean;
  /** SL (docs/sl.md): boss and listed-elite fights reloaded on a foreseen certain death (SL_*; on by default). */
  sl: SlConfig;
  /** V4 brain: engine per question kind, fallback, re-ask, tools, log (BRAIN_*). */
  brain: BrainConfig;
  mode: Mode;
  /**
   * jevPromptLog (JEV_PROMPT_LOG): where every request to Jev is logged verbatim (telemetry/jev-prompt-log.ts);
   * unset: next to the decision log (logs/jev-prompts.jsonl); null (JEV_PROMPT_LOG=off): not logged.
   * runConfigLog (RUN_CONFIG_LOG): one row per run with its configuration (telemetry/run-config.ts); unset: next to the
   * decision log (logs/run-config.jsonl); null (RUN_CONFIG_LOG=off): not written.
   */
  log: { level: LogLevel; decisionLog: string; jevPromptLog?: string | null; runConfigLog?: string | null };
  warnings: string[];
}

/** Per-engine brain settings (BRAIN_<ENGINE>_*); null = the engine's or the router's default. */
export interface BrainEngineSettings {
  /**
   * BRAIN_<ENGINE>_MODEL (claude: an alias such as opus / sonnet, or a full id such as claude-opus-5; codex: a model
   * slug, default DEFAULT_CODEX_MODEL). DeepSeek:
   * DEEPSEEK_MODEL governs (the v3 client); this is ignored for it.
   */
  model: string | null;
  /** BRAIN_<ENGINE>_MODEL_<PREFIX>: the model for one question kind (router.ts labelPrefix), e.g. { MAP: "opus" }. */
  modelByPrefix: Record<string, string>;
  /** BRAIN_<ENGINE>_TIMEOUT_MS: the router's limit on one engine call (null: none beyond the engine's own). */
  timeoutMs: number | null;
  /** BRAIN_<ENGINE>_EFFORT (claude --effort, codex model_reasoning_effort (default xhigh), dsh reasoning effort). */
  effort: Effort | null;
  /** BRAIN_<ENGINE>_REASK=on|off: the router's one re-ask (default on; DeepSeek without tools: off, v3 repairs itself). */
  reask: boolean | null;
  /**
   * BRAIN_<ENGINE>_TOOLS=on|off: whether the engine gets the tool list (default on; DeepSeek off: v3 parity; with
   * KNOWLEDGE_PREFIX=full off for every engine: the knowledge is in the system prompt, set on to add the tools).
   */
  tools: boolean | null;
  /**
   * BRAIN_<ENGINE>_MAX_CALLS: the engine's model calls per process (re-asks included), counted by the router apart
   * from DEEPSEEK_MAX_CALLS; past it the engine's questions go to BRAIN_FALLBACK. null: no limit. DeepSeek: always
   * null (the loop's DEEPSEEK_MAX_CALLS governs it, as in v3). Claude default DEFAULT_CLAUDE_MAX_CALLS.
   */
  maxCalls: number | null;
}

/** KNOWLEDGE_PREFIX: what the brain's system prompt carries (docs/v4-architecture.md §2-§3). */
export type KnowledgePrefixMode = "off" | "full";

/** V4 brain (src/brain/router.ts): which engine answers which question, and each engine's settings. */
export interface BrainConfig {
  /** BRAIN_ENGINE (default deepseek: v3 behaviour). */
  engine: EngineName;
  /** BRAIN_ENGINE_<PREFIX>: per label prefix (router.ts labelPrefix), e.g. { MAP: "claude" }. */
  byPrefix: Record<string, EngineName>;
  /** BRAIN_FALLBACK: the engine asked when the chosen one errors or times out; null = none. */
  fallback: EngineName | null;
  /** BRAIN_REASK=on|off for every engine (BRAIN_<ENGINE>_REASK wins); null = per-engine default. */
  reask: boolean | null;
  /** BRAIN_TOOLS=on|off for every engine (BRAIN_<ENGINE>_TOOLS wins); null = per-engine default. */
  tools: boolean | null;
  /** BRAIN_LOG: one JSONL row per question; null = brain.jsonl next to the decision log. "" disables. */
  log: string | null;
  engines: Record<EngineName, BrainEngineSettings>;
  /**
   * KNOWLEDGE_PREFIX: "off" (default) sends v3's system prompt (rules + guide + handbook) and v3's memory, byte for
   * byte; "full" sends the rules + the whole knowledge base at the run's ascension (src/brain/knowledge.ts), to every
   * engine, and drops what the prefix already holds from the memory (the experience lessons).
   */
  knowledgePrefix: KnowledgePrefixMode;
  /** Claude runs under this machine's Claude login (the subscription); there is no API-key mode. */
  claude: {
    /**
     * BRAIN_CLAUDE_BIN, else the first executable `claude` on PATH, else ~/.local/bin/claude (its install
     * location, which ops/run.sh does not put on PATH), as an absolute path; "claude" when none is found (the
     * loop's start-up check then reports it). resolveClaudeBin.
     */
    bin: string;
    /** BRAIN_CLAUDE_MAX_BUDGET_USD: --max-budget-usd per call; null = none. */
    maxBudgetUsd: number | null;
    /**
     * BRAIN_CLAUDE_SCHEMA: "kind" (default) sends one --json-schema per question kind, so the prompt cache holds
     * across questions (specs.ts stableSchema); "question" sends the question's own schema (its keys as enums:
     * format-tight, but every question writes the whole prompt to the cache again).
     */
    schema: "kind" | "question";
  };
  /** Codex runs under this machine's ChatGPT login (`codex login`, the subscription), isolated from its user setup. */
  codex: {
    /**
     * BRAIN_CODEX_BIN, else the first executable `codex` on PATH, else ~/.local/node/bin/codex (the npm install), as an
     * absolute path; "codex" when none is found (the start-up check reports it). resolveCodexBin.
     */
    bin: string;
    /** Codex's home, where its login is (BRAIN_CODEX_HOME, else CODEX_HOME, else ~/.codex); its config is not loaded. */
    home: string;
    /** BRAIN_CODEX_SUMMARY: the reasoning summary codex asks for (default auto; logged, not shown to the model). */
    summary: "auto" | "concise" | "detailed" | "none";
    /** Fast service tier for every Codex session (Roy 2026-10-09); model and reasoning effort stay separate. */
    serviceTier: string | null;
    /**
     * BRAIN_CODEX_STALL_MS (default 120 s): after the first output token, a run whose stream is silent this long is
     * killed and asked again (stallRetries times), then the question fails as a timeout (BRAIN_FALLBACK answers).
     * null (off / 0): not watched (the router's BRAIN_CODEX_TIMEOUT_MS only).
     */
    stallMs: number | null;
    /** BRAIN_CODEX_FIRST_TOKEN_MS: a run with no first output token this long after its start is stalled too; null (default): no limit. */
    firstTokenMs: number | null;
    /** BRAIN_CODEX_STALL_RETRIES: runs after a stalled one (default 1). */
    stallRetries: number;
    /**
     * BRAIN_CODEX_MODE: "exec" (default: one `codex exec` per question) or "session" (one app-server per process, one
     * saved thread holding the system prompt, each question a turn reverted after it: the prompt cache holds;
     * engines/codex-session.ts). Session mode falls back to exec mode for the process when it cannot run isolated or
     * its server fails twice.
     */
    mode: "exec" | "session";
    /**
     * BRAIN_CODEX_MAX_ANSWER_CHARS (session mode, default 2000; off: none): a streamed answer longer than this is given up
     * on as a stall (interrupted, reverted, asked once more). Logged answers are at most ~1,000 characters (2026-10-03);
     * a runaway one streams ~33 characters a second without end (2 of 4 real turns at high; one ran 10 minutes).
     */
    maxAnswerChars: number | null;
    /**
     * BRAIN_CODEX_MAX_ANSWER_BLANKS (session mode, default 100; off: none): a streamed answer with this many whitespace
     * characters in a row between its JSON tokens (outside any string) is given up on at once, as a runaway past
     * maxAnswerChars is. 2026-10-03: the cut runaways were whitespace after a complete reason (a replay's: 1,875 of 2,044
     * characters, strict mode allows it and no maxLength reaches it); the 56 answered session turns of L3G50U6KX5ST and
     * 3JHE2AWF5MWB padded at most 9. The same retry or fallback follows, 7-34 s sooner.
     */
    maxAnswerBlanks: number | null;
    /**
     * BRAIN_CODEX_ROUTE_REASON: "drop" (default) leaves route_reason out of codex's answer schema (only logged; the
     * replayed runaways were all in it), "keep" keeps it capped at 60 characters (engines/codex.ts codexSchema).
     */
    routeReason: "drop" | "keep";
    /**
     * BRAIN_CODEX_SCHEMA_FIELDS: "all" gives codex the kind's whole stable schema (every optional field, null when the
     * question does not use it); "used" only the fields the question's own spec has (route with a route review or an act
     * route, cards when an option lists eligible_cards, discard with a discard option, run_plan with a due run plan).
     * 2026-10-03: every one of 22 session runaways was a pick that used none of the optional fields (engines/codex.ts
     * codexKindSchema).
     */
    schemaFields: "all" | "used";
    /**
     * BRAIN_CODEX_ROUTE_PATTERN (on/off): the route field of codex's answer schema takes only "keep" or node ids
     * separated by spaces (a JSON Schema pattern, which strict mode enforces while it samples).
     */
    routePattern: boolean;
    /** BRAIN_CODEX_REASON_LAST (on/off): `reason` as the last field of codex's answer schema (the order codex writes them in). */
    reasonLast: boolean;
    /**
     * BRAIN_CODEX_ACCEPT_CUT (on/off, session mode): a turn cut as a runaway (BRAIN_CODEX_MAX_ANSWER_CHARS or
     * BRAIN_CODEX_MAX_ANSWER_BLANKS) whose streamed prefix closes into a JSON answer with every required field, passing
     * the question's checks, is taken as the answer instead of asking again; brain.jsonl's row notes it.
     */
    acceptCut: boolean;
    /** BRAIN_CODEX_MAX_FIELD_CHARS (default 600; off: none): the maxLength of every free-text field in codex's answer schema. */
    maxFieldChars: number | null;
    /**
     * The usage guard (engines/codex-usage.ts): the plan's windows and credits read at process start and before a
     * codex call every `everyCalls` calls (BRAIN_CODEX_USAGE_EVERY_CALLS, default 3) or `everyMin` minutes
     * (BRAIN_CODEX_USAGE_EVERY_MIN, default 10); codex is off for the rest of the process once a window is at
     * `stopPct` % (BRAIN_CODEX_USAGE_STOP_PCT, default 80) or credits are in use. `required`
     * (BRAIN_CODEX_USAGE_REQUIRED=on, default off): while reads fail codex is off (its questions to the fallback) until
     * a read works, instead of being said once and kept on.
     */
    usage: { stopPct: number; everyCalls: number; everyMin: number; required: boolean };
  };
}

/** The brain's default Claude model (claude-api skill, 2026-09: the current Sonnet; BRAIN_CLAUDE_MODEL=opus for Opus). */
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";

/** The current Opus, pinned (Dai 2026-09-29): BRAIN_CLAUDE_MODEL=opus sends this id, so an alias move changes nothing. */
export const CLAUDE_OPUS_MODEL = "claude-opus-5-5";

/** Model aliases the brain pins to a full id before calling the CLI; other names are sent as given. */
export const CLAUDE_MODEL_ALIASES: Readonly<Record<string, string>> = { opus: CLAUDE_OPUS_MODEL };

/** BRAIN_CLAUDE_TIMEOUT_MS when unset: 2 minutes per call. */
export const DEFAULT_CLAUDE_TIMEOUT_MS = 120_000;

/** The Claude engine's calls per process when BRAIN_CLAUDE_MAX_CALLS is unset (DEEPSEEK_MAX_CALLS is 300). */
export const DEFAULT_CLAUDE_MAX_CALLS = 150;

/**
 * The brain's Codex model and effort when BRAIN_CODEX_MODEL / BRAIN_CODEX_EFFORT are unset (Dai 2026-10-03: "gpt6.1 sol
 * extra high"). Always sent explicitly: the engine ignores ~/.codex/config.toml (engines/codex.ts).
 */
export const DEFAULT_CODEX_MODEL = "gpt-6.1-sol";
export const DEFAULT_CODEX_EFFORT: Effort = "xhigh";
/** Codex's model catalog names the priority service tier "Fast". Roy enabled it for all sessions on 2026-10-09. */
export const CODEX_SERVICE_TIER = "priority";

/** BRAIN_CODEX_TIMEOUT_MS when unset: 10 minutes per call (xhigh on a map / act-plan question takes minutes). */
export const DEFAULT_CODEX_TIMEOUT_MS = 600_000;

/**
 * BRAIN_CODEX_STALL_MS when unset: after the first output token, a stream silent this long is killed and asked again
 * (engines/codex.ts). Measured 2026-10-03: a healthy answer streams in 2-25 s after its first token; the stalls in play
 * sent nothing for 10 minutes after it.
 */
export const DEFAULT_CODEX_STALL_MS: number | null = 120_000;

/**
 * BRAIN_CODEX_MAX_ANSWER_BLANKS when unset: whitespace characters in a row between a streamed answer's JSON tokens after
 * which session mode gives the turn up as a runaway (answered turns padded at most 9; the runaways ran to ~1,900).
 */
export const DEFAULT_CODEX_MAX_ANSWER_BLANKS = 100;

/**
 * BRAIN_CODEX_SCHEMA_FIELDS, BRAIN_CODEX_REASON_LAST and BRAIN_CODEX_ACCEPT_CUT when unset (engines/codex.ts). The A/B of
 * 2026-10-03 (experiments/brain-replay/schema-ab-1003: 10 logged questions, session mode, effort high): the whole stable
 * schema ran away on 5 of 10 (every one a pick using no optional field), "used" on 0 and "used" with reason last on 0;
 * "used" matched live codex's choices 7 of 7 and DeepSeek's 3 of 3 (the whole schema, replayed: 5 of 7), reason last
 * 6 of 7 (a route changed). Every one of the 5 cut answers closed into a complete, valid answer (accepted).
 */
export const DEFAULT_CODEX_SCHEMA_FIELDS: "all" | "used" = "used";
export const DEFAULT_CODEX_REASON_LAST = false;
export const DEFAULT_CODEX_ACCEPT_CUT = true;
/**
 * BRAIN_CODEX_ROUTE_PATTERN when unset (engines/codex.ts ROUTE_PATTERN). 2026-10-04 (experiments/brain-replay/
 * route-garbage-1004, xhigh): the three questions whose route stayed garbled after the re-ask in play (6 of 6 answers)
 * answered a clean "keep" with the pattern (3 of 3), the same choices as in play; route_reason back in the schema did
 * too (3 of 3), but it changes what the run memory gets from codex's route changes, the pattern changes no prompt.
 */
export const DEFAULT_CODEX_ROUTE_PATTERN = true;

/**
 * The codex usage guard's defaults (engines/codex-usage.ts). Stop at 80% of any window (Dai 2026-10-03: protect the
 * weekly window shared with Dai's own Codex use; past 100% the backend draws on credits). A read (~0.9 s, one
 * short-lived app-server) before every third codex call or after 10 minutes: a call at xhigh takes minutes and is about
 * 0.1-0.4% of the weekly window, so the guard costs well under 1% of the brain's time and overshoots by about 1%.
 */
export const DEFAULT_CODEX_USAGE_STOP_PCT = 80;
export const DEFAULT_CODEX_USAGE_EVERY_CALLS = 3;
export const DEFAULT_CODEX_USAGE_EVERY_MIN = 10;

/** Engine names BRAIN_* may use; dsh is named but not implemented yet (the router says so). */
const ENGINES: readonly EngineName[] = ["deepseek", "claude", "codex", "dsh"];
const EFFORTS: readonly Effort[] = ["low", "medium", "high", "xhigh", "max"];

function parseEngine(raw: string, field: string, problems: ConfigProblem[]): EngineName | null {
  const value = raw.toLowerCase();
  if ((ENGINES as readonly string[]).includes(value)) return value as EngineName;
  problems.push({ field, message: `expected one of ${ENGINES.join(", ")}, got "${raw}"` });
  return null;
}

function parseOnOff(raw: string | null, field: string, problems: ConfigProblem[]): boolean | null {
  if (raw === null) return null;
  const value = raw.toLowerCase();
  if (["on", "true", "1", "yes"].includes(value)) return true;
  if (["off", "false", "0", "no"].includes(value)) return false;
  problems.push({ field, message: `expected on or off, got "${raw}"` });
  return null;
}

function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The claude program the brain runs: BRAIN_CLAUDE_BIN as given; else the first executable `claude` in PATH's
 * absolute directories; else HOME/.local/bin/claude (where the CLI installs itself: ops/run.sh adds only
 * ~/.local/node/bin to PATH); else "claude", which the start-up check (brain.ts preflight) reports as missing.
 */
export function resolveClaudeBin(env: NodeJS.ProcessEnv): string {
  const set = readEnv(env, "BRAIN_CLAUDE_BIN");
  if (set !== null) return set;
  for (const dir of (env["PATH"] ?? "").split(delimiter)) {
    if (!dir || !isAbsolute(dir)) continue;
    const candidate = join(dir, "claude");
    if (isExecutableFile(candidate)) return candidate;
  }
  const home = env["HOME"];
  if (home && isAbsolute(home)) {
    const installed = join(home, ".local", "bin", "claude");
    if (isExecutableFile(installed)) return installed;
  }
  return "claude";
}

/**
 * The codex program the brain runs: BRAIN_CODEX_BIN as given; else the first executable `codex` in PATH's absolute
 * directories; else HOME/.local/node/bin/codex (the npm install, @openai/codex); else "codex", which the start-up
 * check (brain.ts preflight) reports as missing.
 */
export function resolveCodexBin(env: NodeJS.ProcessEnv): string {
  const set = readEnv(env, "BRAIN_CODEX_BIN");
  if (set !== null) return set;
  for (const dir of (env["PATH"] ?? "").split(delimiter)) {
    if (!dir || !isAbsolute(dir)) continue;
    const candidate = join(dir, "codex");
    if (isExecutableFile(candidate)) return candidate;
  }
  const home = env["HOME"];
  if (home && isAbsolute(home)) {
    const installed = join(home, ".local", "node", "bin", "codex");
    if (isExecutableFile(installed)) return installed;
  }
  return "codex";
}

/** Codex's home (its login and settings): BRAIN_CODEX_HOME, else CODEX_HOME, else HOME/.codex (codex's own default). */
export function resolveCodexHome(env: NodeJS.ProcessEnv): string {
  return readEnv(env, "BRAIN_CODEX_HOME") ?? readEnv(env, "CODEX_HOME") ?? join(env["HOME"] ?? "", ".codex");
}

/** BRAIN_<ENGINE>_MAX_CALLS ("off" or "none": no limit); DeepSeek's budget stays DEEPSEEK_MAX_CALLS (the loop's). */
function maxCallsOf(env: NodeJS.ProcessEnv, name: EngineName, problems: ConfigProblem[]): number | null {
  if (name === "deepseek") return null;
  const field = `BRAIN_${name.toUpperCase()}_MAX_CALLS`;
  const raw = readEnv(env, field);
  // Codex: no limit by default (Dai 2026-10-03); a used-up subscription rests it for the process (engines/codex.ts).
  if (raw === null) return name === "claude" ? DEFAULT_CLAUDE_MAX_CALLS : null;
  if (["off", "none"].includes(raw.toLowerCase())) return null;
  return parseInteger(raw, field, problems, { min: 0, max: 1_000_000 });
}

/** The BRAIN_* variables (docs/v4-architecture.md §2): switching engines is configuration only. */
export function readBrainConfig(env: NodeJS.ProcessEnv, problems: ConfigProblem[]): BrainConfig {
  const engine = parseEngine(readEnv(env, "BRAIN_ENGINE") ?? "deepseek", "BRAIN_ENGINE", problems) ?? "deepseek";
  const byPrefix: Record<string, EngineName> = {};
  for (const key of Object.keys(env).sort()) {
    const m = /^BRAIN_ENGINE_([A-Z0-9_]+)$/.exec(key);
    const raw = readEnv(env, key);
    if (!m || raw === null) continue;
    const name = parseEngine(raw, key, problems);
    if (name) byPrefix[m[1]!] = name;
  }
  const fallbackRaw = readEnv(env, "BRAIN_FALLBACK");
  const fallback = fallbackRaw === null || fallbackRaw.toLowerCase() === "none" ? null : parseEngine(fallbackRaw, "BRAIN_FALLBACK", problems);
  const engines = {} as Record<EngineName, BrainEngineSettings>;
  for (const name of ENGINES) {
    const upper = name.toUpperCase();
    const timeoutRaw = readEnv(env, `BRAIN_${upper}_TIMEOUT_MS`);
    const effortRaw = readEnv(env, `BRAIN_${upper}_EFFORT`);
    let effort: Effort | null = name === "codex" ? DEFAULT_CODEX_EFFORT : null;
    if (effortRaw !== null) {
      if ((EFFORTS as readonly string[]).includes(effortRaw.toLowerCase())) effort = effortRaw.toLowerCase() as Effort;
      else problems.push({ field: `BRAIN_${upper}_EFFORT`, message: `expected one of ${EFFORTS.join(", ")}, got "${effortRaw}"` });
    }
    // Claude: 2 minutes (a question the loop waits on; two timeouts in a row rest it, router.ts TIMEOUT_REST_AFTER).
    // Codex: 10 minutes (xhigh reasoning on the long questions). dsh: 5 minutes, as DEEPSEEK_TIMEOUT_MS in the live .env.
    const defaultTimeout = name === "deepseek" ? null : name === "claude" ? DEFAULT_CLAUDE_TIMEOUT_MS : name === "codex" ? DEFAULT_CODEX_TIMEOUT_MS : 300_000;
    const modelByPrefix: Record<string, string> = {};
    for (const key of Object.keys(env).sort()) {
      const m = new RegExp(`^BRAIN_${upper}_MODEL_([A-Z0-9_]+)$`).exec(key);
      const raw = readEnv(env, key);
      if (m && raw !== null) modelByPrefix[m[1]!] = raw;
    }
    engines[name] = {
      model: readEnv(env, `BRAIN_${upper}_MODEL`) ?? (name === "claude" ? DEFAULT_CLAUDE_MODEL : name === "codex" ? DEFAULT_CODEX_MODEL : null),
      modelByPrefix,
      timeoutMs: timeoutRaw === null ? defaultTimeout : parseInteger(timeoutRaw, `BRAIN_${upper}_TIMEOUT_MS`, problems, { min: 1_000, max: 3_600_000 }),
      effort,
      reask: parseOnOff(readEnv(env, `BRAIN_${upper}_REASK`), `BRAIN_${upper}_REASK`, problems),
      tools: parseOnOff(readEnv(env, `BRAIN_${upper}_TOOLS`), `BRAIN_${upper}_TOOLS`, problems),
      maxCalls: maxCallsOf(env, name, problems),
    };
  }
  const budgetRaw = readEnv(env, "BRAIN_CLAUDE_MAX_BUDGET_USD");
  const maxBudgetUsd = budgetRaw === null ? null : Number(budgetRaw);
  if (maxBudgetUsd !== null && !(Number.isFinite(maxBudgetUsd) && maxBudgetUsd > 0)) problems.push({ field: "BRAIN_CLAUDE_MAX_BUDGET_USD", message: `expected a positive number, got "${budgetRaw}"` });
  const log = readEnv(env, "BRAIN_LOG");
  const schemaRaw = (readEnv(env, "BRAIN_CLAUDE_SCHEMA") ?? "kind").toLowerCase();
  if (schemaRaw !== "kind" && schemaRaw !== "question") problems.push({ field: "BRAIN_CLAUDE_SCHEMA", message: `expected kind or question, got "${schemaRaw}"` });
  const schemaMode: "kind" | "question" = schemaRaw === "question" ? "question" : "kind";
  const summaryRaw = (readEnv(env, "BRAIN_CODEX_SUMMARY") ?? "auto").toLowerCase();
  if (!["auto", "concise", "detailed", "none"].includes(summaryRaw)) problems.push({ field: "BRAIN_CODEX_SUMMARY", message: `expected auto, concise, detailed or none, got "${summaryRaw}"` });
  const stallRaw = readEnv(env, "BRAIN_CODEX_STALL_MS");
  const stallMs = stallRaw === null ? DEFAULT_CODEX_STALL_MS : ["off", "none", "0"].includes(stallRaw.toLowerCase()) ? null : parseInteger(stallRaw, "BRAIN_CODEX_STALL_MS", problems, { min: 1_000, max: 3_600_000 });
  const maxAnswerRaw = readEnv(env, "BRAIN_CODEX_MAX_ANSWER_CHARS");
  const maxAnswerChars = maxAnswerRaw === null ? 2_000 : ["off", "none", "0"].includes(maxAnswerRaw.toLowerCase()) ? null : parseInteger(maxAnswerRaw, "BRAIN_CODEX_MAX_ANSWER_CHARS", problems, { min: 200, max: 1_000_000 });
  const blanksRaw = readEnv(env, "BRAIN_CODEX_MAX_ANSWER_BLANKS");
  const maxAnswerBlanks = blanksRaw === null ? DEFAULT_CODEX_MAX_ANSWER_BLANKS : ["off", "none", "0"].includes(blanksRaw.toLowerCase()) ? null : parseInteger(blanksRaw, "BRAIN_CODEX_MAX_ANSWER_BLANKS", problems, { min: 20, max: 1_000_000 });
  const schemaFieldsRaw = (readEnv(env, "BRAIN_CODEX_SCHEMA_FIELDS") ?? DEFAULT_CODEX_SCHEMA_FIELDS).toLowerCase();
  if (schemaFieldsRaw !== "all" && schemaFieldsRaw !== "used") problems.push({ field: "BRAIN_CODEX_SCHEMA_FIELDS", message: `expected all or used, got "${schemaFieldsRaw}"` });
  const reasonLast = parseOnOff(readEnv(env, "BRAIN_CODEX_REASON_LAST"), "BRAIN_CODEX_REASON_LAST", problems) ?? DEFAULT_CODEX_REASON_LAST;
  const acceptCut = parseOnOff(readEnv(env, "BRAIN_CODEX_ACCEPT_CUT"), "BRAIN_CODEX_ACCEPT_CUT", problems) ?? DEFAULT_CODEX_ACCEPT_CUT;
  const routePattern = parseOnOff(readEnv(env, "BRAIN_CODEX_ROUTE_PATTERN"), "BRAIN_CODEX_ROUTE_PATTERN", problems) ?? DEFAULT_CODEX_ROUTE_PATTERN;
  const routeReasonRaw = (readEnv(env, "BRAIN_CODEX_ROUTE_REASON") ?? "drop").toLowerCase();
  if (routeReasonRaw !== "drop" && routeReasonRaw !== "keep") problems.push({ field: "BRAIN_CODEX_ROUTE_REASON", message: `expected drop or keep, got "${routeReasonRaw}"` });
  const fieldRaw = readEnv(env, "BRAIN_CODEX_MAX_FIELD_CHARS");
  const maxFieldChars = fieldRaw === null ? 600 : ["off", "none", "0"].includes(fieldRaw.toLowerCase()) ? null : parseInteger(fieldRaw, "BRAIN_CODEX_MAX_FIELD_CHARS", problems, { min: 100, max: 100_000 });
  const modeRaw = (readEnv(env, "BRAIN_CODEX_MODE") ?? "exec").toLowerCase();
  if (modeRaw !== "exec" && modeRaw !== "session") problems.push({ field: "BRAIN_CODEX_MODE", message: `expected exec or session, got "${modeRaw}"` });
  const firstRaw = readEnv(env, "BRAIN_CODEX_FIRST_TOKEN_MS");
  const firstTokenMs = firstRaw === null || ["off", "none", "0"].includes(firstRaw.toLowerCase()) ? null : parseInteger(firstRaw, "BRAIN_CODEX_FIRST_TOKEN_MS", problems, { min: 1_000, max: 3_600_000 });
  const stallRetriesRaw = readEnv(env, "BRAIN_CODEX_STALL_RETRIES");
  const stallRetries = stallRetriesRaw === null ? 1 : parseInteger(stallRetriesRaw, "BRAIN_CODEX_STALL_RETRIES", problems, { min: 0, max: 5 });
  const usageInt = (field: string, fallback: number, range: { min: number; max: number }): number => {
    const raw = readEnv(env, field);
    return raw === null ? fallback : parseInteger(raw, field, problems, range);
  };
  const codexUsage = {
    stopPct: usageInt("BRAIN_CODEX_USAGE_STOP_PCT", DEFAULT_CODEX_USAGE_STOP_PCT, { min: 1, max: 100 }),
    everyCalls: usageInt("BRAIN_CODEX_USAGE_EVERY_CALLS", DEFAULT_CODEX_USAGE_EVERY_CALLS, { min: 1, max: 1000 }),
    everyMin: usageInt("BRAIN_CODEX_USAGE_EVERY_MIN", DEFAULT_CODEX_USAGE_EVERY_MIN, { min: 1, max: 1440 }),
    required: parseOnOff(readEnv(env, "BRAIN_CODEX_USAGE_REQUIRED"), "BRAIN_CODEX_USAGE_REQUIRED", problems) ?? false,
  };
  const prefixRaw = (readEnv(env, "KNOWLEDGE_PREFIX") ?? "off").toLowerCase();
  if (prefixRaw !== "off" && prefixRaw !== "full") problems.push({ field: "KNOWLEDGE_PREFIX", message: `expected off or full, got "${prefixRaw}"` });
  const knowledgePrefix: KnowledgePrefixMode = prefixRaw === "full" ? "full" : "off";
  return {
    engine,
    byPrefix,
    fallback,
    reask: parseOnOff(readEnv(env, "BRAIN_REASK"), "BRAIN_REASK", problems),
    tools: parseOnOff(readEnv(env, "BRAIN_TOOLS"), "BRAIN_TOOLS", problems),
    // BRAIN_LOG=off (or "-") disables the log.
    log: log === null ? null : log === "off" || log === "-" ? "" : fromRoot(log),
    engines,
    knowledgePrefix,
    claude: {
      bin: resolveClaudeBin(env),
      schema: schemaMode,
      maxBudgetUsd: maxBudgetUsd !== null && Number.isFinite(maxBudgetUsd) && maxBudgetUsd > 0 ? maxBudgetUsd : null,
    },
    codex: {
      bin: resolveCodexBin(env),
      home: resolveCodexHome(env),
      summary: (["auto", "concise", "detailed", "none"].includes(summaryRaw) ? summaryRaw : "auto") as BrainConfig["codex"]["summary"],
      serviceTier: CODEX_SERVICE_TIER,
      stallMs,
      firstTokenMs,
      mode: modeRaw === "session" ? "session" : "exec",
      maxAnswerChars,
      maxAnswerBlanks,
      routeReason: routeReasonRaw === "keep" ? "keep" : "drop",
      schemaFields: schemaFieldsRaw === "used" ? "used" : "all",
      reasonLast,
      acceptCut,
      routePattern,
      maxFieldChars,
      stallRetries: stallRetries ?? 1,
      usage: codexUsage,
    },
  };
}

/** Where brain.jsonl goes when BRAIN_LOG is unset: next to the decision log ("decisions.jsonl" -> "brain.jsonl"). */
export function brainLogPath(config: Pick<AppConfig, "brain" | "log">): string {
  if (config.brain.log !== null) return config.brain.log;
  const decisions = config.log.decisionLog;
  return /(^|\/)decisions\.jsonl$/.test(decisions) ? decisions.replace(/decisions\.jsonl$/, "brain.jsonl") : decisions.replace(/(\.jsonl)?$/, ".brain.jsonl");
}

export interface ConfigProblem {
  field: string;
  message: string;
}

export class ConfigError extends Error {
  readonly problems: ConfigProblem[];

  constructor(problems: ConfigProblem[]) {
    super(problems.map((problem) => `${problem.field}: ${problem.message}`).join("\n"));
    this.name = "ConfigError";
    this.problems = problems;
  }
}

export interface ConfigOverrides {
  sts2BaseUrl?: string | undefined;
  jevApiKey?: string | undefined;
  jevModel?: string | undefined;
  mode?: string | undefined;
  /** `--allow-fallback`: opt out of trust-Jev for this run. */
  allowFallback?: boolean | undefined;
}

const DEFAULTS = {
  sts2BaseUrl: "http://127.0.0.1:8080",
  sts2PortScan: "8080-8090",
  sts2TimeoutMs: 10_000,
  jevModel: "jev-1.13.0",
  jevTimeoutMs: 20_000,
  jevMaxRetries: 2,
  confidenceAct: 0.55,
  confidenceStrong: 0.75,
  maxRequests: 2_000,
  maxTokens: "20M",
  mode: "shadow",
  logLevel: "info",
  decisionLog: "./logs/decisions.jsonl",
  enricherEnabled: false,
  enricherTasks: "run_brief",
  runStart: "auto",
  allowFtueModals: false,
  strictJev: true,
  combatPlanner: "turn" as "turn" | "card",
  shopDiscardPotions: "FOUL_POTION",
} as const;

const MODES: readonly Mode[] = ["shadow", "play", "record", "replay"];
const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];
const RUN_STARTS: readonly RunStart[] = ["auto", "continue", "new"];

/** Trimmed env value, or null when unset/blank. Blank values are treated as unset. */
export function readEnv(env: NodeJS.ProcessEnv, key: string): string | null {
  const raw = env[key];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCount(raw: string, field: string, problems: ConfigProblem[]): number {
  const match = /^(\d+(?:\.\d+)?)\s*([kKmMbB])?$/.exec(raw.trim());
  if (!match) {
    problems.push({ field, message: `expected a number, optionally with a K/M/B suffix, got "${raw}"` });
    return 0;
  }
  const scale = { k: 1e3, m: 1e6, b: 1e9 }[match[2]?.toLowerCase() ?? ""] ?? 1;
  return Number(match[1]) * scale;
}

function parseInteger(
  raw: string,
  field: string,
  problems: ConfigProblem[],
  range: { min: number; max: number },
): number {
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    problems.push({ field, message: `expected an integer, got "${raw}"` });
    return range.min;
  }
  if (value < range.min || value > range.max) {
    problems.push({ field, message: `expected ${range.min}..${range.max}, got ${value}` });
    return range.min;
  }
  return value;
}

function parseRatio(raw: string, field: string, problems: ConfigProblem[]): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    problems.push({ field, message: `expected a number in 0..1, got "${raw}"` });
    return 0;
  }
  return value;
}

function parseBoolean(raw: string, field: string, problems: ConfigProblem[]): boolean {
  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  problems.push({ field, message: `expected true/false, got "${raw}"` });
  return false;
}

export function parsePortRange(raw: string, field: string, problems: ConfigProblem[]): { from: number; to: number } {
  const text = raw.trim();
  if (!text.includes("-")) {
    const port = parseInteger(text, field, problems, { min: 1, max: 65_535 });
    return { from: port, to: port };
  }
  const bounds = text.split("-", 2);
  const from = parseInteger((bounds[0] ?? "").trim(), field, problems, { min: 1, max: 65_535 });
  const to = parseInteger((bounds[1] ?? "").trim(), field, problems, { min: 1, max: 65_535 });
  if (from > to) {
    problems.push({ field, message: `range start ${from} is greater than end ${to}` });
    return { from: to, to: from };
  }
  return { from, to };
}

function parseUrl(raw: string, field: string, problems: ConfigProblem[]): string {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      problems.push({ field, message: `expected an http(s) URL, got "${raw}"` });
    }
    return url.origin + (url.pathname === "/" ? "" : url.pathname.replace(/\/$/, ""));
  } catch {
    problems.push({ field, message: `not a valid URL: "${raw}"` });
    return raw;
  }
}

function pick(overrides: ConfigOverrides, env: NodeJS.ProcessEnv, key: keyof ConfigOverrides, envKey: string): string | null {
  const override = overrides[key];
  if (typeof override === "string" && override.trim().length > 0) return override.trim();
  return readEnv(env, envKey);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, overrides: ConfigOverrides = {}): AppConfig {
  const problems: ConfigProblem[] = [];
  const warnings: string[] = [];

  const baseUrl = parseUrl(
    pick(overrides, env, "sts2BaseUrl", "STS2_BASE_URL") ?? DEFAULTS.sts2BaseUrl,
    "STS2_BASE_URL",
    problems,
  );
  const portScan = parsePortRange(readEnv(env, "STS2_PORT_SCAN") ?? DEFAULTS.sts2PortScan, "STS2_PORT_SCAN", problems);
  const sts2TimeoutMs = parseInteger(
    readEnv(env, "STS2_TIMEOUT_MS") ?? String(DEFAULTS.sts2TimeoutMs),
    "STS2_TIMEOUT_MS",
    problems,
    { min: 250, max: 120_000 },
  );

  const jevApiKey = pick(overrides, env, "jevApiKey", "TYPESAFE_API_KEY");
  const jevBaseUrlRaw = readEnv(env, "TYPESAFE_BASE_URL");
  const jevBaseUrl = jevBaseUrlRaw ? parseUrl(jevBaseUrlRaw, "TYPESAFE_BASE_URL", problems) : null;
  const jevModel = pick(overrides, env, "jevModel", "JEV_MODEL") ?? DEFAULTS.jevModel;

  const modesRaw = (pick(overrides, env, "mode", "MODE") ?? DEFAULTS.mode).toLowerCase();
  if (!MODES.includes(modesRaw as Mode)) {
    problems.push({ field: "MODE", message: `expected one of ${MODES.join(", ")}, got "${modesRaw}"` });
  }
  const mode = (MODES.includes(modesRaw as Mode) ? modesRaw : DEFAULTS.mode) as Mode;

  const runStartRaw = (readEnv(env, "RUN_START") ?? DEFAULTS.runStart).toLowerCase();
  if (!RUN_STARTS.includes(runStartRaw as RunStart)) {
    problems.push({ field: "RUN_START", message: `expected one of ${RUN_STARTS.join(", ")}, got "${runStartRaw}"` });
  }
  const runStart = (RUN_STARTS.includes(runStartRaw as RunStart) ? runStartRaw : DEFAULTS.runStart) as RunStart;
  const character = readEnv(env, "CHARACTER");
  // The knowledge id of the character played (knowledge/files.ts): the game's character_id lower-cased; the Ironclad
  // when CHARACTER is unset.
  const characterId = character === null ? DEFAULT_CHARACTER : characterKey(character);
  if (characterId === null) {
    problems.push({ field: "CHARACTER", message: `expected a character id such as IRONCLAD or SILENT, got "${character}"` });
  }
  const shopDiscardPotions = (readEnv(env, "SHOP_DISCARD_POTIONS") ?? DEFAULTS.shopDiscardPotions)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const allowFtueModals = parseBoolean(
    readEnv(env, "ALLOW_FTUE_MODALS") ?? String(DEFAULTS.allowFtueModals),
    "ALLOW_FTUE_MODALS",
    problems,
  );
  const strictJev =
    overrides.allowFallback === true
      ? false
      : parseBoolean(readEnv(env, "STRICT_JEV") ?? String(DEFAULTS.strictJev), "STRICT_JEV", problems);

  let deepseekKey = readEnv(env, "DEEPSEEK_API_KEY") ?? "";
  const deepseekKeyFile = readEnv(env, "DEEPSEEK_API_KEY_FILE");
  if (!deepseekKey && deepseekKeyFile) {
    try {
      deepseekKey = readFileSync(fromRoot(deepseekKeyFile.replace(/^~(?=\/)/, process.env["HOME"] ?? "~")), "utf8").trim();
    } catch {
      problems.push({ field: "DEEPSEEK_API_KEY_FILE", message: "could not read the key file" });
    }
  }
  const deepseek = deepseekKey
    ? {
        apiKey: deepseekKey,
        baseUrl: readEnv(env, "DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com",
        model: readEnv(env, "DEEPSEEK_MODEL") ?? "deepseek-chat",
        // BUILD_DECIDER=deepseek: ~25 (act-1 death) to ~80 (full run) build/route/rest questions a run,
        // plus run plans; 300 leaves room for restarts within a run.
        maxCalls: Number(readEnv(env, "DEEPSEEK_MAX_CALLS") ?? "300") || 300,
        timeoutMs: Number(readEnv(env, "DEEPSEEK_TIMEOUT_MS") ?? "30000") || 30000,
        // The played character's own guide and handbook (a character without them has none: llm/deepseek.ts reads them optionally).
        guideFile: fromRoot(readEnv(env, "DEEPSEEK_GUIDE_FILE") ?? knowledgeFile(KNOWLEDGE_DIR, `${characterId ?? DEFAULT_CHARACTER}-guide.md`, characterId ?? DEFAULT_CHARACTER)),
        handbookFile: fromRoot(readEnv(env, "DEEPSEEK_HANDBOOK_FILE") ?? knowledgeFile(KNOWLEDGE_DIR, "ds-handbook.md", characterId ?? DEFAULT_CHARACTER)),
        reasoningEffort: readEnv(env, "DEEPSEEK_REASONING_EFFORT") ?? "off",
        combatReasoningEffort: readEnv(env, "DEEPSEEK_COMBAT_REASONING_EFFORT") ?? "",
        // Per-label tiers, "label-prefix=effort,…"; unset = DEFAULT_EFFORT_BY_LABEL (llm/deepseek.ts); "-" = none.
        ...(readEnv(env, "DEEPSEEK_EFFORT_BY_LABEL") === null ? {} : { effortByLabel: readEnv(env, "DEEPSEEK_EFFORT_BY_LABEL")! }),
        reasoningLog: fromRoot(readEnv(env, "DEEPSEEK_REASONING_LOG") ?? "logs/deepseek-reasoning.jsonl"),
        // The day's guide/handbook with their data facts filled (llm/deepseek.ts frozenGuideFacts); "" = fill at every start.
        factsSnapshotDir: fromRoot(readEnv(env, "DEEPSEEK_FACTS_SNAPSHOT_DIR") ?? "logs/guide-facts"),
      }
    : null;

  const chainRaw = (readEnv(env, "ESCALATION_CHAIN") ?? "claude,deepseek").toLowerCase();
  const escalation = {
    chain: chainRaw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry): entry is "claude" | "deepseek" => entry === "claude" || entry === "deepseek"),
    claudeDir: fromRoot(readEnv(env, "CLAUDE_ESCALATION_DIR") ?? "./logs/escalation"),
    claudeTimeoutMs: Number(readEnv(env, "CLAUDE_ESCALATION_TIMEOUT_MS") ?? "90000") || 90000,
    claudeMaxCalls: Number(readEnv(env, "CLAUDE_MAX_CALLS") ?? "60") || 60,
  };

  const combatPlannerRaw = (readEnv(env, "COMBAT_PLANNER") ?? DEFAULTS.combatPlanner).toLowerCase();
  if (combatPlannerRaw !== "turn" && combatPlannerRaw !== "card") {
    problems.push({ field: "COMBAT_PLANNER", message: `expected turn or card, got "${combatPlannerRaw}"` });
  }
  const combatPlanner: "turn" | "card" = combatPlannerRaw === "card" ? "card" : "turn";

  const jevContextRaw = (readEnv(env, "JEV_CONTEXT") ?? "off").toLowerCase();
  if (jevContextRaw !== "off" && jevContextRaw !== "v1") {
    problems.push({ field: "JEV_CONTEXT", message: `expected off or v1, got "${jevContextRaw}"` });
  }
  const jevContext: JevContextVersion = jevContextRaw === "v1" ? "v1" : "off";

  const fightPlanRaw = (readEnv(env, "FIGHT_PLAN") ?? "off").toLowerCase();
  if (fightPlanRaw !== "off" && fightPlanRaw !== "v1") {
    problems.push({ field: "FIGHT_PLAN", message: `expected off or v1, got "${fightPlanRaw}"` });
  }
  const fightPlan: "off" | "v1" = fightPlanRaw === "v1" ? "v1" : "off";
  const fightPlanLog = fromRoot(readEnv(env, "FIGHT_PLAN_LOG") ?? "logs/fight-plans.jsonl");
  const runPlanRaw = (readEnv(env, "RUN_PLAN") ?? "off").toLowerCase();
  if (runPlanRaw !== "off" && runPlanRaw !== "v1") {
    problems.push({ field: "RUN_PLAN", message: `expected off or v1, got "${runPlanRaw}"` });
  }
  const runPlan: "off" | "v1" = runPlanRaw === "v1" ? "v1" : "off";
  const runPlanLog = fromRoot(readEnv(env, "RUN_PLAN_LOG") ?? "logs/run-plans.jsonl");
  // An unreadable RUN_PLAN_MERGE is a warning, not a start-up error: the default (on) applies.
  const runPlanMergeProblems: ConfigProblem[] = [];
  const runPlanMerge = parseOnOff(readEnv(env, "RUN_PLAN_MERGE"), "RUN_PLAN_MERGE", runPlanMergeProblems) ?? true;
  for (const problem of runPlanMergeProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const buildDeciderRaw = (readEnv(env, "BUILD_DECIDER") ?? "deepseek").toLowerCase();
  if (buildDeciderRaw !== "deepseek" && buildDeciderRaw !== "jev") {
    problems.push({ field: "BUILD_DECIDER", message: `expected deepseek or jev, got "${buildDeciderRaw}"` });
  }
  const buildDecider: "deepseek" | "jev" = buildDeciderRaw === "jev" ? "jev" : "deepseek";
  const buildOneshotRaw = (readEnv(env, "BUILD_ONESHOT") ?? "on").toLowerCase();
  if (buildOneshotRaw !== "on" && buildOneshotRaw !== "off") {
    problems.push({ field: "BUILD_ONESHOT", message: `expected on or off, got "${buildOneshotRaw}"` });
  }
  const buildOneshot: "on" | "off" = buildOneshotRaw === "off" ? "off" : "on";
  const bossSimBuildRaw = (readEnv(env, "BOSS_SIM_BUILD") ?? "on").toLowerCase();
  if (bossSimBuildRaw !== "on" && bossSimBuildRaw !== "off") {
    problems.push({ field: "BOSS_SIM_BUILD", message: `expected on or off, got "${bossSimBuildRaw}"` });
  }
  const bossSimBuild: "on" | "off" = bossSimBuildRaw === "off" ? "off" : "on";
  const combatDeepseekRaw = (readEnv(env, "COMBAT_DEEPSEEK") ?? "off").toLowerCase();
  if (combatDeepseekRaw !== "off" && combatDeepseekRaw !== "on") {
    problems.push({ field: "COMBAT_DEEPSEEK", message: `expected off or on, got "${combatDeepseekRaw}"` });
  }
  const combatDeepseek: "off" | "on" = combatDeepseekRaw === "on" ? "on" : "off";
  // An unreadable THIEF_FACTS is a warning, not a start-up error: the default (on) applies.
  const thiefFactsProblems: ConfigProblem[] = [];
  const thiefFacts = parseOnOff(readEnv(env, "THIEF_FACTS"), "THIEF_FACTS", thiefFactsProblems) ?? true;
  for (const problem of thiefFactsProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  // THIEF_COST likewise: an unreadable value warns and the default applies (on: Dai 2026-10-02, after the offline numbers in
  // notes/thief-cost-report.md).
  const thiefCostProblems: ConfigProblem[] = [];
  const thiefCost = parseOnOff(readEnv(env, "THIEF_COST"), "THIEF_COST", thiefCostProblems) ?? true;
  for (const problem of thiefCostProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  // An unreadable MECH_RULES is a warning too: the default (on) applies.
  const mechRulesProblems: ConfigProblem[] = [];
  const mechRules = parseOnOff(readEnv(env, "MECH_RULES"), "MECH_RULES", mechRulesProblems) ?? true;
  for (const problem of mechRulesProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  // MECH_MOVE_RULES likewise (on by default; it needs MECH_RULES on to do anything).
  const mechMoveRulesProblems: ConfigProblem[] = [];
  const mechMoveRules = parseOnOff(readEnv(env, "MECH_MOVE_RULES"), "MECH_MOVE_RULES", mechMoveRulesProblems) ?? true;
  for (const problem of mechMoveRulesProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  // MECH_DEATH_MOVE likewise (on by default; it needs MECH_RULES on to do anything).
  const mechDeathMoveProblems: ConfigProblem[] = [];
  const mechDeathMove = parseOnOff(readEnv(env, "MECH_DEATH_MOVE"), "MECH_DEATH_MOVE", mechDeathMoveProblems) ?? true;
  for (const problem of mechDeathMoveProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  // PASSIVE_PIECES likewise (on by default).
  const passivePiecesProblems: ConfigProblem[] = [];
  const passivePieces = parseOnOff(readEnv(env, "PASSIVE_PIECES"), "PASSIVE_PIECES", passivePiecesProblems) ?? true;
  for (const problem of passivePiecesProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  // SANDPIT_START likewise (on by default).
  const sandpitStartProblems: ConfigProblem[] = [];
  const sandpitStart = parseOnOff(readEnv(env, "SANDPIT_START"), "SANDPIT_START", sandpitStartProblems) ?? true;
  for (const problem of sandpitStartProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  // CARD_CONDITIONS likewise (on by default).
  const cardConditionsProblems: ConfigProblem[] = [];
  const cardConditions = parseOnOff(readEnv(env, "CARD_CONDITIONS"), "CARD_CONDITIONS", cardConditionsProblems) ?? true;
  for (const problem of cardConditionsProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const decisionLog = fromRoot(readEnv(env, "DECISION_LOG") ?? DEFAULTS.decisionLog);
  const slLogRaw = readEnv(env, "SL_LOG");
  const sl: SlConfig = {
    enabled: parseOnOff(readEnv(env, "SL_ENABLED"), "SL_ENABLED", problems) ?? true,
    bossRetries: parseInteger(readEnv(env, "SL_BOSS_RETRIES") ?? "5", "SL_BOSS_RETRIES", problems, { min: 0, max: 20 }),
    eliteRetries: parseInteger(readEnv(env, "SL_ELITE_RETRIES") ?? "3", "SL_ELITE_RETRIES", problems, { min: 0, max: 20 }),
    act3LowHp: parseOnOff(readEnv(env, "SL_ACT3_LOW_HP"), "SL_ACT3_LOW_HP", problems) ?? true,
    act3LowHpPct: parseInteger(readEnv(env, "SL_ACT3_LOW_HP_PCT") ?? "50", "SL_ACT3_LOW_HP_PCT", problems, { min: 0, max: 100 }),
    act2LowHp: parseOnOff(readEnv(env, "SL_ACT2_LOW_HP"), "SL_ACT2_LOW_HP", problems) ?? true,
    act2LowHpPct: parseInteger(readEnv(env, "SL_ACT2_LOW_HP_PCT") ?? "50", "SL_ACT2_LOW_HP_PCT", problems, { min: 0, max: 100 }),
    retryShowSim: parseOnOff(readEnv(env, "SL_RETRY_SHOW_SIM"), "SL_RETRY_SHOW_SIM", problems) ?? true,
    retryMemo: parseOnOff(readEnv(env, "SL_RETRY_MEMO"), "SL_RETRY_MEMO", problems) ?? true,
    retryKnownDraws: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_DRAWS"), "SL_RETRY_KNOWN_DRAWS", problems) ?? true,
    retryCompute: parseOnOff(readEnv(env, "SL_RETRY_COMPUTE"), "SL_RETRY_COMPUTE", problems) ?? true,
    judgeKnownDraws: parseOnOff(readEnv(env, "SL_JUDGE_KNOWN_DRAWS"), "SL_JUDGE_KNOWN_DRAWS", problems) ?? true,
    judgeAnyDraw: parseOnOff(readEnv(env, "SL_JUDGE_ANY_DRAW"), "SL_JUDGE_ANY_DRAW", problems) ?? true,
    reloadEarly: parseOnOff(readEnv(env, "SL_RELOAD_EARLY"), "SL_RELOAD_EARLY", problems) ?? true,
    reloadOnRevive: parseOnOff(readEnv(env, "SL_RELOAD_ON_REVIVE"), "SL_RELOAD_ON_REVIVE", problems) ?? false,
    retryKnownInserts: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_INSERTS"), "SL_RETRY_KNOWN_INSERTS", problems) ?? true,
    retryKnownTop: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_TOP"), "SL_RETRY_KNOWN_TOP", problems) ?? true,
    retryExplore: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE"), "SL_RETRY_EXPLORE", problems) ?? true,
    retryExploreB2: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_B2"), "SL_RETRY_EXPLORE_B2", problems) ?? true,
    retryExploreBossPotions: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_BOSS_POTIONS"), "SL_RETRY_EXPLORE_BOSS_POTIONS", problems) ?? true,
    retryExploreOrder: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_ORDER"), "SL_RETRY_EXPLORE_ORDER", problems) ?? true,
    retryExploreReplay: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REPLAY"), "SL_RETRY_EXPLORE_REPLAY", problems) ?? true,
    retryExploreReplayPlays: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REPLAY_PLAYS"), "SL_RETRY_EXPLORE_REPLAY_PLAYS", problems) ?? true,
    retryExploreReplayDeviate: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REPLAY_DEVIATE"), "SL_RETRY_EXPLORE_REPLAY_DEVIATE", problems) ?? true,
    retryExploreKeyCounters: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_KEY_COUNTERS"), "SL_RETRY_EXPLORE_KEY_COUNTERS", problems) ?? true,
    retryExploreSecond: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_SECOND"), "SL_RETRY_EXPLORE_SECOND", problems) ?? true,
    retryExploreReplayOrder: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REPLAY_ORDER"), "SL_RETRY_EXPLORE_REPLAY_ORDER", problems) ?? true,
    retryExploreReplayCode: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REPLAY_CODE"), "SL_RETRY_EXPLORE_REPLAY_CODE", problems) ?? true,
    retryExploreTargetTurn: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_TARGET_TURN"), "SL_RETRY_EXPLORE_TARGET_TURN", problems) ?? true,
    retryExploreRearm: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REARM"), "SL_RETRY_EXPLORE_REARM", problems) ?? true,
    retryExploreWasted: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_WASTED"), "SL_RETRY_EXPLORE_WASTED", problems) ?? true,
    retryExploreAnchor: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_ANCHOR"), "SL_RETRY_EXPLORE_ANCHOR", problems) ?? true,
    retryExploreCanon: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_CANON"), "SL_RETRY_EXPLORE_CANON", problems) ?? true,
    retryExploreTurn: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_TURN"), "SL_RETRY_EXPLORE_TURN", problems) ?? true,
    retryExploreWhole: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_WHOLE"), "SL_RETRY_EXPLORE_WHOLE", problems) ?? true,
    retryExploreWhere: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_WHERE"), "SL_RETRY_EXPLORE_WHERE", problems) ?? true,
    retryExplorePotion: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_POTION"), "SL_RETRY_EXPLORE_POTION", problems) ?? true,
    retryKnownPicks: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_PICKS"), "SL_RETRY_KNOWN_PICKS", problems) ?? true,
    retryKnownOffTop: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_OFF_TOP"), "SL_RETRY_KNOWN_OFF_TOP", problems) ?? true,
    retryKnownHandOrder: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_HAND_ORDER"), "SL_RETRY_KNOWN_HAND_ORDER", problems) ?? true,
    log: slLogRaw === null ? join(dirname(decisionLog), "sl-attempts.jsonl") : /^(off|none|false|0)$/i.test(slLogRaw) ? null : fromRoot(slLogRaw),
    stepTimeoutMs: parseInteger(readEnv(env, "SL_STEP_TIMEOUT_MS") ?? "60000", "SL_STEP_TIMEOUT_MS", problems, { min: 1000, max: 600_000 }),
  };
  const brain = readBrainConfig(env, problems);

  const logLevelRaw = (readEnv(env, "LOG_LEVEL") ?? DEFAULTS.logLevel).toLowerCase();
  if (!LOG_LEVELS.includes(logLevelRaw as LogLevel)) {
    problems.push({ field: "LOG_LEVEL", message: `expected one of ${LOG_LEVELS.join(", ")}, got "${logLevelRaw}"` });
  }
  const logLevel = (LOG_LEVELS.includes(logLevelRaw as LogLevel) ? logLevelRaw : DEFAULTS.logLevel) as LogLevel;

  const confidenceAct = parseRatio(readEnv(env, "CONFIDENCE_ACT") ?? String(DEFAULTS.confidenceAct), "CONFIDENCE_ACT", problems);
  const confidenceStrong = parseRatio(
    readEnv(env, "CONFIDENCE_STRONG") ?? String(DEFAULTS.confidenceStrong),
    "CONFIDENCE_STRONG",
    problems,
  );
  if (confidenceAct > confidenceStrong) {
    warnings.push(
      `CONFIDENCE_ACT (${confidenceAct}) is above CONFIDENCE_STRONG (${confidenceStrong}); the strong tier is unreachable`,
    );
  }

  const maxRequests = parseInteger(
    readEnv(env, "MAX_REQUESTS") ?? String(DEFAULTS.maxRequests),
    "MAX_REQUESTS",
    problems,
    { min: 1, max: 1_000_000 },
  );
  const maxTokens = parseCount(readEnv(env, "MAX_TOKENS") ?? DEFAULTS.maxTokens, "MAX_TOKENS", problems);

  const enricherEnabled = parseBoolean(
    readEnv(env, "ENRICHER_ENABLED") ?? String(DEFAULTS.enricherEnabled),
    "ENRICHER_ENABLED",
    problems,
  );
  const enricherBaseUrlRaw = readEnv(env, "ENRICHER_BASE_URL");
  const enricherBaseUrl = enricherBaseUrlRaw
    ? parseUrl(enricherBaseUrlRaw, "ENRICHER_BASE_URL", problems)
    : null;
  const enricherApiKey = readEnv(env, "ENRICHER_API_KEY");
  const enricherModel = readEnv(env, "ENRICHER_MODEL");
  const enricherTasks = (readEnv(env, "ENRICHER_TASKS") ?? DEFAULTS.enricherTasks)
    .split(",")
    .map((task) => task.trim())
    .filter((task) => task.length > 0);
  if (enricherEnabled && !enricherBaseUrl) {
    problems.push({ field: "ENRICHER_BASE_URL", message: "required when ENRICHER_ENABLED=true" });
  }
  if (enricherEnabled && !enricherModel) {
    problems.push({ field: "ENRICHER_MODEL", message: "required when ENRICHER_ENABLED=true" });
  }

  if (problems.length > 0) throw new ConfigError(problems);

  return {
    sts2: { baseUrl, portScan, timeoutMs: sts2TimeoutMs },
    jev: {
      apiKey: jevApiKey,
      baseUrl: jevBaseUrl,
      model: jevModel,
      timeoutMs: DEFAULTS.jevTimeoutMs,
      maxRetries: DEFAULTS.jevMaxRetries,
    },
    enricher: {
      enabled: enricherEnabled,
      baseUrl: enricherBaseUrl,
      apiKey: enricherApiKey,
      model: enricherModel,
      tasks: enricherTasks,
    },
    thresholds: { act: confidenceAct, strong: confidenceStrong },
    budgets: { maxRequests, maxTokens },
    run: { start: runStart, character, characterId: characterId ?? DEFAULT_CHARACTER },
    shop: { discardPotions: shopDiscardPotions },
    allowFtueModals,
    strictJev,
    combatPlanner,
    jevContext,
    fightPlan,
    fightPlanLog,
    runPlan,
    runPlanLog,
    runPlanMerge,
    buildDecider,
    buildOneshot,
    bossSimBuild,
    combatDeepseek,
    thiefFacts,
    thiefCost,
    mechRules,
    mechMoveRules,
    mechDeathMove,
    passivePieces,
    sandpitStart,
    cardConditions,
    sl,
    brain,
    deepseek,
    escalation,
    mode,
    log: { level: logLevel, decisionLog, ...jevPromptLogConfig(readEnv(env, "JEV_PROMPT_LOG")), ...runConfigLogConfig(readEnv(env, "RUN_CONFIG_LOG")) },
    warnings,
  };
}

/** JEV_PROMPT_LOG: a path, or off/none/false to log no prompts; unset leaves the default (next to the decision log). */
function jevPromptLogConfig(raw: string | null): { jevPromptLog?: string | null } {
  if (raw === null) return {};
  return /^(off|none|false|0)$/i.test(raw) ? { jevPromptLog: null } : { jevPromptLog: fromRoot(raw) };
}

/** RUN_CONFIG_LOG: a path, or off/none/false to write no run configuration; unset leaves the default (next to the decision log). */
function runConfigLogConfig(raw: string | null): { runConfigLog?: string | null } {
  if (raw === null) return {};
  return /^(off|none|false|0)$/i.test(raw) ? { runConfigLog: null } : { runConfigLog: fromRoot(raw) };
}

/** Throws a ConfigError with an actionable message when the Jev key is missing. */
export function requireJevApiKey(config: AppConfig): string {
  if (!config.jev.apiKey) {
    throw new ConfigError([
      {
        field: "TYPESAFE_API_KEY",
        message:
          "missing. Set it in the environment or in .env (copy .env.example), " +
          "create a key at https://console.typesafe.ai/settings/keys, " +
          "or pass --no-jev to skip the Jev checks",
      },
    ]);
  }
  return config.jev.apiKey;
}
