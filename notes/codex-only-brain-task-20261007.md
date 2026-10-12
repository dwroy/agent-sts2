# Roy 授权的独立高优先功能任务

2026-10-07 09:10 运维转录09:00 manual，原要求见 notes/fix-queue-v4.md“大脑只用 codex，不用 DeepSeek 兜底”节。

- 只用 Codex 作大脑决策；不可用时当前题安全等待、重试并恢复同题，不由 DeepSeek 或 Jev／代码代答；原战斗执行／求解职责保持。
- brain.jsonl实际引擎分类，DeepSeek／混合局单独标注、默认排除纯Codex爬塔绩效；未知历史明示，保留原日志、复盘证据、成本、首次／SL分账和角色隔离；metrics／学习曲线／论文／climb口径一致。
- 独立模板 learner/tasks/codex-only-brain.md，工作树 .worktrees/codex-only-brain；已合main，模板内含完整实现／固定验证／live锁内流程和最终fix-batch JSON协议。
- 不混普通修复或boss校准、不新建bug-infra、不再请示已授权架构、不读改env/key、不改运维prompt、不停当前对局／调度、不运行play。
- live .env去掉BRAIN_FALLBACK=deepseek为Roy提供的事实，运维没有读取或修改；本次只是派发，功能上线由学习者完成事件核实。
