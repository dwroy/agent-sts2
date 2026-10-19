# V6-W8：出牌条目完善

记录时间：2026-10-19 17:58 +0800。会话：v6-w8，Codex gpt-6.1-sol。代码基于 main `36fab705f`；最终提交及验收结果见文末。

## 实现与边界

- 只有 `V6_COMBAT_ENTRIES=on` 才启用。W1 的 `loadV6Knowledge`、`reflex-entry-v1`、`reflex-vocab-v1` 和三值 predicate 求值器保持不变。只读当前角色正式文件；角色、进阶、格式或词表缺失时保持旧题面，不查询其他角色、common 或 pending。
- `applies_to=combat_line` 且进阶匹配、predicate 为 true 的记忆挂到各个方案上，保留 signal、单位、误差、confidence、支持/反例计数与文件路径、JSON 摘要 SHA、条目 ID。标签直接引用学习者词表，不在代码中创作游戏分类。完整条目、证据与词表保留在 `decision_evidence`。
- predicate 只填可观察的当前幕/层、玩家血量/格挡/能量/能力和方案当回合结果。只在恰有一个存活敌人、一个意图时提供相应敌人字段，避免把不同敌人的意图与能力串成条件。未加载的卡牌/药水标签、方向权重和缺失能力值保留未知，NOT unknown 也不会匹配。
- 将 rollout、whole-fight 说明替换为统一数值：推演回合、实际/请求样本、进一步掉血、胜率、胜败/未完成、胜出回合、截断枚举和可信度。时钟回退不冒充胜率；零样本仍记录零样本，估计值为 null；原说明、逐样本结果、降级/低可信原因保留在完整审计中。新增字段均有回指审计字段的绑定。
- 第三幕 Boss 在既有整场模拟开关允许时，即使首试低可信也计算并展示，标为 low、bias unknown；原可信排序门槛不变。其他角色、幕与药水动作路由未改。模拟模块没有改动或新增导入，适配层仅接收调用方结构化结果。
- 将题面 `DeepSeek's run plan` 改为 `Run plan`，来源记录为实际保存位置 `run_memory` 或 `run_brief`。当前 RunPlan 不存历史作者/模型，因此作者为 unknown，不用本次配置倒填历史模型。
- 关闭开关时先走原 V5 投影，五角色均有改动前冻结请求字节 SHA 锁定测试。不存在有效角色文件时，开关打开也保持旧题面。

## 冻结题验收

原题来自既有 `agent/tests/jev-context-recovery-request.json`。固定输入由 `agent/tests/v6-combat-fixtures.ts` 合成：角色/幕、方案结果、rollout、Boss 模拟和 W1 条目是测试值。它验证格式与接入，不构成对局证据、策略收益或自然采用证明；未读写正式或 pending 知识。

| 产物 | 作用 |
| --- | --- |
| `frozen-original.json` | 原冻结请求 |
| `frozen-decision-evidence.json` | 增加固定审计数据后的完整输入，不删历史说明 |
| `frozen-wire.json` | 实际发送的 state/questions，10 个方案 |
| `frozen-contract.json` | 候选数值/记忆与计划来源绑定 |
| `frozen-summary.json` | 合成输入边界、字节数和摘要 |
| `request-started.json` / `request-receipt.json` | 唯一一次真实请求的起止与回执 |
| `frozen-final-readback.json` | 最终实现重建 wire、evidence、contract，三者与已发请求精确一致；网络请求数 0 |

wire SHA256：`790400425e1f9d207619d226105cd4b301230252fc8c757d083876a55107447a`，69,304 bytes。完整 evidence SHA256：`828c459a3bd0f3af51ddea2a91f1e24835d12c3cdb355cf45ccb270535dcc8ae`，134,919 bytes。

2026-10-19 17:54:22 +0800，经 handoff 指定 Nova 接入真实调用一次 `/api/alpha/decisions`，实际 selector `typesafe/jev-1.14`，HTTP 200；输入 25,599 tokens，输出 99 tokens，客户端延迟 876ms，requestId 未返回。只调用 JevClient.ask，没有启动游戏或执行答案。凭据仅由环境加载，未读出、打印或落盘。脚本禁止第二次请求，SDK maxRetries=0。

复验只用固定数据，在 agent/ 中运行：

```sh
PATH="$HOME/.local/node/bin:$PATH" nice -n 10 npx tsc -p tsconfig.json --noEmit
PATH="$HOME/.local/node/bin:$PATH" nice -n 10 npx vitest run --maxWorkers=3
PATH="$HOME/.local/node/bin:$PATH" nice -n 10 node --import tsx ../paper/materials/2026-10-19-v6-w8/verify-frozen.mts readback
```

## 验证记录与限制

- 定向检查：4 个文件、123 项测试通过，见 `targeted-final.log`。包括五角色关闭开关字节等价、缺文件不回退、未知 predicate、数值来源逐字段读回、低可信 Boss 实际构题接入、候选/动作/排序门槛不变及原上下文恢复机制。
- 最终 tsc 退出码 0，`tsc-final.log` 为空表示无诊断。全量 vitest 于 18:03 退出 0：563 个文件通过，5,404 项通过、2 项跳过，共 395.08 秒，见 `vitest-final.log`。
- 第一次全量检查发现既有 rollout 导入边界测试失败；原失败标题保存在 `vitest-first-interrupted.log`，随后主动终止该轮，退出码 143。修正为只读结构化接口，未削弱原测试或修改模拟模块，定向 123 项包含该边界检查并已通过。早期本地检查还修正了测试 mock 的返回结构及其类型，不涉及生产规则。
- 当前 boss-lines 生产结果未暴露推演上限，因此生产 `horizon_turns=null`；不能从原说明或复制模拟常量倒填。固定数据明确提供 maxTurns=30，所以冻结题该字段为 30。后续模拟结果显式暴露上限后可直接消费。
- 缺失的模型偏差/历史作者保持 unknown；未观察条件不填 0，也不推断知识标签。学习者正式知识发布、实际 live 消费读回和收益验证仍由原流程负责，本交付不关闭这些父要求。
- 本次仅合 main，开关默认 off；不合 live、不分配行为发布号、不移除 STOP、不恢复 Regent、不派学习批次。现有 live 工作树按 Roy 指令不存在，因此不能伪造 main/live 双落地回收验收；保留工作树供原调度器处理。

## 最终交付

最终源码已基于 main `36fab705fa74dc61d73d2d61ead017c1f4b1ace2` 完整检查，合入前 main 未推进。提交前暂存差异 gitleaks（`--redact`）退出 0，无泄漏，原始输出见 `gitleaks-final.log`；将该回执及本报告纳入暂存后再次扫描。原始工具日志保留末尾空行，源码与材料正文的 diff --check 通过。实际交付提交及 main 快进结果在完成后的 decision-log 与会话回报中登记。
