/**
 * Raw `/state` payloads shaped like the live mod's (verified against a running game: state model 16,
 * protocol 2026-03-11-v1). They are the input to the decision layer tests, so a field rename in the
 * mod shows up here as a failing test rather than as a silent no-op in a run.
 */

import { makeKnowledge, type Knowledge } from "../src/knowledge/index.js";

export const testKnowledge: Knowledge = makeKnowledge({
  cards: [
    { id: "STRIKE_R", name: "Strike", type: "Attack", rarity: "Starter", cost: 1, description: "Deal 6 damage.", target: "AnyEnemy", keywords: [], tags: [] },
    { id: "DEFEND_R", name: "Defend", type: "Skill", rarity: "Starter", cost: 1, description: "Gain 5 Block.", target: "Self", keywords: [], tags: [] },
    { id: "BASH", name: "Bash", type: "Attack", rarity: "Starter", cost: 2, description: "Deal 8 damage. Apply 2 Vulnerable.", target: "AnyEnemy", keywords: [], tags: [] },
    { id: "POMMEL_STRIKE", name: "Pommel Strike", type: "Attack", rarity: "Common", cost: 1, description: "Deal 9 damage. Draw 1 card.", target: "AnyEnemy", keywords: [], tags: [] },
    { id: "ANGER", name: "Anger", type: "Attack", rarity: "Common", cost: 0, description: "Deal 6 damage.", target: "AnyEnemy", keywords: [], tags: [] },
    { id: "INFLAME", name: "Inflame", type: "Power", rarity: "Uncommon", cost: 1, description: "Gain 2 Strength.", target: "Self", keywords: [], tags: [] },
    { id: "SHRUG_IT_OFF", name: "Shrug It Off", type: "Skill", rarity: "Common", cost: 1, description: "Gain 8 Block. Draw 1 card.", target: "Self", keywords: [], tags: [] },
    { id: "CRIMSON_MANTLE", name: "Crimson Mantle", type: "Power", rarity: "Rare", cost: 1, description: "At the start of your turn, lose 1 HP and gain 7 Block.", target: "Self", keywords: [], tags: [] },
  ],
  monsters: [
    { id: "JAW_WORM", name: "Jaw Worm", type: "Monster", min_hp: 40, max_hp: 44, moves: [] },
    { id: "CULTIST", name: "Cultist", type: "Monster", min_hp: 48, max_hp: 54, moves: [] },
  ],
  relics: [
    { id: "BURNING_BLOOD", name: "Burning Blood", description: "At the end of combat, heal 6 HP.", rarity: "Starter" },
    { id: "VAJRA", name: "Vajra", description: "Start each combat with 1 Strength.", rarity: "Common" },
  ],
  potions: [
    { id: "FIRE_POTION", name: "Fire Potion", description: "Deal 20 damage to target enemy.", rarity: "Common", usage: "CombatOnly", target_type: "AnyEnemy" },
    { id: "FOUL_POTION", name: "Foul Potion", description: "Deal damage to ALL players and enemies.", rarity: "Rare", usage: "AnyTime", target_type: "AllEnemies" },
  ],
  powers: [{ id: "VULNERABLE", name: "Vulnerable", description: "Takes 50% more damage.", type: "Debuff" }],
  events: [{ id: "BIG_FISH", name: "Big Fish", description: "A large fish offers you a choice.", options: [] }],
  characters: [{ id: "IRONCLAD", name: "The Ironclad" }],
}, "cache");

type Raw = Record<string, unknown>;

function handCard(index: number, cardId: string, overrides: Raw = {}): Raw {
  return {
    index,
    card_id: cardId,
    name: cardId,
    upgraded: false,
    target_type: "AnyEnemy",
    requires_target: true,
    costs_x: false,
    star_costs_x: false,
    energy_cost: 1,
    star_cost: 0,
    rules_text: "",
    resolved_rules_text: "",
    dynamic_values: [],
    playable: true,
    unplayable_reason: null,
    can_play_result: true,
    target_index_space: "combat.enemies[].index",
    valid_target_indices: [0, 1],
    ...overrides,
  };
}

