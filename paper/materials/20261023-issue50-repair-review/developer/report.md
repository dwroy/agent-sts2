# #50 核验退回修补

原核验：[6364139734](https://github.com/dwroy/agent-sts2/issues/50#issuecomment-6364139734)。本轮只处理两项退回，基于当前 main `dbacc557f6f4c013380af140a3b9f89b80dcef69`，不占完整检查窗口。

原候选 `108b9841d68f7f9b6eba6aae0ee8f35e0d483a9a` 保存在 `issue50-before-review-fixes-108b9841d`，其原开发材料逐字节保留。将原 #50 差量重放到当前 main 为 `fb03c0cc8`；未重放早期 #49 依赖 `6290300d8`。brain.ts 冲突保留当前 main 的真实 `kb_reflex` 指令，仅重放 #50 的五处编辑；decision-log 保留 main 全部新记录并追加原 #50 记录，不把旧依赖的上下文抄回。当前完整产品差量在 `source.patch`，仅十个 #50 产品叶。

P1 修补：首次限层恢复为空后，旧 `currentRunPlan` 会无上限重读日志并使 F9 再进入当前 F2 的 memory。现将本功能的 `runPlanFloor` 贯穿首次恢复、旧 RUN_PLAN 懒加载和构筑题二次读取；`currentRunPlan` 同时校验缓存和日志。只有未来层记录时，重复读取仍为 null；缓存未来计划也被拒绝；有同局过去计划才恢复过去计划。异局不能借用，其他范围保留原 Infinity 默认合同。

新增固定回归先对修补前真实生产函数及两引擎生产 loop 运行：7 项失败、22 项因名称过滤未运行，退出 1，见 `negative-control.log/json`。包括冷重启后的限层 null 被重新填满、缓存未来计划、已有过去计划、Codex/DeepSeek 未来记录及 F9/F10→F2 回退。修补后同一回归测试文件 SHA 未变，全部通过；异局与旧默认合同亦在最终检查通过。没有用未来计划或默认文本填补未知。

P2 修补：构筑 loop 测试使用当前 `brain-query-cues-v2`，明确检查 rk 工具为 `kb_reflex`、经验工具为 `kb_experience`、Silent 的15项工具合同、两条独立基础指引及 #35 的实际构筑短理由。四个原测试与新增恢复场景均实际执行这些断言。当前 main 的 query-guidance、agent-knowledge、reflex-knowledge、construction-log、run-journal 五叶 SHA 均原样；移除 #50 五处编辑后的 brain.ts 与当前 main 逐字节一致。知识库和 #26 提示亦未改。

验证：

- 生产 tsc 退出 0。
- 第一次定向：10 文件，117 过 / 1 环境失败；rebase 重新稀疏化后 #29 已跟踪历史夹具未展开，未改源码/断言。
- 从当前 Git 原字节重新实体化 `paper/materials/issue29-brain-speed/results.jsonl`，blob 为 `b84d95c5185941eec143cbcf2966d5770309cca5`；不修改这份原件。空 `.cache` 已由原测试配置存在，不把本轮缺件与集成员此前的 `.cache` 首败混为一项。
- 最终同一10文件定向退出 0，118 项通过；其中 #50 为29项。包含 run-plan / merge、#35 loop、#49真实rk与经验、brain报告/工具模式、#26外部统计及全导入检查。nice19、threads单worker、文件串行；无 full、模型或真实游戏请求。
- 冻结2261个实际输入前后 SHA 均未变，原件与十产品叶见 `input-manifest.json`、`checks.json`；负控、首败、最终通过日志分开保留，不合计为同一轮结果。原开发大批617文件5649过/2败与两项补验、集成员旧109项核验结果也不改写。

交集成员基于当前 main 以 `source.patch` 十叶重新组装检查，不整份覆盖 brain.ts。#35 实际 live、#48 学习第4条、本局计划/检查点/F48/F49自然读回和科学父仍开放；原发布队列不变。后续实际发布、核 release_id、规则变更双通知与回退沿原集成员/ops。候选回退撤 #50 完整产品差量，保留当前 #49/#26/#35 和原日志，不单独撤 P1 使已知漏洞复活。本会话未改 main/live/STOP、未操作其他会话，也未申请回收工作树。
