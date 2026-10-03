/**
 * Boards for the SL tests (tests/sl.test.ts, tests/sl-loop.test.ts): a boss fight on a turn the enemy turn kills us
 * after, its first turn again, the main menu in between. Built on the scenario payloads.
 */
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { baseState, combatPayload } from "./scenarios.js";

type Raw = Record<string, unknown>;

export interface BossBoard {
  turn?: number;
  hp?: number;
  block?: number;
  /** The boss's attack: damage x hits. */
  damage?: number;
  hits?: number;
  /** The mod's end_turn_will_kill_player. */
  lethal?: boolean;
  /** Cards left that can be played (default none). */
  playable?: boolean;
  /** A potion that can be drunk (default none). */
  potion?: boolean;
  enemyIds?: string[];
  floor?: number;
  /** The run's act_id (0-based; default the scenario's "1", act 2). */
  actId?: string;
  /** Our max HP (default the scenario's 80). */
  maxHp?: number;
  runId?: string;
  playerPowers?: Raw[];
  relics?: string[];
  potionIds?: string[];
  ready?: boolean;
}

/** A boss fight board (TEST_SUBJECT is a Boss in testKnowledge). */
export function bossBoard(options: BossBoard = {}): Raw {
  const payload = combatPayload({ noPlayableCards: options.playable !== true, lethalEndTurn: options.lethal ?? true });
  payload["turn"] = options.turn ?? 3;
  if (options.runId) payload["run_id"] = options.runId;
  const combat = payload["combat"] as Raw;
  const player = combat["player"] as Raw;
  player["current_hp"] = options.hp ?? 10;
  if (options.maxHp !== undefined) player["max_hp"] = options.maxHp;
  player["block"] = options.block ?? 0;
  player["energy"] = options.playable ? 3 : 0;
  if (options.playerPowers) player["powers"] = options.playerPowers;
  (combat["action_readiness"] as Raw)["can_use_combat_actions"] = options.ready ?? true;
  const damage = options.damage ?? 30;
  const hits = options.hits ?? 1;
  combat["enemies"] = (options.enemyIds ?? ["TEST_SUBJECT"]).map((id, index) => ({
    index,
    enemy_id: id,
    name: id === "TEST_SUBJECT" ? "Test Subject" : id,
    current_hp: 80,
    max_hp: 100,
    block: 0,
    is_alive: true,
    is_hittable: true,
    powers: [],
    intent: "ATTACK",
    move_id: "ATTACK",
    intents: index === 0 ? [{ index: 0, intent_type: "Attack", label: hits > 1 ? `${damage}x${hits}` : String(damage), damage, hits, total_damage: damage * hits, status_card_count: null }] : [],
  }));
  const run = payload["run"] as Raw;
  run["floor"] = options.floor ?? 17;
  run["current_hp"] = options.hp ?? 10;
  if (options.maxHp !== undefined) run["max_hp"] = options.maxHp;
  if (options.actId !== undefined) run["act_id"] = options.actId;
  if (options.relics) run["relics"] = options.relics.map((id, index) => ({ index, relic_id: id, name: id, description: "", stack: null, is_melted: false }));
  const potions = run["potions"] as Raw[];
  potions[0]!["can_use"] = options.potion === true;
  if (options.potionIds) {
    run["potions"] = options.potionIds.map((id, index) => ({ index, potion_id: id, name: id, occupied: true, can_use: false, can_discard: true, requires_target: false, valid_target_indices: [] }));
  }
  payload["available_actions"] = options.playable ? ["play_card", "end_turn", "save_and_quit"] : ["end_turn", "save_and_quit"];
  return payload;
}

export function menuBoard(continueRun = true): Raw {
  return baseState("MAIN_MENU", {
    run_id: "run_unknown",
    session: { mode: "singleplayer", phase: "menu", control_scope: "local_player" },
    run: null,
    available_actions: continueRun ? ["continue_run", "open_character_select", "switch_profile"] : ["open_character_select", "switch_profile"],
  });
}

export function mapBoard(floor = 17): Raw {
  return baseState("MAP", { available_actions: ["choose_map_node", "save_and_quit"], run: { ...(baseState("MAP")["run"] as Raw), floor } });
}

export function state(raw: Raw): GameState {
  return parseGameState(raw);
}
