import { describe, expect, it } from "vitest";

import {
  KNOWN_STATE_VERSION,
  PayloadShapeError,
  checkCompatibility,
  parseActionResult,
  parseAvailableActions,
  parseEnvelope,
  parseGameState,
  parseHealth,
} from "../src/mod/schema.js";
import { actionsPayload, combatStatePayload, healthPayload, statePayload } from "./support.js";

describe("parseHealth", () => {
  it("accepts the documented payload and keeps unknown fields", () => {
    const health = parseHealth(healthPayload(8080, { future_field: 42 }));
    expect(health.service).toBe("sts2-ai-agent");
    expect(health.protocol_version).toBe("2026-03-11-v1");
    expect(health.api_port).toBe(8080);
    expect(health.compatibility?.missing_members).toEqual([]);
    expect(health.raw["future_field"]).toBe(42);
  });

  it("reports the exact path when a required field is missing", () => {
    const payload = healthPayload();
    delete payload["service"];
    try {
      parseHealth(payload);
      throw new Error("expected a PayloadShapeError");
    } catch (error) {
      expect(error).toBeInstanceOf(PayloadShapeError);
      expect((error as PayloadShapeError).issues[0]?.path).toBe("data.service");
    }
  });
});

describe("parseGameState", () => {
  it("summarises a map state", () => {
    const state = parseGameState(statePayload());
    expect(state.screen).toBe("MAP");
    expect(state.session).toMatchObject({ mode: "singleplayer", phase: "run" });
    expect(state.run).toMatchObject({ floor: 9, current_hp: 41, gold: 214, deck_size: 2 });
    expect(state.combat).toBeNull();
    expect(state.state_version).toBe(KNOWN_STATE_VERSION);
  });

  it("summarises a combat state", () => {
    const state = parseGameState(combatStatePayload());
    expect(state.combat).toMatchObject({
      current_hp: 41,
      energy: 3,
      hand_count: 2,
      living_enemy_count: 1,
      can_use_combat_actions: true,
      readiness_reason: "ready",
    });
  });

  it("requires the fields the router depends on", () => {
    const payload = statePayload();
    delete payload["session"];
    delete payload["available_actions"];
    try {
      parseGameState(payload);
      throw new Error("expected a PayloadShapeError");
    } catch (error) {
      const paths = (error as PayloadShapeError).issues.map((issue) => issue.path);
      expect(paths).toContain("data.session.mode");
      expect(paths).toContain("data.available_actions");
    }
  });
});

describe("parseAvailableActions", () => {
  it("defaults the capability flags to false", () => {
    const actions = parseAvailableActions({ screen: "MAP", actions: [{ name: "proceed" }] });
    expect(actions.actions[0]).toEqual({
      name: "proceed",
      requires_target: false,
      requires_index: false,
      requires_coordinates: false,
      requires_tool: false,
    });
  });

  it("parses the documented payload", () => {
    const actions = parseAvailableActions(actionsPayload());
    expect(actions.screen).toBe("MAP");
    expect(actions.actions.map((action) => action.name)).toEqual(["choose_map_node", "save_and_quit"]);
    expect(actions.actions[0]?.requires_index).toBe(true);
  });
});

describe("parseEnvelope", () => {
  it("unwraps a success envelope", () => {
    const envelope = parseEnvelope({ ok: true, request_id: "req_1", data: { screen: "MAP" } });
    expect(envelope.ok).toBe(true);
    expect(envelope.data).toEqual({ screen: "MAP" });
    expect(envelope.error).toBeNull();
  });

  it("unwraps an error envelope", () => {
    const envelope = parseEnvelope({
      ok: false,
      request_id: "req_2",
      error: { code: "invalid_target", message: "out of range", retryable: false, details: { option_index: 7 } },
    });
    expect(envelope.ok).toBe(false);
    expect(envelope.error).toMatchObject({ code: "invalid_target", retryable: false });
    expect(envelope.error?.details).toEqual({ option_index: 7 });
  });

  it("rejects an error envelope with no error object", () => {
    expect(() => parseEnvelope({ ok: false, request_id: "req_3" })).toThrow(PayloadShapeError);
  });

  it("rejects a body that is not an envelope", () => {
    expect(() => parseEnvelope({ screen: "MAP" })).toThrow(PayloadShapeError);
  });
});

describe("parseActionResult", () => {
  it("parses a completed action with its resulting state", () => {
    const result = parseActionResult({
      action: "choose_map_node",
      status: "completed",
      stable: true,
      message: "traveling",
      state: statePayload(),
    });
    expect(result.status).toBe("completed");
    expect(result.state?.screen).toBe("MAP");
  });

  it("rejects an unknown status", () => {
    expect(() =>
      parseActionResult({ action: "proceed", status: "maybe", stable: true, message: "", state: null }),
    ).toThrow(PayloadShapeError);
  });
});

describe("checkCompatibility", () => {
  it("is silent for a healthy, current mod", () => {
    const report = checkCompatibility(parseHealth(healthPayload()), parseGameState(statePayload()));
    expect(report).toEqual({ errors: [], warnings: [] });
  });

  it("escalates a degraded mod to an error and names the broken members", () => {
    const health = parseHealth(
      healthPayload(8080, {
        status: "degraded",
        compatibility: {
          reflected_members_checked: 128,
          reflected_members_missing: 1,
          missing_members: [{ member: "NCombat.PlayerBlock", feature: "combat block value" }],
        },
      }),
    );
    const report = checkCompatibility(health, null);
    expect(report.errors).toHaveLength(2);
    expect(report.errors.join(" ")).toContain("NCombat.PlayerBlock");
  });

  it("warns on a different protocol revision and state model", () => {
    const health = parseHealth(healthPayload(8080, { protocol_version: "2026-05-01-v2" }));
    const state = parseGameState(statePayload({ state_version: 9 }));
    const report = checkCompatibility(health, state);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toHaveLength(2);
    expect(report.warnings.join(" ")).toContain("different series");
  });

  it("rejects a service that is not the mod", () => {
    const health = parseHealth(healthPayload(8080, { service: "some-other-server" }));
    expect(checkCompatibility(health, null).errors[0]).toContain("sts2-ai-agent");
  });
});
