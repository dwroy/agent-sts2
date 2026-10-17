# 原始计划字段与投影完整率补充

2026-10-17T18:26:10.044452+08:00：在读取本批H2/原始计划正文评分前明确实现细节，原首开局前analysis-definitions.md及原数据不改。

原run-plans.raw须实际输出construction.primary、alternatives数组、want数组、avoid数组、有效rest/elites、数值checkpoint、非空pivot_if才计原始结构完整；空数组视为已经输出，非空内容另表。原模型raw缺失不能用normalize默认值或H2投影补齐。分母是原已接受计划更新；未产计划的已进入幕另列，不声称已覆盖所有可能合并计划请求或失败尝试。逐字段数量和逐更新来源保留，可审查完整率口径。
