/** Shared fixtures and helpers for the test suites. No game and no network access required. */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export interface TestServer {
  url: string;
  port: number;
  close(): Promise<void>;
}

export async function startTestServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
): Promise<TestServer> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(text);
}

export function envelope(data: unknown): unknown {
  return { ok: true, request_id: "req_test_1", data };
}

export function errorEnvelope(code: string, message: string, retryable = false): unknown {
  return { ok: false, request_id: "req_test_2", error: { code, message, details: null, retryable } };
}

export function healthPayload(port = 8080, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    service: "sts2-ai-agent",
    mod_version: "0.13.0",
    protocol_version: "2026-03-11-v1",
    game_version: "v0.111.0",
    status: "ready",
    api_host: "127.0.0.1",
    api_port: port,
    process_id: 4242,
    instance_role: "human",
    play_running: false,
    play_phase: "paused",
    compatibility: { reflected_members_checked: 128, reflected_members_missing: 0, missing_members: [] },
    ...overrides,
  };
}

export function statePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    state_version: 16,
    screen: "MAP",
    session: { mode: "singleplayer", phase: "run", control_scope: "local_player" },
    in_combat: false,
    turn: null,
    available_actions: ["choose_map_node", "save_and_quit"],
    run: {
      floor: 9,
      current_hp: 41,
      max_hp: 70,
      gold: 214,
      character_name: "Ironclad",
      act_id: "1",
      ascension: 0,
      deck: [{ card_id: "STRIKE_R" }, { card_id: "DEFEND_R" }],
    },
    combat: null,
    ...overrides,
  };
}

export function combatStatePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return statePayload({
    screen: "COMBAT",
    in_combat: true,
    turn: 3,
    available_actions: ["play_card", "end_turn"],
    combat: {
      player: { current_hp: 41, max_hp: 70, energy: 3, block: 0 },
      hand: [{ card_id: "STRIKE_R" }, { card_id: "DEFEND_R" }],
      enemies: [{ enemy_id: "JAW_WORM", is_alive: true }, { enemy_id: "CULTIST", is_alive: false }],
      end_turn_will_kill_player: false,
      action_readiness: { can_use_combat_actions: true, reason: "ready" },
    },
    ...overrides,
  });
}

export function actionsPayload(): Record<string, unknown> {
  return {
    screen: "MAP",
    actions: [
      { name: "choose_map_node", requires_target: false, requires_index: true, requires_coordinates: false, requires_tool: false },
      { name: "save_and_quit", requires_target: false, requires_index: false, requires_coordinates: false, requires_tool: false },
    ],
  };
}

/** Ports that were just released; used to exercise the failure paths of discovery. */
export async function closedPorts(count: number): Promise<number[]> {
  const ports: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const server = await startTestServer((_req, res) => {
      res.end();
    });
    ports.push(server.port);
    await server.close();
  }
  return ports;
}
