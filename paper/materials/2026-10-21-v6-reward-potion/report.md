# P2 满槽战后奖励药水：真实接口阻塞

2026-10-21 03:48 CST，按 Claude 03:3x 指派，在完成 R407 只读选牌质量核查后开始 P2。P2 的 Roy 设计保持为：只处理战后奖励满槽药水，由 Jev 选“替换哪瓶／不要”，用既有换算表、大脑档位和距 Boss／精英远近作条目，先丢后领；不改变事件、商店、休息或战斗用药。

**当前不能完成“先丢后领”的真实循环验收：真实奖励状态没有合法弃药动作。** 本轮没有修改生产代码、知识、live、配置或对局，没有 HTTP／模型请求、模拟或完整检查。不能把这份能力诊断称作 P2 实现完成或上线通过。

## 原帧与有界核查

`frozen/potion-0.json` 保留 T15WXHPTM0ET F40 的真实战斗→奖励状态，两行源日志的字节偏移、长度与 SHA256 在其 `evidence` 内。源为根 `logs/states.jsonl`：

- 战斗：2026-10-20T16:59:22.318Z，offset 14796891798，SHA256 `359ddf646542a4511b57b33a5463c1752b389820069bab634109d61862f159bf`。
- 奖励：2026-10-20T16:59:23.971Z，offset 14796936460，SHA256 `c9ae9c89aa66aec2358f4ca820731e6e866f3675cbc6a0aa1827951aa7481a39`。

奖励为“稳定血清”，已持两格分别为 RADIANT_TINCTURE、DEXTERITY_POTION；两格 `occupied=true`、`can_discard=false`。`available_actions` 仅为 `save_and_quit`、`resolve_rewards`、`collect_rewards_and_proceed`、`claim_reward`，没有 `discard_potion`。该奖励只提供 description，没有 potion_id；这不是本轮执行阻塞的根因，但后续条目构造必须有可审计的身份解析，不能把未识别名称猜成某个 ID。

另有界扫描源日志冻结末端的 384 MiB，共 12,955 行，找到 6 个不同 run×floor 的满槽且仍可领取药水的奖励局面。**6/6 均无 `discard_potion`，所有槽 `can_discard=false`**，state_version 均为 16。范围为 2XCG8LXUZLRE F12、34XTHUP4433X F23、5ZEPCTQKKXE4 F14/F17/F21、T15WXHPTM0ET F40。该有界窗口不代表全部历史，也不是完整历史发生率。每个局面一条原行已冻结到 `frozen/full-reward-source-lines.jsonl.gz`；偏移与原行 SHA 见 `checks/bounded-source-scan.json`。

## 生产门复现

运行：

```sh
PATH="$HOME/.local/node/bin:$PATH" nice -n 19 agent/node_modules/.bin/tsx paper/materials/2026-10-21-v6-reward-potion/replay-capability.ts
```

脚本先按偏移回读原日志，校验两行 SHA 与冻结状态相同；随后直接调用生产 `parseGameState`、`gate` 和 `discardableSlots`。结果：

- 同两格在真实战斗帧的 `discard_potion` 请求均通过 gate。
- 进入奖励帧后，同请求均以 legality 拒绝：`discard_potion is not in available_actions`。
- 生产 `discardableSlots` 返回空数组。

`checks/source-identity.json` 记录本工作树基线 819b1cdbe7a54a860e654a6b8ab3e23497d2d01e 及四个生产文件 SHA/blob；四文件与只读核验的实际 live a7d07949efb03278a62050ca39447941309b4b7e **逐字相同**。`checks/capability-replay.json/.log` 保存实际结果。该复现没有改状态字段、调用 mod，或绕开动作门。

现有 `reward.ts` 已因历史满槽领取挂住的记录，直接过滤满槽药水奖励。本轮保留此行为。不能仅让 Jev 返回一个槽号就宣称可执行，也不能把 `can_discard`／`available_actions` 在夹具里改成允许，再称真实循环验收通过。

## 需要协调的下一步

请 Claude／watcher 确认当前 mod 是否有已支持但未暴露的、**奖励界面合法弃药**接口；若有，提供协议和真实状态证据。若没有，需要先协调 mod 的这项能力，再继续 P2 的奖励来源门、换算条目、弃药确认后领取和真实循环回归。候选药水的稳定 ID 可一起明确；若保留仅名称的旧协议，消费端应仅在角色自有表中唯一匹配，否则明确 unknown。

本轮不擅自改成战前预丢、先领满槽、游戏界面外脚本操作或把所有取舍退化成“不要”。已向 watcher 交付阻塞核查，未把 CLI 入队当原生确认。P2 尚未产生待发布源码，不占新的 full 窗口，不改变持续对局或 P0 状态。

前置 R407 质量报告正式提交为 `2c4b12ada2b6f2c10bf74974244bed7a8f05707e`，材料 `paper/materials/2026-10-21-v6-r407-card-quality/`。本轮仅材料与材料内复现脚本；生产源码无变，不重复 tsc/full。秘密扫描与文件清单见 `checks/`。
