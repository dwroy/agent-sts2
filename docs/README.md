# 文档索引

2026-10-14 核对 V5 文档入口及发布边界。当前实现、已批准但待实现的要求、历史设计和实验结果分开阅读；实际运行提交/配置要核 live、run-config 和调用记录。最新 STATE 是现场快照，后续变化查 decision-log，旧报告不回填新状态。

## 当前说明

| 文档 | 内容 |
|---|---|
| [V6 全局构筑与小脑记忆计划](v6-plan.md) | **2026-10-19 Roy 批准**（`roy-20261019-v6`，待实现）：大脑给构筑方向概率与药水方向条目，代码按理想补齐对全部 Boss（含 F48→F49 连战）模拟出量化条目，Jev 拿牌与选药；小脑记忆、构筑方向卡；执行计划 W0–W9 |
| [多 agent 协作架构](agent-board-architecture.md) | **2026-10-21 Roy 批准**：看板 / 派单器 / 角色三层；Claude 主管、集成员（原 watcher）、开发者一 issue 一会话、ops 只管运行；通用部分抽到 agent-board-kit |
| [GitHub Issues 协作流程](github-issues-workflow.md) | **2026-10-21 Roy 定**：任务以 GitHub Issues 为准，herdr 托管会话；消息只提醒、结果写评论、一个 issue 一个新会话、公开边界 |
| [V5 架构](v5-architecture.md) | 当前职责、必需 Boss 评估、核心公式、Jev 请求替换及发布/待实现边界 |
| [V5 构筑模块](v5-construction.md) | 未来成型预测、当前候选战斗评估、结构化方向与校准入场 |
| [V5 S 决策实施计划](v5-s-decision-plan.md) | 2026-10-15 完成（`roy-20261014-s-decision`，P4/P5 未做）：必需计算故障出口与按需采样、S 排序、Boss 准备度诊断、Jev 平局仲裁的分阶段计划、验收与交接 |
| [V5 全局构筑方向实施计划](v5-global-build-plan.md) | **2026-10-16 派发**（`roy-20261016-global-build`）：第三幕/最终 Boss 可信度与 S 验证 → 跨 Boss 全局评估 → 方向接入排序与前瞻校准 → 模板 → 路线 |
| [量化计算与校准](quantitative-play.md) | 数值窗口、配对差、未知与日志/模型请求的不同用途 |
| [V4 基础架构](v4-architecture.md) | V5 沿用的模块、Codex 大脑、知识/日志、学习闭环与 main/live |
| [仓库布局](layout.md) | 模块路径、角色数据、工作区和运行目录 |
| [学习协议](learning-protocol.md) | 游戏知识证据边界、角色隔离、职责与规则修改授权 |
| [代码提案闭环](learning-code-proposals.md) | 经验与源码提案、CLI 登记、等待/失败和上线追溯 |
| [学习者](../learner/README.md) | 任务、参数、权限、产物、正常派发和默认合 live |
| [控制器包](../agent/README.md) | CLI、测试入口、有效配置和模块入口 |
| [Codex 大脑等待与战绩](codex-only-brain.md) | 原题等待、心跳/取消、成功脑局归类与统计限制 |
| [Codex Fast](codex-fast.md) | priority 档位与配置生效边界 |
| [Codex 运维](codex-ops.md) | 调度、持久事件、宿主动作、工作树租约与外部检查 |
| [完成验收与现场回收](learner-retention.md) | 稀疏分配、历史副本回收、归档恢复及活动 owner 保护 |
| [评估](eval.md) | 按版本/角色/进阶/配置的指标；首试/SL、纯 Codex 与原始口径 |
| [日志库](logdb.md) | 增量派生、表/视图、只读查询与成本来源 |
| [上游来源](third-party.md) | submodule 与代码来源边界 |

## 专题实现与历史验证

以下文档按时间积累，早期章节保留当时的引擎、参数、角色与待办。看当前行为先查页首范围、对应代码、文末后续记录和实际上线；历史验收数字不能推广为所有角色/进阶已验证。

| 文档 | 范围 |
|---|---|
| [构筑事实字段](v4-build-facts.md) | M2 原始字段审计与当前入口说明；字段表不是现行完整 schema |
| [boss 整场模拟](boss-sim.md) | B1–B5 的设计、回测和后续逐角色校准 |
| [机制学习](mechanics-learning.md) | 观察、残差、提案及数据规则的历次验收 |
| [药水换算](potion-equivalents.md) | 换算表公式、原始证据与消费者 |
| [SL](sl.md) | 铁甲阶段设计、终局与重试的历史证据和后续修复 |
| [小偷](thief.md) | 铁甲阶段事实/代价实现及固定回放 |

## 原始设计与迁移档案

- [2026-09-29 V4 原始架构](history/v4-architecture-2026-09-29.md)：保留原文，包含当时的推迟项、分支和权限。
- [2026-09-30 V4 首次上线方案](v4-go-live.md)：保留原分支、环境、开关与验收；不能按旧步骤操作现系统。
- [路径迁移对照](path-map.tsv)、[上游 PLAN](../agent/PLAN.md)：迁移/设计档案，不是现行上线指南。

发现当前说明与代码不一致时，按源码、实际运行证据和最近授权核实；游戏知识仍只能由学习者从本角色对局得出，不能用维护文档的机会新增策略。
