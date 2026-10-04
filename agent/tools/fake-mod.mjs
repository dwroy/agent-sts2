#!/usr/bin/env node
/**
 * Fixture server that mimics the STS2-Agent HTTP API, so `doctor` (and later the decision loop) can
 * be exercised without launching the game. It is a development tool: it serves one frozen mid-run
 * state and accepts any action.
 *
 *   node tools/fake-mod.mjs            # http://127.0.0.1:8080
 *   FAKE_MOD_PORT=8083 node tools/fake-mod.mjs
 *   FAKE_MOD_FIXTURES=fixtures/states.jsonl node tools/fake-mod.mjs
 *
 * With FAKE_MOD_FIXTURES it serves the recorded states in order, advancing one on every POST
 * /action — which is what makes `shadow` and `play` testable without launching the game.
 *
 * FAKE_MOD_CHARACTER=SILENT (default IRONCLAD): the frozen mid-run state is that character's run (character_id, name).
 * FAKE_MOD_SCREEN=character_select: serves character select instead (Ironclad and Silent unlocked, the others locked),
 * answering select_character, increase_ascension / decrease_ascension and embark (embark then serves the mid-run state of
 * the character selected, at the ascension chosen), so character choice and ascension can be exercised end to end.
 *
 * Its game data is empty and its mod version ends in "-fake": a client run against it never writes that into the
 * project's data/game-data.json (knowledge/index.ts cacheWriteRefusal); give the client GAME_DATA_DIR=<a temp dir> anyway.
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const port = Number(process.env.FAKE_MOD_PORT ?? 8080);
const host = process.env.FAKE_MOD_HOST ?? "127.0.0.1";
const fixturesPath = process.env.FAKE_MOD_FIXTURES ?? null;
const NAMES = { IRONCLAD: "Ironclad", SILENT: "Silent", REGENT: "Regent", NECROBINDER: "Necrobinder", DEFECT: "Defect" };
const fakeCharacter = (process.env.FAKE_MOD_CHARACTER ?? "IRONCLAD").toUpperCase();

function loadFixtures(path) {
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const states = lines.map((line) => JSON.parse(line).state).filter((state) => state && typeof state === "object");
  if (states.length === 0) throw new Error(`no states found in ${path}`);
  return states;
}

const fixtureStates = fixturesPath ? loadFixtures(fixturesPath) : null;
let fixtureIndex = 0;

const health = {
  service: "sts2-ai-agent",
  mod_version: "0.13.0-fake",
  protocol_version: "2026-03-11-v1",
  game_version: "v0.111.0",
  status: "ready",
  api_host: host,
  api_port: port,
  process_id: process.pid,
  instance_role: "human",
  mcp_enabled: false,
  mcp_url: null,
  play_running: false,
  play_phase: "paused",
  stop_kind: null,
  session_requests: 0,
  companion_process_alive: false,
  companion_process_exited: false,
  companion: null,
  dual_status: "fake server: no companion",
  dual_launch_outcome: null,
  team_control_status: "fake server: no companion",
  compatibility: { reflected_members_checked: 128, reflected_members_missing: 0, missing_members: [] },
  state_build: { slow_threshold_ms: 100, samples: 3, slow_builds: 0, last_ms: 4, max_ms: 9 },
};

const card = (card_id, name, energy_cost, card_type, rules) => ({
  card_id,
  name,
  upgraded: false,
  card_type,
  rarity: "Common",
  costs_x: false,
  star_costs_x: false,
  energy_cost,
  star_cost: 0,
  rules_text: rules,
  resolved_rules_text: rules,
  dynamic_values: [],
});

const defaultState = {
  state_version: 11,
  native_profile_id: 1,
  run_id: "C9LRZTK3L1B4",
  screen: "MAP",
  session: { mode: "singleplayer", phase: "run", control_scope: "local_player" },
  in_combat: false,
  turn: null,
  available_actions: ["choose_map_node", "save_and_quit"],
  combat: null,
  run: {
    floor: 9,
    current_hp: 41,
    max_hp: 70,
    gold: 214,
    max_energy: 3,
    act_id: "1",
    boss_id: "SLIME_BOSS",
    ascension: 0,
    character_id: fakeCharacter,
    character_name: NAMES[fakeCharacter] ?? fakeCharacter,
    ascension_effects: [],
    deck: [
      card("STRIKE_R", "Strike", 1, "Attack", "Deal 6 damage."),
      card("STRIKE_R", "Strike", 1, "Attack", "Deal 6 damage."),
      card("DEFEND_R", "Defend", 1, "Skill", "Gain 5 Block."),
      card("BASH", "Bash", 2, "Attack", "Deal 8 damage. Apply 2 Vulnerable."),
      card("ANGER", "Anger", 0, "Attack", "Deal 6 damage. Add a copy of this card into your discard pile."),
      card("POMMEL_STRIKE", "Pommel Strike", 1, "Attack", "Deal 9 damage. Draw 1 card."),
    ],
    relics: [{ index: 0, relic_id: "BURNING_BLOOD", name: "Burning Blood", description: "At the end of combat, heal 6 HP.", stack: null, is_melted: false }],
    potions: [
      { index: 0, potion_id: "FIRE_POTION", name: "Fire Potion", description: "Deal 20 damage to target enemy.", rarity: "Common", occupied: true, usage: "CombatOnly", target_type: "AnyEnemy", is_queued: false, requires_target: true, can_use: false, can_discard: true, target_index_space: null, valid_target_indices: [] },
      { index: 1, potion_id: null, name: null, description: null, rarity: null, occupied: false, usage: null, target_type: null, is_queued: false, requires_target: false, can_use: false, can_discard: false, target_index_space: null, valid_target_indices: [] },
    ],
    players: [],
  },
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
      { row: 4, col: 2, node_type: "Monster", state: "Traveled", visited: true, is_current: true, is_available: false, is_start: false, is_boss: false, is_second_boss: false, parents: [], children: [{ row: 5, col: 1 }, { row: 5, col: 3 }] },
      { row: 5, col: 1, node_type: "Elite", state: "Travelable", visited: false, is_current: false, is_available: true, is_start: false, is_boss: false, is_second_boss: false, parents: [], children: [] },
      { row: 5, col: 3, node_type: "Monster", state: "Travelable", visited: false, is_current: false, is_available: true, is_start: false, is_boss: false, is_second_boss: false, parents: [], children: [] },
      { row: 5, col: 4, node_type: "Shop", state: "Travelable", visited: false, is_current: false, is_available: true, is_start: false, is_boss: false, is_second_boss: false, parents: [], children: [] },
    ],
    local_vote: null,
    player_votes: [],
  },
  multiplayer: null,
  multiplayer_lobby: null,
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
};

const availableActions = {
  screen: "MAP",
  actions: [
    { name: "choose_map_node", requires_target: false, requires_index: true, requires_coordinates: false, requires_tool: false },
    { name: "save_and_quit", requires_target: false, requires_index: false, requires_coordinates: false, requires_tool: false },
  ],
};

const envelope = (data) => ({ ok: true, request_id: `req_fake_${Date.now()}`, data });
const failure = (code, message, status, retryable = false) => ({
  status,
  body: { ok: false, request_id: `req_fake_${Date.now()}`, error: { code, message, details: null, retryable } },
});

function send(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(text) });
  res.end(text);
}

/** FAKE_MOD_SCREEN=character_select: what the screen holds (null once embarked). */
const select =
  process.env.FAKE_MOD_SCREEN === "character_select"
    ? { selected: "IRONCLAD", clicked: false, ascension: 0, max: Number(process.env.FAKE_MOD_MAX_ASCENSION ?? 3) }
    : null;