function enemy(index: number, enemyId: string, hp: number, damage: number, overrides: Raw = {}): Raw {
  return {
    index,
    enemy_id: enemyId,
    name: enemyId,
    current_hp: hp,
    max_hp: hp,
    block: 0,
    is_alive: true,
    is_hittable: true,
    powers: [],
    intent: "ATTACK",
    move_id: "ATTACK",
    intents: [{ index: 0, intent_type: "Attack", label: String(damage), damage, hits: 1, total_damage: damage, status_card_count: null }],
    ...overrides,
  };
}

function deckCard(index: number, cardId: string, type: string, cost: number, upgraded = false): Raw {
  return { index, card_id: cardId, name: cardId, upgraded, card_type: type, rarity: "Common", costs_x: false, star_costs_x: false, energy_cost: cost, star_cost: 0, rules_text: "", resolved_rules_text: "", dynamic_values: [] };
}

export function runPayload(overrides: Raw = {}): Raw {
  return {
    floor: 9,
    current_hp: 55,
    max_hp: 80,
    gold: 214,
    max_energy: 3,
    act_id: "1",
    boss_id: "SLIME_BOSS",
    ascension: 0,
    character_name: "Ironclad",
    ascension_effects: [],
    deck: [
      deckCard(0, "STRIKE_R", "Attack", 1),
      deckCard(1, "STRIKE_R", "Attack", 1),
      deckCard(2, "DEFEND_R", "Skill", 1),
      deckCard(3, "BASH", "Attack", 2, true),
      deckCard(4, "INFLAME", "Power", 1),
    ],
    relics: [{ index: 0, relic_id: "BURNING_BLOOD", name: "Burning Blood", description: "", stack: null, is_melted: false }],
    potions: [
      { index: 0, potion_id: "FIRE_POTION", name: "Fire Potion", description: "Deal 20 damage.", rarity: "Common", occupied: true, usage: "CombatOnly", target_type: "AnyEnemy", is_queued: false, requires_target: true, can_use: true, can_discard: true, target_index_space: "combat.enemies[].index", valid_target_indices: [0, 1] },
      { index: 1, potion_id: null, name: null, description: null, rarity: null, occupied: false, usage: null, target_type: null, is_queued: false, requires_target: false, can_use: false, can_discard: false, target_index_space: null, valid_target_indices: [] },
    ],
    players: [],
    ...overrides,
  };
}

export function baseState(screen: string, overrides: Raw = {}): Raw {
  return {
    state_version: 16,
    native_profile_id: 1,
    run_id: "TESTRUN123",
    screen,
    session: { mode: "singleplayer", phase: "run", control_scope: "local_player" },
    in_combat: false,
    turn: null,
    available_actions: [],
    combat: null,
    run: runPayload(),
    map: null,
    reward: null,
    selection: null,
    chest: null,
    event: null,
    crystal_sphere: null,
    shop: null,
    rest: null,
    character_select: null,
    timeline: null,
    unlock: null,
    bundles: null,
    capstone: null,
    modal: null,
    game_over: null,
    multiplayer: { is_multiplayer: false, net_game_type: "singleplayer", local_player_id: "p1", player_count: 1, connected_player_ids: ["p1"] },
    ...overrides,
  };
}

