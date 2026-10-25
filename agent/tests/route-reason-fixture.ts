/** Synthetic interface data only; no strategy, live response or measured game result. */
import { input } from "./route-fixture.js";
import { rewardCardPayload } from "./scenarios.js";

export const initialRoute = "r0c1 r1c0 r2c0 r3c1 r4c1 r5c1";
export const previousRoute = "r1c0 r2c0 r3c1 r4c1 r5c1";
export const changedRoute = "r1c2 r2c1 r3c1 r4c1 r5c1";
export const routeReason = "当前资源变化，比较原路后选择另一分支，预期改善胜率，效果未知";
export const constructionPatch = { endgame: { resources: "格式资源更新" }, change_reason: "当前资源变化，局部更新构筑假设，预期有利，效果未知" };
export const initialPlan = { archetype: "格式方向", want: [], avoid: [], remove: [], block_target: 0, elites: "normal", rest: "auto",
  construction: { primary: "uncommitted", alternatives: [], checkpoint: 4, reason: "格式未知", pivot_if: "新证据" },
  boss_prep: "未知", summary: "格式计划", endgame: { core: "格式核心", gaps: "未知", scaling_damage: "未知", sustainable_defense: "未知", resources: "未知", win_condition: "未知", checkpoint: "" } };

export function routeBoard(kind: "initial" | "reward" | "next", character = "SILENT", ascension = 10) {
  const raw = rewardCardPayload();
  raw.run_id = "ROUTE_CONTRACT_FIXTURE";
  raw.run = { ...raw.run as object, character_id: character, ascension, act_id: "0", floor: kind === "initial" ? 0 : 1,
    current_hp: kind === "initial" ? 70 : 40, max_hp: 80, relics: [], potions: [] };
  if (kind === "reward") return raw;
  raw.screen = "MAP";
  raw.available_actions = ["choose_map_node", "save_and_quit"];
  raw.reward = null;
  const nodes = input().nodes;
  const available = kind === "initial" ? [{ row: 0, col: 1 }] : [{ row: 1, col: 0 }, { row: 1, col: 2 }];
  raw.map = { nodes: nodes.map(n => ({ ...n, node_type: n.type, visited: kind !== "initial" && n.row === 0 })),
    current_node: kind === "initial" ? null : { row: 0, col: 1 }, boss_node: { row: 4, col: 1 }, second_boss_node: { row: 5, col: 1 },
    available_nodes: available.map((n, index) => ({ ...n, index, node_type: nodes.find(v => v.row === n.row && v.col === n.col)!.type })) };
  return raw;
}
