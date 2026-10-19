# V6-W8 / W1.1 条件字段扩充

2026-10-19，Codex gpt-6.1-sol。原 W8 实现 `48eae487c` 和交付记录 `51ba92470` 已在 main，本次处理 Claude 追加的 W1.1 第 (2) 项，不发布游戏知识。

## 实现

- 对照 `learner/runs/20261019-171010-c702c588-a5c6-445c-838d-fd94eb877532-v6-reflex-distill/report.md`，32 个提案按原顺序逐项进入 typed predicate 白名单，冻结报告 SHA 与核对结果见 `field-proposal-comparison.json`。没有将提案当作已学会的经验。
- `predicate-context.ts` 从当前 `GameState.raw` / `run.raw` 读取实体和数值：敌人身份、剩血、招式、显式存活状态；手牌身份、升级、当前能量费用、明确可用性；当前牌组、堆摘要、遗物 ID 与实际 stack、药水栏；回合、血上限、金币；存在相应快照时读取休息与商店。SL 尝试号来自真实 `DecisionEnv.sl.attempt`，已通过实际战斗方案构造器验证。
- 集合新增受限 `any` / `all`，只允许固定公布的集合，逐个绑定 `enemy` / `card` / `potion` / `action` / `rest_option` / `shop_item`；动作同时绑定自身的牌或药水。结合身份、升级、费用、可用性时不会拼接不同实体。表达式仍有字段、类型、节点/深度、集合长度和求值工作量上限，不执行任意代码。原 W1 三值逻辑以及 `exists` 的缺失返回 false 语义保持。
- 出牌条目仍逐方案计算。`option.actions` 是有序的 `Plan.steps`，以 0 起始 `action.index` 和 `action.kind` 区分牌/药序，包含已有的计划目标、成本和弃牌列表；计划成本不冒充实际支付，当前手牌的可用性不复制为后续动作可用性。GEN 标识只有 `pileCard` 提供真实身份才转成牌 ID，异常药水槽不会补零。
- `option.future` 使用 W8 已有的有样本条件推演数值，rollout / whole_fight 分开保留；时钟回退不冒充条件模拟。`option.trust` 仅转接既有整场模拟质量门槛，不发明 rollout 可信度或模型版本。
- `reflex-entry-v1` 最小追加可选 `cores`、`combos` 关联 ID 数组，校验唯一性并随命中条目保留。只透传学习者提供的关联，不自行生成、扩大适用范围或按尚未发布的组合做过滤。draft 词表检查可递归检查新增集合条件，遗物实际 ID 与学习者词表标签分开校验。
- 当前状态来源、缺失原因和求值结果保存在每个候选完整 `decision_evidence` 中；题面仅收到符合条件的记忆。正式知识、pending 草稿和学习批次均未修改。

## 可用范围与未知

| 字段/场景 | 实际来源与限制 |
|---|---|
| 敌人字段 | `raw.combat.enemies`；只有显式存活状态全已知且唯一存活敌人时提供单数 `enemy`。多敌人用 `enemies.items` 量词；不默认取第一个敌人。`enemies.alive` 是已明确存活的实体数，任一存活状态缺失就未知。 |
| 牌与药水字段 | 在对应集合/动作的实体作用域中读取；全方案没有默认单牌/单药。手牌 `can_play_result`、药水 `can_use` 只表示当前帧，牌组或预测步骤的后续合法性未知。 |
| 抽弃消耗堆 | 接口只有 `agent_view.combat.{draw,discard,exhaust}` 的分组 `line/card_ids`，保留明确身份和原摘要。不解析中文推断实体数量、升级或费用，不以牌组减手牌重建。 |
| 遗物与计数 | 读取 `run.raw.relics[].relic_id/stack`；实际 0 保留，null/缺失计数未知，不由持有遗物推断触发或消耗。 |
| `sl.attempt` | SL 环境只在重试存在；缺失不证明首次尝试为 1。 |
| `rest.options`、`shop.stock/prices` | 仅从当前帧存在的实际休息/商店快照读取；战斗帧没有这些快照时未知。部分缺失的商店不冒充完整库存；报价不等于实际付金。本次不接管其他题型或路由。 |
| `room.kind` | 现有状态的 screen / fight difficulty 不证明实际房间种类，保持未知。 |
| `history.first_predicted_death` | 当前 DecisionEnv 没有权威首条判死事件，当前判死标记不冒充首条历史。 |
| `history.resource_handoff` | 没有实际跨战出口资源账本，模拟不冒充真实接力，保持未知。 |
| `option.model_version` | 源 rollout / boss DTO 没有模型 SHA，不拿来源名称代版本。 |
| `option.complete_line` | steps 和样本数不能证明所有随机抽牌、弃牌后继完整，保持未知。 |