export function combatPayload(
  options: {
    lethalEndTurn?: boolean;
    noPlayableCards?: boolean;
    /** Give the first enemy this much Vulnerable, i.e. a target-side damage modifier. */
    enemyVulnerable?: number;
    /** Give the player this much Vulnerable, i.e. an incoming-damage modifier. */
    playerVulnerable?: number;
    /** Give the player this much Weak. */
    playerWeak?: number;
    enemyHp?: number;
  } = {},
): Raw {
  const hand = options.noPlayableCards
    ? [handCard(0, "STRIKE_R", { playable: false, unplayable_reason: "not_enough_energy", energy_cost: 3 })]
    : [
        handCard(0, "STRIKE_R", { energy_cost: 1, dynamic_values: [{ name: "Damage", base_value: 6, current_value: 6 }] }),
        handCard(1, "DEFEND_R", { requires_target: false, target_type: "Self", valid_target_indices: [], energy_cost: 1, dynamic_values: [{ name: "Block", base_value: 5, current_value: 5 }] }),
        handCard(2, "BASH", { energy_cost: 2, dynamic_values: [{ name: "Damage", base_value: 8, current_value: 8 }] }),
      ];
  const payload = baseState("COMBAT", {
    in_combat: true,
    turn: 3,
    available_actions: options.noPlayableCards ? ["end_turn", "use_potion"] : ["play_card", "end_turn", "use_potion"],
    combat: {
      action_readiness: { can_use_combat_actions: true, reason: "ready", snapshot_stable: true },
      player: { current_hp: 55, max_hp: 80, block: 0, energy: 3, stars: 0, focus: 0, powers: [], orbs: [], pets: [], cards_played_this_turn: 0, attacks_played_this_turn: 0, skills_played_this_turn: 0 },
      players: [],
      hand,
      enemies: [
        enemy(0, "JAW_WORM", options.enemyHp ?? 42, 11, {
          powers:
            options.enemyVulnerable === undefined
              ? []
              : [{ index: 0, power_id: "VULNERABLE_POWER", name: "Vulnerable", amount: options.enemyVulnerable, is_debuff: true }],
        }),
        enemy(1, "CULTIST", 48, 6),
      ],
      end_turn_will_kill_player: options.lethalEndTurn === true,
      lethal_risks: [],
    },
  });
  if (options.noPlayableCards) {
    // Nothing playable and nothing worth drinking: only end_turn should remain a candidate.
    const run = payload["run"] as Raw;
    for (const potion of run["potions"] as Raw[]) potion["can_use"] = false;
  }
  if (options.playerVulnerable !== undefined || options.playerWeak !== undefined) {
    const combat = payload["combat"] as Raw;
    const player = combat["player"] as Raw;
    const powers: Raw[] = [];
    if (options.playerVulnerable !== undefined) {
      powers.push({ index: 0, power_id: "VULNERABLE_POWER", name: "Vulnerable", amount: options.playerVulnerable, is_debuff: true });
    }
    if (options.playerWeak !== undefined) {
      powers.push({ index: powers.length, power_id: "WEAK_POWER", name: "Weak", amount: options.playerWeak, is_debuff: true });
    }
    player["powers"] = powers;
  }
  return payload;
}

export function mapPayload(): Raw {
  return baseState("MAP", {
    available_actions: ["choose_map_node", "save_and_quit"],
    map: {
      current_node: { row: 4, col: 2 },
      is_travel_enabled: true,
      is_traveling: false,
      map_generation_count: 1,
      rows: 15,
      cols: 7,
      starting_node: { row: 0, col: 3 },
      boss_node: { row: 14, col: 3 },
      second_boss_node: null,
      available_nodes: [
        { index: 0, row: 5, col: 1, node_type: "Elite", state: "Travelable", vote_count: 0, has_local_vote: false, voted_player_ids: [] },
        { index: 1, row: 5, col: 3, node_type: "Monster", state: "Travelable", vote_count: 0, has_local_vote: false, voted_player_ids: [] },
        { index: 2, row: 5, col: 4, node_type: "Shop", state: "Travelable", vote_count: 0, has_local_vote: false, voted_player_ids: [] },
      ],
      nodes: [
        { row: 4, col: 2, node_type: "Monster", state: "Traveled", visited: true, is_current: true, is_available: false, is_start: false, is_boss: false, is_second_boss: false, parents: [], children: [{ row: 5, col: 1 }, { row: 5, col: 3 }, { row: 5, col: 4 }] },
        { row: 5, col: 1, node_type: "Elite", state: "Travelable", visited: false, is_current: false, is_available: true, is_start: false, is_boss: false, is_second_boss: false, parents: [], children: [{ row: 6, col: 1 }] },
        { row: 5, col: 3, node_type: "Monster", state: "Travelable", visited: false, is_current: false, is_available: true, is_start: false, is_boss: false, is_second_boss: false, parents: [], children: [{ row: 6, col: 3 }] },
        { row: 5, col: 4, node_type: "Shop", state: "Travelable", visited: false, is_current: false, is_available: true, is_start: false, is_boss: false, is_second_boss: false, parents: [], children: [{ row: 6, col: 4 }] },
        { row: 6, col: 1, node_type: "Rest", state: "NotTravelable", visited: false, is_current: false, is_available: false, is_start: false, is_boss: false, is_second_boss: false, parents: [], children: [] },
        { row: 6, col: 3, node_type: "Monster", state: "NotTravelable", visited: false, is_current: false, is_available: false, is_start: false, is_boss: false, is_second_boss: false, parents: [], children: [] },
        { row: 6, col: 4, node_type: "Treasure", state: "NotTravelable", visited: false, is_current: false, is_available: false, is_start: false, is_boss: false, is_second_boss: false, parents: [], children: [] },
      ],
      local_vote: null,
      player_votes: [],
    },
  });
}

