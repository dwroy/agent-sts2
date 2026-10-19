# W1.2 与 W2.2 联合验收

W1.2 schema/consumer 与 W8 原交付 3c9d711ac 联合，原子快进 main，未单独发布不兼容格式。基线 c71adb784；重放后生成器 5e3eed497、格式/消费者 a1743a354。源分支和原提交保留可追溯。

canonical：agent/src/v6/build-core.ts 的 buildMetricSchema/BuildMetric，接口见 interfaces.md。每组合仅 first/including_sl 两份合并主口径；版本与进阶只作 sources，保留 raw_counts、A10 simulation/regression、向方向收缩值。simulation.entry_hp 可为 null，此时指标 n=0/value=null；未知不补数。prerequisites 与 fits.when 复用 W1 predicate，运行时按三值结果约束供给及模拟；不改 W8 白名单。

联合检查：joint-2110 原基线完整 tsc/vitest（579 文件、5555 通过、2 跳过）；变基到 c71adb784 后 joint-latest-2124 再完整 tsc/vitest（579 文件、5556 通过、2 跳过），exit code 均 0。额外 W8 Python 固定测试 40 通过；6 项 TS 模拟桥包含于完整检查。两份 attempt 的冻结生成指标通过严格 buildMetricSchema，contract-validation.json 保存原文和校验，原始 452 项对账沿 W8 材料。gitleaks 扫联合提交与本次暂存内容，无发现，报告邻接保存。

新任务模板描述性组合类型与合并统计已更新；本批核心卡学习明确 --simulation off，不启动新的 Boss 模拟池。R2 reflex 独立审计为 85 标签、0 数值，244=80 partial+163 text_only+1 disputed；父要求仍未完成，不派续批、不改正式知识。

STOP 保留、live 未重建、Regent 未恢复；V6 开关默认 off，关闭等价测试随完整检查通过。此变更未启动游戏/线上请求，未写游戏知识。下一步按已授权的 xhigh/240 分钟派核心构筑卡第二轮，产出仅 scratch/pending；W3 冻结历史包与投影接口另项交付。
