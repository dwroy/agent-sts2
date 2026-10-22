import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { sBuildRankMode, sCombatRankMode, sReadinessMode, simAdaptivePolicy, simFailurePolicy } from "../src/core/config.js";

// Only fixed temporary Git/live fixtures run. Never return the complete process environment.
function pinnedEnvironment(parent: Record<string, string>, policy?: Record<string, string>): NodeJS.ProcessEnv {
  const script = `
import json, os, sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path('../ops/tests').resolve()))
import test_launch_runtime as fixture
case = fixture.LaunchPublication('test_parent_sim_and_ranking_policy_cannot_enter_pinned_launch')
case.setUp()
try:
    parent, policy = json.loads(sys.argv[1])
    if policy is not None:
        (case.root/'ops/launch-settings.json').write_text(json.dumps(policy))
        source = case.commit(); case.git(case.live, 'merge', '--ff-only', source)
    case.pin()
    with patch.dict(os.environ, parent, clear=True):
        _, env, _ = fixture.launch.selection(case.root, case.live, 'run')
    print(json.dumps({k:v for k,v in env.items() if k.startswith(('SIM_', 'S_'))}))
finally:
    case.doCleanups()
`;
  const result = spawnSync("python3", ["-c", script, JSON.stringify([parent, policy ?? null])], { encoding: "utf8", timeout: 20_000 });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as NodeJS.ProcessEnv;
}

function consumed(character: string, env: NodeJS.ProcessEnv) {
  return { adaptive: simAdaptivePolicy(character, env), failure: simFailurePolicy(character, env),
    build: sBuildRankMode(character, env), readiness: sReadinessMode(character, env), combat: sCombatRankMode(character, env) };
}

const parent = { SIM_ADAPTIVE: "off", SIM_FAILURE_EXIT: "off", SIM_FAILURE_RETRIES: "9",
  S_BUILD_RANK: "on", S_READINESS: "on", S_COMBAT_RANK: "off" };

it("unpublished parent SIM/S overrides leave actual Silent and Ironclad consumer defaults unchanged", () => {
  const env = pinnedEnvironment(parent);
  expect(env).toEqual({});
  for (const character of ["silent", "ironclad"]) expect(consumed(character, env)).toEqual(consumed(character, {}));
  expect(consumed("silent", env)).toMatchObject({ adaptive: { mode: "on" }, failure: { enabled: true, retries: 2 },
    build: "shadow", readiness: "shadow", combat: "shadow" });
}, 25_000);

it("actual consumers adopt only explicitly published nonsecret SIM/S policy", () => {
  const policy = { SIM_ADAPTIVE: "shadow", SIM_FAILURE_EXIT: "off", SIM_FAILURE_RETRIES: "7",
    S_BUILD_RANK: "on", S_READINESS: "on", S_COMBAT_RANK: "off" };
  const env = pinnedEnvironment(parent, policy);
  expect(env).toEqual(policy);
  expect(consumed("silent", env)).toEqual({ adaptive: { mode: "shadow", requested: "shadow", admission: "accepted" },
    failure: { enabled: false, retries: 7 }, build: "on", readiness: "on", combat: "off" });
  expect(consumed("ironclad", env)).toMatchObject({ adaptive: { mode: "off" }, failure: { enabled: false },
    build: "off", readiness: "off", combat: "off" });
}, 25_000);