export function rewardCardPayload(): Raw {
  return baseState("REWARD", {
    available_actions: ["claim_reward", "choose_reward_card", "skip_reward_cards", "proceed"],
    reward: {
      pending_card_choice: true,
      can_proceed: false,
      rewards: [],
      card_options: [
        { index: 0, card_id: "POMMEL_STRIKE", name: "Pommel Strike", upgraded: false, rules_text: "", resolved_rules_text: "Deal 9 damage. Draw 1 card.", dynamic_values: [] },
        { index: 1, card_id: "SHRUG_IT_OFF", name: "Shrug It Off", upgraded: false, rules_text: "", resolved_rules_text: "Gain 8 Block. Draw 1 card.", dynamic_values: [] },
        { index: 2, card_id: "INFLAME", name: "Inflame", upgraded: false, rules_text: "", resolved_rules_text: "Gain 2 Strength.", dynamic_values: [] },
      ],
      alternatives: [{ index: 0, label: "Skip" }],
    },
  });
}

export function rewardClaimPayload(): Raw {
  return baseState("REWARD", {
    available_actions: ["claim_reward", "collect_rewards_and_proceed"],
    reward: {
      pending_card_choice: false,
      can_proceed: false,
      rewards: [
        { index: 0, reward_type: "Gold", description: "25 gold", claimable: true },
        { index: 1, reward_type: "Card", description: "Add a card", claimable: true },
      ],
      card_options: [],
      alternatives: [],
    },
  });
}

/** The reward screen right after `skip_reward_cards`: the card reward is still claimable. */
export function rewardAfterSkipPayload(): Raw {
  return baseState("REWARD", {
    available_actions: ["claim_reward", "collect_rewards_and_proceed"],
    reward: {
      pending_card_choice: false,
      can_proceed: true,
      rewards: [{ index: 0, reward_type: "Card", description: "Add a card to your deck.", claimable: true }],
      card_options: [],
      alternatives: [],
    },
  });
}

/** The same, but a gold reward is also outstanding and should still be collected. */
export function rewardAfterSkipWithGoldPayload(): Raw {
  return baseState("REWARD", {
    available_actions: ["claim_reward", "collect_rewards_and_proceed"],
    reward: {
      pending_card_choice: false,
      can_proceed: true,
      rewards: [
        { index: 0, reward_type: "Gold", description: "23 gold", claimable: true },
        { index: 1, reward_type: "Card", description: "Add a card to your deck.", claimable: true },
      ],
      card_options: [],
      alternatives: [],
    },
  });
}

export function selectionPayload(selected = 0): Raw {
  return baseState("CARD_SELECTION", {
    available_actions: selected > 0 ? ["select_deck_card", "confirm_selection"] : ["select_deck_card"],
    selection: {
      kind: "deck_upgrade_select",
      prompt: "Choose a card to upgrade.",
      min_select: 1,
      max_select: 1,
      selected_count: selected,
      can_confirm: selected > 0,
      cards: [
        { index: 0, selected: false, card_id: "STRIKE_R", name: "Strike", upgraded: false, card_type: "Attack", rarity: "Starter", costs_x: false, star_costs_x: false, energy_cost: 1, star_cost: 0, rules_text: "", resolved_rules_text: "", dynamic_values: [] },
        { index: 1, selected: false, card_id: "BASH", name: "Bash", upgraded: true, card_type: "Attack", rarity: "Starter", costs_x: false, star_costs_x: false, energy_cost: 2, star_cost: 0, rules_text: "", resolved_rules_text: "", dynamic_values: [] },
        { index: 2, selected: false, card_id: "DEFEND_R", name: "Defend", upgraded: false, card_type: "Skill", rarity: "Starter", costs_x: false, star_costs_x: false, energy_cost: 1, star_cost: 0, rules_text: "", resolved_rules_text: "", dynamic_values: [] },
      ],
    },
  });
}

