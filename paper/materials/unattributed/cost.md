# unattributed：token 与成本

按组件、进阶、局与批次归集；CSV 保留未归属部分。缓存是输入子集，推理是输出子集，不重复计入总 token。
学习批次服务多局时等分，不代表逐局实测；未记录服务局号的批次保持未归属。运维和观察按对局时间窗归属，窗外单列 unattributed。
订阅为共享账户周额度估算，按月费 × 12 / 52 折周、按同一重置窗口内已记录 token 分摊；未观测到的账户外部用量无法单独扣除。
未知价格、失败/过期/未校验窗口不补零。金额只汇总已知部分，不能当作完整账单；每胜费用在零胜时未知。
缓存命中率只用同时记录输入和缓存字段的样本（cache_observed_*）；cache_usage_recorded=False 表示有缺字段，不能当真实零命中。Codex session 的 camelCase 与 exec 的 snake_case 用同一口径。
Jev 优先取 jev-prompts 的逐请求输入/输出（按 request_id 去重，缓存不另加），仅输入收费；runs 未覆盖余额只有总 token，拆分与费用未知。失败请求用量未知，未结束局有请求日志也计入。大脑仅归集 brain/codex-calls 留存请求，早期调用仍缺失。

战绩口径：codex-successful-brain-v1。局数、费用、token 和每局费用覆盖全部引擎；胜数仅 Codex，raw_wins/各引擎原始成绩在 CSV 中保留；每胜费用为全部实验费用除以 Codex 胜数。

| 进阶 | 原始局 | Codex 胜 | token（全部） | 已知估算 | 每原始局 | 每 Codex 胜 | 累计已知 | 覆盖 |
|---|---:|---:|---:|---:|---:|---:|---:|---|

价格配置：Claude $200/月、ChatGPT $500/月（Roy 2026-10-05 20:41）；DeepSeek 按现有论文峰时价格假设；TypeSafe/Jev 输入 $0.042/百万 token、输出 $0/百万 token（Roy 2026-10-05 23:14: TypeSafe usage page, $0.042/MTok input; free output）。
本次有效订阅重置窗口：4；数据字节切点、缺失源及坏行数见 paper/data/cost-sources.json。
