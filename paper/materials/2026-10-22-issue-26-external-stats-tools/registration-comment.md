[dev #26] 工具注册约定：本任务仅导出 externalStatsTools(): ToolDef[]，由 #33 挂入 agent 模式的知识工具集合。

模块：`agent/src/brain/tools/external-stats-tools.ts`。计划工具名：`external_stats_card`、`external_stats_skip`、`external_stats_deck_size`、`external_stats_encounter`、`external_stats_clusters`、`external_stats_cooccurrence`。只读 #24 聚合的紧凑知识文件，ctx.knowledgeDir 定位数据；返回带 external:sts2fun、版本、分母、下载日期、SHA、局限及大小上限。卡/遭遇用 ID 精确查询，版本默认 v0.111，流派固定声明“现有样本无法区分流派优劣、不作方向依据”。不修改 registry.ts、引擎、路由或题面；#33 负责选择注册与挂载，避免同文件冲突。
