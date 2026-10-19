# V6 直接开启与逐局监督

按 Roy 2026-10-19 22:2x 决定，Silent A10 直接开启 V6，不安排影子局或新的 V5 局。本说明供 ops 在原启动流程的新 shell 使用；不改运维 prompt。W5 与 W3 B/共用请求工厂合入后，ops 核实际 main/live 提交和知识刷新，再按当前授权处理 STOP、校准资源与启动。开发会话只交付代码、测试和说明。

## 新启动 shell 的配置

先加载公司 Nova 环境，再加载/核对本次开关；角色脚本若再次覆盖环境，以实际 run-config 为准。不要打印环境或 key 文件内容。

```bash
source /home/dw/.config/nova-game-agents/environment.sh
export V6_BUILD=on
export V6_CARD_DECIDER=jev
export V6_POTION_DECIDER=jev
export V6_COMBAT_ENTRIES=on
export V6_SHOP_DECIDER=brain
export V6_REST_DECIDER=brain
export V6_ACT_MS=60000
export V6_PICK_MS=5000
export V6_JEV_MS=5000
export V6_BRAIN_MS=90000
export V6_BRAIN_SOFT_CAP=15
```

W7 实际合入并随 live 更新后的下一局，将 `V6_SHOP_DECIDER=jev`、`V6_REST_DECIDER=jev`。事件、路线仍由大脑决定。`V6_REFLEX` 是格式层记录项；出牌条目的实际开关是 `V6_COMBAT_ENTRIES`。

| 配置 | 默认值与含义 |
|---|---|
| `V6_ACT_MS` | 60000 ms，幕初投影计算；在途模拟只能按已有边界软降级 |
| `V6_PICK_MS` | 5000 ms，构筑投影计算预算，独立于 Jev |
| `V6_JEV_MS` | 开启时最多 5000 ms，构筑类 Jev 请求；不改变战斗 Jev 原有预留 |
| `V6_BRAIN_MS` | 90000 ms，目前属于配置记录意图，不能将其当成独立硬超时已生效；实际大脑等待沿现有机制 |
| `V6_BRAIN_SOFT_CAP` | 每局 15 次软上限；达到后仅保留幕初/T5/T7，故超过 15 本身不等于错误 |
| `V6_SAMPLES_ACT` / `V6_SAMPLES_PICK` | 100 / 20，同种子抽样数；减少抽样属于明确配置变更，应留记录 |
| `V6_DIRECTION_MIN_WEIGHT` | 0.10，拿牌评估的方向概率门槛；幕初评估全部方向 |

Jev 模型为 `typesafe/jev-1.14`，走 Nova `/api/alpha/decisions`，choice 候选位于 `criteria`；DeepSeek 为 `deepseek/deepseek-flash`，也走 Nova。key 仅由项目适配器从文件读取，不使用自费 key 回退。接入依据为 `/home/dw/.config/nova-game-agents/AGENT-INTEGRATION.md` 和 [Nova 交接](../handoff/nova-gateway-20261019.md)。不在本步骤发送真实模型请求或执行游戏动作。

## 核对实际读回

开局后核该局 `logs/run-config.jsonl` 的 `v6.mode/deciders/budgets/invalid`、Jev 模型与 Nova 配置；`invalid` 应为空。`admission=interfaces_only`、`delivered=false` 是早期配置层字段，不能据此判定功能是否实际走通；以 `decisions.jsonl` 的 decider、`v6-build.jsonl` 的条目/答案/兜底和实际动作回执核路由。

冻结历史只在开局读取 `knowledge/characters/<character>/v6-history.json`，缺包不跨角色回退；正式核心卡未发布时使用模板过渡组合。正式知识和指标刷新在局间进行，下一局自然读取。现有生产包仅有 1 个组合指标，既有小回放未知 100%、缓存命中 0；接口通过不代表投影质量通过，不补造数值。

## 每局结束立即生成报告

工具只读已有日志，在读取开始的字节长度处封口，保存每个输入的字节数、SHA256、坏行和未封口末行。它不启动游戏、刷新知识或自动回退。先在该局结束的 live 检出运行（也可用 `--logs` 指向保留的日志目录）：

```bash
nice -n 10 python3 -B ops/v6_health.py \
  --logs logs --run '<run_id>' \
  --out 'paper/materials/<date>-v6-w9/health/<run_id>-<timestamp>'
```

