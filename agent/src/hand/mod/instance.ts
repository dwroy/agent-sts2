/** Transport identity for independent local game instances; no game rules. */
import type { GameState, Health } from "./schema.js";

export interface InstanceBinding {
  processId: number;
  nativeProfileId?: string | undefined;
}

export class ModInstanceMismatchError extends Error {
  constructor(message: string) {
    super(`STS2 instance binding refused: ${message}`);
    this.name = "ModInstanceMismatchError";
  }
}

export function assertInstanceHealth(health: Health, binding: InstanceBinding, baseUrl: string): void {
  const url = new URL(baseUrl);
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  if (health.service !== "sts2-ai-agent" || health.process_id !== binding.processId || health.api_port !== port) {
    throw new ModInstanceMismatchError(
      `expected process ${binding.processId} on port ${port}; got ${health.process_id ?? "missing"} on ${health.api_port}`,
    );
  }
}

export function assertInstanceProfile(state: GameState, binding: InstanceBinding): void {
  if (binding.nativeProfileId === undefined) return;
  const actual = state.raw["native_profile_id"];
  if ((typeof actual !== "string" && typeof actual !== "number") || String(actual) !== binding.nativeProfileId) {
    throw new ModInstanceMismatchError(`expected native profile ${binding.nativeProfileId}; got ${actual ?? "missing"}`);
  }
}