32 项逐项的冻结来源/原因见 `field-inventory.json`。其中单实体字段在量词绑定后可用，不以顶层不存在表示功能不支持。

集合条件的固定数据示例（`TEST_CARD` 不是游戏知识）：

```json
{"op":"any","field":"option.actions","arg":{"op":"and","args":[{"op":"eq","field":"action.index","value":0},{"op":"eq","field":"card.id","value":"TEST_CARD"}]}}
```

`any` / `all` 只绑定 `enemies.items`、`player.hand`、`player.deck`、`player.piles.draw/discard/exhaust`、`potion.slots`、`option.actions`、`rest.options`、`shop.stock`。record 字段本身只能 `exists`，不是可执行查询；数值子路径只开放已声明的 powers、relic_counters、shop.prices、direction_weights 以及 `option.future.{rollout,whole_fight}.{horizon_turns,samples,further_hp_loss,win_probability}`。未知集合返回 unknown；已观察到的空集合按 `any=false` / `all=true` 求值。集合最大 1000 项、表达式最大 128 节点/12 层、求值最大 4096 步。新增关联中 `cores` 对应 build-core 的 direction ID，`combos` 对应组合 ID；本次只保留关联，不把尚未发布的目标当作已验证组合。

## 验收材料

- 固定数据检查覆盖全部 32 项、重复同名牌与多敌人的绑定、实际零/false/空集合和未知的区别、真实 SL 构造器传递、每方案序列差异、组合关联、词表校验、异常标识和边界拒绝。
- 五角色关闭开关的既有 20 组冻结请求字节锁仍执行；`V6_COMBAT_ENTRIES` 仅显式 `on` 启用，缺角色文件保持旧题面。
- `targeted-1.log`：103 项通过；补验后的 `targeted-2.log`：104 项通过。中间失败与处理事实见 `verification-history.md`。
- 变基到 main `53138de0b`（含 W6）后，`tsc-final.log` 退出 0，`vitest-final.log` 全量通过：567 文件、5478 项通过、2 项跳过，退出 0。随后纳入只追加交付记录的 main `b63639d1b`，`tsc-after-doc-rebase.log` 退出 0；该基线上的 `vitest-after-doc-rebase.log` 同样 567 文件、5478 项通过、2 项跳过，退出 0，437.60 秒。
- main 又新增 W1.1 build-core 合同与加载器；无冲突变基到 `6e39eb2dc`，`tsc-after-w11.log` 退出 0，`vitest-after-w11.log` 全量通过：568 文件、5494 项通过、2 项跳过，退出 0，473.58 秒。随后变基到仅新增派发材料的 main `288c2ad29`；受测与最终 agent 树哈希均为 `793538eaedb33c5b98b57835f60de357af17c3f5`，没有源码变化，见 `source-identity.json`，不重复全量测试。
- 离线冻结脚本 `verify-context.mts` 对 32 项顺序、来源完整性以及已接受请求逐字节核对通过；新审计另存，不改历史审计。
- 新 wire 与原 W8 已获 HTTP 200 的请求完全相同：SHA256 `790400425e1f9d207619d226105cd4b301230252fc8c757d083876a55107447a`，69,304 bytes；扩展后的 evidence SHA256 `6f5efdcf1119e4e2923104f06da421d2eabe59cd034b996f13cfe8cd3b25f9c3`，236,119 bytes。本次新增网络请求数为 0，未执行动作。
- 纳入 W1.1 后另做只读重建核验，wire / evidence / contract 三者与本次冻结文件精确一致，回执 `frozen-readback-after-w11.json`，未覆盖先前冻结文件。
- gitleaks 8.30.1：源码与完整暂存材料扫描退出 0、无泄漏，原始回执 `gitleaks-final.log`；显式纳入忽略的原始测试日志后完整扫描仍无泄漏，回执 `gitleaks-with-logs.log`。纳入扫描回执后再检查暂存集。

本次只合 main，开关默认关闭；未开局、移除 STOP、恢复 Regent、改游戏知识、派学习批次或改共用配置。live 工作树不存在，不伪造 main/live 双侧回收验收，保留当前工作树供原调度器处理。正式知识发布、自然消费者读回与收益验证仍待学习者和后续验收。