let embarked = false;
const SELECT_CHARACTERS = [
  ["IRONCLAD", "铁甲战士", false],
  ["RANDOM_CHARACTER", "随机", true],
  ["SILENT", "静默猎手", false],
  ["REGENT", "储君", true],
  ["NECROBINDER", "亡灵契约师", true],
  ["DEFECT", "故障机器人", true],
];

function characterSelectState() {
  const actions = ["close_main_menu_submenu", "select_character"];
  if (select.clicked) actions.push("embark");
  if (select.clicked && select.ascension < select.max) actions.push("increase_ascension");
  if (select.clicked && select.ascension > 0) actions.push("decrease_ascension");
  return {
    ...defaultState,
    run_id: "run_unknown",
    screen: "CHARACTER_SELECT",
    session: { mode: "singleplayer", phase: "character_select", control_scope: "local_player" },
    available_actions: actions,
    run: null,
    map: null,
    character_select: {
      selected_character_id: select.selected,
      can_embark: select.clicked,
      ascension: select.ascension,
      max_ascension: select.max,
      characters: SELECT_CHARACTERS.map(([character_id, name, is_locked], index) => ({ index, character_id, name, is_locked, is_selected: character_id === select.selected, is_random: character_id === "RANDOM_CHARACTER" })),
    },
  };
}

