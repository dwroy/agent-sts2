/** Shared wiring for the commands that touch the game: discovery → knowledge → Jev. */

import { requireJevApiKey, type AppConfig } from "../config.js";
import { JevClient } from "../jev/client.js";
import { describeKnowledge, loadKnowledge, type Knowledge } from "../knowledge/index.js";
import { ModClient } from "../mod/client.js";
import { discoverMod } from "../mod/discovery.js";

export interface Runtime {
  config: AppConfig;
  client: ModClient;
  /** null when the command runs without Jev (`--no-jev`, record, replay without `--ask`). */
  jev: JevClient | null;
  knowledge: Knowledge;
  modVersion: string;
  baseUrl: string;
}

export interface BuildRuntimeOptions {
  config: AppConfig;
  needJev: boolean;
  refreshKnowledge?: boolean;
  onEvent?: (message: string) => void;
}

export async function buildRuntime(options: BuildRuntimeOptions): Promise<Runtime> {
  const { config } = options;
  const onEvent = options.onEvent ?? ((): void => {});

  const discovery = await discoverMod({
    baseUrl: config.sts2.baseUrl,
    portScan: config.sts2.portScan,
    timeoutMs: config.sts2.timeoutMs,
  });
  const client = new ModClient({ baseUrl: discovery.url, timeoutMs: config.sts2.timeoutMs });
  onEvent(
    `mod ${discovery.health.mod_version} at ${discovery.url} (protocol ${discovery.health.protocol_version}, status ${discovery.health.status})`,
  );

  const knowledge = await loadKnowledge(client, {
    modVersion: discovery.health.mod_version,
    refresh: options.refreshKnowledge,
  });
  onEvent(`game data from ${knowledge.source}: ${describeKnowledge(knowledge)}`);

  const jev = options.needJev
    ? new JevClient({
        apiKey: requireJevApiKey(config),
        baseUrl: config.jev.baseUrl,
        model: config.jev.model,
        timeoutMs: config.jev.timeoutMs,
        maxRetries: config.jev.maxRetries,
      })
    : null;

  return { config, client, jev, knowledge, modVersion: discovery.health.mod_version, baseUrl: discovery.url };
}
