# 9.1 一次性学习派发回执

2026-10-19 16:40 CST 核查。任务模板提交 7c4b3927d，已进 main。先 dry-run 核过模板渲染、codex/high/240 分钟、网络关闭及隔离权限，再经现有 herdr 托管启动。固定输入清单 372 个已结束 Silent 局、423 份知识/历史报告文件；输入文件带 SHA256 和字节数，六类日志按冻结字节上限读取，未测全日志前缀 SHA 明记 unknown，不冒称完整全量哈希。

首次使用普通 codex1 home 被启动器 AGENTS.md 隔离守卫拒绝，退出 3，尚未创建模型线程；改用既有 codex1 专用 learner home 后成功，**只实际派出一次模型任务**，不改共享配置。原生 turn_context 已核 gpt-6.1-sol/high、独立工作树、network_access=false。auth.json 只核符号链接目标为 codex1，未读凭据。具体线程、home、manifest SHA、pane 与日志见 learner-dispatch.json。

截至此核查，学习者仍在处理冻结输入，已在 scratch 写审计脚本；**没有完成回报，产物与覆盖未验收**。只允许 scratch 与该工作树 Silent/pending 草稿，ledger CLI 的 observed/proposed 登记例外保留；不改正式知识、不合入。结束后核实真实方向卡、244 条逐项归属、Boss 首试/含 SL 独立局分母、reflex/药水/目录意见、异议及 ledger 回执，不能拿 JSON 声明替代文件核查。不得再派第二批。