function selectAction(intent) {
  if (intent.action === "select_character") {
    const entry = SELECT_CHARACTERS[intent.option_index ?? -1];
    if (!entry || entry[2]) return false;
    select.selected = entry[0];
    select.clicked = true;
  } else if (intent.action === "increase_ascension" && select.clicked && select.ascension < select.max) select.ascension += 1;
  else if (intent.action === "decrease_ascension" && select.clicked && select.ascension > 0) select.ascension -= 1;
  else if (intent.action === "embark" && select.clicked) embarked = true;
  else return false;
  return true;
}

function currentState() {
  if (select && !embarked) return characterSelectState();
  if (select) return { ...defaultState, run: { ...defaultState.run, floor: 1, ascension: select.ascension, character_id: select.selected, character_name: NAMES[select.selected] ?? select.selected } };
  if (!fixtureStates) return defaultState;
  return fixtureStates[Math.min(fixtureIndex, fixtureStates.length - 1)];
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${host}:${port}`);
  const route = `${req.method ?? "GET"} ${url.pathname}`;

  if (route === "GET /health") return send(res, 200, envelope(health));
  if (route === "GET /state") return send(res, 200, envelope(currentState()));
  if (route === "GET /actions/available") return send(res, 200, envelope(availableActions));
  if (route === "POST /action") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      let intent = {};
      try {
        intent = raw ? JSON.parse(raw) : {};
      } catch {
        const { status, body } = failure("invalid_request", "Request body was not JSON.", 400);
        return send(res, status, body);
      }
      if (!intent || typeof intent.action !== "string") {
        const { status, body } = failure("invalid_request", "Field 'action' is required.", 400);
        return send(res, status, body);
      }
      if (select && !embarked && !selectAction(intent)) {
        const { status, body } = failure("invalid_action", `character select does not take ${intent.action} now`, 409);
        return send(res, status, body);
      }
      if (fixtureStates) fixtureIndex += 1;
      send(
        res,
        200,
        envelope({
          action: intent.action,
          status: "completed",
          stable: true,
          message: `fake server executed ${intent.action}`,
          state: currentState(),
        }),
      );
    });
    return;
  }
  if (url.pathname.startsWith("/data/")) {
    return send(res, 200, envelope({ collection: url.pathname.slice("/data/".length), items: [] }));
  }
  const { status, body } = failure("not_found", `No route for ${route}`, 404);
  return send(res, status, body);
});

server.listen(port, host, () => {
  process.stdout.write(`fake STS2-Agent mod listening on http://${host}:${port}\n`);
  if (fixtureStates) {
    process.stdout.write(`serving ${fixtureStates.length} recorded states from ${fixturesPath}\n`);
  }
});