export function shopPayload(open: boolean, options: { broke?: boolean; foulPotion?: boolean } = {}): Raw {
  const affordable = options.broke !== true;
  const price = (value: number): number => (affordable ? value : 0);
  const closedActions = ["open_shop_inventory", "proceed"];
  if (options.foulPotion === true) closedActions.push("discard_potion");
  const payload = baseState("SHOP", {
    available_actions: open ? ["buy_card", "buy_relic", "close_shop_inventory"] : closedActions,
    shop: {
      is_open: open,
      can_open: !open,
      can_close: open,
      cards: [
        { index: 0, name: "Pommel Strike", price: price(55), is_stocked: true, enough_gold: affordable, category: "attack", on_sale: false, card_id: "POMMEL_STRIKE", upgraded: false, card_type: "Attack", rarity: "Common", costs_x: false, star_costs_x: false, energy_cost: 1, star_cost: 0, rules_text: "", resolved_rules_text: "", dynamic_values: [] },
        // Deliberately unaffordable in the default fixture: the planner must filter it out.
        { index: 1, name: "Inflame", price: price(180), is_stocked: true, enough_gold: false, category: "power", on_sale: false, card_id: "INFLAME", upgraded: false, card_type: "Power", rarity: "Uncommon", costs_x: false, star_costs_x: false, energy_cost: 1, star_cost: 0, rules_text: "", resolved_rules_text: "", dynamic_values: [] },
      ],
      relics: [{ index: 0, name: "Vajra", price: price(150), is_stocked: true, enough_gold: affordable, relic_id: "VAJRA", rarity: "Common" }],
      potions: [],
      card_removal: { price: price(75), available: true, used: false, enough_gold: affordable },
    },
  });
  if (options.broke === true) {
    const run = payload["run"] as Raw;
    run["gold"] = 12;
  }
  if (options.foulPotion === true) {
    const run = payload["run"] as Raw;
    run["potions"] = [
      {
        index: 0,
        potion_id: "FOUL_POTION",
        name: "Foul Potion",
        description: "Deal damage to ALL players and enemies.",
        rarity: "Rare",
        occupied: true,
        usage: "AnyTime",
        target_type: "AllEnemies",
        is_queued: false,
        requires_target: false,
        can_use: true,
        can_discard: true,
        target_index_space: null,
        valid_target_indices: [],
      },
    ];
  }
  return payload;
}

export function eventPayload(): Raw {
  return baseState("EVENT", {
    available_actions: ["choose_event_option"],
    event: {
      event_id: "BIG_FISH",
      title: "Big Fish",
      description: "You find a large fish on the shore.",
      is_finished: false,
      options: [
        { index: 0, text_key: "BANANA", title: "Banana", description: "Heal 1/3 of your HP.", is_locked: false, is_proceed: false, will_kill_player: false, has_relic_preview: false },
        { index: 1, text_key: "DONUT", title: "Donut", description: "Heal 1/4 of your Max HP.", is_locked: true, is_proceed: false, will_kill_player: false, has_relic_preview: false },
        { index: 2, text_key: "BOX", title: "Box", description: "Obtain a relic, become cursed.", is_locked: false, is_proceed: false, will_kill_player: true, has_relic_preview: true },
        { index: 3, text_key: "LEAVE", title: "Leave", description: "Nothing happens.", is_locked: false, is_proceed: false, will_kill_player: false, has_relic_preview: false },
      ],
    },
  });
}

export function restPayload(): Raw {
  return baseState("REST", {
    available_actions: ["choose_rest_option"],
    rest: {
      options: [
        { index: 0, option_id: "HEAL", title: "Rest", description: "Heal 30% of Max HP.", is_enabled: true, requires_target: false, target_index_space: null, valid_target_indices: [], valid_target_player_ids: [] },
        { index: 1, option_id: "SMITH", title: "Smith", description: "Upgrade a card.", is_enabled: true, requires_target: false, target_index_space: null, valid_target_indices: [], valid_target_player_ids: [] },
        { index: 2, option_id: "DIG", title: "Dig", description: "Dig for a relic.", is_enabled: false, requires_target: false, target_index_space: null, valid_target_indices: [], valid_target_player_ids: [] },
      ],
    },
  });
}