输出 `.json` 与 `.md`；每次使用新时间戳，保留原始报告。省略 `--run` 可列全部已记录的 V6 局。每十局按开始观测时间分组，未满十局标为部分组。定制日志位置可用 `--plans <RUN_PLAN_LOG>`、`--brains <BRAIN_LOG>`；默认读取 `run-plans.jsonl` 与 `brain.jsonl`。缺日志保持 unknown，不按零次报告。

报告含各题型计算/Jev/大脑耗时 p50/p90/max、已记录 Jev 题数与兜底率、未知条目分母、降级次数与原因、T1–T7 分布/合并/跳过、大脑预约数与日志题数、报错。Jev 题数是问题结果数，HTTP 重试不在该分母。同一局同一题的同类触发信号只计一次，反复轮询不增加触发次数。未知是日志中条目出现次数的加权比率；触发快照和大脑耗时记录不参与未知分母。`stage=brain` 的幕初/重规划记录包含请求失败耗时，投影阶段单独记录；旧日志未记录的数据不回填。当前 W8 出牌条目没有写独立 `v6-build.jsonl` 耗时行，`run-config` 也未记录独立 `V6_COMBAT_ENTRIES`；该类缺失测量保留 unknown，出牌是否开启仍需核 Jev 原题的 `v6_combat_entries` 审计。不能用构筑 Jev 的 5000ms 预算判战斗超时。

每局用时采用首条配置/动作观测到末条动作观测的时间窗，包含暂停/重启，未见 GAME_OVER 时明确未确认结束。可用重复的 `--v5-run '<existing_run_id>'` 显式选择上线前已有的同角色同进阶局作观测时长对比；缺基线保持 unknown，不因此开 V5 局，不据此声称因果提速。

## 建议回退的判据

以下是工具的监督建议，交 ops/Claude 结合原回执判断，不自动新增开局审批：

| 观测 | 建议 |
|---|---|
| 单类至少 5 个已记录 Jev 题、兜底率 ≥20% | 核 Nova/题面/超时；持续服务故障时将该类 decider 改回 `brain` |
| 计算或构筑 Jev 最大耗时超对应预算 1000 ms 以上 | 核在途任务、lease 等待和降级原件；持续阻塞时先关闭对应构筑路由，必要时整体关闭 |
| 闸门拒绝、动作派发错误、V6 规划异常 | 立即核原题与执行回执；影响合法动作或持续卡住时整体回退 |
| 未知 ≥50% 或没有未知分母 | 核本角色知识/hash/trust/路线输入；作为覆盖问题报告，不单凭未知认定 Jev 质量或服务故障 |
| 大脑预约数 >15 | 核超过部分是否只有幕初/T5/T7；对允许的例外不误判为超限 bug |
| 日志坏行、末行未封口或关键日志缺失 | 核日志写入与进程状态；缺失测量不当作健康通过 |

## 逐项回退与整体回退

在 ops 原启动环境中调整，下次自然启动生效，并核下一局实际配置/路由。单项回退：

| 范围 | 配置 |
|---|---|
| 拿牌 | `V6_CARD_DECIDER=brain` |
| 选药 | `V6_POTION_DECIDER=brain` |
| 商店 | `V6_SHOP_DECIDER=brain` |
| 休息 | `V6_REST_DECIDER=brain` |
| 出牌条目 | `V6_COMBAT_ENTRIES=off` |
| 方向题、触发与投影 | `V6_BUILD=off` |

整体回退可在原启动 shell 执行以下函数，再沿 ops 既有流程处理进程与发布；本函数仅改变当前 shell 环境：

```bash
v6_rollback() {
  export V6_BUILD=off V6_REFLEX=off V6_COMBAT_ENTRIES=off
  export V6_CARD_DECIDER=brain V6_POTION_DECIDER=brain
  export V6_SHOP_DECIDER=brain V6_REST_DECIDER=brain
}
v6_rollback
```

`V6_BUILD=off` 不会独立关闭出牌条目，整体回退必须同时设 `V6_COMBAT_ENTRIES=off`。不在在途 shell 热改模型或共享 Codex 配置。实际开启/回退的 live SHA、release_id、规则变更通知由 ops 按 [发布规则](eval.md) 登记；保留原局日志、失败原件和所有知识刷新。
