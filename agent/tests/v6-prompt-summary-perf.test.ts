import { afterEach, expect, it, vi } from "vitest";
import { appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as summary from "../src/v6/prompt-summary.js";
import * as bridge from "../src/sim/v6-projection-entries.js";
import * as formats from "../src/v6/formats.js";
import * as knowledgeLoader from "../src/v6/knowledge.js";
import { buildV6CardPick } from "../src/v6/card-pick.js";
import { buildV6RoomDecision } from "../src/hand/screens/v6-room.js";
import { v6ShopOptions, v6RestOptions } from "../src/hand/screens/v6-room-options.js";
import { setupOneshotTests } from "./oneshot-support.js";
import { knowledge, on, situation, shopTable, size } from "./v6-prompt-summary-fixtures.js";

setupOneshotTests();
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
// Fixed fixtures and local calls only. PERF_OUTPUT is an optional offline measurement artifact.
it.each(["card", "shop", "rest"] as const)("measures fixed %s summary construction", kind => {
  on();
  const e = situation(kind);
  const input = kind === "shop" ? v6ShopOptions(e)! : kind === "rest" ? v6RestOptions(e)! : null;
  const table = shopTable(input ?? { options: ["card0", "card1", "card2", "skip"].map(key => ({ option: { key } })) });
  const stages: Record<string, number> = {};
  const track = (module: object, key: string) => {
    const original = (module as Record<string, (...args: never[]) => unknown>)[key]!;
    if (typeof original !== "function") return;
    vi.spyOn(module as Record<string, (...args: never[]) => unknown>, key).mockImplementation((...args) => {
      const start = performance.now();
      try { return original(...args); } finally { stages[key] = (stages[key] ?? 0) + performance.now() - start; }
    });
  };
  track(summary, "boundedV6Jev"); track(summary, "compactProjection"); track(bridge, "v6ProjectionEntries");
  track(formats, "validateProjectionEntries"); track(formats, "validateProjectionEntry"); track(knowledgeLoader, "loadV6Knowledge");
  const rows = [];
  for (let i = 0; i < Number(process.env.PERF_REPEATS ?? 3); i++) {
    for (const key of Object.keys(stages)) stages[key] = 0;
    const start = performance.now();
    const d = kind === "card" ? buildV6CardPick(e, table, knowledge)!.decision
      : buildV6RoomDecision(e, input!, table, "ready", knowledge);
    const elapsed_ms = performance.now() - start;
    // Coarse ceilings allow contention; structural tests also guard against repeated snapshot walks.
    expect(elapsed_ms).toBeLessThan(5000);
    expect(stages.boundedV6Jev).toBeLessThan(1500);
    rows.push({ kind, pass: i === 0 ? "cold" : "warm", elapsed_ms, stages: { ...stages }, state_digest: createHash("sha256").update(JSON.stringify(d.state)).digest("hex"), state_bytes: size(d.state), request_bytes: size({ model: "typesafe/jev-1.14", state: d.state, questions: d.questions }) });
    expect(size(d.state)).toBeLessThanOrEqual(summary.V6_JEV_STATE_BYTES);
    expect(Object.keys(d.state.options as object).length).toBe(kind === "card" ? 4 : input!.options.length);
  }
  if (process.env.PERF_OUTPUT) appendFileSync(process.env.PERF_OUTPUT, rows.map(r => JSON.stringify(r)).join("\n") + "\n");
}, 30_000);