export function chestPayload(opened: boolean, claimed = false): Raw {
  return baseState("CHEST", {
    available_actions: opened ? (claimed ? ["proceed"] : ["choose_treasure_relic", "proceed"]) : ["open_chest"],
    chest: {
      is_opened: opened,
      has_relic_been_claimed: claimed,
      relic_options: opened && !claimed
        ? [
            { index: 0, relic_id: "VAJRA", name: "Vajra", rarity: "Common" },
            { index: 1, relic_id: "BURNING_BLOOD", name: "Burning Blood", rarity: "Starter" },
          ]
        : [],
    },
  });
}

export function crystalPayload(): Raw {
  return baseState("CRYSTAL_SPHERE", {
    available_actions: ["crystal_clear_cell", "crystal_set_tool", "proceed"],
    crystal_sphere: {
      divinations_left: 3,
      tool: "big",
      is_finished: false,
      grid_width: 7,
      grid_height: 7,
      hidden_cells: Array.from({ length: 7 }, (_, x) => Array.from({ length: 7 }, (_, y) => [x, y])).flat(),
      items: [
        { kind: "relic", is_good: true, x: 1, y: 1, width: 2, height: 2, revealed: false, cells: [[1, 1], [2, 1], [1, 2], [2, 2]], hidden_cells: [[1, 1], [2, 1], [1, 2], [2, 2]] },
        { kind: "curse", is_good: false, x: 5, y: 5, width: 2, height: 2, revealed: false, cells: [[5, 5], [6, 5], [5, 6], [6, 6]], hidden_cells: [[5, 5], [6, 5], [5, 6], [6, 6]] },
      ],
    },
  });
}

export function mainMenuPayload(actions: string[] = ["continue_run", "open_character_select", "switch_profile"]): Raw {
  return baseState("MAIN_MENU", {
    session: { mode: "singleplayer", phase: "menu", control_scope: "local_player" },
    run: null,
    available_actions: actions,
  });
}

export function characterSelectPayload(canEmbark = false): Raw {
  return baseState("CHARACTER_SELECT", {
    session: { mode: "singleplayer", phase: "character_select", control_scope: "local_player" },
    run: null,
    available_actions: canEmbark ? ["embark", "unready"] : ["select_character"],
    character_select: {
      selected_character_id: canEmbark ? "IRONCLAD" : null,
      is_multiplayer: false,
      net_game_type: "singleplayer",
      can_embark: canEmbark,
      can_unready: false,
      characters: [
        { index: 0, character_id: "IRONCLAD", name: "The Ironclad", is_locked: false, is_selected: canEmbark },
        { index: 1, character_id: "SILENT", name: "The Silent", is_locked: true, is_selected: false },
      ],
    },
  });
}

export function modalPayload(): Raw {
  return baseState("MODAL", {
    available_actions: ["confirm_modal"],
    modal: { type_name: "ConfirmDialog", can_confirm: true, can_dismiss: false, underlying_screen: "MAP" },
  });
}

export function gameOverPayload(): Raw {
  return baseState("GAME_OVER", {
    available_actions: ["continue_game_over"],
    game_over: { is_victory: false, character_id: "IRONCLAD", can_return_to_main_menu: false },
  });
}

/** The score screen after `continue_game_over`: only the way out is left. */
export function gameOverSavedPayload(victory = false): Raw {
  return baseState("GAME_OVER", {
    available_actions: ["return_to_main_menu"],
    game_over: { is_victory: victory, character_id: "IRONCLAD", can_return_to_main_menu: true },
  });
}

/** A run that vanished without the score screen (abandoned, or the player left it). */
export function afterRunPayload(): Raw {
  return baseState("MAIN_MENU", {
    session: { mode: "singleplayer", phase: "menu", control_scope: "local_player" },
    run: null,
    available_actions: ["continue_run", "open_character_select", "switch_profile"],
  });
}
